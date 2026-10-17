import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import DottedBackground from "../layout/DottedBackground";
import { sectionHeadings } from "../../data/site";
import { realMe } from "../../data/realMe";
import { useMotionLevel } from "../../hooks/useMotionLevel";
import { useReveal } from "../../hooks/useReveal";
import { buildWeb, type Pt, type WebGeometry } from "./webGeometry";
import { LEG_ROOTS, PUPIL_BASE, SpiderEngine, type SlotEls } from "./spiderEngine";

/**
 * 05 / THE REAL ME — one full-screen spider-web scene.
 *
 * The web = my world (family, business, customers); the spider = me; the
 * bugs = everyday problems that fly in, get caught, wrapped and "Sorted ✓";
 * the five skills = the web's anchor points. The web/spider/bug layer is
 * decorative (aria-hidden); every word is real HTML.
 */

type Mode = "desk" | "tab" | "phone";
const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_SLOTS = 4;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

interface Layout {
  W: number;
  H: number;
  hub: Pt;
  mode: Mode;
  /** Web-area rect (tablet/phone), in section coordinates. */
  area: { x: number; y: number; w: number; h: number } | null;
  /** Desktop: right edge of the text column / top of the bottom strip. */
  textRight: number;
  stripTop: number;
}

/** Node placement around the hub, per layout (angles in degrees, 0 = right). */
const NODE_ANGLES: Record<Mode, number[]> = {
  desk: [-120, -50, 5, 60, 125],
  tab: [-120, -50, 5, 60, 125],
  phone: [-90, -18, 54, 126, 198],
};

function modeFor(w: number): Mode {
  return w >= 1024 ? "desk" : w >= 768 ? "tab" : "phone";
}

/* -------------------------------------------------------------- spider */

function legPath(n: number): string {
  const s = n < 4 ? -1 : 1;
  const j = n % 4;
  const r = LEG_ROOTS[n];
  const knee = { x: r.x + s * 9, y: r.y + (j - 1.5) * 4.5 - 5 };
  const foot = { x: knee.x + s * 8, y: knee.y + (j - 1.5) * 6.5 + 2 };
  return `M${r.x} ${r.y} L${knee.x} ${knee.y} L${foot.x} ${foot.y}`;
}

/* -------------------------------------------------------------- bugs */

