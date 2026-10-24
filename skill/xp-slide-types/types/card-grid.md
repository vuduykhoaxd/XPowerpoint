---
name: slide-card-grid
description: "Card grid — 3–6 ý song song — Trình bày các ý ngang hàng, dễ quét."
---

# Card grid — 3–6 ý song song

## Purpose
Trình bày các ý ngang hàng, dễ quét.

## When
3–6 ý không tuần tự.

## When not
Chuỗi bước có thứ tự -> process.

## Anatomy
Card: icon/number, heading, 1–2 dòng, có thể link.

## Grid & geometry
3 card: 4 cột; 4: 3 cột; 6: 4 cột x 2 hàng.

## Params
`{cards:3-6, icon:true, equalHeight:true}`

## Limits
- heading <=5 từ
- body <=2 dòng
- cùng chiều cao

## Motion
stagger fade 60ms + fly-in 20px.

## Anti-pattern
Card dài ngắn khác nhau; 5 card; icon 3 style khác nhau.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
