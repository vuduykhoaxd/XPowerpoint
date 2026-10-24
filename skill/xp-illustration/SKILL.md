---
name: xp-illustration
description: Used when needing icons/illustrations: icon set, SVG normalize, line-art,
  isometric, recolor, sizing, consistency.
---

# Illustration & icons

## Icon set

- 1 single set for entire deck (stroke width, corner, cap style).
- Stroke 1.5–2px at 24px; scale with size.
- Filled or outline, not mixed.
- <= 2 colors/icon: currentColor + accent.

## Sizing

| Use | Size |
|---|---|
| Inline with body | 16–20px |
| Card | 24–32px |
| Feature | 40–48px |
| Hero | 64–96px |

## SVG

- Normalize viewBox 0 0 24 24 (or 48).
- Remove hard fill -> currentColor for recolor.
- Don't flatten SVG to PNG (loses editability).
- Embed native SVG if engine supports; else PNG @2x.

## Line-art / isometric

- Line-art: 1 stroke, no gradient.
- Isometric: 30° angle, same light direction.
- Illustration must share palette with charts (no neon outside theme).

## Consistency

- Same style within slide and across deck.
- Same optical size, don't put 20px next to 48px on same row.
- Align by optical center, not bounding box.

## Tool

`asset_search(category:"icon")` -> `asset_svg_normalize` -> `asset_recolor`.

## Anti-pattern

- Mixing 3 icon sets.
- Multi-color gradient icons.
- Icons used as bullet instead of text.
- 512px icon scaled to 16px (loss of detail).

## Read next

`xp-imagery` -> `xp-color` -> `xp-composition`