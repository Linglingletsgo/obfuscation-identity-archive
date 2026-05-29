export type GeneratedOverlayTag = {
  label: string;
  category?: string;
  definition_source?: string;
};

export type GeneratedOverlayNode = {
  id: string;
  type: "submission";
  label: string;
  carried_fragment: string;
  asset_path: string;
  tags: GeneratedOverlayTag[];
  source_group: "generated";
};

export type GeneratedOverlayEdge = {
  id: string;
  source: string;
  target: string;
  relation: "interaction";
  weight: number;
  shared_tags: string[];
};

export type GeneratedOverlayGraph = {
  version: 1;
  generated_at: string;
  base_graph_source?: string;
  base_timeline_source?: string;
  nodes: GeneratedOverlayNode[];
  edges: GeneratedOverlayEdge[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isGeneratedTag(value: unknown): value is GeneratedOverlayTag {
  return (
    isRecord(value) &&
    isString(value.label) &&
    (!("category" in value) || isString(value.category)) &&
    (!("definition_source" in value) || isString(value.definition_source))
  );
}

function isGeneratedNode(value: unknown): value is GeneratedOverlayNode {
  return (
    isRecord(value) &&
    isString(value.id) &&
    value.type === "submission" &&
    isString(value.label) &&
    isString(value.carried_fragment) &&
    isString(value.asset_path) &&
    value.source_group === "generated" &&
    Array.isArray(value.tags) &&
    value.tags.every(isGeneratedTag)
  );
}

function isGeneratedEdge(value: unknown): value is GeneratedOverlayEdge {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.source) &&
    isString(value.target) &&
    value.relation === "interaction" &&
    typeof value.weight === "number" &&
    isStringArray(value.shared_tags)
  );
}

export function emptyGeneratedOverlay(): GeneratedOverlayGraph {
  return {
    version: 1,
    generated_at: new Date(0).toISOString(),
    nodes: [],
    edges: [],
  };
}

export function assertGeneratedOverlay(value: unknown): asserts value is GeneratedOverlayGraph {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isString(value.generated_at) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  ) {
    throw new Error("Invalid generated overlay: expected version, generated_at, nodes, and edges.");
  }

  for (const node of value.nodes) {
    if (!isGeneratedNode(node)) {
      throw new Error("Invalid generated overlay node: expected generated submission node.");
    }
  }

  for (const edge of value.edges) {
    if (!isGeneratedEdge(edge)) {
      throw new Error("Invalid generated overlay edge: expected interaction edge.");
    }
  }
}
