import { describe, expect, it } from "vitest";
import { getAvatarAssetPath, getModelAssetPath } from "./archivePaths";

describe("archive path helpers", () => {
  it("resolves Stage0 avatars by submission id", () => {
    expect(getAvatarAssetPath({ stage: 0, submissionId: "submission_a" })).toBe(
      "/assets/avatars/stage0/submission_a.png",
    );
  });

  it("keeps Stage1 cluster body avatar path available for optional future assets", () => {
    expect(getAvatarAssetPath({ stage: 1, timelineItemId: "item_a" })).toBe(
      "/assets/avatars/stage1/item_a.png",
    );
  });

  it("resolves the Stage2 collective model", () => {
    expect(getModelAssetPath({ stage: 2 })).toBe("/models/global_stage2_collective.glb");
  });
});
