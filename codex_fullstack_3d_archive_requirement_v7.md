# Codex Full-Stack Implementation Brief v7: 3D Archive Frontend + Avatar-Map Graph

## Copy this entire brief into Codex

You are working in folder obfuscation-identity-archive. Implement the feature described below end-to-end. 

Inspect the repository first, infer the existing framework, package scripts, routing conventions, data shapes, current components, and asset paths, then implement the smallest production-ready version that satisfies the acceptance criteria.

The repository's `public/` folder will already be prepared by the user. Do not implement logic that copies files from external directories into `public/`. Treat `public/` as the canonical runtime asset/data folder for the frontend.

You may read, organize, validate, cache, and render data from `public/`, but do not assume access to external source folders.

Before implementing Three.js/WebGL code, read and follow this local Codex skill if available:

```text
/Users/dominicduan/.codex/skills/3d-web-skills
```

If the skill path is unavailable in the execution environment, continue using repository conventions and document that the skill was unavailable.

You may open up to five subagents and wait for all of them before merging results. Use subagents only where they reduce context pollution or allow parallel work.

Recommended subagents:

1. `repo-explorer`
   - Inspect project structure, package manager, framework, build scripts, existing pages/components, current graph/avatar code, public data paths, and routing conventions.

2. `algorithm-auditor`
   - Inspect algorithm outputs, report missing/unmentioned fields, validate stage/source/tag logic, verify current sample counts, and write the algorithm audit notes.

3. `data-structure-engineer`
   - Implement runtime organization helpers, optional graph/layout cache builder, validation utilities, and asset path resolution.

4. `frontend-3d-engineer`
   - Implement the immersive Three.js/WebGL avatar-map graph, GLB point-cloud rendering, graph node/link rendering, shader interaction, and camera controls.

5. `ux-integration-engineer`
   - Implement stage flow, sidebar rules, tree/spatial timeline, search/filter/detail UI, hand-drawn UI asset handoff document, empty/error states, and WebGL fallback.

Subagents must not make conflicting edits blindly. The parent agent is responsible for consolidating diffs, resolving conflicts, running checks, and delivering one coherent implementation.

---

## 1. Mission

Build an immersive archive frontend that uses the current algorithm output structure to display questionnaire identities, stage-based combinations, PNG/GLB avatar assets, tags, and interaction metadata.

The implementation has two connected capabilities:

1. Stage-based archive experience
   - The home page opens directly into Stage5.
   - Stage5 is an immersive collective avatar-map using the global `stage5.glb`.
   - Stage0-4 expose anchor-specific or timeline-specific archive detail states.
   - Stage0-3 use PNG avatars directly by default.
   - Stage4 uses anchor-specific GLB models when available.
   - Stage5 uses the global collective GLB as a large point-cloud avatar/map.

2. Interactive 3D relationship graph / avatar-map
   - Replace or clearly supersede the current relationship graph with a true 3D WebGL graph.
   - The questionnaire tag system is the relationship graph.
   - Every unique tag must become a node.
   - Each questionnaire/submission should act as an identity center node.
   - Graph nodes are distributed inside, around, or on the surface of the large Stage5 point-cloud avatar field where feasible.
   - The graph must be useful for reading archive structure, not only decorative.

Use Active Theory only as a quality reference for polish, spatial interaction, shader subtlety, and non-generic WebGL aesthetics. Do not copy its layout, assets, specific interactions, code, branding, or visual identity.

---

## 2. Hard Requirements

- Do not implement external directory copy/sync logic into `public/`; the user will prepare `public/`.
- Treat `public/` as the runtime source of data/assets.
- Do not hard-code only the current sample IDs; handle the dataset generically.
- Do not remove or mutate original algorithm/timeline/submission files.
- Stage1-3 avatar folders may be empty; the app must show placeholders without failing.
- Stage4 model files may be incomplete; the app must show placeholders without failing.
- Preserve traceability from every frontend node/link/detail state back to source IDs.
- The 3D graph must be based on structured data, not from the existing 2D visual output.
- The frontend graph must render with WebGL/Three.js or a library built on it.
- Do not auto-rotate the 3D space. Rotation should only happen through user input, timeline transition, focus animation, or scripted stage transition.
- Graph nodes must not be rigid default spheres by default. Use custom visual forms, sprites, small hand-drawn marks, shader particles, stylized geometry, or texture-based marks.
- Do not display literal labels such as “Stage 0”, “Stage 1”, etc. in the main visual UI. Stage numbers may remain in internal metadata, debug panels, filters, and accessibility labels.
- The graph must remain usable after filtering.
- Add graceful fallback if WebGL is unavailable.
- Do not break existing archive pages, routes, or asset paths.
- Prefer repository conventions over introducing a new architecture.
- Keep colors, thresholds, graph styles, and visibility rules modular and easy to modify.

