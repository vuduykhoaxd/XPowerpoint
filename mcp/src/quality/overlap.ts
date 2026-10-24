import type { DeckSpec, SlideSpec } from "../types.js";
import { overlapRatio, intersect } from "../utils/geometry.js";
import type { Violation } from "./overflow.js";

const BAND_SKIP = new Set(["bg", "deco"]);

export function checkOverlap(deck: DeckSpec, slide: SlideSpec): Violation[] {
  const out: Violation[] = [];
  const list = slide.objects.filter((o) => !BAND_SKIP.has(o.band ?? "") && o.type !== "group");
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (a.intentionalOverlap || b.intentionalOverlap) continue;
      if (a.locked || b.locked) continue;
      if (a.type === "chart" || b.type === "chart" || a.type === "table" || b.type === "table") {
        const r = overlapRatio(a.geometry, b.geometry);
        if (r > 0.02) out.push(violation(slide, a.id, b.id, r, "Data element overlapped"));
        continue;
      }
      const r = overlapRatio(a.geometry, b.geometry);
      if (r > 0.12) {
        const bothText = a.type === "text" && b.type === "text";
        out.push(violation(slide, a.id, b.id, r, bothText ? "Text overlaps text" : "Objects overlap", bothText ? "blocker" : "major"));
      }
    }
  }
  return out;
}

function violation(slide: SlideSpec, a: string, b: string, ratio: number, message: string, severity: "blocker" | "major" | "minor" = "major"): Violation {
  return {
    code: "E_OVERLAP", slideId: slide.id, objectId: a, otherId: b, severity, message,
    metrics: { ratio: Number(ratio.toFixed(3)) },
  };
}

export function checkAllOverlap(deck: DeckSpec): Violation[] {
  return deck.slides.flatMap((s) => checkOverlap(deck, s));
}
