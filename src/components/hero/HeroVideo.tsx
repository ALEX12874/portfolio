import { useEffect, useRef, useState } from "react";
import wideMp4 from "../../assets/hero/hero-wide.mp4";
import wideWebm from "../../assets/hero/hero-wide.webm";
import widePoster from "../../assets/hero/hero-wide.webp";
import phoneMp4 from "../../assets/hero/hero-phone.mp4";
import phoneWebm from "../../assets/hero/hero-phone.webm";
import phonePoster from "../../assets/hero/hero-phone.webp";
import { heroHotspot } from "../../data/heroHotspot";
import { assets } from "../../data/assets";
import { framePointToStage, mul, squareToQuad, toMatrix3d, type M3 } from "./billboardPop";

const SOURCES = {
  wide: { mp4: wideMp4, webm: wideWebm, poster: widePoster, width: 1280, height: 1024 },
  phone: { mp4: phoneMp4, webm: phoneWebm, poster: phonePoster, width: 960, height: 864 },
} as const;

type Variant = keyof typeof SOURCES;
type Fit = "contain" | "cover";

/** Phone composition below 900px or in portrait; wide otherwise. */
function pickVariant(): Variant {
  if (typeof window === "undefined") return "wide";
  return window.innerWidth < 900 || window.innerHeight > window.innerWidth ? "phone" : "wide";
}

/* ------------------------------------------------------- billboard pop */

/** The pop layer is drawn at this size (1 px = 0.01 scene units). */
const BOARD_W = 1680;
const BOARD_H = 576;
const POP_SCALE = 1.08;
/** Spring: ~350 ms in with ~3% overshoot; a tap adds a tiny extra bounce. */
const SPRING_IN = { k: 240, c: 23 };
const SPRING_TAP = { k: 300, c: 17 };
const SPRING_OUT = { k: 150, c: 21 };
const TAP_HOLD_MS = 1600;
const LABEL = "Outdoor advertising / Brand attention";

interface Spring {
  x: number;
  v: number;
}

/**
 * Hotspot over the video's billboard: hover (desktop), focus (keyboard) or
 * tap (phone) pops a flat copy of the billboard that is mapped exactly onto
 * the board in the video with a CSS homography — same object-fit and
 * position math as the <video> — so it lines up at every screen size.
 */
