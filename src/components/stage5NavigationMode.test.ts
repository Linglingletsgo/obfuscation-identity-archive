import { describe, expect, it } from "vitest";
import { getStage5ModeForCameraDistance } from "./StageScene";

describe("getStage5ModeForCameraDistance", () => {
  it("uses overview mode when camera is far", () => {
    expect(getStage5ModeForCameraDistance(30)).toBe("overview");
  });

  it("uses internal mode when camera enters avatar threshold", () => {
    expect(getStage5ModeForCameraDistance(12)).toBe("internal");
  });
});
