# Algorithm Audit

## Summary

- Node types: identity
- Edge relation types: obfuscation_interaction
- Identity nodes: 43
- Identity interaction edges: 903
- Unique tag display labels: 370
- Anchors: 43
- Timeline items under anchors: 172
- Source timeline item counts: {"0":43,"1":129,"2":1}
- Collective source: global_collective_item

## Resolution Checks

- Edges with unresolved endpoints: 0
- Timeline source_ids not resolving to identity nodes: 0
- Anchor IDs not resolving to identity nodes: 0
- Timeline/source cardinality problems: 0
- Collective is global: true

## Field Availability

- Graph identity tags present: true
- Graph edge scores present: true
- Graph edge events present: true
- Timeline scores present: true
- Timeline events present: true
- Timeline avatar_tags present: true
- Timeline active_tags_preview present: true
- Timeline avatar_vector present: true

## Asset Resolution

- Missing individual PNGs for graph identities: 0
- Collective GLB exists: true

## Frontend Interpretation

- Use graph edges as canonical all-identity relationship source.
- Use graph identity nodes as canonical individual entries.
- Use global_collective_item and /models/global_stage2_collective.glb as canonical collective source.
- Create frontend tag nodes from unique tag display labels because source graph nodes are identity-only.
- Use evidence.conflictPairs and glitch-like events for conflict/glitch links; do not infer conflict from tag names alone.
- Missing assets are expected runtime states and must render placeholders without mutating source data.
