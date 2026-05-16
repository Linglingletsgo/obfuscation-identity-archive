import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveStage, TimelineItem } from "../types/archive";

const labels = ["Interior", "Pair", "Cluster", "Dense", "Pressure", "Collective"];

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
    <nav className="branching-timeline timeline-tree" aria-label="Branching archive timeline">
      <div className="timeline-tree-track" aria-hidden="true" />
      {items.map((item, index) => (
        <button
          key={item.timeline_item_id}
          type="button"
          aria-label={`Stage ${item.stage} timeline node ${index}`}
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
          style={{
            "--timeline-stage": item.stage,
            "--timeline-row": index,
          } as React.CSSProperties}
        />
      ))}
      <button type="button" className="timeline-tree-collective" aria-label="Return to collective" onClick={openCollective} />
    </nav>
  );
}
