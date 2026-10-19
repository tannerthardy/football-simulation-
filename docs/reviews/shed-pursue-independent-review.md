# SHED_PURSUE independent contact review

**HOLD both runtime hunks as submitted.** Longer-range, personally informed
work-off is a reasonable controller change, but the proposed gate bypasses two
accepted information/timing contracts. The separate runner-passed cooldown
forbids reachable re-acquisition without evidence of a physical shed.

Reviewed 2026-10-19 UTC, independently of the author, from accepted
`f4146275ce7539816bf57b4ed55a0d2be10e48c7`. [PR #153](https://github.com/tannerthardy/football-simulation-/pull/153)
head `1c578afb38f2eb6fc4886639e63fccc4e79c4354`; runtime checkpoint
`c8d638086e69961de2ff45d41df0a9871947ca83`; [review packet](https://github.com/tannerthardy/football-simulation-/blob/9a6bb795179a4b2e61ed59d25bcf23ca5e40f423/docs/reviews/run-game-v3-review-intake.md)
`9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`. Fetched refs and actual merge base
agree with the accepted pin. [Focused receipt, settings and logs](../../data/reviews/current/shed-pursue-independent-review.json).

## Follow-up at #153 `8d3c41f2` — 2026-10-19 America/Phoenix

Freshly fetched research head `8d3c41f2bbfc0bbcc923f3fa583ad9be0df44055`;
accepted develop and the canonical packet remain the pins above. The
`engagement.ts` blob is still `cd2a29872e2ada9011914ce1a6350eb9a6f726f4`,
and the direct test blob is still `b35a78b786c538d63501cb63ade745eb9a9da25c`.
The exact two runtime hunks and their controls have not changed. **The two
separate HOLD decisions remain; no old failure is relabeled as a new run.**

The author has now [published native witnesses](https://github.com/tannerthardy/football-simulation-/blob/8d3c41f2bbfc0bbcc923f3fa583ad9be0df44055/data/reviews/current/run-game-v3-witnesses.json).
I inspected only the four `w6-shed-*` records, not a new panel. Each compact
witness plus newline reproduces its recorded SHA256; receipt/witness settings
agree. Their producing source is `b5577605bb10b6d1e35b618d9ba78d75e6f65106`,
source fingerprint `cfc66cf54643e0d09a909ae23a0854591b9f7c67d3b51d41eb87b977a39d645c`.
This is package-source evidence, not an accepted-develop or intent-only result.
Within each pair, only `SHED_PURSUE` differs in resolved settings; both flag
effects are enabled together. Original collector command cost totals9.044s,
reused rather than incurred again.

| Saved pair | First sampled DE_W work-off change | Engagement at that sample | Recorded endings, off → on |
| --- | --- | --- | --- |
| `oz/strong/ace_12/off1/pair11/77`, `w6-shed-tempo` / `w6-shed-pursue` | At2.45s, final intent `(−1.5,+3.91)` → `(−0.6,−3.91)`yd/s | Both still H/DE_W, original start0.65s | 70yd touchdown → 8.68yd tackle |
| Opposing `oz/strong/ace_12/over4/pair11/6`, `w6-shed-control-tempo` / `w6-shed-control-pursue` | At2.65s, the same intent change | Both still H/DE_W, original start0.65s | 6.13yd tackle → 70yd touchdown |

This provides a useful distinction: the recorded work-off request changes
**during the continuing original block**, before the later sampled absence of
the on-arm engagement and off-arm re-acquisition. The author's statement that
both witnesses diverge only after release is too broad. These are the first
**sampled** changes for the selected defender, not an exact all22 first
divergence: the samples are0.2s apart and rounded to0.01. The witnesses omit OL
bodies/requests, acquired possession pictures, hand loads and end-reason
callbacks. They cannot establish whether the later reachable re-grab is invalid
or which hunk explains either ending. Preserve both football outcomes without
using either as a validity verdict.

**Intent remains HOLD as implemented**, for the independently reproduced
acquisition and held-mode conflicts below, while an informed intent-only
revision remains a sound next proposal. **The administrative re-grab
prohibition remains a separate HOLD.** The missing observation is now narrowed
to the paired hand/reach/command state at the administrative end→re-grab
transition; native witnesses generally are no longer missing. No new fixture,
test, World step or native simulation was run for this follow-up. The original
6.739s focused receipt and its two failed contracts remain intact.

The [catch-query interface handoff](catch-query-interface-handoff.md) is a
separate author-support task. It is not independent approval of authored #131.

## Exact disposition

Line numbers below refer to the pinned PR head, not a later branch tip.

| Hunk | Decision | Reason |
| --- | --- | --- |
| [engagement.ts:1047–1049](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/src/sim/engagement.ts#L1047-L1049): `pursue` and its extra `|| pursue` | **HOLD as written** | Positive possession in `read.threat` is insufficient to preserve support's unique acquisition and held target mode. Two existing opposing controls fail only with the flag on. |
| [engagement.ts:716–719](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/src/sim/engagement.ts#L716-L719): runner-passed `b.shedBy.set(d, t + 0.6)` and rationale | **HOLD** | Runner depth/rep age does not establish broken hands, an earned shed or a refit delay. This adds an immunity interval for otherwise reachable grabs. |
| [test/shed-pursue.test.ts:37–44](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/test/shed-pursue.test.ts#L37-L44) | **ACCEPT as a positive/pre-LOS control for a revised intent-only extraction** | Demonstrates an attempt at longer range, unchanged engagement ownership, and no such attempt before LOS. Does not establish the other information/timing contracts. |
| [test/shed-pursue.test.ts:28–35](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/test/shed-pursue.test.ts#L28-L35) | **HOLD as a promotion contract** | Asserts the disputed restriction itself. Preserve it as evidence of the rejected proposal, not as proof that the restriction is earned. |
| [engagement.ts:661](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/src/sim/engagement.ts#L661), [config/baseline.json:51](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/config/baseline.json#L51) | **Accept only as default-off wiring for a revised proposal** | No standalone adoption value. Rewrite the coupled flag/test description to omit the held lockout if extracting intent alone. No activation approved. |

**No runtime implementation hunk is currently accepted unchanged.** Preserve
the existing `beat()` cooldown, legal reach/down/bond checks, physical shed
execution, hand/support budgets and ordinary body collision behavior. This
review does not revalidate or alter the existing cooldown's calibration. Mesh,
BACK_CHASE, RUN_LATERAL and other #153 hunks are outside this disposition.

## 1. Longer-range shed intent: sound direction, incomplete guard

The proposed extension uses delayed `carrying === true` and signed observed
post-LOS depth. It retains `read.threat`, `t >= e.nextMoveAt` and the existing
work-off request. With accepted `SHED_PHYSICAL=1`, it requests an attempt;
it does not itself release hands, award a shed, add force or change capacity.
The published new positive/pre-LOS test passes.

However, [accepted #138](https://github.com/tannerthardy/football-simulation-/pull/138)
deliberately requires unique QB/back acquisition and the held declared mode for
support's long-range work-off. `supportRunner` still has those checks; the new
OR arm bypasses them:

- **Conflicting possession:** the force defender sees both QB and RB carrying.
  `acquired` is null; `runContactRead()` falls back to the authoritative
  `sim.carrier`. Its selected RB picture is positive/post-LOS, so the new gate
  permits work-off despite unresolved acquired evidence. At `t=1.5`, the
  existing control's `nextMoveAt` changes from `0` to `1.9299029383852175`.
  This is a real acquisition-contract violation, not proof of a legitimate shed.
- **Held mode:** at `t=1.51`, a newly advanced picture starts work-off while the
  previously selected force-shoulder mode/aim is still held. `nextMoveAt` becomes
  `1.9399029383852175` before the ordinary read updates. The coarse move timer
  remains, but that does not preserve the separately held target decision.
  Earlier force abandonment would need its own behavioral justification.

Both occur with the observed RB only **2.18 yd** beyond the defender, below
the administrative ending's `>2.5` threshold. Thus the cooldown hunk never
runs in these cases; these failures belong to the intent gate independently.
Negative/unknown possession and the uniquely acquired target under opposite
hidden possession still pass with the flag on. Those successful controls do
not erase the two failures.

Next author change: extract intent alone while retaining the existing unique
acquisition and held-mode contracts. Reuse these opposing controls. Do not
remove their assertions to make the broad OR gate pass. No native outcome
claim or default promotion is earned by this review.

## 2. Runner-passed lockout: administrative exit is not a shed

The [ending](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/src/sim/engagement.ts#L710-L730)
checks observed runner depth and age (`past >2.5`, rep age `>0.4s`), then
unconditionally calls `disengage()`. It runs **before** separation and run-shed
execution. `disengage()` removes joints and clears engagement ownership; this
path need not show lost leverage, load separation or a successful work-off.
By contrast, existing `beat()` is the explicit won-rep path, including a shed
event/tag and, for a run rep, a strike. Do not relabel one as the other.

The new test is already a decisive opposing geometry control: the fixture
leaves C at `(40, CENTER_Y)`, facing `0`, and DT_W at
`(40.82, CENTER_Y+0.2)`. Only the runner moves. On administrative termination,
the same untouched pair can immediately acquire again with the flag off;
the flag-on map entry prevents it. No physical step or mechanical failure earned a
refit delay. `createEngagement()` rejects from the pair map **before** checking
reach; the prohibition applies until `t+0.6` even if contact remains useful and
reachable. At exact expiry the existing `>t` comparison ceases blocking it,
subject to all ordinary checks. This timing was source-inspected, not newly
simulated.

Body collision remains in World. That does not substitute for reachable hand
contact or justify forbidding a legal blocking attempt. The runner's progress
is not evidence that the blocker's hands became unavailable.

The [saved counts](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3/part3.txt#L370-L409)
support a lifecycle investigation: 644 DL runner-passed endings; 492 same-
blocker/in-front repeats and two same-blocker/side repeats. With the flag,
same-blocker categories disappear but **seven other-blocker runner-passed
repeats remain**. The headline “instant re-latches fall to 0” is too broad.
The operator identifies rep objects and classifies the blocker relative to the
defender's facing; it does not measure continuous hand load, an actual shed or
the blocker's hand availability. Endings are timestamped during the tick, while
new reps are sampled after it (`<2.1*dt` timestamp filter); this is not exact
within-step hand-contact timing. These are reported aggregate receipts, not independently
replayed native traces. Both hunks change under the same flag, so the 70%→37%
engaged result cannot identify the intent-only effect. Alone-on-develop adverse
40+ (3.75%→4.25%) and TVD (0.161→0.166) remain visible; neither outcome decides
contact validity or establishes statistical significance.

**One missing observation:** publish one already-saved native runner-passed
end→same-blocker re-grab window with both bodies' requests, hand load, facing
and reach at the transition. That can distinguish discarded useful contact
from an actually invalid reacquisition. It would not by itself calibrate a
universal 0.6s delay. No new cohort or physics work is requested.

## Focused evidence and cost

Only the unresolved information/timing question justified new execution.
Tests ran against an immutable source archive of the exact PR head, with the
existing baseline environment normalizer, Node22.23.3/linux/x64, all54 research
profile values resolved, `RUN_CONTACT_COMPONENTS=1`, `SHED_PHYSICAL=1` and
`CF_FLOW` unset. All other experimental flags
remain at their recorded defaults; only the named flag is toggled. The
author's tests additionally stub off/on internally. Source fingerprint
`013858af1c0313799995e10bdfe1d70358744e707ba9bb5844dab81db966f3d8`
and every archived source/test/script/config byte were checked against Git;
no input changed during execution. Existing support test bytes match accepted
develop. This is not a shared-suite or accepted-develop simulation receipt.

| Selection | Flag | Result | Command wall time |
| --- | --- | --- | --- |
| Existing support: contradictory possession, held mode, unknown/negative possession, acquired target under opposite hidden possession | 0 | 5 pass; 12 unselected | 2.436s |
| Same five controls, identical inputs/source | 1 | 3 pass, **2 fail**; 12 unselected | 2.132s |
| Author's SHED_PURSUE file | Internal off/on | 2 pass | 2.170s |

**6.739s** focused launcher time; **7 unique selected tests /12 executions**,
10 passed and two failed. No World advance, native snap, game, broad simulation,
typecheck or shared-suite rerun. Checks are command-level fixture tests only.
Unselected controls are not credited as passes. Failed checks and full focused
logs remain in the compact receipt. Setup used checksum-verified Node and the
unchanged lockfile; the initial install failed because its default npm cache
was unavailable, then passed with a writable local cache (no verification bypass).

To reproduce in a clean checkout of the pinned PR head with Node22.23.3 and
lockfile dependencies:

```sh
npm run baseline:run -- --candidate --flag SHED_PURSUE=0 -- node node_modules/vitest/vitest.mjs run --project core --maxWorkers=1 test/support-work-off.test.ts -t 'contradictory|holds the target mode|uncertain/negative|hidden possession changes'
npm run baseline:run -- --candidate --flag SHED_PURSUE=1 -- node node_modules/vitest/vitest.mjs run --project core --maxWorkers=1 test/support-work-off.test.ts -t 'contradictory|holds the target mode|uncertain/negative|hidden possession changes'
npm run baseline:run -- --candidate --flag SHED_PURSUE=0 -- node node_modules/vitest/vitest.mjs run --project core --maxWorkers=1 test/shed-pursue.test.ts
```

The last file owns its internal off/on stubs. Exact executed archive commands and
resolved values are in the receipt. Production source/tests/settings are
untouched. No changed-law, capacity, default or activation approval is requested.
Integration retains combined verification ownership after a corrected,
independently accepted minimal candidate exists.
