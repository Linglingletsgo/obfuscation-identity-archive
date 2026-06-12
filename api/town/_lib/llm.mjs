/** OpenRouter 调用封装（服务端专用） */

const DEFAULT_MODEL = "deepseek/deepseek-chat";

export async function callLLM(prompt, { temperature = 0.85, maxTokens = 1200, model } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("缺少 OPENROUTER_API_KEY 环境变量");

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.TOWN_SITE_URL ?? "https://obfuscation-town.vercel.app",
      "X-Title": "Obfuscation Town",
    },
    body: JSON.stringify({
      model: model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`OpenRouter ${resp.status}: ${detail.slice(0, 300)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter 返回空内容");
  return content;
}

/** 从 LLM 输出中提取 JSON（容忍 markdown 代码块包裹） */
export function extractJson(text) {
  const stripped = text.replace(/```(?:json)?/g, "").trim();
  const start = stripped.search(/[[{]/);
  if (start === -1) throw new Error("LLM 输出中没有 JSON");
  return JSON.parse(stripped.slice(start));
}
