import { useMemo, type CSSProperties } from "react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode, ArchiveStage } from "../types/archive";
import { AvatarImage } from "./AvatarImage";

type DetailSceneScope = {
  stage: ArchiveStage;
  selectedIdentityId: string | null;
  selectedTimelineItemId: string | null;
};

type StageDetailSceneState = {
  visualType: "avatar" | "blank";
  label: string;
  assetPath?: string;
  assetSources: string[];
  modelPath?: string;
  tagLabels: string[];
};

function timelineNodeMatchesSelection(node: ArchiveGraphNode, scope: DetailSceneScope): boolean {
  if (node.type !== "timeline_item" || node.stage !== scope.stage) return false;
  if (!scope.selectedIdentityId || !node.source_ids.includes(scope.selectedIdentityId)) return false;
  if (!scope.selectedTimelineItemId) return true;
  return node.id === `timeline:${scope.selectedTimelineItemId}` || node.id === scope.selectedTimelineItemId;
}

function collectTagLabels(node: ArchiveGraphNode | undefined): string[] {
  const labels = new Set(node?.tag_labels ?? []);
  for (const values of Object.values(node?.avatar_tags ?? {})) {
    for (const label of values) labels.add(label);
  }
  return [...labels].sort((left, right) => left.localeCompare(right));
}

function getSelectedTimelineNode(graph: ArchiveGraph, scope: DetailSceneScope): ArchiveGraphNode | undefined {
  return (
    graph.nodes.find((node) => timelineNodeMatchesSelection(node, scope)) ??
    graph.nodes.find(
      (node) =>
        node.type === "timeline_item" &&
        node.stage === scope.stage &&
        node.source_ids.includes(scope.selectedIdentityId ?? ""),
    )
  );
}

function uniqueAssetSources(...sources: Array<string | undefined>): string[] {
  return [...new Set(sources.filter((source): source is string => Boolean(source)))];
}

export function getStageDetailSceneState(
  graph: ArchiveGraph | null,
  scope: DetailSceneScope,
): StageDetailSceneState | null {
  if (!graph || scope.stage === 2 || !scope.selectedIdentityId) return null;

  const selectedTimelineNode = getSelectedTimelineNode(graph, scope);
  const selectedIdentityNode = graph.nodes.find((node) => node.id === scope.selectedIdentityId);
  const visualNode = selectedTimelineNode ?? selectedIdentityNode;
  if (!visualNode) return null;

  const tagLabels = collectTagLabels(selectedTimelineNode);
  const label = visualNode.identity_name ?? visualNode.visual.label;
  const assetSources = uniqueAssetSources(visualNode.asset_path, selectedIdentityNode?.asset_path);

  if (scope.stage === 1) {
    return {
      visualType: "blank",
      label,
      assetSources: [],
      tagLabels,
    };
  }

  return {
    visualType: "avatar",
    label,
    assetPath: assetSources[0],
    assetSources,
    tagLabels,
  };
}

function TagCallout({ index, label, total }: { index: number; label: string; total: number }) {
  const angle = -135 + (270 / Math.max(1, total - 1)) * index;
  const radians = (angle * Math.PI) / 180;
  const x = 50 + Math.cos(radians) * 34;
  const y = 50 + Math.sin(radians) * 36;
  const side = Math.cos(radians) < 0 ? "left" : "right";

  return (
    <li
      className={`stage-detail-tag ${side}`}
      style={{ "--tag-x": `${x}%`, "--tag-y": `${y}%` } as CSSProperties}
      title={label}
    >
      <span aria-hidden="true" />
      <b>{label}</b>
    </li>
  );
}

export function StageDetailAvatarScene() {
  const { graph, selectedIdentityId, selectedTimelineItemId, stage } = useArchiveStore();
  const sceneState = useMemo(
    () => getStageDetailSceneState(graph, { stage, selectedIdentityId, selectedTimelineItemId }),
    [graph, selectedIdentityId, selectedTimelineItemId, stage],
  );

  if (!sceneState) return null;

  return (
    <section className="stage-detail-avatar-scene" aria-label="Timeline avatar scene">
      <div className="stage-detail-avatar-visual">
        {sceneState.visualType === "blank" ? (
          <div className="stage-detail-empty-visual" aria-label={`${sceneState.label} cluster body placeholder`} />
        ) : sceneState.assetSources.length > 0 ? (
          <AvatarImage src={sceneState.assetSources} alt={sceneState.label} />
        ) : (
          <div
            className="stage-detail-model-visual"
            role="img"
            aria-label={sceneState.label}
            data-model-path={sceneState.modelPath ?? ""}
          />
        )}
      </div>
      <ol className="stage-detail-tags" aria-label="Active avatar tags">
        {sceneState.tagLabels.map((label, index) => (
          <TagCallout key={label} index={index} label={label} total={sceneState.tagLabels.length} />
        ))}
      </ol>
    </section>
  );
}
