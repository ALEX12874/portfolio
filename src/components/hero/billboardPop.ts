import type { Quad } from "../../data/heroHotspot";

/** 3×3 matrix, row-major: [a, b, c, d, e, f, g, h, i]. */
export type M3 = [number, number, number, number, number, number, number, number, number];

export const mul = (A: M3, B: M3): M3 => [
  A[0] * B[0] + A[1] * B[3] + A[2] * B[6],
  A[0] * B[1] + A[1] * B[4] + A[2] * B[7],
  A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
  A[3] * B[0] + A[4] * B[3] + A[5] * B[6],
  A[3] * B[1] + A[4] * B[4] + A[5] * B[7],
  A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
  A[6] * B[0] + A[7] * B[3] + A[8] * B[6],
  A[6] * B[1] + A[7] * B[4] + A[8] * B[7],
  A[6] * B[2] + A[7] * B[5] + A[8] * B[8],
];

/**
 * Homography taking the unit square (0,0)(1,0)(1,1)(0,1) onto a quad given
 * clockwise from top-left (Heckbert's square-to-quad).
 */
export function squareToQuad(q: Quad): M3 {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

/** A 3×3 projective matrix as a CSS matrix3d (transform-origin 0 0). */
export function toMatrix3d(m: M3): string {
  const n = m.map((v) => (Math.abs(v) < 1e-12 ? 0 : v));
  return `matrix3d(${n[0]},${n[3]},0,${n[6]},${n[1]},${n[4]},0,${n[7]},0,0,1,0,${n[2]},${n[5]},0,${n[8]})`;
}

/**
 * Where a point given in % of the video frame lands inside the stage, using
 * the same object-fit + object-position (center bottom) as the <video>.
 */
export function framePointToStage(
  p: [number, number],
  frame: { width: number; height: number },
  stage: { width: number; height: number },
  fit: "contain" | "cover"
): [number, number] {
  const sx = stage.width / frame.width;
  const sy = stage.height / frame.height;
  const s = fit === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
  const w = frame.width * s;
  const h = frame.height * s;
  const ox = (stage.width - w) * 0.5;
  const oy = stage.height - h; // object-position: center bottom
  return [ox + (p[0] / 100) * w, oy + (p[1] / 100) * h];
}
