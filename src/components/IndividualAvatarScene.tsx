import { useMemo, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { AvatarImage } from "./AvatarImage";

type IndividualSceneState = {
  carriedFragment: string;
  id: string;
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
    carriedFragment: selectedIdentityNode.carried_fragment ?? "",
    id: selectedIdentityNode.id,
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

function IndividualDetailSidebar({ sceneState }: { sceneState: IndividualSceneState }) {
  return (
    <aside className="individual-detail-sidebar" aria-label="Individual details">
      <header>
        <span>Individual One</span>
        <h2>{sceneState.label}</h2>
        {sceneState.carriedFragment ? <p>{sceneState.carriedFragment}</p> : null}
      </header>
      <dl>
        <dt>ID</dt>
        <dd>{sceneState.id}</dd>
      </dl>
      <section>
        <h3>Tags</h3>
        <ul>
          {sceneState.tagLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

export function IndividualAvatarScene() {
  const { graph, openCollective, selectedIdentityId, view } = useArchiveStore();
  const sceneState = useMemo(
    () => (view === "individual" ? getIndividualSceneState(graph, selectedIdentityId) : null),
    [graph, selectedIdentityId, view],
  );

  if (!sceneState) return null;

  return (
    <section className="individual-avatar-scene" aria-label="Individual avatar scene">
      <button
        type="button"
        className="individual-back-button"
        onClick={openCollective}
        aria-label="Return to collective"
      >
        <RotateCcw size={18} />
        <span>Collective</span>
      </button>
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
      <IndividualDetailSidebar sceneState={sceneState} />
    </section>
  );
}
