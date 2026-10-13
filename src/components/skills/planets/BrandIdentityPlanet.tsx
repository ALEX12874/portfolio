import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { INK, IVORY, RED, quatFromUp, type PlanetBodyProps } from "./shared";

/** Warm kraft-paper tint of the palette ivory. */
const KRAFT = "#E6D7BC";

type PackKind = "box" | "can" | "sachet";

interface EmbeddedPack {
  kind: PackKind;
  dir: THREE.Vector3;
  color: string;
  glossy: boolean;
  scale: number;
}

const glossy = { roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 } as const;
const matte = { roughness: 0.95, metalness: 0, clearcoat: 0, clearcoatRoughness: 1 } as const;

/** Miniature packaging forms, origin at their base so they sit in the surface. */
function Pack({ kind, color, shiny, s }: { kind: PackKind; color: string; shiny: boolean; s: number }) {
  const finish = shiny ? glossy : matte;
  if (kind === "box") {
    return (
      <group>
        <mesh position={[0, s * 0.32, 0]}>
          <boxGeometry args={[s * 0.42, s * 0.64, s * 0.3]} />
          <meshPhysicalMaterial color={color} {...finish} />
        </mesh>
        {/* label band */}
        <mesh position={[0, s * 0.36, 0]}>
          <boxGeometry args={[s * 0.43, s * 0.14, s * 0.31]} />
          <meshPhysicalMaterial color={color === IVORY ? RED : IVORY} {...matte} />
        </mesh>
      </group>
    );
  }
  if (kind === "can") {
    return (
      <group>
        <mesh position={[0, s * 0.3, 0]}>
          <cylinderGeometry args={[s * 0.17, s * 0.17, s * 0.6, 20]} />
          <meshPhysicalMaterial color={color} {...finish} />
        </mesh>
        <mesh position={[0, s * 0.61, 0]}>
          <cylinderGeometry args={[s * 0.14, s * 0.17, s * 0.04, 20]} />
          <meshStandardMaterial color={IVORY} roughness={0.25} metalness={0.9} />
        </mesh>
      </group>
    );
  }
  // sachet pillow: a squashed sphere with crimped ends
  return (
    <group position={[0, s * 0.12, 0]}>
      <mesh scale={[s * 0.34, s * 0.12, s * 0.24]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshPhysicalMaterial color={color} {...finish} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * s * 0.33, 0, 0]}>
          <boxGeometry args={[s * 0.05, s * 0.05, s * 0.4]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 06 Brand Identity & Packaging — a matte kraft-ivory world with miniature
 * packaging (boxes, cans, a sachet pillow) embedded in its surface and a
 * small fleet of packs orbiting it; glossy red / ink against matte paper.
 */
export default function BrandIdentityPlanet({ size, active, animate }: PlanetBodyProps) {
  const embedded = useMemo<EmbeddedPack[]>(
    () => [
      { kind: "box", dir: new THREE.Vector3(0.5, 0.75, 0.42), color: RED, glossy: true, scale: 1 },
      { kind: "can", dir: new THREE.Vector3(-0.7, 0.35, 0.6), color: INK, glossy: true, scale: 0.95 },
      { kind: "sachet", dir: new THREE.Vector3(0.2, -0.2, 1), color: RED, glossy: true, scale: 1.1 },
      { kind: "box", dir: new THREE.Vector3(-0.35, -0.8, -0.3), color: INK, glossy: false, scale: 0.9 },
      { kind: "can", dir: new THREE.Vector3(0.85, -0.45, -0.2), color: IVORY, glossy: true, scale: 0.85 },
      { kind: "sachet", dir: new THREE.Vector3(-0.6, 0.6, -0.55), color: IVORY, glossy: true, scale: 0.9 },
      { kind: "box", dir: new THREE.Vector3(0.1, 0.25, -1), color: RED, glossy: false, scale: 0.8 },
    ].map((p) => ({ ...p, kind: p.kind as PackKind, dir: p.dir.normalize() })),
    []
  );

  const fleet = useRef<THREE.Group | null>(null);

  useFrame((_, delta) => {
    if (fleet.current && animate) fleet.current.rotation.y += delta * (active ? 0.6 : 0.38);
  });

  const s = size;

  return (
    <group>
      {/* matte kraft body */}
      <mesh>
        <sphereGeometry args={[size, 56, 36]} />
        <meshPhysicalMaterial color={KRAFT} roughness={0.96} metalness={0} sheen={0.4} sheenColor={IVORY} />
      </mesh>

      {/* packaging embedded in the surface (sunk a little below the skin) */}
      {embedded.map((p, i) => (
        <group key={i} position={p.dir.clone().multiplyScalar(size * 0.9)} quaternion={quatFromUp(p.dir)}>
          <Pack kind={p.kind} color={p.color} shiny={p.glossy} s={s * p.scale} />
        </group>
      ))}

      {/* orbiting fleet of packs */}
      <group rotation={[0.42, 0, 0.18]}>
        <group ref={fleet}>
          {(
            [
              { kind: "box", a: 0, color: RED },
              { kind: "can", a: (Math.PI * 2) / 3, color: INK },
              { kind: "sachet", a: (Math.PI * 4) / 3, color: IVORY },
            ] as Array<{ kind: PackKind; a: number; color: string }>
          ).map((f) => (
            <group
              key={f.kind}
              position={[Math.cos(f.a) * size * 1.7, 0, Math.sin(f.a) * size * 1.7]}
              rotation={[0.3, f.a, 0.2]}
            >
              <Pack kind={f.kind} color={f.color} shiny s={s * 0.6} />
            </group>
          ))}
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[size * 1.7, size * 0.006, 4, 120]} />
            <meshBasicMaterial color={IVORY} transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
