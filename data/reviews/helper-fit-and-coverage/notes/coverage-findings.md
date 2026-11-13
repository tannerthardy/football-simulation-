# Defensive priority: protect an acquired flat before retuning physics

The retained 96-pass panel has 55 completions, 516.15 YAC and a 9.38-yard
YAC/reception mean. Three 70-yard touchdowns contribute 171.82 YAC (33.3% of
the total); the other 52 completions average 6.62. This is a tail-driven
diagnostic population, not the eight-game sample or NFL frequency data. Its
first useful problem is where defenders choose to go before contact.

## Demonstrated local repair

At 1.70 s in `DA-R2-curl_flat-cover3-R`, the nickel owns `curl_flat_w` in
Gun Doubles: installed W1=X, W2=H. The nickel already believes pass. His
consumed 0.25-second picture puts H 2.69 yards beyond the line, moving
(2.92,+3.93) yd/s with an outward-facing body; X is a vertical at 5.54 yards,
moving (5.71,0). Existing bounded route anticipation transforms H's cue to
approximately (2.44,+4.24) yd/s. The actual private QB-eyes ID also favors X
in the inherited lane score; this repair does not replace that shortcut.

The old generic nearest-landmark score changes the nickel's target from H to
X, despite the observed flat having widened beyond the curl landmark. The
nickel requests (+5.679,+5.781) yd/s while facing toward the QB. The first
repaired request uses H's acquired flat geometry, (+2.571,+9.468) yd/s with
facing 1.048 rad. The body, velocity, support and interpretation at the fork
are identical. The first achieved position difference appears at 1.75 s;
the request does not teleport the defender or increase his physical capacity.

**Correction to initial diagnostic inference:** the switch is the generic
lane-scoring branch, not the earlier vertical-carry branch. The known #1's
lateral coordinate is numerically just outside that branch's six-yard test.
The repair therefore addresses the demonstrated curl/flat conflict; it does
not introduce an unproved blanket prohibition on carrying #1.

