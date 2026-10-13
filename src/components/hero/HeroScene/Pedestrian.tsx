import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAPTURE, LOOP_S, loopRate } from "./clock";

const Z_START = -30;
const Z_END = 10;
const TRACK = Z_END - Z_START;

/**
 * Capture mode: walkers loop a shorter track in exactly LOOP_S, anchored at
 * the near (off-frame) end so half of every fade happens out of view.
 */
const FADE_M = 1.6;

const BILLBOARD_X = -11.4;
const BILLBOARD_Z = -5;

/** Muted neutrals are palette-derived (ivory × ink); outfits stay in-palette. */
const INK = "#151515";
const IVORY = "#F5F0E8";
const RED = "#E63843";
const LIME = "#D8FF63";
const NEUTRAL = "#8A7F72";

export interface PedestrianConfig {
  id: string;
  /** Footpath lane: 0 = kerb side, 2 = closest to the billboard posts. */
  lane: 0 | 1 | 2;
  /** Loop phase 0..1 (partners in a lane sit half a track apart). */
  offset: number;
  /** Units per second along the lane. 0 = standing still (watcher). */
  speed: number;
  dir: 1 | -1;
  /** Height multiplier (natural variation). */
  scale: number;
  outfit: string;
  trousers: string;
  /** 0 = keeps looking ahead, 1 = turns fully to watch the billboard. */
  look: number;
  bag?: "laptop" | "none";
  runner?: boolean;
  /** Extra body lean (runner / brisk walker). */
  lean?: number;
  gait: number;
  /** Standing watchers only: face the board directly. */
  pose?: "watch" | "point" | undefined;
  /** Standing watchers step off the walking lane (bench-side clear spot). */
  xOverride?: number;
}

const LANE_X: Record<0 | 1 | 2, number> = { 0: -4.15, 1: -4.9, 2: -5.55 };

/**
 * Nine procedurally-built pedestrians with real walk/run cycles and an
 * explicit story: almost everyone turns to watch the billboard, two figures
 * stand still by the bench (one pointing at the board), and heads track it by
 * proximity. Lanes never cross; same-lane partners share speed with a
 * half-track phase, so figures never overlap or clip the posts.
 */
