import { useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import { getAvatarRevealOpacity } from "./EntryTimeline3D";
import { useInteractionState } from "./InteractionContext";

const vertexShader = `
  attribute vec3 color;
  attribute vec3 partColor;
  attribute float partId;
  attribute float partNumber;
  attribute float seed;
  varying vec3 vColor;
  uniform float uTime;
  uniform vec3 uRayOrigin;
  uniform vec3 uRayDirection;
  uniform float uInfluence;
  uniform float uPointerPresence;
  uniform float uPointerVelocity;
  uniform float uDragIntensity;
  uniform float uGlobalOpacity;
  uniform float uScatterStrength;

  vec3 randomDirection(float value) {
    vec3 randomVector = vec3(
      fract(sin(value * 127.1) * 43758.5453),
      fract(sin(value * 311.7) * 43758.5453),
      fract(sin(value * 269.5) * 43758.5453)
    );
    return normalize(randomVector * 2.0 - 1.0 + vec3(0.001));
  }

  float selectPart(float value, float target) {
    return 1.0 - step(0.25, abs(value - target));
  }

  void main() {
    vec3 displaced = position;
    float rayT = max(dot(position - uRayOrigin, uRayDirection), 0.0);
    vec3 rayPoint = uRayOrigin + uRayDirection * rayT;
    float distanceToRay = distance(position, rayPoint);
    float partPhase = partId * 6.2831853;
    float wave = sin(seed * 18.0 + partPhase + uTime * 2.7) * 0.5 + 0.5;
    float filament = sin(seed * 31.0 + partPhase * 1.7 + uTime * 4.1 + rayT * 0.22) * 0.5 + 0.5;
    float partPulse = sin(partPhase * 3.0 + uTime * 1.4) * 0.5 + 0.5;
    float pointerFalloff = exp(-distanceToRay * 0.62);
    float motionPower = uPointerVelocity * 0.72 + uDragIntensity * 0.48;
    float hoverPower = uPointerPresence * pointerFalloff * 0.58;
    float localInfluence = (uInfluence * 0.76 + uPointerPresence * 0.46) * pointerFalloff * (0.5 + filament * 0.52);
    float pointerField = pointerFalloff * motionPower;
    float ripple = sin(distanceToRay * 3.2 - uTime * 8.4 + seed * 6.2831853) * pointerFalloff * (motionPower + hoverPower * 0.28);
    float interaction = abs(ripple) + pointerField * 0.72 + localInfluence * 0.18;
    vec3 direction = normalize(position + vec3(0.001, 0.013, 0.007));
    vec3 swirl = normalize(cross(uRayDirection, direction) + vec3(0.001, 0.002, 0.003));
    float strongPart = clamp(
      selectPart(partNumber, 5.0) +
      selectPart(partNumber, 17.0) +
      selectPart(partNumber, 18.0) +
      selectPart(partNumber, 19.0) +
      selectPart(partNumber, 24.0),
      0.0,
      1.0
    );
    float moderatePart = clamp(
      selectPart(partNumber, 2.0) + selectPart(partNumber, 3.0),
      0.0,
      1.0
    );
    float preservedPart = clamp(
      selectPart(partNumber, 0.0) +
      selectPart(partNumber, 20.0) +
      selectPart(partNumber, 21.0),
      0.0,
      1.0
    );
    float mainBodyPart = clamp(
      selectPart(partNumber, 14.0) +
      selectPart(partNumber, 26.0),
      0.0,
      1.0
    );
    vec3 scatterDirection = normalize(
      mix(
        direction,
        randomDirection(seed + partId * 7.13) * vec3(1.65, 0.82, 0.68),
        0.78
      )
    );
    float scatterSeed = fract(sin(seed * 419.2 + partId * 31.7) * 43758.5453);
    float localPatchField =
      sin(
        position.x * (1.15 + partId * 0.37) +
        position.y * (1.42 + partId * 0.21) +
        partPhase * 2.7
      ) * 0.5 + 0.5;
    float localPatch = smoothstep(0.78, 0.98, localPatchField);
    float baseScatter = 0.018 + pow(scatterSeed, 3.4) * 0.11;
    float moderateScatter = 0.04 + pow(scatterSeed, 2.4) * 0.18;
    float strongScatter =
      0.07 +
      pow(scatterSeed, 2.1) * 0.28 +
      smoothstep(0.9, 1.0, scatterSeed) * 0.38;
    float scatterDistance = mix(
      baseScatter,
      moderateScatter,
      moderatePart
    );
    scatterDistance = mix(scatterDistance, strongScatter, strongPart);
    scatterDistance *= 1.0 - preservedPart * 0.84;
    float localPatchScatter =
      localPatch *
      (0.16 + moderatePart * 0.42 + strongPart * 1.05) *
      (1.0 - preservedPart * 0.78);
    scatterDistance += localPatchScatter;
    float secondaryPart =
      1.0 -
      clamp(strongPart + moderatePart + preservedPart + mainBodyPart, 0.0, 1.0);
    vec3 secondaryOffsetDirection =
      randomDirection(partNumber * 17.3 + partId * 5.7) *
      vec3(1.25, 0.28, 0.14);
    vec3 partOffset =
      selectPart(partNumber, 14.0) * vec3(2.35, -0.1, -0.12) +
      selectPart(partNumber, 26.0) * vec3(-1.65, -0.3, 0.18) +
      selectPart(partNumber, 2.0) * vec3(-1.35, -0.4, 0.15) +
      selectPart(partNumber, 3.0) * vec3(1.35, -0.4, -0.15) +
      selectPart(partNumber, 5.0) * vec3(-4.6, 0.6, 0.25) +
      selectPart(partNumber, 17.0) * vec3(4.45, 0.8, -0.2) +
      selectPart(partNumber, 18.0) * vec3(-3.9, -1.0, 0.35) +
      selectPart(partNumber, 19.0) * vec3(4.15, -0.75, 0.2) +
      selectPart(partNumber, 24.0) * vec3(-3.35, 2.25, -0.3) +
      secondaryPart * secondaryOffsetDirection;
    vec3 lightDirection = normalize(vec3(-0.32, 0.55, 0.78));
    float spatialLight = dot(direction, lightDirection) * 0.5 + 0.5;
    float selfShadow = smoothstep(0.0, 0.9, length(position.xy) * 0.055 + position.y * 0.018);
    displaced += (
      scatterDirection * scatterDistance +
      partOffset
    ) * uScatterStrength;
    displaced += direction * (0.045 * wave + localInfluence * (0.2 + wave * 0.11) + pointerField * 0.11 + hoverPower * 0.05 + ripple * 0.08);
    displaced += swirl * (localInfluence * 0.17 + pointerField * 0.14 + hoverPower * 0.08 + ripple * 0.13) * sin(uTime * 6.0 + seed * 44.0 + partPhase);

    vec3 baseColor = mix(partColor, color, 0.72);
    vec3 accentGlow = baseColor * (0.07 + partPulse * 0.12 + localInfluence * 0.1 + pointerField * 0.11 + hoverPower * 0.08);
    float rim = pow(1.0 - abs(dot(direction, vec3(0.0, 0.0, 1.0))), 2.2);
    float lightShade = 0.48 + spatialLight * 0.72 + selfShadow * 0.24 + rim * 0.32;
    vColor = baseColor * lightShade * (0.5 + wave * 0.16 + partPulse * 0.14 + localInfluence * 0.14 + pointerField * 0.15 + hoverPower * 0.1) + accentGlow;
    vec4 modelViewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_PointSize = (0.18 + wave * 0.105 + partPulse * 0.04 + localInfluence * 0.1 + pointerField * 0.12 + hoverPower * 0.05) * (620.0 / -modelViewPosition.z);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  uniform sampler2D uPointTexture;
  uniform float uGlobalOpacity;

  vec3 preserveLowLightChroma(vec3 color) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 hue = normalize(color + vec3(0.001));
    vec3 chromaLift = hue * max(luma, 0.11);
    float lowLight = 1.0 - smoothstep(0.12, 0.52, luma);
    vec3 saturated = mix(vec3(luma), chromaLift, 0.78);
    return mix(color, saturated, lowLight * 0.72);
  }

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float radius = length(uv);
    float core = smoothstep(0.18, 0.015, radius);
    float halo = smoothstep(0.48, 0.1, radius);
    vec4 sprite = texture2D(uPointTexture, gl_PointCoord);
    float spriteLuma = dot(sprite.rgb, vec3(0.2126, 0.7152, 0.0722));
    float spriteAlpha = smoothstep(0.08, 0.76, max(sprite.a, spriteLuma));
    float spriteDetail = mix(1.0, spriteLuma, 0.38);
    vec3 chromaColor = preserveLowLightChroma(vColor);
    vec3 emission = chromaColor * (0.3 * core + 0.12 * halo);
    vec3 partTintedCore = normalize(chromaColor + vec3(0.001)) * core * 0.18;
    vec3 highlight = chromaColor * spriteDetail * 0.88 + emission + partTintedCore;
    float alpha = (halo * 0.16 + core * 0.32) * spriteAlpha * uGlobalOpacity;
    gl_FragColor = vec4(highlight, alpha);
  }
`;

const MIN_RENDER_OPACITY = 0.01;

const COLLECTIVE_PART_OFFSETS: Readonly<Record<number, readonly [number, number, number]>> = {
  2: [-1.35, -0.4, 0.15],
  3: [1.35, -0.4, -0.15],
  5: [-4.6, 0.6, 0.25],
  14: [2.35, -0.1, -0.12],
  17: [4.45, 0.8, -0.2],
  18: [-3.9, -1, 0.35],
  19: [4.15, -0.75, 0.2],
  24: [-3.35, 2.25, -0.3],
  26: [-1.65, -0.3, 0.18],
};

function deterministicSecondaryOffset(partNumber: number, partId: number): [number, number, number] {
  const seed = partNumber * 17.3 + partId * 5.7;
  const component = (multiplier: number) =>
    ((Math.sin(seed * multiplier) * 43758.5453) % 1 + 1) % 1 * 2 - 1;
  const x = component(127.1);
  const y = component(311.7);
  const z = component(269.5);
  const length = Math.hypot(x, y, z) || 1;
  return [(x / length) * 1.25, (y / length) * 0.28, (z / length) * 0.14];
}

export function createCollectiveLayoutPositions(
  positions: Float32Array,
  partIds: Float32Array,
  partNumbers: Float32Array,
  strength = archiveVisualConfig.rendering.collectiveScatterStrength,
): Float32Array {
  const transformed = new Float32Array(positions);
  const preservedParts = new Set([0, 20, 21]);

  for (let index = 0; index < partNumbers.length; index += 1) {
    const partNumber = Math.round(partNumbers[index]);
    if (preservedParts.has(partNumber)) continue;
    const offset =
      COLLECTIVE_PART_OFFSETS[partNumber] ??
      deterministicSecondaryOffset(partNumber, partIds[index]);
    const positionOffset = index * 3;
    transformed[positionOffset] += offset[0] * strength;
    transformed[positionOffset + 1] += offset[1] * strength;
    transformed[positionOffset + 2] += offset[2] * strength;
  }

  return transformed;
}

function createSeeds(pointCount: number): Float32Array {
  const seeds = new Float32Array(pointCount);
  for (let index = 0; index < pointCount; index += 1) {
    seeds[index] = ((index * 16807) % 2147483647) / 2147483647;
  }
  return seeds;
}

export function createCollectiveModelPointGeometry(positions: Float32Array, colors: Float32Array): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const pointCount = Math.floor(positions.length / 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("partColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("partId", new THREE.BufferAttribute(new Float32Array(pointCount), 1));
  geometry.setAttribute("partNumber", new THREE.BufferAttribute(new Float32Array(pointCount), 1));
  geometry.setAttribute("seed", new THREE.BufferAttribute(createSeeds(pointCount), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createCollectiveModelPartGeometry(
  positions: Float32Array,
  colors: Float32Array,
  partColors: Float32Array,
  partIds: Float32Array,
  partNumbers: Float32Array,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const pointCount = Math.floor(positions.length / 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("partColor", new THREE.BufferAttribute(partColors, 3));
  geometry.setAttribute("partId", new THREE.BufferAttribute(partIds, 1));
  geometry.setAttribute("partNumber", new THREE.BufferAttribute(partNumbers, 1));
  geometry.setAttribute("seed", new THREE.BufferAttribute(createSeeds(pointCount), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createCollectiveModelPointMaterial(pointTexture?: THREE.Texture, opacity = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uRayOrigin: { value: new THREE.Vector3(0, 0, 999) },
      uRayDirection: { value: new THREE.Vector3(0, 0, -1) },
      uInfluence: { value: 0 },
      uPointerPresence: { value: 0 },
      uPointerVelocity: { value: 0 },
      uDragIntensity: { value: 0 },
      uGlobalOpacity: { value: opacity },
      uScatterStrength: {
        value: archiveVisualConfig.rendering.collectiveScatterStrength,
      },
      uPointTexture: { value: pointTexture ?? new THREE.Texture() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function CollectiveModelPointCloud({
  colors,
  partColors,
  partIds,
  partNumbers,
  positions,
}: {
  colors: Float32Array;
  partColors: Float32Array;
  partIds: Float32Array;
  partNumbers: Float32Array;
  positions: Float32Array;
}) {
  const { camera, raycaster, gl } = useThree();
  const { timelineProgressRef } = useArchiveStore();
  const pointsRef = useRef<THREE.Points>(null);
  const influenceRef = useRef(0);
  const pointerPresenceRef = useRef(0);
  const velocityRef = useRef(0);
  const dragIntensityRef = useRef(0);
  const interactionRef = useInteractionState();
  const previousPointerRef = useRef(new THREE.Vector2(0, 0));
  const inverseWorldMatrixRef = useRef(new THREE.Matrix4());
  const localRayOriginRef = useRef(new THREE.Vector3());
  const localRayDirectionRef = useRef(new THREE.Vector3());
  const pointTexture = useLoader(THREE.TextureLoader, archiveVisualConfig.assets.collectiveParticleTexturePath);
  const geometry = useMemo(
    () => createCollectiveModelPartGeometry(positions, colors, partColors, partIds, partNumbers),
    [colors, partColors, partIds, partNumbers, positions],
  );
  const material = useMemo(() => {
    pointTexture.colorSpace = THREE.SRGBColorSpace;
    pointTexture.wrapS = THREE.ClampToEdgeWrapping;
    pointTexture.wrapT = THREE.ClampToEdgeWrapping;
    pointTexture.generateMipmaps = false;
    pointTexture.minFilter = THREE.LinearFilter;
    pointTexture.magFilter = THREE.LinearFilter;
    pointTexture.needsUpdate = true;
    return createCollectiveModelPointMaterial(pointTexture);
  }, [pointTexture]);
  useEffect(() => {
    // Precompile model point cloud shaders
    const dummyPoints = new THREE.Points(geometry, material);
    gl.compile(dummyPoints, camera);
  }, [gl, camera, geometry, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const { pointer, isDragging, isInside } = interactionRef.current;
    const previousPointer = previousPointerRef.current;
    const pointerDelta = Math.hypot(pointer.x - previousPointer.x, pointer.y - previousPointer.y);
    previousPointer.copy(pointer);
    velocityRef.current += (Math.min(0.72, pointerDelta * 17) - velocityRef.current) * 0.22;
    dragIntensityRef.current += ((isDragging ? 0.34 : 0) - dragIntensityRef.current) * 0.14;
    pointerPresenceRef.current += ((isInside ? 0.72 : 0) - pointerPresenceRef.current) * 0.16;
    influenceRef.current += (0.34 - influenceRef.current) * 0.08;
    raycaster.setFromCamera(pointer, camera);

    const progress = timelineProgressRef.current;
    const opacity = getAvatarRevealOpacity(progress);

    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uInfluence.value = influenceRef.current;
    material.uniforms.uPointerPresence.value = pointerPresenceRef.current;
    material.uniforms.uPointerVelocity.value = velocityRef.current;
    material.uniforms.uDragIntensity.value = dragIntensityRef.current;
    material.uniforms.uGlobalOpacity.value = opacity;

    const points = pointsRef.current;
    if (points) {
      points.updateWorldMatrix(true, false);
      inverseWorldMatrixRef.current.copy(points.matrixWorld).invert();
      localRayOriginRef.current.copy(raycaster.ray.origin).applyMatrix4(inverseWorldMatrixRef.current);
      localRayDirectionRef.current.copy(raycaster.ray.direction).transformDirection(inverseWorldMatrixRef.current);
      material.uniforms.uRayOrigin.value.copy(localRayOriginRef.current);
      material.uniforms.uRayDirection.value.copy(localRayDirectionRef.current);
    }

    if (points) {
      points.visible = opacity > MIN_RENDER_OPACITY;
    }

  });

  return (
    <group>
      <points
        ref={pointsRef}
        geometry={geometry}
        material={material}
        frustumCulled={false}
        renderOrder={8}
        visible={false}
      />
    </group>
  );
}