---

## 3. Source Data to Inspect

The user will prepare the project `public/` folder. Use these paths if they exist. If actual paths differ, discover and adapt without losing the intent.

```text
public/data/algorithm/interaction_graph_real_submissions_10.json
public/data/algorithm/timeline/anchor_timeline_real_submissions_10.json
public/data/submissions/{submission_id}.json

public/assets/avatars/stage0/{submission_id}.png
public/assets/avatars/stage1/{timeline_item_id}.png
public/assets/avatars/stage2/{timeline_item_id}.png
public/assets/avatars/stage3/{timeline_item_id}.png

public/models/stage4/{timeline_item_id}.glb
public/models/stage5.glb
```

Expected source concepts:

- Algorithm graph identity nodes and interaction edges.
- The current graph file uses top-level `edges`, not `links`; internal organization may map `edges` to frontend graph links.
- Anchor timeline items and stage membership.
- Submission identity names and carried fragments.
- Submission tags, scores, events, avatar vectors, and avatar tags.
- Existing Stage0 avatar PNGs.
- Expected Stage1-3 PNG asset paths, even if not available yet.
- Stage4 GLB model paths when available under `public/models/stage4/`.
- Stage5 global GLB path at `public/models/stage5.glb`.

Submission JSON files are required only if the algorithm output does not already contain all required display fields:

```text
identity_name
carried_fragment
tags
scores
events
avatar_tags
active_tags_preview
avatar_vector
```

---

## 4. Current Uploaded Data Shape Notes

The current sample dataset has already been inspected. Keep these structure-specific facts in mind while still writing generic code:

- `public/data/algorithm/interaction_graph_real_submissions_10.json` has top-level `nodes` and `edges`, not `links`.
- Graph `nodes` are currently questionnaire identity nodes.
- Tag nodes do not exist in the source graph and must be created for the frontend from tag fields.
- Each graph node has fields such as:
  - `id`
  - `type`
  - `label`
  - `shell_form`
  - `tag_count`
  - `roles`
  - `tags`
  - `tag_labels`
  - `text_fragments.carriedFragment`
  - `consent`
- Each graph edge has fields such as:
  - `id`
  - `source`
  - `target`
  - `relation`
  - `scores`
  - `evidence`
  - `events`
- Edge `evidence` includes `sharedTags`, `sharedPlaces`, and `conflictPairs`.
- Use `conflictPairs` as the primary source for conflict-style tag links.
- Graph edge events are objects with fields such as `type`, `visual`, and `intensity`.
- Timeline item events are simple strings.
- Normalize both event forms into a common frontend event shape.
- Tag labels may appear multiple times inside one identity with different category/role combinations. For example, a label can exist once as a place and once as a material source.
- Do not treat `tag_count !== tag_labels.length` as an error by itself.
- For frontend tag nodes, prefer one node per unique display label, with merged category/role/source metadata, unless the user explicitly requests category-specific tag nodes.
- `public/data/algorithm/timeline/anchor_timeline_real_submissions_10.json` has a top-level `global_collective_item` for Stage5 and an `anchors[]` array for Stage0-4 items.
- Do not expect Stage5 to be inside each anchor’s `items[]`.
- The timeline file has `stage_names` and `generation_modes`, but the main UI should not display literal “Stage x” labels.
- The timeline file’s `source_graph` value may point to an old relative output path. Runtime loading should use the actual configured public path, not blindly follow that string.
- Core display fields are already present in the two algorithm files.
- `public/data/submissions/{submission_id}.json` should be treated as optional enrichment unless the implementation needs raw questionnaire fields not present in the algorithm/timeline data.
- Asset paths are not embedded in the algorithm files. Resolve them by convention and check availability safely at runtime.

Current sample counts to verify in the audit, without hard-coding them into the application:

```text
identity nodes: 10
identity interaction edges: 45
unique tag display labels: about 249
anchor count: 10
timeline items under anchors: 300
Stage0 items: 10
Stage1 items: 80
Stage2 items: 100
Stage3 items: 80
Stage4 items: 30
Stage5 global items: 1
```

Stage/source cardinality in the current timeline is consistent and should be used as a validation rule:

