import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveView, CollectiveNavigationMode, CollectiveNavigationState } from "../types/archive";
import { EmptyState, WebGLFallback } from "./FallbackStates";
import { RelationshipGraph3D } from "./RelationshipGraph3D";
import { CollectiveAvatarField } from "./CollectiveAvatarField";
import { AvatarShapeProvider } from "./AvatarShapeContext";
import { CollectiveEnvironmentField } from "./CollectiveEnvironmentField";
import { InteractionTracker, useInteractionState } from "./InteractionContext";
import {
  COLLECTIVE_CAMERA_TRANSITION_END,
  EntryTimeline3D,
  TIMELINE_COLLECTIVE_OFFSET_Y,
  getAvatarRevealOpacity,
  getTimelineCameraPose,
} from "./EntryTimeline3D";
import { getCanvasDevicePixelRatio } from "../utils/renderingPerformance";
import { loadBakedCollectiveModelPointCloud, loadBakedEnvironmentPointCloud } from "../data/bakedPointCloud";

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
const COLLECTIVE_SCENE_POSITION: [number, number, number] = [0, TIMELINE_COLLECTIVE_OFFSET_Y, 0];

export function getCollectiveModeForCameraDistance(distance: number): CollectiveNavigationMode {
  return distance <= archiveVisualConfig.camera.collectiveInternalDistanceThreshold ? "internal" : "overview";
}

export function getCameraPositionForStage(
  view: ArchiveView,
  collectiveNavigation?: CollectiveNavigationState,
): [number, number, number] {
  if (view === "collective") {
    if (collectiveNavigation?.cameraPosition) return [...collectiveNavigation.cameraPosition];
    return [
      archiveVisualConfig.camera.collectivePosition[0],
      archiveVisualConfig.camera.collectivePosition[1] + TIMELINE_COLLECTIVE_OFFSET_Y,
      archiveVisualConfig.camera.collectivePosition[2],
    ];
  }
  return [...archiveVisualConfig.camera.detailPosition];
}

