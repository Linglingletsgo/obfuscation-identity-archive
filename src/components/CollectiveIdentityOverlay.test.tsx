import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraphNode } from "../types/archive";
import { CollectiveIdentityOverlay } from "./CollectiveIdentityOverlay";

const identity: ArchiveGraphNode = {
  id: "submission_a",
  type: "submission",
  source_ids: ["submission_a"],
  identity_name: "Name A",
  carried_fragment: "Fragment A",
  tags: [],
  tag_labels: ["Dream"],
  scores: {},
  events: [],
  position: { x: 0, y: 0, z: 0 },
  visual: {
    size: 1,
    color_group: "identity",
    opacity: 1,
    label: "Name: Name A\nFragment A",
    node_shape: "mark",
    node_style_key: "identity",
  },
};

function SelectIdentity() {
  const { updateCollectiveNavigation } = useArchiveStore();
  return (
    <button type="button" onClick={() => updateCollectiveNavigation({ selectedIdentityId: "submission_a" })}>
      select
    </button>
  );
}

function ViewReader() {
  const { view } = useArchiveStore();
  return <span data-testid="view">{view}</span>;
}

describe("CollectiveIdentityOverlay", () => {
  it("renders selected identity and enters individual through explicit action", () => {
    render(
      <ArchiveProvider>
        <SelectIdentity />
        <ViewReader />
        <CollectiveIdentityOverlay identities={[identity]} />
      </ArchiveProvider>,
    );

    fireEvent.click(screen.getByText("select"));
    expect(screen.getByText("Name: Name A")).toBeInTheDocument();
    expect(screen.getByTestId("view")).toHaveTextContent("collective");

    expect(screen.queryByText("Dream")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Selected identity preview")).toHaveStyle({ pointerEvents: "none" });
    expect(screen.getByRole("button", { name: "Enter individual" })).toHaveStyle({ pointerEvents: "auto" });

    fireEvent.click(screen.getByRole("button", { name: "Enter individual" }));
    expect(screen.getByTestId("view")).toHaveTextContent("individual");
  });
});