```text
Stage0: group_size/source_ids/source_texts length = 1
Stage1: group_size/source_ids/source_texts length = 2
Stage2: group_size/source_ids/source_texts length = 3
Stage3: group_size/source_ids/source_texts length = 4
Stage4: group_size/source_ids/source_texts length = 5
Stage5 global: group_size/source_ids/source_texts length = source_count
```

Important timeline interpretation:

- Stage1 is anchor-sampled, not an exhaustive directed pair timeline.
- The graph file contains all pairwise identity edges for the current sample.
- The timeline file contains the curated budgeted sequence for each anchor.
- For the relationship graph, use graph `edges` as the canonical all-identity relationship source.
- For staged navigation, use timeline `anchors[].items` and `global_collective_item` as the canonical stage source.

---

## 5. Required Repository Reconnaissance

Before coding:

1. Identify package manager and available scripts.
2. Identify frontend framework and routing approach.
3. Locate existing stage, avatar, timeline, and relationship graph components/pages.
4. Locate existing data-loading utilities and TypeScript types, if any.
5. Inspect real JSON shapes for algorithm graph, timeline, and submissions.
6. Inspect current `public/` asset paths and confirm which avatar/model folders exist.
7. Confirm whether Three.js, React Three Fiber, `3d-force-graph`, `react-force-graph-3d`, `d3-force-3d`, GSAP, or similar tools already exist in dependencies.
8. Decide whether implementation scripts should be TypeScript, JavaScript, or Python based on repository conventions.
9. Create a short implementation note in the final response explaining what was discovered.
10. Avoid introducing a heavy dependency if the repository already has a suitable Three/WebGL setup.

---

## 6. Algorithm Audit Requirement

Inspect the two algorithm output files and report whether the algorithm logic aligns with the intended frontend logic. Do not silently assume the algorithm is correct.

Report:

1. What node types exist in the algorithm graph.
2. What edge relation types exist in the algorithm graph.
3. Whether every graph edge source/target resolves to an identity node.
4. Whether every timeline item has a valid stage.
5. Whether every `source_id` resolves to a known identity.
6. Whether every `anchor_id` resolves to a known anchor/submission.
7. Whether Stage0 items have exactly 1 source identity when data allows.
8. Whether Stage1 items have exactly 2 source identities when data allows.
9. Whether Stage2 items have exactly 3 source identities when data allows.
10. Whether Stage3 items have exactly 4 source identities when data allows.
11. Whether Stage4 items have exactly 5 source identities in the current sample.
12. Whether Stage5 is global, timeline-based, or both.
13. Whether tags, scores, events, avatar_tags, active_tags_preview, and avatar_vector are present or need fallback organization.
14. Whether graph edges imply relationships not mentioned in this frontend requirement.
15. Whether any algorithm fields are unused by the frontend and should be exposed, ignored, or reviewed.
16. Any difference between algorithm semantics and this document’s stage/graph semantics.
17. Whether asset paths can be resolved from conventions.
18. Which expected assets are missing.

If there are possible algorithm errors, do not change the algorithm automatically unless the fix is clearly required for frontend operation. Instead, output a clear audit note explaining the difference so the user can decide whether the algorithm itself should be revised.

Suggested audit output:

```text
docs/algorithm-audit.md
```

---

## 7. Experience Hierarchy and Stage Flow

### 7.1 Initial Home State

- Opening the site should enter Stage5 directly.
- Stage5 is the immersive home view.
- Stage5 should not show the sidebar.
- Stage5 should not show the timeline by default.
- Stage5 displays the global collective avatar from `stage5.glb` as the main spatial object.
- Stage5 should primarily show the collective absorption process and the relationship graph embedded in or around the global avatar-map.
- Stage5 should allow discovery of identities/tags through hover, search, filter, or click.
- Stage5 should not auto-rotate.

### 7.2 Stage0-4 Detail States

- Stage0, Stage1, Stage2, Stage3, and Stage4 should show a metadata sidebar.
- The sidebar should show computed parameters, source IDs, identity name, carried fragment, tags, scores, events, asset status, and linked neighbors when available.
- Stage0 shows one questionnaire identity: its Stage0 PNG avatar and its tags.
- Stage1 shows the anchor combined with one other questionnaire identity.
- Stage2 shows the anchor combined with two other questionnaire identities.
- Stage3 shows the anchor combined with three other questionnaire identities.
- Stage4 shows the anchor-specific stronger cluster condition and uses an anchor/timeline-specific GLB model when available.
- Stage5 returns to the global collective avatar-map.

### 7.3 Navigation Flow

