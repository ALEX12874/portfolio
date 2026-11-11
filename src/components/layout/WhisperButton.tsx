import { useEffect, useRef } from "react";
import { useMultiClick } from "../../hooks/useMultiClick";
import { loudnessAt, voiceClip } from "../../data/voiceWave";
import {
  markInteracted,
  openLinkedIn,
  playVoice,
  primeVoice,
  useVoice,
  voiceAudio,
  voiceState,
} from "../../lib/voicePlayer";

const BARS = [0, 1, 2, 3, 4];
const HINT = "Triple-tap for LinkedIn";

/**
 * Footer pill that plays Gourang's voice clip. One click plays; a
 * triple-click (or L while focused) opens LinkedIn instead (lib/voicePlayer).
 */
export default function WhisperButton() {
  const { status } = useVoice();
  const playing = status === "playing";
  const onClick = useMultiClick(playVoice, openLinkedIn);
  const wrap = useRef<HTMLSpanElement | null>(null);
  const bars = useRef<Array<HTMLSpanElement | null>>([]);
  const progress = useRef<HTMLSpanElement | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);

  // while playing: the bars follow the voice and the red line fills, read
  // straight from the audio clock (no React render per frame)
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    const tick = () => {
      const t = voiceAudio()?.currentTime ?? 0;
      bars.current.forEach((bar, k) => {
        if (bar) bar.style.transform = `scaleY(${(0.25 + 0.75 * loudnessAt(t + (k - 2) * 0.09)).toFixed(3)})`;
      });
      if (progress.current) progress.current.style.transform = `scaleX(${Math.min(1, t / voiceClip.duration).toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      bars.current.forEach((bar) => bar?.style.removeProperty("transform"));
      progress.current?.style.removeProperty("transform");
    };
  }, [playing]);

  // attention: once ≥ 60 % of it has stayed in view for 400 ms, one short
  // shake; at most one more 5 s later; never after the first press or while
  // playing (a CSS class: transform only, nothing per frame in JS)
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    let shakes = 0;
    let visible = false;
    let notBefore = 0;
    let dwell = 0;
    let again = 0;
    const shake = () => {
      const s = voiceState();
      if (s.interacted || s.status === "playing" || shakes >= 2 || !visible || Date.now() < notBefore) return;
      shakes += 1;
      notBefore = Date.now() + 5000;
      el.dataset.shakes = String(shakes);
      el.classList.add("is-shaking");
      if (shakes < 2) again = window.setTimeout(shake, 5000);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        window.clearTimeout(dwell);
        if (visible) dwell = window.setTimeout(shake, 400);
      },
      { threshold: 0.6 }
    );
    const done = () => el.classList.remove("is-shaking");
    io.observe(el);
    el.addEventListener("animationend", done);
    return () => {
      io.disconnect();
      el.removeEventListener("animationend", done);
      window.clearTimeout(dwell);
      window.clearTimeout(again);
    };
  }, []);

  // desktop mice only: the pill turns to living goo that reaches for the
  // pointer (./whisperGoo, its own chunk, fetched once the footer is near)
  useEffect(() => {
    const host = wrap.current;
    const btn = button.current;
    if (
      !host ||
      !btn ||
      typeof IntersectionObserver === "undefined" ||
      typeof ResizeObserver === "undefined" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return undefined;
    let stop: (() => void) | undefined;
    let live = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        import("./whisperGoo")
          .then((m) => {
            if (live) stop = m.startWhisperGoo(host, btn);
          })
          .catch(() => undefined);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(host);
    return () => {
      live = false;
      io.disconnect();
      stop?.();
    };
  }, []);

  return (
    <span ref={wrap} className="whisper-wrap">
      <button
        ref={button}
        type="button"
        className="whisper"
        data-state={status}
        aria-pressed={playing}
        aria-label="Play a short voice message from Gourang. Triple-click to open LinkedIn."
        title={HINT}
        onClick={onClick}
        onPointerDown={markInteracted}
        onPointerEnter={primeVoice}
        onFocus={primeVoice}
        onKeyDown={(e) => {
          if (e.key === "l" || e.key === "L") {
            e.preventDefault();
            openLinkedIn();
          }
        }}
      >
        <span className="whisper-capsule" aria-hidden="true">
          {BARS.map((k) => (
            <span
              key={k}
              className="whisper-bar"
              style={{ animationDelay: `${k * 0.12}s` }}
              ref={(n) => {
                bars.current[k] = n;
              }}
            />
          ))}
        </span>
        <span className="whisper-label">{playing ? "Playing…" : "Whisper to me"}</span>
        <span className="whisper-check" aria-hidden="true">
          ✓
        </span>
        <span ref={progress} className="whisper-progress" aria-hidden="true" />
      </button>
      {status === "blocked" ? (
        <span role="tooltip" className="whisper-tip">
          Turn your sound on to hear me
        </span>
      ) : null}
    </span>
  );
}
