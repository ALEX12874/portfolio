import { useEffect, useRef } from "react";
import { m } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { Experience } from "../../data/experience";
import CertificateViewer from "./CertificateViewer";
import { assets } from "../../data/assets";
import DocumentActions from "./DocumentActions";
import { lockScroll } from "../../lib/scroll";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ExperienceDetailPanelProps {
  experience: Experience;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Large right-side drawer on desktop (two columns) / near-full-screen sheet on
 * mobile. Company + role stay visible while scrolling. Esc closes, focus is
 * trapped, prev/next move between experiences.
 */
export default function ExperienceDetailPanel({
  experience,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: ExperienceDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
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
    const t = window.setTimeout(() => closeRef.current?.focus(), 70);
    return () => {
      lockScroll(false);
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [onClose, onPrev, onNext]);

  const filename =
    experience.id === "gyayak"
      ? "Gyayak_Internship_Completion_Letter.pdf"
      : "HLBS_Internship_Certificate.png";

  return (
    <div className="fixed inset-0 z-[95]">
      <div
        className="absolute inset-0 bg-[rgba(10,10,10,0.8)]"
        onClick={onClose}
        aria-hidden="true"
      />

      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${experience.company} — ${experience.role}`}
        initial={{ x: "6%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="absolute inset-y-0 right-0 flex h-[100dvh] w-full flex-col pb-[env(safe-area-inset-bottom)] sm:max-w-[88vw] sm:border-l border-[rgba(245,240,232,0.16)] bg-[#151515] shadow-[-40px_0_120px_rgba(0,0,0,0.55)] lg:max-w-[76vw] xl:max-w-[1180px]"
      >
        {/* sticky company + role */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(245,240,232,0.14)] bg-[#151515] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-6 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#E63843]">
              EXPERIENCE {experience.number} / {String(total).padStart(2, "0")}
            </p>
            <h3 className="mt-2 truncate font-display text-[clamp(1.3rem,3vw,2.2rem)] font-extrabold uppercase tracking-tight text-[#F5F0E8]">
              {experience.company}
            </h3>
            <p className="mt-1 text-[0.95rem] font-semibold text-[#D8FF63]">{experience.role}</p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close experience details"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(245,240,232,0.25)] text-[#F5F0E8] transition-colors duration-300 hover:border-[#E63843] hover:bg-[#E63843]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-7 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            {/* column 1 — details */}
            <div>
              <dl className="grid grid-cols-1 gap-5 border-b border-[rgba(245,240,232,0.14)] pb-6 sm:grid-cols-2">
                <div>
                  <dt className="font-display text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[rgba(245,240,232,0.5)]">
                    Duration
                  </dt>
                  <dd className="mt-1.5 text-base text-[#F5F0E8] sm:text-[0.95rem]">{experience.duration}</dd>
                </div>
                <div>
                  <dt className="font-display text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[rgba(245,240,232,0.5)]">
                    Domain
                  </dt>
                  <dd className="mt-1.5 text-base text-[#F5F0E8] sm:text-[0.95rem]">{experience.domain}</dd>
                </div>
              </dl>

              <h4 className="mt-6 font-display text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[rgba(245,240,232,0.5)]">
                Overview
              </h4>
              <p className="mt-3 text-base leading-relaxed text-[rgba(245,240,232,0.86)] sm:text-[0.98rem]">
                {experience.description}
              </p>
            </div>

            {/* column 2 — certificate (hidden entirely when not supplied) */}
            <div>
              {experience.certificate ? (
                <>
                  <CertificateViewer certificate={experience.certificate} />
                  <div className="mt-5">
                    <DocumentActions
                      src={
                        experience.certificate.src === assets.certHlbs
                          ? assets.certHlbsOriginal
                          : experience.certificate.src
                      }
                      filename={filename}
                      name={`${experience.company} certificate`}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-dashed border-[rgba(245,240,232,0.25)] p-6">
                  <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[rgba(245,240,232,0.6)]">
                    Certificate
                  </p>
                  <p className="mt-2 text-[0.9rem] text-[rgba(245,240,232,0.65)]">
                    The certificate for this internship is not part of this portfolio yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* prev / next */}
        <footer className="flex items-center justify-between gap-4 border-t border-[rgba(245,240,232,0.14)] px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onPrev}
            className="group inline-flex items-center gap-2 font-display text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[rgba(245,240,232,0.8)] transition-colors duration-300 hover:text-[#D8FF63]"
            aria-label="Previous experience"
          >
            <ArrowLeft size={15} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-1" />
            Previous
          </button>

          <span
            className="font-display text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[rgba(245,240,232,0.45)]"
            aria-live="polite"
          >
            {index + 1} / {total}
          </span>

          <button
            type="button"
            onClick={onNext}
            className="group inline-flex items-center gap-2 font-display text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[rgba(245,240,232,0.8)] transition-colors duration-300 hover:text-[#D8FF63]"
            aria-label="Next experience"
          >
            Next
            <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </footer>
      </m.div>
    </div>
  );
}
