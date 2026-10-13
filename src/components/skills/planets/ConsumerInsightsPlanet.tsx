import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { IVORY, LIME, randomUnit, seeded, type PlanetBodyProps } from "./shared";

/**
 * 07 Consumer Insights & Research Analysis — a translucent layered globe:
 * a glassy physical outer shell, an inner wireframe globe, intersecting thin
 * orbital rings and small glowing lime markers (the insights) suspended
 * inside.
 */
export default function ConsumerInsightsPlanet({ size, active, animate }: PlanetBodyProps) {
  const markers = useMemo(() => {
    const rnd = seeded(707);
    return Array.from({ length: 7 }, () => ({
      pos: randomUnit(rnd).multiplyScalar(size * (0.25 + rnd() * 0.45)),
      phase: rnd() * Math.PI * 2,
    }));
  }, [size]);

  const inner = useRef<THREE.Group | null>(null);
  const rings = useRef<THREE.Group | null>(null);
  const dots = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (animate) {
      if (inner.current) inner.current.rotation.y -= delta * 0.3;
      if (rings.current) {
        rings.current.rotation.y += delta * 0.18;
        rings.current.rotation.z = Math.sin(t * 0.25) * 0.15;
      }
    }
    markers.forEach((m, i) => {
      const d = dots.current[i];
      if (!d) return;
      const pulse = animate ? (Math.sin(t * 2.1 + m.phase) + 1) / 2 : 0.6;
      d.scale.setScalar((active ? 1.25 : 1) * (0.7 + pulse * 0.6));
    });
  });

  return (
    <group>
      {/* glassy outer shell */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[size, 56, 40]} />
        <meshPhysicalMaterial
          color={IVORY}
          transmission={0.6}
          thickness={size * 0.6}
          ior={1.2}
          roughness={0.12}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transparent
          opacity={0.92}
          attenuationColor={IVORY}
          attenuationDistance={size * 4}
        />
      </mesh>

      {/* inner wireframe globe */}
      <group ref={inner}>
        <mesh>
          <sphereGeometry args={[size * 0.74, 18, 12]} />
          <meshBasicMaterial color={IVORY} wireframe transparent opacity={0.45} depthWrite={false} />
        </mesh>
      </group>

      {/* insight markers inside the globe */}
      {markers.map((m, i) => (
        <mesh
          key={i}
          position={m.pos}
          ref={(node) => {
            if (node) dots.current[i] = node;
          }}
        >
          <sphereGeometry args={[size * 0.055, 10, 8]} />
          <meshBasicMaterial color={LIME} toneMapped={false} />
        </mesh>
      ))}

      {/* intersecting orbital rings */}
      <group ref={rings}>
        {[
          { rot: [Math.PI / 2, 0, 0], r: 1.22, c: IVORY, o: 0.6 },
          { rot: [Math.PI / 2 + 0.9, 0.4, 0], r: 1.3, c: LIME, o: 0.7 },
          { rot: [Math.PI / 2 - 0.8, -0.6, 0.3], r: 1.38, c: IVORY, o: 0.4 },
        ].map((ring, i) => (
          <mesh key={i} rotation={ring.rot as [number, number, number]}>
            <torusGeometry args={[size * ring.r, size * 0.008, 6, 120]} />
            <meshBasicMaterial
              color={ring.c}
              transparent
              opacity={ring.o}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
