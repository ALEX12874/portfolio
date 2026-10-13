import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, X } from "lucide-react";
// `?url` makes Vite emit the worker as a real asset in dev AND in the build —
// a bare-specifier `new URL(..., import.meta.url)` is not rewritten by Vite
// and leaves pdf.js polling a 404 worker forever.
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Certificate } from "../../data/experience";

/* ------------------------------------------------------------------ lightbox */
interface LightboxProps {
  open: boolean;
  /** Rendered image (data URL) or original file URL. */
  src: string;
  alt: string;
  onClose: () => void;
}

function Lightbox({ open, src, alt, onClose }: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.4));
      if (e.key === "-") setZoom((z) => Math.max(1, z - 0.4));
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[rgba(10,10,10,0.94)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[rgba(245,240,232,0.7)]">
          Certificate viewer
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.4))}
            aria-label="Zoom out"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(245,240,232,0.3)] text-[#F5F0E8] transition-colors hover:border-[#D8FF63]"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, z + 0.4))}
            aria-label="Zoom in"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(245,240,232,0.3)] text-[#F5F0E8] transition-colors hover:border-[#D8FF63]"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close certificate viewer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(245,240,232,0.3)] text-[#F5F0E8] transition-colors hover:border-[#E63843] hover:bg-[#E63843]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto p-4 sm:p-8">
        <img
          src={src}
          alt={alt}
          className="max-w-full rounded-md bg-[#F5F0E8] shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- pdf preview state */
type PdfMode = "loading" | "canvas" | "embed" | "link";

/**
 * Renders page 1 of a PDF to a <canvas> with pdfjs. If anything fails it
 * falls back to an <object> embed and finally to a plain "Open PDF" link —
 * the section never shows a blank box.
 */
function PdfPreview({
  src,
  alt,
  onRendered,
}: {
  src: string;
  alt: string;
  onRendered?: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<PdfMode>("loading");

  useEffect(() => {
    let cancelled = false;
    let task: { promise: Promise<void>; cancel: () => void } | null = null;

    const render = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

        const doc = await pdfjs.getDocument({ url: src }).promise;
        // React StrictMode (dev) mounts the effect twice; the first pass must
        // stop here or pdf.js throws "same canvas during multiple renders".
        if (cancelled) {
          await doc.destroy();
          return;
        }
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        // The <canvas> is always mounted (hidden while loading) so pdf.js has
        // a real target — rendering into a not-yet-mounted canvas silently
        // no-ops and the preview would spin forever.
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("canvas unavailable");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("2d context unavailable");

        task = page.render({ canvasContext: ctx, viewport });
        await task.promise;
        if (cancelled) return;

        const dataUrl = canvas.toDataURL("image/png");
        setMode("canvas");
        onRendered?.(dataUrl);
        await doc.destroy();
      } catch {
        if (!cancelled) setMode("embed");
      }
    };

    render();
    // Watchdog: if nothing resolved (e.g. a browser that refuses the module
    // worker), degrade to the embed fallback instead of loading forever.
    const watchdog = window.setTimeout(() => {
      if (!cancelled) setMode((m) => (m === "loading" ? "embed" : m));
    }, 15000);

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      // Abort any in-flight paint so a second mount can reuse the canvas.
      try {
        task?.cancel();
      } catch {
        /* already finished */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (mode === "link") {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-[rgba(245,240,232,0.4)] bg-[rgba(245,240,232,0.08)] p-6 text-center font-display text-[0.78rem] font-bold uppercase tracking-[0.18em] text-[#F5F0E8]"
      >
        Open PDF — preview unavailable
      </a>
    );
  }

  if (mode === "embed") {
    return (
      <object
        data={src}
        type="application/pdf"
        aria-label={alt}
        className="h-[60vh] w-full rounded-md bg-[#F5F0E8]"
        onError={() => setMode("link")}
      >
        <iframe
          title={alt}
          src={src}
          className="h-[60vh] w-full rounded-md border-0 bg-[#F5F0E8]"
          onError={() => setMode("link")}
        />
      </object>
    );
  }

  // loading (canvas hidden) and rendered-canvas states share one tree so the
  // canvas node exists from the very first paint.
  return (
    <>
      {mode === "loading" ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-md bg-[#F5F0E8] p-6 text-center">
          <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[rgba(21,21,21,0.6)]">
            Preparing document preview…
          </p>
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        className={
          mode === "canvas"
            ? "w-full rounded-md bg-[#F5F0E8] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            : "hidden"
        }
      />
    </>
  );
}

/* ------------------------------------------------------------------ viewer */
interface CertificateViewerProps {
  certificate: Certificate;
}

/**
 * Certificate preview on a light ivory document surface against the dark UI.
 * Never crops, never overlays text, never recreates the certificate.
 */
export default function CertificateViewer({ certificate }: CertificateViewerProps) {
  const [open, setOpen] = useState(false);
  const [pdfImage, setPdfImage] = useState<string | null>(null);

  if (!certificate) return null;

  const lightboxSrc = certificate.kind === "image" ? certificate.src : pdfImage;

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[rgba(245,240,232,0.6)]">
          Certificate
        </p>

        {lightboxSrc ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,240,232,0.3)] px-4 py-2 font-display text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#F5F0E8] transition-colors duration-300 hover:border-[#D8FF63] hover:text-[#D8FF63]"
            aria-label="View certificate larger"
          >
            <Maximize2 size={14} aria-hidden="true" />
            View larger
          </button>
        ) : null}
      </figcaption>

      <div className="rounded-md bg-[#F5F0E8] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-4">
        {certificate.kind === "image" ? (
          <img
            src={certificate.src}
            alt={certificate.alt}
            width={1200}
            height={1600}
            loading="lazy"
            className="mx-auto block h-auto w-full rounded-sm"
          />
        ) : (
          <PdfPreview src={certificate.src} alt={certificate.alt} onRendered={setPdfImage} />
        )}
      </div>

      <Lightbox
        open={open}
        src={lightboxSrc ?? ""}
        alt={certificate.alt}
        onClose={() => setOpen(false)}
      />
    </figure>
  );
}
