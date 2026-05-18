import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraphNode } from "../types/archive";
import { Stage5IdentityOverlay } from "./Stage5IdentityOverlay";

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
  const { updateStage5Navigation } = useArchiveStore();
  return (
    <button type="button" onClick={() => updateStage5Navigation({ selectedIdentityId: "submission_a" })}>
      select
    </button>
  );
}

function StageReader() {
  const { stage } = useArchiveStore();
  return <span data-testid="stage">{stage}</span>;
}

describe("Stage5IdentityOverlay", () => {
  it("renders selected identity and enters Stage0 through explicit action", () => {
    render(
      <ArchiveProvider>
        <SelectIdentity />
        <StageReader />
        <Stage5IdentityOverlay identities={[identity]} />
      </ArchiveProvider>,
    );

    fireEvent.click(screen.getByText("select"));
    expect(screen.getByText("Name: Name A")).toBeInTheDocument();
    expect(screen.getByTestId("stage")).toHaveTextContent("2");

    expect(screen.queryByText("Dream")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enter Stage 0" }));
    expect(screen.getByTestId("stage")).toHaveTextContent("0");
  });
});
