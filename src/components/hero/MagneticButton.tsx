import { useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { motionLevelNow } from "../../hooks/useMotionLevel";

interface MagneticButtonProps {
  children: ReactNode;
  /** Max translation toward the cursor, in px. */
  strength?: number;
  className?: string;
  href?: string;
  /** Open the link in a new tab (with safe rel). */
  newTab?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * Magnetic hover: the button leans toward the cursor (≤ `strength` px) and
 * springs back on leave. Real <a> or <button> semantics are preserved by the
 * caller; this only renders a <button> when no href is given.
 */
export default function MagneticButton({
  children,
  strength = 6,
  className = "",
  href,
  newTab = false,
  onClick,
  ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: MouseEvent) => {
    const node = ref.current;
    if (!node) return;
    if (motionLevelNow() === "calm") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = node.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const pull = Math.min(1, dist / 90);
    setOffset({
      x: (dx / dist) * strength * pull,
      y: (dy / dist) * strength * pull,
    });
  };

  const reset = () => setOffset({ x: 0, y: 0 });

  const inner = (
    <span
      className="inline-flex items-center gap-2 will-change-transform"
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </span>
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`inline-block ${className}`}
    >
      {href ? (
        <a
          href={href}
          onClick={onClick}
          aria-label={ariaLabel}
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener noreferrer" : undefined}
          className="pill pill-ink"
        >
          {inner}
        </a>
      ) : (
        <button type="button" onClick={onClick} aria-label={ariaLabel} className="pill pill-ink">
          {inner}
        </button>
      )}
    </div>
  );
}
