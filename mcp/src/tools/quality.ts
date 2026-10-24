import { sessions } from "../session.js";
import { z } from "zod";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { DeckSpec, ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, okData, assertApproved, payload} from "./helpers.js";
import { fullReport, writeReport, summarize } from "../quality/report.js";
import { checkAllContrast, backgroundOf } from "../quality/contrast.js";
import { checkConsistency } from "../quality/consistency.js";
import { checkAccessibility, checkNaming } from "../quality/accessibility.js";
import { checkAllOverflow } from "../quality/overflow.js";
import { checkAllOverlap } from "../quality/overlap.js";
import { validateLicenses as validateAssetLicenses } from "../research/license.js";
import { visualDiff } from "../quality/visual-diff.js";
import { buildDeck } from "../engine/pptxgen/builder.js";
import { renderSlides, runPython } from "../engine/com/bridge.js";
import { outDir } from "../utils/paths.js";
import { bestTextOn, contrast } from "../utils/colors.js";
import { fitFontSize } from "../engine/compose/text-metrics.js";

function specIssues(deck: DeckSpec) {
  const issues: any[] = [];
  if (!deck.slides?.length) issues.push({ code: "E_SPEC", severity: "blocker", message: "Deck has no slides" });
  const ids = new Set<string>();
  for (const [i, slide] of (deck.slides ?? []).entries()) {
    if (!slide.id) issues.push({ code: "E_SPEC", severity: "blocker", message: `Slide ${i + 1} has no id` });
    if (slide.id && ids.has(slide.id)) issues.push({ code: "E_SPEC", severity: "blocker", message: `Duplicate slide id ${slide.id}` });
    ids.add(slide.id);
    if (slide.objects.length > 400) issues.push({ code: "E_BUDGET", severity: "blocker", slideId: slide.id, message: "More than 400 objects" });
    for (const o of slide.objects) {
      if (!/^(bg|deco|content|data|ui|note|edit-source)\//.test(o.id)) issues.push({ code: "E_SPEC", severity: "minor", slideId: slide.id, objectId: o.id, message: "Object id lacks band prefix" });
      if (!o.geometry || [o.geometry.x, o.geometry.y, o.geometry.w, o.geometry.h].some((v) => typeof v !== "number" || !Number.isFinite(v))) issues.push({ code: "E_GEOMETRY", severity: "blocker", slideId: slide.id, objectId: o.id, message: "Invalid geometry" });
      else if (o.geometry.w <= 0 || o.geometry.h <= 0) issues.push({ code: "E_GEOMETRY", severity: "blocker", slideId: slide.id, objectId: o.id, message: "Non-positive size" });
      if (!o.altText && !o.decorative && o.band !== "bg" && o.band !== "deco") issues.push({ code: "E_SPEC", severity: "major", slideId: slide.id, objectId: o.id, message: "Missing alt text" });
      if (o.type === "text" && !o.text) issues.push({ code: "E_SPEC", severity: "major", slideId: slide.id, objectId: o.id, message: "Text object without text spec" });
    }
  }
  if (!deck.brief?.approved) issues.push({ code: "E_BRIEF", severity: "major", message: "Brief not approved" });
  return issues;
}

const validateSpec = (): ToolDef => ({
  name: "validate_spec",
  description: "Validate deck spec integrity: ids, geometry, bands, alt text, budgets.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const issues = specIssues(s.spec);
    return okData({ ok: issues.filter((i) => i.severity === "blocker").length === 0, issues, blockers: issues.filter((i) => i.severity === "blocker").length });
  },
});

const validateLayout = (): ToolDef => ({
  name: "validate_layout",
  description: "Check overflow, overlaps, margins, occupancy and object budgets.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const overflow = checkAllOverflow(s.spec);
    const overlap = checkAllOverlap(s.spec);
    const consistency = checkConsistency(s.spec);
    const blockers = [...overflow, ...overlap, ...consistency].filter((v) => v.severity === "blocker");
    return okData({ ok: blockers.length === 0, overflow, overlap, consistency, blockers: blockers.length });
  },
});

const validateContrast = (): ToolDef => ({
  name: "validate_contrast",
  description: "WCAG contrast check for all text (3:1 large, 4.5:1 body).",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const violations = checkAllContrast(s.spec);
    return okData({ ok: violations.length === 0, violations, blockers: violations.filter((v) => v.severity === "blocker").length });
  },
});

