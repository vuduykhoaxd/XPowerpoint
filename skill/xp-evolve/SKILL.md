---
name: xp-evolve
description: Used after QA or when a rule is wrong. Records learning, updates
  fixture, retires stale rule, keeps skill suite from bloat.
---

# Evolve

## When to record

- A bug repeats >= 2 times.
- A rule causes false positive.
- New font/asset/license.
- A design pattern confirmed effective.
- New engine limit discovered (COM/OOXML).

## Where to record

| Type | Location |
|---|---|
| Bug + fix | `tests/fixtures/<bug>.json` + CHANGELOG line |
| New rule | corresponding skill, "Rule" section |
| Wrong rule | fix/remove in source skill, note reason |
| Baseline | `tests/baselines/*.png` + report |
| New license | `THIRD-PARTY-NOTICES.md` |

## Process

1. Reproduce with minimal fixture.
2. Identify responsible skill/tool.
3. Fix rule/code.
4. Add regression test.
5. Run all gates on simple + complex fixture.
6. Update CHANGELOG.

## Principles

- Don't add new skill if old skill can be fixed.
- SKILL.md body must not exceed 400 lines; split to side file.
- Every rule must be verifiable (tool/gate), not opinion.
- Remove old rule when it conflicts, don't stack.

## Read next

`xp-quality` -> `xp-workflow`