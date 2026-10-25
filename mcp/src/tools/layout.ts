import { sessions } from "../session.js";
import { z } from "zod";
import type { SlideSpec, ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, slideOf, targetObjects, okData } from "./helpers.js";
import { gridInfo, safeArea, col, row, box } from "../engine/compose/grid.js";
import { snap } from "../utils/geometry.js";
import { fitFontSize } from "../engine/compose/text-metrics.js";
import { composeArchetype } from "../engine/compose/archetypes.js";
import { checkAllOverflow } from "../quality/overflow.js";
import { checkAllOverlap } from "../quality/overlap.js";
import { occupancyOf } from "../quality/consistency.js";

function snapAll(objects: any[], step: number) {
  for (const o of objects) {
    const g = o.geometry;
    if (!g) continue;
    g.x = snap(g.x, step); g.y = snap(g.y, step); g.w = snap(g.w, step); g.h = snap(g.h, step);
  }
}
const layoutGrid = (): ToolDef => ({
  name: "layout_grid",
  description: "Return the 12-col grid, margins, gutter, and named boxes for a slide.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const g = gridInfo(s.spec, slide);
    return okData({
      grid: g,
      columns: Array.from({ length: g.cols }, (_, i) => col(s.spec, slide, i, 1)),
      rows: Array.from({ length: g.rows }, (_, i) => row(s.spec, slide, i, 1)),
      titleBox: box(s.spec, slide, 0, 0, 12, 1.2),
      contentBox: box(s.spec, slide, 0, 2, 12, 5),
      safeArea: safeArea(s.spec),
    });
  },
});

const layoutMeasure = (): ToolDef => ({
  name: "layout_measure",
  description: "Measure every slide: object budgets, overflow and overlap counts.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slides = args.slideId != null ? [slideOf(s, args)] : s.spec.slides;
    const ids = new Set(slides.map((x) => x.id));
    const overflow = checkAllOverflow(s.spec).filter((v) => ids.has(v.slideId));
    const overlap = checkAllOverlap(s.spec).filter((v) => ids.has(v.slideId));
    return okData(slides.map((sl) => ({
      slideId: sl.id,
      objects: sl.objects.length,
      overBudget: sl.objects.length > 150,
      hardOverBudget: sl.objects.length > 400,
      occupancy: Number(occupancyOf(s.spec, sl).toFixed(3)),
      overflow: overflow.filter((v) => v.slideId === sl.id),
      overlaps: overlap.filter((v) => v.slideId === sl.id),
    })));
  },
});

const layoutAutoCompose = (): ToolDef => ({
  name: "layout_auto_compose",
  description: "Regenerate a slide's objects from an archetype and params.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]), type: z.string().optional(), params: z.object({}).passthrough().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const type = args.type ?? slide.type;
    const objects = composeArchetype(s.spec, slide, type, args.params ?? {});
    sessions.mutate(s, () => { slide.objects = objects; slide.type = type; });
    return okData({ slideId: slide.id, type, objects: objects.length });
  },
});

const layoutReflow = (): ToolDef => ({
  name: "layout_reflow",
  description: "Push objects back inside the safe area, shrink oversized text, snap to 0.05in.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), snap: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slides = args.slideId != null ? [slideOf(s, args)] : s.spec.slides;
    const changed: any[] = [];
    sessions.mutate(s, () => {
      for (const slide of slides) {
        const area = safeArea(s.spec);
        for (const o of slide.objects) {
          const before = { ...o.geometry };
          if (o.locked) continue;
          o.geometry.x = Math.max(area.x, Math.min(o.geometry.x, area.x + area.w - o.geometry.w));
          o.geometry.y = Math.max(area.y, Math.min(o.geometry.y, area.y + area.h - o.geometry.h));
          if (o.geometry.w > area.w) o.geometry.w = area.w;
          if (o.geometry.h > area.h) o.geometry.h = area.h;
          if (o.text) {
            const t = o.text;
            const size = fitFontSize(t.value ?? "", o.geometry.w, o.geometry.h, t, 10, t.fontSize ?? 96);
            if (size < (t.fontSize ?? 18)) t.fontSize = size;
          }
          if (before.x !== o.geometry.x || before.y !== o.geometry.y || before.w !== o.geometry.w || before.h !== o.geometry.h) changed.push(o.id);
        }
        if (args.snap !== false) snapAll(slide.objects, args.snap ?? 0.05);
      }
    });
    return okData({ changed });
  },
});

const layoutCollision = (): ToolDef => ({
  name: "layout_collision",
  description: "Detect overlaps. Auto-resolve is DISABLED. You must fix the layout manually.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), resolve: z.boolean().optional(), gap: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    
    // CHẶN CỨNG: Không cho phép AI dùng resolve=true
    if (args.resolve === true) {
      throw new XPError(
        "E_INVALID_INPUT", 
        "Auto-resolve is disabled. You must fix the layout manually using the grid (xp-composition). Do not push objects to arbitrary positions."
      );
    }

    const slides = args.slideId != null ? [slideOf(s, args)] : s.spec.slides;
    const found = checkAllOverlap(s.spec).filter((v) => slides.some((sl) => sl.id === v.slideId));
    
    // Trả về overlaps nhưng moved rỗng
    return okData({ 
      overlaps: found, 
      moved: [], 
      warning: "Use layout_grid and layout_measure to fix overlaps manually." 
    });
  },
});

