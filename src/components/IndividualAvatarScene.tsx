import { useMemo, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { AvatarImage } from "./AvatarImage";

type IndividualTagNode = {
  label: string;
  x: number;
  y: number;
};

type IndividualSceneState = {
  carriedFragment: string;
  id: string;
  label: string;
  assetSources: string[];
  tagNodes: IndividualTagNode[];
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

function createIndividualTagNodes(tagLabels: string[]): IndividualTagNode[] {
  return tagLabels.map((label, index) => {
    const ring = index % 2;
    const angle = -120 + (300 / Math.max(1, tagLabels.length - 1)) * index + ring * 4;
    const radians = (angle * Math.PI) / 180;
    const radiusX = ring === 0 ? 30 : 39;
    const radiusY = ring === 0 ? 31 : 40;
    return {
      label,
      x: 50 + Math.cos(radians) * radiusX,
      y: 50 + Math.sin(radians) * radiusY,
    };
  });
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
  const tagLabels = collectTagLabels(selectedIdentityNode);

  return {
    carriedFragment: selectedIdentityNode.carried_fragment ?? "",
    id: selectedIdentityNode.id,
    label: selectedIdentityNode.identity_name ?? selectedIdentityNode.visual.label,
    assetSources: uniqueAssetSources(selectedIdentityNode.asset_path),
    tagLabels,
    tagNodes: createIndividualTagNodes(tagLabels),
  };
}

function IndividualTagNodeItem({ node }: { node: IndividualTagNode }) {
  return (
    <li
      className="stage-detail-tag-node"
      style={{ "--tag-x": `${node.x}%`, "--tag-y": `${node.y}%`, "--tag-delay": `${node.x * -0.027}s` } as CSSProperties}
      title={node.label}
      tabIndex={0}
    >
      <span aria-hidden="true" />
      <b>{node.label}</b>
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
      <div className="individual-avatar-stage">
        <div className="stage-detail-avatar-visual">
          {sceneState.assetSources.length > 0 ? (
            <AvatarImage src={sceneState.assetSources} alt={sceneState.label} />
          ) : (
            <div className="stage-detail-model-visual" role="img" aria-label={sceneState.label} />
          )}
        </div>
        <ol className="stage-detail-tags" aria-label="Active avatar tags">
          {sceneState.tagNodes.map((node) => (
            <IndividualTagNodeItem key={node.label} node={node} />
          ))}
        </ol>
      </div>
      <IndividualDetailSidebar sceneState={sceneState} />
    </section>
  );
}
