import { useEffect, useState } from "react";
import { assets } from "../../../data/assets";

/*
 * One shared coordinate system (viewBox 0 0 800 450, bottom-anchored "slice"
 * so nothing is ever stretched): the road, its lane lines, the route line,
 * the speed lines and the trucks all live in the same SVG, so the trucks
 * always sit on the road at the road's angle, whatever the stage's shape.
 */
const SLOPE = -0.287; // road rises to the right: atan(0.287) ≈ 16°
const ANGLE = (Math.atan(SLOPE) * 180) / Math.PI; // ≈ -16°
const ROAD_TOP = 330; // road's upper (far) edge at x = 0
const ROAD_THICK = 120;
const yAt = (x: number, offset: number) => ROAD_TOP + offset + SLOPE * x;
const line = (offset: number, x0 = -200, x1 = 1000) => `M ${x0} ${yAt(x0, offset)} L ${x1} ${yAt(x1, offset)}`;

const NEAR_LANE = 80; // offsets from the road's top edge
const FAR_LANE = 42;
const LOOP_S = 12;

/**
 * Side-view box truck, facing right (direction of travel). Origin = where
 * the wheels meet the road, so placing the origin on the lane line keeps the
 * wheels on the road. The wrap text is SVG, so it rotates and scales with
 * the truck and is always readable.
 */
