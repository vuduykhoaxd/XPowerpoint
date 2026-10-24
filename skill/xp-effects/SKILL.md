---
name: xp-effects
description: Used when needing shadow, glow, blur/glass, reflection, bevel, 3D,
  gradient, texture, duotone, blend. Includes editability cost.
---

# Effects

## Catalog

| Category | Values |
|---|---|
| Fill | solid, gradient (linear/radial/path), picture, pattern, texture |
| Line | solid, gradient, dash 8, cap/join, arrow 12 |
| Shadow | 20 preset + custom (blur, dist, angle, alpha, color) |
| Glow | color, radius, alpha |
| Soft edge | radius |
| Reflection | 10 preset |
| 3D | bevel 12, material, lighting, rotation X/Y/Z, perspective |
| Blur | gaussian, backdrop (glass) |
| Text | outline, gradient fill, shadow, warp, 3D |
| Image | duotone, grayscale, tint, halftone, grain, vignette, mask |
| Composite | glass card, neumorphism, sticker, layered paper |
| Deconstruct | fragment, shatter, slice, peel, scatter, layer-offset |

## Recommended presets

| Preset | Use for |
|---|---|
| `soft-md` | subtle raised card: blur 24, dist 8, alpha 12% |
| `soft-lg` | hero card: blur 40, dist 16, alpha 14% |
| `glow-accent` | 1 highlight: radius 18, alpha 35% |
| `glass` | backdrop blur 20 + white fill 8% + border 20% |
| `long-shadow` | retro: offset 20, alpha 8%, 1 color |

## Editability cost

| Technique | Cost | Policy |
|---|---|---|
| Native shadow/glow | None | default |
| Gradient fill | Low | allowed |
| Backdrop blur/glass | Medium | cards only |
| 3D bevel/rotate | Medium | note version |
| Rasterize effect | High | `deco/*` only |
| Flatten slide | Very high | `_flat` only |

## Principles

- 1 main effect/slide. No shadow + glow + 3D together.
- Shadow same light direction entire deck.
- Glass only when background has texture/image; glass on white is meaningless.
- Effects must not reduce text contrast.

## Tool

`effect_preset_apply` -> `effect_shadow/glow/blur/bevel`.
`effect_preset_list` to view all.

## Anti-pattern

- Black shadow 40% blur 4 (muddy).
- 3-color neon glow.
- 3D rotate body text.
- Glass on white background.

## Read next

`xp-handoff` -> `xp-motion` -> `xp-backgrounds`