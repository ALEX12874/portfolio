import { useSyncExternalStore } from "react";

/**
 * How much the heavy decorative scenes may do (one source of truth).
 *
 * - `high`: desktops and tablets with headroom. Everything on.
 * - `low`: phones, ≤ 4 CPU threads, ≤ 4 GB memory, or a measured median
 *   frame time above 22 ms in the first 3 s. Scenes cap at 30 fps and drop
 *   their optional extras (back layers, device tilt, strand wobble).
 * - `calm`: the visitor asked for reduced motion. Static, finished scenes
 *   with only a slow, occasional movement.
 *
 * The tier can step down once during a visit (a scene reports sustained slow
 * frames) and never steps back up. Reduced motion always wins while it is on.
 */
export type MotionTier = "high" | "low" | "calm";

const REDUCE = "(prefers-reduced-motion: reduce)";
const listeners = new Set<() => void>();
let base: "high" | "low" | null = null;
let probed = false;

function hardwareTier(): "high" | "low" {
  if (typeof window === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const phone =
    window.matchMedia("(pointer: coarse)").matches && Math.min(window.screen.width, window.screen.height) < 768;
  const fewCores = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
  const littleMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  return phone || fewCores || littleMemory ? "low" : "high";
}

function notify() {
  listeners.forEach((l) => l());
}

/** Measure the first 3 s of frames once: a slow device steps down to `low`. */
function probeFrames() {
  if (probed || typeof requestAnimationFrame === "undefined") return;
  probed = true;
  const dts: number[] = [];
  let last = 0;
  const t0 = performance.now();
  const step = (t: number) => {
    if (document.hidden) {
      last = 0;
    } else {
      if (last) dts.push(t - last);
      last = t;
    }
    if (t - t0 < 3000) requestAnimationFrame(step);
    else if (dts.length > 20) {
      const sorted = [...dts].sort((a, b) => a - b);
      if (sorted[Math.floor(sorted.length / 2)] > 22) stepDownTier();
    }
  };
  requestAnimationFrame(step);
}

function baseTier(): "high" | "low" {
  if (base === null) {
    base = hardwareTier();
    if (base === "high") probeFrames();
  }
  return base;
}

export function motionTierNow(): MotionTier {
  if (typeof window !== "undefined" && window.matchMedia?.(REDUCE).matches) return "calm";
  return baseTier();
}

/** Sustained slow frames: drop to `low` for the rest of the visit. */
export function stepDownTier() {
  if (baseTier() === "low") return;
  base = "low";
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia?.(REDUCE);
  mq?.addEventListener("change", cb);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", cb);
  };
}

export function useMotionTier(): MotionTier {
  return useSyncExternalStore(subscribe, motionTierNow, () => "high");
}
