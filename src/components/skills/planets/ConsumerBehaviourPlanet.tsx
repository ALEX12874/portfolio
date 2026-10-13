import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { IVORY, LIME, RED, branchingEdges, spreadNodes, surfaceArc, type PlanetBodyProps } from "./shared";

const PULSES = 6;
const PATH_IDLE = new THREE.Color(RED);
const PATH_HOT = new THREE.Color("#FF5560");

/**
 * 02 Consumer Behaviour — a matte ivory world wrapped in glowing red
 * decision pathways that branch at nodes; small lime pulses (choices being
 * made) travel along the paths.
 */
export default function ConsumerBehaviourPlanet({ size, active, animate }: PlanetBodyProps) {
  const { curves, tubes, nodes } = useMemo(() => {
    const dirs = spreadNodes(15, 2024, 0.5);
    const edges = branchingEdges(dirs, 3);
    const r = size * 1.008;
    const cs = edges.map(([a, b]) => surfaceArc(dirs[a], dirs[b], r, 20));
    return {
      curves: cs,
      tubes: cs.map((c) => new THREE.TubeGeometry(c, 24, size * 0.016, 5, false)),
      nodes: dirs.map((d) => d.clone().multiplyScalar(r)),
    };
  }, [size]);

  const pathMat = useMemo(() => new THREE.MeshBasicMaterial({ color: RED, toneMapped: false }), []);

  useEffect(
    () => () => {
      tubes.forEach((g) => g.dispose());
    },
    [tubes]
  );
  useEffect(() => () => pathMat.dispose(), [pathMat]);

  const pulses = useRef<THREE.Mesh[]>([]);
  const pulseState = useRef(
    Array.from({ length: PULSES }, (_, i) => ({ edge: (i * 5) % 18, t: i / PULSES, speed: 0.35 + (i % 3) * 0.12 }))
  );

  useFrame((_, delta) => {
    pathMat.color.lerp(active ? PATH_HOT : PATH_IDLE, 0.1);
    pulseState.current.forEach((p, i) => {
      const mesh = pulses.current[i];
      if (!mesh) return;
      if (animate) {
        p.t += delta * p.speed;
        if (p.t >= 1) {
          p.t = 0;
          p.edge = (p.edge + 7) % curves.length;
        }
      }
      const curve = curves[p.edge % curves.length];
      curve.getPointAt(Math.min(p.t, 1), mesh.position);
      const fade = Math.sin(Math.PI * Math.min(p.t, 1));
      mesh.scale.setScalar(0.4 + fade * 0.8);
    });
  });

  return (
    <group>
      {/* matte ivory body */}
      <mesh>
        <sphereGeometry args={[size, 48, 32]} />
        <meshStandardMaterial color={IVORY} roughness={0.92} metalness={0} />
      </mesh>

      {/* decision pathways */}
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g} material={pathMat} />
      ))}

      {/* branching nodes */}
      {nodes.map((p, i) => (
        <mesh key={`n-${i}`} position={p} material={pathMat}>
          <sphereGeometry args={[size * 0.045, 10, 8]} />
        </mesh>
      ))}

      {/* lime choice pulses */}
      {Array.from({ length: PULSES }, (_, i) => (
        <mesh
          key={`p-${i}`}
          ref={(node) => {
            if (node) pulses.current[i] = node;
          }}
        >
          <sphereGeometry args={[size * 0.04, 8, 6]} />
          <meshBasicMaterial color={LIME} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
