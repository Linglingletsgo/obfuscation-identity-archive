# 3D Archive Avatar-Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready immersive archive frontend in `obfuscation-identity-archive` that opens into the Stage5 collective avatar-map, organizes the existing `public/` algorithm data into a Three.js relationship graph, and supports Stage0-4 detail navigation with resilient asset fallbacks.

**Architecture:** Create a Vite + React + TypeScript application around the already-prepared `public/` runtime assets. Keep data organization isolated in typed loader/builder modules, keep visual rules in one config file, and keep 3D rendering components separate from stage/timeline/detail UI so missing assets or WebGL failure do not break archive reading.

**Tech Stack:** Vite, React, TypeScript, Three.js, React Three Fiber, Drei, Vitest, Testing Library, Playwright, Node scripts.

---

## Current Repository Facts

- Repository path: `/Volumes/Acasis/1学业相关/_FashionFutures/RIF2/general/obfuscation-identity-archive`
- GitHub private repo: `https://github.com/Linglingletsgo/obfuscation-identity-archive`
- Existing app framework: none. There is no `package.json`, `src/`, `app/`, `pages/`, or routing setup.
- Existing runtime source: `public/` only, plus `codex_fullstack_3d_archive_requirement_v7.md`.
- Algorithm graph: `public/data/algorithm/interaction_graph_real_submissions_10.json`
- Timeline graph: `public/data/algorithm/timeline/anchor_timeline_real_submissions_10.json`
- Confirmed sample counts: 10 identity nodes, 45 identity interaction edges, 249 unique tag display labels, 10 anchors, 300 Stage0-4 timeline items, 1 global Stage5 item.
- Confirmed asset status: Stage5 GLB exists, `public/models/stage4/default-stage4.glb` exists, one Stage0 PNG is missing for the 10 graph identities, all Stage1-3 PNGs are missing, all timeline-specific Stage4 GLBs are missing.

## File Structure

- Create `package.json`: dependency and script entrypoint for app, tests, audit, validation, and graph cache.
- Create `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `playwright.config.ts`: project tooling.
- Create `src/main.tsx`, `src/App.tsx`, `src/styles/archive.css`: application shell and global styling.
- Create `src/config/archiveVisualConfig.ts`: centralized visual, asset, timeline, camera, WebGL, and fallback rules.
- Create `src/types/archive.ts`: source and organized graph/timeline types.
- Create `src/data/archivePaths.ts`: canonical public runtime paths and asset resolver helpers.
- Create `src/data/archiveLoaders.ts`: browser JSON loading with runtime validation and helpful errors.
- Create `src/data/eventNormalization.ts`: normalize timeline string events and graph object events.
- Create `src/data/relationshipGraphBuilder.ts`: build identity/tag/timeline/asset/collective graph nodes and links from structured data.
- Create `src/data/layout3d.ts`: deterministic seeded 3D coordinates with semantic stage/depth mapping.
- Create `src/state/archiveStore.tsx`: React state provider for selected stage, anchor, timeline item, filters, selected node, and graph data.
- Create `src/components/ArchiveExperience.tsx`: orchestrates Stage5 home and Stage0-4 detail states.
- Create `src/components/StageScene.tsx`: 3D scene switch for collective, detail avatar, graph, and fallback states.
- Create `src/components/RelationshipGraph3D.tsx`: Three/R3F graph renderer, hover/click, highlighting, link density, camera fit hooks.
- Create `src/components/AvatarPointCloud.tsx`: GLB-to-points renderer with fallback model shell.
- Create `src/components/Graph3DControls.tsx`: search, filters, toggles, reset camera.
- Create `src/components/Graph3DDetailPanel.tsx`: selected node/detail metadata panel.
- Create `src/components/BranchingTimeline.tsx`: Stage0-4 branching timeline control and Stage5 return.
- Create `src/components/MetadataSidebar.tsx`: Stage0-4 metadata sidebar.
- Create `src/components/AvatarImage.tsx`: PNG avatar display with runtime near-white removal.
- Create `src/components/FallbackStates.tsx`: loading, error, empty, missing asset, and WebGL unavailable states.
- Create `scripts/audit-algorithm-output.mjs`: writes `docs/algorithm-audit.md`.
- Create `scripts/build-graph3d-cache.mjs`: writes optional `public/data/graph/relationship_graph_3d.json`.
- Create `scripts/validate-archive-data.mjs`: validates source data, organized graph, links, cardinality, and asset fallback expectations.
- Create `docs/algorithm-audit.md`: generated audit output.
- Create `docs/hand-drawn-ui-asset-list.md`: hand-drawn asset handoff document.
- Create `docs/archive-3d-data-flow.md`: data organization and customization guide.
- Create tests under `src/**/*.test.ts` and `src/**/*.test.tsx`.
- Create Playwright smoke test under `tests/e2e/archive-experience.spec.ts`.

## Task 1: Project Tooling and App Skeleton

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/archive.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Create the failing shell test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders the archive experience root", () => {
    render(<App />);
    expect(screen.getByTestId("archive-experience")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx --run`

Expected: FAIL because `package.json`, test tooling, and `src/App.tsx` do not exist yet.

- [ ] **Step 3: Create package and tooling files**

Create `package.json`:

```json
{
  "name": "obfuscation-identity-archive",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "audit:algorithm": "node scripts/audit-algorithm-output.mjs",
    "build:graph3d-cache": "node scripts/build-graph3d-cache.mjs",
    "validate:archive-data": "node scripts/validate-archive-data.mjs"
  },
  "dependencies": {
    "@react-three/drei": "^9.122.0",
    "@react-three/fiber": "^8.17.10",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.171.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@types/three": "^0.171.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Obfuscation Identity Archive</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Create minimal app shell**

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/archive.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="archive-app" data-testid="archive-experience">
      <section className="archive-loading">Collective archive loading</section>
    </main>
  );
}
```

Create `src/styles/archive.css`:

```css
:root {
  color: #18140f;
  background: #f7f2e7;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

.archive-app {
  min-height: 100vh;
  background: #f7f2e7;
}

.archive-loading {
  display: grid;
  min-height: 100vh;
  place-items: center;
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: creates `package-lock.json` and installs dependencies without peer dependency errors.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx --run`

Expected: PASS for `App shell`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json vitest.config.ts playwright.config.ts src
git commit -m "chore: scaffold archive frontend"
```

## Task 2: Archive Types, Paths, and Visual Config

**Files:**
- Create: `src/types/archive.ts`
- Create: `src/data/archivePaths.ts`
- Create: `src/config/archiveVisualConfig.ts`
- Test: `src/data/archivePaths.test.ts`

- [ ] **Step 1: Write path resolver tests**

Create `src/data/archivePaths.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getAvatarAssetPath, getModelAssetPath } from "./archivePaths";

