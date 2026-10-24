import { sessions } from "../session.js";
import { z } from "zod";
import type { ObjectSpec, ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, slideOf, objectOf, normalizeObject, addSlideObject, uniqueObjectId, okData } from "./helpers.js";
import { runPython } from "../engine/com/bridge.js";
import { unionRects, intersect } from "../utils/geometry.js";

function cloneStyle(src: ObjectSpec, extra: any = {}): any {
  return {
    type: src.type === "text" ? "shape" : src.type === "image" ? "shape" : src.type,
    band: src.band ?? "deco", role: "deco-piece", fill: src.fill ?? { type: "solid", color: "#D9E2F0" },
    line: src.line ?? null, effects: src.effects ?? {}, decorative: true, altText: "Decorative fragment",
    z: (src.z ?? 10) + 1, ...extra,
  };
}

function piecesOf(a: any, b: any) {
  const out: any[] = [];
  const ax2 = a.x + a.w, ay2 = a.y + a.h, bx2 = b.x + b.w, by2 = b.y + b.h;
  const ix1 = Math.max(a.x, b.x), iy1 = Math.max(a.y, b.y), ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
  if (ix2 > ix1 && iy2 > iy1) out.push({ kind: "intersect", x: ix1, y: iy1, w: ix2 - ix1, h: iy2 - iy1 });
  if (b.y > a.y) out.push({ kind: "top", x: a.x, y: a.y, w: a.w, h: Math.min(b.y, ay2) - a.y });
  if (by2 < ay2) out.push({ kind: "bottom", x: a.x, y: Math.max(by2, a.y), w: a.w, h: ay2 - Math.max(by2, a.y) });
  if (b.x > a.x) out.push({ kind: "left", x: a.x, y: iy1, w: Math.min(b.x, ax2) - a.x, h: iy2 - iy1 });
  if (bx2 < ax2) out.push({ kind: "right", x: Math.max(bx2, a.x), y: iy1, w: ax2 - Math.max(bx2, a.x), h: iy2 - iy1 });
  return out.filter((p) => p.w > 0.01 && p.h > 0.01);
}

const shapeBoolean = (): ToolDef => ({
  name: "shape_boolean",
  description: "Boolean union/subtract/intersect/fragment of two rectangular shapes.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectIds: z.array(z.string()).min(2), op: z.enum(["union", "subtract", "intersect", "fragment"]), keepOriginal: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const [a, b] = args.objectIds.map((id: string) => objectOf(slide, id));
    if (!a || !b) throw new XPError("E_NOT_FOUND", "Both objects required");
    const A = a.geometry, B = b.geometry;
    const created: ObjectSpec[] = [];
    sessions.mutate(s, () => {
      if (args.op === "union") {
        const g = unionRects([A, B]);
        created.push(addSlideObject(s, slide, normalizeObject(slide, cloneStyle(a, { geometry: g, altText: "Boolean union" }))));
      } else if (args.op === "intersect") {
        const g = intersect(A, B);
        if (!g || g.w <= 0 || g.h <= 0) throw new XPError("E_GEOMETRY", "Shapes do not intersect");
        created.push(addSlideObject(s, slide, normalizeObject(slide, cloneStyle(a, { geometry: g, altText: "Boolean intersect" }))));
      } else {
        const pieces = piecesOf(A, B).filter((p) => args.op === "fragment" || p.kind !== "intersect");
        for (const p of pieces) created.push(addSlideObject(s, slide, normalizeObject(slide, cloneStyle(a, { geometry: { x: p.x, y: p.y, w: p.w, h: p.h }, altText: "Boolean " + p.kind }))));
      }
      if (!args.keepOriginal) slide.objects = slide.objects.filter((o) => !args.objectIds.includes(o.id));
    });
    return okData({ created: created.map((o) => o.id), op: args.op }, ["Boolean is axis-aligned rectangle approximation; curves are not preserved."]);
  },
});

