import { PointMaterial, Points, useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export function AvatarPointCloud({
  modelPath,
  opacity = 0.32,
  scale = 1,
}: {
  modelPath: string;
  opacity?: number;
  scale?: number;
}) {
  const gltf = useGLTF(modelPath);

  const positions = useMemo(() => {
    const sampled: number[] = [];

    gltf.scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const position = mesh.geometry?.attributes.position;
      if (!position) return;

      const step = Math.max(1, Math.ceil(position.count / 12000));
      for (let index = 0; index < position.count; index += step) {
        const vector = new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index));
        mesh.localToWorld(vector);
        sampled.push(vector.x, vector.y, vector.z);
      }
    });

    return new Float32Array(sampled.length > 0 ? sampled : [0, 0, 0, 1, 1, 1, -1, -1, -1]);
  }, [gltf.scene]);

  return (
    <group scale={scale}>
      <Points positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial size={0.045} color="#252525" transparent opacity={opacity} depthWrite={false} />
      </Points>
    </group>
  );
}
