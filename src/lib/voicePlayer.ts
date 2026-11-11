import { useSyncExternalStore } from "react";
import { assets } from "../data/assets";
import { site } from "../data/site";

/**
 * The footer's voice clip: one <audio> element and one state, so presses
 * never stack sounds. Nothing plays unless a visitor clicks; nothing
 * downloads until the footer is near (or the button is hovered or focused).
 */
export type VoiceStatus = "idle" | "playing" | "done" | "blocked";

interface VoiceState {
  status: VoiceStatus;
  /** Pressed a voice button at least once (no more attention shakes). */
  interacted: boolean;
  /** "Opening LinkedIn…" toast is showing. */
  toast: boolean;
}

let state: VoiceState = { status: "idle", interacted: false, toast: false };
const listeners = new Set<() => void>();

function set(patch: Partial<VoiceState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useVoice(): VoiceState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Current state, outside React (timers, observers). */
export function voiceState(): VoiceState {
  return state;
}

let audio: HTMLAudioElement | null = null;
let statusTimer = 0;
let toastTimer = 0;

function element(): HTMLAudioElement {
  if (!audio) {
    audio = document.createElement("audio");
    audio.preload = "none";
    audio.dataset.voice = "";
    const source = document.createElement("source");
    source.src = assets.voiceClip;
    source.type = "audio/mp4";
    audio.appendChild(source);
    audio.addEventListener("ended", () => {
      set({ status: "done" });
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => set({ status: "idle" }), 900);
    });
    // no controls: renders nothing, but stays inspectable
    document.body.appendChild(audio);
  }
  return audio;
}

/** The clip's element once created (the buttons read its currentTime). */
export function voiceAudio(): HTMLAudioElement | null {
  return audio;
}

/** Start downloading the clip, so the first click plays at once. */
export function primeVoice() {
  const a = element();
  if (a.preload === "auto") return;
  a.preload = "auto";
  a.load();
}

let unlocked = false;

/**
 * Called inside a click that will play the clip a moment later (the hero's
 * alien glides to the footer first): a silent play/pause now lets that later
 * play() through on browsers that only allow sound straight from a tap (iOS).
 */
export function unlockVoice() {
  if (unlocked) return;
  unlocked = true;
  const a = element();
  a.preload = "auto";
  a.muted = true;
  a.play()
    .then(() => {
      if (state.status !== "playing") {
        a.pause();
        a.currentTime = 0;
      }
    })
    .catch(() => undefined)
    .finally(() => {
      a.muted = false;
    });
}

export function markInteracted() {
  if (!state.interacted) set({ interacted: true });
}

export function playVoice() {
  markInteracted();
  // a second press while playing never restarts or stacks the sound
  if (state.status === "playing") return;
  const a = element();
  window.clearTimeout(statusTimer);
  a.muted = false;
  a.currentTime = 0;
  set({ status: "playing" });
  a.play().catch((err: unknown) => {
      // stopped before it began (triple-click, footer left): not a failure
      if (state.status !== "playing" || (err instanceof DOMException && err.name === "AbortError")) return;
      // silent mode, blocked audio, unreadable file: show the words instead
      set({ status: "blocked" });
      statusTimer = window.setTimeout(() => set({ status: "idle" }), 3000);
    });
}

export function stopVoice() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  window.clearTimeout(statusTimer);
  if (state.status !== "idle") set({ status: "idle" });
}

/**
 * Stop the clip and open LinkedIn in a new tab. Called straight from the
 * click, so popup blockers allow it. (window.open with "noopener" always
 * returns null, which would hide a blocked popup: the opener is cut by hand.)
 */
export function openLinkedIn() {
  stopVoice();
  markInteracted();
  set({ toast: true });
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => set({ toast: false }), 1200);
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    tab.opener = null;
    tab.location.href = site.linkedin;
  } else {
    window.location.href = site.linkedin;
  }
}

/**
 * Footer lifecycle: download the clip once the footer is within 600 px; stop
 * it when the footer leaves the screen or the tab is hidden.
 */
export function watchVoice(footer: HTMLElement): () => void {
  const onHide = () => {
    if (document.hidden) stopVoice();
  };
  document.addEventListener("visibilitychange", onHide);
  if (typeof IntersectionObserver === "undefined") {
    return () => document.removeEventListener("visibilitychange", onHide);
  }
  const near = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      primeVoice();
      near.disconnect();
    },
    { rootMargin: "600px 0px" }
  );
  // only when it actually leaves: a footer that mounts below the screen
  // (while the hero's alien is gliding down to it) must not stop the clip
  let seen = false;
  const onScreen = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) seen = true;
    else if (seen) stopVoice();
  });
  near.observe(footer);
  onScreen.observe(footer);
  return () => {
    document.removeEventListener("visibilitychange", onHide);
    near.disconnect();
    onScreen.disconnect();
  };
}