const objectFragment = (): ToolDef => ({
  name: "object_fragment",
  description: "Fragment an object into a rows×cols grid of pieces.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), rows: z.number().optional(), cols: z.number().optional(), keepOriginal: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    const rows = Math.max(1, args.rows ?? 3), cols = Math.max(1, args.cols ?? 3);
    const g = src.geometry;
    const created: string[] = [];
    sessions.mutate(s, () => {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const w = g.w / cols, h = g.h / rows;
        const base: any = cloneStyle(src, { geometry: { x: g.x + c * w, y: g.y + r * h, w, h }, altText: `Fragment r${r + 1}c${c + 1}` });
        if (src.type === "image") base.image = { ...(src.image ?? {}), crop: { x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows } };
        created.push(addSlideObject(s, slide, normalizeObject(slide, base)).id);
      }
      if (!args.keepOriginal) slide.objects = slide.objects.filter((o) => o.id !== src.id);
    });
    return okData({ created, rows, cols }, src.type === "image" ? ["Image crop is stored in spec; PptxGenJS export stretches the full image."] : []);
  },
});

const objectSliceGrid = (): ToolDef => ({
  name: "object_slice_grid",
  description: "Slice an object into vertical/horizontal strips or a grid.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), direction: z.enum(["vertical", "horizontal", "grid"]).optional(), count: z.number().optional(), gap: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    const g = src.geometry;
    const n = Math.max(2, args.count ?? 6);
    const gap = args.gap ?? 0.02;
    const created: string[] = [];
    sessions.mutate(s, () => {
      if (args.direction === "horizontal") {
        const h = (g.h - gap * (n - 1)) / n;
        for (let i = 0; i < n; i++) created.push(addSlideObject(s, slide, normalizeObject(slide, cloneStyle(src, { geometry: { x: g.x, y: g.y + i * (h + gap), w: g.w, h }, altText: `Slice h${i + 1}` }))).id);
      } else {
        const w = (g.w - gap * (n - 1)) / n;
        for (let i = 0; i < n; i++) created.push(addSlideObject(s, slide, normalizeObject(slide, cloneStyle(src, { geometry: { x: g.x + i * (w + gap), y: g.y, w, h: g.h }, altText: `Slice v${i + 1}` }))).id);
      }
      slide.objects = slide.objects.filter((o) => o.id !== src.id);
    });
    return okData({ created, count: created.length });
  },
});

const objectSlicePath = (): ToolDef => ({
  name: "object_slice_path",
  description: "Slice an object along a zigzag/curved path (approximated by varying-height strips).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), count: z.number().optional(), amplitude: z.number().optional(), keepOriginal: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    const g = src.geometry;
    const n = Math.max(3, args.count ?? 10);
    const amp = args.amplitude ?? g.h * 0.2;
    const created: string[] = [];
    sessions.mutate(s, () => {
      const w = g.w / n;
      for (let i = 0; i < n; i++) {
        const dy = Math.sin((i / n) * Math.PI * 2) * amp;
        const top = Math.max(g.y, g.y + dy);
        const bottom = Math.min(g.y + g.h, g.y + dy + g.h - amp);
        created.push(addSlideObject(s, slide, normalizeObject(slide, cloneStyle(src, { geometry: { x: g.x + i * w, y: top, w, h: Math.max(0.1, bottom - top) }, altText: `Path slice ${i + 1}` }))).id);
      }
      if (!args.keepOriginal) slide.objects = slide.objects.filter((o) => o.id !== src.id);
    });
    return okData({ created, count: created.length });
  },
});

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const objectScatter = (): ToolDef => ({
  name: "object_scatter",
  description: "Clone an object N times with jitter in position/rotation/scale.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), count: z.number().optional(), spread: z.number().optional(), seed: z.number().optional(), keepOriginal: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    const n = Math.max(1, args.count ?? 8);
    const spread = args.spread ?? 1.2;
    const rand = rng(args.seed ?? 42);
    const created: string[] = [];
    sessions.mutate(s, () => {
      for (let i = 0; i < n; i++) {
        const scale = 0.6 + rand() * 0.8;
        const clone = JSON.parse(JSON.stringify(src)) as ObjectSpec;
        clone.id = uniqueObjectId(slide, clone.band ?? "deco", "scatter");
        clone.geometry = {
          x: src.geometry.x + (rand() - 0.5) * spread, y: src.geometry.y + (rand() - 0.5) * spread,
          w: src.geometry.w * scale, h: src.geometry.h * scale, rotation: (rand() - 0.5) * 30,
        };
        clone.altText = "Scatter clone";
        clone.decorative = true;
        created.push(addSlideObject(s, slide, clone).id);
      }
      if (!args.keepOriginal) slide.objects = slide.objects.filter((o) => o.id !== src.id);
    });
    return okData({ created, count: created.length });
  },
});

