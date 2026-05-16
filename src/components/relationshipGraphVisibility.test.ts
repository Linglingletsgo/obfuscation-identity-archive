import { describe, expect, it } from "vitest";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";
import { getNodeOpacityMultiplier, shouldRenderGraphLink } from "./RelationshipGraph3D";

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

function searchableNode(id: string, tagLabels: string[]): ArchiveGraphNode {
  return {
    id,
    type: "submission",
    source_ids: [id],
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
});
