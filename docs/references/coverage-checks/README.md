# Coverage checks and adjustments: sources and implementation status

Two research indexes, compiled 2026-10-22 for the coverage-rules work on
`claude/friendly-bardeen-56kqo2` (PR #193):

- [honestnfl-index.md](honestnfl-index.md): every coverage check, motion
  adjustment and pattern-match call in the in-repo HonestNFL library (~140
  coverage sheets, 20 originals viewed), the Coverage Operating System
  manuscript and the handbook. Tags: [S] stated, [D] read from the diagram,
  [I] inferred.
- [web-sources.md](web-sources.md): public coaching sources (Saban's
  coverage manual transcription, Kirby Smart, Pruitt, Cover 7, MatchQuarters
  previews, Fangio write-ups, USA Football, Brophy), with URLs. Tags: [S],
  [I], [C] conflicting.

Both are syntheses by research agents; quotes are short and cited, and
anything inferred is marked. Where systems disagree (Cone, Trix, Lock, Trap,
Box safety, In-call ownership), the conflict sections list both versions.
The engine implements one coherent version per call and names its source.

Shared thresholds the engine uses: the **no-cover zone is 5 yards**
(HNFL-093/201, Saban "under in the first 5 yards", Michigan "past 5"); a
route's stem "clears" it when the receiver has been seen deeper than 5.

## Implementation status

| Area | Rule | Status |
| --- | --- | --- |
| Corner vs #1 | MOD/Cover 3 corner releases #1 only on a shallow declaration; short stop reversible | Done (`zoneOffOne`) |
| Corner vs x1 | Tight 1/4: no China vs a lone #1, only In (HNFL-095) | Done |
| Quarter Flat | China push to #1; #3-away carry of #2 shallow; first flat of #2 | Done (`quarterFlat`) |
| Trix/Poach | Backside safety keys #3 to X, squeezes X when #3 cancels; read hook walls #3 | Done |
| Stubbie | MEG #1, MUSH #2, read hook, 3/2 safety (#3 first) | Done |
| Pre-snap structure | trips open/closed, bunch, stack, nub, empty, two-back, iso X, reduced, field side | Done (`formationStructure`) |
| Check framework | ordered structure checks per coverage, recorded on the call | Done (`checkCall`) |
