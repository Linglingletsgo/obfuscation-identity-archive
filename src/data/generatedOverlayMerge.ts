import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { withPosition } from "./layout3d";
import type { GeneratedOverlayGraph, GeneratedOverlayNode } from "./generatedOverlay";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";

function tagId(label: string): string {
  return `tag:${label}`;
}

function labelsForExistingTags(node: GeneratedOverlayNode, existingTagLabels: Set<string>): string[] {
  return [...new Set(node.tags.map((tag) => tag.label).filter((label) => existingTagLabels.has(label)))]
    .sort((a, b) => a.localeCompare(b));
}

function toArchiveNode(node: GeneratedOverlayNode, existingTagLabels: Set<string>): ArchiveGraphNode {
  const tagLabels = labelsForExistingTags(node, existingTagLabels);
  return withPosition({
    id: node.id,
    type: "submission",
    stage: 0,
    source_ids: [node.id],
    identity_name: node.label || node.id,
    carried_fragment: node.carried_fragment,
    tags: node.tags.filter((tag) => tagLabels.includes(tag.label)),
    tag_labels: tagLabels,
    scores: {},
    events: [],
    asset_path: node.asset_path,
    source_group: "generated",
    visual: {
      size: archiveVisualConfig.graph.identityNodeSize,
      color_group: "identity",
      opacity: 1,
      label: `Name: ${node.label || node.id}\n${node.carried_fragment}`.trim(),
      node_shape: "mark",
      node_style_key: "identity-center",
    },
  });
}

function sharedTagLinks(node: ArchiveGraphNode): ArchiveGraphLink[] {
  return node.tag_labels.map((label) => ({
    id: `generated_shared_tag:${node.id}->${tagId(label)}`,
    source: node.id,
    target: tagId(label),
    type: "shared_tag",
    weight: 1,
    scores: {},
    events: [],
    visual: { style_key: "shared-tag", opacity: 0.28, thickness: 0.6, dash: false },
  }));
}

export function mergeGeneratedOverlay(baseGraph: ArchiveGraph, overlay: GeneratedOverlayGraph): ArchiveGraph {
  if (overlay.nodes.length === 0 && overlay.edges.length === 0) {
    return baseGraph;
  }

  const existingIds = new Set(baseGraph.nodes.map((node) => node.id));
  const existingTagLabels = new Set(
    baseGraph.nodes
      .filter((node) => node.type === "tag")
      .flatMap((node) => node.tag_labels),
  );

  const generatedNodes = overlay.nodes
    .filter((node) => !existingIds.has(node.id))
    .map((node) => toArchiveNode(node, existingTagLabels));

  const generatedNodeIds = new Set(generatedNodes.map((node) => node.id));
  const validIds = new Set([...existingIds, ...generatedNodeIds]);
  const generatedLinks: ArchiveGraphLink[] = [
    ...generatedNodes.flatMap(sharedTagLinks),
    ...overlay.edges
      .filter((edge) => validIds.has(edge.source) && validIds.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "interaction" as const,
        weight: edge.weight,
        scores: { total: edge.weight },
        events: [],
        visual: { style_key: "interaction", opacity: 0.5, thickness: 1.2, dash: false },
      })),
  ];

  const usedLinkIds = new Set(baseGraph.links.map((link) => link.id));
  const uniqueGeneratedLinks = generatedLinks.filter((link) => {
    if (usedLinkIds.has(link.id)) return false;
    usedLinkIds.add(link.id);
    return true;
  });

  return {
    ...baseGraph,
    nodes: [...baseGraph.nodes, ...generatedNodes],
    links: [...baseGraph.links, ...uniqueGeneratedLinks],
    metadata: {
      ...baseGraph.metadata,
      generated_overlay_at: overlay.generated_at,
    },
  };
}
