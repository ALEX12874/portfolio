import type { GooOptions } from "../components/layout/whisperGoo";

/**
 * Starts the Venom goo (components/layout/whisperGoo, its own chunk) on a
 * button once `when` resolves. Desktop mice only, never with reduced
 * motion; on anything else nothing loads. Returns the cleanup.
 */
export function startGooWhen(
  when: () => Promise<void>,
  host: HTMLElement,
  button: HTMLElement,
  options?: Partial<GooOptions>
): () => void {
  if (
    typeof ResizeObserver === "undefined" ||
    typeof IntersectionObserver === "undefined" ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return () => undefined;
  let stop: (() => void) | undefined;
  let live = true;
  void when()
    .then(() => (live ? import("../components/layout/whisperGoo") : null))
    .then((m) => {
      if (live && m) stop = m.startWhisperGoo(host, button, options);
    })
    .catch(() => undefined);
  return () => {
    live = false;
    stop?.();
  };
}

/** Resolves once `el` comes within `margin` of the screen. */
export function whenNear(el: Element, margin = "600px"): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      const io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          resolve();
        },
        { rootMargin: `${margin} 0px` }
      );
      io.observe(el);
    });
}
