import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { IVORY, LIME, RED, type PlanetBodyProps } from "./shared";

const BANDS = 9;
const RIDGES = 22;
const WAVES = 4;
const WAVE_PERIOD = 3.2; // seconds for one ring to travel out

/**
 * 08 Communication & Persuasion — a banded ivory/red sphere with rhythmic
 * ridges (a voice print), emitting concentric ripple rings that expand and
 * fade like sound waves, looping and staggered.
 */
export default function CommunicationPlanet({ size, active, animate }: PlanetBodyProps) {
  const body = useMemo(() => {
    // lathe profile: radius modulated by fine ridges
    const pts: THREE.Vector2[] = [];
    const steps = 160;
    for (let i = 0; i <= steps; i += 1) {
      const th = (i / steps) * Math.PI;
      const ridge = 1 + 0.028 * Math.pow(Math.abs(Math.sin(th * RIDGES)), 0.6) * Math.sin(th);
      pts.push(new THREE.Vector2(Math.sin(th) * size * ridge, -Math.cos(th) * size * ridge));
    }
    const g = new THREE.LatheGeometry(pts, 72);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const ivory = new THREE.Color(IVORY);
    const red = new THREE.Color(RED);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      const th = Math.acos(THREE.MathUtils.clamp(-v.y / v.length(), -1, 1));
      const band = Math.floor((th / Math.PI) * BANDS);
      (band % 2 === 0 ? ivory : red).toArray(colors, i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [size]);

  useEffect(() => () => body.dispose(), [body]);

  const waves = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    waves.current.forEach((w, i) => {
      if (!w) return;
      const phase = animate ? (t / WAVE_PERIOD + i / WAVES) % 1 : 0.2 + i * 0.2;
      w.scale.setScalar(size * (1.08 + phase * 1.5));
      const mat = w.material as THREE.MeshBasicMaterial;
      mat.opacity = (active ? 0.85 : 0.6) * (1 - phase) * Math.min(1, phase * 5);
    });
  });

  return (
    <group>
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors roughness={0.5} metalness={0.12} />
      </mesh>

      {/* sound-wave ripples in the equatorial plane */}
      {Array.from({ length: WAVES }, (_, i) => (
        <mesh
          key={i}
          rotation-x={Math.PI / 2}
          ref={(node) => {
            if (node) waves.current[i] = node;
          }}
        >
          <torusGeometry args={[1, 0.014, 6, 120]} />
          <meshBasicMaterial
            color={i === 1 ? LIME : i % 2 === 0 ? RED : IVORY}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
