/**
 * POST /api/town/encounter — 入镇仪式第二步
 * 输入：{ resident_id }
 * 流程：取新居民 → 标签相似度选原住民 → LLM 生成相遇 → 写入 episodes + 双方记忆
 * 返回：{ episode }
 */

import crypto from "node:crypto";
import { callLLM } from "./_lib/llm.mjs";
import { buildFirstEncounterPrompt, parseEncounterOutput, pickLocation } from "./_lib/prompts.mjs";
import { dbInsert, dbSelect, dbUpdate } from "./_lib/db.mjs";
import { findSimilarResidents } from "./_lib/similarity.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const residentId = typeof req.body?.resident_id === "string" ? req.body.resident_id : "";
    if (!residentId) {
      res.status(400).json({ error: "缺少 resident_id" });
      return;
    }

    const [resident] = await dbSelect(
      `residents?select=*&id=eq.${encodeURIComponent(residentId)}&limit=1`,
    );
    if (!resident) {
      res.status(404).json({ error: "居民不存在" });
      return;
    }

    // 同一居民只生成一次入镇相遇（幂等：刷新页面不重复扣费）
    const existing = await dbSelect(
      `episodes?select=*&type=eq.first_encounter&resident_ids=cs.{"${encodeURIComponent(residentId)}"}&limit=1`,
    );
    if (existing.length > 0) {
      res.status(200).json({ episode: existing[0] });
      return;
    }

    // 从其他居民中选最相似的一位作为相遇对象
    const candidates = await dbSelect(
      `residents?select=id,identity_name,tags,intro&id=neq.${encodeURIComponent(residentId)}&limit=200`,
    );
    if (candidates.length === 0) {
      res.status(409).json({ error: "小镇里还没有其他居民" });
      return;
    }
    const [match] = findSimilarResidents(resident.tags, candidates, 1);
    const other = match.resident;
    const location = pickLocation();

    const encounterRaw = await callLLM(
      buildFirstEncounterPrompt({
        nameA: resident.identity_name,
        nameB: other.identity_name,
        summaryA: resident.intro,
        summaryB: other.intro,
        location,
      }),
      { maxTokens: 1000 },
    );
    const parsed = parseEncounterOutput(encounterRaw);

    const episodeId = `e_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const [episode] = await dbInsert("episodes", {
      id: episodeId,
      type: "first_encounter",
      resident_ids: [resident.id, other.id],
      location,
      content: {
        scene: parsed.scene,
        dialogue: parsed.dialogue,
        participants: [
          { id: resident.id, name: resident.identity_name },
          { id: other.id, name: other.identity_name },
        ],
        similarity_score: Math.round(match.score * 100),
      },
    });

    // 把相遇写进双方的记忆流
    if (parsed.memoryA) {
      await dbUpdate(`residents?id=eq.${encodeURIComponent(resident.id)}`, {
        memories: [...(resident.memories ?? []), parsed.memoryA],
      });
    }
    if (parsed.memoryB) {
      await dbUpdate(`residents?id=eq.${encodeURIComponent(other.id)}`, {
        memories: [...(other.memories ?? []), parsed.memoryB],
      });
    }

    res.status(200).json({ episode });
  } catch (err) {
    console.error("encounter failed:", err);
    res.status(500).json({ error: "相遇还没有发生，请稍后再试" });
  }
}