- From Stage5, clicking an identity/submission node or supported archive element should enter Stage0 for that identity.
- Stage0 should expose a timeline/branching-stage control.
- Dragging the timeline should drive Stage0 → Stage1 → Stage2 → Stage3 → Stage4 → Stage5.
- Transitions should show identities combining, merging, or being absorbed, not only switch static assets.
- Stage5 is both the home state and the final collective absorption state.
- User should be able to return to Stage5 from any detail state.

### 7.4 Narrative Reading

Use the following stage semantics internally, but avoid displaying literal “Stage x” labels in the main visual UI.

```text
Stage0: Anchor Interior
Single questionnaire internal tag friction.

Stage1: Pair Encounter
The anchor meets one other questionnaire identity.

Stage2: Small Identity Cluster
The anchor combines with two other questionnaire identities.

Stage3: Dense Identity Cluster
The anchor combines with three other questionnaire identities.

Stage4: Cluster Pressure
The anchor enters a stronger cluster condition suitable for 3D avatar display.

Stage5: Collective Absorption
All submissions are absorbed into one collective avatar-map.
```

---

## 8. Avatar and Asset Rendering Rules

### 8.1 Stage0-3 PNG Avatars

- Stage0-3 should display PNG avatars directly as image/sprite/card visuals by default.
- Do not convert PNG avatars into particle clouds by default.
- Particleization is allowed only during transition effects, hover effects, or optional experimental mode.
- Stage1-3 avatar folders may be empty; show placeholders while preserving metadata, graph nodes, and transitions.
- Missing PNGs must not break the app.

Expected paths:

```text
public/assets/avatars/stage0/{submission_id}.png
public/assets/avatars/stage1/{timeline_item_id}.png
public/assets/avatars/stage2/{timeline_item_id}.png
public/assets/avatars/stage3/{timeline_item_id}.png
```

### 8.2 White Background Removal

Stage0-3 PNG avatars may have pure white or near-white backgrounds. Remove near-white pixels at runtime when compositing into the hand-drawn UI or WebGL scene.

Default configurable rule:

```text
Pixels with R, G, B > 245 become transparent.
```

Requirements:

- Preserve dark crayon outlines.
- Preserve colored pencil/crayon texture.
- Make the threshold configurable in code.
- Do not destructively modify original PNG files.
- The threshold should live in centralized visual config.

### 8.3 Stage4 and Stage5 GLB Avatars

- Stage4 should display an anchor-specific 3D model from that stage item when available.
- Stage5 should display the global collective 3D model from `stage5.glb`.
- If an asset has not been imported yet, show the computed metadata panel and a placeholder visual instead of failing.

Expected paths:

```text
public/models/stage4/{timeline_item_id}.glb
public/models/stage5.glb
```

### 8.4 Point-Cloud Avatar Rendering

- Stage4 and Stage5 GLB avatars should be renderable as large-scale point-cloud avatars.
- Stage5’s point-cloud avatar should be very large and should visually encompass the relationship graph nodes.
- Graph nodes may be positioned inside, around, or on the surface of the avatar point cloud.
- Preserve graph readability over exact geometric surface placement.
- The avatar must not fully occlude readable nodes.
- Hovering near the avatar or graph nodes should trigger shader-based motion, glow, ripple, particle displacement, or similar high-quality interaction.
- Lighting/shader treatment should feel polished, subtle, and spatial, not a default Three.js demo.
- If a GLB cannot be converted to points cleanly, use a visually coherent fallback mode with instanced particles, sampled vertices, or a translucent model plus particle shell.

---

## 9. Hand-Drawn UI Style and Asset Handoff

The user will hand-draw UI components. Codex must create a handoff document listing required components, purposes, formats, and recommended sizes.

Suggested output:

```text
docs/hand-drawn-ui-asset-list.md
```

Overall style reference:

```text
Childlike crayon sketch style, loose uneven black outlines, playful hand-drawn proportions, rough scribbled coloring, simple white background, whimsical and imaginative, elementary-school art aesthetic, imperfect linework, bright colored pencil or crayon texture.
```

Suggested UI component asset list:

