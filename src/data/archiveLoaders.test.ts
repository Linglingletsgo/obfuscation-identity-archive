import { describe, expect, it } from "vitest";
import { assertInteractionGraph, assertTimeline } from "./archiveLoaders";

describe("archive source validators", () => {
  it("accepts a graph with nodes and edges arrays", () => {
    expect(() => assertInteractionGraph({ nodes: [], edges: [] })).not.toThrow();
  });

  it("rejects a graph without edges array", () => {
    expect(() => assertInteractionGraph({ nodes: [] })).toThrow("interaction graph");
  });

  it("accepts a timeline with anchors and a global collective item", () => {
    expect(() =>
      assertTimeline({
        anchors: [],
        global_collective_item: {
          timeline_item_id: "global",
          stage: 5,
          anchor_id: null,
          source_ids: [],
          source_texts: [],
          group_size: 0,
        },
      }),
    ).not.toThrow();
  });
});
