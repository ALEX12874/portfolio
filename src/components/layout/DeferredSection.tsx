import { Suspense, startTransition, useEffect, useState, type ReactNode } from "react";
import RetryBoundary from "./RetryBoundary";

interface DeferredSectionProps {
  /** Anchor id of the section (kept on the placeholder so menu links work). */
  id: string;
  /** Page background behind the placeholder (matches the section). */
  tone: string;
  /** What the section is called in the error fallback. */
  label: string;
  children: ReactNode;
}

/** Dark section backgrounds get the light-on-ink fallback. */
function isDark(hex: string): boolean {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/**
 * Below-the-fold sections render right after first paint, inside a React
 * transition (time-sliced, so no long main-thread tasks), from lazy chunks.
 * Until then a same-id, full-height placeholder keeps anchors and layout.
 * Each section has its own error boundary: if it fails, only it shows a
 * fallback with Retry — the page around it keeps working.
 */
export default function DeferredSection({ id, tone, label, children }: DeferredSectionProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const go = () => startTransition(() => setReady(true));
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) {
      const h = ric(go, { timeout: 1200 });
      return () => (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(h);
    }
    const t = window.setTimeout(go, 200);
    return () => window.clearTimeout(t);
  }, []);

  const placeholder = <div id={id} aria-hidden="true" style={{ minHeight: "100svh", background: tone }} />;

  return ready ? (
    <RetryBoundary id={id} label={label} tone={isDark(tone) ? "ink" : "ivory"} section>
      <Suspense fallback={placeholder}>{children}</Suspense>
    </RetryBoundary>
  ) : (
    placeholder
  );
}