| Component Name | Purpose | Recommended Format | Recommended Size |
|---|---|---:|---:|
| `CrayonFrame` | General hand-drawn border/card frame | SVG or PNG transparent | 1200×800 |
| `PaperPanel` | Metadata sidebar background | PNG transparent | 460×1000 |
| `CrayonButton` | Button base / action mark | SVG or PNG transparent | 240×80 |
| `TimelineBranch` | Tree-like timeline branch visual | SVG preferred | 1600×500 |
| `TimelineHandle` | Draggable timeline handle | PNG transparent | 160×160 |
| `TimelineForkNode` | Branch/fork marker in timeline | PNG transparent | 160×160 |
| `TagBubble` | Shared tag node visual | SVG or PNG transparent | 180×120 |
| `ConflictTagBubble` | Conflict tag node visual | SVG or PNG transparent | 180×120 |
| `IdentityNodeMark` | Questionnaire identity center node | SVG or PNG transparent | 220×160 |
| `IdentityTooltip` | Hover info card background | PNG transparent | 480×320 |
| `MetadataSidebar` | Stage0-4 detail sidebar shell | PNG transparent | 460×1000 |
| `AvatarPlaceholder` | Missing PNG avatar placeholder | PNG transparent | 512×512 |
| `ModelPlaceholder` | Missing GLB placeholder | PNG transparent | 512×512 |
| `BackToCollectiveButton` | Return to Stage5 control | SVG or PNG transparent | 260×90 |
| `SearchInputFrame` | Search/filter input shell | SVG or PNG transparent | 480×100 |
| `FilterChip` | Tag/stage/filter chip visual | SVG or PNG transparent | 220×80 |

The implementation should work with temporary CSS/SVG placeholders until hand-drawn assets are supplied. Keep asset references modular and easy to replace.

---

## 10. Timeline Interaction Requirement

Do not use a simple linear timeline with dots.

Use one of these approaches:

1. A branching tree-like timeline.
2. A spatial 3D coordinate-axis timeline.
3. A hybrid hand-drawn branch UI controlling 3D stage transitions.

Requirements:

- Dragging should drive stage transitions.
- The timeline should communicate branching/combination, not merely chronological order.
- Stage transitions should show identity combination through animation.
- The timeline should be visible in Stage0-4 detail states.
- The timeline should not appear by default on the Stage5 home state.
- The timeline should remain usable with missing Stage1-3 PNGs or missing Stage4 GLBs.
- The timeline should choose actual timeline items for the selected anchor, not invent stage states.
- If multiple items exist at a stage for one anchor, provide a navigable branch/fork selection.

---

## 11. Relationship Graph and Tag System

### 11.1 Core Graph Principle

The questionnaire tag system is the relationship graph.

- Every unique questionnaire tag present in the algorithm/timeline/submission data must become a graph node.
- Tag nodes are not optional hidden metadata.
- Each questionnaire/submission should become an identity center node.
- Timeline items, anchors, stages, and model assets may also become nodes if useful, but tag and identity nodes are required.
- Graph data must be organized from structured archive data, not from flattened screenshots or old 2D coordinates.

### 11.2 Identity Node Labeling

Each questionnaire identity node should be able to directly display:

```text
Name: {identity_name}
{carried_fragment}
```

Use this exact semantic structure for labels/tooltips/detail panels. If either field is missing, use safe fallbacks and report missing data in the audit.

### 11.3 Link Semantics

Required link categories:

1. Shared-tag links
   - Same tag appears in multiple questionnaire identities.
   - Use one visual style.

2. Conflict/glitch links
   - Conflicting tags or conflict-like algorithm events.
   - Use a clearly different style: dashed, broken, translucent, glitchy, different color, or different shader behavior.

3. Source membership links
   - Submission/identity participates in a timeline item.

4. Timeline/stage transition links
   - Timeline items connect through stage progression where data supports it.

5. Anchor membership links
   - Timeline items relate to anchor identities.

6. Interaction links
   - Graph file edges connect identity nodes using algorithm relationship scores and evidence.

### 11.4 Conflict Detection Priority

Do not invent semantic conflicts from tag names unless a conflict map is provided.

Use this priority:

1. If algorithm output explicitly contains conflict pairs/events, use those.
2. Else if a timeline item has high `scores.conflict`, mark links among its involved tags as conflict-related.
3. Else if event metadata includes `false_route`, `profile_glitch`, `surface_mask`, `tag_leak`, or other conflict/glitch-like operations, mark relevant links as conflict/glitch.
4. Else render links as shared/source/timeline relationships only.

### 11.5 Hybrid Avatar-Constrained Layout

Use a hybrid layout:

1. First compute deterministic 3D force-directed positions.
2. Then optionally constrain, bias, or project graph nodes into the Stage5 avatar volume/surface field.
3. Preserve graph readability over exact geometric surface placement.
4. Do not rely only on random depth.
5. Do not auto-rotate the graph.
6. Prefer stable positions for the same source files.

---

## 12. Optional 3D Graph Cache

Runtime organization is preferred.

A cache may be added only if it improves layout stability or performance. If a cache is added, treat it as a frontend cache/layout artifact, not canonical source data.

