import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal trigger that can never leave content invisible.
 *
 * - Normal path: IntersectionObserver fires once when the element nears the
 *   viewport.
 * - Safety net: if the observer is missing or never fires (iOS quirks,
 *   huge elements, odd containers), a cheap rAF-throttled check forces the
 *   element visible once it is actually on screen, ~1.2 s after load at the
 *   latest for anything already in view.
 */
export function useReveal<T extends Element>(margin = "0px 0px -10% 0px") {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return undefined;

    const reveal = () => setShown(true);
    const onScreen = () => {
      const r = node.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) reveal();
        },
        { rootMargin: margin }
      );
      io.observe(node);
    } else {
      reveal();
    }

    // safety net
    let raf = 0;
    const check = () => {
      raf = 0;
      if (onScreen()) reveal();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("scroll", onScroll, { passive: true });
      check();
    }, 1200);

    return () => {
      io?.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [margin, shown]);

  return { ref, shown };
}

export default useReveal;
