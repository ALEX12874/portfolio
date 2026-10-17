import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import DottedBackground from "../layout/DottedBackground";
import HeroText from "./HeroText";
import HeroVideo from "./HeroVideo";
import SceneErrorBoundary from "../layout/SceneErrorBoundary";
import { useWebGLSupport } from "../../hooks/useWebGLSupport";
import { useMotionLevel } from "../../hooks/useMotionLevel";
import { useSceneTurn } from "../../lib/sceneArbiter";
import type { SceneTier } from "./HeroScene/Scene";

const Scene = lazy(() => import("./HeroScene/Scene"));

/**
 * Remembered for the rest of the page's life (not persisted): once a device
 * proved too slow (or lost its WebGL context) it stays on the video.
 */
let liveSceneFailed = false;

const HIGH = "(min-width: 900px) and (orientation: landscape)";
const TABLET = "(min-width: 768px)";

/**
 * Where the live 3D hero may run: "high" on landscape screens ≥ 900 px,
 * "low" on tablets ≥ 768 px; null (video) on phones.
 */
export function liveTierNow(): SceneTier | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  if (window.matchMedia(HIGH).matches) return "high";
  if (window.matchMedia(TABLET).matches) return "low";
  return null;
}

function useLiveTier(): SceneTier | null {
  const [tier, setTier] = useState<SceneTier | null>(liveTierNow);
  useEffect(() => {
    const queries = [window.matchMedia(HIGH), window.matchMedia(TABLET)];
    const update = () => setTier(liveTierNow());
    update();
    queries.forEach((q) => q.addEventListener("change", update));
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);
  return tier;
}

/** How long the poster ↔ live-scene crossfade takes. */
const FADE_MS = 700;

function SceneStage() {
  const calm = useMotionLevel() === "calm";
  const tier = useLiveTier();
  // only probe WebGL where the live scene could actually run
  const webgl = useWebGLSupport(!!tier && !calm);
  const [failed, setFailed] = useState(liveSceneFailed);
  const [ready, setReady] = useState(false);
  const [videoGone, setVideoGone] = useState(false);
  const touch = useRef(false);

  useEffect(() => {
    touch.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  const onFallback = useCallback(() => {
    if (import.meta.env.DEV) console.info("[hero] live scene unavailable — showing the video loop");
    liveSceneFailed = true;
    setFailed(true);
    setReady(false);
  }, []);
  const onReady = useCallback(() => setReady(true), []);

  // calm motion keeps the gentle video loop (no camera moves or parallax)
  const useLive = webgl && !calm && !!tier && !failed;
  const live = useLive && ready;
  // one WebGL scene at a time: the hero only renders while it is the most
  // visible scene (the solar system takes over further down)
  const { ref, active } = useSceneTurn<HTMLDivElement>("hero", useLive);

  // once the live scene has faded in, drop the poster/video layer entirely
  useEffect(() => {
    if (!live) {
      setVideoGone(false);
      return undefined;
    }
    const t = window.setTimeout(() => setVideoGone(true), FADE_MS + 100);
    return () => window.clearTimeout(t);
  }, [live]);

  return (
    <div ref={ref} data-hero-stage="" data-hero-mode={live ? "live" : "video"} className="hero-stage relative h-full w-full">
      {/* poster (the LCP) / video loop — under the live scene until it is ready */}
      {videoGone ? null : (
        <div
          className="absolute inset-0"
          style={{ opacity: live ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
        >
          {/* while the 3D scene warms up the poster stays still (no video download) */}
          <HeroVideo still={useLive} />
        </div>
      )}
      {useLive ? (
        <div
          className="absolute inset-0"
          style={{ opacity: live ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
        >
          <SceneErrorBoundary fallback={null} onError={onFallback}>
            <Suspense fallback={null}>
              <Scene
                active={active}
                tier={tier ?? "low"}
                parallax={!touch.current}
                onLowFps={onFallback}
                onReady={onReady}
              />
            </Suspense>
          </SceneErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="hero relative overflow-hidden bg-[#F5F0E8]"
    >
      <DottedBackground tone="ivory" />

      <div className="hero-grid relative mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-8 px-5 pb-1 pt-[5.25rem] sm:px-8 sm:pb-8 sm:pt-28 lg:min-h-[100svh] lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)] lg:gap-6 lg:px-12 lg:pb-10 lg:pt-24">
        <HeroText />
        {/* second grid column stays reserved for the scene on lg */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>

      {/* scene band: full-bleed under the copy on phones / tablet portrait
          (fixed aspect, so nothing shifts); right-anchored 52vw, full height
          from lg and on short landscape phones */}
      <div className="hero-band relative w-full">
        <SceneStage />
      </div>
    </section>
  );
}
