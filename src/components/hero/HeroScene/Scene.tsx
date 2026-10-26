import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Road from "./Road";
import Footpath from "./Footpath";
import Billboard from "./Billboard";
import Car from "./Car";
import Pedestrian, { pedestrians } from "./Pedestrian";
import Environment from "./Environment";
import Rig from "./Rig";
import { CAPTURE, CAPTURE_VARIANT } from "./clock";

/**
 * Quality tier: "high" on landscape screens ≥ 900 px; "low" on tablets
 * (dpr ≤ 1.25, no shadows, half the pedestrians).
 */
export type SceneTier = "high" | "low";

interface SceneProps {
  /** Pause the render loop while the hero is off-screen. */
  active: boolean;
  /** Pointer parallax (disabled on touch / calm motion). */
  parallax: boolean;
  tier?: SceneTier;
  /** Called once if the device can't hold its frame rate (or loses WebGL). */
  onLowFps?: () => void;
  /** Called once shaders are compiled and the first frames are on screen. */
  onReady?: () => void;
  /** Pointer events reach the scene (off while it warms up invisibly). */
  interactive?: boolean;
}

interface Quality {
  dpr: number;
  shadows: boolean;
  crowd: "full" | "half";
}

const QUALITY: Record<SceneTier, Quality> = {
  high: { dpr: 1.5, shadows: true, crowd: "full" },
  low: { dpr: 1.25, shadows: false, crowd: "half" },
};
/** The one cheaper step tried before giving up on live 3D. */
const CHEAPEST: Quality = { dpr: 1, shadows: false, crowd: "half" };

/** Camera framings: live = the designed hero; wide/phone = the two videos. */
interface Framing {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}
const LIVE: Framing = { position: [24.37, 2.2, 6.31], lookAt: [-7.3, 7.5, -2.61], fov: 32 };
const FRAMINGS: Record<"wide" | "phone", Framing> = {
  // 1280×1024 video: board ≈ 76% of the width, crowd + car at the base
  wide: { position: [24.37, 2.2, 6.31], lookAt: [-7.3, 7.0, -2.61], fov: 27 },
  // 960×864 video, zoomed out: board ≈ 70% of the width with both towers,
  // the crowd and the road in frame
  phone: { position: [24.37, 2.2, 6.31], lookAt: [-7.07, 5.9, -3.36], fov: 33.3 },
};

/** `?cam=x,y,z&look=x,y,z&fov=n` overrides the capture camera (tuning only). */
function captureFraming(): Framing {
  const base = FRAMINGS[CAPTURE_VARIANT];
  const q = new URLSearchParams(window.location.search);
  const vec = (k: string) => {
    const v = q.get(k)?.split(",").map(Number);
    return v && v.length === 3 && v.every(Number.isFinite) ? (v as [number, number, number]) : undefined;
  };
  return {
    position: vec("cam") ?? base.position,
    lookAt: vec("look") ?? base.lookAt,
    fov: Number(q.get("fov")) || base.fov,
  };
}

declare global {
  interface Window {
    __setSceneTime?: (seconds: number) => void;
    __heroAssetsReady?: boolean;
  }
}

/** Capture mode: render exactly the requested timestamp on demand. */
function CaptureController() {
  const advance = useThree((s) => s.advance);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    (window as unknown as { __heroScene?: THREE.Scene }).__heroScene = scene;
    // used by scripts/render-hero.mjs to measure the billboard in each video
    (window as unknown as { __heroCamera?: THREE.Camera }).__heroCamera = camera;
    THREE.DefaultLoadingManager.onLoad = () => {
      window.__heroAssetsReady = true;
    };
    window.__setSceneTime = (seconds: number) => advance(seconds);
    advance(0.0001);
    return () => {
      window.__setSceneTime = undefined;
    };
  }, [advance, scene, camera]);
  return null;
}

const WARMUP_S = 2.5; // skip shader compile + texture upload after the first frame
const REWARM_S = 1; // settle time after stepping quality down
const SAMPLE_S = 3; // then take the median frame time over 3 s
const SLOW_MS = 40; // median slower than 25 fps = too slow

/**
 * Adaptive quality guard. Waits out the heavy first seconds, then measures
 * the *median* frame time (spikes don't count). Too slow: `onSlow` either
 * steps quality down (returns true → measure again) or gives up.
 */
function FrameGuard({ onSlow }: { onSlow: () => boolean }) {
  const t = useRef({ wait: WARMUP_S, sampled: 0, samples: [] as number[], done: false });
  useFrame((_, delta) => {
    const s = t.current;
    if (s.done) return;
    if (s.wait > 0) {
      s.wait -= delta;
      return;
    }
    s.samples.push(delta * 1000);
    s.sampled += delta;
    if (s.sampled < SAMPLE_S) return;
    const sorted = [...s.samples].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    if (median > SLOW_MS && onSlow()) {
      s.wait = REWARM_S;
      s.sampled = 0;
      s.samples = [];
      return;
    }
    s.done = true;
  });
  return null;
}

