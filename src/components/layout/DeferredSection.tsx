import { Suspense, startTransition, useEffect, useState, type ReactNode } from "react";

interface DeferredSectionProps {
  /** Anchor id of the section (kept on the placeholder so menu links work). */
  id: string;
  /** Page background behind the placeholder (matches the section). */
  tone: string;
  children: ReactNode;
}

/**
 * Below-the-fold sections render right after first paint, inside a React
 * transition (time-sliced, so no long main-thread tasks), from lazy chunks.
 * Until then a same-id, full-height placeholder keeps anchors and layout.
 */
export default function DeferredSection({ id, tone, children }: DeferredSectionProps) {
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

  return ready ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder;
}
