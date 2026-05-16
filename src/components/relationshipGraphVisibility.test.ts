import { describe, expect, it } from "vitest";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";
import {
  getNodeOpacityMultiplier,
  getStageScopedGraphLinks,
  getStageScopedGraphNodes,
  shouldRenderGraphLink,
  shouldShowIdentityBillboard,
} from "./RelationshipGraph3D";

function link(type: ArchiveGraphLink["type"], source = "a", target = "b"): ArchiveGraphLink {
  return {
    id: `${type}:${source}:${target}`,
    source,
    target,
    type,
    weight: 1,
    scores: {},
    events: [],
    visual: { style_key: type, opacity: 0.5, thickness: 1, dash: false },
  };
}

function searchableNode(
  id: string,
  tagLabels: string[],
  type: ArchiveGraphNode["type"] = "submission",
  stage?: ArchiveGraphNode["stage"],
  sourceIds = type === "submission" ? [id] : [],
): ArchiveGraphNode {
  return {
    id,
    type,
    stage,
    source_ids: sourceIds,
    tags: tagLabels.map((label) => ({ label })),
    tag_labels: tagLabels,
    scores: {},
    events: [],
    position: { x: 0, y: 0, z: 0 },
    visual: {
      size: 1,
      color_group: "identity",
      opacity: 1,
      label: id,
      node_shape: "sprite",
      node_style_key: "identity",
    },
  };
}

const graph: ArchiveGraph = {
  nodes: [searchableNode("a", ["Dream"]), searchableNode("b", ["Dream"]), searchableNode("c", ["Other"])],
  links: [],
  metadata: {
    layout: "deterministic-avatar-map",
    seed: "test",
    source_files: [],
    generated_at: new Date(0).toISOString(),
  },
};

describe("RelationshipGraph3D visibility helpers", () => {
  it("renders interaction and conflict links by default", () => {
    expect(shouldRenderGraphLink(link("interaction"), null)).toBe(true);
    expect(shouldRenderGraphLink(link("conflict_tag"), null)).toBe(true);
  });

  it("hides shared tag links until a related node is focused", () => {
    expect(shouldRenderGraphLink(link("shared_tag"), null)).toBe(false);
    expect(shouldRenderGraphLink(link("shared_tag"), "a")).toBe(true);
    expect(shouldRenderGraphLink(link("shared_tag"), "c")).toBe(false);
  });

  it("dims nodes that do not match search", () => {
    expect(getNodeOpacityMultiplier(graph.nodes[0], "dream")).toBe(1);
    expect(getNodeOpacityMultiplier(graph.nodes[2], "dream")).toBeLessThan(1);
  });

  it("keeps Stage5 focused on identity, tag, and collective nodes without timeline items", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Dream"], "submission", 0, ["a"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 5),
        searchableNode("timeline:a-stage0", ["Dream"], "timeline_item", 0, ["a"]),
        searchableNode("collective:global", [], "collective", 5),
      ],
    };

    expect(
      getStageScopedGraphNodes(scopedGraph, {
        stage: 5,
        selectedIdentityId: null,
        selectedTimelineItemId: null,
      }).map((node) => node.id),
    ).toEqual(["a", "tag:Dream", "collective:global"]);
  });

  it("scopes Stage0-4 nodes to the selected identity timeline item and its active tags", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Global"], "submission", 0, ["a"]),
        searchableNode("b", ["Other"], "submission", 0, ["b"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 5),
        searchableNode("tag:Other", ["Other"], "tag", 5),
        searchableNode("timeline:a-stage1", ["Dream"], "timeline_item", 1, ["a"]),
        searchableNode("timeline:b-stage1", ["Other"], "timeline_item", 1, ["b"]),
      ],
    };

    expect(
      getStageScopedGraphNodes(scopedGraph, {
        stage: 1,
        selectedIdentityId: "a",
        selectedTimelineItemId: "a-stage1",
      }).map((node) => node.id),
    ).toEqual(["a", "tag:Dream", "timeline:a-stage1"]);
  });

  it("filters links to scoped Stage0-4 endpoints", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Global"], "submission", 0, ["a"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 5),
        searchableNode("tag:Other", ["Other"], "tag", 5),
        searchableNode("timeline:a-stage1", ["Dream"], "timeline_item", 1, ["a"]),
      ],
      links: [
        link("shared_tag", "a", "tag:Dream"),
        link("shared_tag", "a", "tag:Other"),
        link("source_membership", "a", "timeline:a-stage1"),
      ],
    };
    const scopedNodes = getStageScopedGraphNodes(scopedGraph, {
      stage: 1,
      selectedIdentityId: "a",
      selectedTimelineItemId: "a-stage1",
    });

    expect(getStageScopedGraphLinks(scopedGraph, scopedNodes, "a").map((item) => item.target)).toEqual([
      "tag:Dream",
      "timeline:a-stage1",
    ]);
  });

  it("only shows identity billboards for focused Stage5 identities", () => {
    const identity = searchableNode("a", ["Dream"], "submission", 0, ["a"]);

    expect(shouldShowIdentityBillboard(identity, { stage: 5, focusedNodeId: null })).toBe(false);
    expect(shouldShowIdentityBillboard(identity, { stage: 5, focusedNodeId: "a" })).toBe(true);
    expect(shouldShowIdentityBillboard(identity, { stage: 1, focusedNodeId: "a" })).toBe(false);
  });
});
