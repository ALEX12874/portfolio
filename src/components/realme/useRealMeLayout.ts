import { useEffect, useState } from "react";

/**
 * Which composition "The Real Me" uses — the one source of truth.
 *
 * - `landscape-phone`: a phone on its side (landscape and ≤ 520 px tall).
 *   Tablets are taller and keep the desktop composition. Screens under
 *   340 px tall are too small for it and fall back to `portrait`.
 * - `desktop`: ≥ 1024 px wide (and not a landscape phone).
 * - `portrait`: everything else (phones upright, tablets under 1024 px).
 *
 * Rotating the phone fires the media-query change, so the layout switches
 * live without a reload.
 */
export type RealMeLayout = "desktop" | "landscape-phone" | "portrait";

export const LANDSCAPE_PHONE_QUERY = "(orientation: landscape) and (max-height: 520px) and (min-height: 340px)";
export const DESKTOP_QUERY = "(min-width: 1024px)";

export function realMeLayoutNow(): RealMeLayout {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "desktop";
  if (window.matchMedia(LANDSCAPE_PHONE_QUERY).matches) return "landscape-phone";
  if (window.matchMedia(DESKTOP_QUERY).matches) return "desktop";
  return "portrait";
}

export function useRealMeLayout(): RealMeLayout {
  const [layout, setLayout] = useState<RealMeLayout>(realMeLayoutNow);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const queries = [LANDSCAPE_PHONE_QUERY, DESKTOP_QUERY].map((q) => window.matchMedia(q));
    const update = () => setLayout(realMeLayoutNow());
    queries.forEach((mq) => mq.addEventListener("change", update));
    update();
    return () => queries.forEach((mq) => mq.removeEventListener("change", update));
  }, []);

  return layout;
}
