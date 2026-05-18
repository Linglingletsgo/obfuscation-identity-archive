import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";

export function Graph3DControls() {
  const { filters, openCollective, setFilters, stage } = useArchiveStore();
  if (stage !== 2) return null;

  return (
    <aside className="graph-controls" aria-label="Archive graph controls">
      <label>
        <span className="sr-only">Search archive</span>
        <input
          aria-label="Search archive"
          value={filters.query}
          placeholder="Search identities, fragments, tags"
          onChange={(event) => setFilters({ query: event.currentTarget.value })}
        />
      </label>
      <label className="inline-toggle">
        <input
          type="checkbox"
          checked={filters.showIsolated}
          onChange={(event) => setFilters({ showIsolated: event.currentTarget.checked })}
        />
        <span>Isolated</span>
      </label>
      <button type="button" className="icon-button" onClick={openCollective} aria-label="Return to collective">
        <RotateCcw size={18} />
      </button>
    </aside>
  );
}
