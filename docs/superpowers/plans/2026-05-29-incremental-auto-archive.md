# Incremental Auto Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automated, non-destructive submission ingestion path that generates new individual avatar assets and mounts new graph nodes/edges without redefining the current timeline, collective avatar, baked point clouds, or existing node layout.

**Architecture:** Treat the current website data as a frozen base layer and add a separate generated overlay layer. The overlay is produced by a small repo-local script from fixed-structure survey submissions, skipping custom tags, generating avatars, and writing only new overlay files/assets. Runtime merges the overlay into the existing graph display while preserving base link density, current collective model, and the existing timeline. Existing node positions may change after generated nodes are mounted, as long as all nodes continue to project inside the 3D avatar field with the same visual logic.

**Tech Stack:** Vite, React, TypeScript, Vitest, Node ESM scripts, GitHub Actions, OpenRouter image generation API via repository secrets.

---

## Decision: GitHub Actions vs Vercel

Use **GitHub Actions** for generation and archival. The source submissions live in a separate repository:

- Source repo: `Linglingletsgo/obfuscation-identity-archive-survey`
- Source path: `submissions/`
- Target repo: `Linglingletsgo/obfuscation-identity-archive`

Why:
- Generated data and images need to be committed back into the repository. GitHub Actions runs inside the repository workflow, can create a commit, and can be triggered by schedule, manual dispatch, or a survey-repo event.
- Vercel serverless filesystem is ephemeral. It can generate at request time, but it cannot reliably archive files into the repo without adding GitHub write tokens, extra commit logic, deployment-loop guards, and longer-running function risk.
- Vercel should stay as the static/runtime host. GitHub Actions should do all write operations, image generation, validation, build, and commit.

Vercel is only preferable if generated avatars are stored in an external object store or database and the website reads them dynamically. That conflicts with the current “archived to repository” requirement.

Recommended sync mode:
- Primary immediate trigger: a workflow in `obfuscation-identity-archive-survey` runs on every push to `submissions/**` and sends a `repository_dispatch` event to `obfuscation-identity-archive`.
- Target workflow: a workflow in `obfuscation-identity-archive` receives `repository_dispatch`, checks out `obfuscation-identity-archive-survey`, reads `survey/submissions`, generates overlay files and avatars, validates/builds, and commits to the website repo.
- Fallback: keep `workflow_dispatch` and a low-frequency schedule in the website repo for manual recovery if the cross-repo dispatch fails.
- Do not copy raw submission files into the website repo unless explicitly needed. Keep only derived overlay JSON and generated avatar images in the website repo.

