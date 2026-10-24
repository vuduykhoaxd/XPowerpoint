---
name: slide-timeline
description: "Timeline — mốc thời gian — Cho thấy tiến trình theo thời gian."
---

# Timeline — mốc thời gian

## Purpose
Cho thấy tiến trình theo thời gian.

## When
4–8 mốc có ngày.

## When not
Dữ liệu liên tục theo tháng -> chart line.

## Anatomy
Trục ngang/dọc, dot, ngày, tiêu đề, 1 dòng.

## Grid & geometry
Ngang 4–6 mốc; dọc 7–10; dot cách đều.

## Params
`{milestones:4-8, orientation:"h|v", showToday:false}`

## Limits
- ngày rõ
- <=8 mốc
- dot cùng kích thước

## Motion
line draw + dot pop stagger 100ms.

## Anti-pattern
Mốc không đều thời gian; 12+ mốc; nhãn chồng.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
