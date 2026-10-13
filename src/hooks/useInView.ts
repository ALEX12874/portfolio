import { useEffect, useRef, useState } from "react";

/**
 * One-shot in-view detection (entrance animations trigger once).
 * Uses IntersectionObserver and stops observing after the first intersection.
 */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/**
 * Continuous visibility flag used to pause render loops while off-screen.
 */
export function useActiveInView<T extends HTMLElement>(threshold = 0.05) {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive(entry.isIntersecting);
      },
      { threshold }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, active };
}

export default useInView;
