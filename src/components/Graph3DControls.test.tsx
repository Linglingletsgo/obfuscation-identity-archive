import { useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";
import { Graph3DControls } from "./Graph3DControls";

function QueryProbe() {
  const { filters } = useArchiveStore();
  return <output>{filters.query}</output>;
}

function SelectedIdentityProbe() {
  const { collectiveNavigation } = useArchiveStore();
  return <output aria-label="Selected identity">{collectiveNavigation.selectedIdentityId ?? "none"}</output>;
}

function searchableNode(
  id: string,
  type: ArchiveGraphNode["type"],
  identityName?: string,
  tagLabels: string[] = [],
): ArchiveGraphNode {
  return {
    id,
    type,
    identity_name: identityName,
    source_ids: type === "submission" ? [id] : [],
    tags: tagLabels.map((label) => ({ label })),
    tag_labels: tagLabels,
    scores: {},
    events: [],
    position: { x: 0, y: 0, z: 0 },
    visual: {
      size: 1,
      color_group: "identity",
      opacity: 1,
      label: identityName ?? id,
      node_shape: "sprite",
      node_style_key: "identity",
    },
  };
}

const graph: ArchiveGraph = {
  nodes: [
    searchableNode("submission_001", "submission", "Ronald", ["Dream"]),
    searchableNode("tag:Dream", "tag", undefined, ["Dream"]),
  ],
  links: [],
  metadata: {
    layout: "deterministic-avatar-map",
    seed: "test",
    source_files: [],
    generated_at: new Date(0).toISOString(),
  },
};

function GraphLoader() {
  const { setGraph } = useArchiveStore();
  useEffect(() => {
    setGraph(graph);
  }, [setGraph]);
  return null;
}

describe("Graph3DControls", () => {
  it("updates query filter", () => {
    render(
      <ArchiveProvider>
        <Graph3DControls />
        <QueryProbe />
      </ArchiveProvider>,
    );

    fireEvent.change(screen.getByLabelText("Search archive"), { target: { value: "Dream" } });

    expect(screen.getByText("Dream")).toBeInTheDocument();
    expect(screen.queryByLabelText("Link density")).not.toBeInTheDocument();
  });

  it("locks the matching submission when searching by id or name", () => {
    render(
      <ArchiveProvider>
        <GraphLoader />
        <Graph3DControls />
        <SelectedIdentityProbe />
      </ArchiveProvider>,
    );

    fireEvent.change(screen.getByLabelText("Search archive"), { target: { value: "Ronald" } });

    expect(screen.getByLabelText("Selected identity")).toHaveTextContent("submission_001");
  });

  it("does not lock tag-only matches", () => {
    render(
      <ArchiveProvider>
        <GraphLoader />
        <Graph3DControls />
        <SelectedIdentityProbe />
      </ArchiveProvider>,
    );

    fireEvent.change(screen.getByLabelText("Search archive"), { target: { value: "Dream" } });

    expect(screen.getByLabelText("Selected identity")).toHaveTextContent("none");
  });
});
