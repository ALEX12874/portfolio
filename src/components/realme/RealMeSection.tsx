import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import DottedBackground from "../layout/DottedBackground";
import { sectionHeadings } from "../../data/site";
import { realMe } from "../../data/realMe";
import { useReveal } from "../../hooks/useReveal";
import { buildWeb, type Pt, type Tilt, type WebGeometry } from "./webGeometry";
import { LEG_ROOTS, PUPIL_BASE, SpiderEngine, type SlotEls } from "./spiderEngine";
import { realMeLayoutNow, useRealMeLayout } from "./useRealMeLayout";
import { paintBackWeb, paintMainWeb } from "./webRaster";
import { stepDownTier, useMotionTier, type MotionTier } from "../../lib/motionTier";

/**
 * 05 / THE REAL ME — one full-screen spider-web scene.
 *
 * The web = my world (family, business, customers); the spider = me; the
 * bugs = everyday problems that fly in, get caught, wrapped and "Sorted ✓";
 * the five skills = the web's anchor points. The web/spider/bug layer is
 * decorative (aria-hidden); every word is real HTML.
 *
 * Layouts (useRealMeLayout): desktop; portrait (tablet "tab" / phone
 * "phone", stacked); and landscape phones ("land"), which get the desktop
 * composition scaled into exactly one screen.
 */

type Mode = "desk" | "tab" | "phone" | "land";
const EASE = [0.22, 1, 0.36, 1] as const;

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
  land: [-140, -40, 15, 75, 160],
};

/** Depth: tilt of the web plane per layout (strongest on landscape phones). */
const TILT: Record<Mode, Tilt> = {
  desk: { x: 5, y: -6 },
  tab: { x: 5, y: -6 },
  phone: { x: 5, y: -6 },
  land: { x: 8, y: -10 },
};

const SPIDER_SIZE: Record<Mode, number> = { desk: 50, tab: 50, phone: 36, land: 30 };

/** Landscape chips: title only at 0.7rem (≈ 6.9 px per character + padding). */
const CHIP_H = 24;
const chipWidth = (title: string) => Math.round(title.length * 6.9 + 20);

