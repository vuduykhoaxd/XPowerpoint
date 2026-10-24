import { sessions } from "../session.js";
import { z } from "zod";
import { existsSync } from "node:fs";
import type { ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, okData } from "./helpers.js";
import { STYLE_PRESETS, styleTokens } from "../tokens.js";
import { runPython } from "../engine/com/bridge.js";
import { contrast, mix, scalePalette, isLight, bestTextOn } from "../utils/colors.js";

function deepMerge(a: any, b: any): any {
  if (!b || typeof b !== "object") return b ?? a;
  const out = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === "object" && !Array.isArray(v) ? deepMerge(a?.[k], v) : v;
  return out;
}

const themeApply = (): ToolDef => ({
  name: "theme_apply",
  description: "Apply one of 12 style presets to the deck tokens.",
  inputSchema: S({ style: z.string(), keepColors: z.boolean().optional(), keepFonts: z.boolean().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    if (!STYLE_PRESETS[args.style]) throw new XPError("E_INVALID_INPUT", `Unknown style: ${args.style}`, { available: Object.keys(STYLE_PRESETS) });
    const next = styleTokens(args.style);
    if (args.keepColors && s.spec.tokens) next.color = s.spec.tokens.color;
    if (args.keepFonts && s.spec.tokens) next.font = s.spec.tokens.font;
    sessions.mutate(s, () => { s.spec.tokens = next as any; s.spec.meta.style = args.style; s.spec.meta.theme = args.style; });
    return okData({ style: args.style, tokens: next });
  },
});

const themeTokensGet = (): ToolDef => ({
  name: "tokens_get",
  description: "Read design tokens (colors, fonts, scale, spacing, radius, shadows, grid).",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    return okData(s.spec.tokens ?? styleTokens());
  },
});

