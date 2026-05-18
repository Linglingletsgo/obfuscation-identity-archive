import { describe, expect, it } from "vitest";
import { getCollectiveModeForCameraDistance } from "./ArchiveScene";

describe("getCollectiveModeForCameraDistance", () => {
  it("uses overview mode when camera is far", () => {
    expect(getCollectiveModeForCameraDistance(30)).toBe("overview");
  });

  it("uses internal mode when camera enters avatar threshold", () => {
    expect(getCollectiveModeForCameraDistance(12)).toBe("internal");
  });
});
