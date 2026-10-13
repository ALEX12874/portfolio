# Performance & reliability — before / after

Measured with Lighthouse 12 (mobile: Moto G Power emulation, simulated slow 4G,
4× CPU) using Edge/Chromium on Windows. "Before" = live site prior to this
change; "after" = production build (`vite preview`), median of 3 runs.

| Metric | Before (live) | After |
| --- | --- | --- |
| Performance | 41 | 94–96 |
| Accessibility | 93 | 97 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 3.6 s | 2.0 s |
| Largest Contentful Paint | 6.3 s | 2.6–2.7 s |
| Total Blocking Time | 2,060 ms | 10–40 ms |
| Cumulative Layout Shift | 0 | 0 |
| Page weight (first load) | 1,081 KiB | 696 KiB (incl. 429 KiB hero video, attached after load) |
| Initial JS (gzip) | 118 kB | 86 kB |

## Assets

| Asset | Before | After |
| --- | --- | --- |
| Billboard texture | 419 kB PNG | 29 kB WebP |
| Logos (4) | 791 kB PNG | 57 kB WebP |
| HLBS certificate (view) | 458 kB PNG | 72 kB WebP (PNG kept for Download only) |
| Fonts | Google Fonts, render-blocking | self-hosted WOFF2, 2 preloaded |
| Hero (phones) | CSS fallback | 12 s loop: 397 kB MP4 / 429 kB WebM, 39 kB poster |
| Hero (wide) | — | 412 kB MP4 / 410 kB WebM, 51 kB poster |

## Scroll smoothness (median / min fps, Playwright rAF probe)

| Section | 390×844, CPU ×4 | 1440×900 |
| --- | --- | --- |
| Hero (video) | 60 / 1 | 60 / 0 |
| Capabilities (WebGL) | 7 / 3 * | 4 / 1 * |
| Projects | 60 / 2 | 4 / 2 * |
| Experience | 60 / 60 | 30 / 3 |
| Perspectives | 60 / 30 | 120 / 30 |
| Contact | 60 / 20 | 120 / 40 |

\* WebGL here is SwiftShader (CPU software rendering) — not representative of
a real GPU. On real devices the solar system has a frame-time guard that swaps
to the 2D orbit if it can't hold ~30 fps. Minimums include the moment a lazy
section mounts.

## Error sweep (scripted tour: scroll, menu, 4 projects, 2 experiences +
certificate viewer, planets) at 390×844, 844×390, 768×1024, 1180×820, 1440×900

- Console errors / warnings: 0
- Failed requests (4xx/5xx): 0
- Horizontal overflow: 0 px at every width
- axe-core: 1 remaining issue — small Signature-Red labels on Ink measure
  4.35:1 (WCAG AA needs 4.5:1 for small text); left as-is because the palette
  is locked.
