import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { SourceInteractionGraph, SourceTimeline } from "../types/archive";

export function assertInteractionGraph(value: unknown): asserts value is SourceInteractionGraph {
  const graph = value as SourceInteractionGraph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("Invalid interaction graph: expected top-level nodes and edges arrays.");
  }
}

export function assertTimeline(value: unknown): asserts value is SourceTimeline {
  const timeline = value as SourceTimeline;
  if (!timeline || !Array.isArray(timeline.anchors) || !timeline.global_collective_item) {
    throw new Error("Invalid timeline: expected anchors array and global_collective_item.");
  }
}

async function loadJson<T>(path: string, assertValue: (value: unknown) => asserts value is T): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status} ${response.statusText}`);
  }

  const value: unknown = await response.json();
  assertValue(value);
  return value;
}

export async function loadArchiveSources(): Promise<{
  graph: SourceInteractionGraph;
  timeline: SourceTimeline;
}> {
  const [graph, timeline] = await Promise.all([
    loadJson(archiveVisualConfig.data.interactionGraphPath, assertInteractionGraph),
    loadJson(archiveVisualConfig.data.timelinePath, assertTimeline),
  ]);

  return { graph, timeline };
}
