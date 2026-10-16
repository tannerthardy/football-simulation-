# Independent review of Claude's zone results

2026-10-16, Run. **HOLD RUN_LANE and CLIMB_EXIT from production activation or
runtime promotion at this revision.** The diagnosis and positive results are
useful, but the runner has a demonstrated false-protection decision and the
departure has an unreviewed cadence change plus a material protection loss.
Keep ZONE_COMBO/CLIMB_SPACE/COMBO_SECURE parked. This review implements no fix.

Reviewed author pin **50f6a080eacb8bf5d12fec8c9af53550ee8b4a96**, engine source
`6753fa98966622ab758e4c4c56104dedf00b111c1429d7be66c5fad62531cd21`, branch
`claude/zone-run-breakthrough`. It directly descends from accepted
**c3264b0bad72bd2c208602e0ecf0461c00d9669f** / source
`4658b9ce14e2ce73ae7784635dcface1e115ebdf9eba2ca1c70c2bec1ca89d8b`.
Fetched canonical queue625f3b4f545cf0c7f414b672e3776f916928f158 agrees.
Accepted #102/#104 are included; the earlier #101/80-case source is historical.
Claude's [report](https://github.com/tannerthardy/football-simulation-/blob/50f6a080eacb8bf5d12fec8c9af53550ee8b4a96/docs/reviews/zone-run-breakthrough.md)
is not replaced or rewritten. #101's separate collector hold remains unchanged.

## What was independently checked

- Reproduced the five authored focused tests and typecheck: pass.
- Ran three preselected full22-player cases under four arms in order: all
  experimental flags off, RUN_LANE alone, CLIMB_EXIT alone, both. All other
  experimental flags stay off. The cases are Ace12 WZ Over3 pair11/seed77 in
  both directions, plus the existing useful-climb opposing fixture. This is
  12 bounded native continuations:8 endings and4 explicit3.5s prefix censors.
- Used a reduced mirrored decision witness through both `runReadAim` and the
  actual `BallCarrier.update`; no World, player capability or private state
  substitution is needed for its defect. A separate reduced departure witness
  checks the existing read boundary. These are controller witnesses, not native
  transfer or football-outcome estimates.
- Preserved all receipts, all22 native body frames, actual hand loads, contact
  events, positive teammate impulses, source hashes and repro scripts. No broad
  census, oracle sweep, game campaign, test waiver or production edit.

Node22.23.3, ordinary World defaults/capacities. Candidate declares49 flags;
new flags default0. Native arms explicitly use CF_FLOW unset (`--flag
CF_FLOW=none`), retaining the accepted setting instead of importing the
candidate profile's unrelated string `"None"`. That string currently resolves
to no counterfactual flow in source, but the configuration change is unnecessary
and should be excluded. Max native work residual1.20e-11, arm impulse excess
2.85e-14: no observed numerical/accounting blocker in these cases.

## RUN_LANE: useful result, demonstrated controller blocker

The idea is sound: defenders occupy openings, and protection should depend on
the block/runner relationship. This native sample supports a real effect:

| WZ Ace Over3 | All off | RUN_LANE | CLIMB_EXIT | Both |
| --- | ---: | ---: | ---: | ---: |
| Strong, terminal gain |−0.67 |+0.18 |−0.67 |+0.18 |
| Weak, terminal gain |−0.03 |+5.90 |−0.02 |+4.50 |

With RUN_LANE alone the first body difference is RB at1.65s strong /1.60s weak,
before their first contacts. The weak entry's first-contact location moves
from−.48 to+.30yd and its event changes from grasp to body collision; the
subsequent ending need not share execution draws. Do not credit every yard
of the5.93yd ending difference to a better lane decision. The strong edge
defender still wins. This is encouraging focused evidence, not confirmation
of Claude's entire reported3,000-play combined/transfer improvement.

**Blocking witness:** `creaseAim` infers `heldBy` from proximity, then grants up
to1.3s of protection delay. The walled-side condition treats small lateral
offset as a wall in either direction, without requiring useful interposition.
Its route check excludes a body exactly at an entry endpoint.

Use LOS40, runner at(38.40,28.67), upright stationary DT at the entry
(40.50,28.67). An upright high-stance receiver is(41.12818,28.67), moving
upfield at5yd/s: **beyond the defender, not between defender and runner**,
with.10yd positive torso clearance and no engagement. Public perceived
positions/motion suffice. The mirrored witness has identical results.

| New reader's consumed picture | Risk of that same occupied entry | Production carrier request |
| --- | ---: | --- |
| Receiver far away |8.5573 |Chooses another route |
| Receiver passing beyond DT |0 |9.4214yd/s directly toward DT's center |

The same positive-clearance receiver is apparently a1.3s wall. The DT already
occupies the endpoint regardless of whether a tackle with his hands is possible.
This is a demonstrated false-protection choice, not an unfavorable football
ending, a physics-law dispute, or a requirement to preserve an old RB cut.
The author information test passing is valuable: legitimate information can
still be interpreted incorrectly. Correct this inference/occupied-route
contract, retain a valid protected-side control, then replay the focused cases.

