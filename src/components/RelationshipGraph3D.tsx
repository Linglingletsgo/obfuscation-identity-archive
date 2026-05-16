import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode, ArchiveStage } from "../types/archive";
import { GraphNodeSprite } from "./GraphNodeSprite";
import { IdentityBillboardLabel } from "./IdentityBillboardLabel";
import { Stage5HoverLabel } from "./Stage5HoverLabel";

type SearchableNode = Pick<
  ArchiveGraphNode,
  "id" | "identity_name" | "carried_fragment" | "tag_labels" | "visual"
>;

type StageScope = {
  stage: ArchiveStage;
  selectedIdentityId: string | null;
  selectedTimelineItemId: string | null;
};

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

function timelineNodeMatchesSelection(node: ArchiveGraphNode, scope: StageScope): boolean {
  if (node.type !== "timeline_item" || node.stage !== scope.stage) return false;
  if (!scope.selectedIdentityId || !node.source_ids.includes(scope.selectedIdentityId)) return false;
  if (!scope.selectedTimelineItemId) return true;
  return node.id === `timeline:${scope.selectedTimelineItemId}` || node.id === scope.selectedTimelineItemId;
}

function timelineTagLabels(node: ArchiveGraphNode | undefined): Set<string> {
  const labels = new Set(node?.tag_labels ?? []);
  for (const values of Object.values(node?.avatar_tags ?? {})) {
    for (const label of values) labels.add(label);
  }
  return labels;
}

export function getStageScopedGraphNodes(graph: ArchiveGraph, scope: StageScope): ArchiveGraphNode[] {
  if (scope.stage === 5) {
    return graph.nodes.filter(
      (node) => node.type === "submission" || node.type === "tag" || node.type === "collective",
    );
  }

  if (!scope.selectedIdentityId) return [];

  const selectedTimelineNode =
    graph.nodes.find((node) => timelineNodeMatchesSelection(node, scope)) ??
    graph.nodes.find(
      (node) =>
        node.type === "timeline_item" &&
        node.stage === scope.stage &&
        node.source_ids.includes(scope.selectedIdentityId ?? ""),
    );
  const activeTags = timelineTagLabels(selectedTimelineNode);

  return graph.nodes.filter((node) => {
    if (node.id === scope.selectedIdentityId) return true;
    if (selectedTimelineNode && node.id === selectedTimelineNode.id) return true;
    if (node.type !== "tag") return false;
    return node.tag_labels.some((label) => activeTags.has(label));
  });
}

export function getStageScopedGraphLinks(
  graph: ArchiveGraph,
  scopedNodes: ArchiveGraphNode[],
  focusedNodeId: string | null,
  stage?: ArchiveStage,
): ArchiveGraphLink[] {
  const visibleIds = new Set(scopedNodes.map((node) => node.id));
  const currentStage = stage ?? (scopedNodes.some((node) => node.type === "timeline_item") ? 0 : 5);

  return graph.links.filter((link) => {
    if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return false;
    if (currentStage === 5) return shouldRenderGraphLink(link, focusedNodeId);
    return link.type === "shared_tag" || link.type === "source_membership" || link.type === "anchor_membership";
  });
}

export function shouldShowIdentityBillboard(
  node: Pick<ArchiveGraphNode, "id" | "type">,
  context: { stage: ArchiveStage; focusedNodeId: string | null },
): boolean {
  return node.type === "submission" && context.stage === 5;
}

export function shouldShowTagLabel(
  node: Pick<ArchiveGraphNode, "id" | "type">,
  context: { stage: ArchiveStage; focusedNodeId: string | null },
): boolean {
  if (node.type !== "tag") return false;
  return context.stage !== 5 || context.focusedNodeId === node.id;
}

export function RelationshipGraph3D({ graph }: { graph: ArchiveGraph }) {
  const {
    filters,
    previewIdentity,
    selectNode,
    selectedIdentityId,
    selectedTimelineItemId,
    stage,
    stage5Navigation,
    updateStage5Navigation,
  } = useArchiveStore();
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const query = filters.query.trim().toLowerCase();
  const focusedNodeId = stage5Navigation.hoveredNodeId || stage5Navigation.selectedIdentityId;
  const hoveredNode = focusedNodeId ? nodeById.get(focusedNodeId) ?? null : null;
  const scopedNodes = useMemo(
    () => getStageScopedGraphNodes(graph, { stage, selectedIdentityId, selectedTimelineItemId }),
    [graph, selectedIdentityId, selectedTimelineItemId, stage],
  );

  const visibleNodes = useMemo(() => {
    if (!filters.tag) return scopedNodes;
    return scopedNodes.filter((node) => {
      const matchesTag = !filters.tag || node.tag_labels.includes(filters.tag);
      return matchesTag;
    });
  }, [filters.tag, scopedNodes]);

  const visibleLinks = getStageScopedGraphLinks(graph, visibleNodes, focusedNodeId, stage).filter(
    (link) => link.visual.opacity <= filters.linkDensity + 0.4,
  );

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
        <IdentityBillboardLabel
          key={`${node.id}:label`}
          node={node}
          visible={shouldShowIdentityBillboard(node, { stage, focusedNodeId })}
        />
      ))}
      {visibleNodes.map((node) =>
        shouldShowTagLabel(node, { stage, focusedNodeId }) ? (
          <Stage5HoverLabel key={`${node.id}:tag-label`} node={node} />
        ) : null,
      )}
    </group>
  );
}
