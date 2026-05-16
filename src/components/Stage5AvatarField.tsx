import { Suspense, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarNormalization, normalizePointCloudPositions, sampleObjectSurfacePositions } from "../data/avatarShape";
import { useArchiveStore } from "../state/archiveStore";
import { AvatarPointCloud } from "./AvatarPointCloud";
import { AvatarShapeProvider } from "./AvatarShapeContext";
import { getAvatarBreathingScale } from "./stage5AvatarAnimation";

function Stage5FallbackShell() {
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

function Stage5ModelShell({ scene, rawPositions }: { scene: THREE.Object3D; rawPositions: Float32Array }) {
  const { stage5Navigation } = useArchiveStore();
  const groupRef = useRef<Group>(null);
  const normalization = useMemo(
    () => getAvatarNormalization(rawPositions, archiveVisualConfig.camera.stage5AvatarFieldRadius),
    [rawPositions],
  );
  const shell = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      mesh.raycast = () => null;
      mesh.material = new THREE.MeshStandardMaterial({
        color: archiveVisualConfig.colors.collective,
        emissive: archiveVisualConfig.colors.shared,
        emissiveIntensity: 0.12,
        roughness: 0.58,
        metalness: 0.12,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    });
    return cloned;
  }, [scene]);

  useFrame(({ clock }) => {
    const hoverBoost = stage5Navigation.hoveredNodeId ? 0.018 : 0;
    const breathing = getAvatarBreathingScale(clock.elapsedTime) + hoverBoost;
    groupRef.current?.scale.setScalar(normalization.scale * breathing);
  });

  return (
    <group
      ref={groupRef}
      position={[
        -normalization.center.x * normalization.scale,
        -normalization.center.y * normalization.scale,
        -normalization.center.z * normalization.scale,
      ]}
    >
      <primitive object={shell} />
    </group>
  );
}

function LoadedStage5AvatarField({ children }: { children: ReactNode }) {
  const gltf = useGLTF(archiveVisualConfig.assets.stage5ModelPath);
  const rawPositions = useMemo(() => sampleObjectSurfacePositions(gltf.scene), [gltf.scene]);
  const normalizedPositions = useMemo(
    () => normalizePointCloudPositions(rawPositions, archiveVisualConfig.camera.stage5AvatarFieldRadius),
    [rawPositions],
  );

  return (
    <AvatarShapeProvider value={normalizedPositions}>
      <group>
        <Stage5ModelShell scene={gltf.scene} rawPositions={rawPositions} />
        <AvatarPointCloud positions={normalizedPositions} scale={archiveVisualConfig.camera.stage5AvatarScale} opacity={0.5} />
        {children}
      </group>
    </AvatarShapeProvider>
  );
}

export function Stage5AvatarField({ children }: { children?: ReactNode }) {
  return (
    <>
      <Stage5FallbackShell />
      <Suspense fallback={children}>
        <LoadedStage5AvatarField>{children}</LoadedStage5AvatarField>
      </Suspense>
    </>
  );
}
