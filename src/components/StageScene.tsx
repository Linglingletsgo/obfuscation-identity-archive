import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { Stage5NavigationMode } from "../types/archive";
import { EmptyState, WebGLFallback } from "./FallbackStates";
import { RelationshipGraph3D } from "./RelationshipGraph3D";
import { Stage5AvatarField } from "./Stage5AvatarField";
import { AvatarShapeProvider } from "./AvatarShapeContext";

function hasWebGL(): boolean {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
}

export function getStage5ModeForCameraDistance(distance: number): Stage5NavigationMode {
  return distance <= archiveVisualConfig.camera.stage5InternalDistanceThreshold ? "internal" : "overview";
}

export function getCameraPositionForStage(stage: number): [number, number, number] {
  return stage === 5 ? [...archiveVisualConfig.camera.stage5Position] : [...archiveVisualConfig.camera.detailPosition];
}

export function getStage5CameraTarget(): [number, number, number] {
  return [0, 0, 0];
}

export function shouldDisableStage5Pan(stage: number): boolean {
  return stage === 5;
}

export function shouldRenderStage5AvatarField(stage: number): boolean {
  return stage === 5;
}

export function shouldRenderGraphOutsideStage5AvatarSuspense(stage: number): boolean {
  return stage === 5;
}

export function getNextWebGLRestartVersion(currentVersion: number): number {
  return currentVersion + 1;
}

function Stage5CameraStateSync({
  controlsRef,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const { stage, stage5Navigation, updateStage5Navigation } = useArchiveStore();
  const updateStage5NavigationRef = useRef(updateStage5Navigation);

  useEffect(() => {
    updateStage5NavigationRef.current = updateStage5Navigation;
  }, [updateStage5Navigation]);

  useEffect(() => {
    const position = getCameraPositionForStage(stage);
    camera.position.set(...position);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...getStage5CameraTarget());
      controls.update();
    }

    if (stage === 5) {
      updateStage5NavigationRef.current({
        mode: getStage5ModeForCameraDistance(camera.position.length()),
        cameraPosition: position,
        cameraTarget: getStage5CameraTarget(),
      });
    }
  }, [camera, controlsRef, stage]);

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
      controlsRef.current?.target.set(...getStage5CameraTarget());
      controlsRef.current?.update();
      updateStage5NavigationRef.current({
        mode: "overview",
        cameraPosition: [...archiveVisualConfig.camera.stage5Position],
        cameraTarget: getStage5CameraTarget(),
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camera, controlsRef]);

  return null;
}

export function StageScene() {
  const { graph, stage } = useArchiveStore();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [webglRestartVersion, setWebglRestartVersion] = useState(0);
  const [avatarShapePositions, setAvatarShapePositions] = useState<Float32Array | null>(null);
  const handleShapePositions = useCallback((positions: Float32Array) => {
    setAvatarShapePositions((current) => (current === positions ? current : positions));
  }, []);
  const handleCanvasRef = useCallback((element: HTMLCanvasElement | null) => {
    setCanvasElement(element);
  }, []);

  useEffect(() => {
    if (!canvasElement) return undefined;

    function handleContextLost(event: Event) {
      event.preventDefault();
      if (restartTimerRef.current !== null) return;

      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        setAvatarShapePositions(null);
        setWebglRestartVersion(getNextWebGLRestartVersion);
      }, 80);
    }

    canvasElement.addEventListener("webglcontextlost", handleContextLost, false);
    return () => {
      canvasElement.removeEventListener("webglcontextlost", handleContextLost, false);
    };
  }, [canvasElement]);

  useEffect(
    () => () => {
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    },
    [],
  );

  if (!hasWebGL()) return <WebGLFallback />;
  if (!graph || graph.nodes.length === 0) return <EmptyState message="No archive nodes are available" />;

  const cameraPosition = getCameraPositionForStage(stage);

  return (
    <Canvas
      key={webglRestartVersion}
      ref={handleCanvasRef}
      camera={{ position: [...cameraPosition], fov: 45 }}
      className="archive-canvas"
      data-webgl-restart-version={webglRestartVersion}
    >
      <color attach="background" args={[archiveVisualConfig.colors.paper]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 8]} intensity={1.2} />
      {stage === 5 ? (
        <>
          <pointLight position={[-5, 3, 7]} intensity={1.1} color={archiveVisualConfig.colors.shared} />
          <pointLight position={[5, -2, -6]} intensity={0.7} color={archiveVisualConfig.colors.tag} />
        </>
      ) : null}
      {shouldRenderStage5AvatarField(stage) ? <Stage5AvatarField onShapePositions={handleShapePositions} /> : null}
      {shouldRenderGraphOutsideStage5AvatarSuspense(stage) ? (
        <AvatarShapeProvider value={avatarShapePositions}>
          <RelationshipGraph3D graph={graph} />
        </AvatarShapeProvider>
      ) : (
        <Suspense fallback={null}>
          <RelationshipGraph3D graph={graph} />
        </Suspense>
      )}
      <Stage5CameraStateSync controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        enablePan={!shouldDisableStage5Pan(stage)}
        autoRotate={false}
        minDistance={archiveVisualConfig.camera.minDistance}
        maxDistance={archiveVisualConfig.camera.maxDistance}
      />
    </Canvas>
  );
}
