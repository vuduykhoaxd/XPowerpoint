---
name: xp-composition
description: Used when slide has >10 objects. Hierarchy, reading order, balance,
  z-bands, grouping, breathing space, focal point.
---

# Composition

## Hierarchy (max 3 levels)

1. **Hero** — 1 focal point/slide (title, KPI, image).
2. **Support** — 2–4 explanatory blocks.
3. **Detail** — caption, source, label.

If 2 things are both "biggest" -> hierarchy broken, reduce one.

## Reading order

- Z-pattern for title + content slides.
- F-pattern for text-heavy slides.
- Vietnamese reads left->right, top->bottom.
- z-order must match logical reading order (a11y).

## Z-bands

```
bg      0–9
deco   10–19
content 20–79
data   80–89
ui     90–99
```

Never put content below deco. Decoration must not cover text.

## Balance

- Optical balance, not mechanical symmetry.
- Heavy blocks (dark image, large number) placed near center or counter-weighted.
- Avoid "dead corner": 3 empty corners, 1 heavy corner.
- Breathing space >= 1 gutter around main block.

## Grouping

- Group by logical cluster (card + label + value).
- <= 20 objects/group, nesting <= 2 levels.
- Group name by band: `content/cards`, `deco/glow`.

## Focal point

- Exactly 1 accent/slide.
- Priority order: size > color > position > effect.
- Highlight data via annotation, not full chart coloring.

## Check

`layout_measure` (occupancy) -> `layout_collision` -> `validate_consistency`.

## Anti-pattern

- 4 equal blocks, same color, no hero.
- Image overflow without focal point.
- Text over complex deco.
- Too many nested frames (box in box).

## Read next

`xp-foundations` -> `xp-visual-language` -> `xp-object-intelligence`