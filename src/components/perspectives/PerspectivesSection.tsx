import { useEffect, useRef, useState } from "react";
import DottedBackground from "../layout/DottedBackground";
import SectionHeader from "../layout/SectionHeader";
import TestimonialCard from "./TestimonialCard";
import { testimonials } from "../../data/testimonials";
import { sectionHeadings } from "../../data/site";

/**
 * 06 / PEOPLE & PERSPECTIVES — staggered editorial grid on ivory.
 * Six verbatim quotes, each with its own LinkedIn mapping. On phones the
 * cards become a swipeable row (snap, next card peeking, dots), so the
 * section reads in one screen instead of six stacked cards.
 */
export default function PerspectivesSection() {
  const copy = sectionHeadings.perspectives;
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(0);

  // which card is in view (phones only; rAF-throttled, passive)
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const cards = Array.from(row.children) as HTMLElement[];
      const left = row.scrollLeft;
      let best = 0;
      let bestD = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft - row.offsetLeft - left - parseFloat(getComputedStyle(row).paddingLeft || "0"));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setCurrent(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      row.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (i: number) => {
    const row = rowRef.current;
    const card = row?.children[i] as HTMLElement | undefined;
    if (!row || !card) return;
    row.scrollTo({ left: card.offsetLeft - row.offsetLeft - parseFloat(getComputedStyle(row).paddingLeft || "0"), behavior: "smooth" });
  };

  return (
    <section
      id="perspectives"
      aria-labelledby="perspectives-heading"
      className="relative bg-[#F5F0E8] text-[#151515]"
    >
      <DottedBackground tone="ivory" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-[5.25rem] pt-[5.25rem] sm:px-8 sm:pb-28 sm:pt-28 lg:px-12 lg:pt-32">
        <SectionHeader
          id="perspectives"
          eyebrow={copy.eyebrow}
          title={copy.title}
          copy={copy.copy}
          tone="ink"
        />

        <div
          ref={rowRef}
          role="list"
          aria-label="Testimonials"
          className="perspectives-row -mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 lg:gap-7"
        >
          {testimonials.map((t, i) => (
            <div key={t.id} role="listitem" className="w-[84%] shrink-0 snap-start sm:w-auto">
              <TestimonialCard testimonial={t} index={i} />
            </div>
          ))}
        </div>

        {/* phones: where you are in the row + swipe hint */}
        <div className="mt-4 flex items-center justify-between sm:hidden">
          <div className="flex gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show testimonial ${i + 1} of ${testimonials.length}`}
                aria-current={current === i ? "true" : undefined}
                className="flex h-11 w-7 items-center justify-center"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    current === i ? "w-5 bg-[#E63843]" : "w-2 bg-[rgba(21,21,21,0.25)]"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[rgba(21,21,21,0.55)]">
            {`${current + 1} / ${testimonials.length} · swipe`}
          </p>
        </div>
      </div>
    </section>
  );
}
