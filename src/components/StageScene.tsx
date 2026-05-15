import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import { AvatarPointCloud } from "./AvatarPointCloud";
import { EmptyState, WebGLFallback } from "./FallbackStates";
import { RelationshipGraph3D } from "./RelationshipGraph3D";

function hasWebGL(): boolean {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
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
      <Suspense fallback={null}>
        {stage === 5 ? <AvatarPointCloud modelPath={archiveVisualConfig.assets.stage5ModelPath} /> : null}
        <RelationshipGraph3D graph={graph} />
      </Suspense>
      <OrbitControls
        enableDamping
        autoRotate={false}
        minDistance={archiveVisualConfig.camera.minDistance}
        maxDistance={archiveVisualConfig.camera.maxDistance}
      />
    </Canvas>
  );
}
