import type { TextStyle } from "../../types.js";
import { ptToIn } from "../../utils/units.js";

const WIDTH_FACTOR: Record<string, number> = {
  mono: 0.6, consolas: 0.58, "cascadia mono": 0.58, georgia: 0.52, "times new roman": 0.5,
  arial: 0.53, "arial black": 0.62, helvetica: 0.53, "segoe ui": 0.52, "segoe ui light": 0.5,
  inter: 0.52, "be vietnam pro": 0.54, roboto: 0.52, "noto sans": 0.53,
};

export function widthFactor(fontFamily = "Segoe UI", bold = false): number {
  const key = fontFamily.toLowerCase().trim();
  const base = WIDTH_FACTOR[key] ?? 0.52;
  return bold ? base * 1.045 : base;
}

function charWidth(ch: string, factor: number, fontSizePt: number): number {
  const size = ptToIn(fontSizePt);
  if (ch === " ") return size * factor * 0.55;
  if (/[ilI1.,:;'|!]/.test(ch)) return size * factor * 0.42;
  if (/[MW@%]/.test(ch)) return size * factor * 1.35;
  if (/[A-ZÀ-Ỹ]/.test(ch)) return size * factor * 1.12;
  if (/[0-9]/.test(ch)) return size * factor * 0.98;
  return size * factor;
}

export function textWidthIn(text: string, style: Pick<TextStyle, "fontFamily" | "fontSize" | "bold" | "letterSpacing"> = {}): number {
  const factor = widthFactor(style.fontFamily, style.bold);
  const size = style.fontSize ?? 19;
  const tracking = (style.letterSpacing ?? 0) / 72;
  return [...text].reduce((sum, ch) => sum + charWidth(ch, factor, size) + tracking, 0);
}

export interface TextMeasure {
  lines: number;
  lineHeight: number;
  width: number;
  height: number;
  overflow: boolean;
  longestLine: string;
  detail: string[];
}

export function measureText(text: string, boxWidth: number, boxHeight: number, style: TextStyle = {}): TextMeasure {
  const fontSize = style.fontSize ?? 19;
  const margin = style.margin ?? 0.05;
  const usable = Math.max(0.1, boxWidth - margin * 2);
  const spacing = style.lineSpacing ?? 1.2;
  const lineHeight = ptToIn(fontSize) * spacing;
  const paragraphs = (text || "").split(/\r?\n/);
  const detail: string[] = [];
  let longest = "";
  let lines = 0;
  for (const p of paragraphs) {
    if (!p.trim()) { lines++; detail.push(""); continue; }
    const words = p.trim().split(/\s+/);
    let current = "";
    const push = () => { if (current) { detail.push(current); if (textWidthIn(current, style) > textWidthIn(longest, style)) longest = current; } };
    for (const word of words) {
      const candidate = current ? current + " " + word : word;
      if (textWidthIn(candidate, { ...style, fontSize }) <= usable) {
        current = candidate;
      } else {
        if (current) { push(); lines++; }
        if (textWidthIn(word, { ...style, fontSize }) > usable) {
          let chunk = "";
          for (const ch of word) {
            if (textWidthIn(chunk + ch, { ...style, fontSize }) > usable && chunk) { push(); lines++; chunk = ch; }
            else chunk += ch;
          }
          current = chunk;
        } else current = word;
      }
    }
    push();
    lines++;
  }
  const height = lines * lineHeight + margin * 2;
  return {
    lines,
    lineHeight,
    width: textWidthIn(longest, style),
    height,
    overflow: height > boxHeight + 0.02 || detail.some((l) => textWidthIn(l, style) > usable + 0.02),
    longestLine: longest,
    detail,
  };
}

export function fitFontSize(text: string, boxWidth: number, boxHeight: number, style: TextStyle = {}, min = 10, max = 96): number {
  let size = style.fontSize ?? max;
  while (size > min) {
    const m = measureText(text, boxWidth, boxHeight, { ...style, fontSize: size });
    if (!m.overflow) return size;
    size -= 1;
  }
  return min;
}

export function estimateLineCount(text: string, charsPerLine: number): number {
  return Math.max(1, Math.ceil((text || "").length / Math.max(1, charsPerLine)));
}

export function charsPerLine(boxWidthIn: number, fontSizePt: number, factor = 0.52): number {
  const usable = Math.max(0.1, boxWidthIn - 0.1);
  return Math.max(1, Math.floor(usable / (ptToIn(fontSizePt) * factor)));
}
