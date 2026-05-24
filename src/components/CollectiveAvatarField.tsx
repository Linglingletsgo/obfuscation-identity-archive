import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarNormalization, normalizePointCloudPositions, sampleObjectSurface, type AvatarNormalization } from "../data/avatarShape";
import { loadBakedCollectiveModelPointCloud, type BakedCollectiveModelPointCloud } from "../data/bakedPointCloud";
import { CollectiveModelPointCloud } from "./CollectiveModelPointCloud";
import { useArchiveStore } from "../state/archiveStore";
import { getAvatarRevealOpacity } from "./EntryTimeline3D";

const MIN_MODEL_OPACITY = 0.01;

type PreparedCollectiveAvatarFieldProps = {
  colors: Float32Array;
  normalization: AvatarNormalization;
  onShapePositions: (positions: Float32Array) => void;
  partColors: Float32Array;
  partIds: Float32Array;
  partNumbers: Float32Array;
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
  partColors,
  partIds,
  partNumbers,
  positions,
  scene,
}: PreparedCollectiveAvatarFieldProps) {
  const { timelineProgressRef } = useArchiveStore();
  const materialsRef = useRef<THREE.Material[]>([]);
  const primitiveRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    onShapePositions(positions);
  }, [onShapePositions, positions]);

  useEffect(() => {
    if (!scene) return;
    const materials: THREE.Material[] = [];
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.push(...meshMaterials);
    });
    materialsRef.current = materials;
  }, [scene]);

  useFrame(() => {
    const progress = timelineProgressRef.current;
    const currentOpacity = getAvatarRevealOpacity(progress);

    for (let i = 0; i < materialsRef.current.length; i++) {
      materialsRef.current[i].opacity = 0.18 * currentOpacity;
    }

    if (primitiveRef.current) {
      primitiveRef.current.visible = currentOpacity > MIN_MODEL_OPACITY;
    }
  });

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
          <primitive ref={primitiveRef} object={scene} visible={false} />
        </group>
      ) : null}
      <CollectiveModelPointCloud
        colors={colors}
        partColors={partColors}
        partIds={partIds}
        partNumbers={partNumbers}
        positions={positions}
      />
    </group>
  );
}

function BakedCollectiveAvatarField({
  bakedPointCloud,
  onShapePositions,
}: {
  bakedPointCloud: BakedCollectiveModelPointCloud;
  onShapePositions: (positions: Float32Array) => void;
}) {
  return (
    <PreparedCollectiveAvatarField
      colors={bakedPointCloud.colors}
      normalization={bakedPointCloud.normalization}
      onShapePositions={onShapePositions}
      partColors={bakedPointCloud.partColors}
      partIds={bakedPointCloud.partIds}
      partNumbers={bakedPointCloud.partNumbers}
      positions={bakedPointCloud.positions}
    />
  );
}

function FallbackCollectiveAvatarField({
  onShapePositions,
}: {
  onShapePositions: (positions: Float32Array) => void;
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
      partColors={fallbackSurface.partColors}
      partIds={fallbackSurface.partIds}
      partNumbers={fallbackSurface.partNumbers}
      positions={normalizedPositions}
      scene={materializedScene}
    />
  );
}

export function CollectiveAvatarField({
  onShapePositions,
}: {
  onShapePositions: (positions: Float32Array) => void;
}) {
  const bakedPointCloud = useBakedCollectivePointCloud(archiveVisualConfig.assets.bakedPointClouds.collectiveHigh);

  if (bakedPointCloud === undefined) return null;
  if (bakedPointCloud) {
    return <BakedCollectiveAvatarField bakedPointCloud={bakedPointCloud} onShapePositions={onShapePositions} />;
  }

  return (
    <Suspense fallback={null}>
      <FallbackCollectiveAvatarField onShapePositions={onShapePositions} />
    </Suspense>
  );
}