function BillboardPop({ variant, fit }: { variant: Variant; fit: Fit }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [on, setOn] = useState(false);
  const [tapped, setTapped] = useState(false);
  const anim = useRef({ s: { x: 1, v: 0 } as Spring, raf: 0, last: 0 });
  const tapTimer = useRef(0);
  // what the visitor used last: focus only pops the board for keyboard users
  // (a tap focuses the button too, and the tap's own timer must settle it)
  const lastInput = useRef<"key" | "pointer">("pointer");
  // touch browsers fire a synthetic "mouse" hover after a tap (iOS sticky
  // hover) that never leaves again: hover only counts on real hover devices,
  // and never right after a touch
  const lastTouch = useRef(-Infinity);
  const canHover = useRef(true);
  useEffect(() => {
    canHover.current = window.matchMedia("(hover: hover)").matches;
    const onKey = () => {
      lastInput.current = "key";
    };
    const onPointer = (e: PointerEvent) => {
      lastInput.current = "pointer";
      if (e.pointerType === "touch") lastTouch.current = performance.now();
    };
    window.addEventListener("keydown", onKey, { capture: true, passive: true });
    window.addEventListener("pointerdown", onPointer, { capture: true, passive: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("pointerdown", onPointer, { capture: true });
    };
  }, []);
  const hot = heroHotspot[variant];
  // the artwork is fetched only after the page has loaded (or on the first
  // interaction), so it never competes with the poster / fonts (LCP)
  const [art, setArt] = useState(false);
  useEffect(() => {
    if (art) return undefined;
    let t = 0;
    const later = () => {
      t = window.setTimeout(() => setArt(true), 1200);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      window.clearTimeout(t);
    };
  }, [art]);

  // track the stage size (the video box) — after paint, never before it
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const read = () => {
      const r = node.getBoundingClientRect();
      setBox((b) => (b && b.width === r.width && b.height === r.height ? b : { width: r.width, height: r.height }));
    };
    read();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", read);
      return () => window.removeEventListener("resize", read);
    }
    const ro = new ResizeObserver(read);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // the quad in stage pixels
  const quad = box
    ? (hot.corners.map((c) => framePointToStage(c, hot, box, fit)) as [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ])
    : null;

  // spring-driven transform: homography · scale about the board centre
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !quad) return undefined;
    const H = mul(squareToQuad(quad), [1 / BOARD_W, 0, 0, 0, 1 / BOARD_H, 0, 0, 0, 1]);
    const lift = Math.max(4, (quad[3][1] - quad[0][1]) * 0.06);
    const a = anim.current;
    const target = on ? POP_SCALE : 1;
    const spring = on ? (tapped ? SPRING_TAP : SPRING_IN) : SPRING_OUT;

    const apply = () => {
      const s = a.s.x;
      const t = (s - 1) / (POP_SCALE - 1); // 0 at rest → 1 popped
      const cx = BOARD_W / 2;
      const cy = BOARD_H / 2;
      const P: M3 = [s, 0, cx * (1 - s), 0, s, cy * (1 - s), 0, 0, 1];
      const L: M3 = [1, 0, 0, 0, 1, -lift * t, 0, 0, 1];
      layer.style.transform = toMatrix3d(mul(L, mul(H, P)));
      layer.style.opacity = t > 0.002 || on ? "1" : "0";
      layer.style.setProperty("--pop", String(Math.max(0, Math.min(1.05, t))));
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - (a.last || now)) / 1000) || 0.016;
      a.last = now;
      a.s.v += (spring.k * (target - a.s.x) - spring.c * a.s.v) * dt;
      a.s.x += a.s.v * dt;
      apply();
      if (Math.abs(target - a.s.x) > 0.0005 || Math.abs(a.s.v) > 0.0005) {
        a.raf = requestAnimationFrame(tick);
      } else {
        a.s.x = target;
        a.s.v = 0;
        a.raf = 0;
        a.last = 0;
        apply();
      }
    };
    cancelAnimationFrame(a.raf);
    a.last = 0;
    a.raf = requestAnimationFrame(tick);
    apply();
    return () => cancelAnimationFrame(a.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, tapped, art, box?.width, box?.height, variant, fit]);

  useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  const tap = () => {
    setArt(true);
    setTapped(true);
    setOn(true);
    window.clearTimeout(tapTimer.current);
    // auto-settle after 1.6 s
    tapTimer.current = window.setTimeout(() => {
      setOn(false);
      setTapped(false);
    }, TAP_HOLD_MS);
  };

  const xs = quad?.map((p) => p[0]) ?? [0];
  const ys = quad?.map((p) => p[1]) ?? [0];
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left;
  const height = Math.max(...ys) - top;
  const labelX = quad ? (quad[0][0] + quad[1][0]) / 2 : 0;
  const labelY = top;

  return (
    <div ref={stageRef} className="pointer-events-none absolute inset-0">
      {/* the flat billboard, homography-mapped onto the board in the video;
          mounted only after load / first interaction, so the first paint
          (the poster, our LCP) carries none of its layers */}
      {art ? (
        <div
          ref={layerRef}
          aria-hidden="true"
          className="hero-pop"
          style={{ width: BOARD_W, height: BOARD_H, opacity: 0 }}
        >
          <div className="hero-pop__bezel">
            <span className="hero-pop__led hero-pop__led--top" />
            <span className="hero-pop__led hero-pop__led--bottom" />
            <span className="hero-pop__led hero-pop__led--left" />
            <span className="hero-pop__led hero-pop__led--right" />
            <div className="hero-pop__art" style={{ backgroundImage: `url(${assets.billboard})` }} />
          </div>
        </div>
      ) : null}

      {/* small label above the board (never over the artwork) */}
      {quad ? (
        <span
          aria-hidden="true"
          className={`hero-pop__label ${on ? "is-on" : ""}`}
          style={{ left: labelX, top: labelY }}
        >
          {LABEL}
        </span>
      ) : null}

      {/* invisible hotspot over the board */}
      {quad ? (
        <button
          type="button"
          aria-label="Outdoor advertising — brand attention"
          data-billboard-hotspot=""
          data-popped={on ? "1" : "0"}
          className="hero-hotspot pointer-events-auto absolute"
          style={{ left, top, width, height }}
          onPointerEnter={(e) => {
            setArt(true);
            if (e.pointerType === "touch") return;
            if (!canHover.current || performance.now() - lastTouch.current < 1000) return;
            setOn(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "touch" || !canHover.current) return;
            setOn(false);
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "touch") tap();
          }}
          onFocus={() => {
            setArt(true);
            if (lastInput.current === "key") setOn(true);
          }}
          onBlur={() => {
            if (lastInput.current === "key") setOn(false);
          }}
          onClick={(e) => {
            // keyboard Enter/Space (detail 0) gives the tap bounce too
            if (e.detail === 0) tap();
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- video */

/** The poster is this frame of the loop (scripts/render-hero.mjs POSTER_T). */
const POSTER_T = 3;
const ALT = "3D street scene: a large billboard reading IT'S ALL MARKETING. above a crowd and passing cars";

/**
 * Pre-rendered loop of the live 3D hero (scripts/render-hero.mjs), so every
 * device gets the same scene.
 *
 * One <video> element does both jobs: its poster (a real frame of the loop,
 * preloaded from index.html) is the first paint and the page's LCP, and the
 * same element later plays the loop. Because playback starts in the element
 * that is already the LCP, it never registers as a new, later LCP. The video
 * bytes are attached only after the page has loaded; playback starts on the
 * poster frame, so the hand-over is seamless. Blocked autoplay (iOS Low
 * Power Mode) simply keeps the poster. Pauses off-screen. Calm motion still
 * plays the (slow, camera-still) loop.
 *
 * `still`: poster only (used while the live 3D scene warms up on top).
 */
export default function HeroVideo({ fit = "contain", still = false }: { fit?: Fit; still?: boolean }) {
  const [variant, setVariant] = useState<Variant>(pickVariant);
  // attach the video only after the page has loaded, so its bytes never
  // compete with the poster (LCP) or the app's own scripts
  const [attach, setAttach] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);

  // switch composition on resize / rotation
  useEffect(() => {
    const onResize = () => setVariant(pickVariant());
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    let t = 0;
    const later = () => {
      t = window.setTimeout(() => setAttach(true), 400);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      window.clearTimeout(t);
    };
  }, []);

  // play only while visible; retry after the first user gesture if blocked
  useEffect(() => {
    const v = video.current;
    const node = wrap.current;
    if (!v || !node || still || !attach) return undefined;

    // start on the poster frame, so poster → moving video is seamless
    const toPosterFrame = () => {
      if (v.currentTime < 0.05 && v.duration > POSTER_T) v.currentTime = POSTER_T;
    };
    v.addEventListener("loadedmetadata", toPosterFrame, { once: true });

    let visible = true;
    const tryPlay = () => {
      if (!visible) return;
      const p = v.play();
      if (p) p.catch(() => undefined);
    };
    const onGesture = () => tryPlay();
    const gestures = ["touchstart", "pointerdown", "scroll", "keydown"] as const;
    gestures.forEach((g) => window.addEventListener(g, onGesture, { passive: true, once: true }));

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              if (visible) tryPlay();
              else v.pause();
            },
            { threshold: 0 }
          )
        : null;
    io?.observe(node);
    tryPlay();

    return () => {
      io?.disconnect();
      v.removeEventListener("loadedmetadata", toPosterFrame);
      gestures.forEach((g) => window.removeEventListener(g, onGesture));
    };
  }, [variant, still, attach]);

  const src = SOURCES[variant];
  const media = `absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`;

  return (
    <div ref={wrap} className="relative h-full w-full" style={{ background: "#F5F0E8" }}>
      {/* the poster is real content: described here, beside the hotspot */}
      <div role="img" aria-label={ALT} className="absolute inset-0">
      <video
        key={variant}
        ref={video}
        className={media}
        style={{ objectPosition: "center bottom" }}
        width={src.width}
        height={src.height}
        muted
        loop
        playsInline
        // nothing but the poster until the page has loaded
        preload="none"
        poster={src.poster}
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
      >
        {still || !attach ? null : (
          <>
            <source src={src.webm} type="video/webm" />
            <source src={src.mp4} type="video/mp4" />
          </>
        )}
      </video>
      </div>
      <BillboardPop key={variant} variant={variant} fit={fit} />
    </div>
  );
}
