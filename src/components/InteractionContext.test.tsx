import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { MutableRefObject } from "react";
import {
  ensureGlobalInteractionListeners,
  getGlobalClientInteractionSnapshot,
  InteractionTracker,
  resetGlobalInteractionStateForTests,
  syncInteractionStateFromClient,
  useInteractionState,
  type InteractionState,
} from "./InteractionContext";

const fiberMock = vi.hoisted(() => ({
  frameCallbacks: [] as Array<() => void>,
  useThree: vi.fn(),
}));

vi.mock("@react-three/fiber", () => ({
  useFrame: (callback: () => void) => {
    fiberMock.frameCallbacks.push(callback);
  },
  useThree: fiberMock.useThree,
}));

function dispatchPointer(type: string, init: Partial<PointerEvent> = {}) {
  const event = new Event(type);
  Object.assign(event, {
    button: 0,
    clientX: 50,
    clientY: 50,
    pointerType: "mouse",
    ...init,
  });
  window.dispatchEvent(event);
}

function StateReader({ onState }: { onState: (state: MutableRefObject<InteractionState>) => void }) {
  onState(useInteractionState());
  return null;
}

function expectInteractionState(
  stateRef: MutableRefObject<InteractionState> | null,
): MutableRefObject<InteractionState> {
  expect(stateRef).not.toBeNull();
  return stateRef as MutableRefObject<InteractionState>;
}

describe("InteractionTracker", () => {
  beforeEach(() => {
    fiberMock.frameCallbacks.length = 0;
    resetGlobalInteractionStateForTests();
    const element = document.createElement("canvas");
    element.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    (fiberMock.useThree as Mock).mockReturnValue({ gl: { domElement: element } });
  });

  function runFrame() {
    for (const callback of fiberMock.frameCallbacks) callback();
  }

  it("converts global client coordinates into canvas NDC every frame", () => {
    ensureGlobalInteractionListeners();
    const state: InteractionState = {
      pointer: { set: vi.fn(), x: 0, y: 0 } as any,
      isDragging: false,
      isInside: false,
    };
    const element = {
      getBoundingClientRect: () =>
        ({
          left: 10,
          top: 20,
          width: 200,
          height: 100,
        }) as DOMRect,
    };

    dispatchPointer("pointermove", { clientX: 110, clientY: 70 });
    syncInteractionStateFromClient(state, element);

    expect(state.pointer.set).toHaveBeenCalledWith(0, 0);
    expect(state.isInside).toBe(true);
  });

  it("resets drag state when pointer capture is cancelled", () => {
    let stateRef: MutableRefObject<InteractionState> | null = null;
    render(
      <InteractionTracker>
        <StateReader onState={(nextStateRef) => (stateRef = nextStateRef)} />
      </InteractionTracker>,
    );
    const state = expectInteractionState(stateRef);

    dispatchPointer("pointerdown");
    runFrame();
    expect(state.current.isDragging).toBe(true);
    expect(state.current.isInside).toBe(true);

    dispatchPointer("pointercancel");
    runFrame();

    expect(state.current.isDragging).toBe(false);
    expect(state.current.isInside).toBe(false);
  });

  it("keeps hover coordinates available after pointerup", () => {
    ensureGlobalInteractionListeners();

    dispatchPointer("pointerdown", { clientX: 42, clientY: 44 });
    dispatchPointer("pointerup", { clientX: 42, clientY: 44 });

    expect(getGlobalClientInteractionSnapshot()).toMatchObject({
      clientX: 42,
      clientY: 44,
      hasPointer: true,
      isDragging: false,
      isInsideViewport: true,
    });
  });

  it("resets stale interaction state when the window loses pointer focus", () => {
    let stateRef: MutableRefObject<InteractionState> | null = null;
    render(
      <InteractionTracker>
        <StateReader onState={(nextStateRef) => (stateRef = nextStateRef)} />
      </InteractionTracker>,
    );
    const state = expectInteractionState(stateRef);

    dispatchPointer("pointerdown");
    runFrame();
    expect(state.current.isDragging).toBe(true);

    window.dispatchEvent(new Event("pointerleave"));
    runFrame();

    expect(state.current.isDragging).toBe(false);
  });

  it("resets stale interaction state when the page is hidden", () => {
    let stateRef: MutableRefObject<InteractionState> | null = null;
    render(
      <InteractionTracker>
        <StateReader onState={(nextStateRef) => (stateRef = nextStateRef)} />
      </InteractionTracker>,
    );
    const state = expectInteractionState(stateRef);

    dispatchPointer("pointerdown");
    runFrame();
    expect(state.current.isDragging).toBe(true);

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    runFrame();

    expect(state.current.isDragging).toBe(false);
  });
});
