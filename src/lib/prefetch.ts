import { assets } from "../data/assets";
import { load3d } from "./load3d";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/** Run `cb` when the main thread is idle (2 s timeout fallback). */
export function whenIdle(cb: () => void, timeout = 2000): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback) {
    const h = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(h);
  }
  const t = window.setTimeout(cb, Math.min(timeout, 1200));
  return () => window.clearTimeout(t);
}

const decoded = new Map<string, Promise<void>>();

/** Download + decode an image once; later calls share the same promise. */
export function decodeImage(src: string): Promise<void> {
  let p = decoded.get(src);
  if (!p) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    p = (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined);
    decoded.set(src, p);
  }
  return p;
}

/** The four project logos, decoded ahead so project switches never blank. */
export function preloadProjectLogos(): void {
  // straight from the asset map, so the project data stays in its own chunk
  [assets.logoDipNSip, assets.logoWrepd, assets.logoSynkk, assets.logoInayat].forEach((src) => {
    if (src) void decodeImage(src);
  });
}

/** Resolves when `src` is decoded, or after `ms` at the latest. */
export function decodedOrTimeout(src: string, ms = 160): Promise<void> {
  return Promise.race([decodeImage(src), new Promise<void>((r) => window.setTimeout(r, ms))]);
}

/**
 * After first paint, on idle: warm the project logos and, where live 3D is
 * allowed (desktop / tablet, full motion), the solar-system chunk (three /
 * drei) so it is parsed before the visitor scrolls to it. Phones never pay
 * for three.js up front.
 */
export function prefetchOnIdle(): () => void {
  return whenIdle(() => {
    preloadProjectLogos();
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (wide && !calm) {
      void load3d()
        .then(() => import("../components/skills/SolarSystem"))
        .catch(() => undefined);
    }
  });
}
