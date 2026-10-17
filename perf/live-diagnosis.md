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

---

# After the fix — live, commit `9e7440b`

Same scripts, same machine, same live URL, after deploying "Smooth + error-proof live site,
billboard pop, zoomed-out mobile" and its follow-ups.

## Behaviour

| Config | Motion | Hero after 2 s / 8 s | Solar | Projects | Wrepd trucks | Spider (15 s) | Errors / warnings / failed / bad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | normal | **live 3D / live 3D** (was: gave up → video) | 3D | 4/4 | moving | 00 → 02 | 0 / 0 / 0 / 0 |
| 1440×900 | reduce | **video loop playing** (was: frozen poster) | 3D, orbits at ½ speed | 4/4 | **moving at ½ speed** (was: parked) | **00 → 02** (was: frozen) | 0 / 0 / 0 / 0 |
| 1280×720 | normal | live 3D / live 3D | 3D | 4/4 | moving | 00 → 02 | 0 / 0 / 0 / 0 |
| 1280×720 | reduce | **video loop playing** | 3D, ½ speed | 4/4 | **moving** | **00 → 02** | 0 / 0 / 0 / 0 |
| iPhone 13 | normal | **video playing from load** (was: paused below the fold) | 3D | 4/4 | moving | 00 → 02 | 0 / 0 / 0 / 0 |
| iPhone 13 | reduce | **video loop playing** | 3D, ½ speed | 4/4 | **moving** | **00 → 02** | 0 / 0 / 0 / 0 |
| 360×740 | normal | video playing | 3D (chunk still loading at 3.5 s*) | 4/4 | moving | 00 → 02 | 0 / 0 / 0 / 0 |
| 360×740 | reduce | video playing | 3D, ½ speed | 4/4 | moving | 00 → 02 | 0 / 0 / 0 / 0 |

\* By design, phones don't prefetch the 815 kB three.js chunk. It loads when the orbit nears the viewport ("Loading orbit…" shows meanwhile).

## Scroll smoothness (median fps / p95 frame)

| Section | 1440×900 CPU ×4 before → after | 1440×900 no throttle (after) | iPhone 13 CPU ×4 before → after |
| --- | --- | --- | --- |
| Hero | 30 / 33 ms (video) → 30 / 50 ms (**live 3D** now runs) | 60 / 17 ms | 60 / 33 → 60 / 33 ms |
| Capabilities | 30 / 33 → 30 / 50 ms | 60 / 17 ms | 60 / 33 → 60 / 33 ms |
| Projects | 60 / 17 → 60 / 33 ms | 60 / 17 ms | 60 / 17 → 60 / 33 ms |
| Experience → Contact | 60 / 17 ms | 60 / 17 ms | 60 / 17 ms |

At CPU ×4 on desktop the hero now *keeps the live 3D scene* (the old build swapped to video), so it
holds 30 fps there. Unthrottled it runs at 60 fps everywhere. Phones hold 60 fps at ×4.

## Lighthouse (mobile, simulated slow 4G, CPU ×4), 3 runs

| | Perf | FCP | LCP | TBT | CLS | SI |
| --- | --- | --- | --- | --- | --- | --- |
| Before (live) | 95 / 97 / 98 | 1.4–1.8 s | 2.3–2.4 s | 10–40 ms | 0 | 1.6–4.3 s |
| After (live) | 96 / 96 / 95 | 1.6–1.7 s | 2.6–2.8 s | 0–50 ms | 0 | 2.0–2.7 s |

LCP is the phone hero poster. On a local production build, the previous commit (`adfe633`) and
the new one both measure 2.9–3.0 s LCP, so the live difference is mostly CDN/network variance. The
new build adds ~3 kB of JS (error boundaries, scene arbiter, motion policy, pop maths), worth
~0.2 s of lab FCP. Pushing LCP reliably under 2.5 s would need the poster in the static HTML
(server-rendered hero). Real-visitor numbers now arrive in Vercel Speed Insights.

## What changed

- **Calm, not frozen:** one `useMotionLevel()` hook ("full" | "calm"). Calm keeps the hero video loop,
  fades, slower web drawing, the spider at half speed with at most 2 bugs, the trucks and orbits at
  half speed. It drops parallax, pointer tilt, the drop bounce, the tag bounce and the wing flicker.
- **Hero guard:** waits 2.5 s after the first frame, then takes the *median* frame time over 3 s. Above
  40 ms it first tries one cheaper step (dpr 1, no shadows, half the crowd), and only then falls
  back to video. Live 3D runs on landscape ≥ 900 px and on tablets ≥ 768 px (low tier).
  `gl.compile` runs while the poster shows, then a 700 ms crossfade.
- **One WebGL scene at a time** (`sceneArbiter`): the hero and the solar system take turns.
  dpr caps: 1.5 desktop, 1.25 tablets.
- **Billboard pop:** in live 3D the whole board, frame and lamps are the hit area. The board springs
  to 1.08 and moves 0.35 units forward, tilts ~3° toward the pointer, and gets a brighter wash,
  a ×2 LED chase, a red glow and the label. In video/poster mode an invisible hotspot button
  plus a flat billboard are mapped onto the video's board with a CSS homography. Hover, keyboard
  focus or tap triggers it (tap adds a bounce and settles after 1.6 s).
- **Phones:** the hero video was re-rendered zoomed out (board ≈ 70% of the frame; 374 kB MP4 /
  388 kB WebM). Headlines are ~12% smaller, section padding ~25% less, card padding ~15% less.
  The solar outer orbit fills ~80% of the width. Logos are ~55% of the stage. The web is denser
  and the stage shorter.
- **Speed:** idle prefetch of the logos and (desktop/tablet) the 3D chunk. Project switches take
  ≤ 450 ms and decode the next logo first. Listeners are passive.
  `content-visibility: auto` on Perspectives and Contact.
- **Errors:** every section has a boundary with a styled fallback and Retry (reloads if a code
  chunk failed). Vercel Speed Insights added; Web Analytics is ready behind `VITE_ENABLE_ANALYTICS=1`.
- **`npm run check`** = typecheck + build + Playwright smoke test (desktop, iPhone 13, 360×740).
