import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const IVORY = new THREE.Color("#F5F0E8");
const LIME = new THREE.Color("#D8FF63");

interface OrbitPathProps {
  radius: number;
  inclination: number;
  active: boolean;
}

/**
 * Thin ivory orbit line at low opacity; becomes more visible (and lime
 * accented) when its planet is hovered or selected.
 */
export default function OrbitPath({ radius, inclination, active }: OrbitPathProps) {
  const mat = useRef<THREE.LineBasicMaterial | null>(null);

  const line = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 240;
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color("#F5F0E8"),
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      toneMapped: false,
    });
    mat.current = material;
    return new THREE.Line(geometry, material);
  }, [radius]);

  useEffect(() => {
    return () => {
      line.geometry.dispose();
      line.material.dispose();
      line.removeFromParent();
    };
  }, [line]);

  useFrame(() => {
    if (!mat.current) return;
    const target = active ? 0.7 : 0.1;
    mat.current.opacity = THREE.MathUtils.lerp(mat.current.opacity, target, 0.12);
    mat.current.color.lerp(active ? LIME : IVORY, 0.1);
  });

  return <primitive object={line} rotation-x={inclination} />;
}
