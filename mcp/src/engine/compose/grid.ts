import type { DeckSpec, SlideSpec } from "../../types.js";

export interface GridInfo {
  cols: number; rows: number; margin: number; gutter: number;
  colW: number; rowH: number; contentW: number; contentH: number;
}

export function gridInfo(deck: DeckSpec, slide?: SlideSpec): GridInfo {
  const W = deck.meta.size?.w ?? 13.333;
  const H = deck.meta.size?.h ?? 7.5;
  const g = slide?.grid ?? {};
  const cols = g.cols ?? 12;
  const rows = g.rows ?? 8;
  const margin = g.margin ?? 0.5;
  const gutter = g.gutter ?? 0.2;
  const contentW = W - margin * 2;
  const contentH = H - margin * 2;
  const colW = (contentW - gutter * (cols - 1)) / cols;
  const rowH = (contentH - gutter * (rows - 1)) / rows;
  return { cols, rows, margin, gutter, colW, rowH, contentW, contentH };
}

export function col(deck: DeckSpec, slide: SlideSpec, start: number, span = 1) {
  const g = gridInfo(deck, slide);
  return { x: g.margin + start * (g.colW + g.gutter), w: span * g.colW + (span - 1) * g.gutter };
}

export function row(deck: DeckSpec, slide: SlideSpec, start: number, span = 1) {
  const g = gridInfo(deck, slide);
  return { y: g.margin + start * (g.rowH + g.gutter), h: span * g.rowH + (span - 1) * g.gutter };
}

export function box(deck: DeckSpec, slide: SlideSpec, c: number, r: number, cs: number, rs: number) {
  const cRect = col(deck, slide, c, cs);
  const rRect = row(deck, slide, r, rs);
  return { x: round(cRect.x), y: round(rRect.y), w: round(cRect.w), h: round(rRect.h) };
}

export function safeArea(deck: DeckSpec) {
  const W = deck.meta.size?.w ?? 13.333;
  const H = deck.meta.size?.h ?? 7.5;
  const m = deck.tokens?.grid?.margin ?? 0.5;
  return { x: m, y: m * 0.8, w: W - m * 2, h: H - m * 1.8 };
}

function round(v: number) { return Math.round(v * 1000) / 1000; }
