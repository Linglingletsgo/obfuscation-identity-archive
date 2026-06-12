/**
 * GET /api/town/resident?id=xxx — 分身公开页数据
 * 返回：{ resident, episodes }
 */

import { dbSelect } from "./_lib/db.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const id = typeof req.query?.id === "string" ? req.query.id : "";
    if (!id) {
      res.status(400).json({ error: "缺少 id" });
      return;
    }

    const [resident] = await dbSelect(
      `residents?select=id,identity_name,carried_fragment,tags,intro,memories,is_founder,created_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    if (!resident) {
      res.status(404).json({ error: "这位居民还没有入镇" });
      return;
    }

    const episodes = await dbSelect(
      `episodes?select=*&resident_ids=cs.{"${encodeURIComponent(id)}"}&order=created_at.desc&limit=20`,
    );

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).json({ resident, episodes });
  } catch (err) {
    console.error("resident fetch failed:", err);
    res.status(500).json({ error: "档案暂时无法打开" });
  }
}
