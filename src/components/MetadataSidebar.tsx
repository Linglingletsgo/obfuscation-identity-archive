import { useArchiveStore } from "../state/archiveStore";
import { AvatarImage } from "./AvatarImage";

export function MetadataSidebar() {
  const { selectedIdentityId, selectedNode, selectedTimelineItemId, stage } = useArchiveStore();
  if (stage === 5) return null;

  return (
    <aside className="metadata-sidebar" aria-label="Archive metadata">
      <h2>{selectedNode?.identity_name || selectedIdentityId || "Archive detail"}</h2>
      {selectedNode?.asset_path ? <AvatarImage src={selectedNode.asset_path} alt={selectedNode.visual.label} /> : null}
      <p>{selectedNode?.carried_fragment || "Select an archive node to inspect its carried fragment."}</p>
      <dl>
        <dt>Internal stage</dt>
        <dd>{stage}</dd>
        <dt>Timeline item</dt>
        <dd>{selectedTimelineItemId || "Anchor start"}</dd>
        <dt>Source ID</dt>
        <dd>{selectedIdentityId || "None selected"}</dd>
      </dl>
    </aside>
  );
}
