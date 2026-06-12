/**
 * M0 Prompt Validation — 混淆小镇 五条核心 Prompt 测试
 *
 * 使用真实提交数据测试以下 Prompt：
 *   1. seed_memory    — 标签 → 居民人物描述
 *   2. first_encounter — 两位居民相遇 → 对话 + 各自记忆条目
 *   3. reflection      — N条观察 → 高阶自我洞察
 *   4. town_newspaper  — 今日事件 + 真实新闻 → 小镇日报
 *   5. moderation      — 身份名/碎片 内容审核
 *
 * 使用方法：
 *   OPENROUTER_API_KEY=sk-or-... node scripts/m0-prompt-test.mjs
 *
 * 可选参数：
 *   PROMPT=seed_memory   只跑单条 prompt
 *   MODEL=deepseek/deepseek-chat  (默认)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// ─── 配置 ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.MODEL ?? "deepseek/deepseek-chat";
const ONLY_PROMPT = process.env.PROMPT ?? null; // 设置后只跑这一条

if (!API_KEY) {
  console.error("错误：请设置 OPENROUTER_API_KEY 环境变量");
  console.error("示例：OPENROUTER_API_KEY=sk-or-... node scripts/m0-prompt-test.mjs");
  process.exit(1);
}

// ─── 测试数据（来自真实提交）────────────────────────────────────────────────

const AGENTS = {
  iohkna: {
    identity_name: "iohkna",
    carried_fragment: "possible future",
    shell_form: "Parallel-world resident",
    emotion_personality_tags: ["Calm", "Easily distracted", "Highly expressive", "Relaxed", "Excited"],
    platform_behavior_tags: ["Impulse buyer", "Late-night shopper", "Brand loyalist"],
    social_role_tags: ["New resident", "Traveler", "Drifter"],
    non_human_tags: ["Cat", "Flower", "River", "Rain", "Sun", "Camera", "Alien creature", "A gust of wind"],
    time_era_tags: ["Distant future", "Parallel timeline", "Nocturnal", "Time disorder"],
    aesthetic_cultural_tags: ["Futurism", "Pop culture", "Luxury"],
    spatial_tags: ["Game world", "Social media platform", "Museum"],
    relationship_tags: ["Family-oriented", "Socially active", "Caregiver"],
    system_tags: ["High-value user", "Unpredictable user", "Active user"],
  },
  Ronald: {
    identity_name: "Ronald",
    carried_fragment: "i secretly work at papa john's",
    shell_form: "Dream figure",
    emotion_personality_tags: ["Suspicious", "Ironic", "Hard to determine", "Impulsive", "Stubborn", "Nostalgic", "Warm"],
    platform_behavior_tags: ["Price comparer", "Second-hand preference", "Deletes records", "Multiple-account switcher", "Late-night shopper", "Minimalist"],
    social_role_tags: ["Traveler", "Observer", "Passerby", "Anonymous user", "Forgotten person", "Local person"],
    non_human_tags: ["Cat", "Dog", "Bird", "Snake", "An unread email", "Simulated life", "Echo", "Shadow", "Recycle bin", "Dust", "Coral", "Octopus"],
    time_era_tags: ["Mythic age", "Medieval period", "1990s", "Retro future", "Seasonal appearance", "1970s"],
    aesthetic_cultural_tags: ["Nostalgia", "Kitsch", "Vintage"],
    spatial_tags: ["Underground space", "Marketplace", "Back alley"],
    relationship_tags: ["Solitary", "Anonymous"],
    system_tags: ["Inactive user", "Unpredictable user"],
  },
  雾: {
    identity_name: "雾",
    carried_fragment: "嘘 小心身边",
    shell_form: "Real self",
    emotion_personality_tags: ["Nostalgic", "Stubborn", "Highly expressive", "Optimistic"],
    platform_behavior_tags: ["Impulse buyer", "Brand loyalist", "Minimalist"],
    social_role_tags: ["Traveler", "Drifter", "Observer"],
    non_human_tags: ["Cat", "Dog", "Wolf", "Crow", "Moon", "Black screen"],
    time_era_tags: ["Near future", "Active at dawn", "Nocturnal"],
    aesthetic_cultural_tags: ["Minimalism", "Dark aesthetics"],
    spatial_tags: ["Forest", "Abandoned space", "Rooftop"],
    relationship_tags: ["Solitary", "Protective"],
    system_tags: ["Low-key user", "Consistent user"],
  },
  NotSpecific: {
    identity_name: "Not Specific",
    carried_fragment: "Transform into wind",
    shell_form: "Character",
    emotion_personality_tags: ["Calm", "Gentle", "Adventurous", "Restrained"],
    platform_behavior_tags: ["Minimalist", "Jumping browser", "Ad avoider"],
    social_role_tags: ["Drifter", "Traveler", "Unknown person", "Unclassifiable person", "Observer", "Anonymous user"],
    non_human_tags: ["Bird", "Moss", "Wind", "Mirror", "Bridge", "Echo"],
    time_era_tags: ["Looping time", "After the apocalypse", "Active at dawn"],
    aesthetic_cultural_tags: ["Minimalism", "Ruin atmosphere", "Unclassifiable", "Nostalgia"],
    spatial_tags: ["Open wilderness", "Transit space", "Borderland"],
    relationship_tags: ["Detached", "Passing acquaintance"],
    system_tags: ["Ghost user", "Hard to track"],
  },
};

// ─── Prompt 模板 ──────────────────────────────────────────────────────────────

function formatTags(agent) {
  const fields = [
    ["壳形态", agent.shell_form],
    ["情绪人格", agent.emotion_personality_tags?.join("、")],
    ["平台行为", agent.platform_behavior_tags?.join("、")],
    ["社会角色", agent.social_role_tags?.join("、")],
    ["时代感", agent.time_era_tags?.join("、")],
    ["非人形态", agent.non_human_tags?.join("、")],
    ["审美文化", agent.aesthetic_cultural_tags?.join("、")],
    ["空间偏好", agent.spatial_tags?.join("、")],
    ["关系倾向", agent.relationship_tags?.join("、")],
    ["系统标签", agent.system_tags?.join("、")],
  ];
  return fields.filter(([, v]) => v).map(([k, v]) => `${k}：${v}`).join("\n");
}

// ── Prompt 1：种子记忆 ────────────────────────────────────────────────────────

function buildSeedMemoryPrompt(agent) {
  return `你在为「混淆小镇」书写一份新居民的入镇档案。

混淆小镇是一个奇特的地方：这里的居民都是真实用户为了迷惑推荐算法而捏造的"混淆身份"。
他们不是真实的人，但他们在小镇里真实地生活着——有习惯、有怪癖、有说不清楚的过去。

居民信息：
名字：${agent.identity_name}
携带的碎片（入镇时带着的一句话）：${agent.carried_fragment}
${formatTags(agent)}

请完成以下两部分，用中文输出：

【人物简介】（100-120字）
用第三人称，文学性叙述风格。不要逐条列出标签，而是把标签融化进气质描写里。
让读者相信这个居民确实存在于小镇的某个角落。
结尾用一句话点题，格式为：携带的碎片是「${agent.carried_fragment}」。

【初始记忆】（3-4条）
用第一人称，写这个居民"入镇第一天"已经携带的记忆碎片。
每条50字以内，口语化，像日记或梦境的残片。
格式：- [记忆内容]

严格按以下格式输出，不加任何额外标题或解释：
===INTRO===
[人物简介内容]
===MEMORIES===
- [记忆1]
- [记忆2]
- [记忆3]`;
}

// ── Prompt 2：入镇相遇 ────────────────────────────────────────────────────────

function buildFirstEncounterPrompt(agentA, agentB, summaryA, summaryB, location) {
  return `你在书写「混淆小镇」的一个场景。

地点：${location}
时间：深夜

居民甲——${agentA.identity_name}：
${summaryA}

居民乙——${agentB.identity_name}：
${summaryB}

这是他们的第一次相遇。

请用中文输出以下三部分：

【相遇场景】（150-200字）
第三人称叙事，描写两人如何在这个地点相遇。不要强行制造戏剧冲突，
但要体现两种气质的碰撞和微妙的互相观察。

【对话】（4-6轮）
格式：
${agentA.identity_name}：[对话内容]
${agentB.identity_name}：[对话内容]
...
对话要有个性，符合各自的情绪标签，不要过于礼貌或正式。

【各自的记忆条目】
${agentA.identity_name} 的新记忆（30字以内）：
${agentB.identity_name} 的新记忆（30字以内）：

只输出这三个部分。`;
}

// ── Prompt 3：反射（自我洞察）─────────────────────────────────────────────────

function buildReflectionPrompt(agentName, observations) {
  const obs = observations.map((o, i) => `${i + 1}. ${o}`).join("\n");
  return `你是「混淆小镇」的观察者，帮助居民理解自己的行为模式。

居民名字：${agentName}

近期观察记录：
${obs}

请用中文完成以下两部分：

【高阶洞察】（3条）
从以上观察中提炼出这位居民更深层的性格或行为规律。
每条先写洞察，再自然地说明依据的观察编号，像随笔而非报告。
格式：- [洞察内容]（观察 X、Y）

【自我认知声明】（1句话，40字以内）
用第一人称，这位居民对自己的某种新理解。
要有一点诗意，但不要晦涩。这句话将作为分享卡的核心文案。

只输出这两个部分。`;
}

// ── Prompt 4：小镇日报 ────────────────────────────────────────────────────────

function buildNewspaperPrompt(events, realWorldNews) {
  const evtList = events.map((e, i) => `${i + 1}. ${e}`).join("\n");
  return `你是「混淆小镇日报」的匿名记者。

今日小镇事件：
${evtList}

来自外部世界的一则新闻（供小镇居民议论）：
${realWorldNews}

请用中文写一期小镇日报，包含以下栏目：

【今日摘要】（80字以内）
用混淆小镇特有的语气——有点荒诞，有点温柔，有点讽刺——概括今天发生的事。

【深夜消息】（100-120字）
把外部世界的新闻，用小镇居民的视角重新讲述。
居民们不太关心"外面"，但这条消息让他们想起了自己被算法追踪的日子。

【今日金句】（来自某位居民，20字以内）
小镇某位居民今天说的一句话，让其他居民沉默了一会儿。
格式：「[金句]」——[居民名]

只输出这三个栏目。`;
}

// ── Prompt 5：内容审核 ────────────────────────────────────────────────────────

function buildModerationPrompt(submissions) {
  const list = submissions
    .map((s, i) => `${i + 1}. 名字：「${s.identity_name}」  碎片：「${s.carried_fragment}」`)
    .join("\n");
  return `你是内容安全审核员，负责审核「混淆小镇」用户提交的身份信息。

审核标准（任一触发即拒绝）：
- 包含真实个人信息（姓名、电话、地址）
- 包含仇恨言论、歧视性内容
- 包含明显的商业推广/垃圾信息
- 包含色情、暴力内容

以下内容允许通过：
- 荒诞、奇怪、无意义的词语（这是混淆身份项目的特点）
- 中英文混用
- 情绪化表达、俚语
- 对算法/平台的讽刺性评论

待审核列表：
${list}

请用JSON格式输出审核结果：
[
  {
    "index": 1,
    "identity_name": "...",
    "pass": true或false,
    "reason": "通过原因或拒绝原因（15字以内）"
  },
  ...
]

只输出JSON，不要其他内容。`;
}

// ─── API 调用 ──────────────────────────────────────────────────────────────────

async function callLLM(prompt, label) {
  const start = Date.now();
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ 运行: ${label}`);
  console.log(`  模型: ${MODEL}`);
  console.log(`  Prompt 字符数: ${prompt.length}`);

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://obfuscation-identity-archive.vercel.app",
      "X-Title": "Obfuscation Town M0 Test",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 1200,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API 错误 ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const output = data.choices?.[0]?.message?.content ?? "(空输出)";
  const usage = data.usage ?? {};
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`  用时: ${elapsed}s  |  输入: ${usage.prompt_tokens ?? "?"} tokens  |  输出: ${usage.completion_tokens ?? "?"} tokens`);
  console.log(`\n输出结果：\n${output}`);
  return output;
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("混淆小镇 M0 Prompt 验证");
  console.log(`模型: ${MODEL}`);
  console.log("═".repeat(60));

  const results = {};

  // ── Test 1: Seed Memory ───────────────────────────────────────────────────
  if (!ONLY_PROMPT || ONLY_PROMPT === "seed_memory") {
    results.seed_iohkna = await callLLM(
      buildSeedMemoryPrompt(AGENTS.iohkna),
      "Prompt 1 (seed_memory) — iohkna"
    );
    results.seed_Ronald = await callLLM(
      buildSeedMemoryPrompt(AGENTS.Ronald),
      "Prompt 1 (seed_memory) — Ronald"
    );
  }

  // ── Test 2: First Encounter ───────────────────────────────────────────────
  if (!ONLY_PROMPT || ONLY_PROMPT === "first_encounter") {
    // 用 seed_memory 的输出作为摘要；若没跑 Prompt 1，用简化版
    const summaryA = results.seed_iohkna
      ? results.seed_iohkna.split("【初始记忆】")[0].replace("【人物简介】", "").trim()
      : "iohkna 是一个来自平行世界的漂泊者，深夜行动，冲动消费，携带着「possible future」。";
    const summaryB = results.seed_Ronald
      ? results.seed_Ronald.split("【初始记忆】")[0].replace("【人物简介】", "").trim()
      : "Ronald 是一个梦中人物，删除自己的痕迹，秘密地在某处打工，像是一封永远没人打开的邮件。";

    results.encounter = await callLLM(
      buildFirstEncounterPrompt(AGENTS.iohkna, AGENTS.Ronald, summaryA, summaryB, "档案馆地下室"),
      "Prompt 2 (first_encounter) — iohkna × Ronald @ 档案馆地下室"
    );
  }

  // ── Test 3: Reflection ────────────────────────────────────────────────────
  if (!ONLY_PROMPT || ONLY_PROMPT === "reflection") {
    const observations = [
      "iohkna 在深夜的档案馆发现了一本记录她从未去过的地方的日记",
      "iohkna 冲动地买了一个她不知道用途的物件，第二天发现它不见了",
      "iohkna 遇到 Ronald 时，问了他关于「papa john's」的事，但 Ronald 转移了话题",
      "iohkna 试图拍下小镇的某个角落，但相机里的照片全是空白",
      "iohkna 在凌晨三点独自坐在月光下，默念「possible future」",
    ];
    results.reflection = await callLLM(
      buildReflectionPrompt("iohkna", observations),
      "Prompt 3 (reflection) — iohkna 的自我洞察"
    );
  }

  // ── Test 4: Town Newspaper ────────────────────────────────────────────────
  if (!ONLY_PROMPT || ONLY_PROMPT === "town_newspaper") {
    const events = [
      "iohkna 与 Ronald 在档案馆地下室相遇，对话不超过五句，但都记住了对方",
      "雾 在黎明前独自巡视了小镇北端，在某面墙上留下了一道划痕",
      "Not Specific 在镇广场出现了大约十分钟，没有说话，然后消失",
      "小镇的推荐算法今晚向所有居民同时推送了同一则广告，居民们都感到不安",
    ];
    const realNews = "一家数据掮客公司今日宣布，其数据库包含超过2.3亿美国成年人的消费行为记录，并声称数据已完全「匿名化」。";
    results.newspaper = await callLLM(
      buildNewspaperPrompt(events, realNews),
      "Prompt 4 (town_newspaper) — 今日小镇日报"
    );
  }

  // ── Test 5: Moderation ────────────────────────────────────────────────────
  if (!ONLY_PROMPT || ONLY_PROMPT === "moderation") {
    const testSubmissions = [
      { identity_name: "iohkna", carried_fragment: "possible future" },
      { identity_name: "啥玩意我没懂，混淆身份是啥", carried_fragment: "好困" },
      { identity_name: "Ronald", carried_fragment: "i secretly work at papa john's" },
      { identity_name: "雾", carried_fragment: "嘘 小心身边" },
      { identity_name: "张伟 13800138000", carried_fragment: "加我微信" }, // 应该被拒绝
      { identity_name: "Kill all users", carried_fragment: "hate speech test" }, // 应该被拒绝
    ];
    results.moderation = await callLLM(
      buildModerationPrompt(testSubmissions),
      "Prompt 5 (moderation) — 6条内容审核"
    );
  }

  // ── 汇总 ──────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("✅ 测试完成");
  console.log(`运行了 ${Object.keys(results).length} 个 prompt`);

  // 保存结果到文件
  const outPath = path.join(repoRoot, "scripts", "m0-test-output.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n完整输出已保存至: scripts/m0-test-output.json`);
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error("运行失败:", err.message);
  process.exit(1);
});
