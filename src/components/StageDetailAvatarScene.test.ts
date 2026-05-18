import { describe, expect, it } from "vitest";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { getStageDetailSceneState } from "./StageDetailAvatarScene";

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

const graph: ArchiveGraph = {
  nodes: [
    node("identity:a", "submission", ["Global"], {
      asset_path: "/avatars/a.png",
      carried_fragment: "fragment",
      identity_name: "A",
      source_ids: ["identity:a"],
    }),
    node("timeline:a-stage1", "timeline_item", ["Dream"], {
      avatar_tags: { community: ["Shared"], private: ["Dream"] },
      source_ids: ["identity:a"],
      stage: 1,
    }),
    node("timeline:a-stage1-b", "timeline_item", ["Market"], {
      avatar_tags: { community: ["Trade"], private: ["Market"] },
      source_ids: ["identity:a"],
      stage: 1,
    }),
    node("timeline:a-stage1-c", "timeline_item", ["Memory"], {
      avatar_tags: { community: ["Archive"], private: ["Memory"] },
      source_ids: ["identity:a"],
      stage: 1,
    }),
    node("tag:Dream", "tag", ["Dream"]),
  ],
  links: [],
  metadata: {
    layout: "deterministic-avatar-map",
    seed: "test",
    source_files: [],
    generated_at: new Date(0).toISOString(),
  },
};

describe("StageDetailAvatarScene state", () => {
  it("restores Stage0 to the source avatar image when one is available", () => {
    expect(
      getStageDetailSceneState(graph, {
        stage: 0,
        selectedIdentityId: "identity:a",
        selectedTimelineItemId: null,
      }),
    ).toMatchObject({
      visualType: "avatar",
      assetSources: ["/avatars/a.png"],
    });
  });

  it("leaves Stage1 cluster body avatar blank while keeping active tags", () => {
    expect(
      getStageDetailSceneState(graph, {
        stage: 1,
        selectedIdentityId: "identity:a",
        selectedTimelineItemId: "a-stage1",
      }),
    ).toMatchObject({
      visualType: "blank",
      label: "timeline:a-stage1",
      assetSources: [],
      tagLabels: ["Dream", "Shared"],
    });
  });

  it("does not render a detail avatar scene for Stage2 collective", () => {
    expect(
      getStageDetailSceneState(graph, {
        stage: 2,
        selectedIdentityId: "identity:a",
        selectedTimelineItemId: null,
      }),
    ).toBeNull();
  });

  it("keeps Stage0 in restored avatar mode even when no image is available", () => {
    expect(
      getStageDetailSceneState(
        {
          ...graph,
          nodes: [node("identity:missing", "submission", ["Global"], { source_ids: ["identity:missing"] })],
        },
        {
          stage: 0,
          selectedIdentityId: "identity:missing",
          selectedTimelineItemId: null,
        },
      ),
    ).toMatchObject({
      visualType: "avatar",
      assetSources: [],
    });
  });
});
