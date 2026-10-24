---
name: xp-backgrounds
description: Used when slide needs background: solid, gradient, mesh, noise, pattern,
  texture, image + overlay. Contrast and performance rules.
---

# Backgrounds

## Catalog

| Type | Use | Note |
|---|---|---|
| Solid | default, corporate | 1 token color |
| Linear gradient | cover, section | 2 stops, same hue, 15–35° |
| Radial/mesh | tech, hero | bright center offset, no blowout |
| Noise/grain | editorial, retro | opacity 3–8% |
| Pattern | section | line/dot, low contrast |
| Texture (paper) | luxury, print | light image, < 300KB |
| Full-bleed image | cover, quote | overlay 35–60% if text over |
| Blurred photo | tech | blur 20–40px + overlay |

## Rules

- Background must not compete with content: desaturate 10–30%.
- Text on image: overlay + verify actual contrast.
- 2-color gradient enough; 3+ colors only with controlled mesh.
- No strong stripe/zigzag under body text.
- Dark bg -> light text; light bg -> dark text. No mixing.

## Performance

- Background image <= 1920×1080 per slide, <= 500KB after compression.
- Do not embed 10 large bg images in 1 deck -> use 3–4 and reuse.
- Repeating texture: use small tile.

## Tool

`slide_background` -> `effect_gradient` -> `effect_texture` -> `asset_process_image`.

## Anti-pattern

- 7-color gradient.
- Busy image + no text overlay.
- White bg + white card without border.
- Noise > 15% causing projector mud.

## Read next

`xp-imagery` -> `xp-effects` -> `xp-color`