export function getCollectiveCameraTarget(): [number, number, number] {
  return [0, TIMELINE_COLLECTIVE_OFFSET_Y, 0];
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

export function shouldHandleBackgroundPointerMiss(
  eventTarget: EventTarget | null,
  canvasElement: HTMLCanvasElement | null,
  eventSource?: HTMLElement,
): boolean {
  if (!(eventTarget instanceof HTMLElement)) return false;
  if (eventTarget.closest(".identity-billboard, .tag-hover-label, .collective-identity-overlay")) return false;
  return eventTarget === canvasElement || eventTarget === eventSource || eventTarget.classList.contains("archive-scene-shell");
}

function CollectiveCameraStateSync({
  controlsRef,
  enabled,
  resetKey,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  enabled: boolean;
  resetKey: string;
}) {
  const { camera } = useThree();
  const { view, collectiveNavigation, updateCollectiveNavigation } = useArchiveStore();
  const updateCollectiveNavigationRef = useRef(updateCollectiveNavigation);
  const collectiveNavigationRef = useRef(collectiveNavigation);
  const lastSyncedCameraRef = useRef<[number, number, number]>(collectiveNavigation.cameraPosition);
  const fallbackTargetRef = useRef(new THREE.Vector3(...getCollectiveCameraTarget()));
  const resetTargetRef = useRef(new THREE.Vector3());
  const wasEnabledRef = useRef(false);

  useEffect(() => {
    updateCollectiveNavigationRef.current = updateCollectiveNavigation;
  }, [updateCollectiveNavigation]);

  useEffect(() => {
    collectiveNavigationRef.current = collectiveNavigation;
  }, [collectiveNavigation]);

  useEffect(() => {
    if (!enabled || wasEnabledRef.current) return;
    wasEnabledRef.current = true;
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
      resetTargetRef.current.set(...target);
      updateCollectiveNavigationRef.current({
        mode: getCollectiveModeForCameraDistance(camera.position.distanceTo(resetTargetRef.current)),
        cameraPosition: position,
        cameraTarget: target,
      });
    }
  }, [camera, controlsRef, enabled, resetKey, view]);

  useFrame(() => {
    if (view !== "collective" || !enabled) return;

    const controlsTarget = controlsRef.current?.target ?? fallbackTargetRef.current;
    const distance = camera.position.distanceTo(controlsTarget);
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
      if (!enabled) return;
      if (event.key !== "Escape") return;

      camera.position.set(...getCameraPositionForStage("collective"));
      controlsRef.current?.target.set(...getCollectiveCameraTarget());
      controlsRef.current?.update();
      updateCollectiveNavigationRef.current({
        mode: "overview",
        cameraPosition: getCameraPositionForStage("collective"),
        cameraTarget: getCollectiveCameraTarget(),
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camera, controlsRef, enabled]);

  return null;
}

function GlobalInteractionLights() {
  const { camera, raycaster } = useThree();
  const { timelineProgressRef } = useArchiveStore();
  const keyLightRef = useRef<THREE.PointLight>(null);
  const fillLightRef = useRef<THREE.PointLight>(null);
  const interactionRef = useInteractionState();
  const dragBoostRef = useRef(0);
  const velocityRef = useRef(0);
  const previousPointerRef = useRef(new THREE.Vector2(0, 0));
  const lightTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const keyLightTargetRef = useRef(new THREE.Vector3(0, 0, 8));
  const fillLightTargetRef = useRef(new THREE.Vector3(0, 0, -8));
  const lightPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  useFrame(() => {
    const { pointer, isDragging } = interactionRef.current;
    const previousPointer = previousPointerRef.current;
    const pointerDelta = Math.hypot(pointer.x - previousPointer.x, pointer.y - previousPointer.y);
    previousPointer.copy(pointer);
    velocityRef.current += (Math.min(1, pointerDelta * 16) - velocityRef.current) * 0.18;
    dragBoostRef.current += ((isDragging ? 1 : 0) - dragBoostRef.current) * 0.12;

    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(lightPlane, lightTargetRef.current);
    const progress = timelineProgressRef.current;
    const opacity = getAvatarRevealOpacity(progress);
    const intensity = (0.28 + velocityRef.current * 2.4 + dragBoostRef.current * 2.8) * opacity;
    const keyLight = keyLightRef.current;
    const fillLight = fillLightRef.current;

    if (keyLight) {
      keyLightTargetRef.current.set(lightTargetRef.current.x, lightTargetRef.current.y, 6 + dragBoostRef.current * 5);
      keyLight.position.lerp(keyLightTargetRef.current, 0.24);
      keyLight.intensity = intensity;
      keyLight.distance = 30 + dragBoostRef.current * 22;
    }

    if (fillLight) {
      fillLightTargetRef.current.set(-lightTargetRef.current.x * 0.42, lightTargetRef.current.y * 0.3, -8);
      fillLight.position.lerp(fillLightTargetRef.current, 0.18);
      fillLight.intensity = (0.14 + velocityRef.current * 0.7 + dragBoostRef.current * 0.9) * opacity;
      fillLight.distance = 38;
    }
  });

  return (
    <>
      <pointLight ref={keyLightRef} color="#8eefff" distance={34} intensity={0} position={[0, 0, 8]} />
      <pointLight ref={fillLightRef} color="#5d7dff" distance={38} intensity={0} position={[0, 0, -8]} />
    </>
  );
}

function useBakedPointCloudPreload() {
  useEffect(() => {
    let cancelled = false;

    const preload = () => {
      if (cancelled) return;
      void Promise.allSettled([
        loadBakedCollectiveModelPointCloud(archiveVisualConfig.assets.bakedPointClouds.collectiveHigh),
        loadBakedEnvironmentPointCloud(archiveVisualConfig.assets.bakedPointClouds.environmentHigh),
      ]);
    };

    preload();
    return () => {
      cancelled = true;
    };
  }, []);
}

function TransitionLights() {
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const { timelineProgressRef } = useArchiveStore();

  useFrame(() => {
    const progress = timelineProgressRef.current;
    const opacity = getAvatarRevealOpacity(progress);
    if (light1Ref.current) light1Ref.current.intensity = 1.1 * opacity;
    if (light2Ref.current) light2Ref.current.intensity = 0.7 * opacity;
  });

  return (
    <>
      <pointLight ref={light1Ref} position={[-5, 3, 7]} color={archiveVisualConfig.colors.shared} intensity={0} />
      <pointLight ref={light2Ref} position={[5, -2, -6]} color={archiveVisualConfig.colors.tag} intensity={0} />
    </>
  );
}

function NavigationStateSync({
  setEnabled,
  enabled,
}: {
  setEnabled: (val: boolean) => void;
  enabled: boolean;
}) {
  const { timelineProgressRef } = useArchiveStore();

  useFrame(() => {
    const isEnabled = timelineProgressRef.current >= COLLECTIVE_CAMERA_TRANSITION_END;
    if (isEnabled !== enabled) {
      setEnabled(isEnabled);
    }
  });

  return null;
}

export function ArchiveScene({ canvasEventSource }: { canvasEventSource?: HTMLElement } = {}) {
  const { graph, selectNode, view, collectiveNavigation, updateCollectiveNavigation, timelineProgressRef } = useArchiveStore();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [webglRestartVersion, setWebglRestartVersion] = useState(0);
  const [avatarShapePositions, setAvatarShapePositions] = useState<Float32Array | null>(null);
  useBakedPointCloudPreload();
  const handleShapePositions = useCallback((positions: Float32Array) => {
    setAvatarShapePositions((current) => (current === positions ? current : positions));
  }, []);
  const handleCanvasRef = useCallback((element: HTMLCanvasElement | null) => {
    setCanvasElement(element);
  }, []);
  const handlePointerMissed = useCallback((event: MouseEvent) => {
    if (!shouldHandleBackgroundPointerMiss(event.target, canvasElement, canvasEventSource)) return;
    if (view !== "collective") return;
    selectNode(null);
    updateCollectiveNavigation({
      selectedIdentityId: null,
      hoveredNodeId: null,
      hoveredTagLabel: null,
    });
  }, [canvasElement, canvasEventSource, selectNode, updateCollectiveNavigation, view]);

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
      position: getTimelineCameraPose(0).position,
      fov: 45,
    }),
    [webglRestartVersion],
  );
  const collectiveSceneReady = avatarShapePositions !== null;
  const [collectiveNavigationEnabled, setCollectiveNavigationEnabled] = useState(false);

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
      dpr={getCanvasDevicePixelRatio()}
      eventPrefix={canvasEventSource ? "client" : undefined}
      eventSource={canvasEventSource}
      gl={{ alpha: true }}
      onPointerMissed={handlePointerMissed}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 8]} intensity={1.2} />
      <InteractionTracker>
        <EntryTimeline3D />
        {view === "collective" ? (
          <group position={COLLECTIVE_SCENE_POSITION}>
            <GlobalInteractionLights />
            <Suspense fallback={null}>
              <CollectiveEnvironmentField />
            </Suspense>
            <TransitionLights />
          </group>
        ) : null}
        <group position={COLLECTIVE_SCENE_POSITION}>
          {shouldRenderCollectiveAvatarField(view) ? (
            <CollectiveAvatarField onShapePositions={handleShapePositions} />
          ) : null}
          {shouldRenderGraphOutsideCollectiveAvatarSuspense(view) && collectiveSceneReady ? (
            <AvatarShapeProvider value={avatarShapePositions}>
              <RelationshipGraph3D graph={graph} />
            </AvatarShapeProvider>
          ) : collectiveSceneReady ? (
            <Suspense fallback={null}>
              <RelationshipGraph3D graph={graph} />
            </Suspense>
          ) : null}
        </group>
        <NavigationStateSync setEnabled={setCollectiveNavigationEnabled} enabled={collectiveNavigationEnabled} />
        <CollectiveCameraStateSync
          controlsRef={controlsRef}
          enabled={collectiveNavigationEnabled}
          resetKey={`collective:${webglRestartVersion}`}
        />
        <OrbitControls
          ref={controlsRef}
          enabled={collectiveNavigationEnabled}
          enableDamping
          enablePan={collectiveNavigationEnabled && !shouldDisableCollectivePan(view)}
          enableRotate={collectiveNavigationEnabled}
          enableZoom={collectiveNavigationEnabled}
          autoRotate={false}
          minDistance={archiveVisualConfig.camera.minDistance}
          maxDistance={archiveVisualConfig.camera.maxDistance}
        />
      </InteractionTracker>
    </Canvas>
  );
}
