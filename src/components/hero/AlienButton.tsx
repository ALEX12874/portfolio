import { scrollToCenter, scrollToSection } from "../../lib/scroll";
import { markInteracted, playVoice, unlockVoice } from "../../lib/voicePlayer";

/**
 * Hero shortcut to the footer's voice note: a small alien fidgets in the
 * circle, then turns into the "Whisper to me" sound bars, and back. A click
 * glides down to the footer's pill and plays the clip there.
 */
function goToVoice() {
  // inside the click: allowed to play sound later (iOS), no attention shake
  unlockVoice();
  markInteracted();
  const started = performance.now();
  let glides = 0;
  let lastTop = Number.NaN;
  let still = 0;
  const pillNow = () => document.querySelector<HTMLElement>("#contact .whisper");
  if (!pillNow()) scrollToSection("contact"); // the footer mounts on the way
  const tick = () => {
    const pill = pillNow();
    if (pill) {
      if (glides === 0) {
        glides = 1;
        scrollToCenter(pill);
      } else {
        // play once the glide has settled with the pill well on screen; if
        // sections loading on the way pushed it aside, glide once more
        const r = pill.getBoundingClientRect();
        still = Math.abs(r.top - lastTop) < 1 ? still + 1 : 0;
        lastTop = r.top;
        if (still >= 2) {
          const vh = window.innerHeight;
          if ((r.top < vh * 0.2 || r.bottom > vh * 0.85) && glides < 3) {
            glides += 1;
            still = 0;
            scrollToCenter(pill);
          } else if (r.top >= 0 && r.bottom <= vh) {
            playVoice();
            return;
          }
        }
      }
    }
    if (performance.now() - started < 8000) window.setTimeout(tick, 100);
  };
  window.setTimeout(tick, 100);
}

export default function AlienButton() {
  return (
    <button
      type="button"
      onClick={goToVoice}
      aria-label="Hear a short voice message from Gourang (goes to the contact section)"
      title="Whisper to me"
      className="icon-circle alien-btn !h-[52px] !w-[52px]"
    >
      <svg viewBox="0 0 40 40" className="h-[38px] w-[38px] overflow-visible" aria-hidden="true">
        {/* the alien */}
        <g className="alien">
          <g className="alien-dance">
            <g className="alien-antenna alien-antenna--l">
              <path d="M15 11 L12 5" stroke="#151515" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="11.6" cy="4.4" r="2" fill="#E63843" stroke="#151515" strokeWidth="1.2" />
            </g>
            <g className="alien-antenna alien-antenna--r">
              <path d="M25 11 L28 5" stroke="#151515" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="28.4" cy="4.4" r="2" fill="#E63843" stroke="#151515" strokeWidth="1.2" />
            </g>
            {/* little body + waving arms */}
            <path className="alien-arm alien-arm--l" d="M14 28 Q10 27 9 23" stroke="#151515" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path className="alien-arm alien-arm--r" d="M26 28 Q30 27 31 23" stroke="#151515" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <rect x="15" y="25" width="10" height="9" rx="4" fill="#D8FF63" stroke="#151515" strokeWidth="1.6" />
            {/* head */}
            <ellipse cx="20" cy="18" rx="10.5" ry="8.8" fill="#D8FF63" stroke="#151515" strokeWidth="1.6" />
            <g className="alien-eyes">
              <ellipse cx="16" cy="17.6" rx="2.6" ry="3.3" fill="#151515" />
              <ellipse cx="24" cy="17.6" rx="2.6" ry="3.3" fill="#151515" />
              <circle cx="16.9" cy="16.4" r="0.9" fill="#F5F0E8" />
              <circle cx="24.9" cy="16.4" r="0.9" fill="#F5F0E8" />
            </g>
            <path d="M18 22.6 Q20 24.2 22 22.6" stroke="#151515" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          </g>
        </g>
        {/* …which turns into the voice pill's sound bars */}
        <g className="alien-bars">
          <rect x="6" y="12" width="28" height="16" rx="8" fill="#151515" />
          {[13.5, 18, 22.5, 27].map((x, i) => (
            <rect
              key={x}
              className="alien-bar"
              x={x - 1.2}
              y="15"
              width="2.4"
              height="10"
              rx="1.2"
              fill="#D8FF63"
              style={{ animationDelay: `${i * 0.11}s` }}
            />
          ))}
        </g>
      </svg>
    </button>
  );
}
