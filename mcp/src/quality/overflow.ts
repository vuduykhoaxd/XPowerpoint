import type { DeckSpec, SlideSpec } from "../types.js";
import { measureText } from "../engine/compose/text-metrics.js";

export interface Violation {
  code: string; slideId: string; objectId?: string; otherId?: string; severity: "blocker" | "major" | "minor";
  message: string; metrics?: any;
}

export function checkOverflow(deck: DeckSpec, slide: SlideSpec): Violation[] {
  const out: Violation[] = [];
  for (const obj of slide.objects) {
    if (obj.type !== "text" || !obj.text) continue;
    const value = obj.text.value ?? (obj.text.paragraphs ?? []).map((p: any) => (p.runs ?? [{ text: p.text }]).map((r: any) => r.text).join("")).join("\n");
    if (!value) continue;
    const m = measureText(value, obj.geometry.w, obj.geometry.h, obj.text);
    if (m.overflow) {
      out.push({
        code: "E_OVERFLOW", slideId: slide.id, objectId: obj.id, severity: "blocker",
        message: `Text overflow: ${m.lines} lines need ${m.height.toFixed(2)}in, box ${obj.geometry.h.toFixed(2)}in`,
        metrics: { lines: m.lines, needed: m.height, box: obj.geometry.h, longestLine: m.longestLine },
      });
    }
    if (obj.geometry.w < 0.3 || obj.geometry.h < 0.2) {
      out.push({ code: "E_GEOMETRY", slideId: slide.id, objectId: obj.id, severity: "major", message: "Text box too small" });
    }
  }
  return out;
}

export function checkAllOverflow(deck: DeckSpec): Violation[] {
  return deck.slides.flatMap((s) => checkOverflow(deck, s));
}
