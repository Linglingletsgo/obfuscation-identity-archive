import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const environmentVertexShader = `
  attribute float seed;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vGlow;
  uniform float uTime;
  uniform vec2 uPointer;

  void main() {
    vec3 displaced = position;
    float pulse = sin(seed * 41.0 + uTime * 0.55) * 0.5 + 0.5;
    float drift = sin(seed * 17.0 + uTime * 0.28 + position.y * 0.12);
    vec2 pointerSpace = normalize(position.xy + vec2(0.001));
    float pointerGlow = exp(-distance(pointerSpace, uPointer) * 2.2) * 0.42;
    vec3 lightDirection = normalize(vec3(-0.35, 0.58, 0.74));
    float light = dot(normalize(position), lightDirection) * 0.5 + 0.5;

    displaced += normalize(position + vec3(0.01, 0.02, 0.03)) * (0.1 * drift + pointerGlow * 0.34);
    vGlow = 0.16 + pulse * 0.22 + light * 0.34 + pointerGlow;
    vColor = color * (0.34 + light * 0.68 + pointerGlow * 0.62);

    vec4 modelViewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_PointSize = (0.45 + vGlow * 1.35) * (260.0 / -modelViewPosition.z);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const environmentFragmentShader = `
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float radius = length(uv);
    float core = smoothstep(0.22, 0.02, radius);
    float halo = smoothstep(0.5, 0.1, radius);
    float alpha = halo * (0.045 + vGlow * 0.075) + core * 0.1;
    gl_FragColor = vec4(vColor * (0.68 + core * 0.8), alpha);
  }
`;

function createEnvironmentGeometry(pointCount: number): THREE.BufferGeometry {
  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);
  const seeds = new Float32Array(pointCount);
  const palette = [
    new THREE.Color("#1f6fff"),
    new THREE.Color("#42d6b3"),
    new THREE.Color("#ff5c7a"),
    new THREE.Color("#fff8e8"),
    new THREE.Color("#7a5cbd"),
  ];

  for (let index = 0; index < pointCount; index += 1) {
    const seed = ((index * 48271) % 2147483647) / 2147483647;
    const angle = seed * Math.PI * 2;
    const band = (((index * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const radius = 11.5 + (((index * 69621) % 2147483647) / 2147483647) * 9.5;
    const y = band * 9.4;
    const horizontalRadius = radius * (0.78 + Math.abs(band) * 0.28);
    const paletteColor = palette[index % palette.length].clone();
    const shade = 0.45 + seed * 0.55;

    positions[index * 3] = Math.cos(angle) * horizontalRadius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(angle) * horizontalRadius - 3.5;
    colors[index * 3] = paletteColor.r * shade;
    colors[index * 3 + 1] = paletteColor.g * shade;
    colors[index * 3 + 2] = paletteColor.b * shade;
    seeds[index] = seed;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function CollectiveEnvironmentField() {
  const { pointer } = useThree();
  const geometry = useMemo(() => createEnvironmentGeometry(1800), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: environmentVertexShader,
        fragmentShader: environmentFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector2(0, 0) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPointer.value.set(pointer.x, pointer.y);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
