import { useEffect, useState } from "react";

/** Cached across components: creating a probe context is expensive. */
let cached: boolean | null = null;

function probe(): boolean {
  if (cached !== null) return cached;
  let ok = false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    ok = !!gl;
    // free the probe context right away (iOS caps live contexts)
    const lose = (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  } catch {
    ok = false;
  }
  cached = ok;
  return ok;
}

/**
 * Detects whether a usable WebGL context can be created. Pass
 * `enabled = false` to skip the (costly) probe entirely where 3D can't be
 * used anyway, e.g. the phone hero, which plays the video.
 */
export function useWebGLSupport(enabled = true): boolean {
  const [supported, setSupported] = useState<boolean | null>(cached);

  useEffect(() => {
    if (!enabled || cached !== null) {
      if (cached !== null) setSupported(cached);
      return;
    }
    setSupported(probe());
  }, [enabled]);

  return supported !== false;
}

export default useWebGLSupport;
