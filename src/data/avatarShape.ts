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
  partColors: Float32Array;
  partIds: Float32Array;
  partNumbers: Float32Array;
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

function materialAveragePartColor(color: THREE.Color): THREE.Color {
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const saturation = 1.2;
  const brightness = 0.92;
  return new THREE.Color(
    Math.min(1, Math.max(0, (luma + (color.r - luma) * saturation) * brightness)),
    Math.min(1, Math.max(0, (luma + (color.g - luma) * saturation) * brightness)),
    Math.min(1, Math.max(0, (luma + (color.b - luma) * saturation) * brightness)),
  );
}

function materialPaintWeight(color: THREE.Color): number {
  const maxChannel = Math.max(color.r, color.g, color.b);
  const minChannel = Math.min(color.r, color.g, color.b);
  const chroma = maxChannel - minChannel;
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const notInk = THREE.MathUtils.smoothstep(luma, 0.06, 0.22);
  const notPaper = 1 - THREE.MathUtils.smoothstep(luma, 0.66, 0.9);
  const chromaWeight = THREE.MathUtils.smoothstep(chroma, 0.035, 0.22);
  return Math.max(0, chromaWeight * notInk * notPaper);
}

function meshPartNumber(mesh: THREE.Mesh, fallback: number): number {
  const source = `${mesh.name} ${mesh.parent?.name ?? ""}`;
  const match = source.match(/\bpart[_-]?(\d+)\b/i);
  return match ? Number(match[1]) : fallback;
}

function triangleVertexIndex(mesh: THREE.Mesh, triangleIndex: number, corner: number): number {
  const index = mesh.geometry.index;
  const vertexOffset = triangleIndex * 3 + corner;
  return index ? index.getX(vertexOffset) : vertexOffset;
}

function triangleCount(mesh: THREE.Mesh): number {
  const position = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  return Math.floor((index?.count ?? position.count) / 3);
}

function interpolatedTrianglePoint(
  mesh: THREE.Mesh,
  triangleIndex: number,
  seed: number,
): { color: THREE.Color; position: THREE.Vector3 } {
  const position = mesh.geometry.attributes.position;
  const uv = mesh.geometry.attributes.uv;
  const aIndex = triangleVertexIndex(mesh, triangleIndex, 0);
  const bIndex = triangleVertexIndex(mesh, triangleIndex, 1);
  const cIndex = triangleVertexIndex(mesh, triangleIndex, 2);
  const a = new THREE.Vector3(position.getX(aIndex), position.getY(aIndex), position.getZ(aIndex));
  const b = new THREE.Vector3(position.getX(bIndex), position.getY(bIndex), position.getZ(bIndex));
  const c = new THREE.Vector3(position.getX(cIndex), position.getY(cIndex), position.getZ(cIndex));
  const u = ((seed * 16807) % 997) / 997;
  const v = ((seed * 48271) % 991) / 991;
  const su = Math.sqrt(u);
  const aWeight = 1 - su;
  const bWeight = su * (1 - v);
  const cWeight = su * v;
  const vector = new THREE.Vector3()
    .addScaledVector(a, aWeight)
    .addScaledVector(b, bWeight)
    .addScaledVector(c, cWeight);
  let uvPoint: THREE.Vector2 | undefined;

  if (uv) {
    const uvA = new THREE.Vector2(uv.getX(aIndex), uv.getY(aIndex));
    const uvB = new THREE.Vector2(uv.getX(bIndex), uv.getY(bIndex));
    const uvC = new THREE.Vector2(uv.getX(cIndex), uv.getY(cIndex));
    uvPoint = new THREE.Vector2()
      .addScaledVector(uvA, aWeight)
      .addScaledVector(uvB, bWeight)
      .addScaledVector(uvC, cWeight);
  }

  return {
    color: materialColor(mesh.material, uvPoint),
    position: mesh.localToWorld(vector),
  };
}

