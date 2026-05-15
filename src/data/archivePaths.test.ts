import { describe, expect, it } from "vitest";
import {
  getAvatarAssetPath,
  getModelAssetPath,
  getStage4FallbackModelPath,
} from "./archivePaths";

describe("archive path helpers", () => {
  it("resolves Stage0 avatars by submission id", () => {
    expect(getAvatarAssetPath({ stage: 0, submissionId: "submission_a" })).toBe(
      "/assets/avatars/stage0/submission_a.png",
    );
  });

  it("resolves Stage1-3 avatars by timeline item id", () => {
    expect(getAvatarAssetPath({ stage: 1, timelineItemId: "item_a" })).toBe(
      "/assets/avatars/stage1/item_a.png",
    );
    expect(getAvatarAssetPath({ stage: 2, timelineItemId: "item_b" })).toBe(
      "/assets/avatars/stage2/item_b.png",
    );
    expect(getAvatarAssetPath({ stage: 3, timelineItemId: "item_c" })).toBe(
      "/assets/avatars/stage3/item_c.png",
    );
  });

  it("resolves Stage4 and Stage5 models", () => {
    expect(getModelAssetPath({ stage: 4, timelineItemId: "item_c" })).toBe(
      "/models/stage4/item_c.glb",
    );
    expect(getStage4FallbackModelPath()).toBe("/models/stage4/default-stage4.glb");
    expect(getModelAssetPath({ stage: 5 })).toBe("/models/stage5.glb");
  });
});
