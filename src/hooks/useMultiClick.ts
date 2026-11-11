import { useCallback, useEffect, useRef } from "react";

/**
 * Counts quick presses on one button. The first press acts at once (so it
 * still counts as the user gesture audio and popups need); a second press
 * within `windowMs` does nothing; a third within `windowMs` of the second
 * runs `onTriple`. The count resets after `windowMs` without a press.
 *
 * Returns an onClick handler: a click fires for mouse, touch and keyboard
 * (Enter / Space) alike, and never depends on `dblclick`.
 */
export function useMultiClick(onSingle: () => void, onTriple: () => void, { windowMs = 600 } = {}) {
  const count = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const single = useRef(onSingle);
  const triple = useRef(onTriple);
  single.current = onSingle;
  triple.current = onTriple;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return useCallback(() => {
    window.clearTimeout(timer.current);
    count.current += 1;
    if (count.current >= 3) {
      count.current = 0;
      triple.current();
      return;
    }
    if (count.current === 1) single.current();
    timer.current = window.setTimeout(() => {
      count.current = 0;
    }, windowMs);
  }, [windowMs]);
}
