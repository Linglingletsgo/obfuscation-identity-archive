/** 标签相似度（Jaccard）——MVP 阶段用标签重叠代替向量检索，零成本零依赖 */

const SIMILARITY_FIELDS = [
  "emotion_personality_tags",
  "platform_behavior_tags",
  "social_role_tags",
  "time_era_tags",
  "non_human_tags",
  "aesthetic_cultural_tags",
  "spatial_tags",
  "relationship_tags",
  "system_tags",
];

export function tagSet(tags) {
  const set = new Set();
  for (const field of SIMILARITY_FIELDS) {
    const values = Array.isArray(tags?.[field]) ? tags[field] : [];
    for (const v of values) set.add(`${field}:${v}`);
  }
  return set;
}

export function jaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const v of setA) if (setB.has(v)) intersection += 1;
  return intersection / (setA.size + setB.size - intersection);
}

/**
 * 从候选居民中选出与新居民最相似的 N 个。
 * 返回 [{resident, score}]，按相似度降序。
 * 全零相似度时退化为随机选取——新居民永远会遇到人。
 */
export function findSimilarResidents(newTags, candidates, count = 2) {
  const newSet = tagSet(newTags);
  const scored = candidates
    .map((resident) => ({ resident, score: jaccard(newSet, tagSet(resident.tags ?? {})) }))
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score === 0) {
    const shuffled = [...scored].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  return scored.slice(0, count);
}
