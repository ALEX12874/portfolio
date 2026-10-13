/** Smooth-scroll to a section id, honouring prefers-reduced-motion. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

/** Lock/unlock page scroll (used by overlays and drawers). */
export function lockScroll(locked: boolean) {
  if (typeof document === "undefined") return;
  document.body.style.overflow = locked ? "hidden" : "";
}
