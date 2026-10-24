---
name: slide-funnel
description: "Funnel — phễu chuyển đổi — Cho thấy mất mát qua từng bước."
---

# Funnel — phễu chuyển đổi

## Purpose
Cho thấy mất mát qua từng bước.

## When
4–6 bước có số lượng giảm dần.

## When not
Số không giảm hoặc không có data -> process.

## Anatomy
Hình thang giảm dần, số + % + drop-off.

## Grid & geometry
Funnel 5.5in rộng, cao 4.5in; nhãn phải.

## Params
`{stages:4-6, showDropoff:true, values:[...]}`

## Limits
- tỉ lệ đúng số
- drop-off có đơn vị
- 1 màu gradient

## Motion
fade từng tầng trên->dưới.

## Anti-pattern
Hình không theo tỉ lệ; 8 tầng; drop-off sai.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
