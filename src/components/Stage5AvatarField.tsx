import { Component, Suspense, useEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarNormalization, normalizePointCloudPositions, sampleObjectSurfacePositions } from "../data/avatarShape";
import { useArchiveStore } from "../state/archiveStore";
import { AvatarPointCloud } from "./AvatarPointCloud";
import { getAvatarBreathingScale } from "./stage5AvatarAnimation";

export function createStage5AvatarFallbackPositions(): Float32Array {
  const positions: number[] = [];
  const rows = 18;
  const ringPoints = 9;

  for (let row = 0; row < rows; row += 1) {
    const y = -5.8 + (row / (rows - 1)) * 11.6;
    const headBlend = Math.max(0, 1 - Math.abs(y - 4.35) / 1.45);
    const shoulderBlend = Math.max(0, 1 - Math.abs(y - 1.85) / 2.8);
    const torsoBlend = Math.max(0, 1 - Math.abs(y + 1.2) / 4.4);
    const radiusX = 0.34 + headBlend * 0.82 + shoulderBlend * 1.85 + torsoBlend * 1.18;
    const radiusZ = 0.22 + headBlend * 0.54 + shoulderBlend * 0.72 + torsoBlend * 0.5;

    for (let point = 0; point < ringPoints; point += 1) {
      const angle = (point / ringPoints) * Math.PI * 2 + row * 0.18;
      positions.push(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ);
    }
  }

  return new Float32Array(positions);
}

function Stage5AvatarFallback() {
  const positions = useMemo(() => createStage5AvatarFallbackPositions(), []);

  return <AvatarPointCloud positions={positions} opacity={0.2} scale={1} />;
}

class Stage5AvatarErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("Stage5 avatar model failed to render; keeping graph and fallback field mounted.", error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function Stage5ModelShell({ scene, rawPositions }: { scene: THREE.Object3D; rawPositions: Float32Array }) {
  const { stage5Navigation } = useArchiveStore();
  const groupRef = useRef<Group>(null);
  const normalization = useMemo(
    () => getAvatarNormalization(rawPositions, archiveVisualConfig.camera.stage5AvatarFieldRadius),
    [rawPositions],
  );
  const shell = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      mesh.raycast = () => null;
      mesh.material = new THREE.MeshStandardMaterial({
        color: archiveVisualConfig.colors.collective,
        emissive: archiveVisualConfig.colors.shared,
        emissiveIntensity: 0.22,
        roughness: 0.42,
        metalness: 0.18,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    });
    return cloned;
  }, [scene]);

  useFrame(({ clock }) => {
    const hoverBoost = stage5Navigation.hoveredNodeId ? 0.035 : 0;
    const breathing = getAvatarBreathingScale(clock.elapsedTime) + hoverBoost;
    groupRef.current?.scale.setScalar(normalization.scale * breathing);
  });

  return (
    <group
      ref={groupRef}
      position={[
        -normalization.center.x * normalization.scale,
        -normalization.center.y * normalization.scale,
        -normalization.center.z * normalization.scale,
      ]}
    >
      <primitive object={shell} />
    </group>
  );
}

function LoadedStage5AvatarField({
  onShapePositions,
}: {
  onShapePositions: (positions: Float32Array) => void;
}) {
  const gltf = useGLTF(archiveVisualConfig.assets.stage5ModelPath);
  const rawPositions = useMemo(() => sampleObjectSurfacePositions(gltf.scene), [gltf.scene]);
  const normalizedPositions = useMemo(
    () => normalizePointCloudPositions(rawPositions, archiveVisualConfig.camera.stage5AvatarFieldRadius),
    [rawPositions],
  );

  useEffect(() => {
    onShapePositions(normalizedPositions);
  }, [normalizedPositions, onShapePositions]);

  return (
    <group>
      <Stage5ModelShell scene={gltf.scene} rawPositions={rawPositions} />
      <AvatarPointCloud positions={normalizedPositions} scale={archiveVisualConfig.camera.stage5AvatarScale} opacity={0.5} />
    </group>
  );
}

export function Stage5AvatarField({
  onShapePositions,
}: {
  onShapePositions: (positions: Float32Array) => void;
}) {
  const fallback = <Stage5AvatarFallback />;

  return (
    <Stage5AvatarErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedStage5AvatarField onShapePositions={onShapePositions} />
      </Suspense>
    </Stage5AvatarErrorBoundary>
  );
}
