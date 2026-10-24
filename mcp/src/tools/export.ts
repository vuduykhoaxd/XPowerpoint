import { sessions } from "../session.js";
import { z } from "zod";
import { existsSync, copyFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, assertApproved, okData } from "./helpers.js";
import { buildDeck } from "../engine/pptxgen/builder.js";
import { renderSlides, exportVideo, applyMotion, comAvailable } from "../engine/com/bridge.js";
import { fullReport, writeReport, summarize } from "../quality/report.js";
import { validateLicenses } from "../research/license.js";
import { outDir, safeName, ensureDir } from "../utils/paths.js";

async function gate(s: any, force = false) {
  assertApproved(s, "export");
  const report = fullReport(s.spec);
  const lic = validateLicenses(s.spec.assets ?? [], true);
  const blockers = [
    ...report.blockers.map((b: any) => ({ code: b.code, message: b.message, slideId: b.slideId })),
    ...lic.issues.filter((i: any) => !i.severity).map((i: any) => ({ code: i.code, message: i.message, asset: i.id })),
  ];
  if (blockers.length && !force) {
    throw new XPError("E_GATE", `Export blocked by ${blockers.length} issue(s). Fix or pass force:true.`, { blockers, gates: summarize(report).gates });
  }
  return { report, licenses: lic, forced: blockers.length > 0 };
}

async function ensureBuilt(s: any) {
  if (s.filePath && existsSync(s.filePath)) return s.filePath;
  const built = await buildDeck(s.spec, outDir("decks"), s.spec.meta.title ?? "deck");
  s.filePath = built.file;
  return built.file;
}

const exportPptx = (): ToolDef => ({
  name: "export_pptx",
  description: "Build the editable .pptx (gates enforced).",
  inputSchema: S({ path: z.string().optional(), force: z.boolean().optional(), applyMotion: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const g = await gate(s, args.force);
    const built = await buildDeck(s.spec, outDir("decks"), args.path ? path.basename(args.path, ".pptx") : s.spec.meta.title ?? "deck");
    let file = built.file;
    if (args.path) { ensureDir(path.dirname(path.resolve(args.path))); copyFileSync(file, args.path); file = path.resolve(args.path); }
    if (args.applyMotion) {
      const out = file.replace(/\.pptx$/i, "-motion.pptx");
      const r = await applyMotion(file, s.spec.slides.map((sl: any, i: number) => ({ index: i + 1, transition: sl.transition, sequence: sl.motion?.sequence ?? [] })), out);
      if (r.ok) { file = out; if (r.failures?.length) built.warnings.push("Motion partial: " + r.failures.join("; ")); } else built.warnings.push("Motion not applied: " + (r.message ?? "COM unavailable"));
    }
    s.filePath = file;
    s.dirty = false;
    const report = writeReport({ ...g.report, forced: g.forced }, outDir("reports"), `qa-${s.id}.json`);
    return okData({ file, specFile: built.specFile, slides: built.slides, objects: built.objects, report, forced: g.forced }, built.warnings);
  },
});

const exportPdf = (): ToolDef => ({
  name: "export_pdf",
  description: "Export PDF via PowerPoint COM (or LibreOffice).",
  inputSchema: S({ path: z.string().optional(), file: z.string().optional(), force: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    await gate(s, args.force);
    const file = args.file ?? await ensureBuilt(s);
    const r = await renderSlides(file, outDir("exports"), ["pdf"], 150);
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "PDF export requires PowerPoint COM", r);
    const src = r.files?.pdf ?? r.files?.find?.((f: any) => String(f).endsWith(".pdf"));
    let out = typeof src === "string" ? src : null;
    if (out && args.path) { ensureDir(path.dirname(path.resolve(args.path))); copyFileSync(out, args.path); out = path.resolve(args.path); }
    return okData({ file: out, engine: r });
  },
});

function imageExport(format: "png" | "jpg") {
  return {
    name: `export_${format}`,
    description: `Export slides as ${format.toUpperCase()} images.`,
    inputSchema: S({ file: z.string().optional(), force: z.boolean().optional(), dpi: z.number().optional() }),
    handler: async (args: any) => {
      const s = sessionOf({ sessions }, args);
      await gate(s, args.force);
      const file = args.file ?? await ensureBuilt(s);
      const r = await renderSlides(file, outDir("exports"), [format], args.dpi ?? 150);
      if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "Image export requires PowerPoint COM", r);
      return okData(r);
    },
  } as ToolDef;
}

const exportSvg = (): ToolDef => ({
  name: "export_svg",
  description: "Export each slide as SVG (LibreOffice/COM conversion).",
  inputSchema: S({ file: z.string().optional(), force: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    await gate(s, args.force);
    const file = args.file ?? await ensureBuilt(s);
    const r = await renderSlides(file, outDir("exports"), ["svg"], 150);
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "SVG export requires LibreOffice or PowerPoint COM", r);
    return okData(r);
  },
});

