import type { Object3D } from "three";
import * as THREE from "three";
import type { ArchiveGraphNode } from "../types/archive";

export type AvatarNormalization = {
  center: { x: number; y: number; z: number };
  scale: number;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rounded(value: number): number {
  return Number(value.toFixed(4));
}

export function getAvatarNormalization(rawPositions: Float32Array, radius: number): AvatarNormalization {
  if (rawPositions.length < 3) return { center: { x: 0, y: 0, z: 0 }, scale: 1 };

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < rawPositions.length; index += 3) {
    minX = Math.min(minX, rawPositions[index]);
    minY = Math.min(minY, rawPositions[index + 1]);
    minZ = Math.min(minZ, rawPositions[index + 2]);
    maxX = Math.max(maxX, rawPositions[index]);
    maxY = Math.max(maxY, rawPositions[index + 1]);
    maxZ = Math.max(maxZ, rawPositions[index + 2]);
  }

  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };
  let sourceRadius = 0;

  for (let index = 0; index < rawPositions.length; index += 3) {
    sourceRadius = Math.max(
      sourceRadius,
      Math.hypot(
        rawPositions[index] - center.x,
        rawPositions[index + 1] - center.y,
        rawPositions[index + 2] - center.z,
      ),
    );
  }

  return {
    center,
    scale: sourceRadius > 0 ? radius / sourceRadius : 1,
  };
}

export function normalizePointCloudPositions(rawPositions: Float32Array, radius: number): Float32Array {
  const normalization = getAvatarNormalization(rawPositions, radius);
  const normalized = new Float32Array(rawPositions.length);

  for (let index = 0; index < rawPositions.length; index += 3) {
    normalized[index] = rounded((rawPositions[index] - normalization.center.x) * normalization.scale);
    normalized[index + 1] = rounded((rawPositions[index + 1] - normalization.center.y) * normalization.scale);
    normalized[index + 2] = rounded((rawPositions[index + 2] - normalization.center.z) * normalization.scale);
  }

  return normalized;
}

export function sampleObjectSurfacePositions(scene: Object3D, maxSamples = 12000): Float32Array {
  const sampled: number[] = [];

  scene.updateWorldMatrix(true, true);
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const position = mesh.geometry?.attributes.position;
    if (!position) return;

    const step = Math.max(1, Math.ceil(position.count / maxSamples));
    for (let index = 0; index < position.count; index += step) {
      const vector = new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index));
      mesh.localToWorld(vector);
      sampled.push(vector.x, vector.y, vector.z);
    }
  });

  return new Float32Array(sampled.length > 0 ? sampled : [0, 0, 0, 1, 1, 1, -1, -1, -1]);
}

function vectorAt(positions: Float32Array, pointIndex: number): THREE.Vector3 {
  const index = pointIndex * 3;
  return new THREE.Vector3(positions[index], positions[index + 1], positions[index + 2]);
}

export function projectNodeIntoAvatarShape(
  node: Pick<ArchiveGraphNode, "id" | "position">,
  surfacePositions: Float32Array | null,
  inwardScale = 0.62,
): ArchiveGraphNode["position"] {
  if (!surfacePositions || surfacePositions.length < 3) return node.position;

  const pointCount = Math.floor(surfacePositions.length / 3);
  const baseIndex = hashString(node.id) % pointCount;
  const fallbackDirection = new THREE.Vector3(node.position.x, node.position.y, node.position.z).normalize();
  let best = vectorAt(surfacePositions, baseIndex);
  let bestScore = best.clone().normalize().dot(fallbackDirection) + 0.08;
  const stride = Math.max(1, Math.floor(pointCount / 64));

  for (let offset = 0; offset < pointCount; offset += stride) {
    const candidateIndex = (baseIndex + offset) % pointCount;
    const candidate = vectorAt(surfacePositions, candidateIndex);
    const score = candidate.clone().normalize().dot(fallbackDirection);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return {
    x: rounded(best.x * inwardScale),
    y: rounded(best.y * inwardScale),
    z: rounded(best.z * inwardScale),
  };
}
