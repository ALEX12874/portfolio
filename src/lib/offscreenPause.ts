/**
 * Pauses every CSS animation inside a section while it is off-screen.
 *
 * Infinite CSS animations (logo sweeps, LED chases, drifting leaves…) keep
 * repainting even when nobody can see them. Each section (and the footer)
 * gets `data-offscreen="true"` while it is more than ~150 px outside the
 * viewport; globals.css pauses every animation below it. Sections mount
 * lazily, so new ones are picked up as they appear.
 */
export function startOffscreenPause(): () => void {
  if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return () => undefined;
  const seen = new WeakSet<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.target as HTMLElement).dataset.offscreen = e.isIntersecting ? "false" : "true";
    },
    { rootMargin: "150px 0px" }
  );
  const scan = () => {
    document.querySelectorAll("section[id], footer").forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    });
  };
  let raf = 0;
  const mo = new MutationObserver(() => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
  });
  mo.observe(document.body, { childList: true, subtree: true });
  scan();
  return () => {
    io.disconnect();
    mo.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}
