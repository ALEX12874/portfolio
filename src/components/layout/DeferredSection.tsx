import { Suspense, startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import RetryBoundary from "./RetryBoundary";
import { enqueueSection, forgetSection, prioritiseSection, sectionMounted } from "../../lib/sectionQueue";

interface DeferredSectionProps {
  /** Anchor id of the section (kept on the placeholder so menu links work). */
  id: string;
  /** Position in the loading queue (page order). */
  order: number;
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

/** Tells the loading queue once the real section has committed. */
function Mounted({ id }: { id: string }) {
  useEffect(() => sectionMounted(id), [id]);
  return null;
}

/**
 * Below-the-fold section from a lazy chunk. Sections load one at a time
 * (lib/sectionQueue), each inside a React transition (time-sliced), or right
 * away when the visitor scrolls within ~1000 px. Until then a same-id
 * placeholder with the section's real height (globals.css `.skel-*`) keeps
 * anchors working and the page height steady. Each section has its own
 * error boundary: if it fails, only it shows a fallback with Retry.
 */
export default function DeferredSection({ id, order, tone, label, children }: DeferredSectionProps) {
  const [ready, setReady] = useState(false);
  const holder = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    enqueueSection(id, order, () => startTransition(() => setReady(true)));
    return () => forgetSection(id);
  }, [id, order]);

  // close to the viewport: load now, whatever the queue says
  useEffect(() => {
    const el = holder.current;
    if (ready || !el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) prioritiseSection(id);
      },
      { rootMargin: "1000px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, ready]);

  const placeholder = (
    <div ref={holder} id={id} aria-hidden="true" className={`skel skel-${id}`} style={{ background: tone }} />
  );

  return ready ? (
    <RetryBoundary id={id} label={label} tone={isDark(tone) ? "ink" : "ivory"} section>
      <Suspense fallback={placeholder}>
        {children}
        <Mounted id={id} />
      </Suspense>
    </RetryBoundary>
  ) : (
    placeholder
  );
}
