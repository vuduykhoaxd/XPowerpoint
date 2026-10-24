---
name: slide-kpi-dashboard
description: "KPI dashboard — 4–8 chỉ số — Tổng quan nhanh nhiều chỉ số."
---

# KPI dashboard — 4–8 chỉ số

## Purpose
Tổng quan nhanh nhiều chỉ số.

## When
Review quý, vận hành, điều hành.

## When not
Cần kể chuyện sâu 1 chỉ số.

## Anatomy
4–8 card: label, value, delta, sparkline; có thể 1 chart phụ.

## Grid & geometry
4 KPI: 3 cột/card; 6: 4 cột; 8: 3 cột x 2 hàng + 1 chart 6 cột.

## Params
`{kpis:4-8, showDelta:true, sparkline:true}`

## Limits
- card cùng kích thước
- delta có mũi tên + màu semantic
- source chung

## Motion
stagger fade card 60–80ms; số count-up.

## Anti-pattern
8+ card nhỏ; delta không rõ tốt/xấu; màu tuỳ tiện.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
