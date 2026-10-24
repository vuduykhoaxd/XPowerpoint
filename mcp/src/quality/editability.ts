import type { DeckSpec } from "../types.js";
import { overlapRatio } from "../utils/geometry.js";

export interface EditabilityResult {
  score: number; pass: boolean; gate: number;
  criteria: { name: string; max: number; score: number; issues: string[] }[];
  issues: { slideId: string; objectId?: string; code: string; fix: string }[];
}

export function editabilityAudit(deck: DeckSpec, gate = 80): EditabilityResult {
  const issues: EditabilityResult["issues"] = [];
  const all = deck.slides.flatMap((s) => s.objects.map((o) => ({ slide: s, obj: o })));
  const nonDeco = all.filter(({ obj }) => !obj.decorative && obj.band !== "bg");

  const texts = nonDeco.filter(({ obj }) => obj.type === "text");
  const nativeText = texts.filter(({ obj }) => !obj.cf?.raster).length;
  const textScore = texts.length ? (nativeText / texts.length) * 20 : 20;
  texts.filter(({ obj }) => obj.cf?.raster).forEach(({ slide, obj }) => issues.push({ slideId: slide.id, objectId: obj.id, code: "TEXT_RASTER", fix: "Replace raster text with native text box" }));

  const themeColors = new Set(Object.values(deck.tokens?.color ?? {}).map((c: any) => String(c).toUpperCase()));
  const themeFonts = new Set(Object.values(deck.tokens?.font ?? {}).map((f: any) => String(f).toLowerCase()));
  let bound = 0; let styleTotal = 0;
  for (const { obj, slide } of nonDeco) {
    if (obj.type === "text" && obj.text?.color) {
      styleTotal++;
      if (themeColors.has(String(obj.text.color).toUpperCase())) bound++;
      else issues.push({ slideId: slide.id, objectId: obj.id, code: "COLOR_HARDCODED", fix: "Bind text color to a theme token" });
    }
    if (obj.type === "text" && obj.text?.fontFamily) {
      styleTotal++;
      if (themeFonts.has(String(obj.text.fontFamily).toLowerCase())) bound++;
      else issues.push({ slideId: slide.id, objectId: obj.id, code: "FONT_HARDCODED", fix: "Bind font to a theme token" });
    }
    if (obj.fill?.color) {
      styleTotal++;
      if (themeColors.has(String(obj.fill.color).toUpperCase())) bound++;
    }
  }
  const themeScore = styleTotal ? (bound / styleTotal) * 15 : 15;
  if (themeScore < 15) issues.push({ slideId: "*", code: "THEME_BIND", fix: "Replace hardcoded colors/fonts with tokens" });

  const nativeCharts = nonDeco.filter(({ obj }) => (obj.type === "chart" || obj.type === "table") && !obj.cf?.raster).length;
  const chartTotal = nonDeco.filter(({ obj }) => obj.type === "chart" || obj.type === "table").length;
  const chartScore = chartTotal ? (nativeCharts / chartTotal) * 15 : 15;
  nonDeco.filter(({ obj }) => (obj.type === "chart" || obj.type === "table") && obj.cf?.raster).forEach(({ slide, obj }) => {
    issues.push({ slideId: slide.id, objectId: obj.id, code: "RASTER_DATA", fix: "Rebuild as native chart/table with data" });
  });

  const goodNames = all.filter(({ obj }) => /^(bg|deco|content|data|ui|note|edit-source)\//.test(obj.id)).length;
  const namesScore = all.length ? (goodNames / all.length) * 10 : 10;
  if (goodNames !== all.length) issues.push({ slideId: "*", code: "NAMING", fix: "Rename objects with band prefixes" });

  const zOk = all.filter(({ obj }) => {
    const b = obj.band ?? "content";
    const z = obj.z ?? 20;
    if (b === "bg") return z < 10;
    if (b === "deco") return z >= 10 && z < 20;
    if (b === "content") return z >= 20 && z < 80;
    if (b === "data") return z >= 80 && z < 90;
    return z >= 90;
  }).length;
  const zScore = all.length ? (zOk / all.length) * 10 : 10;
  if (zOk !== all.length) issues.push({ slideId: "*", code: "Z_ORDER", fix: "Assign z within the band range" });

  const hasFallback = Boolean(deck.tokens?.font?.fallback);
  const fontScore = hasFallback ? 10 : 4;
  if (!hasFallback) issues.push({ slideId: "*", code: "FONT_FALLBACK", fix: "Add a fallback font stack to tokens" });

  let tight = 0; let pairs = 0;
  for (const slide of deck.slides) {
    const list = slide.objects.filter((o) => !o.decorative && o.band !== "bg");
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pairs++;
        const a = list[i].geometry; const b = list[j].geometry;
        const gapX = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w));
        const gapY = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
        if (gapX < 0.05 && gapY < 0.05 && overlapRatio(a, b) === 0) tight++;
      }
    }
  }
  const spacingScore = pairs ? ((pairs - tight) / pairs) * 10 : 10;

  const noted = deck.slides.filter((s) => (s.notes ?? "").trim().length > 0).length;
  const noteScore = deck.slides.length ? (noted / deck.slides.length) * 5 : 5;
  const specScore = 5;

  const criteria = [
    { name: "Text native", max: 20, score: round(textScore), issues: [] },
    { name: "Theme bind", max: 15, score: round(themeScore), issues: [] },
    { name: "Chart/table native", max: 15, score: round(chartScore), issues: [] },
    { name: "Naming + grouping", max: 10, score: round(namesScore), issues: [] },
    { name: "Z-order", max: 10, score: round(zScore), issues: [] },
    { name: "Font coverage + fallback", max: 10, score: fontScore, issues: [] },
    { name: "Spacing / clickability", max: 10, score: round(spacingScore), issues: [] },
    { name: "Notes + spec", max: 10, score: round(noteScore + specScore), issues: [] },
  ];
  const score = Math.round(criteria.reduce((s, c) => s + c.score, 0));
  return { score, pass: score >= gate, gate, criteria, issues };
}

function round(v: number) { return Math.round(v * 10) / 10; }
