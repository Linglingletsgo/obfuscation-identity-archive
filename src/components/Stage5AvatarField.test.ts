import { describe, expect, it } from "vitest";
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
});
