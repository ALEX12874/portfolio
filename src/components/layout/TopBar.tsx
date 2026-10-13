import { useEffect, useRef, useState } from "react";
import { sections } from "../../data/site";
import { scrollToSection } from "../../lib/scroll";
import MenuOverlay from "./MenuOverlay";

type Tone = "ink" | "ivory";

/** Sections rendered on an ink (dark) background. */
const INK_SECTIONS = new Set(["capabilities", "projects", "experience", "contact"]);

function toneForSection(id: string | null): Tone {
  if (!id) return "ink";
  return INK_SECTIONS.has(id) ? "ivory" : "ink";
}

/** Tracks which section sits beneath the fixed bar so its text can adapt. */
function useSectionAtTop(): Tone {
  const [tone, setTone] = useState<Tone>("ink");

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const probe = 44; // just under the bar
      let current: string | null = null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          current = s.id;
          break;
        }
      }
      setTone(toneForSection(current));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return tone;
}

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const tone = useSectionAtTop();
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => menuBtnRef.current?.focus(), 80);
  };

  const light = tone === "ivory"; // light text while over an ink section

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[80] transition-[background-color,backdrop-filter] duration-500 ease-editorial"
        style={{
          background: scrolled
            ? light
              ? "rgba(21,21,21,0.72)"
              : "rgba(245,240,232,0.78)"
            : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
        }}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("home");
            }}
            className="group inline-flex items-baseline gap-1.5 font-display text-lg font-extrabold tracking-tight"
            style={{ color: light ? "#F5F0E8" : "#151515" }}
            aria-label="Gourang Lokwani — back to top"
          >
            Portfolio
            <span
              className="inline-block h-[7px] w-[7px] rounded-full bg-[#E63843] transition-transform duration-300 ease-editorial group-hover:scale-150"
              aria-hidden="true"
            />
          </a>

          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls="site-menu"
            className="group inline-flex items-center gap-2 rounded-full px-3 py-2 font-display text-base font-bold tracking-tight transition-colors duration-300 ease-editorial"
            style={{ color: light ? "#F5F0E8" : "#151515" }}
          >
            <span className="relative">
              {open ? "Close" : "Menu"}
              <span
                className="absolute -bottom-1 left-0 h-[2px] w-0 bg-[#E63843] transition-[width] duration-500 ease-editorial group-hover:w-full"
                aria-hidden="true"
              />
            </span>
            <span
              className="inline-block transition-transform duration-500 ease-editorial"
              style={{ transform: open ? "rotate(-135deg)" : "rotate(0deg)" }}
              aria-hidden="true"
            >
              ↘
            </span>
          </button>
        </div>
      </header>

      <MenuOverlay open={open} onClose={close} />
    </>
  );
}
