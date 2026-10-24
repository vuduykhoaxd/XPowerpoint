import { sessions } from "../session.js";
import { z } from "zod";
import type { ObjectSpec, ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, slideOf, objectOf, okData } from "./helpers.js";
import { measureText, fitFontSize } from "../engine/compose/text-metrics.js";

function ensureText(obj: ObjectSpec): any {
  if (!obj.text) throw new XPError("E_INVALID_INPUT", `Object ${obj.id} is not a text object`);
  return obj.text;
}

const textSet = (): ToolDef => ({
  name: "text_set",
  description: "Set the plain text content of a text object.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), text: z.string(), autoFit: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    sessions.mutate(s, () => { t.value = args.text; t.paragraphs = undefined; });
    if (args.autoFit) {
      const size = fitFontSize(args.text, obj.geometry.w, obj.geometry.h, t, 10, t.fontSize ?? 96);
      const m = measureText(args.text, obj.geometry.w, obj.geometry.h, { ...t, fontSize: size });
      sessions.mutate(s, () => { t.fontSize = size; });
      return okData({ objectId: obj.id, text: t.value, fontSize: t.fontSize, fit: { size, overflow: m.overflow, lines: m.lines } }, m.overflow ? ["Still overflows at minimum size."] : []);
    }
    return okData({ objectId: obj.id, text: t.value });
  },
});

function parseMarkdown(md: string) {
  const paragraphs: any[] = [];
  for (const raw of md.split(/\r?\n/)) {
    if (!raw.trim()) { paragraphs.push({ text: "", runs: [{ text: "" }], align: "left" }); continue; }
    let line = raw.trimEnd();
    let level = 0;
    let bullet: any = null;
    let align = "left";
    if (/^#{1,6}\s/.test(line)) { level = line.match(/^#+/)?.[0].length ?? 1; line = line.replace(/^#+\s*/, ""); }
    else if (/^[-*•]\s+/.test(line)) { bullet = { type: "bullet" }; line = line.replace(/^[-*•]\s+/, ""); }
    else if (/^\d+[.)]\s+/.test(line)) { bullet = { type: "number" }; line = line.replace(/^\d+[.)]\s+/, ""); }
    const indent = Math.floor((raw.match(/^\s*/)?.[0].length ?? 0) / 2);
    if (bullet) bullet.level = indent;
    const runs: any[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    let m: RegExpExecArray | null;
    const pushText = (txt: string, fmt: any = {}) => { if (txt) runs.push({ text: txt, ...fmt }); };
    while ((m = re.exec(line))) {
      pushText(line.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith("**")) pushText(tok.slice(2, -2), { bold: true });
      else if (tok.startsWith("`")) pushText(tok.slice(1, -1), { fontFamily: "Consolas" });
      else if (tok.startsWith("[")) { const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/); if (mm) runs.push({ text: mm[1], link: mm[2] }); }
      else pushText(tok.slice(1, -1), { italic: true });
      last = m.index + tok.length;
    }
    pushText(line.slice(last));
    if (!runs.length) runs.push({ text: "" });
    paragraphs.push({ text: line, runs, level, bullet, align });
  }
  return paragraphs;
}

const textMarkdown = (): ToolDef => ({
  name: "text_markdown",
  description: "Parse markdown (headings, bullets, bold, italic, links) into formatted paragraphs.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), markdown: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    const paragraphs = parseMarkdown(args.markdown);
    sessions.mutate(s, () => { t.paragraphs = paragraphs; t.value = paragraphs.map((p: any) => p.text).join("\n"); });
    return okData({ objectId: obj.id, paragraphs: paragraphs.length, characters: t.value.length });
  },
});

const textMetrics = (): ToolDef => ({
  name: "text_metrics",
  description: "Measure rendered text dimensions against the object box.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), text: z.string().optional(), fontSize: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    const value = args.text ?? t.value ?? "";
    const fs = args.fontSize ?? t.fontSize ?? 18;
    const m = measureText(value, obj.geometry.w, obj.geometry.h, { ...t, fontSize: fs });
    return okData({ width: m.width, height: m.height, lines: m.lines, box: { w: obj.geometry.w, h: obj.geometry.h }, overflow: m.overflow, overflowX: m.width > obj.geometry.w - (t.margin ?? 0.04) * 2 + 0.01, overflowY: m.height > obj.geometry.h + 0.02, longestLine: m.longestLine });
  },
});

const textFit = (): ToolDef => ({
  name: "text_fit",
  description: "Suggest the largest font size that fits the box.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), minSize: z.number().optional(), maxSize: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    const size = fitFontSize(t.value ?? "", obj.geometry.w, obj.geometry.h, t, args.minSize ?? 10, args.maxSize ?? t.fontSize ?? 96);
    const m = measureText(t.value ?? "", obj.geometry.w, obj.geometry.h, { ...t, fontSize: size });
    return okData({ size, fontSize: size, overflow: m.overflow, lines: m.lines });
  },
});

