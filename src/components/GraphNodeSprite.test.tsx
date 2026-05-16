import { describe, expect, it } from "vitest";
import { Sprite, SpriteMaterial } from "three";
import type { ArchiveGraphNode } from "../types/archive";
import { configureGraphNodeSpriteObject, getNodeSpriteSpec } from "./GraphNodeSprite";

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

  it("creates depth-independent graph sprites that cannot be culled away in Stage5", () => {
    const sprite = configureGraphNodeSpriteObject(new Sprite(new SpriteMaterial()));

    expect(sprite.frustumCulled).toBe(false);
    expect(sprite.renderOrder).toBeGreaterThan(0);
    expect(sprite.material.depthTest).toBe(false);
  });
});
