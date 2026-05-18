import { describe, expect, it } from "vitest";
import {
  createWebGLSupportChecker,
  getCameraPositionForStage,
  getCameraTargetForStage,
  getNextWebGLRestartVersion,
  getStage5CameraTarget,
  shouldDisableStage5Pan,
  shouldRenderStage5AvatarField,
  shouldRenderGraphOutsideStage5AvatarSuspense,
  shouldRenderWebGLStage,
} from "./StageScene";

describe("shouldRenderStage5AvatarField", () => {
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

  it("keeps the avatar field mounted for Stage2 collective only", () => {
    expect(shouldRenderStage5AvatarField(2)).toBe(true);
    expect(shouldRenderStage5AvatarField(1)).toBe(false);
  });

  it("keeps graph rendering outside the Stage2 avatar loading boundary", () => {
    expect(shouldRenderGraphOutsideStage5AvatarSuspense(2)).toBe(true);
  });

  it("uses WebGL only for Stage2 collective after detail stages move to the 2D avatar scene", () => {
    expect(shouldRenderWebGLStage(2)).toBe(true);
    expect(shouldRenderWebGLStage(0)).toBe(false);
    expect(shouldRenderWebGLStage(1)).toBe(false);
  });

  it("locks Stage2 collective camera controls around the avatar origin", () => {
    expect(getCameraPositionForStage(2)).toEqual([0, 4.5, 16]);
    expect(getCameraPositionForStage(1)).toEqual([0, 2.8, 8]);
    expect(getStage5CameraTarget()).toEqual([0, 0, 0]);
    expect(shouldDisableStage5Pan(2)).toBe(true);
  });

  it("uses persisted Stage5 camera state when remounting the WebGL canvas", () => {
    const navigation = {
      mode: "overview" as const,
      selectedIdentityId: null,
      hoveredNodeId: null,
      hoveredTagLabel: null,
      cameraPosition: [3, 6, 18] as [number, number, number],
      cameraTarget: [1, 0.5, -2] as [number, number, number],
    };

    expect(getCameraPositionForStage(2, navigation)).toEqual([3, 6, 18]);
    expect(getCameraTargetForStage(2, navigation)).toEqual([1, 0.5, -2]);
    expect(getCameraPositionForStage(1, navigation)).toEqual([0, 2.8, 8]);
    expect(getCameraTargetForStage(1, navigation)).toEqual([0, 0, 0]);
  });

  it("increments the canvas restart version after WebGL context loss", () => {
    expect(getNextWebGLRestartVersion(0)).toBe(1);
    expect(getNextWebGLRestartVersion(4)).toBe(5);
  });
});
