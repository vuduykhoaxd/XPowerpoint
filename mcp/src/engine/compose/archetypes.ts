import type { DeckSpec, ObjectSpec, SlideSpec } from "../../types.js";
import { safeArea } from "./grid.js";

type P = Record<string, any>;

const r3 = (v: number) => Math.round(v * 1000) / 1000;

function bandZ(band: string): number {
  return ({ bg: 0, deco: 10, content: 20, data: 80, ui: 90, note: 5, "edit-source": 1 } as any)[band] ?? 20;
}

function shape(id: string, x: number, y: number, w: number, h: number, fill: any, opts: P = {}): ObjectSpec {
  const band = id.split("/")[0];
  return {
    id, type: opts.type ?? "shape", shape: opts.shape ?? "rect", band: band as any,
    role: opts.role ?? "container", geometry: { x: r3(x), y: r3(y), w: r3(w), h: r3(h) },
    fill, line: opts.line ?? null, effects: opts.effects ?? {},
    z: opts.z ?? bandZ(band), decorative: opts.decorative ?? band === "deco",
    altText: opts.altText ?? (band === "deco" ? "" : "Container"),
    locked: false, sourceRef: null, ...(opts.extra ?? {}),
  };
}

function text(id: string, value: string, x: number, y: number, w: number, h: number, opts: P = {}): ObjectSpec {
  const band = id.split("/")[0];
  return {
    id, type: "text", band: band as any, role: opts.role ?? "body",
    geometry: { x: r3(x), y: r3(y), w: r3(w), h: r3(h) },
    fill: opts.fill ?? null, line: null, effects: {},
    text: {
      value, fontSize: opts.size ?? 19, fontFamily: opts.font, color: opts.color,
      bold: opts.bold ?? false, italic: opts.italic ?? false, align: opts.align ?? "left",
      valign: opts.valign ?? "top", lineSpacing: opts.lineSpacing ?? 1.2,
      letterSpacing: opts.letterSpacing ?? 0, margin: opts.margin ?? 0.04, wrap: true, autofit: "none",
      paragraphs: opts.paragraphs,
    },
    z: opts.z ?? bandZ(band), decorative: false, altText: opts.altText ?? value.slice(0, 120),
    locked: false, sourceRef: null, ...(opts.extra ?? {}),
  };
}

function tokens(deck: DeckSpec) {
  const t = deck.tokens ?? {};
  return { c: t.color ?? {}, f: t.font ?? {}, s: t.scale ?? {} };
}

function itemsOf(params: P, fallback: any[] = []): any[] {
  const raw = params.items ?? params.bullets ?? fallback;
  if (!Array.isArray(raw)) return [];
  return raw.map((it: any) => typeof it === "string" ? { title: it } : it);
}

// ─────────────────────────────────────────────────────────────
// GEOMETRIC GENERATORS (Bộ công cụ tạo Decor)
// ─────────────────────────────────────────────────────────────

function createHoneycomb(objs: ObjectSpec[], startX: number, startY: number, cols: number, rows: number, size: number, color: string, opacity: number) {
  const hexW = size;
  const hexH = size * 0.866;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * hexW * 0.75;
      const y = startY + r * hexH + (c % 2 === 1 ? hexH / 2 : 0);
      objs.push(shape(`deco/hex-${r}-${c}`, x, y, hexW, hexH, 
        { type: "solid", color: color, alpha: opacity }, 
        { shape: "hexagon", decorative: true, altText: "" }
      ));
    }
  }
}

function createShatter(objs: ObjectSpec[], W: number, H: number, count: number, color1: string, color2: string) {
  const shapes = ["triangle", "rtriangle", "diamond", "pentagon"];
  for (let i = 0; i < count; i++) {
    const size = 3 + Math.random() * 4;
    const x = Math.random() * W - size / 2;
    const y = Math.random() * H - size / 2;
    const isPrimary = i % 2 === 0;
    objs.push(shape(`deco/shatter-${i}`, x, y, size, size,
      { type: "solid", color: isPrimary ? color1 : color2, alpha: 10 + Math.random() * 15 },
      { shape: shapes[i % shapes.length], decorative: true, altText: "", extra: { geometry: { x, y, w: size, h: size, rotation: Math.random() * 360 } } } as any
    ));
  }
}

function createDotGrid(objs: ObjectSpec[], startX: number, startY: number, cols: number, rows: number, spacing: number, color: string, opacity: number) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      objs.push(shape(`deco/dot-${r}-${c}`, startX + c * spacing, startY + r * spacing, 0.08, 0.08,
        { type: "solid", color: color, alpha: opacity },
        { shape: "ellipse", decorative: true, altText: "" }
      ));
    }
  }
}

function createWaves(objs: ObjectSpec[], W: number, H: number, color: string) {
  for (let i = 0; i < 3; i++) {
    objs.push(shape(`deco/wave-${i}`, -1, H - 3 + i * 1.5, W + 2, 3,
      { type: "solid", color: color, alpha: 15 },
      { shape: "wave", decorative: true, altText: "" }
    ));
  }
}

function createGlassBlobs(objs: ObjectSpec[], W: number, H: number, color1: string, color2: string) {
  objs.push(shape("deco/blob-1", -3, -3, 10, 10, { type: "gradient", stops: [[color1, 0], [color1, 100]], angle: 45 }, { shape: "ellipse", decorative: true, altText: "", extra: { fill: { type: "gradient", alpha: 15 } } } as any));
  objs.push(shape("deco/blob-2", W - 6, H - 6, 9, 9, { type: "solid", color: color2, alpha: 12 }, { shape: "ellipse", decorative: true, altText: "" }));
  objs.push(shape("deco/blob-3", W/2 - 2, -1, 5, 5, { type: "solid", color: color1, alpha: 20 }, { shape: "cloud", decorative: true, altText: "" }));
}