Possible cache files:

```text
public/data/graph/relationship_graph_3d.json
public/data/graph/relationship_graph_3d_layout.json
```

The graph must include at least:

- `submission` / identity center nodes
- `tag` nodes

It may also include:

- `timeline_item`
- `anchor`
- `stage`
- `asset`
- `collective`

Recommended graph shape:

```json
{
  "nodes": [
    {
      "id": "",
      "type": "submission | timeline_item | anchor | stage | tag | asset | collective",
      "stage": 0,
      "anchor_id": "",
      "source_ids": [],
      "identity_name": "",
      "carried_fragment": "",
      "tags": [],
      "scores": {},
      "events": [],
      "asset_path": "",
      "model_path": "",
      "position": { "x": 0, "y": 0, "z": 0 },
      "visual": {
        "size": 1,
        "color_group": "",
        "opacity": 1,
        "label": "",
        "node_shape": "custom | sprite | particle | mark",
        "node_style_key": ""
      }
    }
  ],
  "links": [
    {
      "source": "",
      "target": "",
      "type": "interaction | timeline | shared_tag | conflict_tag | stage_transition | source_membership | anchor_membership | asset_link",
      "weight": 1,
      "scores": {},
      "events": [],
      "visual": {
        "style_key": "",
        "opacity": 1,
        "thickness": 1,
        "dash": false
      }
    }
  ],
  "metadata": {
    "layout": "3d-force-directed-avatar-constrained",
    "seed": "",
    "source_files": []
  }
}
```

### 12.1 3D Layout Rules

- Produce true `x`, `y`, `z` coordinates.
- Use a stable seeded initializer or stable runtime layout.
- Prefer semantic `z`, not random depth.
- Primary preferred mapping:
  - Stage0: inner/back layer
  - Stage1-3: middle layers
  - Stage4: stronger pressure/deformation layer
  - Stage5: collective/global layer if represented
- Add local offsets using timeline order, anchor cluster, tag community, or score intensity where data allows.
- Use link force, repel force, center force, optional collision force, and optional cluster force.
- If a force simulation is run ahead of time, run enough ticks to settle and write stable coordinates.
- If a frontend force simulation is also used, initialize it with stable coordinates when available.

### 12.2 Visual Encoding Rules

Map data to visual fields:

- node size: degree, visibility score, or timeline importance
- node color group: stage, anchor, cluster, or dominant tag group
- node opacity: visibility or masking score
- node shape/style: identity center, tag, conflict tag, asset, timeline item
- link thickness: interaction strength or shared-source weight
- link opacity: confidence, relationship strength, or stage relevance
- dashed/glitch style: conflict, false route, glitch-like events
- Stage0 asset: existing PNG avatar path when available
- Stage1-3 asset: expected PNG path
- Stage4 asset: current/future model path when available
- Stage5 asset: global `stage5.glb` if present

---

## 13. Frontend 3D Graph / Avatar-Map Integration

Replace or clearly supersede the current relationship graph with an interactive 3D avatar-map graph view.

Use the existing frontend stack. Recommended options, in priority order:

1. Existing Three.js / React Three Fiber setup if present.
2. `react-force-graph-3d` if the repository is React-based and this fits existing conventions.
3. `3d-force-graph` for a framework-neutral implementation.
4. `d3-force-3d` + `three` for custom layout/rendering if needed.
5. Direct Three.js only if current project conventions justify it.

Do not introduce a heavy dependency if the repository already has a suitable Three/WebGL setup.

### 13.1 Required Graph Interactions

- user-controlled orbit rotation, zoom, and pan
- no automatic camera rotation
- hover label with identity name, carried fragment, anchor, dominant tags, and asset status
- click node to open associated submission, timeline item, avatar, or model detail
- neighbor highlighting on hover or click
- search by identity name, carried fragment, submission id, timeline item id, tag, or anchor
- filters for anchor, tags, interaction type, score thresholds, and asset availability
- optional internal/debug stage filter, but do not visually label main UI as “Stage x”
- toggle isolated nodes
- toggle link visibility or link density
- selected-node focus/pin behavior if feasible
- reset camera / fit-to-graph action
- readable empty state after filters
- loading and error states
- WebGL unavailable fallback message or simplified list

### 13.2 Detail Panel Requirements

Clicking a node should show a detail panel or existing detail UI containing as many of these as available:

- ID
- type
- internal stage number and narrative stage meaning
- anchor ID
- source IDs
- identity name
- carried fragment
- dominant tags
- all tags
- scores
- events
- avatar vector
- avatar tags
- asset path
- model path
- linked neighbors
- asset availability state

