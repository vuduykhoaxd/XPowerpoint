---
name: xp-charts
description: Used when creating/editing charts. 20+ types, style system, axis, label, legend,
  combo, waterfall. Rule: real chart + data sheet, no image-faking.
---

# Charts

## Supported types

bar, column, stacked, clustered, 100%, line, area, stacked area, pie, donut,
scatter, bubble, radar, histogram, waterfall, funnel, bullet, heatmap-style,
combo (bar+line), small multiples, sparkline.

## Default style

| Property | Value |
|---|---|
| Font | body token, 12–14pt |
| Axis line | 0.75pt, `color.line` |
| Gridline | horizontal, 0.5pt, alpha 40% |
| Data label | only when <=8 points |
| Legend | top or right, <=5 items |
| Gap width | 40–60% |
| Bar radius | 0 (square) or 4px slight |

## Color

- 1 main series = primary; highlight = accent.
- Multiple series: 6-color palette, verify grayscale.
- Sequential: 1 hue 5 steps for heatmap.
- Diverging: 2 hues + neutral for +/-.

## Axis

- Bar: must start at 0.
- Line: can truncate axis but must note.
- <=7 X-axis labels; more -> rotate or abbreviate.
- Units: `tr. VND`, `%`, `k`; write once.

## Combo

- 2 series different units -> 2 axes, but single chart.
- Line for ratio, bar for volume.
- Max 4 series.

## Native requirement

Chart must be real chart + embedded data sheet. Image chart = fail `native_check`.

## Tool

`chart_add(type, data, options)` -> `chart_style` -> `chart_annotation`
-> `chart_update(dataRef)`.

## Anti-pattern

- 3D, shadow, gradient in chart.
- Pie >5 slices.
- Rainbow palette.
- Legend duplicates axis labels.
- 30 data labels.

## Read next

`xp-data-storytelling` -> `xp-tables` -> `xp-quality`