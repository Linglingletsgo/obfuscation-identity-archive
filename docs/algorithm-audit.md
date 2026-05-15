# Algorithm Audit

## Summary

- Node types: identity
- Edge relation types: obfuscation_interaction
- Identity nodes: 10
- Identity interaction edges: 45
- Unique tag display labels: 249
- Anchors: 10
- Timeline items under anchors: 300
- Stage item counts: {"0":10,"1":80,"2":100,"3":80,"4":30,"5":1}
- Stage5 source: global_collective_item

## Resolution Checks

- Edges with unresolved endpoints: 0
- Timeline source_ids not resolving to identity nodes: 0
- Anchor IDs not resolving to identity nodes: 0
- Stage/source cardinality problems: 0
- Stage5 is global: true

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

- Missing Stage0 PNGs for graph identities: 1 (submission_20260506142646474_adc90a10)
- Missing Stage1 PNGs: 80
- Missing Stage2 PNGs: 100
- Missing Stage3 PNGs: 80
- Missing timeline-specific Stage4 GLBs: 30
- Default Stage4 GLB exists: true
- Stage5 GLB exists: true

## Frontend Interpretation

- Use graph edges as canonical all-identity relationship source.
- Use timeline anchors and items as canonical Stage0-4 navigation source.
- Use global_collective_item as canonical Stage5 source.
- Create frontend tag nodes from unique tag display labels because source graph nodes are identity-only.
- Use evidence.conflictPairs and glitch-like events for conflict/glitch links; do not infer conflict from tag names alone.
- Missing assets are expected runtime states and must render placeholders without mutating source data.
