import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { SourceInteractionGraph, SourceTimeline } from "../types/archive";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isValidStage(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isArchiveEvent(value: unknown): boolean {
  if (isString(value)) {
    return true;
  }

  return (
    isRecord(value) &&
    (!("type" in value) || isString(value.type)) &&
    (!("visual" in value) || isString(value.visual)) &&
    (!("intensity" in value) || typeof value.intensity === "number")
  );
}

function hasValidEvents(value: Record<string, unknown>): boolean {
  return !("events" in value) || (Array.isArray(value.events) && value.events.every(isArchiveEvent));
}

function assertValidEvents(value: Record<string, unknown>, owner: string): void {
  if (!hasValidEvents(value)) {
    throw new Error(`Invalid ${owner} events: expected string or event object entries.`);
  }
}

function isGraphTag(value: unknown): boolean {
  const numericFields = ["mobility", "stability", "contamination", "visibility", "confidence"];
  const stringFields = ["category", "role", "definition_source"];

  return (
    isRecord(value) &&
    isString(value.label) &&
    stringFields.every((field) => !(field in value) || isString(value[field])) &&
    numericFields.every((field) => !(field in value) || typeof value[field] === "number")
  );
}

function isTimelineSourceText(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.submission_id) &&
    (!("identity_name" in value) || isString(value.identity_name)) &&
    (!("carried_fragment" in value) || isString(value.carried_fragment))
  );
}

function assertTimelineItem(value: unknown): void {
  if (
    !isRecord(value) ||
    !isString(value.timeline_item_id) ||
    !isValidStage(value.stage) ||
    !(isString(value.anchor_id) || value.anchor_id === null) ||
    typeof value.group_size !== "number"
  ) {
    throw new Error("Invalid timeline item: expected required item fields.");
  }

  if (!isStringArray(value.source_ids)) {
    throw new Error("Invalid timeline item source_ids: expected string entries.");
  }

  if (!Array.isArray(value.source_texts) || !value.source_texts.every(isTimelineSourceText)) {
    throw new Error("Invalid timeline item source_texts: expected source text entries.");
  }

  assertValidEvents(value, "timeline item");
}

export function assertInteractionGraph(value: unknown): asserts value is SourceInteractionGraph {
  const graph = value as SourceInteractionGraph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("Invalid interaction graph: expected top-level nodes and edges arrays.");
  }

  for (const node of graph.nodes) {
    if (!isRecord(node) || !isString(node.id) || !isString(node.type)) {
      throw new Error("Invalid graph node: expected id, type, and optional tags array.");
    }

    if ("tags" in node && (!Array.isArray(node.tags) || !node.tags.every(isGraphTag))) {
      throw new Error("Invalid graph tag: expected tag objects with label.");
    }
  }

  for (const edge of graph.edges) {
    if (
      !isRecord(edge) ||
      !isString(edge.id) ||
      !isString(edge.source) ||
      !isString(edge.target) ||
      !isString(edge.relation)
    ) {
      throw new Error("Invalid graph edge: expected id, source, target, relation, and optional events array.");
    }

    assertValidEvents(edge, "graph edge");
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
