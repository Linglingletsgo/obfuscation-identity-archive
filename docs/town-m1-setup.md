# 混淆小镇 M1 上线手册

## 已实现的内容

**体验流程**：`/town` 入镇表单（13维标签，词表来自43份真实档案）→ 提交 → LLM 审核 →
生成种子记忆 → 与最相似的居民发生"入镇第一夜"相遇 → 分身公开页（`/town/resident/:id`）→
保存分享卡（1080×1350 PNG，前端 canvas 生成）。

**代码结构**：

| 路径 | 作用 |
|---|---|
| `api/town/join.mjs` | POST 入镇：校验+审核+种子记忆+写库 |
| `api/town/encounter.mjs` | POST 相遇：相似度匹配+生成相遇+写双方记忆（幂等） |
| `api/town/resident.mjs` | GET 分身页数据 |
| `api/town/_lib/` | prompts / LLM / Supabase REST / 相似度（零新依赖） |
| `src/town/` | 前端：表单、分身页、手绘头像、分享卡 |
| `supabase/schema.sql` | 建表 SQL |
| `scripts/town-seed-founders.mjs` | 43位原住民播种 |
| `scripts/town-smoke-test.mjs` | 端到端冒烟测试（不需要数据库） |

**设计取舍（M1 刻意不做的）**：
- 头像是确定性手绘 SVG（同一 id 永远同一张脸），AI 生成儿童画头像留到 M1.5
- OG 动态图留到 M2（CJK 字体在 satori 里麻烦），分享靠前端生成的卡片图
- 相似度用标签 Jaccard，不用向量——标签来自固定词表，效果足够且零成本

## 上线步骤（你来操作）

### 1. Supabase（约10分钟）
1. 注册/登录 [supabase.com](https://supabase.com)，创建新项目（区域选 Singapore 或 US West）
2. 左侧 SQL Editor → New query → 粘贴 `supabase/schema.sql` 全部内容 → Run
3. Project Settings → API，记下 **Project URL** 和 **service_role key**（不是 anon key）

### 2. 本地播种原住民（约5分钟，花费 ≈ $0.01）
```bash
cp .env.example .env   # 填入 OPENROUTER_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
export $(grep -v '^#' .env | xargs)
LIMIT=3 npm run town:seed   # 先跑3个，去 Supabase 表里看质量
npm run town:seed            # 满意后跑全部（幂等，重跑只补缺）
```

### 3. Vercel 环境变量
项目 Settings → Environment Variables，添加（Production + Preview 都勾）：
- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. 部署
GitHub Desktop 提交并推送 → Vercel 自动部署 → 打开 `https://你的域名/town` 走一遍完整流程。

### 5. 上线后第一周观察
- Supabase 表 `residents` / `episodes` 的增长
- OpenRouter 控制台用量（设置月度预算告警）
- 哪些分享卡被发出去了（M2 接 `share_events` 埋点）

## 验证命令
```bash
npm run town:smoke   # 端到端 prompt 冒烟（只需 OPENROUTER_API_KEY）
npm run build        # TS + Vite 构建
npm run test:run     # 全部单元测试
```
