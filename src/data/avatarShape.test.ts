import { describe, expect, it } from "vitest";
import { normalizePointCloudPositions, projectNodeIntoAvatarShape } from "./avatarShape";

describe("avatarShape", () => {
  it("normalizes model surface positions around center", () => {
    expect([...normalizePointCloudPositions(new Float32Array([10, 0, 0, 20, 0, 0]), 5)]).toEqual([
      -5, 0, 0, 5, 0, 0,
    ]);
  });

  it("projects graph nodes to an inward point from sampled model shape", () => {
    const surface = new Float32Array([0, 10, 0, 0, -4, 0, 2, 0, 0]);
    const projected = projectNodeIntoAvatarShape(
      {
        id: "identity-a",
        position: { x: 0, y: 7, z: 0 },
      },
      surface,
      0.5,
    );

    expect(Math.hypot(projected.x, projected.y, projected.z)).toBeLessThanOrEqual(5);
    expect(projected.y).toBeGreaterThan(0);
  });
});
