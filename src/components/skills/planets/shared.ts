import * as THREE from "three";

/** Locked palette, shared by every planet. */
export const RED = "#E63843";
export const INK = "#151515";
export const IVORY = "#F5F0E8";
export const LIME = "#D8FF63";

/** Props every planet body receives from the orbit wrapper. */
export interface PlanetBodyProps {
  /** Planet radius in scene units. */
  size: number;
  /** Hovered or selected — bodies may brighten their accents. */
  active: boolean;
  /** False under reduced motion: bodies render a static frame. */
  animate: boolean;
}

/** Deterministic PRNG so every planet looks the same on every load. */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Uniform random unit vector from a seeded PRNG. */
export function randomUnit(rnd: () => number): THREE.Vector3 {
  const u = rnd() * 2 - 1;
  const a = rnd() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a));
}

/**
 * Curve that hugs a sphere of radius `radius` between two unit directions
 * (great-circle slerp), so pathways never cut through the planet.
 */
export function surfaceArc(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  segments = 18
): THREE.CatmullRomCurve3 {
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion().setFromUnitVectors(a, b);
  const q = new THREE.Quaternion();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    q.slerpQuaternions(qa, qb, i / segments);
    pts.push(a.clone().applyQuaternion(q).multiplyScalar(radius));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/**
 * Branching network over a set of unit directions: each node links to its
 * nearest already-connected node (a spanning tree), plus `extra` short
 * cross-links so the graph reads as a mesh rather than a single tree.
 */
export function branchingEdges(nodes: THREE.Vector3[], extra = 0): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  const linked = [0];
  for (let i = 1; i < nodes.length; i += 1) {
    let best = linked[0];
    let bestD = Infinity;
    for (const j of linked) {
      const d = nodes[i].distanceTo(nodes[j]);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    edges.push([best, i]);
    linked.push(i);
  }
  // shortest non-tree pairs become cross-links
  const pairs: Array<[number, number, number]> = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) continue;
      pairs.push([i, j, nodes[i].distanceTo(nodes[j])]);
    }
  }
  pairs.sort((p, q) => p[2] - q[2]);
  for (let k = 0; k < extra && k < pairs.length; k += 1) {
    edges.push([pairs[k][0], pairs[k][1]]);
  }
  return edges;
}

/** Spread points over a sphere with a minimum angular spacing. */
export function spreadNodes(count: number, seed: number, minDist = 0.55): THREE.Vector3[] {
  const rnd = seeded(seed);
  const out: THREE.Vector3[] = [];
  let guard = 0;
  while (out.length < count && guard < 4000) {
    guard += 1;
    const p = randomUnit(rnd);
    if (out.every((q) => q.distanceTo(p) > minDist)) out.push(p);
  }
  return out;
}

/** Orient an object so its +Y axis points along `dir`. */
export function quatFromUp(dir: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
}
