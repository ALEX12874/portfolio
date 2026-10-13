import { lazy, Suspense, useEffect, useState } from "react";
import DottedBackground from "../layout/DottedBackground";
import SectionHeader from "../layout/SectionHeader";
import SkillNavigation from "./SkillNavigation";
import SkillPanel from "./SkillPanel";
import { sectionHeadings } from "../../data/site";
import { useActiveInView } from "../../hooks/useInView";

// 3D is lazy-loaded so three.js stays out of the first paint
const SolarSystem = lazy(() => import("./SolarSystem"));

/**
 * 02 / CAPABILITIES — "The orbit of ideas".
 * A Sun (Brand Strategy) plus exactly eight planets (skills), with a
 * synchronised rail, hover labels and a detail panel.
 */
export default function Capabilities() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { ref, active } = useActiveInView<HTMLElement>(0.04);
  const copy = sectionHeadings.capabilities;

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

      <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-20 pt-28 sm:px-8 lg:px-12 lg:pb-24 lg:pt-32">
        <SectionHeader
          id="capabilities"
          eyebrow={copy.eyebrow}
          title={copy.title}
          copy={copy.copy}
          hint={copy.hint}
          tone="ivory"
        />

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-stretch lg:gap-8">
          <SkillNavigation
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
            onHover={setHoveredId}
          />

          {/* the orbit fills everything right of the index, bleeding to the section edge */}
          <div className="relative h-[48vh] min-h-[340px] w-full lg:-mr-12 lg:h-[82vh] lg:min-h-[620px] lg:w-[calc(100%+3rem)]">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.45)]">
                    Loading orbit…
                  </p>
                </div>
              }
            >
              <SolarSystem
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={setSelectedId}
                onHover={setHoveredId}
                active={active}
              />
            </Suspense>

            <SkillPanel selectedId={selectedId} onSelect={setSelectedId} />

            <p className="pointer-events-none absolute bottom-1 left-1 font-display text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.35)] lg:bottom-3 lg:left-3">
              09 skills · one strategic centre
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
