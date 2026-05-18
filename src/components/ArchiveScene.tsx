import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveView, CollectiveNavigationMode, CollectiveNavigationState } from "../types/archive";
import { EmptyState, WebGLFallback } from "./FallbackStates";
import { RelationshipGraph3D } from "./RelationshipGraph3D";
import { CollectiveAvatarField } from "./CollectiveAvatarField";
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

export function getCollectiveModeForCameraDistance(distance: number): CollectiveNavigationMode {
  return distance <= archiveVisualConfig.camera.collectiveInternalDistanceThreshold ? "internal" : "overview";
}

export function getCameraPositionForStage(
  view: ArchiveView,
  collectiveNavigation?: CollectiveNavigationState,
): [number, number, number] {
  if (view === "collective") return [...(collectiveNavigation?.cameraPosition ?? archiveVisualConfig.camera.collectivePosition)];
  return [...archiveVisualConfig.camera.detailPosition];
}

export function getCollectiveCameraTarget(): [number, number, number] {
  return [0, 0, 0];
}

export function getCameraTargetForStage(
  view: ArchiveView,
  collectiveNavigation?: CollectiveNavigationState,
): [number, number, number] {
  if (view === "collective") return [...(collectiveNavigation?.cameraTarget ?? getCollectiveCameraTarget())];
  return getCollectiveCameraTarget();
}

export function shouldDisableCollectivePan(view: ArchiveView): boolean {
  return view === "collective";
}

export function shouldRenderCollectiveAvatarField(view: ArchiveView): boolean {
  return view === "collective";
}

export function shouldRenderGraphOutsideCollectiveAvatarSuspense(view: ArchiveView): boolean {
  return view === "collective";
}

export function shouldRenderWebGLStage(view: ArchiveView): boolean {
  return view === "collective";
}

export function getNextWebGLRestartVersion(currentVersion: number): number {
  return currentVersion + 1;
}

function CollectiveCameraStateSync({
  controlsRef,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const { view, collectiveNavigation, updateCollectiveNavigation } = useArchiveStore();
  const updateCollectiveNavigationRef = useRef(updateCollectiveNavigation);
  const collectiveNavigationRef = useRef(collectiveNavigation);
  const lastSyncedCameraRef = useRef<[number, number, number]>(collectiveNavigation.cameraPosition);

  useEffect(() => {
    updateCollectiveNavigationRef.current = updateCollectiveNavigation;
  }, [updateCollectiveNavigation]);

  useEffect(() => {
    collectiveNavigationRef.current = collectiveNavigation;
  }, [collectiveNavigation]);

  useEffect(() => {
    const position = getCameraPositionForStage(view, collectiveNavigationRef.current);
    const target = getCameraTargetForStage(view, collectiveNavigationRef.current);
    camera.position.set(...position);
    lastSyncedCameraRef.current = position;

    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...target);
      controls.update();
    }

    if (view === "collective") {
      updateCollectiveNavigationRef.current({
        mode: getCollectiveModeForCameraDistance(camera.position.length()),
        cameraPosition: position,
        cameraTarget: target,
      });
    }
  }, [camera, controlsRef, view]);

  useFrame(() => {
    if (view !== "collective") return;

    const distance = camera.position.length();
    const mode = getCollectiveModeForCameraDistance(distance);
    const position: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
    const previousPosition = lastSyncedCameraRef.current;
    const moved =
      Math.hypot(
        position[0] - previousPosition[0],
        position[1] - previousPosition[1],
        position[2] - previousPosition[2],
      ) > 0.04;

    if (mode !== collectiveNavigation.mode || moved) {
      lastSyncedCameraRef.current = position;
      updateCollectiveNavigation({
        mode,
        cameraPosition: position,
        cameraTarget: controlsRef.current
          ? [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z]
          : collectiveNavigation.cameraTarget,
      });
    }
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      camera.position.set(...archiveVisualConfig.camera.collectivePosition);
      controlsRef.current?.target.set(...getCollectiveCameraTarget());
      controlsRef.current?.update();
      updateCollectiveNavigationRef.current({
        mode: "overview",
        cameraPosition: [...archiveVisualConfig.camera.collectivePosition],
        cameraTarget: getCollectiveCameraTarget(),
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camera, controlsRef]);

  return null;
}

export function ArchiveScene() {
  const { graph, selectNode, view, collectiveNavigation, updateCollectiveNavigation } = useArchiveStore();
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
    if (view !== "collective") return;
    selectNode(null);
    updateCollectiveNavigation({
      selectedIdentityId: null,
      hoveredNodeId: null,
      hoveredTagLabel: null,
    });
  }, [selectNode, updateCollectiveNavigation, view]);

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
      position: getCameraPositionForStage(view, collectiveNavigation),
      fov: 45,
    }),
    [webglRestartVersion],
  );

  if (!graph || graph.nodes.length === 0) return <EmptyState message="No archive nodes are available" />;
  if (!shouldRenderWebGLStage(view)) return <div className="archive-2d-stage-backdrop" aria-hidden="true" />;
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
      {view === "collective" ? (
        <>
          <pointLight position={[-5, 3, 7]} intensity={1.1} color={archiveVisualConfig.colors.shared} />
          <pointLight position={[5, -2, -6]} intensity={0.7} color={archiveVisualConfig.colors.tag} />
        </>
      ) : null}
      {shouldRenderCollectiveAvatarField(view) ? <CollectiveAvatarField onShapePositions={handleShapePositions} /> : null}
      {shouldRenderGraphOutsideCollectiveAvatarSuspense(view) ? (
        <AvatarShapeProvider value={avatarShapePositions}>
          <RelationshipGraph3D graph={graph} />
        </AvatarShapeProvider>
      ) : (
        <Suspense fallback={null}>
          <RelationshipGraph3D graph={graph} />
        </Suspense>
      )}
      <CollectiveCameraStateSync controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        enablePan={!shouldDisableCollectivePan(view)}
        autoRotate={false}
        minDistance={archiveVisualConfig.camera.minDistance}
        maxDistance={archiveVisualConfig.camera.maxDistance}
      />
    </Canvas>
  );
}
