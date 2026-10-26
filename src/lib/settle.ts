import { useEffect, useState } from "react";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

let settled: Promise<void> | null = null;

/**
 * Resolves once the first screen is fully painted and the page has calmed
 * down: after the `load` event, at least `MIN_MS` later, and then on an idle
 * moment. Heavy extras (the hero video, the live 3D scenes) wait for this,
 * so they never compete with the first paint or the page's own scripts.
 */
const MIN_MS = 1500;

export function whenSettled(): Promise<void> {
  if (settled) return settled;
  settled = new Promise<void>((resolve) => {
    if (typeof window === "undefined") return;
    const idle = () => {
      const ric = (window as IdleWindow).requestIdleCallback;
      if (ric) ric(() => resolve(), { timeout: 2000 });
      else window.setTimeout(resolve, 200);
    };
    const afterLoad = () => window.setTimeout(idle, MIN_MS);
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
  });
  return settled;
}

let heroDone: () => void = () => undefined;
const heroScene = new Promise<void>((resolve) => {
  heroDone = resolve;
});

/**
 * The hero's live 3D scene is on screen, or won't be (phone, calm motion,
 * no WebGL, too slow). The solar system waits for this, so the two scenes
 * never build at the same time. Never waits more than 6 s after settling.
 */
export function markHeroSceneDone() {
  heroDone();
}

export function whenHeroSceneDone(): Promise<void> {
  // always after the page has settled; then the hero scene (6 s at most)
  return whenSettled().then(() => Promise.race([heroScene, new Promise<void>((r) => window.setTimeout(r, 6000))]));
}

/**
 * For the second 3D scene (the solar system, right below the hero): after
 * the hero scene, and never within the first 5 s of the visit, so the first
 * impression has no heavy work in it at all.
 */
export function whenSecondSceneMayStart(): Promise<void> {
  return whenHeroSceneDone().then(() => {
    const wait = Math.max(0, 5000 - performance.now());
    return new Promise<void>((r) => window.setTimeout(r, wait));
  });
}

/**
 * For the hero's live 3D scene: the page has settled and the visit is at
 * least 5 s old. The poster is a still frame of the same scene, so nothing
 * looks missing meanwhile — and the first impression carries no 3D work.
 */
export function whenLiveSceneMayStart(): Promise<void> {
  return whenSettled().then(() => {
    const wait = Math.max(0, 5000 - performance.now());
    return new Promise<void>((r) => window.setTimeout(r, wait));
  });
}

/** `true` once {@link whenSettled} has resolved. */
export function useSettled(enabled = true, after: () => Promise<void> = whenSettled): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    void after().then(() => {
      if (live) setDone(true);
    });
    return () => {
      live = false;
    };
  }, [enabled, after]);
  return done;
}
