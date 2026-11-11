# Liquid-mercury goo on "Whisper to me" — measurements

Effect: `src/components/layout/whisperGoo.ts` (WebGL2, loaded by `WhisperButton.tsx`).
Probe: `node scripts/perf-web-effect.mjs http://localhost:4173/` (production build, `vite preview`),
Chrome on this laptop (Intel UHD, Windows 11), 1440×900, 60 Hz. The mouse circles the button
inside the zone for 10 s (one lap per 2 s, a move every ~8 ms), so tendrils keep reaching, latching
and snapping. `BASELINE=1` repeats the same run with the effect off, to separate its cost from the
rest of the page.

| Run | fps | Frame median / p95 / p99 (ms) | Dropped frames | Effect JS per frame median / p95 / p99 / max (ms) | Input → draw median / p95 / p99 (ms) | Long tasks | Layouts | Style recalcs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Normal, goo on | 60.0 | 16.7 / 16.8 / 16.9 | 3 | 0.4 / 1.0 / 1.5 / 2.2 | 7.7 / 17.3 / 22.5 | 0 | 9 | 614 |
| Normal, goo off | 62.6 | 16.6 / 16.8 / 17.0 | 1 | — | — | 0 | 9 | 640 |
| 4× CPU, goo on | 55.6 | 16.7 / 16.8 / 50.1 | 13 | 1.1 / 3.5 / 5.2 / 8.8 | 13.2 / 24.0 / 89.8 | 7 | 9 | 566 |
| 4× CPU, goo off | 55.6 | 16.7 / 16.8 / 66.6 | 13 | — | — | 7 | 10 | 568 |

Frame times are frame-to-frame intervals (16.7 ms = every frame at 60 Hz), not work per frame.
"Input → draw" is from the `pointermove` event's timestamp to the end of the frame that drew it;
the screen shows it at the next vsync.

## Against the targets

| Target | Result |
| --- | --- |
| JS ≤ 2 ms per frame (cap 4 ms) | Met at normal speed: p99 1.5 ms, max 2.2 ms. With 4× throttling p95 3.5 ms, but p99 5.2 ms and max 8.8 ms go over the 4 ms cap (CPU throttled to a quarter, as on a slow phone; this effect never runs on phones) |
| Input → draw < 30 ms (aim < 16 ms) | Met at normal speed: median 7.7, p95 17.3, p99 22.5 ms. With 4× throttling p99 90 ms, when the throttled page's own long tasks hold up input |
| 0 long tasks from the effect | Met: 0 at normal speed; 7 with 4× throttling, the same as with the effect off |
| No layout or style recalculation from the effect | Met: same counts with the effect off (they come from the page reacting to the moving mouse) |
| ≥ 50 fps with 4× throttling | Met: 55.6 fps (55.6 off) |
| p99 frame ≤ 16 ms with 4× throttling | Missed, by the page rather than the effect: 50.1 ms on vs 66.6 ms off |
| Initial bundle grows ≤ 4 kB gzip | Met: +0. The effect is its own 5.0 kB gzip chunk, not referenced by `index.html`, fetched only on desktop mice once the footer is within 600 px |

GPU time isn't measured directly. The first goo version drew the whole canvas at 2× and showed
2 long tasks and 7 dropped frames at normal speed. It now draws at 2× (crisp), but only inside a
scissor box around the pill and its tendrils, which gives the numbers above.

## How it stays cheap

- One canvas, the button plus 140 px on each side (466×324 CSS px, drawn at up to 2×), in the page
  only while the goo shows. It sits behind the label and is clipped off the e-mail row above.
  It never takes clicks, focus or scrolling. Shaders compile in the background as soon as the
  chunk loads, so the first hover never waits for them.
- `pointermove` (passive, only while the footer is on screen) stores the latest point, using
  `getPredictedEvents()` when the browser has it.
- One `requestAnimationFrame` loop: rope physics for up to 5 tendrils (8 points each, fixed
  1/120 s substeps, preallocated `Float32Array`s, no allocations), then one draw call. It runs
  only while the pointer is near or tendrils are settling, and stops when the footer leaves the
  screen or the tab is hidden.
- The fragment shader skips pixels far from each tendril (per-tendril bounding boxes).
- Not loaded at all on touch screens or with reduced motion. Those visitors get the same glossy
  black pill, drawn by CSS.
