import { sessions } from "../session.js";
import { z } from "zod";
import type { SlideSpec, ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, slideOf, okData } from "./helpers.js";
import { applyMotion, comAvailable } from "../engine/com/bridge.js";
import { buildDeck } from "../engine/pptxgen/builder.js";
import { outDir } from "../utils/paths.js";

function ensureMotion(slide: SlideSpec) {
  const m: any = (slide.motion ??= { sequence: [] } as any);
  m.sequence ??= [];
  return m;
}

function animId(slide: SlideSpec, prefix = "a") {
  const n = (slide.motion?.sequence?.length ?? 0) + 1;
  return `${prefix}${String(n).padStart(2, "0")}`;
}

const motionTransitionSet = (): ToolDef => ({
  name: "transition_set",
  description: "Set transition type/duration/advance for a slide.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), type: z.string(), duration: z.number().optional(), advance: z.string().optional(), morph: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const transition = { type: args.type, duration: args.duration ?? 0.6, advance: args.advance ?? "onClick" };
    sessions.mutate(s, () => { slide.transition = transition; ensureMotion(slide).transition = transition; });
    return okData({ slideId: slide.id, transition }, args.type === "morph" ? ["Morph requires PowerPoint COM; spec stores intent."] : []);
  },
});

const motionBulk = (): ToolDef => ({
  name: "transition_bulk",
  description: "Apply the same transition to all (or filtered) slides.",
  inputSchema: S({ type: z.string(), duration: z.number().optional(), skipFirst: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const targets = args.skipFirst ? s.spec.slides.slice(1) : s.spec.slides;
    sessions.mutate(s, () => {
      for (const sl of targets) {
        const t = { type: args.type, duration: args.duration ?? 0.6, advance: "onClick" };
        sl.transition = t; ensureMotion(sl).transition = t;
      }
    });
    return okData({ slides: targets.length, type: args.type });
  },
});

const motionAnimationAdd = (): ToolDef => ({
  name: "animation_add",
  description: "Add an entrance/emphasis/exit animation to an object.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), effect: z.string().optional(), category: z.string().optional(), start: z.string().optional(), duration: z.number().optional(), delay: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    if (!slide.objects.some((o) => o.id === args.objectId)) throw new XPError("E_NOT_FOUND", `Object not found: ${args.objectId}`);
    const m = ensureMotion(slide);
    const anim = { id: animId(slide), objectId: args.objectId, effect: args.effect ?? "fade", category: args.category ?? "entrance", start: args.start ?? "onClick", duration: args.duration ?? 0.5, delay: args.delay ?? 0 };
    sessions.mutate(s, () => m.sequence.push(anim));
    return okData({ animation: anim, total: m.sequence.length });
  },
});

const motionSequence = (): ToolDef => ({
  name: "animation_sequence",
  description: "Set the ordered animation sequence from object ids.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectIds: z.array(z.string()), effect: z.string().optional(), stagger: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const m = ensureMotion(slide);
    const seq = args.objectIds.map((id: string, i: number) => ({ id: `a${String(i + 1).padStart(2, "0")}`, objectId: id, effect: args.effect ?? "fade", category: "entrance", start: "onClick", duration: 0.5, delay: (args.stagger ?? 0) * i }));
    sessions.mutate(s, () => { m.sequence = seq; });
    return okData({ sequence: seq });
  },
});

const motionTiming = (): ToolDef => ({
  name: "animation_timing",
  description: "Update duration/delay/start for an animation by id or index.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), animationId: z.string().optional(), index: z.number().optional(), duration: z.number().optional(), delay: z.number().optional(), start: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const m = ensureMotion(slide);
    const a = args.animationId ? m.sequence.find((x: any) => x.id === args.animationId) : m.sequence[(args.index ?? 1) - 1];
    if (!a) throw new XPError("E_NOT_FOUND", "Animation not found");
    sessions.mutate(s, () => { if (args.duration != null) a.duration = args.duration; if (args.delay != null) a.delay = args.delay; if (args.start) a.start = args.start; });
    return okData({ animation: a });
  },
});

const motionTrigger = (): ToolDef => ({
  name: "animation_trigger",
  description: "Set animation trigger: onClick, withPrevious, afterPrevious, or a click target.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), animationId: z.string(), trigger: z.string(), target: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const m = ensureMotion(slide);
    const a = m.sequence.find((x: any) => x.id === args.animationId);
    if (!a) throw new XPError("E_NOT_FOUND", `Animation not found: ${args.animationId}`);
    sessions.mutate(s, () => { a.start = args.trigger; a.triggerTarget = args.target ?? null; });
    return okData({ animation: a });
  },
});

const motionPath = (): ToolDef => ({
  name: "animation_motion_path",
  description: "Attach a motion path (points in inches) to an animation.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), animationId: z.string().optional(), objectId: z.string().optional(), points: z.array(z.object({ x: z.number(), y: z.number() })), duration: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const m = ensureMotion(slide);
    let a = args.animationId ? m.sequence.find((x: any) => x.id === args.animationId) : undefined;
    if (!a && args.objectId) {
      a = { id: animId(slide, "p"), objectId: args.objectId, effect: "motionPath", category: "path", start: "onClick", duration: args.duration ?? 2, delay: 0 };
      sessions.mutate(s, () => m.sequence.push(a));
    }
    if (!a) throw new XPError("E_INVALID_INPUT", "Provide animationId or objectId");
    sessions.mutate(s, () => { a.points = args.points; a.effect = "motionPath"; if (args.duration) a.duration = args.duration; });
    return okData({ animation: a });
  },
});

