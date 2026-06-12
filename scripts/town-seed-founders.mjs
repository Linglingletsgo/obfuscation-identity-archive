/**
 * 原住民播种：把 public/data/submissions/ 的全部档案居民化，写入 Supabase。
 * 每位原住民跑一次 Prompt 1（种子记忆），成本约 $0.0002/人。
 * 幂等：重复运行只补缺，不重复生成（按 id upsert，已有 intro 的跳过）。
 *
 * 用法：
 *   OPENROUTER_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/town-seed-founders.mjs
 *
 * 可选：LIMIT=3 只处理前3个（先小批量验证质量）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callLLM } from "../api/town/_lib/llm.mjs";
import { buildSeedMemoryPrompt, parseSeedMemoryOutput } from "../api/town/_lib/prompts.mjs";
import { dbSelect, dbUpsert } from "../api/town/_lib/db.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const submissionsDir = path.join(repoRoot, "public/data/submissions");

const TAG_FIELDS = [
  "shell_form",
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

function extractTags(submission) {
  const tags = {};
  for (const field of TAG_FIELDS) {
    const raw = submission[field];
    if (field === "shell_form" && typeof raw === "string" && raw.trim()) {
      tags[field] = raw.trim();
    } else if (Array.isArray(raw) && raw.length > 0) {
      tags[field] = raw.filter((v) => typeof v === "string" && v.trim());
    }
  }
  return tags;
}

async function main() {
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
  const files = fs
    .readdirSync(submissionsDir)
    .filter((f) => f.endsWith(".json"))
    .slice(0, limit);

  // 已有 intro 的原住民跳过，支持断点续跑
  const existing = await dbSelect("residents?select=id,intro&is_founder=eq.true&limit=1000");
  const done = new Set(existing.filter((r) => r.intro).map((r) => r.id));

  console.log(`待处理 ${files.length} 份档案，其中 ${done.size} 位原住民已就绪`);

  let ok = 0;
  let failed = 0;
  for (const file of files) {
    const submission = JSON.parse(fs.readFileSync(path.join(submissionsDir, file), "utf8"));
    const id = `founder_${submission.submission_id ?? path.basename(file, ".json")}`;
    if (done.has(id)) continue;

    const name = (submission.identity_name ?? "Anonymous").trim() || "Anonymous";
    const fragment = (submission.carried_fragment ?? "...").trim() || "...";
    const tags = extractTags(submission);

    try {
      const raw = await callLLM(
        buildSeedMemoryPrompt({ identityName: name, carriedFragment: fragment, tags }),
        { maxTokens: 800 },
      );
      const { intro, memories } = parseSeedMemoryOutput(raw);
      await dbUpsert("residents", {
        id,
        identity_name: name,
        carried_fragment: fragment,
        tags,
        intro,
        memories,
        is_founder: true,
      });
      ok += 1;
      console.log(`✓ ${name}（${id}）`);
    } catch (err) {
      failed += 1;
      console.error(`✗ ${name}（${id}）: ${err.message}`);
    }
  }

  console.log(`\n完成：成功 ${ok}，失败 ${failed}，跳过 ${done.size}`);
  if (failed > 0) console.log("失败的条目重新运行本脚本即可补齐");
}

main().catch((err) => {
  console.error("播种失败:", err.message);
  process.exit(1);
});
