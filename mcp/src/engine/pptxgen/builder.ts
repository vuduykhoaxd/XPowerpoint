import pptxgen from "pptxgenjs";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { DeckSpec, ObjectSpec, SlideSpec } from "../../types.js";
import { safeName } from "../../utils/paths.js";

const hex = (c?: string, fallback = "000000") => (c || fallback).replace("#", "").slice(0, 6);

function assetPath(deck: DeckSpec, id?: string, direct?: string): string | undefined {
  if (direct && existsSync(direct)) return direct;
  if (!id) return undefined;
  const a = (deck.assets ?? []).find((x: any) => x.id === id);
  if (a?.path && existsSync(a.path)) return a.path;
  return undefined;
}

function chartType(pptx: any, type: string) {
  const C = pptx.ChartType;
  switch ((type || "").toLowerCase()) {
    case "bar": return C.bar;
    case "column": return C.bar;
    case "line": return C.line;
    case "area": return C.area;
    case "pie": return C.pie;
    case "donut": return C.doughnut;
    case "scatter": return C.scatter;
    case "bubble": return C.bubble;
    case "radar": return C.radar;
    default: return C.bar;
  }
}

export interface BuildResult {
  file: string;
  specFile: string;
  slides: number;
  objects: number;
  warnings: string[];
}

export async function buildDeck(deck: DeckSpec, outDir: string, basename?: string): Promise<BuildResult> {
  const warnings: string[] = [];
  const pptx: any = new (pptxgen as any)();
  const W = deck.meta.size?.w ?? 13.333;
  const H = deck.meta.size?.h ?? 7.5;
  pptx.defineLayout({ name: "XP_CUSTOM", width: W, height: H });
  pptx.layout = "XP_CUSTOM";
  pptx.author = deck.meta.author ?? "XPowerpoint";
  pptx.title = deck.meta.title ?? "Untitled";
  pptx.subject = deck.meta.subject ?? "";
  pptx.lang = deck.meta.language ?? "vi";
  pptx.theme = {
    headFontFace: deck.tokens?.font?.heading ?? "Segoe UI",
    bodyFontFace: deck.tokens?.font?.body ?? "Segoe UI",
    lang: deck.meta.language ?? "vi",
  };

  const tokenColor = deck.tokens?.color ?? {};
  const bodyFont = deck.tokens?.font?.body ?? "Segoe UI";
  let objectCount = 0;

  for (const slideSpec of deck.slides) {
    const slide = pptx.addSlide();
    if (slideSpec.background) {
      const bg = slideSpec.background;
      if (bg.type === "image") {
        const p = assetPath(deck, bg.assetId, bg.path);
        if (p) slide.background = { path: p };
        else warnings.push(`${slideSpec.id}: background image missing (${bg.assetId ?? bg.path ?? "?"})`);
      } else if (bg.color) {
        slide.background = { color: hex(bg.color, "FFFFFF") };
      } else if (bg.stops?.[0]) {
        slide.background = { color: hex(String(bg.stops[0][0]), "FFFFFF") };
      }
    }

    const sorted = [...slideSpec.objects].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

    for (const obj of sorted) {
      try {
        objectCount++;
        addObject(pptx, slide, deck, obj, { bodyFont, tokenColor, warnings });
      } catch (e: any) {
        warnings.push(`${slideSpec.id}/${obj.id}: ${e?.message ?? e}`);
      }
    }

    if (slideSpec.notes) slide.addNotes(slideSpec.notes);
    if (slideSpec.transition && slideSpec.transition.type && slideSpec.transition.type !== "none") {
      warnings.push(`${slideSpec.id}: transition stored in spec; apply with com_motion for native playback`);
    }
    if (slideSpec.hidden) warnings.push(`${slideSpec.id}: hidden flag stored in spec only`);
  }

  mkdirSync(outDir, { recursive: true });
  const base = safeName(basename ?? deck.meta.title ?? "deck");
  const file = path.join(outDir, base + ".pptx");
  const specFile = path.join(outDir, base + ".spec.json");
  await pptx.writeFile({ fileName: file });
  writeFileSync(specFile, JSON.stringify(deck, null, 2), "utf8");
  return { file, specFile, slides: deck.slides.length, objects: objectCount, warnings };
}

