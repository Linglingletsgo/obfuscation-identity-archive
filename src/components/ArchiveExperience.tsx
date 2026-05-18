import { useEffect, useState } from "react";
import { loadArchiveSources } from "../data/archiveLoaders";
import { buildArchiveGraph } from "../data/relationshipGraphBuilder";
import { useArchiveStore } from "../state/archiveStore";
import { BranchingTimeline } from "./BranchingTimeline";
import { Graph3DControls } from "./Graph3DControls";
import { StageDetailAvatarScene } from "./StageDetailAvatarScene";
import { Stage5IdentityOverlay } from "./Stage5IdentityOverlay";
import { StageScene } from "./StageScene";

export function ArchiveExperience() {
  const { graph, setGraph, setTimeline, stage } = useArchiveStore();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Loading archive data");

  useEffect(() => {
    let active = true;

    loadArchiveSources()
      .then(({ graph, timeline }) => {
        if (!active) return;
        setGraph(buildArchiveGraph(graph, timeline));
        setTimeline(timeline);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unknown archive loading error");
      });

    return () => {
      active = false;
    };
  }, [setGraph, setTimeline]);

  if (status === "loading") {
    return <section className="archive-loading">{message}</section>;
  }

  if (status === "error") {
    return (
      <section role="alert" className="archive-loading">
        {message}
      </section>
    );
  }

  return (
    <section className="archive-experience" data-stage={stage}>
      <div className="archive-scene-shell">
        <StageScene />
      </div>
      <StageDetailAvatarScene />
      <Graph3DControls />
      <Stage5IdentityOverlay identities={graph?.nodes.filter((node) => node.type === "submission") ?? []} />
      <BranchingTimeline />
    </section>
  );
}
