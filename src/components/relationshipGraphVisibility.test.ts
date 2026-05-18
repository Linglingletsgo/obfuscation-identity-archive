import { describe, expect, it } from "vitest";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";
import {
  getGraphRenderPolicy,
  shouldShowTagLabel,
  getNodeOpacityMultiplier,
  getStageScopedGraphLinks,
  getStageScopedGraphNodes,
  shouldRenderGraphLink,
  shouldShowIdentityBillboard,
  shouldSelectNodeOnStage2Hover,
  shouldStage2NodeClickLock,
  getStage2LinkOpacity,
  getGraphLinkStyle,
  shouldDisplayGraphLink,
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

  it("shows all Stage2 relationship line types in the default state and focuses connected links on selection", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Dream"], "submission", 0, ["a"]),
        searchableNode("b", ["Dream"], "submission", 0, ["b"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 2),
      ],
      links: [
        link("shared_tag", "a", "tag:Dream"),
        link("interaction", "a", "b"),
        link("conflict_tag", "b", "tag:Dream"),
      ],
    };
    const scopedNodes = getStageScopedGraphNodes(scopedGraph, {
      stage: 2,
      selectedIdentityId: null,
      selectedTimelineItemId: null,
    });

    expect(getStageScopedGraphLinks(scopedGraph, scopedNodes, null, 2).map((item) => item.id)).toEqual([
      "shared_tag:a:tag:Dream",
      "interaction:a:b",
      "conflict_tag:b:tag:Dream",
    ]);
    expect(getStageScopedGraphLinks(scopedGraph, scopedNodes, "a", 2).map((item) => item.id)).toEqual([
      "shared_tag:a:tag:Dream",
      "interaction:a:b",
    ]);
    expect(getStage2LinkOpacity(link("shared_tag", "a", "tag:Dream"), null)).toBe(0.12);
    expect(getStage2LinkOpacity(link("interaction", "a", "b"), null)).toBe(0.12);
    expect(getStage2LinkOpacity(link("conflict_tag", "a", "b"), null)).toBe(0.12);
    expect(getStage2LinkOpacity(link("shared_tag", "a", "tag:Dream"), "a")).toBeGreaterThan(0);
    expect(getStage2LinkOpacity(link("conflict_tag", "b", "tag:Dream"), "a")).toBe(0);
  });

  it("uses relationship-specific Stage2 link colors and traces", () => {
    expect(getGraphLinkStyle(link("shared_tag"), 2, "a")).toMatchObject({
      color: "#42d6b3",
      lineWidth: 0.7,
      opacity: 0.38,
      dashed: false,
    });
    expect(getGraphLinkStyle(link("interaction"), 2, "a")).toMatchObject({
      color: "#1f6fff",
      lineWidth: 0.7,
      opacity: 0.38,
      dashed: false,
    });
    expect(getGraphLinkStyle(link("conflict_tag"), 2, "a")).toMatchObject({
      color: "#ff5c7a",
      lineWidth: 0.7,
      opacity: 0.38,
      dashed: true,
    });
  });

  it("does not filter Stage2 conflict lines through legacy source opacity", () => {
    const conflict = link("conflict_tag", "a", "tag:Dream");
    conflict.visual.opacity = 0.72;

    expect(shouldDisplayGraphLink(conflict, 2, null, 0.2)).toBe(true);
    expect(shouldDisplayGraphLink(conflict, 1, null, 0.2)).toBe(false);
  });

  it("uses a depth-independent render policy for Stage2 graph objects", () => {
    expect(getGraphRenderPolicy(2)).toMatchObject({
      depthTest: false,
      frustumCulled: false,
    });
    expect(getGraphRenderPolicy(0).depthTest).toBe(true);
  });

  it("dims nodes that do not match search", () => {
    expect(getNodeOpacityMultiplier(graph.nodes[0], "dream")).toBe(1);
    expect(getNodeOpacityMultiplier(graph.nodes[2], "dream")).toBeLessThan(1);
  });

  it("keeps Stage2 focused on identity, tag, and collective nodes without timeline items", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Dream"], "submission", 0, ["a"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 2),
        searchableNode("timeline:a-stage0", ["Dream"], "timeline_item", 0, ["a"]),
        searchableNode("collective:global", [], "collective", 2),
      ],
    };

    expect(
      getStageScopedGraphNodes(scopedGraph, {
        stage: 2,
        selectedIdentityId: null,
        selectedTimelineItemId: null,
      }).map((node) => node.id),
    ).toEqual(["a", "tag:Dream", "collective:global"]);
  });

  it("scopes Stage0-1 graph nodes to active tags without the center identity or timeline node", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Global"], "submission", 0, ["a"]),
        searchableNode("b", ["Other"], "submission", 0, ["b"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 2),
        searchableNode("tag:Other", ["Other"], "tag", 2),
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
    ).toEqual(["tag:Dream"]);
  });

  it("removes Stage0-1 graph links because tags are drawn from the central avatar scene", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Global"], "submission", 0, ["a"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 2),
        searchableNode("tag:Other", ["Other"], "tag", 2),
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

    expect(getStageScopedGraphLinks(scopedGraph, scopedNodes, "a")).toEqual([]);
  });

  it("shows identity billboards for all Stage2 identities only", () => {
    const identity = searchableNode("a", ["Dream"], "submission", 0, ["a"]);

    expect(shouldShowIdentityBillboard(identity, { stage: 2, focusedNodeId: null })).toBe(true);
    expect(shouldShowIdentityBillboard(identity, { stage: 2, focusedNodeId: "a" })).toBe(true);
    expect(shouldShowIdentityBillboard(identity, { stage: 1, focusedNodeId: "a" })).toBe(false);
  });

  it("shows tag labels throughout Stage0-1 but keeps Stage2 tag labels hover-only", () => {
    const tag = searchableNode("tag:Dream", ["Dream"], "tag", 2, []);

    expect(shouldShowTagLabel(tag, { stage: 1, focusedNodeId: null })).toBe(true);
    expect(shouldShowTagLabel(tag, { stage: 2, focusedNodeId: null })).toBe(false);
    expect(shouldShowTagLabel(tag, { stage: 2, focusedNodeId: "tag:Dream" })).toBe(true);
  });

  it("keeps Stage2 tags hover-only without opening a selected-node side panel", () => {
    expect(shouldSelectNodeOnStage2Hover(searchableNode("tag:Dream", ["Dream"], "tag", 2), 2)).toBe(false);
    expect(shouldSelectNodeOnStage2Hover(searchableNode("a", ["Dream"], "submission", 0, ["a"]), 2)).toBe(false);
    expect(shouldSelectNodeOnStage2Hover(searchableNode("collective:global", [], "collective", 2), 2)).toBe(false);
  });

  it("allows click locking only on the Stage2 avatar center collective node", () => {
    expect(shouldStage2NodeClickLock(searchableNode("a", ["Dream"], "submission", 0, ["a"]), 2)).toBe(true);
    expect(shouldStage2NodeClickLock(searchableNode("collective:global", [], "collective", 2), 2)).toBe(true);
    expect(shouldStage2NodeClickLock(searchableNode("tag:Dream", ["Dream"], "tag", 2), 2)).toBe(true);
  });
});
