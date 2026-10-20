# Real Me performance — before (commit `9aa453a`)

Measured with `scripts/perf-realme.mjs` (Playwright + Chrome 155 headless, `npm run preview` build,
**CDP CPU throttling ×4**). Every lazy section is rendered first, then:

- **Scroll pass:** time-based scroll from the top of Experience to just past the top of
  Perspectives and back (5 s each way), rAF frame times recorded in the page.
- **Idle:** Real Me in view for 10 s.
- Paint/layout counts come from a `devtools.timeline` trace; JS/task time from
  `Performance.getMetrics` (`ScriptDuration`, `TaskDuration`). "Busy" = main-thread task time ÷ wall time.
- Paint *area* could not be measured reliably: Chrome reports infinite cull rects for most paints.
  Instead the trace is used to name the elements that repaint **every frame**.

| | Desktop 1440×900 | Phone 390×844 | Landscape 844×390 |
| --- | --- | --- | --- |
| Scroll fps median / p5 / min | 60 / 30 / 20 | 60 / 60 / 30 | 60 / 60 / 30 |
| Scroll: long tasks > 50 ms | 0 | 0 | 0 |
| Scroll: layouts / paints (10 s) | 972 / 2 119 | 610 / 5 838 | 1 122 / 3 011 |
| Scroll: main thread busy | **105 %** | 84 % | 75 % |
| Idle fps median / p5 | 60 / 30 | 60 / 60 | 60 / 60 |
| Idle: JS per frame | 1.30 ms | 1.13 ms | 0.97 ms |
| Idle: all main-thread tasks per frame | **19.9 ms** | **16.6 ms** | **15.5 ms** |
| Idle: main thread busy | **110 %** | **98 %** | **92 %** |
| Idle: paints per frame | 7.6 | 10.9 | 7.2 |
| Idle: paint time per frame | 2.0 ms | 2.4 ms | 2.2 ms |
| Idle: layouts per frame | 1.11 | 1.11 | 1.11 |
| DOM nodes in the section (SVG / paths) | 364 (280 / 175) | 358 (273 / 177) | 349 (273 / 177) |
| Console errors / warnings | 0 | 0 | 0 |

**Repainting every frame while Real Me sits idle** (trace):

| Element | Why |
| --- | --- |
| document root layer (the whole page) | everything below is painted into it |
| `svg.realme-web` (≈175 paths) | its CSS breathing `scale` animation is not composited on an SVG, and dew glints / ring wobbles animate inside it |
| `svg.pointer-events-none` (Projects world art, off-screen) | infinite CSS animations keep running off-screen |
| `span.hero-pop__led` ×4 (hero, off-screen, phone) | the billboard LED chase animates `background-position` under a drop-shadow filter, even while the billboard is hidden |
| `span.logo-slab__sweep` (Projects, off-screen) | `background-position` sweep, still running off-screen |
| `div.web-spider`, `div.web-bug__body` | expected — the moving parts |

**Layout every frame:** the spider loop rewrites SVG attributes (8 legs, pupils, silk thread) on
every frame, which dirties SVG layout; the top bar's section probe then reads
`getBoundingClientRect()` in its scroll rAF and can force that layout synchronously.

**Reading it:** headless Chrome still reaches 60 fps medians because the compositor draws at
vsync, but the main thread has no headroom left: at ×4 CPU it spends 15–20 ms of every 16.7 ms
frame on style, layout and paint for a section that only moves a 30–50 px spider. On a real
mid-range phone, any scroll work on top of that drops frames, which is the lag you feel.
