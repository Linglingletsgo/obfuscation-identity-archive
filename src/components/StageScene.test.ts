import { describe, expect, it } from "vitest";
import {
  getCameraPositionForStage,
  getCameraTargetForStage,
  getNextWebGLRestartVersion,
  getStage5CameraTarget,
  shouldDisableStage5Pan,
  shouldRenderStage5AvatarField,
  shouldRenderGraphOutsideStage5AvatarSuspense,
} from "./StageScene";

describe("shouldRenderStage5AvatarField", () => {
  it("keeps the avatar field mounted for Stage5 only", () => {
    expect(shouldRenderStage5AvatarField(5)).toBe(true);
    expect(shouldRenderStage5AvatarField(4)).toBe(false);
  });

  it("keeps graph rendering outside the Stage5 avatar loading boundary", () => {
    expect(shouldRenderGraphOutsideStage5AvatarSuspense(5)).toBe(true);
  });

  it("locks Stage5 camera controls around the avatar origin", () => {
    expect(getCameraPositionForStage(5)).toEqual([0, 4.5, 16]);
    expect(getCameraPositionForStage(2)).toEqual([0, 2.8, 8]);
    expect(getStage5CameraTarget()).toEqual([0, 0, 0]);
    expect(shouldDisableStage5Pan(5)).toBe(true);
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

    expect(getCameraPositionForStage(5, navigation)).toEqual([3, 6, 18]);
    expect(getCameraTargetForStage(5, navigation)).toEqual([1, 0.5, -2]);
    expect(getCameraPositionForStage(1, navigation)).toEqual([0, 2.8, 8]);
    expect(getCameraTargetForStage(1, navigation)).toEqual([0, 0, 0]);
  });

  it("increments the canvas restart version after WebGL context loss", () => {
    expect(getNextWebGLRestartVersion(0)).toBe(1);
    expect(getNextWebGLRestartVersion(4)).toBe(5);
  });
});