### 13.3 Frontend Data Loading

- Prefer loading the two algorithm JSON files and organizing the graph at runtime.
- If an optional cache file exists, it may be used for faster loading or stable layout.
- Do not require manual data editing.
- Avoid blocking the rest of the archive UI while graph data loads.
- Show useful loading/error states if data is unavailable or malformed.
- If optional cache files are missing, fall back to runtime organization when feasible.

### 13.4 Performance Requirements

- Graph should remain interactive for the current dataset.
- Avoid rendering labels for every node by default.
- Labels should appear on hover/focus.
- Support link density reduction.
- Support filtering before rendering.
- Use memoization and avoid per-frame React state updates.
- Camera controls must not fight normal page scroll.
- Gracefully degrade when WebGL is unavailable.
- Use instancing or buffer geometry where appropriate.
- Avoid excessive draw calls.
- Keep shader effects adjustable in config.

---

## 14. Centralized Visual Configuration

Create or extend a centralized visual config, for example:

```text
src/config/archiveVisualConfig.ts
```

Adapt the path to repository conventions.

It should include:

- stage/narrative colors, if used internally
- tag group colors
- tag role colors
- tag category colors
- shared-tag link style
- conflict/glitch link style
- identity center node style
- tag node style
- hover glow settings
- point-cloud particle size
- point-cloud displacement settings
- near-white removal threshold
- sidebar visibility rules
- timeline visibility rules
- fallback placeholder paths
- camera settings
- link density defaults
- optional cache settings

Colors and graph visual styles must be modular and easy to customize in code.

---

## 15. Scripts, Tests, and Documentation

Add or update package scripts if appropriate:

```json
{
  "scripts": {
    "audit:algorithm": "...",
    "build:graph3d-cache": "...",
    "validate:archive-data": "..."
  }
}
```

Use repository conventions. If package scripts should not be modified, document exact commands instead.

Validation should check:

- graph cache parses if cache is used
- every graph node has stable `id`, `type`, and metadata-equivalent fields
- every unique questionnaire tag has a tag node
- every identity/submission has an identity center node where data allows
- every graph link references existing node IDs
- no duplicate node IDs
- timeline source IDs resolve where data allows
- anchor IDs resolve where data allows
- Stage0-4 source cardinality matches expected group sizes where data allows
- missing Stage1-3 PNGs do not break the app
- missing Stage4 GLBs do not break the app
- Stage5 GLB missing state is handled
- WebGL unavailable fallback works or is implemented as a clear fallback state
- app build passes

Add or update documentation with:

- algorithm audit results
- how the 3D graph data is organized
- how to run the app
- how to validate outputs
- where optional cache files are stored
- how Stage1-3 asset paths and Stage4 model paths are resolved
- what hand-drawn UI assets the user should create
- how to customize graph colors and visual styles
- what fields are currently unused but available

---

## 16. Expected Output Files

Codex should create or modify files that fit the existing project conventions.

Likely documentation/cache outputs include:

```text
public/data/graph/relationship_graph_3d.json
public/data/graph/relationship_graph_3d_layout.json
docs/algorithm-audit.md
docs/hand-drawn-ui-asset-list.md
docs/archive-3d-data-flow.md
```

The two `public/data/graph` files are optional cache/layout files. Prefer runtime organization if that fits the existing app better.

Likely implementation files may include, but are not limited to:

```text
scripts/build-graph3d-cache.*
scripts/validate-archive-data.*
scripts/audit-algorithm-output.*

src/**/ArchiveExperience.*
src/**/StageExperience.*
src/**/RelationshipGraph3D.*
src/**/AvatarPointCloud.*
src/**/Graph3DControls.*
src/**/Graph3DDetailPanel.*
src/**/BranchingTimeline.*
src/**/MetadataSidebar.*
src/**/graph3dTypes.*
src/**/graph3dUtils.*
src/config/archiveVisualConfig.*
```

Adapt paths to the existing repository layout.

---

## 17. Acceptance Criteria

The task is complete only when all applicable items are true.

### 17.1 Experience and UI

- The site opens into Stage5 as the home state.
- Stage5 shows the global `stage5.glb` collective avatar/map when available.
- Stage5 has no sidebar and no timeline by default.
- Stage0-4 have a metadata sidebar.
- Stage0-3 display PNG avatars directly by default, with configurable near-white removal.
- Stage4 displays an anchor/timeline-specific GLB when available.
- Missing assets show placeholders and metadata instead of failing.
- The main visual UI does not display literal “Stage x” labels.
- A branching or spatial timeline, not a simple line-with-dots timeline, controls Stage0 → Stage5 transitions.
- The transition flow visually communicates identity combination/absorption.
- Codex outputs a hand-drawn UI asset list with component names, formats, sizes, and purposes.

