import { z } from "zod";
import type { DeckSession, ObjectSpec, SlideSpec, ToolContext, ToolResult } from "../types.js";
import { XPError } from "../errors.js";
import { safeName } from "../utils/paths.js";

export const anyObj = z.object({}).passthrough();

export function S(shape: Record<string, any> = {}) {
  return { deckId: z.string().optional(), ...shape } as Record<string, z.ZodTypeAny>;
}

export function sessionOf(ctx: ToolContext, args: any): DeckSession {
  return ctx.sessions.get(args?.deckId);
}

export function assertApproved(session: DeckSession, action = "build") {
  const brief = session.spec.brief;
  if (process.env.XP_SKIP_BRIEF === "1") return;
  if (!brief || brief.approved !== true) {
    throw new XPError("E_BRIEF", `Cannot ${action}: brief not approved. Run intake_questions, brief_set, brief_confirm first.`, {
      brief: brief ?? null,
    });
  }
  if (!brief.slideCount || brief.slideCount < 1) {
    throw new XPError("E_BRIEF", "Brief is missing slideCount. Ask the user how many slides they need.");
  }
}

const BANDS = ["bg", "deco", "content", "data", "ui", "note", "edit-source"] as const;
export function bandOf(id: string): string {
  return id.split("/")[0];
}
export function zForBand(band: string): number {
  return ({ bg: 0, "edit-source": 1, note: 5, deco: 10, content: 20, data: 80, ui: 90 } as any)[band] ?? 20;
}

export function slideOf(session: DeckSession, args: any): SlideSpec {
  const ref = args?.slideId ?? args?.slide ?? args?.slideNumber ?? args?.index;
  const slides = session.spec.slides;
  if (ref === undefined || ref === null) {
    const last = slides[slides.length - 1];
    if (!last) throw new XPError("E_NOT_FOUND", "Deck has no slides");
    return last;
  }
  if (typeof ref === "number") {
    const s = slides[ref - 1];
    if (!s) throw new XPError("E_NOT_FOUND", `Slide number out of range: ${ref}`);
    return s;
  }
  const s = slides.find((x) => x.id === ref) ?? (/^\d+$/.test(String(ref)) ? slides[Number(ref) - 1] : undefined);
  if (!s) throw new XPError("E_NOT_FOUND", `Slide not found: ${ref}`);
  return s;
}

export function objectOf(slide: SlideSpec, id: string): ObjectSpec {
  const o = slide.objects.find((x) => x.id === id);
  if (!o) throw new XPError("E_NOT_FOUND", `Object not found: ${id}`, { available: slide.objects.map((x) => x.id) });
  return o;
}

export function slideSummary(s: SlideSpec) {
  return { id: s.id, type: s.type, name: s.name, hidden: s.hidden, objects: s.objects.length, preview: firstText(s) };
}

function firstText(s: SlideSpec): string {
  const t = s.objects.find((o) => o.type === "text" && (o.role === "title" || o.text?.fontSize && o.text.fontSize > 30));
  return t?.text?.value ?? s.objects.find((o) => o.type === "text")?.text?.value ?? "";
}

export function deckSummary(session: DeckSession) {
  const s = session.spec;
  return {
    deckId: session.id,
    title: s.meta.title,
    slides: s.slides.length,
    objects: s.slides.reduce((n, x) => n + x.objects.length, 0),
    size: s.meta.size,
    theme: s.meta.theme,
    language: s.meta.language,
    brief: s.brief ? { approved: s.brief.approved, slideCount: s.brief.slideCount, goal: s.brief.goal } : null,
    filePath: session.filePath ?? null,
    dirty: session.dirty,
    undoDepth: session.undo.length,
    assets: s.assets?.length ?? 0,
  };
}

export function nextSlideId(session: DeckSession): string {
  let n = session.spec.slides.length + 1;
  const used = new Set(session.spec.slides.map((s) => s.id));
  while (used.has("s" + String(n).padStart(2, "0"))) n++;
  return "s" + String(n).padStart(2, "0");
}

