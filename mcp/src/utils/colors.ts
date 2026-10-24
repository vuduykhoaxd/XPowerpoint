export interface RGB { r: number; g: number; b: number; a?: number; }

export function parseHex(hex: string): RGB {
  let h = (hex || "#000000").trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) {
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16) / 255 };
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "000000";
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
}

export function toHex({ r, g, b }: RGB): string {
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`.toUpperCase();
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export function rgba(hex: string, alpha = 1): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function mix(a: string, b: string, t = 0.5): string {
  const A = parseHex(a); const B = parseHex(b);
  return toHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
}

export function tint(hex: string, amount = 0.2): string { return mix(hex, "#FFFFFF", amount); }
export function shade(hex: string, amount = 0.2): string { return mix(hex, "#000000", amount); }

export function scalePalette(hex: string, steps = 5): Record<string, string> {
  const levels = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
  const out: Record<string, string> = {};
  levels.forEach((k, i) => {
    const t = i / (levels.length - 1);
    out[k] = t < 0.5 ? mix(hex, "#FFFFFF", (0.5 - t) * 1.4) : mix(hex, "#000000", (t - 0.5) * 1.2);
  });
  return out;
}

export function isLight(hex: string): boolean { return luminance(hex) > 0.5; }

export function bestTextOn(bg: string, light = "#FFFFFF", dark = "#111111"): string {
  return contrast(bg, light) >= contrast(bg, dark) ? light : dark;
}
