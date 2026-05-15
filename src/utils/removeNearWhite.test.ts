import { describe, expect, it } from "vitest";
import { removeNearWhitePixels } from "./removeNearWhite";

describe("removeNearWhitePixels", () => {
  it("sets alpha to zero for near-white pixels and preserves dark pixels", () => {
    const data = new Uint8ClampedArray([246, 246, 246, 255, 20, 20, 20, 255]);

    const result = removeNearWhitePixels(data, 245);

    expect(result[3]).toBe(0);
    expect(result[7]).toBe(255);
  });
});
