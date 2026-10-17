import { assets } from "../../../data/assets";

const CHARCOAL = "#2A2724";
const SAGE = "#9AA593";
const TAUPE = "#8A7F72";

/** Faint paper grain (SVG noise), tiled at low opacity. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.16 0 0 0 0 0.15 0 0 0 0 0.14 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** A self-drawing botanical sprig: charcoal stem, sage leaves. */
function Sprig({ className, flip = false }: { className: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 200"
      className={`pointer-events-none absolute w-auto ${className}`}
      style={flip ? { transform: "rotate(180deg)" } : undefined}
      fill="none"
    >
      <path
        d="M20 180 C 90 170 150 130 190 80 C 210 54 226 34 250 20"
        stroke={CHARCOAL}
        strokeWidth="1.4"
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
          stroke={SAGE}
          fill="rgba(154,165,147,0.22)"
          strokeWidth="1.3"
          strokeLinejoin="round"
          className="sprig-draw"
          style={{ animationDelay: leaf.delay }}
        />
      ))}
    </svg>
  );
}

/**
 * INAYAT atmosphere — a light "perfume atelier": warm parchment with a soft
 * glow and paper grain, charcoal + sage line-art sprigs framing the corners,
 * a dusky-rose fragrance mist and a faint glass bottle. The logo (which has
 * its own charcoal field) sits on a charcoal card like a perfume label.
 */
export default function InayatEnv() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* parchment + top glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 0%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #F1EAE0 0%, #E6DCCD 100%)",
        }}
      />
      {/* paper grain */}
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: GRAIN }} />

      {/* glass perfume bottle, low in the right corner */}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 170"
        className="pointer-events-none absolute bottom-[7%] right-[3%] h-[30%] w-auto opacity-70"
      >
        <rect x="48" y="6" width="24" height="20" rx="3" fill="rgba(255,255,255,0.35)" stroke={TAUPE} strokeWidth="1.4" />
        <rect x="52" y="26" width="16" height="12" fill="rgba(255,255,255,0.35)" stroke={TAUPE} strokeWidth="1.4" />
        <path
          d="M30 96 C 30 62 44 38 60 38 C 76 38 90 62 90 96 C 90 132 76 152 60 152 C 44 152 30 132 30 96 Z"
          fill="rgba(255,255,255,0.35)"
          stroke={TAUPE}
          strokeWidth="1.5"
        />
        {/* soft highlight */}
        <path d="M42 80 C 44 66 50 56 56 52" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M38 110 C 52 102 68 102 82 110" stroke={TAUPE} strokeWidth="1" fill="none" opacity="0.7" />
      </svg>

      {/* botanical sprigs framing the corners (never touching the card) */}
      <Sprig className="bottom-[12%] left-[3%] h-[20%]" />
      <Sprig className="right-[3%] top-[4%] h-[20%]" flip />

      {/* dusky-rose fragrance mist */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[
          { left: "16%", top: "30%", size: 26, delay: "0s" },
          { left: "30%", top: "62%", size: 18, delay: "1.2s" },
          { left: "66%", top: "70%", size: 22, delay: "2.1s" },
          { left: "78%", top: "34%", size: 16, delay: "0.6s" },
          { left: "52%", top: "12%", size: 20, delay: "1.7s" },
          { left: "88%", top: "56%", size: 14, delay: "2.6s" },
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
              background: "radial-gradient(circle, rgba(196,160,150,0.18) 0%, rgba(196,160,150,0) 70%)",
            }}
          />
        ))}
      </div>

      {/* the logo as a charcoal perfume label on paper */}
      <div className="absolute inset-0 flex items-center justify-center">
        <figure
          className="logo-plate logo-plate--phone55 p-3 sm:p-4"
          style={{
            width: "min(44%, 240px)",
            background: "#1A1917",
            borderRadius: 18,
            border: "1px solid rgba(138,127,114,0.45)",
            boxShadow: "0 30px 60px rgba(42,39,36,0.25)",
          }}
        >
          <img
            src={assets.logoInayat}
            alt="Inayat logo"
            width={234}
            height={144}
            decoding="async"
            className="h-full w-full object-contain"
          />
        </figure>
      </div>
    </div>
  );
}
