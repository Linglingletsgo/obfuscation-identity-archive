import type { Object3D } from "three";
import * as THREE from "three";
import type { ArchiveGraphNode } from "../types/archive";

export type AvatarNormalization = {
  center: { x: number; y: number; z: number };
  scale: number;
};

export type AvatarSurfaceSample = {
  positions: Float32Array;
  colors: Float32Array;
};

const textureImageDataCache = new WeakMap<THREE.Texture, ImageData | null>();

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

function textureImageData(texture: THREE.Texture | null | undefined): ImageData | null {
  if (!texture) return null;
  const cached = textureImageDataCache.get(texture);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") {
    textureImageDataCache.set(texture, null);
    return null;
  }

  const image = texture.image as CanvasImageSource | undefined;
  const imageSize = image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number } | undefined;
  const width = Number(imageSize?.naturalWidth ?? imageSize?.width ?? 0);
  const height = Number(imageSize?.naturalHeight ?? imageSize?.height ?? 0);
  if (!image || width <= 0 || height <= 0) {
    textureImageDataCache.set(texture, null);
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    textureImageDataCache.set(texture, null);
    return null;
  }

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  textureImageDataCache.set(texture, imageData);
  return imageData;
}

function sampleTextureColor(texture: THREE.Texture | null | undefined, u: number, v: number): THREE.Color | null {
  const imageData = textureImageData(texture);
  if (!imageData) return null;

  const wrappedU = THREE.MathUtils.euclideanModulo(u, 1);
  const wrappedV = THREE.MathUtils.euclideanModulo(v, 1);
  const x = Math.min(imageData.width - 1, Math.max(0, Math.floor(wrappedU * imageData.width)));
  const y = Math.min(imageData.height - 1, Math.max(0, Math.floor((1 - wrappedV) * imageData.height)));
  const offset = (y * imageData.width + x) * 4;

  return new THREE.Color(
    imageData.data[offset] / 255,
    imageData.data[offset + 1] / 255,
    imageData.data[offset + 2] / 255,
  );
}

function materialColor(material: THREE.Material | THREE.Material[] | undefined, uv?: THREE.Vector2): THREE.Color {
  const source = Array.isArray(material) ? material[0] : material;
  const standardMaterial = source as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | undefined;
  const textureColor = uv ? sampleTextureColor(standardMaterial?.map, uv.x, uv.y) : null;
  const baseColor = standardMaterial?.color?.clone() ?? new THREE.Color(0.78, 0.82, 0.76);
  return textureColor ? textureColor.multiply(baseColor) : baseColor;
}

export function sampleObjectSurface(scene: Object3D, maxSamples = 12000): AvatarSurfaceSample {
  const sampled: number[] = [];
  const colors: number[] = [];
  let totalVertices = 0;

  scene.updateWorldMatrix(true, true);
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const position = mesh.geometry?.attributes.position;
    if (!position) return;
    totalVertices += position.count;
  });

  const step = Math.max(1, Math.ceil(totalVertices / maxSamples));
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const position = mesh.geometry?.attributes.position;
    const uv = mesh.geometry?.attributes.uv;
    if (!position) return;
    for (let index = 0; index < position.count; index += step) {
      const vector = new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index));
      const uvPoint = uv ? new THREE.Vector2(uv.getX(index), uv.getY(index)) : undefined;
      const baseColor = materialColor(mesh.material, uvPoint);
      mesh.localToWorld(vector);
      sampled.push(vector.x, vector.y, vector.z);
      colors.push(baseColor.r, baseColor.g, baseColor.b);
    }
  });

  if (sampled.length === 0) {
    return {
      positions: new Float32Array([0, 0, 0, 1, 1, 1, -1, -1, -1]),
      colors: new Float32Array([0.78, 0.82, 0.76, 0.78, 0.82, 0.76, 0.78, 0.82, 0.76]),
    };
  }

  return {
    positions: new Float32Array(sampled),
    colors: new Float32Array(colors),
  };
}

export function sampleObjectSurfacePositions(scene: Object3D, maxSamples = 12000): Float32Array {
  return sampleObjectSurface(scene, maxSamples).positions;
}

function vectorAt(positions: Float32Array, pointIndex: number): THREE.Vector3 {
  const index = pointIndex * 3;
  return new THREE.Vector3(positions[index], positions[index + 1], positions[index + 2]);
}

export function projectNodeIntoAvatarShape(
  node: Pick<ArchiveGraphNode, "id" | "position">,
  surfacePositions: Float32Array | null,
  inwardScale = 0.62,
  distribution?: { index: number; total: number },
): ArchiveGraphNode["position"] {
  if (!surfacePositions || surfacePositions.length < 3) return node.position;

  const pointCount = Math.floor(surfacePositions.length / 3);
  let baseIndex = hashString(node.id) % pointCount;

  if (distribution && distribution.total > 1) {
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let index = 1; index < surfacePositions.length; index += 3) {
      minY = Math.min(minY, surfacePositions[index]);
      maxY = Math.max(maxY, surfacePositions[index]);
    }

    const clampedIndex = Math.max(0, Math.min(distribution.total - 1, distribution.index));
    const targetY = maxY - (clampedIndex / (distribution.total - 1)) * (maxY - minY);
    let bestScore = Number.POSITIVE_INFINITY;
    const seed = hashString(node.id);

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      const pointOffset = pointIndex * 3;
      const yScore = Math.abs(surfacePositions[pointOffset + 1] - targetY);
      const stableTieBreak = ((seed ^ Math.imul(pointIndex + 1, 2654435761)) >>> 0) / 4294967295;
      const score = yScore + stableTieBreak * 0.0001;
      if (score < bestScore) {
        bestScore = score;
        baseIndex = pointIndex;
      }
    }
  }

  const best = vectorAt(surfacePositions, baseIndex);

  return {
    x: rounded(best.x * inwardScale),
    y: rounded(best.y * inwardScale),
    z: rounded(best.z * inwardScale),
  };
}
