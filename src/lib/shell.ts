import { createContext } from "react";

/**
 * The static first screen.
 *
 * At build time the top bar and the hero are rendered to plain HTML and put
 * into index.html (`#shell`, see scripts/prerender-shell.mjs), so the first
 * screen paints from HTML + CSS alone, before any JavaScript has loaded.
 * React then renders the real page underneath; once its hero poster is on
 * screen the static copy is removed. Both look identical, so the hand-over
 * is invisible: no blank page, no half-loaded flash.
 */

/** True while rendering the static copy at build time. */
export const StaticRender = createContext(false);

declare global {
  interface Window {
    /** performance.now() when the static first screen was parsed (inline script). */
    __shellAt?: number;
  }
}

const shellEl = typeof document !== "undefined" ? document.getElementById("shell") : null;

/** The page opened with the static first screen (read once, before React renders). */
export const hadShell = !!shellEl;

/** When the static copy's CSS animations started (≈ its first style pass). */
export const shellStartedAt = typeof window !== "undefined" ? (window.__shellAt ?? 0) : 0;

let released = !shellEl;

/** Remove the static copy (idempotent). */
export function releaseShell() {
  if (released) return;
  released = true;
  shellEl?.remove();
}

/**
 * The CSS delay that keeps a load-time CSS animation in step with the static
 * copy's (which started when the HTML painted), instead of replaying it.
 */
export function syncedDelay(delayMs: number): string {
  if (!hadShell || typeof performance === "undefined") return `${delayMs}ms`;
  return `${Math.round(delayMs - (performance.now() - shellStartedAt))}ms`;
}
