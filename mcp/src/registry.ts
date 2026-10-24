import { ToolDef } from "./types.js";
import { deckTools } from "./tools/deck.js";
import { slideTools } from "./tools/slide.js";
import { objectTools } from "./tools/object.js";
import { textTools } from "./tools/text.js";
import { layoutTools } from "./tools/layout.js";
import { themeTools } from "./tools/theme.js";
import { effectTools } from "./tools/effects.js";
import { motionTools } from "./tools/motion.js";
import { assetTools } from "./tools/assets.js";
import { fontTools } from "./tools/fonts.js";
import { dataTools } from "./tools/data.js";
import { qualityTools } from "./tools/quality.js";
import { exportTools } from "./tools/export.js";
import { deconstructTools } from "./tools/deconstruct.js";
import { handoffTools } from "./tools/handoff.js";
import { oxmlTools } from "./tools/oxml.js";

export const allTools: ToolDef[] = [
  ...deckTools, ...slideTools, ...objectTools, ...textTools, ...layoutTools,
  ...themeTools, ...effectTools, ...motionTools, ...assetTools, ...fontTools,
  ...dataTools, ...qualityTools, ...exportTools, ...deconstructTools,
  ...handoffTools, ...oxmlTools,
];

export function toolNames() { return allTools.map((t) => t.name); }

export function getTool(name: string): ToolDef | undefined {
  return allTools.find((t) => t.name === name);
}

export const toolCount = allTools.length;