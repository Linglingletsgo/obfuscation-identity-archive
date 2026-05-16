import { describe, expect, it } from "vitest";
import { shouldRenderStage5AvatarField } from "./StageScene";

describe("shouldRenderStage5AvatarField", () => {
  it("keeps the avatar field mounted for Stage5 only", () => {
    expect(shouldRenderStage5AvatarField(5)).toBe(true);
    expect(shouldRenderStage5AvatarField(4)).toBe(false);
  });
});
