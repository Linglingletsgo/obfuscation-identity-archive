import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { projectNodeIntoAvatarShape } from "../data/avatarShape";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode, ArchiveStage } from "../types/archive";
import { GraphNodeSprite } from "./GraphNodeSprite";
import { IdentityBillboardLabel } from "./IdentityBillboardLabel";
import { Stage5HoverLabel } from "./Stage5HoverLabel";
import { useAvatarShapePositions } from "./AvatarShapeContext";

type SearchableNode = Pick<
  ArchiveGraphNode,
  "id" | "identity_name" | "carried_fragment" | "tag_labels" | "visual"
>;

type StageScope = {
  stage: ArchiveStage;
  selectedIdentityId: string | null;
  selectedTimelineItemId: string | null;
};

type GraphRenderPolicy = {
  depthTest: boolean;
  depthWrite: boolean;
  frustumCulled: boolean;
  renderOrder: number;
};

export function shouldRenderGraphLink(link: ArchiveGraphLink, focusedNodeId: string | null): boolean {
  if (link.type === "interaction" || link.type === "conflict_tag") return true;
  if (link.type !== "shared_tag") return false;
  return focusedNodeId === link.source || focusedNodeId === link.target;
}

function shouldRenderStage5GraphLink(link: ArchiveGraphLink, focusedNodeId: string | null): boolean {
  if (!focusedNodeId) {
    return link.type === "shared_tag" || link.type === "interaction" || link.type === "conflict_tag";
  }
  if (link.source !== focusedNodeId && link.target !== focusedNodeId) return false;
  if (link.type === "shared_tag" || link.type === "interaction" || link.type === "conflict_tag") return true;
  return shouldRenderGraphLink(link, focusedNodeId);
}

export function getStage2LinkOpacity(link: ArchiveGraphLink, focusedNodeId: string | null): number {
  if (!focusedNodeId) {
    return link.type === "shared_tag" || link.type === "interaction" || link.type === "conflict_tag" ? 0.12 : 0;
  }
  const connected = link.source === focusedNodeId || link.target === focusedNodeId;
  if (!connected) return 0;
  if (link.type === "shared_tag" || link.type === "interaction" || link.type === "conflict_tag") return 0.38;
  return link.visual.opacity;
}

export function getGraphLinkStyle(link: ArchiveGraphLink, stage: ArchiveStage, focusedNodeId: string | null) {
  const stage2Opacity = stage === 2 ? getStage2LinkOpacity(link, focusedNodeId) : link.visual.opacity;

  if (link.type === "shared_tag") {
    return {
      color: stage === 2 ? "#42d6b3" : archiveVisualConfig.colors.tag,
      lineWidth: stage === 2 ? 0.7 : 0.7,
      opacity: stage2Opacity,
      dashed: false,
    };
  }

  if (link.type === "interaction") {
    return {
      color: stage === 2 ? "#1f6fff" : archiveVisualConfig.colors.shared,
      lineWidth: stage === 2 ? 0.7 : 1,
      opacity: stage2Opacity,
      dashed: false,
    };
  }

  if (link.type === "conflict_tag") {
    return {
      color: stage === 2 ? "#ff5c7a" : archiveVisualConfig.colors.conflict,
      lineWidth: stage === 2 ? 0.7 : 1,
      opacity: stage2Opacity,
      dashed: true,
    };
  }

  return {
    color: archiveVisualConfig.colors.timeline,
    lineWidth: Math.max(0.35, link.visual.thickness),
    opacity: stage2Opacity,
    dashed: link.visual.dash,
  };
}

export function getGraphRenderPolicy(stage: ArchiveStage): GraphRenderPolicy {
  if (stage === 2) {
    return {
      depthTest: false,
      depthWrite: false,
      frustumCulled: false,
      renderOrder: 20,
    };
  }

  return {
    depthTest: true,
    depthWrite: false,
    frustumCulled: true,
    renderOrder: 0,
  };
}

