import { lazy, Suspense, useEffect, useState } from "react";
import DottedBackground from "../layout/DottedBackground";
import SectionHeader from "../layout/SectionHeader";
import SkillNavigation from "./SkillNavigation";
import SkillPanel from "./SkillPanel";
import RetryBoundary from "../layout/RetryBoundary";
import { sectionHeadings } from "../../data/site";
import { useNearViewport } from "../../hooks/useInView";
import { useSceneTurn } from "../../lib/sceneArbiter";
import { load3d } from "../../lib/load3d";

// 3D is a separate chunk (three.js stays out of the first paint). It starts
// downloading as soon as this section mounts — right after the page has
// loaded — so the orbit is ready by the time it comes into view.
const loadSolarSystem = () => load3d().then(() => import("./SolarSystem"));
const SolarSystem = lazy(loadSolarSystem);

/**
 * 02 / CAPABILITIES — "The orbit of ideas".
 * A Sun (Brand Strategy) plus exactly eight planets (skills), with a
 * synchronised rail, hover labels and a detail panel.
 */
export default function Capabilities() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // one WebGL scene at a time: the orbit renders only while it is the most
  // visible 3D scene (the live hero pauses meanwhile, and vice versa)
  const { ref, active } = useSceneTurn<HTMLElement>("solar");
  // the orbit renders once it is within ~600px of the screen
  const { ref: nearRef, near } = useNearViewport<HTMLDivElement>("600px");
  const copy = sectionHeadings.capabilities;

  // start fetching the orbit right away (it is just below the hero)
  useEffect(() => {
    void loadSolarSystem().catch(() => undefined);
  }, []);

  // Esc clears the selection
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  return (
    <section
      id="capabilities"
      ref={ref}
      aria-labelledby="capabilities-heading"
      className="on-ink relative min-h-[100svh] overflow-hidden bg-[#151515] text-[#F5F0E8]"
    >
      <DottedBackground tone="ink" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-[3.75rem] pt-[5.25rem] sm:px-8 sm:pb-20 sm:pt-28 lg:px-12 lg:pb-24 lg:pt-32">
        <SectionHeader
          id="capabilities"
          eyebrow={copy.eyebrow}
          title={copy.title}
          copy={copy.copy}
          hint={copy.hint}
          tone="ivory"
        />

        {/* phones/tablets: canvas → chip rail → inline card (stacked, nothing
            overlays the planets); lg: index rail left, orbit right */}
        <div className="mt-8 flex flex-col gap-4 lg:mt-14 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-stretch lg:gap-8">
          <div className="order-2 min-w-0 lg:order-none">
            <SkillNavigation
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
              onHover={setHoveredId}
            />
          </div>

          {/* the orbit fills everything right of the index, bleeding to the section edge */}
          <div ref={nearRef} className="relative order-1 -mx-5 h-[86vw] min-h-[290px] sm:-mx-8 sm:h-[56svh] sm:min-h-[320px] lg:order-none lg:-mr-12 lg:ml-0 lg:h-[82vh] lg:min-h-[620px] lg:w-[calc(100%+3rem)]">
            <RetryBoundary label="the orbit">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.45)]">
                    Loading orbit…
                  </p>
                </div>
              }
            >
              {near ? (
                <SolarSystem
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={setSelectedId}
                  onHover={setHoveredId}
                  active={active}
                />
              ) : null}
            </Suspense>
            </RetryBoundary>

            <div className="hidden lg:block">
              <SkillPanel selectedId={selectedId} onSelect={setSelectedId} variant="floating" />
            </div>

            <p className="pointer-events-none absolute bottom-1 left-5 sm:left-8 lg:left-1 font-display text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.35)] lg:bottom-3 lg:left-3">
              09 skills · one strategic centre
            </p>
          </div>

          <div className="order-3 lg:hidden">
            <SkillPanel selectedId={selectedId} onSelect={setSelectedId} variant="inline" />
          </div>
        </div>
      </div>
    </section>
  );
}
