/**
 * 端到端冒烟测试（不需要 Supabase）：
 * 模拟一个新用户提交 → 审核 → 种子记忆 → 相似度匹配原住民 → 入镇相遇。
 * 验证 prompt 输出能被 parse 函数正确解析（这是生产环境最脆弱的环节）。
 *
 * 用法：OPENROUTER_API_KEY=... node scripts/town-smoke-test.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callLLM, extractJson } from "../api/town/_lib/llm.mjs";
import {
  buildFirstEncounterPrompt,
  buildModerationPrompt,
  buildSeedMemoryPrompt,
  parseEncounterOutput,
  parseSeedMemoryOutput,
  pickLocation,
} from "../api/town/_lib/prompts.mjs";
import { findSimilarResidents } from "../api/town/_lib/similarity.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// 模拟的新用户提交
const newSubmission = {
  identityName: "纸鹤收音机",
  carriedFragment: "我只在没人听的频道广播",
  tags: {
    shell_form: "Unnameable",
    emotion_personality_tags: ["Silent", "Nostalgic", "Suspicious"],
    platform_behavior_tags: ["Browses without buying", "Ad avoider", "Deletes records"],
    social_role_tags: ["Observer", "Anonymous user"],
    time_era_tags: ["1990s", "Nocturnal"],
    non_human_tags: ["Bird", "Echo", "An unread email"],
    spatial_tags: ["Abandoned space"],
  },
};

// 用真实档案数据模拟原住民池（取已有 intro 的简化版）
function loadFounderPool() {
  const dir = path.join(repoRoot, "public/data/submissions");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .slice(0, 10)
    .map((f) => {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return {
        id: `founder_${d.submission_id}`,
        identity_name: d.identity_name ?? "Anonymous",
        tags: d,
        intro: `${d.identity_name ?? "Anonymous"}，${d.shell_form ?? "身份不明"}，携带着「${d.carried_fragment ?? "..."}」。`,
      };
    });
}

async function main() {
  console.log("══ 混淆小镇 端到端冒烟测试 ══\n");
  let failures = 0;

  // 1. 审核
  console.log("1/4 内容审核…");
  const moderationRaw = await callLLM(
    buildModerationPrompt({
      identityName: newSubmission.identityName,
      carriedFragment: newSubmission.carriedFragment,
    }),
    { temperature: 0, maxTokens: 200 },
  );
  let moderation;
  try {
    moderation = extractJson(moderationRaw);
    console.log(`    ✓ 解析成功: pass=${moderation.pass} (${moderation.reason})`);
    if (moderation.pass !== true) {
      console.log("    ⚠ 正常内容被误拒，需要调整审核 prompt");
      failures += 1;
    }
  } catch (e) {
    console.log(`    ✗ JSON 解析失败: ${e.message}\n原始输出:\n${moderationRaw}`);
    failures += 1;
  }

  // 2. 种子记忆
  console.log("2/4 种子记忆…");
  const seedRaw = await callLLM(buildSeedMemoryPrompt(newSubmission), { maxTokens: 800 });
  let seed;
  try {
    seed = parseSeedMemoryOutput(seedRaw);
    console.log(`    ✓ 解析成功: 简介${seed.intro.length}字, ${seed.memories.length}条记忆`);
    console.log(`    简介: ${seed.intro.slice(0, 60)}…`);
  } catch (e) {
    console.log(`    ✗ 解析失败: ${e.message}\n原始输出:\n${seedRaw}`);
    failures += 1;
    process.exit(1);
  }

  // 3. 相似度匹配
  console.log("3/4 相似度匹配…");
  const pool = loadFounderPool();
  const [match] = findSimilarResidents(newSubmission.tags, pool, 1);
  console.log(`    ✓ 匹配到: ${match.resident.identity_name} (相似度 ${(match.score * 100).toFixed(1)}%)`);

  // 4. 入镇相遇
  console.log("4/4 入镇相遇…");
  const location = pickLocation();
  const encounterRaw = await callLLM(
    buildFirstEncounterPrompt({
      nameA: newSubmission.identityName,
      nameB: match.resident.identity_name,
      summaryA: seed.intro,
      summaryB: match.resident.intro,
      location,
    }),
    { maxTokens: 1000 },
  );
  try {
    const encounter = parseEncounterOutput(encounterRaw);
    console.log(`    ✓ 解析成功 @ ${location}`);
    console.log(`    场景: ${encounter.scene.slice(0, 60)}…`);
    console.log(`    对话 ${encounter.dialogue.length} 句`);
    console.log(`    甲的记忆: ${encounter.memoryA}`);
    console.log(`    乙的记忆: ${encounter.memoryB}`);
  } catch (e) {
    console.log(`    ✗ 解析失败: ${e.message}\n原始输出:\n${encounterRaw}`);
    failures += 1;
  }

  console.log(`\n══ 完成: ${failures === 0 ? "全部通过 ✅" : `${failures} 项失败 ❌`} ══`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("冒烟测试异常:", err.message);
  process.exit(1);
});
