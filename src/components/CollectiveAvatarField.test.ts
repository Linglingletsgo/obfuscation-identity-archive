import { describe, expect, it } from "vitest";
import { archiveVisualConfig } from "../config/archiveVisualConfig";

describe("CollectiveAvatarField model source", () => {
  it("uses the materialized collective collective GLB instead of legacy particle sources", () => {
    expect(archiveVisualConfig.assets.stage2CollectiveModelPath).toBe("/models/global_stage2_collective.glb");
  });
});