export function shouldDisplayGraphLink(link: ArchiveGraphLink, stage: ArchiveStage, focusedNodeId: string | null, linkDensity: number): boolean {
  if (stage === 2) return getGraphLinkStyle(link, stage, focusedNodeId).opacity > 0;
  return link.visual.opacity <= linkDensity + 0.4;
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
  if (scope.stage === 2) {
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
  const currentStage = stage ?? (scopedNodes.some((node) => node.type === "timeline_item") ? 0 : 2);

  return graph.links.filter((link) => {
    if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return false;
    if (currentStage === 2) return shouldRenderStage5GraphLink(link, focusedNodeId);
    return false;
  });
}

export function shouldShowIdentityBillboard(
  node: Pick<ArchiveGraphNode, "id" | "type">,
  context: { stage: ArchiveStage; focusedNodeId: string | null },
): boolean {
  return node.type === "submission" && context.stage === 2;
}

export function shouldShowTagLabel(
  node: Pick<ArchiveGraphNode, "id" | "type">,
  context: { stage: ArchiveStage; focusedNodeId: string | null },
): boolean {
  if (node.type !== "tag") return false;
  return context.stage !== 2 || context.focusedNodeId === node.id;
}

export function shouldSelectNodeOnStage2Hover(
  node: Pick<ArchiveGraphNode, "type">,
  stage: ArchiveStage,
): boolean {
  return stage !== 2 && node.type !== "tag";
}

export function shouldStage2NodeClickLock(node: Pick<ArchiveGraphNode, "type">, stage: ArchiveStage): boolean {
  return stage === 2 && (node.type === "submission" || node.type === "tag" || node.type === "collective");
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
  const avatarShapePositions = useAvatarShapePositions();
  const query = filters.query.trim().toLowerCase();
  const focusedNodeId = stage5Navigation.hoveredNodeId || stage5Navigation.selectedIdentityId;
  const scopedNodes = useMemo(
    () => getStageScopedGraphNodes(graph, { stage, selectedIdentityId, selectedTimelineItemId }),
    [graph, selectedIdentityId, selectedTimelineItemId, stage],
  );
  const shapedNodes = useMemo(
    () => {
      if (stage !== 2) return scopedNodes;
      if (!avatarShapePositions || avatarShapePositions.length < 3) return [];

      const projectedNodeIndexById = new Map<string, { index: number; total: number }>();
      for (const nodeType of ["submission", "tag"] as const) {
        const projectedNodes = scopedNodes
          .filter((node) => node.type === nodeType)
          .sort((left, right) => left.id.localeCompare(right.id));
        projectedNodes.forEach((node, index) => {
          projectedNodeIndexById.set(node.id, { index, total: projectedNodes.length });
        });
      }

      return scopedNodes.map((node) => {
        if (node.type === "collective") return { ...node, position: { x: 0, y: 0, z: 0 } };
        if (node.type !== "submission" && node.type !== "tag") return node;

        return {
          ...node,
          position: projectNodeIntoAvatarShape(node, avatarShapePositions, 0.78, {
            index: projectedNodeIndexById.get(node.id)?.index ?? 0,
            total: projectedNodeIndexById.get(node.id)?.total ?? 1,
          }),
        };
      });
    },
    [avatarShapePositions, scopedNodes, stage],
  );
  const nodeById = useMemo(() => new Map(shapedNodes.map((node) => [node.id, node])), [shapedNodes]);
  const hoveredNode = focusedNodeId ? nodeById.get(focusedNodeId) ?? null : null;

  const visibleNodes = useMemo(() => {
    if (!filters.tag) return shapedNodes;
    return shapedNodes.filter((node) => {
      const matchesTag = !filters.tag || node.tag_labels.includes(filters.tag);
      return matchesTag;
    });
  }, [filters.tag, shapedNodes]);

  const visibleLinks = getStageScopedGraphLinks(graph, visibleNodes, focusedNodeId, stage).filter(
    (link) => shouldDisplayGraphLink(link, stage, focusedNodeId, filters.linkDensity),
  );
  const graphRenderPolicy = getGraphRenderPolicy(stage);

  return (
    <group frustumCulled={graphRenderPolicy.frustumCulled} renderOrder={graphRenderPolicy.renderOrder}>
      {visibleLinks.map((link) => {
        const source = nodeById.get(link.source);
        const target = nodeById.get(link.target);
        if (!source || !target) return null;
        const linkStyle = getGraphLinkStyle(link, stage, focusedNodeId);

        return (
          <Line
            key={link.id}
            points={[
              new THREE.Vector3(source.position.x, source.position.y, source.position.z),
              new THREE.Vector3(target.position.x, target.position.y, target.position.z),
            ]}
            color={linkStyle.color}
            lineWidth={linkStyle.lineWidth}
            dashed={linkStyle.dashed}
            dashSize={0.12}
            gapSize={0.08}
            transparent
            depthTest={graphRenderPolicy.depthTest}
            depthWrite={graphRenderPolicy.depthWrite}
            frustumCulled={graphRenderPolicy.frustumCulled}
            opacity={linkStyle.opacity}
            renderOrder={graphRenderPolicy.renderOrder}
          />
        );
      })}
      {visibleNodes.map((node) => (
        <GraphNodeSprite
          key={node.id}
          node={node}
          opacityMultiplier={getNodeOpacityMultiplier(node, query)}
          onPointerOver={() => {
            if (shouldSelectNodeOnStage2Hover(node, stage)) selectNode(node);
            updateStage5Navigation({
              hoveredNodeId: node.id,
              hoveredTagLabel: node.type === "tag" ? node.visual.label : null,
            });
          }}
          onPointerOut={() => {
            updateStage5Navigation({ hoveredNodeId: null, hoveredTagLabel: null });
          }}
          onClick={() => {
            if (stage !== 2) {
              selectNode(node);
              if (node.type === "submission") previewIdentity(node.id);
              return;
            }

            if (shouldStage2NodeClickLock(node, stage)) {
              selectNode(node);
              updateStage5Navigation({ selectedIdentityId: node.id });
              if (node.type === "submission") previewIdentity(node.id);
            }
          }}
        />
      ))}
      {visibleNodes.map((node) => (
        <IdentityBillboardLabel
          key={`${node.id}:label`}
          node={node}
          onClick={() => {
            if (!shouldStage2NodeClickLock(node, stage)) return;
            selectNode(node);
            updateStage5Navigation({ selectedIdentityId: node.id });
            if (node.type === "submission") previewIdentity(node.id);
          }}
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
