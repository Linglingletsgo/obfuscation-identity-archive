import { useEffect, useRef, useState } from "react";
import { ProceduralAvatar } from "./ProceduralAvatar";
import { downloadShareCard } from "./shareCard";
import { fetchResident, triggerEncounter, type Episode, type Resident } from "./townApi";

const RITUAL_STEPS = [
  "小镇正在登记你的档案…",
  "记忆碎片正在归位…",
  "有人注意到了新来的居民…",
];

function RitualProgress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => Math.min(s + 1, RITUAL_STEPS.length - 1));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="town-ritual">
      {RITUAL_STEPS.slice(0, step + 1).map((text, i) => (
        <p key={text} className={`town-ritual-step${i === step ? " active" : ""}`}>
          {text}
          {i === step && <span className="town-ritual-dot"> ●●●</span>}
        </p>
      ))}
    </div>
  );
}

function EncounterCard({ episode, residentId }: { episode: Episode; residentId: string }) {
  const other = episode.content.participants?.find((p) => p.id !== residentId);
  return (
    <section className="town-card">
      <p className="town-card-label">入镇第一夜 · {episode.location}</p>
      <p className="town-encounter-meta">
        与 <strong>{other?.name ?? "一位陌生居民"}</strong> 相遇
        {typeof episode.content.similarity_score === "number" && (
          <span className="town-similarity">灵魂相似度 {episode.content.similarity_score}%</span>
        )}
      </p>
      {episode.content.scene && <p className="town-scene">{episode.content.scene}</p>}
      {episode.content.dialogue && episode.content.dialogue.length > 0 && (
        <ul className="town-dialogue">
          {episode.content.dialogue.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ResidentPage({
  residentId,
  isNew,
  onNavigateHome,
}: {
  residentId: string;
  isNew: boolean;
  onNavigateHome: () => void;
}) {
  const [resident, setResident] = useState<Resident | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchResident(residentId);
        if (cancelled) return;
        setResident(data.resident);
        setEpisodes(data.episodes);

        // 非原住民且尚无相遇 → 触发入镇相遇（服务端幂等，刷新或中断后自愈）
        const hasEncounter = data.episodes.some((e) => e.type === "first_encounter");
        if (!hasEncounter && !data.resident.is_founder) {
          const { episode } = await triggerEncounter(residentId);
          if (!cancelled) setEpisodes((prev) => [episode, ...prev]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [residentId, isNew]);

  async function handleShare() {
    if (!resident) return;
    setSharing(true);
    try {
      const svg = avatarRef.current?.querySelector("svg") ?? null;
      await downloadShareCard(resident, svg);
    } finally {
      setSharing(false);
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href.split("?")[0]);
  }

  if (loading && !resident) {
    return (
      <div className="town-shell">
        <RitualProgress />
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="town-shell">
        <div className="town-ritual">
          <p className="town-ritual-step active">{error ?? "这位居民还没有入镇"}</p>
          <button type="button" className="town-footer-link" onClick={onNavigateHome}>
            回到入镇处
          </button>
        </div>
      </div>
    );
  }

  const encounter = episodes.find((e) => e.type === "first_encounter");

  return (
    <div className="town-shell">
      <div className="town-profile">
        <div className="town-avatar" ref={avatarRef}>
          <ProceduralAvatar residentId={resident.id} />
        </div>
        <h1 className="town-resident-name">{resident.identity_name}</h1>
        <p className="town-fragment">「{resident.carried_fragment}」</p>
      </div>

      <section className="town-card">
        <p className="town-card-label">居民档案</p>
        <p className="town-intro">{resident.intro}</p>
      </section>

      {resident.memories.length > 0 && (
        <section className="town-card">
          <p className="town-card-label">记忆碎片</p>
          <ul className="town-memory-list">
            {resident.memories.map((memory) => (
              <li key={memory}>{memory}</li>
            ))}
          </ul>
        </section>
      )}

      {encounter ? (
        <EncounterCard episode={encounter} residentId={resident.id} />
      ) : (
        isNew && (
          <section className="town-card">
            <p className="town-card-label">入镇第一夜</p>
            <p className="town-scene">
              相遇正在发生<span className="town-ritual-dot"> ●●●</span>
            </p>
          </section>
        )
      )}

      <div className="town-actions">
        <button type="button" className="town-action-btn primary" disabled={sharing} onClick={handleShare}>
          {sharing ? "生成中…" : "保存分享卡"}
        </button>
        <button type="button" className="town-action-btn" onClick={handleCopyLink}>
          复制链接
        </button>
      </div>

      <button type="button" className="town-footer-link" onClick={onNavigateHome}>
        我也要捏一个混淆身份 →
      </button>
    </div>
  );
}
