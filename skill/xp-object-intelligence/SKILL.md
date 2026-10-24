---
name: xp-object-intelligence
description: Used when slide has many objects. Semantic role, constraint engine,
  fixed-order solver, dependency graph, reflow, batch by role.
---

# Object intelligence

## Semantic role (every object)

`title | subtitle | body | label | value | unit | icon | container | connector | decor | source | ui`

No role -> no build.

## Constraints

| Constraint | Meaning |
|---|---|
| `anchor` | pin to margin/center/other object |
| `size: min/max` | prevent scale |
| `aspect: lock` | keep ratio |
| `spacing: equal` | equal gaps |
| `baseline` | align text baselines |
| `contain: text` | box must contain actual text |
| `keep-with` | don't separate from related object |
| `z-band` | enforce layer |
| `avoid` | don't overlap other |

## Solver (fixed order)

```
text metrics -> intrinsic size -> distribute -> align
-> collision resolve -> snap grid -> z-order
```

Re-run **entire** pipeline after every content change. No local fix skipping neighbors.

## Dependency graph

```
long text -> tall card -> tall row -> slide overflow -> layout_break_plan
```

## Batch by role

- `object_query({role:"value"})` -> fix 20 KPIs at once.
- `object_style_inherit` -> change token, all bound objects update.
- `object_batch` -> multi-object ops atomically.

## Collision

- Valid overlap must declare `intentional:true` + reason.
- Text never overlaps text.
- Deco may overlap content but not cover text (except intentional mask reveal).

## Auto-fix

`overflow` -> shrink -> wrap -> reflow -> split. Stop at first step that fixes without reducing body below 14pt.

## Tool

`object_query` -> `object_constraints_set` -> `layout_solve` -> `layout_reflow`.

## Read next

`xp-composition` -> `xp-quality` -> `xp-handoff`