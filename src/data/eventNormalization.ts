import type { NormalizedArchiveEvent, SourceGraphEvent } from "../types/archive";

export function normalizeEvents(
  events: SourceGraphEvent[] | undefined,
  source: "graph" | "timeline",
): NormalizedArchiveEvent[] {
  return (events ?? []).map((event) => {
    if (typeof event === "string") {
      return { type: event, visual: event, intensity: 1, source };
    }

    const type = event.type?.trim() || "unknown_event";
    return {
      type,
      visual: event.visual?.trim() || type,
      intensity: typeof event.intensity === "number" ? event.intensity : 1,
      source,
    };
  });
}
