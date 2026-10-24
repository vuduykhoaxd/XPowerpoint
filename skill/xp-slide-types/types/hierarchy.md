---
name: slide-hierarchy
description: "Hierarchy — org/cây — Thể hiện cấu trúc cha-con."
---

# Hierarchy — org/cây

## Purpose
Thể hiện cấu trúc cha-con.

## When
<=4 cấp, <=20 node.

## When not
Mạng lưới phức tạp -> diagram-system.

## Anatomy
Node (role + name), connector elbow, level màu nhạt dần.

## Grid & geometry
Cây căn giữa; node 2.2x0.9in; gap 0.4in.

## Params
`{levels:2-4, nodes:<=20, style:"box|circle"}`

## Limits
- <=7 node/lớp
- connector trực giao
- level phân biệt bằng shade

## Motion
fade theo level từ trên xuống.

## Anti-pattern
Node chồng; 6 cấp; connector chéo rối.

## Read next

`xp-slide-types/SKILL.md` -> `xp-foundations` -> `xp-quality`
