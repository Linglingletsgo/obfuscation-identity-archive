import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";

function normalizeSearchText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function matchesSubmissionSearch(node: ArchiveGraphNode, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery || node.type !== "submission") return false;
  return [node.id, node.identity_name, node.visual.label]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

export function findSubmissionSearchMatch(
  graph: ArchiveGraph | null,
  query: string,
): ArchiveGraphNode | null {
  if (!graph) return null;
  return graph.nodes.find((node) => matchesSubmissionSearch(node, query)) ?? null;
}

export function Graph3DControls() {
  const { filters, graph, openCollective, selectNode, setFilters, updateCollectiveNavigation, view } = useArchiveStore();
  if (view !== "collective") return null;

  function handleSearchChange(nextQuery: string) {
    setFilters({ query: nextQuery });
    const matchedSubmission = findSubmissionSearchMatch(graph, nextQuery);
    if (!matchedSubmission) return;
    selectNode(matchedSubmission);
    updateCollectiveNavigation({ selectedIdentityId: matchedSubmission.id });
  }

  return (
    <aside className="graph-controls" aria-label="Archive graph controls">
      <label>
        <span className="sr-only">Search archive</span>
        <input
          aria-label="Search archive"
          value={filters.query}
          placeholder="Search submission id or name"
          onChange={(event) => handleSearchChange(event.currentTarget.value)}
        />
      </label>
      <button type="button" className="icon-button" onClick={openCollective} aria-label="Return to collective">
        <RotateCcw size={18} />
      </button>
    </aside>
  );
}
