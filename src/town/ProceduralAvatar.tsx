/**
 * 确定性手绘头像：同一个居民 id 永远生成同一张脸。
 * 儿童画风格——歪歪扭扭的轮廓、不对称的眼睛、随机的腮红。
 * M1 用它做即时头像；AI 生成的儿童画头像在 M1.5 接入后替换。
 */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ["#f4c95d", "#e85d3a"],
  ["#9ec5ab", "#3a6b5a"],
  ["#c8b8db", "#7a5ba6"],
  ["#f2a0a0", "#c84b4b"],
  ["#a8c8e8", "#3a6ba6"],
  ["#e8d5a0", "#a67c3a"],
];

/** 歪扭闭合轮廓：在圆周上取点并加抖动 */
function wobblyBlob(rng: () => number, cx: number, cy: number, r: number): string {
  const points: Array<[number, number]> = [];
  const n = 9;
  for (let i = 0; i < n; i += 1) {
    const angle = (i / n) * Math.PI * 2;
    const radius = r * (0.82 + rng() * 0.32);
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i <= n; i += 1) {
    const [x0, y0] = points[(i - 1) % n];
    const [x1, y1] = points[i % n];
    const mx = (x0 + x1) / 2 + (rng() - 0.5) * 6;
    const my = (y0 + y1) / 2 + (rng() - 0.5) * 6;
    d += ` Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return `${d} Z`;
}

export function ProceduralAvatar({ residentId, size = 160 }: { residentId: string; size?: number }) {
  const rng = makeRng(hashString(residentId));
  const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
  const face = wobblyBlob(rng, 50, 52, 32);
  const eyeLY = 46 + (rng() - 0.5) * 6;
  const eyeRY = 46 + (rng() - 0.5) * 6;
  const eyeLX = 38 + (rng() - 0.5) * 4;
  const eyeRX = 60 + (rng() - 0.5) * 4;
  const eyeLR = 2 + rng() * 1.8;
  const eyeRR = 2 + rng() * 1.8;
  const mouthY = 62 + rng() * 6;
  const mouthCurve = (rng() - 0.35) * 14;
  const hasAntenna = rng() > 0.5;
  const hasBlush = rng() > 0.4;
  const tilt = (rng() - 0.5) * 8;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label="居民头像">
      <g transform={`rotate(${tilt.toFixed(1)} 50 50)`}>
        <path d={face} fill={palette[0]} stroke="#1a1a1a" strokeWidth="2.2" strokeLinejoin="round" />
        {hasAntenna && (
          <path
            d={`M 50 ${20 + rng() * 4} q ${(rng() - 0.5) * 16} -10 ${(rng() - 0.5) * 10} -14`}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        <circle cx={eyeLX} cy={eyeLY} r={eyeLR} fill="#1a1a1a" />
        <circle cx={eyeRX} cy={eyeRY} r={eyeRR} fill="#1a1a1a" />
        <path
          d={`M ${44 + (rng() - 0.5) * 4} ${mouthY} q 6 ${mouthCurve} 13 ${(rng() - 0.5) * 4}`}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {hasBlush && (
          <>
            <circle cx={eyeLX - 6} cy={eyeLY + 10} r="3.4" fill={palette[1]} opacity="0.5" />
            <circle cx={eyeRX + 6} cy={eyeRY + 10} r="3.4" fill={palette[1]} opacity="0.5" />
          </>
        )}
      </g>
    </svg>
  );
}
