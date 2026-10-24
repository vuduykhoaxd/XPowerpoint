---
name: xp-imagery
description: Used when there are images: select image, crop by focal point, mask,
  duotone, overlay, resolution, alt text, and license.
---

# Imagery

## Select image

- Image must prove what the slide says, not just decorate.
- Prefer real brand/product photos; stock only when unavailable.
- Resolution >= 2× display size (>=1600px for full-bleed).
- Avoid images with watermarks, text in image, overused stock.

## Focal crop

- Identify focal (eyes, product, action), then crop around it.
- Full-bleed: crop 16:9 horizontally, no stretching.
- Card: 4:3 or 1:1; keep same ratio in a row.
- Don't cut off heads/fingers.

## Overlay

- Text over image: black/white overlay 35–60%, or directional gradient.
- Verify contrast on **text region**, not whole image.

## Mask & duotone

- Mask shape: image inside shape, keep crop.
- Duotone: 2 brand colors, keep detail in dark areas.
- Blur bg: 20–40px, only for secondary images.

## Metadata

- `alt_text` describes content, <= 125 chars.
- Record `license`, `author`, `sourceUrl`, `retrievedAt`.
- `unknown` license image: do not use in commercial deck.

## File size

- <= 500KB/background image, <= 250KB/content image.
- Compress JPEG q80 or WebP; PNG only for graphic/alpha.

## Tool

`asset_search` -> `asset_download` -> `asset_process_image` -> `asset_crop_focal`
-> `asset_license_check`.

## Anti-pattern

- Blurry image upscaled.
- Images with different ratios side by side.
- White text on bright image.
- Stock people pointing at charts.

## Read next

`xp-backgrounds` -> `xp-illustration` -> `xp-legal`