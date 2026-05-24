import type { AvatarNormalization } from "./avatarShape";

type BakedAttributeSpec = {
  byteOffset: number;
  byteLength: number;
  components: number;
};

export type BakedPointCloudManifest = {
  attributes: Record<string, BakedAttributeSpec>;
  bin: string;
  normalization?: AvatarNormalization;
  pointCount: number;
  version: 1;
};

export type BakedCollectiveModelPointCloud = {
  colors: Float32Array;
  normalization: AvatarNormalization;
  partColors: Float32Array;
  partIds: Float32Array;
  partNumbers: Float32Array;
  positions: Float32Array;
};

export type BakedEnvironmentPointCloud = {
  alphaSeeds: Float32Array;
  colors: Float32Array;
  positions: Float32Array;
  seeds: Float32Array;
  sizes: Float32Array;
};

const manifestCache = new Map<string, Promise<BakedPointCloudManifest>>();
const bufferCache = new Map<string, Promise<ArrayBuffer>>();

function resolveRelativeUrl(relativePath: string, manifestUrl: string): string {
  return new URL(relativePath, new URL(manifestUrl, window.location.origin)).toString();
}

async function loadManifest(manifestUrl: string): Promise<BakedPointCloudManifest> {
  let cached = manifestCache.get(manifestUrl);
  if (!cached) {
    cached = fetch(manifestUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load baked point cloud manifest: ${manifestUrl}`);
      }
      return response.json() as Promise<BakedPointCloudManifest>;
    });
    manifestCache.set(manifestUrl, cached);
  }
  return cached;
}

async function loadBinaryBuffer(bufferUrl: string): Promise<ArrayBuffer> {
  let cached = bufferCache.get(bufferUrl);
  if (!cached) {
    cached = fetch(bufferUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load baked point cloud buffer: ${bufferUrl}`);
      }
      return response.arrayBuffer();
    });
    bufferCache.set(bufferUrl, cached);
  }
  return cached;
}

function floatAttribute(buffer: ArrayBuffer, spec: BakedAttributeSpec): Float32Array {
  return new Float32Array(buffer, spec.byteOffset, spec.byteLength / Float32Array.BYTES_PER_ELEMENT);
}

async function loadBakedPointCloud(manifestUrl: string) {
  const manifest = await loadManifest(manifestUrl);
  const bufferUrl = resolveRelativeUrl(manifest.bin, manifestUrl);
  const buffer = await loadBinaryBuffer(bufferUrl);
  return { buffer, manifest };
}

export async function loadBakedCollectiveModelPointCloud(
  manifestUrl: string,
): Promise<BakedCollectiveModelPointCloud> {
  const { buffer, manifest } = await loadBakedPointCloud(manifestUrl);
  const { color, partColor, partId, partNumber, position } = manifest.attributes;
  if (!manifest.normalization || !position || !color || !partColor || !partId || !partNumber) {
    throw new Error(`Invalid baked collective model point cloud manifest: ${manifestUrl}`);
  }

  return {
    colors: floatAttribute(buffer, color),
    normalization: manifest.normalization,
    partColors: floatAttribute(buffer, partColor),
    partIds: floatAttribute(buffer, partId),
    partNumbers: floatAttribute(buffer, partNumber),
    positions: floatAttribute(buffer, position),
  };
}

export async function loadBakedEnvironmentPointCloud(manifestUrl: string): Promise<BakedEnvironmentPointCloud> {
  const { buffer, manifest } = await loadBakedPointCloud(manifestUrl);
  const { alphaSeed, color, position, seed, size } = manifest.attributes;
  if (!position || !color || !alphaSeed || !seed || !size) {
    throw new Error(`Invalid baked environment point cloud manifest: ${manifestUrl}`);
  }

  return {
    alphaSeeds: floatAttribute(buffer, alphaSeed),
    colors: floatAttribute(buffer, color),
    positions: floatAttribute(buffer, position),
    seeds: floatAttribute(buffer, seed),
    sizes: floatAttribute(buffer, size),
  };
}
