/**
 * The footer voice clip ("Hire karlo mujhe"): how long it is, and its loudness in 12
 * equal slices (RMS, 0–1, measured once from the file), so the waveform bars
 * follow the voice without the Web Audio API at runtime.
 */
export const voiceClip = {
  /** Seconds. */
  duration: 2.133,
  bars: [0.12, 1, 0.9, 0.77, 0.57, 0.28, 0.8, 0.43, 0.12, 0.12, 0.12, 0.12],
} as const;

/** Loudness at `t` seconds into the clip (0–1). */
export function loudnessAt(t: number): number {
  const { bars, duration } = voiceClip;
  const i = Math.min(bars.length - 1, Math.max(0, Math.floor((t / duration) * bars.length)));
  return bars[i];
}