const validateTypography = (): ToolDef => ({
  name: "validate_typography",
  description: "Check font sizes, family count, line length, title/body ratio.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const issues: any[] = [];
    const families = new Map<string, number>();
    for (const sl of s.spec.slides) {
      for (const o of sl.objects) {
        if (o.type !== "text" || !o.text) continue;
        const size = o.text.fontSize ?? 18;
        if (o.role === "body" && size < 14) issues.push({ code: "E_TYPE", slideId: sl.id, objectId: o.id, severity: "major", message: `Body text ${size}pt < 14pt` });
        if (o.role === "caption" && size < 10) issues.push({ code: "E_TYPE", slideId: sl.id, objectId: o.id, severity: "minor", message: `Caption ${size}pt < 10pt` });
        if (o.role === "title" && (size < 24 || size > 72)) issues.push({ code: "E_TYPE", slideId: sl.id, objectId: o.id, severity: "minor", message: `Title ${size}pt outside 24–72pt` });
        if (o.text.fontFamily) families.set(o.text.fontFamily, (families.get(o.text.fontFamily) ?? 0) + 1);
        const longest = Math.max(0, ...(o.text.value ?? "").split(/\r?\n/).map((l) => l.length));
        if (longest > 110 && o.role === "body") issues.push({ code: "E_TYPE", slideId: sl.id, objectId: o.id, severity: "minor", message: `Line length ${longest} chars` });
      }
    }
    if (families.size > 3) issues.push({ code: "E_TYPE", severity: "major", message: `${families.size} font families (max 3)` });
    return okData({ ok: issues.filter((i) => i.severity !== "minor").length === 0, issues, fonts: [...families.entries()].map(([family, count]) => ({ family, count })) });
  },
});

const validateConsistency = (): ToolDef => ({
  name: "validate_consistency",
  description: "Check margins, budgets, font scale, title/body ratio, chart titles.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const violations = checkConsistency(s.spec);
    return okData({ ok: violations.filter((v) => v.severity === "blocker").length === 0, violations });
  },
});

const validateAccessibility = (): ToolDef => ({
  name: "validate_accessibility",
  description: "Alt text coverage, naming, duplicate ids.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const a = checkAccessibility(s.spec);
    const naming = checkNaming(s.spec);
    return okData({ ok: a.missing === 0 && naming.length === 0, coverage: a.coverage, total: a.total, missing: a.missing, violations: [...a.violations, ...naming] });
  },
});

const validateBrand = (): ToolDef => ({
  name: "validate_brand",
  description: "Check colors/fonts against the deck tokens and brand metadata.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const tokens = s.spec.tokens ?? {};
    const allowedColors = new Set(Object.values(tokens.color ?? {}).map((c: any) => String(c).toUpperCase()));
    const allowedFonts = new Set(Object.values(tokens.font ?? {}).map((f: any) => String(f).toLowerCase()));
    const offColor: any[] = [], offFont: any[] = [];
    for (const sl of s.spec.slides) for (const o of sl.objects) {
      if (o.text?.color && !allowedColors.has(o.text.color.toUpperCase()) && !o.decorative) offColor.push({ slideId: sl.id, objectId: o.id, color: o.text.color });
      if (o.fill?.color && !allowedColors.has(o.fill.color.toUpperCase()) && !o.decorative && o.band !== "bg") offColor.push({ slideId: sl.id, objectId: o.id, color: o.fill.color });
      if (o.text?.fontFamily && !allowedFonts.has(o.text.fontFamily.toLowerCase())) offFont.push({ slideId: sl.id, objectId: o.id, font: o.text.fontFamily });
    }
    return okData({ ok: offColor.length === 0 && offFont.length === 0, offColor, offFont, brand: s.spec.meta.brand ?? null });
  },
});