## CLIMB_EXIT: earlier contact is not protection through arrival

The authored new departure test checks requested speed and forward direction.
It does not establish achieved collection or keeper/runner protection.
The useful-climb fixture exposes why that distinction matters:

| Useful climb control, LOS35 | First RT–Mike load | Last RT–Mike load through cutoff | Runner first contact |
| --- | ---: | ---: | --- |
| All off |1.85 |3.50 |3.45, SS, +5.06yd |
| RUN_LANE only |1.85 |3.50 |None through3.50 |
| CLIMB_EXIT only |1.55 |2.25 |2.80, Mike, +.78yd |
| Both |1.55 |2.25 |2.90, DE_S, −.10yd |

These are contact-event locations, not terminal gains; all four continuations
are explicitly censored at3.5s. Y's end block retains real load through3.5
in all four. The exit arm's earliest body difference is RT at.90s, before its
changed Mike contact at1.55. Thus changed approach precedes the new contact
execution; the later loss can include changed execution draws. The old ending
is not a required result, and this pass does not call the defensive recovery
unlawful. It is a material adverse result requiring attribution, rather than
simply waiving the planned-climb test as an obsolete geometry expectation.
One LT/RB positive impact also appears in exit-only weak WZ at3.45, after its
first defensive contact; it is not identified as that play's original cause.

**Cadence/continuity witness:** `startDeparture` installs a next read at1.19417
when started at1.00. `ripOff` ignores that held picture, reads all three actors
every tick and chooses a new tangent side. A backer moving4yd/s gains.20yd
laterally by1.05; the exact same climber body then changes requested velocity
from(2.443,5.133) to(5.648,.642), before the existing next-read boundary. The
unchanged-picture control retains its original command. These are reduced
decision states, not an executed trajectory or a proof that all continuous
steering is wrong. Selecting a new departure side off-beat is an additional
controller-policy change that needs an explicit contract and opposing control.

Before promotion, preserve a coherent acquired departure/feedback policy and
test actual path clearance around the keeper as well as the old DL. The code
checks whether the keeper obstructs the direct ray, but otherwise computes its
tangent from the DL alone. This latter concern is a source risk, **not a third
demonstrated native failure**. Use a genuinely obstructed control and its mirror,
then classify the saved useful-climb adverse outcome; do not tune to regain its
old gain or add force/release changes.

## How much of the large result is validated?

Claude's aggregate improvement remains **author-reported**, not independently
recomputed here. The branch publishes code/report but no case-result archives,
immutable input manifests or per-arm runtime receipts for those large tables.
The lab reads live playbook/generated inputs and inherited flags; its summary
does not exclude `terminal:false` rows and removes exception rows from statistics.
Its first-load tally omits helper hands, while engagement-at-contact uses
nominal engagement pointers sampled at10Hz. Those limitations may bias category
counts; they do not prove the reported medians are false. Oracle outcomes are
diagnostic alternatives, not proof that a player could select them with his
information. NFL-scale comparisons do not establish causal correctness.

Ask Claude to publish the existing detailed outputs, exact tested revisions,
resolved flags/World settings and complete error/censor counts. **Reuse those
outputs; do not run another several-thousand-play panel just to produce receipts.**
The focused positive result and mirrored controller blocker already determine
the immediate next decision.

## Integration disposition and smallest next checks

- **No runtime/default-on approval at50f6a08.** Research remains useful and
  fetchable; the runner defect blocks dependent promotion. The exit has a
  separate read-policy/protection question. No merge or flag activation here.
- Claude owns the minimal runner correction, mirrored passing-receiver versus
  genuinely retained protection control, and the departure response. Then
  replay these three native controls with each candidate alone before combining.
- Separate the two proposed runtime patches from three parked experiments,
  diagnostic tally and unrelated CF_FLOW profile drift. Shared movement/spacing
  and physics stay with their owners. No new strength, release-timer or solver work.
- Diagnose the adverse collection using saved traces; use one matched-execution
  comparison only if changed draws remain decisive after approach review.
- Integration owns exact combined verification after independent review; no
  full-suite or broad survey was duplicated. Broad transfer remains a later
  checkpoint after the demonstrated blocker is cleared.

Total recorded command cost **17.938s**: authored focused tests2.096s,
typecheck10.002s, four3-case native launchers5.239s, and initial/final reduced
decision probes.600s. Native loops themselves4.024s.12 continuations,8 endings,
4 bounded prefixes,0 games. The review stops dependent trials on the concrete
blocker. No film/viewer was generated.

[Evidence/hash index](../../data/reviews/current/claude-zone-independent-review/evidence.json)
links the exact settings, all native tapes and scalar witnesses. Repro scripts
are stored as review artifacts outside the build/test roots. In a dedicated
checkout of the author pin, copy `repro/native.ts` to
`scripts/diag/claude-zone-review.ts` and `repro/decisions.ts` to
`scripts/diag/claude-zone-decision-probes.ts`; use Node22.23.3 and the exact
commands in the launcher receipts. The report PR contains no candidate engine
or baseline changes and is not a request to merge the experimental branch.
