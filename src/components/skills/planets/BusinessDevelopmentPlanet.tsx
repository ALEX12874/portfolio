import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { INK, IVORY, LIME, RED, branchingEdges, spreadNodes, surfaceArc, type PlanetBodyProps } from "./shared";

const PULSES = 5;

/**
 * 09 Business Development & Opportunity Identification — a faceted ink planet
 * carrying a network graph: lime opportunity nodes joined by thin ivory
 * links, pulses travelling between them, plus one tiny scouting satellite.
 */
export default function BusinessDevelopmentPlanet({ size, active, animate }: PlanetBodyProps) {
  const { nodes, curves, links } = useMemo(() => {
    const dirs = spreadNodes(13, 909, 0.62);
    const edges = branchingEdges(dirs, 7);
    const r = size * 1.045;
    const cs = edges.map(([a, b]) => surfaceArc(dirs[a], dirs[b], r, 16));
    return {
      nodes: dirs.map((d) => d.clone().multiplyScalar(r)),
      curves: cs,
      links: cs.map((c) => new THREE.TubeGeometry(c, 18, size * 0.01, 4, false)),
    };
  }, [size]);

  const linkMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: IVORY, transparent: true, opacity: 0.75, toneMapped: false }),
    []
  );
  const nodeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false }), []);

  useEffect(
    () => () => {
      links.forEach((g) => g.dispose());
    },
    [links]
  );
  useEffect(
    () => () => {
      linkMat.dispose();
      nodeMat.dispose();
    },
    [linkMat, nodeMat]
  );

  const pulses = useRef<THREE.Mesh[]>([]);
  const state = useRef(Array.from({ length: PULSES }, (_, i) => ({ edge: i * 3, t: i / PULSES })));
  const sat = useRef<THREE.Group | null>(null);

  useFrame((_, delta) => {
    linkMat.opacity = THREE.MathUtils.lerp(linkMat.opacity, active ? 1 : 0.75, 0.1);
    state.current.forEach((p, i) => {
      const m = pulses.current[i];
      if (!m) return;
      if (animate) {
        p.t += delta * 0.55;
        if (p.t >= 1) {
          p.t = 0;
          p.edge = (p.edge + 5) % curves.length;
        }
      }
      curves[p.edge % curves.length].getPointAt(Math.min(p.t, 1), m.position);
    });
    if (sat.current && animate) sat.current.rotation.y += delta * 0.7;
  });

  return (
    <group>
      {/* faceted ink body */}
      <mesh>
        <icosahedronGeometry args={[size, 1]} />
        <meshStandardMaterial color={INK} flatShading roughness={0.45} metalness={0.45} />
      </mesh>

      {/* ivory links */}
      {links.map((g, i) => (
        <mesh key={i} geometry={g} material={linkMat} />
      ))}

      {/* lime opportunity nodes */}
      {nodes.map((p, i) => (
        <mesh key={`n-${i}`} position={p} material={nodeMat}>
          <sphereGeometry args={[size * (i % 4 === 0 ? 0.07 : 0.045), 10, 8]} />
        </mesh>
      ))}

      {/* travelling pulses */}
      {Array.from({ length: PULSES }, (_, i) => (
        <mesh
          key={`p-${i}`}
          ref={(node) => {
            if (node) pulses.current[i] = node;
          }}
        >
          <sphereGeometry args={[size * 0.035, 8, 6]} />
          <meshBasicMaterial color={IVORY} toneMapped={false} />
        </mesh>
      ))}

      {/* scouting satellite */}
      <group rotation={[0.6, 0, -0.35]}>
        <group ref={sat}>
          <group position={[size * 1.75, 0, 0]}>
            <mesh>
              <boxGeometry args={[size * 0.12, size * 0.12, size * 0.16]} />
              <meshStandardMaterial color={IVORY} roughness={0.3} metalness={0.7} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[0, 0, side * size * 0.2]}>
                <boxGeometry args={[size * 0.2, size * 0.01, size * 0.22]} />
                <meshStandardMaterial color={INK} roughness={0.3} metalness={0.8} />
              </mesh>
            ))}
            <mesh position={[0, size * 0.09, 0]}>
              <sphereGeometry args={[size * 0.025, 8, 6]} />
              <meshBasicMaterial color={RED} toneMapped={false} />
            </mesh>
          </group>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[size * 1.75, size * 0.005, 4, 120]} />
            <meshBasicMaterial color={IVORY} transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
