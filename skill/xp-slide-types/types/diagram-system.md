---
name: slide-diagram-system
description: "Diagram system — Sơ đồ nhiều lớp: kiến trúc, swimlane, network."
---

# Diagram system

## Purpose
Sơ đồ nhiều lớp: kiến trúc, swimlane, network.

## When
Quan hệ phức tạp, nhiều actor.

## When not
Tuyến tính đơn giản -> process.

## Anatomy
Swimlane/layer/node/connector/legend.

## Grid & geometry
Grid 12x8; swimlane 3–5; node 1.8x0.8in; connector trực giao.

## Params
`{pattern:"swimlane|layer|network|cycle", nodes:"<=25", legend:true}`

## Limits
- <=7 node/lớp
- <=25 node
- connector trực giao
- legend nếu 3+ loại

## Motion
fade layer; connector wipe; node stagger.

## Anti-pattern
>60 node không group; connector chéo; 5 màu không legend.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
