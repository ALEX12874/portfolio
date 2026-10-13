import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { INK, IVORY, RED, type PlanetBodyProps } from "./shared";

const COLS = 6;
const ROWS = 4;
const GAP = 0.07; // radians between panels — the visible seams
const LIFTED = { col: 1, row: 1 }; // the panel raised to show the core

interface PanelSpec {
  key: string;
  phiStart: number;
  phiLength: number;
  thetaStart: number;
  thetaLength: number;
  ivory: boolean;
  lifted: boolean;
  /** Outward unit normal through the panel centre. */
  normal: THREE.Vector3;
}

/**
 * 05 Product Marketing — an engineered sphere: segmented ink and ivory armour
 * panels with machined seams and gaps, one panel lifted on its hinge to
 * reveal the glowing red core (the value proposition inside the product).
 */
export default function ProductMarketingPlanet({ size, active, animate }: PlanetBodyProps) {
  const panels = useMemo<PanelSpec[]>(() => {
    const out: PanelSpec[] = [];
    const dPhi = (Math.PI * 2) / COLS;
    const dTheta = Math.PI / ROWS;
    for (let c = 0; c < COLS; c += 1) {
      for (let r = 0; r < ROWS; r += 1) {
        const phiStart = c * dPhi + GAP / 2;
        const thetaStart = r * dTheta + GAP / 2;
        const phiMid = phiStart + (dPhi - GAP) / 2;
        const thetaMid = thetaStart + (dTheta - GAP) / 2;
        // three.js sphere param: x = -cos(phi) sin(theta), y = cos(theta), z = sin(phi) sin(theta)
        const normal = new THREE.Vector3(
          -Math.cos(phiMid) * Math.sin(thetaMid),
          Math.cos(thetaMid),
          Math.sin(phiMid) * Math.sin(thetaMid)
        );
        out.push({
          key: `${c}-${r}`,
          phiStart,
          phiLength: dPhi - GAP,
          thetaStart,
          thetaLength: dTheta - GAP,
          // ivory bands on the two middle rows of alternating columns
          ivory: (r === 1 || r === 2) && c % 2 === 0,
          lifted: c === LIFTED.col && r === LIFTED.row,
          normal,
        });
      }
    }
    return out;
  }, []);

  const lid = useRef<THREE.Group | null>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial | null>(null);
  const liftedPanel = panels.find((p) => p.lifted);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (lid.current && liftedPanel) {
      const breathe = animate ? (Math.sin(t * 0.9) + 1) / 2 : 0.6;
      const lift = size * (0.18 + breathe * 0.12 + (active ? 0.1 : 0));
      lid.current.position.copy(liftedPanel.normal).multiplyScalar(lift);
    }
    if (coreMat.current) {
      const pulse = animate ? Math.sin(t * 2.2) * 0.25 : 0;
      coreMat.current.emissiveIntensity = (active ? 2.6 : 2) + pulse;
    }
  });

  const inkPanel = { color: INK, roughness: 0.32, metalness: 0.75 } as const;
  const ivoryPanel = { color: IVORY, roughness: 0.42, metalness: 0.25 } as const;

  return (
    <group>
      {/* glowing red core */}
      <mesh>
        <sphereGeometry args={[size * 0.86, 40, 28]} />
        <meshStandardMaterial
          ref={coreMat}
          color={RED}
          emissive={RED}
          emissiveIntensity={2}
          roughness={0.6}
          toneMapped={false}
        />
      </mesh>
      {/* the red light leaking out through the open panel */}
      <pointLight
        position={liftedPanel ? liftedPanel.normal.clone().multiplyScalar(size * 1.05) : [0, 0, 0]}
        intensity={1.6}
        distance={size * 3}
        decay={2}
        color={RED}
      />

      {/* armour panels — outer shell + inner lip give each panel thickness */}
      {panels.map((p) => {
        const mat = p.ivory ? ivoryPanel : inkPanel;
        const shell = (
          <>
            <mesh>
              <sphereGeometry args={[size, 14, 8, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength]} />
              <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <sphereGeometry
                args={[size * 0.95, 12, 6, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength]}
              />
              <meshStandardMaterial color={INK} roughness={0.6} metalness={0.5} side={THREE.BackSide} />
            </mesh>
          </>
        );
        return p.lifted ? (
          <group key={p.key} ref={lid}>
            {shell}
          </group>
        ) : (
          <group key={p.key}>{shell}</group>
        );
      })}

      {/* machined equator band */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[size * 1.01, size * 0.03, 8, 96]} />
        <meshStandardMaterial color={IVORY} roughness={0.2} metalness={0.95} />
      </mesh>
    </group>
  );
}
