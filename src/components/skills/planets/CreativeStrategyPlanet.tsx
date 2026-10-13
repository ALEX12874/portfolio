import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { IVORY, RED, type PlanetBodyProps } from "./shared";

const IVORY_C = new THREE.Color(IVORY);
const RED_C = new THREE.Color(RED);

/**
 * 03 Creative Strategy & Campaign Ideation — a cut-gem idea: a flat-shaded
 * icosahedron with alternating ivory and red facets and polished metal edges,
 * caged by two intersecting square rings (an octahedron frame) that rotate
 * at different speeds.
 */
export default function CreativeStrategyPlanet({ size, active, animate }: PlanetBodyProps) {
  const body = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(size, 0); // polyhedra are already non-indexed: 3 verts per facet
    const count = g.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    for (let f = 0; f < count / 3; f += 1) {
      // alternate facets, with a few repeated so the pattern feels designed, not checkered
      const c = (f + Math.floor(f / 5)) % 2 === 0 ? IVORY_C : RED_C;
      for (let v = 0; v < 3; v += 1) c.toArray(colors, (f * 3 + v) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [size]);

  /** One metal strut per icosahedron edge (30), as a single instanced mesh. */
  const edges = useMemo(() => {
    const eg = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(size * 1.004, 0));
    const pos = eg.getAttribute("position");
    const list: Array<{ mid: THREE.Vector3; q: THREE.Quaternion; len: number }> = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 2) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      const dir = b.clone().sub(a);
      list.push({
        mid: a.clone().add(b).multiplyScalar(0.5),
        q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
        len: dir.length(),
      });
    }
    eg.dispose();
    return list;
  }, [size]);

  const struts = useRef<THREE.InstancedMesh | null>(null);
  const ringA = useRef<THREE.Group | null>(null);
  const ringB = useRef<THREE.Group | null>(null);
  const edgeMat = useRef<THREE.MeshStandardMaterial | null>(null);

  useLayoutEffect(() => {
    const mesh = struts.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    edges.forEach((e, i) => {
      m.compose(e.mid, e.q, new THREE.Vector3(1, e.len, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [edges]);

  useEffect(() => () => body.dispose(), [body]);

  useFrame((_, delta) => {
    if (animate) {
      if (ringA.current) ringA.current.rotation.y += delta * 0.42;
      if (ringB.current) ringB.current.rotation.x -= delta * 0.27;
    }
    if (edgeMat.current) {
      edgeMat.current.emissiveIntensity = THREE.MathUtils.lerp(
        edgeMat.current.emissiveIntensity,
        active ? 0.35 : 0,
        0.1
      );
    }
  });

  const ringR = size * 1.55;
  const tube = size * 0.022;

  return (
    <group>
      {/* faceted gem body */}
      <mesh geometry={body}>
        <meshStandardMaterial vertexColors flatShading roughness={0.42} metalness={0.18} />
      </mesh>

      {/* polished metal edges */}
      <instancedMesh ref={struts} args={[undefined, undefined, edges.length]}>
        <cylinderGeometry args={[size * 0.022, size * 0.022, 1, 6]} />
        <meshStandardMaterial
          ref={edgeMat}
          color={IVORY}
          roughness={0.18}
          metalness={1}
          emissive={IVORY}
          emissiveIntensity={0}
        />
      </instancedMesh>

      {/* octahedron frame: two square rings, intersecting, counter-rotating */}
      <group ref={ringA}>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
          <torusGeometry args={[ringR, tube, 6, 4]} />
          <meshStandardMaterial color={RED} roughness={0.25} metalness={0.85} />
        </mesh>
      </group>
      <group ref={ringB} rotation-z={0.5}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[ringR * 1.04, tube, 6, 4]} />
          <meshStandardMaterial color={IVORY} roughness={0.22} metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}
