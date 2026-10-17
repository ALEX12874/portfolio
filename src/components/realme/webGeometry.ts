/**
 * Orb-web geometry for the "The Real Me" scene, built once per section size.
 * Coordinates are section pixels (the SVG viewBox is 0 0 W H, so nothing is
 * ever distorted).
 */
export interface Pt {
  x: number;
  y: number;
}

export interface WebGeometry {
  W: number;
  H: number;
  hub: Pt;
  /** Unit direction of each spoke. */
  dirs: Pt[];
  /** Radius of ring k on spoke i (slightly irregular, like a real web). */
  radius: number[][];
  spokePaths: string[];
  ringPaths: string[];
  dew: Pt[];
  /** Intersection of spoke i and ring k. */
  point: (i: number, k: number) => Pt;
  /** Nearest strand intersection to a point (only rings ≥ minRing). */
  nearest: (p: Pt, minRing?: number) => { i: number; k: number; p: Pt };
}

export const SPOKES = 16;

/** Deterministic PRNG so the web looks the same on every load. */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const f = (n: number) => n.toFixed(1);

export function buildWeb(W: number, H: number, hub: Pt, compact: boolean): WebGeometry {
  const rnd = seeded(1607);

  // spokes long enough to run off every edge of the section
  const R = Math.max(
    Math.hypot(hub.x, hub.y),
    Math.hypot(W - hub.x, hub.y),
    Math.hypot(hub.x, H - hub.y),
    Math.hypot(W - hub.x, H - hub.y)
  ) * 1.04;

  const dirs: Pt[] = Array.from({ length: SPOKES }, (_, i) => {
    const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2 + (rnd() - 0.5) * 0.09;
    return { x: Math.cos(a), y: Math.sin(a) };
  });

  // spiral rings: tight near the hub, widening outward (geometric spacing)
  const rings: number[] = [];
  let r = compact ? 12 : 16;
  while (r < R) {
    rings.push(r);
    r = r * (compact ? 1.17 : 1.15) + (compact ? 7 : 9);
  }

  const radius = dirs.map(() => rings.map((rk) => rk * (1 + (rnd() - 0.5) * 0.05)));
  const point = (i: number, k: number): Pt => {
    const ii = ((i % SPOKES) + SPOKES) % SPOKES;
    const rr = radius[ii][k];
    return { x: hub.x + dirs[ii].x * rr, y: hub.y + dirs[ii].y * rr };
  };

  const spokePaths = dirs.map((d) => `M${f(hub.x)} ${f(hub.y)} L${f(hub.x + d.x * R)} ${f(hub.y + d.y * R)}`);

  // each ring segment between two spokes sags slightly toward the hub
  const ringPaths = rings.map((_, k) => {
    let d = "";
    for (let i = 0; i <= SPOKES; i += 1) {
      const p = point(i, k);
      if (i === 0) {
        d += `M${f(p.x)} ${f(p.y)}`;
        continue;
      }
      const q = point(i - 1, k);
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      const sag = 0.9 - rnd() * 0.04;
      const c = { x: hub.x + (mid.x - hub.x) * sag, y: hub.y + (mid.y - hub.y) * sag };
      d += ` Q${f(c.x)} ${f(c.y)} ${f(p.x)} ${f(p.y)}`;
    }
    return d;
  });

  // a few dew drops on strand crossings
  const dew: Pt[] = [];
  for (let n = 0; n < (compact ? 8 : 14); n += 1) {
    const p = point(Math.floor(rnd() * SPOKES), 2 + Math.floor(rnd() * Math.min(rings.length - 3, compact ? 9 : 14)));
    if (p.x > 8 && p.x < W - 8 && p.y > 8 && p.y < H - 8) dew.push(p);
  }

  const nearest = (p: Pt, minRing = 1) => {
    let best = { i: 0, k: minRing, p: point(0, minRing) };
    let bd = Infinity;
    for (let i = 0; i < SPOKES; i += 1) {
      for (let k = minRing; k < rings.length; k += 1) {
        const q = point(i, k);
        const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
        if (d < bd) {
          bd = d;
          best = { i, k, p: q };
        }
      }
    }
    return best;
  };

  return { W, H, hub, dirs, radius, spokePaths, ringPaths, dew, point, nearest };
}
