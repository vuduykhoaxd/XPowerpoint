---
name: slide-chart-focus
description: "Chart focus — 1 chart + 1 insight rõ."
---

# Chart focus

## Purpose
1 chart + 1 insight rõ.

## When
Có dữ liệu định lượng.

## When not
Không có data thật.

## Anatomy
Title = insight, chart lớn, annotation, source.

## Grid & geometry
Chart 8–9 cột; annotation phải; <=3 callout.

## Params
`{chart:"bar|line|area|combo", insight:"...", annotations:<=3}`

## Limits
- title nêu insight
- có đơn vị + source
- highlight 1 series

## Motion
reveal theo series; annotation last.

## Anti-pattern
Chart không title; 5 callout; trục không đơn vị.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
