import { Suspense, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarNormalization, normalizePointCloudPositions, sampleObjectSurface } from "../data/avatarShape";
import { getCollectiveAvatarPointSamples } from "../utils/renderingPerformance";
import { CollectiveModelPointCloud } from "./CollectiveModelPointCloud";

const MIN_MODEL_OPACITY = 0.01;

function LoadedCollectiveAvatarField({
  onShapePositions,
  opacity,
}: {
  onShapePositions: (positions: Float32Array) => void;
  opacity: number;
}) {
  const gltf = useGLTF(archiveVisualConfig.assets.stage2CollectiveModelPath);
  const surface = useMemo(
    () => sampleObjectSurface(gltf.scene, getCollectiveAvatarPointSamples()),
    [gltf.scene],
  );
  const visualRadius = archiveVisualConfig.camera.collectiveAvatarFieldRadius * archiveVisualConfig.camera.collectiveAvatarScale;
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
        cloned.depthWrite = false;
        return cloned;
      });
    });
    return scene;
  }, [gltf.scene]);

  useEffect(() => {
    materializedScene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        material.opacity = 0.18 * opacity;
      }
    });
  }, [materializedScene, opacity]);

  useEffect(
    () => () => {
      materializedScene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          material.dispose();
        }
      });
    },
    [materializedScene],
  );

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
        <primitive object={materializedScene} visible={opacity > MIN_MODEL_OPACITY} />
      </group>
      <CollectiveModelPointCloud
        colors={surface.colors}
        opacity={opacity}
        partColors={surface.partColors}
        partIds={surface.partIds}
        positions={normalizedPositions}
      />
    </group>
  );
}

export function CollectiveAvatarField({
  onShapePositions,
  opacity = 1,
}: {
  onShapePositions: (positions: Float32Array) => void;
  opacity?: number;
}) {
  return (
    <Suspense fallback={null}>
      <LoadedCollectiveAvatarField onShapePositions={onShapePositions} opacity={opacity} />
    </Suspense>
  );
}
