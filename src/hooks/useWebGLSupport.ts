import { useEffect, useState } from "react";

/**
 * Detects whether a usable WebGL context can be created.
 * Runs a try/catch context creation once on mount.
 */
export function useWebGLSupport(): boolean {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let ok = false;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      ok = !!gl;
    } catch {
      ok = false;
    }
    setSupported(ok);
  }, []);

  return supported !== false;
}

export default useWebGLSupport;
