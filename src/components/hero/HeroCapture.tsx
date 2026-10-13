import { Suspense, lazy } from "react";
import { CAPTURE_VARIANT } from "./HeroScene/clock";

const Scene = lazy(() => import("./HeroScene/Scene"));

/** Source sizes of the two pre-rendered compositions. */
export const CAPTURE_SIZE = {
  wide: { width: 1280, height: 1024 },
  phone: { width: 960, height: 864 },
} as const;

/**
 * `?capture=1&variant=wide|phone` — a bare, fixed-size ivory stage holding
 * only the hero scene, driven frame by frame by scripts/render-hero.mjs.
 */
export default function HeroCapture() {
  const size = CAPTURE_SIZE[CAPTURE_VARIANT];
  return (
    <div
      id="capture-stage"
      style={{ width: size.width, height: size.height, background: "#F5F0E8", position: "relative" }}
    >
      <Suspense fallback={null}>
        <Scene active parallax={false} />
      </Suspense>
    </div>
  );
}
