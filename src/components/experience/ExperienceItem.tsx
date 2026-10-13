import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Experience } from "../../data/experience";

interface ExperienceItemProps {
  experience: Experience;
  onOpen: (experience: Experience, trigger: HTMLElement) => void;
}

/**
 * Editorial row (no boxed card): number, company, role, domain, dates, arrow.
 * Hover shifts the row a few px, moves the arrow and draws a thin indicator
 * line in — the text itself stays stable.
 */
export default function ExperienceItem({ experience, onOpen }: ExperienceItemProps) {
  const rowRef = useRef<HTMLButtonElement | null>(null);

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => onOpen(experience, rowRef.current as HTMLElement)}
      aria-label={`${experience.company} — ${experience.role}: open details`}
      className="group relative block w-full border-b border-[rgba(245,240,232,0.14)] py-7 text-left transition-transform duration-500 ease-editorial hover:translate-x-2 sm:py-9"
    >
      {/* indicator line draws in on hover/focus */}
      <span
        className="absolute -bottom-px left-0 h-[2px] w-0 bg-[#E63843] transition-[width] duration-600 ease-editorial group-hover:w-full group-focus-visible:w-full"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 items-baseline gap-x-6 gap-y-3 sm:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)] lg:grid-cols-[3.5rem_minmax(0,1.5fr)_minmax(0,1.2fr)_auto]">
        <span className="font-display text-[0.72rem] font-bold tracking-[0.2em] text-[#E63843]">
          {experience.number}
        </span>

        <span className="block">
          <span className="block font-display text-[clamp(1.25rem,2.4vw,1.9rem)] font-extrabold uppercase leading-tight tracking-tight text-[#F5F0E8] transition-colors duration-400 group-hover:text-[#D8FF63]">
            {experience.company}
          </span>
          <span className="mt-1.5 block text-[0.95rem] font-semibold text-[rgba(245,240,232,0.8)]">
            {experience.role}
          </span>
        </span>

        <span className="block">
          <span className="block text-[0.85rem] leading-relaxed text-[rgba(245,240,232,0.6)]">
            {experience.domain}
          </span>
          <span className="mt-1 block font-display text-[0.74rem] font-bold uppercase tracking-[0.14em] text-[rgba(245,240,232,0.85)]">
            {experience.duration}
          </span>
        </span>

        <span className="hidden self-center justify-self-end lg:block">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(245,240,232,0.25)] text-[#F5F0E8] transition-all duration-400 ease-editorial group-hover:border-[#E63843] group-hover:bg-[#E63843] group-hover:translate-x-1">
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
        </span>
      </div>
    </button>
  );
}
