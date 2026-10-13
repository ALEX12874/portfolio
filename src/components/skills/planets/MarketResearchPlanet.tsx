import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { INK, IVORY, LIME, seeded, type PlanetBodyProps } from "./shared";

/**
 * Equirectangular "survey chart": fine ivory latitude/longitude graticule,
 * concentric survey rings around one point, and small data tick marks.
 */
function makeSurveyTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);

    // graticule — every 15°
    ctx.strokeStyle = "rgba(245,240,232,0.38)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= 24; i += 1) {
      const x = (i / 24) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let j = 1; j < 12; j += 1) {
      const y = (j / 12) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // brighter equator
    ctx.strokeStyle = "rgba(245,240,232,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // concentric survey rings (two sample sites)
    const sites = [
      { x: w * 0.3, y: h * 0.38, n: 6 },
      { x: w * 0.74, y: h * 0.62, n: 4 },
    ];
    for (const s of sites) {
      for (let k = 1; k <= s.n; k += 1) {
        ctx.strokeStyle = `rgba(245,240,232,${0.75 - k * 0.09})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, k * 13, k * 11, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // data tick marks along the equator + random readings
    ctx.fillStyle = "rgba(245,240,232,0.85)";
    for (let i = 0; i < 96; i += 1) {
      const x = (i / 96) * w;
      const len = i % 8 === 0 ? 14 : i % 2 === 0 ? 8 : 4;
      ctx.fillRect(x, h / 2 - len / 2, 1.6, len);
    }
    const rnd = seeded(404);
    for (let i = 0; i < 40; i += 1) {
      const x = rnd() * w;
      const y = h * 0.15 + rnd() * h * 0.7;
      const bars = 2 + Math.floor(rnd() * 3);
      for (let b = 0; b < bars; b += 1) {
        ctx.fillRect(x + b * 4, y - (4 + rnd() * 10), 2, 4 + rnd() * 10);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * 04 Market Research — an ink survey globe etched with a fine ivory
 * graticule, concentric sample rings and tick marks; a tilted scanner ring
 * orbits it and a thin lime scan beam sweeps across the surface.
 */
export default function MarketResearchPlanet({ size, active, animate }: PlanetBodyProps) {
  const texture = useMemo(() => makeSurveyTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const scanner = useRef<THREE.Group | null>(null);
  const beam = useRef<THREE.Group | null>(null);
  const beamRing = useRef<THREE.Mesh | null>(null);
  const beamDisc = useRef<THREE.Mesh | null>(null);
  const phase = useRef(0.35);

  useFrame((_, delta) => {
    if (animate) {
      if (scanner.current) scanner.current.rotation.y += delta * 0.5;
      phase.current = (phase.current + delta * (active ? 0.32 : 0.22)) % 1;
    }
    // beam travels pole → pole on a tilted axis, ping-pong
    const p = phase.current < 0.5 ? phase.current * 2 : 2 - phase.current * 2;
    const yy = (p * 2 - 1) * size * 0.96;
    const rr = Math.sqrt(Math.max(size * size - yy * yy, 0.0001)) * 1.012;
    if (beamRing.current) {
      beamRing.current.position.y = yy;
      beamRing.current.scale.setScalar(rr);
    }
    if (beamDisc.current) {
      beamDisc.current.position.y = yy;
      beamDisc.current.scale.setScalar(rr * 1.45);
    }
  });

  return (
    <group>
      {/* etched ink globe */}
      <mesh>
        <sphereGeometry args={[size, 64, 40]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive={IVORY}
          emissiveIntensity={active ? 0.3 : 0.16}
          roughness={0.5}
          metalness={0.35}
        />
      </mesh>

      {/* tilted scanner ring with tick marks */}
      <group rotation={[0.55, 0, 0.3]}>
        <group ref={scanner}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[size * 1.42, size * 0.012, 6, 120]} />
            <meshStandardMaterial color={IVORY} roughness={0.3} metalness={0.8} />
          </mesh>
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const long = i % 6 === 0;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * size * 1.42, 0, Math.sin(a) * size * 1.42]}
                rotation-y={-a}
              >
                <boxGeometry args={[size * (long ? 0.14 : 0.07), size * 0.018, size * 0.018]} />
                <meshBasicMaterial color={long ? LIME : IVORY} toneMapped={false} />
              </mesh>
            );
          })}
          {/* scanner head */}
          <mesh position={[size * 1.42, 0, 0]}>
            <boxGeometry args={[size * 0.12, size * 0.12, size * 0.2]} />
            <meshBasicMaterial color={LIME} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* lime scan beam sweeping across the surface */}
      <group ref={beam} rotation={[0.35, 0, -0.5]}>
        <mesh ref={beamRing} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1, 0.012, 6, 96]} />
          <meshBasicMaterial color={LIME} toneMapped={false} />
        </mesh>
        <mesh ref={beamDisc} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.66, 1, 64]} />
          <meshBasicMaterial
            color={LIME}
            transparent
            opacity={0.14}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
