import { sessions } from "../session.js";
import { z } from "zod";
import type { ToolDef } from "../types.js";
import { XPError } from "../errors.js";
import { S, sessionOf, slideOf, objectOf, okData } from "./helpers.js";

const PRESETS: Record<string, any> = {
  "soft-card": { shadow: { type: "outer", blur: 24, distance: 8, angle: 90, color: "#000000", opacity: 12 }, radius: 8 },
  "floating": { shadow: { type: "outer", blur: 40, distance: 18, angle: 90, color: "#000000", opacity: 18 }, radius: 12 },
  "hard-offset": { shadow: { type: "outer", blur: 0, distance: 6, angle: 45, color: "#000000", opacity: 100 }, radius: 0 },
  "glass": { fill: { type: "solid", color: "#FFFFFF", alpha: 12 }, line: { color: "#FFFFFF", width: 0.75, alpha: 35 }, blur: 8 },
  "neon": { glow: { color: "#22D3EE", blur: 18, opacity: 80 }, line: { color: "#22D3EE", width: 1.25 } },
  "premium-gold": { gradient: { type: "linear", angle: 45, stops: [{ color: "#C9A227", pos: 0 }, { color: "#F3E3A3", pos: 0.5 }, { color: "#8C7A5B", pos: 1 }] } },
  "editorial-rule": { line: { color: "#141414", width: 2 }, shadow: null },
  "raised-3d": { bevel: { preset: "circle", width: 6, height: 6 }, shadow: { type: "outer", blur: 30, distance: 14, angle: 90, color: "#000000", opacity: 22 } },
  "duotone-brand": { duotone: { dark: "#0B1F3A", light: "#F59E0B" } },
  "vignette": { vignette: { color: "#000000", opacity: 35, size: 60 } },
};

function applyEffect(name: string, key: string, merge = true) {
  return {
    name,
    description: `Apply ${key} to an object.`,
    inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), value: z.object({}).passthrough().optional() }),
    handler: (args: any) => {
      const s = sessionOf({ sessions }, args);
      const slide = slideOf(s, args);
      const obj = objectOf(slide, args.objectId);
      sessions.mutate(s, () => {
        if (key === "gradient") obj.fill = { type: "gradient", ...(args.value ?? {}) };
        else if (key === "texture") obj.fill = { type: "image", ...(args.value ?? {}) };
        else if (key === "mask") obj.mask = args.value ?? { shape: "rounded-rect" };
        else if (key === "duotone") obj.image = { ...(obj.image ?? {}), duotone: args.value ?? { dark: "#000000", light: "#FFFFFF" } } as any;
        else obj.effects = { ...(obj.effects ?? {}), [key]: merge ? { ...((obj.effects as any)?.[key] ?? {}), ...(args.value ?? {}) } : args.value };
      });
      return okData({ objectId: obj.id, effect: key, value: (obj.effects as any)?.[key] ?? (key === "gradient" || key === "texture" ? obj.fill : undefined) });
    },
  } as ToolDef;
}

const effectsPresetApply = (): ToolDef => ({
  name: "effect_preset_apply",
  description: "Apply a named effect preset to an object.",
  inputSchema: S({ slideId: z.union([z.string(), z.number()]).optional(), objectId: z.string(), preset: z.string() }),
  handler: (args) => {
    const s = sessionOf({ sessions }, args);
    const preset = PRESETS[args.preset];
    if (!preset) throw new XPError("E_INVALID_INPUT", `Unknown preset: ${args.preset}`, { available: Object.keys(PRESETS) });
    const slide = slideOf(s, args);
    const obj = objectOf(slide, args.objectId);
    sessions.mutate(s, () => {
      if (preset.shadow !== undefined) obj.effects = { ...(obj.effects ?? {}), shadow: preset.shadow };
      if (preset.glow) obj.effects = { ...(obj.effects ?? {}), glow: preset.glow };
      if (preset.blur) obj.effects = { ...(obj.effects ?? {}), blur: preset.blur };
      if (preset.bevel) obj.effects = { ...(obj.effects ?? {}), bevel: preset.bevel };
      if (preset.gradient) obj.fill = { type: "gradient", ...preset.gradient };
      if (preset.fill) obj.fill = preset.fill;
      if (preset.line) obj.line = preset.line;
      if (preset.duotone) obj.image = { ...(obj.image ?? {}), duotone: preset.duotone } as any;
      if (preset.radius != null) obj.style = { ...(obj.style ?? {}), radius: preset.radius };
    });
    return okData({ objectId: obj.id, preset: args.preset });
  },
});

const effectsPresetList = (): ToolDef => ({
  name: "effect_preset_list",
  description: "List built-in effect presets.",
  inputSchema: S({}),
  handler: () => okData({ presets: Object.keys(PRESETS), definitions: PRESETS }),
});

export const effectTools: ToolDef[] = [
  applyEffect("effect_shadow", "shadow"),
  applyEffect("effect_glow", "glow"),
  applyEffect("effect_blur", "blur"),
  applyEffect("effect_reflection", "reflection"),
  applyEffect("effect_bevel", "bevel"),
  applyEffect("effect_rotate3d", "rotate3d"),
  applyEffect("effect_gradient", "gradient", false),
  applyEffect("effect_texture", "texture", false),
  applyEffect("effect_mask", "mask", false),
  applyEffect("effect_duotone", "duotone", false),
  effectsPresetApply(), effectsPresetList(),
];
