import { assets } from "../../../data/assets";
import LogoSlab3D from "../LogoSlab3D";

/**
 * DIP N SIP atmosphere: deep forest green with warm ivory light and a few
 * slow tea leaves kept to the corners. The logo is the focal point — the
 * supplied artwork, untouched, set as the face of a bevelled 3D slab whose
 * bezel is the border (no plate behind it).
 */
export default function DipNSipEnv() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ containerType: "size" }}>
      {/* warm studio light */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 22%, rgba(245,240,232,0.16) 0%, rgba(20,52,43,0) 60%), linear-gradient(180deg, #163A2F 0%, #14342B 55%, #0F2A22 100%)",
        }}
      />

      {/* four slow tea leaves, corners only — well clear of the logo */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
      >
        {[
          [70, 90, 16, -20],
          [700, 70, 18, 25],
          [90, 420, 14, 40],
          [690, 410, 17, -35],
        ].map(([x, y, s, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s / 16})`}>
            <g className="leaf-drift" style={{ animationDelay: `${i * 1.7}s`, animationDuration: "14s" }}>
              <path d="M0 0 C 18 -22 44 -22 54 -6 C 40 16 12 18 0 0 Z" fill="rgba(245,240,232,0.14)" />
              <path
                d="M2 -2 C 20 -8 36 -10 50 -8"
                stroke="rgba(216,255,99,0.4)"
                strokeWidth="1.4"
                fill="none"
              />
            </g>
          </g>
        ))}
      </svg>

      {/* the logo slab — focal point, artwork untouched */}
      <div className="absolute inset-0 flex items-center justify-center pb-[2%]">
        <LogoSlab3D src={assets.logoDipNSip} alt="Dip N Sip logo" width={1092} height={1092} />
      </div>
    </div>
  );
}
