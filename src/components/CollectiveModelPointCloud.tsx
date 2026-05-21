import { useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import { getAvatarRevealOpacity } from "./EntryTimeline3D";

const vertexShader = `
  attribute vec3 color;
  attribute vec3 partColor;
  attribute float partId;
  attribute float seed;
  varying vec3 vColor;
  uniform float uTime;
  uniform vec3 uRayOrigin;
  uniform vec3 uRayDirection;
  uniform float uInfluence;
  uniform float uPointerVelocity;
  uniform float uDragIntensity;
  uniform float uGlobalOpacity;

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
    float motionPower = uPointerVelocity * 1.05 + uDragIntensity * 0.78;
    float localInfluence = uInfluence * pointerFalloff * (0.5 + filament * 0.52);
    float pointerField = pointerFalloff * motionPower;
    float ripple = sin(distanceToRay * 3.2 - uTime * 8.4 + seed * 6.2831853) * pointerFalloff * motionPower;
    float interaction = abs(ripple) + pointerField * 0.72 + localInfluence * 0.18;
    vec3 direction = normalize(position + vec3(0.001, 0.013, 0.007));
    vec3 swirl = normalize(cross(uRayDirection, direction) + vec3(0.001, 0.002, 0.003));
    vec3 lightDirection = normalize(vec3(-0.32, 0.55, 0.78));
    float spatialLight = dot(direction, lightDirection) * 0.5 + 0.5;
    float selfShadow = smoothstep(0.0, 0.9, length(position.xy) * 0.055 + position.y * 0.018);
    displaced += direction * (0.045 * wave + localInfluence * (0.2 + wave * 0.12) + pointerField * 0.18 + ripple * 0.14);
    displaced += swirl * (localInfluence * 0.2 + pointerField * 0.24 + ripple * 0.22) * sin(uTime * 6.0 + seed * 44.0 + partPhase);

    vec3 baseColor = mix(partColor, color, 0.72);
    vec3 accentGlow = baseColor * (0.07 + partPulse * 0.12 + localInfluence * 0.1 + pointerField * 0.18);
    float rim = pow(1.0 - abs(dot(direction, vec3(0.0, 0.0, 1.0))), 2.2);
    float lightShade = 0.48 + spatialLight * 0.72 + selfShadow * 0.24 + rim * 0.32;
    vColor = baseColor * lightShade * (0.5 + wave * 0.16 + partPulse * 0.14 + localInfluence * 0.16 + pointerField * 0.24) + accentGlow;
    vec4 modelViewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_PointSize = (0.18 + wave * 0.105 + partPulse * 0.04 + localInfluence * 0.15 + pointerField * 0.21) * (620.0 / -modelViewPosition.z);
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
  geometry.setAttribute("seed", new THREE.BufferAttribute(createSeeds(pointCount), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createCollectiveModelPartGeometry(
  positions: Float32Array,
  colors: Float32Array,
  partColors: Float32Array,
  partIds: Float32Array,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const pointCount = Math.floor(positions.length / 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("partColor", new THREE.BufferAttribute(partColors, 3));
  geometry.setAttribute("partId", new THREE.BufferAttribute(partIds, 1));
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
      uPointerVelocity: { value: 0 },
      uDragIntensity: { value: 0 },
      uGlobalOpacity: { value: opacity },
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
  positions,
}: {
  colors: Float32Array;
  partColors: Float32Array;
  partIds: Float32Array;
  positions: Float32Array;
}) {
  const { camera, pointer, raycaster, gl } = useThree();
  const { timelineProgressRef } = useArchiveStore();
  const pointsRef = useRef<THREE.Points>(null);
  const influenceRef = useRef(0);
  const velocityRef = useRef(0);
  const dragIntensityRef = useRef(0);
  const pointerDownRef = useRef(false);
  const previousPointerRef = useRef(new THREE.Vector2(pointer.x, pointer.y));
  const inverseWorldMatrixRef = useRef(new THREE.Matrix4());
  const localRayOriginRef = useRef(new THREE.Vector3());
  const localRayDirectionRef = useRef(new THREE.Vector3());
  const pointTexture = useLoader(THREE.TextureLoader, archiveVisualConfig.assets.collectiveParticleTexturePath);
  const geometry = useMemo(
    () => createCollectiveModelPartGeometry(positions, colors, partColors, partIds),
    [colors, partColors, partIds, positions],
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

  useEffect(() => {
    const handlePointerDown = () => {
      pointerDownRef.current = true;
    };
    const handlePointerUp = () => {
      pointerDownRef.current = false;
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const previousPointer = previousPointerRef.current;
    const pointerDelta = Math.hypot(pointer.x - previousPointer.x, pointer.y - previousPointer.y);
    previousPointer.set(pointer.x, pointer.y);
    velocityRef.current += (Math.min(1, pointerDelta * 24) - velocityRef.current) * 0.26;
    dragIntensityRef.current += ((pointerDownRef.current ? 0.56 : 0) - dragIntensityRef.current) * 0.16;
    influenceRef.current += (0.34 - influenceRef.current) * 0.08;
    raycaster.setFromCamera(pointer, camera);

    const progress = timelineProgressRef.current;
    const opacity = getAvatarRevealOpacity(progress);

    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uInfluence.value = influenceRef.current;
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
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={8}
      visible={false}
    />
  );
}