### 17.2 3D Graph Data and Layout

- The graph can be built from existing algorithm graph, timeline, and optional submission data.
- Every unique tag has a graph node.
- Every questionnaire/submission has an identity center node where data allows.
- Every identity node can display `Name: {identity_name}` and `{carried_fragment}`.
- Shared tag links and conflict/glitch links are visually distinct.
- Every node has stable ID, type, metadata, visual mapping, and usable 3D coordinates.
- Link endpoints reference valid node IDs.
- `z` axis has meaningful semantics based on stage/timeline/cluster/score when data allows.
- Graph layout is stable for the same input files.
- Stage1-3 nodes can reference expected PNG asset paths.
- Stage4 nodes can reference current/future GLB model paths.
- Original algorithm data remains unchanged.

### 17.3 Frontend 3D Graph / Avatar-Map

- Current relationship graph is replaced or clearly superseded by the 3D avatar-map graph view.
- Graph renders through WebGL/Three.js or a Three-based graph library.
- Stage4/Stage5 GLBs can render as large point-cloud avatars or compatible high-quality spatial visuals.
- Graph nodes are distributed inside, around, or on the surface of the avatar point-cloud field where feasible.
- User can rotate, zoom, pan, hover, click, search, filter, highlight neighbors, toggle isolated nodes, reduce/toggle links, and reset camera.
- The graph does not auto-rotate.
- Node detail panel exposes archive metadata and asset/model references.
- UI includes loading, error, empty, and WebGL-fallback states.
- Graph remains readable after filtering.
- Existing pages/routes are not broken.

### 17.4 Algorithm Audit

- `docs/algorithm-audit.md` or equivalent final notes report whether algorithm output matches the required stage/source/tag logic.
- Audit identifies fields present in the algorithm that are not currently used by the frontend requirement.
- Audit identifies missing fields and fallback organization.
- Potential algorithm logic issues are reported clearly for user decision rather than silently hidden.

### 17.5 Quality

- Build passes.
- Lint/type checks pass if configured.
- Validation script passes if configured.
- New code follows repository style.
- No external copy-to-public logic is added.
- No large binary assets are added unless already expected by the repo.
- Final response lists changed files, commands run, commands that failed if any, and known limitations.

---

## 18. Preferred Final Response Format from Codex

When finished, respond with:

```text
Summary
- ...

Files changed
- ...

Outputs
- ...

Algorithm audit
- ...

Commands run
- ...

Validation result
- ...

Known limitations / follow-up
- ...
```

If implementation cannot fully complete because source files are missing or data shapes differ, still implement the reusable infrastructure and provide a precise explanation of the missing inputs. Do not silently skip major requirements.

---

## 19. Implementation Notes and Edge Cases

- If source timeline items do not explicitly identify Stage0-4, infer stage from available timeline metadata or path conventions, and document the inference.
- If `identity_name` or `carried_fragment` is missing, fallback to submission ID and available tags.
- If `active_tags_preview` is missing, derive a short list from avatar tags or dominant tags.
- If scores are missing, default to `0` or omit score-specific visual intensity.
- If events are missing, still render from identity, carried fragment, and tags.
- If Stage1-3 avatar image files do not exist yet, still use expected asset paths and placeholders.
- If Stage4 GLB files do not exist yet, use expected path conventions and placeholders.
- If Stage5 `stage5.glb` is missing, show a placeholder collective avatar state and report the missing file clearly.
- If graph is too dense, provide default filters and link-density controls.
- If adding a dependency, choose the smallest stable option and justify it in the final response.
- If hand-drawn UI assets are not yet available, use modular temporary placeholders and document replacement paths.
- If optional graph cache files are absent, use runtime organization when feasible.
- If optional graph cache files are stale, prefer source algorithm files or report the mismatch.
- If WebGL is unavailable, show a readable fallback list/search view instead of a blank page.

---

## 20. Definition of Done

A developer should be able to start the app, open the site, land directly in the Stage5 collective avatar-map, interact with the 3D point-cloud avatar and embedded relationship graph, click an identity to enter Stage0, drag a branching/spatial timeline through Stage1-5, inspect metadata in Stage0-4 sidebars, search/filter graph nodes and tags, and validate the algorithm/data assumptions without manually editing source data or copying files from external directories into `public/`.
