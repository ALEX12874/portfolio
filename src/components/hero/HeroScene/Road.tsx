import { useMemo } from "react";

const DASH_COUNT = 26;
const ROAD_LENGTH = 104;
const ROAD_WIDTH = 7;

/**
 * Stylised asphalt road running diagonally through the scene, with ivory
 * dashed lane markings and edge lines. It runs well past both ends of the
 * camera frame (bottom edge lands mid-road), so nothing ever looks cut off.
 * The far-side pavement gives the right frame edge real ground.
 */
export default function Road() {
  const dashes = useMemo(
    () => Array.from({ length: DASH_COUNT }, (_, i) => -64 + i * 4),
    []
  );

  return (
    <group>
      {/* asphalt */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -16]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#34302C" roughness={0.96} metalness={0} />
      </mesh>

      {/* centre dashes */}
      {dashes.map((z) => (
        <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.012, z]}>
          <planeGeometry args={[0.16, 1.7]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.8} />
        </mesh>
      ))}

      {/* edge lines */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          rotation-x={-Math.PI / 2}
          position={[s * (ROAD_WIDTH / 2 - 0.3), 0.011, -16]}
        >
          <planeGeometry args={[0.12, ROAD_LENGTH]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.85} />
        </mesh>
      ))}

      {/* far-side kerb + pavement (across the street) */}
      <mesh position={[3.62, 0.07, -16]} receiveShadow castShadow>
        <boxGeometry args={[0.24, 0.14, ROAD_LENGTH]} />
        <meshStandardMaterial color="#B3AB9E" roughness={0.95} />
      </mesh>
      <mesh position={[6.05, 0.05, -16]} receiveShadow>
        <boxGeometry args={[4.7, 0.1, ROAD_LENGTH]} />
        <meshStandardMaterial color="#B8B0A2" roughness={1} />
      </mesh>
    </group>
  );
}
