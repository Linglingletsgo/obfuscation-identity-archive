import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { AvatarImage } from "./AvatarImage";
import { INDIVIDUAL_RETURN_PATH_KEY } from "./ArchiveIndexPage";
import { ensureGlobalInteractionListeners, getGlobalClientInteractionSnapshot } from "./InteractionContext";

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

const IndividualTagNodeItem = memo(function IndividualTagNodeItem({
  isActive,
  node,
  onActivate,
  onDeactivate,
}: {
  isActive: boolean;
  node: IndividualTagNode;
  onActivate: (label: string) => void;
  onDeactivate: () => void;
}) {
  return (
    <li
      className={`stage-detail-tag-node${isActive ? " is-active" : ""}`}
      data-individual-tag-label={node.label}
      style={{ "--tag-x": `${node.x}%`, "--tag-y": `${node.y}%`, "--tag-delay": `${node.x * -0.027}s` } as CSSProperties}
      title={node.label}
      onPointerEnter={() => onActivate(node.label)}
      onPointerMove={() => onActivate(node.label)}
      onPointerLeave={onDeactivate}
      onMouseEnter={() => onActivate(node.label)}
      onMouseLeave={onDeactivate}
    >
      <span aria-hidden="true" />
      <b>{node.label}</b>
    </li>
  );
});

function IndividualDetailSidebar({
  activeTagLabel,
  onActivateTag,
  onDeactivateTag,
  sceneState,
}: {
  activeTagLabel: string | null;
  onActivateTag: (label: string) => void;
  onDeactivateTag: () => void;
  sceneState: IndividualSceneState;
}) {
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
            <li
              className={label === activeTagLabel ? "is-active" : undefined}
              data-individual-tag-label={label}
              key={label}
              onPointerEnter={() => onActivateTag(label)}
              onPointerMove={() => onActivateTag(label)}
              onPointerLeave={onDeactivateTag}
              onMouseEnter={() => onActivateTag(label)}
              onMouseLeave={onDeactivateTag}
            >
              {label}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

export function IndividualAvatarScene() {
  const { graph, openCollective, selectedIdentityId, view } = useArchiveStore();
  const [activeTagLabel, setActiveTagLabel] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState<string | null>(() => {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(INDIVIDUAL_RETURN_PATH_KEY);
  });
  const sceneState = useMemo(
    () => (view === "individual" ? getIndividualSceneState(graph, selectedIdentityId) : null),
    [graph, selectedIdentityId, view],
  );
  const tagLabelSet = useMemo(() => new Set(sceneState?.tagLabels ?? []), [sceneState?.tagLabels]);
  const activateTag = useCallback((label: string) => setActiveTagLabel(label), []);
  const deactivateTag = useCallback(() => setActiveTagLabel(null), []);
  const returnFromIndividual = useCallback(() => {
    const nextReturnPath = window.sessionStorage.getItem(INDIVIDUAL_RETURN_PATH_KEY);
    window.sessionStorage.removeItem(INDIVIDUAL_RETURN_PATH_KEY);
    setReturnPath(null);
    openCollective();

    if (nextReturnPath === "/index") {
      window.history.pushState(null, "", nextReturnPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [openCollective]);

  useEffect(() => {
    if (view !== "individual") return;
    setReturnPath(window.sessionStorage.getItem(INDIVIDUAL_RETURN_PATH_KEY));
  }, [selectedIdentityId, view]);

  useEffect(() => {
    if (!sceneState) return undefined;
    ensureGlobalInteractionListeners();

    let frameId = 0;
    let lastHoverLabel: string | null = null;

    function findHoveredTagLabel(clientX: number, clientY: number): string | null {
      let nextHoverLabel: string | null = null;
      if (clientX >= 0 && clientY >= 0 && clientX <= window.innerWidth && clientY <= window.innerHeight) {
        const element = document.elementFromPoint(clientX, clientY);
        const tagElement = element instanceof Element ? element.closest<HTMLElement>("[data-individual-tag-label]") : null;
        const label = tagElement?.dataset.individualTagLabel ?? null;
        nextHoverLabel = label && tagLabelSet.has(label) ? label : null;
      }
      return nextHoverLabel;
    }

    function setHoveredLabel(nextHoverLabel: string | null) {
      if (nextHoverLabel !== lastHoverLabel) {
        lastHoverLabel = nextHoverLabel;
        setActiveTagLabel(nextHoverLabel);
      }
    }

    function syncHoveredTagFromPointer() {
      const pointer = getGlobalClientInteractionSnapshot();
      setHoveredLabel(pointer.hasPointer ? findHoveredTagLabel(pointer.clientX, pointer.clientY) : null);

      frameId = window.requestAnimationFrame(syncHoveredTagFromPointer);
    }

    function syncHoveredTagFromEvent(event: PointerEvent | MouseEvent) {
      setHoveredLabel(findHoveredTagLabel(event.clientX, event.clientY));
    }

    frameId = window.requestAnimationFrame(syncHoveredTagFromPointer);
    const options = { capture: true, passive: true } as const;
    window.addEventListener("pointermove", syncHoveredTagFromEvent, options);
    document.addEventListener("pointermove", syncHoveredTagFromEvent, options);
    window.addEventListener("mousemove", syncHoveredTagFromEvent, options);
    document.addEventListener("mousemove", syncHoveredTagFromEvent, options);
    window.addEventListener("pointerup", syncHoveredTagFromEvent, options);
    document.addEventListener("pointerup", syncHoveredTagFromEvent, options);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", syncHoveredTagFromEvent, options);
      document.removeEventListener("pointermove", syncHoveredTagFromEvent, options);
      window.removeEventListener("mousemove", syncHoveredTagFromEvent, options);
      document.removeEventListener("mousemove", syncHoveredTagFromEvent, options);
      window.removeEventListener("pointerup", syncHoveredTagFromEvent, options);
      document.removeEventListener("pointerup", syncHoveredTagFromEvent, options);
    };
  }, [sceneState, tagLabelSet]);

  if (!sceneState) return null;

  const backTargetLabel = returnPath === "/index" ? "Index" : "Collective";
  const backTargetDescription = returnPath === "/index" ? "index database" : "collective";

  return (
    <section className="individual-avatar-scene" aria-label="Individual avatar scene">
      <button
        type="button"
        className="individual-back-button"
        onClick={returnFromIndividual}
        aria-label={`Return to ${backTargetDescription}`}
      >
        <RotateCcw size={18} />
        <span>{backTargetLabel}</span>
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
            <IndividualTagNodeItem
              isActive={node.label === activeTagLabel}
              key={node.label}
              node={node}
              onActivate={activateTag}
              onDeactivate={deactivateTag}
            />
          ))}
        </ol>
      </div>
      <IndividualDetailSidebar
        activeTagLabel={activeTagLabel}
        onActivateTag={activateTag}
        onDeactivateTag={deactivateTag}
        sceneState={sceneState}
      />
    </section>
  );
}
