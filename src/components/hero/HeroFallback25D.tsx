import { useEffect, useMemo, useRef, useState } from "react";
import { assets } from "../../data/assets";

/** Deterministic PRNG so the skyline looks the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Tower {
  x: number;
  w: number;
  h: number;
  windows: Array<{ x: number; y: number; lime: boolean }>;
}

/** One skyline row: towers standing on y = 300 of a 0 0 800 300 viewBox. */
function buildRow(seed: number, minH: number, maxH: number, gap: number, lit: number): Tower[] {
  const rnd = seeded(seed);
  const towers: Tower[] = [];
  let x = -20;
  while (x < 820) {
    const w = 46 + Math.floor(rnd() * 48);
    const h = minH + Math.floor(rnd() * (maxH - minH));
    const windows: Tower["windows"] = [];
    for (let wy = 300 - h + 12; wy < 290; wy += 14) {
      for (let wx = x + 8; wx < x + w - 8; wx += 12) {
        const r = rnd();
        if (r < lit) windows.push({ x: wx, y: wy, lime: r < lit * 0.06 });
      }
    }
    towers.push({ x, w, h, windows });
    x += w + gap + Math.floor(rnd() * 10);
  }
  return towers;
}

/** Slanted road (rises to the right) in a 0 0 800 300 viewBox. */
const ROAD_TOP_L = 210;
const ROAD_TOP_R = 120;
const ROAD_W = 110; // vertical thickness of the road band
const FOOTPATH = 46; // depth of the footpath strip above the road
const laneY = (x: number, offset: number) =>
  ROAD_TOP_L + (ROAD_TOP_R - ROAD_TOP_L) * (x / 800) + offset;

const CARS = [
  { color: "#F5F0E8", lane: 34, dur: 9, delay: 0, reverse: false },
  { color: "#151515", lane: 76, dur: 12, delay: -5, reverse: true },
  { color: "#E63843", lane: 34, dur: 9, delay: -4.5, reverse: false },
];

const WALKERS = [
  { x: 250, watch: true },
  { x: 318, watch: false },
  { x: 470, watch: true },
  { x: 560, watch: false },
];

/**
 * Layered 2.5D fallback for the hero scene — used when WebGL is unavailable,
 * the user prefers reduced motion, the viewport is below 768px, or the 3D
 * scene measured too slow. The billboard always stays fully inside the stage
 * (≥ 4% margin); road, cars and pedestrians share one SVG coordinate system
 * so the cars drive along the road's angle. The artwork file is never edited.
 */
