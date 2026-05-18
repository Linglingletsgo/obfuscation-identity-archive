import type { CSSProperties } from "react";
import { useArchiveStore } from "../state/archiveStore";
import type { TimelineItem } from "../types/archive";

export function BranchingTimeline() {
  const { openCollective, openStage, selectedIdentityId, selectedTimelineItemId, stage, timeline } = useArchiveStore();
  if (stage === 2) return null;

  const anchor = timeline?.anchors.find((item) => item.anchor_id === selectedIdentityId);
  if (!anchor) return null;

  const items = [...anchor.items].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage;
    if (a.stage === 1 && b.stage === 1) {
      return (a.pressure_score ?? 0) - (b.pressure_score ?? 0);
    }
    return a.timeline_item_id.localeCompare(b.timeline_item_id);
  });
  const stage1Items = items.filter((item) => item.stage === 1);
  const stage1IndexById = new Map(stage1Items.map((item, index) => [item.timeline_item_id, index]));
  const branchY = (index: number, total: number) =>
    total <= 1 ? 50 : 24 + (52 / Math.max(1, total - 1)) * index;
  const itemPosition = (item: TimelineItem) => {
    if (item.stage === 0) return { x: 10, y: 50 };
    if (item.stage === 1) {
      return {
        x: 50,
        y: branchY(stage1IndexById.get(item.timeline_item_id) ?? 0, stage1Items.length),
      };
    }
    return { x: 90, y: 50 };
  };

  return (
    <nav className="branching-timeline timeline-tree" aria-label="Branching archive timeline">
      <div className="timeline-tree-track" aria-hidden="true" />
      <svg className="timeline-tree-branches" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
        {stage1Items.map((item, index) => {
          const y = branchY(index, stage1Items.length);
          return (
            <g key={`${item.timeline_item_id}:branch`}>
              <line x1="10" y1="50" x2="50" y2={y} />
              <line x1="50" y1={y} x2="90" y2="50" />
            </g>
          );
        })}
      </svg>
      {items.map((item, index) => (
        <button
          key={item.timeline_item_id}
          type="button"
          aria-label={
            item.stage === 1
              ? `Stage 1 timeline branch ${(stage1IndexById.get(item.timeline_item_id) ?? 0) + 1}`
              : `Stage ${item.stage} timeline node ${index}`
          }
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
            "--timeline-x": `${itemPosition(item).x}%`,
            "--timeline-y": `${itemPosition(item).y}%`,
          } as CSSProperties}
        />
      ))}
      <button type="button" className="timeline-tree-collective" aria-label="Return to collective" onClick={openCollective} />
    </nav>
  );
}
