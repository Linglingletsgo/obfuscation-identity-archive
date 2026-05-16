import { describe, expect, it } from "vitest";
import { createStage5AvatarFallbackPositions } from "./Stage5AvatarField";
import { getAvatarBreathingScale, getAvatarPointOpacity } from "./stage5AvatarAnimation";

describe("Stage5AvatarField animation helpers", () => {
  it("returns a subtle breathing scale around one", () => {
    expect(getAvatarBreathingScale(0)).toBeGreaterThanOrEqual(0.97);
    expect(getAvatarBreathingScale(Math.PI)).toBeLessThanOrEqual(1.03);
  });

  it("keeps point opacity visible while pulsing", () => {
    expect(getAvatarPointOpacity(0, 0.44)).toBeGreaterThan(0.25);
    expect(getAvatarPointOpacity(Math.PI, 0.44)).toBeLessThanOrEqual(0.5);
  });

  it("uses a non-spherical avatar fallback silhouette while the Stage5 GLB loads", () => {
    const positions = createStage5AvatarFallbackPositions();
    const xs: number[] = [];
    const ys: number[] = [];

    for (let index = 0; index < positions.length; index += 3) {
      xs.push(positions[index]);
      ys.push(positions[index + 1]);
    }

    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);

    expect(positions.length).toBeGreaterThan(90);
    expect(height).toBeGreaterThan(width * 1.4);
  });
});
