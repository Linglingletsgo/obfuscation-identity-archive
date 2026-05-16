import { describe, expect, it } from "vitest";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { SourceInteractionGraph, SourceTimeline } from "../types/archive";
import { buildArchiveGraph } from "./relationshipGraphBuilder";

const graph: SourceInteractionGraph = {
  nodes: [
    {
      id: "submission_a",
      type: "identity",
      label: "Name A",
      tags: [
        { label: "Dream", category: "places", role: "location" },
        { label: "Dream", category: "material_sources", role: "residue" },
        { label: "Predictable user", category: "behaviors", role: "mask" },
      ],
      text_fragments: { carriedFragment: "Fragment A" },
    },
    {
      id: "submission_b",
      type: "identity",
      label: "Name B",
      tags: [
        { label: "Dream", category: "places", role: "location" },
        { label: "Unpredictable user", category: "behaviors", role: "mask" },
      ],
      text_fragments: { carriedFragment: "Fragment B" },
    },
  ],
  edges: [
    {
      id: "a_b",
      source: "submission_a",
      target: "submission_b",
      relation: "obfuscation_interaction",
      scores: { total: 0.7, conflict: 0.6 },
      evidence: {
        sharedTags: ["Dream"],
        conflictPairs: [["Predictable user", "Unpredictable user"]],
      },
      events: [{ type: "profile_glitch", visual: "split identity", intensity: 0.5 }],
    },
  ],
};

const timeline: SourceTimeline = {
  global_collective_item: {
    timeline_item_id: "global_stage5_collective",
    anchor_id: null,
    stage: 5,
    source_ids: ["submission_a", "submission_b"],
    source_texts: [],
    group_size: 2,
  },
  anchors: [
    {
      anchor_id: "submission_a",
      items: [
        {
          timeline_item_id: "submission_a_stage0_000",
          anchor_id: "submission_a",
          stage: 0,
          source_ids: ["submission_a"],
          source_texts: [
            {
              submission_id: "submission_a",
              identity_name: "Name A",
              carried_fragment: "Fragment A",
            },
          ],
          group_size: 1,
          events: ["surface_mask"],
        },
      ],
    },
  ],
};

describe("buildArchiveGraph", () => {
  it("creates identity, unique tag, timeline, and collective nodes", () => {
    const result = buildArchiveGraph(graph, timeline);

    expect(result.nodes.some((node) => node.id === "submission_a" && node.type === "submission")).toBe(true);
    expect(result.nodes.some((node) => node.id === "tag:Dream" && node.type === "tag")).toBe(true);
    expect(result.nodes.some((node) => node.id === "timeline:submission_a_stage0_000")).toBe(true);
    expect(result.nodes.some((node) => node.id === "collective:global_stage5_collective")).toBe(true);
  });

  it("creates shared, conflict, interaction, and source membership links with valid endpoints", () => {
    const result = buildArchiveGraph(graph, timeline);
    const ids = new Set(result.nodes.map((node) => node.id));

    expect(result.links.some((link) => link.type === "interaction")).toBe(true);
    expect(result.links.some((link) => link.type === "shared_tag")).toBe(true);
    expect(result.links.some((link) => link.type === "conflict_tag")).toBe(true);
    expect(result.links.some((link) => link.type === "source_membership")).toBe(true);
    expect(result.links.every((link) => ids.has(link.source) && ids.has(link.target))).toBe(true);
  });

  it("assigns stable 3D positions", () => {
    const first = buildArchiveGraph(graph, timeline);
    const second = buildArchiveGraph(graph, timeline);

    expect(first.nodes.map((node) => node.position)).toEqual(second.nodes.map((node) => node.position));
  });

  it("returns Stage5 graph nodes already laid out inside the avatar radius", () => {
    const result = buildArchiveGraph(graph, timeline);
    const maxRadius = archiveVisualConfig.graph.stage5InternalRadius + 0.001;
    const stage5Nodes = result.nodes.filter((node) => node.type === "submission" || node.type === "tag");

    expect(stage5Nodes).not.toHaveLength(0);
    expect(stage5Nodes.every((node) => Number.isFinite(node.position.x))).toBe(true);
    expect(
      stage5Nodes.every(
        (node) => Math.hypot(node.position.x, node.position.y, node.position.z) <= maxRadius,
      ),
    ).toBe(true);
  });
});
