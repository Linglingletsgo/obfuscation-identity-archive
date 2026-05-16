import { describe, expect, it } from "vitest";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { applyStage5ForceLayout } from "./stage5ForceLayout";

function node(id: string, tagLabels: string[], type: ArchiveGraphNode["type"] = "submission"): ArchiveGraphNode {
  return {
    id,
    type,
    stage: type === "submission" ? 0 : 5,
    source_ids: type === "submission" ? [id] : [],
    tags: tagLabels.map((label) => ({ label })),
    tag_labels: tagLabels,
    scores: {},
    events: [],
    position: { x: 50, y: 50, z: 50 },
    visual: {
      size: 1,
      color_group: type,
      opacity: 1,
      label: id,
      node_shape: "sprite",
      node_style_key: type,
    },
  };
}

const baseGraph: ArchiveGraph = {
  nodes: [
    node("identity-a", ["shared"]),
    node("identity-b", ["shared"]),
    node("identity-c", ["distant"]),
    node("tag:shared", ["shared"], "tag"),
    node("tag:distant", ["distant"], "tag"),
    node("timeline:a-stage0", ["shared"], "timeline_item"),
  ],
  links: [
    {
      id: "a-shared",
      source: "identity-a",
      target: "tag:shared",
      type: "shared_tag",
      weight: 1,
      scores: {},
      events: [],
      visual: { style_key: "shared", opacity: 0.3, thickness: 1, dash: false },
    },
    {
      id: "b-shared",
      source: "identity-b",
      target: "tag:shared",
      type: "shared_tag",
      weight: 1,
      scores: {},
      events: [],
      visual: { style_key: "shared", opacity: 0.3, thickness: 1, dash: false },
    },
    {
      id: "c-distant",
      source: "identity-c",
      target: "tag:distant",
      type: "shared_tag",
      weight: 1,
      scores: {},
      events: [],
      visual: { style_key: "shared", opacity: 0.3, thickness: 1, dash: false },
    },
  ],
  metadata: {
    layout: "deterministic-avatar-map",
    seed: "test",
    source_files: [],
    generated_at: new Date(0).toISOString(),
  },
};

function distance(a: ArchiveGraphNode, b: ArchiveGraphNode): number {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z);
}

describe("applyStage5ForceLayout", () => {
  it("keeps Stage5 graph nodes inside the avatar internal radius", () => {
    const result = applyStage5ForceLayout(baseGraph);
    const maxRadius = archiveVisualConfig.graph.stage5InternalRadius + 0.001;

    for (const node of result.nodes.filter((item) => item.type === "submission" || item.type === "tag")) {
      expect(Math.hypot(node.position.x, node.position.y, node.position.z)).toBeLessThanOrEqual(maxRadius);
    }
  });

  it("is deterministic for the same graph input", () => {
    const first = applyStage5ForceLayout(baseGraph);
    const second = applyStage5ForceLayout(baseGraph);

    expect(first.nodes.map((item) => [item.id, item.position])).toEqual(
      second.nodes.map((item) => [item.id, item.position]),
    );
  });

  it("keeps shared-tag identities closer than unrelated identities", () => {
    const result = applyStage5ForceLayout(baseGraph);
    const byId = new Map(result.nodes.map((item) => [item.id, item]));
    const identityA = byId.get("identity-a")!;
    const identityB = byId.get("identity-b")!;
    const identityC = byId.get("identity-c")!;

    expect(distance(identityA, identityB)).toBeLessThan(distance(identityA, identityC));
  });

  it("does not move timeline nodes in this Stage5 layout pass", () => {
    const result = applyStage5ForceLayout(baseGraph);
    const timelineNode = result.nodes.find((item) => item.id === "timeline:a-stage0");

    expect(timelineNode?.position).toEqual({ x: 50, y: 50, z: 50 });
  });
});
