import { describe, expect, it } from "vitest";
import { mergeGeneratedOverlay } from "./generatedOverlayMerge";
import type { ArchiveGraph } from "../types/archive";
import type { GeneratedOverlayGraph } from "./generatedOverlay";

function baseGraph(): ArchiveGraph {
  return {
    nodes: [
      {
        id: "base-a",
        type: "submission",
        stage: 0,
        position: { x: 0, y: 0, z: 0 },
        source_ids: ["base-a"],
        tags: [{ label: "Archive" }],
        tag_labels: ["Archive"],
        scores: {},
        events: [],
        asset_path: "/assets/avatars/stage0/base-a.png",
        visual: {
          size: 1.2,
          color_group: "identity",
          opacity: 1,
          label: "Name: Base A",
          node_shape: "mark",
          node_style_key: "identity-center",
        },
      },
      {
        id: "tag:Archive",
        type: "tag",
        stage: 2,
        position: { x: 0, y: 0, z: 0 },
        source_ids: [],
        tags: [{ label: "Archive" }],
        tag_labels: ["Archive"],
        scores: {},
        events: [],
        visual: {
          size: 0.42,
          color_group: "tag",
          opacity: 0.78,
          label: "Archive",
          node_shape: "particle",
          node_style_key: "tag-node",
        },
      },
    ],
    links: [
      {
        id: "shared_tag:base-a->tag:Archive",
        source: "base-a",
        target: "tag:Archive",
        type: "shared_tag",
        weight: 1,
        scores: {},
        events: [],
        visual: { style_key: "shared-tag", opacity: 0.28, thickness: 0.6, dash: false },
      },
    ],
    metadata: {
      layout: "stage2-model-sampled-avatar-map",
      seed: "test",
      source_files: [],
      generated_at: new Date(0).toISOString(),
    },
  };
}

function overlay(): GeneratedOverlayGraph {
  return {
    version: 1,
    generated_at: "2026-05-29T00:00:00.000Z",
    nodes: [
      {
        id: "generated-a",
        type: "submission",
        label: "Generated A",
        carried_fragment: "Generated fragment",
        asset_path: "/assets/avatars/generated/generated-a.png",
        tags: [{ label: "Archive", definition_source: "standard" }],
        source_group: "generated",
      },
    ],
    edges: [
      {
        id: "generated_shared:generated-a->base-a",
        source: "generated-a",
        target: "base-a",
        relation: "interaction",
        weight: 1,
        shared_tags: ["Archive"],
      },
    ],
  };
}

describe("mergeGeneratedOverlay", () => {
  it("adds generated submissions and relationships without mutating base graph", () => {
    const original = baseGraph();
    const originalNodeIds = original.nodes.map((node) => node.id);
    const merged = mergeGeneratedOverlay(original, overlay());

    expect(original.nodes.map((node) => node.id)).toEqual(originalNodeIds);
    expect(merged.nodes.map((node) => node.id)).toEqual(["base-a", "tag:Archive", "generated-a"]);
    expect(merged.links.map((link) => link.id)).toContain("generated_shared:generated-a->base-a");
    expect(merged.metadata.source_files).toEqual(original.metadata.source_files);
  });

  it("does not create new tag nodes for generated-only custom tags", () => {
    const customOverlay = overlay();
    customOverlay.nodes[0].tags.push({ label: "Custom invented tag", definition_source: "custom" });
    const merged = mergeGeneratedOverlay(baseGraph(), customOverlay);

    expect(merged.nodes.some((node) => node.id === "tag:Custom invented tag")).toBe(false);
    expect(merged.nodes.find((node) => node.id === "generated-a")?.tag_labels).toEqual(["Archive"]);
  });
});
