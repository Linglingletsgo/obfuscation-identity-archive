import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  attribute vec3 color;
  attribute float seed;
  varying vec3 vColor;
  uniform float uTime;
  uniform vec3 uRayOrigin;
  uniform vec3 uRayDirection;
  uniform float uInfluence;
  uniform float uPointerVelocity;

  void main() {
    vec3 displaced = position;
    float rayT = max(dot(position - uRayOrigin, uRayDirection), 0.0);
    vec3 rayPoint = uRayOrigin + uRayDirection * rayT;
    float distanceToRay = distance(position, rayPoint);
    float wave = sin(seed * 18.0 + uTime * 2.7) * 0.5 + 0.5;
    float filament = sin(seed * 31.0 + uTime * 4.1 + rayT * 0.22) * 0.5 + 0.5;
    float localInfluence = uInfluence * exp(-distanceToRay * 0.42) * (0.55 + filament * 0.62);
    vec3 direction = normalize(position + vec3(0.001, 0.013, 0.007));
    vec3 swirl = normalize(cross(uRayDirection, direction) + vec3(0.001, 0.002, 0.003));
    displaced += direction * (0.045 * wave + localInfluence * (0.38 + wave * 0.22));
    displaced += swirl * localInfluence * (0.42 + uPointerVelocity * 0.95) * sin(uTime * 6.0 + seed * 44.0);

    vColor = color * (0.42 + wave * 0.2 + localInfluence * (1.05 + uPointerVelocity * 0.9));
    vec4 modelViewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_PointSize = (0.38 + wave * 0.24 + localInfluence * (2.4 + uPointerVelocity * 3.2)) * (620.0 / -modelViewPosition.z);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float radius = length(uv);
    float core = smoothstep(0.22, 0.02, radius);
    float halo = smoothstep(0.5, 0.08, radius);
    vec3 highlight = vColor + vec3(0.14, 0.18, 0.1) * core;
    gl_FragColor = vec4(highlight, halo * 0.28 + core * 0.38);
  }
`;

function createSeeds(pointCount: number): Float32Array {
  const seeds = new Float32Array(pointCount);
  for (let index = 0; index < pointCount; index += 1) {
    seeds[index] = ((index * 16807) % 2147483647) / 2147483647;
  }
  return seeds;
}

export function createStage2ModelPointGeometry(positions: Float32Array, colors: Float32Array): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const pointCount = Math.floor(positions.length / 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(createSeeds(pointCount), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createStage2ModelPointMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uRayOrigin: { value: new THREE.Vector3(0, 0, 999) },
      uRayDirection: { value: new THREE.Vector3(0, 0, -1) },
      uInfluence: { value: 0 },
      uPointerVelocity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

export function Stage2ModelPointCloud({
  colors,
  positions,
}: {
  colors: Float32Array;
  positions: Float32Array;
}) {
  const { camera, pointer, raycaster } = useThree();
  const influenceRef = useRef(0);
  const velocityRef = useRef(0);
  const previousPointerRef = useRef(new THREE.Vector2(pointer.x, pointer.y));
  const geometry = useMemo(() => createStage2ModelPointGeometry(positions, colors), [colors, positions]);
  const material = useMemo(() => createStage2ModelPointMaterial(), []);

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
    velocityRef.current += (Math.min(1, pointerDelta * 18) - velocityRef.current) * 0.22;
    influenceRef.current += (0.78 - influenceRef.current) * 0.08;
    raycaster.setFromCamera(pointer, camera);

    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uInfluence.value = influenceRef.current;
    material.uniforms.uPointerVelocity.value = velocityRef.current;
    material.uniforms.uRayOrigin.value.copy(raycaster.ray.origin);
    material.uniforms.uRayDirection.value.copy(raycaster.ray.direction);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={8} />;
}
