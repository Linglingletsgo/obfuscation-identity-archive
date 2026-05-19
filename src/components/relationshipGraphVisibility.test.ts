import { describe, expect, it } from "vitest";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";
import {
  getCollectiveLinkOpacity,
  getGraphLinkStyle,
  getGraphRenderPolicy,
  getNodeOpacityMultiplier,
  getViewScopedGraphLinks,
  getViewScopedGraphNodes,
  shouldCollectiveNodeClickLock,
  shouldDisplayGraphLink,
  shouldRenderGraphLink,
  shouldSelectNodeOnCollectiveHover,
  shouldShowIdentityBillboard,
  shouldShowTagLabel,
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

  it("shows all collective relationship line types in the default state and focuses connected links on selection", () => {
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
    const scopedNodes = getViewScopedGraphNodes(scopedGraph, {
      view: "collective",
      selectedIdentityId: null,
    });

    expect(getViewScopedGraphLinks(scopedGraph, scopedNodes, null, "collective").map((item) => item.id)).toEqual([
      "shared_tag:a:tag:Dream",
      "interaction:a:b",
      "conflict_tag:b:tag:Dream",
    ]);
    expect(getViewScopedGraphLinks(scopedGraph, scopedNodes, "a", "collective").map((item) => item.id)).toEqual([
      "shared_tag:a:tag:Dream",
      "interaction:a:b",
    ]);
    expect(getCollectiveLinkOpacity(link("shared_tag", "a", "tag:Dream"), null)).toBe(0.38);
    expect(getCollectiveLinkOpacity(link("interaction", "a", "b"), null)).toBe(0.38);
    expect(getCollectiveLinkOpacity(link("conflict_tag", "a", "b"), null)).toBe(0.38);
  });

  it("applies link density only to the default collective state", () => {
    const denseNodes = Array.from({ length: 81 }, (_, index) => searchableNode(`node:${index}`, ["Dream"]));
    const denseLinks = Array.from({ length: 80 }, (_, index) =>
      link(index % 2 === 0 ? "interaction" : "shared_tag", `node:${index}`, `node:${index + 1}`),
    );
    const denseGraph: ArchiveGraph = {
      ...graph,
      nodes: denseNodes,
      links: denseLinks,
    };
    const scopedNodes = getViewScopedGraphNodes(denseGraph, {
      view: "collective",
      selectedIdentityId: null,
    });

    const fullDefaultLinks = getViewScopedGraphLinks(denseGraph, scopedNodes, null, "collective", 1);
    const sparseDefaultLinks = getViewScopedGraphLinks(denseGraph, scopedNodes, null, "collective", 0.1);
    const focusedLinks = getViewScopedGraphLinks(denseGraph, scopedNodes, "node:0", "collective", 0);

    expect(fullDefaultLinks).toHaveLength(80);
    expect(sparseDefaultLinks.length).toBeGreaterThan(0);
    expect(sparseDefaultLinks.length).toBeLessThan(fullDefaultLinks.length);
    expect(focusedLinks.map((item) => item.id)).toEqual(["interaction:node:0:node:1"]);
  });

  it("uses relationship-specific collective link colors and traces", () => {
    expect(getGraphLinkStyle(link("shared_tag"), "collective", "a")).toMatchObject({
      color: "#42d6b3",
      lineWidth: 0.7,
      opacity: 0.38,
      dashed: false,
    });
    expect(getGraphLinkStyle(link("interaction"), "collective", "a")).toMatchObject({
      color: "#1f6fff",
      lineWidth: 0.7,
      opacity: 0.38,
      dashed: false,
    });
    expect(getGraphLinkStyle(link("conflict_tag"), "collective", "a")).toMatchObject({
      color: "#ff5c7a",
      lineWidth: 0.7,
      opacity: 0.38,
      dashed: true,
    });
  });

  it("does not filter collective conflict lines through legacy source opacity", () => {
    const conflict = link("conflict_tag", "a", "tag:Dream");
    conflict.visual.opacity = 0.72;

    expect(shouldDisplayGraphLink(conflict, "collective", null, 0.2)).toBe(true);
    expect(shouldDisplayGraphLink(conflict, "individual", null, 0.2)).toBe(false);
  });

  it("uses a depth-independent render policy for collective graph objects", () => {
    expect(getGraphRenderPolicy("collective")).toMatchObject({
      depthTest: false,
      frustumCulled: false,
    });
    expect(getGraphRenderPolicy("individual").depthTest).toBe(true);
  });

  it("dims nodes that do not match submission id or name search", () => {
    expect(getNodeOpacityMultiplier(graph.nodes[0], "a")).toBe(1);
    expect(getNodeOpacityMultiplier(graph.nodes[2], "a")).toBeLessThan(1);
    expect(getNodeOpacityMultiplier(graph.nodes[0], "dream")).toBeLessThan(1);
  });

  it("keeps collective focused on identity, tag, and collective nodes without timeline items", () => {
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
      getViewScopedGraphNodes(scopedGraph, {
        view: "collective",
        selectedIdentityId: null,
      }).map((node) => node.id),
    ).toEqual(["a", "tag:Dream", "collective:global"]);
  });

  it("scopes individual graph nodes to selected identity tags", () => {
    const scopedGraph: ArchiveGraph = {
      ...graph,
      nodes: [
        searchableNode("a", ["Dream"], "submission", 0, ["a"]),
        searchableNode("tag:Dream", ["Dream"], "tag", 2),
        searchableNode("tag:Other", ["Other"], "tag", 2),
      ],
    };

    expect(
      getViewScopedGraphNodes(scopedGraph, {
        view: "individual",
        selectedIdentityId: "a",
      }).map((node) => node.id),
    ).toEqual(["tag:Dream"]);
  });

  it("shows identity billboards for all collective identities only", () => {
    const identity = searchableNode("a", ["Dream"], "submission", 0, ["a"]);

    expect(shouldShowIdentityBillboard(identity, { view: "collective", focusedNodeId: null })).toBe(true);
    expect(shouldShowIdentityBillboard(identity, { view: "individual", focusedNodeId: "a" })).toBe(false);
  });

  it("shows tag labels in individual view but keeps collective tag labels hover-only", () => {
    const tag = searchableNode("tag:Dream", ["Dream"], "tag", 2, []);

    expect(shouldShowTagLabel(tag, { view: "individual", focusedNodeId: null })).toBe(true);
    expect(shouldShowTagLabel(tag, { view: "collective", focusedNodeId: null })).toBe(false);
    expect(shouldShowTagLabel(tag, { view: "collective", focusedNodeId: "tag:Dream" })).toBe(true);
  });

  it("keeps collective hover from opening a selected-node side panel", () => {
    expect(shouldSelectNodeOnCollectiveHover(searchableNode("tag:Dream", ["Dream"], "tag", 2), "collective")).toBe(false);
    expect(shouldSelectNodeOnCollectiveHover(searchableNode("a", ["Dream"], "submission", 0, ["a"]), "collective")).toBe(false);
    expect(shouldSelectNodeOnCollectiveHover(searchableNode("collective:global", [], "collective", 2), "collective")).toBe(false);
  });

  it("allows click locking only on collective identity nodes", () => {
    expect(shouldCollectiveNodeClickLock(searchableNode("a", ["Dream"], "submission", 0, ["a"]), "collective")).toBe(true);
    expect(shouldCollectiveNodeClickLock(searchableNode("collective:global", [], "collective", 2), "collective")).toBe(false);
    expect(shouldCollectiveNodeClickLock(searchableNode("tag:Dream", ["Dream"], "tag", 2), "collective")).toBe(false);
  });
});
