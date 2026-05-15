import fs from "node:fs";
import path from "node:path";
import { deterministicPosition, ensureDir, graphPath, readJson, timelinePath } from "./archive-core.mjs";

const graph = readJson(graphPath);
const timeline = readJson(timelinePath);
const outputDir = path.join(process.cwd(), "public/data/graph");
ensureDir(outputDir);

const identityNodes = graph.nodes.map((node) => ({
  id: node.id,
  type: "submission",
  stage: 0,
  source_ids: [node.id],
  identity_name: node.label || node.id,
  carried_fragment: node.text_fragments?.carriedFragment || "",
  tag_labels: [...new Set((node.tags || []).map((tag) => tag.label))].sort(),
  position: deterministicPosition(node.id, 0),
}));

const tagLabels = [...new Set(graph.nodes.flatMap((node) => (node.tags || []).map((tag) => tag.label)).filter(Boolean))].sort(
  (a, b) => a.localeCompare(b),
);
const tagNodes = tagLabels.map((label) => ({
  id: `tag:${label}`,
  type: "tag",
  stage: 5,
  source_ids: [],
  tag_labels: [label],
  position: deterministicPosition(`tag:${label}`, 5, 10),
}));

const links = [];
for (const node of graph.nodes) {
  for (const label of new Set((node.tags || []).map((tag) => tag.label))) {
    links.push({ source: node.id, target: `tag:${label}`, type: "shared_tag", weight: 1 });
  }
}
for (const edge of graph.edges) {
  links.push({
    source: edge.source,
    target: edge.target,
    type: "interaction",
    weight: edge.scores?.total ?? 1,
    scores: edge.scores || {},
    evidence: edge.evidence || {},
  });
}

const cache = {
  nodes: [...identityNodes, ...tagNodes],
  links,
  metadata: {
    layout: "scripted-deterministic-cache",
    seed: "obfuscation-identity-archive-v1",
    source_files: [
      "public/data/algorithm/interaction_graph_real_submissions_10.json",
      "public/data/algorithm/timeline/anchor_timeline_real_submissions_10.json",
    ],
    source_count: timeline.source_count,
  },
};

const outputPath = path.join(outputDir, "relationship_graph_3d.json");
fs.writeFileSync(outputPath, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
