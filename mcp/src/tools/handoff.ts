import { z } from "zod";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { DeckSpec, ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, okData, bandOf, zForBand } from "./helpers.js";
import { editabilityAudit } from "../quality/editability.js";
import { checkNaming } from "../quality/accessibility.js";
import { buildDeck } from "../engine/pptxgen/builder.js";
import { outDir, ensureDir, safeName } from "../utils/paths.js";
import { sessions } from "../session.js";
import { defaultSpec } from "../tokens.js";

const editabilityAuditTool = (): ToolDef => ({
  name: "editability_audit",
  description: "Score editability 0–100 across 8 criteria.",
  inputSchema: S({ gate: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const r = editabilityAudit(s.spec, args.gate ?? 80);
    return okData(r);
  },
});

const editabilityReport = (): ToolDef => ({
  name: "editability_report",
  description: "Write a fixable-issues editability report.",
  inputSchema: S({ gate: z.number().optional(), write: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const r = editabilityAudit(s.spec, args.gate ?? 80);
    let file: string | null = null;
    if (args.write !== false) {
      file = path.join(outDir("reports"), `editability-${s.id}.json`);
      writeFileSync(file, JSON.stringify(r, null, 2), "utf8");
    }
    return okData({ ...r, file });
  },
});

const handoffCleanup = (): ToolDef => ({
  name: "handoff_cleanup",
  description: "Rename objects to band-prefixed ids, normalize z-order, remove empty shapes.",
  inputSchema: S({ dryRun: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const changes: any[] = [];
    sessions.mutate(s, () => {
      for (const slide of s.spec.slides) {
        const map = new Map<string, string>();
        const used = new Set<string>();
        for (const o of slide.objects) {
          const band = o.band ?? "content";
          let base = o.id.includes("/") ? o.id.split("/").slice(1).join("/") : o.id;
          base = safeName(base, o.type);
          let next = `${band}/${base}`;
          let i = 2;
          while (used.has(next)) next = `${band}/${base}-${i++}`;
          used.add(next);
          if (next !== o.id) { map.set(o.id, next); changes.push({ slideId: slide.id, from: o.id, to: next }); if (!args.dryRun) o.id = next; }
        }
        if (!args.dryRun) {
          for (const o of slide.objects) {
            if (o.dataRef && map.has(o.dataRef)) o.dataRef = map.get(o.dataRef);
            if (o.children) o.children = o.children.map((c) => map.get(c) ?? c);
            if (o.cf?.maskId && map.has(o.cf.maskId)) o.cf.maskId = map.get(o.cf.maskId);
          }
          const byBand = new Map<string, any[]>();
          for (const o of slide.objects) { const b = o.band ?? "content"; byBand.set(b, [...(byBand.get(b) ?? []), o]); }
          for (const [b, list] of byBand) list.sort((a, b2) => (a.z ?? zForBand(b)) - (b2.z ?? zForBand(b))).forEach((o, i) => { o.z = zForBand(b) + i * 0.01; });
          const before = slide.objects.length;
          slide.objects = slide.objects.filter((o) => !(o.type === "shape" && !o.text && !o.fill?.color && !o.image && !o.chart && !o.table && !o.line?.color && o.geometry.w < 0.1 && o.geometry.h < 0.1));
          if (before !== slide.objects.length) changes.push({ slideId: slide.id, removedEmpty: before - slide.objects.length });
        }
      }
    });
    return okData({ changes, count: changes.length });
  },
});

const namingAudit = (): ToolDef => ({
  name: "naming_audit",
  description: "Check band-prefixed naming and duplicate object ids.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const issues = checkNaming(s.spec);
    for (const sl of s.spec.slides) for (const o of sl.objects) {
      if (!/^(bg|deco|content|data|ui|note|edit-source)\//.test(o.id)) issues.push({ code: "E_NAMING", slideId: sl.id, objectId: o.id, severity: "major", message: "Missing band prefix" });
    }
    return okData({ ok: issues.length === 0, issues });
  },
});

const themeBindAudit = (): ToolDef => ({
  name: "theme_bind_audit",
  description: "Find hardcoded colors and fonts not bound to theme tokens.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const colors = new Set(Object.values(s.spec.tokens?.color ?? {}).map((c: any) => String(c).toUpperCase()));
    const fonts = new Set(Object.values(s.spec.tokens?.font ?? {}).map((f: any) => String(f).toLowerCase()));
    const hardcoded: any[] = [];
    for (const sl of s.spec.slides) for (const o of sl.objects) {
      if (o.text?.color && !colors.has(o.text.color.toUpperCase())) hardcoded.push({ slideId: sl.id, objectId: o.id, kind: "textColor", value: o.text.color });
      if (o.fill?.color && !colors.has(o.fill.color.toUpperCase())) hardcoded.push({ slideId: sl.id, objectId: o.id, kind: "fill", value: o.fill.color });
      if (o.text?.fontFamily && !fonts.has(o.text.fontFamily.toLowerCase())) hardcoded.push({ slideId: sl.id, objectId: o.id, kind: "font", value: o.text.fontFamily });
    }
    return okData({ ok: hardcoded.length === 0, hardcoded, count: hardcoded.length });
  },
});

const nativeCheck = (): ToolDef => ({
  name: "native_check",
  description: "Detect rasterized text/chart/table objects.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const raster: any[] = [];
    for (const sl of s.spec.slides) for (const o of sl.objects) if (o.cf?.raster) raster.push({ slideId: sl.id, objectId: o.id, type: o.type });
    return okData({ ok: raster.length === 0, raster, count: raster.length });
  },
});

const flattenObject = (): ToolDef => ({
  name: "flatten_object",
  description: "Mark an object as rasterized (keeps a warning and source snapshot).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), reason: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = s.spec.slides.find((sl) => sl.objects.some((o) => o.id === args.objectId));
    const obj = slide?.objects.find((o) => o.id === args.objectId);
    if (!obj || !slide) throw new XPError("E_NOT_FOUND", `Object not found: ${args.objectId}`);
    sessions.mutate(s, () => {
      obj.cf = { ...(obj.cf ?? {}), raster: true, flattenReason: args.reason ?? "handoff", sourceSnapshot: JSON.parse(JSON.stringify(obj)) };
    });
    return okData({ objectId: obj.id, raster: true }, ["Object is flagged as raster; actual pixel flattening requires render."]);
  },
});

