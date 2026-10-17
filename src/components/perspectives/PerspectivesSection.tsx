import DottedBackground from "../layout/DottedBackground";
import SectionHeader from "../layout/SectionHeader";
import TestimonialCard from "./TestimonialCard";
import { testimonials } from "../../data/testimonials";
import { sectionHeadings } from "../../data/site";

/**
 * 06 / PEOPLE & PERSPECTIVES — staggered editorial grid on ivory.
 * Six verbatim quotes, each with its own LinkedIn mapping.
 */
export default function PerspectivesSection() {
  const copy = sectionHeadings.perspectives;

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

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.id} testimonial={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