const themeTokensSet = (): ToolDef => ({
  name: "tokens_set",
  description: "Deep-merge token overrides into the deck.",
  inputSchema: S({ tokens: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    sessions.mutate(s, () => { s.spec.tokens = deepMerge(s.spec.tokens ?? styleTokens(), args.tokens); });
    return okData(s.spec.tokens);
  },
});

const themeExtract = (): ToolDef => ({
  name: "theme_extract",
  description: "Extract a token palette and fonts from the deck's current objects.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const colors = new Map<string, number>();
    const fonts = new Map<string, number>();
    const add = (c?: string | null) => { if (c && /^#[0-9a-f]{6}$/i.test(c)) colors.set(c.toUpperCase(), (colors.get(c.toUpperCase()) ?? 0) + 1); };
    for (const sl of s.spec.slides) for (const o of sl.objects) {
      add(o.fill?.color); add(o.fill?.stops?.[0]?.[0]); add(o.line?.color); add(o.text?.color);
      if (o.text?.fontFamily) fonts.set(o.text.fontFamily, (fonts.get(o.text.fontFamily) ?? 0) + 1);
    }
    const sorted = [...colors.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const bg = sorted.find((c) => isLight(c)) ?? "#FFFFFF";
    const text = sorted.find((c) => contrast(c, bg) >= 4.5) ?? "#111111";
    const accent = sorted.find((c) => c !== bg && c !== text) ?? "#1B4FA0";
    const tokens = deepMerge(s.spec.tokens ?? styleTokens(), {
      color: { bg, text, primary: accent, accent, muted: mix(text, bg, 0.45), line: mix(text, bg, 0.8), surface: mix(bg, text, 0.04) },
      font: { heading: [...fonts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Segoe UI", body: [...fonts.entries()].sort((a, b) => b[1] - a[1])[1]?.[0] ?? "Segoe UI" },
    });
    return okData({ tokens, sampled: { colors: sorted.slice(0, 8), fonts: [...fonts.keys()] } });
  },
});

const themeFromImage = (): ToolDef => ({
  name: "theme_from_image",
  description: "Extract a palette from an image (Pillow).",
  inputSchema: S({ path: z.string(), count: z.number().optional() }),
  handler: async (args) => {
    const s = sessionOf({ sessions }, args);
    if (!existsSync(args.path)) throw new XPError("E_NOT_FOUND", `Image not found: ${args.path}`);
    const r = await runPython("image_tools.py", { action: "palette", path: args.path, count: args.count ?? 6 });
    if (!r.ok) throw new XPError("E_ENGINE", r.message ?? "Palette extraction failed", r);
    const palette: string[] = r.palette ?? [];
    if (!palette.length) throw new XPError("E_ENGINE", "No palette returned");
    const bg = palette.find((c) => isLight(c)) ?? "#FFFFFF";
    const text = bestTextOn(bg);
    const accent = palette.find((c) => contrast(c, bg) >= 3 && c !== bg) ?? palette[0];
    const tokens = deepMerge(s.spec.tokens ?? styleTokens(), {
      color: { bg, surface: mix(bg, text, 0.05), text, muted: mix(text, bg, 0.45), primary: accent, accent, line: mix(text, bg, 0.8) },
    });
    sessions.mutate(s, () => { s.spec.tokens = tokens; });
    return okData({ palette, tokens });
  },
});

const themeFromBrand = (): ToolDef => ({
  name: "theme_from_brand",
  description: "Build tokens from brand colors, fonts and logo.",
  inputSchema: S({ brand: z.object({}).passthrough() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const b = args.brand ?? {};
    const primary = b.primary ?? b.colors?.primary ?? "#1B4FA0";
    const bg = b.background ?? b.colors?.bg ?? "#FFFFFF";
    const text = b.text ?? b.colors?.text ?? bestTextOn(bg);
    const tokens = deepMerge(s.spec.tokens ?? styleTokens(), {
      color: { primary, accent: b.accent ?? b.colors?.accent ?? primary, secondary: b.secondary ?? mix(primary, bg, 0.4), bg, text, muted: b.muted ?? mix(text, bg, 0.45), line: mix(text, bg, 0.8), surface: mix(bg, text, 0.04) },
      font: { heading: b.fonts?.heading ?? b.headingFont ?? "Segoe UI", body: b.fonts?.body ?? b.bodyFont ?? "Segoe UI" },
    });
    sessions.mutate(s, () => { s.spec.tokens = tokens; s.spec.meta.brand = b; });
    return okData({ tokens, logo: b.logo ?? null });
  },
});

const themeFonts = (): ToolDef => ({
  name: "theme_fonts",
  description: "Read or set heading/body/numeric/mono fonts.",
  inputSchema: S({ font: z.object({}).passthrough().optional() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    if (args.font) sessions.mutate(s, () => { s.spec.tokens = deepMerge(s.spec.tokens ?? styleTokens(), { font: args.font }); });
    return okData({ font: s.spec.tokens?.font ?? styleTokens().font });
  },
});

const themeVariants = (): ToolDef => ({
  name: "theme_variants",
  description: "Generate light, dark and high-contrast token variants.",
  inputSchema: S({}),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const t: any = s.spec.tokens ?? styleTokens();
    const c = t.color;
    const darkBg = "#0B1220";
    const variants = {
      light: { ...t, color: { ...c } },
      dark: { ...t, color: { ...c, bg: darkBg, surface: mix(darkBg, "#FFFFFF", 0.06), text: "#F1F5F9", muted: "#94A3B8", line: mix(darkBg, "#FFFFFF", 0.14) } },
      highContrast: { ...t, color: { ...c, bg: "#FFFFFF", text: "#000000", muted: "#333333", primary: "#0033CC", accent: "#B00020", line: "#000000" } },
    };
    return okData({ variants, palette: scalePalette(c.primary) });
  },
});

export const themeTools: ToolDef[] = [
  themeApply(), themeTokensGet(), themeTokensSet(), themeExtract(), themeFromImage(), themeFromBrand(), themeFonts(), themeVariants(),
];