const exportMp4 = (): ToolDef => ({
  name: "export_mp4",
  description: "Export MP4 video with transitions/animations (COM required).",
  inputSchema: S({ file: z.string().optional(), force: z.boolean().optional(), secondsPerSlide: z.number().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    await gate(s, args.force);
    const file = args.file ?? await ensureBuilt(s);
    const out = path.join(outDir("exports"), `${safeName(s.spec.meta.title ?? "deck")}-${Date.now()}.mp4`);
    const r = await exportVideo(file, out, args.secondsPerSlide ?? 3);
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "MP4 export requires PowerPoint COM", r);
    return okData({ file: out, engine: r });
  },
});

const exportGif = (): ToolDef => ({
  name: "export_gif",
  description: "Convert an exported MP4 to GIF with ffmpeg.",
  inputSchema: S({ mp4: z.string(), fps: z.number().optional(), width: z.number().optional() }),
  handler: (args) => {
    if (!existsSync(args.mp4)) throw new XPError("E_NOT_FOUND", `MP4 not found: ${args.mp4}`);
    const out = path.join(outDir("exports"), `${safeName(path.basename(args.mp4, ".mp4"))}.gif`);
    const r = spawnSync("ffmpeg", ["-y", "-i", args.mp4, "-vf", `fps=${args.fps ?? 12},scale=${args.width ?? 960}:-1:flags=lanczos`, out], { windowsHide: true });
    if (r.error || !existsSync(out)) throw new XPError("E_COM_UNAVAILABLE", "ffmpeg not found or conversion failed", { stderr: r.stderr?.toString().slice(0, 800) });
    return okData({ file: out });
  },
});

const exportHandout = (): ToolDef => ({
  name: "export_handout",
  description: "Export a handout PDF (2/3/6 slides per page).",
  inputSchema: S({ file: z.string().optional(), force: z.boolean().optional(), perPage: z.number().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    await gate(s, args.force);
    const file = args.file ?? await ensureBuilt(s);
    const out = path.join(outDir("exports"), `${safeName(s.spec.meta.title ?? "deck")}-handout.pdf`);
    const r = await renderSlides(file, outDir("exports"), ["pdf"], 150);
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "Handout export requires PowerPoint COM", r);
    return okData({ file: (r as any).files?.pdf ?? out, perPage: args.perPage ?? 6, engine: r, note: "If the engine lacks handout layout, use the full PDF." });
  },
});

const exportNotes = (): ToolDef => ({
  name: "export_notes",
  description: "Write speaker notes to a text file.",
  inputSchema: S({ path: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const lines = s.spec.slides.map((sl: any, i: number) => `Slide ${i + 1} — ${sl.name ?? sl.type}\n${sl.notes ?? ""}\n`);
    const out = args.path ?? path.join(outDir("exports"), `${safeName(s.spec.meta.title ?? "deck")}-notes.txt`);
    writeFileSync(out, lines.join("\n"), "utf8");
    return okData({ file: out, slides: lines.length });
  },
});

const exportPackage = (): ToolDef => ({
  name: "export_package",
  description: "Zip the pptx, spec and referenced assets into a delivery package.",
  inputSchema: S({ file: z.string().optional(), force: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    await gate(s, args.force);
    const file = args.file ?? await ensureBuilt(s);
    const dir = path.join(outDir("exports"), `${safeName(s.spec.meta.title ?? "deck")}-package`);
    ensureDir(dir);
    copyFileSync(file, path.join(dir, path.basename(file)));
    writeFileSync(path.join(dir, "deck.spec.json"), JSON.stringify(s.spec, null, 2), "utf8");
    for (const a of s.spec.assets ?? []) if (a.path && existsSync(a.path)) {
      const dest = path.join(dir, "assets", path.basename(a.path));
      ensureDir(path.dirname(dest));
      copyFileSync(a.path, dest);
    }
    const zip = path.join(outDir("exports"), `${path.basename(dir)}.zip`);
    const r = spawnSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${dir}\\*' -DestinationPath '${zip}' -Force`], { windowsHide: true });
    if (r.error || !existsSync(zip)) throw new XPError("E_ENGINE", "Zip failed", { stderr: r.stderr?.toString().slice(0, 800) });
    return okData({ file: zip, folder: dir });
  },
});

const exportVariants = (): ToolDef => ({
  name: "export_variants",
  description: "Export editable and flat variants of the deck.",
  inputSchema: S({ force: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    await gate(s, args.force);
    const base = safeName(s.spec.meta.title ?? "deck");
    const editable = await buildDeck(s.spec, outDir("exports"), `${base}-editable`);
    const flatSpec = JSON.parse(JSON.stringify(s.spec));
    flatSpec.slides = flatSpec.slides.map((sl: any) => ({ ...sl, objects: sl.objects.filter((o: any) => o.type !== "text" || !o.text?.paragraphs) }));
    const flat = await buildDeck(flatSpec, outDir("exports"), `${base}-flat`);
    return okData({ editable: editable.file, flat: flat.file }, ["Flat variant still keeps native shapes; rasterization requires render_slides."]);
  },
});

export const exportTools: ToolDef[] = [
  exportPptx(), exportPdf(), imageExport("png"), imageExport("jpg"), exportSvg(), exportMp4(),
  exportGif(), exportHandout(), exportNotes(), exportPackage(), exportVariants(),
];
