/**
 * Shared scene clock for the hero.
 *
 * Live (normal browsing): every helper is the identity, so the scene looks and
 * moves exactly as designed.
 *
 * Capture (`?capture=1`, used by scripts/render-hero.mjs): the scene is
 * rendered on demand at exact timestamps and every motion is snapped to whole
 * cycles per LOOP_S, so frame 0 equals frame N and the exported video loops
 * without a jump.
 */
export const LOOP_S = 12;
const TAU = Math.PI * 2;

const params =
  typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

export const CAPTURE = params.get("capture") === "1";
export type CaptureVariant = "wide" | "phone";
export const CAPTURE_VARIANT: CaptureVariant = params.get("variant") === "phone" ? "phone" : "wide";

/** Angular rate (rad/s) → whole cycles per loop while capturing. */
export function loopRate(omega: number): number {
  if (!CAPTURE) return omega;
  const k = Math.max(1, Math.round((omega * LOOP_S) / TAU));
  return (TAU * k) / LOOP_S;
}

/** Period (s) → an exact divisor of the loop while capturing. */
export function loopPeriod(seconds: number): number {
  if (!CAPTURE) return seconds;
  const k = Math.max(1, Math.round(LOOP_S / seconds));
  return LOOP_S / k;
}

/** Speed on a closed track → whole laps per loop while capturing. */
export function loopSpeed(speed: number, track: number): number {
  if (!CAPTURE || speed === 0) return speed;
  const k = Math.max(1, Math.round((speed * LOOP_S) / track));
  return (track * k) / LOOP_S;
}

/** Ultra-slow ambient drifts (sun, dust) are frozen while capturing. */
export function drift(t: number): number {
  return CAPTURE ? 0 : t;
}

/** Deterministic PRNG (same output every load). */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
