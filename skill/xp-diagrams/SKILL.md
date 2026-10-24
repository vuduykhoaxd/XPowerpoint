---
name: xp-diagrams
description: Used when needing diagrams: swimlane, flow, org, network, cycle, layer,
  stacked. Draw with primitives, not SmartArt.
---

# Diagrams

## Choose type

| Type | Use | Limit |
|---|---|---|
| Flow | sequential, decision | <=7 nodes/layer |
| Swimlane | multi-actor, handoff | 3–5 lanes |
| Org/hierarchy | parent-child | <=4 levels, <=20 nodes |
| Network | many-to-many relations | <=25 nodes |
| Cycle | loop | 4–6 nodes |
| Layer/stack | architecture | 3–5 layers |
| Matrix | 2 axes | 2x2 or 3x3 |

## Principles

- Draw with primitive shapes + connectors, not SmartArt (hard to edit, hard to style).
- Orthogonal connectors (elbow), avoid diagonal.
- Same node type = same size + color.
- 1-way arrows; 2-way only when truly needed.
- Legend if >=3 node types/colors.
- Text in node <=2 lines, 12–14pt.

## Swimlane

- Horizontal lane, label left 1.5–2in.
- Step numbers in reading order.
- Handoff = arrow crossing lane.
- No more than 3 steps/lane per row.

## Layer

- 3–5 layers stacked vertically, each layer 1 band.
- Arrows show dependency 1 direction.
- Layer label left, short description right.

## Sizing

- Node min 1.4 × 0.6in to fit 2 lines 12pt.
- Node gap >= 0.25in.
- Entire diagram within safe area.

## Tool

`layout_auto_compose(pattern)` -> `object_add`/`object_group` -> `layout_collision`.

## Anti-pattern

- 30 nodes without grouping.
- Connector crossing text.
- 6 node colors without legend.
- Default SmartArt, ugly, hard to edit.

## Read next

`xp-slide-types/types/diagram-system.md` -> `xp-object-intelligence`