const validateLicenses = (): ToolDef => ({
  name: "validate_licenses",
  description: "Block unknown/non-commercial assets; require attribution.",
  inputSchema: S({ commercial: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const r = validateAssetLicenses(s.spec.assets ?? [], args.commercial !== false);
    return okData(payload(r));
  },
});

const repairAuto = (): ToolDef => ({
  name: "repair_auto",
  description: "Auto-fix overflow (autofit), contrast, alt text, margins and z-order.",
  inputSchema: S({ maxPasses: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const fixed: any[] = [];
    sessions.mutate(s, () => {
      for (const sl of s.spec.slides) {
        const bg = backgroundOf(s.spec, sl);
        for (const o of sl.objects) {
          if (o.locked) continue;
          if (o.type === "text" && o.text) {
            const size = fitFontSize(o.text.value ?? "", o.geometry.w, o.geometry.h, o.text, 10, o.text.fontSize ?? 96);
            if (size < (o.text.fontSize ?? 18)) { fixed.push({ slideId: sl.id, objectId: o.id, action: "autofit", from: o.text.fontSize, to: size }); o.text.fontSize = size; }
            const fg = o.text.color ?? "#111111";
            if (contrast(fg, bg) < 4.5) {
              const next = bestTextOn(bg);
              fixed.push({ slideId: sl.id, objectId: o.id, action: "contrast", from: fg, to: next });
              o.text.color = next;
            }
          }
          if (!o.altText && !o.decorative && o.band !== "bg" && o.band !== "deco") {
            o.altText = o.type === "chart" ? (o.chart?.title ?? "Chart") : o.type === "table" ? "Data table" : o.type === "image" ? "Image" : o.type;
            fixed.push({ slideId: sl.id, objectId: o.id, action: "altText" });
          }
          const band = o.band ?? "content";
          const z = o.z ?? 20;
          const okZ = band === "bg" ? z < 10 : band === "deco" ? z >= 10 && z < 20 : band === "content" ? z >= 20 && z < 80 : band === "data" ? z >= 80 && z < 90 : z >= 90;
          if (!okZ) {
            o.z = band === "bg" ? 0 : band === "deco" ? 10 : band === "content" ? 20 : band === "data" ? 80 : 90;
            fixed.push({ slideId: sl.id, objectId: o.id, action: "z", to: o.z });
          }
        }
      }
    });
    const report = fullReport(s.spec);
    return okData({ fixed, remaining: summarize(report) });
  },
});

const renderSlidesTool = (): ToolDef => ({
  name: "render_slides",
  description: "Render the deck to PDF/PNG/JPG via PowerPoint COM (or LibreOffice fallback).",
  inputSchema: S({ file: z.string().optional(), formats: z.array(z.string()).optional(), dpi: z.number().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    let file = args.file;
    if (!file) {
      assertApproved(s, "render");
      const built = await buildDeck(s.spec, outDir("decks"), s.spec.meta.title ?? "deck");
      file = built.file;
    }
    if (!existsSync(file)) throw new XPError("E_NOT_FOUND", `File not found: ${file}`);
    const r = await renderSlides(file, outDir("previews"), args.formats ?? ["pdf", "png"], args.dpi ?? 150);
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "Render requires PowerPoint COM", r);
    return okData(payload(r));
  },
});

const renderContactSheet = (): ToolDef => ({
  name: "render_contact_sheet",
  description: "Build a contact sheet from rendered slide images.",
  inputSchema: S({ images: z.array(z.string()).optional(), dir: z.string().optional(), columns: z.number().optional(), width: z.number().optional() }),
  handler: async (args) => {
    let images = args.images ?? [];
    if (!images.length && args.dir) images = readdirSync(args.dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).map((f) => path.join(args.dir!, f));
    if (!images.length) throw new XPError("E_INVALID_INPUT", "Provide images or dir with renders");
    const out = path.join(outDir("previews"), `contact-sheet-${Date.now()}.png`);
    const r = await runPython("image_tools.py", { action: "contact_sheet", images, out, columns: args.columns ?? 3, width: args.width ?? 480 }, 120000);
    if (!r.ok) throw new XPError("E_ENGINE", r.message ?? "Contact sheet requires Pillow", r);
    return okData({ ...payload(r), out });
  },
});

const visualDiffTool = (): ToolDef => ({
  name: "visual_diff",
  description: "Pixel-diff two rendered images (Pillow).",
  inputSchema: S({ a: z.string(), b: z.string() }),
  handler: async (args) => {
    const r = await visualDiff(args.a, args.b);
    return okData(payload(r));
  },
});

const qaReport = (): ToolDef => ({
  name: "qa_report",
  description: "Run all gates and write qa-report.json.",
  inputSchema: S({ write: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const report = fullReport(s.spec);
    const file = args.write === false ? null : writeReport(report, outDir("reports"), `qa-${s.id}.json`);
    return okData({ ...summarize(report), file, report });
  },
});

export const qualityTools: ToolDef[] = [
  validateSpec(), validateLayout(), validateContrast(), validateTypography(), validateConsistency(),
  validateAccessibility(), validateBrand(), validateLicenses(), repairAuto(), renderSlidesTool(),
  renderContactSheet(), visualDiffTool(), qaReport(),
];
