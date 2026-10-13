import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { sunSkill } from "../../data/skills";

/** Procedural surface texture — layered red blobs, no external assets. */
function makeSunTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#E63843";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 10 + Math.random() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const lighter = Math.random() > 0.5;
      g.addColorStop(0, lighter ? "rgba(255,140,140,0.55)" : "rgba(160,20,30,0.5)");
      g.addColorStop(1, "rgba(230,56,67,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial glow sprite used for the corona. */
function makeGlowTexture(): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.35, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

interface SunProps {
  selected: boolean;
  onSelect: (id: string) => void;
  animate: boolean;
}

const PARTICLES = 12;

export default function Sun({ selected, onSelect, animate }: SunProps) {
  const surface = useMemo(() => makeSunTexture(), []);
  const glow = useMemo(() => makeGlowTexture(), []);

  const core = useRef<THREE.Mesh | null>(null);
  const shell = useRef<THREE.Mesh | null>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const ringC = useRef<THREE.Mesh>(null);
  const sprite = useRef<THREE.Mesh>(null);
  const dust = useRef<THREE.Points>(null);
  const group = useRef<THREE.Group>(null);
  const born = useRef<number>(-1);

  const dustGeo = useMemo(() => {
    const pos = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i += 1) {
      const a = (i / PARTICLES) * Math.PI * 2;
      const r = 2.4 + Math.random() * 1.4;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      surface.dispose();
      glow.dispose();
      dustGeo.dispose();
    };
  }, [surface, glow, dustGeo]);

  useFrame(({ clock, camera }, delta) => {
    const t = clock.getElapsedTime();
    if (born.current < 0) born.current = t;

    // entrance: sun appears first, scaling up from 0
    const reveal = Math.min(1, Math.max(0, (t - born.current) / 0.7));
    const eased = 1 - Math.pow(1 - reveal, 3);
    const target = (selected ? 1.06 : 1) * eased;
    if (group.current) {
      const s = THREE.MathUtils.lerp(group.current.scale.x, target, 0.12);
      group.current.scale.setScalar(s);
    }

    if (core.current && animate) core.current.rotation.y += delta * 0.06;
    if (shell.current && animate) {
      shell.current.rotation.y -= delta * 0.14;
      shell.current.rotation.x += delta * 0.05;
    }
    if (ringA.current && animate) {
      ringA.current.rotation.z += delta * 0.22;
      ringA.current.rotation.x = 1.15 + Math.sin(t * 0.3) * 0.12;
    }
    if (ringB.current && animate) {
      ringB.current.rotation.z -= delta * 0.16;
      ringB.current.rotation.y = t * 0.12;
    }
    if (ringC.current && animate) ringC.current.rotation.z += delta * 0.09;
    if (dust.current && animate) dust.current.rotation.y += delta * 0.25;

    // glow always faces the camera
    if (sprite.current) {
      sprite.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={group}>
      {/* core */}
      <mesh
        ref={core}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(sunSkill.id);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial
          map={surface}
          color="#E63843"
          emissive="#E63843"
          emissiveIntensity={selected ? 0.9 : 0.65}
          roughness={0.75}
        />
      </mesh>

      {/* transparent moving shell — layered surface movement */}
      <mesh ref={shell}>
        <sphereGeometry args={[1.72, 24, 24]} />
        <meshBasicMaterial
          color="#FF7A80"
          wireframe
          transparent
          opacity={selected ? 0.22 : 0.14}
          toneMapped={false}
        />
      </mesh>

      {/* additive glow sprite */}
      <mesh ref={sprite} scale={selected ? 10.5 : 9}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color="#E63843"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* corona rings — animated independently */}
      <mesh ref={ringA}>
        <ringGeometry args={[1.95, 2.12, 96]} />
        <meshBasicMaterial
          color="#E63843"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringB}>
        <ringGeometry args={[2.3, 2.38, 96]} />
        <meshBasicMaterial
          color="#D8FF63"
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringC}>
        <ringGeometry args={[2.7, 2.75, 96]} />
        <meshBasicMaterial
          color="#E63843"
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* slow independent particles */}
      <points ref={dust} geometry={dustGeo}>
        <pointsMaterial
          size={0.09}
          color="#D8FF63"
          transparent
          opacity={0.65}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* the Sun's point light lives in SolarSystem.tsx (decay 1.2, lights every planet) */}

      {selected ? (
        <Html position={[0, 2.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            className="whitespace-nowrap rounded-md border border-[rgba(245,240,232,0.25)] bg-[rgba(21,21,21,0.92)] px-3 py-2 text-center"
            style={{ color: "#F5F0E8" }}
          >
            <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#D8FF63]">
              {sunSkill.number} / THE CORE
            </p>
            <p className="font-display text-[0.8rem] font-extrabold uppercase tracking-[0.1em]">
              {sunSkill.title}
            </p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
