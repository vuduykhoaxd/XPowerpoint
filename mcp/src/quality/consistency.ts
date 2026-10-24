import type { DeckSpec, SlideSpec } from "../types.js";
import { measureText } from "../engine/compose/text-metrics.js";
import { area, unionRects, rectOf } from "../utils/geometry.js";
import type { Violation } from "./overflow.js";

export function safeAreaOf(deck: DeckSpec) {
  const W = deck.meta.size?.w ?? 13.333;
  const H = deck.meta.size?.h ?? 7.5;
  const m = deck.tokens?.grid?.margin ?? 0.5;
  return { x: m, y: 0.4, w: W - m * 2, h: H - 0.8 };
}

export function occupancyOf(deck: DeckSpec, slide: SlideSpec): number {
  const items = slide.objects.filter((o) => ["content", "data"].includes(o.band ?? "") && o.type !== "group");
  if (!items.length) return 0;
  const safe = safeAreaOf(deck);
  const u = unionRects(items.map((o) => rectOf(o.geometry)));
  return Math.min(1, area(u) / Math.max(0.01, area(safe)));
}

export function checkConsistency(deck: DeckSpec): Violation[] {
  const out: Violation[] = [];
  const safe = safeAreaOf(deck);
  const fontFamilies = new Set<string>();
  let bodyMin = Infinity;
  let titleSize = 0;
  let bodySize = 0;

  for (const slide of deck.slides) {
    const count = slide.objects.length;
    if (count > 400) out.push({ code: "E_BUDGET", slideId: slide.id, severity: "blocker", message: `Object budget hard limit: ${count} > 400` });
    else if (count > 150) out.push({ code: "E_BUDGET", slideId: slide.id, severity: "minor", message: `Object budget soft limit: ${count} > 150, consider split or bake` });

    for (const obj of slide.objects) {
      const g = obj.geometry;
      if (!g || g.w <= 0 || g.h <= 0) {
        out.push({ code: "E_GEOMETRY", slideId: slide.id, objectId: obj.id, severity: "blocker", message: "Non-positive size" });
        continue;
      }
      if (obj.band !== "bg" && (g.x < safe.x - 0.02 || g.y < safe.y - 0.02 || g.x + g.w > safe.x + safe.w + 0.02 || g.y + g.h > safe.y + safe.h + 0.02)) {
        if (!obj.decorative) out.push({ code: "E_MARGIN", slideId: slide.id, objectId: obj.id, severity: "minor", message: "Object outside safe margin" });
      }
      if (obj.type === "text") {
        if (obj.text?.fontFamily) fontFamilies.add(obj.text.fontFamily);
        if (obj.text?.fontSize) {
          if (["body", "label", "source"].includes(obj.role ?? "body")) bodyMin = Math.min(bodyMin, obj.text.fontSize);
          if (obj.role === "title") titleSize = Math.max(titleSize, obj.text.fontSize);
          if (obj.role === "body") bodySize = Math.max(bodySize, obj.text.fontSize);
        }
        if (obj.text?.paragraphs?.some((p: any) => (p.level ?? 0) > 1)) {
          out.push({ code: "E_SPEC", slideId: slide.id, objectId: obj.id, severity: "minor", message: "Bullet nesting deeper than 2 levels" });
        }
      }
      if (obj.type === "chart" && !obj.chart?.title) {
        out.push({ code: "E_SPEC", slideId: slide.id, objectId: obj.id, severity: "minor", message: "Chart has no title/insight" });
      }
      if (!/^(bg|deco|content|data|ui|note|edit-source)\//.test(obj.id)) {
        out.push({ code: "E_SPEC", slideId: slide.id, objectId: obj.id, severity: "minor", message: "Object id is not band-prefixed" });
      }
      if (obj.type === "text") {
        const value = obj.text?.value ?? "";
        const m = measureText(value, obj.geometry.w, obj.geometry.h, obj.text ?? {});
        if (value && m.lines > 6 && obj.role === "body" && (obj.text?.paragraphs?.length ?? 0) === 0) {
          out.push({ code: "E_SPEC", slideId: slide.id, objectId: obj.id, severity: "minor", message: "Body block longer than 6 lines" });
        }
      }
    }

    const occ = occupancyOf(deck, slide);
    if (slide.type !== "full-bleed-image" && slide.type !== "cover" && occ > 0.85) {
      out.push({ code: "E_OCCUPANCY", slideId: slide.id, severity: "minor", message: `Occupancy ${(occ * 100).toFixed(0)}% > 85%`, metrics: { occupancy: Number(occ.toFixed(3)) } });
    }
    if (slide.type === "full-bleed-image" && occ < 0.5) {
      out.push({ code: "E_OCCUPANCY", slideId: slide.id, severity: "minor", message: "Full-bleed slide has low content" });
    }
  }

  if (fontFamilies.size > 3) out.push({ code: "E_SPEC", slideId: "*", severity: "minor", message: `${fontFamilies.size} font families used (max 3)` });
  if (bodyMin < 14) out.push({ code: "E_SPEC", slideId: "*", severity: "major", message: `Body font ${bodyMin}pt < 14pt` });
  if (titleSize && bodySize && titleSize / bodySize < 1.8) {
    out.push({ code: "E_SPEC", slideId: "*", severity: "minor", message: `Title/body ratio ${(titleSize / bodySize).toFixed(2)} < 1.8` });
  }
  return out;
}
