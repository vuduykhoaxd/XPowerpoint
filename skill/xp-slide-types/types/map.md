---
name: slide-map
description: "Map — bản đồ — Đặt dữ liệu lên không gian địa lý."
---

# Map — bản đồ

## Purpose
Đặt dữ liệu lên không gian địa lý.

## When
Có dữ liệu theo vùng/quốc gia.

## When not
Không cần địa lý -> matrix.

## Anatomy
Bản đồ (vector), choropleth/bubble, legend, callout.

## Grid & geometry
Map 8–9 cột; legend dưới; callout <=3.

## Params
`{map:"world|vn|region", metric:"value", legend:true}`

## Limits
- map vector
- 1 metric
- legend + source
- không vẽ lại biên giới sai

## Motion
fade map, bubble pop stagger.

## Anti-pattern
Map raster mờ; 3 metric; thiếu legend.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
