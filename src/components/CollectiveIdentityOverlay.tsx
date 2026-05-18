import { useMemo } from "react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraphNode } from "../types/archive";

export function CollectiveIdentityOverlay({ identities }: { identities: ArchiveGraphNode[] }) {
  const { enterIdentityDetail, view, collectiveNavigation } = useArchiveStore();
  const selectedIdentity = useMemo(
    () => identities.find((node) => node.id === collectiveNavigation.selectedIdentityId) ?? null,
    [identities, collectiveNavigation.selectedIdentityId],
  );

  if (view !== "collective" || !selectedIdentity) return null;

  return (
    <aside className="collective-identity-overlay" aria-label="Selected identity preview">
      <div>
        <strong>Name: {selectedIdentity.identity_name || selectedIdentity.id}</strong>
        {selectedIdentity.carried_fragment ? <p>{selectedIdentity.carried_fragment}</p> : null}
      </div>
      <button type="button" onClick={() => enterIdentityDetail(selectedIdentity.id)} aria-label="Enter individual">
        Enter Individual
      </button>
    </aside>
  );
}
