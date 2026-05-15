import type { ArchiveGraphNode, ArchiveStage } from "../types/archive";

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizedHash(value: string): number {
  return hashString(value) / 4294967295;
}

export function semanticStageZ(stage: ArchiveStage | undefined): number {
  if (stage === undefined) return 0;
  return [-7, -4, -1.5, 1.5, 4, 7][stage];
}

export function deterministicPosition(id: string, stage: ArchiveStage | undefined, radius = 7) {
  const angle = normalizedHash(`${id}:angle`) * Math.PI * 2;
  const localRadius = radius * (0.35 + normalizedHash(`${id}:radius`) * 0.65);
  const y = (normalizedHash(`${id}:y`) - 0.5) * radius;

  return {
    x: Number((Math.cos(angle) * localRadius).toFixed(4)),
    y: Number(y.toFixed(4)),
    z: Number((semanticStageZ(stage) + Math.sin(angle) * localRadius * 0.35).toFixed(4)),
  };
}

export function withPosition<T extends Omit<ArchiveGraphNode, "position">>(
  node: T,
): T & Pick<ArchiveGraphNode, "position"> {
  return {
    ...node,
    position: deterministicPosition(node.id, node.stage),
  };
}
