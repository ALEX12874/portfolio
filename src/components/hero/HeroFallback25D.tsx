import { useEffect, useRef, useState } from "react";
import { assets } from "../../data/assets";

/**
 * Layered 2.5D fallback for the hero scene.
 * Used when WebGL is unavailable, the user prefers reduced motion, the device
 * is low-power, or the viewport is below 768px. The billboard stays large and
 * fully readable — the artwork is never altered.
 */
export default function HeroFallback25D() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const node = wrapRef.current;
    if (!node) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: px, y: py });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-[340px] w-full overflow-hidden"
      style={{ perspective: "1200px", perspectiveOrigin: "55% 45%" }}
      role="img"
      aria-label="Illustrated roadside billboard reading IT'S ALL MARKETING. with cars and pedestrians passing by"
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `rotateY(${-13 + tilt.x * 5}deg) rotateX(${4 - tilt.y * 4}deg) translateZ(0)`,
          transformStyle: "preserve-3d",
          transition: reduced ? "none" : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* ---- skyline (far) ---- */}
        <svg
          viewBox="0 0 800 300"
          className="absolute inset-x-0 bottom-[34%] h-[42%] w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g fill="rgba(21,21,21,0.10)">
            <rect x="20" y="120" width="70" height="180" />
            <rect x="100" y="70" width="54" height="230" />
            <rect x="164" y="150" width="80" height="150" />
            <rect x="256" y="100" width="46" height="200" />
            <rect x="470" y="130" width="64" height="170" />
            <rect x="544" y="60" width="52" height="240" />
            <rect x="606" y="140" width="76" height="160" />
            <rect x="692" y="96" width="58" height="204" />
          </g>
          <g fill="rgba(21,21,21,0.16)">
            <rect x="320" y="40" width="60" height="260" />
            <rect x="390" y="110" width="66" height="190" />
          </g>
        </svg>

        {/* ---- footpath ---- */}
        <div
          className="absolute inset-x-0 bottom-0 h-[46%]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(21,21,21,0.10) 0 6%, transparent 6%), linear-gradient(to bottom, rgba(21,21,21,0.06), rgba(21,21,21,0.02))",
            transform: "translateZ(-40px)",
          }}
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-[rgba(21,21,21,0.25)]" />
        </div>

        {/* ---- road ---- */}
        <div
          className="absolute inset-x-[-8%] bottom-0 h-[30%]"
          style={{
            background: "linear-gradient(to bottom, #3A3532 0%, #2B2724 100%)",
            transform: "translateZ(-70px) skewX(-6deg)",
          }}
          aria-hidden="true"
        >
          <div className="absolute left-0 right-0 top-0 h-px bg-[rgba(245,240,232,0.35)]" />
          <div
            className="absolute left-0 right-0 top-[46%] h-[3px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, rgba(245,240,232,0.85) 0 34px, transparent 34px 74px)",
            }}
          />
          {/* cars */}
          {!reduced ? (
            <>
              <span
                className="fb-car"
                style={{
                  background: "#F5F0E8",
                  bottom: "18%",
                  animationDuration: "9s",
                }}
              />
              <span
                className="fb-car"
                style={{
                  background: "#151515",
                  bottom: "52%",
                  animationDuration: "13s",
                  animationDelay: "-4s",
                }}
              />
              <span
                className="fb-car"
                style={{
                  background: "#E63843",
                  bottom: "70%",
                  animationDuration: "16s",
                  animationDelay: "-9s",
                }}
              />
            </>
          ) : null}
        </div>

        {/* ---- pedestrians ---- */}
        {!reduced ? (
          <div className="absolute inset-x-0 bottom-[26%] h-[26%]" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="fb-walker"
                style={{
                  bottom: `${8 + i * 7}%`,
                  animationDuration: `${14 + i * 3}s`,
                  animationDelay: `${-i * 4.5}s`,
                  animationDirection: i % 2 === 0 ? "normal" : "reverse",
                }}
              >
                <svg viewBox="0 0 24 44" width={i === 3 ? 22 : 26} height={i === 3 ? 40 : 48}>
                  <circle cx="12" cy="6" r="4.6" fill="#151515" />
                  <rect x="7.5" y="11" width="9" height="17" rx="4" fill="#151515" />
                  <rect
                    x="8.6"
                    y="27"
                    width="3.2"
                    height="15"
                    rx="1.6"
                    fill="#151515"
                    transform={`rotate(${i % 2 ? 12 : -12} 10 27)`}
                  />
                  <rect
                    x="12.4"
                    y="27"
                    width="3.2"
                    height="15"
                    rx="1.6"
                    fill="#151515"
                    transform={`rotate(${i % 2 ? -12 : 12} 14 27)`}
                  />
                </svg>
              </span>
            ))}
          </div>
        ) : null}

        {/* ---- billboard (same new composition: big, cropped, centred) ---- */}
        <div
          className="absolute left-1/2 top-[7%] w-[94%] -translate-x-1/2"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="rounded-[4px] bg-[#151515] p-[10px] shadow-[0_26px_60px_rgba(21,21,21,0.32)]"
            style={{ transform: "translateZ(36px)" }}
          >
            <img
              src={assets.billboard}
              alt="Billboard artwork reading IT'S ALL MARKETING."
              width={1400}
              height={350}
              className="block aspect-[3.25/1] w-full select-none object-cover object-right"
              draggable={false}
            />
          </div>
          {/* posts */}
          <div className="relative mx-auto h-20 w-[86%]" aria-hidden="true">
            <span className="absolute left-[16%] top-0 h-full w-[7px] bg-[#151515]" />
            <span className="absolute right-[16%] top-0 h-full w-[7px] bg-[#151515]" />
            <span className="absolute left-[6%] right-[6%] top-[18%] h-[4px] bg-[rgba(21,21,21,0.75)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
