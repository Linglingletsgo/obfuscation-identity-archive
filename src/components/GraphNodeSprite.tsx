import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { CanvasTexture, Color, SRGBColorSpace, Sprite, SpriteMaterial, Texture, TextureLoader } from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveGraphNode } from "../types/archive";

type SpriteShape = "identity-mark" | "dot-mark" | "timeline-mark";

export type NodeSpriteSpec = {
  shape: SpriteShape;
  color: string;
  scale: number;
  opacity: number;
};

const NODE_SPRITE_TEXTURE_PATHS: Record<SpriteShape, string> = {
  "identity-mark": "/assets/ui/node-identity.png",
  "dot-mark": "/assets/ui/node-tag.png",
  "timeline-mark": "/assets/ui/node-tag.png",
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
      shape: "identity-mark",
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

function jitter(value: number, seed: number, amount: number): number {
  return value + Math.sin(seed * 12.9898 + value * 78.233) * amount;
}

function drawRoughEllipse(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  seed: number,
) {
  for (let pass = 0; pass < 2; pass += 1) {
    context.beginPath();
    for (let index = 0; index <= 32; index += 1) {
      const angle = (index / 32) * Math.PI * 2;
      const roughRadiusX = jitter(radiusX, seed + index + pass * 31, 2.8);
      const roughRadiusY = jitter(radiusY, seed + index + pass * 47, 2.4);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotatedX = cos * roughRadiusX * Math.cos(rotation) - sin * roughRadiusY * Math.sin(rotation);
      const rotatedY = cos * roughRadiusX * Math.sin(rotation) + sin * roughRadiusY * Math.cos(rotation);
      const x = centerX + rotatedX;
      const y = centerY + rotatedY;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    if (pass === 0) context.fill();
    context.stroke();
  }
}

function drawRoughPolygon(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  seed: number,
) {
  for (let pass = 0; pass < 2; pass += 1) {
    context.beginPath();
    points.forEach(([pointX, pointY], index) => {
      const x = jitter(pointX, seed + index + pass * 13, 3.2);
      const y = jitter(pointY, seed + index + pass * 17, 3.2);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.closePath();
    if (pass === 0) context.fill();
    context.stroke();
  }
}

function addCrayonTexture(context: CanvasRenderingContext2D, color: string, opacity: number) {
  context.save();
  context.globalAlpha = opacity;
  context.strokeStyle = color;
  context.lineWidth = 1.4;
  for (let index = 0; index < 32; index += 1) {
    const y = 24 + index * 2.6;
    context.beginPath();
    context.moveTo(22 + jitter(0, index, 5), y + jitter(0, index + 3, 2));
    context.lineTo(106 + jitter(0, index + 7, 5), y + jitter(0, index + 11, 2));
    context.stroke();
  }
  context.restore();
}

function createSpriteTexture(spec: NodeSpriteSpec): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#17120f";
  context.fillStyle = spec.color;
  context.globalAlpha = Math.min(1, spec.opacity + 0.2);
  context.lineWidth = spec.shape === "dot-mark" ? 4.8 : 7.6;
  context.shadowColor = "rgba(23, 18, 15, 0.3)";
  context.shadowBlur = spec.shape === "dot-mark" ? 2 : 4;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;

  if (spec.shape === "dot-mark") {
    drawRoughEllipse(context, 64, 64, 19, 13, -0.28, 1);
    addCrayonTexture(context, "#fffdf8", 0.16);
  } else if (spec.shape === "timeline-mark") {
    drawRoughPolygon(context, [[33, 28], [98, 64], [32, 100]], 2);
    addCrayonTexture(context, "#fff3c8", 0.12);
  } else {
    drawRoughPolygon(context, [[25, 42], [58, 18], [94, 34], [107, 68], [88, 98], [49, 112], [23, 86], [14, 61]], 5);
    addCrayonTexture(context, "#fffdf8", 0.14);
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

export function createGraphNodeSpriteObject(
  spec: NodeSpriteSpec,
  opacityMultiplier: number,
  texture?: Texture,
): Sprite {
  const material = new SpriteMaterial({
    map: texture ?? createSpriteTexture(spec),
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
  const texture = useLoader(TextureLoader, NODE_SPRITE_TEXTURE_PATHS[spec.shape]);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const sprite = useMemo(
    () => createGraphNodeSpriteObject(spec, opacityMultiplier, texture),
    [opacityMultiplier, spec.color, spec.opacity, spec.scale, spec.shape, texture],
  );

  sprite.position.set(node.position.x, node.position.y, node.position.z);
  sprite.userData.baseOpacity = spec.opacity * opacityMultiplier;

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
