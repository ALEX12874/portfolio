import { useEffect, useRef, useState } from "react";
import {
  m,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import DottedBackground from "../layout/DottedBackground";
import { sectionHeadings } from "../../data/site";
import { realMe, type HeritageSkill } from "../../data/realMe";
import { usePrefersReducedMotion } from "../../hooks/useReducedMotion";
import { useReveal } from "../../hooks/useReveal";

/**
 * 05 / THE REAL ME — "the family ledger".
 *
 * Motif: the red-cloth bahi-khata (the family-business account book), built
 * with CSS/SVG only. All text is real HTML.
 *
 * Modes
 * - scroll (≥ 1024 px): a 260vh chapter with a sticky 100svh stage; scroll
 *   progress opens the cover, writes the five entries, then lands the stamp.
 * - view (< 1024 px): no pinning; the ledger lies open and each row animates
 *   as it scrolls into view.
 * - static (reduced motion / safety net): the finished state, no motion.
 */
type Mode = "scroll" | "view" | "static";

const EASE = [0.22, 1, 0.36, 1] as const;
const ENTRY_START = 0.12;
const ENTRY_SPAN = (0.8 - ENTRY_START) / 5; // 0.136 per entry

function useDesktop(): boolean {
  const query = "(min-width: 1024px)";
  const [match, setMatch] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return match;
}

/* ------------------------------------------------------------------ copy */

function Headline({ mode }: { mode: Mode }) {
  const copy = sectionHeadings.realMe;
  const { ref, shown } = useReveal<HTMLDivElement>();
  const on = mode === "static" || shown;

  return (
    <div ref={ref}>
      <p className="eyebrow text-[#E63843]">{copy.eyebrow}</p>
      <h2 id="real-me-heading" className="display realme-title mt-6 text-[#151515]" aria-label={copy.title}>
        {copy.titleLines.map((line, i) => (
          <span key={line} className="block overflow-hidden pb-[0.06em]" aria-hidden="true">
            <m.span
              className="block"
              initial={mode === "static" ? false : { y: "105%" }}
              animate={on ? { y: "0%" } : { y: "105%" }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: EASE }}
            >
              {line}
            </m.span>
          </span>
        ))}
      </h2>
      <m.p
        className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-[rgba(21,21,21,0.78)]"
        initial={mode === "static" ? false : { opacity: 0, y: 16 }}
        animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.7, delay: 0.32, ease: EASE }}
      >
        {copy.copy}
      </m.p>
    </div>
  );
}

/* --------------------------------------------------------------- ledger */

/** Hand-drawn tick, drawn with pathLength. */
function Tick({ draw }: { draw: MotionValue<number> | number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none">
      <m.path
        d="M3.5 12.8 C 6 14.6 7.6 16.4 9.2 18.6 C 12 12.4 15.6 8 20.6 4.4"
        stroke="#E63843"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: draw }}
      />
    </svg>
  );
}

function EntryBody({
  skill,
  tick,
  marker,
  underline,
}: {
  skill: HeritageSkill;
  tick: MotionValue<number> | number;
  marker: MotionValue<number> | number;
  underline: MotionValue<number> | number;
}) {
  return (
    <div className="ledger-entry group flex gap-3 py-2.5 transition-transform duration-300 lg:py-[0.45rem] lg:hover:translate-x-[2px]">
      <div className="pt-1">
        <Tick draw={tick} />
      </div>
      <span className="pt-[0.2rem] font-display text-[0.78rem] font-bold tracking-[0.12em] text-[#C42530]">
        {skill.number}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="relative inline-block font-display text-[1.1rem] font-extrabold leading-tight text-[#151515] lg:text-[1.05rem]">
          {/* lime highlighter sweeping in behind the title */}
          <m.span
            aria-hidden="true"
            className="absolute inset-x-[-0.15em] bottom-[0.05em] h-[42%] origin-left bg-[#D8FF63]"
            style={{ scaleX: marker }}
          />
          <span className="relative">{skill.title}</span>
        </h4>
        <p className="mt-1 text-base leading-snug text-[rgba(21,21,21,0.78)] lg:mt-0.5 lg:text-[0.9rem]">{skill.line}</p>
        <m.span
          aria-hidden="true"
          className="mt-2 block h-px origin-left bg-[rgba(21,21,21,0.28)] transition-colors lg:mt-1.5 duration-300 group-hover:bg-[rgba(21,21,21,0.6)]"
          style={{ scaleX: underline }}
        />
      </div>
    </div>
  );
}

