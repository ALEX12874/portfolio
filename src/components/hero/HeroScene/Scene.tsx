import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Road from "./Road";
import Footpath from "./Footpath";
import Billboard from "./Billboard";
import Car from "./Car";
import Pedestrian, { pedestrians } from "./Pedestrian";
import Environment from "./Environment";
import Rig from "./Rig";

interface SceneProps {
  /** Pause the render loop while the hero is off-screen. */
  active: boolean;
  /** Pointer parallax (disabled on touch / reduced motion). */
  parallax: boolean;
  /** Called once if the device can't hold ~30 fps; the hero swaps to 2.5D. */
  onLowFps?: () => void;
}

const WARMUP_S = 0.6; // ignore shader-compile frames
const SAMPLE_S = 2; // then average frame time over ~2 s
const SLOW_MS = 34; // ≈ 29 fps

/** Adaptive quality guard: measures the average frame time after mount. */
function FrameGuard({ onLowFps }: { onLowFps?: () => void }) {
  const t = useRef({ elapsed: 0, sampled: 0, frames: 0, done: false });
  useFrame((_, delta) => {
    const s = t.current;
    if (s.done || !onLowFps) return;
    s.elapsed += delta;
    if (s.elapsed < WARMUP_S) return;
    s.sampled += delta;
    s.frames += 1;
    if (s.sampled >= SAMPLE_S) {
      s.done = true;
      const avgMs = (s.sampled / s.frames) * 1000;
      if (avgMs > SLOW_MS) onLowFps();
    }
  });
  return null;
}

/**
 * Traffic layout: three cars per lane at equal lane speed with thirds-phase
 * offsets, so cars inside a lane can never collide. Palette-derived colours
 * only (ivory / sand / ink / signature red).
 */
const CARS = [
  { color: "#F5F0E8", x: -1.7, dir: 1 as const, speed: 6.4, offset: 0, variant: "sedan" as const },
  { color: "#E63843", x: -1.7, dir: 1 as const, speed: 6.4, offset: 1 / 3, variant: "hatch" as const },
  { color: "#E7E1D6", x: -1.7, dir: 1 as const, speed: 6.4, offset: 2 / 3, variant: "sedan" as const },
  { color: "#151515", x: 1.7, dir: -1 as const, speed: 5.4, offset: 0, variant: "hatch" as const },
  { color: "#F5F0E8", x: 1.7, dir: -1 as const, speed: 5.4, offset: 1 / 3, variant: "sedan" as const },
  { color: "#E7E1D6", x: 1.7, dir: -1 as const, speed: 5.4, offset: 2 / 3, variant: "sedan" as const },
];

/**
 * The living hero scene, composed as a premium advertising key visual:
 *
 * - Camera: long lens (32°), eye height 2.2, standing across the road from
 *   the billboard at a ~25° three-quarter angle, slightly looking up — the
 *   16-unit face spans ≈ 82% of the canvas width, the road sweeps through the
 *   bottom foreground and the crowd gathers at the board's base.
 * - Canvas: fully transparent (alpha), so the ivory page *is* the sky;
 *   ACES tone mapping at 0.85 exposure keeps the pavement from blowing out.
 * - Fog: 52 → 115, so the near ink skyline keeps its colour and only the far
 *   row dissolves into the page.
 */
export default function Scene({ active, parallax, onLowFps }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [24.37, 2.2, 6.31], fov: 32, near: 0.1, far: 260 }}
      onCreated={({ camera, gl }) => {
        // transparent canvas: the page background is the sky
        gl.setClearColor(0x000000, 0);
        // filmic response so the footpath never reads as white glare
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.85;
        camera.lookAt(-7.3, 7.5, -2.61);
      }}
    >
      <FrameGuard onLowFps={onLowFps} />

      {/* haze: crisp foreground, far row dissolving into the ivory page */}
      <fog attach="fog" args={["#F5F0E8", 52, 115]} />

      {/* low ambient: shadows stay readable under 0.85 exposure */}
      <ambientLight intensity={0.3} color="#F5F0E8" />
      <hemisphereLight args={["#F5F0E8", "#8A7F72", 0.45]} />

      {/* key sun — warm, from the camera side, casts across the road */}
      <directionalLight
        castShadow
        position={[3.5, 11, 2]}
        intensity={2.2}
        color="#FFF6E8"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />

      {/* cool ivory fill from the left so shadow sides keep detail */}
      <directionalLight position={[-16, 6, -4]} intensity={0.55} color="#E9E2D2" />

      {/* rim from behind the board: separates crowd + skyline from the haze */}
      <directionalLight position={[-8, 7, -20]} intensity={0.6} color="#F5F0E8" />

      <Suspense fallback={null}>
        <Rig enabled={parallax}>
          <group rotation-y={0.36} position={[5, 0, -2]}>
            <Road />
            <Footpath />
            <Environment />
            {CARS.map((c, i) => (
              <Car key={i} {...c} />
            ))}
            {pedestrians.map((p) => (
              <Pedestrian key={p.id} cfg={p} />
            ))}
            <Billboard />
          </group>
        </Rig>
      </Suspense>
    </Canvas>
  );
}
