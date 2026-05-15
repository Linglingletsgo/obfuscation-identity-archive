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
