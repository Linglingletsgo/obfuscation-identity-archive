import fs from "node:fs";
import path from "node:path";

export const repoRoot = process.cwd();
export const graphPath = path.join(repoRoot, "public/data/algorithm/interaction_graph_real_submissions.json");
export const timelinePath = path.join(
  repoRoot,
  "public/data/algorithm/timeline/anchor_timeline_real_submissions.json",
);

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function timelineItems(timeline) {
  return timeline.anchors.flatMap((anchor) => anchor.items || []);
}

export function uniqueTagLabels(graph) {
  return [
    ...new Set(graph.nodes.flatMap((node) => (node.tags || []).map((tag) => tag.label)).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

export function publicFileExists(publicPath) {
  return fs.existsSync(path.join(repoRoot, "public", publicPath.replace(/^\//, "")));
}

export function stageCounts(timeline) {
  const counts = Object.fromEntries([0, 1, 2].map((stage) => [stage, 0]));
  for (const item of timelineItems(timeline)) {
    counts[item.stage] = (counts[item.stage] || 0) + 1;
  }
  counts[2] = timeline.global_collective_item ? (counts[2] || 0) + 1 : counts[2];
  return counts;
}

export function deterministicPosition(id, stage = 2, radius = 7) {
  let hash = 2166136261;
  for (const char of `${id}:${stage}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 4294967295;
  const angle = normalized * Math.PI * 2;
  const stageZ = [-7, -4, 0][stage] ?? 0;
  return {
    x: Number((Math.cos(angle) * radius).toFixed(4)),
    y: Number(((normalized - 0.5) * radius).toFixed(4)),
    z: Number((stageZ + Math.sin(angle) * radius * 0.35).toFixed(4)),
  };
}
