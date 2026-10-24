# Third-party notices

## Runtime dependencies

| Component | License | Use |
|---|---|---|
| PptxGenJS | MIT | Deck creation |
| python-pptx | MIT | Deck reading/editing |
| lxml | BSD-3-Clause | OOXML patching |
| Pillow | HPND | Image processing |
| @modelcontextprotocol/sdk | MIT | MCP transport (elicitation, tools) |
| Zod | MIT | Tool input validation |
| comtypes | MIT | Windows COM bridge for PowerPoint animation/transition (required for motion when COM is available) |

## Behavior contracts (v2.1.0)

- **MCP Elicitation is required** for missing `topic`, `slideCount`, or `useEffects`.
  If the MCP client does not support elicitation, the server records assumptions in
  `brief.assumptions` instead of guessing silently.
- **Animation is mandatory** when `brief.useEffects = true` and COM is available.
  The build pipeline calls `applyMotion` (via `com_motion.py`) before export.
  If COM is unavailable, motion is written as a spec and noted in warnings; it must
  not be silently dropped.
- **No build without an approved brief**: `brief_confirm` rejects approval when
  `slideCount`, `topic`, or `useEffects` is missing.

## Fonts

No font files are committed. `assets/fonts/` is intentionally empty; fonts are
installed at runtime and their license is recorded per font in `assets/fonts/LICENSE.json`
when present. Use `font_audit` and `asset_license_check` before embedding.

Recommended, redistributable defaults: Inter, Source Sans 3, Noto Sans, IBM Plex Sans,
Be Vietnam Pro (all OFL) — verify Vietnamese Latin Extended Additional coverage.

## Images, icons, templates

Assets downloaded through `asset_download` must carry `license` and `attribution` in
`assets/downloaded/*.json`. The commercial gate rejects `license: "unknown"`.

## Templates

`assets/templates/` starts empty. Any `.potx` added must ship with a license note here.