/** Desktop: everything on the scroll timeline. */
function ScrollEntry({ skill, i, progress }: { skill: HeritageSkill; i: number; progress: MotionValue<number> }) {
  const start = ENTRY_START + i * ENTRY_SPAN;
  const land = start + ENTRY_SPAN * 0.55;
  const next = start + ENTRY_SPAN;
  const last = i === 4;
  const opacity = useTransform(
    progress,
    last ? [start, land] : [start, land, next, next + ENTRY_SPAN * 0.4],
    last ? [0, 1] : [0, 1, 1, 0.65]
  );
  const x = useTransform(progress, [start, land], [14, 0]);
  const tick = useTransform(progress, [start, land], [0, 1]);
  const marker = useTransform(progress, [land - ENTRY_SPAN * 0.15, land + ENTRY_SPAN * 0.2], [0, 1]);
  const underline = useTransform(progress, [land, next], [0, 1]);
  return (
    // the last row leaves room on the right for the stamp
    <m.li style={{ opacity, x }} className={last ? "pr-[92px] xl:pr-[108px]" : undefined}>
      <EntryBody skill={skill} tick={tick} marker={marker} underline={underline} />
    </m.li>
  );
}

/** Phones / static: each row animates once it is in view (or is simply shown). */
function ViewEntry({ skill, mode }: { skill: HeritageSkill; mode: Mode }) {
  const { ref, shown } = useReveal<HTMLLIElement>("0px 0px -15% 0px");
  const on = mode === "static" || shown;
  const t = (delay: number, duration = 0.55) => ({ duration, delay, ease: EASE });
  return (
    <m.li
      ref={ref}
      initial={mode === "static" ? false : { opacity: 0, x: 12 }}
      animate={on ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
      transition={t(0)}
    >
      <div className="ledger-entry group flex gap-3 py-2.5">
        <div className="pt-1">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none">
            <m.path
              d="M3.5 12.8 C 6 14.6 7.6 16.4 9.2 18.6 C 12 12.4 15.6 8 20.6 4.4"
              stroke="#E63843"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={mode === "static" ? false : { pathLength: 0 }}
              animate={{ pathLength: on ? 1 : 0 }}
              transition={t(0.1, 0.5)}
            />
          </svg>
        </div>
        <span className="pt-[0.2rem] font-display text-[0.78rem] font-bold tracking-[0.12em] text-[#C42530]">
          {skill.number}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="relative inline-block font-display text-[1.1rem] font-extrabold leading-tight text-[#151515]">
            <m.span
              aria-hidden="true"
              className="absolute inset-x-[-0.15em] bottom-[0.05em] h-[42%] origin-left bg-[#D8FF63]"
              initial={mode === "static" ? false : { scaleX: 0 }}
              animate={{ scaleX: on ? 1 : 0 }}
              transition={t(0.4, 0.5)}
            />
            <span className="relative">{skill.title}</span>
          </h4>
          <p className="mt-1 text-base leading-snug text-[rgba(21,21,21,0.78)]">{skill.line}</p>
          <m.span
            aria-hidden="true"
            className="mt-2 block h-px origin-left bg-[rgba(21,21,21,0.28)]"
            initial={mode === "static" ? false : { scaleX: 0 }}
            animate={{ scaleX: on ? 1 : 0 }}
            transition={t(0.6, 0.6)}
          />
        </div>
      </div>
    </m.li>
  );
}

/** Rubber-stamp seal. Decorative: the words are also the section's blockquote. */
function StampFace() {
  return (
    <div className="stamp relative flex aspect-square w-full items-center justify-center rounded-full border-[3px] border-[#E63843] p-[9%] text-center text-[#E63843]">
      <span className="absolute inset-[6%] rounded-full border border-dashed border-[rgba(230,56,67,0.7)]" />
      <span className="font-display text-[clamp(0.95rem,2.2vw,1.25rem)] font-black uppercase leading-[1.05] tracking-[0.04em]">
        No excuses.
        <br />
        Just work done.
      </span>
    </div>
  );
}

function ScrollStamp({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.8, 0.83], [0, 1]);
  const scale = useTransform(progress, [0.8, 0.88], [1.25, 1]);
  const ring = useTransform(progress, [0.86, 0.96], [0, 0.45]);
  const ringScale = useTransform(progress, [0.86, 0.98], [0.92, 1.18]);
  return (
    <div className="stamp-wrap relative" aria-hidden="true">
      <m.span
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(230,56,67,0)_55%,rgba(230,56,67,0.35)_70%,rgba(230,56,67,0)_80%)]"
        style={{ opacity: ring, scale: ringScale }}
      />
      <m.div style={{ opacity, scale, rotate: -8 }}>
        <StampFace />
      </m.div>
    </div>
  );
}

