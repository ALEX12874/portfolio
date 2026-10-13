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

// `?capture=1` renders only the hero scene for the video export script
const capture = new URLSearchParams(window.location.search).get("capture") === "1";
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
