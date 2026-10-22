# Match corner: release #1 only on a declared shallow route

2026-10-22, from accepted `develop` `d91c9014`. The film below is pinned to
commit `5629d006`. Later commits on this branch extend the rule (see
[coverage checks](../references/coverage-checks/README.md)): a slant's In
call now becomes final 0.35 s after the break, and a short out or flat zones
the corner off without locking, so an out-and-up returns to him. Source audit:
[coverage rules against source installs, section 1](https://github.com/tannerthardy/football-simulation-/blob/claude/great-mccarthy-85uf8b/docs/reviews/coverage-rules-source-audit.md#1-the-corner-leaves-1-far-too-early-highest-impact)
(PR #191).

**Question.** Does the MOD Quarters corner (`qCorner`) and the Cover 3 match
corner (`c3Corner`) stay on #1 through a 7-yd curl and a stop-and-go, and
still release #1 on a truly shallow route?

**Contract (declared before the film).** The corner owns every route by #1
whose stem gets past the ~5-yd no-cover zone. He zones off (the "In"/"Under"
call) only when #1 breaks (under, flat, in or out) before clearing it. That
locks the zone-off. A short stop zones him off only while #1 sits, because a
stop can turn upfield. MEG is unchanged.

- HNFL-079 (original image viewed): "responsible for all routes by #1 unless
  an 'In' or 'China' call". The call comes once #1 "truly declares themselves
  to be running shallow and not just getting us to zone off, then running
  upfield". The 1/4 defender is responsible for #1 "unless they go shallow
  ('In, in, in') or fail to clear the 'no cover zone' ('Under, under,
  under')". The blue "man on #1" routes include intermediate ins, outs,
  slants, curls and comebacks.
- Michigan 2014 DB manual: "Man any vertical stem by #1 past 5 yards."
- Saban pattern-match Cover 3: the Under call comes within the first five
  yards of the route.

**What changed.**
- `ReleaseReader` records the deepest depth the defender has seen each
  receiver reach (`ReceiverRead.deepest`).
- `under(one, 9)` is replaced by `zoneOffOne`, using `NO_COVER = 5`, in both
  corner rules.
- Nothing else reads the new field.

## Film

Reproduce: `node --import tsx scripts/corner-one-film.ts`. Before/after
summary: [`corner-one-release.json`](../../data/reviews/current/corner-one-release.json).

Setup: `gun_doubles_11` against nickel over front, seed 5, QB holds the ball.
Both #2s run hitches, so no #2 vertical pulls the corner through the judgment
layer. W is #1 weak; S is the mirrored control on the strong side. "Zoned"
is when the corner's rule locked zone, with #1's read release and depth.
Positions at 3.6 s are #1 depth / CB depth / separation in yards.

| Coverage | #1 route | Side | Before: zoned | Before @3.6 s | After: zoned | After @3.6 s |
| --- | --- | --- | --- | --- | --- | --- |
| MOD | 7-yd curl | W | 2.45 s (stop 7.3) | 6.6 / 10.4 / 4.3 | never | 6.6 / 10.2 / 4.0 |
| MOD | 7-yd curl | S | 2.35 s (stop 7.3) | 6.6 / 9.4 / 3.2 | never | 6.6 / 9.4 / 3.1 |
| MOD | stop-and-go | W | 2.25 s (stop 6.4) | 12.6 / 12.2 / 0.7 | never | 12.6 / 13.0 / 0.7 |
| MOD | stop-and-go | S | 2.05 s (stop 6.3) | 14.0 / 13.5 / 1.2 | never | 15.0 / 13.8 / 1.4 |
| MOD | `quick_out` | W | 2.3 s (out 6.3) | 5.0 / 9.5 / 4.9 | never | 5.0 / 9.6 / 4.8 |
| MOD | slant | W/S | 1.65 s (under 4.0/4.3) | — | identical | identical |
| MOD | flat | W/S | 1.0/0.95 s (flat 0.9/0.6) | — | identical | identical |
| C3 match | 7-yd curl | W | 2.45 s (stop 7.3) | 6.6 / 8.3 / 2.5 | never | 6.6 / 8.3 / 2.2 |
| C3 match | stop-and-go | W | 2.25 s (stop 6.4) | 12.6 / 10.6 / 2.4 | never | 12.4 / 11.4 / 1.2 |
| C3 match | stop-and-go | S | 2.05 s (stop 6.3) | 15.0 / 11.9 / 3.4 | never | 13.2 / 13.1 / 0.5 |
| C3 match | slant, flat | W/S | as MOD | — | identical | identical |
| MEG | all five | W/S | never | — | identical | identical |

What the corners do in this film:
- **Stop-and-go.** Before, both corners took a zone job at the stop. They
  sat while #1 went upfield, and the "man" came back only from the judgment
  layer's late rescue (MOD W at 3.50 s, C3 W at 3.35 s). The Cover 3 corner
  was 3.1 yd under #1 (S) at 3.6 s. After, the jobs are man, squeeze the stop
  (`rob:X`), then man again from 2.8 s. The MOD corner's trajectory is
  identical to MEG's. Every C3 sample is closer to #1 than before. On the
  weak side #1 is still 1.0 yd past the corner at 3.6 s.
- **Curl.** The visible job barely changes, because the judgment layer was
  already squeezing #1's break (`rob:X`), and positions differ by at most
  0.3 yd. The rule now owns #1 instead of a zone, so he stays the corner's
  if the curl turns upfield.
- **Slant, flat and MEG.** Byte-identical trajectories: the true shallow
  release is preserved.

## Report

```text
What changed: MOD/C3-match corners zone off #1 only on a break short of the
  5-yd no-cover zone; a short stop is reversible. MEG unchanged.
Evidence for/against: film above; test/corner-one-release.test.ts. Its 9
  carry/reversibility cases fail on the old rule and pass on the new; the 4
  flat controls pass on both. Existing coverage tests (18 files, 245 tests)
  pass, including slant releases. Typecheck and build pass. A local full
  `npm test` (Node 22.22.0, 58 s) passes 2785/2788. The 3 failures are
  baseline-runner.test.ts refusing the non-.nvmrc Node, and they fail the
  same way on base. This is not the integration receipt.
Unresolved risk: the installed `quick_out` runs a ~6.3-yd stem in this sim
  before the out is read, so the corner now carries it as a man route. That
  follows the sources' "past 5 yards", but it moves Cover 3/Quarters
  quick-game matchups. Whether the route should be shallower is a route-
  geometry question, not part of this change. A shallow break locks
  immediately on the reader's confirmation, with no extra "truly declared"
  persistence, so a whip-and-go inside 5 yd still beats the corner. Coach
  installs vary between 5 and 6 yd.
Runtime: film 30 snaps x2 in ~5 s each run; focused tests ~3 s.
Next decision: whether to also hold a shallow lateral break for a beat before
  locking (whip/out-and-up inside 5 yd), and audit items 2-4 (trips reads).
```
