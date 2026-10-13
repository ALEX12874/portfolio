import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RigProps {
  /** Pointer parallax is disabled on touch / reduced-motion devices. */
  enabled: boolean;
  children: React.ReactNode;
}

const MAX_OFFSET = 0.35;

/**
 * Pointer parallax rig: offsets the whole scene group by ≤ 0.35 units,
 * damped with lerp, returning smoothly when the pointer leaves.
 */
export default function Rig({ enabled, children }: RigProps) {
  const group = useRef<THREE.Group | null>(null);
  const target = useRef(new THREE.Vector2(0, 0));

  useFrame(() => {
    const node = group.current;
    if (!node) return;

    if (!enabled) {
      target.current.set(0, 0);
    }

    node.position.x = THREE.MathUtils.lerp(node.position.x, target.current.x, 0.055);
    node.position.y = THREE.MathUtils.lerp(node.position.y, target.current.y, 0.055);
    // subtle depth shift so layers read at different depths
    node.rotation.y = THREE.MathUtils.lerp(
      node.rotation.y,
      target.current.x * 0.035,
      0.055
    );
  });

  return (
    <group
      ref={group}
      onPointerMove={(e) => {
        if (!enabled) return;
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -((e.clientY / window.innerHeight) * 2 - 1);
        target.current.set(
          THREE.MathUtils.clamp(nx * MAX_OFFSET, -MAX_OFFSET, MAX_OFFSET),
          THREE.MathUtils.clamp(ny * MAX_OFFSET * 0.6, -MAX_OFFSET, MAX_OFFSET)
        );
      }}
      onPointerLeave={() => target.current.set(0, 0)}
    >
      {children}
    </group>
  );
}
