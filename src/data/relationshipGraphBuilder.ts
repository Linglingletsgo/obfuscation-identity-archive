import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarAssetPath, getCollectiveModelAssetPath } from "./archivePaths";
import { normalizeEvents } from "./eventNormalization";
import { withPosition } from "./layout3d";
import type {
  ArchiveGraph,
  ArchiveGraphLink,
  ArchiveGraphNode,
  SourceGraphNode,
  SourceGraphTag,
  SourceInteractionGraph,
  SourceTimeline,
  TimelineItem,
} from "../types/archive";

function tagId(label: string): string {
  return `tag:${label}`;
}

function collectiveId(id: string): string {
  return `collective:${id}`;
}

function linkId(source: string, target: string, type: string, suffix = ""): string {
  return `${type}:${source}->${target}${suffix ? `:${suffix}` : ""}`;
}

function uniqueLabels(tags: SourceGraphTag[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.label).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function identityLabel(node: SourceGraphNode): string {
  return `Name: ${node.label || node.id}\n${node.text_fragments?.carriedFragment || ""}`.trim();
}

function createIdentityNode(node: SourceGraphNode): ArchiveGraphNode {
  return withPosition({
    id: node.id,
    type: "submission",
    stage: 0,
    source_ids: [node.id],
    identity_name: node.label || node.id,
    carried_fragment: node.text_fragments?.carriedFragment || "",
    tags: node.tags ?? [],
    tag_labels: uniqueLabels(node.tags),
    scores: {},
    events: [],
    asset_path: getAvatarAssetPath({ submissionId: node.id }),
    visual: {
      size: archiveVisualConfig.graph.identityNodeSize,
      color_group: "identity",
      opacity: 1,
      label: identityLabel(node),
      node_shape: "mark",
      node_style_key: "identity-center",
    },
  });
}

function createTagNodes(sourceNodes: SourceGraphNode[]): ArchiveGraphNode[] {
  const byLabel = new Map<string, SourceGraphTag[]>();

  for (const node of sourceNodes) {
    for (const tag of node.tags ?? []) {
      byLabel.set(tag.label, [...(byLabel.get(tag.label) ?? []), tag]);
    }
  }

  return [...byLabel.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, tags]) =>
      withPosition({
        id: tagId(label),
        type: "tag",
        stage: 2,
        source_ids: [],
        tags,
        tag_labels: [label],
        scores: {},
        events: [],
        visual: {
          size: archiveVisualConfig.graph.tagNodeSize,
          color_group: "tag",
          opacity: 0.78,
          label,
          node_shape: "particle",
          node_style_key: "tag-node",
        },
      }),
    );
}

function createCollectiveNode(item: TimelineItem): ArchiveGraphNode {
  return withPosition({
    id: collectiveId(item.timeline_item_id),
    type: "collective",
    stage: 2,
    anchor_id: null,
    source_ids: item.source_ids,
    tags: [],
    tag_labels: [],
    scores: item.scores ?? {},
    events: normalizeEvents(item.events, "timeline"),
    avatar_vector: item.avatar_vector,
    avatar_tags: item.avatar_tags,
    model_path: getCollectiveModelAssetPath(),
    visual: {
      size: archiveVisualConfig.graph.collectiveNodeSize,
      color_group: "collective",
      opacity: 0.52,
      label: "Collective Absorption",
      node_shape: "particle",
      node_style_key: "collective-avatar-map",
    },
  });
}

function reserveLinkId(usedLinkIds: Set<string>, link: Omit<ArchiveGraphLink, "id">, suffix = ""): string {
  const baseId = linkId(link.source, link.target, link.type, suffix);
  let id = baseId;
  let duplicateIndex = 1;

  while (usedLinkIds.has(id)) {
    id = `${baseId}:duplicate-${duplicateIndex}`;
    duplicateIndex += 1;
  }

  usedLinkIds.add(id);
  return id;
}

function addLink(
  links: ArchiveGraphLink[],
  usedLinkIds: Set<string>,
  link: Omit<ArchiveGraphLink, "id">,
  suffix = "",
): void {
  links.push({ id: reserveLinkId(usedLinkIds, link, suffix), ...link });
}

function usesCollectiveModelProjection(node: ArchiveGraphNode): boolean {
  return node.type === "submission" || node.type === "tag" || node.type === "collective";
}

function withCollectiveModelProjectionPlaceholders(nodes: ArchiveGraphNode[]): ArchiveGraphNode[] {
  return nodes.map((node) =>
    usesCollectiveModelProjection(node)
      ? {
          ...node,
          position: { x: 0, y: 0, z: 0 },
        }
      : node,
  );
}

export function buildArchiveGraph(graph: SourceInteractionGraph, timeline: SourceTimeline): ArchiveGraph {
  const nodes: ArchiveGraphNode[] = [
    ...graph.nodes.map(createIdentityNode),
    ...createTagNodes(graph.nodes),
  ];
  const links: ArchiveGraphLink[] = [];
  const usedLinkIds = new Set<string>();
  const addGraphLink = (link: Omit<ArchiveGraphLink, "id">, suffix = "") =>
    addLink(links, usedLinkIds, link, suffix);
  nodes.push(createCollectiveNode(timeline.global_collective_item));

  for (const sourceNode of graph.nodes) {
    for (const label of uniqueLabels(sourceNode.tags)) {
      addGraphLink({
        source: sourceNode.id,
        target: tagId(label),
        type: "shared_tag",
        weight: 1,
        scores: {},
        events: [],
        visual: { style_key: "shared-tag", opacity: 0.28, thickness: 0.6, dash: false },
      });
    }
  }

  for (const edge of graph.edges) {
    addGraphLink({
      source: edge.source,
      target: edge.target,
      type: "interaction",
      weight: edge.scores?.total ?? 1,
      scores: edge.scores ?? {},
      events: normalizeEvents(edge.events, "graph"),
      visual: { style_key: "interaction", opacity: 0.5, thickness: 1.2, dash: false },
    });

    edge.evidence?.conflictPairs?.forEach((pair, pairIndex) => {
      for (const label of pair) {
        addGraphLink(
          {
            source: edge.source,
            target: tagId(label),
            type: "conflict_tag",
            weight: edge.scores?.conflict ?? 1,
            scores: edge.scores ?? {},
            events: normalizeEvents(edge.events, "graph"),
            visual: { style_key: "conflict-glitch", opacity: 0.72, thickness: 1, dash: true },
          },
          `${pairIndex}-${label}`,
        );
      }
    });
  }

  for (const sourceId of timeline.global_collective_item.source_ids) {
    addGraphLink({
      source: sourceId,
      target: collectiveId(timeline.global_collective_item.timeline_item_id),
      type: "source_membership",
      weight: 1,
      scores: timeline.global_collective_item.scores ?? {},
      events: normalizeEvents(timeline.global_collective_item.events, "timeline"),
      visual: { style_key: "collective-membership", opacity: 0.3, thickness: 0.7, dash: false },
    });
  }

  const validIds = new Set(nodes.map((node) => node.id));
  const validLinks = links.filter((link) => validIds.has(link.source) && validIds.has(link.target));

  return {
    nodes: withCollectiveModelProjectionPlaceholders(nodes),
    links: validLinks,
    metadata: {
      layout: "stage2-model-sampled-avatar-map",
      seed: archiveVisualConfig.graph.seed,
      source_files: [archiveVisualConfig.data.interactionGraphPath, archiveVisualConfig.data.timelinePath],
      generated_at: new Date(0).toISOString(),
    },
  };
}
