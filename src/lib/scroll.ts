import { motionLevelNow } from "../hooks/useMotionLevel";
import { getLenis } from "./smoothScroll";

/** Scroll to a section id: an eased glide, or a plain jump in calm motion. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) {
    // Lenis honours the sections' scroll-margin (room for the fixed top bar).
    // Restarting Lenis cancels any glide in flight, so if an overlay (the
    // menu) is still unlocking the page, wait for it, restart, then glide.
    const glide = () => {
      lenis.start();
      lenis.scrollTo(el, { duration: 1.1 });
    };
    let frames = 0;
    const whenUnlocked = () => {
      if (document.body.style.overflow !== "hidden" || frames++ > 60) glide();
      else requestAnimationFrame(whenUnlocked);
    };
    whenUnlocked();
    return;
  }
  el.scrollIntoView({ behavior: motionLevelNow() === "calm" ? "auto" : "smooth", block: "start" });
}

/** Glide an element to the middle of the screen (Lenis when running). */
export function scrollToCenter(el: HTMLElement) {
  const lenis = getLenis();
  const offset = -(window.innerHeight - el.offsetHeight) / 2;
  if (lenis) {
    lenis.start();
    lenis.scrollTo(el, { offset, duration: 1.1 });
    return;
  }
  el.scrollIntoView({ behavior: motionLevelNow() === "calm" ? "auto" : "smooth", block: "center" });
}

/** Lock/unlock page scroll (used by overlays and drawers). */
export function lockScroll(locked: boolean) {
  if (typeof document === "undefined") return;
  document.body.style.overflow = locked ? "hidden" : "";
}
