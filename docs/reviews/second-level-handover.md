# Second-level defending: preserve the shallow runner's crease

**Recommend the minimal handover correction for independent review and routine
integration.** A defender who has identified the runner on his assigned side at
the existing declaration surface should not return to the line landmark merely
because that runner straightens up. The portable patch fixes that decision;
the broader moving-fit tracker remains experimental/HOLD.

## Pins and integration boundary

- Accepted develop re-fetched before work and handoff:
  `d682b1f474cb6ba260a7b8b1119a62919c5a2159` (#112), matching the published queue.
  Accepted source `bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`.
- Portable code `32120268d2ba8cef5622b6b0c5aedd9eb6c61b50`, branch
  `codex/second-level-handover`; source
  `837d9f6a6d9cf3436d2bd598a7068f6515bd6d843e86c1d70d4244650f2bd7ec`.
  Only runtime file is src/sim/run-fits.ts, nine added/two replaced lines in
  executeRunFit, plus test/second-level-handover.test.ts. No research ancestor,
  tracker cache, escape/cap, #116, physics or experimental flag dependency.
- Held research `c33249ab072952f26fd240c61b006f8983aabde6` on
  `codex/second-level-defense`, source
  `de6e76ef0d0780a80ede3859c8645fad688f0961741ea1cafd60c20bccc19042`.
  Initial tracker commit492bc8963abb9b6e9f7d1ad962eee94ca375ca69;
  unrestricted handover/failing duty control c2469ca69f4fb50cf71e0453fa3e8865141de8d2.
  These histories and their failures are preserved; do not import them wholesale.
- Node22.23.3, accepted44 flags, RUN_CONTACT_COMPONENTS=1, CF_FLOW unset;
  PULL_PLAN/PULL_CUE remain0. All World defaults/capacities unchanged.
  Catching/Run boundary notices were posted on #100/#112 before implementation,
  then narrowed on #100 comments6227889985,6227976005,6228038713.
  No coverage priority, recognition, blocking, spacing or shared-helper edit.
  Integration owns required verification/adoption; this is an author recommendation.

## Football failure and correction

The old flow rule uses lateral speed above1.5yd/s as its directional cue. That
is useful at a deep mesh. It is incomplete once a positively observed runner is
already threatening the surface: straightening up can drop his lateral speed
below the gate while he still occupies an outside crease. The insertion then
returns to its line landmark instead of closing on him.

The fallback applies only when the consumed picture has carrying=true, is
shallower than the existing LOS-1.6yd declaration boundary, and is on the
insert's assigned side of the known snap spot. It keeps the existing yard of
inside-out leverage from observed position, using the same observed velocity
for the existing short projection. The existing threat check then decides
ordinary pursuit. Fast flow, deep mesh, unknown/negative possession, away-side,
cutback and lag retain their existing contracts. No new deadline, perception
read policy, memory, body maneuver or movement capacity is introduced.
Normal pursuit can now execute earlier, including its ordinary observations,
bias initialization and achievable gather. The patch does not pretend that a
new request instantly removes momentum.

## Achieved movement and controls

Four frozen Ace11/Over/Cover3 cases, roster seeds31/32, play seed3, all22 reacting.
Every recorded case is checked against its uninstrumented replay. All executions
are censored live at2.8s; no full-play result is inferred.

| Case | Before -> portable candidate | Interpretation |
| --- | --- | --- |
| WZ strong | At2.60s LB_M requests X +1.481 -> -2.568yd/s; RB is at acquired X38.719/Y21.155, age.20s, carrying=true | Same recorded history before the changed decision; now closes toward the observed runner instead of returning upfield to the line point |
| WZ strong at2.80s | Actual LB_M-to-RB separation1.631 -> 1.475yd | Achieved closing improves .157yd. Still no carrier contact within the prefix in either arm; not a proven tackle or yardage gain |
| Counter | Exact recorded frame/controller/body/RNG hashes | Misdirection and runner path remain intact |
| PA Flood | Exact recorded hashes | Existing fooled response, return to pass and existing teammate contacts remain intact; no throw occurs within this prefix |
| Power | Changes only free LB_S at2.70s; RB, RT/Mike and Y/LB_S block histories retained | A late declared runner changes a free defender's request; it does not erase a block or instantly reverse his body |

The runner's entire recorded path is identical in **all four** portable cases.
Power's actual RT/Mike and Y/LB_S root-hand force samples are exact, not just
engagement labels. RT/Mike has17 samples,9 positive-normal samples, maximum
1181.155kg*yd/s². WZ Y/LB_S still acquires at2.40s and retains all9 identical
root-hand samples, maximum457.893. The operator does not record joint actor or
helper ownership, so these are not claims about an offensive-owned grip or
labeled shedding. No new positive teammate impacts occur: Counter keeps its
two offensive contact samples; WZ its one; PA its four defensive samples;
Power has none. Contact samples are not independent collision episodes.

Mirrored same-state controls use an explicitly supplied acquired picture and
then the actual World: the new approach closes distance over.20s, stays up and
keeps negligible work residual without editing the real actor. The accepted
runtime fails both positive cases as expected and passes all seven opposing
controls. Deep mesh, negative/unknown carrying, away-side, cutback, lag and
hidden current handoff/body changes are covered. These interpreted fixtures
prove the decision/physical mechanism; native tapes establish natural acquisition.

## Held research and remaining limits

The initial moving-fit investigation demonstrates another real mechanism: a
stationary-point planner can brake a player who is already co-flowing with a
moving insertion point. Holding point and observed motion on the same decision
beat repairs that matched fixture. It is **not included**: in reacting Counter
it exaggerates initial misdirection, and in PA it adds a LB_M/LB_W bump while
both return to pass coverage. The combined WZ also adds LB_M/LB_S contact after
the2.60s wrap while Y is applying real load to LB_S. Nobody falls in these
prefixes, but a collision is neither automatically avoidable nor a benefit.
The portable extraction avoids those incremental contacts and keeps the original
earned blocks. Do not treat104 passing research checks as portable evidence.

The unrestricted shallow-handover draft failed the existing back-man away-side
duty assertion. It was not waived or changed. The assigned-side guard repairs
that boundary, with an additional explicit opposing control. Initial research
typecheck also failed because the test did not narrow the movement-objective
union; the corrected type guard retains the behavioral assertions. All failures,
expected reds and paid native runs remain in the receipts.

Inherited limitations remain: the stationary-point insertion planner, near-fit
geometry, short-horizon pursuit, and linePicture's departure classifier (which
still inspects an opponent's private engagement state). This patch adds no
such read and does not certify that entire legacy information interface. A
line-classifier repair needs shared-owner agreement; do not activate old cue or
planner flags to hide it. The next football question is whether short achievable
insertion tracking can reduce unnecessary braking **without** the demonstrated
misdirection/PA traffic costs. Keep it parked until a bounded mechanism resolves
those costs; do not add another avoidance option here.

## Validation, runtime and reproduction

Portable: **62 focused tests and typecheck pass**. Nine new tests plus the
unchanged38 back-man and15 coverage-support contracts, including the original
away-side assertion. No integration/full suite, evaluation game, NFL scan or
NFL calibration. [NFL audit qualifications](https://github.com/tannerthardy/football-simulation-/blob/f8dbdcb03ee2c79c6ae10251103560c04710dada/docs/reviews/open-field-nfl-claims-review.md)
remain applicable; no NFL-like claim is made.

**72.739 command seconds total:**54.329 research (including failed contracts,
typecheck and broader native trials),18.409 portable (including expected red,
62checks, typecheck and four neutral-replay pairs). Some independent commands
overlap; this is summed command elapsed time, not end-to-end latency or CPU time.
All native spend totals40 short executions, counting each neutral replay;
the final comparison uses four matched situations,16 executions including both
arms' neutral checks. No additional roster/call sweep was launched.

[Bounded metrics, exact inputs, raw/operator hashes and held adverse cases](../../data/reviews/current/second-level-handover/summary.json)
and [all19 research/portable receipts](../../data/reviews/current/second-level-handover-receipts.json).
Detailed raw tapes remain in ignored out/. Reproduce the same four prefixes on
the accepted pin and candidate using the committed input-manifest.json:

```sh
FLOW_INPUTS=data/reviews/current/second-level-handover/input-manifest.json FLOW_STOP=2.8 \
  npm run baseline:run -- --candidate --receipt out/second-level/native-receipt.json -- \
  node --import tsx scripts/diag/defense/flow-panel.ts out/second-level/native.json
```

Use .nvmrc Node22.23.3; the launcher resolves the same44 settings. The saved
summary operator launches no simulations. After independent football/information
review, Integration can extract just the runtime/test pair and verify its exact
combined candidate under the standing workflow. The broader tracker and #116
remain separately held.
