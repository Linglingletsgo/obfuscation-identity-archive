import { describe, expect, it } from "vitest";
import { assertInteractionGraph, assertTimeline } from "./archiveLoaders";

function timelineWithAnchorItem(item: Record<string, unknown>): Record<string, unknown> {
  return {
    anchors: [
      {
        anchor_id: "anchor-1",
        items: [
          {
            timeline_item_id: "item-1",
            stage: 1,
            anchor_id: "anchor-1",
            source_ids: ["submission-1"],
            source_texts: [{ submission_id: "submission-1" }],
            group_size: 1,
            ...item,
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
  };
}

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

  it("rejects a graph node with an invalid tags element", () => {
    expect(() => assertInteractionGraph({ nodes: [{ id: "node-1", type: "identity", tags: [null] }], edges: [] })).toThrow(
      "graph tag",
    );
  });

  it("rejects a graph edge with an invalid events element", () => {
    expect(() =>
      assertInteractionGraph({
        nodes: [],
        edges: [{ id: "edge-1", source: "a", target: "b", relation: "shared", events: [null] }],
      }),
    ).toThrow("event");
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

  it("rejects a timeline item with a non-string source id", () => {
    expect(() => assertTimeline(timelineWithAnchorItem({ source_ids: [123] }))).toThrow("source_ids");
  });

  it("rejects a timeline item with an invalid source text", () => {
    expect(() => assertTimeline(timelineWithAnchorItem({ source_texts: [false] }))).toThrow("source_texts");
  });

  it("rejects a timeline item with an invalid events element", () => {
    expect(() => assertTimeline(timelineWithAnchorItem({ events: [null] }))).toThrow("event");
  });
});
