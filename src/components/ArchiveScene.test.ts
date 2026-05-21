import { describe, expect, it } from "vitest";
import {
  createWebGLSupportChecker,
  getCameraPositionForStage,
  getCameraTargetForStage,
  getNextWebGLRestartVersion,
  getCollectiveCameraTarget,
  shouldDisableCollectivePan,
  shouldHandleBackgroundPointerMiss,
  shouldRenderCollectiveAvatarField,
  shouldRenderGraphOutsideCollectiveAvatarSuspense,
  shouldRenderWebGLStage,
} from "./ArchiveScene";

describe("shouldRenderCollectiveAvatarField", () => {
  it("caches WebGL support detection so renders do not create repeated contexts", () => {
    let contextRequests = 0;
    let released = false;
    const checker = createWebGLSupportChecker(
      () =>
        ({
          getContext() {
            contextRequests += 1;
            return {
              getExtension(name: string) {
                if (name !== "WEBGL_lose_context") return null;
                return {
                  loseContext() {
                    released = true;
                  },
                };
              },
            };
          },
        }) as unknown as HTMLCanvasElement,
    );

    expect(checker()).toBe(true);
    expect(checker()).toBe(true);
    expect(contextRequests).toBe(1);
    expect(released).toBe(true);
  });

  it("keeps the avatar field mounted for collective only", () => {
    expect(shouldRenderCollectiveAvatarField("collective")).toBe(true);
    expect(shouldRenderCollectiveAvatarField("individual")).toBe(false);
  });

  it("keeps graph rendering outside the collective avatar loading boundary", () => {
    expect(shouldRenderGraphOutsideCollectiveAvatarSuspense("collective")).toBe(true);
  });

  it("uses WebGL only for collective after individual moves to the 2D avatar scene", () => {
    expect(shouldRenderWebGLStage("collective")).toBe(true);
    expect(shouldRenderWebGLStage("individual")).toBe(false);
  });

  it("locks collective camera controls around the avatar origin", () => {
    expect(getCameraPositionForStage("collective")).toEqual([0, -67.5, 40]);
    expect(getCameraPositionForStage("individual")).toEqual([0, 2.8, 8]);
    expect(getCollectiveCameraTarget()).toEqual([0, -78, 0]);
    expect(shouldDisableCollectivePan("collective")).toBe(true);
  });

  it("uses persisted collective camera state when remounting the WebGL canvas", () => {
    const navigation = {
      mode: "overview" as const,
      selectedIdentityId: null,
      hoveredNodeId: null,
      hoveredTagLabel: null,
      cameraPosition: [3, 6, 18] as [number, number, number],
      cameraTarget: [1, 0.5, -2] as [number, number, number],
    };

    expect(getCameraPositionForStage("collective", navigation)).toEqual([3, 6, 18]);
    expect(getCameraTargetForStage("collective", navigation)).toEqual([1, 0.5, -2]);
    expect(getCameraPositionForStage("individual", navigation)).toEqual([0, 2.8, 8]);
    expect(getCameraTargetForStage("individual", navigation)).toEqual([0, -78, 0]);
  });

  it("increments the canvas restart version after WebGL context loss", () => {
    expect(getNextWebGLRestartVersion(0)).toBe(1);
    expect(getNextWebGLRestartVersion(4)).toBe(5);
  });

  it("keeps background deselection limited to direct canvas misses", () => {
    const canvas = document.createElement("canvas");
    const shell = document.createElement("div");
    shell.className = "archive-scene-shell";
    const labelTarget = document.createElement("span");
    labelTarget.className = "identity-billboard";

    expect(shouldHandleBackgroundPointerMiss(canvas, canvas)).toBe(true);
    expect(shouldHandleBackgroundPointerMiss(shell, canvas, shell)).toBe(true);
    expect(shouldHandleBackgroundPointerMiss(labelTarget, canvas)).toBe(false);
    expect(shouldHandleBackgroundPointerMiss(null, canvas)).toBe(false);
  });
});
