import { assets } from "../../../data/assets";

/**
 * WREPD atmosphere: campaign red + crisp white + ink shadows. A diagonal road,
 * a wrapped truck gliding along its route, directional speed lines, understated
 * GPS pins and a route line that draws itself.
 */
export default function WrepdEnv() {
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

      {/* speed lines */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[18, 30, 44, 58].map((top, i) => (
          <span
            key={top}
            className="speed-line"
            style={{ top: `${top}%`, animationDelay: `${i * 0.55}s`, opacity: 0.16 + i * 0.06 }}
          />
        ))}
      </div>

      {/* GPS pins */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[
          { left: "18%", top: "26%", delay: "0s" },
          { left: "72%", top: "20%", delay: "0.8s" },
          { left: "84%", top: "52%", delay: "1.4s" },
        ].map((p) => (
          <span key={p.left} className="gps-pin" style={{ left: p.left, top: p.top }}>
            <span className="gps-ping" style={{ animationDelay: p.delay }} />
            <span className="gps-dot" />
          </span>
        ))}
      </div>

      {/* road with self-drawing route line */}
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[46%] w-full"
        viewBox="0 0 800 240"
        preserveAspectRatio="none"
      >
        <polygon points="0,240 800,120 800,240" fill="rgba(21,21,21,0.92)" />
        <polygon points="0,240 800,120 800,128 0,246" fill="rgba(245,240,232,0.5)" />
        <path
          d="M40 236 C 220 214 380 190 560 160 C 660 144 730 134 790 128"
          fill="none"
          stroke="#D8FF63"
          strokeWidth="4"
          strokeDasharray="10 12"
          strokeLinecap="round"
          className="route-draw"
        />
        <g fill="rgba(245,240,232,0.85)">
          {[120, 240, 360, 480, 600, 720].map((x, i) => (
            <rect key={x} x={x} y={228 - i * 17} width="46" height="5" rx="2.5" transform={`rotate(${-19 + i * 0.2} ${x} ${228 - i * 17})`} />
          ))}
        </g>
      </svg>

      {/* wrapped truck gliding along the route */}
      <div aria-hidden="true" className="truck-run absolute bottom-[16%] left-0 w-[34%] max-w-[300px] min-w-[180px]">
        <svg viewBox="0 0 300 140" className="w-full drop-shadow-[0_18px_28px_rgba(21,21,21,0.45)]">
          <rect x="6" y="20" width="196" height="86" rx="8" fill="#F5F0E8" stroke="#151515" strokeWidth="5" />
          <path d="M202 44 h50 l30 32 v30 h-80 z" fill="#F5F0E8" stroke="#151515" strokeWidth="5" strokeLinejoin="round" />
          <rect x="216" y="52" width="34" height="22" rx="4" fill="#151515" opacity="0.85" />
          <rect x="24" y="36" width="160" height="16" rx="8" fill="#E63843" />
          <rect x="24" y="76" width="96" height="10" rx="5" fill="#E63843" opacity="0.6" />
          <circle cx="66" cy="110" r="18" fill="#151515" />
          <circle cx="66" cy="110" r="7" fill="#F5F0E8" />
          <circle cx="232" cy="110" r="18" fill="#151515" />
          <circle cx="232" cy="110" r="7" fill="#F5F0E8" />
        </svg>
      </div>

      {/* logo plate — white, matching the logo's own background */}
      <div className="absolute inset-0 flex items-start justify-center pt-[6%]">
        <figure className="logo-plate logo-plate--wide border-[rgba(21,21,21,0.25)] bg-white p-3 shadow-[0_26px_70px_rgba(21,21,21,0.35)] sm:p-4">
          <img
            src={assets.logoWrepd}
            alt="Wrepd logo"
            width={1344}
            height={896}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </figure>
      </div>
    </div>
  );
}
