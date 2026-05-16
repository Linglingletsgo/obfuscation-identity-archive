import { useMemo } from "react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraphNode } from "../types/archive";

export function Stage5IdentityOverlay({ identities }: { identities: ArchiveGraphNode[] }) {
  const { enterIdentityDetail, stage, stage5Navigation } = useArchiveStore();
  const selectedIdentity = useMemo(
    () => identities.find((node) => node.id === stage5Navigation.selectedIdentityId) ?? null,
    [identities, stage5Navigation.selectedIdentityId],
  );

  if (stage !== 5 || !selectedIdentity) return null;

  return (
    <aside className="stage5-identity-overlay" aria-label="Selected identity preview">
      <div>
        <strong>Name: {selectedIdentity.identity_name || selectedIdentity.id}</strong>
        {selectedIdentity.carried_fragment ? <p>{selectedIdentity.carried_fragment}</p> : null}
        <small>{selectedIdentity.tag_labels.slice(0, 6).join(", ")}</small>
      </div>
      <button type="button" onClick={() => enterIdentityDetail(selectedIdentity.id)} aria-label="Enter detail">
        Enter detail
      </button>
    </aside>
  );
}
