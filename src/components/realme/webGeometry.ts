/**
 * Orb-web geometry for the "The Real Me" scene, built once per section size.
 * Coordinates are section pixels (the SVG viewBox is 0 0 W H, so nothing is
 * ever distorted).
 *
 * Depth: the web is built flat, then every point is projected through the
 * same math as CSS `perspective: 900px; rotateX(a) rotateY(b)` around the hub.
 * Doing it here (not with a CSS transform) means the spider, the bugs and
 * the upright skill chips all sit exactly on the tilted strands.
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
  /** Whole spokes (used by the faint back web). */
  spokePaths: string[];
  /** Spokes split in three, thinning from the hub (1.1 px) to the edges (0.7 px). */
  spokeSegs: { d: string; w: number; i: number; seg: number }[];
  ringPaths: string[];
  /** Stroke width per ring, thinning outward. */
  ringWidths: number[];
  dew: Pt[];
  /**
   * Path of ring k from spoke `from` to spoke `to` (going forward, wrapping),
   * with exactly the same sag as the full ring — used to redraw only the few
   * strand pieces near a bug when they tremble.
   */
  ringArc: (k: number, from: number, to: number) => string;
  /** Intersection of spoke i and ring k. */
  point: (i: number, k: number) => Pt;
  /** Nearest strand intersection to a point (only rings ≥ minRing). */
  nearest: (p: Pt, minRing?: number) => { i: number; k: number; p: Pt };
}

export const SPOKES = 16;

/** Tilt of the web plane, in degrees (CSS rotateX / rotateY). */
export interface Tilt {
  x: number;
  y: number;
}

const PERSPECTIVE = 900;

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

export function buildWeb(W: number, H: number, hub: Pt, compact: boolean, tilt: Tilt | null = null): WebGeometry {
  const rnd = seeded(1607);

  // furthest section corner from the hub
  const reach = Math.max(
    Math.hypot(hub.x, hub.y),
    Math.hypot(W - hub.x, hub.y),
    Math.hypot(hub.x, H - hub.y),
    Math.hypot(W - hub.x, H - hub.y)
  );
  // spokes long enough to run off every edge, even on the side the tilt
  // pushes away from the viewer (it appears smaller there)
  const R = reach * (tilt ? 1.35 : 1.04);

  // flat (x, y) relative to the hub → section pixels
  const ax = ((tilt?.x ?? 0) * Math.PI) / 180;
  const ay = ((tilt?.y ?? 0) * Math.PI) / 180;
  const cx = Math.cos(ax);
  const sx = Math.sin(ax);
  const cy = Math.cos(ay);
  const sy = Math.sin(ay);
  const project = (x: number, y: number): Pt => {
    if (!tilt) return { x: hub.x + x, y: hub.y + y };
    // CSS applies the right-most function first: rotateY, then rotateX
    const x1 = x * cy;
    const z1 = -x * sy;
    const y2 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const k = PERSPECTIVE / Math.max(PERSPECTIVE - z2, PERSPECTIVE * 0.35);
    return { x: hub.x + x1 * k, y: hub.y + y2 * k };
  };

  const dirs: Pt[] = Array.from({ length: SPOKES }, (_, i) => {
    const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2 + (rnd() - 0.5) * 0.09;
    return { x: Math.cos(a), y: Math.sin(a) };
  });

  // spiral rings: tight near the hub, widening outward (geometric spacing)
  const rings: number[] = [];
  let r = compact ? 9 : 16;
  while (r < R) {
    rings.push(r);
    r = r * (compact ? 1.15 : 1.15) + (compact ? 5 : 9);
  }

  const radius = dirs.map(() => rings.map((rk) => rk * (1 + (rnd() - 0.5) * 0.05)));
  const point = (i: number, k: number): Pt => {
    const ii = ((i % SPOKES) + SPOKES) % SPOKES;
    const rr = radius[ii][k];
    return project(dirs[ii].x * rr, dirs[ii].y * rr);
  };
  const along = (d: Pt, r: number) => project(d.x * r, d.y * r);

  const spokePaths = dirs.map((d) => {
    const e = along(d, R);
    return `M${f(hub.x)} ${f(hub.y)} L${f(e.x)} ${f(e.y)}`;
  });

  // thinning toward the edges: three segments per spoke
  const SEG_W = [1.1, 0.9, 0.7];
  const cuts = [0, reach * 0.3, reach * 0.62, R];
  const spokeSegs = dirs.flatMap((d, i) =>
    SEG_W.map((w, seg) => {
      const a = along(d, cuts[seg]);
      const b = along(d, cuts[seg + 1]);
      return { d: `M${f(a.x)} ${f(a.y)} L${f(b.x)} ${f(b.y)}`, w, i, seg };
    })
  );
  const ringWidths = rings.map((rk) => +(1.1 - 0.4 * Math.min(1, rk / (reach * 0.8))).toFixed(2));

  // each ring segment between two spokes sags slightly toward the hub
  // (ctrl[k][i] = control point of the segment that ends on spoke i)
  const ctrl: Pt[][] = rings.map(() => new Array<Pt>(SPOKES));
  const ringPaths = rings.map((_, k) => {
    let d = "";
    for (let i = 0; i <= SPOKES; i += 1) {
      const p = point(i, k);
      if (i === 0) {
        d += `M${f(p.x)} ${f(p.y)}`;
        continue;
      }
      // the sag toward the hub is shaped in the flat web, then projected
      const ii = i % SPOKES;
      const jj = (i - 1 + SPOKES) % SPOKES;
      const mid = {
        x: (dirs[ii].x * radius[ii][k] + dirs[jj].x * radius[jj][k]) / 2,
        y: (dirs[ii].y * radius[ii][k] + dirs[jj].y * radius[jj][k]) / 2,
      };
      const sag = 0.9 - rnd() * 0.04;
      const c = project(mid.x * sag, mid.y * sag);
      ctrl[k][ii] = c;
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

  const ringArc = (k: number, from: number, to: number) => {
    const n = (((to - from) % SPOKES) + SPOKES) % SPOKES;
    const a = point(from, k);
    let d = `M${f(a.x)} ${f(a.y)}`;
    for (let s = 1; s <= n; s += 1) {
      const i = (from + s) % SPOKES;
      const p = point(i, k);
      const c = ctrl[k][i];
      d += ` Q${f(c.x)} ${f(c.y)} ${f(p.x)} ${f(p.y)}`;
    }
    return d;
  };

  return { W, H, hub, dirs, radius, spokePaths, spokeSegs, ringPaths, ringWidths, dew, point, ringArc, nearest };
}
