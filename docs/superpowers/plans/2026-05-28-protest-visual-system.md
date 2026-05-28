# Protest Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-style the archive with a more saturated, resistant protest visual language while keeping the current interactions and page structure intact.

**Architecture:** Keep the change CSS- and data-driven. Add the local Key Virtue font as a public asset, expose it through CSS variables, extend research timeline event data with image metadata, and render timeline images inside existing event frames without changing timeline navigation or 3D scene behavior.

**Tech Stack:** Vite, React, TypeScript, Three.js/@react-three/fiber, CSS, local font assets, public timeline image assets.

---

### File Structure

- Create: `public/fonts/KeyVirtue.otf`
  - Local display font copied from `/Volumes/Acasis/1学业相关/_FashionFutures/RIF2/protest-fonts/Key Virtue Free/KeyVirtue.otf`.
- Create: `public/assets/timeline/README.md`
  - Documents image naming, source intent, and replacement guidance.
- Add image files under `public/assets/timeline/`
  - Use existing local-safe placeholders if online image fetching is unavailable; prefer public-domain / openly licensed news, crowd, paper, database, protest, and surveillance-adjacent imagery.
- Modify: `src/styles/archive.css`
  - Add `@font-face` for Key Virtue.
  - Shift palette to higher saturation and more confrontational red/yellow/blue/pink accents.
  - Strengthen timeline cards, intro panel, technical route cards, index table, buttons, and graph overlays without altering layout contracts.
- Modify: `src/data/researchTimeline.ts`
  - Extend `ResearchTimelineEvent` with optional `image`.
  - Add image path, alt text, and tone tags for representative events.
- Modify: `src/components/EntryTimeline3D.tsx`
  - Render event image inside each timeline event frame when present.
- Create or modify tests:
  - `src/components/ResearchTimelineIntro.test.ts` should verify timeline event image metadata exists and timeline positioning still works.
  - Create `src/components/TimelineEventPanel.test.tsx` only if extracting the event panel becomes necessary; otherwise test data and build are enough.

---

### Task 1: Add Protest Font Asset

**Files:**
- Create: `public/fonts/KeyVirtue.otf`
- Modify: `src/styles/archive.css`

- [ ] **Step 1: Copy the font into public assets**

Run:

```bash
mkdir -p public/fonts
cp "/Volumes/Acasis/1学业相关/_FashionFutures/RIF2/protest-fonts/Key Virtue Free/KeyVirtue.otf" public/fonts/KeyVirtue.otf
```

Expected: `public/fonts/KeyVirtue.otf` exists.

- [ ] **Step 2: Add CSS font-face and variables**

At the top of `src/styles/archive.css`, keep the Google import, then add:

```css
@font-face {
  font-family: "Key Virtue";
  src: url("/fonts/KeyVirtue.otf") format("opentype");
  font-display: swap;
}
```

In `:root`, change font variables to:

```css
  --display: "Key Virtue", "ZCOOL KuaiLe", "Comic Sans MS", Impact, fantasy;
  --mono: "Comic Sans MS", "ZCOOL KuaiLe", ui-monospace, monospace;
  --serif: "Key Virtue", "ZCOOL KuaiLe", "Comic Sans MS", Georgia, serif;
  --zh-font: "ZCOOL KuaiLe", "Comic Sans MS", cursive;
```

Expected: existing `var(--serif)` headings pick up Key Virtue while body text remains readable.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add public/fonts/KeyVirtue.otf src/styles/archive.css
git commit -m "style: add protest display font"
```

---

### Task 2: Raise Saturation and Resistance Tone

**Files:**
- Modify: `src/styles/archive.css`

- [ ] **Step 1: Update palette variables**

In `:root`, replace the current subdued palette with:

```css
  --bg: #160807;
  --panel-dark: #4f1714;
  --ink: #090605;
  --paper: #fff8df;
  --paper-warm: #ffe9ba;
  --paper-yellow: #ffe15a;
  --red: #ff2d18;
  --red-dark: #9e0d08;
  --yellow: #ffd000;
  --blue: #1d7bff;
  --pink: #ff3f9a;
