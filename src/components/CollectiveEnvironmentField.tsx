import { useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { loadBakedEnvironmentPointCloud, type BakedEnvironmentPointCloud } from "../data/bakedPointCloud";
import { normalizePointCloudPositions, sampleObjectSurface } from "../data/avatarShape";
import { useArchiveStore } from "../state/archiveStore";
import { getAvatarRevealOpacity } from "./EntryTimeline3D";

const environmentVertexShader = `
  attribute vec3 color;
  attribute float alphaSeed;
  attribute float seed;
  attribute float size;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDisturbance;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uDragIntensity;
  uniform float uGlobalOpacity;
  uniform float uPointerPresence;
  uniform float uPointerVelocity;

  void main() {
    vec3 displaced = position;
    vec2 pointerWorld = uPointer * vec2(15.0, 8.5);
    float pointerDistance = distance(position.xy, pointerWorld);
    float interactionPower = uPointerPresence * 0.2 + uPointerVelocity * 0.82 + uDragIntensity * 0.95;
    float ripple = sin(pointerDistance * 5.0 - uTime * 7.6 + seed * 2.0) * exp(-pointerDistance * 0.62) * interactionPower;
    float pointerLight = exp(-pointerDistance * 0.42) * (uPointerPresence * 0.22 + uPointerVelocity + uDragIntensity * 1.35);
    float drift = sin(seed * 31.0 + uTime * 0.34 + position.y * 0.09 + position.z * 0.08);
    vec3 radial = normalize(position + vec3(0.001, 0.002, 0.003));
    vec3 flow = normalize(cross(radial, vec3(0.0, 1.0, 0.0)) + vec3(0.01, 0.0, 0.02));
    float depthMist = smoothstep(-34.0, 10.0, -position.z);
    float heightMist = 1.0 - smoothstep(16.0, 34.0, abs(position.y));

    displaced += radial * (drift * 0.26 + ripple * 0.42);
    displaced += flow * (sin(uTime * 0.28 + seed * 19.0) * 0.22 + ripple * 0.34);

    float disturbance = abs(ripple) + pointerLight * 0.95;
    float glow = 0.58 + depthMist * 0.36 + heightMist * 0.2 + disturbance * 0.72;
    vColor = color * glow + vec3(0.1, 0.3, 0.34) * pointerLight;
    vAlpha = (0.024 + depthMist * 0.026 + heightMist * 0.018 + disturbance * 0.075) * (0.52 + alphaSeed * 0.72) * uGlobalOpacity;
    vDisturbance = disturbance;

    vec4 modelViewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_PointSize = (0.18 + size * 0.68 + heightMist * 0.12 + depthMist * 0.1 + pointerLight * 0.9) * (300.0 / -modelViewPosition.z);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const environmentFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDisturbance;
  uniform sampler2D uPointTexture;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float radius = length(uv);
    vec4 sprite = texture2D(uPointTexture, gl_PointCoord);
    float spriteLuma = dot(sprite.rgb, vec3(0.2126, 0.7152, 0.0722));
    float spriteAlpha = smoothstep(0.28, 0.88, max(sprite.a, spriteLuma));
    float softDisc = smoothstep(0.5, 0.04, radius) * spriteAlpha;
    float core = smoothstep(0.2, 0.0, radius);
    gl_FragColor = vec4(vColor * (0.92 + core * 0.16 + vDisturbance * 0.58), vAlpha * softDisc);
  }
`;

const MIN_RENDER_OPACITY = 0.01;

function createEnvironmentGeometry(positions: Float32Array, colors: Float32Array): THREE.BufferGeometry {
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

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(randomizedPositions, 3));
  geometry.setAttribute("alphaSeed", new THREE.BufferAttribute(alphaSeeds, 1));
  geometry.setAttribute("color", new THREE.BufferAttribute(softenedColors, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createBakedEnvironmentGeometry(baked: BakedEnvironmentPointCloud): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(baked.positions, 3));
  geometry.setAttribute("alphaSeed", new THREE.BufferAttribute(baked.alphaSeeds, 1));
  geometry.setAttribute("color", new THREE.BufferAttribute(baked.colors, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(baked.seeds, 1));
  geometry.setAttribute("size", new THREE.BufferAttribute(baked.sizes, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function createEnvironmentMaterial(pointTexture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    vertexShader: environmentVertexShader,
    fragmentShader: environmentFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDragIntensity: { value: 0 },
      uGlobalOpacity: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerPresence: { value: 0 },
      uPointerVelocity: { value: 0 },
      uPointTexture: { value: pointTexture },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function CollectiveEnvironmentField() {
  const [bakedPointCloud, setBakedPointCloud] = useState<BakedEnvironmentPointCloud | null | undefined>(undefined);
  const pointTexture = useLoader(THREE.TextureLoader, archiveVisualConfig.assets.collectiveEnvironmentTexturePath);

  useEffect(() => {
    let cancelled = false;
    loadBakedEnvironmentPointCloud(archiveVisualConfig.assets.bakedPointClouds.environmentHigh)
      .then((pointCloud) => {
        if (!cancelled) setBakedPointCloud(pointCloud);
      })
      .catch(() => {
        if (!cancelled) setBakedPointCloud(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (bakedPointCloud === undefined) {
    return null;
  }

  return bakedPointCloud ? (
    <PreparedEnvironmentField bakedPointCloud={bakedPointCloud} pointTexture={pointTexture} />
  ) : (
    <FallbackEnvironmentField pointTexture={pointTexture} />
  );
}

function FallbackEnvironmentField({
  pointTexture,
}: {
  pointTexture: THREE.Texture;
}) {
  const gltf = useGLTF(archiveVisualConfig.assets.collectiveEnvironmentModelPath);
  const surface = useMemo(
    () => sampleObjectSurface(gltf.scene, archiveVisualConfig.assets.collectiveEnvironmentPointSamples),
    [gltf.scene],
  );
  const positions = useMemo(
    () => normalizePointCloudPositions(surface.positions, archiveVisualConfig.assets.collectiveEnvironmentFieldRadius),
    [surface.positions],
  );
  const geometry = useMemo(() => createEnvironmentGeometry(positions, surface.colors), [positions, surface.colors]);

  return <PreparedEnvironmentField geometry={geometry} pointTexture={pointTexture} />;
}

function PreparedEnvironmentField({
  bakedPointCloud,
  geometry: fallbackGeometry,
  pointTexture,
}: {
  bakedPointCloud?: BakedEnvironmentPointCloud;
  geometry?: THREE.BufferGeometry;
  pointTexture: THREE.Texture;
}) {
  const { pointer, gl, camera } = useThree();
  const { timelineProgressRef } = useArchiveStore();
  const pointsRef = useRef<THREE.Points>(null);
  const dragActiveRef = useRef(false);
  const dragRef = useRef(0);
  const pointerPresentRef = useRef(0);
  const pointerInsideRef = useRef(false);
  const velocityRef = useRef(0);
  const previousPointerRef = useRef(new THREE.Vector2(pointer.x, pointer.y));
  const geometry = useMemo(
    () => fallbackGeometry ?? (bakedPointCloud ? createBakedEnvironmentGeometry(bakedPointCloud) : new THREE.BufferGeometry()),
    [bakedPointCloud, fallbackGeometry],
  );
  const material = useMemo(() => {
    pointTexture.colorSpace = THREE.SRGBColorSpace;
    pointTexture.wrapS = THREE.ClampToEdgeWrapping;
    pointTexture.wrapT = THREE.ClampToEdgeWrapping;
    pointTexture.generateMipmaps = false;
    pointTexture.minFilter = THREE.LinearFilter;
    pointTexture.magFilter = THREE.LinearFilter;
    pointTexture.needsUpdate = true;
    return createEnvironmentMaterial(pointTexture);
  }, [pointTexture]);

  useEffect(() => {
    // Compile shaders immediately to prevent stutter on first reveal
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

  useEffect(() => {
    function handlePointerEnter() {
      pointerInsideRef.current = true;
    }

    function handlePointerLeave() {
      pointerInsideRef.current = false;
    }

    function handlePointerDown() {
      pointerInsideRef.current = true;
      dragActiveRef.current = true;
      dragRef.current = 1;
    }

    function handlePointerUp() {
      dragActiveRef.current = false;
    }

    window.addEventListener("pointerenter", handlePointerEnter);
    window.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerenter", handlePointerEnter);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useFrame(({ clock }) => {
    const previousPointer = previousPointerRef.current;
    const pointerDelta = Math.hypot(pointer.x - previousPointer.x, pointer.y - previousPointer.y);
    previousPointer.set(pointer.x, pointer.y);
    velocityRef.current += (Math.min(1, pointerDelta * 14) - velocityRef.current) * 0.16;
    dragRef.current += ((dragActiveRef.current ? 1 : 0) - dragRef.current) * 0.12;
    pointerPresentRef.current += ((pointerInsideRef.current ? 1 : 0.35) - pointerPresentRef.current) * 0.08;

    const progress = timelineProgressRef.current;
    const opacity = getAvatarRevealOpacity(progress);

    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uDragIntensity.value = dragRef.current;
    material.uniforms.uGlobalOpacity.value = opacity;
    material.uniforms.uPointer.value.set(pointer.x, pointer.y);
    material.uniforms.uPointerPresence.value = pointerPresentRef.current;
    material.uniforms.uPointerVelocity.value = velocityRef.current;

    if (pointsRef.current) {
      pointsRef.current.visible = opacity > MIN_RENDER_OPACITY;
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={1}
      visible={false}
    />
  );
}