const textAutofit = (): ToolDef => ({
  name: "text_autofit",
  description: "Apply computed font size to make text fit.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), minSize: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    const size = fitFontSize(t.value ?? "", obj.geometry.w, obj.geometry.h, t, args.minSize ?? 10, t.fontSize ?? 96);
    const m = measureText(t.value ?? "", obj.geometry.w, obj.geometry.h, { ...t, fontSize: size });
    sessions.mutate(s, () => { t.fontSize = size; });
    return okData({ objectId: obj.id, fontSize: size, fit: { size, overflow: m.overflow, lines: m.lines } }, m.overflow ? ["Text still overflows at minimum size; shorten copy or enlarge box."] : []);
  },
});

const textRuns = (): ToolDef => ({
  name: "text_runs",
  description: "Set rich runs for a paragraph index.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), paragraphIndex: z.number().optional(), runs: z.array(z.object({}).passthrough()) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    t.paragraphs ??= [{ text: t.value ?? "", runs: [{ text: t.value ?? "" }] }];
    const idx = args.paragraphIndex ?? 0;
    if (!t.paragraphs[idx]) throw new XPError("E_NOT_FOUND", `Paragraph ${idx} not found`);
    sessions.mutate(s, () => { t.paragraphs![idx].runs = args.runs; t.paragraphs![idx].text = args.runs.map((r: any) => r.text).join(""); });
    return okData({ objectId: obj.id, paragraphIndex: idx, runs: t.paragraphs[idx].runs });
  },
});

const textStyle = (): ToolDef => ({
  name: "text_style",
  description: "Set typography: font, size, color, bold/italic, align, line height, spacing.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), style: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    const st = args.style ?? {};
    sessions.mutate(s, () => { Object.assign(t, st); });
    return okData({ objectId: obj.id, text: t });
  },
});

const textBullets = (): ToolDef => ({
  name: "text_bullets",
  description: "Replace text with a bulleted/numbered list.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), items: z.array(z.string()), ordered: z.boolean().optional(), level: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const t = ensureText(obj);
    const paragraphs = args.items.map((txt: string) => ({ text: txt, runs: [{ text: txt }], bullet: { type: args.ordered ? "number" : "bullet", level: args.level ?? 0 }, align: "left" }));
    sessions.mutate(s, () => { t.paragraphs = paragraphs; t.value = args.items.join("\n"); });
    return okData({ objectId: obj.id, items: paragraphs.length });
  },
});

const textEffects = (): ToolDef => ({
  name: "text_effects",
  description: "Apply text outline, shadow, highlight, glow, or transform.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), effects: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    ensureText(obj);
    sessions.mutate(s, () => { obj.effects = { ...(obj.effects ?? {}), text: { ...((obj.effects as any)?.text ?? {}), ...args.effects } }; });
    return okData({ objectId: obj.id, textEffects: (obj.effects as any)?.text });
  },
});

const VN_RE = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

const textVnTypography = (): ToolDef => ({
  name: "text_vn_typography",
  description: "Audit Vietnamese typography: diacritics, smart quotes, spacing, safe fonts.",
  inputSchema: S({ text: z.string().optional(), slideId: z.union([z.string(), z.number()]).optional() }),
  handler: (args) => {
    const issues: any[] = [];
    let text = args.text ?? "";
    if (!text) {
      const s = sessionOf({ sessions }, args);
      text = s.spec.slides.flatMap((sl) => sl.objects.map((o) => o.text?.value ?? "")).join("\n");
    }
    if (/\s{2,}/.test(text)) issues.push({ rule: "double-space", count: (text.match(/\s{2,}/g) ?? []).length });
    if (/["']/.test(text)) issues.push({ rule: "straight-quotes", fix: "Use “ ” and ‘ ’" });
    if (/[a-zA-Z]/.test(text) && !VN_RE.test(text)) issues.push({ rule: "no-vietnamese-diacritics", note: "Text may be unaccented Vietnamese or English." });
    if (/\.\.\./.test(text)) issues.push({ rule: "ellipsis", fix: "Use …" });
    if (/ -- /.test(text)) issues.push({ rule: "double-hyphen", fix: "Use en dash –" });
    return okData({ issues, safeFonts: ["Segoe UI", "Arial", "Calibri", "Georgia", "Be Vietnam Pro", "Inter", "Noto Sans"], recommendedLineHeight: 1.15, recommendedTracking: 0 });
  },
});

export const textTools: ToolDef[] = [
  textSet(), textMarkdown(), textMetrics(), textFit(), textAutofit(), textRuns(),
  textStyle(), textBullets(), textEffects(), textVnTypography(),
];
