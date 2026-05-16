import { describe, expect, it } from "vitest";
import { normalizePointCloudPositions } from "../data/avatarShape";

function maxRadius(positions: Float32Array): number {
  let max = 0;
  for (let index = 0; index < positions.length; index += 3) {
    max = Math.max(max, Math.hypot(positions[index], positions[index + 1], positions[index + 2]));
  }
  return max;
}

describe("normalizePointCloudPositions", () => {
  it("normalizes raw model points into the requested field radius", () => {
    const normalized = normalizePointCloudPositions(new Float32Array([-100, 0, 0, 100, 0, 0]), 8);

    expect(maxRadius(normalized)).toBeLessThanOrEqual(8);
    expect([...normalized]).toEqual([-8, 0, 0, 8, 0, 0]);
  });

  it("recenters offset model coordinates before scaling", () => {
    const normalized = normalizePointCloudPositions(new Float32Array([10, 10, 10, 20, 10, 10]), 4);

    expect([...normalized]).toEqual([-4, 0, 0, 4, 0, 0]);
  });
});