// ─────────────────────────────────────────────────────────────
// GOLDEN MATH (Tính toán lưới theo chuẩn 1.196 slide)
// ─────────────────────────────────────────────────────────────

// Bảng số liệu vàng cho Card Grid (Pitch = Col + Gutter)
const PITCH_MAP: Record<number, { pitch: number, ratio: number }> = {
  4: { pitch: 0.218, ratio: 0.29 }, // 4 cột là chuẩn nhất
  5: { pitch: 0.190, ratio: 0.30 },
  6: { pitch: 0.152, ratio: 0.17 },
  8: { pitch: 0.115, ratio: 0.34 },
};

function getCardGrid(W: number, N: number, topY: number, bottomY: number) {
  // Nếu N=2 hoặc 3, tự động đẩy lên N=4 (theo khuyến nghị vì lưới 2,3 không ổn định)
  const N_actual = (N === 2 || N === 3) ? 4 : N;
  const cfg = PITCH_MAP[N_actual] || PITCH_MAP[4];
  
  const pitch = W * cfg.pitch;
  const colW = pitch / (1 + cfg.ratio);
  const gutter = pitch - colW;
  const span = N_actual * colW + (N_actual - 1) * gutter;
  const marginX = (W - span) / 2; // Lề trái = lề phải
  
  return {
    colW, gutter, marginX, pitch,
    xPositions: Array.from({ length: N_actual }, (_, i) => marginX + i * pitch),
    topY,
    cardH: (bottomY - topY) // Sẽ chia cho số hàng sau
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPOSER
// ─────────────────────────────────────────────────────────────

export function composeArchetype(deck: DeckSpec, slide: SlideSpec, type: string, params: P = {}): ObjectSpec[] {
  const { c, f, s } = tokens(deck);
  const area = safeArea(deck);
  const W = deck.meta.size?.w ?? 13.333;
  const H = deck.meta.size?.h ?? 7.5;
  const title = params.title ?? "Tiêu đề slide";
  const subtitle = params.subtitle ?? "";
  const objs: ObjectSpec[] = [];
  const fontH = f.heading ?? f.body;
  const fontB = f.body;
  const colorText = c.text ?? "#0B1F3A";
  const colorMuted = c.muted ?? "#5B6B80";
  const colorSurface = c.surface ?? "#F4F6FA";
  const colorPrimary = c.primary ?? "#1B4FA0";
  const colorAccent = c.accent ?? "#F59E0B";
  const colorLine = c.line ?? "#D7DEE8";
  const margin = area.x;
  const contentW = area.w;
  const contentBottom = H - 0.6; // Chừa chỗ cho footer

  const addTitle = (size?: number, w = contentW) => {
    objs.push(text("content/title", title, margin, 0.45, w, 0.72, {
      size: size ?? s.h1 ?? 34, font: fontH, color: colorText, bold: true, valign: "middle", role: "title", lineSpacing: 1.05,
    }));
  };
  const addSubtitle = (y = 1.15, w = contentW) => {
    if (subtitle) objs.push(text("content/subtitle", subtitle, margin, y, w, 0.4, {
      size: s.h2 ?? 20, font: fontB, color: colorMuted, role: "subtitle",
    }));
  };
  const addSource = (source?: string) => {
    objs.push(text("ui/source", source ?? params.source ?? "Nguồn: nội bộ", margin, H - 0.42, contentW - 1, 0.24, {
      size: 10, font: fontB, color: colorMuted, role: "source",
    }));
  };

  switch (type) {
    case "decor-modern": {
      const style = params.style ?? "glass";
      switch (style) {
        case "honeycomb": createHoneycomb(objs, -2, -2, 10, 8, 2.2, colorPrimary, 15); break;
        case "shatter": createShatter(objs, W, H, 15, colorPrimary, colorAccent); break;
        case "dots": createDotGrid(objs, 1, 1, 20, 15, 0.5, colorPrimary, 20); break;
        case "waves": createWaves(objs, W, H, colorPrimary); break;
        case "glass":
        default: createGlassBlobs(objs, W, H, colorPrimary, colorAccent); break;
      }
      addTitle(s.display ?? 48);
      addSubtitle(2.2);
      objs.push(text("content/body", params.body ?? "Nội dung slide với background phức tạp.", margin, 3.0, contentW * 0.7, 2.0, { size: 18, color: colorText, role: "body" }));
      addSource();
      return objs;
    }

    case "cover": {
      objs.push(shape("deco/accent-bar", margin, 2.05, 0.09, 2.6, { type: "solid", color: colorAccent }, { decorative: true, altText: "Accent bar" }));
      objs.push(text("content/title", title, margin + 0.3, 1.9, contentW * 0.72, 1.9, {
        size: s.display ?? 58, font: f.display ?? fontH, color: colorText, bold: true, lineSpacing: 1.0, role: "title", valign: "middle",
      }));
      if (subtitle) objs.push(text("content/subtitle", subtitle, margin + 0.3, 3.95, contentW * 0.62, 0.7, {
        size: s.h2 ?? 22, font: fontB, color: colorMuted, role: "subtitle",
      }));
      objs.push(text("ui/meta", params.meta ?? (`${params.author ?? ""}${params.date ? " - " + params.date : ""}`.trim() || "XPowerpoint"),
        margin + 0.3, H - 0.8, contentW * 0.7, 0.3, { size: 12, color: colorMuted, role: "source" }));
      return objs;
    }
    case "section-divider": {
      objs.push(text("deco/section-number", params.number ?? "01", margin, 1.2, 4.2, 2.4, {
        size: 150, font: f.display ?? fontH, color: colorLine, bold: true, role: "decor", decorative: true, altText: "Section number",
      }));
      objs.push(text("content/title", title, margin + 4.6, 2.2, contentW - 4.6, 1.1, {
        size: s.display ?? 52, font: fontH, color: colorText, bold: true, valign: "middle", role: "title",
      }));
      if (subtitle) objs.push(text("content/subtitle", subtitle, margin + 4.6, 3.35, contentW - 4.8, 0.5, {
        size: s.body ?? 18, color: colorMuted, role: "subtitle",
      }));
      return objs;
    }
    case "statement":
      objs.push(text("content/title", title, margin, 1.5, contentW, 3.2, {
        size: params.size ?? 50, font: f.display ?? fontH, color: colorText, bold: true, align: params.align ?? "center", valign: "middle", role: "title", lineSpacing: 1.08,
      }));
      if (subtitle) objs.push(text("content/subtitle", subtitle, margin, 4.9, contentW, 0.6, {
        size: s.h2 ?? 20, color: colorMuted, align: "center", role: "subtitle",
      }));
      return objs;
    case "hero-metric": {
      const m = params.metric ?? { label: params.label ?? "Chỉ số chính", value: params.value ?? "+32%", compare: params.compare ?? "So với cùng kỳ", unit: params.unit ?? "" };
      addTitle(30, contentW * 0.7);
      objs.push(text("content/label", m.label, margin, 1.55, 6.5, 0.4, { size: 14, color: colorMuted, role: "label", bold: true }));
      objs.push(text("content/value", String(m.value), margin, 1.95, 7.2, 1.9, {
        size: params.size ?? 112, font: f.display ?? fontH, color: colorPrimary, bold: true, lineSpacing: 0.95, role: "value",
      }));
      if (m.unit) objs.push(text("content/unit", m.unit, margin + 7.3, 3.35, 2.2, 0.5, { size: 20, color: colorMuted, role: "unit", valign: "middle" }));
      objs.push(text("content/compare", m.compare, margin, 4.2, 7.5, 0.45, { size: 17, color: colorText, role: "body" }));
      objs.push(shape("deco/metric-rule", margin, 4.85, 2.6, 0.02, { type: "solid", color: colorAccent }, { decorative: true, altText: "Rule" }));
      addSource(m.source ?? params.source);
      return objs;
    }
    case "kpi-dashboard": {
      addTitle();
      const kpis = (params.metrics ?? params.items ?? []).slice(0, 8);
      const n = Math.max(1, kpis.length || 4);
      const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
      const rows = Math.ceil(n / cols);
      const gap = 0.2;
      const cw = (contentW - gap * (cols - 1)) / cols;
      const ch = (2.05 - gap * (rows - 1)) / rows;
      const startY = 1.35;
      kpis.forEach((k: any, i: number) => {
        const cx = margin + (i % cols) * (cw + gap);
        const cy = startY + Math.floor(i / cols) * (ch + gap);
        const obj = shape(`data/kpi-${String(i + 1).padStart(2, "0")}`, cx, cy, cw, ch, { type: "solid", color: colorSurface }, {
          line: { color: colorLine, width: 0.75 }, altText: `KPI ${k.label ?? i + 1}`, role: "container",
        });
        objs.push(obj);
        objs.push(text(`data/kpi-label-${String(i + 1).padStart(2, "0")}`, k.label ?? "Chỉ số", cx + 0.16, cy + 0.14, cw - 0.32, 0.28, { size: 11, color: colorMuted, role: "label", bold: true }));
        objs.push(text(`data/kpi-value-${String(i + 1).padStart(2, "0")}`, String(k.value ?? "0"), cx + 0.16, cy + 0.42, cw - 0.32, 0.7, { size: 30, color: colorText, bold: true, role: "value", lineSpacing: 1 }));
        if (k.delta) objs.push(text(`data/kpi-delta-${String(i + 1).padStart(2, "0")}`, String(k.delta), cx + 0.16, cy + 1.15, cw - 0.32, 0.26, {
          size: 11, color: String(k.delta).startsWith("-") ? (c.bad ?? "#C0392B") : (c.ok ?? "#1E8E5A"), role: "label",
        }));
      });
      const gridBottom = startY + rows * (ch + gap);
      if (params.series?.length && gridBottom < 6.5) {
        objs.push({
          id: "data/chart-01", type: "chart", band: "data", role: "container",
          geometry: { x: margin, y: gridBottom + 0.08, w: contentW, h: 6.75 - gridBottom },
          chart: { type: params.chartType ?? "line", title: params.chartTitle ?? "", labels: params.labels ?? [], series: params.series, options: params.chartOptions ?? {} },
          z: 80, decorative: false, altText: params.chartTitle ?? "Biểu đồ", locked: false, sourceRef: null, fill: null, line: null, effects: {},
        });
      }
      addSource();
      return objs;
    }
    case "card-grid": {
      addTitle();
      addSubtitle();
      const items = itemsOf(params, ["Ý 1", "Ý 2", "Ý 3", "Ý 4"]).slice(0, 6);
      const n = Math.max(1, items.length);
      const top = subtitle ? 1.7 : 1.4;
      
      // Áp dụng Golden Math
      const grid = getCardGrid(W, n, top, contentBottom);
      const rowsCount = Math.ceil(n / grid.xPositions.length);
      const rowH = (contentBottom - top - (rowsCount - 1) * 0.24) / rowsCount; // 0.24 is module gap

      const iconShape = params.iconShape ?? "ellipse"; 
      const iconColor = params.iconColor ?? colorAccent;

      items.forEach((it: any, i: number) => {
        const colIdx = i % grid.xPositions.length;
        const rowIdx = Math.floor(i / grid.xPositions.length);
        const cx = grid.xPositions[colIdx];
        const cy = top + rowIdx * (rowH + 0.24);
        
        const id = String(i + 1).padStart(2, "0");
        objs.push(shape(`content/card-${id}`, cx, cy, grid.colW, rowH, { type: "solid", color: colorSurface }, {
          line: { color: colorLine, width: 0.75 }, altText: `Card ${it.title ?? i + 1}`,
        }));
        
        const pad = Math.min(0.8 * (W / 100), 0.25 * grid.colW);
        
        if (params.icon !== false) objs.push(shape(`deco/card-icon-${id}`, cx + pad, cy + pad, 0.42, 0.42, { type: "solid", color: iconColor }, { shape: iconShape, decorative: true, altText: "" }));
        
        objs.push(text(`content/card-title-${id}`, it.title ?? `Ý ${i + 1}`, cx + pad, cy + pad + 0.54, grid.colW - (pad*2), 0.42, {
          size: 16, color: colorText, bold: true, role: "title",
        }));
        if (it.body) objs.push(text(`content/card-body-${id}`, it.body, cx + pad, cy + pad + 0.96, grid.colW - (pad*2), rowH - 1.1, {
          size: 12, color: colorMuted, role: "body", lineSpacing: 1.3,
        }));
      });
      addSource();
      return objs;
    }
    case "comparison": {
      addTitle();
      addSubtitle();
      const opts = (params.options ?? itemsOf(params, [{ title: "Phương án A" }, { title: "Phương án B" }])).slice(0, 3);
      const n = Math.max(1, opts.length);
      // Comparison coi như N=4, chia đôi
      const cw = (contentW - 0.3) / 2; 
      const top = subtitle ? 1.7 : 1.4;
      opts.forEach((o: any, i: number) => {
        if (i > 1) return; // Chỉ lấy 2
        const cx = margin + i * (cw + 0.3);
        const isHi = params.highlight === i;
        objs.push(shape(`content/option-${i}`, cx, top, cw, 5.2, { type: "solid", color: isHi ? colorSurface : "#FFFFFF" }, {
          line: { color: isHi ? colorAccent : colorLine, width: isHi ? 1.5 : 0.75 }, altText: o.title ?? `Phương án ${i + 1}`,
        }));
        objs.push(text(`content/option-title-${i}`, o.title ?? `Phương án ${i + 1}`, cx + 0.2, top + 0.2, cw - 0.4, 0.5, { size: 18, bold: true, color: colorText, role: "title" }));
        (o.points ?? o.criteria ?? []).slice(0, 5).forEach((p: any, j: number) => {
          objs.push(text(`content/option-point-${i}-${j}`, `• ${typeof p === "string" ? p : p.text ?? p.label ?? ""}`, cx + 0.24, top + 0.9 + j * 0.55, cw - 0.48, 0.5, { size: 13, color: colorMuted, role: "body" }));
        });
      });
      addSource();
      return objs;
    }
    case "process": {
      addTitle();
      addSubtitle();
      const steps = itemsOf(params, ["Bước 1", "Bước 2", "Bước 3", "Bước 4"]).slice(0, 6);
      const n = Math.max(1, steps.length);
      const perRow = n <= 4 ? n : Math.ceil(n / 2);
      const gap = 0.18;
      const cw = (contentW - gap * (perRow - 1)) / perRow;
      const top = subtitle ? 1.8 : 1.5;
      steps.forEach((st: any, i: number) => {
        const rowIdx = Math.floor(i / perRow);
        const cx = margin + (i % perRow) * (cw + gap);
        const cy = top + rowIdx * 1.85;
        objs.push(shape(`content/step-${i}`, cx, cy, cw, 1.35, { type: "solid", color: colorSurface }, {
          line: { color: colorLine, width: 0.75 }, altText: st.title ?? `Bước ${i + 1}`,
        }));
        objs.push(text(`deco/step-number-${i}`, String(i + 1).padStart(2, "0"), cx + 0.15, cy + 0.1, 0.7, 0.3, { size: 13, bold: true, color: colorAccent, role: "label" }));
        objs.push(text(`content/step-title-${i}`, st.title ?? `Bước ${i + 1}`, cx + 0.15, cy + 0.42, cw - 0.3, 0.4, { size: 15, bold: true, color: colorText, role: "title" }));
        if (st.body) objs.push(text(`content/step-body-${i}`, st.body, cx + 0.15, cy + 0.82, cw - 0.3, 0.42, { size: 11, color: colorMuted, role: "body" }));
        if (i % perRow < perRow - 1 && i < n - 1) {
          objs.push(shape(`deco/step-arrow-${i}`, cx + cw + 0.03, cy + 0.6, gap - 0.06, 0.12, { type: "solid", color: colorPrimary }, { shape: "arrow", decorative: true, altText: "" }));
        }
      });
      addSource();
      return objs;
    }
    case "timeline": {
      addTitle();
      const miles = itemsOf(params, ["Mốc 1", "Mốc 2", "Mốc 3", "Mốc 4"]).slice(0, 8);
      const n = Math.max(1, miles.length);
      const lineY = 3.35;
      objs.push(shape("deco/timeline-line", margin + 0.2, lineY, contentW - 0.4, 0.025, { type: "solid", color: colorLine }, { decorative: true, altText: "Timeline" }));
      miles.forEach((m: any, i: number) => {
        const cx = margin + 0.2 + (contentW - 0.4) * (i / Math.max(1, n - 1));
        objs.push(shape(`deco/timeline-dot-${i}`, cx - 0.09, lineY - 0.08, 0.18, 0.18, { type: "solid", color: colorAccent }, { shape: "ellipse", decorative: true, altText: "" }));
        const above = i % 2 === 0;
        const ty = above ? lineY - 1.15 : lineY + 0.3;
        objs.push(text(`content/milestone-date-${i}`, m.date ?? `0${i + 1}/2026`, Math.max(margin, cx - 1.0), ty, 2.0, 0.26, { size: 11, bold: true, color: colorPrimary, role: "label", align: "center" }));
        objs.push(text(`content/milestone-title-${i}`, m.title ?? String(m), Math.max(margin, cx - 1.0), ty + 0.28, 2.0, 0.7, { size: 13, color: colorText, role: "body", align: "center" }));
      });
      addSource();
      return objs;
    }
    case "roadmap": {
      addTitle();
      const streams = (params.streams ?? itemsOf(params, ["Workstream A", "Workstream B"])).slice(0, 5);
      const quarters = params.quarters ?? ["Q1", "Q2", "Q3", "Q4"];
      const leftW = 2.6;
      const chartX = margin + leftW + 0.2;
      const chartW = contentW - leftW - 0.2;
      const qW = chartW / quarters.length;
      quarters.forEach((q: string, i: number) => {
        objs.push(text(`ui/q-${i}`, q, chartX + i * qW, 1.35, qW - 0.05, 0.3, { size: 12, bold: true, color: colorMuted, align: "center", role: "label" }));
        objs.push(shape(`deco/q-line-${i}`, chartX + i * qW, 1.7, 0.01, 4.7, { type: "solid", color: colorLine }, { decorative: true, altText: "" }));
      });
      streams.forEach((st: any, i: number) => {
        const cy = 1.95 + i * 0.9;
        objs.push(text(`content/stream-${i}`, st.title ?? st.name ?? String(st), margin, cy + 0.12, leftW, 0.35, { size: 13, bold: true, color: colorText, role: "title" }));
        const s = st.start ?? 0; const span = st.span ?? 1;
        objs.push(shape(`data/roadmap-bar-${i}`, chartX + s * qW + 0.04, cy, Math.max(0.2, span * qW - 0.08), 0.5,
          { type: "solid", color: st.color ?? colorPrimary }, { shape: "roundRect", altText: st.title ?? `Workstream ${i + 1}`, role: "container" }));
      });
      addSource();
      return objs;
    }
    case "funnel": {
      addTitle();
      const stages = itemsOf(params, ["Nhận biết", "Quan tâm", "Cân nhắc", "Mua"]).slice(0, 6);
      const n = Math.max(1, stages.length);
      const maxW = contentW * 0.62;
      const top = 1.65; const h = Math.min(0.85, 4.8 / n);
      stages.forEach((st: any, i: number) => {
        const w = maxW * (1 - i / (n + 0.5));
        const cx = margin + (maxW - w) / 2;
        objs.push(shape(`data/funnel-stage-${i}`, cx, top + i * h, w, h * 0.9,
          { type: "solid", color: i === 0 ? colorPrimary : colorSurface }, { line: { color: colorLine, width: 0.75 }, altText: st.title ?? `Tầng ${i + 1}`, role: "container" }));
        objs.push(text(`content/funnel-label-${i}`, st.title ?? String(st), cx + 0.15, top + i * h + 0.12, w - 0.3, 0.35,
          { size: 13, bold: true, color: i === 0 ? "#FFFFFF" : colorText, role: "label" }));
        objs.push(text(`data/funnel-value-${i}`, String(st.value ?? `${100 - i * 18}%`), margin + maxW + 0.4, top + i * h + 0.1, 2.2, 0.35,
          { size: 15, bold: true, color: colorPrimary, role: "value" }));
      });
      addSource();
      return objs;
    }
    case "hierarchy": {
      addTitle();
      const nodes = itemsOf(params, ["CEO", "Khối Kinh doanh", "Khối Vận hành"]).slice(0, 12);
      const n = Math.max(1, nodes.length);
      const perRow = Math.min(4, n);
      const gap = 0.25;
      const cw = (contentW - gap * (perRow - 1)) / perRow;
      nodes.forEach((nd: any, i: number) => {
        const rIdx = Math.floor(i / perRow);
        const cx = margin + (i % perRow) * (cw + gap) + (rIdx === 0 && n > 1 ? (contentW - cw) / 2 : 0);
        const cy = 1.7 + rIdx * 1.35;
        objs.push(shape(`content/node-${i}`, cx, cy, cw, 0.8, { type: "solid", color: rIdx === 0 ? colorPrimary : colorSurface }, {
          line: { color: colorLine, width: 0.75 }, altText: nd.title ?? `Node ${i + 1}`, role: "container",
        }));
        objs.push(text(`content/node-label-${i}`, nd.title ?? String(nd), cx + 0.1, cy + 0.15, cw - 0.2, 0.5, {
          size: 12, bold: true, color: rIdx === 0 ? "#FFFFFF" : colorText, align: "center", role: "label", valign: "middle",
        }));
        if (rIdx > 0) {
          const parentIdx = Math.floor((i - perRow) / 1) % perRow;
          const px = margin + parentIdx * (cw + gap) + cw / 2;
          objs.push(shape(`deco/connector-${i}`, px, cy - 0.55, 0.012, 0.55, { type: "solid", color: colorLine }, { decorative: true, altText: "" }));
        }
      });
      addSource();
      return objs;
    }
    case "text-and-bullets": {
      addTitle();
      addSubtitle();
      const bullets = itemsOf(params, ["Điểm chính 1", "Điểm chính 2", "Điểm chính 3"]).slice(0, 6);
      const top = subtitle ? 1.75 : 1.45;
      bullets.forEach((b: any, i: number) => {
        const t = typeof b === "string" ? b : b.title ?? b.text ?? "";
        const body = typeof b === "object" ? b.body : "";
        objs.push(shape(`deco/bullet-${i}`, margin + 0.02, top + i * 0.85 + 0.08, 0.09, 0.09, { type: "solid", color: colorAccent }, { shape: "ellipse", decorative: true, altText: "" }));
        objs.push(text(`content/bullet-${i}`, t, margin + 0.28, top + i * 0.85, contentW * 0.72, 0.4, { size: 17, color: colorText, role: "body", bold: true }));
        if (body) objs.push(text(`content/bullet-body-${i}`, body, margin + 0.28, top + i * 0.85 + 0.36, contentW * 0.72, 0.34, { size: 12, color: colorMuted, role: "body" }));
      });
      if (params.callout) {
        objs.push(shape("content/callout", margin + contentW * 0.76, top, contentW * 0.23, 2.6, { type: "solid", color: colorSurface }, {
          line: { color: colorAccent, width: 1 }, altText: "Callout",
        }));
        objs.push(text("content/callout-text", String(params.callout), margin + contentW * 0.76 + 0.18, top + 0.18, contentW * 0.23 - 0.36, 2.2, {
          size: 13, color: colorText, role: "body",
        }));
      }
      addSource();
      return objs;
    }
    case "image-and-text": {
      addTitle();
      const side = params.imageSide ?? "right";
      const imgW = contentW * 0.48;
      const imgX = side === "right" ? margin + contentW - imgW : margin;
      const txtX = side === "right" ? margin : margin + imgW + 0.3;
      const txtW = contentW - imgW - 0.3;
      objs.push({
        id: "content/image-01", type: "image", band: "content", role: "container",
        geometry: { x: imgX, y: 1.5, w: imgW, h: 4.9 }, fill: { type: "solid", color: colorSurface },
        image: { path: params.imagePath, assetId: params.assetId, fit: "cover" },
        line: { color: colorLine, width: 0.75 }, effects: {}, z: 30, decorative: false,
        altText: params.imageAlt ?? "Minh hoạ", locked: false, sourceRef: null,
      });
      objs.push(text("content/body-title", params.bodyTitle ?? (subtitle || "Điểm chính"), txtX, 1.6, txtW, 0.6, {
        size: 22, bold: true, color: colorText, role: "title", font: fontH,
      }));
      const bullets = itemsOf(params, ["Luận điểm 1", "Luận điểm 2", "Luận điểm 3"]).slice(0, 4);
      bullets.forEach((b: any, i: number) => {
        objs.push(text(`content/body-${i}`, `• ${typeof b === "string" ? b : b.title ?? b.text ?? ""}`, txtX, 2.35 + i * 0.85, txtW, 0.7, {
          size: 15, color: colorMuted, role: "body", lineSpacing: 1.3,
        }));
      });
      addSource();
      return objs;
    }
    case "full-bleed-image": {
      if (params.imagePath) objs.push({ id: "bg/image", type: "image", band: "bg", role: "decor", decorative: true, geometry: { x: 0, y: 0, w: W, h: H }, image: { path: params.imagePath, fit: "cover" }, z: 0, altText: "", fill: null, line: null, effects: {} });
      objs.push(shape("deco/overlay", 0, 0, W, H, { type: "solid", color: "#000000", alpha: Math.round((params.overlay ?? 0.45) * 100) }, { decorative: true, altText: "" }));
      objs.push(text("content/title", title, margin, 2.35, contentW * 0.8, 1.6, {
        size: s.display ?? 54, font: f.display ?? fontH, color: "#FFFFFF", bold: true, valign: "middle", role: "title",
      }));
      if (subtitle) objs.push(text("content/subtitle", subtitle, margin, 4.05, contentW * 0.6, 0.6, { size: 20, color: "#E5E7EB", role: "subtitle" }));
      if (params.source) objs.push(text("ui/source", params.source, margin, H - 0.42, contentW, 0.24, { size: 10, color: "#D1D5DB", role: "source" }));
      return objs;
    }
    case "quote": {
      objs.push(text("deco/quote-mark", "“", margin, 0.9, 1.6, 1.6, { size: 150, font: f.display ?? fontH, color: colorLine, bold: true, role: "decor", decorative: true, altText: "" }));
      objs.push(text("content/quote", params.quote ?? title, margin + 0.7, 2.05, contentW - 1.4, 3.0, {
        size: params.size ?? 34, font: f.display ?? fontH, color: colorText, italic: true, valign: "middle", role: "body", lineSpacing: 1.15,
      }));
      objs.push(text("content/author", `— ${params.author ?? "Tác giả"}${params.role ? ", " + params.role : ""}`, margin + 0.7, 5.25, contentW - 1.4, 0.4, {
        size: 14, color: colorMuted, role: "source",
      }));
      if (params.source) addSource(params.source); else addSource("");
      return objs;
    }
    case "data-table": {
      addTitle(30);
      const rows = params.rows ?? [["Hạng mục", "Q1", "Q2", "Q3"], ["Doanh thu", "100", "120", "158"]];
      objs.push({
        id: "data/table-01", type: "table", band: "data", role: "container",
        geometry: { x: margin, y: 1.35, w: contentW, h: params.height ?? 4.9 },
        table: { rows, header: params.header !== false, zebra: params.zebra !== false, colWidths: params.colWidths, options: params.tableOptions ?? {} },
        z: 80, decorative: false, altText: "Bảng dữ liệu", locked: false, sourceRef: null, fill: null, line: null, effects: {},
      });
      addSource();
      return objs;
    }
    case "chart-focus": {
      addTitle(30);
      const chartW = contentW * 0.66;
      objs.push({
        id: "data/chart-01", type: "chart", band: "data", role: "container",
        geometry: { x: margin, y: 1.4, w: chartW, h: 5.1 },
        chart: {
          type: params.chartType ?? "column", title: params.chartTitle ?? "",
          labels: params.labels ?? ["Q1", "Q2", "Q3", "Q4"],
          series: params.series ?? [{ name: "Giá trị", values: [12, 18, 24, 32] }],
          options: params.chartOptions ?? {},
        },
        z: 80, decorative: false, altText: params.chartTitle ?? "Biểu đồ", locked: false, sourceRef: null, fill: null, line: null, effects: {},
      });
      objs.push(shape("content/insight-panel", margin + chartW + 0.3, 1.4, contentW - chartW - 0.3, 5.1, { type: "solid", color: colorSurface }, {
        line: { color: colorLine, width: 0.75 }, altText: "Insight",
      }));
      objs.push(text("content/insight-title", params.insightTitle ?? "Điểm chính", margin + chartW + 0.5, 1.6, contentW - chartW - 0.7, 0.45, {
        size: 14, bold: true, color: colorAccent, role: "label",
      }));
      const insights = params.insights ?? ["Tăng trưởng ổn định qua 4 quý", "Q4 chiếm 32% tổng năm"];
      insights.slice(0, 3).forEach((ins: string, i: number) => {
        objs.push(text(`content/insight-${i}`, ins, margin + chartW + 0.5, 2.15 + i * 1.05, contentW - chartW - 0.7, 0.9, {
          size: 14, color: colorText, role: "body", lineSpacing: 1.3,
        }));
      });
      addSource();
      return objs;
    }
    case "diagram-system": {
      addTitle(30);
      const nodes = itemsOf(params, ["Frontend", "API", "Database", "Cache"]).slice(0, 12);
      const perRow = Math.min(4, nodes.length);
      const gap = 0.25;
      const cw = (contentW - gap * (perRow - 1)) / perRow;
      nodes.forEach((nd: any, i: number) => {
        const rIdx = Math.floor(i / perRow);
        const cx = margin + (i % perRow) * (cw + gap);
        const cy = 1.55 + rIdx * 1.7;
        objs.push(shape(`content/node-${i}`, cx, cy, cw, 0.9, { type: "solid", color: colorSurface }, {
          line: { color: colorPrimary, width: 1 }, altText: nd.title ?? `Node ${i + 1}`, role: "container",
        }));
        objs.push(text(`content/node-title-${i}`, nd.title ?? String(nd), cx + 0.12, cy + 0.12, cw - 0.24, 0.32, { size: 13, bold: true, color: colorText, role: "title" }));
        if (nd.body) objs.push(text(`content/node-body-${i}`, nd.body, cx + 0.12, cy + 0.44, cw - 0.24, 0.35, { size: 10, color: colorMuted, role: "body" }));
        if (i >= perRow) {
          const px = margin + (i % perRow) * (cw + gap) + cw / 2;
          objs.push(shape(`deco/connector-${i}`, px, cy - 0.8, 0.012, 0.8, { type: "solid", color: colorLine }, { decorative: true, altText: "" }));
        }
      });
      addSource();
      return objs;
    }
    case "map": {
      addTitle(30);
      const mapW = contentW * 0.66;
      objs.push({
        id: "content/map-01", type: "image", band: "content", role: "container",
        geometry: { x: margin, y: 1.45, w: mapW, h: 5.0 }, fill: { type: "solid", color: colorSurface },
        image: { path: params.imagePath, assetId: params.assetId, fit: "contain" },
        line: { color: colorLine, width: 0.75 }, effects: {}, z: 30, decorative: false,
        altText: "Bản đồ", locked: false, sourceRef: null,
      });
      const regions = params.regions ?? [{ label: "Miền Bắc", value: "42%" }, { label: "Miền Trung", value: "21%" }, { label: "Miền Nam", value: "37%" }];
      regions.slice(0, 5).forEach((rg: any, i: number) => {
        objs.push(shape(`data/map-legend-${i}`, margin + mapW + 0.35, 1.6 + i * 0.8, 0.16, 0.16, { type: "solid", color: i === 0 ? colorPrimary : colorLine }, { shape: "ellipse", altText: rg.label ?? "Vùng" }));
        objs.push(text(`data/map-label-${i}`, `${rg.label ?? ""}: ${rg.value ?? ""}`, margin + mapW + 0.62, 1.52 + i * 0.8, contentW - mapW - 0.7, 0.34, { size: 13, color: colorText, role: "label" }));
      });
      addSource();
      return objs;
    }
    case "before-after": {
      addTitle();
      const gap = 0.3;
      const cw = (contentW - gap) / 2;
      const panels = [
        { label: "TRƯỚC", value: params.before ?? "42%", color: colorMuted, x: margin },
        { label: "SAU", value: params.after ?? "68%", color: colorPrimary, x: margin + cw + gap },
      ];
      panels.forEach((p, i) => {
        objs.push(shape(`content/panel-${i}`, p.x, 1.5, cw, 4.7, { type: "solid", color: colorSurface }, { line: { color: colorLine, width: 0.75 }, altText: p.label }));
        objs.push(text(`content/panel-label-${i}`, p.label, p.x + 0.25, 1.7, cw - 0.5, 0.35, { size: 12, bold: true, color: colorMuted, role: "label", letterSpacing: 1.5 }));
        objs.push(text(`content/panel-value-${i}`, p.value, p.x + 0.25, 2.3, cw - 0.5, 1.6, { size: 84, bold: true, color: p.color, role: "value" }));
      });
      objs.push(text("content/delta", params.delta ?? "+26 điểm", margin + cw + gap / 2 - 0.8, 6.35, 1.6, 0.4, { size: 14, bold: true, color: colorAccent, role: "label", align: "center" }));
      addSource();
      return objs;
    }
    case "conclusion-cta": {
      addTitle(34);
      const takes = (params.items ?? params.takeaways ?? ["Điểm chốt 1", "Điểm chốt 2", "Điểm chốt 3"]).slice(0, 3);
      takes.forEach((t: any, i: number) => {
        const txt = typeof t === "string" ? t : t.title ?? t.text ?? "";
        objs.push(shape(`content/takeaway-${i}`, margin, 1.55 + i * 1.1, contentW * 0.62, 0.85, { type: "solid", color: colorSurface }, { line: { color: colorLine, width: 0.75 }, altText: txt }));
        objs.push(text(`content/takeaway-text-${i}`, `${i + 1}. ${txt}`, margin + 0.2, 1.68 + i * 1.1, contentW * 0.62 - 0.4, 0.6, { size: 16, color: colorText, role: "body", valign: "middle" }));
      });
      objs.push(shape("ui/cta", margin + contentW * 0.7, 2.35, contentW * 0.3, 1.15, { type: "solid", color: colorPrimary }, { shape: "roundRect", altText: params.cta ?? "CTA" }));
      objs.push(text("ui/cta-text", params.cta ?? "Phê duyệt kế hoạch Q4", margin + contentW * 0.7 + 0.2, 2.55, contentW * 0.3 - 0.4, 0.75, {
        size: 17, bold: true, color: "#FFFFFF", align: "center", role: "label", valign: "middle",
      }));
      if (params.deadline) objs.push(text("ui/deadline", params.deadline, margin + contentW * 0.7 + 0.2, 3.65, contentW * 0.3 - 0.4, 0.3, {
        size: 11, color: colorMuted, align: "center", role: "source",
      }));
      return objs;
    }
    case "agenda": {
      addTitle();
      const items = itemsOf(params, ["Bối cảnh", "Phân tích", "Đề xuất", "Kế hoạch"]).slice(0, 6);
      const top = 1.5;
      items.forEach((it: any, i: number) => {
        const y = top + i * 0.85;
        objs.push(text(`content/agenda-num-${i}`, String(i + 1).padStart(2, "0"), margin, y, 0.8, 0.5, { size: 20, bold: true, color: colorAccent, role: "label" }));
        objs.push(text(`content/agenda-title-${i}`, typeof it === "string" ? it : it.title ?? "", margin + 0.85, y, contentW * 0.6, 0.5, { size: 19, color: colorText, role: "title" }));
        objs.push(shape(`deco/agenda-rule-${i}`, margin, y + 0.62, contentW * 0.62, 0.01, { type: "solid", color: colorLine }, { decorative: true, altText: "" }));
      });
      if (subtitle) objs.push(text("content/subtitle", subtitle, margin + contentW * 0.7, 1.6, contentW * 0.3, 3.0, { size: 15, color: colorMuted, role: "subtitle", lineSpacing: 1.4 }));
      return objs;
    }
    case "matrix-2x2": {
      addTitle();
      const m = { x: margin + 1.0, y: 1.5, w: 7.2, h: 5.2 };
      objs.push(shape("deco/matrix-frame", m.x, m.y, m.w, m.h, { type: "solid", color: "#FFFFFF" }, { line: { color: colorLine, width: 1 }, decorative: true, altText: "Matrix" }));
      objs.push(shape("deco/matrix-v", m.x + m.w / 2, m.y, 0.01, m.h, { type: "solid", color: colorLine }, { decorative: true, altText: "" }));
      objs.push(shape("deco/matrix-h", m.x, m.y + m.h / 2, m.w, 0.01, { type: "solid", color: colorLine }, { decorative: true, altText: "" }));
      objs.push(text("ui/x-label", params.xLabel ?? "Trục X →", m.x, m.y + m.h + 0.1, m.w, 0.3, { size: 12, color: colorMuted, align: "center", role: "label" }));
      objs.push(text("ui/y-label", params.yLabel ?? "Trục Y →", m.x - 0.8, m.y + m.h / 2, 1.2, 0.3, { size: 12, color: colorMuted, align: "right", role: "label" }));
      const points = (params.points ?? params.items ?? [{ label: "A", x: 0.3, y: 0.7 }, { label: "B", x: 0.7, y: 0.3 }]).slice(0, 8);
      points.forEach((p: any, i: number) => {
        const px = m.x + 0.2 + p.x * (m.w - 0.4);
        const py = m.y + 0.2 + (1 - p.y) * (m.h - 0.4);
        objs.push(shape(`data/point-${i}`, px, py, 0.22, 0.22, { type: "solid", color: i === 0 ? colorAccent : colorPrimary }, { shape: "ellipse", altText: p.label ?? `Điểm ${i + 1}` }));
        objs.push(text(`data/point-label-${i}`, p.label ?? String(i + 1), px + 0.28, py - 0.08, 1.2, 0.3, { size: 11, color: colorText, role: "label" }));
      });
      addSource();
      return objs;
    }
    default: {
      addTitle();
      addSubtitle();
      const bullets = itemsOf(params, ["Nội dung 1", "Nội dung 2"]).slice(0, 6);
      bullets.forEach((b: any, i: number) => {
        objs.push(text(`content/body-${i}`, `• ${typeof b === "string" ? b : b.title ?? b.text ?? ""}`, margin, 1.75 + i * 0.75, contentW, 0.55, {
          size: 17, color: colorText, role: "body",
        }));
      });
      addSource();
      return objs;
    }
  }
}