import { assets } from "../../../data/assets";
import { useMotionLevel } from "../../../hooks/useMotionLevel";

/*
 * One coordinate system: viewBox 0 0 800 600 (the stage is 4:3 on every
 * device, so "slice" never distorts). The logo plate owns the top; the road
 * is a rolling S-curve confined to the bottom half. Road strokes, route line,
 * speed lines and trucks all use the same <path id="wrepd-lane">, so the
 * trucks follow every bend with their wheels on the asphalt.
 */
const LANE =
  "M -80 470 C 40 430, 140 382, 260 400 S 450 500, 580 452 S 760 372, 880 392";
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

/** A truck driving the lane: tilts with the road, shrinks with distance, fades at the ends. */
function MovingTruck({ begin, scale, loop = LOOP_S }: { begin: number; scale: number; loop?: number }) {
  return (
    <g opacity={0}>
      <animateMotion dur={`${loop}s`} begin={`${begin}s`} repeatCount="indefinite" rotate="auto">
        <mpath href="#wrepd-lane" />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.08;0.92;1"
        dur={`${loop}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
      <g>
        {/* perspective: ~1.1 near (left) → ~0.75 far (right) */}
        <animateTransform
          attributeName="transform"
          type="scale"
          from={`${1.1 * scale}`}
          to={`${0.75 * scale}`}
          dur={`${loop}s`}
          begin={`${begin}s`}
          repeatCount="indefinite"
        />
        <Truck spin />
      </g>
    </g>
  );
}

/**
 * WREPD atmosphere: campaign red + crisp white + ink. A rolling road along
 * the bottom with a self-drawing lime route, wrapped trucks following its
 * curves, subtle speed lines and GPS pins above the road (never on the logo).
 */
export default function WrepdEnv() {
  // calm motion: the trucks keep driving, at half speed
  const calm = useMotionLevel() === "calm";

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

      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <path id="wrepd-lane" d={LANE} />
          <linearGradient id="wrepd-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#A9242E" />
            <stop offset="1" stopColor="#8F1F27" />
          </linearGradient>
        </defs>

        {/* darker red ground below the road */}
        <path d={`${LANE} L 880 640 L -80 640 Z`} fill="url(#wrepd-ground)" />

        {/* subtle speed lines following the road's direction */}
        <g fill="none" stroke="#F5F0E8" strokeLinecap="round" opacity={0.2}>
          {[-70, -112].map((dy, i) => (
            <path key={dy} d={LANE} transform={`translate(0 ${dy})`} strokeWidth={3} strokeDasharray="70 520">
              <animate
                attributeName="stroke-dashoffset"
                from="590"
                to="0"
                dur={`${(3.4 + i * 0.7) * (calm ? 2 : 1)}s`}
                repeatCount="indefinite"
              />
            </path>
          ))}
        </g>

        {/* road: light edge → asphalt → centre dashes → lime route */}
        <path d={LANE} fill="none" stroke="rgba(245,240,232,0.55)" strokeWidth={96} strokeLinecap="round" />
        <path d={LANE} fill="none" stroke="#1D1A19" strokeWidth={86} strokeLinecap="round" />
        <path d={LANE} fill="none" stroke="rgba(245,240,232,0.8)" strokeWidth={3.5} strokeDasharray="26 22" />
        <path
          d={LANE}
          fill="none"
          stroke="#D8FF63"
          strokeWidth={3}
          strokeDasharray="10 12"
          strokeLinecap="round"
          className="route-draw"
          opacity={0.9}
          transform="translate(0 16)"
        />

        {/* trucks */}
        <MovingTruck begin={-LOOP_S * (calm ? 2 : 1) * 0.65} scale={0.8} loop={LOOP_S * (calm ? 2 : 1)} />
        <MovingTruck begin={0} scale={1} loop={LOOP_S * (calm ? 2 : 1)} />
      </svg>

      {/* GPS pins: above the road, clear of the logo plate */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[
          { left: "9%", top: "44%", delay: "0s" },
          { left: "86%", top: "40%", delay: "0.8s" },
          { left: "72%", top: "46%", delay: "1.4s" },
        ].map((p) => (
          <span key={p.left} className="gps-pin" style={{ left: p.left, top: p.top }}>
            <span className="gps-ping" style={{ animationDelay: p.delay }} />
            <span className="gps-dot" />
          </span>
        ))}
      </div>

      {/* logo plate — white, matching the logo's own background */}
      <div className="absolute inset-0 flex items-start justify-center pt-[6%]">
        <figure
          className="logo-plate logo-plate--wide logo-plate--phone55 border-[rgba(21,21,21,0.25)] bg-white p-2 shadow-[0_26px_70px_rgba(21,21,21,0.35)] sm:p-4"
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
