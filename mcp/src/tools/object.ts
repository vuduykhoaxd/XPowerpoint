import { sessions } from "../session.js";
import { z } from "zod";
import type { ObjectSpec, ToolDef } from "../types.js";
import { XPError, ok } from "../errors.js";
import { S, sessionOf, slideOf, objectOf, normalizeObject, addSlideObject, targetObjects, uniqueObjectId, okData, zForBand } from "./helpers.js";
import { unionRects, intersect } from "../utils/geometry.js";
import { safeArea, col, row } from "../engine/compose/grid.js";

const objectAdd = (): ToolDef => ({
  name: "object_add",
  description: "Add an object (text, shape, image, chart, table, line, video, icon, group) to a slide.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), object: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const input = args.object ?? args;
    if (input.geometry == null && input.slide == null) {
      input.geometry = { x: 0.5, y: 0.5, w: 4, h: 1 };
    }
    const obj = normalizeObject(slide, input);
    sessions.mutate(s, () => addSlideObject(s, slide, obj));
    return okData({ object: obj, count: slide.objects.length }, slide.objects.length > 150 ? ["Soft budget 150 objects/slide exceeded."] : []);
  },
});

const objectUpdate = (): ToolDef => ({
  name: "object_update",
  description: "Update object geometry, styles, or content by id.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), patch: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const p = args.patch ?? args;
    sessions.mutate(s, () => {
      for (const [k, v] of Object.entries(p)) {
        if (k === "slideId" || k === "deckId" || k === "objectId" || v === undefined) continue;
        if (k === "geometry") obj.geometry = { ...obj.geometry, ...(v as any) };
        else (obj as any)[k] = v;
      }
    });
    return okData({ object: obj });
  },
});

const objectDelete = (): ToolDef => ({
  name: "object_delete",
  description: "Delete an object by id.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => { slide.objects = slide.objects.filter((o) => o.id !== obj.id); });
    return okData({ deleted: obj.id, count: slide.objects.length });
  },
});

const objectClone = (): ToolDef => ({
  name: "object_clone",
  description: "Clone an object with an offset, optionally into another slide.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), dx: z.number().optional(), dy: z.number().optional(), targetSlideId: z.union([z.string(), z.number()]).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const src = objectOf(slide, args.objectId);
    const target = args.targetSlideId != null ? slideOf(s, { slideId: args.targetSlideId }) : slide;
    const clone: ObjectSpec = JSON.parse(JSON.stringify(src));
    const band = clone.id.split("/")[0];
    clone.id = uniqueObjectId(target, band, clone.id.split("/")[1] + "-copy");
    clone.geometry.x += args.dx ?? 0.2;
    clone.geometry.y += args.dy ?? 0.2;
    sessions.mutate(s, () => addSlideObject(s, target, clone));
    return okData({ object: clone, slideId: target.id });
  },
});

const objectGroup = (): ToolDef => ({
  name: "object_group",
  description: "Group objects into a group object (PptxGenJS cannot emit real groups; group is spec-level).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectIds: z.array(z.string()), id: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const children = args.objectIds.map((id: string) => objectOf(slide, id));
    if (children.length < 2) throw new XPError("E_INVALID_INPUT", "Need at least 2 objects to group");
    const box = unionRects(children.map((c: any) => c.geometry));
    const group: ObjectSpec = {
      id: args.id ?? uniqueObjectId(slide, "content", "group"),
      type: "group", band: "content", role: "group",
      geometry: { ...box },
      fill: null, line: null, effects: {},
      children: children.map((c: any) => c.id), z: Math.max(...children.map((c: any) => c.z ?? 0)) + 1,
      decorative: false, altText: "Group of " + children.length + " objects", locked: false, sourceRef: null,
    };
    sessions.mutate(s, () => addSlideObject(s, slide, group));
    return okData({ group }, ["Groups are flattened at export; children remain independently editable."]);
  },
});

const objectUngroup = (): ToolDef => ({
  name: "object_ungroup",
  description: "Remove a group container (children stay).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    if (obj.type !== "group") throw new XPError("E_INVALID_INPUT", "Object is not a group");
    sessions.mutate(s, () => { slide.objects = slide.objects.filter((o) => o.id !== obj.id); });
    return okData({ removed: obj.id, children: obj.children ?? [] });
  },
});

const objectAlign = (): ToolDef => ({
  name: "object_align",
  description: "Align objects: left, centerX, right, top, middleY, bottom.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectIds: z.array(z.string()), mode: z.string(), relativeTo: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const objs = targetObjects(slide, args.objectIds);
    if (objs.length < 1) throw new XPError("E_INVALID_INPUT", "No objects selected");
    const ref = args.relativeTo ? objectOf(slide, args.relativeTo).geometry : safeArea(s.spec);
    sessions.mutate(s, () => {
      for (const o of objs) {
        if (args.mode === "left") o.geometry.x = ref.x;
        else if (args.mode === "right") o.geometry.x = ref.x + ref.w - o.geometry.w;
        else if (args.mode === "centerX") o.geometry.x = ref.x + (ref.w - o.geometry.w) / 2;
        else if (args.mode === "top") o.geometry.y = ref.y;
        else if (args.mode === "bottom") o.geometry.y = ref.y + ref.h - o.geometry.h;
        else if (args.mode === "middleY") o.geometry.y = ref.y + (ref.h - o.geometry.h) / 2;
        else throw new XPError("E_INVALID_INPUT", "Unknown align mode: " + args.mode);
      }
    });
    return okData({ aligned: objs.map((o) => o.id), mode: args.mode });
  },
});

