import { motionLevelNow } from "../hooks/useMotionLevel";

/** Scroll to a section id: smooth, or a plain jump in calm motion. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: motionLevelNow() === "calm" ? "auto" : "smooth", block: "start" });
}

/** Lock/unlock page scroll (used by overlays and drawers). */
export function lockScroll(locked: boolean) {
  if (typeof document === "undefined") return;
  document.body.style.overflow = locked ? "hidden" : "";
}
