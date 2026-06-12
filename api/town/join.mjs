/**
 * POST /api/town/join — 入镇仪式第一步
 * 输入：{ identity_name, carried_fragment, tags: {...}, consent: true }
 * 流程：校验 → LLM 审核 → LLM 种子记忆 → 写入 residents
 * 返回：{ resident_id }
 */

import crypto from "node:crypto";
import { callLLM, extractJson } from "./_lib/llm.mjs";
import { buildModerationPrompt, buildSeedMemoryPrompt, parseSeedMemoryOutput } from "./_lib/prompts.mjs";
import { dbInsert } from "./_lib/db.mjs";

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
const MAX_TAGS_PER_FIELD = 8;

function validate(body) {
  const name = typeof body?.identity_name === "string" ? body.identity_name.trim() : "";
  const fragment = typeof body?.carried_fragment === "string" ? body.carried_fragment.trim() : "";
  if (!name || name.length > 40) return { error: "身份名必填，且不超过40字" };
  if (!fragment || fragment.length > 120) return { error: "携带的碎片必填，且不超过120字" };
  if (body?.consent !== true) return { error: "需要同意数据使用条款" };

  const tags = {};
  let totalTags = 0;
  for (const field of TAG_FIELDS) {
    const raw = body?.tags?.[field];
    if (field === "shell_form") {
      if (typeof raw === "string" && raw.trim()) tags[field] = raw.trim().slice(0, 60);
      continue;
    }
    if (!Array.isArray(raw)) continue;
    const cleaned = raw
      .filter((v) => typeof v === "string" && v.trim())
      .map((v) => v.trim().slice(0, 60))
      .slice(0, MAX_TAGS_PER_FIELD);
    if (cleaned.length > 0) {
      tags[field] = cleaned;
      totalTags += cleaned.length;
    }
  }
  if (totalTags < 3) return { error: "请至少选择3个标签，让小镇认识你" };
  return { name, fragment, tags };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const checked = validate(req.body);
    if (checked.error) {
      res.status(400).json({ error: checked.error });
      return;
    }
    const { name, fragment, tags } = checked;

    // 1. 内容审核（低温度，要求确定性）
    const moderationRaw = await callLLM(
      buildModerationPrompt({ identityName: name, carriedFragment: fragment }),
      { temperature: 0, maxTokens: 200 },
    );
    const moderation = extractJson(moderationRaw);
    if (moderation.pass !== true) {
      res.status(400).json({ error: `提交未通过审核：${moderation.reason ?? "内容不符合社区规范"}` });
      return;
    }

    // 2. 种子记忆
    const seedRaw = await callLLM(
      buildSeedMemoryPrompt({ identityName: name, carriedFragment: fragment, tags }),
      { maxTokens: 800 },
    );
    const { intro, memories } = parseSeedMemoryOutput(seedRaw);

    // 3. 写入数据库
    const residentId = `r_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    await dbInsert("residents", {
      id: residentId,
      identity_name: name,
      carried_fragment: fragment,
      tags,
      intro,
      memories,
      is_founder: false,
    });

    res.status(200).json({ resident_id: residentId });
  } catch (err) {
    console.error("join failed:", err);
    res.status(500).json({ error: "入镇仪式中断了，请稍后再试" });
  }
}
