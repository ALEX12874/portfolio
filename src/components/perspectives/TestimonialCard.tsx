import { m } from "framer-motion";
import { useReveal } from "../../hooks/useReveal";
import type { Testimonial } from "../../data/testimonials";
import LinkedInProfileLink from "./LinkedInProfileLink";

const EASE = [0.22, 1, 0.36, 1] as const;

interface TestimonialCardProps {
  testimonial: Testimonial;
  index: number;
}

/**
 * Editorial quote card: red quote mark, verbatim quote (never truncated),
 * name in bold ink, context label, LinkedIn icon at the bottom-right inside a
 * ≥ 40×40 hit area. The card itself is not a link.
 */
export default function TestimonialCard({ testimonial, index }: TestimonialCardProps) {
  const { name, quote, context, linkedin, tone } = testimonial;
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <m.article
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.65, delay: (index % 3) * 0.09, ease: EASE }}
      className="group relative flex h-full flex-col rounded-xl border border-[rgba(21,21,21,0.1)] bg-[rgba(245,240,232,0.75)] p-6 shadow-[0_6px_20px_rgba(21,21,21,0.05)] transition-all duration-500 ease-editorial hover:-translate-y-1 hover:border-[rgba(21,21,21,0.18)] hover:shadow-[0_18px_40px_rgba(21,21,21,0.12)] sm:p-7"
    >
      {/* thin detail line appears on hover */}
      <span
        className={`absolute left-6 top-0 h-[3px] w-0 transition-[width] duration-600 ease-editorial group-hover:w-[calc(100%-3rem)] ${
          tone === "calm" || tone === "dots" || tone === "structured" ? "bg-[#D8FF63]" : "bg-[#E63843]"
        }`}
        aria-hidden="true"
      />

      <span
        className="block font-display text-[3.4rem] font-black leading-[0.6] text-[#E63843]"
        aria-hidden="true"
      >
        “
      </span>

      <p className="mt-4 text-[1.02rem] leading-relaxed text-[rgba(21,21,21,0.85)]">{quote}</p>

      <div className="mt-7 flex flex-col gap-1 border-t border-[rgba(21,21,21,0.1)] pt-5">
        {context ? (
          <span className="mb-1 inline-block w-fit font-display text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[rgba(21,21,21,0.55)]">
            <span className={tone === "playful" ? "context-squiggle" : undefined}>{context}</span>
          </span>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 pt-2">
          <div>
            <p className="font-display text-[1.02rem] font-extrabold uppercase tracking-tight text-[#151515]">
              {name}
            </p>
            <p className="text-[0.8rem] text-[rgba(21,21,21,0.55)]">LinkedIn</p>
          </div>

          <div className="relative">
            {/* three lime dots that light up on hover */}
            {tone === "dots" ? (
              <span className="absolute -top-3 right-1 flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="dot-light h-1.5 w-1.5 rounded-full bg-[rgba(21,21,21,0.2)]"
                    style={{ transitionDelay: `${i * 90}ms` }}
                  />
                ))}
              </span>
            ) : null}

            <LinkedInProfileLink name={name} href={linkedin} />
          </div>
        </div>
      </div>
    </m.article>
  );
}
