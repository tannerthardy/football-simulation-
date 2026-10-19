# Offset shotgun RB alignment correction

2026-10-19 America/Phoenix. Formation owner: Measurement, per user assignment.
Accepted base `f4146275ce7539816bf57b4ed55a0d2be10e48c7`; tested source
`d52c7aa781553ec4d48718ecf4b0ebf5f3fdc075`. This is an independently reviewable
formation-data correction, with no dependency on #153's experimental runtime.

## What changed and why

The seven offset-gun formations shared an RB split of 1.6 yd and LOS depth5.2.
With the installed QB depth5.0, that placed the back only .2 yd behind the QB.
Use **2.3 yd beside / .5 yd behind** instead (LOS depth5.5), preserving each
formation's side and flip. Empty, pistol, under-center, receivers, line and QB
placements are untouched. The runtime diff is only `src/playbook/formations.ts`.

The [saved NFL geometry](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3/part3.txt#L6)
reports shotgun IZ n779, lateral2.3 / behind.5; OZ n232, lateral2.3 / behind.3.
These are representative alignment observations in selected 2022 weeks1–9
run/handoff samples, not universal NFL formation requirements. A .5yd stagger
is a nominal generic-gun placement; concept-specific variety remains possible.
No new NFL query/download was needed. Raw joins/missingness were not re-audited.

The quoted “short runway caps handoff speed at2.3” is **not an established
causal ceiling**. That result used experimental mesh scheduling. This correction
changes starting geometry only; it does not tune movement, reach, snap delay,
exchange cadence or a speed target. No MESH_TEMPO/UC_MESH, other research flags,
World laws, capacities or ratings enter this branch. Research head336e8fc9 was
checked for overlap; it still had the original formation values.

## Focused evidence

[Summary, provenance and artifact checksums](../../data/reviews/current/shotgun-rb-alignment/summary.json).
All original [observations](../../data/reviews/current/shotgun-rb-alignment/observations.json.gz)
and [native QB/RB prefixes with exact setup/identities](../../data/reviews/current/shotgun-rb-alignment/prefixes.json.gz)
are fetchable. These are simulated evidence, not raw NFL redistribution.

One frozen existing **ordinary** roster-screen matchup, seed71001; QB
`S88O-QB2`, RB `S88O-RB2`. Both arms run identical accepted code plus the
formation-only patch. The old arm reconstructs the exact accepted formation
input (split1.6/depth5.2); no historical engine or roster is imported. All
other calls/inputs/settings match. Inputs, resolved44 flags/components1,
World defaults, Node22.23.3, source/helper/operator/lock hashes are recorded.

| Gun example | Handoff time old→new (s) | Stored speed old→new (yd/s) | QB–RB separation old→new (yd) |
| --- | --- | --- | --- |
| IZ strong, across QB | 1.05→1.05 | 1.528→2.050 | .889→1.026 |
| IZ weak, own side | 1.05→1.20 | 1.048→1.892 | 1.093→1.258 |
| OZ strong, flipped | 1.00→1.00 | 1.827→2.211 | .996→1.064 |

Each exchange occurs inside the unchanged1.286yd physical reach of this QB/RB
pair. Observation wraps the existing transfer method read-only, retaining its
return/action and reading stored velocity before subsequent physics. These
speeds are **not directly the NFL3.82 estimate**, which was differentiated from
rounded positions with a centered window. No NFL-equivalence claim is made.
Raw `finalIntent` means the last available `sim.intents` value; at a transfer
inside an update it can be the preceding step's final intent. It is not an
earlier controller request or a reconstruction of discarded request stages;
the speed comparison uses only the stored body velocity.

Preserve the **+.15s own-side IZ timing change** and its narrow .028yd reach
margin at transfer. A longer approach changes achievable arrival. This sample
does not establish timing or successful exchanges for every body/front/call.
Do not erase the timing change by shortening the path or changing reach.

Pistol IZ, under-center OZ and empty Mesh controls have **identical full-body
state/event signatures and input hashes** across arms through the selected
prefixes. All native velocity/positions were hashed without rounding. A gun
Mesh back retains its swing route; the QB's selected throw remains at2.05s.
The quick-outs back retains pass protection; its QB throws at2.35s in both arms.
There is no RB loaded-contact event in that protection prefix, so it cannot
certify blitz pickup, useful contact or a protection win. Defensive reads and
later blocks may change when they react to a different starting back; those
changes are retained in the events, not classified by gain.

**Accounting:** 16/16 planned arm-prefixes attempted, zero failures/unrun cases;
all16 are intentional nonterminal prefixes. Runs stop .25s after handoff;
passes stop at2.5s. These are censored observations, not known play endings or
evidence of stalled plays. No yardage/outcome claim is made.

**Checks:** 31 focused assertions pass across the new formation tests, existing
alignment and physical mesh/transfer tests. They cover the seven placements at
both flips/all three hashes, empty/back numbering, reachable ordinary exchanges,
and seven-on-line/uncovered eligible ends across all18 installed formations.
No additional confirmed formation defect emerged from that legality check.
Typecheck passed on identical source/test/diagnostic bytes before freeze.
[Focused-test receipt](../../data/reviews/current/shotgun-rb-alignment/checks.json)
records2.506s; [native launcher](../../data/reviews/current/shotgun-rb-alignment/launcher.json)
records1.437s (1.185s observation loop). Both report unchanged inputs. No full
suite, additional seeds/rosters, broad lab or games; Integration owns one required
combined verification if the correction is independently accepted.

## Reproduction and next decision

From the tested pin, Node22.23.3 and the existing lockfile dependencies:

```sh
node scripts/baseline.mjs --candidate -- node node_modules/vitest/vitest.mjs run --project core --maxWorkers=1 test/shotgun-rb-alignment.test.ts test/alignment.test.ts test/snap-mesh-and-pull.test.ts
node --import tsx scripts/diag/shotgun-rb-alignment.ts
# The line above plans only: zero engine ticks. Execution is opt-in:
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/shotgun-rb-alignment.ts --run --out out/shotgun-rb-alignment/result.json
```

The diagnostic has a fixed16-prefix/30-second ceiling, 3s per prefix, no retries,
and preserves failures/partial prefixes/unrun tail. Reuse the saved artifacts;
these commands document reproduction, not a request to rerun them.

Request independent review of the **formation-only correction** and its preserved
timing change. Mesh cadence/own-side exchange remains with Run/controller's
separate #153 review. Do not add that experimental package to make these speeds
look more like NFL. Future formation issues should identify the particular
placement/legality/role contract and reuse its smallest opposing control before
expanding collection. No general formation or speed calibration is established.
