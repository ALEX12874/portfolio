import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import DottedBackground from "../layout/DottedBackground";
import HeroText from "./HeroText";
import HeroFallback25D from "./HeroFallback25D";
import SceneErrorBoundary from "../layout/SceneErrorBoundary";
import { useWebGLSupport } from "../../hooks/useWebGLSupport";
import { usePrefersReducedMotion } from "../../hooks/useReducedMotion";
import { useActiveInView } from "../../hooks/useInView";
import { useIsMobile } from "../../hooks/useIsMobile";

const Scene = lazy(() => import("./HeroScene/Scene"));

/**
 * Remembered for the rest of the page's life (not persisted): once a device
 * proved too slow for the 3D scene it stays on the 2.5D fallback.
 */
let lowFpsDetected = false;

function SceneStage() {
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const { ref, active } = useActiveInView<HTMLDivElement>(0.05);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(lowFpsDetected);
  const touch = useRef(false);

  useEffect(() => {
    touch.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  useEffect(() => {
    if (active) {
      const t = window.setTimeout(() => setReady(true), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [active]);

  const onLowFps = useCallback(() => {
    if (import.meta.env.DEV) console.info("[hero] frame time too high — switching to the 2.5D scene");
    lowFpsDetected = true;
    setSlow(true);
  }, []);

  // 3D whenever WebGL works, motion is allowed and the viewport is ≥ 768px;
  // the scene itself measures frame time and bails out on slow devices.
  const use3d = webgl && !reduced && !mobile && !slow;

  return (
    <div
      ref={ref}
      data-hero-stage=""
      className="relative h-full w-full bg-transparent"
      style={{
        // soft left-edge fade into the text column — no hard cut edge
        maskImage: "linear-gradient(to right, transparent 0, #000 14%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 14%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="h-full w-full"
      >
        {use3d ? (
          ready ? (
            <SceneErrorBoundary fallback={<HeroFallback25D />}>
              <Suspense fallback={<div className="h-full w-full" aria-hidden="true" />}>
                <Scene active={active} parallax={!touch.current && !reduced} onLowFps={onLowFps} />
              </Suspense>
            </SceneErrorBoundary>
          ) : (
            <div className="h-full w-full" aria-hidden="true" />
          )
        ) : (
          <HeroFallback25D />
        )}
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative overflow-hidden bg-[#F5F0E8]"
    >
      <DottedBackground tone="ivory" />

      <div className="relative mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-28 sm:px-8 lg:min-h-[100svh] lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)] lg:gap-6 lg:px-12 lg:pb-10 lg:pt-24">
        <HeroText />
        {/* second grid column stays reserved for the scene on lg */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>

      {/* scene stage: stacked under the copy below 1024px; on lg it is
          right-anchored at 52vw and full hero height (starts at 48vw, so it
          never reaches the copy column — see .hero-copy) */}
      <div className="relative h-[58vw] max-h-[620px] min-h-[300px] w-full lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:max-h-none lg:w-[52vw]">
        <SceneStage />
      </div>
    </section>
  );
}