const objectDistribute = (): ToolDef => ({
  name: "object_distribute",
  description: "Distribute objects evenly on x or y.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectIds: z.array(z.string()), axis: z.enum(["x", "y"]), gap: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const objs = targetObjects(slide, args.objectIds).sort((a, b) => args.axis === "x" ? a.geometry.x - b.geometry.x : a.geometry.y - b.geometry.y);
    if (objs.length < 2) throw new XPError("E_INVALID_INPUT", "Need at least 2 objects");
    sessions.mutate(s, () => {
      const first = objs[0], last = objs[objs.length - 1];
      if (args.axis === "x") {
        const total = (last.geometry.x + last.geometry.w) - first.geometry.x;
        const sumW = objs.reduce((n, o) => n + o.geometry.w, 0);
        const gap = args.gap ?? Math.max(0, (total - sumW) / (objs.length - 1));
        let x = first.geometry.x;
        for (const o of objs) { o.geometry.x = x; x += o.geometry.w + gap; }
      } else {
        const total = (last.geometry.y + last.geometry.h) - first.geometry.y;
        const sumH = objs.reduce((n, o) => n + o.geometry.h, 0);
        const gap = args.gap ?? Math.max(0, (total - sumH) / (objs.length - 1));
        let y = first.geometry.y;
        for (const o of objs) { o.geometry.y = y; y += o.geometry.h + gap; }
      }
    });
    return okData({ distributed: objs.length, axis: args.axis });
  },
});

const objectOrder = (): ToolDef => ({
  name: "object_order",
  description: "Change z-order: front, back, forward, backward, or explicit z.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), mode: z.enum(["front", "back", "forward", "backward", "z"]), z: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => {
      const zs = slide.objects.map((o) => o.z ?? 0);
      const max = Math.max(...zs), min = Math.min(...zs);
      if (args.mode === "front") obj.z = max + 1;
      else if (args.mode === "back") obj.z = min - 1;
      else if (args.mode === "forward") obj.z = Math.min(max + 1, (obj.z ?? 0) + 1);
      else if (args.mode === "backward") obj.z = Math.max(min - 1, (obj.z ?? 0) - 1);
      else obj.z = args.z ?? obj.z;
    });
    return okData({ objectId: obj.id, z: obj.z });
  },
});

const objectLock = (): ToolDef => ({
  name: "object_lock",
  description: "Lock/unlock an object (spec-level protection for edit agents).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), locked: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => { obj.locked = args.locked ?? true; });
    return okData({ objectId: obj.id, locked: obj.locked });
  },
});

const objectHyperlink = (): ToolDef => ({
  name: "object_hyperlink",
  description: "Attach a URL or slide link to an object.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), url: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => { obj.link = { url: args.url }; });
    return okData({ objectId: obj.id, link: obj.link });
  },
});

const objectAltText = (): ToolDef => ({
  name: "object_alt_text",
  description: "Set alt text for accessibility.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), altText: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => { obj.altText = args.altText; });
    return okData({ objectId: obj.id, altText: obj.altText });
  },
});

const objectTransform = (): ToolDef => ({
  name: "object_transform",
  description: "Move, resize and/or rotate an object.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), dx: z.number().optional(), dy: z.number().optional(), w: z.number().optional(), h: z.number().optional(), rotation: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => {
      obj.geometry.x += args.dx ?? 0;
      obj.geometry.y += args.dy ?? 0;
      if (args.w != null) obj.geometry.w = args.w;
      if (args.h != null) obj.geometry.h = args.h;
      if (args.rotation != null) obj.geometry.rotation = args.rotation;
    });
    return okData({ object: obj });
  },
});

const objectBindData = (): ToolDef => ({
  name: "object_bind_data",
  description: "Bind an object (chart/table/text) to a data ref.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), dataRef: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => { obj.dataRef = args.dataRef; });
    return okData({ objectId: obj.id, dataRef: args.dataRef });
  },
});

const objectStyle = (): ToolDef => ({
  name: "object_style",
  description: "Apply fill, line, and text color styles.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), style: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const st = args.style ?? {};
    sessions.mutate(s, () => {
      if (st.fill !== undefined) obj.fill = st.fill;
      if (st.line !== undefined) obj.line = st.line;
      if (st.effects !== undefined) obj.effects = { ...(obj.effects ?? {}), ...st.effects };
      if (st.text && obj.text) obj.text = { ...obj.text, ...st.text };
      if (st.fontFamily && obj.text) obj.text.fontFamily = st.fontFamily;
      if (st.color && obj.text) obj.text.color = st.color;
    });
    return okData({ object: obj });
  },
});

