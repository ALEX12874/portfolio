import { useEffect, useState } from "react";

/**
 * How much motion the visitor gets.
 *
 * - "full": everything as designed.
 * - "calm": the OS asks for reduced motion (Windows "Animation effects" off,
 *   iOS "Reduce Motion"). The site stays alive but gentle: fades, the slow
 *   hero video loop, slower web drawing, the spider at half speed with fewer
 *   bugs, the trucks at half speed. Only big movements go: parallax, camera
 *   fly-ins, scroll-jacking, large scale/bounce effects and fast flashing.
 *
 * Every component asks this one hook, so the policy is applied consistently.
 */
export type MotionLevel = "full" | "calm";

const QUERY = "(prefers-reduced-motion: reduce)";

function read(): MotionLevel {
  if (typeof window === "undefined" || !window.matchMedia) return "full";
  return window.matchMedia(QUERY).matches ? "calm" : "full";
}

/** Live-tracked motion level (initialised synchronously, so no first-frame flip). */
export function useMotionLevel(): MotionLevel {
  const [level, setLevel] = useState<MotionLevel>(read);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(QUERY);
    const update = () => setLevel(mq.matches ? "calm" : "full");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return level;
}

/** Non-hook read for imperative code (event handlers, engines). */
export function motionLevelNow(): MotionLevel {
  return read();
}

export default useMotionLevel;
