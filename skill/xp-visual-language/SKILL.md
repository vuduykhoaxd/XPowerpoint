---
name: xp-visual-language
description: Used at deck start to pick 1 of 12 style systems (editorial, swiss,
  tech, luxury, brutalist, organic...). Decides font, color, imagery, motion.
---

# Visual language — 12 style system

| # | Style | Font | Color | Imagery | Motion |
|---|---|---|---|---|---|
| 1 | Corporate clean | Inter/Segoe, 600 | navy + white + 1 accent | card, thin line | fade |
| 2 | Editorial | serif display + sans | off-white, black, red | large photo, columns | fade, light wipe |
| 3 | Swiss/International | Helvetica-like, grid | black/white + 1 red | exposed grid, big text | cut, no motion |
| 4 | Tech/Product | geometric sans | dark + 1 neon | glass, gradient mesh | fade + stagger |
| 5 | Luxury | premium serif | black, cream, bronze | full image, large space | slow fade |
| 6 | Brutalist | mono/condensed | black, white, acid yellow | raw blocks, thick borders | cut, light glitch |
| 7 | Organic/Natural | humanist sans | beige, sage, earth | blob, nature photo | float |
| 8 | Data newsroom | sans + mono numbers | white, gray, 1 accent | large chart, annotation | series reveal |
| 9 | Retro print | grotesque + serif | paper, ink, 2 spot | halftone, texture | none |
| 10 | Dark premium | thin sans | blue-black, silver | glow, dark photo | slow fade |
| 11 | Playful education | rounded sans | pastel + bold | illustration icons, blob | light bounce |
| 12 | Minimal mono | 1 sans + 1 mono | white, black, 1 gray | lines, big numbers | fade |

## How to choose

1. Audience (leadership -> 1/5/10; dev -> 4; students -> 11).
2. Language + VN font coverage.
3. Content density (text-heavy -> 2/8/12).
4. Device (projector -> high contrast, large text).
5. Existing brand -> derive nearest style, do not break brand.

## Constraints

- Pick **1 style** for entire deck, no mixing.
- 1 accent color, 2 font families.
- Motion must match style (swiss = no motion).
- Record style in `brief.tone` + `theme`.

## Tool

`theme_apply(style)` -> `tokens_get` -> `font_recommend` -> `theme_variants`.

## Read next

`xp-decks` -> `xp-backgrounds` -> `xp-effects`