```

- [ ] **Step 2: Strengthen protest surfaces**

In `body`, `.archive-app`, `.timeline-3d-event-card`, `.timeline-3d-intro-card`, `.timeline-3d-archive-links`, `.technical-route-hero`, `.technical-route-step`, `.index-table-wrap`, and `.individual-detail-sidebar`, shift backgrounds toward red-black paper/poster tones using existing selectors. Use stronger borders and shadows, but do not change dimensions, fixed positioning, scroll behavior, or pointer event logic.

Example patterns to apply:

```css
background:
  linear-gradient(135deg, rgba(255, 45, 24, 0.18), rgba(9, 6, 5, 0.88)),
  rgba(79, 23, 20, 0.82);
border-color: var(--yellow);
box-shadow:
  7px 8px 0 rgba(0, 0, 0, 0.82),
  -3px -2px 0 rgba(255, 45, 24, 0.36);
```

- [ ] **Step 3: Add typographic stress**

Apply `font-family: var(--display);` to major headings only:

```css
.timeline-3d-intro-card h1,
.timeline-3d-event-card h2,
.technical-route-hero h1,
.technical-route-step h2,
.archive-index-page h1,
.individual-back-button,
.collective-identity-overlay strong {
  font-family: var(--display);
}
```

Keep paragraph text on `--mono`/current inherited fonts for legibility.

- [ ] **Step 4: Run focused tests and build**

Run:

```bash
npm run test:run -- src/components/ResearchTimelineIntro.test.ts src/components/TechnicalRoutePage.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/archive.css
git commit -m "style: intensify archive protest palette"
```

---

### Task 3: Add Timeline Image Metadata

**Files:**
- Modify: `src/data/researchTimeline.ts`
- Create: `public/assets/timeline/README.md`
- Add: `public/assets/timeline/*.jpg` or `*.png`

- [ ] **Step 1: Extend types**

In `src/data/researchTimeline.ts`, add:

```ts
export type ResearchTimelineImage = {
  alt: string;
  src: string;
  tone: "crowd" | "paper" | "database" | "surveillance" | "law" | "leak";
};
```

Update `ResearchTimelineEvent`:

```ts
export type ResearchTimelineEvent = {
  description: string;
  image?: ResearchTimelineImage;
  links: ResearchTimelineLink[];
  title: string;
  year: string;
};
```

- [ ] **Step 2: Create image source notes**

Create `public/assets/timeline/README.md`:

```markdown
# Timeline Image Assets

These images support the research timeline as protest-style visual references.
Use public-domain, openly licensed, self-made, or generated/processed imagery.
Keep filenames stable because `src/data/researchTimeline.ts` references them.

Suggested naming:
- `crowd-protest.jpg`
- `newspaper-archive.jpg`
- `database-grid.jpg`
- `surveillance-camera.jpg`
- `legal-document.jpg`
- `data-leak.jpg`

If replacing assets, keep the same filename and approximate aspect ratio.
```

- [ ] **Step 3: Add or prepare image files**

Use one of these approaches:

1. If internet image fetching is available, use public-domain/open-license images from Wikimedia Commons or institutional sources, save compressed copies to `public/assets/timeline/`.
2. If fetching is unavailable or licensing is unclear, create simple local abstract raster placeholders with protest collage aesthetics and the filenames above.

Required files:

```text
public/assets/timeline/crowd-protest.jpg
public/assets/timeline/newspaper-archive.jpg
public/assets/timeline/database-grid.jpg
public/assets/timeline/surveillance-camera.jpg
public/assets/timeline/legal-document.jpg
public/assets/timeline/data-leak.jpg
```

- [ ] **Step 4: Assign images to events**

Add image metadata to representative events in `researchTimelineEvents`:

```ts
image: {
  src: "/assets/timeline/data-leak.jpg",
  alt: "A fragmented archive image suggesting leaked data records",
  tone: "leak",
},
```

Suggested mapping:
- AOL Search Data Leak -> `data-leak.jpg`
- TrackMeNot -> `database-grid.jpg`
- Snowden / PRISM -> `surveillance-camera.jpg`
- FTC Data Brokers Report -> `newspaper-archive.jpg`
- Obfuscation book -> `newspaper-archive.jpg`
- GDPR / EU AI Act -> `legal-document.jpg`
- Cambridge Analytica / COMPAS -> `crowd-protest.jpg`

- [ ] **Step 5: Add test assertions**

In `src/components/ResearchTimelineIntro.test.ts`, add:

```ts
import { researchTimelineEvents } from "../data/researchTimeline";

it("provides protest visual references for key timeline events", () => {
  const eventsWithImages = researchTimelineEvents.filter((event) => event.image);
  expect(eventsWithImages.length).toBeGreaterThanOrEqual(6);
  expect(eventsWithImages.every((event) => event.image?.src.startsWith("/assets/timeline/"))).toBe(true);
  expect(eventsWithImages.every((event) => Boolean(event.image?.alt))).toBe(true);
});
```

- [ ] **Step 6: Run test**

Run:

```bash
npm run test:run -- src/components/ResearchTimelineIntro.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/researchTimeline.ts src/components/ResearchTimelineIntro.test.ts public/assets/timeline
git commit -m "feat: add protest timeline image metadata"
```

---

### Task 4: Render Timeline Images Inside Event Frames

**Files:**
- Modify: `src/components/EntryTimeline3D.tsx`
- Modify: `src/styles/archive.css`

- [ ] **Step 1: Render image in timeline card**

Inside `TimelineEventPanel`, after `<span>{event.year}</span>` and before `<h2>`, add:

```tsx
{event.image ? (
  <figure className="timeline-3d-event-image">
    <img src={event.image.src} alt={event.image.alt} loading="lazy" />
  </figure>
) : null}
```

Do not change `href`, `target`, opacity logic, pointer event logic, or `Html` positioning.

- [ ] **Step 2: Add image frame CSS**

In `src/styles/archive.css`, add:

```css
.timeline-3d-event-image {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin: 0;
  overflow: hidden;
  background: var(--ink);
  border: 2px solid var(--red);
  border-radius: 8px 4px 10px 5px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 248, 223, 0.16),
    3px 4px 0 rgba(0, 0, 0, 0.48);
}

.timeline-3d-event-image::after {
  position: absolute;
  inset: 0;
  content: "";
  background:
    linear-gradient(120deg, rgba(255, 45, 24, 0.25), transparent 38%),
    repeating-linear-gradient(0deg, rgba(255, 248, 223, 0.09), rgba(255, 248, 223, 0.09) 1px, transparent 1px, transparent 5px);
  mix-blend-mode: screen;
  pointer-events: none;
}

.timeline-3d-event-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: contrast(1.22) saturate(1.35) grayscale(0.18);
}
```

- [ ] **Step 3: Run tests and build**

Run:

```bash
npm run test:run -- src/components/ResearchTimelineIntro.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/EntryTimeline3D.tsx src/styles/archive.css
git commit -m "feat: show protest images in timeline cards"
```

---

### Task 5: Final Visual QA and Suggestions

**Files:**
- No required code files unless QA reveals issues.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run test:run
npm run build
```

Expected: PASS.

- [ ] **Step 2: Inspect changed files**

Run:

```bash
git status --short
git diff --stat main...HEAD
```

Expected: branch contains only protest visual system changes.

- [ ] **Step 3: Summarize optional next suggestions**

Include these in final handoff, not necessarily code:

- Replace generated/placeholder timeline images with curated public-domain archival images after final license review.
- Add a printable protest-poster mode for the technical route page.
- Create one or two hand-drawn “stamp” assets such as `CLASSIFIED`, `MISREAD`, `UNVERIFIED`, and apply them lightly to timeline/index frames.
- Consider a reduced-motion option if the saturated palette and moving particle scene feel too intense in exhibition.

- [ ] **Step 4: Commit any QA fixes**

If QA requires tweaks:

```bash
git add <changed-files>
git commit -m "fix: polish protest visual system"
```

If no fixes are required, do not create an empty commit.

---

### Self-Review

- Spec coverage: Covers branch isolation, Key Virtue font, saturated resistance palette, timeline image metadata, image rendering in event frames, tests, and final suggestions.
- Placeholder scan: No TODO/TBD placeholders; image filenames and test assertions are explicit. Image sourcing allows generated placeholders only when external licensing/fetching is unavailable, with stable filenames.
- Type consistency: `ResearchTimelineImage`, optional `image`, and `event.image` usage match across data, component, and tests.
