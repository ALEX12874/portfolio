import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/*
 * Shared by the 3D scenes (hero, orbit): keep the canvas's render loop off
 * ("never") until this reports ready, so the first frame never stalls on
 * shader compiles. Place it last inside the scene's <Suspense>.
 */

/** Some GPUs report "still compiling" long after they are done: past this, read anyway. */
/**
 * For the Canvas's `gl` prop (`debug: glDebug`): reading every shader's error
 * log makes the page wait for the GPU, a freeze per shader; in production it
 * only costs time. Applied before the scene mounts, so it covers every render.
 */
export const glDebug = { checkShaderErrors: import.meta.env.DEV, onShaderError: null };

const MAX_WAIT_MS = 250;

interface ProgramLike {
  isReady: () => boolean;
  getUniforms: () => unknown;
}

/**
 * Prepares every shader before the first frame, without one long freeze:
 * 1. starts compiling all programs, a few objects per task (they then
 *    compile in parallel on the GPU, KHR_parallel_shader_compile);
 * 2. waits — without blocking — until they are linked (MAX_WAIT_MS at most);
 * 3. reads each program's uniforms (a burst of synchronous GPU queries per
 *    program, the part that used to freeze the first frame) in ~10 ms slices.
 * Mounted inside the scene's Suspense boundary, so textures are in by then.
 */
export function PrepareShaders({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let live = true;
    let t = 0;
    const done = () => {
      if (live) onReady();
    };
    let programs: ProgramLike[] = [];
    let waitStart = 0;
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
      const waited = performance.now() - waitStart > MAX_WAIT_MS;
      if (!parallel || waited || programs.every((p) => p.isReady())) readUniforms();
      else t = window.setTimeout(waitLinked, 16);
    };
    // a few objects per ~10 ms task, starting after the mount. compile(part,
    // camera, scene) would count lights inside `part` twice, so objects that
    // hold a light are left to one last whole-scene pass.
    const holdsLight = new Set<THREE.Object3D>();
    scene.traverse((o) => {
      if (!(o as THREE.Light).isLight) return;
      for (let a: THREE.Object3D | null = o; a; a = a.parent) holdsLight.add(a);
    });
    const parts: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).material && !holdsLight.has(o)) parts.push(o);
    });
    let wholeScene = false;
    scene.traverse((o) => {
      if ((o as THREE.Mesh).material && holdsLight.has(o)) wholeScene = true;
    });
    // the first material that uses the scene's environment converts it on the
    // spot (two shaders, each waited for); start the slower one early
    let pmrem: THREE.PMREMGenerator | null = null;
    if (scene.environment) {
      pmrem = new THREE.PMREMGenerator(gl);
      pmrem.compileCubemapShader();
    }
    const seen = new Set<ProgramLike>();
    const collect = (materials: Set<THREE.Material>) =>
      materials.forEach((m) => {
        const p = (gl.properties.get(m) as { currentProgram?: ProgramLike }).currentProgram;
        if (p) seen.add(p);
      });
    const compile = () => {
      if (!live) return;
      const start = performance.now();
      try {
        while (parts.length && performance.now() - start < 10) {
          collect(gl.compile(parts.shift() as THREE.Object3D, camera, scene) as unknown as Set<THREE.Material>);
        }
        if (!parts.length && wholeScene) collect(gl.compile(scene, camera) as unknown as Set<THREE.Material>);
      } catch {
        done(); // preparing ahead is an optimisation only
        return;
      }
      if (parts.length) {
        t = window.setTimeout(compile, 0);
        return;
      }
      programs = [...seen];
      waitStart = performance.now();
      waitLinked();
    };
    t = window.setTimeout(compile, pmrem ? 50 : 0);
    return () => {
      live = false;
      window.clearTimeout(t);
      pmrem?.dispose();
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

