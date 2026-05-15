import { graphPath, publicFileExists, readJson, timelineItems, timelinePath, uniqueTagLabels } from "./archive-core.mjs";

const graph = readJson(graphPath);
const timeline = readJson(timelinePath);
const errors = [];
const identities = new Set((graph.nodes || []).map((node) => node.id));

if (!Array.isArray(graph.nodes)) errors.push("interaction graph nodes must be an array");
if (!Array.isArray(graph.edges)) errors.push("interaction graph edges must be an array");
if (!Array.isArray(timeline.anchors)) errors.push("timeline anchors must be an array");
if (!timeline.global_collective_item) errors.push("timeline must include global_collective_item");

for (const edge of graph.edges || []) {
  if (!identities.has(edge.source)) errors.push(`edge ${edge.id} has unknown source ${edge.source}`);
  if (!identities.has(edge.target)) errors.push(`edge ${edge.id} has unknown target ${edge.target}`);
}

for (const anchor of timeline.anchors || []) {
  if (!identities.has(anchor.anchor_id)) errors.push(`anchor ${anchor.anchor_id} does not resolve to an identity`);
}

for (const item of timelineItems(timeline)) {
  if (!Number.isInteger(item.stage) || item.stage < 0 || item.stage > 4) {
    errors.push(`timeline item ${item.timeline_item_id} has invalid stage ${item.stage}`);
  }
  if (item.stage + 1 !== item.group_size) {
    errors.push(`timeline item ${item.timeline_item_id} group_size does not match stage`);
  }
  if (item.source_ids.length !== item.group_size || item.source_texts.length !== item.group_size) {
    errors.push(`timeline item ${item.timeline_item_id} source cardinality does not match group_size`);
  }
  for (const sourceId of item.source_ids) {
    if (!identities.has(sourceId)) errors.push(`timeline item ${item.timeline_item_id} has unknown source ${sourceId}`);
  }
}

if (uniqueTagLabels(graph).length === 0) errors.push("expected at least one tag label");
if (!publicFileExists("/models/stage5.glb")) errors.push("Stage5 GLB is missing at /models/stage5.glb");

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Archive data validation passed");
