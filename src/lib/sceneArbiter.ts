import { useEffect, useRef, useState } from "react";

/**
 * One WebGL scene at a time.
 *
 * The hero and the solar system each register here with how many pixels of
 * them are on screen; only the one showing the most renders, the other one
 * drops to `frameloop="never"`. That keeps two heavy scenes from fighting for
 * the GPU at the hero/capabilities boundary.
 */
interface Entry {
  visible: number;
  set: (on: boolean) => void;
}

const entries = new Map<string, Entry>();

function decide() {
  let best: string | null = null;
  let most = 0;
  entries.forEach((e, id) => {
    if (e.visible > most) {
      most = e.visible;
      best = id;
    }
  });
  entries.forEach((e, id) => e.set(id === best && e.visible > 0));
}

const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);

/**
 * `active` is true while this scene is on screen and is the most visible
 * registered scene. Pass `enabled = false` when the element shows no WebGL
 * (e.g. the hero is on its video), so it never takes the turn from another.
 */
export function useSceneTurn<T extends HTMLElement>(id: string, enabled = true) {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) {
      setActive(false);
      return undefined;
    }
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return undefined;
    }
    const entry: Entry = { visible: 0, set: setActive };
    entries.set(id, entry);
    const io = new IntersectionObserver(
      (list) => {
        for (const e of list) entry.visible = e.isIntersecting ? e.intersectionRect.height : 0;
        decide();
      },
      { threshold: THRESHOLDS }
    );
    io.observe(node);
    return () => {
      io.disconnect();
      entries.delete(id);
      decide();
    };
  }, [id, enabled]);

  return { ref, active };
}
