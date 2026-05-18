import { describe, expect, it } from "vitest";
import { archiveVisualConfig } from "../config/archiveVisualConfig";

describe("Stage5AvatarField model source", () => {
  it("uses the materialized Stage2 collective GLB instead of legacy particle sources", () => {
    expect(archiveVisualConfig.assets.stage2CollectiveModelPath).toBe("/models/global_stage2_collective.glb");
  });
});
