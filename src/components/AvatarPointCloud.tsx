import { PointMaterial, Points, useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarBreathingScale, getAvatarPointOpacity } from "./stage5AvatarAnimation";

export function normalizePointCloudPositions(positions: Float32Array, radius: number): Float32Array {
  if (positions.length < 3) return positions;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    minY = Math.min(minY, positions[index + 1]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxX = Math.max(maxX, positions[index]);
    maxY = Math.max(maxY, positions[index + 1]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  let sourceRadius = 0;

  for (let index = 0; index < positions.length; index += 3) {
    sourceRadius = Math.max(
      sourceRadius,
      Math.hypot(positions[index] - centerX, positions[index + 1] - centerY, positions[index + 2] - centerZ),
    );
  }

  const scale = sourceRadius > 0 ? radius / sourceRadius : 1;
  const normalized = new Float32Array(positions.length);
  for (let index = 0; index < positions.length; index += 3) {
    normalized[index] = Number(((positions[index] - centerX) * scale).toFixed(4));
    normalized[index + 1] = Number(((positions[index + 1] - centerY) * scale).toFixed(4));
    normalized[index + 2] = Number(((positions[index + 2] - centerZ) * scale).toFixed(4));
  }

  return normalized;
}

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
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

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

    return normalizePointCloudPositions(
      new Float32Array(sampled.length > 0 ? sampled : [0, 0, 0, 1, 1, 1, -1, -1, -1]),
      archiveVisualConfig.camera.stage5AvatarFieldRadius,
    );
  }, [gltf.scene]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const breathingScale = getAvatarBreathingScale(time + 1.4);
    groupRef.current?.scale.setScalar(scale * breathingScale);
    if (materialRef.current) {
      materialRef.current.opacity = getAvatarPointOpacity(time, opacity);
      materialRef.current.size = 0.045 * (0.92 + Math.sin(time * 1.1) * 0.08);
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      <Points positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          ref={materialRef}
          size={0.045}
          color={archiveVisualConfig.colors.collective}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}
