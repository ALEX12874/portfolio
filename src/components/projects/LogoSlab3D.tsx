import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../../hooks/useReducedMotion";

interface LogoSlab3DProps {
  src: string;
  alt: string;
  /** Intrinsic image size (prevents layout shift). */
  width: number;
  height: number;
}

/** Stacked layers that give the slab its edge thickness. */
const LAYERS = 10;
const LAYER_GAP = 1.6; // px between layers → ~16px thick edge
const MAX_TILT = 8; // degrees

/**
 * The logo as the face of a thick rounded-square slab: a raised, bevelled
 * cream-to-warm-ivory metallic bezel IS the border (no plate behind it).
 *
 * - Thickness: 10 stacked CSS-3D layers (preserve-3d), shading darker
 *   toward the back so the edge reads when the slab tilts.
 * - Bevel: light top-left edge, darker bottom-right edge, inner shadow where
 *   the bezel meets the artwork, and a soft floor shadow.
 * - Motion: slow float (±6px / 6s), damped pointer-parallax tilt (≤ 8°,
 *   smooth return), faint light sweep across the bevel. Reduced motion:
 *   static.
 *
 * Size it from the parent via the `--slab` custom property or the default
 * container-query sizing in `.logo-slab`.
 */
export default function LogoSlab3D({ src, alt, width, height }: LogoSlab3DProps) {
  const reduced = usePrefersReducedMotion();
  const wrap = useRef<HTMLDivElement | null>(null);
  const tilt = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = wrap.current;
    const body = tilt.current;
    if (!node || !body) return;
    body.style.transform = "rotateX(0deg) rotateY(0deg)";
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;

    // pointer anywhere on the stage steers the slab
    const stage = node.parentElement ?? node;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;

    const tick = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      body.style.transform = `rotateX(${cur.y.toFixed(3)}deg) rotateY(${cur.x.toFixed(3)}deg)`;
      if (Math.abs(target.x - cur.x) > 0.01 || Math.abs(target.y - cur.y) > 0.01) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      target.x = Math.max(-1, Math.min(1, px * 2)) * MAX_TILT;
      target.y = -Math.max(-1, Math.min(1, py * 2)) * MAX_TILT;
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div ref={wrap} className={`logo-slab ${reduced ? "logo-slab--static" : ""}`}>
      {/* soft floor shadow (breathes opposite to the float) */}
      <div className="logo-slab__floor" aria-hidden="true" />

      <div className="logo-slab__float">
        <div ref={tilt} className="logo-slab__tilt">
          {/* edge thickness: stacked layers, back to front */}
          {Array.from({ length: LAYERS }, (_, i) => {
            const depth = LAYERS - i; // 10 … 1
            const shade = 0.55 + (i / LAYERS) * 0.4;
            return (
              <div
                key={i}
                aria-hidden="true"
                className="logo-slab__layer"
                style={{
                  transform: `translateZ(${-depth * LAYER_GAP}px)`,
                  filter: `brightness(${shade.toFixed(2)})`,
                }}
              />
            );
          })}

          {/* front: metallic bevelled bezel with the artwork set into it */}
          <div className="logo-slab__face">
            <div className="logo-slab__well">
              <img
                src={src}
                alt={alt}
                width={width}
                height={height}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <span className="logo-slab__inset" aria-hidden="true" />
            </div>
            <span className="logo-slab__sweep" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