const unflattenCheck = (): ToolDef => ({
  name: "unflatten_check",
  description: "Check which raster-flagged objects can be restored.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const items: any[] = [];
    for (const sl of s.spec.slides) for (const o of sl.objects) if (o.cf?.raster) items.push({ slideId: sl.id, objectId: o.id, restorable: Boolean(o.cf.sourceSnapshot) });
    return okData({ items, restorable: items.filter((x) => x.restorable).length, total: items.length });
  },
});

const deckRebuild = (): ToolDef => ({
  name: "deck_rebuild",
  description: "Rebuild a deck session from a spec.json file.",
  inputSchema: S({ path: z.string(), title: z.string().optional() }),
  handler: (args) => {
    if (!existsSync(args.path)) throw new XPError("E_NOT_FOUND", `Spec not found: ${args.path}`);
    const spec = JSON.parse(readFileSync(args.path, "utf8")) as DeckSpec;
    if (!spec.slides) throw new XPError("E_SPEC", "Not a deck spec");
    const s = sessions.create(spec, args.title ?? spec.meta?.title ?? "rebuilt");
    return okData({ deckId: s.id, slides: s.spec.slides.length, title: s.spec.meta.title });
  },
});

const handoffPackage = (): ToolDef => ({
  name: "handoff_package",
  description: "Export _editable + _flat + notes + assets as a zip package.",
  inputSchema: S({ force: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const base = safeName(s.spec.meta.title ?? "deck");
    const dir = path.join(outDir("exports"), `${base}-handoff`);
    ensureDir(dir);
    const editable = await buildDeck(s.spec, dir, `${base}-editable`);
    const flatSpec = JSON.parse(JSON.stringify(s.spec));
    for (const sl of flatSpec.slides) for (const o of sl.objects) if (o.text) o.cf = { ...(o.cf ?? {}), raster: true };
    const flat = await buildDeck(flatSpec, dir, `${base}-flat`);
    const notes = s.spec.slides.map((sl: any, i: number) => `Slide ${i + 1} — ${sl.name ?? sl.type}\n${sl.notes ?? ""}`).join("\n\n");
    writeFileSync(path.join(dir, `${base}-notes.txt`), notes, "utf8");
    writeFileSync(path.join(dir, "deck.spec.json"), JSON.stringify(s.spec, null, 2), "utf8");
    for (const a of s.spec.assets ?? []) if (a.path && existsSync(a.path)) {
      const dest = path.join(dir, "assets", path.basename(a.path));
      ensureDir(path.dirname(dest));
      copyFileSync(a.path, dest);
    }
    const zip = path.join(outDir("exports"), `${base}-handoff.zip`);
    const r = spawnSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${dir}\\*' -DestinationPath '${zip}' -Force`], { windowsHide: true });
    if (!existsSync(zip)) throw new XPError("E_ENGINE", "Zip failed", { stderr: r.stderr?.toString().slice(0, 500) });
    return okData({ zip, dir, editable: editable.file, flat: flat.file, notes: path.join(dir, `${base}-notes.txt`) }, ["Flat package is flagged, not pixel-rasterized."]);
  },
});

export const handoffTools: ToolDef[] = [
  editabilityAuditTool(), handoffCleanup(), editabilityReport(), namingAudit(), themeBindAudit(), nativeCheck(),
  flattenObject(), unflattenCheck(), deckRebuild(), handoffPackage(),
];
