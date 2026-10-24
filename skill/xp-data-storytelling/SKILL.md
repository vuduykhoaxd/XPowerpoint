---
name: xp-data-storytelling
description: Used for data slides. Pick chart by question, annotation, highlight,
  tell 1 insight instead of displaying data.
---

# Data storytelling

## Chart by question

| Question | Chart |
|---|---|
| Compare categories | horizontal bar (many labels) / column |
| Change over time | line / area |
| Composition | donut (<=5), stacked bar |
| Distribution | histogram, box, scatter |
| Correlation | scatter (+ trendline) |
| Target vs actual | bullet / combo bar+line |
| Contribution to change | waterfall |
| Multiple metrics | small multiples, not dual axis |

## 1 insight per slide

- Title = conclusion, not data name.
- Annotate the anomaly, <= 3 callouts.
- Highlight 1 series/1 column; rest neutral.
- Drop vertical gridlines, keep faint horizontal.
- No dual axis unless truly needed; prefer 2 small charts.

## Data

- Units on axis or subtitle.
- Source + timestamp at footer.
- Consistent rounding (1 decimal).
- Don't truncate Y to mislead (bar must start at 0).
- Golden ratio: chart 55–70% of slide.

## Annotation

```
text: "B2B channel drove 62% of growth"
anchor: data point
style: leader line + label, 1 accent color
```

## Tool

`data_load` -> `chart_add` -> `chart_style` -> `chart_annotation` -> `validate_contrast`.

## Anti-pattern

- Pie 8 slices.
- 3D chart.
- Legend 10 items.
- Axis missing unit label.
- Chart without title/insight.

## Read next

`xp-charts` -> `xp-tables` -> `xp-copywriting`