function Truck({ spin }: { spin: boolean }) {
  const wheel = (cx: number) => (
    <g>
      <circle cx={cx} cy={-14} r={14} fill="#151515" />
      <g>
        {spin ? (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} -14`}
            to={`360 ${cx} -14`}
            dur="0.9s"
            repeatCount="indefinite"
          />
        ) : null}
        <circle cx={cx} cy={-14} r={6} fill="#F5F0E8" />
        <rect x={cx - 1.2} y={-24} width={2.4} height={20} fill="#151515" />
        <rect x={cx - 10} y={-15.2} width={20} height={2.4} fill="#151515" />
      </g>
    </g>
  );

  return (
    <g>
      {/* soft shadow on the road */}
      <ellipse cx={-4} cy={1} rx={104} ry={6} fill="rgba(21,21,21,0.35)" />
      {/* speed lines trailing the truck, parallel to the road */}
      <g stroke="#F5F0E8" strokeLinecap="round" opacity={0.55}>
        <line x1={-150} y1={-70} x2={-112} y2={-70} strokeWidth={3} />
        <line x1={-170} y1={-52} x2={-114} y2={-52} strokeWidth={3} />
        <line x1={-140} y1={-34} x2={-112} y2={-34} strokeWidth={3} />
      </g>
      {/* cargo box */}
      <rect x={-104} y={-104} width={142} height={86} rx={6} fill="#FFFFFF" stroke="#151515" strokeWidth={4} />
      {/* red wrap band */}
      <rect x={-102} y={-40} width={138} height={14} fill="#E63843" />
      {/* wrap: WREPD. + tagline */}
      <text
        x={-33}
        y={-58}
        textAnchor="middle"
        fontFamily="Archivo, ui-sans-serif, system-ui, sans-serif"
        fontWeight={900}
        fontStyle="italic"
        fontSize={28}
        fill="#E63843"
        letterSpacing={-0.5}
      >
        WREPD.
      </text>
      <text
        x={-33}
        y={-45}
        textAnchor="middle"
        fontFamily="Archivo, ui-sans-serif, system-ui, sans-serif"
        fontWeight={800}
        fontSize={7.6}
        letterSpacing={1.2}
        fill="#151515"
      >
        ADVERTISING THAT MOVES
      </text>
      {/* cab */}
      <path
        d="M 38 -78 H 72 L 98 -48 V -18 H 38 Z"
        fill="#FFFFFF"
        stroke="#151515"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* windshield */}
      <path d="M 50 -70 H 69 L 88 -48 H 50 Z" fill="#151515" opacity={0.85} />
      {/* cab stripe + headlight */}
      <rect x={40} y={-36} width={56} height={8} fill="#E63843" />
      <rect x={92} y={-30} width={6} height={6} rx={1.5} fill="#D8FF63" />
      {/* chassis */}
      <rect x={-104} y={-20} width={202} height={6} rx={3} fill="#151515" />
      {wheel(-66)}
      {wheel(66)}
    </g>
  );
}

/** A truck driving the lane path: fades in/out at the ends, shrinks with distance. */
function MovingTruck({ lane, begin, scale }: { lane: string; begin: number; scale: number }) {
  return (
    <g opacity={0}>
      <animateMotion dur={`${LOOP_S}s`} begin={`${begin}s`} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${lane}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.08;0.92;1"
        dur={`${LOOP_S}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
      <g>
        {/* perspective: large near (bottom-left), small far (top-right) */}
        <animateTransform
          attributeName="transform"
          type="scale"
          from={`${1.15 * scale}`}
          to={`${0.55 * scale}`}
          dur={`${LOOP_S}s`}
          begin={`${begin}s`}
          repeatCount="indefinite"
        />
        <Truck spin />
      </g>
    </g>
  );
}

/**
 * WREPD atmosphere: campaign red + crisp white + ink shadows. A slanted road
 * with a self-drawing lime route, wrapped trucks driving along it (tilted to
 * the road, scaled for depth), parallel speed lines and understated GPS pins.
 */
export default function WrepdEnv() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const midX = 380;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(75% 55% at 50% 20%, rgba(255,255,255,0.18) 0%, rgba(230,56,67,0) 62%), linear-gradient(180deg, #E63843 0%, #D42A35 100%)",
        }}
      />

      {/* GPS pins */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[
          { left: "14%", top: "24%", delay: "0s" },
          { left: "80%", top: "16%", delay: "0.8s" },
          { left: "86%", top: "46%", delay: "1.4s" },
        ].map((p) => (
          <span key={p.left} className="gps-pin" style={{ left: p.left, top: p.top }}>
            <span className="gps-ping" style={{ animationDelay: p.delay }} />
            <span className="gps-dot" />
          </span>
        ))}
      </div>

      {/* road + route + speed lines + trucks: one coordinate system */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <path id="wrepd-lane" d={line(NEAR_LANE, -40, 900)} />
          <path id="wrepd-lane-far" d={line(FAR_LANE, -40, 900)} />
        </defs>

        {/* road band */}
        <polygon
          points={`-200,${yAt(-200, 0)} 1000,${yAt(1000, 0)} 1000,${yAt(1000, ROAD_THICK)} -200,${yAt(-200, ROAD_THICK)}`}
          fill="rgba(21,21,21,0.92)"
        />
        <polygon
          points={`-200,${yAt(-200, ROAD_THICK)} 1000,${yAt(1000, ROAD_THICK)} 1000,600 -200,600`}
          fill="rgba(21,21,21,0.35)"
        />
        {/* edge lines */}
        <path d={line(3)} stroke="rgba(245,240,232,0.55)" strokeWidth={3} />
        <path d={line(ROAD_THICK - 3)} stroke="rgba(245,240,232,0.55)" strokeWidth={3} />
        {/* lane dashes */}
        <path d={line(61)} stroke="rgba(245,240,232,0.85)" strokeWidth={4} strokeDasharray="34 30" />
        {/* self-drawing lime route along the road centre */}
        <path
          d={line(61, -60, 860)}
          fill="none"
          stroke="#D8FF63"
          strokeWidth={3}
          strokeDasharray="10 12"
          strokeLinecap="round"
          className="route-draw"
          opacity={0.9}
        />

        {/* ambient speed lines above the road, at the road's angle */}
        <g stroke="#F5F0E8" strokeLinecap="round" opacity={0.22}>
          {[-60, -110, -160].map((dy, i) => (
            <path
              key={dy}
              d={line(dy, 40 + i * 120, 300 + i * 120)}
              strokeWidth={3}
              strokeDasharray="120 600"
            >
              {reduced ? null : (
                <animate
                  attributeName="stroke-dashoffset"
                  from="720"
                  to="0"
                  dur={`${3.2 + i * 0.6}s`}
                  repeatCount="indefinite"
                />
              )}
            </path>
          ))}
        </g>

        {/* trucks */}
        {reduced ? (
          <g transform={`translate(${midX} ${yAt(midX, NEAR_LANE)}) rotate(${ANGLE}) scale(0.85)`}>
            <Truck spin={false} />
          </g>
        ) : (
          <>
            {/* smaller second truck, 40% behind, far lane */}
            <MovingTruck lane="wrepd-lane-far" begin={-LOOP_S * 0.6} scale={0.72} />
            <MovingTruck lane="wrepd-lane" begin={0} scale={1} />
          </>
        )}
      </svg>

      {/* logo plate — white, matching the logo's own background */}
      <div className="absolute inset-0 flex items-start justify-center pt-[6%]">
        <figure
          className="logo-plate logo-plate--wide border-[rgba(21,21,21,0.25)] bg-white p-2 shadow-[0_26px_70px_rgba(21,21,21,0.35)] sm:p-4"
          // same share of the stage at every size, so the road keeps clear of it
          style={{ width: "min(37%, 260px)" }}
        >
          <img
            src={assets.logoWrepd}
            alt="Wrepd logo"
            width={1344}
            height={896}
            decoding="async"
            className="h-full w-full object-contain"
          />
        </figure>
      </div>
    </div>
  );
}
