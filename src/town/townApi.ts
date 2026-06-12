/** 小镇 API 客户端 */

export type ResidentTags = {
  shell_form?: string;
  [field: string]: string | string[] | undefined;
};

export type Resident = {
  id: string;
  identity_name: string;
  carried_fragment: string;
  tags: ResidentTags;
  intro: string;
  memories: string[];
  is_founder: boolean;
  created_at: string;
};

export type Episode = {
  id: string;
  type: string;
  resident_ids: string[];
  location: string | null;
  content: {
    scene?: string;
    dialogue?: string[];
    participants?: Array<{ id: string; name: string }>;
    similarity_score?: number;
  };
  created_at: string;
};

async function parseResponse<T>(resp: Response): Promise<T> {
  const data = (await resp.json().catch(() => ({}))) as T & { error?: string };
  if (!resp.ok) throw new Error(data.error ?? `请求失败（${resp.status}）`);
  return data;
}

export async function joinTown(payload: {
  identity_name: string;
  carried_fragment: string;
  tags: ResidentTags;
  consent: boolean;
}): Promise<{ resident_id: string }> {
  const resp = await fetch("/api/town/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(resp);
}

export async function triggerEncounter(residentId: string): Promise<{ episode: Episode }> {
  const resp = await fetch("/api/town/encounter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resident_id: residentId }),
  });
  return parseResponse(resp);
}

export async function fetchResident(id: string): Promise<{ resident: Resident; episodes: Episode[] }> {
  const resp = await fetch(`/api/town/resident?id=${encodeURIComponent(id)}`);
  return parseResponse(resp);
}
