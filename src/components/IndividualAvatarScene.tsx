import { useMemo, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { AvatarImage } from "./AvatarImage";

type IndividualTagNode = {
  conflict: boolean;
  label: string;
  x: number;
  y: number;
};

type IndividualSceneState = {
  carriedFragment: string;
  conflictTagLabels: string[];
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

function getTagLabelFromNode(node: ArchiveGraphNode | undefined): string | null {
  if (!node) return null;
  return node.tag_labels[0] ?? node.visual.label ?? node.id.replace(/^tag:/, "");
}

function collectConflictTagLabels(graph: ArchiveGraph, selectedIdentityId: string): string[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const labels = new Set<string>();

  for (const link of graph.links) {
    if (link.type !== "conflict_tag") continue;
    if (link.source !== selectedIdentityId && link.target !== selectedIdentityId) continue;

    const tagNodeId = link.source === selectedIdentityId ? link.target : link.source;
    const label = getTagLabelFromNode(nodeById.get(tagNodeId));
    if (label) labels.add(label);
  }

  return [...labels].sort((left, right) => left.localeCompare(right));
}

function createIndividualTagNodes(tagLabels: string[], conflictTagLabels: string[]): IndividualTagNode[] {
  const conflictLabels = new Set(conflictTagLabels);
  return tagLabels.map((label, index) => {
    const angle = -132 + (264 / Math.max(1, tagLabels.length - 1)) * index;
    const radians = (angle * Math.PI) / 180;
    return {
      conflict: conflictLabels.has(label),
      label,
      x: 50 + Math.cos(radians) * 34,
      y: 50 + Math.sin(radians) * 36,
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
  const conflictTagLabels = collectConflictTagLabels(graph, selectedIdentityId);

  return {
    carriedFragment: selectedIdentityNode.carried_fragment ?? "",
    conflictTagLabels,
    id: selectedIdentityNode.id,
    label: selectedIdentityNode.identity_name ?? selectedIdentityNode.visual.label,
    assetSources: uniqueAssetSources(selectedIdentityNode.asset_path),
    tagLabels,
    tagNodes: createIndividualTagNodes(tagLabels, conflictTagLabels),
  };
}

function IndividualTagNodeItem({ node }: { node: IndividualTagNode }) {
  return (
    <li
      className={`stage-detail-tag-node${node.conflict ? " conflict" : ""}`}
      style={{ "--tag-x": `${node.x}%`, "--tag-y": `${node.y}%` } as CSSProperties}
      title={node.label}
    >
      <span aria-hidden="true" />
      <b>{node.label}</b>
    </li>
  );
}

function IndividualConflictLines({ nodes }: { nodes: IndividualTagNode[] }) {
  const conflictNodes = nodes.filter((node) => node.conflict);
  if (conflictNodes.length < 2) return null;

  return (
    <svg className="stage-detail-conflict-lines" viewBox="0 0 100 100" aria-hidden="true">
      {conflictNodes.slice(1).map((node, index) => {
        const previous = conflictNodes[index];
        return (
          <line
            key={`${previous.label}:${node.label}`}
            x1={previous.x}
            y1={previous.y}
            x2={node.x}
            y2={node.y}
          />
        );
      })}
    </svg>
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
        <IndividualConflictLines nodes={sceneState.tagNodes} />
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
