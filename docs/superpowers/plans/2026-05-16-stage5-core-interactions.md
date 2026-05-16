# Stage5 Core Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Stage5 from a basic Three.js graph into a large avatar-contained, Obsidian-like force-directed internal browsing space with sprite nodes, zoom-driven overview/internal navigation, lightweight identity detail, and stable return context.

**Architecture:** Keep the existing Vite/React/R3F stack and current data builders, but split Stage5 behavior into focused modules: force layout, sprite texture generation, graph rendering, navigation state, and overlay UI. Stage5 becomes a modeful scene with overview/internal navigation while Stage0 entry is explicit rather than triggered directly by node click.

**Tech Stack:** React, TypeScript, Three.js, React Three Fiber, Drei, Vitest, Testing Library, Playwright.

---

## Current Decisions

- Stage5 avatar must be huge, and all graph nodes should live inside or on the surface of the avatar field.
- Layout should behave like an Obsidian force-directed graph driven by shared tag/tag community.
- Graph simulation should run briefly, settle, then freeze; filtering/focus should not destroy global spatial memory.
- Identity nodes are visually dominant and use distance-based billboard labels showing `Name:` and carried fragment.
- Tag nodes are all visible but extremely lightweight, not clickable, and only show tag label on hover/focus.
- Node geometry must not be default spheres. Use Canvas/SVG texture sprites as the primary node visual route.
- Default links: interaction and conflict links visible; shared-tag links only visible around hovered/focused nodes.
- Conflict links use only light visual difference: different color and slightly higher opacity, no strong glitch animation in this batch.
- Stage5 click on identity opens bottom overlay strip first; `Enter detail` action enters Stage0.
- Zoom controls switch between overview and internal browsing. `Esc` returns to overview.
- Stage5 navigation state belongs in `archiveStore`, not URL/hash.

## File Structure

- Modify `src/types/archive.ts`: add Stage5 navigation mode/state types and node community fields if needed.
- Modify `src/config/archiveVisualConfig.ts`: add Stage5 avatar scale, simulation settings, sprite sizes, label distance thresholds, and link visibility defaults.
- Create `src/data/stage5ForceLayout.ts`: deterministic force-style internal layout seeded by graph links and shared tag communities.
- Test `src/data/stage5ForceLayout.test.ts`: verifies deterministic positions, nodes stay within avatar radius, and shared-tag connected nodes cluster closer than unrelated nodes.
- Create `src/components/GraphNodeSprite.tsx`: Canvas texture sprite marks for identity/tag/timeline/collective nodes.
- Create `src/components/IdentityBillboardLabel.tsx`: distance-aware identity label display.
- Modify `src/components/RelationshipGraph3D.tsx`: remove `Sphere`, render sprites, hover-only shared-tag links, tag hover label, identity overlay selection.
- Modify `src/components/StageScene.tsx`: scale Stage5 avatar, detect zoom thresholds, store Stage5 camera/navigation state, handle `Esc`.
- Modify `src/components/AvatarPointCloud.tsx`: accept scale/opacity props for huge Stage5 field.
- Create `src/components/Stage5IdentityOverlay.tsx`: bottom overlay strip with identity metadata and explicit `Enter detail` button.
- Modify `src/components/ArchiveExperience.tsx`: render Stage5 overlay and preserve Stage5 state when entering/exiting detail.
- Modify `src/state/archiveStore.tsx`: add Stage5 navigation state, hovered node/tag, pending Stage0 identity, and explicit `enterIdentityDetail`.
- Modify `src/state/archiveStore.test.tsx`: cover click-to-overlay vs explicit Stage0 entry, Stage5 state persistence, Esc/overview state.
- Modify `src/styles/archive.css`: bottom overlay strip, Stage5 hover label, canvas overlay styling.
- Modify `tests/e2e/archive-experience.spec.ts`: smoke-test Stage5 initial overview, identity overlay behavior, search fading model, and explicit Stage0 entry.

## Task 1: Stage5 Navigation State

**Files:**
- Modify: `src/types/archive.ts`
- Modify: `src/state/archiveStore.tsx`
- Modify: `src/state/archiveStore.test.tsx`

- [ ] **Step 1: Write failing state tests**

Replace `src/state/archiveStore.test.tsx` with:

