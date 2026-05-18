import { describe, expect, it } from "vitest";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";
import { getIndividualSceneState } from "./IndividualAvatarScene";

function node(
  id: string,
  type: ArchiveGraphNode["type"],
  tagLabels: string[],
  overrides: Partial<ArchiveGraphNode> = {},
): ArchiveGraphNode {
  return {
    id,
    type,
    stage: overrides.stage,
    source_ids: overrides.source_ids ?? [],
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
    ...overrides,
  };
}

function link(type: ArchiveGraphLink["type"], source: string, target: string): ArchiveGraphLink {
  return {
    id: `${type}:${source}:${target}`,
    source,
    target,
    type,
    weight: 1,
    scores: {},
    events: [],
    visual: { style_key: type, opacity: 0.5, thickness: 1, dash: type === "conflict_tag" },
  };
}

const graph: ArchiveGraph = {
  nodes: [
    node("identity:a", "submission", ["Global"], {
      asset_path: "/avatars/a.png",
      avatar_tags: { community: ["Shared"], private: ["Dream"] },
      carried_fragment: "fragment",
      identity_name: "A",
      source_ids: ["identity:a"],
    }),
    node("tag:Dream", "tag", ["Dream"]),
  ],
  links: [link("conflict_tag", "identity:a", "tag:Dream")],
  metadata: {
    layout: "deterministic-avatar-map",
    seed: "test",
    source_files: [],
    generated_at: new Date(0).toISOString(),
  },
};

describe("IndividualAvatarScene state", () => {
  it("uses the selected individual avatar image when one is available", () => {
    expect(getIndividualSceneState(graph, "identity:a")).toMatchObject({
      assetSources: ["/avatars/a.png"],
      carriedFragment: "fragment",
      conflictTagLabels: ["Dream"],
      id: "identity:a",
      label: "A",
      tagNodes: [
        expect.objectContaining({ conflict: true, label: "Dream" }),
        expect.objectContaining({ conflict: false, label: "Global" }),
        expect.objectContaining({ conflict: false, label: "Shared" }),
      ],
      tagLabels: ["Dream", "Global", "Shared"],
    });
  });

  it("returns null for collective or missing individual selection", () => {
    expect(getIndividualSceneState(graph, null)).toBeNull();
    expect(getIndividualSceneState(graph, "missing")).toBeNull();
  });

  it("keeps individual view available even when no image is available", () => {
    expect(
      getIndividualSceneState(
        {
          ...graph,
          nodes: [node("identity:missing", "submission", ["Global"], { source_ids: ["identity:missing"] })],
        },
        "identity:missing",
      ),
    ).toMatchObject({
      assetSources: [],
      carriedFragment: "",
      conflictTagLabels: [],
      id: "identity:missing",
      tagNodes: [expect.objectContaining({ conflict: false, label: "Global" })],
      tagLabels: ["Global"],
    });
  });
});
