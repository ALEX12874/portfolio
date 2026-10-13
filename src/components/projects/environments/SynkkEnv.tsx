import { assets } from "../../../data/assets";

const MODULES = ["CUSTOMER", "KITCHEN", "BILLING"] as const;

/**
 * SYNKK atmosphere: pure black with vivid lime, a fine UI grid, three readable
 * modules connected by drawing lines and an order chip travelling through them
 * in a loop, plus a quiet QR motif.
 */
export default function SynkkEnv() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-[#0A0A0A]" />

      {/* fine UI grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(216,255,99,0.09) 0 1px, transparent 1px 44px), repeating-linear-gradient(to bottom, rgba(216,255,99,0.09) 0 1px, transparent 1px 44px)",
        }}
      />

      {/* QR motif */}
      <svg aria-hidden="true" viewBox="0 0 21 21" className="qr-motif" fill="#D8FF63">
        {[
          [0, 0], [1, 0], [2, 0], [4, 0], [6, 0], [7, 0], [8, 0],
          [0, 1], [8, 1], [0, 2], [2, 2], [4, 2], [6, 2], [8, 2],
          [4, 3], [1, 4], [3, 4], [5, 4], [7, 4],
          [0, 5], [2, 5], [4, 5], [6, 5], [8, 5],
          [0, 6], [8, 6], [1, 7], [3, 7], [7, 7],
          [0, 8], [1, 8], [2, 8], [4, 8], [6, 8], [8, 8],
          [10, 1], [12, 0], [14, 2], [16, 1], [18, 3], [20, 0],
          [11, 4], [13, 5], [15, 4], [17, 6], [19, 5],
          [10, 7], [12, 8], [14, 7], [16, 9], [18, 8], [20, 7],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" opacity="0.55" />
        ))}
      </svg>

      {/* one column — logo (top) → workflow row (bottom): they can never overlap */}
      <div className="synkk-stage">
        {/* logo plate — the logo keeps its own black field */}
        <figure className="logo-plate synkk-logo border-[rgba(216,255,99,0.35)] bg-black p-2.5 shadow-[0_26px_70px_rgba(0,0,0,0.6)] sm:p-4">
          <img
            src={assets.logoSynkk}
            alt="Synkk logo"
            width={1080}
            height={1080}
            decoding="async"
            className="h-full w-full object-contain"
          />
        </figure>

        {/* modules + connecting lines + travelling order chip (all relative to the row) */}
        <div className="synkk-row relative flex w-full max-w-[46rem] items-center justify-between">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 460 60"
            preserveAspectRatio="none"
          >
            <path d="M78 30 H 208" stroke="#D8FF63" strokeWidth="1.5" strokeDasharray="6 8" className="link-draw" />
            <path d="M252 30 H 382" stroke="#D8FF63" strokeWidth="1.5" strokeDasharray="6 8" className="link-draw" style={{ animationDelay: "0.6s" }} />
          </svg>

          {MODULES.map((m, i) => (
            <div
              key={m}
              className="module-chip relative z-10 rounded-lg border border-[rgba(216,255,99,0.4)] bg-[#0A0A0A] px-2 py-2.5 text-center sm:px-5 sm:py-3"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <span className="block font-display text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-[#D8FF63] sm:text-[0.7rem] sm:tracking-[0.2em]">
                {m}
              </span>
              <span className="module-sub mt-1 block font-body text-[0.55rem] tracking-[0.12em] text-[rgba(245,240,232,0.5)] sm:text-[0.62rem]">
                {i === 0 ? "QR ORDER" : i === 1 ? "LIVE DASH" : "DONE"}
              </span>
            </div>
          ))}

          <span className="order-chip" aria-hidden="true">
            ORDER
          </span>
        </div>
      </div>
    </div>
  );
}
