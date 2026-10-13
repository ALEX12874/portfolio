import * as THREE from "three";

/**
 * Shared between the selected planet and the camera: on portrait (phone)
 * canvases the camera eases its target toward the selected planet so it
 * stays in the visible centre of the canvas.
 */
export const focus = {
  active: false,
  position: new THREE.Vector3(),
};

/** Touch devices get larger invisible hit spheres (≥ 44 px targets). */
export const COARSE =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** Below the desktop layout the chip rail + info card carry the title. */
export const NARROW =
  typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
