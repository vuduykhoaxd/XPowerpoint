import type { Brief, DeckSpec } from "./types.js";

export const STYLE_PRESETS: Record<string, any> = {
  "corporate-clean": {
    color: { bg: "#FFFFFF", surface: "#F4F6FA", text: "#0B1F3A", muted: "#5B6B80", primary: "#1B4FA0", secondary: "#3B82F6", accent: "#F59E0B", line: "#D7DEE8", ok: "#1E8E5A", warn: "#C77700", bad: "#C0392B" },
    font: { display: "Segoe UI", heading: "Segoe UI", body: "Segoe UI", mono: "Consolas", fallback: "Arial, sans-serif" },
  },
  editorial: {
    color: { bg: "#FAF7F0", surface: "#FFFFFF", text: "#141414", muted: "#6B6459", primary: "#141414", secondary: "#B23A2E", accent: "#B23A2E", line: "#DED6C8", ok: "#2F6B4F", warn: "#B26A00", bad: "#A12D20" },
    font: { display: "Georgia", heading: "Georgia", body: "Segoe UI", mono: "Consolas", fallback: "Times New Roman, serif" },
  },
  swiss: {
    color: { bg: "#FFFFFF", surface: "#F2F2F2", text: "#000000", muted: "#555555", primary: "#000000", secondary: "#D8232A", accent: "#D8232A", line: "#CFCFCF", ok: "#1E8E5A", warn: "#C77700", bad: "#C0392B" },
    font: { display: "Arial", heading: "Arial", body: "Arial", mono: "Consolas", fallback: "Helvetica, Arial, sans-serif" },
  },
  tech: {
    color: { bg: "#0B1220", surface: "#131C2E", text: "#E5E7EB", muted: "#94A3B8", primary: "#2563EB", secondary: "#22D3EE", accent: "#22D3EE", line: "#243146", ok: "#22C55E", warn: "#F59E0B", bad: "#EF4444" },
    font: { display: "Segoe UI", heading: "Segoe UI", body: "Segoe UI", mono: "Cascadia Mono", fallback: "Arial, sans-serif" },
  },
  luxury: {
    color: { bg: "#0E0E10", surface: "#17171A", text: "#F3EEE4", muted: "#B9AF9C", primary: "#C9A227", secondary: "#8C7A5B", accent: "#C9A227", line: "#2A2823", ok: "#2F6B4F", warn: "#C77700", bad: "#A12D20" },
    font: { display: "Georgia", heading: "Georgia", body: "Segoe UI", mono: "Consolas", fallback: "Times New Roman, serif" },
  },
  brutalist: {
    color: { bg: "#F5F500", surface: "#FFFFFF", text: "#000000", muted: "#333333", primary: "#000000", secondary: "#FF3B30", accent: "#FF3B30", line: "#000000", ok: "#008000", warn: "#B26A00", bad: "#C0392B" },
    font: { display: "Arial Black", heading: "Arial", body: "Consolas", mono: "Consolas", fallback: "Arial, sans-serif" },
  },
  organic: {
    color: { bg: "#F7F3E9", surface: "#FFFFFF", text: "#20301F", muted: "#63705C", primary: "#3F6B4F", secondary: "#A8BFA0", accent: "#C97B3C", line: "#D9DFD2", ok: "#3F6B4F", warn: "#C77700", bad: "#A12D20" },
    font: { display: "Segoe UI", heading: "Segoe UI", body: "Segoe UI", mono: "Consolas", fallback: "Arial, sans-serif" },
  },
  "data-newsroom": {
    color: { bg: "#FFFFFF", surface: "#F5F5F5", text: "#111111", muted: "#666666", primary: "#0B5FFF", secondary: "#FF6B35", accent: "#FF6B35", line: "#DDDDDD", ok: "#1E8E5A", warn: "#C77700", bad: "#C0392B" },
    font: { display: "Segoe UI", heading: "Segoe UI", body: "Segoe UI", mono: "Consolas", fallback: "Arial, sans-serif" },
  },
  retro: {
    color: { bg: "#F2E8D5", surface: "#FBF5E8", text: "#2B2118", muted: "#7A6A57", primary: "#B23A2E", secondary: "#2B5C7A", accent: "#D98E04", line: "#CDBFA6", ok: "#2F6B4F", warn: "#B26A00", bad: "#A12D20" },
    font: { display: "Georgia", heading: "Georgia", body: "Segoe UI", mono: "Consolas", fallback: "Times New Roman, serif" },
  },
  "dark-premium": {
    color: { bg: "#0A0F18", surface: "#121A26", text: "#F1F5F9", muted: "#94A3B8", primary: "#C0C7D1", secondary: "#7C8BA1", accent: "#E0B45C", line: "#1F2A3A", ok: "#22C55E", warn: "#F59E0B", bad: "#EF4444" },
    font: { display: "Segoe UI Light", heading: "Segoe UI", body: "Segoe UI", mono: "Consolas", fallback: "Arial, sans-serif" },
  },
  playful: {
    color: { bg: "#FFF9F0", surface: "#FFFFFF", text: "#2B2B2B", muted: "#6B6B6B", primary: "#7C3AED", secondary: "#F472B6", accent: "#F59E0B", line: "#EDE3D6", ok: "#16A34A", warn: "#D97706", bad: "#DC2626" },
    font: { display: "Segoe UI", heading: "Segoe UI", body: "Segoe UI", mono: "Consolas", fallback: "Arial, sans-serif" },
  },
  "minimal-mono": {
    color: { bg: "#FFFFFF", surface: "#F7F7F7", text: "#111111", muted: "#777777", primary: "#111111", secondary: "#999999", accent: "#111111", line: "#E5E5E5", ok: "#1E8E5A", warn: "#C77700", bad: "#C0392B" },
    font: { display: "Consolas", heading: "Segoe UI", body: "Segoe UI", mono: "Consolas", fallback: "Arial, sans-serif" },
  },
};

const SCALE = { display: 60, h1: 38, h2: 26, body: 19, label: 13, caption: 11 };
const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const RADIUS = { sm: 4, md: 8, lg: 16, pill: 999 };

export function styleTokens(style = "corporate-clean") {
  const base = STYLE_PRESETS[style] ?? STYLE_PRESETS["corporate-clean"];
  return {
    style,
    color: { ...base.color },
    font: { ...base.font },
    scale: { ...SCALE },
    space: { ...SPACE },
    radius: { ...RADIUS },
    shadow: {
      "soft-md": { type: "outer", blur: 24, distance: 8, angle: 90, color: "#000000", opacity: 12 },
      "soft-lg": { type: "outer", blur: 40, distance: 16, angle: 90, color: "#000000", opacity: 14 },
    },
    grid: { cols: 12, rows: 8, margin: 0.5, gutter: 0.2 },
  };
}

export function defaultSpec(title: string, brief?: Brief, style = "corporate-clean"): DeckSpec {
  const now = new Date().toISOString();
  return {
    version: "1.0",
    meta: {
      title,
      author: "",
      language: brief?.language ?? "vi",
      size: { w: 13.333, h: 7.5, unit: "in" },
      theme: style,
      style,
    },
    brief: brief ?? { goal: title, slideCount: 0, language: "vi", output: ["pptx"], approved: false },
    tokens: styleTokens(style),
    slides: [],
    assets: [],
    sections: [],
    createdAt: now,
    updatedAt: now,
  };
}
