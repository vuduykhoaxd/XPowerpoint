---
name: slide-agenda
description: "Agenda — lộ trình — Cho người nghe biết cấu trúc và thời lượng."
---

# Agenda — lộ trình

## Purpose
Cho người nghe biết cấu trúc và thời lượng.

## When
Deck >= 8 slide hoặc có 3+ section.

## When not
Deck 1 section, workshop ngắn.

## Anatomy
3–6 mục đánh số + thời lượng, cột trái; có thể kèm 1 hình/ảnh phải.

## Grid & geometry
2 cột 7/5 hoặc list toàn chiều rộng; item cách 0.6in.

## Params
`{items:3-6, showDuration:true, progress:false}`

## Limits
- <=6 mục
- không mô tả dài dòng
- đánh số rõ

## Motion
stagger fade từng item 80ms.

## Anti-pattern
8+ mục; mục quá dài; không highlight mục hiện tại khi cần.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
