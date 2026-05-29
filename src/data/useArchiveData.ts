import { useEffect, useState } from "react";
import { useArchiveStore } from "../state/archiveStore";
import { loadArchiveSources } from "./archiveLoaders";
import { mergeGeneratedOverlay } from "./generatedOverlayMerge";
import { buildArchiveGraph } from "./relationshipGraphBuilder";

export type ArchiveDataStatus = "loading" | "ready" | "error";

export function useArchiveData(): { message: string; status: ArchiveDataStatus } {
  const { graph, setGraph, setTimeline, timeline } = useArchiveStore();
  const [status, setStatus] = useState<ArchiveDataStatus>(graph && timeline ? "ready" : "loading");
  const [message, setMessage] = useState("Loading archive data");

  useEffect(() => {
    if (graph && timeline) {
      setStatus("ready");
      return undefined;
    }

    let active = true;

    loadArchiveSources()
      .then(({ graph: sourceGraph, timeline: sourceTimeline, generatedOverlay }) => {
        if (!active) return;
        setGraph(mergeGeneratedOverlay(buildArchiveGraph(sourceGraph, sourceTimeline), generatedOverlay));
        setTimeline(sourceTimeline);
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
  }, [graph, setGraph, setTimeline, timeline]);

  return { message, status };
}
