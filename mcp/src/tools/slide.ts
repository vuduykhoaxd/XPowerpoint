import { sessions } from "../session.js";
import { z } from "zod";
import type { SlideSpec, ToolDef } from "../types.js";
import { XPError, ok } from "../errors.js";
import { S, sessionOf, slideOf, assertApproved, slideSummary, nextSlideId, okData } from "./helpers.js";
import { composeArchetype } from "../engine/compose/archetypes.js";
import { safeArea } from "../engine/compose/grid.js";

const ARCHETYPES = ["cover", "agenda", "section-divider", "statement", "hero-metric", "kpi-dashboard",
  "card-grid", "comparison", "matrix-2x2", "process", "timeline", "roadmap", "funnel",
  "hierarchy", "text-and-bullets", "image-and-text", "full-bleed-image", "quote",
  "data-table", "chart-focus", "diagram-system", "map", "before-after", "conclusion-cta", "blank"] as const;

const slideAdd = (): ToolDef => ({
  name: "slide_add",
  description: "Add a slide from one of the 24 archetypes or from explicit objects.",
  inputSchema: S({
    type: z.enum(ARCHETYPES).optional(),
    title: z.string().optional(),
    params: z.object({}).passthrough().optional(),
    objects: z.array(z.object({}).passthrough()).optional(),
    after: z.number().optional(),
    index: z.number().optional(),
    id: z.string().optional(),
    tier: z.string().optional(),
    section: z.string().optional(),
  }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    assertApproved(s, "add slides");
    const type = args.type ?? "text-and-bullets";
    const slide: SlideSpec = {
      id: args.id ?? nextSlideId(s),
      type,
      tier: args.tier ?? (["diagram-system", "map", "data-table"].includes(type) ? "T4" : "T2"),
      name: args.title,
      section: args.section ?? null,
      hidden: false,
      objects: [],
      grid: { cols: 12, rows: 8, margin: s.spec.tokens?.grid?.margin ?? 0.5, gutter: s.spec.tokens?.grid?.gutter ?? 0.2 },
      notes: "",
    };
    const params = { ...(args.params ?? {}), title: args.title ?? args.params?.title };
    slide.objects = (args.objects?.length ? args.objects : composeArchetype(s.spec, slide, type, params)) as any;
    const pos = args.index != null ? args.index - 1 : args.after != null ? args.after : s.spec.slides.length;
    sessions.mutate(s, () => s.spec.slides.splice(pos, 0, slide));
    return okData({ slide: slideSummary(slide), total: s.spec.slides.length }, [], "slide_add");
  },
});

const slideDuplicate = (): ToolDef => ({
  name: "slide_duplicate",
  description: "Duplicate a slide, optionally to a target position.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]), target: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const src = slideOf(s, args);
    const clone: SlideSpec = JSON.parse(JSON.stringify(src));
    clone.id = nextSlideId(s);
    clone.objects = clone.objects.map((o) => ({ ...o, id: o.id.replace(/^([^/]+)\//, `$1/`) + "-" + clone.id }));
    const pos = args.target != null ? args.target - 1 : s.spec.slides.indexOf(src) + 1;
    sessions.mutate(s, () => s.spec.slides.splice(pos, 0, clone));
    return okData({ slide: slideSummary(clone), total: s.spec.slides.length });
  },
});

const slideDelete = (): ToolDef => ({
  name: "slide_delete",
  description: "Delete a slide. Permanent.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    if (s.spec.slides.length <= 1) throw new XPError("E_INVALID_INPUT", "Cannot delete the last slide");
    sessions.mutate(s, () => { s.spec.slides = s.spec.slides.filter((x) => x.id !== slide.id); });
    return okData({ deleted: slide.id, total: s.spec.slides.length });
  },
});

const slideMove = (): ToolDef => ({
  name: "slide_move",
  description: "Move a slide to a new 1-based position.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]), target: z.number() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => {
      const from = s.spec.slides.indexOf(slide);
      s.spec.slides.splice(from, 1);
      s.spec.slides.splice(Math.max(0, Math.min(s.spec.slides.length, args.target - 1)), 0, slide);
    });
    return okData({ moved: slide.id, position: s.spec.slides.indexOf(slide) + 1 });
  },
});

const slideHide = (): ToolDef => ({
  name: "slide_hide",
  description: "Hide or unhide a slide.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]), hidden: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => { slide.hidden = args.hidden ?? true; });
    return okData({ slideId: slide.id, hidden: slide.hidden });
  },
});

const slideLayoutSet = (): ToolDef => ({
  name: "slide_layout_set",
  description: "Set the layout name metadata for a slide.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]), layout: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => { slide.layout = args.layout; });
    return okData({ slideId: slide.id, layout: args.layout });
  },
});

const slideMasterSet = (): ToolDef => ({
  name: "slide_master_set",
  description: "Set the master for a slide (applied natively through COM at export when available).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]), master: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => { slide.master = args.master; });
    return okData({ slideId: slide.id, master: args.master }, ["Master surgery requires PowerPoint COM; spec stores the intent."]);
  },
});

const slideBackground = (): ToolDef => ({
  name: "slide_background",
  description: "Set slide background: solid, gradient stops, or image asset.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), background: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => { slide.background = args.background; });
    return okData({ slideId: slide.id, background: slide.background });
  },
});

const slideNotes = (): ToolDef => ({
  name: "slide_notes",
  description: "Set presenter notes (design intent, talking points, version caveats).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), notes: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => { slide.notes = args.notes; });
    return okData({ slideId: slide.id, notes: slide.notes });
  },
});

const slideTransition = (): ToolDef => ({
  name: "slide_transition",
  description: "Set a slide transition spec (native application via COM).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), transition: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => { slide.transition = args.transition; slide.motion = { ...(slide.motion ?? {}), transition: args.transition }; });
    return okData({ slideId: slide.id, transition: slide.transition });
  },
});

const slideSize = (): ToolDef => ({
  name: "slide_size",
  description: "Change deck canvas size in inches.",
  inputSchema: S({ w: z.number(), h: z.number(), unit: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    sessions.mutate(s, () => { s.spec.meta.size = { w: args.w, h: args.h, unit: args.unit ?? "in" }; });
    return okData({ size: s.spec.meta.size });
  },
});

const slideSectionAssign = (): ToolDef => ({
  name: "slide_section_assign",
  description: "Assign a slide to a section.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]), section: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    sessions.mutate(s, () => {
      slide.section = args.section;
      s.spec.sections ??= [];
      if (!s.spec.sections.some((x: any) => x.name === args.section)) s.spec.sections.push({ name: args.section });
    });
    return okData({ slideId: slide.id, section: args.section });
  },
});

export const slideTools: ToolDef[] = [
  slideAdd(), slideDuplicate(), slideDelete(), slideMove(), slideHide(), slideLayoutSet(),
  slideMasterSet(), slideBackground(), slideNotes(), slideTransition(), slideSize(), slideSectionAssign(),
];
