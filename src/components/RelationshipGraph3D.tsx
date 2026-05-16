import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";
import { GraphNodeSprite } from "./GraphNodeSprite";
import { IdentityBillboardLabel } from "./IdentityBillboardLabel";
import { Stage5HoverLabel } from "./Stage5HoverLabel";

type SearchableNode = Pick<
  ArchiveGraphNode,
  "id" | "identity_name" | "carried_fragment" | "tag_labels" | "visual"
>;

export function shouldRenderGraphLink(link: ArchiveGraphLink, focusedNodeId: string | null): boolean {
  if (link.type === "interaction" || link.type === "conflict_tag") return true;
  if (link.type !== "shared_tag") return false;
  return focusedNodeId === link.source || focusedNodeId === link.target;
}

export function getNodeOpacityMultiplier(node: SearchableNode, query: string): number {
  if (!query) return 1;
  const normalizedQuery = query.toLowerCase();
  const matches = [node.id, node.identity_name, node.carried_fragment, node.visual.label, ...node.tag_labels]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));

  return matches ? 1 : 0.16;
}

export function RelationshipGraph3D({ graph }: { graph: ArchiveGraph }) {
  const { filters, previewIdentity, selectNode, stage5Navigation, updateStage5Navigation } = useArchiveStore();
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const query = filters.query.trim().toLowerCase();
  const focusedNodeId = stage5Navigation.hoveredNodeId || stage5Navigation.selectedIdentityId;
  const hoveredNode = focusedNodeId ? nodeById.get(focusedNodeId) ?? null : null;

  const visibleNodes = useMemo(() => {
    if (!filters.tag) return graph.nodes;
    return graph.nodes.filter((node) => {
      const matchesTag = !filters.tag || node.tag_labels.includes(filters.tag);
      return matchesTag;
    });
  }, [filters.tag, graph.nodes]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleLinks = graph.links.filter((link) => {
    if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return false;
    if (!shouldRenderGraphLink(link, focusedNodeId)) return false;
    return link.visual.opacity <= filters.linkDensity + 0.4;
  });

  return (
    <group>
      {visibleLinks.map((link) => {
        const source = nodeById.get(link.source);
        const target = nodeById.get(link.target);
        if (!source || !target) return null;

        return (
          <Line
            key={link.id}
            points={[
              new THREE.Vector3(source.position.x, source.position.y, source.position.z),
              new THREE.Vector3(target.position.x, target.position.y, target.position.z),
            ]}
            color={link.type === "conflict_tag" ? archiveVisualConfig.colors.conflict : archiveVisualConfig.colors.shared}
            lineWidth={Math.max(0.35, link.visual.thickness)}
            transparent
            opacity={link.visual.opacity}
          />
        );
      })}
      {visibleNodes.map((node) => (
        <GraphNodeSprite
          key={node.id}
          node={node}
          opacityMultiplier={getNodeOpacityMultiplier(node, query)}
          onPointerOver={() => {
            selectNode(node);
            updateStage5Navigation({
              hoveredNodeId: node.id,
              hoveredTagLabel: node.type === "tag" ? node.visual.label : null,
            });
          }}
          onPointerOut={() => {
            updateStage5Navigation({ hoveredNodeId: null, hoveredTagLabel: null });
          }}
          onClick={() => {
            selectNode(node);
            if (node.type === "submission") previewIdentity(node.id);
          }}
        />
      ))}
      {visibleNodes.map((node) => (
        <IdentityBillboardLabel key={`${node.id}:label`} node={node} />
      ))}
      <Stage5HoverLabel node={hoveredNode} />
    </group>
  );
}
