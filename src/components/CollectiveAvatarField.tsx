import { Suspense, useEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarNormalization, normalizePointCloudPositions, sampleObjectSurface, type AvatarNormalization } from "../data/avatarShape";
import { loadBakedCollectiveModelPointCloud, type BakedCollectiveModelPointCloud } from "../data/bakedPointCloud";
import { CollectiveModelPointCloud } from "./CollectiveModelPointCloud";

const MIN_MODEL_OPACITY = 0.01;

type PreparedCollectiveAvatarFieldProps = {
  colors: Float32Array;
  normalization: AvatarNormalization;
  onShapePositions: (positions: Float32Array) => void;
  opacity: number;
  partColors: Float32Array;
  partIds: Float32Array;
  positions: Float32Array;
  scene?: THREE.Object3D;
};

function useBakedCollectivePointCloud(manifestPath: string): BakedCollectiveModelPointCloud | null | undefined {
  const [bakedPointCloud, setBakedPointCloud] = useState<BakedCollectiveModelPointCloud | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadBakedCollectiveModelPointCloud(manifestPath)
      .then((pointCloud) => {
        if (!cancelled) setBakedPointCloud(pointCloud);
      })
      .catch(() => {
        if (!cancelled) setBakedPointCloud(null);
      });
    return () => {
      cancelled = true;
    };
  }, [manifestPath]);

  return bakedPointCloud;
}

function PreparedCollectiveAvatarField({
  colors,
  normalization,
  onShapePositions,
  opacity,
  partColors,
  partIds,
  positions,
  scene,
}: PreparedCollectiveAvatarFieldProps) {
  useEffect(() => {
    onShapePositions(positions);
  }, [onShapePositions, positions]);

  useEffect(() => {
    if (!scene) return;
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.opacity = 0.18 * opacity;
    });
  }, [opacity, scene]);

  return (
    <group>
      {scene ? (
        <group
          position={[
            -normalization.center.x * normalization.scale,
            -normalization.center.y * normalization.scale,
            -normalization.center.z * normalization.scale,
          ]}
          scale={normalization.scale}
        >
          <primitive object={scene} visible={opacity > MIN_MODEL_OPACITY} />
        </group>
      ) : null}
      <CollectiveModelPointCloud
        colors={colors}
        opacity={opacity}
        partColors={partColors}
        partIds={partIds}
        positions={positions}
      />
    </group>
  );
}

function BakedCollectiveAvatarField({
  bakedPointCloud,
  onShapePositions,
  opacity,
}: {
  bakedPointCloud: BakedCollectiveModelPointCloud;
  onShapePositions: (positions: Float32Array) => void;
  opacity: number;
}) {
  return (
    <PreparedCollectiveAvatarField
      colors={bakedPointCloud.colors}
      normalization={bakedPointCloud.normalization}
      onShapePositions={onShapePositions}
      opacity={opacity}
      partColors={bakedPointCloud.partColors}
      partIds={bakedPointCloud.partIds}
      positions={bakedPointCloud.positions}
    />
  );
}

function FallbackCollectiveAvatarField({
  onShapePositions,
  opacity,
}: {
  onShapePositions: (positions: Float32Array) => void;
  opacity: number;
}) {
  const gltf = useGLTF(archiveVisualConfig.assets.stage2CollectiveModelPath);
  const pointSamples = archiveVisualConfig.assets.stage2CollectivePointSamples;
  const visualRadius = archiveVisualConfig.camera.collectiveAvatarFieldRadius * archiveVisualConfig.camera.collectiveAvatarScale;
  const fallbackSurface = useMemo(() => sampleObjectSurface(gltf.scene, pointSamples), [gltf.scene, pointSamples]);
  const normalization = useMemo(
    () => getAvatarNormalization(fallbackSurface.positions, visualRadius),
    [fallbackSurface.positions, visualRadius],
  );
  const normalizedPositions = useMemo(
    () => normalizePointCloudPositions(fallbackSurface.positions, visualRadius),
    [fallbackSurface.positions, visualRadius],
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

  useEffect(
    () => () => {
      materializedScene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) material.dispose();
      });
    },
    [materializedScene],
  );

  return (
    <PreparedCollectiveAvatarField
      colors={fallbackSurface.colors}
      normalization={normalization}
      onShapePositions={onShapePositions}
      opacity={opacity}
      partColors={fallbackSurface.partColors}
      partIds={fallbackSurface.partIds}
      positions={normalizedPositions}
      scene={materializedScene}
    />
  );
}

export function CollectiveAvatarField({
  onShapePositions,
  opacity = 1,
}: {
  onShapePositions: (positions: Float32Array) => void;
  opacity?: number;
}) {
  const bakedPointCloud = useBakedCollectivePointCloud(archiveVisualConfig.assets.bakedPointClouds.collectiveHigh);

  if (bakedPointCloud === undefined) return null;
  if (bakedPointCloud) {
    return <BakedCollectiveAvatarField bakedPointCloud={bakedPointCloud} onShapePositions={onShapePositions} opacity={opacity} />;
  }

  return (
    <Suspense fallback={null}>
      <FallbackCollectiveAvatarField onShapePositions={onShapePositions} opacity={opacity} />
    </Suspense>
  );
}
