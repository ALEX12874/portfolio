import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { projects } from "../../data/projects";
import { lockScroll } from "../../lib/scroll";

const EASE = [0.22, 1, 0.36, 1] as const;
const wrepd = projects.find((p) => p.id === "wrepd")!;

interface WrepdCaseStudyProps {
  open: boolean;
  onClose: () => void;
}

/**
 * In-portfolio case-study drawer for Wrepd. The concept pillars are drawn
 * only from the project description — nothing is invented.
 */
export default function WrepdCaseStudy({ open, onClose }: WrepdCaseStudyProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    lockScroll(true);
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      lockScroll(false);
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-[rgba(21,21,21,0.72)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Wrepd case study"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="relative max-h-[88svh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[rgba(21,21,21,0.12)] bg-[#F5F0E8] p-6 text-[#151515] shadow-[0_40px_120px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:p-10"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow text-[#E63843]">CASE STUDY · {wrepd.number}</p>
            <h3 className="display mt-4 text-[clamp(1.8rem,4vw,3rem)]">{wrepd.name}</h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close case study"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(21,21,21,0.2)] transition-colors duration-300 hover:border-[#E63843] hover:bg-[#E63843] hover:text-[#F5F0E8]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 font-display text-sm font-bold uppercase tracking-[0.14em] text-[rgba(21,21,21,0.6)]">
          {wrepd.category}
        </p>

        {wrepd.caseStudySummary ? (
          <p className="mt-6 border-l-2 border-[#E63843] pl-4 text-[1.05rem] font-semibold leading-relaxed">
            {wrepd.caseStudySummary}
          </p>
        ) : null}

        <p className="mt-6 leading-relaxed text-[rgba(21,21,21,0.8)]">{wrepd.description}</p>

        {wrepd.caseStudyPillars?.length ? (
          <div className="mt-8 border-t border-[rgba(21,21,21,0.15)] pt-6">
            <h4 className="font-display text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[rgba(21,21,21,0.6)]">
              Concept pillars
            </h4>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {wrepd.caseStudyPillars.map((pillar) => (
                <li
                  key={pillar}
                  className="flex items-start gap-3 rounded-lg border border-[rgba(21,21,21,0.12)] bg-white/50 p-3.5"
                >
                  <span
                    className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#E63843]"
                    aria-hidden="true"
                  />
                  <span className="font-display text-[0.95rem] font-bold uppercase tracking-[0.04em]">
                    {pillar}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-8 text-sm text-[rgba(21,21,21,0.55)]">
          Wrepd is an independent concept project. Press Esc or the close button to return.
        </p>
      </motion.div>
    </div>
  );
}