const motionStagger = (): ToolDef => ({
  name: "animation_stagger",
  description: "Assign increasing delays to a sequence.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), step: z.number().optional(), startDelay: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const m = ensureMotion(slide);
    sessions.mutate(s, () => m.sequence.forEach((a: any, i: number) => { a.delay = (args.startDelay ?? 0) + (args.step ?? 0.15) * i; }));
    return okData({ sequence: m.sequence });
  },
});

const motionMorph = (): ToolDef => ({
  name: "animation_morph",
  description: "Configure a morph transition between two slides (COM required at apply time).",
  inputSchema: S({ fromSlideId: z.union([z.string(), z.number()]), toSlideId: z.union([z.string(), z.number()]), duration: z.number().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const from = slideOf(s, { slideId: args.fromSlideId });
    const to = slideOf(s, { slideId: args.toSlideId });
    const t = { type: "morph", duration: args.duration ?? 0.8, advance: "onClick", from: from.id, to: to.id };
    sessions.mutate(s, () => { ensureMotion(to).transition = t; to.transition = t; });
    const com = await comAvailable();
    return okData({ transition: t, comAvailable: com }, com ? [] : ["COM unavailable: morph will not be applied to the exported file."]);
  },
});

const motionClone = (): ToolDef => ({
  name: "animation_clone",
  description: "Clone motion from one slide to another, remapping object ids by index.",
  inputSchema: S({ fromSlideId: z.union([z.string(), z.number()]), toSlideId: z.union([z.string(), z.number()]) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const from = slideOf(s, { slideId: args.fromSlideId });
    const to = slideOf(s, { slideId: args.toSlideId });
    const src = JSON.parse(JSON.stringify(from.motion ?? { sequence: [] }));
    const map = new Map(from.objects.map((o, i) => [o.id, to.objects[i]?.id]));
    src.sequence = (src.sequence ?? []).map((a: any) => ({ ...a, objectId: map.get(a.objectId) ?? a.objectId }));
    sessions.mutate(s, () => { to.motion = src; to.transition = from.transition; });
    return okData({ cloned: src.sequence.length });
  },
});

const motionReorder = (): ToolDef => ({
  name: "animation_reorder",
  description: "Reorder animations by explicit id list.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), order: z.array(z.string()) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const m = ensureMotion(slide);
    const map = new Map(m.sequence.map((a: any) => [a.id, a]));
    const next = args.order.map((id: string) => map.get(id)).filter(Boolean);
    if (next.length !== m.sequence.length) throw new XPError("E_INVALID_INPUT", "Order must include every animation id");
    sessions.mutate(s, () => { m.sequence = next; });
    return okData({ sequence: m.sequence });
  },
});

const motionRemove = (): ToolDef => ({
  name: "animation_remove",
  description: "Remove one animation, all animations on a slide, or transitions.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), animationId: z.string().optional(), all: z.boolean().optional(), transition: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const m = ensureMotion(slide);
    sessions.mutate(s, () => {
      if (args.all) m.sequence = [];
      else if (args.animationId) m.sequence = m.sequence.filter((a: any) => a.id !== args.animationId);
      if (args.transition) { m.transition = null; slide.transition = undefined; }
    });
    return okData({ sequence: m.sequence, transition: m.transition ?? null });
  },
});

const motionPreview = (): ToolDef => ({
  name: "motion_preview",
  description: "Describe animation timing, optionally applying motion to a built pptx via COM.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), apply: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const com = await comAvailable();
    const summary = {
      slideId: slide.id,
      transition: slide.transition ?? null,
      animations: (slide.motion as any)?.sequence ?? [],
      totalDuration: ((slide.motion as any)?.sequence ?? []).reduce((n: number, a: any) => Math.max(n, (a.delay ?? 0) + (a.duration ?? 0.5)), 0),
    };
    if (!args.apply) return okData({ ...summary, comAvailable: com });
    if (!com) throw new XPError("E_COM_UNAVAILABLE", "COM unavailable: cannot apply animation natively");
    const built = await buildDeck(s.spec, outDir("previews"), "motion-preview");
    const out = outDir("previews") + "\\motion-preview-animated.pptx";
    const r = await applyMotion(built.file, s.spec.slides.map((sl) => ({ index: s.spec.slides.indexOf(sl) + 1, transition: sl.transition, sequence: (sl.motion as any)?.sequence ?? [] })), out);
    return okData({ ...summary, applied: r.ok, file: out, engine: r });
  },
});

const motionSlideshowSettings = (): ToolDef => ({
  name: "slideshow_settings",
  description: "Set slideshow settings (loop, show type, narration, resolution).",
  inputSchema: S({ settings: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    sessions.mutate(s, () => { (s.spec as any).slideshow = { ...((s.spec as any).slideshow ?? {}), ...args.settings }; });
    return okData({ slideshow: (s.spec as any).slideshow });
  },
});

export const motionTools: ToolDef[] = [
  motionTransitionSet(), motionBulk(), motionAnimationAdd(), motionSequence(), motionTiming(), motionTrigger(),
  motionPath(), motionStagger(), motionMorph(), motionClone(), motionReorder(), motionRemove(), motionPreview(), motionSlideshowSettings(),
];
