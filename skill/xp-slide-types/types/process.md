---
name: slide-process
description: "Process — 3–6 bước — Giải thích trình tự thực hiện."
---

# Process — 3–6 bước

## Purpose
Giải thích trình tự thực hiện.

## When
Quy trình tuyến tính <=6 bước.

## When not
Có nhánh/rẽ -> diagram-system.

## Anatomy
Step number, icon, heading, 1 dòng, connector.

## Grid & geometry
Ngang: 3 bước 4 cột; 4 bước 3 cột; 5–6 chia 2 hàng.

## Params
`{steps:3-6, connector:"arrow|line", numbered:true}`

## Limits
- cùng độ dài mô tả
- connector thẳng hàng
- bước cuối = output

## Motion
wipe connector rồi fade step 80ms.

## Anti-pattern
7+ bước; mũi tên lệch; bước không có động từ.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
