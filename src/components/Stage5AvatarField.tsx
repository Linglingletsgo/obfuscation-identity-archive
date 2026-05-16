import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { AvatarPointCloud } from "./AvatarPointCloud";
import { getAvatarBreathingScale } from "./stage5AvatarAnimation";

function Stage5AvatarShell() {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const scale = getAvatarBreathingScale(clock.elapsedTime);
    groupRef.current?.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[archiveVisualConfig.camera.stage5AvatarFieldRadius, 48, 32]} />
        <meshStandardMaterial
          color={archiveVisualConfig.colors.collective}
          emissive={archiveVisualConfig.colors.shared}
          emissiveIntensity={0.08}
          roughness={0.68}
          metalness={0.08}
          transparent
          opacity={0.08}
          wireframe
        />
      </mesh>
      <mesh scale={[0.78, 0.54, 0.78]}>
        <sphereGeometry args={[archiveVisualConfig.camera.stage5AvatarFieldRadius, 48, 32]} />
        <meshStandardMaterial
          color={archiveVisualConfig.colors.shared}
          emissive={archiveVisualConfig.colors.tag}
          emissiveIntensity={0.06}
          roughness={0.82}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function Stage5AvatarField() {
  return (
    <group>
      <Stage5AvatarShell />
      <Suspense fallback={null}>
        <AvatarPointCloud
          modelPath={archiveVisualConfig.assets.stage5ModelPath}
          scale={archiveVisualConfig.camera.stage5AvatarScale}
          opacity={0.5}
        />
      </Suspense>
    </group>
  );
}
