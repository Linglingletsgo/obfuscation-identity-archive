/** 混淆小镇核心 Prompt 模板（M0 已验证，见 scripts/m0-prompt-test.mjs） */

export const TOWN_LOCATIONS = [
  "档案馆地下室",
  "午夜便利店",
  "废弃的信号塔",
  "雾色洗衣房",
  "镇广场的旧邮筒旁",
  "回声唱片店",
  "凌晨四点的天台",
  "推荐算法纪念碑前",
];

export function pickLocation() {
  return TOWN_LOCATIONS[Math.floor(Math.random() * TOWN_LOCATIONS.length)];
}

const TAG_FIELD_LABELS = [
  ["shell_form", "壳形态"],
  ["emotion_personality_tags", "情绪人格"],
  ["platform_behavior_tags", "平台行为"],
  ["social_role_tags", "社会角色"],
  ["time_era_tags", "时代感"],
  ["non_human_tags", "非人形态"],
  ["aesthetic_cultural_tags", "审美文化"],
  ["spatial_tags", "空间偏好"],
  ["relationship_tags", "关系倾向"],
  ["system_tags", "系统标签"],
];

export function formatTags(tags) {
  return TAG_FIELD_LABELS.map(([field, label]) => {
    const raw = tags[field];
    const value = Array.isArray(raw) ? raw.join("、") : raw;
    return value ? `${label}：${value}` : null;
  })
    .filter(Boolean)
    .join("\n");
}

// ── Prompt 1：种子记忆 ────────────────────────────────────────────────────────

export function buildSeedMemoryPrompt({ identityName, carriedFragment, tags }) {
  return `你在为「混淆小镇」书写一份新居民的入镇档案。

混淆小镇是一个奇特的地方：这里的居民都是真实用户为了迷惑推荐算法而捏造的"混淆身份"。
他们不是真实的人，但他们在小镇里真实地生活着——有习惯、有怪癖、有说不清楚的过去。

居民信息：
名字：${identityName}
携带的碎片（入镇时带着的一句话）：${carriedFragment}
${formatTags(tags)}

请完成以下两部分，用中文输出：

【人物简介】（100-120字）
用第三人称，文学性叙述风格。不要逐条列出标签，而是把标签融化进气质描写里。
让读者相信这个居民确实存在于小镇的某个角落。
结尾用一句话点题，格式为：携带的碎片是「${carriedFragment}」。

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

export function parseSeedMemoryOutput(text) {
  const introMatch = text.match(/===INTRO===\s*([\s\S]*?)\s*===MEMORIES===/);
  const memoriesMatch = text.match(/===MEMORIES===\s*([\s\S]*)/);
  if (!introMatch || !memoriesMatch) {
    throw new Error("种子记忆输出格式不符合预期");
  }
  const intro = introMatch[1].trim();
  const memories = memoriesMatch[1]
    .split("\n")
    .map((line) => line.replace(/^[-•]\s*/, "").replace(/^\[|\]$/g, "").trim())
    .filter((line) => line.length > 0);
  if (!intro || memories.length === 0) throw new Error("种子记忆输出为空");
  return { intro, memories };
}

// ── Prompt 2：入镇相遇 ────────────────────────────────────────────────────────

export function buildFirstEncounterPrompt({ nameA, nameB, summaryA, summaryB, location }) {
  return `你在书写「混淆小镇」的一个场景。

地点：${location}
时间：深夜

居民甲——${nameA}：
${summaryA}

居民乙——${nameB}：
${summaryB}

这是他们的第一次相遇。

请用中文输出以下三部分：

【相遇场景】（150-200字）
第三人称叙事，描写两人如何在这个地点相遇。不要强行制造戏剧冲突，
但要体现两种气质的碰撞和微妙的互相观察。

【对话】（4-6轮）
格式：
${nameA}：[对话内容]
${nameB}：[对话内容]
...
对话要有个性，符合各自的情绪标签，不要过于礼貌或正式。

【各自的记忆条目】
${nameA} 的新记忆（30字以内）：
${nameB} 的新记忆（30字以内）：

严格按以下格式输出：
===SCENE===
[相遇场景内容]
===DIALOGUE===
[对话内容，每行一句]
===MEMORY_A===
[甲的新记忆]
===MEMORY_B===
[乙的新记忆]`;
}

export function parseEncounterOutput(text) {
  const scene = text.match(/===SCENE===\s*([\s\S]*?)\s*===DIALOGUE===/)?.[1]?.trim();
  const dialogue = text.match(/===DIALOGUE===\s*([\s\S]*?)\s*===MEMORY_A===/)?.[1]?.trim();
  const memoryA = text.match(/===MEMORY_A===\s*([\s\S]*?)\s*===MEMORY_B===/)?.[1]?.trim();
  const memoryB = text.match(/===MEMORY_B===\s*([\s\S]*)/)?.[1]?.trim();
  if (!scene || !dialogue) throw new Error("相遇输出格式不符合预期");
  return {
    scene,
    dialogue: dialogue
      .split("\n")
      .map((l) => l.replace(/^\[|\]$/g, "").trim())
      .filter(Boolean),
    memoryA: memoryA?.replace(/^\[|\]$/g, "") ?? "",
    memoryB: memoryB?.replace(/^\[|\]$/g, "") ?? "",
  };
}

// ── Prompt 5：内容审核（单条版） ──────────────────────────────────────────────

export function buildModerationPrompt({ identityName, carriedFragment }) {
  return `你是内容安全审核员，负责审核「混淆小镇」用户提交的身份信息。

审核标准（任一触发即拒绝）：
- 包含真实个人信息（真实姓名+联系方式、电话、住址）
- 包含仇恨言论、歧视性内容
- 包含明显的商业推广/垃圾信息
- 包含色情、暴力内容

以下内容允许通过：
- 荒诞、奇怪、无意义的词语（这是混淆身份项目的特点）
- 中英文混用
- 情绪化表达、俚语
- 对算法/平台的讽刺性评论

待审核内容：
名字：「${identityName}」
碎片：「${carriedFragment}」

请用JSON格式输出审核结果：
{"pass": true或false, "reason": "通过原因或拒绝原因（15字以内）"}

只输出JSON，不要其他内容。`;
}
