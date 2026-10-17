# Live-site diagnosis — before the fix

Measured on 2026-10-17 against https://gouranglokwani.vercel.app with Playwright
(Edge headless). WebGL ran on the real GPU of a typical integrated-graphics laptop
(Intel UHD, ANGLE/D3D11). Each row was run twice: normal motion and
`reducedMotion: 'reduce'`. Scripts: `diag.mjs` (behaviour + fps) and Lighthouse 12 CLI.

## 1. Is the live site on the latest commit?

**Yes.** Local `HEAD` is `adfe633` ("Rebuild The Real Me as a spider-web scene"). The live
`index.html` loads `assets/index-CjWpckjr.js`, the same entry hash as the local build of
`adfe633`, and the new `RealMeSection-BxWaSHb1.js` chunk returns 200. So "animations not
working" is **not** a stale deployment. `gouranglokwani.in` doesn't resolve yet (DNS not
connected).

## 2. Behaviour (errors, requests, what actually animates)

| Config | Motion | Hero after 2 s / 8 s | Solar | Project switches | Wrepd trucks | Spider counter (15 s) |
| --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | normal | poster / **video** (live 3D gave up) | 3D | 4/4 | moving | 00 → 03 |
| 1440×900 | reduce | **poster only (frozen)** | 3D, no rotation | 4/4 | **static** | **frozen** (02 → 02) |
| 1280×720 | normal | live 3D / live 3D | 3D | 4/4 | moving | 00 → 02 |
| 1280×720 | reduce | **poster only (frozen)** | 3D, no rotation | 4/4 | **static** | **frozen** |
| iPhone 13 | normal | video, **paused** (stage starts below the fold at 711 px of 664) | 3D | 4/4 | moving | 00 → 01 |
| iPhone 13 | reduce | **poster only (frozen)** | 3D, no rotation | 4/4 | **static** | **frozen** |

- Console errors: **0** in all 6 runs. Console warnings: **0**.
- Failed requests, 4xx/5xx, wrong MIME types: **none**. Videos are served as `video/*`, JS as `application/javascript`.
- CSP / `vercel.json`: no CSP header is sent, so nothing blocks workers, `blob:` or media. `/assets/*` is already `immutable`.

### Root causes found

1. **Reduced motion freezes the site.** If Windows "Animation effects" or iOS "Reduce Motion"
   is on, the hero shows only a still poster, the spider and bugs stop, the Wrepd trucks park,
   and the global CSS rule cuts every animation and transition to 0.001 ms. This matches "animations
   often don't play".
2. **The hero guard gives up too early on integrated graphics.** At 1440×900 the live 3D scene
   was replaced by the video within 8 s. It skipped only 0.6 s of warm-up and then averaged 2 s
   against a 24 ms threshold, which the shader-compile and texture-upload frames trip on their own.
   At 1280×720 (fewer pixels) it survived. Live 3D is also limited to landscape screens ≥ 900 px.
3. **The phone hero starts paused** because the stage sits below the first screen. It only plays
   after scrolling, so a first glance looks frozen.
4. **The phone hero is zoomed in.** The billboard spans edge to edge and is cut off on the left
   (see `hero-phone-before.png` in the deliverables).
5. **The billboard can't pop for most visitors.** Hover exists only in live 3D (`Billboard.tsx`),
   as a 1.5% scale. Video and poster visitors (phones, tablets, portrait, slower laptops) get nothing.

## 3. Throttled CPU ×4 — scroll smoothness per section

Median fps / p95 frame time while scrolling through each section; long tasks ≥ 50 ms.

| Section | 1440×900 | iPhone 13 |
| --- | --- | --- |
| Hero | 30 fps / 33 ms | 60 fps / 33 ms |
| Capabilities (solar 3D) | 30 fps / 33 ms | 60 fps / 33 ms |
| Projects | 60 / 17 ms | 60 / 17 ms |
| Experience | 60 / 17 ms | 60 / 17 ms |
| Real Me | 60 / 17 ms | 60 / 17 ms |
| Perspectives | 60 / 17 ms | 60 / 17 ms |
| Contact | 60 / 17 ms | 60 / 17 ms |
| Long tasks during scroll | 0 | 0 |

Desktop drops to 30 fps around the hero and the solar system. Both WebGL canvases render at
the same time at the hero/capabilities boundary. Each uses `dpr` up to 1.75 / 1.6, and the
hero's 2048² shadow map is costly under CPU throttling.

## 4. Lighthouse (mobile, simulated slow 4G, CPU ×4), 3 runs

| Run | Perf | FCP | LCP | TBT | CLS | SI |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 95 | 1.8 s | 2.4 s | 10 ms | 0 | 4.3 s |
| 2 | 97 | 1.7 s | 2.3 s | 40 ms | 0 | 2.7 s |
| 3 | 98 | 1.4 s | 2.3 s | 20 ms | 0 | 1.6 s |

Load performance is already within target. The problems are the motion policy, the hero
guard, the frame rate when two WebGL scenes overlap, the missing billboard interaction and
the phone framing.
