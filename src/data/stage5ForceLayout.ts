import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";

type MutablePoint = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  community: string;
};

type CommunityCenter = Pick<MutablePoint, "x" | "y" | "z">;

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

function rounded(value: number): number {
  return Number(value.toFixed(4));
}

function distance(point: Pick<MutablePoint, "x" | "y" | "z">): number {
  return Math.hypot(point.x, point.y, point.z);
}

function clampToSphere(point: MutablePoint, radius: number): void {
  const currentDistance = distance(point);
  if (currentDistance <= radius || currentDistance === 0) return;

  const scale = radius / currentDistance;
  point.x *= scale;
  point.y *= scale;
  point.z *= scale;
  point.vx *= 0.35;
  point.vy *= 0.35;
  point.vz *= 0.35;
}

function firstCommunity(node: ArchiveGraphNode): string {
  if (node.type === "tag") return node.tag_labels[0] ?? node.id.replace(/^tag:/, "");
  return node.tag_labels[0] ?? node.source_ids[0] ?? node.id;
}

function centerForCommunity(label: string, radius: number): CommunityCenter {
  const theta = normalizedHash(`${label}:theta`) * Math.PI * 2;
  const phi = Math.acos(1 - normalizedHash(`${label}:phi`) * 2);
  const localRadius = radius * (0.38 + normalizedHash(`${label}:radius`) * 0.44);

  return {
    x: Math.sin(phi) * Math.cos(theta) * localRadius,
    y: Math.cos(phi) * localRadius * 0.72,
    z: Math.sin(phi) * Math.sin(theta) * localRadius,
  };
}

function initialPoint(node: ArchiveGraphNode, communityCenter: CommunityCenter): MutablePoint {
  const jitter = archiveVisualConfig.graph.stage5InternalRadius * 0.12;

  return {
    x: communityCenter.x + (normalizedHash(`${node.id}:x`) - 0.5) * jitter,
    y: communityCenter.y + (normalizedHash(`${node.id}:y`) - 0.5) * jitter,
    z: communityCenter.z + (normalizedHash(`${node.id}:z`) - 0.5) * jitter,
    vx: 0,
    vy: 0,
    vz: 0,
    community: firstCommunity(node),
  };
}

function stage5Eligible(node: ArchiveGraphNode): boolean {
  return node.type === "submission" || node.type === "tag" || node.type === "collective";
}

function linkStrength(link: ArchiveGraphLink): number {
  if (link.type === "shared_tag") return 1.15;
  if (link.type === "interaction") return 0.9;
  if (link.type === "conflict_tag") return 0.42;
  if (link.type === "source_membership") return 0.55;
  return 0.35;
}

export function applyStage5ForceLayout(graph: ArchiveGraph): ArchiveGraph {
  const radius = archiveVisualConfig.graph.stage5InternalRadius;
  const layoutNodes = graph.nodes.filter(stage5Eligible);
  const layoutIds = new Set(layoutNodes.map((node) => node.id));
  const centers = new Map<string, CommunityCenter>();
  const points = new Map<string, MutablePoint>();

  for (const node of layoutNodes) {
    const community = firstCommunity(node);
    if (!centers.has(community)) {
      centers.set(community, centerForCommunity(community, radius));
    }
    points.set(node.id, initialPoint(node, centers.get(community)!));
  }

  const links = graph.links.filter((link) => layoutIds.has(link.source) && layoutIds.has(link.target));

  for (let tick = 0; tick < archiveVisualConfig.graph.stage5SimulationTicks; tick += 1) {
    for (let a = 0; a < layoutNodes.length; a += 1) {
      const source = points.get(layoutNodes[a].id)!;
      for (let b = a + 1; b < layoutNodes.length; b += 1) {
        const target = points.get(layoutNodes[b].id)!;
        const dx = source.x - target.x || 0.0001;
        const dy = source.y - target.y || 0.0001;
        const dz = source.z - target.z || 0.0001;
        const squaredDistance = Math.max(dx * dx + dy * dy + dz * dz, 0.08);
        const force = archiveVisualConfig.graph.stage5Repel / squaredDistance;

        source.vx += dx * force;
        source.vy += dy * force;
        source.vz += dz * force;
        target.vx -= dx * force;
        target.vy -= dy * force;
        target.vz -= dz * force;
      }
    }

    for (const link of links) {
      const source = points.get(link.source);
      const target = points.get(link.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      const force = archiveVisualConfig.graph.stage5LinkPull * link.weight * linkStrength(link);

      source.vx += dx * force;
      source.vy += dy * force;
      source.vz += dz * force;
      target.vx -= dx * force;
      target.vy -= dy * force;
      target.vz -= dz * force;
    }

    for (const point of points.values()) {
      const center = centers.get(point.community)!;
      point.vx += (center.x - point.x) * archiveVisualConfig.graph.stage5CommunityPull;
      point.vy += (center.y - point.y) * archiveVisualConfig.graph.stage5CommunityPull;
      point.vz += (center.z - point.z) * archiveVisualConfig.graph.stage5CommunityPull;

      point.x += point.vx;
      point.y += point.vy;
      point.z += point.vz;
      point.vx *= 0.74;
      point.vy *= 0.74;
      point.vz *= 0.74;
      clampToSphere(point, radius);
    }
  }

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const point = points.get(node.id);
      if (!point) return node;

      return {
        ...node,
        position: {
          x: rounded(point.x),
          y: rounded(point.y),
          z: rounded(point.z),
        },
      };
    }),
  };
}
