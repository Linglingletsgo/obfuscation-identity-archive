import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useEffect } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { Stage5NavigationMode } from "../types/archive";
import { EmptyState, WebGLFallback } from "./FallbackStates";
import { RelationshipGraph3D } from "./RelationshipGraph3D";
import { Stage5AvatarField } from "./Stage5AvatarField";

function hasWebGL(): boolean {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
}

export function getStage5ModeForCameraDistance(distance: number): Stage5NavigationMode {
  return distance <= archiveVisualConfig.camera.stage5InternalDistanceThreshold ? "internal" : "overview";
}

export function shouldRenderStage5AvatarField(stage: number): boolean {
  return stage === 5;
}

function Stage5CameraStateSync() {
  const { camera } = useThree();
  const { stage, stage5Navigation, updateStage5Navigation } = useArchiveStore();

  useFrame(() => {
    if (stage !== 5) return;

    const distance = camera.position.length();
    const mode = getStage5ModeForCameraDistance(distance);
    if (mode !== stage5Navigation.mode) {
      updateStage5Navigation({
        mode,
        cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
      });
    }
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      camera.position.set(...archiveVisualConfig.camera.stage5Position);
      updateStage5Navigation({
        mode: "overview",
        cameraPosition: [...archiveVisualConfig.camera.stage5Position],
        cameraTarget: [0, 0, 0],
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camera, updateStage5Navigation]);

  return null;
}

export function StageScene() {
  const { graph, stage } = useArchiveStore();

  if (!hasWebGL()) return <WebGLFallback />;
  if (!graph || graph.nodes.length === 0) return <EmptyState message="No archive nodes are available" />;

  const cameraPosition =
    stage === 5 ? archiveVisualConfig.camera.stage5Position : archiveVisualConfig.camera.detailPosition;

  return (
    <Canvas camera={{ position: [...cameraPosition], fov: 45 }} className="archive-canvas">
      <color attach="background" args={[archiveVisualConfig.colors.paper]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 8]} intensity={1.2} />
      {stage === 5 ? (
        <>
          <pointLight position={[-5, 3, 7]} intensity={1.1} color={archiveVisualConfig.colors.shared} />
          <pointLight position={[5, -2, -6]} intensity={0.7} color={archiveVisualConfig.colors.tag} />
        </>
      ) : null}
      {shouldRenderStage5AvatarField(stage) ? <Stage5AvatarField /> : null}
      <Suspense fallback={null}>
        <RelationshipGraph3D graph={graph} />
      </Suspense>
      <Stage5CameraStateSync />
      <OrbitControls
        enableDamping
        autoRotate={false}
        minDistance={archiveVisualConfig.camera.minDistance}
        maxDistance={archiveVisualConfig.camera.maxDistance}
      />
    </Canvas>
  );
}
