import { Suspense, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarNormalization, normalizePointCloudPositions, sampleObjectSurface } from "../data/avatarShape";
import { Stage2ModelPointCloud } from "./Stage2ModelPointCloud";

function LoadedStage5AvatarField({
  onShapePositions,
}: {
  onShapePositions: (positions: Float32Array) => void;
}) {
  const gltf = useGLTF(archiveVisualConfig.assets.stage2CollectiveModelPath);
  const surface = useMemo(() => sampleObjectSurface(gltf.scene), [gltf.scene]);
  const visualRadius = archiveVisualConfig.camera.stage5AvatarFieldRadius * archiveVisualConfig.camera.stage5AvatarScale;
  const normalization = useMemo(
    () => getAvatarNormalization(surface.positions, visualRadius),
    [surface.positions, visualRadius],
  );
  const normalizedPositions = useMemo(
    () => normalizePointCloudPositions(surface.positions, visualRadius),
    [surface.positions, visualRadius],
  );
  const materializedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.frustumCulled = false;
      mesh.renderOrder = 0;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = materials.map((material) => {
        const cloned = material.clone();
        cloned.transparent = true;
        cloned.opacity = 0.18;
        cloned.depthWrite = false;
        return cloned;
      });
    });
    return scene;
  }, [gltf.scene]);

  useEffect(() => {
    onShapePositions(normalizedPositions);
  }, [normalizedPositions, onShapePositions]);

  return (
    <group>
      <group
        position={[
          -normalization.center.x * normalization.scale,
          -normalization.center.y * normalization.scale,
          -normalization.center.z * normalization.scale,
        ]}
        scale={normalization.scale}
      >
        <primitive object={materializedScene} />
      </group>
      <Stage2ModelPointCloud colors={surface.colors} positions={normalizedPositions} />
    </group>
  );
}

export function Stage5AvatarField({
  onShapePositions,
}: {
  onShapePositions: (positions: Float32Array) => void;
}) {
  return (
    <Suspense fallback={null}>
      <LoadedStage5AvatarField onShapePositions={onShapePositions} />
    </Suspense>
  );
}
