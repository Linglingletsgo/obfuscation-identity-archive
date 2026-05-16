# Stage5 Avatar Volume Dynamics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every Stage5 graph node visually inside the avatar, make the avatar field impossible to disappear during hover/state changes, and add visible light/dynamic breathing.

**Architecture:** Use a conservative avatar internal volume for graph layout instead of the outer point-cloud radius. Split Stage5 avatar rendering into a stable always-mounted shell plus async GLB point cloud. Add pure animation helpers for testable breathing/ripple behavior and then apply them through `useFrame`.

**Tech Stack:** React, TypeScript, React Three Fiber, Drei, Three.js, Vitest, Playwright.

---

### Task 1: Conservative Avatar Volume Layout

**Files:**
- Modify: `src/config/archiveVisualConfig.ts`
- Modify: `src/data/stage5ForceLayout.ts`
- Modify: `src/data/stage5ForceLayout.test.ts`

- [ ] Write failing tests asserting Stage5 nodes stay within `stage5GraphInsideAvatarRadius` and a compressed vertical avatar volume.
- [ ] Run `npm test -- src/data/stage5ForceLayout.test.ts --run` and confirm failure.
- [ ] Add config values `stage5GraphInsideAvatarRadius`, `stage5GraphVerticalScale`, and clamp layout through that volume.
- [ ] Run `npm test -- src/data/stage5ForceLayout.test.ts src/data/relationshipGraphBuilder.test.ts --run` and `npm run build`.
- [ ] Commit `fix: constrain stage5 nodes inside avatar volume`.

### Task 2: Stable Avatar Shell and Dynamic Point Cloud

**Files:**
- Create: `src/components/Stage5AvatarField.tsx`
- Create: `src/components/Stage5AvatarField.test.ts`
- Modify: `src/components/AvatarPointCloud.tsx`
- Modify: `src/components/StageScene.tsx`

- [ ] Write failing tests for pure helpers `getAvatarBreathingScale` and `getAvatarPointOpacity`.
- [ ] Run `npm test -- src/components/Stage5AvatarField.test.ts --run` and confirm failure.
- [ ] Implement `Stage5AvatarField` as an always-mounted lit translucent shell with async point cloud inside Suspense.
- [ ] Move point-cloud `useFrame` breathing into `AvatarPointCloud` using the helper outputs.
- [ ] Replace direct `AvatarPointCloud` usage in `StageScene` with `Stage5AvatarField`.
- [ ] Run targeted tests and build.
- [ ] Commit `fix: keep stage5 avatar shell mounted with breathing`.

### Task 3: Stage5 Lighting and Verification

**Files:**
- Modify: `src/components/StageScene.tsx`
- Modify: `tests/e2e/archive-experience.spec.ts` if needed.

- [ ] Add Stage5-specific rim/point lights while keeping neutral detail-stage lighting.
- [ ] Run full validation: `npm run audit:algorithm`, `npm run validate:archive-data`, `npm run test:run`, `npm run build`, `npm run test:e2e`.
- [ ] Commit/push final changes.
