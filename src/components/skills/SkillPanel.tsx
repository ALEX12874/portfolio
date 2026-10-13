import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { allSkills } from "../../data/skills";

interface SkillPanelProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /**
   * floating: desktop card over the canvas (bottom-right).
   * inline: phones / tablets — a compact card in normal flow under the chip
   * rail; it never covers the canvas.
   */
  variant?: "floating" | "inline";
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * HTML skill panel (never in-canvas): number, title, description, category,
 * lime active dot, close control. role="dialog", aria-live.
 */
export default function SkillPanel({ selectedId, onSelect, variant = "floating" }: SkillPanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const skill = allSkills.find((s) => s.id === selectedId) ?? null;
  const [expanded, setExpanded] = useState(false);
  const touchY = useRef<number | null>(null);
  const inline = variant === "inline";

  useEffect(() => {
    setExpanded(false);
    // move focus without jumping the page
    if (skill) closeRef.current?.focus({ preventScroll: true });
  }, [skill?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence mode="wait">
      {skill ? (
        <m.aside
          key={skill.id}
          role="dialog"
          aria-live="polite"
          aria-label={`${skill.title} — skill detail`}
          initial={{ opacity: 0, y: inline ? 10 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: inline ? 6 : 10 }}
          transition={{ duration: inline ? 0.3 : 0.45, ease: EASE }}
          // swipe down to dismiss (inline card)
          onTouchStart={(e) => {
            if (inline) touchY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (!inline || touchY.current === null) return;
            const dy = e.changedTouches[0].clientY - touchY.current;
            touchY.current = null;
            if (dy > 60) onSelect(null);
          }}
          className={
            inline
              ? "max-h-[30svh] overflow-y-auto rounded-xl border border-[rgba(245,240,232,0.15)] bg-[#1C1C1C] p-4"
              : "pointer-events-auto absolute bottom-6 right-6 z-40 w-[22rem] rounded-xl border border-[rgba(245,240,232,0.15)] bg-[#151515] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#D8FF63]" aria-hidden="true" />
              <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.6)]">
                {skill.number} / {skill.category}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => onSelect(null)}
              aria-label="Close skill detail"
              className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[rgba(245,240,232,0.2)] text-[#F5F0E8] transition-colors duration-300 hover:border-[#E63843] hover:bg-[#E63843] active:bg-[#E63843] ${
                inline ? "-mr-1 -mt-1 h-11 w-11" : "h-9 w-9"
              }`}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <h3
            className={`font-display font-extrabold uppercase leading-tight tracking-tight text-[#F5F0E8] ${
              inline ? "mt-1 line-clamp-2 text-lg" : "mt-4 text-xl"
            }`}
          >
            {skill.title}
          </h3>

          <p
            className={`mt-2 leading-relaxed text-[rgba(245,240,232,0.72)] ${
              inline ? `text-base ${expanded ? "" : "line-clamp-3"}` : "mt-3 text-[0.95rem]"
            }`}
          >
            {skill.description}
          </p>
          {inline && skill.description.length > 110 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-1 min-h-[44px] font-display text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#D8FF63]"
            >
              {expanded ? "Less" : "More"}
            </button>
          ) : null}

          {!inline && "tag" in skill && skill.tag ? (
            <p className="mt-5 inline-block rounded-full border border-[#D8FF63] px-3 py-1 font-display text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#D8FF63]">
              {skill.tag}
            </p>
          ) : null}

          {!inline ? (
            <p className="mt-5 border-t border-[rgba(245,240,232,0.12)] pt-4 text-[0.78rem] leading-relaxed text-[rgba(245,240,232,0.5)]">
              {skill.visualConcept}
            </p>
          ) : null}
        </m.aside>
      ) : null}
    </AnimatePresence>
  );
}
