import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveStage, TimelineItem } from "../types/archive";

const labels = ["Interior", "Pair", "Cluster", "Dense", "Pressure", "Collective"];

function timelineItemLabel(item: TimelineItem): string {
  return item.stage_name || labels[item.stage] || item.timeline_item_id;
}

export function BranchingTimeline() {
  const { openCollective, openStage, selectedIdentityId, selectedTimelineItemId, stage, timeline } = useArchiveStore();
  if (stage === 5) return null;

  const anchor = timeline?.anchors.find((item) => item.anchor_id === selectedIdentityId);
  if (!anchor) return null;

  const items = [...anchor.items].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage;
    return a.timeline_item_id.localeCompare(b.timeline_item_id);
  });

  return (
    <nav className="branching-timeline" aria-label="Branching archive timeline">
      {items.map((item) => (
        <button
          key={item.timeline_item_id}
          type="button"
          className={
            selectedTimelineItemId
              ? item.timeline_item_id === selectedTimelineItemId
                ? "active"
                : ""
              : item.stage === stage
                ? "active"
                : ""
          }
          onClick={() => openStage(item.stage, item.timeline_item_id)}
        >
          {timelineItemLabel(item)}
        </button>
      ))}
      <button type="button" className="" onClick={openCollective}>
        {labels[5]}
      </button>
    </nav>
  );
}
