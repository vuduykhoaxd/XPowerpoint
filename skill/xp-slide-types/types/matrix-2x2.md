---
name: slide-matrix-2x2
description: "Matrix 2x2 — phân loại — Đặt các mục theo 2 trục để thấy khoảng trống."
---

# Matrix 2x2 — phân loại

## Purpose
Đặt các mục theo 2 trục để thấy khoảng trống.

## When
Có 2 trục phân biệt rõ nghĩa.

## When not
Trục không đo được hoặc 7+ mục rối.

## Anatomy
2 trục có nhãn, 4 góc có tên vùng, item bubble.

## Grid & geometry
Vùng 7x5.5in; nhãn trục ngoài; item <=8.

## Params
`{xLabel, yLabel, items:4-8, quadrantLabels:true}`

## Limits
- <=8 item
- bubble không chồng
- trục có đơn vị/nghĩa

## Motion
fade trục trước, item stagger 60ms.

## Anti-pattern
Item 12+; trục không rõ; bubble to đè nhãn.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