```tsx
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "./archiveStore";

describe("archive store", () => {
  it("starts in Stage5 overview mode", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    expect(result.current.stage).toBe(5);
    expect(result.current.stage5Navigation.mode).toBe("overview");
    expect(result.current.selectedIdentityId).toBeNull();
  });

  it("selects identity in Stage5 without entering Stage0", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() => result.current.previewIdentity("submission_a"));

    expect(result.current.stage).toBe(5);
    expect(result.current.stage5Navigation.selectedIdentityId).toBe("submission_a");
    expect(result.current.selectedIdentityId).toBeNull();
  });

  it("enters Stage0 only through explicit identity detail action", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() => result.current.previewIdentity("submission_a"));
    act(() => result.current.enterIdentityDetail("submission_a"));

    expect(result.current.stage).toBe(0);
    expect(result.current.selectedIdentityId).toBe("submission_a");
    expect(result.current.stage5Navigation.selectedIdentityId).toBe("submission_a");
  });

  it("returns to Stage5 while preserving internal navigation state", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() =>
      result.current.updateStage5Navigation({
        mode: "internal",
        selectedIdentityId: "submission_a",
        cameraPosition: [1, 2, 3],
        cameraTarget: [4, 5, 6],
      }),
    );
    act(() => result.current.enterIdentityDetail("submission_a"));
    act(() => result.current.openCollective());

    expect(result.current.stage).toBe(5);
    expect(result.current.stage5Navigation.mode).toBe("internal");
    expect(result.current.stage5Navigation.cameraPosition).toEqual([1, 2, 3]);
    expect(result.current.stage5Navigation.selectedIdentityId).toBe("submission_a");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/state/archiveStore.test.tsx --run`

Expected: FAIL with missing `stage5Navigation`, `previewIdentity`, `enterIdentityDetail`, and `updateStage5Navigation`.

- [ ] **Step 3: Add Stage5 state types**

Append to `src/types/archive.ts`:

```ts
export type Stage5NavigationMode = "overview" | "internal";

export type Stage5NavigationState = {
  mode: Stage5NavigationMode;
  selectedIdentityId: string | null;
  hoveredNodeId: string | null;
  hoveredTagLabel: string | null;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
};
```

- [ ] **Step 4: Update archive store**

In `src/state/archiveStore.tsx`, import `Stage5NavigationState` and add this initial state:

```ts
const initialStage5Navigation: Stage5NavigationState = {
  mode: "overview",
  selectedIdentityId: null,
  hoveredNodeId: null,
  hoveredTagLabel: null,
  cameraPosition: [...archiveVisualConfig.camera.stage5Position],
  cameraTarget: [0, 0, 0],
};
```

Extend `ArchiveStore`:

```ts
stage5Navigation: Stage5NavigationState;
previewIdentity: (identityId: string) => void;
enterIdentityDetail: (identityId: string) => void;
updateStage5Navigation: (next: Partial<Stage5NavigationState>) => void;
```

Add state:

```ts
const [stage5Navigation, setStage5Navigation] = useState<Stage5NavigationState>(initialStage5Navigation);
```

Replace direct Stage0 behavior with explicit preview/detail behavior:

```ts
previewIdentity(identityId) {
  setStage5Navigation((current) => ({
    ...current,
    selectedIdentityId: identityId,
  }));
},
enterIdentityDetail(identityId) {
  setSelectedIdentityId(identityId);
  setSelectedTimelineItemId(null);
  setStage(0);
},
updateStage5Navigation(next) {
  setStage5Navigation((current) => ({ ...current, ...next }));
},
openIdentity(identityId) {
  setSelectedIdentityId(identityId);
  setSelectedTimelineItemId(null);
  setStage(0);
},
openCollective() {
  setStage(5);
  setSelectedTimelineItemId(null);
},
```

Keep `openIdentity` temporarily for Stage0 callers, but Stage5 graph must stop using it in Task 4.

- [ ] **Step 5: Run state tests**

Run: `npm test -- src/state/archiveStore.test.tsx --run`

Expected: PASS.

- [ ] **Step 6: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/archive.ts src/state/archiveStore.tsx src/state/archiveStore.test.tsx
git commit -m "feat: add stage5 navigation state"
```

## Task 2: Avatar-Contained Force Layout

**Files:**
- Create: `src/data/stage5ForceLayout.ts`
- Create: `src/data/stage5ForceLayout.test.ts`
- Modify: `src/config/archiveVisualConfig.ts`

- [ ] **Step 1: Write failing layout tests**

Create `src/data/stage5ForceLayout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ArchiveGraph } from "../types/archive";
import { applyStage5ForceLayout } from "./stage5ForceLayout";

const graph: ArchiveGraph = {
  nodes: [
    baseNode("identity:a", "submission", ["shared"], 0),
    baseNode("identity:b", "submission", ["shared"], 0),
    baseNode("identity:c", "submission", ["other"], 0),
    baseNode("tag:shared", "tag", ["shared"], 5),
    baseNode("tag:other", "tag", ["other"], 5),
  ],
  links: [
    baseLink("identity:a", "tag:shared", "shared_tag"),
    baseLink("identity:b", "tag:shared", "shared_tag"),
    baseLink("identity:c", "tag:other", "shared_tag"),
    baseLink("identity:a", "identity:b", "interaction"),
  ],
  metadata: {
    layout: "deterministic-avatar-map",
    seed: "test-seed",
    source_files: [],
    generated_at: "1970-01-01T00:00:00.000Z",
  },
};

