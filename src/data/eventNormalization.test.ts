import { describe, expect, it } from "vitest";
import { normalizeEvents } from "./eventNormalization";

describe("normalizeEvents", () => {
  it("normalizes timeline string events", () => {
    expect(normalizeEvents(["profile_glitch"], "timeline")).toEqual([
      { type: "profile_glitch", visual: "profile_glitch", intensity: 1, source: "timeline" },
    ]);
  });

  it("normalizes graph object events", () => {
    expect(normalizeEvents([{ type: "surface_mask", visual: "mask label", intensity: 0.4 }], "graph")).toEqual([
      { type: "surface_mask", visual: "mask label", intensity: 0.4, source: "graph" },
    ]);
  });
});
