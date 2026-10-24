export type Unit = "in" | "cm" | "pt";

export const EMU_PER_INCH = 914400;

export function toInches(value: number, unit: Unit = "in"): number {
  switch (unit) {
    case "cm": return value / 2.54;
    case "pt": return value / 72;
    default: return value;
  }
}

export function fromInches(value: number, unit: Unit = "in"): number {
  switch (unit) {
    case "cm": return value * 2.54;
    case "pt": return value * 72;
    default: return value;
  }
}

export function ptToIn(pt: number): number { return pt / 72; }
export function inToPt(inch: number): number { return inch * 72; }
export function inToEmu(inch: number): number { return Math.round(inch * EMU_PER_INCH); }
export function round(v: number, d = 3): number { return Math.round(v * 10 ** d) / 10 ** d; }

export function parseLength(input: string | number): number {
  if (typeof input === "number") return input;
  const m = /^(-?[\d.]+)\s*(in|cm|pt|%)?$/i.exec(input.trim());
  if (!m) return 0;
  const n = Number(m[1]);
  const u = (m[2] || "in").toLowerCase();
  if (u === "%") return n / 100;
  return toInches(n, u as Unit);
}
