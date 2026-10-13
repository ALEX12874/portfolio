/**
 * Scene-only orbit layout for the eight skill planets. Kept beside the 3D
 * code (not in data/skills.ts) so the content data stays untouched.
 *
 * Orbit radii run 3.2 → 10.5 with distinct inclinations; inner planets
 * orbit faster. `spin` is the self-rotation speed (rad/s) and `tilt` the
 * axial tilt (rad).
 */
export interface PlanetLayout {
  orbitRadius: number;
  inclination: number;
  orbitSpeed: number;
  size: number;
  spin: number;
  tilt: number;
  /** Starting angle on the orbit (rad). */
  phase: number;
}

/**
 * Even spread at load: 45° apart (+ a small per-planet offset), with each
 * inner (faster) planet starting AHEAD of its outer neighbour, so neighbours
 * only drift apart — no two planets bunch up or overlap in the first ~20 s.
 */
const OFFSETS = [0, 0.1, -0.08, 0.06, -0.1, 0.08, -0.05, 0.12];
const spread = (i: number) => -i * ((Math.PI * 2) / 8) + OFFSETS[i] + 0.6;

export const PLANET_LAYOUT: Record<string, PlanetLayout> = {
  "consumer-behaviour": { orbitRadius: 3.2, inclination: 0.1, orbitSpeed: 0.26, size: 0.6, spin: 0.32, tilt: 0.28, phase: spread(0) },
  "creative-strategy": { orbitRadius: 4.25, inclination: -0.16, orbitSpeed: 0.21, size: 0.78, spin: 0.22, tilt: -0.4, phase: spread(1) },
  "market-research": { orbitRadius: 5.3, inclination: 0.2, orbitSpeed: 0.17, size: 0.66, spin: 0.18, tilt: 0.18, phase: spread(2) },
  "product-marketing": { orbitRadius: 6.35, inclination: -0.08, orbitSpeed: 0.14, size: 0.9, spin: 0.14, tilt: 0.12, phase: spread(3) },
  "brand-identity": { orbitRadius: 7.4, inclination: 0.14, orbitSpeed: 0.115, size: 0.72, spin: 0.2, tilt: -0.3, phase: spread(4) },
  "consumer-insights": { orbitRadius: 8.45, inclination: -0.2, orbitSpeed: 0.095, size: 0.8, spin: 0.12, tilt: 0.36, phase: spread(5) },
  communication: { orbitRadius: 9.5, inclination: 0.06, orbitSpeed: 0.08, size: 0.85, spin: 0.16, tilt: 0.22, phase: spread(6) },
  "business-development": { orbitRadius: 10.5, inclination: -0.12, orbitSpeed: 0.065, size: 0.95, spin: 0.1, tilt: -0.2, phase: spread(7) },
};

/** Outermost orbit (used to fit the camera). */
export const OUTER_ORBIT = 10.5;
