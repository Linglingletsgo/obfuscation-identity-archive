import { Suspense, useEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarNormalization, normalizePointCloudPositions, sampleObjectSurface } from "../data/avatarShape";
import { loadBakedCollectiveModelPointCloud, type BakedCollectiveModelPointCloud } from "../data/bakedPointCloud";
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
  const [bakedPointCloud, setBakedPointCloud] = useState<BakedCollectiveModelPointCloud | null | undefined>(undefined);
  const pointSamples = getCollectiveAvatarPointSamples();
  const bakedManifestPath =
    pointSamples === archiveVisualConfig.assets.stage2CollectivePointSamplesLowPower
      ? archiveVisualConfig.assets.bakedPointClouds.collectiveLow
      : archiveVisualConfig.assets.bakedPointClouds.collectiveHigh;
  const fallbackSurface = useMemo(
    () => (bakedPointCloud === null ? sampleObjectSurface(gltf.scene, pointSamples) : null),
    [bakedPointCloud, gltf.scene, pointSamples],
  );
  const visualRadius = archiveVisualConfig.camera.collectiveAvatarFieldRadius * archiveVisualConfig.camera.collectiveAvatarScale;
  const normalization = useMemo(
    () =>
      bakedPointCloud?.normalization ??
      (fallbackSurface ? getAvatarNormalization(fallbackSurface.positions, visualRadius) : null),
    [bakedPointCloud, fallbackSurface, visualRadius],
  );
  const normalizedPositions = useMemo(
    () =>
      bakedPointCloud?.positions ??
      (fallbackSurface ? normalizePointCloudPositions(fallbackSurface.positions, visualRadius) : null),
    [bakedPointCloud, fallbackSurface, visualRadius],
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
    let cancelled = false;
    loadBakedCollectiveModelPointCloud(bakedManifestPath)
      .then((pointCloud) => {
        if (!cancelled) setBakedPointCloud(pointCloud);
      })
      .catch(() => {
        if (!cancelled) setBakedPointCloud(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bakedManifestPath]);

  useEffect(() => {
    if (!normalizedPositions) return;
    onShapePositions(normalizedPositions);
  }, [normalizedPositions, onShapePositions]);

  if (!normalization || !normalizedPositions || bakedPointCloud === undefined) {
    return null;
  }

  const colors = bakedPointCloud?.colors ?? fallbackSurface?.colors;
  const partColors = bakedPointCloud?.partColors ?? fallbackSurface?.partColors;
  const partIds = bakedPointCloud?.partIds ?? fallbackSurface?.partIds;

  if (!colors || !partColors || !partIds) {
    return null;
  }

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
        colors={colors}
        opacity={opacity}
        partColors={partColors}
        partIds={partIds}
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
