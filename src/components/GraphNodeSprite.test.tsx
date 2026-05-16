import { describe, expect, it } from "vitest";
import type { ArchiveGraphNode } from "../types/archive";
import { getNodeSpriteSpec } from "./GraphNodeSprite";

function node(type: ArchiveGraphNode["type"]): ArchiveGraphNode {
  return {
    id: `${type}:1`,
    type,
    source_ids: [],
    tags: [],
    tag_labels: [],
    scores: {},
    events: [],
    position: { x: 0, y: 0, z: 0 },
    visual: {
      size: 1,
      color_group: type,
      opacity: 1,
      label: type,
      node_shape: "mark",
      node_style_key: type,
    },
  };
}

describe("getNodeSpriteSpec", () => {
  it("makes identity sprites larger than tag sprites", () => {
    expect(getNodeSpriteSpec(node("submission")).scale).toBeGreaterThan(getNodeSpriteSpec(node("tag")).scale);
  });

  it("keeps tag sprites lightweight and non-spherical", () => {
    expect(getNodeSpriteSpec(node("tag")).shape).toBe("dot-mark");
    expect(getNodeSpriteSpec(node("tag")).opacity).toBeLessThan(0.8);
  });
});
