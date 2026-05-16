import { describe, expect, it } from "vitest";
import {
  getCameraPositionForStage,
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
});
