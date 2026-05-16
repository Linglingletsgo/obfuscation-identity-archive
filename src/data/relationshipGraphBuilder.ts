import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarAssetPath, getModelAssetPath } from "./archivePaths";
import { normalizeEvents } from "./eventNormalization";
import { withPosition } from "./layout3d";
import { applyStage5ForceLayout } from "./stage5ForceLayout";
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

function timelineId(id: string): string {
  return `timeline:${id}`;
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
    asset_path: getAvatarAssetPath({ stage: 0, submissionId: node.id }),
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
        stage: 5,
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

function createTimelineNode(item: TimelineItem): ArchiveGraphNode {
  const assetPath =
    item.stage <= 3
      ? getAvatarAssetPath({
          stage: item.stage,
          timelineItemId: item.timeline_item_id,
          submissionId: item.source_ids[0],
        })
      : undefined;
  const modelPath =
    item.stage >= 4 ? getModelAssetPath({ stage: item.stage, timelineItemId: item.timeline_item_id }) : undefined;

  return withPosition({
    id: timelineId(item.timeline_item_id),
    type: "timeline_item",
    stage: item.stage,
    anchor_id: item.anchor_id,
    source_ids: item.source_ids,
    identity_name: item.source_texts[0]?.identity_name,
    carried_fragment: item.source_texts[0]?.carried_fragment,
    tags: [],
    tag_labels: item.active_tags_preview ?? [],
    scores: item.scores ?? {},
    events: normalizeEvents(item.events, "timeline"),
    avatar_vector: item.avatar_vector,
    avatar_tags: item.avatar_tags,
    asset_path: assetPath,
    model_path: modelPath,
    visual: {
      size: archiveVisualConfig.graph.timelineNodeSize,
      color_group: "timeline",
      opacity: 0.72,
      label: item.stage_name || item.timeline_item_id,
      node_shape: "custom",
      node_style_key: `timeline-stage-${item.stage}`,
    },
  });
}

function createCollectiveNode(item: TimelineItem): ArchiveGraphNode {
  return withPosition({
    id: collectiveId(item.timeline_item_id),
    type: "collective",
    stage: 5,
    anchor_id: null,
    source_ids: item.source_ids,
    tags: [],
    tag_labels: [],
    scores: item.scores ?? {},
    events: normalizeEvents(item.events, "timeline"),
    avatar_vector: item.avatar_vector,
    avatar_tags: item.avatar_tags,
    model_path: getModelAssetPath({ stage: 5 }),
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

export function buildArchiveGraph(graph: SourceInteractionGraph, timeline: SourceTimeline): ArchiveGraph {
  const nodes: ArchiveGraphNode[] = [
    ...graph.nodes.map(createIdentityNode),
    ...createTagNodes(graph.nodes),
  ];
  const links: ArchiveGraphLink[] = [];
  const usedLinkIds = new Set<string>();
  const addGraphLink = (link: Omit<ArchiveGraphLink, "id">, suffix = "") =>
    addLink(links, usedLinkIds, link, suffix);
  const timelineItems = timeline.anchors.flatMap((anchor) => anchor.items);

  nodes.push(...timelineItems.map(createTimelineNode), createCollectiveNode(timeline.global_collective_item));

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

  for (const item of timelineItems) {
    for (const sourceId of item.source_ids) {
      addGraphLink({
        source: sourceId,
        target: timelineId(item.timeline_item_id),
        type: "source_membership",
        weight: 1,
        scores: item.scores ?? {},
        events: normalizeEvents(item.events, "timeline"),
        visual: { style_key: "source-membership", opacity: 0.34, thickness: 0.8, dash: false },
      });
    }

    if (item.anchor_id) {
      addGraphLink({
        source: item.anchor_id,
        target: timelineId(item.timeline_item_id),
        type: "anchor_membership",
        weight: 1,
        scores: item.scores ?? {},
        events: normalizeEvents(item.events, "timeline"),
        visual: { style_key: "anchor-membership", opacity: 0.44, thickness: 1, dash: false },
      });
    }
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

  return applyStage5ForceLayout({
    nodes,
    links: validLinks,
    metadata: {
      layout: "deterministic-avatar-map",
      seed: archiveVisualConfig.graph.seed,
      source_files: [archiveVisualConfig.data.interactionGraphPath, archiveVisualConfig.data.timelinePath],
      generated_at: new Date(0).toISOString(),
    },
  });
}