Image generation plan:
- Provider: OpenRouter.
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`.
- Model: `openai/gpt-5.4-image-2`.
- Request modalities: `["image", "text"]`.
- Requested image config: `aspect_ratio: "1:1"`, `image_size: "1K"`.
- Final output: decode returned base64 data URL and save PNG directly. Do not resize generated files; the website should keep avatar display size consistent through existing layout/CSS.
- Filename: `public/assets/avatars/generated/<submission_id>.png`.
- Prompt source: use the style and tag-field structure from `proj1/avatar_output/_jobs/stage0_simple_avatar_jobs_manifest.json`, especially `prompt_base` and `tag_fields`.
- `[IDENTITY_TAGS]` must be rendered as the fixed title `Identity tags:` followed by the fixed field order from `proj1/avatar_output/_jobs/submission_20260501153958445_ddc8dd42.txt`, not as a flat comma-separated list.
- Regeneration rule: regenerate only when the source submission hash changes or the avatar PNG is missing.

## Non-Destructive Data Contract

Frozen base files must not be overwritten by the auto-archive script:
- `public/data/algorithm/interaction_graph_real_submissions.json`
- `public/data/algorithm/timeline/anchor_timeline_real_submissions.json`
- `public/data/baked/collective_model_high.json`
- `public/data/baked/environment_high.json`
- `public/models/global_stage2_collective.glb`
- `public/models/env.glb`

New generated files:
- `public/data/generated/submission_overlay_graph.json`
- `public/data/generated/submission_overlay_registry.json`
- `public/assets/avatars/generated/<submission_id>.png`

The timeline must remain authoritative only for the current frozen narrative and current collective item. New submissions must not be added to `timeline.global_collective_item.source_ids`, must not update `avatar_tags`, and must not trigger point-cloud rebaking.

## File Structure

Create:
- `src/data/generatedOverlay.ts`  
  Runtime validator and optional loader for `submission_overlay_graph.json`.
- `src/data/generatedOverlayMerge.ts`  
  Pure function that merges generated overlay nodes/edges into the built graph without mutating base graph objects.
- `src/data/generatedOverlayMerge.test.ts`  
  Tests for non-destructive merge, custom-tag skipping, and frozen file preservation.
- `src/data/generatedOverlaySchema.test.ts`  
  Tests for generated overlay validation fallback.
- `scripts/auto-archive-submissions.mjs`  
  Small standalone ingestion script. Reads submissions, filters tags, computes relationships, optionally calls image generation, writes overlay files only.
- `scripts/avatar-prompt-template.mjs`  
  Shared prompt template copied from `proj1/avatar_output/_jobs/stage0_simple_avatar_jobs_manifest.json` so GitHub Actions does not depend on `proj1`.
- `scripts/auto-archive-submissions.node-test.mjs`  
  Node test or Vitest-compatible test for tag filtering and relationship edge generation.
- `.github/workflows/auto-archive-submissions.yml`  
  Manual/scheduled automation that checks out the survey repo, reads `submissions/`, runs the script, validates, builds, and commits generated files to the website repo.
- External source repo file to add separately: `.github/workflows/notify-archive-site.yml` in `Linglingletsgo/obfuscation-identity-archive-survey`  
  Push-trigger workflow that dispatches the website repo sync immediately after a change under `submissions/**`.

Modify:
- `src/config/archiveVisualConfig.ts`  
  Add `generatedOverlayPath`.
- `src/data/archiveLoaders.ts`  
  Load overlay optionally; if 404/missing, use empty overlay.
- `src/data/useArchiveData.ts`  
  Pass overlay into graph building/merge.
- `src/data/relationshipGraphBuilder.ts`  
  Keep current base behavior unchanged; only expose helper data needed by merge if necessary.
- `src/components/RelationshipGraph3D.tsx`  
  No required change for projection if merged generated nodes naturally participate in the existing collective projection flow.
- `package.json`  
  Add one script: `auto-archive:submissions`.

## Overlay JSON Shape

Write this exact shape to `public/data/generated/submission_overlay_graph.json`:

```json
{
  "version": 1,
  "generated_at": "2026-05-29T00:00:00.000Z",
  "base_graph_source": "/data/algorithm/interaction_graph_real_submissions.json",
  "base_timeline_source": "/data/algorithm/timeline/anchor_timeline_real_submissions.json",
  "nodes": [
    {
      "id": "submission_202605290001_example",
      "type": "submission",
      "label": "Example Name",
      "carried_fragment": "Example carried fragment",
      "asset_path": "/assets/avatars/generated/submission_202605290001_example.png",
      "tags": [
        {
          "label": "Archive",
          "category": "system",
          "definition_source": "standard"
        }
      ],
      "source_group": "generated"
    }
  ],
  "edges": [
    {
      "id": "generated_shared:submission_202605290001_example->submission_20260514141519771_dd02f86f",
      "source": "submission_202605290001_example",
      "target": "submission_20260514141519771_dd02f86f",
      "relation": "interaction",
      "weight": 2,
      "shared_tags": ["Archive", "Calm"]
    }
  ]
}
```

Registry shape for `public/data/generated/submission_overlay_registry.json`:

```json
{
  "version": 1,
  "submissions": {
    "submission_202605290001_example": {
      "submission_id": "submission_202605290001_example",
      "source_sha256": "e3b0c44298fc1c149afbf4c8996fb924",
      "avatar_path": "/assets/avatars/generated/submission_202605290001_example.png",
      "processed_at": "2026-05-29T00:00:00.000Z"
    }
  }
}
```

## Task 1: Add Overlay Types And Loader

**Files:**
- Create: `src/data/generatedOverlay.ts`
- Test: `src/data/generatedOverlaySchema.test.ts`
- Modify: `src/config/archiveVisualConfig.ts`
- Modify: `src/data/archiveLoaders.ts`

- [ ] **Step 1: Write schema tests**

Create `src/data/generatedOverlaySchema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assertGeneratedOverlay, emptyGeneratedOverlay } from "./generatedOverlay";

describe("generated overlay schema", () => {
  it("accepts an empty generated overlay", () => {
    const overlay = emptyGeneratedOverlay();
    expect(() => assertGeneratedOverlay(overlay)).not.toThrow();
    expect(overlay.nodes).toEqual([]);
    expect(overlay.edges).toEqual([]);
  });

  it("rejects malformed generated nodes", () => {
    expect(() =>
      assertGeneratedOverlay({
        version: 1,
        generated_at: "2026-05-29T00:00:00.000Z",
        nodes: [{ id: 123, type: "submission" }],
        edges: [],
      }),
    ).toThrow("Invalid generated overlay node");
  });

  it("rejects malformed generated edges", () => {
    expect(() =>
      assertGeneratedOverlay({
        version: 1,
        generated_at: "2026-05-29T00:00:00.000Z",
        nodes: [],
        edges: [{ id: "edge-1", source: "a" }],
      }),
    ).toThrow("Invalid generated overlay edge");
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- --run src/data/generatedOverlaySchema.test.ts
```

Expected: FAIL because `src/data/generatedOverlay.ts` does not exist.

- [ ] **Step 3: Implement overlay schema**

Create `src/data/generatedOverlay.ts`:

```ts
export type GeneratedOverlayTag = {
  label: string;
  category?: string;
  definition_source?: string;
};

export type GeneratedOverlayNode = {
  id: string;
  type: "submission";
  label: string;
  carried_fragment: string;
  asset_path: string;
  tags: GeneratedOverlayTag[];
  source_group: "generated";
};

export type GeneratedOverlayEdge = {
  id: string;
  source: string;
  target: string;
  relation: "interaction";
  weight: number;
  shared_tags: string[];
};

export type GeneratedOverlayGraph = {
  version: 1;
  generated_at: string;
  base_graph_source?: string;
  base_timeline_source?: string;
  nodes: GeneratedOverlayNode[];
  edges: GeneratedOverlayEdge[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isGeneratedTag(value: unknown): value is GeneratedOverlayTag {
  return (
    isRecord(value) &&
    isString(value.label) &&
    (!("category" in value) || isString(value.category)) &&
    (!("definition_source" in value) || isString(value.definition_source))
  );
}

function isGeneratedNode(value: unknown): value is GeneratedOverlayNode {
  return (
    isRecord(value) &&
    isString(value.id) &&
    value.type === "submission" &&
    isString(value.label) &&
    isString(value.carried_fragment) &&
    isString(value.asset_path) &&
    value.source_group === "generated" &&
    Array.isArray(value.tags) &&
    value.tags.every(isGeneratedTag)
  );
}

function isGeneratedEdge(value: unknown): value is GeneratedOverlayEdge {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.source) &&
    isString(value.target) &&
    value.relation === "interaction" &&
    typeof value.weight === "number" &&
    isStringArray(value.shared_tags)
  );
}

export function emptyGeneratedOverlay(): GeneratedOverlayGraph {
  return {
    version: 1,
    generated_at: new Date(0).toISOString(),
    nodes: [],
    edges: [],
  };
}

export function assertGeneratedOverlay(value: unknown): asserts value is GeneratedOverlayGraph {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isString(value.generated_at) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  ) {
    throw new Error("Invalid generated overlay: expected version, generated_at, nodes, and edges.");
  }

  for (const node of value.nodes) {
    if (!isGeneratedNode(node)) {
      throw new Error("Invalid generated overlay node: expected generated submission node.");
    }
  }

  for (const edge of value.edges) {
    if (!isGeneratedEdge(edge)) {
      throw new Error("Invalid generated overlay edge: expected interaction edge.");
    }
  }
}
```

- [ ] **Step 4: Add config path**

Modify `src/config/archiveVisualConfig.ts`:

```ts
data: {
  interactionGraphPath:
    "/data/algorithm/interaction_graph_real_submissions.json",
  timelinePath:
    "/data/algorithm/timeline/anchor_timeline_real_submissions.json",
  graphCachePath: "/data/graph/relationship_graph_3d.json",
  generatedOverlayPath: "/data/generated/submission_overlay_graph.json",
},
```

- [ ] **Step 5: Load overlay optionally**

Modify `src/data/archiveLoaders.ts` imports:

```ts
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import {
  assertGeneratedOverlay,
  emptyGeneratedOverlay,
  type GeneratedOverlayGraph,
} from "./generatedOverlay";
import type { SourceInteractionGraph, SourceTimeline } from "../types/archive";
```

Add optional loader:

```ts
async function loadOptionalJson<T>(
  path: string,
  assertValue: (value: unknown) => asserts value is T,
  fallback: T,
): Promise<T> {
  const response = await fetch(path);
  if (response.status === 404) {
    return fallback;
  }
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status} ${response.statusText}`);
  }

  const value: unknown = await response.json();
  assertValue(value);
  return value;
}
```

Modify `loadArchiveSources` return type and body:

```ts
export async function loadArchiveSources(): Promise<{
  graph: SourceInteractionGraph;
  timeline: SourceTimeline;
  generatedOverlay: GeneratedOverlayGraph;
}> {
  const [graph, timeline, generatedOverlay] = await Promise.all([
    loadJson(archiveVisualConfig.data.interactionGraphPath, assertInteractionGraph),
    loadJson(archiveVisualConfig.data.timelinePath, assertTimeline),
    loadOptionalJson(
      archiveVisualConfig.data.generatedOverlayPath,
      assertGeneratedOverlay,
      emptyGeneratedOverlay(),
    ),
  ]);

  return { graph, timeline, generatedOverlay };
}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm test -- --run src/data/generatedOverlaySchema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/config/archiveVisualConfig.ts src/data/archiveLoaders.ts src/data/generatedOverlay.ts src/data/generatedOverlaySchema.test.ts
git commit -m "feat: load generated archive overlay"
```

## Task 2: Merge Overlay Without Moving Existing Nodes

**Files:**
- Create: `src/data/generatedOverlayMerge.ts`
- Test: `src/data/generatedOverlayMerge.test.ts`
- Modify: `src/data/useArchiveData.ts`

- [ ] **Step 1: Write non-destructive merge tests**

Create `src/data/generatedOverlayMerge.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mergeGeneratedOverlay } from "./generatedOverlayMerge";
import type { ArchiveGraph } from "../types/archive";
import type { GeneratedOverlayGraph } from "./generatedOverlay";

function baseGraph(): ArchiveGraph {
  return {
    nodes: [
      {
        id: "base-a",
        type: "submission",
        stage: 0,
        position: { x: 0, y: 0, z: 0 },
        source_ids: ["base-a"],
        tags: [{ label: "Archive" }],
        tag_labels: ["Archive"],
        scores: {},
        events: [],
        asset_path: "/assets/avatars/stage0/base-a.png",
        visual: {
          size: 1.2,
          color_group: "identity",
          opacity: 1,
          label: "Name: Base A",
          node_shape: "mark",
          node_style_key: "identity-center",
        },
      },
      {
        id: "tag:Archive",
        type: "tag",
        stage: 2,
        position: { x: 0, y: 0, z: 0 },
        source_ids: [],
        tags: [{ label: "Archive" }],
        tag_labels: ["Archive"],
        scores: {},
        events: [],
        visual: {
          size: 0.42,
          color_group: "tag",
          opacity: 0.78,
          label: "Archive",
          node_shape: "particle",
          node_style_key: "tag-node",
        },
      },
    ],
    links: [
      {
        id: "shared_tag:base-a->tag:Archive",
        source: "base-a",
        target: "tag:Archive",
        type: "shared_tag",
        weight: 1,
        scores: {},
        events: [],
        visual: { style_key: "shared-tag", opacity: 0.28, thickness: 0.6, dash: false },
      },
    ],
    metadata: {
      layout: "stage2-model-sampled-avatar-map",
      seed: "test",
      source_files: [],
      generated_at: new Date(0).toISOString(),
    },
  };
}

function overlay(): GeneratedOverlayGraph {
  return {
    version: 1,
    generated_at: "2026-05-29T00:00:00.000Z",
    nodes: [
      {
        id: "generated-a",
        type: "submission",
        label: "Generated A",
        carried_fragment: "Generated fragment",
        asset_path: "/assets/avatars/generated/generated-a.png",
        tags: [{ label: "Archive", definition_source: "standard" }],
        source_group: "generated",
      },
    ],
    edges: [
      {
        id: "generated_shared:generated-a->base-a",
        source: "generated-a",
        target: "base-a",
        relation: "interaction",
        weight: 1,
        shared_tags: ["Archive"],
      },
    ],
  };
}

describe("mergeGeneratedOverlay", () => {
  it("adds generated submissions and relationships without mutating base graph", () => {
    const original = baseGraph();
    const originalNodeIds = original.nodes.map((node) => node.id);
    const merged = mergeGeneratedOverlay(original, overlay());

    expect(original.nodes.map((node) => node.id)).toEqual(originalNodeIds);
    expect(merged.nodes.map((node) => node.id)).toEqual(["base-a", "tag:Archive", "generated-a"]);
    expect(merged.links.map((link) => link.id)).toContain("generated_shared:generated-a->base-a");
    expect(merged.metadata.source_files).toEqual(original.metadata.source_files);
  });

  it("does not create new tag nodes for generated-only custom tags", () => {
    const customOverlay = overlay();
    customOverlay.nodes[0].tags.push({ label: "Custom invented tag", definition_source: "custom" });
    const merged = mergeGeneratedOverlay(baseGraph(), customOverlay);

    expect(merged.nodes.some((node) => node.id === "tag:Custom invented tag")).toBe(false);
    expect(merged.nodes.find((node) => node.id === "generated-a")?.tag_labels).toEqual(["Archive"]);
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- --run src/data/generatedOverlayMerge.test.ts
```

Expected: FAIL because `mergeGeneratedOverlay` does not exist.

- [ ] **Step 3: Implement merge**

Create `src/data/generatedOverlayMerge.ts`:

```ts
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { withPosition } from "./layout3d";
import type { GeneratedOverlayGraph, GeneratedOverlayNode } from "./generatedOverlay";
import type { ArchiveGraph, ArchiveGraphLink, ArchiveGraphNode } from "../types/archive";

function tagId(label: string): string {
  return `tag:${label}`;
}

function labelsForExistingTags(node: GeneratedOverlayNode, existingTagLabels: Set<string>): string[] {
  return [...new Set(node.tags.map((tag) => tag.label).filter((label) => existingTagLabels.has(label)))]
    .sort((a, b) => a.localeCompare(b));
}

function toArchiveNode(node: GeneratedOverlayNode, existingTagLabels: Set<string>): ArchiveGraphNode {
  const tagLabels = labelsForExistingTags(node, existingTagLabels);
  return withPosition({
    id: node.id,
    type: "submission",
    stage: 0,
    source_ids: [node.id],
    identity_name: node.label || node.id,
    carried_fragment: node.carried_fragment,
    tags: node.tags.filter((tag) => tagLabels.includes(tag.label)),
    tag_labels: tagLabels,
    scores: {},
    events: [],
    asset_path: node.asset_path,
    source_group: "generated",
    visual: {
      size: archiveVisualConfig.graph.identityNodeSize,
      color_group: "identity",
      opacity: 1,
      label: `Name: ${node.label || node.id}\n${node.carried_fragment}`.trim(),
      node_shape: "mark",
      node_style_key: "identity-center",
    },
  } as ArchiveGraphNode & { source_group: "generated" });
}

function sharedTagLinks(node: ArchiveGraphNode): ArchiveGraphLink[] {
  return node.tag_labels.map((label) => ({
    id: `generated_shared_tag:${node.id}->${tagId(label)}`,
    source: node.id,
    target: tagId(label),
    type: "shared_tag",
    weight: 1,
    scores: {},
    events: [],
    visual: { style_key: "shared-tag", opacity: 0.28, thickness: 0.6, dash: false },
  }));
}

export function mergeGeneratedOverlay(baseGraph: ArchiveGraph, overlay: GeneratedOverlayGraph): ArchiveGraph {
  if (overlay.nodes.length === 0 && overlay.edges.length === 0) {
    return baseGraph;
  }

  const existingIds = new Set(baseGraph.nodes.map((node) => node.id));
  const existingTagLabels = new Set(
    baseGraph.nodes
      .filter((node) => node.type === "tag")
      .flatMap((node) => node.tag_labels),
  );

  const generatedNodes = overlay.nodes
    .filter((node) => !existingIds.has(node.id))
    .map((node) => toArchiveNode(node, existingTagLabels));

  const generatedNodeIds = new Set(generatedNodes.map((node) => node.id));
  const validIds = new Set([...existingIds, ...generatedNodeIds]);
  const generatedLinks: ArchiveGraphLink[] = [
    ...generatedNodes.flatMap(sharedTagLinks),
    ...overlay.edges
      .filter((edge) => validIds.has(edge.source) && validIds.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "interaction",
        weight: edge.weight,
        scores: { total: edge.weight },
        events: [],
        visual: { style_key: "interaction", opacity: 0.5, thickness: 1.2, dash: false },
      })),
  ];

  const usedLinkIds = new Set(baseGraph.links.map((link) => link.id));
  const uniqueGeneratedLinks = generatedLinks.filter((link) => {
    if (usedLinkIds.has(link.id)) return false;
    usedLinkIds.add(link.id);
    return true;
  });

  return {
    ...baseGraph,
    nodes: [...baseGraph.nodes, ...generatedNodes],
    links: [...baseGraph.links, ...uniqueGeneratedLinks],
    metadata: {
      ...baseGraph.metadata,
      generated_overlay_at: overlay.generated_at,
    },
  };
}
```

- [ ] **Step 4: Wire merge into data hook**

Modify `src/data/useArchiveData.ts` so the loaded overlay is merged after the base graph is built:

```ts
import { mergeGeneratedOverlay } from "./generatedOverlayMerge";
```

Then replace the build call with:

```ts
const { graph, timeline, generatedOverlay } = await loadArchiveSources();
const baseGraph = buildArchiveGraph(graph, timeline);
const archiveGraph = mergeGeneratedOverlay(baseGraph, generatedOverlay);
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- --run src/data/generatedOverlayMerge.test.ts src/data/generatedOverlaySchema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/generatedOverlayMerge.ts src/data/generatedOverlayMerge.test.ts src/data/useArchiveData.ts
git commit -m "feat: merge generated archive overlay"
```

## Task 3: Confirm Generated Nodes Use Existing Collective Projection

**Files:**
- Modify: `src/components/RelationshipGraph3D.tsx`
- Test: no new test required if current projection code already includes generated nodes after merge.

- [ ] **Step 1: Inspect current projection code**

Run:

```bash
rg -n "projectNodeIntoAvatarShape|projectedNodeIndexById|avatarShapePositions" src/components/RelationshipGraph3D.tsx
```

Expected: output shows where node index and total are computed before `projectNodeIntoAvatarShape`.

- [ ] **Step 2: Keep the existing single projection group**

If `collectiveScopeNodes` is derived from the merged `archiveGraph.nodes`, keep the current single projection group. The generated nodes should participate in the same sorting, total count, and `projectNodeIntoAvatarShape` flow as the current nodes.

```ts
const projectedNodeIndexById = useMemo(
  () => new Map(projectedNodes.map((node, index) => [node.id, index])),
  [projectedNodes],
);
```

Important: do not add special generated-node projection branches unless the merged nodes fail to appear inside the avatar field. Existing node positions are allowed to change after generated nodes are added.

- [ ] **Step 3: Only patch if generated nodes are filtered out**

If generated submission nodes do not appear in the projection list because of a `source_group` or type filter, patch only the filter so generated submissions are included:

```ts
const projectedNodes = collectiveScopeNodes
  .filter((node) => node.type === "submission" || node.type === "tag" || node.type === "collective")
  .sort((a, b) => a.id.localeCompare(b.id));
```

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit only if this file changed**

```bash
git add src/components/RelationshipGraph3D.tsx
git commit -m "fix: include generated nodes in collective projection"
```

## Task 4: Build The Minimal Auto-Archive Script

**Files:**
- Create: `scripts/auto-archive-submissions.mjs`
- Create: `scripts/avatar-prompt-template.mjs`
- Create: `scripts/auto-archive-submissions.node-test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write script tests**

Create `scripts/auto-archive-submissions.node-test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStandardTagSet,
  createGeneratedEdges,
  standardTagsFromSubmission,
} from "./auto-archive-submissions.mjs";

const baseGraph = {
  nodes: [
    {
      id: "base-a",
      tags: [{ label: "Archive" }, { label: "Calm" }],
    },
    {
      id: "base-b",
      tags: [{ label: "Archive" }],
    },
  ],
  edges: [],
};

test("standardTagsFromSubmission skips custom tags and unknown labels", () => {
  const standardTagSet = buildStandardTagSet(baseGraph);
  const tags = standardTagsFromSubmission(
    {
      tags: ["Archive", "Custom invented tag", "Calm"],
      custom_tags: ["Archive"],
    },
    standardTagSet,
  );

  assert.deepEqual(tags, ["Archive", "Calm"]);
});

test("createGeneratedEdges creates deterministic shared-tag interactions", () => {
  const edges = createGeneratedEdges(
    {
      id: "generated-a",
      tags: [{ label: "Archive" }, { label: "Calm" }],
    },
    baseGraph.nodes,
    2,
  );

  assert.deepEqual(
    edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      weight: edge.weight,
      shared_tags: edge.shared_tags,
    })),
    [
      {
        source: "generated-a",
        target: "base-a",
        relation: "interaction",
        weight: 2,
        shared_tags: ["Archive", "Calm"],
      },
      {
        source: "generated-a",
        target: "base-b",
        relation: "interaction",
        weight: 1,
        shared_tags: ["Archive"],
      },
    ],
  );
});
```

- [ ] **Step 2: Run failing script tests**

Run:

```bash
node --test scripts/auto-archive-submissions.node-test.mjs
```

Expected: FAIL because `scripts/auto-archive-submissions.mjs` does not export the helpers.

- [ ] **Step 3: Implement deterministic ingestion without image generation first**

Create `scripts/avatar-prompt-template.mjs`:

```js
export const avatarPromptBase = `Generate a person / character design based on the following identity tags, without being limited to a standard human form. Maintain clear character recognizability and distinctive identity traits. Keep the design simplified, with a clear structure, strong silhouette, balanced proportions, and a prominent visual focal point.

Use a childlike simple drawing style overall, as if drawn by a 6-year-old child: rough black pencil lines, slightly shaky and uneven in thickness, with some contours allowed to remain slightly open; use simple flat coloring with uneven color fill.

The character should be shown alone, centered in the composition, in a full-body view, on a pure white background. Do not include any text, symbols, logos, watermarks, or background decorations in the image. The overall silhouette should be clean, clear, and easy to recognize, while avoiding overly complex or messy details.

No photorealism, no 3D, no polished thick-paint rendering, no complex lighting, no gradients, no highlights or shadows, no commercial illustration style, no excessive detail, and no realistic materials.

Identity tags:[IDENTITY_TAGS]`;

export const avatarTagFields = [
  "shell_form",
  "places",
  "expression_formats",
  "material_sources",
  "social_role_tags",
  "spatial_tags",
  "time_era_tags",
  "platform_behavior_tags",
  "emotion_personality_tags",
  "relationship_tags",
  "aesthetic_cultural_tags",
  "system_tags",
  "non_human_tags",
];

export function buildIdentityTagsBlock(tagsByField) {
  const lines = ["Identity tags:"];
  for (const field of avatarTagFields) {
    const values = Array.isArray(tagsByField[field])
      ? tagsByField[field].filter((value) => typeof value === "string" && value.trim())
      : [];
    lines.push(`${field}: ${values.length > 0 ? values.join(", ") : "None"}`);
  }
  return lines.join("\n");
}

export function buildAvatarPrompt(tagsByField) {
  return avatarPromptBase.replace("Identity tags:[IDENTITY_TAGS]", buildIdentityTagsBlock(tagsByField));
}
```

Create `scripts/auto-archive-submissions.mjs`:

```js
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ensureDir, graphPath, readJson, repoRoot, timelinePath } from "./archive-core.mjs";
import { avatarTagFields, buildAvatarPrompt } from "./avatar-prompt-template.mjs";

const overlayPath = path.join(repoRoot, "public/data/generated/submission_overlay_graph.json");
const registryPath = path.join(repoRoot, "public/data/generated/submission_overlay_registry.json");
const generatedAvatarDir = path.join(repoRoot, "public/assets/avatars/generated");

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return readJson(filePath);
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function normalizeSubmissionId(rawSubmission, filePath) {
  const direct = rawSubmission.submission_id || rawSubmission.id || rawSubmission.submissionId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return path.basename(filePath, path.extname(filePath));
}

function normalizeName(rawSubmission) {
  const value = rawSubmission.identity_name || rawSubmission.name || rawSubmission.avatar_name;
  return typeof value === "string" && value.trim() ? value.trim() : "Anonymous";
}

function normalizeCarriedFragment(rawSubmission) {
  const value =
    rawSubmission.carried_fragment ||
    rawSubmission.carriedFragment ||
    rawSubmission.fragment ||
    rawSubmission.memory;
  return typeof value === "string" ? value.trim() : "";
}

export function buildStandardTagSet(baseGraph) {
  return new Set(
    baseGraph.nodes
      .flatMap((node) => node.tags || [])
      .map((tag) => tag.label)
      .filter(Boolean),
  );
}

export function fieldTagsFromSubmission(rawSubmission, standardTagSet) {
  return Object.fromEntries(
    avatarTagFields.map((field) => {
      const values = Array.isArray(rawSubmission[field]) ? rawSubmission[field] : [];
      return [
        field,
        [...new Set(values)]
          .filter((tag) => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter((tag) => standardTagSet.has(tag))
          .sort((a, b) => a.localeCompare(b)),
      ];
    }),
  );
}

export function standardTagsFromFields(tagsByField) {
  return [...new Set(Object.values(tagsByField).flat())].sort((a, b) => a.localeCompare(b));
}

export function standardTagsFromSubmission(rawSubmission, standardTagSet) {
  const fieldTags = standardTagsFromFields(fieldTagsFromSubmission(rawSubmission, standardTagSet));
  const tagCandidates = [
    ...(Array.isArray(rawSubmission.tags) ? rawSubmission.tags : []),
    ...(Array.isArray(rawSubmission.selected_tags) ? rawSubmission.selected_tags : []),
    ...(Array.isArray(rawSubmission.standard_tags) ? rawSubmission.standard_tags : []),
  ];

  const fallbackTags = [...new Set(tagCandidates)]
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter((tag) => standardTagSet.has(tag))
    .sort((a, b) => a.localeCompare(b));
  return fieldTags.length > 0 ? fieldTags : fallbackTags;
}

export function createGeneratedEdges(generatedNode, baseNodes, maxTargets = 8) {
  const generatedTags = new Set((generatedNode.tags || []).map((tag) => tag.label));
  return baseNodes
    .map((baseNode) => {
      const sharedTags = [...new Set((baseNode.tags || []).map((tag) => tag.label).filter((label) => generatedTags.has(label)))]
        .sort((a, b) => a.localeCompare(b));
      return { baseNode, sharedTags };
    })
    .filter(({ sharedTags }) => sharedTags.length > 0)
    .sort((a, b) => b.sharedTags.length - a.sharedTags.length || a.baseNode.id.localeCompare(b.baseNode.id))
    .slice(0, maxTargets)
    .map(({ baseNode, sharedTags }) => ({
      id: `generated_shared:${generatedNode.id}->${baseNode.id}`,
      source: generatedNode.id,
      target: baseNode.id,
      relation: "interaction",
      weight: sharedTags.length,
      shared_tags: sharedTags,
    }));
}

export function shouldProcessSubmissionId(submissionId, baseSubmissionIds) {
  return !baseSubmissionIds.has(submissionId);
}

function submissionFiles(submissionsDir) {
  if (!submissionsDir || !fs.existsSync(submissionsDir)) return [];
  return fs
    .readdirSync(submissionsDir)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(submissionsDir, name));
}

function extractBase64Image(payload) {
  const imageUrl = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof imageUrl !== "string") {
    throw new Error("OpenRouter returned no image data URL.");
  }
  const match = imageUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) {
    throw new Error("OpenRouter image response was not a base64 data URL.");
  }
  return Buffer.from(match[1], "base64");
}

async function generateAvatarImage({ rawSubmission, node, outputPath, dryRun }) {
  ensureDir(path.dirname(outputPath));
  if (fs.existsSync(outputPath)) return;

  if (dryRun) {
    fs.writeFileSync(outputPath, "");
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required when --generate-images is used.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/Linglingletsgo/obfuscation-identity-archive",
      "X-Title": "Obfuscation Identity Archive",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.4-image-2",
      modalities: ["image", "text"],
      image_config: {
        aspect_ratio: "1:1",
        image_size: "1K",
      },
      messages: [
        {
          role: "user",
          content: buildAvatarPrompt(fieldTagsFromSubmission(rawSubmission, new Set(node.tags.map((tag) => tag.label)))),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  fs.writeFileSync(outputPath, extractBase64Image(payload));
}

export async function runAutoArchive({
  submissionsDir = process.env.AUTO_ARCHIVE_SUBMISSIONS_DIR,
  generateImages = false,
  dryRunImages = false,
} = {}) {
  const baseGraph = readJson(graphPath);
  const baseSubmissionIds = new Set(baseGraph.nodes.map((node) => node.id));
  const standardTagSet = buildStandardTagSet(baseGraph);
  const previousOverlay = readJsonIfExists(overlayPath, {
    version: 1,
    generated_at: new Date(0).toISOString(),
    base_graph_source: "/data/algorithm/interaction_graph_real_submissions.json",
    base_timeline_source: "/data/algorithm/timeline/anchor_timeline_real_submissions.json",
    nodes: [],
    edges: [],
  });
  const registry = readJsonIfExists(registryPath, { version: 1, submissions: {} });
  const nodesById = new Map(previousOverlay.nodes.map((node) => [node.id, node]));

  for (const filePath of submissionFiles(submissionsDir)) {
    const fileText = fs.readFileSync(filePath, "utf8");
    const rawSubmission = JSON.parse(fileText);
    if (!isRecord(rawSubmission)) continue;

    const submissionId = normalizeSubmissionId(rawSubmission, filePath);
    if (!shouldProcessSubmissionId(submissionId, baseSubmissionIds)) {
      continue;
    }

    const sourceHash = sha256(fileText);
    if (registry.submissions[submissionId]?.source_sha256 === sourceHash && nodesById.has(submissionId)) {
      continue;
    }

    const avatarPath = `/assets/avatars/generated/${submissionId}.png`;
    const tagsByField = fieldTagsFromSubmission(rawSubmission, standardTagSet);
    const node = {
      id: submissionId,
      type: "submission",
      label: normalizeName(rawSubmission),
      carried_fragment: normalizeCarriedFragment(rawSubmission),
      asset_path: avatarPath,
      tags: standardTagsFromFields(tagsByField).map((label) => ({
        label,
        category: "system",
        definition_source: "standard",
      })),
      source_group: "generated",
    };

    nodesById.set(submissionId, node);
    registry.submissions[submissionId] = {
      submission_id: submissionId,
      source_sha256: sourceHash,
      avatar_path: avatarPath,
      processed_at: new Date().toISOString(),
    };

    if (generateImages) {
      await generateAvatarImage({
        rawSubmission,
        node,
        outputPath: path.join(generatedAvatarDir, `${submissionId}.png`),
        dryRun: dryRunImages,
      });
    }
  }

  const nodes = [...nodesById.values()].sort((a, b) => a.id.localeCompare(b.id));
  const edges = nodes.flatMap((node) => createGeneratedEdges(node, baseGraph.nodes, 8));
  const overlay = {
    version: 1,
    generated_at: new Date().toISOString(),
    base_graph_source: "/data/algorithm/interaction_graph_real_submissions.json",
    base_timeline_source: "/data/algorithm/timeline/anchor_timeline_real_submissions.json",
    nodes,
    edges,
  };

  writeJson(overlayPath, overlay);
  writeJson(registryPath, registry);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const generateImages = process.argv.includes("--generate-images");
  const dryRunImages = process.argv.includes("--dry-run-images");
  await runAutoArchive({ generateImages, dryRunImages });
}
```

- [ ] **Step 4: Add npm script**

Modify `package.json`:

```json
"auto-archive:submissions": "node scripts/auto-archive-submissions.mjs",
"test:auto-archive": "node --test scripts/auto-archive-submissions.node-test.mjs"
```

- [ ] **Step 5: Verify script tests**

Run:

```bash
node --test scripts/auto-archive-submissions.node-test.mjs
```

Expected: PASS.

- [ ] **Step 6: Verify website build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json scripts/avatar-prompt-template.mjs scripts/auto-archive-submissions.mjs scripts/auto-archive-submissions.node-test.mjs
git commit -m "feat: add incremental submission archive script"
```

## Task 5: Add GitHub Actions Automation

**Files:**
- Create: `.github/workflows/auto-archive-submissions.yml`
- Create in survey repo: `.github/workflows/notify-archive-site.yml`

- [ ] **Step 1: Create target website workflow**

Create `.github/workflows/auto-archive-submissions.yml`:

```yaml
# Required secrets in Linglingletsgo/obfuscation-identity-archive:
# - OPENROUTER_API_KEY: OpenRouter image generation API key.
# - SURVEY_REPO_TOKEN: optional fine-grained token if the survey repo is private or cross-repo checkout needs explicit access.
# Optional trigger:
# - The survey repo calls repository_dispatch with type "survey-submission-updated" after submissions/** changes.

name: Auto Archive Submissions

on:
  workflow_dispatch:
    inputs:
      generate_images:
        description: "Generate missing avatar images"
        required: true
        default: "true"
        type: choice
        options:
          - "true"
          - "false"
  schedule:
    - cron: "0 3 * * 1"
  repository_dispatch:
    types:
      - survey-submission-updated

permissions:
  contents: write

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout website
        uses: actions/checkout@v4
        with:
          path: site

      - name: Checkout survey submissions
        uses: actions/checkout@v4
        with:
          repository: Linglingletsgo/obfuscation-identity-archive-survey
          path: survey
          token: ${{ secrets.SURVEY_REPO_TOKEN || github.token }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: site/package-lock.json

      - name: Install dependencies
        working-directory: site
        run: npm ci

      - name: Generate overlay
        working-directory: site
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          AUTO_ARCHIVE_SUBMISSIONS_DIR: ../survey/submissions
        run: |
          if [ "${{ github.event.inputs.generate_images || 'true' }}" = "true" ]; then
            npm run auto-archive:submissions -- --generate-images
          else
            npm run auto-archive:submissions
          fi

      - name: Test ingestion helpers
        working-directory: site
        run: node --test scripts/auto-archive-submissions.node-test.mjs

      - name: Build
        working-directory: site
        run: npm run build

      - name: Commit generated archive updates
        working-directory: site
        run: |
          if git diff --quiet -- public/data/generated public/assets/avatars/generated; then
            echo "No generated archive changes."
            exit 0
          fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/data/generated public/assets/avatars/generated
          git commit -m "chore: archive generated submissions"
          git push
```

- [ ] **Step 2: Create source survey repo dispatch workflow**

In `Linglingletsgo/obfuscation-identity-archive-survey`, create `.github/workflows/notify-archive-site.yml`:

```yaml
# Required secret in Linglingletsgo/obfuscation-identity-archive-survey:
# - ARCHIVE_SITE_DISPATCH_TOKEN: fine-grained GitHub token allowed to call repository_dispatch on Linglingletsgo/obfuscation-identity-archive.

name: Notify Archive Site

on:
  push:
    branches:
      - main
    paths:
      - "submissions/**"

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch website sync
        env:
          ARCHIVE_SITE_DISPATCH_TOKEN: ${{ secrets.ARCHIVE_SITE_DISPATCH_TOKEN }}
        run: |
          curl --fail-with-body \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${ARCHIVE_SITE_DISPATCH_TOKEN}" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            https://api.github.com/repos/Linglingletsgo/obfuscation-identity-archive/dispatches \
            -d '{"event_type":"survey-submission-updated","client_payload":{"source_repo":"Linglingletsgo/obfuscation-identity-archive-survey","source_path":"submissions"}}'
```

- [ ] **Step 3: Verify workflow syntax locally**

Run:

```bash
git diff --check .github/workflows/auto-archive-submissions.yml
```

Expected: no output in the website repo. In the survey repo, run the same command for `.github/workflows/notify-archive-site.yml`.

- [ ] **Step 4: Commit website workflow**

```bash
git add .github/workflows/auto-archive-submissions.yml
git commit -m "ci: archive submissions from survey repo"
```

- [ ] **Step 5: Commit survey workflow in the survey repo**

Run in `Linglingletsgo/obfuscation-identity-archive-survey`:

```bash
git add .github/workflows/notify-archive-site.yml
git commit -m "ci: notify archive site on new submissions"
git push origin main
```

## Task 6: End-To-End Verification With A Local Fixture

**Files:**
- Create temporarily: `tmp/generated-submission-fixture/submission_fixture.json`
- Generated by script: `public/data/generated/submission_overlay_graph.json`
- Generated by script: `public/data/generated/submission_overlay_registry.json`
- Generated by script in dry-run mode: `public/assets/avatars/generated/submission_fixture.png`

- [ ] **Step 1: Create fixture**

Run:

```bash
mkdir -p tmp/generated-submission-fixture
cat > tmp/generated-submission-fixture/submission_fixture.json <<'JSON'
{
  "submission_id": "submission_fixture",
  "identity_name": "Fixture Identity",
  "carried_fragment": "A test fragment that should never change the collective.",
  "tags": ["Archive", "Calm", "Custom invented tag"],
  "custom_tags": ["Custom invented tag"]
}
JSON
```

- [ ] **Step 2: Run dry-run ingestion**

Run:

```bash
AUTO_ARCHIVE_SUBMISSIONS_DIR=tmp/generated-submission-fixture npm run auto-archive:submissions -- --generate-images --dry-run-images
```

Expected:
- `public/data/generated/submission_overlay_graph.json` exists.
- It contains `submission_fixture`.
- It contains only base-known tags such as `Archive` and `Calm`.
- It does not edit `public/data/algorithm/timeline/anchor_timeline_real_submissions.json`.

- [ ] **Step 3: Confirm frozen files were not touched**

Run:

```bash
git diff --name-only public/data/algorithm public/data/baked public/models
```

Expected: no output.

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Remove dry-run fixture artifacts**

Run:

```bash
rm -rf tmp/generated-submission-fixture
rm -f public/assets/avatars/generated/submission_fixture.png
node - <<'NODE'
import fs from "node:fs";
const overlayPath = "public/data/generated/submission_overlay_graph.json";
const registryPath = "public/data/generated/submission_overlay_registry.json";
for (const filePath of [overlayPath, registryPath]) {
  if (!fs.existsSync(filePath)) continue;
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (filePath.endsWith("submission_overlay_graph.json")) {
    json.nodes = json.nodes.filter((node) => node.id !== "submission_fixture");
    json.edges = json.edges.filter((edge) => edge.source !== "submission_fixture" && edge.target !== "submission_fixture");
  } else {
    delete json.submissions.submission_fixture;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}
NODE
```

- [ ] **Step 6: Commit final verification cleanup if files remain changed**

Run:

```bash
git status --short
```

Expected: only intentional implementation files remain changed, or clean after prior commits.

## Task 7: Cross-Repository Immediate Sync Check

**Files:**
- Modify if needed: `.github/workflows/auto-archive-submissions.yml`
- Verify in survey repo: `.github/workflows/notify-archive-site.yml`

- [ ] **Step 1: Confirm the workflow reads the external survey repo**

Run:

```bash
rg -n "obfuscation-identity-archive-survey|AUTO_ARCHIVE_SUBMISSIONS_DIR|repository_dispatch" .github/workflows/auto-archive-submissions.yml
```

Expected output includes:

```text
repository: Linglingletsgo/obfuscation-identity-archive-survey
AUTO_ARCHIVE_SUBMISSIONS_DIR: ../survey/submissions
repository_dispatch:
```

- [ ] **Step 2: Confirm the workflow uses OpenRouter image generation**

Run:

```bash
rg -n "OPENROUTER_API_KEY|openai/gpt-5.4-image-2|image_size: \"1K\"|aspect_ratio: \"1:1\"" scripts/auto-archive-submissions.mjs .github/workflows/auto-archive-submissions.yml
```

Expected output includes:

```text
OPENROUTER_API_KEY
openai/gpt-5.4-image-2
image_size: "1K"
aspect_ratio: "1:1"
```

- [ ] **Step 3: Confirm the survey repo dispatches immediately on submissions changes**

Run in `Linglingletsgo/obfuscation-identity-archive-survey`:

```bash
rg -n "submissions/\\*\\*|ARCHIVE_SITE_DISPATCH_TOKEN|survey-submission-updated|dispatches" .github/workflows/notify-archive-site.yml
```

Expected output includes:

```text
submissions/**
ARCHIVE_SITE_DISPATCH_TOKEN
survey-submission-updated
dispatches
```

- [ ] **Step 4: Verify syntax**

Run:

```bash
git diff --check .github/workflows/auto-archive-submissions.yml
```

Expected: no output. Run the same command in the survey repo for `.github/workflows/notify-archive-site.yml`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/auto-archive-submissions.yml
git commit -m "ci: sync generated archive from survey repository"
```

## Risks And Guardrails

- **Existing node positions can change after overlay merge.** This is acceptable. Guardrail: generated and existing nodes must still use the same avatar-shape projection logic, so nodes remain inside the 3D avatar field.
- **New graph edges can make default line density look different.** Guardrail: keep `archiveVisualConfig.graph.defaultLinkDensity` unchanged at `0.1`; generated edges enter the same existing density filter.
- **Custom tags can create unbounded new tag nodes.** Guardrail: only accept labels present in the frozen base graph tag set.
- **Timeline can accidentally redefine collective membership.** Guardrail: script never writes timeline JSON and merge never creates `source_membership` links to the collective.
- **Image generation may fail or become expensive.** Guardrail: one image per new/changed submission hash, stored in registry; unchanged submissions are skipped.
- **Vercel deployment loops.** Guardrail: generation happens in GitHub Actions and commits only generated files when diffs exist.
- **Survey submissions are in a separate repository.** Guardrail: the website workflow checks out `Linglingletsgo/obfuscation-identity-archive-survey` into `../survey` and reads `../survey/submissions`; raw submissions are not copied into the website repo.

## Success Criteria

- New submissions produce avatar images in `public/assets/avatars/generated/`.
- New submissions appear in the index, individual pages, and collective graph as overlay nodes.
- Current timeline, current collective avatar, baked point cloud files, and existing model files remain byte-for-byte unchanged.
- Existing and generated nodes use the same projection logic and stay inside the 3D avatar model field; existing node positions are allowed to change.
- Default collective link density and visual style remain the same.
- Custom tags are skipped for relationship calculation and tag-node creation.
- GitHub Actions can run generation, tests, build, and commit generated updates.
- GitHub Actions can sync from `Linglingletsgo/obfuscation-identity-archive-survey/tree/main/submissions` without requiring manual file copying.

## Verification Commands

Run before final merge:

```bash
node --test scripts/auto-archive-submissions.node-test.mjs
npm test -- --run src/data/generatedOverlaySchema.test.ts src/data/generatedOverlayMerge.test.ts
npm run build
git diff --name-only public/data/algorithm public/data/baked public/models
```

Expected:
- All tests pass.
- Build passes.
- Frozen directories show no diff.
