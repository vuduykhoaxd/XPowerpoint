---
name: slide-data-table
description: "Data table — Truyền đạt bảng chi tiết, so sánh nhiều dòng."
---

# Data table

## Purpose
Truyền đạt bảng chi tiết, so sánh nhiều dòng.

## When
Nhiều thuộc tính, cần tra cứu.

## When not
Chỉ 3 số -> KPI/card.

## Anatomy
Header rõ, zebra, số căn phải, highlight hàng/cột.

## Grid & geometry
8–12 cột; font 12–14pt; header sticky (khi in chia trang).

## Params
`{rows, cols, zebra:true, highlight:["row-3"], heatmap:false}`

## Limits
- <=12 cột
- 1 ý highlight
- số tabular
- source dưới

## Motion
fade theo hàng 40ms nếu <=15 hàng.

## Anti-pattern
Bảng 20+ cột; chữ 10pt; 3 màu highlight; không đơn vị.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
