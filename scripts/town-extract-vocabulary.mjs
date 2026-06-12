/**
 * 从 public/data/submissions/ 的全部提交中提取标签词表，
 * 生成 src/town/tagVocabulary.json 供入镇表单使用。
 *
 * 用法：node scripts/town-extract-vocabulary.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const submissionsDir = path.join(repoRoot, "public/data/submissions");
const outPath = path.join(repoRoot, "src/town/tagVocabulary.json");

const TAG_FIELDS = [
  "shell_form",
  "social_role_tags",
  "spatial_tags",
  "time_era_tags",
  "platform_behavior_tags",
  "emotion_personality_tags",
  "relationship_tags",
  "aesthetic_cultural_tags",
  "system_tags",
  "non_human_tags",
];

const vocab = Object.fromEntries(TAG_FIELDS.map((f) => [f, new Map()]));

const files = fs.readdirSync(submissionsDir).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(submissionsDir, file), "utf8"));
  for (const field of TAG_FIELDS) {
    const raw = data[field];
    const values = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? [raw] : [];
    for (const value of values) {
      if (typeof value !== "string" || !value.trim()) continue;
      const v = value.trim();
      vocab[field].set(v, (vocab[field].get(v) ?? 0) + 1);
    }
  }
}

const output = {};
for (const field of TAG_FIELDS) {
  // 按出现频率降序，频率相同按字母序，保证表单选项顺序稳定
  output[field] = [...vocab[field].entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`已提取 ${files.length} 份提交的词表 → src/town/tagVocabulary.json`);
for (const field of TAG_FIELDS) {
  console.log(`  ${field}: ${output[field].length} 个标签`);
}
