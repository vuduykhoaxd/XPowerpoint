---
name: slide-comparison
description: "Comparison — so sánh phương án — Giúp chọn giữa 2–3 lựa chọn."
---

# Comparison — so sánh phương án

## Purpose
Giúp chọn giữa 2–3 lựa chọn.

## When
2–3 phương án, tiêu chí rõ.

## When not
So sánh 5+ phương án -> data-table.

## Anatomy
Header mỗi phương án, các hàng tiêu chí, highlight phương án chọn.

## Grid & geometry
2 cột 6/6 hoặc 3 cột 4/4/4; cột tiêu chí 2.5in nếu 3+.

## Params
`{options:2-3, criteria:3-6, highlight:"option-b"}`

## Limits
- cùng tiêu chí
- highlight 1 lựa chọn
- không nhồi 8 tiêu chí

## Motion
fade từng cột; highlight last.

## Anti-pattern
Tiêu chí lệch; không kết luận; 3+ màu highlight.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
