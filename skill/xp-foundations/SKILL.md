---
name: xp-foundations
description: Used for every slide. 12-column grid, safe margin, 45–75% occupancy,
  8pt spacing rhythm, baseline. Foundational geometry rules.
---

# Foundations — grid, margin, occupancy

## Canvas

- 16:9: 13.333 × 7.5 in (33.87 × 19.05 cm).
- 4:3: 10 × 7.5 in.
- Origin top-left, unit inch.

## Safe area

| Region | 16:9 |
|---|---|
| Min margin | 0.4 in |
| Recommended margin | 0.5 in |
| Content | x 0.5–12.83, y 0.4–7.1 |
| Footer/ui | y 7.0–7.35 |

## 12-column grid

```
colW = (13.333 - 2*margin - 11*gutter) / 12
```

With margin 0.5, gutter 0.2: `colW ≈ 0.806 in`, column step `≈ 1.006 in`.

- Title: 8–12 columns.
- 3 cards: each card 4 columns (span 4, gutter 0.2).
- 4 KPIs: each KPI 3 columns.
- 2-column content: 6/6 or 5/7.

## Spacing rhythm

- Base unit 8pt; allow 4pt for details.
- Block spacing: 24/32/48pt.
- Card padding: 16–24pt.
- Gap between objects >= 0.05 in for clickability.

## Occupancy

| Slide type | Occupancy |
|---|---|
| Cover | 25–50% |
| Statement/quote | 20–45% |
| Standard content | 45–75% |
| Dashboard | 60–80% |
| Full-bleed | 80–100% (background image) |

Occupancy = bounding area of content/data / safe area.
Out of range -> too empty or too dense.

## Alignment

- Prefer grid-column alignment, not eyeball.
- Common baseline for text in same row.
- Large numbers: align by numeric baseline, not box.

## Check

`layout_measure` -> `layout_grid` -> `layout_safe_area` -> `validate_layout`.

## Anti-pattern

- Margin < 0.4 in.
- 5 equal cards on 12 columns (doesn't divide evenly) -> use 4 or 6.
- Arbitrary spacing 13/17/23pt.
- Content touching bottom edge.

## Read next

`xp-composition` -> `xp-typography` -> `xp-color`