const objectReplaceAsset = (): ToolDef => ({
  name: "object_replace_asset",
  description: "Replace the image asset of an image object, keeping geometry unless focal crop changes it.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), assetId: z.string(), path: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    const asset = s.spec.assets?.find((a: any) => a.id === args.assetId);
    if (!asset) throw new XPError("E_NOT_FOUND", `Asset not found: ${args.assetId}`);
    sessions.mutate(s, () => { obj.image = { ...(obj.image ?? {}), assetId: asset.id, path: args.path ?? asset.path }; });
    return okData({ objectId: obj.id, asset: asset.id });
  },
});

const objectBatch = (): ToolDef => ({
  name: "object_batch",
  description: "Apply a list of operations atomically. Each op: {op:'update'|'delete'|'move'|'style'|'align'|'distribute', ...}.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), operations: z.array(z.object({}).passthrough()) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const results: any[] = [];
    sessions.mutate(s, () => {
      for (const op of args.operations ?? []) {
        try {
          if (op.op === "delete") { slide.objects = slide.objects.filter((o) => o.id !== op.objectId); results.push({ op: "delete", id: op.objectId }); }
          else if (op.op === "move") { const o = objectOf(slide, op.objectId); o.geometry.x += op.dx ?? 0; o.geometry.y += op.dy ?? 0; results.push({ op: "move", id: o.id }); }
          else if (op.op === "style") { const o = objectOf(slide, op.objectId); Object.assign(o, op.style ?? {}); results.push({ op: "style", id: o.id }); }
          else { const o = objectOf(slide, op.objectId); Object.assign(o, op.patch ?? {}); results.push({ op: "update", id: o.id }); }
        } catch (e: any) { results.push({ op: op.op, error: e.message }); }
      }
    });
    return okData({ results });
  },
});

const objectQuery = (): ToolDef => ({
  name: "object_query",
  description: "Query objects by id glob, role, band, type, or text substring.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), id: z.string().optional(), role: z.string().optional(), band: z.string().optional(), type: z.string().optional(), text: z.string().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slides = args.slideId != null ? [slideOf(s, args)] : s.spec.slides;
    const out: any[] = [];
    for (const slide of slides) {
      for (const o of targetObjects(slide, args.id)) {
        if (args.role && o.role !== args.role) continue;
        if (args.band && o.band !== args.band) continue;
        if (args.type && o.type !== args.type) continue;
        if (args.text && !String(o.text?.value ?? "").toLowerCase().includes(args.text.toLowerCase())) continue;
        out.push({ slideId: slide.id, id: o.id, type: o.type, role: o.role, band: o.band, geometry: o.geometry, text: o.text?.value?.slice(0, 80) });
      }
    }
    return okData({ count: out.length, objects: out });
  },
});

const objectRoleSet = (): ToolDef => ({
  name: "object_role_set",
  description: "Set semantic role (title, body, caption, source, logo, kpi, chart, table, ui).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), role: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => { obj.role = args.role; });
    return okData({ objectId: obj.id, role: obj.role });
  },
});

const objectConstraintsSet = (): ToolDef => ({
  name: "object_constraints_set",
  description: "Attach constraints (keep-in-safe-area, no-overlap, lock-aspect, min-font-size).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), constraints: z.array(z.string()) }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => { obj.constraints = args.constraints; });
    return okData({ objectId: obj.id, constraints: obj.constraints });
  },
});

const objectStyleInherit = (): ToolDef => ({
  name: "object_style_inherit",
  description: "Apply theme tokens to objects by role (title/body/caption/kpi).",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectIds: z.array(z.string()).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const objs = args.objectIds?.length ? targetObjects(slide, args.objectIds) : slide.objects;
    const t: any = s.spec.tokens ?? {};
    sessions.mutate(s, () => {
      for (const o of objs) {
        if (!o.text) continue;
        if (o.role === "title") { o.text.fontFamily = t.fonts?.heading ?? o.text.fontFamily; o.text.color = t.colors?.text ?? o.text.color; }
        else if (o.role === "kpi" || o.role === "metric") { o.text.fontFamily = t.fonts?.numeric ?? o.text.fontFamily; o.text.color = t.colors?.accent ?? o.text.color; }
        else { o.text.fontFamily = t.fonts?.body ?? o.text.fontFamily; o.text.color = t.colors?.textMuted ?? o.text.color; }
      }
    });
    return okData({ updated: objs.length });
  },
});

export const objectTools: ToolDef[] = [
  objectAdd(), objectUpdate(), objectDelete(), objectClone(), objectGroup(), objectUngroup(),
  objectAlign(), objectDistribute(), objectOrder(), objectLock(), objectHyperlink(), objectAltText(),
  objectTransform(), objectBindData(), objectStyle(), objectReplaceAsset(), objectBatch(), objectQuery(),
  objectRoleSet(), objectConstraintsSet(), objectStyleInherit(),
];
