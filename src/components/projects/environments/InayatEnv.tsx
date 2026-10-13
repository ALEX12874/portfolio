import { assets } from "../../../data/assets";

/**
 * INAYAT atmosphere: charcoal with warm ivory type, a botanical sprig drawn
 * with stroke-dashoffset, slow drifting fragrance particles, minimal editorial
 * typography and a quiet perfume-bottle silhouette.
 */
export default function InayatEnv() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 26%, rgba(245,240,232,0.1) 0%, rgba(26,25,23,0) 62%), linear-gradient(180deg, #201E1B 0%, #1A1917 60%, #141312 100%)",
        }}
      />

      {/* botanical sprig — line reveal */}
      <svg
        aria-hidden="true"
        viewBox="0 0 320 200"
        className="pointer-events-none absolute left-[4%] top-[8%] h-[38%] w-auto opacity-70"
        fill="none"
      >
        <path
          d="M20 180 C 90 170 150 130 190 80 C 210 54 226 34 250 20"
          stroke="#F5F0E8"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="sprig-draw"
        />
        {[
          { d: "M92 152 c -16 -18 -8 -40 14 -44 10 18 4 38 -14 44 Z", delay: "0.5s" },
          { d: "M140 118 c -14 -20 -4 -42 18 -44 8 20 0 40 -18 44 Z", delay: "0.8s" },
          { d: "M182 84 c -12 -20 0 -42 22 -42 6 20 -4 40 -22 42 Z", delay: "1.1s" },
          { d: "M116 168 c 18 -14 42 -6 44 16 -20 8 -40 0 -44 -16 Z", delay: "0.65s" },
          { d: "M164 132 c 20 -12 42 2 40 24 -20 6 -38 -4 -40 -24 Z", delay: "0.95s" },
        ].map((leaf, i) => (
          <path
            key={i}
            d={leaf.d}
            stroke="#D8FF63"
            strokeWidth="1.3"
            strokeLinejoin="round"
            className="sprig-draw"
            style={{ animationDelay: leaf.delay }}
          />
        ))}
      </svg>

      {/* perfume bottle silhouette */}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 170"
        className="pointer-events-none absolute bottom-[8%] right-[5%] h-[46%] w-auto opacity-60"
        fill="none"
      >
        <rect x="48" y="6" width="24" height="20" rx="3" stroke="#F5F0E8" strokeWidth="1.6" />
        <rect x="52" y="26" width="16" height="12" stroke="#F5F0E8" strokeWidth="1.6" />
        <path
          d="M30 96 C 30 62 44 38 60 38 C 76 38 90 62 90 96 C 90 132 76 152 60 152 C 44 152 30 132 30 96 Z"
          stroke="#F5F0E8"
          strokeWidth="1.8"
          className="sprig-draw"
          style={{ animationDelay: "0.3s" }}
        />
        <path d="M38 108 C 52 100 68 100 82 108" stroke="#D8FF63" strokeWidth="1.4" className="sprig-draw" style={{ animationDelay: "1s" }} />
      </svg>

      {/* drifting fragrance particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[
          { left: "22%", top: "64%", size: 5, delay: "0s" },
          { left: "38%", top: "44%", size: 4, delay: "1.2s" },
          { left: "58%", top: "70%", size: 6, delay: "2.1s" },
          { left: "72%", top: "40%", size: 4, delay: "0.6s" },
          { left: "46%", top: "26%", size: 5, delay: "1.7s" },
          { left: "84%", top: "62%", size: 3, delay: "2.6s" },
        ].map((p, i) => (
          <span
            key={i}
            className="fragrance-dot"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* logo plate — charcoal field preserved */}
      <div className="absolute inset-0 flex items-center justify-center">
        <figure className="logo-plate border-[rgba(245,240,232,0.2)] bg-[#1A1917] p-3 shadow-[0_26px_70px_rgba(0,0,0,0.55)] sm:p-4">
          <img
            src={assets.logoInayat}
            alt="Inayat logo"
            width={234}
            height={144}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </figure>
      </div>
    </div>
  );
}
