import { describe, expect, it } from "vitest";
import { assertInteractionGraph, assertTimeline } from "./archiveLoaders";

describe("archive source validators", () => {
  it("accepts a graph with nodes and edges arrays", () => {
    expect(() => assertInteractionGraph({ nodes: [], edges: [] })).not.toThrow();
  });

  it("rejects a graph without edges array", () => {
    expect(() => assertInteractionGraph({ nodes: [] })).toThrow("interaction graph");
  });

  it("rejects a graph with a non-object node", () => {
    expect(() => assertInteractionGraph({ nodes: [null], edges: [] })).toThrow("graph node");
  });

  it("rejects a graph edge missing required string fields", () => {
    expect(() => assertInteractionGraph({ nodes: [], edges: [{ id: "edge-1", source: "a" }] })).toThrow(
      "graph edge",
    );
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

  it("rejects a timeline with a non-object global collective item", () => {
    expect(() => assertTimeline({ anchors: [], global_collective_item: true })).toThrow("timeline item");
  });

  it("rejects a timeline anchor item missing required fields", () => {
    expect(() =>
      assertTimeline({
        anchors: [
          {
            anchor_id: "anchor-1",
            items: [
              {
                anchor_id: "anchor-1",
                stage: 1,
                source_ids: [],
                source_texts: [],
                group_size: 1,
              },
            ],
          },
        ],
        global_collective_item: {
          timeline_item_id: "global",
          stage: 5,
          anchor_id: null,
          source_ids: [],
          source_texts: [],
          group_size: 0,
        },
      }),
    ).toThrow("timeline item");
  });
});
