import { useMemo, type CSSProperties } from "react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { AvatarImage } from "./AvatarImage";

type IndividualSceneState = {
  label: string;
  assetSources: string[];
  tagLabels: string[];
};

function collectTagLabels(node: ArchiveGraphNode | undefined): string[] {
  const labels = new Set(node?.tag_labels ?? []);
  for (const values of Object.values(node?.avatar_tags ?? {})) {
    for (const label of values) labels.add(label);
  }
  return [...labels].sort((left, right) => left.localeCompare(right));
}

function uniqueAssetSources(...sources: Array<string | undefined>): string[] {
  return [...new Set(sources.filter((source): source is string => Boolean(source)))];
}

export function getIndividualSceneState(
  graph: ArchiveGraph | null,
  selectedIdentityId: string | null,
): IndividualSceneState | null {
  if (!graph || !selectedIdentityId) return null;

  const selectedIdentityNode = graph.nodes.find(
    (node) => node.id === selectedIdentityId && node.type === "submission",
  );
  if (!selectedIdentityNode) return null;

  return {
    label: selectedIdentityNode.identity_name ?? selectedIdentityNode.visual.label,
    assetSources: uniqueAssetSources(selectedIdentityNode.asset_path),
    tagLabels: collectTagLabels(selectedIdentityNode),
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

export function IndividualAvatarScene() {
  const { graph, selectedIdentityId, view } = useArchiveStore();
  const sceneState = useMemo(
    () => (view === "individual" ? getIndividualSceneState(graph, selectedIdentityId) : null),
    [graph, selectedIdentityId, view],
  );

  if (!sceneState) return null;

  return (
    <section className="individual-avatar-scene" aria-label="Individual avatar scene">
      <div className="stage-detail-avatar-visual">
        {sceneState.assetSources.length > 0 ? (
          <AvatarImage src={sceneState.assetSources} alt={sceneState.label} />
        ) : (
          <div className="stage-detail-model-visual" role="img" aria-label={sceneState.label} />
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
