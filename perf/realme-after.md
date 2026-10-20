# Real Me performance — after

Same method as [`realme-before.md`](realme-before.md): `scripts/perf-realme.mjs`, Chrome 155 headless,
`npm run preview` build, **CPU throttling ×4**, every lazy section rendered first.

> **Note on fps:** during this session the headless display paced at **~56 Hz** (17.9 ms frames) for
> *both* builds, so 56 is the ceiling. To compare like for like, the old code (`9aa453a`, still live
> at the time) was measured again in the same session. Those numbers are in the *Before (same session)* columns.

## Desktop 1440×900

| | Before (first run) | Before (same session) | **After** |
| --- | --- | --- | --- |
| Scroll fps median / p5 / min | 60 / 30 / 20 | 56 / 28 / 2 | **56 / 55 / 54** |
| Scroll: long tasks > 50 ms | 0 | – | **0** |
| Scroll: main thread busy | 105 % | 94 % | **62 %** |
| Idle: JS per frame | 1.30 ms | 1.04 ms | **0.80 ms** (target ≤ 4) |
| Idle: all main-thread tasks per frame | 19.9 ms | 17.6 ms | **10.9 ms** |
| Idle: main thread busy | 110 % | 97 % | **60 %** |
| Idle: paints per frame / paint time | 7.6 / 2.0 ms | 7.9 / 2.2 ms | **2.6 / 0.63 ms** |
| Idle: layout time per frame | 0.47 ms | – | **0.26 ms** |
| DOM nodes in the section (SVG / paths) | 364 (280 / 175) | – | **252 (155 / 89)** |

## Phone 390×844

| | Before | **After** |
| --- | --- | --- |
| Scroll fps median / p5 / min | 60 / 60 / 30 | **56 / 55 / 54** |
| Scroll: long tasks > 50 ms | 0 | **0** |
| Scroll: main thread busy | 84 % | **45 %** |
| Idle: JS per frame | 1.13 ms | **0.50 ms** (target ≤ 6) |
| Idle: all main-thread tasks per frame | 16.6 ms | **8.2 ms** |
| Idle: main thread busy | 98 % | **45 %** |
| Idle: paints per frame / paint time | 10.9 / 2.4 ms | **2.7 / 0.69 ms** |
| DOM nodes in the section (SVG / paths) | 358 (273 / 177) | **213 (123 / 69)** |

## Landscape phone 844×390

| | Before (first run) | Before (same session) | **After** |
| --- | --- | --- | --- |
| Scroll fps median / p5 / min | 60 / 60 / 30 | 56 / 55 / 2 | **56 / 55 / 9** ¹ |
| Scroll: long tasks > 50 ms | 0 | – | **0** |
| Scroll: main thread busy | 75 % | 65 % | **20 %** |
| Idle: JS per frame | 0.97 ms | 0.94 ms | **0.44 ms** |
| Idle: all main-thread tasks per frame | 15.5 ms | 14.6 ms | **6.4 ms** |
| Idle: main thread busy | 92 % | 81 % | **36 %** |
| Idle: paints per frame / paint time | 7.2 / 2.2 ms | 6.6 / 2.0 ms | **1.3 / 0.41 ms** |
| DOM nodes in the section (SVG / paths) | 349 (273 / 177) | – | **204 (123 / 69)** |

¹ One slow frame (≈110 ms) when the section is first rendered on the way down (its skipped
content is laid out and the canvas is created). It is not a long task, and p5 stays at 55.

Console errors and warnings during the runs: **0** (all three configurations).

## What repaints now

- **Before:** every frame repainted the whole web SVG (~175 paths), off-screen project art, the
  hero LEDs and a logo sweep.
- **After:** a layer-toggle test showed that hiding the spider/bug layer removes **all** per-frame
  paint and layout. What still paints is only the spider (legs while walking) and a bug's wings
  while it flies. The web is a bitmap that the compositor moves, and off-screen sections no longer
  animate. (Chrome 155 does not report paint rectangles, so area is shown this way rather than in px².)

## What changed

1. **Raster web.** The web "spins itself" once as an SVG stroke animation, then hands over to a
   canvas painted from the same paths (200 ms crossfade), and the SVG is removed. Breathing, drift
   and device tilt are compositor `transform`s on that layer. `will-change` is set only while the
   section is on screen. Repainted only on resize/rotation (debounced 150 ms).
2. **Strand wobble.** Instead of scaling whole rings, a tiny overlay redraws only the 2–3 strand
   pieces next to the bug and wobbles them on the compositor, then removes itself. It is off on
   the low and calm tiers.
3. **One loop, only when needed.** The spider/bug loop runs only while ≥ 10 % of the section is
   visible and the tab is visible, and pauses during rotation. On the low tier it is capped at
   30 fps (motion is time-based). DOM writes happen only when a value changes. Legs and pupils move
   with CSS transforms, the silk thread is a 1 px div, the eyes no longer follow a stuck bug's
   jitter, wings flicker only in flight, and the spider breathes on a composited wrapper.
4. **React.** The counter, the open-chip tooltip and "Read more" live in small memoised children,
   so a sorted bug or a tap no longer re-renders the web or spider.
5. **Isolation.** `#real-me` has `contain: layout paint style; content-visibility: auto` (900 px /
   1100 px intrinsic size). The cocoon's `drop-shadow` filter became a plain stroke.
6. **Tiers** (`src/lib/motionTier.ts`):
   - **high:** desktops and tablets.
   - **low:** phones, ≤ 4 CPU threads, ≤ 4 GB memory, or a median frame time > 22 ms in the first
     3 s. 30 fps, no back web, no device tilt, 3 bugs, no wobble.
   - **calm:** reduced motion. A finished, static web and one slow bug every 8 s.

   The tier steps down once if the loop sees sustained slow frames, and never steps back up.
7. **Whole site.**
   - Every section pauses its CSS animations while off-screen (`lib/offscreenPause.ts`).
   - The hero billboard's LED chase runs only while the board shows.
   - The top bar finds the section under it with an IntersectionObserver (no rect reads while
     scrolling) and rAF-throttles its scroll flag.
   - The logo-slab tilt caches its rect.
   - Always-on `will-change` (logo slab, spider, hero billboard, magnetic button) was removed or
     limited to when it is needed.

## Not fixed (with numbers)

- **One layout per frame remains while the spider walks or a bug flies:** SVG leg and wing
  movement costs 0.13–0.26 ms per frame at ×4 CPU. Only moving it all to canvas would remove it.
- **Landscape: one ~110 ms first-render frame** when scrolling into the section (see ¹).
- **Two small visual differences, both deliberate:**
  - Phones (low tier) no longer show the faint back web.
  - The spider now breathes as a whole (3 %) instead of only its abdomen (5 %).
- **Strand count:** spokes and rings were not reduced to 12/8 and 16/11. Doing so would change
  the look, and after the 2 s draw-in the strands are no longer DOM nodes at all. Dew glint layers
  are capped at 6; bug slots are 3 on phones and 4 on desktop.
