import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const TRAIL_POINTS = 18;

function createTrailGeometry() {
  const positions = new Float32Array((TRAIL_POINTS - 1) * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  return geometry;
}

export function CollectivePointerTrails() {
  const { camera, pointer, raycaster } = useThree();
  const geometry = useMemo(createTrailGeometry, []);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#1f6fff",
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );
  const pointsRef = useRef<THREE.Vector3[]>([]);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const currentPoint = useMemo(() => new THREE.Vector3(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(plane, currentPoint)) return;

    const points = pointsRef.current;
    const lastPoint = points[points.length - 1];
    if (!lastPoint || lastPoint.distanceTo(currentPoint) > 0.08) {
      points.push(currentPoint.clone());
      if (points.length > TRAIL_POINTS) points.shift();
    }

    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    let offset = 0;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const next = points[index];
      array[offset] = previous.x;
      array[offset + 1] = previous.y;
      array[offset + 2] = previous.z + 0.02;
      array[offset + 3] = next.x;
      array[offset + 4] = next.y;
      array[offset + 5] = next.z + 0.02;
      offset += 6;
    }

    position.needsUpdate = true;
    geometry.setDrawRange(0, Math.max(0, points.length - 1) * 2);
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={32} />;
}
