import { useEffect, useState } from "react";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Viewport < 768px. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** Coarse pointer (touch) device. */
export function useIsTouch(): boolean {
  return useMediaQuery("(pointer: coarse)");
}

export default useIsMobile;
