import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  graphPath,
  publicFileExists,
  readJson,
  stageCounts,
  timelineItems,
  timelinePath,
  uniqueTagLabels,
} from "./archive-core.mjs";

const graph = readJson(graphPath);
const timeline = readJson(timelinePath);
const identities = new Set(graph.nodes.map((node) => node.id));
const items = timelineItems(timeline);
const counts = stageCounts(timeline);

const unresolvedEdges = graph.edges.filter((edge) => !identities.has(edge.source) || !identities.has(edge.target));
const unresolvedTimelineSources = items.flatMap((item) =>
  item.source_ids.filter((id) => !identities.has(id)).map((id) => `${item.timeline_item_id}:${id}`),
);
const unresolvedAnchors = timeline.anchors.filter((anchor) => !identities.has(anchor.anchor_id));
const cardinalityProblems = items.filter(
  (item) => item.source_ids.length !== item.group_size || item.source_texts.length !== item.group_size,
);
const missingStage0 = graph.nodes
  .filter((node) => !publicFileExists(`/assets/avatars/stage0/${node.id}.png`))
  .map((node) => node.id);
const hasStage2CollectiveModel = publicFileExists("/models/global_stage2_collective.glb");

const report = `# Algorithm Audit

## Summary

- Node types: ${[...new Set(graph.nodes.map((node) => node.type))].join(", ")}
- Edge relation types: ${[...new Set(graph.edges.map((edge) => edge.relation))].join(", ")}
- Identity nodes: ${graph.nodes.length}
- Identity interaction edges: ${graph.edges.length}
- Unique tag display labels: ${uniqueTagLabels(graph).length}
- Anchors: ${timeline.anchors.length}
- Timeline items under anchors: ${items.length}
- Stage item counts: ${JSON.stringify(counts)}
- Stage2 collective source: ${timeline.global_collective_item ? "global_collective_item" : "missing"}

## Resolution Checks

- Edges with unresolved endpoints: ${unresolvedEdges.length}
- Timeline source_ids not resolving to identity nodes: ${unresolvedTimelineSources.length}
- Anchor IDs not resolving to identity nodes: ${unresolvedAnchors.length}
- Stage/source cardinality problems: ${cardinalityProblems.length}
- Stage2 collective is global: ${Boolean(timeline.global_collective_item)}

## Field Availability

- Graph identity tags present: ${graph.nodes.every((node) => Array.isArray(node.tags))}
- Graph edge scores present: ${graph.edges.every((edge) => Boolean(edge.scores))}
- Graph edge events present: ${graph.edges.some((edge) => Array.isArray(edge.events))}
- Timeline scores present: ${items.every((item) => Boolean(item.scores))}
- Timeline events present: ${items.every((item) => Array.isArray(item.events))}
- Timeline avatar_tags present: ${items.every((item) => Boolean(item.avatar_tags))}
- Timeline active_tags_preview present: ${items.every((item) => Array.isArray(item.active_tags_preview))}
- Timeline avatar_vector present: ${items.every((item) => Boolean(item.avatar_vector))}

## Asset Resolution

- Missing Stage0 PNGs for graph identities: ${missingStage0.length}${missingStage0.length ? ` (${missingStage0.join(", ")})` : ""}
- Stage1 avatar intentionally blank: true
- Stage2 collective GLB exists: ${hasStage2CollectiveModel}

## Frontend Interpretation

- Use graph edges as canonical all-identity relationship source.
- Use timeline anchors and items as canonical Stage0-1 navigation source.
- Use global_collective_item and /models/global_stage2_collective.glb as canonical Stage2 source.
- Create frontend tag nodes from unique tag display labels because source graph nodes are identity-only.
- Use evidence.conflictPairs and glitch-like events for conflict/glitch links; do not infer conflict from tag names alone.
- Missing assets are expected runtime states and must render placeholders without mutating source data.
`;

const docsDir = path.join(process.cwd(), "docs");
ensureDir(docsDir);
fs.writeFileSync(path.join(docsDir, "algorithm-audit.md"), report);
console.log(report);
