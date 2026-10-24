import type { Geometry } from "../types.js";
import { round } from "./units.js";

export interface Rect { x: number; y: number; w: number; h: number; }

export function rectOf(g: Geometry): Rect {
  return { x: g.x, y: g.y, w: g.w, h: g.h };
}

export function right(r: Rect) { return r.x + r.w; }
export function bottom(r: Rect) { return r.y + r.h; }
export function area(r: Rect) { return Math.max(0, r.w) * Math.max(0, r.h); }

export function intersect(a: Rect, b: Rect, tolerance = 0.01): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(right(a), right(b));
  const y2 = Math.min(bottom(a), bottom(b));
  if (x2 - x <= tolerance || y2 - y <= tolerance) return null;
  return { x, y, w: x2 - x, h: y2 - y };
}

export function overlapRatio(a: Rect, b: Rect): number {
  const i = intersect(a, b, 0);
  if (!i) return 0;
  const denom = Math.min(area(a), area(b)) || 1;
  return area(i) / denom;
}

export function contains(outer: Rect, inner: Rect, tol = 0.005): boolean {
  return inner.x >= outer.x - tol && inner.y >= outer.y - tol &&
    right(inner) <= right(outer) + tol && bottom(inner) <= bottom(outer) + tol;
}

export function unionRects(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => right(r)));
  const y2 = Math.max(...rects.map((r) => bottom(r)));
  return { x, y, w: x2 - x, h: y2 - y };
}

export function unionArea(rects: Rect[]): number {
  const u = unionRects(rects);
  return area(u);
}

export function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

export function clampToSlide(r: Rect, slideW: number, slideH: number): Rect {
  const w = Math.min(r.w, slideW);
  const h = Math.min(r.h, slideH);
  return {
    x: Math.max(0, Math.min(r.x, slideW - w)),
    y: Math.max(0, Math.min(r.y, slideH - h)),
    w, h,
  };
}

export function distribute(count: number, total: number, gap: number): number[] {
  if (count <= 0) return [];
  const each = (total - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => round(i * (each + gap)));
}

export function snap(value: number, step = 0.05): number {
  return Math.round(value / step) * step;
}

export function gridColumn(col: number, span: number, cols: number, margin: number, gutter: number, width: number) {
  const colW = (width - margin * 2 - gutter * (cols - 1)) / cols;
  return {
    x: margin + col * (colW + gutter),
    w: colW * span + gutter * (span - 1),
    colW,
    gutter,
  };
}

export function distance(a: Rect, b: Rect): number {
  const dx = Math.max(a.x - right(b), b.x - right(a), 0);
  const dy = Math.max(a.y - bottom(b), b.y - bottom(a), 0);
  return Math.hypot(dx, dy);
}

export function sameRow(a: Rect, b: Rect, tol = 0.02): boolean {
  return Math.abs(a.y - b.y) <= tol && Math.abs(a.h - b.h) <= tol;
}
