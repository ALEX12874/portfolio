import { useEffect, useRef, useState } from "react";
import { sections } from "../../data/site";
import { scrollToSection } from "../../lib/scroll";
import MenuOverlay from "./MenuOverlay";

type Tone = "ink" | "ivory";

/** Sections rendered on an ink (dark) background. */
const INK_SECTIONS = new Set(["capabilities", "projects", "experience", "contact"]);

function toneForSection(id: string | null, el?: HTMLElement | null): Tone {
  if (!id) return "ink";
  // sections whose background changes (e.g. the light Inayat world) say so
  if (el?.dataset.tone === "light") return "ink";
  if (el?.dataset.tone === "dark") return "ivory";
  return INK_SECTIONS.has(id) ? "ivory" : "ink";
}

/**
 * Tracks which section sits beneath the fixed bar so its text can adapt.
 * An IntersectionObserver watches a 1 px band just under the bar, so
 * scrolling never reads layout (no getBoundingClientRect per frame).
 */
function useSectionAtTop(): Tone {
  const [tone, setTone] = useState<Tone>("ink");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const PROBE = 44; // just under the bar
    const hit = new Map<Element, boolean>();
    const observed = new WeakSet<Element>();
    let io: IntersectionObserver | null = null;

    const apply = () => {
      let currentEl: HTMLElement | null = null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && hit.get(el)) {
          currentEl = el;
          break;
        }
      }
      setTone(toneForSection(currentEl?.id ?? null, currentEl));
    };
    const observeAll = () => {
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && io && !observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      }
    };
    const build = () => {
      io?.disconnect();
      hit.clear();
      const below = Math.max(0, window.innerHeight - PROBE - 1);
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) hit.set(e.target, e.isIntersecting);
          apply();
        },
        { rootMargin: `-${PROBE}px 0px -${below}px 0px` }
      );
      // a fresh observer: everything is observed again
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el) {
          observed.add(el);
          io.observe(el);
        }
      }
    };
    build();

    // lazy sections replace their placeholders: observe the new elements
    let mutRaf = 0;
    const mo = new MutationObserver(() => {
      if (!mutRaf)
        mutRaf = requestAnimationFrame(() => {
          mutRaf = 0;
          observeAll();
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let resizeRaf = 0;
    const onResize = () => {
      if (!resizeRaf)
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0;
          build();
        });
    };
    window.addEventListener("resize", onResize, { passive: true });
    // a section changed its own tone (project world switch)
    window.addEventListener("section-tone", apply);
    return () => {
      io?.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("section-tone", apply);
      if (mutRaf) cancelAnimationFrame(mutRaf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
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
    let raf = 0;
    const read = () => {
      raf = 0;
      setScrolled(window.scrollY > 12);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => menuBtnRef.current?.focus(), 80);
  };

  const light = tone === "ivory"; // light text while over an ink section
  // touch / small screens: solid bar, no backdrop blur (expensive on phones)
  const solid = useRef(
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse), (max-width: 767px)").matches
  ).current;
  const blur = scrolled && !solid ? "blur(10px)" : "none";

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[80] transition-[background-color] duration-500 ease-editorial"
        style={{
          background: scrolled
            ? light
              ? `rgba(21,21,21,${solid ? 0.92 : 0.72})`
              : `rgba(245,240,232,${solid ? 0.92 : 0.78})`
            : "transparent",
          backdropFilter: blur,
          WebkitBackdropFilter: blur,
          paddingTop: "env(safe-area-inset-top)",
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
            aria-label="Portfolio — Gourang Lokwani, back to top"
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
