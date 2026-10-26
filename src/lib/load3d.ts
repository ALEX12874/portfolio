/**
 * Loads the 3D libraries in steps, each on its own idle moment: three.js,
 * then @react-three/fiber (the few drei members used come with the scene). Evaluating all ~800 kB in one go was a
 * single long freeze; split up, every step is a shorter task the browser can
 * schedule around input and painting. Later calls share the same promise.
 */
type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

const idle = () =>
  new Promise<void>((resolve) => {
    const ric = (window as IdleWindow).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: 1000 });
    else window.setTimeout(resolve, 50);
  });

let loading: Promise<void> | null = null;

export function load3d(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      await import("three");
      await idle();
      await import("@react-three/fiber");
      await idle();
    })().catch(() => {
      // let the scene's own import surface (and retry) any real failure
      loading = null;
    });
  }
  return loading;
}
