/**
 * Loads the 3D libraries in steps: three.js, then @react-three/fiber (the few
 * drei members used come with each scene), with one frame in between.
 * Evaluating everything in one go was a single long freeze; split up, each
 * step is a shorter task and the page keeps painting in between, without
 * waiting for idle time, so the 3D still arrives quickly.
 * Later calls share the same promise.
 */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => window.setTimeout(resolve, 0));
  });

let loading: Promise<void> | null = null;

export function load3d(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      await import("three");
      await nextFrame();
      await import("@react-three/fiber");
      await nextFrame();
    })().catch(() => {
      // let the scene's own import surface (and retry) any real failure
      loading = null;
    });
  }
  return loading;
}
