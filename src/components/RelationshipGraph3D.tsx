import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { projectNodeIntoAvatarShape } from "../data/avatarShape";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode, ArchiveView } from "../types/archive";
import { GraphNodeSprite } from "./GraphNodeSprite";
import { IdentityBillboardLabel } from "./IdentityBillboardLabel";
import { CollectiveHoverLabel } from "./CollectiveHoverLabel";
import { useAvatarShapePositions } from "./AvatarShapeContext";

type SearchableNode = Pick<
  ArchiveGraphNode,
  "id" | "identity_name" | "type" | "visual"
>;

type StageScope = {
  view: ArchiveView;
  selectedIdentityId: string | null;
};

type GraphRenderPolicy = {
  depthTest: boolean;
  depthWrite: boolean;
  frustumCulled: boolean;
  renderOrder: number;
};

const LABEL_VISIBLE_OPACITY_THRESHOLD = 0.55;
const PROJECTED_NODE_TYPES = ["submission", "tag"] as const;

function GraphLinkLine({
  graphRenderPolicy,
  opacity,
  source,
  style,
  target,
}: {
  graphRenderPolicy: GraphRenderPolicy;
  opacity: number;
  source: ArchiveGraphNode;
  style: ReturnType<typeof getGraphLinkStyle>;
  target: ArchiveGraphNode;
}) {
  const points = useMemo(
    () => [
      new THREE.Vector3(source.position.x, source.position.y, source.position.z),
      new THREE.Vector3(target.position.x, target.position.y, target.position.z),
    ],
    [
      source.position.x,
      source.position.y,
      source.position.z,
      target.position.x,
      target.position.y,
      target.position.z,
    ],
  );

  return (
    <Line
      points={points}
      color={style.color}
      lineWidth={style.lineWidth}
      dashed={style.dashed}
      dashSize={0.12}
      gapSize={0.08}
      transparent
      depthTest={graphRenderPolicy.depthTest}
      depthWrite={graphRenderPolicy.depthWrite}
      frustumCulled={graphRenderPolicy.frustumCulled}
      opacity={style.opacity * opacity}
      renderOrder={graphRenderPolicy.renderOrder}
    />
  );
}

export function shouldRenderGraphLink(link: ArchiveGraphLink, focusedNodeId: string | null): boolean {
  if (link.type === "interaction" || link.type === "conflict_tag") return true;
  if (link.type !== "shared_tag") return false;
  return focusedNodeId === link.source || focusedNodeId === link.target;
}

