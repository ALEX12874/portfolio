import { ArrowUpRight } from "lucide-react";
import type { Cta } from "../../data/projects";

interface ProjectCTAProps {
  cta: Cta;
  /** Theme accent used for the filled pill. */
  accent: string;
  onOpenCaseStudy: () => void;
}

/** Pick readable text for the accent-filled pill (WCAG AA). */
function readableOn(accent: string): string {
  const hex = accent.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.35 ? "#151515" : "#F5F0E8";
}

/**
 * External projects open in a new tab; Wrepd opens the in-portfolio case
 * study (no external URL exists — none is invented).
 */
export default function ProjectCTA({ cta, accent, onOpenCaseStudy }: ProjectCTAProps) {
  // ≥ 18.66px bold = WCAG "large text": ivory on Signature Red passes 3:1
  const classes =
    "pill inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-7 py-3.5 text-[1.18rem] font-bold hover:opacity-90 active:opacity-80 sm:w-auto";
  const style = { backgroundColor: accent, color: readableOn(accent) };

  if (cta.kind === "external") {
    return (
      <a
        href={cta.href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        style={style}
        aria-label={`${cta.label} (opens in a new tab)`}
      >
        {cta.label}
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    );
  }

  return (
    <button type="button" onClick={onOpenCaseStudy} className={classes} style={style}>
      {cta.label}
      <ArrowUpRight size={16} aria-hidden="true" />
    </button>
  );
}
