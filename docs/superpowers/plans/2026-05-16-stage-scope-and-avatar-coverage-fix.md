# Stage Scope and Avatar Coverage Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Stage5/Stage0-4 scope leaks so the avatar contains the graph, labels only appear in the right contexts, and timeline/tag views are identity-specific.

**Architecture:** Keep graph building canonical and add small view-model helpers for stage-scoped rendering. Stage5 renders only the global internal browsing graph with selective labels; Stage0-4 renders only the selected identity's timeline item and its tags. Avatar point cloud positions are normalized into a stable field so graph radius and model coverage use the same scale assumptions.

**Tech Stack:** React, TypeScript, React Three Fiber, Drei, Three.js, Vitest, Testing Library, Playwright.

---

## File Structure

- Modify `src/components/RelationshipGraph3D.tsx`: add exported helpers for stage-scoped nodes, stage-scoped links, and label visibility; use them in rendering.
- Modify `src/components/IdentityBillboardLabel.tsx`: accept a `visible` prop so labels are not globally rendered.
- Modify `src/components/BranchingTimeline.tsx`: derive buttons from the selected identity's `timeline.anchors` items and pass timeline item ids to `openStage`.
- Modify `src/components/AvatarPointCloud.tsx`: normalize sampled model points to fit a stable avatar field instead of relying on raw GLB scale.
- Modify `src/config/archiveVisualConfig.ts`: align graph radius and avatar field radius.
- Add/modify tests in `src/components/relationshipGraphVisibility.test.ts`, `src/components/BranchingTimeline.test.tsx`, and `src/components/AvatarPointCloud.test.ts`.

### Task 1: Stage-Scoped Graph Visibility

**Files:**
- Modify: `src/components/RelationshipGraph3D.tsx`
- Modify: `src/components/IdentityBillboardLabel.tsx`
- Modify: `src/components/relationshipGraphVisibility.test.ts`

- [ ] **Step 1: Write failing visibility tests**

Add tests that assert Stage5 excludes timeline nodes, Stage0 only includes the selected identity's selected timeline item plus that item's tags, and identity billboard labels are visible only for hover/selected/focused identity nodes.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/components/relationshipGraphVisibility.test.ts --run`

Expected: FAIL because helper functions do not exist or still return global nodes.

- [ ] **Step 3: Implement graph view helpers**

Add `getStageScopedGraphNodes`, `getStageScopedGraphLinks`, and `shouldShowIdentityBillboard` in `RelationshipGraph3D.tsx`. Stage5 includes `submission`, `tag`, and `collective`; Stage0-4 includes the selected submission, selected/current stage timeline node, and tag nodes intersecting the active timeline tags.

- [ ] **Step 4: Wire helpers into rendering**

Use the helper output for `visibleNodes`, links, and `IdentityBillboardLabel visible={...}`.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/components/relationshipGraphVisibility.test.ts src/components/GraphNodeSprite.test.tsx --run
npm run build
git add src/components/RelationshipGraph3D.tsx src/components/IdentityBillboardLabel.tsx src/components/relationshipGraphVisibility.test.ts
git commit -m "fix: scope graph rendering by archive stage"
```

### Task 2: Identity-Specific Timeline

**Files:**
- Modify: `src/components/BranchingTimeline.tsx`
- Add/modify: `src/components/BranchingTimeline.test.tsx`

- [ ] **Step 1: Write failing timeline tests**

Assert timeline buttons are derived only from the selected identity anchor and click through with the timeline item id.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/components/BranchingTimeline.test.tsx --run`

Expected: FAIL because the current timeline is global static stage buttons.

- [ ] **Step 3: Implement anchor-scoped timeline**

Read `timeline`, `selectedIdentityId`, `selectedTimelineItemId`, and `stage` from the store. When not Stage5, render only the current identity anchor's items, grouped by stage. Each button calls `openStage(item.stage, item.timeline_item_id)`.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test -- src/components/BranchingTimeline.test.tsx src/state/archiveStore.test.tsx --run
npm run build
git add src/components/BranchingTimeline.tsx src/components/BranchingTimeline.test.tsx
git commit -m "fix: scope timeline to selected identity"
```

### Task 3: Avatar Coverage Normalization

**Files:**
- Modify: `src/components/AvatarPointCloud.tsx`
- Modify: `src/config/archiveVisualConfig.ts`
- Add: `src/components/AvatarPointCloud.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Test a pure helper that normalizes arbitrary sampled positions into the configured avatar field radius.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/components/AvatarPointCloud.test.ts --run`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement point normalization**

Export `normalizePointCloudPositions`. It recenters raw samples around their bounding box center and scales the longest axis into `stage5AvatarFieldRadius`.

- [ ] **Step 4: Align graph/avatar config**

Set `stage5InternalRadius` below `stage5AvatarFieldRadius` so every graph node stays visually inside the avatar field.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/components/AvatarPointCloud.test.ts src/data/stage5ForceLayout.test.ts --run
npm run build
git add src/components/AvatarPointCloud.tsx src/components/AvatarPointCloud.test.ts src/config/archiveVisualConfig.ts src/data/stage5ForceLayout.test.ts
git commit -m "fix: normalize stage5 avatar coverage"
```

### Task 4: Full Verification

**Files:**
- Modify: `tests/e2e/archive-experience.spec.ts` if needed after behavior changes.

- [ ] **Step 1: Run full validation**

Run:

```bash
npm run audit:algorithm
npm run validate:archive-data
npm run test:run
npm run build
npm run test:e2e
git status --short
```

Expected: audit passes, data validation passes, all unit tests pass, build passes, E2E passes, and worktree is clean after commits.