function baseNode(id: string, type: "submission" | "tag", tagLabels: string[], stage: 0 | 5) {
  return {
    id,
    type,
    stage,
    source_ids: [],
    tags: [],
    tag_labels: tagLabels,
    scores: {},
    events: [],
    position: { x: 0, y: 0, z: 0 },
    visual: {
      size: type === "submission" ? 1.2 : 0.42,
      color_group: type,
      opacity: 1,
      label: id,
      node_shape: "mark",
      node_style_key: type,
    },
  } as const;
}

function baseLink(source: string, target: string, type: "shared_tag" | "interaction") {
  return {
    id: `${type}:${source}->${target}`,
    source,
    target,
    type,
    weight: 1,
    scores: {},
    events: [],
    visual: { style_key: type, opacity: 0.5, thickness: 1, dash: false },
  } as const;
}

function distance(a: { position: { x: number; y: number; z: number } }, b: { position: { x: number; y: number; z: number } }) {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z);
}

describe("applyStage5ForceLayout", () => {
  it("is deterministic for the same graph", () => {
    expect(applyStage5ForceLayout(graph).nodes.map((node) => node.position)).toEqual(
      applyStage5ForceLayout(graph).nodes.map((node) => node.position),
    );
  });

  it("keeps nodes inside the avatar volume", () => {
    const result = applyStage5ForceLayout(graph, { avatarRadius: 18 });
    expect(
      result.nodes.every((node) => Math.hypot(node.position.x, node.position.y, node.position.z) <= 18),
    ).toBe(true);
  });

  it("keeps shared-tag neighbors closer than unrelated identities", () => {
    const result = applyStage5ForceLayout(graph);
    const byId = new Map(result.nodes.map((node) => [node.id, node]));
    expect(distance(byId.get("identity:a")!, byId.get("identity:b")!)).toBeLessThan(
      distance(byId.get("identity:a")!, byId.get("identity:c")!),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/data/stage5ForceLayout.test.ts --run`

Expected: FAIL because `stage5ForceLayout.ts` does not exist.

- [ ] **Step 3: Add config**

Extend `archiveVisualConfig.graph`:

```ts
stage5AvatarRadius: 18,
stage5InternalRadius: 15,
stage5SimulationTicks: 180,
stage5CommunityPull: 0.045,
stage5LinkPull: 0.018,
stage5Repel: 0.12,
```

- [ ] **Step 4: Implement deterministic layout**

Create `src/data/stage5ForceLayout.ts`:

```ts
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";

type LayoutOptions = {
  avatarRadius?: number;
  ticks?: number;
};

type MutablePoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function seedPoint(node: ArchiveGraphNode, radius: number): MutablePoint {
  const theta = hashUnit(`${node.id}:theta`) * Math.PI * 2;
  const phi = Math.acos(2 * hashUnit(`${node.id}:phi`) - 1);
  const r = radius * (0.18 + hashUnit(`${node.id}:r`) * 0.72);
  return {
    id: node.id,
    x: Math.sin(phi) * Math.cos(theta) * r,
    y: Math.sin(phi) * Math.sin(theta) * r,
    z: Math.cos(phi) * r,
    vx: 0,
    vy: 0,
    vz: 0,
  };
}

function clampToSphere(point: MutablePoint, radius: number): void {
  const length = Math.hypot(point.x, point.y, point.z);
  if (length <= radius || length === 0) return;
  const scale = radius / length;
  point.x *= scale;
  point.y *= scale;
  point.z *= scale;
}

function roundedPosition(point: MutablePoint) {
  return {
    x: Number(point.x.toFixed(4)),
    y: Number(point.y.toFixed(4)),
    z: Number(point.z.toFixed(4)),
  };
}

export function applyStage5ForceLayout(graph: ArchiveGraph, options: LayoutOptions = {}): ArchiveGraph {
  const avatarRadius = options.avatarRadius ?? archiveVisualConfig.graph.stage5AvatarRadius;
  const ticks = options.ticks ?? archiveVisualConfig.graph.stage5SimulationTicks;
  const points = new Map(graph.nodes.map((node) => [node.id, seedPoint(node, avatarRadius)]));
  const links = graph.links.filter((link) => link.type === "interaction" || link.type === "shared_tag");

  for (let tick = 0; tick < ticks; tick += 1) {
    for (let a = 0; a < graph.nodes.length; a += 1) {
      for (let b = a + 1; b < graph.nodes.length; b += 1) {
        const pa = points.get(graph.nodes[a].id)!;
        const pb = points.get(graph.nodes[b].id)!;
        const dx = pa.x - pb.x || 0.001;
        const dy = pa.y - pb.y || 0.001;
        const dz = pa.z - pb.z || 0.001;
        const distanceSq = Math.max(dx * dx + dy * dy + dz * dz, 0.01);
        const force = archiveVisualConfig.graph.stage5Repel / distanceSq;
        pa.vx += dx * force;
        pa.vy += dy * force;
        pa.vz += dz * force;
        pb.vx -= dx * force;
        pb.vy -= dy * force;
        pb.vz -= dz * force;
      }
    }

    for (const link of links) {
      const source = points.get(link.source);
      const target = points.get(link.target);
      if (!source || !target) continue;
      const pull = link.type === "shared_tag"
        ? archiveVisualConfig.graph.stage5CommunityPull
        : archiveVisualConfig.graph.stage5LinkPull;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      source.vx += dx * pull;
      source.vy += dy * pull;
      source.vz += dz * pull;
      target.vx -= dx * pull;
      target.vy -= dy * pull;
      target.vz -= dz * pull;
    }

    for (const point of points.values()) {
      point.x += point.vx;
      point.y += point.vy;
      point.z += point.vz;
      point.vx *= 0.62;
      point.vy *= 0.62;
      point.vz *= 0.62;
      clampToSphere(point, avatarRadius);
    }
  }

  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: roundedPosition(points.get(node.id)!),
    })),
  };
}
```

- [ ] **Step 5: Run layout test**

Run: `npm test -- src/data/stage5ForceLayout.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/stage5ForceLayout.ts src/data/stage5ForceLayout.test.ts src/config/archiveVisualConfig.ts
git commit -m "feat: add stage5 avatar-contained force layout"
```

## Task 3: Sprite Node Visuals

**Files:**
- Create: `src/components/GraphNodeSprite.tsx`
- Create: `src/components/GraphNodeSprite.test.tsx`
- Modify: `src/config/archiveVisualConfig.ts`

- [ ] **Step 1: Write texture helper test**

Create `src/components/GraphNodeSprite.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { getNodeSpriteSpec } from "./GraphNodeSprite";
import type { ArchiveGraphNode } from "../types/archive";

function node(type: ArchiveGraphNode["type"]): ArchiveGraphNode {
  return {
    id: `${type}:1`,
    type,
    source_ids: [],
    tags: [],
    tag_labels: [],
    scores: {},
    events: [],
    position: { x: 0, y: 0, z: 0 },
    visual: {
      size: 1,
      color_group: type,
      opacity: 1,
      label: type,
      node_shape: "mark",
      node_style_key: type,
    },
  };
}

describe("getNodeSpriteSpec", () => {
  it("makes identity sprites larger than tag sprites", () => {
    expect(getNodeSpriteSpec(node("submission")).scale).toBeGreaterThan(getNodeSpriteSpec(node("tag")).scale);
  });

  it("keeps tag sprites lightweight and non-spherical", () => {
    expect(getNodeSpriteSpec(node("tag")).shape).toBe("dot-mark");
    expect(getNodeSpriteSpec(node("tag")).opacity).toBeLessThan(0.8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/GraphNodeSprite.test.tsx --run`

Expected: FAIL because `GraphNodeSprite.tsx` does not exist.

- [ ] **Step 3: Add config**

Extend `archiveVisualConfig.graph`:

```ts
identitySpriteScale: 0.72,
tagSpriteScale: 0.2,
timelineSpriteScale: 0.34,
tagSpriteOpacity: 0.42,
identitySpriteOpacity: 0.94,
```

- [ ] **Step 4: Implement sprite component**

Create `src/components/GraphNodeSprite.tsx`:

```tsx
import { Sprite, SpriteMaterial, CanvasTexture, Color } from "three";
import { useMemo } from "react";
import { primitive } from "@react-three/fiber";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveGraphNode } from "../types/archive";

type SpriteShape = "identity-mark" | "dot-mark" | "timeline-mark" | "collective-mark";

export type NodeSpriteSpec = {
  shape: SpriteShape;
  color: string;
  scale: number;
  opacity: number;
};

export function getNodeSpriteSpec(node: ArchiveGraphNode): NodeSpriteSpec {
  if (node.type === "tag") {
    return {
      shape: "dot-mark",
      color: archiveVisualConfig.colors.tag,
      scale: archiveVisualConfig.graph.tagSpriteScale,
      opacity: archiveVisualConfig.graph.tagSpriteOpacity,
    };
  }

  if (node.type === "timeline_item") {
    return {
      shape: "timeline-mark",
      color: archiveVisualConfig.colors.timeline,
      scale: archiveVisualConfig.graph.timelineSpriteScale,
      opacity: 0.72,
    };
  }

  if (node.type === "collective") {
    return {
      shape: "collective-mark",
      color: archiveVisualConfig.colors.collective,
      scale: 1.1,
      opacity: 0.36,
    };
  }

  return {
    shape: "identity-mark",
    color: archiveVisualConfig.colors.identity,
    scale: archiveVisualConfig.graph.identitySpriteScale,
    opacity: archiveVisualConfig.graph.identitySpriteOpacity,
  };
}

function createSpriteTexture(spec: NodeSpriteSpec): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = archiveVisualConfig.colors.ink;
  context.fillStyle = spec.color;
  context.globalAlpha = spec.opacity;
  context.lineWidth = spec.shape === "dot-mark" ? 5 : 8;

  if (spec.shape === "dot-mark") {
    context.beginPath();
    context.ellipse(64, 64, 18, 13, -0.3, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(25, 42);
    context.quadraticCurveTo(58, 15, 95, 36);
    context.quadraticCurveTo(112, 68, 88, 98);
    context.quadraticCurveTo(50, 114, 24, 86);
    context.quadraticCurveTo(10, 62, 25, 42);
    context.fill();
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = "srgb";
  return texture;
}

export function GraphNodeSprite({
  node,
  opacityMultiplier = 1,
  onClick,
  onPointerOut,
  onPointerOver,
}: {
  node: ArchiveGraphNode;
  opacityMultiplier?: number;
  onClick?: () => void;
  onPointerOut?: () => void;
  onPointerOver?: () => void;
}) {
  const spec = getNodeSpriteSpec(node);
  const sprite = useMemo(() => {
    const material = new SpriteMaterial({
      map: createSpriteTexture(spec),
      color: new Color("#ffffff"),
      transparent: true,
      opacity: spec.opacity * opacityMultiplier,
      depthWrite: false,
    });
    const object = new Sprite(material);
    object.scale.setScalar(spec.scale);
    return object;
  }, [opacityMultiplier, spec.color, spec.opacity, spec.scale, spec.shape]);

  sprite.position.set(node.position.x, node.position.y, node.position.z);

  return (
    <primitive
      object={sprite}
      onClick={(event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerOut={(event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onPointerOut?.();
      }}
      onPointerOver={(event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onPointerOver?.();
      }}
    />
  );
}
```

- [ ] **Step 5: Run sprite test**

Run: `npm test -- src/components/GraphNodeSprite.test.tsx --run`

Expected: PASS.

- [ ] **Step 6: Run build**

Run: `npm run build`

Expected: PASS. If `primitive` import fails, remove the named import and use JSX `<primitive>` directly; R3F registers it globally.

- [ ] **Step 7: Commit**

```bash
git add src/components/GraphNodeSprite.tsx src/components/GraphNodeSprite.test.tsx src/config/archiveVisualConfig.ts
git commit -m "feat: add sprite graph node visuals"
```

## Task 4: Stage5 Graph Rendering Behavior

**Files:**
- Modify: `src/components/RelationshipGraph3D.tsx`
- Create: `src/components/IdentityBillboardLabel.tsx`
- Create: `src/components/Stage5HoverLabel.tsx`
- Modify: `src/styles/archive.css`

- [ ] **Step 1: Add rendering behavior tests via component-safe helpers**

Create `src/components/relationshipGraphVisibility.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ArchiveGraph, ArchiveGraphLink } from "../types/archive";
import { shouldRenderGraphLink, getNodeOpacityMultiplier } from "./RelationshipGraph3D";

function link(type: ArchiveGraphLink["type"], source = "a", target = "b"): ArchiveGraphLink {
  return {
    id: `${type}:${source}:${target}`,
    source,
    target,
    type,
    weight: 1,
    scores: {},
    events: [],
    visual: { style_key: type, opacity: 0.5, thickness: 1, dash: false },
  };
}

const graph = {
  nodes: [
    { id: "a", tag_labels: ["Dream"] },
    { id: "b", tag_labels: ["Dream"] },
    { id: "c", tag_labels: ["Other"] },
  ],
} as ArchiveGraph;

describe("RelationshipGraph3D visibility helpers", () => {
  it("renders interaction and conflict links by default", () => {
    expect(shouldRenderGraphLink(link("interaction"), null)).toBe(true);
    expect(shouldRenderGraphLink(link("conflict_tag"), null)).toBe(true);
  });

  it("hides shared tag links until a related node is focused", () => {
    expect(shouldRenderGraphLink(link("shared_tag"), null)).toBe(false);
    expect(shouldRenderGraphLink(link("shared_tag"), "a")).toBe(true);
    expect(shouldRenderGraphLink(link("shared_tag"), "c")).toBe(false);
  });

  it("dims nodes that do not match search", () => {
    expect(getNodeOpacityMultiplier(graph.nodes[0] as never, "dream")).toBe(1);
    expect(getNodeOpacityMultiplier(graph.nodes[2] as never, "dream")).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/relationshipGraphVisibility.test.ts --run`

Expected: FAIL because helper exports do not exist.

- [ ] **Step 3: Add billboard and hover label components**

Create `src/components/IdentityBillboardLabel.tsx`:

```tsx
import { Html } from "@react-three/drei";
import type { ArchiveGraphNode } from "../types/archive";

export function IdentityBillboardLabel({ node }: { node: ArchiveGraphNode }) {
  if (node.type !== "submission") return null;

  return (
    <Html
      position={[node.position.x, node.position.y + 0.42, node.position.z]}
      center
      distanceFactor={12}
      className="identity-billboard"
    >
      <strong>Name: {node.identity_name || node.id}</strong>
      {node.carried_fragment ? <span>{node.carried_fragment}</span> : null}
    </Html>
  );
}
```

Create `src/components/Stage5HoverLabel.tsx`:

```tsx
import { Html } from "@react-three/drei";
import type { ArchiveGraphNode } from "../types/archive";

export function Stage5HoverLabel({ node }: { node: ArchiveGraphNode | null }) {
  if (!node || node.type !== "tag") return null;

  return (
    <Html
      position={[node.position.x, node.position.y + 0.24, node.position.z]}
      center
      distanceFactor={10}
      className="tag-hover-label"
    >
      {node.visual.label}
    </Html>
  );
}
```

- [ ] **Step 4: Replace sphere rendering with sprites**

In `src/components/RelationshipGraph3D.tsx`:

- Remove `Sphere` import.
- Import `GraphNodeSprite`, `IdentityBillboardLabel`, and `Stage5HoverLabel`.
- Export helper functions:

```ts
export function shouldRenderGraphLink(link: ArchiveGraphLink, focusedNodeId: string | null): boolean {
  if (link.type === "interaction" || link.type === "conflict_tag") return true;
  if (link.type !== "shared_tag") return false;
  return focusedNodeId === link.source || focusedNodeId === link.target;
}

export function getNodeOpacityMultiplier(node: Pick<ArchiveGraphNode, "id" | "identity_name" | "carried_fragment" | "tag_labels" | "visual">, query: string): number {
  if (!query) return 1;
  const matches = [node.id, node.identity_name, node.carried_fragment, node.visual.label, ...node.tag_labels]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query.toLowerCase()));
  return matches ? 1 : 0.16;
}
```

Update graph rendering behavior:

```tsx
const { filters, previewIdentity, selectNode, stage5Navigation, updateStage5Navigation } = useArchiveStore();
const focusedNodeId = stage5Navigation.hoveredNodeId || stage5Navigation.selectedIdentityId;
const hoveredNode = focusedNodeId ? nodeById.get(focusedNodeId) ?? null : null;
const visibleLinks = graph.links.filter((link) => {
  if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return false;
  return shouldRenderGraphLink(link, focusedNodeId);
});
```

Render node sprites:

```tsx
{visibleNodes.map((node) => (
  <GraphNodeSprite
    key={node.id}
    node={node}
    opacityMultiplier={getNodeOpacityMultiplier(node, query)}
    onPointerOver={() => {
      selectNode(node);
      updateStage5Navigation({
        hoveredNodeId: node.id,
        hoveredTagLabel: node.type === "tag" ? node.visual.label : null,
      });
    }}
    onPointerOut={() => {
      updateStage5Navigation({ hoveredNodeId: null, hoveredTagLabel: null });
    }}
    onClick={() => {
      selectNode(node);
      if (node.type === "submission") previewIdentity(node.id);
    }}
  />
))}
{visibleNodes.map((node) => (
  <IdentityBillboardLabel key={`${node.id}:label`} node={node} />
))}
<Stage5HoverLabel node={hoveredNode} />
```

Keep tag click as no-op by only calling `previewIdentity` for `submission`.

- [ ] **Step 5: Add CSS**

Append to `src/styles/archive.css`:

```css
.identity-billboard {
  min-width: 140px;
  max-width: 260px;
  color: #18140f;
  font-size: 12px;
  line-height: 1.25;
  pointer-events: none;
  text-align: center;
  text-shadow: 0 1px 0 rgba(255, 252, 244, 0.92);
}

.identity-billboard span {
  display: block;
  margin-top: 2px;
  font-size: 11px;
}

.tag-hover-label {
  color: #2f7f6f;
  font-size: 11px;
  pointer-events: none;
  text-shadow: 0 1px 0 rgba(255, 252, 244, 0.92);
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/components/relationshipGraphVisibility.test.ts src/components/GraphNodeSprite.test.tsx --run
```

Expected: PASS.

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/RelationshipGraph3D.tsx src/components/IdentityBillboardLabel.tsx src/components/Stage5HoverLabel.tsx src/components/relationshipGraphVisibility.test.ts src/styles/archive.css
git commit -m "feat: replace stage5 graph spheres with sprite interactions"
```

## Task 5: Zoom-Driven Overview/Internal Mode

**Files:**
- Modify: `src/components/StageScene.tsx`
- Modify: `src/components/AvatarPointCloud.tsx`
- Modify: `src/config/archiveVisualConfig.ts`
- Test: `src/components/stage5NavigationMode.test.ts`

- [ ] **Step 1: Write mode helper test**

Create `src/components/stage5NavigationMode.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getStage5ModeForCameraDistance } from "./StageScene";

describe("getStage5ModeForCameraDistance", () => {
  it("uses overview mode when camera is far", () => {
    expect(getStage5ModeForCameraDistance(30)).toBe("overview");
  });

  it("uses internal mode when camera enters avatar threshold", () => {
    expect(getStage5ModeForCameraDistance(12)).toBe("internal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/stage5NavigationMode.test.ts --run`

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Add config**

Extend `archiveVisualConfig.camera`:

```ts
stage5OverviewDistance: 32,
stage5InternalDistanceThreshold: 16,
stage5AvatarScale: 6,
```

- [ ] **Step 4: Update AvatarPointCloud props**

Modify `src/components/AvatarPointCloud.tsx`:

```tsx
export function AvatarPointCloud({
  modelPath,
  opacity = 0.32,
  scale = 1,
}: {
  modelPath: string;
  opacity?: number;
  scale?: number;
}) {
  // keep existing positions code
  return (
    <group scale={scale}>
      <Points positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial size={0.045} color="#252525" transparent opacity={opacity} depthWrite={false} />
      </Points>
    </group>
  );
}
```

- [ ] **Step 5: Add camera mode tracking**

In `src/components/StageScene.tsx`, export helper:

```ts
export function getStage5ModeForCameraDistance(distance: number) {
  return distance <= archiveVisualConfig.camera.stage5InternalDistanceThreshold ? "internal" : "overview";
}
```

Add an inner component:

```tsx
function Stage5CameraStateSync() {
  const { camera } = useThree();
  const { stage, stage5Navigation, updateStage5Navigation } = useArchiveStore();

  useFrame(() => {
    if (stage !== 5) return;
    const distance = camera.position.length();
    const mode = getStage5ModeForCameraDistance(distance);
    if (mode !== stage5Navigation.mode) {
      updateStage5Navigation({
        mode,
        cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
      });
    }
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        camera.position.set(...archiveVisualConfig.camera.stage5Position);
        updateStage5Navigation({
          mode: "overview",
          cameraPosition: [...archiveVisualConfig.camera.stage5Position],
          cameraTarget: [0, 0, 0],
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [camera, updateStage5Navigation]);

  return null;
}
```

Imports required:

```ts
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
```

Render inside `<Canvas>`:

```tsx
<Stage5CameraStateSync />
```

Pass avatar scale:

```tsx
<AvatarPointCloud
  modelPath={archiveVisualConfig.assets.stage5ModelPath}
  scale={archiveVisualConfig.camera.stage5AvatarScale}
  opacity={stage === 5 ? 0.44 : 0.2}
/>
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/components/stage5NavigationMode.test.ts src/state/archiveStore.test.tsx --run
```

Expected: PASS.

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/StageScene.tsx src/components/AvatarPointCloud.tsx src/components/stage5NavigationMode.test.ts src/config/archiveVisualConfig.ts
git commit -m "feat: add zoom-driven stage5 navigation mode"
```

## Task 6: Stage5 Identity Overlay

**Files:**
- Create: `src/components/Stage5IdentityOverlay.tsx`
- Create: `src/components/Stage5IdentityOverlay.test.tsx`
- Modify: `src/components/ArchiveExperience.tsx`
- Modify: `src/styles/archive.css`

- [ ] **Step 1: Write overlay test**

Create `src/components/Stage5IdentityOverlay.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "../state/archiveStore";
import { Stage5IdentityOverlay } from "./Stage5IdentityOverlay";

function SelectIdentity() {
  const { updateStage5Navigation } = useArchiveStore();
  return (
    <button
      type="button"
      onClick={() => updateStage5Navigation({ selectedIdentityId: "submission_a" })}
    >
      select
    </button>
  );
}

describe("Stage5IdentityOverlay", () => {
  it("renders selected identity and enters Stage0 through explicit action", () => {
    render(
      <ArchiveProvider>
        <SelectIdentity />
        <Stage5IdentityOverlay
          identities={[
            {
              id: "submission_a",
              type: "submission",
              source_ids: ["submission_a"],
              identity_name: "Name A",
              carried_fragment: "Fragment A",
              tags: [],
              tag_labels: ["Dream"],
              scores: {},
              events: [],
              position: { x: 0, y: 0, z: 0 },
              visual: {
                size: 1,
                color_group: "identity",
                opacity: 1,
                label: "Name: Name A\\nFragment A",
                node_shape: "mark",
                node_style_key: "identity",
              },
            },
          ]}
        />
      </ArchiveProvider>,
    );

    fireEvent.click(screen.getByText("select"));
    expect(screen.getByText("Name: Name A")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter detail" }));
    expect(screen.getByText("Name: Name A")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Stage5IdentityOverlay.test.tsx --run`

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement overlay**

Create `src/components/Stage5IdentityOverlay.tsx`:

```tsx
import { useMemo } from "react";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraphNode } from "../types/archive";

export function Stage5IdentityOverlay({ identities }: { identities: ArchiveGraphNode[] }) {
  const { enterIdentityDetail, stage, stage5Navigation } = useArchiveStore();
  const selectedIdentity = useMemo(
    () => identities.find((node) => node.id === stage5Navigation.selectedIdentityId) ?? null,
    [identities, stage5Navigation.selectedIdentityId],
  );

  if (stage !== 5 || !selectedIdentity) return null;

  return (
    <aside className="stage5-identity-overlay" aria-label="Selected identity preview">
      <div>
        <strong>Name: {selectedIdentity.identity_name || selectedIdentity.id}</strong>
        {selectedIdentity.carried_fragment ? <p>{selectedIdentity.carried_fragment}</p> : null}
        <small>{selectedIdentity.tag_labels.slice(0, 6).join(", ")}</small>
      </div>
      <button type="button" onClick={() => enterIdentityDetail(selectedIdentity.id)} aria-label="Enter detail">
        Enter detail
      </button>
    </aside>
  );
}
```

- [ ] **Step 4: Wire overlay into ArchiveExperience**

In `ArchiveExperience`, read graph from store:

```ts
const { graph, setGraph, setTimeline, stage } = useArchiveStore();
```

Render:

```tsx
<Stage5IdentityOverlay identities={graph?.nodes.filter((node) => node.type === "submission") ?? []} />
```

- [ ] **Step 5: Add CSS**

Append to `src/styles/archive.css`:

```css
.stage5-identity-overlay {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 7;
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  width: min(680px, calc(100vw - 32px));
  padding: 12px 14px;
  background: rgba(255, 252, 244, 0.9);
  border: 2px solid #18140f;
  box-shadow: 4px 4px 0 rgba(24, 20, 15, 0.16);
  transform: translateX(-50%);
}

.stage5-identity-overlay p {
  margin: 3px 0;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/components/Stage5IdentityOverlay.test.tsx src/state/archiveStore.test.tsx --run
```

Expected: PASS.

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/Stage5IdentityOverlay.tsx src/components/Stage5IdentityOverlay.test.tsx src/components/ArchiveExperience.tsx src/styles/archive.css
git commit -m "feat: add stage5 identity preview overlay"
```

## Task 7: Runtime Graph Layout Integration

**Files:**
- Modify: `src/components/ArchiveExperience.tsx`
- Modify: `src/data/relationshipGraphBuilder.test.ts`
- Test: `src/data/stage5ForceLayout.test.ts`

- [ ] **Step 1: Add integration assertion**

Append to `src/data/relationshipGraphBuilder.test.ts`:

```ts
it("can feed Stage5 force layout without losing nodes or links", async () => {
  const { applyStage5ForceLayout } = await import("./stage5ForceLayout");
  const built = buildArchiveGraph(graph, timeline);
  const laidOut = applyStage5ForceLayout(built);
  expect(laidOut.nodes).toHaveLength(built.nodes.length);
  expect(laidOut.links).toHaveLength(built.links.length);
  expect(laidOut.nodes.every((node) => Number.isFinite(node.position.x))).toBe(true);
});
```

- [ ] **Step 2: Wire layout after graph build**

In `ArchiveExperience`:

```ts
import { applyStage5ForceLayout } from "../data/stage5ForceLayout";
```

Change:

```ts
setGraph(buildArchiveGraph(graph, timeline));
```

to:

```ts
setGraph(applyStage5ForceLayout(buildArchiveGraph(graph, timeline)));
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm test -- src/data/relationshipGraphBuilder.test.ts src/data/stage5ForceLayout.test.ts --run
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ArchiveExperience.tsx src/data/relationshipGraphBuilder.test.ts
git commit -m "feat: apply stage5 force layout at runtime"
```

## Task 8: E2E and Final Verification

**Files:**
- Modify: `tests/e2e/archive-experience.spec.ts`

- [ ] **Step 1: Extend E2E tests**

Replace `tests/e2e/archive-experience.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";

test("opens into Stage5 overview with graph controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("archive-experience")).toBeVisible();
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
});

test("search keeps Stage5 graph usable without entering detail", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search archive").fill("Dream");
  await expect(page.getByLabel("Archive graph controls")).toBeVisible();
  await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "5");
});

test("Stage5 identity preview enters detail through explicit action", async ({ page }) => {
  await page.goto("/");
  await page.locator("canvas").click({ position: { x: 400, y: 300 } });
  const overlay = page.getByLabel("Selected identity preview");
  if (await overlay.isVisible()) {
    await page.getByRole("button", { name: "Enter detail" }).click();
    await expect(page.locator(".archive-experience")).toHaveAttribute("data-stage", "0");
  }
});
```

- [ ] **Step 2: Run full validation**

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

- Audit succeeds.
- Data validation succeeds.
- Unit tests pass.
- Build passes.
- E2E passes.
- `git status --short` shows only intended edits before commit.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/archive-experience.spec.ts
git commit -m "test: cover stage5 core interaction flow"
```

- [ ] **Step 4: Push**

Run:

```bash
git push
```

Expected: current branch pushes to origin.

## Self-Review

- Spec coverage: This plan addresses the accepted first-batch scope: sprite nodes, avatar-contained force layout, zoom overview/internal state, identity preview overlay, tag hover labels, shared-tag hover-only links, and Stage5 navigation state persistence.
- Deferred intentionally: draggable Stage0-4 branch timeline, Stage4 default fallback labeling, and organic point-cloud shader ripple are second-batch items by user decision.
- Placeholder scan: No banned placeholder wording remains.
- Type consistency: `Stage5NavigationState`, `previewIdentity`, `enterIdentityDetail`, `updateStage5Navigation`, `applyStage5ForceLayout`, and sprite helper names are defined before use.
