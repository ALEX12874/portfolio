import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { toCreasedNormals } from "three-stdlib";
import * as THREE from "three";
import { loopRate, loopSpeed } from "./clock";

/* ---------------------------------------------------------------- shapes */

/**
 * drei's <RoundedBox> rebuilds (and re-creases) its geometry for every
 * instance: six cars × five boxes was ~50 ms of work in one go. Same maths
 * here, but each distinct box is built once and shared.
 */
const EPS = 0.00001;
const roundedCache = new Map<string, THREE.BufferGeometry>();

function roundedShape(width: number, height: number, radius0: number) {
  const shape = new THREE.Shape();
  const radius = radius0 - EPS;
  shape.absarc(EPS, EPS, EPS, -Math.PI / 2, -Math.PI, true);
  shape.absarc(EPS, height - radius * 2, EPS, Math.PI, Math.PI / 2, true);
  shape.absarc(width - radius * 2, height - radius * 2, EPS, Math.PI / 2, 0, true);
  shape.absarc(width - radius * 2, EPS, EPS, 0, -Math.PI / 2, true);
  return shape;
}

function roundedBoxGeometry(w: number, h: number, d: number, radius: number, smoothness: number) {
  const key = `${w},${h},${d},${radius},${smoothness}`;
  let geo = roundedCache.get(key);
  if (!geo) {
    geo = new THREE.ExtrudeGeometry(roundedShape(w, h, radius), {
      depth: d - radius * 2,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: radius - EPS,
      bevelThickness: radius,
      curveSegments: smoothness,
    });
    geo.center();
    toCreasedNormals(geo, 0.4);
    roundedCache.set(key, geo);
  }
  return geo;
}

type MeshProps = Omit<React.ComponentProps<"mesh">, "args">;

function RoundedBox({
  args: [w, h, d],
  radius,
  smoothness,
  children,
  ...rest
}: MeshProps & { args: [number, number, number]; radius: number; smoothness: number }) {
  const geometry = useMemo(() => roundedBoxGeometry(w, h, d, radius, smoothness), [w, h, d, radius, smoothness]);
  // shared geometry: never disposed with one car
  return (
    <mesh geometry={geometry} dispose={null} {...rest}>
      {children}
    </mesh>
  );
}


const Z_NEAR = 16;
const Z_FAR = -46;
const TRACK = Z_NEAR - Z_FAR;

/** Billboard z in road space — cars ease toward the kerb as they pass it. */
const BILLBOARD_Z = -5;
const REACT_WINDOW = 7;

export interface CarProps {
  /** Body colour — palette-derived only. */
  color: string;
  /** Lane centre (road is 7 wide, lanes at ±1.7). */
  x: number;
  /** +1 travels toward the camera, -1 away. */
  dir: 1 | -1;
  speed: number;
  /** Loop phase offset, 0..1. */
  offset: number;
  /** Silhouette variant. */
  variant?: "sedan" | "hatch";
}

/**
 * A city car built from primitives: stepped sedan/hatch body, raked glass,
 * emissive head- and tail-lights, four spinning wheels with rims.
 *
 * Story detail: cars in the lane next to the footpath *rubber-neck* as they
 * pass the billboard — they ease toward the kerb, yaw a few degrees toward the
 * board and their brake bar flares. Lateral motion is a pure function of z, so
 * same-lane cars (equal speed, thirds-phase) can never collide.
 */
