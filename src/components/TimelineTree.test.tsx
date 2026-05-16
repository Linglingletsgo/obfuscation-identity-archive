import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import type { SourceTimeline } from "../types/archive";
import { BranchingTimeline } from "./BranchingTimeline";

const timeline: SourceTimeline = {
  global_collective_item: {
    timeline_item_id: "global",
    anchor_id: null,
    stage: 5,
    source_ids: ["a"],
    source_texts: [],
    group_size: 1,
  },
  anchors: [
    {
      anchor_id: "a",
      items: [
        {
          timeline_item_id: "a-stage0",
          anchor_id: "a",
          stage: 0,
          source_ids: ["a"],
          source_texts: [],
          group_size: 1,
        },
        {
          timeline_item_id: "a-stage1",
          anchor_id: "a",
          stage: 1,
          source_ids: ["a"],
          source_texts: [],
          group_size: 1,
        },
      ],
    },
  ],
};

function SetupIdentity() {
  const { enterIdentityDetail, setTimeline } = useArchiveStore();
  return (
    <button
      type="button"
      onClick={() => {
        setTimeline(timeline);
        enterIdentityDetail("a");
      }}
    >
      setup
    </button>
  );
}

function TimelineStateProbe() {
  const { selectedTimelineItemId, stage } = useArchiveStore();
  return (
    <output aria-label="Timeline state">
      {stage}:{selectedTimelineItemId ?? "none"}
    </output>
  );
}

describe("TimelineTree", () => {
  it("renders icon-only tree nodes instead of visible text buttons", () => {
    render(
      <ArchiveProvider>
        <SetupIdentity />
        <TimelineStateProbe />
        <BranchingTimeline />
      </ArchiveProvider>,
    );

    fireEvent.click(screen.getByText("setup"));

    const tree = screen.getByLabelText("Branching archive timeline");
    expect(tree).toHaveClass("timeline-tree");
    expect(screen.queryByText("Interior")).not.toBeInTheDocument();
    expect(screen.queryByText("Pair")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stage 1 timeline node 1" }));
    expect(screen.getByLabelText("Timeline state")).toHaveTextContent("1:a-stage1");
  });
});
