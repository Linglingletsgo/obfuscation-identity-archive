import { useMemo } from "react";
import { CanvasTexture, Color, Sprite, SpriteMaterial } from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveGraphNode } from "../types/archive";

type SpriteShape = "identity-mark" | "dot-mark" | "timeline-mark" | "collective-mark";

export type NodeSpriteSpec = {
  shape: SpriteShape;
  color: string;
  scale: number;
  opacity: number;
};

export function getNodeSpriteSpec(node: ArchiveGraphNode): NodeSpriteSpec {
  if (node.type === "tag") {
    return {
      shape: "dot-mark",
      color: archiveVisualConfig.colors.tag,
      scale: archiveVisualConfig.graph.tagSpriteScale,
      opacity: archiveVisualConfig.graph.tagSpriteOpacity,
    };
  }

  if (node.type === "timeline_item") {
    return {
      shape: "timeline-mark",
      color: archiveVisualConfig.colors.timeline,
      scale: archiveVisualConfig.graph.timelineSpriteScale,
      opacity: 0.72,
    };
  }

  if (node.type === "collective") {
    return {
      shape: "collective-mark",
      color: archiveVisualConfig.colors.collective,
      scale: 1.1,
      opacity: 0.36,
    };
  }

  return {
    shape: "identity-mark",
    color: archiveVisualConfig.colors.identity,
    scale: archiveVisualConfig.graph.identitySpriteScale,
    opacity: archiveVisualConfig.graph.identitySpriteOpacity,
  };
}

function createSpriteTexture(spec: NodeSpriteSpec): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = archiveVisualConfig.colors.ink;
  context.fillStyle = spec.color;
  context.globalAlpha = spec.opacity;
  context.lineWidth = spec.shape === "dot-mark" ? 5 : 8;

  if (spec.shape === "dot-mark") {
    context.beginPath();
    context.ellipse(64, 64, 18, 13, -0.3, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else if (spec.shape === "timeline-mark") {
    context.beginPath();
    context.moveTo(34, 30);
    context.lineTo(96, 64);
    context.lineTo(34, 98);
    context.closePath();
    context.fill();
    context.stroke();
  } else if (spec.shape === "collective-mark") {
    context.beginPath();
    context.arc(64, 64, 34, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.globalAlpha = spec.opacity * 0.45;
    context.beginPath();
    context.arc(64, 64, 48, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(25, 42);
    context.quadraticCurveTo(58, 15, 95, 36);
    context.quadraticCurveTo(112, 68, 88, 98);
    context.quadraticCurveTo(50, 114, 24, 86);
    context.quadraticCurveTo(10, 62, 25, 42);
    context.fill();
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = "srgb";
  return texture;
}

type GraphNodeSpriteProps = {
  node: ArchiveGraphNode;
  opacityMultiplier?: number;
  onClick?: () => void;
  onPointerOut?: () => void;
  onPointerOver?: () => void;
};

type PointerEventLike = {
  stopPropagation: () => void;
};

export function configureGraphNodeSpriteObject(object: Sprite): Sprite {
  object.frustumCulled = false;
  object.renderOrder = 20;
  object.material.depthTest = false;
  object.material.depthWrite = false;
  return object;
}

export function createGraphNodeSpriteObject(spec: NodeSpriteSpec, opacityMultiplier: number): Sprite {
  const material = new SpriteMaterial({
    map: createSpriteTexture(spec),
    color: new Color("#ffffff"),
    transparent: true,
    opacity: spec.opacity * opacityMultiplier,
    depthWrite: false,
    depthTest: false,
  });
  const object = new Sprite(material);
  object.scale.setScalar(spec.scale);
  return configureGraphNodeSpriteObject(object);
}

export function GraphNodeSprite({
  node,
  opacityMultiplier = 1,
  onClick,
  onPointerOut,
  onPointerOver,
}: GraphNodeSpriteProps) {
  const spec = getNodeSpriteSpec(node);
  const sprite = useMemo(
    () => createGraphNodeSpriteObject(spec, opacityMultiplier),
    [opacityMultiplier, spec.color, spec.opacity, spec.scale, spec.shape],
  );

  sprite.position.set(node.position.x, node.position.y, node.position.z);
  sprite.material.opacity = spec.opacity * opacityMultiplier;

  return (
    <primitive
      object={sprite}
      onClick={(event: PointerEventLike) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerOut={(event: PointerEventLike) => {
        event.stopPropagation();
        onPointerOut?.();
      }}
      onPointerOver={(event: PointerEventLike) => {
        event.stopPropagation();
        onPointerOver?.();
      }}
    />
  );
}
