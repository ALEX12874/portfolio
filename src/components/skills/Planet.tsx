import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Skill } from "../../data/skills";
import { PLANET_BODIES, PLANET_LAYOUT } from "./planets";

interface PlanetProps {
  skill: Skill;
  index: number;
  selected: boolean;
  hovered: boolean;
  animate: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const cameraDir = new THREE.Vector3();
const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Orbit wrapper for one skill planet. Owns the inclined orbit, axial tilt,
 * self-rotation, hover/selection behaviour and the label; the look itself
 * comes from the planet's own body component (see ./planets).
 *
 * Selected: scales to ~1.15 and eases toward the camera, with a thin lime
 * link back to the Sun. Labels show only on hover / select.
 */
export default function Planet({
  skill,
  index,
  selected,
  hovered,
  animate,
  onHover,
  onSelect,
}: PlanetProps) {
  const layout = PLANET_LAYOUT[skill.id];
  const Body = PLANET_BODIES[skill.id];

  const root = useRef<THREE.Group | null>(null);
  const spin = useRef<THREE.Group | null>(null);
  const link = useRef<THREE.Mesh>(null);
  const born = useRef<number>(-1);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const { camera } = useThree();

  const revealDelay = 0.35 + index * 0.09;

  useFrame(({ clock }, delta) => {
    if (!layout) return;
    const t = clock.getElapsedTime();
    if (born.current < 0) born.current = t;

    const a = skill.phase + (animate ? t * layout.orbitSpeed : 0);
    const r = layout.orbitRadius;
    const incl = layout.inclination;

    // inclined orbit position (matches OrbitPath's rotation-x)
    const x = Math.cos(a) * r;
    const y = -Math.sin(a) * Math.sin(incl) * r;
    const z = Math.sin(a) * Math.cos(incl) * r;

    // selection: ease toward the camera; hover: a small nudge
    tmp.set(x, y, z);
    if (selected || hovered) {
      cameraDir
        .copy(camera.position)
        .sub(tmp)
        .normalize()
        .multiplyScalar(selected ? 2.4 : 0.5);
      tmp.add(cameraDir);
    }

    if (root.current) {
      root.current.position.lerp(tmp, selected || hovered ? 0.1 : 0.28);

      // entrance reveal + hover/selection scale
      const reveal = Math.min(1, Math.max(0, (t - born.current - revealDelay) / 0.6));
      const eased = 1 - Math.pow(1 - reveal, 3);
      const targetScale = (selected ? 1.15 : hovered ? 1.08 : 1) * eased;
      const s = THREE.MathUtils.lerp(root.current.scale.x, targetScale, 0.14);
      root.current.scale.setScalar(Math.max(s, 0.0001));
    }

    if (spin.current && animate) spin.current.rotation.y += delta * layout.spin;

    // thin connection line to the core while selected (in world space)
    if (link.current && root.current) {
      link.current.visible = selected;
      if (selected) {
        const pos = root.current.position;
        const len = pos.length();
        const sc = root.current.scale.x || 1;
        // the link lives inside the scaled root, so undo position + scale
        link.current.position.copy(pos).multiplyScalar(-0.5 / sc);
        link.current.quaternion.setFromUnitVectors(UP, tmp.copy(pos).normalize());
        link.current.scale.set(1 / sc, len / sc, 1 / sc);
      }
    }
  });

  if (!layout || !Body) return null;

  const size = layout.size;

  return (
    <group ref={root} scale={0.0001}>
      {/* axial tilt, then self-rotation */}
      <group rotation-z={layout.tilt}>
        <group ref={spin}>
          <Body size={size} active={hovered || selected} animate={animate} />
        </group>
      </group>

      {/* invisible hit sphere: stable picking regardless of the body's detail */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(skill.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
        onPointerDown={(e) => {
          downAt.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
        }}
        onPointerUp={(e) => {
          const start = downAt.current;
          downAt.current = null;
          if (!start) return;
          const dx = e.nativeEvent.clientX - start.x;
          const dy = e.nativeEvent.clientY - start.y;
          // ignore taps that were actually drags
          if (Math.hypot(dx, dy) > 9) return;
          e.stopPropagation();
          onSelect(skill.id);
        }}
      >
        <sphereGeometry args={[size * 1.35, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {/* connection line to the sun */}
      <mesh ref={link} visible={false}>
        <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
        <meshBasicMaterial color="#D8FF63" transparent opacity={0.45} depthWrite={false} toneMapped={false} />
      </mesh>

      {hovered || selected ? (
        <Html position={[0, size * 1.75 + 0.35, 0]} center zIndexRange={[18, 0]} style={{ pointerEvents: "none" }}>
          <div
            className="whitespace-nowrap rounded-full border border-[rgba(245,240,232,0.25)] bg-[rgba(21,21,21,0.92)] px-3 py-1.5 font-display text-[0.64rem] font-bold uppercase tracking-[0.18em]"
            style={{ color: "#F5F0E8" }}
          >
            <span className="mr-2 text-[#D8FF63]">{skill.number}</span>
            {skill.title}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
