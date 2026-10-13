import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Layered skyline built as two rows that face the new camera:
 * - near row: dark-ink mid-rises with lit window grids, crisp inside the fog
 *   range — these read as buildings, not haze.
 * - far row: paler silhouettes ~70% dissolved into the page — the "ivory
 *   skyline that fades by distance" (the old pale-grey slabs are gone).
 * Both rows run well past the left and right frame edges (verified by
 * projection), so the skyline never visibly stops.
 */
const NEAR_ROW = [
  { x: -66.6, z: 0.8, w: 8, h: 16, tone: 0.3 },
  { x: -56.5, z: -5.7, w: 7, h: 13, tone: 0.33 },
  { x: -46.5, z: -12.2, w: 6.5, h: 15, tone: 0.28 },
  { x: -36.5, z: -18.8, w: 7, h: 12, tone: 0.35 },
  { x: -26.4, z: -25.3, w: 6, h: 14, tone: 0.3 },
  { x: -16.3, z: -31.8, w: 7, h: 17, tone: 0.32 },
  { x: -6.2, z: -38.3, w: 6.5, h: 13, tone: 0.27 },
];

const FAR_ROW = [
  { x: -84, z: -27, w: 10, h: 24, tone: 0.5 },
  { x: -72, z: -34, w: 9, h: 17, tone: 0.55 },
  { x: -60, z: -41, w: 10, h: 21, tone: 0.48 },
  { x: -48, z: -48, w: 9, h: 16, tone: 0.52 },
  { x: -36, z: -55, w: 10, h: 26, tone: 0.5 },
  { x: -24, z: -62, w: 9, h: 18, tone: 0.53 },
];

const DUST_COUNT = 14;

/** Procedural window-grid texture — warm ivory / rare lime lights, no assets. */
function makeFacadeTexture(seed: number): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, w, h);
    const cols = 5;
    const rows = 11;
    const cw = w / cols;
    const ch = h / rows;
    let s = seed;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        const v = rnd();
        if (v < 0.42) continue; // dark window
        ctx.fillStyle = v > 0.965 ? "#D8FF63" : v > 0.72 ? "#F5F0E8" : "#B8B0A2";
        ctx.globalAlpha = 0.5 + v * 0.45;
        ctx.fillRect(c * cw + cw * 0.22, r * ch + ch * 0.24, cw * 0.56, ch * 0.5);
      }
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Background + atmosphere layer: ground plane, two skyline rows, warm sun
 * glow, street lamps, dust motes. Fog in Scene.tsx only reaches into the far
 * row, so the near row keeps contrast where it matters.
 */
export default function Environment() {
  const sun = useRef<THREE.DirectionalLight | null>(null);
  const dust = useRef<THREE.Points | null>(null);

  const facades = useMemo(
    () => NEAR_ROW.map((_, i) => makeFacadeTexture(1013 * (i + 1))),
    []
  );

  const dustGeometry = useMemo(() => {
    const positions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i += 1) {
      positions[i * 3] = -20 + Math.random() * 30;
      positions[i * 3 + 1] = 1 + Math.random() * 8;
      positions[i * 3 + 2] = -24 + Math.random() * 38;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sun.current) {
      // gentle sun drift — barely perceptible, keeps highlights alive
      sun.current.position.x = 3.5 + Math.sin(t * 0.06) * 1.6;
      sun.current.position.z = 2 + Math.cos(t * 0.05) * 1.2;
    }
    if (dust.current) {
      dust.current.rotation.y = t * 0.012;
      dust.current.position.y = Math.sin(t * 0.25) * 0.25;
    }
  });

  return (
    <group>
      {/* ground plane — runs past every frame edge; fades to the page ivory */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, -10]} receiveShadow>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial color="#C9C1B2" roughness={1} />
      </mesh>

      {/* near row — textured ink mid-rises that keep their colour */}
      {NEAR_ROW.map((b, i) => (
        <group key={`near-${i}`} position={[b.x, b.h / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.w * 0.75]} />
            <meshStandardMaterial
              color={new THREE.Color().setHSL(0.09, 0.04, b.tone * 0.32)}
              roughness={0.92}
            />
          </mesh>
          {/* lit facade toward the camera / road */}
          <mesh position={[0, 0, (b.w * 0.75) / 2 + 0.02]}>
            <planeGeometry args={[b.w * 0.92, b.h * 0.9]} />
            <meshBasicMaterial map={facades[i]} transparent opacity={0.9} toneMapped={false} />
          </mesh>
          {/* roof lip so the silhouette isn't a bare box */}
          <mesh position={[0, b.h / 2 + 0.12, 0]} castShadow>
            <boxGeometry args={[b.w + 0.3, 0.24, b.w * 0.75 + 0.3]} />
            <meshStandardMaterial
              color={new THREE.Color().setHSL(0.09, 0.03, 0.16)}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* far row — ivory silhouettes dissolving into the page */}
      {FAR_ROW.map((b, i) => (
        <mesh key={`far-${i}`} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w * 0.8]} />
          <meshStandardMaterial
            color={new THREE.Color().setHSL(0.09, 0.03, b.tone * 0.36)}
            roughness={1}
          />
        </mesh>
      ))}

      {/* sun glow disc — soft, palette-warm, peeking above the board */}
      <mesh position={[-50, 26, -27]}>
        <circleGeometry args={[7, 40]} />
        <meshBasicMaterial
          color="#FFE9C4"
          transparent
          opacity={0.4}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-50.6, 26.4, -27.4]}>
        <circleGeometry args={[12, 40]} />
        <meshBasicMaterial
          color="#FFF3DC"
          transparent
          opacity={0.16}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* drifting key light (paired with the Scene key so shadows agree) */}
      <directionalLight
        ref={sun}
        castShadow={false}
        position={[3.5, 11, 2]}
        intensity={0.35}
        color="#FFF2DC"
      />

      {/* street lamp near the board */}
      <group position={[-3.9, 0.18, -13]}>
        <mesh position={[0, 2.6, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 5.2, 10]} />
          <meshStandardMaterial color="#151515" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0.55, 5.1, 0]} rotation-z={-0.35}>
          <cylinderGeometry args={[0.05, 0.05, 1.3, 8]} />
          <meshStandardMaterial color="#151515" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[1.1, 4.95, 0]}>
          <boxGeometry args={[0.5, 0.14, 0.26]} />
          <meshStandardMaterial
            color="#F5F0E8"
            emissive="#F5F0E8"
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>
        <pointLight position={[1.1, 4.7, 0]} intensity={6} distance={11} decay={2} color="#FFEBC8" />
      </group>

      {/* subtle dust motes */}
      <points ref={dust} geometry={dustGeometry}>
        <pointsMaterial
          size={0.055}
          color="#F5F0E8"
          transparent
          opacity={0.35}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
