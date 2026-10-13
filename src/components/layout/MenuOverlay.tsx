import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sections } from "../../data/site";
import { scrollToSection } from "../../lib/scroll";

interface MenuOverlayProps {
  open: boolean;
  onClose: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function MenuOverlay({ open, onClose }: MenuOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstRef = useRef<HTMLButtonElement | null>(null);

  // Esc closes · focus trapped · body scroll locked
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    const t = window.setTimeout(() => firstRef.current?.focus(), 80);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const go = (id: string) => {
    onClose();
    // wait one frame so the overlay closes before scrolling starts
    window.setTimeout(() => scrollToSection(id), 40);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          id="site-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[90] flex flex-col bg-[#151515] dots-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <span className="inline-flex items-baseline gap-1.5 font-display text-lg font-extrabold text-[#F5F0E8]">
              Portfolio
              <span
                className="inline-block h-[7px] w-[7px] rounded-full bg-[#E63843]"
                aria-hidden="true"
              />
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-2 font-display text-base font-bold text-[#F5F0E8] transition-colors duration-300 hover:text-[#D8FF63]"
            >
              Close ↗
            </button>
          </div>

          <nav
            aria-label="Primary"
            className="flex flex-1 items-center overflow-y-auto px-5 sm:px-8 lg:px-12"
          >
            <ul className="mx-auto w-full max-w-[1600px] py-10">
              {sections.map((s, i) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 34 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.06 + i * 0.06, ease: EASE }}
                  className="border-b border-[rgba(245,240,232,0.12)] last:border-b-0"
                >
                  <button
                    type="button"
                    ref={i === 0 ? firstRef : undefined}
                    onClick={() => go(s.id)}
                    className="group flex w-full items-baseline justify-between gap-6 py-4 text-left sm:py-6"
                  >
                    <span className="display text-[clamp(2rem,7vw,4.75rem)] text-[#F5F0E8] transition-[color,transform] duration-500 ease-editorial group-hover:translate-x-3 group-hover:text-[#D8FF63]">
                      {s.label}
                    </span>
                    <span className="font-display text-xs font-bold tracking-[0.24em] text-[rgba(245,240,232,0.45)] transition-colors duration-400 group-hover:text-[#E63843]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          </nav>

          <div className="px-5 pb-8 sm:px-8 lg:px-12">
            <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.5)]">
              Esc to close
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
