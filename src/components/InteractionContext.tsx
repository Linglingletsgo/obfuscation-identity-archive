import { createContext, useContext, useEffect, useRef, type ReactNode, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface InteractionState {
  pointer: THREE.Vector2;
  isDragging: boolean;
  isInside: boolean;
}

const InteractionContext = createContext<MutableRefObject<InteractionState> | null>(null);

export const InteractionProvider = InteractionContext.Provider;

type ClientInteractionState = {
  clientX: number;
  clientY: number;
  hasPointer: boolean;
  isDragging: boolean;
  isInsideViewport: boolean;
};

const clientState: ClientInteractionState = {
  clientX: 0,
  clientY: 0,
  hasPointer: false,
  isDragging: false,
  isInsideViewport: false,
};

let globalListenersInstalled = false;

function updateClientPosition(clientX: number, clientY: number) {
  clientState.clientX = clientX;
  clientState.clientY = clientY;
  clientState.hasPointer = true;
  clientState.isInsideViewport =
    clientX >= 0 &&
    clientY >= 0 &&
    clientX <= Math.max(1, window.innerWidth) &&
    clientY <= Math.max(1, window.innerHeight);
}

function updateFromPointerEvent(event: PointerEvent) {
  updateClientPosition(event.clientX, event.clientY);
}

function updateFromMouseEvent(event: MouseEvent) {
  updateClientPosition(event.clientX, event.clientY);
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  clientState.isDragging = true;
  updateFromPointerEvent(event);
}

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;
  clientState.isDragging = true;
  updateFromMouseEvent(event);
}

function clearDragState() {
  clientState.isDragging = false;
}

function resetInteractionState() {
  clientState.hasPointer = false;
  clearDragState();
}

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") resetInteractionState();
}

export function ensureGlobalInteractionListeners() {
  if (globalListenersInstalled || typeof window === "undefined" || typeof document === "undefined") return;
  globalListenersInstalled = true;

  const pointerOptions = { capture: true, passive: true } as const;
  window.addEventListener("pointerdown", handlePointerDown, pointerOptions);
  document.addEventListener("pointerdown", handlePointerDown, pointerOptions);
  window.addEventListener("pointermove", updateFromPointerEvent, pointerOptions);
  document.addEventListener("pointermove", updateFromPointerEvent, pointerOptions);
  window.addEventListener("pointerrawupdate", updateFromPointerEvent as EventListener, pointerOptions);
  document.addEventListener("pointerrawupdate", updateFromPointerEvent as EventListener, pointerOptions);
  window.addEventListener("pointerup", clearDragState, pointerOptions);
  document.addEventListener("pointerup", clearDragState, pointerOptions);
  window.addEventListener("pointercancel", resetInteractionState, pointerOptions);
  document.addEventListener("pointercancel", resetInteractionState, pointerOptions);
  window.addEventListener("pointerleave", resetInteractionState, pointerOptions);
  window.addEventListener("blur", resetInteractionState, pointerOptions);
  window.addEventListener("mousemove", updateFromMouseEvent, pointerOptions);
  document.addEventListener("mousemove", updateFromMouseEvent, pointerOptions);
  window.addEventListener("mousedown", handleMouseDown, pointerOptions);
  document.addEventListener("mousedown", handleMouseDown, pointerOptions);
  window.addEventListener("mouseup", clearDragState, pointerOptions);
  document.addEventListener("mouseup", clearDragState, pointerOptions);
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

export function syncInteractionStateFromClient(
  state: InteractionState,
  element: Pick<HTMLElement, "getBoundingClientRect">,
) {
  if (!clientState.hasPointer) {
    state.pointer.set(0, 0);
    state.isDragging = clientState.isDragging;
    state.isInside = false;
    return;
  }

  const rect = element.getBoundingClientRect();
  const x = ((clientState.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
  const y = -((clientState.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
  const isInsideCanvas = x >= -1 && x <= 1 && y >= -1 && y <= 1;

  state.pointer.set(x, y);
  state.isDragging = clientState.isDragging;
  state.isInside = isInsideCanvas || clientState.isDragging;
}

export function resetGlobalInteractionStateForTests() {
  clientState.clientX = 0;
  clientState.clientY = 0;
  clientState.hasPointer = false;
  clientState.isDragging = false;
  clientState.isInsideViewport = false;
}

export function getGlobalClientInteractionSnapshot(): Readonly<ClientInteractionState> {
  return clientState;
}

export function useInteractionState(): MutableRefObject<InteractionState> {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error("useInteractionState must be used within an InteractionProvider");
  }
  return context;
}

export function InteractionTracker({ children }: { children: ReactNode }) {
  const { gl } = useThree();
  const stateRef = useRef<InteractionState>({
    pointer: new THREE.Vector2(0, 0),
    isDragging: false,
    isInside: false,
  });

  useEffect(() => {
    ensureGlobalInteractionListeners();
  }, []);

  useFrame(() => {
    syncInteractionStateFromClient(stateRef.current, gl.domElement);
  }, -100);

  return (
    <InteractionProvider value={stateRef}>
      {children}
    </InteractionProvider>
  );
}