The coaching contract was already documented in
`docs/research/coverage-terminology.md` §6.1, citing Matt Bowen's
[Cover 3 introduction](https://bleacherreport.com/articles/2047445-nfl-101-introducing-the-basics-of-cover-3):
the curl/flat player holds off the curl, widens with the flat and avoids
being out-leveraged. The installation uses imperfect acquired movement and
existing pass belief. It does not require knowledge of the called route,
future throw target or teammate assignments.

The bounded branch applies only to match `curl_flat_s/w` when the old lane
winner is the known #1, the personally observed #2 is shallow and has actually
widened outside the curl landmark, and no installed #3 or acquired Fast-3
back release creates a different exchange. Ordinary carries return before
this branch. Spot drops, run/unsure reads, inside pictures and deep outs retain
their old responsibilities. Width is established using existing station
keeping, receiver motion and movement limits; no new RNG, timer or force
multiplier is added. `coverage-flat-expand` records the actual first choice.

## Actual football consequence

The QB responds to the repaired flat coverage by selecting **the curl**:

- Old: throw to H at 3.80 s, catch at 4.75, 5.7-yard separation, 61.19 YAC,
  untouched 70-yard touchdown.
- Component/final: throw to X at 3.30 s, catch at 4.15, 2.3-yard separation,
  2.53 YAC, 13.95-yard completion ending in an actual tackle.

This is not a counterfactual keeping the same pass target. It demonstrates the
ordinary curl/flat offensive answer: the defense takes away the exposed flat
and the quarterback finds the underneath curl. There is no guaranteed stop.

The corner acquires a real reach/behind grasp at 4.65 s. Its first solved load
at 4.70 is approximately 680.50 in native force units and slips at the unchanged
capacity. Legs become restrained through actual sustained contact. The runner
starts falling from legs at 5.10, the linebacker assists at 5.25, and the
runner is down at the 5.50 tackle whistle. Both tacklers remain upright at the
end; no four-second cap or forward-progress shortcut decides this finish.
The loaded forces are internal model observations, not NFL human-force
calibration. Shared physics, profiles and resolution are byte-identical to
the parent in this component.

## All six retained inputs, including the adverse return

| Retained input | Parent | Component/final | Full execution |
| --- | --- | --- | --- |
| R2 Curl-flat Cover 2 right | 70 yd TD | 70 yd TD | Exact unchanged |
| R2 Curl-flat Cover 3 right | 70 yd TD | 13.95 yd tackle | Changed target, timing, coverage and actual contact |
| R2 PA Post-dig Cover 3 right | 70 yd TD | 70 yd TD | Exact unchanged |
| R2 Curl-flat Cover 2 left | 9.97 yd OOB | 9.97 yd OOB | Exact unchanged |
| R2 Curl-flat Cover 3 left | Interception, zero offensive gain, 8.05 return yd | Same interception/zero offensive gain, **13.79 return yd** | Broken tackle 0→1; duration 5.55→6.25 s |
| R2 PA Post-dig Cover 3 left | 41.96 yd tackle | 41.96 yd tackle | Exact unchanged |

Same gains are not called identical execution. The opposite-side interception
return worsens for the offense and acquires a real broken grip; it remains
visible in the film and comparison. The other two retained long touchdowns
are unresolved. The Cover 2 tail contains a short spacing gather that may be
legitimate traffic avoidance, and the PA tail has a mistaken safety run read
and failed pursuit. Neither is promoted as a proven new physical-law failure.

## Source, observation and test receipts

The six inputs were retrospectively selected from the published c2 panel:
three right-side touchdowns and their fixed mirrored counterparts. Each
baseline execution exactly reproduces its original published signature.
All complete initial player profiles, bodies, minds, recognition, numbering
and RNG states match across the baseline, component and final phases. All
18 observed/plain executions and copied next-RNG states match within phase.
All six final executions exactly equal the defense-only component; the
independent helper-block change does not affect these fixtures.

- Parent source: `c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8`.
- Defense-only exploratory component: `e5e9a122f7c76090e12b8eb57dc358e43ba9c59ee440232bf330cae5ddad0e4a`.
- Promoted combined source: `601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
- World SHA-256 remains `4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.

The final source includes the essential `best &&` nullable guard omitted from
the exploratory component. That guard changes no retained execution. The
initial compiler failure and the initial reduced-fixture failure are retained,
rather than represented as passing phases. The reduced fixture originally
omitted the inherited QB-eyes ID; it now explicitly retains that native state
and compares player indices instead of serializing entire circular agents.

All **13 final feature checks pass**; the parent fails four positive contracts
while passing all nine ordinary/adverse controls. The same final focused run
also passes 27 existing coverage movement/rule checks (40 total). These are
functional controls for mirrors, acquired versus hidden pictures, pass/run
belief, no-flat/deep-out/spot choices, seam carry, known third receivers and
Fast-3; they do not guarantee a game-level outcome or a perfect read.

`native-tail-panel.ts` imports the announced frozen archive and requires that
archive as cwd, checks the exact source before/after, and writes all six rows.
It records every **actually requested** picture; the observer calls no extra
`see`, route-read, RNG or movement operations. Enriched packets preserve full
serializable actual setup metadata, initial bodies/minds/RNG and explicit
plain signatures. Earlier exploratory packets remain separate.

```sh
node --import tsx out/helper-fit/defense/native-tail-panel.ts \
  <frozen-archive> <announced-source-sha> <output.json.gz>
python3 out/helper-fit/defense/compare-tails.py
node node_modules/vitest/vitest.mjs run \
  test/coverage-flat-responsibility.test.ts \
  test/coverage-mechanics.test.ts test/coverage-rules.test.ts --maxWorkers=1
```

The native collector command must be launched from the declared archive.
`comparison.json` retains byte receipts, first requests/movement, all six
outcomes, the adverse interception return and the full sampled loaded-tackle
lifecycle. These are local cause/transfer witnesses, not NFL calibration or
proof that passing, pursuit, coverage or physics are generally finished.
