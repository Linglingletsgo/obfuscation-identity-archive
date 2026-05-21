import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "public", "data", "baked");

const COLLECTIVE_MODEL_PATH = path.join(projectRoot, "public", "models", "global_stage2_collective.glb");
const ENVIRONMENT_MODEL_PATH = path.join(projectRoot, "public", "models", "env.glb");
const COLLECTIVE_VISUAL_RADIUS = 8.4 * 1.45;
const ENVIRONMENT_FIELD_RADIUS = 42;

const bakeTargets = [
  {
    bin: "collective_model_high.bin",
    json: "collective_model_high.json",
    kind: "collective",
    maxSamples: 105000,
    modelPath: COLLECTIVE_MODEL_PATH,
  },
  {
    bin: "environment_high.bin",
    json: "environment_high.json",
    kind: "environment",
    maxSamples: 90000,
    modelPath: ENVIRONMENT_MODEL_PATH,
  },
];

globalThis.self = globalThis;
globalThis.createImageBitmap = async function createDecodedImageBitmap(blob) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng) {
    return {
      close() {},
      data: new Uint8Array([255, 255, 255, 255]),
      height: 1,
      width: 1,
    };
  }

  const png = PNG.sync.read(bytes);
  return {
    close() {},
    data: png.data,
    height: png.height,
    width: png.width,
  };
};

function rounded(value) {
  return Number(value.toFixed(4));
}

