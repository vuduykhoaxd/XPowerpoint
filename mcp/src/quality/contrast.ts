import type { DeckSpec, SlideSpec } from "../types.js";
import { contrast } from "../utils/colors.js";
import type { Violation } from "./overflow.js";

export function backgroundOf(deck: DeckSpec, slide: SlideSpec): string {
  const bg = slide.background;
  if (bg?.type === "solid" && bg.color) return bg.color;
  if (bg?.stops?.[0]?.[0]) return String(bg.stops[0][0]);
  return deck.tokens?.color?.bg ?? "#FFFFFF";
}

export function fillOf(deck: DeckSpec, obj: any): string {
  if (obj.fill?.type === "solid" && obj.fill.color) return obj.fill.color;
  if (obj.fill?.stops?.[0]?.[0]) return String(obj.fill.stops[0][0]);
  return backgroundOf(deck, { objects: [] } as any);
}

export function checkContrast(deck: DeckSpec, slide: SlideSpec): Violation[] {
  const out: Violation[] = [];
  const slideBg = backgroundOf(deck, slide);
  for (const obj of slide.objects) {
    if (obj.type !== "text" || !obj.text?.value) continue;
    if (obj.decorative) continue;
    const size = obj.text.fontSize ?? 18;
    const large = size >= 24 || (size >= 18.66 && obj.text.bold);
    const required = large ? 3 : 4.5;
    const fg = obj.text.color ?? deck.tokens?.color?.text ?? "#111111";
    const bg = obj.fill?.type === "solid" && obj.fill.color ? obj.fill.color : slideBg;
    const ratio = contrast(fg, bg);
    if (ratio < required) {
      out.push({
        code: "E_CONTRAST", slideId: slide.id, objectId: obj.id, severity: ratio < required * 0.75 ? "blocker" : "major",
        message: `Contrast ${ratio.toFixed(2)}:1 < ${required}:1 (${fg} on ${bg})`,
        metrics: { ratio: Number(ratio.toFixed(2)), required, fg, bg, fontSize: size },
      });
    }
  }
  return out;
}

export function checkAllContrast(deck: DeckSpec): Violation[] {
  return deck.slides.flatMap((s) => checkContrast(deck, s));
}
