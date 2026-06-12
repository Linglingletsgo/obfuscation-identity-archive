/**
 * Supabase PostgREST 极简客户端（纯 fetch，零依赖）。
 * 服务端专用——使用 service role key，绝不能出现在前端代码里。
 */

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量");
  return { url: url.replace(/\/$/, ""), key };
}

async function request(method, path, { body, headers = {} } = {}) {
  const { url, key } = config();
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Supabase ${resp.status} ${method} ${path}: ${detail.slice(0, 300)}`);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

/** select：path 形如 "residents?select=*&id=eq.xxx" */
export function dbSelect(path) {
  return request("GET", path);
}

/** insert 单行或多行，返回插入的行 */
export function dbInsert(table, rows) {
  return request("POST", table, {
    body: rows,
    headers: { Prefer: "return=representation" },
  });
}

/** upsert（按主键合并），用于种子脚本幂等重跑 */
export function dbUpsert(table, rows) {
  return request("POST", table, {
    body: rows,
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  });
}

/** update：path 形如 "residents?id=eq.xxx" */
export function dbUpdate(path, patch) {
  return request("PATCH", path, {
    body: patch,
    headers: { Prefer: "return=representation" },
  });
}
