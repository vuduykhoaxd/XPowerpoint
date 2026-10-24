import { z } from "zod";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import type { DeckSpec, ToolDef } from "../types.js";
import { XPError, ok } from "../errors.js";
import { sessions } from "../session.js";
import { defaultSpec, styleTokens } from "../tokens.js";
import { S, sessionOf, deckSummary, slideSummary, assertApproved, nextSlideId, okData } from "./helpers.js";
import { buildDeck } from "../engine/pptxgen/builder.js";
import { readPptx } from "../engine/com/bridge.js";
import { outDir, safeName, ensureDir } from "../utils/paths.js";

const deckNew = (): ToolDef => ({
  name: "deck_new",
  description: "Create a new deck session. Requires an approved brief with slideCount before slides can be added.",
  inputSchema: S({
    title: z.string().optional(),
    style: z.string().optional(),
    brief: z.object({}).passthrough().optional(),
    spec: z.object({}).passthrough().optional(),
    size: z.object({ w: z.number(), h: z.number(), unit: z.string().optional() }).optional(),
  }),
  handler: (args) => {
    const style = args.style ?? args.spec?.meta?.style ?? "corporate-clean";
    const session = sessions.create(args.spec, args.title ?? args.spec?.meta?.title ?? "Untitled", args.brief, style);
    if (args.size) session.spec.meta.size = args.size;
    if (args.spec?.slides && args.spec.meta) session.spec = { ...session.spec, ...args.spec };
    const brief = session.spec.brief;
    const missing = !brief?.approved ? ["slideCount", "audience", "durationMin", "language", "output", "brand"].filter((k) => !brief || (brief as any)[k] === undefined) : [];
    return okData({ ...deckSummary(session), missingBriefFields: missing, theme: styleTokens(style) },
      [], brief?.approved ? null : "intake_questions");
  },
});

const deckOpen = (): ToolDef => ({
  name: "deck_open",
  description: "Open an existing .pptx, .spec.json, or deck spec JSON into a session.",
  inputSchema: S({ path: z.string() }),
  handler: async (args) => {
    const p = path.resolve(args.path);
    if (!existsSync(p)) throw new XPError("E_NOT_FOUND", `File not found: ${p}`);
    if (p.endsWith(".json")) {
      const spec = JSON.parse(readFileSync(p, "utf8")) as DeckSpec;
      if (!spec.slides) throw new XPError("E_SPEC", "JSON is not a deck spec (missing slides)");
      const s = sessions.open(spec, p);
      return okData({ ...deckSummary(s), specFile: p });
    }
    if (!p.toLowerCase().endsWith(".pptx")) throw new XPError("E_INVALID_INPUT", "Only .pptx or .spec.json supported");
    const r: any = await readPptx(p);
    if (!r.ok) throw new XPError("E_COM_UNAVAILABLE", r.message ?? "python-pptx unavailable", r);
    const spec = specFromReader(r, p);
    const s = sessions.open(spec, p);
    return okData({ ...deckSummary(s), readOnlyStructure: true, warning: "Imported structure is text/shape only; transitions/animation require COM inspection." }, r.warnings ?? []);
  },
});

function specFromReader(r: any, file: string): DeckSpec {
  const title = path.basename(file, ".pptx");
  const spec = defaultSpec(title, { goal: title, slideCount: r.slides?.length ?? 1, language: "vi", output: ["pptx"], approved: true });
  const seen = new Set<string>();
  spec.slides = (r.slides ?? []).map((sl: any, i: number) => {
    const objects = (sl.shapes ?? []).map((sh: any, j: number) => {
      const x = (sh.left ?? 0) / 914400;
      const y = (sh.top ?? 0) / 914400;
      const w = Math.max(0.05, (sh.width ?? 0) / 914400);
      const h = Math.max(0.05, (sh.height ?? 0) / 914400);
      const text = sh.text ?? "";
      const bandId = typeof sh.name === "string" && /^(bg|deco|content|data|ui|note|edit-source)\//.test(sh.name) ? sh.name : null;
      let id = bandId ?? `content/import-${String(i + 1).padStart(2, "0")}-${String(j + 1).padStart(2, "0")}`;
      if (seen.has(id)) id = `${id}-${i + 1}-${j + 1}`;
      seen.add(id);
      return {
        id,
        type: text ? "text" : "shape",
        band: "content", role: text ? "body" : "container",
        geometry: { x, y, w, h },
        fill: null, line: null, effects: {},
        text: text ? { value: text, fontSize: sh.fontSize ?? 16, color: "#111111", align: "left", valign: "top", margin: 0.04 } : null,
        z: 20, decorative: false, altText: text ? text.slice(0, 120) : "Imported shape", locked: false, sourceRef: null,
      };
    });
    return { id: `s${String(i + 1).padStart(2, "0")}`, type: "blank", objects, notes: sl.notes ?? "" };
  });
  return spec;
}

