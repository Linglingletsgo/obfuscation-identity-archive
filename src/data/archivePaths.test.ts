import { describe, expect, it } from "vitest";
import { getAvatarAssetPath, getCollectiveModelAssetPath } from "./archivePaths";

describe("archive path helpers", () => {
  it("resolves individual avatars by submission id", () => {
    expect(getAvatarAssetPath({ submissionId: "submission_a" })).toBe(
      "/assets/avatars/stage0/submission_a.png",
    );
  });

  it("resolves the collective model", () => {
    expect(getCollectiveModelAssetPath()).toBe("/models/global_stage2_collective.glb");
  });
});