function getStableLinkBucket(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function shouldRenderDefaultCollectiveGraphLink(link: ArchiveGraphLink, linkDensity: number): boolean {
  if (link.type !== "shared_tag" && link.type !== "interaction" && link.type !== "conflict_tag") return false;
  return getStableLinkBucket(link.id) <= Math.max(0, Math.min(1, linkDensity));
}

function shouldRenderCollectiveGraphLink(
  link: ArchiveGraphLink,
  focusedNodeId: string | null,
  linkDensity: number,
): boolean {
  if (!focusedNodeId) {
    return shouldRenderDefaultCollectiveGraphLink(link, linkDensity);
  }
  if (link.source !== focusedNodeId && link.target !== focusedNodeId) return false;
  if (link.type === "shared_tag" || link.type === "interaction" || link.type === "conflict_tag") return true;
  return shouldRenderGraphLink(link, focusedNodeId);
}

export function getCollectiveLinkOpacity(link: ArchiveGraphLink, focusedNodeId: string | null): number {
  if (!focusedNodeId) {
    return link.type === "shared_tag" || link.type === "interaction" || link.type === "conflict_tag" ? 0.38 : 0;
  }
  const connected = link.source === focusedNodeId || link.target === focusedNodeId;
  if (!connected) return 0;
  if (link.type === "shared_tag" || link.type === "interaction" || link.type === "conflict_tag") return 0.38;
  return link.visual.opacity;
}

export function getGraphLinkStyle(link: ArchiveGraphLink, view: ArchiveView, focusedNodeId: string | null) {
  const collectiveOpacity = view === "collective" ? getCollectiveLinkOpacity(link, focusedNodeId) : link.visual.opacity;

  if (link.type === "shared_tag") {
    return {
      color: view === "collective" ? "#42d6b3" : archiveVisualConfig.colors.tag,
      lineWidth: 0.7,
      opacity: collectiveOpacity,
      dashed: false,
    };
  }

  if (link.type === "interaction") {
    return {
      color: view === "collective" ? "#1f6fff" : archiveVisualConfig.colors.shared,
      lineWidth: view === "collective" ? 0.7 : 1,
      opacity: collectiveOpacity,
      dashed: false,
    };
  }

  if (link.type === "conflict_tag") {
    return {
      color: view === "collective" ? "#ff5c7a" : archiveVisualConfig.colors.conflict,
      lineWidth: view === "collective" ? 0.7 : 1,
      opacity: collectiveOpacity,
      dashed: true,
    };
  }

  return {
    color: archiveVisualConfig.colors.timeline,
    lineWidth: Math.max(0.35, link.visual.thickness),
    opacity: collectiveOpacity,
    dashed: link.visual.dash,
  };
}

export function getGraphRenderPolicy(view: ArchiveView): GraphRenderPolicy {
  if (view === "collective") {
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

export function shouldDisplayGraphLink(link: ArchiveGraphLink, view: ArchiveView, focusedNodeId: string | null, linkDensity: number): boolean {
  if (view === "collective") return getGraphLinkStyle(link, view, focusedNodeId).opacity > 0;
  return link.visual.opacity <= linkDensity + 0.4;
}

export function getNodeOpacityMultiplier(node: SearchableNode, query: string): number {
  if (!query) return 1;
  const normalizedQuery = query.toLowerCase();
  const matches =
    node.type === "submission" &&
    (node.id.toLowerCase().includes(normalizedQuery) ||
      Boolean(node.identity_name?.toLowerCase().includes(normalizedQuery)) ||
      node.visual.label.toLowerCase().includes(normalizedQuery));

  return matches ? 1 : 0.16;
}

export function getViewScopedGraphNodes(graph: ArchiveGraph, scope: StageScope): ArchiveGraphNode[] {
  if (scope.view === "collective") {
    return graph.nodes.filter(
      (node) => node.type === "submission" || node.type === "tag" || node.type === "collective",
    );
  }

  if (!scope.selectedIdentityId) return [];
  const selectedIdentityNode = graph.nodes.find((node) => node.id === scope.selectedIdentityId);
  const activeTags = new Set(selectedIdentityNode?.tag_labels ?? []);

  return graph.nodes.filter((node) => {
    if (node.type !== "tag") return false;
    return node.tag_labels.some((label) => activeTags.has(label));
  });
}

export function getViewScopedGraphLinks(
  graph: ArchiveGraph,
  scopedNodes: ArchiveGraphNode[],
  focusedNodeId: string | null,
  view: ArchiveView,
  linkDensity = 1,
): ArchiveGraphLink[] {
  const visibleIds = new Set<string>();
  for (const node of scopedNodes) {
    visibleIds.add(node.id);
  }

  return graph.links.filter((link) => {
    if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return false;
    if (view === "collective") return shouldRenderCollectiveGraphLink(link, focusedNodeId, linkDensity);
    return false;
  });
}

export function shouldShowIdentityBillboard(
  node: Pick<ArchiveGraphNode, "id" | "type">,
  context: { view: ArchiveView; focusedNodeId: string | null },
): boolean {
  return node.type === "submission" && context.view === "collective";
}

export function shouldShowTagLabel(
  node: Pick<ArchiveGraphNode, "id" | "type">,
  context: { view: ArchiveView; focusedNodeId: string | null },
): boolean {
  if (node.type !== "tag") return false;
  return context.view !== "collective" || context.focusedNodeId === node.id;
}

export function shouldSelectNodeOnCollectiveHover(
  node: Pick<ArchiveGraphNode, "type">,
  view: ArchiveView,
): boolean {
  return view !== "collective" && node.type !== "tag";
}

export function shouldCollectiveNodeClickLock(node: Pick<ArchiveGraphNode, "type">, view: ArchiveView): boolean {
  return view === "collective" && (node.type === "submission" || node.type === "tag" || node.type === "collective");
}

export function RelationshipGraph3D({ graph, opacity = 1 }: { graph: ArchiveGraph; opacity?: number }) {
  const {
    filters,
    previewIdentity,
    selectNode,
    selectedIdentityId,
    view,
    collectiveNavigation,
    updateCollectiveNavigation,
  } = useArchiveStore();
  const avatarShapePositions = useAvatarShapePositions();
  const query = filters.query.trim().toLowerCase();
  const focusedNodeId = collectiveNavigation.hoveredNodeId || collectiveNavigation.selectedIdentityId;
  const scopedNodes = useMemo(
    () => getViewScopedGraphNodes(graph, { view, selectedIdentityId }),
    [graph, selectedIdentityId, view],
  );
  const shapedNodes = useMemo(
    () => {
      if (view !== "collective") return scopedNodes;
      if (!avatarShapePositions || avatarShapePositions.length < 3) return [];

      const projectedNodeIndexById = new Map<string, { index: number; total: number }>();
      const projectedNodesByType: Record<(typeof PROJECTED_NODE_TYPES)[number], ArchiveGraphNode[]> = {
        submission: [],
        tag: [],
      };

      for (const node of scopedNodes) {
        if (node.type === "submission" || node.type === "tag") projectedNodesByType[node.type].push(node);
      }

      for (const nodeType of PROJECTED_NODE_TYPES) {
        const projectedNodes = projectedNodesByType[nodeType];
        projectedNodes.sort((left, right) => left.id.localeCompare(right.id));
        for (let index = 0; index < projectedNodes.length; index += 1) {
          const node = projectedNodes[index];
          projectedNodeIndexById.set(node.id, { index, total: projectedNodes.length });
        }
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
    [avatarShapePositions, scopedNodes, view],
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

  const visibleLinks = useMemo(
    () =>
      getViewScopedGraphLinks(graph, visibleNodes, focusedNodeId, view, filters.linkDensity).filter((link) =>
        shouldDisplayGraphLink(link, view, focusedNodeId, filters.linkDensity),
      ),
    [filters.linkDensity, focusedNodeId, graph, view, visibleNodes],
  );
  const graphRenderPolicy = getGraphRenderPolicy(view);
  const shouldRenderHtmlLabels = view !== "collective" || opacity >= LABEL_VISIBLE_OPACITY_THRESHOLD;

  return (
    <group frustumCulled={graphRenderPolicy.frustumCulled} renderOrder={graphRenderPolicy.renderOrder}>
      {visibleLinks.map((link) => {
        const source = nodeById.get(link.source);
        const target = nodeById.get(link.target);
        if (!source || !target) return null;
        const linkStyle = getGraphLinkStyle(link, view, focusedNodeId);

        return (
          <GraphLinkLine
            key={link.id}
            graphRenderPolicy={graphRenderPolicy}
            opacity={opacity}
            source={source}
            style={linkStyle}
            target={target}
          />
        );
      })}
      {visibleNodes.map((node) => (
        <GraphNodeSprite
          key={node.id}
          node={node}
          opacityMultiplier={getNodeOpacityMultiplier(node, query) * opacity}
          onPointerOver={() => {
            if (shouldSelectNodeOnCollectiveHover(node, view)) selectNode(node);
            updateCollectiveNavigation({
              hoveredNodeId: node.id,
              hoveredTagLabel: node.type === "tag" ? node.visual.label : null,
            });
          }}
          onPointerOut={() => {
            updateCollectiveNavigation({ hoveredNodeId: null, hoveredTagLabel: null });
          }}
          onClick={() => {
            if (view !== "collective") {
              selectNode(node);
              if (node.type === "submission") previewIdentity(node.id);
              return;
            }

            if (shouldCollectiveNodeClickLock(node, view)) {
              selectNode(node);
              updateCollectiveNavigation({ selectedIdentityId: node.id });
              if (node.type === "submission") previewIdentity(node.id);
            }
          }}
        />
      ))}
      {shouldRenderHtmlLabels
        ? visibleNodes.map((node) => (
            <IdentityBillboardLabel
              key={`${node.id}:label`}
              node={node}
              onClick={() => {
                if (!shouldCollectiveNodeClickLock(node, view)) return;
                selectNode(node);
                updateCollectiveNavigation({ selectedIdentityId: node.id });
                if (node.type === "submission") previewIdentity(node.id);
              }}
              opacity={opacity}
              visible={shouldShowIdentityBillboard(node, { view, focusedNodeId })}
            />
          ))
        : null}
      {shouldRenderHtmlLabels
        ? visibleNodes.map((node) =>
            shouldShowTagLabel(node, { view, focusedNodeId }) ? (
              <CollectiveHoverLabel key={`${node.id}:tag-label`} node={node} opacity={opacity} />
            ) : null,
          )
        : null}
    </group>
  );
}
