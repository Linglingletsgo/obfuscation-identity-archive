import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveStage } from "../types/archive";

const stages: ArchiveStage[] = [0, 1, 2, 3, 4, 5];
const labels = ["Interior", "Pair", "Cluster", "Dense", "Pressure", "Collective"];

export function BranchingTimeline() {
  const { openCollective, openStage, stage } = useArchiveStore();
  if (stage === 5) return null;

  return (
    <nav className="branching-timeline" aria-label="Branching archive timeline">
      {stages.map((value, index) => (
        <button
          key={value}
          type="button"
          className={value === stage ? "active" : ""}
          onClick={() => (value === 5 ? openCollective() : openStage(value))}
        >
          {labels[index]}
        </button>
      ))}
    </nav>
  );
}
