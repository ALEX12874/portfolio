import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OUTER_ORBIT } from "./planets";
import { focus } from "./planets/focus";

const target = new THREE.Vector3();
const desired = new THREE.Vector3();

interface CameraControlsProps {
  /** Rotation is disabled on reduced-motion devices. */
  enabled: boolean;
}

const ELEV_MIN = 0.18;
const ELEV_MAX = 0.95;
/** Default framing: ~23° top-down tilt. */
const ELEV_DEFAULT = 0.4;
/** Share of the canvas width the outer orbit spans. */
const FILL = 0.88;

/**
 * Lightweight drag-to-orbit camera with damping, polar-angle limits and no
 * zoom (so page scrolling is never hijacked).
 *
 * The canvas wrapper uses `touch-action: pan-y`, so vertical swipes scroll the
 * page; horizontal drags orbit. Vertical deltas from a touch pointer are only
 * applied when the gesture is horizontal-dominant.
 */
export default function CameraControls({ enabled }: CameraControlsProps) {
  const { camera, gl } = useThree();
  const state = useRef({
    az: 0.35,
    targetAz: 0.35,
    el: ELEV_DEFAULT,
    targetEl: ELEV_DEFAULT,
    dragging: false,
    lastX: 0,
    lastY: 0,
    dominantX: true,
    framed: false,
  });

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "pan-y";

    if (!enabled) return;

    const onDown = (e: PointerEvent) => {
      state.current.dragging = true;
      state.current.lastX = e.clientX;
      state.current.lastY = e.clientY;
      state.current.dominantX = true;
    };

    const onMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;

      const isTouch = e.pointerType === "touch";
      if (isTouch) {
        // only horizontal-dominant gestures orbit; otherwise the browser scrolls
        if (Math.abs(dx) <= Math.abs(dy)) {
          s.dominantX = false;
          return;
        }
        if (!s.dominantX) return;
      }

      s.targetAz -= dx * 0.006;
      s.targetEl = THREE.MathUtils.clamp(
        s.targetEl + (isTouch ? 0 : dy * 0.004),
        ELEV_MIN,
        ELEV_MAX
      );
    };

    const onUp = () => {
      state.current.dragging = false;
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
    // portrait (phone) canvases: a steeper ~35° view uses the tall canvas
    if (!s.framed) {
      s.framed = true;
      const a = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      if (a < 1) {
        s.el = 0.62;
        s.targetEl = 0.62;
      }
    }
    s.az = THREE.MathUtils.lerp(s.az, s.targetAz, 0.07);
    s.el = THREE.MathUtils.lerp(s.el, s.targetEl, 0.07);

    const cam = camera as THREE.PerspectiveCamera;
    const aspect = cam.aspect || 1.6;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

    // fit: the orbit's left/right extremes sit at the Sun's depth, so the
    // outer orbit spans FILL of the width; the tilted ellipse (+ planet
    // headroom) must also fit vertically when the user drags it steeper.
    // portrait canvases get a little extra margin for the near-side bulge
    const halfW = OUTER_ORBIT / (aspect < 1.2 ? 0.9 : FILL);
    const halfH = (OUTER_ORBIT * Math.sin(s.el) + 2.4) / 0.92;
    const distance = Math.max(halfW / (tanV * aspect), halfH / tanV);

    const y = Math.sin(s.el) * distance;
    const horizontal = Math.cos(s.el) * distance;

    // portrait canvases: ease the look-at toward the selected planet so it
    // sits in the canvas centre; otherwise back to the Sun at the origin
    if (focus.active && aspect < 1.2) desired.copy(focus.position).multiplyScalar(0.7);
    else desired.set(0, 0, 0);
    target.lerp(desired, 0.06);

    camera.position.set(
      target.x + Math.sin(s.az) * horizontal,
      target.y + y,
      target.z + Math.cos(s.az) * horizontal
    );
    camera.lookAt(target);
  });

  return null;
}
