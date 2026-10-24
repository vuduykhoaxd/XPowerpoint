---
name: xp-tables
description: Used when there are tables. Zebra, header, number align, heatmap, sparkline cell,
  merge, border, multi-page large tables.
---

# Tables

## Structure

- Header: 1 row, weight 600, surface bg, text 12–13pt.
- Body: 12–14pt, row height 0.35–0.45in.
- Border: horizontal hairline only (0.5pt), no grid.
- Zebra: alpha 4–6%, not dark gray.
- Numbers: right align + tabular; text: left; status: center.

## Real tables

Table must be native table, not drawn with shapes. Merge cells for grouped header.
No table images.

## Heatmap

- Sequential 1 hue, 5 steps, lightness delta 8–12%/step.
- Cell text must meet 4.5:1 on cell bg.
- Small gradient legend at corner.

## Sparkline cell

- 1 trend line 20–30 points, no axis.
- Height <= 0.25in; color by trend.
- Only for tables <=10 rows.

## Large tables

| Rows | Handling |
|---|---|
| <=15 | 1 slide, fade by row |
| 16–30 | reduce font to 12pt, increase slide height or split 2 |
| >30 | split multiple slides / appendix, repeat header |
| >12 cols | drop low-importance cols, or convert to chart |

## Responsive

- Data columns narrower than text columns.
- First column (labels) 1.5–2× wider.
- No 3-line wrap in cell.

## Tool

`table_add` -> `table_style` -> `table_conditional` (heatmap/sparkline).

## Anti-pattern

- 20 columns on 16:9.
- Borders on every cell.
- Numbers left-aligned.
- Header 10pt.
- 3 highlight colors without annotation.

## Read next

`xp-data-storytelling` -> `xp-charts` -> `xp-quality`