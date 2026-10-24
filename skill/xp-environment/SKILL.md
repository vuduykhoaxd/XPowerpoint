---
name: xp-environment
description: Used for COM errors, render, font cache, long paths, Unicode Vietnamese,
  or checking if target machine has PowerPoint/LibreOffice. Windows recovery process.
---

# Environment (Windows)

## Quick check

- Node >= 20, Python >= 3.9.
- PowerPoint: `Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\POWERPNT.EXE`
- LibreOffice: `soffice --version` (fallback render/PDF).
- Fonts: `fc-list` or read `C:\Windows\Fonts`.

## Issue table

| Issue | Fix |
|---|---|
| COM hang | kill `POWERPNT.EXE`, retry 1, fallback LibreOffice |
| No Office | PDF via LibreOffice; animation = unavailable |
| Missing font | fallback by metrics: Segoe UI -> Arial -> sans-serif |
| Path > 260 | prefix `\\?\` |
| Unicode VN | UTF-8, `PYTHONIOENCODING=utf-8` |
| Dialog blocking | `DisplayAlerts=0`, `AutomationSecurity=3` |
| File locked | copy to temp, edit, overwrite |
| Render drift | fixed DPI, zoom 100%, disable HW accel |
| Blurry image | render 150dpi (preview) / 300dpi (print) |

## Path convention

- Absolute input/output, use `path.resolve`.
- ASCII filenames, no accents, no spaces: `bao-cao-q3_editable.pptx`.
- Temp files in `output/.tmp/`, clean up after done.

## COM guard

```
E_COM_UNAVAILABLE  -> don't promise transition/animation/morph/mp4/3d
E_COM_TIMEOUT      -> retry 1, then fallback
E_FILE_LOCKED      -> copy + overwrite
```

## Python bridge

```
python python/com_render.py --input deck.pptx --out out/ --format pdf,png
```

Always set `PYTHONIOENCODING=utf-8` and read JSON from stdout, log to stderr.

## Read next

`xp-tools` -> `xp-repair`