const objectCloneOffset = (): ToolDef => ({
  name: "object_clone_offset",
  description: "Clone an object along an offset vector (long shadow / riso effect).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), count: z.number().optional(), dx: z.number().optional(), dy: z.number().optional(), color: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    const n = Math.max(1, args.count ?? 6);
    const dx = args.dx ?? 0.04, dy = args.dy ?? 0.06;
    const created: string[] = [];
    sessions.mutate(s, () => {
      for (let i = 1; i <= n; i++) {
        const clone = JSON.parse(JSON.stringify(src)) as ObjectSpec;
        clone.id = uniqueObjectId(slide, clone.band ?? "deco", "offset");
        clone.geometry = { ...src.geometry, x: src.geometry.x + dx * i, y: src.geometry.y + dy * i };
        if (args.color) clone.fill = { type: "solid", color: args.color };
        clone.z = (src.z ?? 10) - i * 0.01;
        clone.altText = "Offset clone";
        clone.decorative = true;
        created.push(addSlideObject(s, slide, clone).id);
      }
    });
    return okData({ created, count: created.length });
  },
});

const textToVectors = (): ToolDef => ({
  name: "text_to_vectors",
  description: "Request text-to-vector conversion. No native vectorizer is bundled; keeps editable text.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), keepSource: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    if (!obj.text) throw new XPError("E_INVALID_INPUT", "Object is not text");
    sessions.mutate(s, () => { obj.cf = { ...(obj.cf ?? {}), vectorIntent: true, sourceText: obj.text!.value, vectorized: false }; });
    return okData({ objectId: obj.id, vectorized: false }, ["Text-to-vector requires an external vectorizer; text remains editable."]);
  },
});

const textSplit = (): ToolDef => ({
  name: "text_split",
  description: "Split text into separate text boxes by line, word, or character.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), mode: z.enum(["line", "word", "char"]).optional(), keepOriginal: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    if (!src.text) throw new XPError("E_INVALID_INPUT", "Object is not text");
    const value = src.text.value ?? "";
    const parts = args.mode === "word" ? value.split(/\s+/).filter(Boolean) : args.mode === "char" ? [...value] : value.split(/\r?\n/);
    const created: string[] = [];
    sessions.mutate(s, () => {
      const lineH = ((src.text!.fontSize ?? 18) * 1.2) / 72;
      parts.forEach((part, i) => {
        const clone: any = normalizeObject(slide, {
          type: "text", band: src.band ?? "content", role: src.role ?? "body",
          geometry: { x: src.geometry.x, y: src.geometry.y + i * lineH, w: src.geometry.w, h: Math.max(0.2, lineH) },
          text: { ...src.text, value: part, paragraphs: undefined }, altText: part.slice(0, 100),
        });
        created.push(addSlideObject(s, slide, clone).id);
      });
      if (!args.keepOriginal) slide.objects = slide.objects.filter((o) => o.id !== src.id);
    });
    return okData({ created, parts: parts.length });
  },
});

const effectMaskWindow = (): ToolDef => ({
  name: "effect_mask_window",
  description: "Place an image inside a mask shape with a movable window.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), imageId: z.string(), mask: z.object({}).passthrough().optional(), window: z.object({}).passthrough().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const img = objectOf(slide, args.imageId);
    if (img.type !== "image") throw new XPError("E_INVALID_INPUT", "Object is not an image");
    const mask = args.mask ?? { x: img.geometry.x, y: img.geometry.y, w: img.geometry.w * 0.6, h: img.geometry.h, shape: "rounded-rect" };
    const created: string[] = [];
    sessions.mutate(s, () => {
      const m = normalizeObject(slide, {
        type: "shape", band: "deco", role: "mask", geometry: { x: mask.x, y: mask.y, w: mask.w, h: mask.h },
        shape: mask.shape ?? "rounded-rect", fill: { type: "none" }, line: { color: "#FFFFFF", width: 1 },
        decorative: true, altText: "Mask window",
      });
      created.push(addSlideObject(s, slide, m).id);
      img.cf = { ...(img.cf ?? {}), maskId: m.id, window: args.window ?? { x: 0, y: 0 } };
    });
    return okData({ maskId: created[0], imageId: img.id }, ["Mask is spec-level; native clipping requires OOXML patch (oxml_patch)."]);
  },
});

