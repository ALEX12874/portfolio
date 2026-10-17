import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import Sun from "./Sun";
import Planet from "./Planet";
import OrbitPath from "./OrbitPath";
import CameraControls from "./CameraControls";
import SolarFallback from "./SolarFallback";
import SceneErrorBoundary from "../layout/SceneErrorBoundary";
import { PLANET_LAYOUT } from "./planets";
import { skills } from "../../data/skills";
import { useWebGLSupport } from "../../hooks/useWebGLSupport";
import { useMotionLevel } from "../../hooks/useMotionLevel";

interface SolarSystemProps {
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  active: boolean;
}

const DUST = 650;

/** Pixel-ratio cap: 1.25 on tablets, 1.5 elsewhere. */
const DPR_CAP =
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches ? 1.25 : 1.5;

/** Faint ivory star dust around (never inside) the system. */
function StarDust() {
  const geometry = useMemo(() => {
    const pos = new Float32Array(DUST * 3);
    let s = 7331;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    let i = 0;
    while (i < DUST) {
      const x = (rnd() * 2 - 1) * 46;
      const y = (rnd() * 2 - 1) * 22;
      const z = (rnd() * 2 - 1) * 46;
      if (Math.hypot(x, z) < 12.5 && Math.abs(y) < 4) continue;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      i += 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.07}
        color="#F5F0E8"
        transparent
        opacity={0.32}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * Procedural studio environment (no downloaded HDR): a few soft
 * Lightformers give the metal and glass planets something to reflect.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={0.32}>
      <Lightformer form="rect" intensity={2.2} color="#F5F0E8" position={[0, 6, 8]} scale={[12, 3, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#E63843" position={[-10, 0, -4]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer form="ring" intensity={1.2} color="#F5F0E8" position={[8, 3, -6]} scale={3} />
      <Lightformer form="rect" intensity={0.6} color="#D8FF63" position={[0, -8, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
    </Environment>
  );
}

/**
 * The orbit of ideas: a Sun (Brand Strategy) with exactly eight planets (the
 * other eight skills). One shared selection state with the rail and panel.
 *
 * Light: a strong red-tinted point light lives at the Sun (decay 1.2), so
 * every planet has a lit side and a dark terminator; a very low ivory ambient
 * plus the procedural environment keep the night sides readable.
 */
export default function SolarSystem({
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  active,
}: SolarSystemProps) {
  const webgl = useWebGLSupport();
  // calm motion: same living system, orbits at half speed
  const calm = useMotionLevel() === "calm";

  const fallback = (
    <SolarFallback selectedId={selectedId} hoveredId={hoveredId} onSelect={onSelect} onHover={onHover} />
  );

  if (!webgl) return fallback;

  return (
    <div
      className="relative h-full w-full"
      style={{ touchAction: "pan-y" }}
      role="group"
      aria-label="Interactive orbit diagram of marketing skills"
    >
      <SceneErrorBoundary fallback={fallback}>
        <Canvas
          dpr={[1, DPR_CAP]}
          frameloop={active ? "always" : "never"}
          camera={{ position: [0, 9, 26], fov: 34, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: true }}
          onPointerMissed={() => onSelect(null)}
        >
          <ambientLight intensity={0.07} color="#F5F0E8" />
          {/* the Sun's light — red-tinted, slow falloff */}
          <pointLight position={[0, 0, 0]} intensity={60} distance={0} decay={1.2} color="#FFB0A4" />

          <Suspense fallback={null}>
            <StudioEnvironment />
            <StarDust />

            <Sun selected={selectedId === "brand-strategy"} onSelect={onSelect} animate />

            {skills.map((s) => {
              const l = PLANET_LAYOUT[s.id];
              if (!l) return null;
              return (
                <OrbitPath
                  key={`orbit-${s.id}`}
                  radius={l.orbitRadius}
                  inclination={l.inclination}
                  active={hoveredId === s.id || selectedId === s.id}
                />
              );
            })}

            {skills.map((s, i) => (
              <Planet
                key={s.id}
                skill={s}
                index={i}
                selected={selectedId === s.id}
                hovered={hoveredId === s.id}
                animate
                pace={calm ? 0.5 : 1}
                onHover={onHover}
                onSelect={onSelect}
              />
            ))}
          </Suspense>

          <CameraControls enabled />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