function BugArt() {
  return (
    <svg viewBox="-14 -14 28 28" className="h-full w-full overflow-visible">
      {/* beetle */}
      <g className="bug-kind bug-kind--0">
        {[-1, 1].flatMap((s) =>
          [-4, 0, 4].map((y) => (
            <path
              key={`${s}${y}`}
              d={`M${s * 4} ${y} l${s * 5} ${y * 0.4 - 1}`}
              stroke="#151515"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          ))
        )}
        <ellipse cx="0" cy="1" rx="5.5" ry="7" fill="#151515" />
        <path d="M0 -5 V8" stroke="#D8FF63" strokeWidth="0.9" opacity="0.8" />
        <circle cx="0" cy="-7" r="3" fill="#151515" />
      </g>
      {/* fly: flickering lime wings */}
      <g className="bug-kind bug-kind--1">
        <ellipse className="bug-wing" cx="-5" cy="-2" rx="5" ry="3" fill="rgba(216,255,99,0.85)" stroke="#151515" strokeWidth="0.6" />
        <ellipse className="bug-wing bug-wing--r" cx="5" cy="-2" rx="5" ry="3" fill="rgba(216,255,99,0.85)" stroke="#151515" strokeWidth="0.6" />
        <ellipse cx="0" cy="1" rx="3.6" ry="6" fill="#151515" />
        <circle cx="-1.6" cy="-5.4" r="1.3" fill="#E63843" />
        <circle cx="1.6" cy="-5.4" r="1.3" fill="#E63843" />
      </g>
      {/* moth */}
      <g className="bug-kind bug-kind--2">
        <path className="bug-wing" d="M0 -2 L-10 -6 L-8 5 Z" fill="rgba(216,255,99,0.7)" stroke="#151515" strokeWidth="0.7" />
        <path className="bug-wing bug-wing--r" d="M0 -2 L10 -6 L8 5 Z" fill="rgba(216,255,99,0.7)" stroke="#151515" strokeWidth="0.7" />
        <ellipse cx="0" cy="1" rx="2.6" ry="7" fill="#151515" />
        <path d="M-1 -6 L-3 -10 M1 -6 L3 -10" stroke="#151515" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Cocoon() {
  return (
    <svg viewBox="-16 -16 32 32" className="web-bug__cocoon" aria-hidden="true">
      <ellipse className="cocoon-fill" cx="0" cy="0" rx="8.5" ry="11.5" fill="#F5F0E8" stroke="rgba(21,21,21,0.25)" strokeWidth="0.6" />
      {["M-9 -6 Q0 -2 9 -7", "M-9 -1 Q0 3 9 -2", "M-9 4 Q0 8 9 3", "M-7 9 Q0 12 7 8", "M-6 -10 Q-1 0 6 10"].map((d, i) => (
        <path key={d} className="cocoon-wrap" d={d} pathLength={1} style={{ transitionDelay: `${i * 0.12}s` }} />
      ))}
    </svg>
  );
}

/* --------------------------------------------------------------- section */

export default function RealMeSection() {
  const heading = sectionHeadings.realMe;
  // calm motion: the scene still plays, just slower and with fewer bugs
  const calm = useMotionLevel() === "calm";
  const sectionRef = useRef<HTMLElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [mode, setMode] = useState<Mode>(() =>
    typeof window === "undefined" ? "desk" : modeFor(window.innerWidth)
  );
  const [count, setCount] = useState(0);
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);
  const { ref: revealRef, shown } = useReveal<HTMLDivElement>("0px 0px -20% 0px");
  const { ref: textRef, shown: textShown } = useReveal<HTMLDivElement>();
  const drawn = shown;
  const textOn = textShown;

  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);

  // ---- measure the composition (and re-measure on resize)
  const measure = useCallback(() => {
    const sec = sectionRef.current;
    if (!sec) return;
    const sr = sec.getBoundingClientRect();
    const W = Math.round(sr.width);
    const H = Math.round(sr.height);
    const md = modeFor(window.innerWidth);
    setMode(md);
    let hub: Pt;
    let area: Layout["area"] = null;
    if (md === "desk" || !areaRef.current) {
      hub = { x: Math.round(W * 0.62), y: Math.round(H * 0.46) };
    } else {
      const ar = areaRef.current.getBoundingClientRect();
      area = { x: ar.left - sr.left, y: ar.top - sr.top, w: ar.width, h: ar.height };
      hub = {
        x: Math.round(area.x + area.w * (md === "phone" ? 0.5 : 0.56)),
        y: Math.round(area.y + area.h * 0.5),
      };
    }
    const tr = textRef.current?.getBoundingClientRect();
    const st = stripRef.current?.getBoundingClientRect();
    const next: Layout = {
      W,
      H,
      hub,
      mode: md,
      area,
      textRight: tr ? tr.right - sr.left : W * 0.4,
      stripTop: st ? st.top - sr.top : H - 80,
    };
    setLayout((cur) =>
      cur &&
      cur.W === next.W &&
      cur.H === next.H &&
      cur.hub.x === next.hub.x &&
      cur.hub.y === next.hub.y &&
      cur.mode === next.mode
        ? cur
        : next
    );
  }, [textRef]);

  useLayoutEffect(() => {
    measure();
    const sec = sectionRef.current;
    if (!sec || typeof ResizeObserver === "undefined") return undefined;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(sec);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [measure, mode]);

  // ---- web geometry: built once per size
  const web: WebGeometry | null = useMemo(
    () => (layout ? buildWeb(layout.W, layout.H, layout.hub, layout.mode === "phone") : null),
    [layout]
  );

  // ---- the five anchor points, snapped onto real strand crossings so that
  // no card collides with another card, the copy, the strip or the edges
  const nodes = useMemo(() => {
    if (!web || !layout) return [];
    const { mode: md, area, W, H, textRight, stripTop } = layout;
    const rx = md === "desk" ? Math.min(W * 0.2, 300) : md === "tab" ? (area?.w ?? W) * 0.3 : W * 0.3;
    const ry = md === "desk" ? Math.min(H * 0.3, 270) : (area?.h ?? H) * (md === "tab" ? 0.34 : 0.36);
    const cw = md === "phone" ? 118 : 184;
    const ch = md === "phone" ? 46 : 122;
    const bounds =
      md === "desk"
        ? { x0: textRight + 12, x1: W - 16, y0: 24, y1: stripTop - 10 }
        : area
          ? { x0: Math.max(area.x - 6, 8), x1: Math.min(area.x + area.w + 6, W - 8), y0: area.y, y1: area.y + area.h }
          : { x0: 8, x1: W - 8, y0: 0, y1: H };
    const crossings: Pt[] = [];
    for (let i = 0; i < web.dirs.length; i += 1) {
      for (let k = 3; k < web.radius[i].length; k += 1) crossings.push(web.point(i, k));
    }
    const placed: Rect[] = [];
    return NODE_ANGLES[md].map((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const want = { x: web.hub.x + Math.cos(a) * rx, y: web.hub.y + Math.sin(a) * ry };
      const above = md === "phone" ? i === 0 : deg < 0;
      const rectAt = (p: Pt): Rect => ({ x: p.x - cw / 2, y: above ? p.y - 14 - ch : p.y + 14, w: cw, h: ch });
      const fits = (p: Pt) => {
        const r = rectAt(p);
        if (r.x < bounds.x0 || r.x + r.w > bounds.x1 || r.y < bounds.y0 || r.y + r.h > bounds.y1) return false;
        if (Math.hypot(p.x - web.hub.x, p.y - web.hub.y) < 70) return false;
        return !placed.some((q) => overlaps(r, q, 10));
      };
      const ranked = crossings
        .map((p) => ({ p, d: Math.hypot(p.x - want.x, p.y - want.y) }))
        .sort((x, y) => x.d - y.d);
      const pick = ranked.find((c) => fits(c.p))?.p ?? web.nearest(want, 3).p;
      placed.push(rectAt(pick));
      return { skill: realMe.skills[i], p: pick, above, rect: rectAt(pick) };
    });
  }, [web, layout]);

  // ---- engine
  const spiderRef = useRef<HTMLDivElement | null>(null);
  const legRefs = useRef<SVGGElement[]>([]);
  const pupilRefs = useRef<SVGCircleElement[]>([]);
  const threadRef = useRef<SVGLineElement | null>(null);
  const ringRefs = useRef<SVGPathElement[]>([]);
  const slotRefs = useRef<Partial<SlotEls>[]>([]);
  const labelRefs = useRef<HTMLSpanElement[]>([]);
  const engineRef = useRef<SpiderEngine | null>(null);
  const visibleRef = useRef(false);
  const layoutRef = useRef<Layout | null>(null);
  const nodesRef = useRef<Pt[]>([]);
  const cardsRef = useRef<Rect[]>([]);
  layoutRef.current = layout;
  nodesRef.current = nodes.map((n) => n.p);
  cardsRef.current = nodes.map((n) => n.rect);

  const allow = useCallback((p: Pt) => {
    const l = layoutRef.current;
    if (!l) return false;
    const phone = l.mode === "phone";
    if (Math.hypot(p.x - l.hub.x, p.y - l.hub.y) < (phone ? 40 : 60)) return false;
    if (nodesRef.current.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < (phone ? 44 : 70))) return false;
    // a stuck bug carries a label pill above it: keep both clear of the cards
    // (phones have little room, so there only the bug itself stays clear)
    const bug = l.mode === "phone" ? { x: p.x - 16, y: p.y - 16, w: 32, h: 32 } : { x: p.x - 70, y: p.y - 44, w: 140, h: 60 };
    if (cardsRef.current.some((c) => overlaps(bug, c))) return false;
    if (l.mode === "desk") {
      return p.x > l.textRight + 80 && p.x < l.W - 80 && p.y > 70 && p.y < l.stripTop - 30;
    }
    const a = l.area;
    if (!a) return false;
    const mx = phone ? 14 : 24;
    const my = phone ? 10 : 16;
    return p.x > a.x + mx && p.x < a.x + a.w - mx && p.y > a.y + my && p.y < a.y + a.h - my;
  }, []);

  useEffect(() => {
    if (!web || !spiderRef.current || !threadRef.current) return;
    const els = {
      spider: spiderRef.current,
      legs: legRefs.current,
      pupils: pupilRefs.current,
      thread: threadRef.current,
      slots: slotRefs.current as SlotEls[],
      rings: ringRefs.current,
      labels: labelRefs.current,
    };
    if (!engineRef.current || engineRef.current.calm !== calm) {
      engineRef.current?.destroy();
      const md = layoutRef.current?.mode ?? "desk";
      engineRef.current = new SpiderEngine(web, els, {
        cap: calm ? 2 : md === "desk" ? 4 : 3,
        size: md === "phone" ? 36 : 50,
        speed: (md === "phone" ? 150 : 220) * (calm ? 0.5 : 1),
        calm,
        labels: realMe.bugLabels,
        onSorted: () => setCount((c) => c + 1),
        allow,
      });
    } else {
      engineRef.current.setGeometry(web);
    }
    if (visibleRef.current && drawn) engineRef.current.start();
  }, [web, calm, allow, drawn]);

  useEffect(() => () => engineRef.current?.destroy(), []);

  // pause everything off-screen
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec || typeof IntersectionObserver === "undefined") {
      visibleRef.current = true;
      return undefined;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
        sec.dataset.paused = e.isIntersecting ? "false" : "true";
        if (e.isIntersecting && drawn) engineRef.current?.start();
        else engineRef.current?.stop();
      },
      { threshold: 0.05 }
    );
    io.observe(sec);
    return () => io.disconnect();
  }, [drawn]);

  // ---- interaction
  const local = (e: { clientX: number; clientY: number }): Pt | null => {
    const sec = sectionRef.current;
    if (!sec) return null;
    const r = sec.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-text], [data-node], a, button")) return;
    setOpenNode(null);
    const p = local(e);
    if (p) engineRef.current?.throwBug(p);
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    engineRef.current?.setMouse(local(e));
  };

  const desk = mode === "desk";
  const compact = mode === "phone";

  const mindset = (
    <m.p
      className="realme-copy relative mt-5 max-w-[34rem] text-[rgba(21,21,21,0.82)] lg:mt-[clamp(0.75rem,2.2vh,1.25rem)]"
      initial={{ opacity: 0, y: calm ? 0 : 14 }}
      animate={textOn ? { opacity: 1, y: 0 } : { opacity: 0, y: calm ? 0 : 14 }}
      transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
    >
      {realMe.mindset.before}
      <span className="relative inline-block whitespace-nowrap font-display font-extrabold text-[#151515]">
        {realMe.mindset.struck}
        <m.span
          aria-hidden="true"
          className="absolute left-[-3%] right-[-3%] top-[52%] h-[2.5px] origin-left bg-[#E63843]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: textOn ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 1.0, ease: EASE }}
        />
      </span>
      {realMe.mindset.middle}
      <span className="relative inline-block whitespace-nowrap font-display font-extrabold text-[#151515]">
        <m.span
          aria-hidden="true"
          className="absolute inset-x-[-0.12em] bottom-[0.06em] h-[44%] origin-left bg-[#D8FF63]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: textOn ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 1.35, ease: EASE }}
        />
        <span className="relative">{realMe.mindset.highlighted}</span>
      </span>
      {realMe.mindset.after}
    </m.p>
  );


  return (
    <section
      ref={sectionRef}
      id="real-me"
      aria-labelledby="real-me-heading"
      className="realme relative overflow-hidden bg-[#EFE8DC] text-[#151515] lg:flex lg:min-h-[calc(100svh-72px)] lg:items-center"
      style={{ touchAction: "pan-y" }}
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={() => engineRef.current?.setMouse(null)}
    >
      <DottedBackground tone="ivory" />

      {/* ---- the web (decorative) ---- */}
      {web ? (
        <svg
          aria-hidden="true"
          className={`realme-web absolute inset-0 h-full w-full ${drawn ? "is-drawn" : ""}`}
          viewBox={`0 0 ${web.W} ${web.H}`}
          preserveAspectRatio="none"
        >
          <g className="web-spokes">
            {web.spokePaths.map((d, i) => (
              <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 18}ms` }} />
            ))}
          </g>
          <g className="web-rings">
            {web.ringPaths.map((d, k) => (
              <path
                key={k}
                d={d}
                pathLength={1}
                ref={(el) => {
                  if (el) ringRefs.current[k] = el;
                }}
                style={{ animationDelay: `${560 + k * 34}ms` }}
              />
            ))}
          </g>
          <g className="web-dew">
            {web.dew.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={1.8} style={{ animationDelay: `${(i % 5) * 0.7}s` }} />
            ))}
          </g>
          <line ref={threadRef} className="web-thread" x1={web.hub.x} y1={0} x2={web.hub.x} y2={0} />
        </svg>
      ) : null}

      {/* ---- spider + bugs (decorative) ---- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5]">
        {Array.from({ length: MAX_SLOTS }, (_, n) => (
          <div
            key={n}
            className="web-bug"
            ref={(el) => {
              if (el) slotRefs.current[n] = { ...slotRefs.current[n], root: el };
            }}
          >
            <div
              className="web-bug__body"
              ref={(el) => {
                if (el) slotRefs.current[n] = { ...slotRefs.current[n], body: el };
              }}
            >
              <BugArt />
            </div>
            <Cocoon />
            <span
              className="web-bug__label"
              ref={(el) => {
                if (el) labelRefs.current[n] = el;
              }}
            />
            <span className="web-bug__tag">Sorted ✓</span>
          </div>
        ))}


        <div
          ref={spiderRef}
          className={`web-spider ${compact ? "web-spider--sm" : ""}`}
          style={{ transform: "translate(-200px, -200px)" }}
        >
          <svg viewBox="-24 -24 48 48" className="h-full w-full overflow-visible">
            {LEG_ROOTS.map((_, n) => (
              <g
                key={n}
                ref={(el) => {
                  if (el) legRefs.current[n] = el;
                }}
              >
                <path
                  d={legPath(n)}
                  stroke="#151515"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            ))}
            <g className="spider-breathe">
              <ellipse cx="0" cy="7.5" rx="7.6" ry="9.2" fill="#E63843" />
              <path
                d="M-3.5 4 L0 7 L3.5 4 M-3 9 L0 11.6 L3 9"
                stroke="#151515"
                strokeWidth="1.1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
              />
              <ellipse cx="-2.4" cy="3.6" rx="1.6" ry="2.4" fill="rgba(255,255,255,0.35)" />
            </g>
            <circle cx="0" cy="-6" r="5.8" fill="#C42530" />
            {PUPIL_BASE.map((p, n) => (
              <g key={n}>
                <circle cx={p.x} cy={p.y} r="2.1" fill="#F5F0E8" />
                <circle
                  ref={(el) => {
                    if (el) pupilRefs.current[n] = el;
                  }}
                  cx={p.x}
                  cy={p.y - 0.4}
                  r="1.05"
                  fill="#151515"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* ---- copy + composition ---- */}
      <div
        ref={revealRef}
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-5 pb-5 pt-[4.5rem] sm:px-8 sm:pb-6 sm:pt-24 lg:min-h-[min(calc(100svh-72px),900px)] lg:px-12 lg:pb-[clamp(1rem,2.6vh,1.75rem)] lg:pt-[clamp(1.5rem,4.5vh,3rem)]"
      >
        <div className="flex-1 lg:grid lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:items-center xl:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]">
          <div ref={textRef} data-text className="realme-text relative max-w-[36rem] lg:max-w-none lg:pr-6">
            <p className="eyebrow relative text-[#E63843]">{heading.eyebrow}</p>
            <h2 id="real-me-heading" className="display realme-title relative mt-5 lg:mt-[clamp(0.75rem,2.2vh,1.25rem)]" aria-label={heading.title}>
              {heading.titleLines.map((line, i) => (
                <span key={line} className="block overflow-hidden pb-[0.05em]" aria-hidden="true">
                  <m.span
                    className="block"
                    initial={calm ? { opacity: 0 } : { y: "105%" }}
                    animate={textOn ? { y: "0%", opacity: 1 } : calm ? { opacity: 0 } : { y: "105%" }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: EASE }}
                  >
                    {line}
                  </m.span>
                </span>
              ))}
            </h2>
            <m.p
              className="realme-copy relative mt-5 max-w-[34rem] text-[rgba(21,21,21,0.82)] lg:mt-[clamp(0.75rem,2.2vh,1.25rem)]"
              initial={{ opacity: 0, y: calm ? 0 : 14 }}
              animate={textOn ? { opacity: 1, y: 0 } : { opacity: 0, y: calm ? 0 : 14 }}
              transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            >
              {heading.copy}
            </m.p>
            {desk ? mindset : null}
          </div>
        </div>

        {/* phones / tablets: the web composition sits in the flow */}
        {!desk ? (
          <div
            ref={areaRef}
            className={`relative my-4 w-full ${mode === "tab" ? "h-[60vw] max-h-[560px]" : "h-[80vw]"}`}
          />
        ) : null}
        {!desk ? (
          <div data-text className="realme-text relative">
            {mindset}
          </div>
        ) : null}

        {/* bottom strip: signature + live counter */}
        <div
          ref={stripRef}
          data-text
          className="relative mt-6 flex flex-col gap-3 border-t border-[rgba(21,21,21,0.14)] pt-4 sm:flex-row sm:items-end sm:justify-between lg:mt-[clamp(0.5rem,1.6vh,1rem)] lg:pt-[clamp(0.6rem,1.6vh,1rem)]"
        >
          <p className="realme-sign font-display font-black uppercase leading-none tracking-[-0.02em] text-[#151515]">
            {realMe.signature.lead}
            <span className="text-[#E63843]">{realMe.signature.accent}</span>
          </p>
          <div className="sm:text-right">
            <p
              className="font-display text-[0.8rem] font-bold uppercase tracking-[0.16em] text-[#151515]"
              aria-live="off"
            >
              {realMe.counterLabel}{" "}
              <span className="relative inline-flex h-[1.2em] min-w-[2ch] overflow-hidden align-bottom font-black tabular-nums text-[#C42530]">
                <AnimatePresence initial={false} mode="popLayout">
                  <m.span
                    key={count}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    {String(count).padStart(2, "0")}
                  </m.span>
                </AnimatePresence>
              </span>
            </p>
            <p className="mt-1 text-[0.82rem] text-[rgba(21,21,21,0.66)]">
              {touch ? realMe.hint.touch : realMe.hint.pointer}
            </p>
          </div>
        </div>
      </div>

      {/* ---- the five skills on the web's anchor points (real list, reading order) ---- */}
      <ol className="pointer-events-none absolute inset-0 z-20 m-0 list-none p-0">
        {nodes.map(({ skill, p, above }) => {
          const open = openNode === skill.id;
          return (
            <li
              key={skill.id}
              data-node
              className={`realme-node ${compact ? "realme-node--compact" : ""} ${above ? "is-above" : "is-below"} ${open ? "is-open" : ""} ${compact && layout ? (p.x < layout.W * 0.4 ? "tip-start" : p.x > layout.W * 0.6 ? "tip-end" : "") : ""}`}
              style={{ left: p.x, top: p.y }}
              onMouseEnter={() => engineRef.current?.vibrateAt(p)}
            >
              <span className="realme-knot" aria-hidden="true" />
              {compact ? (
                <button
                  type="button"
                  className="realme-card"
                  aria-expanded={open}
                  onClick={() => setOpenNode(open ? null : skill.id)}
                >
                  <span className="realme-card__title">{skill.title}</span>
                  <span className="realme-tip">{skill.line}</span>
                </button>
              ) : (
                <div className="realme-card">
                  <h3 className="realme-card__title">{skill.title}</h3>
                  <p className="realme-card__line">{skill.line}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
