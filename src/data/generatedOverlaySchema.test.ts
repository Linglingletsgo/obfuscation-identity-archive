import { describe, expect, it } from "vitest";
import { assertGeneratedOverlay, emptyGeneratedOverlay } from "./generatedOverlay";

describe("generated overlay schema", () => {
  it("accepts an empty generated overlay", () => {
    const overlay = emptyGeneratedOverlay();

    expect(() => assertGeneratedOverlay(overlay)).not.toThrow();
    expect(overlay.nodes).toEqual([]);
    expect(overlay.edges).toEqual([]);
  });

  it("rejects malformed generated nodes", () => {
    expect(() =>
      assertGeneratedOverlay({
        version: 1,
        generated_at: "2026-05-29T00:00:00.000Z",
        nodes: [{ id: 123, type: "submission" }],
        edges: [],
      }),
    ).toThrow("Invalid generated overlay node");
  });

  it("rejects malformed generated edges", () => {
    expect(() =>
      assertGeneratedOverlay({
        version: 1,
        generated_at: "2026-05-29T00:00:00.000Z",
        nodes: [],
        edges: [{ id: "edge-1", source: "a" }],
      }),
    ).toThrow("Invalid generated overlay edge");
  });
});