function modeFor(w: number): Mode {
  const l = realMeLayoutNow();
  if (l === "landscape-phone") return "land";
  if (l === "desktop") return "desk";
  return w >= 768 ? "tab" : "phone";
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
  const wraps = ["M-9 -6 Q0 -2 9 -7", "M-9 -1 Q0 3 9 -2", "M-9 4 Q0 8 9 3", "M-7 9 Q0 12 7 8", "M-6 -10 Q-1 0 6 10"];
  return (
    <svg viewBox="-16 -16 32 32" className="web-bug__cocoon" aria-hidden="true">
      <ellipse className="cocoon-fill" cx="0" cy="0" rx="8.5" ry="11.5" fill="#F5F0E8" stroke="rgba(21,21,21,0.25)" strokeWidth="0.6" />
      {/* a thin dark edge under each silk wrap (instead of a drop-shadow filter) */}
      {wraps.map((d, i) => (
        <path key={`e${d}`} className="cocoon-wrap cocoon-wrap--edge" d={d} pathLength={1} style={{ transitionDelay: `${i * 0.12}s` }} />
      ))}
      {wraps.map((d, i) => (
        <path key={d} className="cocoon-wrap" d={d} pathLength={1} style={{ transitionDelay: `${i * 0.12}s` }} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------- web layer */

/** Draw-in timing: when the last strand of the SVG intro has finished. */
function introMs(web: WebGeometry) {
  const spokes = (web.dirs.length - 1) * 18 + 2 * 240 + 280;
  const rings = 560 + (web.ringPaths.length - 1) * 34 + 380;
  return Math.max(spokes, rings) + 80;
}

interface WebLayerProps {
  web: WebGeometry;
  drawn: boolean;
  tier: MotionTier;
  /** The raster wrapper (breathing + device tilt are applied to it). */
  rasterRef: React.MutableRefObject<HTMLDivElement | null>;
  /** The raster has taken over from the draw-in: breathing may start. */
  onRaster: () => void;
}

/**
 * The web. It "spins itself" once as a short SVG stroke animation, then
 * hands over (200 ms crossfade) to a canvas raster of exactly the same
 * strands; the SVG is then removed. From then on the web is one bitmap the
 * compositor moves (breathing, drift, tilt): nothing is repainted per frame.
 * Calm motion skips the draw-in and shows the finished web.
 */
const WebLayer = memo(function WebLayer({ web, drawn, tier, rasterRef, onRaster }: WebLayerProps) {
  const calm = tier === "calm";
  const [phase, setPhase] = useState<"wait" | "draw" | "raster">("wait");
  const mainRef = useRef<HTMLCanvasElement | null>(null);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const back = tier !== "low";

  useEffect(() => {
    if (!drawn || phase !== "wait") return undefined;
    if (calm) {
      setPhase("raster");
      return undefined;
    }
    setPhase("draw");
    return undefined;
  }, [drawn, calm, phase]);

  // draw-in finished → raster
  useEffect(() => {
    if (phase !== "draw") return undefined;
    const t = window.setTimeout(() => setPhase("raster"), introMs(web));
    return () => window.clearTimeout(t);
    // the intro length is fixed when it starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === "raster") onRaster();
  }, [phase, onRaster]);

  // (re)paint the bitmaps once per size
  useLayoutEffect(() => {
    if (phase === "wait") return;
    if (mainRef.current) paintMainWeb(mainRef.current, web);
    if (back && backRef.current) paintBackWeb(backRef.current, web);
  }, [web, phase, back]);

  // keep the SVG for the crossfade, then drop it
  const [svgGone, setSvgGone] = useState(false);
  useEffect(() => {
    if (phase !== "raster") return undefined;
    const t = window.setTimeout(() => setSvgGone(true), 260);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "wait") return null;
  const glints = calm ? [] : web.dew.slice(0, 6);

  return (
    <>
      <div ref={rasterRef} aria-hidden="true" className="realme-raster realme-breathe pointer-events-none absolute inset-0">
        {back ? (
          <div className="web-back-drift absolute inset-0">
            <canvas ref={backRef} className="web-canvas web-canvas--back" />
          </div>
        ) : null}
        <div className={`web-main absolute inset-0 ${phase === "raster" ? "is-on" : ""}`}>
          <canvas ref={mainRef} className="web-canvas" />
          {glints.map((p, i) => (
            <span key={i} className="web-glint" style={{ left: p.x, top: p.y, animationDelay: `${(i % 5) * 0.7}s` }} />
          ))}
        </div>
      </div>
      {phase === "draw" || (phase === "raster" && !svgGone && !calm) ? (
        <svg
          aria-hidden="true"
          className="realme-web pointer-events-none absolute inset-0 h-full w-full is-drawn"
          viewBox={`0 0 ${web.W} ${web.H}`}
          preserveAspectRatio="none"
          overflow="visible"
        >
          <g className="web-spokes">
            {web.spokeSegs.map(({ d, w, i, seg }) => (
              <path
                key={`${i}-${seg}`}
                d={d}
                pathLength={1}
                style={{ strokeWidth: w, animationDuration: "0.28s", animationDelay: `${i * 18 + seg * 240}ms` }}
              />
            ))}
          </g>
          <g className="web-rings">
            {web.ringPaths.map((d, k) => (
              <path key={k} d={d} pathLength={1} style={{ strokeWidth: web.ringWidths[k], animationDelay: `${560 + k * 34}ms` }} />
            ))}
          </g>
        </svg>
      ) : null}
    </>
  );
});

/* ------------------------------------------------------------- critters */

interface CritterRefs {
  spider: HTMLDivElement | null;
  thread: HTMLDivElement | null;
  wobble: HTMLDivElement | null;
  legs: SVGGElement[];
  pupils: SVGCircleElement[];
  slots: Partial<SlotEls>[];
  labels: HTMLSpanElement[];
}

/** Spider, silk thread, bug slots (pre-created, reused) and wobble overlays. */
const CritterLayer = memo(function CritterLayer({
  slots,
  spiderClass,
  refs,
  layerRef,
}: {
  slots: number;
  spiderClass: string;
  refs: React.MutableRefObject<CritterRefs>;
  layerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const r = refs.current;
  r.slots.length = slots;
  r.labels.length = slots;
  return (
    <div ref={layerRef} aria-hidden="true" className="realme-critters realme-breathe pointer-events-none absolute inset-0 z-[5]">
      <div
        className="web-wobble-host absolute inset-0"
        ref={(el) => {
          refs.current.wobble = el;
        }}
      />
      <div
        className="web-thread"
        ref={(el) => {
          refs.current.thread = el;
        }}
      />
      {Array.from({ length: slots }, (_, n) => (
        <div
          key={n}
          className="web-bug"
          ref={(el) => {
            if (el) refs.current.slots[n] = { ...refs.current.slots[n], root: el };
          }}
        >
          <div
            className="web-bug__body"
            ref={(el) => {
              if (el) refs.current.slots[n] = { ...refs.current.slots[n], body: el };
            }}
          >
            <BugArt />
          </div>
          <Cocoon />
          <span
            className="web-bug__label"
            ref={(el) => {
              if (el) refs.current.labels[n] = el;
            }}
          />
          <span className="web-bug__tag">Sorted ✓</span>
        </div>
      ))}

      <div
        ref={(el) => {
          refs.current.spider = el;
        }}
        className={`web-spider ${spiderClass}`}
        style={{ transform: "translate(-200px, -200px)" }}
      >
        <div className="spider-breathe">
        <svg viewBox="-24 -24 48 48" className="h-full w-full overflow-visible">
          {LEG_ROOTS.map((_, n) => (
            <g
              key={n}
              data-leg
              style={{ transformOrigin: `${LEG_ROOTS[n].x}px ${LEG_ROOTS[n].y}px` }}
              ref={(el) => {
                if (el) refs.current.legs[n] = el;
              }}
            >
              <path d={legPath(n)} stroke="#151515" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          ))}
          <g>
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
                data-pupil
                ref={(el) => {
                  if (el) refs.current.pupils[n] = el;
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
    </div>
  );
});

/* ------------------------------------------------------- small children */

/** The live counter: its own state, so a sorted bug re-renders only this. */
const Counter = memo(function Counter({
  apiRef,
  countRef,
}: {
  apiRef: React.MutableRefObject<(() => void) | null>;
  countRef: React.MutableRefObject<number>;
}) {
  const [count, setCount] = useState(countRef.current);
  useEffect(() => {
    apiRef.current = () => {
      countRef.current += 1;
      setCount(countRef.current);
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, countRef]);
  return (
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
  );
});

/** "I never asked 'Why only me?' …" with the strike and the lime marker. */
const Mindset = memo(function Mindset({ textOn, calm, land }: { textOn: boolean; calm: boolean; land: boolean }) {
  return (
    <m.p
      className="realme-copy relative mt-5 max-w-[34rem] text-[rgba(21,21,21,0.82)] lg:mt-[clamp(0.75rem,2.2vh,1.25rem)]"
      initial={{ opacity: 0, y: calm ? 0 : 14 }}
      animate={textOn ? { opacity: 1, y: 0 } : { opacity: 0, y: calm ? 0 : 14 }}
      transition={{ duration: 0.7, delay: land ? 0.05 : 0.45, ease: EASE }}
    >
      {realMe.mindset.before}
      <span className="relative inline-block whitespace-nowrap font-display font-extrabold text-[#151515]">
        {realMe.mindset.struck}
        <m.span
          aria-hidden="true"
          className="absolute left-[-3%] right-[-3%] top-[52%] h-[2.5px] origin-left bg-[#E63843]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: textOn ? 1 : 0 }}
          transition={{ duration: 0.6, delay: land ? 0.35 : 1.0, ease: EASE }}
        />
      </span>
      {realMe.mindset.middle}
      <span className="relative inline-block whitespace-nowrap font-display font-extrabold text-[#151515]">
        <m.span
          aria-hidden="true"
          className="absolute inset-x-[-0.12em] bottom-[0.06em] h-[44%] origin-left bg-[#D8FF63]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: textOn ? 1 : 0 }}
          transition={{ duration: 0.6, delay: land ? 0.7 : 1.35, ease: EASE }}
        />
        <span className="relative">{realMe.mindset.highlighted}</span>
      </span>
      {realMe.mindset.after}
    </m.p>
  );
});

function TitleLines({ lines, textOn, calm }: { lines: readonly string[]; textOn: boolean; calm: boolean }) {
  return (
    <>
      {lines.map((line, i) => (
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
    </>
  );
}

/** Landscape copy column: its "Read more" state stays in here. */
const LandCopy = memo(function LandCopy({
  textRef,
  textOn,
  calm,
}: {
  textRef: React.MutableRefObject<HTMLDivElement | null>;
  textOn: boolean;
  calm: boolean;
}) {
  const heading = sectionHeadings.realMe;
  const [more, setMore] = useState(false);
  // the four display lines pair up into two
  const lines = [0, 2].map((i) => heading.titleLines.slice(i, i + 2).join(" "));
  return (
    <div ref={textRef} data-text data-lenis-prevent className={`realme-text realme-land__text ${more ? "is-more" : ""}`}>
      <div className="realme-land__copy">
        <p className="eyebrow relative text-[#E63843]">{heading.eyebrow}</p>
        <h2 id="real-me-heading" className="display realme-title relative" aria-label={heading.title}>
          <TitleLines lines={lines} textOn={textOn} calm={calm} />
        </h2>
        <m.p
          id="real-me-intro"
          className="realme-land__intro relative text-[rgba(21,21,21,0.82)]"
          initial={{ opacity: 0, y: calm ? 0 : 10 }}
          animate={textOn ? { opacity: 1, y: 0 } : { opacity: 0, y: calm ? 0 : 10 }}
          transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
        >
          {heading.copy}
        </m.p>
        {more ? <Mindset textOn={textOn} calm={calm} land /> : null}
        <button
          type="button"
          className="realme-land__more relative"
          aria-expanded={more}
          aria-controls="real-me-intro"
          onClick={() => setMore((v) => !v)}
        >
          {more ? "Show less" : "Read more"}
        </button>
      </div>
    </div>
  );
});

interface NodeInfo {
  skill: (typeof realMe.skills)[number];
  p: Pt;
  above: boolean;
  rect: Rect;
  tip?: React.CSSProperties;
}

/** The five skills on the web's anchor points; the open tooltip lives here. */
const Chips = memo(function Chips({
  nodes,
  mode,
  W,
  closeRef,
  onVibrate,
  listRef,
}: {
  nodes: NodeInfo[];
  mode: Mode;
  W: number;
  closeRef: React.MutableRefObject<(() => void) | null>;
  onVibrate: (p: Pt) => void;
  listRef: React.MutableRefObject<HTMLOListElement | null>;
}) {
  const [openNode, setOpenNode] = useState<string | null>(null);
  useEffect(() => {
    closeRef.current = () => setOpenNode(null);
    return () => {
      closeRef.current = null;
    };
  }, [closeRef]);
  useEffect(() => setOpenNode(null), [mode]);
  const land = mode === "land";
  const compact = mode === "phone";

  return (
    <ol ref={listRef} className="realme-chips pointer-events-none absolute inset-0 z-20 m-0 list-none p-0">
      {nodes.map(({ skill, p, above, tip }) => {
        const open = openNode === skill.id;
        if (land) {
          const tipId = `realme-tip-${skill.id}`;
          return (
            <li
              key={skill.id}
              data-node
              className={`realme-node realme-node--chip ${above ? "is-above" : "is-below"} ${open ? "is-open" : ""}`}
              style={{ left: p.x, top: p.y }}
            >
              <span className="realme-knot" aria-hidden="true" />
              <button
                type="button"
                className="realme-card"
                aria-expanded={open}
                aria-describedby={tipId}
                onClick={() => setOpenNode(open ? null : skill.id)}
              >
                <span className="realme-card__title">{skill.title}</span>
              </button>
              <span id={tipId} className="realme-tip realme-tip--land" style={tip}>
                {skill.line}
              </span>
            </li>
          );
        }
        return (
          <li
            key={skill.id}
            data-node
            className={`realme-node ${compact ? "realme-node--compact" : ""} ${above ? "is-above" : "is-below"} ${open ? "is-open" : ""} ${compact ? (p.x < W * 0.4 ? "tip-start" : p.x > W * 0.6 ? "tip-end" : "") : ""}`}
            style={{ left: p.x, top: p.y }}
            onMouseEnter={() => onVibrate(p)}
          >
            <span className="realme-knot" aria-hidden="true" />
            {compact ? (
              <button type="button" className="realme-card" aria-expanded={open} onClick={() => setOpenNode(open ? null : skill.id)}>
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
  );
});

/* ----------------------------------------------------------- device tilt */

/**
 * Tablets on the `high` tier: tilting the device shifts the web up to ±8 px
 * (Android-style DeviceOrientation only; iOS needs a permission prompt, which
 * we never show). Attached only while the section is on screen.
 */
function createTilt(targets: () => (HTMLElement | null)[]) {
  let on = false;
  let base: { x: number; y: number; angle: number } | null = null;
  let want = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  let raf = 0;
  const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
  const write = () => {
    const v = `${cur.x.toFixed(1)}px ${cur.y.toFixed(1)}px`;
    targets().forEach((el) => {
      if (el) el.style.translate = v;
    });
  };
  const step = () => {
    raf = 0;
    cur.x += (want.x - cur.x) * 0.12;
    cur.y += (want.y - cur.y) * 0.12;
    write();
    if (Math.abs(want.x - cur.x) > 0.05 || Math.abs(want.y - cur.y) > 0.05) raf = requestAnimationFrame(step);
  };
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    const angle = window.screen.orientation?.angle ?? 0;
    let gx = e.gamma;
    let gy = e.beta;
    if (angle === 90) {
      gx = e.beta;
      gy = -e.gamma;
    } else if (angle === 270) {
      gx = -e.beta;
      gy = e.gamma;
    }
    if (!base || base.angle !== angle) base = { x: gx, y: gy, angle };
    want = { x: clamp1((gx - base.x) / 25) * 8, y: clamp1((gy - base.y) / 25) * 8 };
    if (!raf) raf = requestAnimationFrame(step);
  };
  return {
    attach() {
      if (on) return;
      on = true;
      window.addEventListener("deviceorientation", onTilt);
    },
    detach() {
      if (!on) return;
      on = false;
      window.removeEventListener("deviceorientation", onTilt);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    reset() {
      this.detach();
      base = null;
      cur.x = 0;
      cur.y = 0;
      targets().forEach((el) => {
        if (el) el.style.translate = "";
      });
    },
  };
}

function tiltSupported() {
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent;
  return !!DOE && typeof DOE.requestPermission !== "function" && window.matchMedia("(pointer: coarse)").matches;
}

/* --------------------------------------------------------------- section */

export default function RealMeSection() {
  const heading = sectionHeadings.realMe;
  const tier = useMotionTier();
  const calm = tier === "calm";
  const rmLayout = useRealMeLayout();
  const sectionRef = useRef<HTMLElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [mode, setMode] = useState<Mode>(() =>
    typeof window === "undefined" ? "desk" : modeFor(window.innerWidth)
  );
  const [touch, setTouch] = useState(false);
  // the web (geometry, chips, spider engine) is only built once the section
  // comes within ~1.5 screens: mounting the section stays a light task
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);
  nearRef.current = near;
  const { ref: revealRef, shown } = useReveal<HTMLDivElement>("0px 0px -20% 0px");
  const { ref: textRef, shown: textShown } = useReveal<HTMLDivElement>();
  const drawn = shown;
  // the wrapper also reveals the copy: after a rotation the copy column is a
  // new element, and it must never stay hidden
  const textOn = textShown || shown;

  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);

  // ---- measure the composition (only on mount / resize / rotation — never per frame)
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
      const fx = md === "land" ? 0.55 : md === "phone" ? 0.5 : 0.56;
      const fy = md === "land" ? 0.48 : 0.5;
      hub = { x: Math.round(area.x + area.w * fx), y: Math.round(area.y + area.h * fy) };
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
      cur.mode === next.mode &&
      Math.round(cur.area?.w ?? 0) === Math.round(next.area?.w ?? 0) &&
      Math.round(cur.area?.h ?? 0) === Math.round(next.area?.h ?? 0)
        ? cur
        : next
    );
  }, [textRef]);

  // ---- engine + layer refs
  const critters = useRef<CritterRefs>({ spider: null, thread: null, wobble: null, legs: [], pupils: [], slots: [], labels: [] });
  const rasterRef = useRef<HTMLDivElement | null>(null);
  const critterLayerRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLOListElement | null>(null);
  const closeChips = useRef<(() => void) | null>(null);
  const counterApi = useRef<(() => void) | null>(null);
  const countRef = useRef(0);
  const engineRef = useRef<SpiderEngine | null>(null);
  const engineKey = useRef("");
  const visibleRef = useRef(false);
  const drawnRef = useRef(false);
  const rotatingRef = useRef(false);
  const settleTimer = useRef(0);
  const tiltRef = useRef<ReturnType<typeof createTilt> | null>(null);
  drawnRef.current = drawn;

  const setRunning = useCallback((run: boolean) => {
    const sec = sectionRef.current;
    if (sec) sec.dataset.paused = run ? "false" : "true";
    if (run) {
      engineRef.current?.start();
      tiltRef.current?.attach();
    } else {
      engineRef.current?.stop();
      tiltRef.current?.detach();
    }
  }, []);

  /**
   * Rotation / resize: pause everything, hide the scene for a moment, then
   * re-measure once the size has settled (~150 ms) and restart on the new
   * web (bugs are reset, so nothing is stranded off-screen).
   */
  const settle = useCallback(() => {
    const sec = sectionRef.current;
    rotatingRef.current = true;
    setRunning(false);
    if (sec) sec.dataset.rotating = "true";
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      rotatingRef.current = false;
      if (nearRef.current) measure();
      if (sec) sec.dataset.rotating = "false";
      setRunning(visibleRef.current && drawnRef.current);
    }, 150);
  }, [measure, setRunning]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  useEffect(() => {
    const sec = sectionRef.current;
    if (near || !sec) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return undefined;
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), {
      rootMargin: "150% 0px",
    });
    io.observe(sec);
    return () => io.disconnect();
  }, [near]);

  // first measure as soon as the section is near; later size changes settle first
  useLayoutEffect(() => {
    if (near) measure();
  }, [measure, mode, near]);

  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec || typeof ResizeObserver === "undefined") return undefined;
    let first = true;
    const ro = new ResizeObserver(() => {
      // the observer always reports once on attach: that size is measured already
      if (first) {
        first = false;
        return;
      }
      settle();
    });
    ro.observe(sec);
    window.addEventListener("orientationchange", settle);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", settle);
    };
  }, [settle]);

  // the layout switches live when the phone is rotated
  const firstLayout = useRef(true);
  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false;
      return;
    }
    setMode(modeFor(window.innerWidth));
    settle();
  }, [rmLayout, settle]);

  // ---- web geometry: built once per size (tilted for depth, most on landscape phones)
  const web: WebGeometry | null = useMemo(
    () =>
      layout
        ? buildWeb(layout.W, layout.H, layout.hub, layout.mode === "phone" || layout.mode === "land", TILT[layout.mode])
        : null,
    [layout]
  );

  // ---- the five anchor points, snapped onto real strand crossings so that
  // no card collides with another card, the copy, the strip or the edges
  const nodes: NodeInfo[] = useMemo(() => {
    if (!web || !layout) return [];
    const { mode: md, area, W, H, textRight, stripTop } = layout;
    const land = md === "land";
    const rx = land
      ? Math.min((area?.w ?? W) * 0.5 - 60, (area?.h ?? H) * 0.62)
      : md === "desk"
        ? Math.min(W * 0.2, 300)
        : md === "tab"
          ? (area?.w ?? W) * 0.3
          : W * 0.3;
    const ry = land
      ? (area?.h ?? H) * 0.34
      : md === "desk"
        ? Math.min(H * 0.3, 270)
        : (area?.h ?? H) * (md === "tab" ? 0.34 : 0.36);
    const gap = land ? 10 : 14;
    const bounds =
      md === "desk"
        ? { x0: textRight + 12, x1: W - 16, y0: 24, y1: stripTop - 10 }
        : area
          ? land
            ? { x0: area.x + 2, x1: area.x + area.w - 2, y0: area.y + 2, y1: area.y + area.h - 4 }
            : { x0: Math.max(area.x - 6, 8), x1: Math.min(area.x + area.w + 6, W - 8), y0: area.y, y1: area.y + area.h }
          : { x0: 8, x1: W - 8, y0: 0, y1: H };
    const crossings: Pt[] = [];
    for (let i = 0; i < web.dirs.length; i += 1) {
      for (let k = 3; k < web.radius[i].length; k += 1) crossings.push(web.point(i, k));
    }
    const placed: Rect[] = [];
    return NODE_ANGLES[md].map((deg, i) => {
      const skill = realMe.skills[i];
      const cw = land ? chipWidth(skill.title) : md === "phone" ? 118 : 184;
      const ch = land ? CHIP_H : md === "phone" ? 46 : 122;
      const a = (deg * Math.PI) / 180;
      const want = { x: web.hub.x + Math.cos(a) * rx, y: web.hub.y + Math.sin(a) * ry };
      const above = md === "phone" ? i === 0 : deg < 0;
      const rectAt = (p: Pt): Rect => ({ x: p.x - cw / 2, y: above ? p.y - gap - ch : p.y + gap, w: cw, h: ch });
      const fits = (p: Pt) => {
        const r = rectAt(p);
        if (r.x < bounds.x0 || r.x + r.w > bounds.x1 || r.y < bounds.y0 || r.y + r.h > bounds.y1) return false;
        if (Math.hypot(p.x - web.hub.x, p.y - web.hub.y) < (land ? 52 : 70)) return false;
        return !placed.some((q) => overlaps(r, q, land ? 8 : 10));
      };
      const ranked = crossings
        .map((p) => ({ p, d: Math.hypot(p.x - want.x, p.y - want.y) }))
        .sort((x, y) => x.d - y.d);
      const pick = ranked.find((c) => fits(c.p))?.p ?? web.nearest(want, 3).p;
      const rect = rectAt(pick);
      placed.push(rect);

      // landscape: the one-liner opens in a small card that stays inside the
      // web column — centred under/over the chip, slid or flipped to the side with room
      let tip: React.CSSProperties | undefined;
      if (land && area) {
        const tw = Math.min(210, area.w - 12);
        const lines = Math.ceil((skill.line.length * 6.3) / (tw - 18));
        const th = lines * 16 + 14;
        const dx = Math.max(area.x + 6 - pick.x, Math.min(-tw / 2, area.x + area.w - 6 - tw - pick.x));
        const roomBelow = area.y + area.h - (above ? pick.y + 8 : rect.y + rect.h + 6);
        const roomAbove = (above ? rect.y - 6 : pick.y - 8) - area.y;
        const down = roomBelow >= th || roomBelow >= roomAbove;
        tip = down
          ? { left: dx, width: tw, top: above ? 8 : gap + ch + 6 }
          : { left: dx, width: tw, top: "auto", bottom: above ? gap + ch + 6 : 8 };
      }
      return { skill, p: pick, above, rect, tip };
    });
  }, [web, layout]);

  // ---- engine
  const layoutRef = useRef<Layout | null>(null);
  const nodesRef = useRef<Pt[]>([]);
  const cardsRef = useRef<Rect[]>([]);
  layoutRef.current = layout;
  nodesRef.current = nodes.map((n) => n.p);
  cardsRef.current = nodes.map((n) => n.rect);

  const allow = useCallback((p: Pt) => {
    const l = layoutRef.current;
    if (!l) return false;
    const small = l.mode === "phone" || l.mode === "land";
    if (Math.hypot(p.x - l.hub.x, p.y - l.hub.y) < (small ? 40 : 60)) return false;
    if (nodesRef.current.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < (small ? 44 : 70))) return false;
    // a stuck bug carries a label pill above it: keep both clear of the cards
    // (portrait phones have little room, so there only the bug itself stays clear)
    const bug =
      l.mode === "phone"
        ? { x: p.x - 16, y: p.y - 16, w: 32, h: 32 }
        : l.mode === "land"
          ? { x: p.x - 78, y: p.y - 32, w: 156, h: 46 }
          : { x: p.x - 70, y: p.y - 44, w: 140, h: 60 };
    if (cardsRef.current.some((c) => overlaps(bug, c))) return false;
    if (l.mode === "desk") {
      return p.x > l.textRight + 80 && p.x < l.W - 80 && p.y > 70 && p.y < l.stripTop - 30;
    }
    const a = l.area;
    if (!a) return false;
    const mx = l.mode === "land" ? 18 : small ? 14 : 24;
    const my = l.mode === "land" ? 26 : small ? 10 : 16;
    return p.x > a.x + mx && p.x < a.x + a.w - mx && p.y > a.y + my && p.y < a.y + a.h - my;
  }, []);

  const onSorted = useCallback(() => counterApi.current?.(), []);
  const slotCount = mode === "desk" || mode === "tab" ? 4 : 3;

  useEffect(() => {
    const r = critters.current;
    if (!web || !layout || !r.spider || !r.thread || !r.wobble) return;
    const md = layout.mode;
    const els = {
      spider: r.spider,
      legs: r.legs,
      pupils: r.pupils,
      thread: r.thread,
      slots: r.slots.slice(0, slotCount) as SlotEls[],
      labels: r.labels.slice(0, slotCount),
      wobbleHost: r.wobble,
    };
    // landscape phones: bugs come in from the top/right over the web column
    // only, swerve less, and their labels stay inside that column
    const a = layout.area;
    const bounded =
      md === "land" && a
        ? {
            edges: ["top", "right"] as const,
            entryX: { x0: a.x + a.w * 0.3, x1: layout.W },
            wiggle: 0.35,
            labelBounds: { x0: a.x + 4, x1: layout.W - 6 },
          }
        : { edges: undefined, entryX: undefined, wiggle: undefined, labelBounds: undefined };
    const key = `${md}:${tier}:${slotCount}`;
    if (!engineRef.current || engineKey.current !== key) {
      engineRef.current?.destroy();
      const high = tier === "high";
      engineRef.current = new SpiderEngine(web, els, {
        // calm: a finished scene with one slow bug every ~8 s
        cap: calm ? 1 : high && md === "desk" ? 4 : 3,
        size: SPIDER_SIZE[md],
        speed: (md === "phone" ? 150 : md === "land" ? 140 : 220) * (calm ? 0.5 : 1),
        calm,
        labels: realMe.bugLabels,
        onSorted,
        allow,
        fps30: !high,
        wobble: high,
        spawnEvery: calm ? [8, 8] : [2.5, 4],
        onSlow: high ? stepDownTier : undefined,
        ...bounded,
      });
      engineKey.current = key;
    } else {
      engineRef.current.configure(bounded);
      engineRef.current.setGeometry(web);
    }
    if (visibleRef.current && drawn && !rotatingRef.current) engineRef.current.start();
  }, [web, layout, tier, calm, allow, onSorted, drawn, slotCount]);

  useEffect(() => () => engineRef.current?.destroy(), []);

  // device tilt: tablets on the high tier only, attached only while in view
  useEffect(() => {
    if (tier !== "high" || !tiltSupported()) return undefined;
    const t = createTilt(() => [rasterRef.current, critterLayerRef.current, chipsRef.current]);
    tiltRef.current = t;
    if (visibleRef.current && !rotatingRef.current) t.attach();
    return () => {
      t.reset();
      tiltRef.current = null;
    };
  }, [tier]);

  // run only while ≥ 10 % of the section is on screen
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec || typeof IntersectionObserver === "undefined") {
      visibleRef.current = true;
      return undefined;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
        if (rotatingRef.current) return;
        setRunning(e.isIntersecting && drawn);
      },
      { threshold: 0.1 }
    );
    io.observe(sec);
    return () => io.disconnect();
  }, [drawn, setRunning]);

  // the raster took over from the draw-in: breathing starts (web + critters
  // together, so the bugs stay on their strands)
  const onRaster = useCallback(() => {
    const sec = sectionRef.current;
    if (sec) sec.dataset.breathe = "on";
  }, []);

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
    closeChips.current?.();
    const p = local(e);
    if (p) engineRef.current?.throwBug(p);
  };
  // eyes follow the cursor: one rect read per pointer event, rAF-batched
  const pointer = useRef<{ clientX: number; clientY: number } | null>(null);
  const pointerRaf = useRef(0);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.current = { clientX: e.clientX, clientY: e.clientY };
    if (pointerRaf.current) return;
    pointerRaf.current = requestAnimationFrame(() => {
      pointerRaf.current = 0;
      if (pointer.current) engineRef.current?.setMouse(local(pointer.current));
    });
  };
  const onVibrate = useCallback((p: Pt) => engineRef.current?.vibrateAt(p), []);

  const desk = mode === "desk";
  const land = mode === "land";
  const compact = mode === "phone";
  const hint = touch ? realMe.hint.touch : realMe.hint.pointer;

  return (
    <section
      ref={sectionRef}
      id="real-me"
      aria-labelledby="real-me-heading"
      data-tier={tier}
      className={`realme relative overflow-hidden bg-[#EFE8DC] text-[#151515] ${
        land ? "realme--land" : "lg:flex lg:min-h-[calc(100svh-72px)] lg:items-center"
      }`}
      style={
        {
          touchAction: "pan-y",
          "--hub-x": layout ? `${layout.hub.x}px` : "50%",
          "--hub-y": layout ? `${layout.hub.y}px` : "50%",
        } as React.CSSProperties
      }
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={() => engineRef.current?.setMouse(null)}
    >
      <DottedBackground tone="ivory" />

      {/* ---- the web (decorative): draw-in once, then one raster layer ---- */}
      {web ? <WebLayer web={web} drawn={drawn} tier={tier} rasterRef={rasterRef} onRaster={onRaster} /> : null}

      {/* ---- spider + bugs (decorative) ---- */}
      <CritterLayer
        slots={slotCount}
        spiderClass={compact ? "web-spider--sm" : land ? "web-spider--xs" : ""}
        refs={critters}
        layerRef={critterLayerRef}
      />

      {/* ---- copy + composition ---- */}
      <div
        ref={revealRef}
        className={
          land
            ? "realme-land relative z-10"
            : "relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-5 pb-5 pt-[4.5rem] sm:px-8 sm:pb-6 sm:pt-24 lg:min-h-[min(calc(100svh-72px),900px)] lg:px-12 lg:pb-[clamp(1rem,2.6vh,1.75rem)] lg:pt-[clamp(1.5rem,4.5vh,3rem)]"
        }
      >
        {land ? (
          <>
            {/* landscape phones: copy left, web right, signature strip below — one screen */}
            <div className="realme-land__cols">
              <LandCopy textRef={textRef} textOn={textOn} calm={calm} />
              <div ref={areaRef} className="realme-land__web" />
            </div>
            <div ref={stripRef} data-text className="realme-land__strip relative">
              <p className="realme-sign font-display font-black uppercase leading-none tracking-[-0.02em] text-[#151515]">
                {realMe.signature.lead}
                <span className="text-[#E63843]">{realMe.signature.accent}</span>
              </p>
              <div className="realme-land__count">
                <p className="font-display font-bold uppercase text-[#151515]" aria-live="off">
                  {realMe.counterLabel} <Counter apiRef={counterApi} countRef={countRef} />
                </p>
                <p className="realme-land__hint text-[rgba(21,21,21,0.66)]">{hint}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 lg:grid lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:items-center xl:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]">
              <div ref={textRef} data-text className="realme-text relative max-w-[36rem] lg:max-w-none lg:pr-6">
                <p className="eyebrow relative text-[#E63843]">{heading.eyebrow}</p>
                <h2 id="real-me-heading" className="display realme-title relative mt-5 lg:mt-[clamp(0.75rem,2.2vh,1.25rem)]" aria-label={heading.title}>
                  <TitleLines lines={heading.titleLines} textOn={textOn} calm={calm} />
                </h2>
                <m.p
                  className="realme-copy relative mt-5 max-w-[34rem] text-[rgba(21,21,21,0.82)] lg:mt-[clamp(0.75rem,2.2vh,1.25rem)]"
                  initial={{ opacity: 0, y: calm ? 0 : 14 }}
                  animate={textOn ? { opacity: 1, y: 0 } : { opacity: 0, y: calm ? 0 : 14 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
                >
                  {heading.copy}
                </m.p>
                {desk ? <Mindset textOn={textOn} calm={calm} land={false} /> : null}
              </div>
            </div>

            {/* phones / tablets: the web composition sits in the flow */}
            {!desk ? (
              <div
                ref={areaRef}
                className={`relative my-4 w-full ${
                  mode === "tab" ? "h-[min(60vw,calc(100svh-4.5rem))] max-h-[560px]" : "h-[min(80vw,calc(100svh-4.5rem))]"
                }`}
              />
            ) : null}
            {!desk ? (
              <div data-text className="realme-text relative">
                <Mindset textOn={textOn} calm={calm} land={false} />
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
                <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.16em] text-[#151515]" aria-live="off">
                  {realMe.counterLabel} <Counter apiRef={counterApi} countRef={countRef} />
                </p>
                <p className="mt-1 text-[0.82rem] text-[rgba(21,21,21,0.66)]">{hint}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---- the five skills on the web's anchor points (real list, reading order) ---- */}
      <Chips nodes={nodes} mode={mode} W={layout?.W ?? 0} closeRef={closeChips} onVibrate={onVibrate} listRef={chipsRef} />
    </section>
  );
}
