---
name: xp-typography
description: Used for every slide with text. Type scale, pairing, leading, measure,
  Vietnamese rules (diacritic stacking), tabular figures, overflow prevention.
---

# Typography

## Scale (1.25–1.333)

| Role | Size (16:9) | Weight | Note |
|---|---|---|---|
| Display (cover) | 54–72 | 700–800 | <= 12 words |
| H1 slide title | 32–40 | 700 | 1 line, <= 70 chars |
| H2 | 24–28 | 600 | |
| Body | 18–22 | 400 | projector >= 18 |
| Label | 12–14 | 600 | uppercase, tracking +2% |
| Caption/source | 10–12 | 400 | opacity 60–70% |
| KPI value | 40–64 | 700 | tabular |

Title/body >= 1.8×. Max 4 weights, 2 font families (+1 mono for data).

## Leading & measure

- Body: line-height 1.35–1.5.
- Title: 1.0–1.15.
- Max 55–75 chars/line (body), 40–55 (narrow caption column).
- Paragraph spacing = 0.5–0.8 line.
- No justify body; use left align.

## Vietnamese (mandatory)

- Font must have Latin Extended Additional (U+1EA0–U+1EF9).
- Test: `ẮẮ ỘỘ ữ ỹ ệ ợ ẩ ỗ ự`.
- Missing diacritics -> reject font, no blind fallback.
- Avoid ALL CAPS for long sentences (diacritics clash).
- Do not use condensed fonts for body.
- Use `text_vn_typography` to check.

## Numbers

- Mandatory tabular figures for tables/KPI.
- Same decimal places within a column.
- Unit <= 0.6× value, same baseline.
- Separator per locale: `1.234,5` (vi) vs `1,234.5` (en).

## Overflow prevention

1. `text_metrics` to measure actual.
2. `text_autofit` (shrink 10–15% max).
3. `layout_reflow`.
4. `layout_break_plan` split slide.
5. Never reduce body < 14pt (projector < 18pt).

## Anti-pattern

- 3+ font families.
- Body < 14pt.
- Title 2 long lines on content slide.
- Light/Thin on projector.
- Yellow on white, light gray on white.

## Read next

`xp-font-direction` -> `xp-color` -> `xp-quality`