function ViewStamp({ mode }: { mode: Mode }) {
  const { ref, shown } = useReveal<HTMLDivElement>("0px 0px -15% 0px");
  const on = mode === "static" || shown;
  return (
    <div ref={ref} className="stamp-wrap relative" aria-hidden="true">
      <m.span
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(230,56,67,0)_55%,rgba(230,56,67,0.35)_70%,rgba(230,56,67,0)_80%)]"
        initial={mode === "static" ? false : { opacity: 0, scale: 0.92 }}
        animate={on ? { opacity: 0.45, scale: 1.18 } : { opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
      />
      <m.div
        initial={mode === "static" ? false : { opacity: 0, scale: 1.25, rotate: -8 }}
        animate={on ? { opacity: 1, scale: 1, rotate: -8 } : { opacity: 0, scale: 1.25, rotate: -8 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ rotate: -8 }}
      >
        <StampFace />
      </m.div>
    </div>
  );
}

/** The red bahi-khata: cloth cover, ink spine, stitched border, embossed label. */
function CoverFace() {
  return (
    <div className="ledger-cover absolute inset-0 rounded-[14px_18px_18px_14px]">
      <span className="absolute inset-[14px] rounded-[10px] border-2 border-dashed border-[rgba(245,240,232,0.75)]" />
      <span className="absolute left-1/2 top-[38%] -translate-x-1/2 rounded-md border border-[rgba(245,240,232,0.5)] px-4 py-2 font-display text-[0.8rem] font-extrabold tracking-[0.28em] text-[#F5F0E8] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.25)]">
        {realMe.ledgerLabel}
      </span>
    </div>
  );
}

