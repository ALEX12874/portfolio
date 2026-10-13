import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { loopPeriod } from "./clock";
import { assets } from "../../../data/assets";

const FACE_W = 16; // ≈ 16 × 5 units with adult = 1.7
const FACE_H = 4.96; // cropped-artwork aspect 3.228 : 1 — nothing is stretched
const FACE_CY = 7.5; // face spans y 5.02 → 9.98, catwalk and crowd beneath

/** Soft diagonal light-sweep stripe, generated procedurally (no CDN assets). */
function makeSweepTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.28);
    const grad = ctx.createLinearGradient(-90, 0, 90, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(-120, -h, 240, h * 2);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Lime LED segment strip for the border chase: three soft emissive dashes
 * that tile seamlessly (one texture repeat = 1.6 world units).
 */
function makeLedTexture(): THREE.CanvasTexture {
  const w = 96;
  const h = 10;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 3; i += 1) {
      const x = 3 + i * 32;
      ctx.fillStyle = "#D8FF63";
      ctx.shadowColor = "#D8FF63";
      ctx.shadowBlur = 4;
      ctx.fillRect(x, 2, 26, 6);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The hero of the scene: a 16-unit roadside hoarding lit like a product shot.
 *
 * - Artwork: local PNG only, UV-cropped (repeat 0.807 / offset 0.193) so the
 *   22% empty red band on the left is removed and both margins read equal —
 *   the file itself is never edited. toneMapped=false = emissive ≈ 1.0.
 * - Layered frame: outer ink box (0.4 deep) → thin red bezel → lime LED edge
 *   strip with a restrained 6 s chase.
 * - Structure: two steel lattice towers with base plates and bolts, a cross
 *   truss, catwalk with railing, side ladder, and a 6-lamp rig whose spots
 *   wash the structure and pool on the pavement below.
 * - Attention motif: concentric lime ripple rings expand on the pavement
 *   (≤ 15% opacity, 5 s); a red halo breathes behind the panel (±4%, 7 s).
 * - Hover: ≤ 1.02 scale lift plus the small HTML label.
 */
export default function Billboard() {
  const { gl } = useThree();

  const faceTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(assets.billboard);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    // A4: crop the empty red band on the left; equal visual margins.
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(0.807, 1);
    tex.offset.set(0.193, 0);
    return tex;
  }, [gl]);

  const sweepTexture = useMemo(() => makeSweepTexture(), []);
  const ledH = useMemo(() => {
    const t = makeLedTexture();
    t.repeat.set(16.7 / 1.6, 1);
    return t;
  }, []);
  const ledV = useMemo(() => {
    const t = makeLedTexture();
    t.repeat.set(5.5 / 1.6, 1);
    return t;
  }, []);

  const [hovered, setHovered] = useState(false);
  const group = useRef<THREE.Group | null>(null);
  const sweep = useRef<THREE.Mesh | null>(null);
  const halo = useRef<THREE.MeshBasicMaterial | null>(null);
  const ripples = useRef<THREE.Mesh[]>([]);
  const spots = useRef<THREE.SpotLight[]>([]);
  const bounce = useRef<THREE.PointLight | null>(null);
  const targetL = useRef<THREE.Object3D | null>(null);
  const targetR = useRef<THREE.Object3D | null>(null);
  const targetC = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    return () => {
      faceTexture.dispose();
      sweepTexture.dispose();
      ledH.dispose();
      ledV.dispose();
    };
  }, [faceTexture, sweepTexture, ledH, ledV]);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  // real spotlight targets (three.js needs the target inside the graph)
  useEffect(() => {
    const l = spots.current[0];
    const r = spots.current[1];
    const c = spots.current[2];
    if (l && targetL.current) l.target = targetL.current;
    if (r && targetR.current) r.target = targetR.current;
    if (c && targetC.current) c.target = targetC.current;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // slow light sweep across the panel — one pass every 7 s
    if (sweep.current) sweepTexture.offset.x = (t / loopPeriod(7)) % 1;

    // lime LED chase — one segment-cycle every 6 s, restrained
    const chase = (t / loopPeriod(6)) % 1;
    ledH.offset.x = chase;
    ledV.offset.x = chase;

    // breathing halo behind the panel (±4%)
    if (halo.current) halo.current.opacity = 0.09 + Math.sin((t / loopPeriod(7)) * Math.PI * 2) * 0.03;

    // attention ripples on the pavement — 5 s loop, staggered, ≤ 15% opacity
    ripples.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = ((t / loopPeriod(5) + i / 3) % 1);
      const s = 0.55 + phase * 1.35;
      mesh.scale.setScalar(s);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 * (1 - phase) * Math.min(1, phase * 6);
    });

    // restrained hover lift: ≤ 1.02 scale + brighter wash
    if (group.current) {
      const targetScale = hovered ? 1.015 : 1;
      const s = THREE.MathUtils.lerp(group.current.scale.x, targetScale, 0.12);
      group.current.scale.setScalar(s);
      group.current.position.y = THREE.MathUtils.lerp(
        group.current.position.y,
        hovered ? 0.08 : 0,
        0.12
      );
    }
    const washTarget = hovered ? 170 : 115;
    spots.current.forEach((sp) => {
      if (sp) sp.intensity = THREE.MathUtils.lerp(sp.intensity, washTarget, 0.08);
    });
    if (bounce.current) {
      bounce.current.intensity = THREE.MathUtils.lerp(
        bounce.current.intensity,
        hovered ? 16 : 10,
        0.08
      );
    }
  });

  /** Steel member material shared by the structure. */
  const steel = { color: "#151515", roughness: 0.55, metalness: 0.5 } as const;

  const LAMP_X = [-6.6, -4.0, -1.4, 1.4, 4.0, 6.6];
  const BAYS = [0.8, 1.6, 2.4, 3.2, 4.0];

  return (
    <group position={[-11.4, 0, -5]} rotation-y={0.5}>
      {/* hover / label target */}
      <group
        ref={group}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* ---- lattice towers: 4 chords, horizontal ties, diagonals ---- */}
        {[-5.5, 5.5].map((tx) => (
          <group key={tx} position={[tx, 0, 0]}>
            {/* concrete footing + base plate + bolts */}
            <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
              <boxGeometry args={[1.3, 0.3, 1.3]} />
              <meshStandardMaterial color="#9C948A" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.37, 0]} castShadow>
              <boxGeometry args={[1.0, 0.14, 1.0]} />
              <meshStandardMaterial {...steel} />
            </mesh>
            {[
              [-0.35, -0.35],
              [0.35, -0.35],
              [-0.35, 0.35],
              [0.35, 0.35],
            ].map(([bx, bz]) => (
              <mesh key={`${tx}-${bx}-${bz}`} position={[bx, 0.5, bz]}>
                <cylinderGeometry args={[0.055, 0.055, 0.16, 6]} />
                <meshStandardMaterial color="#2A2A2A" roughness={0.5} metalness={0.6} />
              </mesh>
            ))}
            {/* four corner chords */}
            {[
              [-0.22, -0.22],
              [0.22, -0.22],
              [-0.22, 0.22],
              [0.22, 0.22],
            ].map(([cx, cz]) => (
              <mesh key={`c-${tx}-${cx}-${cz}`} position={[cx, 2.55, cz]} castShadow>
                <cylinderGeometry args={[0.06, 0.06, 4.15, 6]} />
                <meshStandardMaterial {...steel} />
              </mesh>
            ))}
            {/* horizontal ties */}
            {BAYS.map((by) => (
              <mesh key={`t-${tx}-${by}`} position={[0, by, 0]} castShadow>
                <boxGeometry args={[0.52, 0.05, 0.52]} />
                <meshStandardMaterial {...steel} />
              </mesh>
            ))}
            {/* zig-zag diagonals, front and back */}
            {BAYS.slice(0, 4).map((by, i) => (
              <group key={`d-${tx}-${by}`}>
                <mesh position={[0, by + 0.4, 0.22]} rotation-z={i % 2 ? 0.62 : -0.62} castShadow>
                  <boxGeometry args={[0.04, 0.95, 0.04]} />
                  <meshStandardMaterial {...steel} />
                </mesh>
                <mesh position={[0, by + 0.4, -0.22]} rotation-z={i % 2 ? -0.62 : 0.62} castShadow>
                  <boxGeometry args={[0.04, 0.95, 0.04]} />
                  <meshStandardMaterial {...steel} />
                </mesh>
              </group>
            ))}
          </group>
        ))}

        {/* ---- cross truss holding the frame ---- */}
        {[-0.16, 0.16].map((dz) => (
          <group key={`truss-${dz}`}>
            <mesh position={[0, 4.05, dz]} castShadow>
              <boxGeometry args={[11.1, 0.07, 0.07]} />
              <meshStandardMaterial {...steel} />
            </mesh>
            <mesh position={[0, 4.5, dz]} castShadow>
              <boxGeometry args={[11.1, 0.07, 0.07]} />
              <meshStandardMaterial {...steel} />
            </mesh>
            {[-4.95, -3.3, -1.65, 0, 1.65, 3.3, 4.95].map((zx, i) => (
              <mesh
                key={`z-${dz}-${zx}`}
                position={[zx - 0.825, 4.275, dz]}
                rotation-z={i % 2 ? 0.44 : -0.44}
                castShadow
              >
                <boxGeometry args={[0.045, 0.62, 0.045]} />
                <meshStandardMaterial {...steel} />
              </mesh>
            ))}
          </group>
        ))}

        {/* ---- catwalk with railing ---- */}
        <mesh position={[0, 4.3, 0.55]} castShadow receiveShadow>
          <boxGeometry args={[16.4, 0.09, 1.0]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh position={[0, 4.92, 1.02]} castShadow>
          <boxGeometry args={[16.4, 0.05, 0.05]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        {[-7.6, -6.0, -4.4, -2.8, -1.2, 0.4, 2.0, 3.6, 5.2, 6.8, 7.6].map((rx) => (
          <mesh key={`rail-${rx}`} position={[rx, 4.62, 1.02]}>
            <boxGeometry args={[0.04, 0.56, 0.04]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}

        {/* ---- access ladder up the right tower ---- */}
        {Array.from({ length: 12 }, (_, i) => 0.6 + i * 0.33).map((ly) => (
          <mesh key={`rung-${ly}`} position={[5.95, ly, 0]}>
            <boxGeometry args={[0.34, 0.035, 0.035]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
        {[-0.15, 0.15].map((dz) => (
          <mesh key={`ladder-${dz}`} position={[5.95, 2.4, dz]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 4.0, 6]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}

        {/* ---- layered frame: ink box → red bezel → LED strip → artwork ---- */}
        <mesh position={[0, FACE_CY, -0.2]} castShadow>
          <boxGeometry args={[FACE_W + 0.8, FACE_H + 0.8, 0.4]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        {/* thin red bezel */}
        <mesh position={[0, FACE_CY, -0.02]}>
          <boxGeometry args={[FACE_W + 0.4, FACE_H + 0.4, 0.12]} />
          <meshStandardMaterial color="#E63843" roughness={0.5} metalness={0.1} />
        </mesh>

        {/* lime LED edge strip — slow chase around the border (6 s loop) */}
        <mesh position={[0, FACE_CY + 2.78, 0.06]}>
          <planeGeometry args={[16.7, 0.16]} />
          <meshBasicMaterial
            map={ledH}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, FACE_CY - 2.78, 0.06]} rotation-z={Math.PI}>
          <planeGeometry args={[16.7, 0.16]} />
          <meshBasicMaterial
            map={ledH}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[8.3, FACE_CY, 0.06]} rotation-z={-Math.PI / 2}>
          <planeGeometry args={[5.5, 0.16]} />
          <meshBasicMaterial
            map={ledV}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[-8.3, FACE_CY, 0.06]} rotation-z={Math.PI / 2}>
          <planeGeometry args={[5.5, 0.16]} />
          <meshBasicMaterial
            map={ledV}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* artwork face — UV crop, exact colours preserved */}
        <mesh position={[0, FACE_CY, 0.045]}>
          <planeGeometry args={[FACE_W, FACE_H]} />
          <meshBasicMaterial map={faceTexture} toneMapped={false} />
        </mesh>

        {/* subtle diagonal light sweep (7 s) */}
        <mesh ref={sweep} position={[0, FACE_CY, 0.055]}>
          <planeGeometry args={[FACE_W, FACE_H]} />
          <meshBasicMaterial
            map={sweepTexture}
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* soft red halo behind the panel (breathing, ≤ 12% opacity) */}
        <mesh position={[0, FACE_CY, -0.45]}>
          <planeGeometry args={[17.6, 6.6]} />
          <meshBasicMaterial
            ref={halo}
            color="#E63843"
            transparent
            opacity={0.09}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* ---- 6-lamp rig ---- */}
        {LAMP_X.map((lx) => (
          <group key={`lamp-${lx}`} position={[lx, 10.7, 0.1]}>
            <mesh position={[0, 0.1, -0.22]} rotation-x={0.55} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.6, 8]} />
              <meshStandardMaterial {...steel} />
            </mesh>
            <mesh position={[0, -0.14, 0.16]} rotation-x={0.72} castShadow>
              <boxGeometry args={[0.6, 0.16, 0.3]} />
              <meshStandardMaterial
                color="#F5F0E8"
                emissive="#F5F0E8"
                emissiveIntensity={1.1}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* spot washes: structure + light pools on the pavement */}
        <object3D ref={targetL} position={[-3.5, 3.2, 1.2]} />
        <object3D ref={targetR} position={[3.5, 3.2, 1.2]} />
        <spotLight
          ref={(node) => {
            if (node) spots.current[0] = node;
          }}
          position={[-6.6, 10.5, 0.6]}
          angle={0.4}
          penumbra={0.7}
          distance={22}
          decay={1.5}
          intensity={115}
          color="#FFF4E2"
        />
        <spotLight
          ref={(node) => {
            if (node) spots.current[1] = node;
          }}
          position={[6.6, 10.5, 0.6]}
          angle={0.4}
          penumbra={0.7}
          distance={22}
          decay={1.5}
          intensity={115}
          color="#FFF4E2"
        />
        {/* centre wash aimed straight down the panel onto the pavement */}
        <object3D ref={targetC} position={[0, 0, 3.2]} />
        <spotLight
          ref={(node) => {
            if (node) spots.current[2] = node;
          }}
          position={[0, 10.6, 1.4]}
          angle={0.5}
          penumbra={0.75}
          distance={20}
          decay={1.5}
          intensity={90}
          color="#FFF4E2"
        />

        {/* warm bounce so the crowd below reads against the frame */}
        <pointLight
          ref={bounce}
          position={[0, 5.4, 2.4]}
          intensity={10}
          distance={14}
          decay={2}
          color="#FFEBD2"
        />

        {/* ---- attention ripples on the pavement (5 s, ≤ 15%) ---- */}
        {[1.5, 2.7, 3.9].map((r, i) => (
          <mesh
            key={`ripple-${r}`}
            ref={(node) => {
              if (node) ripples.current[i] = node;
            }}
            position={[0, 0.03, 2.2]}
            rotation-x={-Math.PI / 2}
          >
            <ringGeometry args={[r, r + 0.16, 64]} />
            <meshBasicMaterial
              color="#D8FF63"
              transparent
              opacity={0.12}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

        {/* editorial label — never covers the artwork */}
        <Html
          position={[8.9, 10.75, 0.3]}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
          center={false}
        >
          <div
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 font-display text-[0.6rem] font-bold uppercase tracking-[0.16em] transition-opacity duration-500 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
            style={{
              borderColor: "rgba(21,21,21,0.25)",
              background: "rgba(245,240,232,0.94)",
              color: "#151515",
            }}
          >
            Outdoor advertising / Brand attention
          </div>
        </Html>
      </group>
    </group>
  );
}
