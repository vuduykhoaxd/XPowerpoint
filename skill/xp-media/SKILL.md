---
name: xp-media
description: Used when there is video or audio: embed, poster, trim, loop, autoplay,
  caption, compression, codec, and fallback when COM unavailable.
---

# Media

## Video

| Property | Recommendation |
|---|---|
| Codec | H.264 + AAC (.mp4) |
| Resolution | 1920×1080 or 1280×720 |
| Bitrate | 4–8 Mbps (1080p) |
| Duration | <= 30s/slide, <= 2 min/deck |
| Poster | representative frame, same ratio |
| Autoplay | only when no narration |
| Loop | only short bg video <= 10s |

## Audio

- `.m4a` or `.mp3`, 44.1kHz.
- Small speaker icon, autoplay off by default.
- Bed music <= -20dB vs voice; fade in/out 1s.
- Always have mute button or no background music.

## Caption

- Video with speech -> separate or burn-in captions.
- Caption font 14–16pt, semi-transparent bg.
- Caption never outside safe area.

## Embedding

- Native embed (COM) when trim/autoplay needed.
- PptxGenJS basic embed only; verify file after build.
- Video must be in package (`export_package`), not external link.

## Fallback

- No COM -> still embed but don't promise autoplay/trim.
- Target missing codec -> include poster + backup link.
- Note PowerPoint version in speaker notes.

## Tool

`asset_search(type:"video")` -> `asset_download` -> `slide_media_add`
(via `object_add`) -> `export_package`.

## Anti-pattern

- 200MB video.
- Autoplay + narration.
- Portrait video in landscape slide without border.
- Background music no mute.

## Read next

`xp-motion` -> `xp-environment` -> `xp-legal`