function addObject(pptx: any, slide: any, deck: DeckSpec, obj: ObjectSpec, env: any) {
  const g = obj.geometry;
  if (!g) return;
  const base = { x: g.x, y: g.y, w: g.w, h: g.h, rotate: g.rotation ?? 0, objectName: obj.id };

  if (obj.type === "group") return;

  if (obj.type === "text") {
    const t: any = obj.text ?? {};
    const fill = t.fill ?? obj.fill;
    const opts: any = {
      ...base,
      fontFace: t.fontFamily ?? env.bodyFont,
      fontSize: t.fontSize ?? 18,
      color: hex(t.color ?? env.tokenColor.text, "111111"),
      bold: t.bold ?? false,
      italic: t.italic ?? false,
      align: t.align ?? "left",
      valign: t.valign ?? "top",
      margin: t.margin ?? 0.04,
      lineSpacingMultiple: t.lineSpacing ?? 1.2,
      charSpacing: (t.letterSpacing ?? 0) * 10,
      wrap: t.wrap !== false,
      isTextBox: true,
      fit: "none",
      altText: obj.altText || t.value || "Text",
    };
    if (obj.fill?.type === "solid" && obj.fill.color) {
      opts.fill = { color: hex(obj.fill.color) };
    }
    if (obj.line?.color) opts.line = { color: hex(obj.line.color), width: obj.line.width ?? 0.75 };
    if (obj.effects?.shadow) opts.shadow = shadowOf(obj.effects.shadow, deck);
    if (t.paragraphs?.length) {
      const runs: any[] = [];
      for (const p of t.paragraphs) {
        const pRuns = p.runs?.length ? p.runs : [{ text: p.text ?? "" }];
        pRuns.forEach((r: any, ri: number) => {
          runs.push({
            text: r.text ?? "",
            options: {
              bold: r.bold ?? t.bold,
              italic: r.italic ?? t.italic,
              color: hex(r.color ?? t.color ?? env.tokenColor.text, "111111"),
              fontSize: r.fontSize ?? t.fontSize ?? 18,
              bullet: ri === 0 && p.bullet ? { type: "bullet" } : undefined,
              indentLevel: p.level ?? 0,
              breakLine: ri === pRuns.length - 1,
              align: p.align,
            },
          });
        });
      }
      slide.addText(runs, opts);
    } else {
      slide.addText(t.value ?? "", opts);
    }
    return;
  }

  if (obj.type === "image") {
    const p = assetPath(deck, obj.image?.assetId, obj.image?.path);
    const imgOpts: any = { ...base, altText: obj.altText || "Image" };
    if (p) {
      slide.addImage({ path: p, ...imgOpts });
    } else if (obj.image?.data) {
      slide.addImage({ data: obj.image.data, ...imgOpts });
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        ...base, fill: { color: "EEF1F6" },
        line: { color: "C7D0DD", width: 0.75, dashType: "dash" },
        altText: obj.altText || "Image placeholder",
      });
      slide.addText("IMAGE", {
        ...base, align: "center", valign: "middle", fontSize: 11, color: "8A97A8", fontFace: env.bodyFont,
      });
      env.warnings.push(`${obj.id}: image asset missing, placeholder inserted`);
    }
    return;
  }

  if (obj.type === "chart") {
    const ch = obj.chart ?? {};
    const labels = ch.labels ?? [];
    const series = (ch.series ?? []).map((s: any) => ({ name: s.name ?? "Series", labels, values: s.values ?? [] }));
    if (!series.length) return;
    const colors = (ch.series ?? []).map((s: any) => hex(s.color, "1B4FA0")).filter(Boolean);
    const opt: any = {
      ...base,
      showTitle: Boolean(ch.title),
      title: ch.title ?? "",
      titleFontFace: env.bodyFont,
      titleFontSize: 13,
      showLegend: series.length > 1,
      legendPos: "b",
      legendFontFace: env.bodyFont,
      legendFontSize: 11,
      catAxisLabelFontFace: env.bodyFont,
      catAxisLabelFontSize: 11,
      valAxisLabelFontFace: env.bodyFont,
      valAxisLabelFontSize: 11,
      showValue: ch.options?.showValue ?? false,
      dataLabelFontFace: env.bodyFont,
      dataLabelFontSize: 10,
      chartColors: colors.length ? colors : undefined,
      barDir: ch.type === "bar" ? "bar" : "col",
      altText: obj.altText || ch.title || "Chart",
      ...(ch.options ?? {}),
    };
    slide.addChart(chartType(pptx, ch.type), series as any, opt);
    return;
  }

  if (obj.type === "table") {
    const rows = obj.table?.rows ?? [];
    if (!rows.length) return;
    const header = obj.table?.header !== false;
    const zebra = obj.table?.zebra !== false;
    const styledRows = rows.map((row: any[], ri: number) => row.map((cell: any) => ({
      text: String(cell ?? ""),
      options: {
        bold: header && ri === 0,
        fill: { color: hex(header && ri === 0 ? "#F4F6FA" : zebra && ri % 2 === 0 ? "#FAFBFC" : "#FFFFFF", "FFFFFF") },
        color: hex(ri === 0 ? env.tokenColor.primary ?? "#0B1F3A" : env.tokenColor.text ?? "#111111"),
        align: typeof cell === "number" || /^-?[\d.,%]+$/.test(String(cell)) ? "right" : "left",
        fontFace: env.bodyFont,
        fontSize: obj.table?.options?.fontSize ?? 12,
      },
    })));
    slide.addTable(styledRows, {
      ...base,
      border: { type: "solid", pt: 0.5, color: hex(env.tokenColor.line, "D7DEE8") },
      fontFace: env.bodyFont,
      fontSize: obj.table?.options?.fontSize ?? 12,
      color: hex(env.tokenColor.text, "111111"),
      valign: "middle",
      autoPage: false,
    });
    return;
  }

  const shapeType = shapeOf(pptx, obj.shape ?? (obj.type === "line" ? "line" : "rect"));
  const opt: any = {
    ...base,
    fill: obj.fill?.type === "none" ? { type: "none" } : { color: hex(obj.fill?.color, "E8EDF5") },
    line: obj.line?.color ? { color: hex(obj.line.color), width: obj.line.width ?? 1, dashType: obj.line.dash ?? "solid" } : { type: "none" },
    altText: obj.altText || (obj.decorative ? "" : "Shape"),
  };
  if (obj.fill?.type === "solid" && obj.fill.alpha !== undefined) opt.fill.transparency = 100 - obj.fill.alpha;
  if (obj.effects?.shadow) opt.shadow = shadowOf(obj.effects.shadow, deck);
  if (obj.line?.endArrow) opt.line.endArrowType = obj.line.endArrow;
  slide.addShape(shapeType, opt);
}

function shapeOf(pptx: any, shape: string) {
  const S = pptx.ShapeType;
  switch (shape) {
    case "roundRect": return S.roundRect;
    case "ellipse": return S.ellipse;
    case "triangle": return S.triangle;
    case "line": return S.line;
    case "arrow": return S.rightArrow;
    case "freeform": return S.freeform;
    default: return S.rect;
  }
}

function shadowOf(shadow: any, deck: DeckSpec) {
  if (typeof shadow === "string") {
    const preset = deck.tokens?.shadow?.[shadow];
    if (!preset) return undefined;
    return {
      type: "outer", blur: preset.blur, distance: preset.distance,
      angle: preset.angle, color: hex(preset.color, "000000"), opacity: (preset.opacity ?? 12) / 100,
    };
  }
  if (shadow && typeof shadow === "object") {
    return {
      type: shadow.type ?? "outer",
      blur: shadow.blur ?? 24,
      distance: shadow.distance ?? 8,
      angle: shadow.angle ?? 90,
      color: hex(shadow.color, "000000"),
      opacity: (shadow.opacity ?? 12) / 100,
    };
  }
  return undefined;
}
