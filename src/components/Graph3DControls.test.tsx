import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import { Graph3DControls } from "./Graph3DControls";

function QueryProbe() {
  const { filters } = useArchiveStore();
  return <output>{filters.query}</output>;
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
  });
});
