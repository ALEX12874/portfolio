import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { allSkills } from "../../data/skills";

interface SkillPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * HTML skill panel (never in-canvas): number, title, description, category,
 * lime active dot, close control. Floating side panel on desktop, bottom sheet
 * on mobile. Focusable, role="dialog", aria-live.
 */
export default function SkillPanel({ selectedId, onSelect }: SkillPanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const skill = allSkills.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (skill) closeRef.current?.focus();
  }, [skill?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence mode="wait">
      {skill ? (
        <m.aside
          key={skill.id}
          role="dialog"
          aria-live="polite"
          aria-label={`${skill.title} — skill detail`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="pointer-events-auto fixed inset-x-4 bottom-4 z-40 rounded-xl border border-[rgba(245,240,232,0.15)] bg-[#151515] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] lg:absolute lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[22rem]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-[#D8FF63]"
                aria-hidden="true"
              />
              <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.6)]">
                {skill.number} / {skill.category}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => onSelect(null)}
              aria-label="Close skill detail"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(245,240,232,0.2)] text-[#F5F0E8] transition-colors duration-300 hover:border-[#E63843] hover:bg-[#E63843]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <h3 className="mt-4 font-display text-xl font-extrabold uppercase leading-tight tracking-tight text-[#F5F0E8]">
            {skill.title}
          </h3>

          <p className="mt-3 text-[0.95rem] leading-relaxed text-[rgba(245,240,232,0.72)]">
            {skill.description}
          </p>

          {"tag" in skill && skill.tag ? (
            <p className="mt-5 inline-block rounded-full border border-[#D8FF63] px-3 py-1 font-display text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#D8FF63]">
              {skill.tag}
            </p>
          ) : null}

          <p className="mt-5 border-t border-[rgba(245,240,232,0.12)] pt-4 text-[0.78rem] leading-relaxed text-[rgba(245,240,232,0.5)]">
            {skill.visualConcept}
          </p>
        </m.aside>
      ) : null}
    </AnimatePresence>
  );
}