const deckSave = (): ToolDef => ({
  name: "deck_save",
  description: "Build and save the deck to pptx + spec JSON. Enforces brief approval.",
  inputSchema: S({ path: z.string().optional(), filename: z.string().optional(), specOnly: z.boolean().optional() }),
  handler: async (args) => {
    const session = sessionOf({ sessions }, args);
    assertApproved(session, "save");
    if (args.specOnly) {
      const base = safeName(args.filename ?? session.spec.meta.title ?? "deck");
      const p = path.join(outDir("decks"), base + ".spec.json");
      writeFileSync(p, JSON.stringify(session.spec, null, 2), "utf8");
      return okData({ specFile: p, ...deckSummary(session) });
    }
    const base = args.filename ?? session.spec.meta.title ?? "deck";
    const dir = args.path ? ensureDir(path.dirname(path.resolve(args.path))) : outDir("decks");
    const r = await buildDeck(session.spec, dir, base);
    if (args.path) {
      const target = path.resolve(args.path);
      if (target !== r.file) copyFileSync(r.file, target);
      r.file = target;
    }
    session.filePath = r.file;
    session.dirty = false;
    return okData({ ...r, ...deckSummary(session) }, r.warnings);
  },
});

const deckSaveAs = (): ToolDef => ({
  name: "deck_save_as",
  description: "Save a copy of the deck to a new path.",
  inputSchema: S({ path: z.string(), filename: z.string().optional() }),
  handler: async (args) => {
    const session = sessionOf({ sessions }, args);
    assertApproved(session, "save");
    const target = path.resolve(args.path);
    ensureDir(path.dirname(target));
    const base = args.filename ?? path.basename(target, path.extname(target));
    const r = await buildDeck(session.spec, path.dirname(target), base);
    if (r.file !== target) copyFileSync(r.file, target);
    session.filePath = target;
    return okData({ file: target, specFile: r.specFile, slides: r.slides, objects: r.objects }, r.warnings);
  },
});

const deckClose = (): ToolDef => ({
  name: "deck_close",
  description: "Close a deck session (does not delete files).",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessions.get(args.deckId);
    const summary = deckSummary(s);
    sessions.close(s.id);
    return okData(summary);
  },
});

const deckInfo = (): ToolDef => ({
  name: "deck_info",
  description: "Deck metadata, size, slide list, object counts, fonts, theme, brief state.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const fonts = new Set<string>();
    s.spec.slides.forEach((sl) => sl.objects.forEach((o) => { if (o.text?.fontFamily) fonts.add(o.text.fontFamily); }));
    return okData({ ...deckSummary(s), sections: s.spec.sections ?? [], customShows: s.spec.customShows ?? [], fonts: [...fonts], slides: s.spec.slides.map(slideSummary) });
  },
});

