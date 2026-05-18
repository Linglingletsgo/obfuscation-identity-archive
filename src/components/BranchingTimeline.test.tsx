import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import type { SourceTimeline } from "../types/archive";
import { BranchingTimeline } from "./BranchingTimeline";

const timeline: SourceTimeline = {
  global_collective_item: {
    timeline_item_id: "global",
    anchor_id: null,
    stage: 2,
    source_ids: ["a", "b"],
    source_texts: [],
    group_size: 2,
  },
  anchors: [
    {
      anchor_id: "a",
      items: [
        {
          timeline_item_id: "a-stage0",
          anchor_id: "a",
          stage: 0,
          stage_name: "Interior A",
          source_ids: ["a"],
          source_texts: [],
          group_size: 1,
          active_tags_preview: ["Dream"],
        },
        {
          timeline_item_id: "a-stage1",
          anchor_id: "a",
          stage: 1,
          stage_name: "Pair A",
          source_ids: ["a"],
          source_texts: [],
          group_size: 1,
          active_tags_preview: ["Shared"],
        },
        {
          timeline_item_id: "a-stage1-b",
          anchor_id: "a",
          stage: 1,
          stage_name: "Pair B",
          source_ids: ["a"],
          source_texts: [],
          group_size: 1,
          active_tags_preview: ["Shared B"],
        },
        {
          timeline_item_id: "a-stage1-c",
          anchor_id: "a",
          stage: 1,
          stage_name: "Pair C",
          source_ids: ["a"],
          source_texts: [],
          group_size: 1,
          active_tags_preview: ["Shared C"],
        },
      ],
    },
    {
      anchor_id: "b",
      items: [
        {
          timeline_item_id: "b-stage1",
          anchor_id: "b",
          stage: 1,
          stage_name: "Pair B",
          source_ids: ["b"],
          source_texts: [],
          group_size: 1,
          active_tags_preview: ["Other"],
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

describe("BranchingTimeline", () => {
  it("renders only selected identity timeline items and opens the clicked item", () => {
    render(
      <ArchiveProvider>
        <SetupIdentity />
        <TimelineStateProbe />
        <BranchingTimeline />
      </ArchiveProvider>,
    );

    fireEvent.click(screen.getByText("setup"));

    expect(screen.getByRole("button", { name: "Stage 0 timeline node 0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stage 1 timeline branch 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stage 1 timeline branch 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stage 1 timeline branch 3" })).toBeInTheDocument();
    expect(document.querySelectorAll(".timeline-tree-branches line")).toHaveLength(6);
    expect(screen.queryByText("Pair B")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stage 1 timeline branch 1" }));

    expect(screen.getByLabelText("Timeline state")).toHaveTextContent("1:a-stage1");
  });
});
