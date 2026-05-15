import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { SourceInteractionGraph, SourceTimeline } from "../types/archive";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isValidStage(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 5;
}

function assertTimelineItem(value: unknown): void {
  if (
    !isRecord(value) ||
    !isString(value.timeline_item_id) ||
    !isValidStage(value.stage) ||
    !(isString(value.anchor_id) || value.anchor_id === null) ||
    !Array.isArray(value.source_ids) ||
    !Array.isArray(value.source_texts) ||
    typeof value.group_size !== "number" ||
    ("events" in value && !Array.isArray(value.events))
  ) {
    throw new Error("Invalid timeline item: expected required item fields.");
  }
}

export function assertInteractionGraph(value: unknown): asserts value is SourceInteractionGraph {
  const graph = value as SourceInteractionGraph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("Invalid interaction graph: expected top-level nodes and edges arrays.");
  }

  for (const node of graph.nodes) {
    if (!isRecord(node) || !isString(node.id) || !isString(node.type) || ("tags" in node && !Array.isArray(node.tags))) {
      throw new Error("Invalid graph node: expected id, type, and optional tags array.");
    }
  }

  for (const edge of graph.edges) {
    if (
      !isRecord(edge) ||
      !isString(edge.id) ||
      !isString(edge.source) ||
      !isString(edge.target) ||
      !isString(edge.relation) ||
      ("events" in edge && !Array.isArray(edge.events))
    ) {
      throw new Error("Invalid graph edge: expected id, source, target, relation, and optional events array.");
    }
  }
}

export function assertTimeline(value: unknown): asserts value is SourceTimeline {
  const timeline = value as SourceTimeline;
  if (!timeline || !Array.isArray(timeline.anchors) || !timeline.global_collective_item) {
    throw new Error("Invalid timeline: expected anchors array and global_collective_item.");
  }

  assertTimelineItem(timeline.global_collective_item);

  for (const anchor of timeline.anchors) {
    if (!isRecord(anchor) || !isString(anchor.anchor_id) || !Array.isArray(anchor.items)) {
      throw new Error("Invalid timeline anchor: expected anchor_id and items array.");
    }

    for (const item of anchor.items) {
      assertTimelineItem(item);
    }
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
