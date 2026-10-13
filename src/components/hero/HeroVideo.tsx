import { useEffect, useRef, useState } from "react";
import wideMp4 from "../../assets/hero/hero-wide.mp4";
import wideWebm from "../../assets/hero/hero-wide.webm";
import widePoster from "../../assets/hero/hero-wide.webp";
import phoneMp4 from "../../assets/hero/hero-phone.mp4";
import phoneWebm from "../../assets/hero/hero-phone.webm";
import phonePoster from "../../assets/hero/hero-phone.webp";
import { usePrefersReducedMotion } from "../../hooks/useReducedMotion";

const SOURCES = {
  wide: { mp4: wideMp4, webm: wideWebm, poster: widePoster, width: 1280, height: 1024 },
  phone: { mp4: phoneMp4, webm: phoneWebm, poster: phonePoster, width: 960, height: 864 },
} as const;

type Variant = keyof typeof SOURCES;

/** React 18 only forwards the lowercase HTML attribute without warning. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

/** Phone composition below 900px or in portrait; wide otherwise. */
function pickVariant(): Variant {
  if (typeof window === "undefined") return "wide";
  return window.innerWidth < 900 || window.innerHeight > window.innerWidth ? "phone" : "wide";
}

/**
 * Pre-rendered loop of the live 3D hero (scripts/render-hero.mjs), so every
 * device gets the same scene. The poster is a real frame of that scene and
 * paints first (LCP); the video fades in only once it actually plays, so
 * blocked autoplay (iOS Low Power Mode) still shows the poster. Pauses
 * off-screen; reduced motion shows the poster only.
 */
export default function HeroVideo({ fit = "contain" }: { fit?: "contain" | "cover" }) {
  const reduced = usePrefersReducedMotion();
  const [variant, setVariant] = useState<Variant>(pickVariant);
  const [playing, setPlaying] = useState(false);
  // attach the video only after the page has loaded, so its bytes never
  // compete with the poster (LCP) or the app's own scripts
  const [attach, setAttach] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);

  // switch composition on resize / rotation
  useEffect(() => {
    const onResize = () => setVariant(pickVariant());
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => setPlaying(false), [variant]);

  useEffect(() => {
    let t = 0;
    const later = () => {
      t = window.setTimeout(() => setAttach(true), 400);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      window.clearTimeout(t);
    };
  }, []);

  // play only while visible; retry after the first user gesture if blocked
  useEffect(() => {
    const v = video.current;
    const node = wrap.current;
    if (!v || !node || reduced || !attach) return undefined;

    let visible = true;
    const tryPlay = () => {
      if (!visible) return;
      const p = v.play();
      if (p) p.catch(() => undefined);
    };
    const onGesture = () => tryPlay();
    const gestures = ["touchstart", "pointerdown", "scroll", "keydown"] as const;
    gestures.forEach((g) => window.addEventListener(g, onGesture, { passive: true, once: true }));

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              if (visible) tryPlay();
              else v.pause();
            },
            { threshold: 0.05 }
          )
        : null;
    io?.observe(node);
    tryPlay();

    return () => {
      io?.disconnect();
      gestures.forEach((g) => window.removeEventListener(g, onGesture));
    };
  }, [variant, reduced, attach]);

  const src = SOURCES[variant];
  const media = `absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`;

  return (
    <div ref={wrap} className="relative h-full w-full" style={{ background: "#F5F0E8" }}>
      <img
        src={src.poster}
        alt="3D street scene: a large billboard reading IT'S ALL MARKETING. above a crowd and passing cars"
        width={src.width}
        height={src.height}
        // the poster is the hero's largest paint
        {...HIGH_PRIORITY}
        decoding="async"
        className={media}
        style={{ objectPosition: "center bottom" }}
        draggable={false}
      />
      {reduced || !attach ? null : (
        <video
          key={variant}
          ref={video}
          className={`${media} transition-opacity duration-500`}
          style={{ objectPosition: "center bottom", opacity: playing ? 1 : 0 }}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          poster={src.poster}
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
        >
          <source src={src.webm} type="video/webm" />
          <source src={src.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
