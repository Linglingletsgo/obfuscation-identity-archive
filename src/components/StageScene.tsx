import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { Stage5NavigationMode, Stage5NavigationState } from "../types/archive";
import { EmptyState, WebGLFallback } from "./FallbackStates";
import { RelationshipGraph3D } from "./RelationshipGraph3D";
import { Stage5AvatarField } from "./Stage5AvatarField";
import { AvatarShapeProvider } from "./AvatarShapeContext";

type WebGLContextLike = {
  getExtension: (name: string) => { loseContext?: () => void } | null;
};

export function createWebGLSupportChecker(createCanvas: () => HTMLCanvasElement): () => boolean {
  let cachedSupport: boolean | null = null;

  return () => {
    if (cachedSupport !== null) return cachedSupport;

    const canvas = createCanvas();
    const context = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLContextLike | null;
    cachedSupport = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext?.();
    return cachedSupport;
  };
}

const hasWebGL = createWebGLSupportChecker(() => document.createElement("canvas"));

export function getStage5ModeForCameraDistance(distance: number): Stage5NavigationMode {
  return distance <= archiveVisualConfig.camera.stage5InternalDistanceThreshold ? "internal" : "overview";
}

export function getCameraPositionForStage(
  stage: number,
  stage5Navigation?: Stage5NavigationState,
): [number, number, number] {
  if (stage === 2) return [...(stage5Navigation?.cameraPosition ?? archiveVisualConfig.camera.stage5Position)];
  return [...archiveVisualConfig.camera.detailPosition];
}

export function getStage5CameraTarget(): [number, number, number] {
  return [0, 0, 0];
}

export function getCameraTargetForStage(
  stage: number,
  stage5Navigation?: Stage5NavigationState,
): [number, number, number] {
  if (stage === 2) return [...(stage5Navigation?.cameraTarget ?? getStage5CameraTarget())];
  return getStage5CameraTarget();
}

export function shouldDisableStage5Pan(stage: number): boolean {
  return stage === 2;
}

export function shouldRenderStage5AvatarField(stage: number): boolean {
  return stage === 2;
}

export function shouldRenderGraphOutsideStage5AvatarSuspense(stage: number): boolean {
  return stage === 2;
}

export function shouldRenderWebGLStage(stage: number): boolean {
  return stage === 2;
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
  const stage5NavigationRef = useRef(stage5Navigation);
  const lastSyncedCameraRef = useRef<[number, number, number]>(stage5Navigation.cameraPosition);

  useEffect(() => {
    updateStage5NavigationRef.current = updateStage5Navigation;
  }, [updateStage5Navigation]);

  useEffect(() => {
    stage5NavigationRef.current = stage5Navigation;
  }, [stage5Navigation]);

  useEffect(() => {
    const position = getCameraPositionForStage(stage, stage5NavigationRef.current);
    const target = getCameraTargetForStage(stage, stage5NavigationRef.current);
    camera.position.set(...position);
    lastSyncedCameraRef.current = position;

    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...target);
      controls.update();
    }

    if (stage === 2) {
      updateStage5NavigationRef.current({
        mode: getStage5ModeForCameraDistance(camera.position.length()),
        cameraPosition: position,
        cameraTarget: target,
      });
    }
  }, [camera, controlsRef, stage]);

  useFrame(() => {
    if (stage !== 2) return;

    const distance = camera.position.length();
    const mode = getStage5ModeForCameraDistance(distance);
    const position: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
    const previousPosition = lastSyncedCameraRef.current;
    const moved =
      Math.hypot(
        position[0] - previousPosition[0],
        position[1] - previousPosition[1],
        position[2] - previousPosition[2],
      ) > 0.04;

    if (mode !== stage5Navigation.mode || moved) {
      lastSyncedCameraRef.current = position;
      updateStage5Navigation({
        mode,
        cameraPosition: position,
        cameraTarget: controlsRef.current
          ? [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z]
          : stage5Navigation.cameraTarget,
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
  const { graph, selectNode, stage, stage5Navigation, updateStage5Navigation } = useArchiveStore();
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
  const handlePointerMissed = useCallback(() => {
    if (stage !== 2) return;
    selectNode(null);
    updateStage5Navigation({
      selectedIdentityId: null,
      hoveredNodeId: null,
      hoveredTagLabel: null,
    });
  }, [selectNode, stage, updateStage5Navigation]);

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

  const canvasCamera = useMemo(
    () => ({
      position: getCameraPositionForStage(stage, stage5Navigation),
      fov: 45,
    }),
    [webglRestartVersion],
  );

  if (!graph || graph.nodes.length === 0) return <EmptyState message="No archive nodes are available" />;
  if (!shouldRenderWebGLStage(stage)) return <div className="archive-2d-stage-backdrop" aria-hidden="true" />;
  if (!hasWebGL()) return <WebGLFallback />;

  return (
    <Canvas
      key={webglRestartVersion}
      ref={handleCanvasRef}
      camera={canvasCamera}
      className="archive-canvas"
      data-webgl-restart-version={webglRestartVersion}
      onPointerMissed={handlePointerMissed}
    >
      <color attach="background" args={[archiveVisualConfig.colors.paper]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 8]} intensity={1.2} />
      {stage === 2 ? (
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