const deckProperties = (): ToolDef => ({
  name: "deck_properties",
  description: "Update deck title, author, subject, keywords, language.",
  inputSchema: S({ properties: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    sessions.mutate(s, () => Object.assign(s.spec.meta, args.properties ?? {}));
    return okData(s.spec.meta);
  },
});

const deckSections = (): ToolDef => ({
  name: "deck_sections",
  description: "List, add, rename or remove deck sections.",
  inputSchema: S({ action: z.enum(["list", "add", "rename", "remove"]).optional(), name: z.string().optional(), newName: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    s.spec.sections ??= [];
    const action = args.action ?? "list";
    if (action === "add") {
      sessions.mutate(s, () => s.spec.sections!.push({ name: args.name ?? "Section" }));
    } else if (action === "rename") {
      sessions.mutate(s, () => { const sec = s.spec.sections!.find((x: any) => x.name === args.name); if (sec) sec.name = args.newName; });
    } else if (action === "remove") {
      sessions.mutate(s, () => { s.spec.sections = s.spec.sections!.filter((x: any) => x.name !== args.name); });
    }
    return okData({ sections: s.spec.sections });
  },
});

const deckCustomShows = (): ToolDef => ({
  name: "deck_custom_shows",
  description: "List or set custom slide shows.",
  inputSchema: S({ action: z.enum(["list", "set", "remove"]).optional(), name: z.string().optional(), slides: z.array(z.number()).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    s.spec.customShows ??= [];
    if (args.action === "set") sessions.mutate(s, () => { s.spec.customShows = [...(s.spec.customShows ?? []).filter((x: any) => x.name !== args.name), { name: args.name, slides: args.slides ?? [] }]; });
    if (args.action === "remove") sessions.mutate(s, () => { s.spec.customShows = (s.spec.customShows ?? []).filter((x: any) => x.name !== args.name); });
    return okData({ customShows: s.spec.customShows });
  },
});

const deckMerge = (): ToolDef => ({
  name: "deck_merge",
  description: "Append slides from another session deck (sourceDeckId).",
  inputSchema: S({ sourceDeckId: z.string(), pages: z.array(z.number()).optional(), after: z.number().optional() }),
  handler: (args) => {
    const target = sessionOf({ sessions }, args);
    const source = sessions.get(args.sourceDeckId);
    const picked = (args.pages?.length ? args.pages.map((n: number) => source.spec.slides[n - 1]) : source.spec.slides).filter(Boolean);
    const before = target.spec.slides.length;
    sessions.mutate(target, () => {
      for (const sl of picked) {
        const clone = JSON.parse(JSON.stringify(sl));
        clone.id = nextSlideId(target);
        clone.objects = clone.objects.map((o: any) => ({ ...o, id: o.id }));
        target.spec.slides.splice(args.after != null ? args.after + (target.spec.slides.length - before) : target.spec.slides.length, 0, clone);
      }
    });
    return okData({ merged: picked.length, slides: target.spec.slides.length });
  },
});

const deckSplit = (): ToolDef => ({
  name: "deck_split",
  description: "Create a new deck from selected pages of the current deck.",
  inputSchema: S({ pages: z.array(z.number()), title: z.string().optional() }),
  handler: (args) => {
    const source = sessionOf({ sessions }, args);
    const spec = JSON.parse(JSON.stringify(source.spec)) as DeckSpec;
    spec.slides = (args.pages ?? []).map((n: number) => source.spec.slides[n - 1]).filter(Boolean).map((sl: any) => JSON.parse(JSON.stringify(sl)));
    spec.meta.title = args.title ?? `${source.spec.meta.title} (split)`;
    spec.brief = { ...(spec.brief ?? {}), slideCount: spec.slides.length };
    const s = sessions.create(spec, spec.meta.title);
    return okData({ ...deckSummary(s), source: source.id });
  },
});

const deckCompare = (): ToolDef => ({
  name: "deck_compare",
  description: "Compare two sessions: slide/object counts and metadata differences.",
  inputSchema: S({ otherDeckId: z.string() }),
  handler: (args) => {
    const a = sessionOf({ sessions }, args);
    const b = sessions.get(args.otherDeckId);
    const objectCount = (s: any) => s.spec.slides.reduce((n: number, x: any) => n + x.objects.length, 0);
    return okData({
      a: { id: a.id, title: a.spec.meta.title, slides: a.spec.slides.length, objects: objectCount(a), size: a.spec.meta.size },
      b: { id: b.id, title: b.spec.meta.title, slides: b.spec.slides.length, objects: objectCount(b), size: b.spec.meta.size },
      diff: {
        slides: b.spec.slides.length - a.spec.slides.length,
        objects: objectCount(b) - objectCount(a),
        sizeChanged: JSON.stringify(a.spec.meta.size) !== JSON.stringify(b.spec.meta.size),
        themeChanged: a.spec.meta.theme !== b.spec.meta.theme,
      },
    });
  },
});

const intakeQuestions = (): ToolDef => ({
  name: "intake_questions",
  description: "Always returns the mandatory slide-count question plus any missing brief fields.",
  inputSchema: S({ brief: z.object({}).passthrough().optional(), known: z.object({}).passthrough().optional() }),
  handler: (args) => {
    const brief = args.brief ?? args.known ?? {};
    const q: any[] = [];
    if (!brief.slideCount) q.push({
      id: "slideCount", required: true,
      question: "Bạn cần khoảng bao nhiêu slide?",
      options: [
        { label: "10–12 slide (10 phút)", value: 11 },
        { label: "12–18 slide (15 phút)", value: 15 },
        { label: "16–22 slide (20 phút)", value: 20 },
        { label: "22–30 slide (30 phút)", value: 26 },
      ],
      formula: "slides ≈ phút × 1.5 + 2",
    });
    if (!brief.goal) q.push({ id: "goal", required: true, question: "Mục đích của deck là gì?" });
    if (!brief.audience) q.push({ id: "audience", required: true, question: "Người nghe là ai?" });
    if (!brief.durationMin) q.push({ id: "durationMin", required: true, question: "Thời lượng trình bày bao nhiêu phút?" });
    if (!brief.language) q.push({ id: "language", required: true, question: "Ngôn ngữ?", options: [{ label: "Tiếng Việt", value: "vi" }, { label: "English", value: "en" }] });
    if (!brief.output) q.push({ id: "output", required: true, question: "Cần output gì?", options: [{ label: "pptx + pdf", value: ["pptx", "pdf"] }, { label: "pptx editable", value: ["pptx"] }, { label: "png", value: ["png"] }, { label: "mp4", value: ["mp4"] }] });
    if (brief.brand === undefined) q.push({ id: "brand", required: true, question: "Có brand (màu/font/logo) hay để tự do?" });
    if (brief.mustHave === undefined) q.push({ id: "mustHave", required: false, question: "Nội dung bắt buộc phải có?" });
    return okData({ questions: q, mandatory: q.filter((x) => x.required).map((x) => x.id), note: "Ask once, grouped. Do not build before slideCount + approved:true." });
  },
});

const briefSet = (): ToolDef => ({
  name: "brief_set",
  description: "Set/merge brief fields and record assumptions.",
  inputSchema: S({ brief: z.object({}).passthrough(), assumptions: z.array(z.string()).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const incoming = args.brief ?? {};
    if (incoming.slideCount && !incoming.slideCountSource) incoming.slideCountSource = "user";
    sessions.mutate(s, () => {
      s.spec.brief = { ...(s.spec.brief ?? {}), ...incoming, assumptions: [...(s.spec.brief?.assumptions ?? []), ...(args.assumptions ?? [])], approved: incoming.approved === true ? true : false };
    });
    const brief = s.spec.brief!;
    const missing = ["goal", "slideCount", "language", "output"].filter((k) => (brief as any)[k] === undefined || (brief as any)[k] === null);
    return okData({ brief, missing, readyToApprove: missing.length === 0 && Boolean(brief.slideCount) }, [], missing.length ? "brief_set" : "brief_confirm");
  },
});

const briefConfirm = (): ToolDef => ({
  name: "brief_confirm",
  description: "Approve the brief. Requires slideCount > 0.",
  inputSchema: S({ approved: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const b = s.spec.brief ?? {};
    if (!b.slideCount || b.slideCount < 1) throw new XPError("E_BRIEF", "Cannot approve: slideCount is missing. Ask the user first.");
    sessions.mutate(s, () => { s.spec.brief = { ...b, approved: true }; });
    return okData({ brief: s.spec.brief, next: "deck_new or slide_add" });
  },
});

const briefGet = (): ToolDef => ({
  name: "brief_get",
  description: "Read the current brief and missing fields.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const b = s.spec.brief ?? {};
    const missing = ["goal", "audience", "durationMin", "slideCount", "language", "output", "brand"].filter((k) => (b as any)[k] === undefined || (b as any)[k] === null);
    return okData({ brief: b, missing, approved: b.approved === true });
  },
});

export const deckTools: ToolDef[] = [
  deckNew(), deckOpen(), deckSave(), deckSaveAs(), deckClose(), deckInfo(), deckProperties(),
  deckSections(), deckCustomShows(), deckMerge(), deckSplit(), deckCompare(),
  intakeQuestions(), briefSet(), briefConfirm(), briefGet(),
];
