import { memo, useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { useArchiveData } from "../data/useArchiveData";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraphNode } from "../types/archive";

const EMPTY_NODES: ArchiveGraphNode[] = [];
const MAX_VISIBLE_TAGS = 8;
export const INDIVIDUAL_RETURN_PATH_KEY = "obfuscation-identity-return-path";

type IdentityIndexRow = {
  carriedFragment: string;
  id: string;
  name: string;
  normalizedSearchText: string;
  tagCount: number;
  tagPreview: string;
};

function normalize(value: string | undefined): string {
  return value?.toLowerCase().trim() ?? "";
}

function createIdentityIndexRows(nodes: ArchiveGraphNode[]): IdentityIndexRow[] {
  const rows: IdentityIndexRow[] = [];

  for (const node of nodes) {
    if (node.type !== "submission") continue;

    const name = node.identity_name ?? node.visual.label;
    const carriedFragment = node.carried_fragment ?? "";
    const tagPreview = node.tag_labels.slice(0, MAX_VISIBLE_TAGS).join(", ");
    rows.push({
      carriedFragment,
      id: node.id,
      name,
      normalizedSearchText: normalize([node.id, name, carriedFragment, ...node.tag_labels].join(" ")),
      tagCount: node.tag_labels.length,
      tagPreview,
    });
  }

  rows.sort((left, right) => left.name.localeCompare(right.name));
  return rows;
}

function getVisibleIdentityRows(rows: IdentityIndexRow[], query: string): IdentityIndexRow[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return rows;
  return rows.filter((row) => row.normalizedSearchText.includes(normalizedQuery));
}

const IdentityIndexTableRow = memo(function IdentityIndexTableRow({
  node,
  onOpen,
}: {
  node: IdentityIndexRow;
  onOpen: (identityId: string) => void;
}) {
  const openCurrentIdentity = useCallback(() => {
    onOpen(node.id);
  }, [node.id, onOpen]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === "Enter" || event.key === " ") openCurrentIdentity();
  }, [openCurrentIdentity]);

  return (
    <tr
      onClick={openCurrentIdentity}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <td>{node.id}</td>
      <td>{node.name}</td>
      <td>{node.carriedFragment}</td>
      <td>{node.tagPreview}</td>
      <td>{node.tagCount}</td>
    </tr>
  );
});

export function ArchiveIndexPage() {
  const { message, status } = useArchiveData();
  const { enterIdentityDetail, graph } = useArchiveStore();
  const [query, setQuery] = useState("");
  const identityRows = useMemo(() => createIdentityIndexRows(graph?.nodes ?? EMPTY_NODES), [graph]);
  const rows = useMemo(() => getVisibleIdentityRows(identityRows, query), [identityRows, query]);

  const openIdentity = useCallback((identityId: string) => {
    window.sessionStorage.setItem(INDIVIDUAL_RETURN_PATH_KEY, "/index");
    enterIdentityDetail(identityId);
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [enterIdentityDetail]);

  if (status === "loading") return <section className="archive-index-page">{message}</section>;
  if (status === "error") return <section className="archive-index-page" role="alert">{message}</section>;

  return (
    <section className="archive-index-page" aria-label="Archive index database">
      <header>
        <a href="/" className="index-back-link">Collective Space</a>
        <p>Obfuscation Identity Archive</p>
        <h1>Index Database</h1>
      </header>
      <label className="index-search">
        <span>Search by submission id, name, fragment, or tag</span>
        <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
      </label>
      <div className="index-table-wrap">
        <table className="index-table">
          <thead>
            <tr>
              <th>Submission ID</th>
              <th>Name</th>
              <th>Carried Fragment</th>
              <th>Tags</th>
              <th>Tag Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((node) => (
              <IdentityIndexTableRow
                key={node.id}
                node={node}
                onOpen={openIdentity}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
