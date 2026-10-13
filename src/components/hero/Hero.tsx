import { Suspense, lazy, useEffect, useRef, useState } from "react";
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

const EASE = [0.22, 1, 0.36, 1] as const;

/** Low-power heuristic: ≤ 4 logical cores falls back to the 2.5D scene. */
function isLowPower(): boolean {
  const cores = navigator.hardwareConcurrency;
  return typeof cores === "number" && cores > 0 && cores <= 4;
}

function SceneStage() {
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const { ref, active } = useActiveInView<HTMLDivElement>(0.05);
  const [ready, setReady] = useState(false);
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

  const use3d = webgl && !reduced && !mobile && !isLowPower();

  return (
    <div
      ref={ref}
      className="relative h-full w-full"
      style={{
        // soft left-edge fade into the text column — no hard cut edge
        maskImage: "linear-gradient(to right, transparent 0, #000 14%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 14%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, rotateX: 6, y: 18 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 1, delay: 0.45, ease: EASE }}
        className="h-full w-full"
        style={{ transformPerspective: 1400 }}
      >
        {use3d ? (
          ready ? (
            <SceneErrorBoundary fallback={<HeroFallback25D />}>
              <Suspense fallback={<HeroFallback25D />}>
                <Scene active={active} parallax={!touch.current && !reduced} />
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

      <div className="relative mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-8 px-5 pb-16 pt-28 sm:px-8 lg:min-h-[100svh] lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-6 lg:px-12 lg:pb-10 lg:pt-24">
        <HeroText />
        {/* second grid column stays reserved for the text balance on lg */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>

      {/* full-bleed scene stage: bottom of the section on mobile, absolute
          right 58vw × full hero height on desktop (right/top/bottom edges) */}
      <div className="relative h-[58vw] max-h-[620px] min-h-[300px] w-full lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:max-h-none lg:w-[58vw]">
        <SceneStage />
      </div>
    </section>
  );
}
