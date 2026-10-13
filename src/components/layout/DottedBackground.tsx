interface DottedBackgroundProps {
  tone?: "ivory" | "ink";
}

/**
 * Fine dotted page/section texture. Opacity-only variation of the locked
 * palette — never noisy.
 */
export default function DottedBackground({ tone = "ivory" }: DottedBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${
        tone === "ivory" ? "dots-ivory" : "dots-ink"
      }`}
    />
  );
}
