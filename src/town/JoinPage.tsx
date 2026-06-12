import { useMemo, useState } from "react";
import vocabulary from "./tagVocabulary.json";
import { joinTown } from "./townApi";

const FIELD_META: Array<{ field: keyof typeof vocabulary; label: string; hint: string }> = [
  { field: "shell_form", label: "壳形态", hint: "你以什么形态存在？（单选）" },
  { field: "emotion_personality_tags", label: "情绪人格", hint: "这个身份的脾气" },
  { field: "platform_behavior_tags", label: "平台行为", hint: "算法眼里的你——故意误导它" },
  { field: "social_role_tags", label: "社会角色", hint: "在小镇里你扮演谁" },
  { field: "time_era_tags", label: "时代感", hint: "你属于哪个时间" },
  { field: "non_human_tags", label: "非人形态", hint: "你身上混进了什么" },
  { field: "aesthetic_cultural_tags", label: "审美文化", hint: "你的趣味" },
  { field: "spatial_tags", label: "空间偏好", hint: "你出没的地方" },
  { field: "relationship_tags", label: "关系倾向", hint: "你与他人的距离" },
  { field: "system_tags", label: "系统标签", hint: "系统会怎么给你打标" },
];

const MAX_PER_FIELD = 5;
const COLLAPSED_COUNT = 12;

function ChipField({
  options,
  selected,
  single,
  onToggle,
}: {
  options: string[];
  selected: string[];
  single: boolean;
  onToggle: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, COLLAPSED_COUNT);

  return (
    <div className="town-chips">
      {visible.map((option) => {
        const isSelected = selected.includes(option);
        const atLimit = !single && !isSelected && selected.length >= MAX_PER_FIELD;
        return (
          <button
            key={option}
            type="button"
            className={`town-chip${isSelected ? " selected" : ""}`}
            disabled={atLimit}
            style={atLimit ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        );
      })}
      {options.length > COLLAPSED_COUNT && (
        <button type="button" className="town-chip town-chip-more" onClick={() => setExpanded(!expanded)}>
          {expanded ? "收起" : `还有 ${options.length - COLLAPSED_COUNT} 个…`}
        </button>
      )}
    </div>
  );
}

export function JoinPage({ onJoined }: { onJoined: (residentId: string) => void }) {
  const [identityName, setIdentityName] = useState("");
  const [fragment, setFragment] = useState("");
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSelected = useMemo(
    () => Object.values(selections).reduce((sum, list) => sum + list.length, 0),
    [selections],
  );

  function toggle(field: string, value: string, single: boolean) {
    setSelections((prev) => {
      const current = prev[field] ?? [];
      if (single) {
        return { ...prev, [field]: current[0] === value ? [] : [value] };
      }
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      }
      if (current.length >= MAX_PER_FIELD) return prev;
      return { ...prev, [field]: [...current, value] };
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!identityName.trim()) {
      setError("给这个身份起个名字");
      return;
    }
    if (!fragment.trim()) {
      setError("写下你携带的碎片——一句话，什么都行");
      return;
    }
    if (totalSelected < 3) {
      setError("至少选3个标签，让小镇认识你");
      return;
    }
    if (!consent) {
      setError("需要同意数据使用条款");
      return;
    }

    setSubmitting(true);
    try {
      const tags: Record<string, string | string[]> = {};
      for (const { field } of FIELD_META) {
        const values = selections[field] ?? [];
        if (values.length === 0) continue;
        tags[field] = field === "shell_form" ? values[0] : values;
      }
      const { resident_id } = await joinTown({
        identity_name: identityName.trim(),
        carried_fragment: fragment.trim(),
        tags,
        consent: true,
      });
      onJoined(resident_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "入镇失败，请重试");
      setSubmitting(false);
    }
  }

  return (
    <div className="town-shell">
      <header className="town-header">
        <h1 className="town-title">混淆小镇</h1>
        <p className="town-subtitle">捏造一个身份，迷惑你的推荐算法。它将在小镇里替你生活。</p>
      </header>

      <div className="town-field">
        <label className="town-label" htmlFor="town-name">
          身份名
        </label>
        <p className="town-hint">不是你的真名——是这个混淆身份的名字</p>
        <input
          id="town-name"
          className="town-input"
          value={identityName}
          maxLength={40}
          placeholder="例如：iohkna、雾、Ronald…"
          onChange={(e) => setIdentityName(e.target.value)}
        />
      </div>

      <div className="town-field">
        <label className="town-label" htmlFor="town-fragment">
          携带的碎片
        </label>
        <p className="town-hint">入镇时你带着的一句话。一个秘密、一句梦话、一个谎言</p>
        <input
          id="town-fragment"
          className="town-input"
          value={fragment}
          maxLength={120}
          placeholder="例如：possible future / 嘘 小心身边"
          onChange={(e) => setFragment(e.target.value)}
        />
      </div>

      {FIELD_META.map(({ field, label, hint }) => (
        <div className="town-field" key={field}>
          <span className="town-label">{label}</span>
          <p className="town-hint">
            {hint}
            {field !== "shell_form" && `（最多${MAX_PER_FIELD}个）`}
          </p>
          <ChipField
            options={vocabulary[field]}
            selected={selections[field] ?? []}
            single={field === "shell_form"}
            onToggle={(value) => toggle(field, value, field === "shell_form")}
          />
        </div>
      ))}

      <label className="town-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          我已阅读并同意：本次提交的混淆身份信息将用于本项目的艺术性机器组织与生成，
          包括公开展示由此生成的虚构叙事。提交内容不应包含真实个人信息。
        </span>
      </label>

      <button type="button" className="town-submit" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "正在入镇…" : "入镇"}
      </button>
      {error && <p className="town-error">{error}</p>}
    </div>
  );
}