export function sampleObjectSurface(scene: Object3D, maxSamples = 12000): AvatarSurfaceSample {
  let totalVertices = 0;
  let meshCount = 0;
  let partIndex = 0;
  const meshes: THREE.Mesh[] = [];

  scene.updateWorldMatrix(true, true);
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const position = mesh.geometry?.attributes.position;
    if (!position) return;
    totalVertices += position.count;
    meshCount += 1;
    meshes.push(mesh);
  });

  const step = Math.max(1, Math.ceil(totalVertices / maxSamples));
  const extraSamples = Math.max(0, maxSamples - totalVertices);
  const pointCapacity = Math.max(3, maxSamples);
  const sampled = new Float32Array(pointCapacity * 3);
  const colors = new Float32Array(pointCapacity * 3);
  const partColors = new Float32Array(pointCapacity * 3);
  const partIds = new Float32Array(pointCapacity);
  const partNumbers = new Float32Array(pointCapacity);
  let sampleCount = 0;

  function pushSample(
    position: THREE.Vector3,
    color: THREE.Color,
    normalizedPartId: number,
    partNumber: number,
  ): boolean {
    if (sampleCount >= pointCapacity) return false;
    const offset = sampleCount * 3;
    sampled[offset] = position.x;
    sampled[offset + 1] = position.y;
    sampled[offset + 2] = position.z;
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
    partColors[offset] = color.r;
    partColors[offset + 1] = color.g;
    partColors[offset + 2] = color.b;
    partIds[sampleCount] = normalizedPartId;
    partNumbers[sampleCount] = partNumber;
    sampleCount += 1;
    return true;
  }

  meshes.forEach((mesh) => {
    const position = mesh.geometry?.attributes.position;
    const uv = mesh.geometry?.attributes.uv;
    if (!position) return;
    const normalizedPartId = partIndex / Math.max(1, meshCount - 1);
    const partNumber = meshPartNumber(mesh, partIndex);
    const partColorStart = sampleCount * 3;
    let partColorR = 0;
    let partColorG = 0;
    let partColorB = 0;
    let partColorCount = 0;
    let paintColorR = 0;
    let paintColorG = 0;
    let paintColorB = 0;
    let paintColorWeight = 0;

    function addPartColor(color: THREE.Color) {
      partColorR += color.r;
      partColorG += color.g;
      partColorB += color.b;
      partColorCount += 1;
      const weight = materialPaintWeight(color);
      paintColorR += color.r * weight;
      paintColorG += color.g * weight;
      paintColorB += color.b * weight;
      paintColorWeight += weight;
    }

    for (let index = 0; index < position.count; index += step) {
      const vector = new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index));
      const uvPoint = uv ? new THREE.Vector2(uv.getX(index), uv.getY(index)) : undefined;
      const baseColor = materialColor(mesh.material, uvPoint);
      mesh.localToWorld(vector);
      if (!pushSample(vector, baseColor, normalizedPartId, partNumber)) break;
      addPartColor(baseColor);
    }

    const meshExtraSamples = Math.floor((extraSamples * position.count) / Math.max(1, totalVertices));
    const triangles = triangleCount(mesh);
    for (let extraIndex = 0; extraIndex < meshExtraSamples && triangles > 0; extraIndex += 1) {
      const triangleIndex = (extraIndex * 37 + partIndex * 131) % triangles;
      const point = interpolatedTrianglePoint(mesh, triangleIndex, extraIndex + partIndex * 8191 + 1);
      if (!pushSample(point.position, point.color, normalizedPartId, partNumber)) break;
      addPartColor(point.color);
    }

    const averagePartColor =
      partColorCount > 0
        ? new THREE.Color(partColorR / partColorCount, partColorG / partColorCount, partColorB / partColorCount)
        : new THREE.Color(0.78, 0.82, 0.76);
    const paintPartColor =
      paintColorWeight > partColorCount * 0.08
        ? new THREE.Color(paintColorR / paintColorWeight, paintColorG / paintColorWeight, paintColorB / paintColorWeight)
        : averagePartColor;
    const partColor = materialAveragePartColor(paintPartColor);
    for (let offset = partColorStart; offset < sampleCount * 3; offset += 3) {
      partColors[offset] = partColor.r;
      partColors[offset + 1] = partColor.g;
      partColors[offset + 2] = partColor.b;
    }
    partIndex += 1;
  });

  if (sampleCount === 0) {
    return {
      positions: new Float32Array([0, 0, 0, 1, 1, 1, -1, -1, -1]),
      colors: new Float32Array([0.78, 0.82, 0.76, 0.78, 0.82, 0.76, 0.78, 0.82, 0.76]),
      partColors: new Float32Array([0.86, 0.54, 0.3, 0.86, 0.54, 0.3, 0.86, 0.54, 0.3]),
      partIds: new Float32Array([0, 0, 0]),
      partNumbers: new Float32Array([0, 0, 0]),
    };
  }

  return {
    positions: sampled.slice(0, sampleCount * 3),
    colors: colors.slice(0, sampleCount * 3),
    partColors: partColors.slice(0, sampleCount * 3),
    partIds: partIds.slice(0, sampleCount),
    partNumbers: partNumbers.slice(0, sampleCount),
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