export function uniqueObjectId(slide: SlideSpec, band: string, base: string): string {
  const prefix = `${band}/${safeName(base, "obj")}`;
  if (!slide.objects.some((o) => o.id === prefix)) return prefix;
  let i = 2;
  while (slide.objects.some((o) => o.id === `${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}

export function normalizeObject(slide: SlideSpec, input: any): ObjectSpec {
  const type = input.type ?? (input.text ? "text" : input.chart ? "chart" : input.table ? "table" : input.image ? "image" : "shape");
  const band = input.band ?? (input.id?.includes("/") ? bandOf(input.id) : type === "chart" || type === "table" ? "data" : "content");
  const id = input.id ?? uniqueObjectId(slide, band, type + "-" + String(slide.objects.length + 1).padStart(2, "0"));
  const geometry = input.geometry ?? input;
  if (!geometry || [geometry.x, geometry.y, geometry.w, geometry.h].some((v: any) => typeof v !== "number")) {
    throw new XPError("E_GEOMETRY", `Object ${id} needs numeric geometry {x,y,w,h}`);
  }
  if (geometry.w <= 0 || geometry.h <= 0) throw new XPError("E_GEOMETRY", `Object ${id} has non-positive size`);
  const obj: ObjectSpec = {
    id, type, band: band as any, role: input.role ?? (type === "text" ? "body" : "container"),
    geometry: { x: geometry.x, y: geometry.y, w: geometry.w, h: geometry.h, unit: geometry.unit ?? "in", rotation: geometry.rotation ?? 0 },
    fill: input.fill ?? null, line: input.line ?? null, effects: input.effects ?? {},
    text: input.text ?? null, image: input.image ?? null, chart: input.chart ?? null,
    table: input.table ?? null, media: input.media ?? null, children: input.children,
    constraints: input.constraints ?? [], style: input.style ?? {},
    z: input.z ?? zForBand(band), decorative: input.decorative ?? (band === "deco" || band === "bg"),
    altText: input.altText ?? (input.text?.value ? String(input.text.value).slice(0, 120) : (band === "deco" || band === "bg" ? "" : type)),
    sourceRef: input.sourceRef ?? null, locked: input.locked ?? false,
    intentionalOverlap: input.intentionalOverlap ?? false, shape: input.shape,
  };
  if (!obj.altText && !obj.decorative) throw new XPError("E_SPEC", `Object ${id} requires altText`);
  return obj;
}

export function addSlideObject(session: DeckSession, slide: SlideSpec, obj: ObjectSpec): ObjectSpec {
  if (slide.objects.length >= 400) throw new XPError("E_BUDGET", "Hard limit 400 objects/slide exceeded");
  if (slide.objects.some((o) => o.id === obj.id)) throw new XPError("E_SPEC", `Duplicate object id: ${obj.id}`);
  slide.objects.push(obj);
  return obj;
}

export function targetObjects(slide: SlideSpec, target?: string | string[]): ObjectSpec[] {
  if (!target) return slide.objects;
  const patterns = Array.isArray(target) ? target : [target];
  const out = new Set<ObjectSpec>();
  for (const p of patterns) {
    if (p.includes("*") || p.includes("?")) {
      const re = new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
      slide.objects.filter((o) => re.test(o.id)).forEach((o) => out.add(o));
    } else {
      const o = slide.objects.find((x) => x.id === p);
      if (o) out.add(o);
    }
  }
  return [...out];
}

export function payload(r: any): any {
  if (!r || typeof r !== "object") return {};
  const { ok: _ok, stderr: _stderr, code: _code, message: _message, ...data } = r;
  return data;
}

export function okData(data: any, warnings: string[] = [], next_action: string | null = null): ToolResult {
  return { ok: true, data, warnings, next_action };
}

export function listBands() { return BANDS; }

export function findObjectAnywhere(session: DeckSession, id: string) {
  for (const slide of session.spec.slides) {
    const obj = slide.objects.find((o) => o.id === id);
    if (obj) return { slide, obj };
  }
  return null;
}
