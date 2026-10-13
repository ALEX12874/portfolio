import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const Z_NEAR = 16;
const Z_FAR = -46;
const TRACK = Z_NEAR - Z_FAR;

/** Billboard z in road space — cars ease toward the kerb as they pass it. */
const BILLBOARD_Z = -5;
const REACT_WINDOW = 7;

export interface CarProps {
  /** Body colour — palette-derived only. */
  color: string;
  /** Lane centre (road is 7 wide, lanes at ±1.7). */
  x: number;
  /** +1 travels toward the camera, -1 away. */
  dir: 1 | -1;
  speed: number;
  /** Loop phase offset, 0..1. */
  offset: number;
  /** Silhouette variant. */
  variant?: "sedan" | "hatch";
}

/**
 * A city car built from primitives: stepped sedan/hatch body, raked glass,
 * emissive head- and tail-lights, four spinning wheels with rims.
 *
 * Story detail: cars in the lane next to the footpath *rubber-neck* as they
 * pass the billboard — they ease toward the kerb, yaw a few degrees toward the
 * board and their brake bar flares. Lateral motion is a pure function of z, so
 * same-lane cars (equal speed, thirds-phase) can never collide.
 */
export default function Car({
  color,
  x,
  dir,
  speed,
  offset,
  variant = "sedan",
}: CarProps) {
  const group = useRef<THREE.Group | null>(null);
  const wheels = useRef<THREE.Group[]>([]);
  const brake = useRef<THREE.MeshStandardMaterial | null>(null);

  const cabinOffset = variant === "hatch" ? -0.05 : -0.28;
  const cabinLen = variant === "hatch" ? 1.75 : 1.6;
  const bodyLen = variant === "hatch" ? 3.25 : 3.7;

  /** Reacts to the billboard only in the kerb-side lane (x < 0). */
  const canReact = x < 0;

  const brakeBase = useMemo(() => new THREE.Color("#7A1017"), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const travelled = ((t * speed + offset * TRACK) % TRACK) * 1;
    const z = dir === 1 ? Z_NEAR - travelled : Z_FAR + travelled;

    if (group.current) {
      group.current.position.z = z;
      group.current.rotation.y = dir === 1 ? 0 : Math.PI;

      // seamless loop: grow in from the fogged far end, shrink out behind us
      const fromFar = THREE.MathUtils.clamp((z - Z_FAR) / 10, 0, 1);
      const nearFade = THREE.MathUtils.clamp((Z_NEAR + 2 - z) / 6, 0, 1);
      const s = Math.min(fromFar, nearFade);
      group.current.scale.setScalar(s);
      group.current.visible = s > 0.01;

      // rubber-necking: eased purely by z (deterministic, collision-safe)
      if (canReact) {
        const d = (z - BILLBOARD_Z) / REACT_WINDOW;
        const g = Math.max(0, 1 - d * d); // 0 far, 1 abeam the board
        const side = dir === 1 ? -1 : 1; // drift toward kerb (-x world side)
        group.current.position.x = x + side * -0.3 * g;
        group.current.rotation.y +=
          (dir === 1 ? 1 : -1) * 0.07 * g * (side === -1 ? 1 : -1);
      }
    }

    // brake bar flares while passing the board
    if (brake.current) {
      const d = (z - BILLBOARD_Z) / REACT_WINDOW;
      const g = canReact ? Math.max(0, 1 - d * d) : 0;
      brake.current.emissiveIntensity = 0.25 + g * 2.6;
      brake.current.color.copy(brakeBase).lerp(new THREE.Color("#FF3040"), g);
    }

    const spin = t * speed * 1.6;
    wheels.current.forEach((w) => {
      if (w) w.rotation.x = dir === 1 ? spin : -spin;
    });
  });

  const wheelPositions: [number, number, number][] = [
    [-0.8, 0.31, 1.12],
    [0.8, 0.31, 1.12],
    [-0.8, 0.31, -1.12],
    [0.8, 0.31, -1.12],
  ];

  return (
    <group ref={group} position={[x, 0, Z_FAR]}>
      {/* lower body */}
      <RoundedBox
        args={[1.62, 0.5, bodyLen]}
        radius={0.16}
        smoothness={4}
        position={[0, 0.55, 0]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.3} />
      </RoundedBox>

      {/* hood step (front = +z in local space; group flips for dir) */}
      <RoundedBox
        args={[1.5, 0.24, bodyLen * 0.34]}
        radius={0.09}
        smoothness={3}
        position={[0, 0.82, bodyLen * 0.31]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.34} metalness={0.32} />
      </RoundedBox>

      {/* trunk step */}
      <RoundedBox
        args={[1.5, 0.22, bodyLen * 0.26]}
        radius={0.08}
        smoothness={3}
        position={[0, 0.81, -bodyLen * 0.35]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.34} metalness={0.32} />
      </RoundedBox>

      {/* cabin */}
      <RoundedBox
        args={[1.38, 0.46, cabinLen]}
        radius={0.14}
        smoothness={4}
        position={[0, 1.0, cabinOffset]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.35} />
      </RoundedBox>

      {/* glass house — slightly narrower so a body-colour pillar frames it */}
      <RoundedBox
        args={[1.28, 0.34, cabinLen - 0.12]}
        radius={0.1}
        smoothness={3}
        position={[0, 1.05, cabinOffset]}
      >
        <meshStandardMaterial
          color="#22262B"
          roughness={0.12}
          metalness={0.6}
        />
      </RoundedBox>

      {/* headlights */}
      {[-0.52, 0.52].map((hx) => (
        <mesh key={hx} position={[hx, 0.62, bodyLen / 2 + 0.005]}>
          <boxGeometry args={[0.34, 0.12, 0.03]} />
          <meshStandardMaterial
            color="#FFFDF2"
            emissive="#FFF6DC"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* tail-light bar (dark when idle, flares near the billboard) */}
      <mesh position={[0, 0.66, -bodyLen / 2 - 0.005]}>
        <boxGeometry args={[1.3, 0.1, 0.03]} />
        <meshStandardMaterial
          ref={brake}
          color="#7A1017"
          emissive="#FF2436"
          emissiveIntensity={0.25}
          toneMapped={false}
        />
      </mesh>

      {/* wheels */}
      {wheelPositions.map((pos, i) => (
        <group
          key={i}
          position={pos}
          ref={(node) => {
            if (node) wheels.current[i] = node;
          }}
        >
          <mesh rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.24, 18]} />
            <meshStandardMaterial color="#151515" roughness={0.85} />
          </mesh>
          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.15, 0.15, 0.26, 14]} />
            <meshStandardMaterial color="#CFC7B9" roughness={0.45} metalness={0.55} />
          </mesh>
        </group>
      ))}

      {/* soft contact shadow (complements the shadow map at grazing angles) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[1.9, bodyLen + 0.4]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}
