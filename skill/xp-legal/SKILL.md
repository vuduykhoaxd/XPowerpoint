---
name: xp-legal
description: Used when using images/icons/fonts/video/templates from outside sources. License gate, attribution, commercial use, hard fail for unknown.
---

# Legal

## License registry

| License | Commercial | Attribution | Note |
|---|---|---|---|
| CC0 / Public domain | Yes | No | safest |
| CC-BY | Yes | Required | name + link |
| CC-BY-SA | Yes | Required | share-alike |
| CC-BY-NC | No | Required | exclude from commercial deck |
| OFL (font) | Yes | Keep license | allow embed |
| MIT/Apache | Yes | Keep notice | code/asset |
| Commercial-ok | Yes | Per terms | keep proof |
| Unknown | **No** | — | hard fail |

## Hard rules

1. `license: unknown` -> do not insert asset into commercial deck.
2. CC-BY -> attribution on final slide or notes, per source requirement.
3. Image with people -> check model release when used for ads.
4. Logo/brand -> need usage rights, don't use casually.
5. Font -> check embed rights before `font_embed`.
6. Template `.potx` -> record license in `THIRD-PARTY-NOTICES.md`.

## Attribution format

```
Image: Author / Source / License / URL / Access date
```

Place on "Source & credits" slide or notes if deck short.

## Tool

`asset_license_check` -> `validate_licenses` -> report in
`output/reports/licenses.json`.

## When unsure

Ask user or swap for CC0 asset. Do not guess.

## Read next

`xp-imagery` -> `xp-font-direction` -> `xp-quality`