describe("archive path helpers", () => {
  it("resolves Stage0 avatars by submission id", () => {
    expect(getAvatarAssetPath({ stage: 0, submissionId: "submission_a" })).toBe(
      "/assets/avatars/stage0/submission_a.png",
    );
  });

  it("resolves Stage1-3 avatars by timeline item id", () => {
    expect(getAvatarAssetPath({ stage: 2, timelineItemId: "item_b" })).toBe(
      "/assets/avatars/stage2/item_b.png",
    );
  });

  it("resolves Stage4 and Stage5 models", () => {
    expect(getModelAssetPath({ stage: 4, timelineItemId: "item_c" })).toBe(
      "/models/stage4/item_c.glb",
    );
    expect(getModelAssetPath({ stage: 5 })).toBe("/models/stage5.glb");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/data/archivePaths.test.ts --run`

Expected: FAIL because `archivePaths.ts` does not exist.

- [ ] **Step 3: Add source and organized data types**

Create `src/types/archive.ts`:

```ts
export type ArchiveStage = 0 | 1 | 2 | 3 | 4 | 5;

export type SourceGraphTag = {
  label: string;
  category?: string;
  role?: string;
  definition_source?: string;
  mobility?: number;
  stability?: number;
  contamination?: number;
  visibility?: number;
  confidence?: number;
};

export type SourceGraphNode = {
  id: string;
  type: string;
  label?: string;
  shell_form?: string;
  tag_count?: number;
  roles?: Record<string, number>;
  tags?: SourceGraphTag[];
  tag_labels?: string[];
  text_fragments?: {
    carriedFragment?: string;
  };
  consent?: unknown;
};

export type SourceGraphEvent = string | {
  type?: string;
  visual?: string;
  intensity?: number;
};

export type SourceGraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  scores?: Record<string, number>;
  evidence?: {
    sharedTags?: string[];
    sharedPlaces?: string[];
    conflictPairs?: [string, string][];
  };
  events?: SourceGraphEvent[];
};

export type SourceInteractionGraph = {
  algorithm?: string;
  version?: string;
  generated_at?: string;
  source_count?: number;
  nodes: SourceGraphNode[];
  edges: SourceGraphEdge[];
};

export type TimelineSourceText = {
  submission_id: string;
  identity_name?: string;
  carried_fragment?: string;
};

export type TimelineItem = {
  timeline_item_id: string;
  anchor_id: string | null;
  stage: ArchiveStage;
  stage_name?: string;
  generation_mode?: string;
  source_ids: string[];
  source_texts: TimelineSourceText[];
  group_size: number;
  interaction_type?: string;
  scores?: Record<string, number>;
  events?: SourceGraphEvent[];
  avatar_vector?: Record<string, number>;
  avatar_tags?: Record<string, string[]>;
  active_tags_preview?: string[];
  preset_hint?: string;
  scoring_ref?: string;
};

export type TimelineAnchor = {
  anchor_id: string;
  identity_name?: string;
  global_collective_ref?: string;
  item_count?: number;
  items: TimelineItem[];
};

export type SourceTimeline = {
  timeline_id?: string;
  mode?: string;
  generated_at?: string;
  source_graph?: string;
  source_count?: number;
  budgets?: Record<string, number>;
  stage_names?: Record<string, string>;
  generation_modes?: Record<string, string>;
  global_collective_item: TimelineItem;
  anchors: TimelineAnchor[];
};

export type NormalizedArchiveEvent = {
  type: string;
  visual: string;
  intensity: number;
  source: "graph" | "timeline";
};

export type ArchiveNodeType = "submission" | "tag" | "timeline_item" | "anchor" | "asset" | "collective";

export type ArchiveLinkType =
  | "interaction"
  | "shared_tag"
  | "conflict_tag"
  | "source_membership"
  | "anchor_membership"
  | "stage_transition"
  | "asset_link";

export type ArchiveGraphNode = {
  id: string;
  type: ArchiveNodeType;
  stage?: ArchiveStage;
  anchor_id?: string | null;
  source_ids: string[];
  identity_name?: string;
  carried_fragment?: string;
  tags: SourceGraphTag[];
  tag_labels: string[];
  scores: Record<string, number>;
  events: NormalizedArchiveEvent[];
  avatar_vector?: Record<string, number>;
  avatar_tags?: Record<string, string[]>;
  asset_path?: string;
  model_path?: string;
  position: { x: number; y: number; z: number };
  visual: {
    size: number;
    color_group: string;
    opacity: number;
    label: string;
    node_shape: "custom" | "sprite" | "particle" | "mark";
    node_style_key: string;
  };
};

export type ArchiveGraphLink = {
  id: string;
  source: string;
  target: string;
  type: ArchiveLinkType;
  weight: number;
  scores: Record<string, number>;
  events: NormalizedArchiveEvent[];
  visual: {
    style_key: string;
    opacity: number;
    thickness: number;
    dash: boolean;
  };
};

export type ArchiveGraph = {
  nodes: ArchiveGraphNode[];
  links: ArchiveGraphLink[];
  metadata: {
    layout: "deterministic-avatar-map";
    seed: string;
    source_files: string[];
    generated_at: string;
  };
};
```

- [ ] **Step 4: Add visual config and path helpers**

Create `src/config/archiveVisualConfig.ts`:

```ts
export const archiveVisualConfig = {
  data: {
    interactionGraphPath: "/data/algorithm/interaction_graph_real_submissions_10.json",
    timelinePath: "/data/algorithm/timeline/anchor_timeline_real_submissions_10.json",
    graphCachePath: "/data/graph/relationship_graph_3d.json",
  },
  assets: {
    nearWhiteThreshold: 245,
    stage4DefaultModelPath: "/models/stage4/default-stage4.glb",
    stage5ModelPath: "/models/stage5.glb",
    placeholderAvatarPath: "",
    placeholderModelPath: "",
  },
  camera: {
    stage5Position: [0, 4.5, 16] as const,
    detailPosition: [0, 2.8, 8] as const,
    minDistance: 3,
    maxDistance: 42,
  },
  graph: {
    seed: "obfuscation-identity-archive-v1",
    defaultLinkDensity: 0.65,
    identityNodeSize: 1.2,
    tagNodeSize: 0.42,
    timelineNodeSize: 0.62,
    collectiveNodeSize: 2.4,
    hoverGlow: 1.8,
    conflictThreshold: 0.5,
  },
  stages: {
    sidebarVisible: [0, 1, 2, 3, 4],
    timelineVisible: [0, 1, 2, 3, 4],
    mainUiStageLabelsVisible: false,
  },
  colors: {
    paper: "#f7f2e7",
    ink: "#18140f",
    identity: "#e34d35",
    tag: "#2f7f6f",
    shared: "#3b6fb6",
    conflict: "#b02e4a",
    timeline: "#7a5cbd",
    collective: "#252525",
    missing: "#8b8172",
  },
} as const;
```

Create `src/data/archivePaths.ts`:

```ts
import type { ArchiveStage } from "../types/archive";
import { archiveVisualConfig } from "../config/archiveVisualConfig";

type AvatarPathInput = {
  stage: ArchiveStage;
  submissionId?: string;
  timelineItemId?: string;
};

type ModelPathInput = {
  stage: ArchiveStage;
  timelineItemId?: string;
};

export function getAvatarAssetPath(input: AvatarPathInput): string {
  if (input.stage === 0 && input.submissionId) {
    return `/assets/avatars/stage0/${input.submissionId}.png`;
  }

  if ((input.stage === 1 || input.stage === 2 || input.stage === 3) && input.timelineItemId) {
    return `/assets/avatars/stage${input.stage}/${input.timelineItemId}.png`;
  }

  return archiveVisualConfig.assets.placeholderAvatarPath;
}

export function getModelAssetPath(input: ModelPathInput): string {
  if (input.stage === 4 && input.timelineItemId) {
    return `/models/stage4/${input.timelineItemId}.glb`;
  }

  if (input.stage === 5) {
    return archiveVisualConfig.assets.stage5ModelPath;
  }

  return "";
}

export function getStage4FallbackModelPath(): string {
  return archiveVisualConfig.assets.stage4DefaultModelPath;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/data/archivePaths.test.ts --run`

Expected: PASS for all path resolver tests.

- [ ] **Step 6: Commit**

```bash
git add src/types/archive.ts src/data/archivePaths.ts src/config/archiveVisualConfig.ts src/data/archivePaths.test.ts
git commit -m "feat: add archive types and asset path config"
```

## Task 3: Data Loading and Event Normalization

**Files:**
- Create: `src/data/eventNormalization.ts`
- Create: `src/data/archiveLoaders.ts`
- Test: `src/data/eventNormalization.test.ts`
- Test: `src/data/archiveLoaders.test.ts`

- [ ] **Step 1: Write normalization tests**

Create `src/data/eventNormalization.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeEvents } from "./eventNormalization";

describe("normalizeEvents", () => {
  it("normalizes timeline string events", () => {
    expect(normalizeEvents(["profile_glitch"], "timeline")).toEqual([
      { type: "profile_glitch", visual: "profile_glitch", intensity: 1, source: "timeline" },
    ]);
  });

  it("normalizes graph object events", () => {
    expect(normalizeEvents([{ type: "surface_mask", visual: "mask label", intensity: 0.4 }], "graph")).toEqual([
      { type: "surface_mask", visual: "mask label", intensity: 0.4, source: "graph" },
    ]);
  });
});
```

- [ ] **Step 2: Write loader validation tests**

Create `src/data/archiveLoaders.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assertInteractionGraph, assertTimeline } from "./archiveLoaders";

describe("archive source validators", () => {
  it("accepts a graph with nodes and edges arrays", () => {
    expect(() => assertInteractionGraph({ nodes: [], edges: [] })).not.toThrow();
  });

  it("rejects a graph without edges array", () => {
    expect(() => assertInteractionGraph({ nodes: [] })).toThrow("interaction graph");
  });

  it("accepts a timeline with anchors and a global collective item", () => {
    expect(() => assertTimeline({ anchors: [], global_collective_item: { timeline_item_id: "global", stage: 5, anchor_id: null, source_ids: [], source_texts: [], group_size: 0 } })).not.toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/data/eventNormalization.test.ts src/data/archiveLoaders.test.ts --run`

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement event normalization and browser loaders**

Create `src/data/eventNormalization.ts`:

```ts
import type { NormalizedArchiveEvent, SourceGraphEvent } from "../types/archive";

export function normalizeEvents(
  events: SourceGraphEvent[] | undefined,
  source: "graph" | "timeline",
): NormalizedArchiveEvent[] {
  return (events ?? []).map((event) => {
    if (typeof event === "string") {
      return { type: event, visual: event, intensity: 1, source };
    }

    const type = event.type?.trim() || "unknown_event";
    return {
      type,
      visual: event.visual?.trim() || type,
      intensity: typeof event.intensity === "number" ? event.intensity : 1,
      source,
    };
  });
}
```

Create `src/data/archiveLoaders.ts`:

```ts
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { SourceInteractionGraph, SourceTimeline } from "../types/archive";

export function assertInteractionGraph(value: unknown): asserts value is SourceInteractionGraph {
  const graph = value as SourceInteractionGraph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("Invalid interaction graph: expected top-level nodes and edges arrays.");
  }
}

export function assertTimeline(value: unknown): asserts value is SourceTimeline {
  const timeline = value as SourceTimeline;
  if (!timeline || !Array.isArray(timeline.anchors) || !timeline.global_collective_item) {
    throw new Error("Invalid timeline: expected anchors array and global_collective_item.");
  }
}

async function loadJson<T>(path: string, assertValue: (value: unknown) => asserts value is T): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status} ${response.statusText}`);
  }

  const value: unknown = await response.json();
  assertValue(value);
  return value;
}

export async function loadArchiveSources(): Promise<{
  graph: SourceInteractionGraph;
  timeline: SourceTimeline;
}> {
  const [graph, timeline] = await Promise.all([
    loadJson(archiveVisualConfig.data.interactionGraphPath, assertInteractionGraph),
    loadJson(archiveVisualConfig.data.timelinePath, assertTimeline),
  ]);

  return { graph, timeline };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/data/eventNormalization.test.ts src/data/archiveLoaders.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/eventNormalization.ts src/data/archiveLoaders.ts src/data/eventNormalization.test.ts src/data/archiveLoaders.test.ts
git commit -m "feat: load and normalize archive source data"
```

## Task 4: Deterministic 3D Graph Builder

**Files:**
- Create: `src/data/layout3d.ts`
- Create: `src/data/relationshipGraphBuilder.ts`
- Test: `src/data/relationshipGraphBuilder.test.ts`

- [ ] **Step 1: Write graph builder tests**

Create `src/data/relationshipGraphBuilder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SourceInteractionGraph, SourceTimeline } from "../types/archive";
import { buildArchiveGraph } from "./relationshipGraphBuilder";

const graph: SourceInteractionGraph = {
  nodes: [
    {
      id: "submission_a",
      type: "identity",
      label: "Name A",
      tags: [
        { label: "Dream", category: "places", role: "location" },
        { label: "Dream", category: "material_sources", role: "residue" },
      ],
      text_fragments: { carriedFragment: "Fragment A" },
    },
    {
      id: "submission_b",
      type: "identity",
      label: "Name B",
      tags: [{ label: "Dream", category: "places", role: "location" }],
      text_fragments: { carriedFragment: "Fragment B" },
    },
  ],
  edges: [
    {
      id: "a_b",
      source: "submission_a",
      target: "submission_b",
      relation: "obfuscation_interaction",
      scores: { total: 0.7, conflict: 0.6 },
      evidence: { sharedTags: ["Dream"], conflictPairs: [["Predictable user", "Unpredictable user"]] },
      events: [{ type: "profile_glitch", visual: "split identity", intensity: 0.5 }],
    },
  ],
};

const timeline: SourceTimeline = {
  global_collective_item: {
    timeline_item_id: "global_stage5_collective",
    anchor_id: null,
    stage: 5,
    source_ids: ["submission_a", "submission_b"],
    source_texts: [],
    group_size: 2,
  },
  anchors: [
    {
      anchor_id: "submission_a",
      items: [
        {
          timeline_item_id: "submission_a_stage0_000",
          anchor_id: "submission_a",
          stage: 0,
          source_ids: ["submission_a"],
          source_texts: [{ submission_id: "submission_a", identity_name: "Name A", carried_fragment: "Fragment A" }],
          group_size: 1,
          events: ["surface_mask"],
        },
      ],
    },
  ],
};

describe("buildArchiveGraph", () => {
  it("creates identity, unique tag, timeline, and collective nodes", () => {
    const result = buildArchiveGraph(graph, timeline);
    expect(result.nodes.some((node) => node.id === "submission_a" && node.type === "submission")).toBe(true);
    expect(result.nodes.some((node) => node.id === "tag:Dream" && node.type === "tag")).toBe(true);
    expect(result.nodes.some((node) => node.id === "timeline:submission_a_stage0_000")).toBe(true);
    expect(result.nodes.some((node) => node.id === "collective:global_stage5_collective")).toBe(true);
  });

  it("creates shared, conflict, interaction, and source membership links with valid endpoints", () => {
    const result = buildArchiveGraph(graph, timeline);
    const ids = new Set(result.nodes.map((node) => node.id));
    expect(result.links.some((link) => link.type === "interaction")).toBe(true);
    expect(result.links.some((link) => link.type === "shared_tag")).toBe(true);
    expect(result.links.some((link) => link.type === "conflict_tag")).toBe(true);
    expect(result.links.some((link) => link.type === "source_membership")).toBe(true);
    expect(result.links.every((link) => ids.has(link.source) && ids.has(link.target))).toBe(true);
  });

  it("assigns stable 3D positions", () => {
    const first = buildArchiveGraph(graph, timeline);
    const second = buildArchiveGraph(graph, timeline);
    expect(first.nodes.map((node) => node.position)).toEqual(second.nodes.map((node) => node.position));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/data/relationshipGraphBuilder.test.ts --run`

Expected: FAIL because builder modules do not exist.

- [ ] **Step 3: Implement deterministic layout helpers**

Create `src/data/layout3d.ts`:

```ts
import type { ArchiveGraphNode, ArchiveStage } from "../types/archive";

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizedHash(value: string): number {
  return hashString(value) / 4294967295;
}

export function semanticStageZ(stage: ArchiveStage | undefined): number {
  if (stage === undefined) return 0;
  return [-7, -4, -1.5, 1.5, 4, 7][stage];
}

export function deterministicPosition(id: string, stage: ArchiveStage | undefined, radius = 7) {
  const a = normalizedHash(`${id}:a`) * Math.PI * 2;
  const r = radius * (0.35 + normalizedHash(`${id}:r`) * 0.65);
  const y = (normalizedHash(`${id}:y`) - 0.5) * radius;
  return {
    x: Math.cos(a) * r,
    y,
    z: semanticStageZ(stage) + Math.sin(a) * r * 0.35,
  };
}

export function withPosition<T extends Omit<ArchiveGraphNode, "position">>(node: T): T & Pick<ArchiveGraphNode, "position"> {
  return {
    ...node,
    position: deterministicPosition(node.id, node.stage),
  };
}
```

- [ ] **Step 4: Implement graph builder**

Create `src/data/relationshipGraphBuilder.ts`:

```ts
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { getAvatarAssetPath, getModelAssetPath } from "./archivePaths";
import { normalizeEvents } from "./eventNormalization";
import { withPosition } from "./layout3d";
import type {
  ArchiveGraph,
  ArchiveGraphLink,
  ArchiveGraphNode,
  SourceGraphNode,
  SourceGraphTag,
  SourceInteractionGraph,
  SourceTimeline,
  TimelineItem,
} from "../types/archive";

function tagId(label: string): string {
  return `tag:${label}`;
}

function timelineId(id: string): string {
  return `timeline:${id}`;
}

function collectiveId(id: string): string {
  return `collective:${id}`;
}

function linkId(source: string, target: string, type: string): string {
  return `${type}:${source}->${target}`;
}

function uniqueLabels(tags: SourceGraphTag[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.label).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function createIdentityNode(node: SourceGraphNode): ArchiveGraphNode {
  const labels = uniqueLabels(node.tags);
  return withPosition({
    id: node.id,
    type: "submission",
    stage: 0,
    source_ids: [node.id],
    identity_name: node.label || node.id,
    carried_fragment: node.text_fragments?.carriedFragment || "",
    tags: node.tags ?? [],
    tag_labels: labels,
    scores: {},
    events: [],
    asset_path: getAvatarAssetPath({ stage: 0, submissionId: node.id }),
    visual: {
      size: archiveVisualConfig.graph.identityNodeSize,
      color_group: "identity",
      opacity: 1,
      label: `Name: ${node.label || node.id}\n${node.text_fragments?.carriedFragment || ""}`.trim(),
      node_shape: "mark",
      node_style_key: "identity-center",
    },
  });
}

function createTagNodes(sourceNodes: SourceGraphNode[]): ArchiveGraphNode[] {
  const byLabel = new Map<string, SourceGraphTag[]>();
  for (const node of sourceNodes) {
    for (const tag of node.tags ?? []) {
      const current = byLabel.get(tag.label) ?? [];
      current.push(tag);
      byLabel.set(tag.label, current);
    }
  }

  return [...byLabel.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, tags]) =>
    withPosition({
      id: tagId(label),
      type: "tag",
      stage: 5,
      source_ids: [],
      tags,
      tag_labels: [label],
      scores: {},
      events: [],
      visual: {
        size: archiveVisualConfig.graph.tagNodeSize,
        color_group: "tag",
        opacity: 0.78,
        label,
        node_shape: "particle",
        node_style_key: "tag-node",
      },
    }),
  );
}

function createTimelineNode(item: TimelineItem): ArchiveGraphNode {
  const assetPath = item.stage <= 3
    ? getAvatarAssetPath({ stage: item.stage, timelineItemId: item.timeline_item_id, submissionId: item.source_ids[0] })
    : undefined;
  const modelPath = item.stage >= 4 ? getModelAssetPath({ stage: item.stage, timelineItemId: item.timeline_item_id }) : undefined;

  return withPosition({
    id: timelineId(item.timeline_item_id),
    type: "timeline_item",
    stage: item.stage,
    anchor_id: item.anchor_id,
    source_ids: item.source_ids,
    identity_name: item.source_texts[0]?.identity_name,
    carried_fragment: item.source_texts[0]?.carried_fragment,
    tags: [],
    tag_labels: item.active_tags_preview ?? [],
    scores: item.scores ?? {},
    events: normalizeEvents(item.events, "timeline"),
    avatar_vector: item.avatar_vector,
    avatar_tags: item.avatar_tags,
    asset_path: assetPath,
    model_path: modelPath,
    visual: {
      size: archiveVisualConfig.graph.timelineNodeSize,
      color_group: "timeline",
      opacity: 0.72,
      label: item.stage_name || item.timeline_item_id,
      node_shape: "custom",
      node_style_key: `timeline-stage-${item.stage}`,
    },
  });
}

function createCollectiveNode(item: TimelineItem): ArchiveGraphNode {
  return withPosition({
    id: collectiveId(item.timeline_item_id),
    type: "collective",
    stage: 5,
    anchor_id: null,
    source_ids: item.source_ids,
    tags: [],
    tag_labels: [],
    scores: item.scores ?? {},
    events: normalizeEvents(item.events, "timeline"),
    avatar_vector: item.avatar_vector,
    avatar_tags: item.avatar_tags,
    model_path: getModelAssetPath({ stage: 5 }),
    visual: {
      size: archiveVisualConfig.graph.collectiveNodeSize,
      color_group: "collective",
      opacity: 0.52,
      label: "Collective Absorption",
      node_shape: "particle",
      node_style_key: "collective-avatar-map",
    },
  });
}

function addLink(links: ArchiveGraphLink[], link: Omit<ArchiveGraphLink, "id">): void {
  links.push({ id: linkId(link.source, link.target, link.type), ...link });
}

export function buildArchiveGraph(graph: SourceInteractionGraph, timeline: SourceTimeline): ArchiveGraph {
  const nodes: ArchiveGraphNode[] = [];
  const links: ArchiveGraphLink[] = [];

  nodes.push(...graph.nodes.map(createIdentityNode));
  nodes.push(...createTagNodes(graph.nodes));

  const timelineItems = timeline.anchors.flatMap((anchor) => anchor.items);
  nodes.push(...timelineItems.map(createTimelineNode));
  nodes.push(createCollectiveNode(timeline.global_collective_item));

  for (const sourceNode of graph.nodes) {
    for (const label of uniqueLabels(sourceNode.tags)) {
      addLink(links, {
        source: sourceNode.id,
        target: tagId(label),
        type: "shared_tag",
        weight: 1,
        scores: {},
        events: [],
        visual: { style_key: "shared-tag", opacity: 0.28, thickness: 0.6, dash: false },
      });
    }
  }

  for (const edge of graph.edges) {
    addLink(links, {
      source: edge.source,
      target: edge.target,
      type: "interaction",
      weight: edge.scores?.total ?? 1,
      scores: edge.scores ?? {},
      events: normalizeEvents(edge.events, "graph"),
      visual: { style_key: "interaction", opacity: 0.5, thickness: 1.2, dash: false },
    });

    for (const pair of edge.evidence?.conflictPairs ?? []) {
      for (const label of pair) {
        if (graph.nodes.some((node) => uniqueLabels(node.tags).includes(label))) {
          addLink(links, {
            source: edge.source,
            target: tagId(label),
            type: "conflict_tag",
            weight: edge.scores?.conflict ?? 1,
            scores: edge.scores ?? {},
            events: normalizeEvents(edge.events, "graph"),
            visual: { style_key: "conflict-glitch", opacity: 0.72, thickness: 1, dash: true },
          });
        }
      }
    }
  }

  for (const item of timelineItems) {
    for (const sourceId of item.source_ids) {
      addLink(links, {
        source: sourceId,
        target: timelineId(item.timeline_item_id),
        type: "source_membership",
        weight: 1,
        scores: item.scores ?? {},
        events: normalizeEvents(item.events, "timeline"),
        visual: { style_key: "source-membership", opacity: 0.34, thickness: 0.8, dash: false },
      });
    }

    if (item.anchor_id) {
      addLink(links, {
        source: item.anchor_id,
        target: timelineId(item.timeline_item_id),
        type: "anchor_membership",
        weight: 1,
        scores: item.scores ?? {},
        events: normalizeEvents(item.events, "timeline"),
        visual: { style_key: "anchor-membership", opacity: 0.44, thickness: 1, dash: false },
      });
    }
  }

  for (const sourceId of timeline.global_collective_item.source_ids) {
    addLink(links, {
      source: sourceId,
      target: collectiveId(timeline.global_collective_item.timeline_item_id),
      type: "source_membership",
      weight: 1,
      scores: timeline.global_collective_item.scores ?? {},
      events: normalizeEvents(timeline.global_collective_item.events, "timeline"),
      visual: { style_key: "collective-membership", opacity: 0.3, thickness: 0.7, dash: false },
    });
  }

  const validIds = new Set(nodes.map((node) => node.id));
  const validLinks = links.filter((link) => validIds.has(link.source) && validIds.has(link.target));

  return {
    nodes,
    links: validLinks,
    metadata: {
      layout: "deterministic-avatar-map",
      seed: archiveVisualConfig.graph.seed,
      source_files: [
        archiveVisualConfig.data.interactionGraphPath,
        archiveVisualConfig.data.timelinePath,
      ],
      generated_at: new Date(0).toISOString(),
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/data/relationshipGraphBuilder.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/layout3d.ts src/data/relationshipGraphBuilder.ts src/data/relationshipGraphBuilder.test.ts
git commit -m "feat: build deterministic archive relationship graph"
```

## Task 5: Node Scripts for Audit, Validation, and Optional Cache

**Files:**
- Create: `scripts/archive-core.mjs`
- Create: `scripts/audit-algorithm-output.mjs`
- Create: `scripts/validate-archive-data.mjs`
- Create: `scripts/build-graph3d-cache.mjs`
- Create/Generate: `docs/algorithm-audit.md`
- Create/Generate: `public/data/graph/relationship_graph_3d.json`

- [ ] **Step 1: Write script smoke checks**

Run before implementation:

```bash
npm run audit:algorithm
npm run validate:archive-data
npm run build:graph3d-cache
```

Expected: all three FAIL because scripts do not exist.

- [ ] **Step 2: Implement shared script utilities**

Create `scripts/archive-core.mjs`:

```js
import fs from "node:fs";
import path from "node:path";

export const repoRoot = process.cwd();
export const graphPath = path.join(repoRoot, "public/data/algorithm/interaction_graph_real_submissions_10.json");
export const timelinePath = path.join(repoRoot, "public/data/algorithm/timeline/anchor_timeline_real_submissions_10.json");

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function uniqueTagLabels(graph) {
  return [...new Set(graph.nodes.flatMap((node) => (node.tags || []).map((tag) => tag.label)).filter(Boolean))].sort();
}

export function timelineItems(timeline) {
  return timeline.anchors.flatMap((anchor) => anchor.items || []);
}

export function assetExists(publicPath) {
  return fs.existsSync(path.join(repoRoot, "public", publicPath.replace(/^\//, "")));
}
```

- [ ] **Step 3: Implement audit script**

Create `scripts/audit-algorithm-output.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { assetExists, ensureDir, graphPath, readJson, timelineItems, timelinePath, uniqueTagLabels } from "./archive-core.mjs";

const graph = readJson(graphPath);
const timeline = readJson(timelinePath);
const identities = new Set(graph.nodes.map((node) => node.id));
const items = timelineItems(timeline);
const badEdges = graph.edges.filter((edge) => !identities.has(edge.source) || !identities.has(edge.target));
const badTimelineSources = items.flatMap((item) => item.source_ids.filter((id) => !identities.has(id)).map((id) => ({ item: item.timeline_item_id, id })));
const stageCounts = Object.fromEntries([0, 1, 2, 3, 4, 5].map((stage) => [stage, 0]));
for (const item of items) stageCounts[item.stage] += 1;
stageCounts[5] = timeline.global_collective_item ? 1 : 0;
const cardinalityProblems = items.filter((item) => item.stage + 1 !== item.group_size || item.source_ids.length !== item.group_size || item.source_texts.length !== item.group_size);
const missingStage0 = graph.nodes.filter((node) => !assetExists(`/assets/avatars/stage0/${node.id}.png`)).map((node) => node.id);
const missingStage1 = items.filter((item) => item.stage === 1 && !assetExists(`/assets/avatars/stage1/${item.timeline_item_id}.png`)).length;
const missingStage2 = items.filter((item) => item.stage === 2 && !assetExists(`/assets/avatars/stage2/${item.timeline_item_id}.png`)).length;
const missingStage3 = items.filter((item) => item.stage === 3 && !assetExists(`/assets/avatars/stage3/${item.timeline_item_id}.png`)).length;
const missingStage4 = items.filter((item) => item.stage === 4 && !assetExists(`/models/stage4/${item.timeline_item_id}.glb`)).length;

const report = `# Algorithm Audit

## Summary

- Node types: ${[...new Set(graph.nodes.map((node) => node.type))].join(", ")}
- Edge relation types: ${[...new Set(graph.edges.map((edge) => edge.relation))].join(", ")}
- Identity nodes: ${graph.nodes.length}
- Identity interaction edges: ${graph.edges.length}
- Unique tag display labels: ${uniqueTagLabels(graph).length}
- Anchors: ${timeline.anchors.length}
- Timeline items under anchors: ${items.length}
- Stage item counts: ${JSON.stringify(stageCounts)}
- Stage5 source: ${timeline.global_collective_item ? "global_collective_item" : "missing"}

## Resolution Checks

- Edges with unresolved endpoints: ${badEdges.length}
- Timeline source_ids not resolving to identity nodes: ${badTimelineSources.length}
- Stage/source cardinality problems: ${cardinalityProblems.length}
- Stage5 is global: ${Boolean(timeline.global_collective_item)}

## Field Availability

- Graph identity tags present: ${graph.nodes.every((node) => Array.isArray(node.tags))}
- Graph edge scores present: ${graph.edges.every((edge) => Boolean(edge.scores))}
- Graph edge events present: ${graph.edges.some((edge) => Array.isArray(edge.events))}
- Timeline scores present: ${items.every((item) => Boolean(item.scores))}
- Timeline events present: ${items.every((item) => Array.isArray(item.events))}
- Timeline avatar_tags present: ${items.every((item) => Boolean(item.avatar_tags))}
- Timeline active_tags_preview present: ${items.every((item) => Array.isArray(item.active_tags_preview))}
- Timeline avatar_vector present: ${items.every((item) => Boolean(item.avatar_vector))}

## Asset Resolution

- Missing Stage0 PNGs for graph identities: ${missingStage0.length}${missingStage0.length ? ` (${missingStage0.join(", ")})` : ""}
- Missing Stage1 PNGs: ${missingStage1}
- Missing Stage2 PNGs: ${missingStage2}
- Missing Stage3 PNGs: ${missingStage3}
- Missing timeline-specific Stage4 GLBs: ${missingStage4}
- Default Stage4 GLB exists: ${assetExists("/models/stage4/default-stage4.glb")}
- Stage5 GLB exists: ${assetExists("/models/stage5.glb")}

## Frontend Interpretation

- Use graph edges as canonical all-identity relationship source.
- Use timeline anchors and items as canonical Stage0-4 navigation source.
- Use global_collective_item as canonical Stage5 source.
- Create frontend tag nodes from unique tag display labels because source graph nodes are identity-only.
- Use evidence.conflictPairs and glitch-like events for conflict/glitch links; do not infer conflict from tag names alone.
- Missing assets are expected runtime states and must render placeholders without mutating source data.
`;

ensureDir(path.join(process.cwd(), "docs"));
fs.writeFileSync(path.join(process.cwd(), "docs/algorithm-audit.md"), report);
console.log(report);
```

- [ ] **Step 4: Implement validation script**

Create `scripts/validate-archive-data.mjs`:

```js
import { assetExists, graphPath, readJson, timelineItems, timelinePath, uniqueTagLabels } from "./archive-core.mjs";

const graph = readJson(graphPath);
const timeline = readJson(timelinePath);
const errors = [];
const identities = new Set(graph.nodes.map((node) => node.id));

if (!Array.isArray(graph.nodes)) errors.push("interaction graph nodes must be an array");
if (!Array.isArray(graph.edges)) errors.push("interaction graph edges must be an array");
if (!Array.isArray(timeline.anchors)) errors.push("timeline anchors must be an array");
if (!timeline.global_collective_item) errors.push("timeline must include global_collective_item");

for (const edge of graph.edges) {
  if (!identities.has(edge.source)) errors.push(`edge ${edge.id} has unknown source ${edge.source}`);
  if (!identities.has(edge.target)) errors.push(`edge ${edge.id} has unknown target ${edge.target}`);
}

for (const item of timelineItems(timeline)) {
  if (item.stage < 0 || item.stage > 4) errors.push(`timeline item ${item.timeline_item_id} has invalid stage ${item.stage}`);
  if (item.stage + 1 !== item.group_size) errors.push(`timeline item ${item.timeline_item_id} group_size does not match stage`);
  for (const sourceId of item.source_ids) {
    if (!identities.has(sourceId)) errors.push(`timeline item ${item.timeline_item_id} has unknown source ${sourceId}`);
  }
}

if (uniqueTagLabels(graph).length === 0) errors.push("expected at least one tag label");
if (!assetExists("/models/stage5.glb")) errors.push("Stage5 GLB is missing at /models/stage5.glb");

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Archive data validation passed");
```

- [ ] **Step 5: Implement cache script**

Create `scripts/build-graph3d-cache.mjs`:

```js
import fs from "node:fs";
import path from "node:path";
import { ensureDir, graphPath, readJson, timelinePath } from "./archive-core.mjs";

const graph = readJson(graphPath);
const timeline = readJson(timelinePath);
const outputDir = path.join(process.cwd(), "public/data/graph");
ensureDir(outputDir);

const identityNodes = graph.nodes.map((node, index) => ({
  id: node.id,
  type: "submission",
  source_ids: [node.id],
  identity_name: node.label || node.id,
  carried_fragment: node.text_fragments?.carriedFragment || "",
  tag_labels: [...new Set((node.tags || []).map((tag) => tag.label))],
  position: {
    x: Math.cos(index) * 5,
    y: ((index % 5) - 2) * 1.8,
    z: -7,
  },
}));

const tagLabels = [...new Set(graph.nodes.flatMap((node) => (node.tags || []).map((tag) => tag.label)).filter(Boolean))].sort();
const tagNodes = tagLabels.map((label, index) => ({
  id: `tag:${label}`,
  type: "tag",
  source_ids: [],
  tag_labels: [label],
  position: {
    x: Math.cos(index * 0.61) * 10,
    y: ((index % 17) - 8) * 0.55,
    z: 7 + Math.sin(index * 0.61) * 2,
  },
}));

const links = [];
for (const node of graph.nodes) {
  for (const label of new Set((node.tags || []).map((tag) => tag.label))) {
    links.push({ source: node.id, target: `tag:${label}`, type: "shared_tag", weight: 1 });
  }
}
for (const edge of graph.edges) {
  links.push({ source: edge.source, target: edge.target, type: "interaction", weight: edge.scores?.total ?? 1, scores: edge.scores || {} });
}

const cache = {
  nodes: [...identityNodes, ...tagNodes],
  links,
  metadata: {
    layout: "scripted-deterministic-cache",
    seed: "obfuscation-identity-archive-v1",
    source_files: ["public/data/algorithm/interaction_graph_real_submissions_10.json", "public/data/algorithm/timeline/anchor_timeline_real_submissions_10.json"],
    source_count: timeline.source_count,
  },
};

fs.writeFileSync(path.join(outputDir, "relationship_graph_3d.json"), `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Wrote ${path.join(outputDir, "relationship_graph_3d.json")}`);
```

- [ ] **Step 6: Run scripts**

Run:

```bash
npm run audit:algorithm
npm run validate:archive-data
npm run build:graph3d-cache
```

Expected:

- `audit:algorithm` writes `docs/algorithm-audit.md`.
- `validate:archive-data` prints `Archive data validation passed`.
- `build:graph3d-cache` writes `public/data/graph/relationship_graph_3d.json`.

- [ ] **Step 7: Commit**

```bash
git add scripts docs/algorithm-audit.md public/data/graph/relationship_graph_3d.json
git commit -m "feat: add archive data audit and validation scripts"
```

## Task 6: Archive State Provider and Stage Flow

**Files:**
- Create: `src/state/archiveStore.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/ArchiveExperience.tsx`
- Test: `src/state/archiveStore.test.tsx`

- [ ] **Step 1: Write state behavior test**

Create `src/state/archiveStore.test.tsx`:

```tsx
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "./archiveStore";

describe("archive store", () => {
  it("starts in Stage5 and can enter Stage0 for an identity", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });
    expect(result.current.stage).toBe(5);
    act(() => result.current.openIdentity("submission_a"));
    expect(result.current.stage).toBe(0);
    expect(result.current.selectedIdentityId).toBe("submission_a");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/state/archiveStore.test.tsx --run`

Expected: FAIL because store does not exist.

- [ ] **Step 3: Implement provider**

Create `src/state/archiveStore.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ArchiveGraph, ArchiveGraphNode, ArchiveStage } from "../types/archive";

type ArchiveFilters = {
  query: string;
  tag: string;
  linkDensity: number;
  showIsolated: boolean;
};

type ArchiveStore = {
  stage: ArchiveStage;
  selectedIdentityId: string | null;
  selectedTimelineItemId: string | null;
  selectedNode: ArchiveGraphNode | null;
  graph: ArchiveGraph | null;
  filters: ArchiveFilters;
  setGraph: (graph: ArchiveGraph) => void;
  openIdentity: (identityId: string) => void;
  openStage: (stage: ArchiveStage, timelineItemId?: string) => void;
  openCollective: () => void;
  selectNode: (node: ArchiveGraphNode | null) => void;
  setFilters: (filters: Partial<ArchiveFilters>) => void;
};

const ArchiveContext = createContext<ArchiveStore | null>(null);

const initialFilters: ArchiveFilters = {
  query: "",
  tag: "",
  linkDensity: 0.65,
  showIsolated: true,
};

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<ArchiveStage>(5);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchiveGraphNode | null>(null);
  const [graph, setGraph] = useState<ArchiveGraph | null>(null);
  const [filters, setFilterState] = useState<ArchiveFilters>(initialFilters);

  const value = useMemo<ArchiveStore>(() => ({
    stage,
    selectedIdentityId,
    selectedTimelineItemId,
    selectedNode,
    graph,
    filters,
    setGraph,
    openIdentity(identityId) {
      setSelectedIdentityId(identityId);
      setSelectedTimelineItemId(null);
      setStage(0);
    },
    openStage(nextStage, timelineItemId) {
      setStage(nextStage);
      setSelectedTimelineItemId(timelineItemId ?? null);
    },
    openCollective() {
      setStage(5);
      setSelectedTimelineItemId(null);
    },
    selectNode(node) {
      setSelectedNode(node);
    },
    setFilters(next) {
      setFilterState((current) => ({ ...current, ...next }));
    },
  }), [filters, graph, selectedIdentityId, selectedNode, selectedTimelineItemId, stage]);

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchiveStore() {
  const value = useContext(ArchiveContext);
  if (!value) {
    throw new Error("useArchiveStore must be used inside ArchiveProvider");
  }
  return value;
}
```

- [ ] **Step 4: Wire app shell**

Modify `src/App.tsx`:

```tsx
import { ArchiveExperience } from "./components/ArchiveExperience";
import { ArchiveProvider } from "./state/archiveStore";

export default function App() {
  return (
    <ArchiveProvider>
      <main className="archive-app" data-testid="archive-experience">
        <ArchiveExperience />
      </main>
    </ArchiveProvider>
  );
}
```

Create `src/components/ArchiveExperience.tsx`:

```tsx
import { useEffect, useState } from "react";
import { buildArchiveGraph } from "../data/relationshipGraphBuilder";
import { loadArchiveSources } from "../data/archiveLoaders";
import { useArchiveStore } from "../state/archiveStore";

export function ArchiveExperience() {
  const { stage, setGraph } = useArchiveStore();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Loading archive data");

  useEffect(() => {
    let active = true;
    loadArchiveSources()
      .then(({ graph, timeline }) => {
        if (!active) return;
        setGraph(buildArchiveGraph(graph, timeline));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unknown archive loading error");
      });

    return () => {
      active = false;
    };
  }, [setGraph]);

  if (status === "loading") return <section className="archive-loading">{message}</section>;
  if (status === "error") return <section role="alert" className="archive-loading">{message}</section>;

  return (
    <section className="archive-experience" data-stage={stage}>
      <div className="archive-scene-shell">Collective avatar-map</div>
    </section>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- src/state/archiveStore.test.tsx src/App.test.tsx --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/ArchiveExperience.tsx src/state/archiveStore.tsx src/state/archiveStore.test.tsx
git commit -m "feat: add archive stage state provider"
```

## Task 7: 3D Scene, Graph Rendering, and WebGL Fallback

**Files:**
- Create: `src/components/FallbackStates.tsx`
- Create: `src/components/StageScene.tsx`
- Create: `src/components/RelationshipGraph3D.tsx`
- Create: `src/components/AvatarPointCloud.tsx`
- Modify: `src/components/ArchiveExperience.tsx`
- Test: `src/components/FallbackStates.test.tsx`

- [ ] **Step 1: Write fallback tests**

Create `src/components/FallbackStates.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState, WebGLFallback } from "./FallbackStates";

describe("FallbackStates", () => {
  it("renders WebGL fallback content", () => {
    render(<WebGLFallback />);
    expect(screen.getByText(/WebGL is unavailable/i)).toBeInTheDocument();
  });

  it("renders empty filter state", () => {
    render(<EmptyState message="No archive nodes match the current filters" />);
    expect(screen.getByText("No archive nodes match the current filters")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/FallbackStates.test.tsx --run`

Expected: FAIL because fallback module does not exist.

- [ ] **Step 3: Implement fallback states**

Create `src/components/FallbackStates.tsx`:

```tsx
export function WebGLFallback() {
  return (
    <section className="archive-fallback" role="status">
      <h1>WebGL is unavailable</h1>
      <p>The archive can still be searched and read through the metadata panels.</p>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <section className="archive-fallback" role="status">
      <p>{message}</p>
    </section>
  );
}
```

- [ ] **Step 4: Implement StageScene and lightweight 3D renderer**

Create `src/components/StageScene.tsx`:

```tsx
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import { AvatarPointCloud } from "./AvatarPointCloud";
import { EmptyState, WebGLFallback } from "./FallbackStates";
import { RelationshipGraph3D } from "./RelationshipGraph3D";

function hasWebGL(): boolean {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
}

export function StageScene() {
  const { graph, stage } = useArchiveStore();

  if (!hasWebGL()) return <WebGLFallback />;
  if (!graph || graph.nodes.length === 0) return <EmptyState message="No archive nodes are available" />;

  const cameraPosition = stage === 5
    ? archiveVisualConfig.camera.stage5Position
    : archiveVisualConfig.camera.detailPosition;

  return (
    <Canvas camera={{ position: [...cameraPosition], fov: 45 }} className="archive-canvas">
      <color attach="background" args={[archiveVisualConfig.colors.paper]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 8]} intensity={1.2} />
      <Suspense fallback={null}>
        {stage === 5 ? <AvatarPointCloud modelPath={archiveVisualConfig.assets.stage5ModelPath} /> : null}
        <RelationshipGraph3D graph={graph} />
      </Suspense>
    </Canvas>
  );
}
```

Create `src/components/AvatarPointCloud.tsx`:

```tsx
import { Points, PointMaterial, useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export function AvatarPointCloud({ modelPath }: { modelPath: string }) {
  const gltf = useGLTF(modelPath);

  const positions = useMemo(() => {
    const points: number[] = [];
    gltf.scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
      const position = geometry?.attributes.position;
      if (!position) return;
      const limit = Math.min(position.count, 12000);
      for (let index = 0; index < limit; index += 3) {
        points.push(position.getX(index), position.getY(index), position.getZ(index));
      }
    });
    return new Float32Array(points.length > 0 ? points : [0, 0, 0, 1, 1, 1, -1, -1, -1]);
  }, [gltf.scene]);

  return (
    <Points positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial size={0.045} color="#252525" transparent opacity={0.32} depthWrite={false} />
    </Points>
  );
}
```

Create `src/components/RelationshipGraph3D.tsx`:

```tsx
import { Line, Sphere } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph } from "../types/archive";

export function RelationshipGraph3D({ graph }: { graph: ArchiveGraph }) {
  const { selectNode, openIdentity, filters } = useArchiveStore();
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const query = filters.query.trim().toLowerCase();
  const visibleNodes = useMemo(() => {
    if (!query) return graph.nodes;
    return graph.nodes.filter((node) =>
      [node.id, node.identity_name, node.carried_fragment, node.visual.label, ...node.tag_labels]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [graph.nodes, query]);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleLinks = graph.links.filter((link) =>
    visibleIds.has(link.source) &&
    visibleIds.has(link.target) &&
    link.visual.opacity <= filters.linkDensity + 0.4,
  );

  return (
    <group>
      {visibleLinks.map((link) => {
        const source = nodeById.get(link.source);
        const target = nodeById.get(link.target);
        if (!source || !target) return null;
        return (
          <Line
            key={link.id}
            points={[
              new THREE.Vector3(source.position.x, source.position.y, source.position.z),
              new THREE.Vector3(target.position.x, target.position.y, target.position.z),
            ]}
            color={link.type === "conflict_tag" ? archiveVisualConfig.colors.conflict : archiveVisualConfig.colors.shared}
            lineWidth={Math.max(0.35, link.visual.thickness)}
            transparent
            opacity={link.visual.opacity}
          />
        );
      })}
      {visibleNodes.map((node) => (
        <Sphere
          key={node.id}
          args={[node.visual.size * 0.08, 12, 12]}
          position={[node.position.x, node.position.y, node.position.z]}
          onPointerOver={(event) => {
            event.stopPropagation();
            selectNode(node);
          }}
          onClick={(event) => {
            event.stopPropagation();
            selectNode(node);
            if (node.type === "submission") openIdentity(node.id);
          }}
        >
          <meshStandardMaterial
            color={node.type === "tag" ? archiveVisualConfig.colors.tag : archiveVisualConfig.colors.identity}
            transparent
            opacity={node.visual.opacity}
          />
        </Sphere>
      ))}
    </group>
  );
}
```

- [ ] **Step 5: Wire scene into experience**

Modify `src/components/ArchiveExperience.tsx` to render `<StageScene />` inside `.archive-scene-shell`.

```tsx
import { StageScene } from "./StageScene";
```

Replace ready return with:

```tsx
return (
  <section className="archive-experience" data-stage={stage}>
    <div className="archive-scene-shell">
      <StageScene />
    </div>
  </section>
);
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test -- src/components/FallbackStates.test.tsx --run
npm run build
```

Expected: tests PASS and production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/FallbackStates.tsx src/components/StageScene.tsx src/components/RelationshipGraph3D.tsx src/components/AvatarPointCloud.tsx src/components/ArchiveExperience.tsx src/styles/archive.css
git commit -m "feat: render 3d archive avatar map"
```

## Task 8: Search, Filters, Detail Panel, Sidebar, and Timeline

**Files:**
- Create: `src/components/Graph3DControls.tsx`
- Create: `src/components/Graph3DDetailPanel.tsx`
- Create: `src/components/MetadataSidebar.tsx`
- Create: `src/components/BranchingTimeline.tsx`
- Modify: `src/components/ArchiveExperience.tsx`
- Modify: `src/styles/archive.css`
- Test: `src/components/Graph3DControls.test.tsx`

- [ ] **Step 1: Write controls test**

Create `src/components/Graph3DControls.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import { Graph3DControls } from "./Graph3DControls";

function QueryProbe() {
  const { filters } = useArchiveStore();
  return <output>{filters.query}</output>;
}

describe("Graph3DControls", () => {
  it("updates query filter", () => {
    render(
      <ArchiveProvider>
        <Graph3DControls />
        <QueryProbe />
      </ArchiveProvider>,
    );
    fireEvent.change(screen.getByLabelText("Search archive"), { target: { value: "Dream" } });
    expect(screen.getByText("Dream")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Graph3DControls.test.tsx --run`

Expected: FAIL because controls module does not exist.

- [ ] **Step 3: Implement controls**

Create `src/components/Graph3DControls.tsx`:

```tsx
import { RotateCcw } from "lucide-react";
import { useArchiveStore } from "../state/archiveStore";

export function Graph3DControls() {
  const { filters, setFilters, openCollective } = useArchiveStore();

  return (
    <aside className="graph-controls" aria-label="Archive graph controls">
      <label>
        <span className="sr-only">Search archive</span>
        <input
          aria-label="Search archive"
          value={filters.query}
          placeholder="Search identities, fragments, tags"
          onChange={(event) => setFilters({ query: event.currentTarget.value })}
        />
      </label>
      <label>
        <span>Links</span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={filters.linkDensity}
          onChange={(event) => setFilters({ linkDensity: Number(event.currentTarget.value) })}
        />
      </label>
      <label className="inline-toggle">
        <input
          type="checkbox"
          checked={filters.showIsolated}
          onChange={(event) => setFilters({ showIsolated: event.currentTarget.checked })}
        />
        <span>Isolated</span>
      </label>
      <button type="button" className="icon-button" onClick={openCollective} aria-label="Return to collective">
        <RotateCcw size={18} />
      </button>
    </aside>
  );
}
```

- [ ] **Step 4: Implement detail panel**

Create `src/components/Graph3DDetailPanel.tsx`:

```tsx
import { useArchiveStore } from "../state/archiveStore";

export function Graph3DDetailPanel() {
  const { selectedNode } = useArchiveStore();
  if (!selectedNode) return null;

  return (
    <aside className="detail-panel" aria-label="Selected archive node">
      <h2>{selectedNode.visual.label}</h2>
      <dl>
        <dt>ID</dt><dd>{selectedNode.id}</dd>
        <dt>Type</dt><dd>{selectedNode.type}</dd>
        {selectedNode.stage !== undefined ? <><dt>Internal stage</dt><dd>{selectedNode.stage}</dd></> : null}
        {selectedNode.anchor_id ? <><dt>Anchor</dt><dd>{selectedNode.anchor_id}</dd></> : null}
        {selectedNode.carried_fragment ? <><dt>Fragment</dt><dd>{selectedNode.carried_fragment}</dd></> : null}
        <dt>Source IDs</dt><dd>{selectedNode.source_ids.join(", ") || "None"}</dd>
        <dt>Tags</dt><dd>{selectedNode.tag_labels.slice(0, 18).join(", ") || "None"}</dd>
        {selectedNode.asset_path ? <><dt>Asset</dt><dd>{selectedNode.asset_path}</dd></> : null}
        {selectedNode.model_path ? <><dt>Model</dt><dd>{selectedNode.model_path}</dd></> : null}
      </dl>
    </aside>
  );
}
```

- [ ] **Step 5: Implement metadata sidebar and branching timeline**

Create `src/components/MetadataSidebar.tsx`:

```tsx
import { useArchiveStore } from "../state/archiveStore";

export function MetadataSidebar() {
  const { stage, selectedIdentityId, selectedTimelineItemId, selectedNode } = useArchiveStore();
  if (stage === 5) return null;

  return (
    <aside className="metadata-sidebar" aria-label="Archive metadata">
      <h2>{selectedNode?.identity_name || selectedIdentityId || "Archive detail"}</h2>
      <p>{selectedNode?.carried_fragment || "Select an archive node to inspect its carried fragment."}</p>
      <dl>
        <dt>Internal stage</dt><dd>{stage}</dd>
        <dt>Timeline item</dt><dd>{selectedTimelineItemId || "Anchor start"}</dd>
        <dt>Source ID</dt><dd>{selectedIdentityId || "None selected"}</dd>
      </dl>
    </aside>
  );
}
```

Create `src/components/BranchingTimeline.tsx`:

```tsx
import type { ArchiveStage } from "../types/archive";
import { useArchiveStore } from "../state/archiveStore";

const stages: ArchiveStage[] = [0, 1, 2, 3, 4, 5];
const labels = ["Interior", "Pair", "Cluster", "Dense", "Pressure", "Collective"];

export function BranchingTimeline() {
  const { stage, openStage, openCollective } = useArchiveStore();
  if (stage === 5) return null;

  return (
    <nav className="branching-timeline" aria-label="Branching archive timeline">
      {stages.map((value, index) => (
        <button
          key={value}
          type="button"
          className={value === stage ? "active" : ""}
          onClick={() => value === 5 ? openCollective() : openStage(value)}
        >
          {labels[index]}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 6: Wire UI panels into experience**

Modify `src/components/ArchiveExperience.tsx` imports:

```tsx
import { BranchingTimeline } from "./BranchingTimeline";
import { Graph3DControls } from "./Graph3DControls";
import { Graph3DDetailPanel } from "./Graph3DDetailPanel";
import { MetadataSidebar } from "./MetadataSidebar";
```

Replace ready return with:

```tsx
return (
  <section className="archive-experience" data-stage={stage}>
    <div className="archive-scene-shell">
      <StageScene />
    </div>
    <Graph3DControls />
    <Graph3DDetailPanel />
    <MetadataSidebar />
    <BranchingTimeline />
  </section>
);
```

- [ ] **Step 7: Add responsive panel CSS**

Append to `src/styles/archive.css`:

```css
.archive-experience {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.archive-scene-shell,
.archive-canvas {
  width: 100vw;
  height: 100vh;
}

.graph-controls,
.detail-panel,
.metadata-sidebar,
.branching-timeline {
  position: absolute;
  z-index: 5;
  background: rgba(255, 252, 244, 0.88);
  border: 2px solid #18140f;
  box-shadow: 4px 4px 0 rgba(24, 20, 15, 0.16);
}

.graph-controls {
  top: 16px;
  left: 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  max-width: calc(100vw - 32px);
  padding: 10px;
}

.graph-controls input[type="text"],
.graph-controls input:not([type]) {
  width: min(340px, 46vw);
}

.detail-panel {
  right: 16px;
  bottom: 16px;
  width: min(360px, calc(100vw - 32px));
  max-height: 42vh;
  overflow: auto;
  padding: 14px;
}

.metadata-sidebar {
  top: 82px;
  right: 16px;
  width: min(420px, calc(100vw - 32px));
  max-height: calc(100vh - 176px);
  overflow: auto;
  padding: 16px;
}

.branching-timeline {
  left: 50%;
  bottom: 16px;
  display: grid;
  grid-template-columns: repeat(6, minmax(72px, 1fr));
  gap: 6px;
  width: min(720px, calc(100vw - 32px));
  padding: 10px;
  transform: translateX(-50%);
}

.branching-timeline button.active {
  background: #18140f;
  color: #fff8e8;
}

.icon-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 720px) {
  .graph-controls {
    right: 16px;
    flex-wrap: wrap;
  }

  .branching-timeline {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

- [ ] **Step 8: Run tests and build**

Run:

```bash
npm test -- src/components/Graph3DControls.test.tsx --run
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/Graph3DControls.tsx src/components/Graph3DDetailPanel.tsx src/components/MetadataSidebar.tsx src/components/BranchingTimeline.tsx src/components/ArchiveExperience.tsx src/styles/archive.css src/components/Graph3DControls.test.tsx
git commit -m "feat: add archive controls timeline and metadata panels"
```

## Task 9: PNG Avatar Rendering with Near-White Removal

**Files:**
- Create: `src/components/AvatarImage.tsx`
- Create: `src/utils/removeNearWhite.ts`
- Test: `src/utils/removeNearWhite.test.ts`
- Modify: `src/components/MetadataSidebar.tsx`

- [ ] **Step 1: Write pixel utility test**

Create `src/utils/removeNearWhite.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { removeNearWhitePixels } from "./removeNearWhite";

describe("removeNearWhitePixels", () => {
  it("sets alpha to zero for near-white pixels and preserves dark pixels", () => {
    const data = new Uint8ClampedArray([
      246, 246, 246, 255,
      20, 20, 20, 255,
    ]);
    const result = removeNearWhitePixels(data, 245);
    expect(result[3]).toBe(0);
    expect(result[7]).toBe(255);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/removeNearWhite.test.ts --run`

Expected: FAIL because utility does not exist.

- [ ] **Step 3: Implement near-white utility**

Create `src/utils/removeNearWhite.ts`:

```ts
export function removeNearWhitePixels(source: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(source);
  for (let index = 0; index < output.length; index += 4) {
    if (output[index] > threshold && output[index + 1] > threshold && output[index + 2] > threshold) {
      output[index + 3] = 0;
    }
  }
  return output;
}
```

- [ ] **Step 4: Implement AvatarImage**

Create `src/components/AvatarImage.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { removeNearWhitePixels } from "../utils/removeNearWhite";

export function AvatarImage({ src, alt }: { src: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setFailed(true);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      imageData.data.set(removeNearWhitePixels(imageData.data, archiveVisualConfig.assets.nearWhiteThreshold));
      context.putImageData(imageData, 0, 0);
      setFailed(false);
    };
    image.onerror = () => setFailed(true);
    image.src = src;
  }, [src]);

  if (failed) {
    return <div className="avatar-placeholder" role="img" aria-label={`${alt} missing`}>Missing avatar</div>;
  }

  return <canvas ref={canvasRef} className="avatar-image" aria-label={alt} />;
}
```

- [ ] **Step 5: Add avatar to metadata sidebar**

Modify `src/components/MetadataSidebar.tsx`:

```tsx
import { AvatarImage } from "./AvatarImage";
```

Render below the heading:

```tsx
{selectedNode?.asset_path ? <AvatarImage src={selectedNode.asset_path} alt={selectedNode.visual.label} /> : null}
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test -- src/utils/removeNearWhite.test.ts --run
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/AvatarImage.tsx src/utils/removeNearWhite.ts src/utils/removeNearWhite.test.ts src/components/MetadataSidebar.tsx src/styles/archive.css
git commit -m "feat: render png avatars with non-destructive white removal"
```

## Task 10: Documentation and Hand-Drawn Asset Handoff

**Files:**
- Create: `docs/hand-drawn-ui-asset-list.md`
- Create: `docs/archive-3d-data-flow.md`

- [ ] **Step 1: Create hand-drawn UI asset list**

Create `docs/hand-drawn-ui-asset-list.md`:

```md
# Hand-Drawn UI Asset List

Style reference: childlike crayon sketch style, loose uneven black outlines, playful hand-drawn proportions, rough scribbled coloring, simple white background, whimsical and imaginative, elementary-school art aesthetic, imperfect linework, bright colored pencil or crayon texture.

| Component Name | Purpose | Recommended Format | Recommended Size |
|---|---|---:|---:|
| `CrayonFrame` | General hand-drawn border/card frame | SVG or PNG transparent | 1200x800 |
| `PaperPanel` | Metadata sidebar background | PNG transparent | 460x1000 |
| `CrayonButton` | Button base / action mark | SVG or PNG transparent | 240x80 |
| `TimelineBranch` | Tree-like timeline branch visual | SVG preferred | 1600x500 |
| `TimelineHandle` | Draggable timeline handle | PNG transparent | 160x160 |
| `TimelineForkNode` | Branch/fork marker in timeline | PNG transparent | 160x160 |
| `TagBubble` | Shared tag node visual | SVG or PNG transparent | 180x120 |
| `ConflictTagBubble` | Conflict tag node visual | SVG or PNG transparent | 180x120 |
| `IdentityNodeMark` | Questionnaire identity center node | SVG or PNG transparent | 220x160 |
| `IdentityTooltip` | Hover info card background | PNG transparent | 480x320 |
| `MetadataSidebar` | Stage0-4 detail sidebar shell | PNG transparent | 460x1000 |
| `AvatarPlaceholder` | Missing PNG avatar placeholder | PNG transparent | 512x512 |
| `ModelPlaceholder` | Missing GLB placeholder | PNG transparent | 512x512 |
| `BackToCollectiveButton` | Return to Stage5 control | SVG or PNG transparent | 260x90 |
| `SearchInputFrame` | Search/filter input shell | SVG or PNG transparent | 480x100 |
| `FilterChip` | Tag/stage/filter chip visual | SVG or PNG transparent | 220x80 |
```

- [ ] **Step 2: Create data flow documentation**

Create `docs/archive-3d-data-flow.md`:

```md
# Archive 3D Data Flow

The frontend treats `public/` as the canonical runtime source. It reads `public/data/algorithm/interaction_graph_real_submissions_10.json` for identity nodes and interaction edges, and `public/data/algorithm/timeline/anchor_timeline_real_submissions_10.json` for Stage0-5 navigation.

The relationship graph is organized at runtime by `src/data/relationshipGraphBuilder.ts`. Source identity nodes become `submission` nodes. Unique tag display labels become `tag` nodes. Timeline items become `timeline_item` nodes. `global_collective_item` becomes the Stage5 `collective` node.

Asset paths are resolved by convention in `src/data/archivePaths.ts`. Stage0 uses `/assets/avatars/stage0/{submission_id}.png`; Stage1-3 use `/assets/avatars/stage{stage}/{timeline_item_id}.png`; Stage4 uses `/models/stage4/{timeline_item_id}.glb`; Stage5 uses `/models/stage5.glb`.

Visual thresholds, colors, camera settings, fallback paths, link density, and near-white PNG removal are configured in `src/config/archiveVisualConfig.ts`.

Validation commands:

```bash
npm run audit:algorithm
npm run validate:archive-data
npm run build:graph3d-cache
npm run build
```
```

- [ ] **Step 3: Commit**

```bash
git add docs/hand-drawn-ui-asset-list.md docs/archive-3d-data-flow.md
git commit -m "docs: document archive assets and data flow"
```

## Task 11: End-to-End Smoke Test and Browser Verification

**Files:**
- Create: `tests/e2e/archive-experience.spec.ts`
- Modify: `src/components/ArchiveExperience.tsx` if smoke test exposes loading/testability gaps.

- [ ] **Step 1: Write Playwright smoke test**

Create `tests/e2e/archive-experience.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("opens into the Stage5 archive experience", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("archive-experience")).toBeVisible();
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
});

test("search control keeps the graph usable after filtering", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search archive").fill("Dream");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
});
```

- [ ] **Step 2: Run build and E2E**

Run:

```bash
npm run build
npm run test:e2e
```

Expected: production build passes and Playwright smoke tests pass in Chromium.

- [ ] **Step 3: Use Browser plugin for visual verification**

Start dev server:

```bash
npm run dev -- --port 5173
```

Open `http://127.0.0.1:5173` in the Codex in-app browser. Verify:

- Stage5 loads without sidebar/timeline.
- Canvas is nonblank.
- Search controls are visible and do not overlap main UI.
- Selecting an identity enters Stage0.
- Stage0 shows metadata sidebar and branching timeline.
- Returning to collective restores Stage5.
- Mobile viewport keeps controls readable without text overlap.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/archive-experience.spec.ts src/components/ArchiveExperience.tsx
git commit -m "test: add archive experience smoke coverage"
```

## Task 12: Final Validation, Push, and Handoff

**Files:**
- Modify only files required by verification fixes.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run audit:algorithm
npm run validate:archive-data
npm run test:run
npm run build
npm run test:e2e
git status --short
```

Expected:

- Audit writes current `docs/algorithm-audit.md`.
- Validation prints `Archive data validation passed`.
- Unit tests pass.
- Build passes.
- E2E passes.
- `git status --short` shows only intentional generated updates, or is clean after commit.

- [ ] **Step 2: Commit verification fixes if any**

If verification changed generated docs/cache or required fixes:

```bash
git add docs public/data/graph src tests scripts package.json package-lock.json
git commit -m "chore: finalize archive avatar map implementation"
```

Expected: commit succeeds, or Git reports nothing to commit.

- [ ] **Step 3: Push**

Run:

```bash
git push
```

Expected: `main` pushes to `origin/main`.

- [ ] **Step 4: Final response**

Use this format:

```text
Summary
- Built Vite/React/Three archive frontend opening into Stage5.
- Organized source algorithm/timeline data into identity, tag, timeline, and collective graph nodes.
- Added audit, validation, optional graph cache, hand-drawn asset handoff, and data-flow docs.

Files changed
- ...

Outputs
- docs/algorithm-audit.md
- docs/hand-drawn-ui-asset-list.md
- docs/archive-3d-data-flow.md
- public/data/graph/relationship_graph_3d.json

Algorithm audit
- ...

Commands run
- ...

Validation result
- ...

Known limitations / follow-up
- Stage1-3 PNGs and timeline-specific Stage4 GLBs are currently missing and render fallbacks.
```

## Self-Review

- Spec coverage: The plan covers private repo setup, project reconnaissance, frontend framework creation, `public/` runtime source loading, Stage5 home, Stage0-4 detail UI, Three/WebGL graph rendering, tag nodes, identity nodes, relationship links, conflict links, timeline links, asset fallbacks, near-white PNG removal, centralized config, audit script, validation script, optional graph cache, documentation, tests, build, E2E, and final push.
- Placeholder scan: No banned placeholder wording or unspecified test tasks remain.
- Type consistency: `ArchiveStage`, `ArchiveGraphNode`, `ArchiveGraphLink`, `SourceInteractionGraph`, `SourceTimeline`, `TimelineItem`, and helper names are consistent across tasks.
- Scope note: The requirement is large but cohesive for one project because there is no existing frontend; this plan produces one working app with incremental commits and verification gates.