/**
 * Builds the scene a piece per frame while the poster still covers the
 * stage (each piece is a short task instead of one long freeze).
 */
function Stager({ stage, total, next }: { stage: number; total: number; next: () => void }) {
  useEffect(() => {
    if (stage >= total) return undefined;
    let t = 0;
    const raf = requestAnimationFrame(() => {
      t = window.setTimeout(next, 0);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [stage, total, next]);
  return null;
}

interface ProgramLike {
  isReady: () => boolean;
  getUniforms: () => unknown;
}

/**
 * Prepares every shader before the first frame, without one long freeze:
 * 1. starts compiling all programs (they compile in parallel on the GPU,
 *    KHR_parallel_shader_compile);
 * 2. waits — without blocking — until they are linked;
 * 3. reads each program's uniforms (a burst of synchronous GPU queries per
 *    program, the part that used to freeze the first frame) in ~10 ms slices.
 * Mounted inside the scene's Suspense boundary, so textures are in by then.
 */
function Compile({ onCompiled }: { onCompiled: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let live = true;
    let t = 0;
    const done = () => {
      if (live) onCompiled();
    };
    let programs: ProgramLike[] = [];
    try {
      const materials = gl.compile(scene, camera) as unknown as Set<THREE.Material>;
      const seen = new Set<ProgramLike>();
      materials.forEach((m) => {
        const p = (gl.properties.get(m) as { currentProgram?: ProgramLike }).currentProgram;
        if (p && !seen.has(p)) seen.add(p);
      });
      programs = [...seen];
    } catch {
      done(); // preparing ahead is an optimisation only
      return undefined;
    }
    const parallel = !!gl.extensions.get("KHR_parallel_shader_compile");
    const readUniforms = () => {
      if (!live) return;
      const start = performance.now();
      while (programs.length && performance.now() - start < 10) {
        try {
          programs.shift()?.getUniforms();
        } catch {
          // a failing program shows up (and is reported) on first render
        }
      }
      if (programs.length) t = window.setTimeout(readUniforms, 0);
      else done();
    };
    const waitLinked = () => {
      if (!live) return;
      if (!parallel || programs.every((p) => p.isReady())) readUniforms();
      else t = window.setTimeout(waitLinked, 16);
    };
    waitLinked();
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [gl, scene, camera, onCompiled]);
  return null;
}

/**
 * The very first frame uploads every mesh to the GPU. Instead of one long
 * frame, the meshes are revealed and drawn a group at a time (one per frame),
 * still invisible under the poster; then the render loop takes over.
 */
function Upload({ groups, onDone }: { groups: React.MutableRefObject<(THREE.Group | null)[]>; onDone: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    // hide meshes only — never lights: a change in the lights would need new
    // shader variants and undo the compiling done ahead
    const list = groups.current
      .filter((g): g is THREE.Group => !!g)
      .map((g) => {
        const meshes: { obj: THREE.Object3D; was: boolean }[] = [];
        g.traverse((o) => {
          if ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) {
            meshes.push({ obj: o, was: o.visible });
            o.visible = false;
          }
        });
        return meshes;
      });
    let i = 0;
    let raf = 0;
    let t = 0;
    let live = true;
    const step = () => {
      if (!live) return;
      if (i >= list.length) {
        onDone();
        return;
      }
      list[i].forEach((m) => {
        m.obj.visible = m.was;
      });
      i += 1;
      try {
        gl.render(scene, camera);
      } catch {
        // drawing ahead is an optimisation only
      }
      raf = requestAnimationFrame(() => {
        t = window.setTimeout(step, 0);
      });
    };
    step();
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      list.flat().forEach((m) => {
        m.obj.visible = m.was;
      });
    };
    // runs once, after compiling; the groups are final by then
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);
  return null;
}

/** Reports ready after a few rendered frames, so the crossfade never janks. */
function Warmup({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const tick = () => {
      frames += 1;
      if (frames >= 3) onReady?.();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onReady]);
  return null;
}

/**
 * Traffic (left-hand, as in India): the near lane (x −1.7, beside the
 * footpath) drives toward −z with the footpath on the drivers' left; the far
 * lane (x +1.7) drives the opposite way. Three cars per lane at equal speed
 * with thirds-phase offsets, so cars in a lane can never collide.
 *
 * Paint: each colour used once, light/dark alternating within a lane, no two
 * neighbours alike. The red car is clearcoat paint, never a flat billboard red.
 */
const CARS = [
  // near lane: light · dark · light
  { color: "#F5F0E8", x: -1.7, dir: 1 as const, speed: 6.4, offset: 0, variant: "sedan" as const }, // Pearl White
  { color: "#2A2A2D", x: -1.7, dir: 1 as const, speed: 6.4, offset: 1 / 3, variant: "hatch" as const }, // Graphite
  { color: "#CDB88F", x: -1.7, dir: 1 as const, speed: 6.4, offset: 2 / 3, variant: "sedan" as const }, // Champagne Sand
  // far lane: dark · light · dark
  { color: "#E63843", x: 1.7, dir: -1 as const, speed: 5.4, offset: 0, variant: "hatch" as const }, // Signature Red
  { color: "#5C6B7A", x: 1.7, dir: -1 as const, speed: 5.4, offset: 1 / 3, variant: "sedan" as const }, // Steel Blue-Grey
  { color: "#1F4D3A", x: 1.7, dir: -1 as const, speed: 5.4, offset: 2 / 3, variant: "sedan" as const }, // Forest Green
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
export default function Scene({ active, parallax, tier = "high", onLowFps, onReady, interactive = true }: SceneProps) {
  const framing = CAPTURE ? captureFraming() : LIVE;
  const [quality, setQuality] = useState<Quality>(() => (CAPTURE ? QUALITY.high : QUALITY[tier]));
  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  // first try one cheaper step (dpr 1, no shadows, half the crowd); only if
  // that is still too slow does the hero hand over to the video
  const onSlow = useCallback(() => {
    const q = qualityRef.current;
    if (q.dpr > CHEAPEST.dpr || q.shadows || q.crowd === "full") {
      setQuality(CHEAPEST);
      return true;
    }
    onLowFps?.();
    return false;
  }, [onLowFps]);

  const crowd = quality.crowd === "full" ? pedestrians : pedestrians.filter((_, i) => i % 2 === 0);

  // built in steps: ground + skyline, cars, the crowd four at a time, the board
  const crowdSteps = Math.ceil(crowd.length / 4);
  const total = 3 + crowdSteps;
  const [stage, setStage] = useState(CAPTURE ? 99 : 0);
  const nextStage = useCallback(() => setStage((n) => n + 1), []);
  const [compiled, setCompiled] = useState(CAPTURE);
  const onCompiled = useCallback(() => setCompiled(true), []);
  const [uploaded, setUploaded] = useState(CAPTURE);
  const onUploaded = useCallback(() => setUploaded(true), []);
  const crowdChunks = Array.from({ length: crowdSteps }, (_, c) => crowd.slice(c * 4, c * 4 + 4));
  // one group per build step, revealed one per frame on the first upload
  const groups = useRef<(THREE.Group | null)[]>([]);
  const setGroup = (k: number) => (g: THREE.Group | null) => {
    groups.current[k] = g;
  };

  return (
    <Canvas
      shadows
      // R3F sets pointer-events on its own wrapper, so the switch lives here
      style={{ pointerEvents: interactive ? "auto" : "none" }}
      dpr={CAPTURE ? 1 : [1, quality.dpr]}
      // the render loop starts once the scene has been uploaded piece by piece
      frameloop={CAPTURE ? "never" : active && uploaded ? "always" : "never"}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: CAPTURE,
      }}
      camera={{ position: framing.position, fov: framing.fov, near: 0.1, far: 260 }}
      onCreated={({ camera, gl }) => {
        // transparent canvas: the page background is the sky
        gl.setClearColor(0x000000, 0);
        // filmic response so the footpath never reads as white glare
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.85;
        camera.lookAt(...framing.lookAt);
        // iOS Safari caps live WebGL contexts: on loss, hand over to the video
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            onLowFps?.();
          },
          { once: true }
        );
      }}
    >
      {CAPTURE ? <CaptureController /> : <FrameGuard onSlow={onSlow} />}

      {/* haze: crisp foreground, far row dissolving into the ivory page */}
      <fog attach="fog" args={["#F5F0E8", 52, 115]} />

      {/* low ambient: shadows stay readable under 0.85 exposure */}
      <ambientLight intensity={0.3} color="#F5F0E8" />
      <hemisphereLight args={["#F5F0E8", "#8A7F72", 0.45]} />

      {/* key sun — warm, from the camera side, casts across the road */}
      <directionalLight
        castShadow={quality.shadows}
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

      {CAPTURE ? null : <Stager stage={stage} total={total} next={nextStage} />}
      <Suspense fallback={null}>
        <Rig enabled={parallax && !CAPTURE}>
          <group rotation-y={0.36} position={[5, 0, -2]}>
            {stage >= 1 ? (
              <group ref={setGroup(0)}>
                <Road />
                <Footpath />
                <Environment />
              </group>
            ) : null}
            {stage >= 2 ? (
              <group ref={setGroup(1)}>
                {CARS.map((c, i) => (
                  <Car key={i} {...c} />
                ))}
              </group>
            ) : null}
            {crowdChunks.map((chunk, c) =>
              stage >= 3 + c ? (
                <group key={c} ref={setGroup(2 + c)}>
                  {chunk.map((p) => (
                    <Pedestrian key={p.id} cfg={p} />
                  ))}
                </group>
              ) : null
            )}
            {stage >= total ? (
              <group ref={setGroup(2 + crowdSteps)}>
                <Billboard />
              </group>
            ) : null}
          </group>
        </Rig>
        {CAPTURE || stage < total ? null : !compiled ? (
          <Compile onCompiled={onCompiled} />
        ) : !uploaded ? (
          <Upload groups={groups} onDone={onUploaded} />
        ) : (
          <Warmup onReady={onReady} />
        )}
      </Suspense>
    </Canvas>
  );
}
