import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural paving texture — finer tiles, subtle grain, lowered albedo so
 * the pavement never blows out to white under the key light + 0.85 exposure.
 * No assets.
 */
function makePavingTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#A8A093";
    ctx.fillRect(0, 0, size, size);
    // fine per-tile grain
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = `rgba(21,21,21,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
    }
    ctx.strokeStyle = "rgba(21,21,21,0.16)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(11, 52);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Layered street tree: trunk + several overlapping canopy blobs with a gentle
 * sway. Used for the row that stands behind the billboard on the grass strip —
 * tops stay below the board's top edge so it is always framed, never blocked.
 */
function Tree({ position }: { position: [number, number, number] }) {
  const sway = useRef<THREE.Group | null>(null);

  useFrame(({ clock }) => {
    if (!sway.current) return;
    const t = clock.getElapsedTime();
    sway.current.rotation.z = Math.sin(t * 0.6 + position[2]) * 0.02;
    sway.current.rotation.x = Math.cos(t * 0.45 + position[2]) * 0.014;
  });

  return (
    <group position={position}>
      {/* soil mound */}
      <mesh position={[0, 0.24, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.7, 0.3, 1.7]} />
        <meshStandardMaterial color="#3E4A33" roughness={1} />
      </mesh>
      {/* trunk */}
      <mesh position={[0, 3.0, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.26, 5.4, 8]} />
        <meshStandardMaterial color="#3A332C" roughness={1} />
      </mesh>
      {/* canopy — four overlapping blobs, top stays ≈ 8.8 < board top 9.98 */}
      <group ref={sway} position={[0, 6.2, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <icosahedronGeometry args={[2.0, 1]} />
          <meshStandardMaterial color="#1E4032" roughness={1} flatShading />
        </mesh>
        <mesh position={[1.15, -0.3, 0.5]} castShadow>
          <icosahedronGeometry args={[1.5, 1]} />
          <meshStandardMaterial color="#245244" roughness={1} flatShading />
        </mesh>
        <mesh position={[-1.05, -0.1, -0.4]} castShadow>
          <icosahedronGeometry args={[1.3, 1]} />
          <meshStandardMaterial color="#14342B" roughness={1} flatShading />
        </mesh>
        <mesh position={[0.2, 1.5, -0.2]} castShadow>
          <icosahedronGeometry args={[1.1, 1]} />
          <meshStandardMaterial color="#1E4032" roughness={1} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/** Slatted bench facing the road — the "stop and watch" spot. */
function Bench({ position }: { position: [number, number, number] }) {
  const steel = { color: "#151515", roughness: 0.6, metalness: 0.4 } as const;
  return (
    <group position={position}>
      {/* legs */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.24, 0]} castShadow>
          <boxGeometry args={[0.06, 0.48, 0.44]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      {/* seat slats */}
      {[-0.14, 0, 0.14].map((z) => (
        <mesh key={z} position={[0, 0.5, z]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.045, 0.11]} />
          <meshStandardMaterial color="#6B5E4E" roughness={0.85} />
        </mesh>
      ))}
      {/* back slats */}
      {[0.66, 0.86].map((y) => (
        <mesh key={y} position={[0, y, -0.2]} rotation-x={-0.12} castShadow>
          <boxGeometry args={[1.5, 0.1, 0.045]} />
          <meshStandardMaterial color="#6B5E4E" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Newspaper box + hydrant cluster — small realism anchors near the kerb. */
function StreetProps({ z }: { z: number }) {
  const steel = { color: "#151515", roughness: 0.65, metalness: 0.35 } as const;
  return (
    <group position={[-6.3, 0.18, z]}>
      {/* newspaper box */}
      <group position={[0.5, 0, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.42, 0.6, 0.36]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh position={[0, 0.68, 0.185]}>
          <planeGeometry args={[0.3, 0.2]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.7} />
        </mesh>
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.06, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#151515" roughness={0.8} />
          </mesh>
        ))}
      </group>
      {/* fire hydrant */}
      <group position={[-0.55, 0, 0.1]}>
        <mesh position={[0, 0.26, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 0.52, 10]} />
          <meshStandardMaterial color="#E63843" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.085, 10, 8]} />
          <meshStandardMaterial color="#E63843" roughness={0.7} />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 0.36, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.045, 0.045, 0.1, 8]} />
            <meshStandardMaterial color="#B22A34" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Raised pavement beside the road (runs the full length of the world), with
 * kerb, bollards, bench and street props — plus the grass strip behind the
 * billboard carrying the row of layered trees that frame the board from the
 * back. Small shrubs stay near the footpath; no big tree blocks the view.
 */
export default function Footpath() {
  const paving = useMemo(() => makePavingTexture(), []);

  useEffect(() => {
    return () => paving.dispose();
  }, [paving]);

  const bollards = useMemo(() => [-32, -24, -16, -8, 0, 8, 12], []);
  /** Row behind the billboard — computed to clear the face plane and its ends. */
  const trees = useMemo(
    () =>
      [
        [-20.7, -2.2],
        [-22.5, -2.4],
        [-24.5, -3.0],
        [-26.6, -3.6],
      ].map(([x, z]) => ({ x, z })),
    []
  );

  return (
    <group>
      {/* grass strip behind the billboard (posts + tree row stand on it) */}
      <mesh position={[-19.4, 0.09, -8]} receiveShadow>
        <boxGeometry args={[18, 0.18, 46]} />
        <meshStandardMaterial color="#3E4A33" roughness={1} />
      </mesh>

      {/* pavement slab */}
      <mesh position={[-7, 0.09, -16]} receiveShadow castShadow>
        <boxGeometry args={[7, 0.18, 104]} />
        <meshStandardMaterial map={paving} color="#EDE7DA" roughness={0.95} />
      </mesh>

      {/* kerb — ivory top stripe reads as painted kerb */}
      <mesh position={[-3.56, 0.12, -16]} receiveShadow castShadow>
        <boxGeometry args={[0.24, 0.24, 104]} />
        <meshStandardMaterial color="#B3AB9E" roughness={0.95} />
      </mesh>
      <mesh position={[-3.56, 0.245, -16]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[0.2, 104]} />
        <meshStandardMaterial color="#F5F0E8" roughness={0.85} />
      </mesh>

      {/* tactile guide strip along the footpath centre */}
      <mesh position={[-5.0, 0.185, -16]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[0.34, 60]} />
        <meshStandardMaterial color="#9E9686" roughness={0.9} />
      </mesh>

      {/* bollards along the kerb */}
      {bollards.map((z) => (
        <mesh key={z} position={[-4.1, 0.5, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.64, 10]} />
          <meshStandardMaterial color="#151515" roughness={0.7} />
        </mesh>
      ))}

      {/* bench facing the road, right by the billboard */}
      <Bench position={[-6.6, 0.18, -1.8]} />

      {/* newspaper box + hydrant (clear of the tower footing) */}
      <StreetProps z={-12} />

      {/* small shrubs near the footpath only */}
      {[
        [-9.6, 6.5],
        [-9.8, -5.2],
      ].map(([sx, sz]) => (
        <mesh key={`shrub-${sx}-${sz}`} position={[sx, 0.55, sz]} scale={0.9} castShadow>
          <icosahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial color="#1E4032" roughness={1} flatShading />
        </mesh>
      ))}

      {/* tree row behind the billboard */}
      {trees.map((t) => (
        <Tree key={`bt-${t.x}-${t.z}`} position={[t.x, 0.18, t.z]} />
      ))}
    </group>
  );
}
