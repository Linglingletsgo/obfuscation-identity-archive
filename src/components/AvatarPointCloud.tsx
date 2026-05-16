import { PointMaterial, Points } from "@react-three/drei";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarBreathingScale, getAvatarPointOpacity } from "./stage5AvatarAnimation";

export function ignoreAvatarPointCloudRaycast(): void {
  return undefined;
}

export function AvatarPointCloud({
  positions,
  opacity = 0.32,
  scale = 1,
}: {
  positions: Float32Array;
  opacity?: number;
  scale?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

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
      <Points positions={positions} stride={3} frustumCulled={false} raycast={ignoreAvatarPointCloudRaycast}>
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
