---
name: slide-full-bleed-image
description: "Full-bleed image — Ảnh toàn màn làm cảm xúc/nền."
---

# Full-bleed image

## Purpose
Ảnh toàn màn làm cảm xúc/nền.

## When
Ảnh mạnh, 1 thông điệp ngắn.

## When not
Cần nhiều dữ kiện.

## Anatomy
Ảnh phủ 100%, overlay, 1 title + 1 dòng phụ.

## Grid & geometry
Text trong safe area; overlay 35–60%.

## Params
`{overlay:0.35-0.6, textPos:"left|center", crop:"focal"}`

## Limits
- title <=10 từ
- contrast >=4.5
- không bullet

## Motion
fade 800ms; Ken Burns rất nhẹ nếu COM.

## Anti-pattern
Ảnh 800px; chữ không overlay; 5 dòng text.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
