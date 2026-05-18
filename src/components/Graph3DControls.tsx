import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";

export function Graph3DControls() {
  const { filters, openCollective, setFilters, view } = useArchiveStore();
  if (view !== "collective") return null;

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
      <button type="button" className="icon-button" onClick={openCollective} aria-label="Return to collective">
        <RotateCcw size={18} />
      </button>
    </aside>
  );
}