export default function HeroFallback25D() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  const rows = useMemo(
    () => [
      { towers: buildRow(11, 150, 250, 8, 0.16), fill: "rgba(21,21,21,0.08)", y: -26 },
      { towers: buildRow(23, 110, 200, 14, 0.22), fill: "rgba(21,21,21,0.14)", y: -10 },
      { towers: buildRow(37, 70, 150, 22, 0.3), fill: "rgba(21,21,21,0.22)", y: 0 },
    ],
    []
  );

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const node = wrapRef.current;
    if (!node || window.matchMedia("(pointer: coarse)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const laneD = (offset: number, reverse: boolean) =>
    reverse
      ? `M 860 ${laneY(860, offset)} L -60 ${laneY(-60, offset)}`
      : `M -60 ${laneY(-60, offset)} L 860 ${laneY(860, offset)}`;

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-[300px] w-full overflow-hidden"
      role="img"
      aria-label="Illustrated roadside billboard reading IT'S ALL MARKETING. with cars and pedestrians passing by"
    >
      {/* ---- skyline: three ink-tinted rows, fading toward the horizon ---- */}
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-[25%] h-[60%] w-full"
        viewBox="0 0 800 300"
        preserveAspectRatio="xMidYMax slice"
        style={{
          transform: `translate(${tilt.x * -8}px, ${tilt.y * -4}px)`,
          transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 45%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 45%)",
        }}
      >
        {rows.map((row, ri) => (
          <g key={ri} transform={`translate(0 ${row.y})`}>
            {row.towers.map((t, ti) => (
              <g key={ti}>
                <rect x={t.x} y={300 - t.h} width={t.w} height={t.h + 30} fill={row.fill} />
                {ri > 0
                  ? t.windows.map((w, wi) => (
                      <rect
                        key={wi}
                        x={w.x}
                        y={w.y}
                        width="4"
                        height="5"
                        rx="1"
                        fill={w.lime ? "#D8FF63" : "#F5F0E8"}
                        opacity={ri === 2 ? 0.9 : 0.6}
                      />
                    ))
                  : null}
              </g>
            ))}
          </g>
        ))}
      </svg>

      {/* ---- billboard: centred, ≥ 4% margin, posts down to the footpath ---- */}
      <div
        className="absolute inset-x-[6%] bottom-[22%] top-[8%] flex flex-col items-center"
        style={{
          transform: `translate(${tilt.x * 6}px, ${tilt.y * 4}px)`,
          transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* lamp rig + soft light cones */}
        <div className="relative w-full" aria-hidden="true">
          <div className="flex justify-around px-[14%]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative flex flex-col items-center">
                <span className="block h-[10px] w-[3px] bg-[#151515]" />
                <span className="block h-[6px] w-[22px] rounded-[2px] bg-[#F5F0E8] shadow-[0_0_10px_rgba(255,244,226,0.9)] ring-1 ring-[#151515]" />
                <span
                  className="pointer-events-none absolute top-[14px] h-[60px] w-[120px]"
                  style={{
                    background: "radial-gradient(60% 100% at 50% 0%, rgba(255,244,226,0.55), rgba(255,244,226,0))",
                    clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* board: slim ink frame → red bezel → artwork */}
        <div className="relative w-full shrink-0 rounded-[4px] bg-[#151515] p-[1.4%] shadow-[0_26px_60px_rgba(21,21,21,0.3)]">
          <div className="rounded-[2px] bg-[#E63843] p-[0.8%]">
            <img
              src={assets.billboard}
              alt="Billboard artwork reading IT'S ALL MARKETING."
              width={1400}
              height={350}
              decoding="async"
              className="block aspect-[3.25/1] w-full select-none object-cover"
              style={{ objectPosition: "right center" }}
              draggable={false}
            />
          </div>
        </div>

        {/* two posts down to the footpath */}
        <div className="flex w-full flex-1 justify-between px-[16%]" aria-hidden="true">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="block h-full w-[clamp(5px,1.1%,10px)] bg-[#151515]"
              style={{ boxShadow: "inset -2px 0 0 rgba(245,240,232,0.15)" }}
            />
          ))}
        </div>
      </div>
      {/* ---- footpath + slanted road + cars + pedestrians (one SVG) ---- */}
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[44%] w-full"
        viewBox="0 0 800 300"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="fb-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2B2724" />
            <stop offset="1" stopColor="#1C1917" />
          </linearGradient>
          <linearGradient id="fb-path" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DCD4C5" />
            <stop offset="1" stopColor="#D6CEBF" />
          </linearGradient>
        </defs>

        {/* footpath strip (where the billboard and crowd stand) */}
        <polygon
          points={`0,${ROAD_TOP_L - FOOTPATH} 800,${ROAD_TOP_R - FOOTPATH} 800,${ROAD_TOP_R} 0,${ROAD_TOP_L}`}
          fill="url(#fb-path)"
        />
        <path
          d={`M 0 ${ROAD_TOP_L - FOOTPATH} L 800 ${ROAD_TOP_R - FOOTPATH}`}
          stroke="rgba(21,21,21,0.18)"
          strokeWidth="1.5"
        />
        <polygon
          points={`0,${ROAD_TOP_L - 6} 800,${ROAD_TOP_R - 6} 800,${ROAD_TOP_R} 0,${ROAD_TOP_L}`}
          fill="#B9B0A2"
        />

        {/* road band rising to the right */}
        <polygon points={`0,${ROAD_TOP_L} 800,${ROAD_TOP_R} 800,300 0,300`} fill="url(#fb-road)" />
        {/* near kerb line */}
        <path
          d={`M 0 ${ROAD_TOP_L + ROAD_W} L 800 ${ROAD_TOP_R + ROAD_W}`}
          stroke="rgba(245,240,232,0.35)"
          strokeWidth="2"
        />

        {/* lane dashes at the road angle */}
        <path
          d={`M 0 ${laneY(0, 55)} L 800 ${laneY(800, 55)}`}
          stroke="rgba(245,240,232,0.85)"
          strokeWidth="3"
          strokeDasharray="26 22"
        />
        <path
          d={`M 0 ${laneY(0, 2)} L 800 ${laneY(800, 2)}`}
          stroke="rgba(245,240,232,0.4)"
          strokeWidth="1.5"
        />

        {/* lane paths the cars follow */}
        {CARS.map((c, i) => (
          <path key={i} id={`fb-lane-${i}`} d={laneD(c.lane, c.reverse)} fill="none" />
        ))}

        {/* cars — move along the road angle, rotated to its tangent */}
        {CARS.map((c, i) => {
          const car = (
            <g>
              <ellipse cx="0" cy="9" rx="26" ry="4" fill="rgba(0,0,0,0.35)" />
              <rect x="-24" y="-6" width="48" height="13" rx="4" fill={c.color} stroke="#151515" strokeWidth="1.2" />
              <rect x="-12" y="-14" width="24" height="10" rx="3" fill={c.color} stroke="#151515" strokeWidth="1.2" />
              <rect x="-9" y="-12" width="18" height="6" rx="1.5" fill="rgba(21,21,21,0.55)" />
              <circle cx="-14" cy="7" r="4" fill="#151515" />
              <circle cx="14" cy="7" r="4" fill="#151515" />
            </g>
          );
          if (reduced) {
            const x = 180 + i * 210;
            const ang = (Math.atan2(ROAD_TOP_R - ROAD_TOP_L, 800) * 180) / Math.PI;
            return (
              <g key={i} transform={`translate(${x} ${laneY(x, c.lane)}) rotate(${c.reverse ? ang + 180 : ang})`}>
                {car}
              </g>
            );
          }
          return (
            <g key={i}>
              <animateMotion dur={`${c.dur}s`} begin={`${c.delay}s`} repeatCount="indefinite" rotate="auto">
                <mpath href={`#fb-lane-${i}`} />
              </animateMotion>
              {c.reverse ? <g transform="scale(1 -1)">{car}</g> : car}
            </g>
          );
        })}

        {/* pedestrians on the footpath — two look up at the billboard */}
        {WALKERS.map((w, i) => {
          const y = laneY(w.x, -14);
          return (
            <g key={i} transform={`translate(${w.x} ${y})`}>
              <ellipse cx="0" cy="1" rx="7" ry="2" fill="rgba(21,21,21,0.18)" />
              <g className={reduced ? undefined : "fb-bob"} style={{ animationDelay: `${-i * 0.7}s` }}>
                <circle cx={w.watch ? 1.5 : 0} cy="-29" r="4.2" fill="#151515" />
                <rect x="-4" y="-24" width="8" height="14" rx="3.5" fill={i === 2 ? "#E63843" : "#151515"} />
                <rect x="-3.4" y="-11" width="2.8" height="11" rx="1.4" fill="#151515" />
                <rect x="0.6" y="-11" width="2.8" height="11" rx="1.4" fill="#151515" />
                {w.watch ? (
                  <rect x="3" y="-30" width="2.4" height="10" rx="1.2" fill="#151515" transform="rotate(-35 3 -22)" />
                ) : null}
              </g>
            </g>
          );
        })}
      </svg>

    </div>
  );
}
