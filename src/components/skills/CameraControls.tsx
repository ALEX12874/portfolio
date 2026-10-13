import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OUTER_ORBIT } from "./planets";

interface CameraControlsProps {
  /** Rotation is disabled on reduced-motion devices. */
  enabled: boolean;
}

/**
 * Locked elevation: orbit rings read as ellipses with a short/long axis ratio
 * of sin(38°) ≈ 0.62 (polar angle ≈ 52° from vertical) — the reference view.
 * The same angle on every device; only the distance adapts to the canvas.
 */
export const ELEVATION = THREE.MathUtils.degToRad(38);
/** Default azimuth of the reference view. */
const AZ_DEFAULT = 0.35;
/** Ease back to AZ_DEFAULT this long after the last drag. */
const RETURN_AFTER_MS = 4000;
/** Outer orbit share of the canvas: width on portrait, height on landscape. */
const FILL_PORTRAIT_W = 0.92;
const FILL_LANDSCAPE_H = 0.88;
/** Headroom for planet bodies/rings sticking out of the outer orbit. */
const PLANET_MARGIN = 1.6;

/**
 * Drag rotates the system around the vertical axis only (azimuth, damped);
 * elevation never changes, there is no zoom or pan, so page scrolling is
 * never hijacked. The wrapper uses `touch-action: pan-y`: vertical swipes
 * scroll the page, horizontal drags rotate.
 */
export default function CameraControls({ enabled }: CameraControlsProps) {
  const { camera, gl } = useThree();
  const state = useRef({
    az: AZ_DEFAULT,
    targetAz: AZ_DEFAULT,
    dragging: false,
    lastX: 0,
    lastY: 0,
    dominantX: true,
    releasedAt: 0,
  });

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "pan-y";
    if (!enabled) return;

    const onDown = (e: PointerEvent) => {
      const s = state.current;
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.dominantX = true;
    };

    const onMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      if (e.pointerType === "touch") {
        // only horizontal-dominant gestures rotate; otherwise the page scrolls
        if (Math.abs(dx) <= Math.abs(dy)) {
          s.dominantX = false;
          return;
        }
        if (!s.dominantX) return;
      }
      s.targetAz -= dx * 0.006;
    };

    const onUp = () => {
      const s = state.current;
      if (s.dragging) s.releasedAt = performance.now();
      s.dragging = false;
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl, enabled]);

  useFrame(() => {
    const s = state.current;

    // drift back to the reference azimuth after a few idle seconds
    if (!s.dragging && s.releasedAt && performance.now() - s.releasedAt > RETURN_AFTER_MS) {
      // shortest way round
      const turns = Math.round((s.targetAz - AZ_DEFAULT) / (Math.PI * 2));
      s.targetAz = THREE.MathUtils.lerp(s.targetAz, AZ_DEFAULT + turns * Math.PI * 2, 0.04);
      if (Math.abs(s.targetAz - (AZ_DEFAULT + turns * Math.PI * 2)) < 0.001) {
        s.targetAz = AZ_DEFAULT;
        s.az = AZ_DEFAULT + (s.az - (AZ_DEFAULT + turns * Math.PI * 2));
        s.releasedAt = 0;
      }
    }
    s.az = THREE.MathUtils.lerp(s.az, s.targetAz, 0.07);

    const cam = camera as THREE.PerspectiveCamera;
    const aspect = cam.aspect || 1.6;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

    // Fit (recomputed every frame, so resize / rotation just works):
    // - width: the orbit's left/right extremes sit at the Sun's depth
    // - height: the tilted ellipse (minor half-axis R·sin e) + planet headroom
    const R = OUTER_ORBIT + PLANET_MARGIN;
    const portrait = aspect < 1;
    const halfW = R / (portrait ? FILL_PORTRAIT_W : 0.9);
    const halfH = (OUTER_ORBIT * Math.sin(ELEVATION) + PLANET_MARGIN) / (portrait ? 0.9 : FILL_LANDSCAPE_H);
    const distance = Math.max(halfW / (tanV * aspect), halfH / tanV);

    const y = Math.sin(ELEVATION) * distance;
    const horizontal = Math.cos(ELEVATION) * distance;
    camera.position.set(Math.sin(s.az) * horizontal, y, Math.cos(s.az) * horizontal);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
