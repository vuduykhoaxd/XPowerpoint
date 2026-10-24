import type { DeckSpec } from "../types.js";
import type { Violation } from "./overflow.js";

export function checkAccessibility(deck: DeckSpec): { violations: Violation[]; coverage: number; total: number; missing: number } {
  const out: Violation[] = [];
  let total = 0;
  let missing = 0;
  for (const slide of deck.slides) {
    for (const obj of slide.objects) {
      if (obj.decorative || obj.band === "bg" || obj.band === "deco") continue;
      total++;
      if (!obj.altText || !String(obj.altText).trim()) {
        missing++;
        out.push({
          code: "E_SPEC", slideId: slide.id, objectId: obj.id, severity: obj.type === "image" ? "blocker" : "major",
          message: "Missing alt text for non-decorative object",
        });
      }
    }
    const decoratedText = slide.objects.filter((o) => o.type === "text" && o.decorative);
    for (const obj of decoratedText) {
      out.push({ code: "E_SPEC", slideId: slide.id, objectId: obj.id, severity: "minor", message: "Text marked decorative is hidden from screen readers" });
    }
  }
  const coverage = total === 0 ? 1 : (total - missing) / total;
  return { violations: out, coverage, total, missing };
}

export function checkNaming(deck: DeckSpec): Violation[] {
  const out: Violation[] = [];
  for (const slide of deck.slides) {
    const seen = new Set<string>();
    for (const obj of slide.objects) {
      if (seen.has(obj.id)) out.push({ code: "E_SPEC", slideId: slide.id, objectId: obj.id, severity: "major", message: "Duplicate object id on slide" });
      seen.add(obj.id);
    }
  }
  return out;
}