function Ledger({ mode, progress }: { mode: Mode; progress: MotionValue<number> }) {
  const coverRotate = useTransform(progress, [0, ENTRY_START], [0, -165]);
  const scroll = mode === "scroll";

  return (
    <div className={scroll ? "ledger-scene" : ""}>
      <div className={`ledger-book relative ${scroll ? "ledger-book--tilted" : ""}`}>
        {/* ink spine */}
        <span aria-hidden="true" className="absolute inset-y-[6px] -left-[10px] w-[14px] rounded-l-[8px] bg-[#151515]" />

        {/* the ruled cream page */}
        <div className="ledger-page relative rounded-[6px_14px_14px_6px] px-[18px] pb-6 pt-6 sm:px-6 lg:pb-5 lg:pl-14 lg:pr-8 lg:pt-5">
          <span aria-hidden="true" className="ledger-margin" />
          <h3 className="font-display text-[0.74rem] font-bold uppercase tracking-[0.2em] text-[#C42530]">
            {realMe.skillsHeading}
          </h3>
          <p className="mt-1.5 text-base leading-snug text-[rgba(21,21,21,0.75)] lg:text-[0.95rem]">
            {realMe.skillsLine}
          </p>

          <ol className="mt-3" aria-label={realMe.skillsHeading}>
            {realMe.skills.map((s, i) =>
              scroll ? (
                <ScrollEntry key={s.id} skill={s} i={i} progress={progress} />
              ) : (
                <ViewEntry key={s.id} skill={s} mode={mode} />
              )
            )}
          </ol>

          {/* the stamp: on the page corner (desktop) / centred under the list */}
          <div className={scroll ? "absolute -bottom-10 -right-5 w-[120px] xl:w-[140px]" : "mx-auto mt-6 w-[min(78%,220px)]"}>
            {scroll ? <ScrollStamp progress={progress} /> : <ViewStamp mode={mode} />}
          </div>
        </div>

        {/* cover: swings open around the spine on scroll (desktop only) */}
        {scroll ? (
          <m.div
            aria-hidden="true"
            className="absolute inset-0 origin-left [transform-style:preserve-3d]"
            style={{ rotateY: coverRotate }}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <CoverFace />
            </div>
            {/* inside of the cover (end-paper) */}
            <div className="ledger-endpaper absolute inset-0 rounded-[14px_18px_18px_14px] [backface-visibility:hidden] [transform:rotateY(180deg)]" />
          </m.div>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- mindset */

function Mindset({ mode }: { mode: Mode }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const on = mode === "static" || shown;
  const quoteRef = useRef<HTMLQuoteElement | null>(null);
  const { scrollYProgress } = useScroll({ target: quoteRef, offset: ["start 90%", "center 45%"] });
  // fill red left → right with transforms only: the clip window slides in
  // while the text inside counter-slides, so the letters stay put
  const outerX = useTransform(scrollYProgress, [0, 1], ["-101%", "0%"]);
  const innerX = useTransform(scrollYProgress, [0, 1], ["101%", "0%"]);
  const staticFill = mode === "static";

  return (
    <div className="relative bg-[#151515] text-[#F5F0E8]">
      <DottedBackground tone="ink" />
      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div ref={ref} className="max-w-[62ch]">
          <p className="eyebrow text-[#E63843]">{realMe.mindset.eyebrow}</p>
          <p className="mt-6 text-[1.0625rem] leading-relaxed text-[rgba(245,240,232,0.88)] sm:text-[1.15rem]">
            {realMe.mindset.before}
            <span className="relative inline-block whitespace-nowrap font-display font-extrabold text-[#F5F0E8]">
              {realMe.mindset.question}
              {/* the question I never ask: struck through */}
              <m.span
                aria-hidden="true"
                className="absolute left-[-2%] right-[-2%] top-[52%] h-[3px] origin-left bg-[#E63843]"
                initial={mode === "static" ? false : { scaleX: 0 }}
                animate={{ scaleX: on ? 1 : 0 }}
                transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
              />
            </span>
            {realMe.mindset.after}
          </p>
        </div>

        <blockquote ref={quoteRef} className="relative mt-16 lg:mt-24">
          <p className="realme-quote font-display font-black uppercase leading-[0.95] tracking-[-0.02em]">
            {/* outline layer (real text) */}
            <span className="realme-quote__outline">{realMe.quote}</span>
            {/* red fill layer, revealed left → right on scroll */}
            <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
              <m.span className="block" style={staticFill ? undefined : { x: outerX }}>
                <m.span className="block text-[#E63843]" style={staticFill ? undefined : { x: innerX }}>
                  {realMe.quote}
                </m.span>
              </m.span>
            </span>
          </p>
        </blockquote>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- section */

export default function RealMeSection() {
  const reduced = usePrefersReducedMotion();
  const desktop = useDesktop();
  const [stuck, setStuck] = useState(false);
  const chapter = useRef<HTMLDivElement | null>(null);
  const mode: Mode = reduced || stuck ? "static" : desktop ? "scroll" : "view";

  const { scrollYProgress } = useScroll({ target: chapter, offset: ["start start", "end end"] });
  const moved = useRef(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v > 0) moved.current = true;
  });

  // safety net: if the pinned chapter is on screen but scroll progress never
  // updates (broken scroll hooks), show the finished state after ~1.5 s
  useEffect(() => {
    if (mode !== "scroll") return undefined;
    let timer = 0;
    const check = () => {
      const r = chapter.current?.getBoundingClientRect();
      if (!r || moved.current) return;
      if (r.top < -40 && r.bottom > window.innerHeight) {
        if (!timer) timer = window.setTimeout(() => !moved.current && setStuck(true), 1500);
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.clearTimeout(timer);
    };
  }, [mode]);

  return (
    <section id="real-me" aria-labelledby="real-me-heading" className="relative bg-[#EFE8DC] text-[#151515]">
      <DottedBackground tone="ivory" />

      {/* the ledger chapter — pinned and scroll-driven only on desktop */}
      <div ref={chapter} className={`relative ${mode === "scroll" ? "h-[260vh]" : ""}`}>
        <div
          className={
            mode === "scroll"
              ? "sticky top-0 flex h-[100svh] items-center overflow-hidden"
              : "relative"
          }
        >
          <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-12 px-5 pb-20 pt-24 sm:px-8 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:items-center lg:gap-10 lg:px-12 lg:py-0">
            <Headline mode={mode} />
            <div className="min-w-0">
              <Ledger mode={mode} progress={scrollYProgress} />
            </div>
          </div>
        </div>
      </div>

      <Mindset mode={mode} />
    </section>
  );
}