export default function Pedestrian({ cfg }: { cfg: PedestrianConfig }) {
  const root = useRef<THREE.Group | null>(null);
  const body = useRef<THREE.Group | null>(null);
  const head = useRef<THREE.Group | null>(null);
  const legL = useRef<THREE.Group | null>(null);
  const legR = useRef<THREE.Group | null>(null);
  const armL = useRef<THREE.Group | null>(null);
  const armR = useRef<THREE.Group | null>(null);

  const x = cfg.xOverride ?? LANE_X[cfg.lane];
  const standing = cfg.speed === 0;
  const materials = useRef<THREE.Material[]>([]);

  // capture only: walkers fade in/out at their (shorter) loop ends, so the
  // exported video has no popping figures
  useEffect(() => {
    if (!CAPTURE || standing || !root.current) return;
    const mats: THREE.Material[] = [];
    root.current.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && !mats.includes(m)) {
        m.transparent = true;
        // opaque materials are compiled with alpha forced to 1: recompile
        m.needsUpdate = true;
        mats.push(m);
      }
    });
    materials.current = mats;
  }, [standing]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // ---- travel along the footpath lane (seamless loop; 0 = planted) ----
    let z: number;
    if (CAPTURE && !standing) {
      const len = cfg.speed * LOOP_S; // one lap per loop at the real walking speed
      const along = (t * cfg.speed + cfg.offset * len) % len;
      z = cfg.dir === 1 ? Z_END - along : Z_END - len + along;
      const fade = Math.min(1, along / FADE_M, (len - along) / FADE_M);
      for (const m of materials.current) m.opacity = fade;
    } else {
      const travelled = standing ? cfg.offset * TRACK : (t * cfg.speed + cfg.offset * TRACK) % TRACK;
      z = cfg.dir === 1 ? Z_END - travelled : Z_START + travelled;
    }

    // ---- walk / run cycle ----
    const cadence = loopRate(cfg.gait * (cfg.runner ? 1.9 : 1.15));
    const phase = t * cadence + cfg.offset * 6.28;
    const swing = cfg.runner ? 0.95 : 0.6;
    const s = Math.sin(phase);
    // idle breathing for standing watchers
    const breath = Math.sin(t * loopRate(1.4) + cfg.offset * 5) * 0.012;

    if (root.current) {
      root.current.position.set(x, 0, z);
      // walkers face along travel; watchers face the billboard
      const faceDir = cfg.dir === 1 ? Math.PI : 0;
      root.current.rotation.y = standing
        ? Math.atan2(BILLBOARD_X - x, BILLBOARD_Z - z)
        : faceDir;
      root.current.scale.setScalar(cfg.scale);
    }
    if (body.current) {
      body.current.position.y = (standing ? 0 : Math.abs(Math.sin(phase)) * 0.035) + breath;
      body.current.rotation.x = standing ? 0.02 : (cfg.lean ?? 0);
    }
    if (legL.current) legL.current.rotation.x = standing ? 0.03 : s * swing;
    if (legR.current) legR.current.rotation.x = standing ? -0.03 : -s * swing;

    // arms
    if (cfg.pose === "point") {
      // right arm raised, pointing at the board
      if (armL.current) armL.current.rotation.x = standing ? -0.15 : -s * swing * 0.5;
      if (armR.current) {
        armR.current.rotation.x = -1.9;
        armR.current.rotation.z = -0.25;
      }
    } else {
      if (armL.current) armL.current.rotation.x = standing ? breath * 2 : -s * swing * 0.72;
      if (armR.current) armR.current.rotation.x = standing ? -breath * 2 : s * swing * 0.72;
      if (armR.current) armR.current.rotation.z = 0;
    }

    // ---- head turns toward the billboard, eased by proximity ----
    if (head.current) {
      if (standing) {
        // fixed upward gaze at the face
        head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, 0, 0.1);
        head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, -0.18, 0.08);
      } else {
        const dz = BILLBOARD_Z - z;
        const prox = THREE.MathUtils.clamp(1 - Math.abs(dz) / 17, 0, 1);
        const flat = Math.atan2(BILLBOARD_X - x, dz);
        const yaw = THREE.MathUtils.clamp(flat, -1.2, 1.2) * prox * cfg.look;
        head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, yaw, 0.08);
        head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, 0, 0.08);
        head.current.rotation.z = THREE.MathUtils.lerp(
          head.current.rotation.z,
          -yaw * 0.12,
          0.08
        );
      }
    }
  });

  const skin = NEUTRAL;

  return (
    <group ref={root} name={`walker-${cfg.id}`} position={[x, 0, Z_END]}>
      <group ref={body}>
        {/* legs */}
        <group ref={legL} position={[-0.1, 0.78, 0]}>
          <mesh position={[0, -0.34, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.55, 4, 8]} />
            <meshStandardMaterial color={cfg.trousers} roughness={0.9} />
          </mesh>
          {/* shoe */}
          <mesh position={[0, -0.68, 0.05]} castShadow>
            <boxGeometry args={[0.1, 0.07, 0.2]} />
            <meshStandardMaterial color={INK} roughness={0.8} />
          </mesh>
        </group>
        <group ref={legR} position={[0.1, 0.78, 0]}>
          <mesh position={[0, -0.34, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.55, 4, 8]} />
            <meshStandardMaterial color={cfg.trousers} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.68, 0.05]} castShadow>
            <boxGeometry args={[0.1, 0.07, 0.2]} />
            <meshStandardMaterial color={INK} roughness={0.8} />
          </mesh>
        </group>

        {/* torso */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <capsuleGeometry args={[0.165, 0.42, 6, 12]} />
          <meshStandardMaterial color={cfg.outfit} roughness={0.85} />
        </mesh>

        {/* laptop bag */}
        {cfg.bag === "laptop" ? (
          <>
            <mesh position={[0.24, 0.92, 0.06]} rotation-z={-0.12} castShadow>
              <boxGeometry args={[0.1, 0.34, 0.3]} />
              <meshStandardMaterial color={INK} roughness={0.85} />
            </mesh>
            <mesh position={[0.06, 1.24, 0.1]} rotation-z={0.5} rotation-x={0.2}>
              <boxGeometry args={[0.035, 0.5, 0.03]} />
              <meshStandardMaterial color={INK} roughness={0.9} />
            </mesh>
          </>
        ) : null}

        {/* phone in the left hand (standing watchers scrolling) */}
        {standing ? (
          <mesh position={[-0.26, 1.02, 0.14]} rotation-x={-0.7} castShadow>
            <boxGeometry args={[0.07, 0.13, 0.02]} />
            <meshStandardMaterial
              color="#22262B"
              emissive="#F5F0E8"
              emissiveIntensity={0.25}
              roughness={0.4}
            />
          </mesh>
        ) : null}

        {/* arms */}
        <group ref={armL} position={[-0.225, 1.32, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.38, 4, 8]} />
            <meshStandardMaterial color={cfg.outfit} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.47, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={skin} roughness={0.9} />
          </mesh>
        </group>
        <group ref={armR} position={[0.225, 1.32, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.38, 4, 8]} />
            <meshStandardMaterial color={cfg.outfit} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.47, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={skin} roughness={0.9} />
          </mesh>
        </group>

        {/* head */}
        <group ref={head} position={[0, 1.52, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.135, 16, 16]} />
            <meshStandardMaterial color={skin} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.055, -0.015]} scale={[1.02, 0.72, 1.02]}>
            <sphereGeometry args={[0.138, 14, 14]} />
            <meshStandardMaterial color={INK} roughness={1} />
          </mesh>
        </group>

        {/* runner accent stripe */}
        {cfg.runner ? (
          <mesh position={[0, 1.18, 0.14]} rotation-x={0.15}>
            <boxGeometry args={[0.2, 0.05, 0.12]} />
            <meshStandardMaterial color={LIME} roughness={0.7} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

/**
 * Nine figures with a crowd story: everyone on the board's side turns their
 * head, two stand still watching (one pointing it out), and the runners and
 * far-lane walkers keep the street alive. Partners share lane speed with a
 * half-track phase offset so they can never collide.
 */
export const pedestrians: PedestrianConfig[] = [
  // 1 — commuter with laptop bag, glancing over
  {
    id: "commuter",
    lane: 0,
    offset: 0,
    speed: 1.35,
    dir: 1,
    scale: 1.0,
    outfit: IVORY,
    trousers: INK,
    look: 0.7,
    bag: "laptop",
    gait: 5.4,
  },
  // 5 — office-goer A (partner, talking)
  {
    id: "office-a",
    lane: 0,
    offset: 0.5,
    speed: 1.35,
    dir: 1,
    scale: 0.96,
    outfit: INK,
    trousers: NEUTRAL,
    look: 0.5,
    gait: 5.4,
  },
  // 2 — brisk walker, eyes locked on the board
  {
    id: "brisk",
    lane: 1,
    offset: 0.12,
    speed: 1.85,
    dir: -1,
    scale: 1.04,
    outfit: RED,
    trousers: INK,
    look: 1,
    lean: 0.1,
    gait: 6.2,
  },
  // 6 — office-goer B (partner)
  {
    id: "office-b",
    lane: 1,
    offset: 0.62,
    speed: 1.85,
    dir: -1,
    scale: 0.99,
    outfit: NEUTRAL,
    trousers: INK,
    look: 0.6,
    gait: 6.2,
  },
  // 3 — runner (faster cycle, barely notices)
  {
    id: "runner",
    lane: 2,
    offset: 0,
    speed: 2.9,
    dir: 1,
    scale: 1.02,
    outfit: INK,
    trousers: NEUTRAL,
    look: 0.25,
    runner: true,
    lean: 0.2,
    gait: 7.6,
  },
  // 7 — walker gawking at the board
  {
    id: "gawker",
    lane: 2,
    offset: 0.34,
    speed: 1.1,
    dir: -1,
    scale: 1.0,
    outfit: LIME,
    trousers: INK,
    look: 1,
    gait: 4.2,
  },
  // 4 — STANDING watcher by the bench, phone lowered, face tilted up
  {
    id: "watcher-standing",
    lane: 1,
    offset: 0.26,
    speed: 0,
    dir: 1,
    scale: 1.06,
    outfit: IVORY,
    trousers: NEUTRAL,
    look: 1,
    gait: 3.4,
    pose: "watch",
    xOverride: -5.95,
  },
  // 8 — STANDING watcher pointing at the board for their friend
  {
    id: "pointing",
    lane: 0,
    offset: 0.3,
    speed: 0,
    dir: 1,
    scale: 1.02,
    outfit: RED,
    trousers: INK,
    look: 1,
    gait: 3.4,
    pose: "point",
    xOverride: -6.2,
  },
  // 9 — slow walker trailing behind the pointing pair
  {
    id: "trailing",
    lane: 1,
    offset: 0.15,
    speed: 0.9,
    dir: 1,
    scale: 0.94,
    outfit: NEUTRAL,
    trousers: INK,
    look: 0.85,
    gait: 3.8,
  },
];
