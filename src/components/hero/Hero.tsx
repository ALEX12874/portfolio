import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import DottedBackground from "../layout/DottedBackground";
import HeroText from "./HeroText";
import HeroVideo from "./HeroVideo";
import SceneErrorBoundary from "../layout/SceneErrorBoundary";
import { useWebGLSupport } from "../../hooks/useWebGLSupport";
import { usePrefersReducedMotion } from "../../hooks/useReducedMotion";
import { useActiveInView } from "../../hooks/useInView";

const Scene = lazy(() => import("./HeroScene/Scene"));

/**
 * Remembered for the rest of the page's life (not persisted): once a device
 * proved too slow (or lost its WebGL context) it stays on the video.
 */
let liveSceneFailed = false;

/** Live 3D only on wide landscape viewports; everything else plays the loop. */
function useWideLandscape(): boolean {
  const query = "(min-width: 900px) and (orientation: landscape)";
  const [match, setMatch] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return match;
}

function SceneStage() {
  const reduced = usePrefersReducedMotion();
  const wide = useWideLandscape();
  // only probe WebGL where the live scene could actually run
  const webgl = useWebGLSupport(wide && !reduced);
  const { ref, active } = useActiveInView<HTMLDivElement>(0.05);
  const [failed, setFailed] = useState(liveSceneFailed);
  const touch = useRef(false);

  useEffect(() => {
    touch.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  const onFallback = useCallback(() => {
    if (import.meta.env.DEV) console.info("[hero] live scene unavailable — showing the video loop");
    liveSceneFailed = true;
    setFailed(true);
  }, []);

  const useLive = webgl && !reduced && wide && !failed;
  const video = <HeroVideo />;

  return (
    <div ref={ref} data-hero-stage="" className="hero-stage relative h-full w-full">
      {/* no entrance fade: the poster is the LCP and must paint at once */}
      <div className="h-full w-full">
        {useLive ? (
          <SceneErrorBoundary fallback={video} onError={onFallback}>
            {/* the video poster holds the stage while the 3D chunk loads */}
            <Suspense fallback={video}>
              <Scene active={active} parallax={!touch.current} onLowFps={onFallback} />
            </Suspense>
          </SceneErrorBoundary>
        ) : (
          video
        )}
      </div>
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

      <div className="hero-grid relative mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-8 px-5 pb-8 pt-24 sm:px-8 sm:pt-28 lg:min-h-[100svh] lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)] lg:gap-6 lg:px-12 lg:pb-10 lg:pt-24">
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