function getAvatarNormalization(rawPositions, radius) {
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

function normalizePointCloudPositions(rawPositions, radius) {
  const normalization = getAvatarNormalization(rawPositions, radius);
  const normalized = new Float32Array(rawPositions.length);

  for (let index = 0; index < rawPositions.length; index += 3) {
    normalized[index] = rounded((rawPositions[index] - normalization.center.x) * normalization.scale);
    normalized[index + 1] = rounded((rawPositions[index + 1] - normalization.center.y) * normalization.scale);
    normalized[index + 2] = rounded((rawPositions[index + 2] - normalization.center.z) * normalization.scale);
  }

  return { normalization, positions: normalized };
}

function sampleTextureColor(texture, u, v) {
  const image = texture?.image;
  if (!image?.data || !image.width || !image.height) return null;

  const wrappedU = THREE.MathUtils.euclideanModulo(u, 1);
  const wrappedV = THREE.MathUtils.euclideanModulo(v, 1);
  const x = Math.min(image.width - 1, Math.max(0, Math.floor(wrappedU * image.width)));
  const y = Math.min(image.height - 1, Math.max(0, Math.floor((1 - wrappedV) * image.height)));
  const offset = (y * image.width + x) * 4;

  return new THREE.Color(
    image.data[offset] / 255,
    image.data[offset + 1] / 255,
    image.data[offset + 2] / 255,
  );
}

function materialColor(material, uv) {
  const source = Array.isArray(material) ? material[0] : material;
  const textureColor = uv ? sampleTextureColor(source?.map, uv.x, uv.y) : null;
  const baseColor = source?.color?.clone() ?? new THREE.Color(0.78, 0.82, 0.76);
  return textureColor ? textureColor.multiply(baseColor) : baseColor;
}

function materialAveragePartColor(color) {
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const saturation = 1.2;
  const brightness = 0.92;
  return new THREE.Color(
    Math.min(1, Math.max(0, (luma + (color.r - luma) * saturation) * brightness)),
    Math.min(1, Math.max(0, (luma + (color.g - luma) * saturation) * brightness)),
    Math.min(1, Math.max(0, (luma + (color.b - luma) * saturation) * brightness)),
  );
}

function materialPaintWeight(color) {
  const maxChannel = Math.max(color.r, color.g, color.b);
  const minChannel = Math.min(color.r, color.g, color.b);
  const chroma = maxChannel - minChannel;
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const notInk = THREE.MathUtils.smoothstep(luma, 0.06, 0.22);
  const notPaper = 1 - THREE.MathUtils.smoothstep(luma, 0.66, 0.9);
  const chromaWeight = THREE.MathUtils.smoothstep(chroma, 0.035, 0.22);
  return Math.max(0, chromaWeight * notInk * notPaper);
}

function triangleVertexIndex(mesh, triangleIndex, corner) {
  const index = mesh.geometry.index;
  const vertexOffset = triangleIndex * 3 + corner;
  return index ? index.getX(vertexOffset) : vertexOffset;
}

function triangleCount(mesh) {
  const position = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  return Math.floor((index?.count ?? position.count) / 3);
}

function interpolatedTrianglePoint(mesh, triangleIndex, seed) {
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
  let uvPoint;

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

function sampleObjectSurface(scene, maxSamples) {
  let totalVertices = 0;
  let meshCount = 0;
  let partIndex = 0;
  const meshes = [];

  scene.updateWorldMatrix(true, true);
  scene.traverse((child) => {
    const position = child.geometry?.attributes.position;
    if (!position) return;
    totalVertices += position.count;
    meshCount += 1;
    meshes.push(child);
  });

  const step = Math.max(1, Math.ceil(totalVertices / maxSamples));
  const extraSamples = Math.max(0, maxSamples - totalVertices);
  const pointCapacity = Math.max(3, maxSamples);
  const sampled = new Float32Array(pointCapacity * 3);
  const colors = new Float32Array(pointCapacity * 3);
  const partColors = new Float32Array(pointCapacity * 3);
  const partIds = new Float32Array(pointCapacity);
  let sampleCount = 0;

  function pushSample(position, color, normalizedPartId) {
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
    sampleCount += 1;
    return true;
  }

  meshes.forEach((mesh) => {
    const position = mesh.geometry?.attributes.position;
    const uv = mesh.geometry?.attributes.uv;
    if (!position) return;
    const normalizedPartId = partIndex / Math.max(1, meshCount - 1);
    const partColorStart = sampleCount * 3;
    let partColorR = 0;
    let partColorG = 0;
    let partColorB = 0;
    let partColorCount = 0;
    let paintColorR = 0;
    let paintColorG = 0;
    let paintColorB = 0;
    let paintColorWeight = 0;

    function addPartColor(color) {
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
      if (!pushSample(vector, baseColor, normalizedPartId)) break;
      addPartColor(baseColor);
    }

    const meshExtraSamples = Math.floor((extraSamples * position.count) / Math.max(1, totalVertices));
    const triangles = triangleCount(mesh);
    for (let extraIndex = 0; extraIndex < meshExtraSamples && triangles > 0; extraIndex += 1) {
      const triangleIndex = (extraIndex * 37 + partIndex * 131) % triangles;
      const point = interpolatedTrianglePoint(mesh, triangleIndex, extraIndex + partIndex * 8191 + 1);
      if (!pushSample(point.position, point.color, normalizedPartId)) break;
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

  return {
    colors: colors.slice(0, sampleCount * 3),
    partColors: partColors.slice(0, sampleCount * 3),
    partIds: partIds.slice(0, sampleCount),
    positions: sampled.slice(0, sampleCount * 3),
  };
}

function createEnvironmentAttributes(positions, colors) {
  const pointCount = Math.floor(positions.length / 3);
  const randomizedPositions = new Float32Array(positions.length);
  const alphaSeeds = new Float32Array(pointCount);
  const seeds = new Float32Array(pointCount);
  const sizes = new Float32Array(pointCount);
  const softenedColors = new Float32Array(colors.length);

  for (let index = 0; index < pointCount; index += 1) {
    const seed = ((index * 48271) % 2147483647) / 2147483647;
    const offset = index * 3;
    const randomA = ((index * 16807) % 2147483647) / 2147483647;
    const randomB = ((index * 69621) % 2147483647) / 2147483647;
    const randomC = ((index * 9301) % 2147483647) / 2147483647;
    const randomD = ((index * 19937) % 2147483647) / 2147483647;
    const randomE = ((index * 44497) % 2147483647) / 2147483647;
    const randomF = ((index * 96821) % 2147483647) / 2147483647;
    const sourceX = positions[offset];
    const sourceY = positions[offset + 1];
    const sourceZ = positions[offset + 2];
    const sourceLengthSq = sourceX * sourceX + sourceY * sourceY + sourceZ * sourceZ;
    const sourceLength = sourceLengthSq > 0.001 ? Math.sqrt(sourceLengthSq) : 1;
    const radialX = sourceLengthSq > 0.001 ? sourceX / sourceLength : 0;
    const radialY = sourceLengthSq > 0.001 ? sourceY / sourceLength : 1;
    const radialZ = sourceLengthSq > 0.001 ? sourceZ / sourceLength : 0;
    const tangentSeedY = 0.13 + randomE * 0.32;
    const tangentLength = Math.hypot(-radialZ, tangentSeedY, radialX) || 1;
    const tangentX = -radialZ / tangentLength;
    const tangentY = tangentSeedY / tangentLength;
    const tangentZ = radialX / tangentLength;
    const bitangentSeedX = radialY * tangentZ - radialZ * tangentY;
    const bitangentSeedY = radialZ * tangentX - radialX * tangentZ;
    const bitangentSeedZ = radialX * tangentY - radialY * tangentX;
    const bitangentLength = Math.hypot(bitangentSeedX, bitangentSeedY, bitangentSeedZ) || 1;
    const bitangentX = bitangentSeedX / bitangentLength;
    const bitangentY = bitangentSeedY / bitangentLength;
    const bitangentZ = bitangentSeedZ / bitangentLength;
    const jitterRadius = 0.8 + Math.pow(randomA, 1.25) * 5.8;
    const jitterTheta = randomB * Math.PI * 2;
    const tangentScale = Math.cos(jitterTheta) * jitterRadius;
    const bitangentScale = Math.sin(jitterTheta) * jitterRadius * 0.86;
    const radialScale = (randomD - 0.5) * 4.8;
    const volumeBlend = randomF < 0.34 ? 0.32 + randomD * 0.3 : 0;
    const volumeX = (randomA - 0.5) * 52;
    const volumeY = (randomB - 0.5) * 30;
    const volumeZ = (randomC - 0.5) * 38 - 6;
    const scatteredX =
      sourceX + tangentX * tangentScale + bitangentX * bitangentScale + radialX * radialScale;
    const scatteredY =
      sourceY + tangentY * tangentScale + bitangentY * bitangentScale + radialY * radialScale;
    const scatteredZ =
      sourceZ + tangentZ * tangentScale + bitangentZ * bitangentScale + radialZ * radialScale;
    seeds[index] = seed;
    alphaSeeds[index] = randomE;
    sizes[index] = 0.45 + Math.pow(randomF, 2.2) * 1.35;
    randomizedPositions[offset] = scatteredX + (volumeX - scatteredX) * volumeBlend;
    randomizedPositions[offset + 1] = scatteredY + (volumeY - scatteredY) * volumeBlend;
    randomizedPositions[offset + 2] = scatteredZ + (volumeZ - scatteredZ) * volumeBlend;
    softenedColors[offset] = colors[offset] * 0.46 + 0.09;
    softenedColors[offset + 1] = colors[offset + 1] * 0.52 + 0.13;
    softenedColors[offset + 2] = colors[offset + 2] * 0.6 + 0.18;
  }

  return {
    alphaSeed: alphaSeeds,
    color: softenedColors,
    position: randomizedPositions,
    seed: seeds,
    size: sizes,
  };
}

async function loadGltfScene(modelPath) {
  const data = await readFile(modelPath);
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, "", resolve, reject);
  });
  return gltf.scene;
}

function buildBinary(attributes) {
  const manifestAttributes = {};
  let byteOffset = 0;
  const buffers = [];

  for (const [name, { array, components }] of Object.entries(attributes)) {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    manifestAttributes[name] = {
      byteLength: bytes.byteLength,
      byteOffset,
      components,
    };
    buffers.push(bytes);
    byteOffset += bytes.byteLength;
  }

  return {
    attributes: manifestAttributes,
    buffer: Buffer.concat(buffers),
  };
}

async function writeBakedTarget(target) {
  const scene = await loadGltfScene(target.modelPath);
  const surface = sampleObjectSurface(scene, target.maxSamples);
  const normalized = normalizePointCloudPositions(
    surface.positions,
    target.kind === "collective" ? COLLECTIVE_VISUAL_RADIUS : ENVIRONMENT_FIELD_RADIUS,
  );
  const attributes =
    target.kind === "collective"
      ? {
          color: { array: surface.colors, components: 3 },
          partColor: { array: surface.partColors, components: 3 },
          partId: { array: surface.partIds, components: 1 },
          position: { array: normalized.positions, components: 3 },
        }
      : Object.fromEntries(
          Object.entries(createEnvironmentAttributes(normalized.positions, surface.colors)).map(([name, array]) => [
            name,
            { array, components: name === "position" || name === "color" ? 3 : 1 },
          ]),
        );

  const binary = buildBinary(attributes);
  const manifest = {
    attributes: binary.attributes,
    bin: `./${target.bin}`,
    kind: target.kind,
    normalization: target.kind === "collective" ? normalized.normalization : undefined,
    pointCount: Math.floor(normalized.positions.length / 3),
    source: path.relative(projectRoot, target.modelPath),
    version: 1,
  };

  await writeFile(path.join(outputDir, target.bin), binary.buffer);
  await writeFile(path.join(outputDir, target.json), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`baked ${target.json}: ${manifest.pointCount.toLocaleString()} points`);
}

await mkdir(outputDir, { recursive: true });
for (const target of bakeTargets) {
  await writeBakedTarget(target);
}