export default function Car({
  color,
  x,
  dir,
  speed,
  offset,
  variant = "sedan",
}: CarProps) {
  const group = useRef<THREE.Group | null>(null);
  const wheels = useRef<THREE.Group[]>([]);
  const brake = useRef<THREE.MeshStandardMaterial | null>(null);

  const cabinOffset = variant === "hatch" ? -0.05 : -0.28;
  const cabinLen = variant === "hatch" ? 1.75 : 1.6;
  const bodyLen = variant === "hatch" ? 3.25 : 3.7;

  /** Reacts to the billboard only in the kerb-side lane (x < 0). */
  const canReact = x < 0;

  const brakeBase = useMemo(() => new THREE.Color("#7A1017"), []);
  const brakeHot = useMemo(() => new THREE.Color("#FF3040"), []);

  // automotive paint: clearcoat over a slightly metallic base (reads as
  // paint, not a flat block of colour)
  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.35,
        metalness: 0.25,
        clearcoat: 0.8,
        clearcoatRoughness: 0.12,
      }),
    [color]
  );
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#1D2329",
        roughness: 0.08,
        metalness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
    []
  );
  useEffect(
    () => () => {
      paint.dispose();
      glass.dispose();
    },
    [paint, glass]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const lapSpeed = loopSpeed(speed, TRACK);
    const travelled = ((t * lapSpeed + offset * TRACK) % TRACK) * 1;
    const z = dir === 1 ? Z_NEAR - travelled : Z_FAR + travelled;

    if (group.current) {
      group.current.position.z = z;
      // the model's nose is local +z: face the direction of travel
      // (dir 1 moves toward -z, dir -1 toward +z)
      group.current.rotation.y = dir === 1 ? Math.PI : 0;

      // seamless loop: grow in from the fogged far end, shrink out behind us
      const fromFar = THREE.MathUtils.clamp((z - Z_FAR) / 10, 0, 1);
      const nearFade = THREE.MathUtils.clamp((Z_NEAR + 2 - z) / 6, 0, 1);
      const s = Math.min(fromFar, nearFade);
      group.current.scale.setScalar(s);
      group.current.visible = s > 0.01;

      // rubber-necking: eased purely by z (deterministic, collision-safe)
      if (canReact) {
        const d = (z - BILLBOARD_Z) / REACT_WINDOW;
        const g = Math.max(0, 1 - d * d); // 0 far, 1 abeam the board
        // ease toward the kerb (-x, the footpath on the driver's left) and
        // turn the nose a touch toward the board (also on the -x side)
        group.current.position.x = x - 0.3 * g;
        group.current.rotation.y += 0.07 * g;
      }
    }

    // brake bar flares while passing the board
    if (brake.current) {
      const d = (z - BILLBOARD_Z) / REACT_WINDOW;
      const g = canReact ? Math.max(0, 1 - d * d) : 0;
      brake.current.emissiveIntensity = 0.25 + g * 2.6;
      brake.current.color.copy(brakeBase).lerp(brakeHot, g);
    }

    const spin = t * loopRate(speed * 1.6);
    wheels.current.forEach((w) => {
      // local frame: the car always moves along its own +z → roll forward
      if (w) w.rotation.x = spin;
    });
  });

  const wheelPositions: [number, number, number][] = [
    [-0.8, 0.31, 1.12],
    [0.8, 0.31, 1.12],
    [-0.8, 0.31, -1.12],
    [0.8, 0.31, -1.12],
  ];

  return (
    <group ref={group} name={`car-${color}`} position={[x, 0, Z_FAR]}>
      {/* lower body */}
      <RoundedBox
        args={[1.62, 0.5, bodyLen]}
        radius={0.16}
        smoothness={4}
        position={[0, 0.55, 0]}
        castShadow
      >
        <primitive object={paint} attach="material" />
      </RoundedBox>

      {/* hood step (front = +z in local space; the group turns to face travel) */}
      <RoundedBox
        args={[1.5, 0.24, bodyLen * 0.34]}
        radius={0.09}
        smoothness={3}
        position={[0, 0.82, bodyLen * 0.31]}
        castShadow
      >
        <primitive object={paint} attach="material" />
      </RoundedBox>

      {/* trunk step */}
      <RoundedBox
        args={[1.5, 0.22, bodyLen * 0.26]}
        radius={0.08}
        smoothness={3}
        position={[0, 0.81, -bodyLen * 0.35]}
        castShadow
      >
        <primitive object={paint} attach="material" />
      </RoundedBox>

      {/* cabin */}
      <RoundedBox
        args={[1.38, 0.46, cabinLen]}
        radius={0.14}
        smoothness={4}
        position={[0, 1.0, cabinOffset]}
        castShadow
      >
        <primitive object={paint} attach="material" />
      </RoundedBox>

      {/* thin chrome trim along both flanks */}
      {[-0.815, 0.815].map((tx) => (
        <mesh key={`trim-${tx}`} position={[tx, 0.74, 0]}>
          <boxGeometry args={[0.02, 0.035, bodyLen * 0.78]} />
          <meshStandardMaterial color="#D6D8DC" roughness={0.15} metalness={1} />
        </mesh>
      ))}

      {/* glass house — slightly narrower so a body-colour pillar frames it */}
      <RoundedBox
        args={[1.28, 0.34, cabinLen - 0.12]}
        radius={0.1}
        smoothness={3}
        position={[0, 1.05, cabinOffset]}
      >
        <primitive object={glass} attach="material" />
      </RoundedBox>

      {/* headlights */}
      {[-0.52, 0.52].map((hx) => (
        <mesh key={hx} position={[hx, 0.62, bodyLen / 2 + 0.005]}>
          <boxGeometry args={[0.34, 0.12, 0.03]} />
          <meshStandardMaterial
            color="#FFFDF2"
            emissive="#FFF6DC"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* tail-light bar (dark when idle, flares near the billboard) */}
      <mesh position={[0, 0.66, -bodyLen / 2 - 0.005]}>
        <boxGeometry args={[1.3, 0.1, 0.03]} />
        <meshStandardMaterial
          ref={brake}
          color="#7A1017"
          emissive="#FF2436"
          emissiveIntensity={0.25}
          toneMapped={false}
        />
      </mesh>

      {/* wheels */}
      {wheelPositions.map((pos, i) => (
        <group
          key={i}
          position={pos}
          ref={(node) => {
            if (node) wheels.current[i] = node;
          }}
        >
          {/* rubber tyre */}
          <mesh rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.24, 18]} />
            <meshStandardMaterial color="#1C1C1E" roughness={0.9} />
          </mesh>
          {/* silver rim + hub spoke (shows the roll direction) */}
          <mesh rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.17, 0.17, 0.26, 16]} />
            <meshStandardMaterial color="#C9CCD1" roughness={0.25} metalness={0.9} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.27, 0.05, 0.3]} />
            <meshStandardMaterial color="#8E949B" roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* soft contact shadow (complements the shadow map at grazing angles) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[1.9, bodyLen + 0.4]} />
        <meshBasicMaterial color="#151515" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}
