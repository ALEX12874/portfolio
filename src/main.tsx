import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// self-hosted fonts (Latin subsets, font-display: swap) — only the weights used
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/archivo/latin-800.css";
import "@fontsource/archivo/latin-900.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./styles/globals.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container #root is missing from index.html");
}

// a lazy chunk that fails to load after a redeploy (stale hashes): reload
// once to pick up the new build instead of leaving a blank section
window.addEventListener("vite:preloadError", (event) => {
  const key = "reloaded-after-preload-error";
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

// a promise nobody handled must never surface as an uncaught error: keep a
// record (the smoke test fails on any) instead of letting it reach the console
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  const w = window as Window & { __unhandledRejections?: string[] };
  (w.__unhandledRejections ??= []).push(String(event.reason));
});

// `?capture=1` renders only the hero scene for the video export script
const capture = new URLSearchParams(window.location.search).get("capture") === "1";

// Real-visitor performance (Vercel Speed Insights) — and Web Analytics once
// it is enabled for the project (set VITE_ENABLE_ANALYTICS=1). Only on the
// deployed site, after load and on idle, so it never competes with the page.
// No other trackers.
const deployed = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
if (deployed && !capture) {
  const start = () => {
    void import("@vercel/speed-insights").then(({ injectSpeedInsights }) => injectSpeedInsights());
    if (import.meta.env.VITE_ENABLE_ANALYTICS === "1") {
      void import("@vercel/analytics").then(({ inject }) => inject());
    }
  };
  const idle = () => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) ric(start, { timeout: 4000 });
    else setTimeout(start, 2000);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}
const HeroCapture = lazy(() => import("./components/hero/HeroCapture"));

createRoot(container).render(
  <StrictMode>
    {capture ? (
      <Suspense fallback={null}>
        <HeroCapture />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
