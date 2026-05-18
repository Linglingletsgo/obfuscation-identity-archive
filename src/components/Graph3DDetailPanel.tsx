import { useArchiveStore } from "../state/archiveStore";

export function Graph3DDetailPanel() {
  const { selectedNode, view } = useArchiveStore();
  if (view !== "collective" || !selectedNode || selectedNode.type === "tag") return null;

  return (
    <aside className="detail-panel" aria-label="Selected archive node">
      <h2>{selectedNode.visual.label}</h2>
      <dl>
        <dt>ID</dt>
        <dd>{selectedNode.id}</dd>
        <dt>Type</dt>
        <dd>{selectedNode.type}</dd>
        {selectedNode.stage !== undefined ? (
          <>
            <dt>Internal stage</dt>
            <dd>{selectedNode.stage}</dd>
          </>
        ) : null}
        {selectedNode.anchor_id ? (
          <>
            <dt>Anchor</dt>
            <dd>{selectedNode.anchor_id}</dd>
          </>
        ) : null}
        {selectedNode.carried_fragment ? (
          <>
            <dt>Fragment</dt>
            <dd>{selectedNode.carried_fragment}</dd>
          </>
        ) : null}
        <dt>Source IDs</dt>
        <dd>{selectedNode.source_ids.join(", ") || "None"}</dd>
        <dt>Tags</dt>
        <dd>{selectedNode.tag_labels.slice(0, 18).join(", ") || "None"}</dd>
        {selectedNode.asset_path ? (
          <>
            <dt>Asset</dt>
            <dd>{selectedNode.asset_path}</dd>
          </>
        ) : null}
        {selectedNode.model_path ? (
          <>
            <dt>Model</dt>
            <dd>{selectedNode.model_path}</dd>
          </>
        ) : null}
      </dl>
    </aside>
  );
}
