import { useMemo, useState } from "react";
import { useArchiveData } from "../data/useArchiveData";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraphNode } from "../types/archive";

function normalize(value: string | undefined): string {
  return value?.toLowerCase().trim() ?? "";
}

function getIdentityRows(nodes: ArchiveGraphNode[], query: string): ArchiveGraphNode[] {
  const normalizedQuery = normalize(query);
  const identities = nodes
    .filter((node) => node.type === "submission")
    .sort((left, right) => (left.identity_name ?? left.id).localeCompare(right.identity_name ?? right.id));

  if (!normalizedQuery) return identities;

  return identities.filter((node) =>
    [node.id, node.identity_name, node.carried_fragment, ...node.tag_labels]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(normalizedQuery)),
  );
}

export function ArchiveIndexPage() {
  const { message, status } = useArchiveData();
  const { enterIdentityDetail, graph } = useArchiveStore();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => getIdentityRows(graph?.nodes ?? [], query), [graph, query]);

  function openIdentity(identityId: string) {
    enterIdentityDetail(identityId);
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

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
              <tr
                key={node.id}
                onClick={() => openIdentity(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") openIdentity(node.id);
                }}
                tabIndex={0}
              >
                <td>{node.id}</td>
                <td>{node.identity_name ?? node.visual.label}</td>
                <td>{node.carried_fragment}</td>
                <td>{node.tag_labels.slice(0, 8).join(", ")}</td>
                <td>{node.tag_labels.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
