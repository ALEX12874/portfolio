import type { WebGeometry } from "./webGeometry";

/**
 * The finished web, painted once into a <canvas> (main web, and optionally
 * the faint back web on its own canvas). The page then only moves these
 * bitmaps with compositor transforms (breathing, drift, device tilt), so the
 * hundreds of strands are never repainted while the spider works.
 *
 * Same paths, colours and widths as the SVG draw-in, so the hand-over from
 * the drawing animation to the raster is invisible.
 */

/** Extra room around the section so breathing / tilt never reveal an edge. */
export function rasterMargin(W: number, H: number) {
  return Math.ceil(Math.hypot(W, H) * 0.016) + 12;
}

/** Device-pixel ratio for a bitmap: ≤ 2, and ≤ ~4.2 M pixels in total. */
function ratioFor(w: number, h: number, cap: number) {
  let dpr = Math.min(cap, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  while (dpr > 1 && w * h * dpr * dpr > 4_200_000) dpr -= 0.25;
  return Math.max(1, dpr);
}

function prepare(canvas: HTMLCanvasElement, W: number, H: number, cap: number) {
  const m = rasterMargin(W, H);
  const w = W + m * 2;
  const h = H + m * 2;
  const dpr = ratioFor(w, h, cap);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.left = `${-m}px`;
  canvas.style.top = `${-m}px`;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, dpr * m, dpr * m);
  ctx.clearRect(-m, -m, w, h);
  return ctx;
}

export function paintMainWeb(canvas: HTMLCanvasElement, geo: WebGeometry) {
  const ctx = prepare(canvas, geo.W, geo.H, 2);
  if (!ctx) return;
  ctx.lineCap = "butt";
  // spokes, thinning from the hub to the edges
  ctx.strokeStyle = "rgba(21, 21, 21, 0.32)";
  for (const s of geo.spokeSegs) {
    ctx.lineWidth = s.w;
    ctx.stroke(new Path2D(s.d));
  }
  // rings
  ctx.strokeStyle = "rgba(21, 21, 21, 0.23)";
  geo.ringPaths.forEach((d, k) => {
    ctx.lineWidth = geo.ringWidths[k];
    ctx.stroke(new Path2D(d));
  });
  // dew drops (their glints are separate tiny layers on top)
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#f5f0e8";
  ctx.strokeStyle = "rgba(21, 21, 21, 0.18)";
  ctx.lineWidth = 0.6;
  for (const p of geo.dew) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function paintBackWeb(canvas: HTMLCanvasElement, geo: WebGeometry) {
  // faint and soft: a lower resolution is plenty
  const ctx = prepare(canvas, geo.W, geo.H, 1.25);
  if (!ctx) return;
  const { x, y } = geo.hub;
  ctx.translate(x, y);
  ctx.rotate((11 * Math.PI) / 180);
  ctx.scale(0.6, 0.6);
  ctx.translate(-x, -y);
  ctx.strokeStyle = "rgba(21, 21, 21, 0.12)";
  // 0.8 px on screen, whatever the scale (like non-scaling-stroke)
  ctx.lineWidth = 0.8 / 0.6;
  for (const d of geo.spokePaths) ctx.stroke(new Path2D(d));
  for (const d of geo.ringPaths) ctx.stroke(new Path2D(d));
}
