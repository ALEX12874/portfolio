import type Lenis from "lenis";

/**
 * Inertial smooth scrolling for mouse wheels and trackpads (Lenis).
 *
 * - Desktop pointers only: touch screens keep their native scrolling, which
 *   is already smooth and physical.
 * - Off in calm motion (reduced-motion preference): no scroll-jacking there.
 * - Paused while an overlay locks the page (menu, case study, experience
 *   panel, certificate viewer), so those scroll natively.
 * - Loaded after the page is idle: never on the first-paint path.
 */
let lenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenis;
}

export function startSmoothScroll(): void {
  if (typeof window === "undefined" || lenis) return;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!finePointer || reduceQuery.matches) return;

  void import("lenis")
    .then(({ default: LenisClass }) => {
      if (lenis) return;
      const instance = new LenisClass({
        lerp: 0.11, // light glide: smooth, never floaty
        smoothWheel: true,
        wheelMultiplier: 1,
        autoRaf: true,
        // inner scroll areas (skill panel, overlays) keep their own wheel scrolling
        allowNestedScroll: true,
      });
      lenis = instance;

      // overlays lock the page with body overflow: hidden → pause Lenis
      const sync = () => {
        if (!lenis) return;
        if (document.body.style.overflow === "hidden") lenis.stop();
        else lenis.start();
      };
      const mo = new MutationObserver(sync);
      mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
      sync();

      // the visitor turns on reduced motion later: back to native scrolling
      const onReduce = (e: MediaQueryListEvent) => {
        if (!e.matches || !lenis) return;
        mo.disconnect();
        lenis.destroy();
        lenis = null;
      };
      reduceQuery.addEventListener("change", onReduce);
    })
    .catch(() => undefined); // smooth scrolling is an enhancement only
}