const layoutSafeArea = (): ToolDef => ({
  name: "layout_safe_area",
  description: "Return drawn safe area and its margins.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    return okData({ safeArea: safeArea(s.spec), size: s.spec.meta.size, grid: slide.grid ?? gridInfo(s.spec) });
  },
});

const layoutSnap = (): ToolDef => ({
  name: "layout_snap",
  description: "Snap object geometry to a step (default 0.05in) or to the grid.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), step: z.number().optional(), toGrid: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slides = args.slideId != null ? [slideOf(s, args)] : s.spec.slides;
    sessions.mutate(s, () => {
      for (const slide of slides) {
        if (args.toGrid) {
          const g = gridInfo(s.spec, slide);
          const step = g.colW / 2;
          snapAll(slide.objects, step);
        } else snapAll(slide.objects, args.step ?? 0.05);
      }
    });
    return okData({ slides: slides.length });
  },
});

const layoutDistributeRows = (): ToolDef => ({
  name: "layout_distribute_rows",
  description: "Evenly distribute top-level object rows with equal gaps.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), gap: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const rowsList = slide.objects.filter((o) => o.band === "content" && !o.locked).sort((a, b) => a.geometry.y - b.geometry.y);
    if (rowsList.length < 2) return okData({ distributed: 0 });
    const area = safeArea(s.spec);
    sessions.mutate(s, () => {
      const sumH = rowsList.reduce((n, o) => n + o.geometry.h, 0);
      const gap = args.gap ?? Math.max(0, (area.h - sumH) / (rowsList.length + 1));
      let y = rowsList.length > 0 ? area.y + gap : area.y;
      for (const o of rowsList) { o.geometry.y = y; y += o.geometry.h + gap; }
    });
    return okData({ distributed: rowsList.length });
  },
});

const layoutBaselineAlign = (): ToolDef => ({
  name: "layout_baseline_align",
  description: "Align text object baselines (bottoms of first line) within a row tolerance.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), tolerance: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slide = slideOf(s, args);
    const texts = slide.objects.filter((o) => o.text && !o.locked).sort((a, b) => a.geometry.y - b.geometry.y);
    const tol = args.tolerance ?? 0.6;
    let aligned = 0;
    sessions.mutate(s, () => {
      const base = texts[0]?.geometry.y;
      if (base == null) return;
      for (const o of texts) {
        if (Math.abs(o.geometry.y - base) > tol) continue;
        const firstLine = (o.text!.fontSize ?? 18) * 1.2 / 72 + (o.text!.margin ?? 0.04);
        o.geometry.y = base;
        aligned++;
      }
    });
    return okData({ aligned });
  },
});

const layoutBreakPlan = (): ToolDef => ({
  name: "layout_break_plan",
  description: "Suggest slide splits when objects exceed budget or occupancy.",
  inputSchema: S({ maxObjects: z.number().optional(), maxOccupancy: z.number().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const plan = s.spec.slides.map((sl, i) => {
      const occ = occupancyOf(s.spec, sl);
      const n = sl.objects.length;
      const needs = n > (args.maxObjects ?? 150) || occ > (args.maxOccupancy ?? 0.9);
      return { slide: i + 1, slideId: sl.id, objects: n, occupancy: Number(occ.toFixed(2)), split: needs, suggestedParts: needs ? Math.ceil(n / 60) : 1 };
    });
    return okData({ plan, splits: plan.filter((p) => p.split).length });
  },
});

const layoutSolve = (): ToolDef => ({
  name: "layout_solve",
  description: "Run the layout pipeline: autofit text, snap, resolve collisions, distribute rows.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const slides = args.slideId != null ? [slideOf(s, args)] : s.spec.slides;
    const log: any[] = [];
    sessions.mutate(s, () => {
      for (const slide of slides) {
        const area = safeArea(s.spec);
        for (const o of slide.objects) {
          if (o.locked) continue;
          o.geometry.x = Math.max(area.x, Math.min(o.geometry.x, area.x + area.w - o.geometry.w));
          o.geometry.y = Math.max(area.y, Math.min(o.geometry.y, area.y + area.h - o.geometry.h));
          if (o.text) {
            const t = o.text;
            const size = fitFontSize(t.value ?? "", o.geometry.w, o.geometry.h, t, 10, t.fontSize ?? 96);
            if (size < (t.fontSize ?? 18)) { t.fontSize = size; log.push({ slide: slide.id, id: o.id, action: "autofit", size }); }
          }
        }
        snapAll(slide.objects, 0.05);
        log.push({ slide: slide.id, action: "snap" });
      }
    });
    return okData({ log, slides: slides.length });
  },
});

export const layoutTools: ToolDef[] = [
  layoutGrid(), layoutMeasure(), layoutAutoCompose(), layoutReflow(), layoutCollision(), layoutSafeArea(),
  layoutSnap(), layoutDistributeRows(), layoutBaselineAlign(), layoutBreakPlan(), layoutSolve(),
];