const objectFragmentDots = (): ToolDef => ({
  name: "object_fragment_dots",
  description: "Halftone/dot-matrix fragmentation of an image (samples pixels with Pillow).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), grid: z.number().optional(), keepOriginal: z.boolean().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    const path = src.image?.path ?? s.spec.assets?.find((a: any) => a.id === src.image?.assetId)?.path;
    const n = args.grid ?? 24;
    let dots: any[] = [];
    if (path) {
      const r = await runPython("image_tools.py", { action: "dots", path, grid: n }, 120000);
      if (r.ok) dots = r.dots ?? [];
    }
    const created: string[] = [];
    sessions.mutate(s, () => {
      if (!dots.length) {
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dots.push({ x: (c + 0.5) / n, y: (r + 0.5) / n, r: 0.35 / n, color: src.fill?.color ?? "#1B4FA0" });
      }
      const g = src.geometry;
      dots.forEach((d, i) => {
        created.push(addSlideObject(s, slide, normalizeObject(slide, {
          type: "shape", shape: "ellipse", band: "deco", role: "dot",
          geometry: { x: g.x + d.x * g.w, y: g.y + d.y * g.h, w: Math.max(0.02, d.r * g.w), h: Math.max(0.02, d.r * g.w) },
          fill: { type: "solid", color: d.color ?? "#1B4FA0" }, line: null, decorative: true, altText: "Halftone dot",
        })).id);
      });
      if (!args.keepOriginal) slide.objects = slide.objects.filter((o) => o.id !== src.id);
    });
    return okData({ created: created.length, dots: dots.length }, dots.length > 200 ? ["Dot output exceeds the 400 object budget; reduce grid."] : []);
  },
});

const decoGroupBake = (): ToolDef => ({
  name: "deco_group_bake",
  description: "Bake decorative objects into one placeholder, keeping an edit-source snapshot.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectIds: z.array(z.string()) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const objs = args.objectIds.map((id: string) => objectOf(slide, id));
    if (!objs.length) throw new XPError("E_INVALID_INPUT", "No objects selected");
    const g = unionRects(objs.map((o: any) => o.geometry));
    const bakeId = uniqueObjectId(slide, "deco", "baked");
    sessions.mutate(s, () => {
      slide.decoSnapshots ??= {};
      slide.decoSnapshots[bakeId] = JSON.parse(JSON.stringify(objs));
      const baked = normalizeObject(slide, {
        id: bakeId, type: "shape", band: "deco", role: "baked", geometry: g,
        fill: objs[0].fill ?? { type: "solid", color: "#D9E2F0" }, line: null, decorative: true,
        altText: `Baked decoration (${objs.length} objects)`, z: 10,
      });
      baked.cf = { baked: true, sourceCount: objs.length };
      slide.objects = slide.objects.filter((o) => !args.objectIds.includes(o.id));
      slide.objects.push(baked);
    });
    return okData({ bakedId: bakeId, sourceCount: objs.length }, ["Baked placeholder is not pixel-identical; use render for true raster."]);
  },
});

const decoRestore = (): ToolDef => ({
  name: "deco_restore",
  description: "Restore decorative objects from a bake snapshot.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), bakedId: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const snap = slide.decoSnapshots?.[args.bakedId];
    if (!snap) throw new XPError("E_NOT_FOUND", `No snapshot for ${args.bakedId}`);
    sessions.mutate(s, () => {
      slide.objects = slide.objects.filter((o) => o.id !== args.bakedId);
      slide.objects.push(...JSON.parse(JSON.stringify(snap)));
      delete slide.decoSnapshots[args.bakedId];
    });
    return okData({ restored: snap.length, removed: args.bakedId });
  },
});

export const deconstructTools: ToolDef[] = [
  shapeBoolean(), objectFragment(), objectSliceGrid(), objectSlicePath(), objectScatter(), objectCloneOffset(),
  textToVectors(), textSplit(), effectMaskWindow(), objectFragmentDots(), decoGroupBake(), decoRestore(),
];
