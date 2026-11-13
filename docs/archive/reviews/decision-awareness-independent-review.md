# Independent review of the bounded decision-awareness candidate

Review scope: carrier decision cadence, quarterback acquired memory and coverage
classification, engaged defensive run fits, and man defenders' recognition keys.
This is a source and mechanism review, not an NFL eye-tracking study or proof of
improved league outcomes. Native panel acceptance belongs to the parent report.

Initial reviewed engine content hash:
`8863cafc764390fb31f0675fb8eaf7756da8a53019dd0281a11d9482c26703f1`.
Independent targeted verification on Node 22: all 31 tests passed in
`defensive-awareness-contact`, `carrier-decision-cadence`, and
`qb-memory-awareness`, with the engine hash unchanged across verification.

Final re-reviewed engine content hash:
`178751b67048eeaa91741090a4a19e43c108add8c5f1c5e0a586c09d57b3402c`.
The final-status section below supersedes the initial withholding decision.

## What the candidate gets right

- The quarterback's coverage signature reads acquired memory, not
  `estimate()`. The latter deliberately drifts toward the quarterback's
  coverage expectation when memories age; feeding that drift into coverage
  recognition would confirm the expectation with its own invented positions.
  The candidate avoids that circular evidence path.
- Cone membership and acquisition consume the same delayed position. A hidden
  current body entering or leaving the cone cannot reveal or hide its stale
  image. A real reacquisition can still change the picture.
- The carrier uses the existing player-specific processing interval rather
  than a universal 0.10-second tactical scan. Stress and focus can lengthen
  commitment without raising or lowering physical capacities. Squeeze,
  contact response, and boundary braking remain motor actions each tick.
- Engaged defenders preserve an installed gap or box/spill shoulder. A delayed
  declared runner can cause a new decision; the true run call no longer grants
  a correctly read run through `!sim.isPass` in lateral work. The mirrored
  shoulder controls match the existing free-fit conventions.
- Unknown contact presentation supplies no run/pass category from the
  engagement label. A corner or safety playing man keys his assigned receiver
  rather than silently replacing that receiver with a closer conflicting
  release. The existing delayed interpretation, hysteresis, and per-player
  variation remain in use.
- No new random outcome roll, strength multiplier, shared physics law, or
  guaranteed football result is introduced by these controller changes.

## Remaining approximations

### Classification can reinforce an old picture

This specific no-new-acquisition failure was found in the initial candidate
and corrected in the final candidate; mixed fresh/held coverage evidence
remains an approximation.

In the initial candidate, the two post-snap processing milestones could update belief from the same
unrefreshed pre-snap memories. The target signatures still vary with elapsed
time, and the classifier does not currently distinguish fresh rotation
evidence from stale zero-motion memory.

A held-body controller probe deliberately looked backward, acquiring no new
defenders. Its raw features stayed `[1.2717087655, 0.9704224868, 0]`, while
Cover 3 belief rose from `0.83743598` before processing to `0.89735611` and
`0.91261209` at the two milestones. This is not a live-position oracle, and it
is not expectation-drift circularity. It exposed a confidence and
missing-evidence approximation. The probe is not a native football trajectory.

The final candidate withholds classification, confidence and identification
changes when no new memory has been acquired. Actual reacquisition permits a
retry. It still mixes fresh and held components in aggregate signatures;
reports must not imply every component of a confirming rotation was freshly
seen. Improve that boundary with component freshness if a native witness
implicates it; a larger cognitive architecture is not required by this probe.

### Public possession identity remains a shortcut

Engaged defenders still obtain the current holder's identity from
`sim.carrier`. The candidate limits the consumed position and maintains an
installed fit, but does not solve visibility of the exchange through congested
bodies. Several free defensive behaviors also use possession identity. Do not
claim a complete model of occlusion, ball discovery, or deception.

### A read call is not necessarily an acquired conscious key

`QBMind.observe()` requests delayed images for every defender in order to
decide cone membership. Only qualifying images update acquired memory, but
generic `sim.see()` traces still contain those requests. Counts of those
requests cannot measure attention or simultaneous conscious acquisition.
Use the memory updates or the returned throw estimates to explain the
quarterback's held picture.

The man-key change applies when the recognition group's receiver weight is
positive, presently cornerbacks and safeties. It does not yet give a
linebacker in man coverage a receiver key: that group's receiver weight is
zero. Zone players retain the existing local-key selection policy.

### This is a controller increment, not complete situational intelligence

The candidate retains existing designed-run press timing, quarterback
processing milestones, public opponent capabilities, and other true-state
availability or assignment shortcuts outside its edited paths. It also does
not provide all defenders with a bounded guard-to-back-to-route attention
progression. Those are specific remaining debts, not reasons to discard the
bounded fixes.

## Acceptance recommendation

Accept these mechanisms if retained normal and adverse native controls remain
finite and reviewable, observation wrappers preserve execution, and the
parent report states any regressions rather than averaging them away. These
changes demonstrably remove selected hidden information and connect actual
decisions to existing cognitive limits. They do not establish that all
decision making is realistic, that NFL passing rates are calibrated, or that
every affected play improves.

The most useful next awareness step is a small, observable key-acquisition
progression for one defensive role, or missing-evidence handling for the
quarterback classifier if the native witness identifies it. The shared
movement/contact physics can remain unchanged while those football
controllers are tested.

## Native review of the initial combined candidate

The following results describe exploratory source `8863cafc…`, before the
close-runner shed correction and mirrored laboratory setup correction. They
must not be relabeled as verification of a later candidate.

All 162 ordinary-plus-supplemental run inputs passed their observational
execution controls. In the 160 ordinary fixed inputs, mean gain increased
from `1.315375` to `2.678` yards and stuffs decreased from `51` to `27`.
However, 47 paired gains decreased, Counter mean fell from `0.7525` to
`0.411`, and two pairs gained a fumble event, including one new recorded
turnover. Whole-panel OL falls decreased from 12 to 6, while six individual
pairs gained an OL fall; those are different denominators. Holding flags
increased from 23 to 33, and broken-tackle events from 7 to 22. These are
fixed diagnostic calls, not a naturally selected NFL run mix.

The 96-input pass guard retained 79 attempts, 54 completions, one sack, ten
interceptions, and no timeout; twenty-yard gains decreased from 14 to 13.
Mean offensive gain changed from `10.283229` to `10.388021` yards. The QB-only
phase had identical execution and outcome for every paired input, despite
changed coverage beliefs. Thus this panel supports removal of hidden
classification information without claiming improved throwing decisions.

The two-game guard reported by the parent is more concerning: mean points
per team increased from 35.5 to 46.5 and rushing average from 3.83 to 7.04.
Game calls diverge after different results, so those are matched game seeds,
not paired equivalent plays. Nevertheless, the magnitude justifies isolating
the controller changes before publishing the combined candidate.

### Limited inspection of fixed run films

I inspected the recorded states and commands of three fixed clips, rather
than estimating any league rate from film:

- `CT-R1-power-under-R-S3`, gain `-0.28 → 6.48`: the first changed sampled
  telemetry at 0.50 seconds is the tight end and engaged strong end. The end
  retains its installed low-y box shoulder rather than working toward the
  deep QB. Joint push/hold/steer requests match at that sample, but requested
  movement differs and achieved movement follows. This is a football
  objective change, not a changed force law. Keeping an outside shoulder
  during the mesh is plausible; the entire gain is not proved to come from
  that single change.
- `CT-R1-duo-odd-L-S11`, adverse gain `4.72 → 1.77`: at 0.40 seconds the nose
  still reads `unsure`. Its lateral request changes from `+1.04` to `+0.31`
  yards/second instead of receiving full run work from the hidden offensive
  call. Its sampled achieved lateral velocity changes from `+0.73` to
  `+0.24`. This is consistent with the intended information boundary. The
  later combo release and tackle change; the inspection does not prove that
  every later deterioration is desirable.
- `CT-R1-split_zone-tite-R-S3`, adverse gain `-0.02 → -0.18`: the first changed
  sampled nose command is also an unsure contact read, with unchanged
  installed lag job. The OL trace first differs at the 0.35-second physics
  step despite equal pre-step OL state and equal center intent. Contact
  response, rather than an instantly rewritten OL assignment, introduces
  the first recorded center trajectory difference.

### A substantive instruction defect found

The initial contact helper made every shed threat require a runner image
beyond `LOS - 1.6`, borrowing the free-fit declaration floor. That floor can
be reasonable for an unengaged player deciding to leave a gap, but it
incorrectly prohibits an already-engaged defender from attempting to shed
toward a visibly close, recognised non-QB runner deeper in the backfield.
Preserving the fit shoulder and deciding whether an immediate shed is
available are different decisions.

There is a supporting native witness in
`CT-R1-iz_strong-over-L-S3`. The strong end is still engaged on the tight end
and reads run. At 2.1 seconds its consumed RB image is
`[37.13, 27.91]`, roughly 3.5 yards from the defender; at 2.3 seconds the
image is `[37.89, 28.17]` and closer. The initial helper still supplies no
shed threat solely because the observed runner is below x=38.4. This is a
specific controller defect, not evidence that strength or traction needs
tuning. The parent accepted it for correction and will repeat native guards
on the resulting source. **Withhold promotion of the initial combined
candidate until that correction and isolation checks are complete.**

### Laboratory mirror correction

The scenario-pack squeeze symmetry failure was a fixture inconsistency:
`src/lab/scenarios.ts` mirrored placed bodies but kept `offCall.flip=false`,
so derived run-fit shoulders did not mirror. Contact now consumes those
installed jobs. The minimal correction constructs the laboratory call with
`flip = side < 0` for both run and pass setups. All four scenario-pack tests
pass, retaining every original physical and mirror assertion. This changes
laboratory input construction, not a production physics law. The whole-src
hash changes and later evidence must identify that new source.

## Final bounded promotion recommendation

The final `178751b…` candidate separates immediate shed availability from
the free-fit declaration floor. A personally recognised, close observed
non-QB carrier can now cause a shed attempt deeper in the backfield, while a
standing deep QB remains a mesh key. It also records which QB memories have
already contributed to classification, so a processing milestone alone
cannot classify an entirely unchanged held picture. The laboratory mirror
correction remains in place. These are coherent repairs to specific
information and instruction paths; they do not establish accurate league
outcomes.

The final ordinary run panel has mean gain `3.3436875`, 26 stuffs, six gains
of ten yards or more, and three of twenty yards or more in 160 inputs. All
162 ordinary-plus-supplemental controls finish naturally and preserve
execution under observation. Two newly scored 70-yard Split Zone touchdowns
contribute about 0.861 yards of the 2.028-yard paired mean increase. The
median also rises from 0.81 to 1.77, so the entire change is not a tail
effect. Aggregate OL falls are seven, holding flags 34, and broken-tackle
events 18; improved mean gain must not conceal those remaining adverse
processes. The final 96-pass controls retain the initial combined
candidate's counts and outcomes summarized above.

The parent's final two-game guard is plainly worse as football: 49.25
points per team, 8.46 rushing yards per attempt, and 12.65 YAC, compared with
35.5, 3.83, and 11.01 in the prior source. Initial single-change isolation
games also move differently: QB-only 43 points/5.34 rushing average,
carrier-only 31/5.86, and defense-only 37.5/5.52. These tiny, diverging
playcalling populations neither attribute the final excess to one
interaction nor make it acceptable league calibration. They are retained
regressions and a reason to investigate the long-gain mechanisms next.

### Four additional outcome-selected native witnesses

The independent review reproduced both new 70-yard runs and both new
fumble-event pairs using the exact prior and final source, full replay
recording, and copies of existing state immediately before each World step.
All eight executions match their unrecorded, unobserved control; source
hashes remain stable. This is a deliberately selected witness set, not a
new outcome-rate sample. The source-pinned receipt and traces are retained in
[`witnesses/independent-native-review.json.gz`](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/decision-awareness/witnesses/independent-native-review.json.gz),
with its original reproduction tool in the packet's `tools/` directory.

- `split_zone-over-L-S11`: `-0.05 → 70`. At 0.40 seconds all achieved body
  positions/velocities still match. The unsure strong end's request changes
  from `[-0.749, -1.667]` to `[-1.447, -0.503]`, preserving its installed box
  shoulder with reduced run-specific work. Its blocker intent remains
  identical at that first point. The later runner reaches contact at 3.1
  seconds, breaks the strong safety's wrap, breaks the free safety's wrap,
  then benefits from two corner misses. Those outcomes are produced by
  existing tackle/contact mechanics; they are not a prescribed score.
- `split_zone-odd-R-S11`: `2.32 → 70`. At 0.40 seconds matching bodies and an
  unsure nose have the same first changed command as the preceding case,
  interpreted in the nose's installed A-gap frame. A later free-safety dive
  misses, and a corner's grasp eventually slips. This exposes open-field
  approach and grip-recovery limits after the changed trench interaction.
- `wz_strong-bear-R-S11`: `0.82 → -1.21`, with a new fumble recovered by the
  offense. At 0.40 seconds the unsure nose works toward its known low-y gap
  instead of the hidden called-run carrier location. The fumble happens at
  3.05 seconds amid a wrap and another contact, well after that initial
  instruction. The tight end recovers and is tackled; this is an adverse
  offensive result, not a lost possession inferred from the end spot.
- `trap-tite-L-S11`: `6.58 → 3.99`, with a new lost fumble. At 0.45 seconds
  matching bodies show the unsure end maintaining its installed box
  shoulder rather than following the deep QB. The runner is wrapped at 3.0
  seconds and fumbles during a later contact at 3.65 seconds. Offensive
  players subsequently tackle the defensive returner.

No clearly invalid replacement instruction, changed physical capacity, or
unexplained position jump was found in these four witnesses. That is a
limited inspection, not certification of every changed snap.

There is a particularly useful downstream instruction witness in the first
Split Zone touchdown: the free safety's 3.5-second decision record attempts
a wrap with observed quality `0.00`, followed by a slipped hold. That
approach/opportunity path was not edited by the awareness increment. It
is a concrete next target for checking whether a defender chooses a
physically useful attempt and how he recovers after it, rather than tuning
grip strength until the score disappears.

**Recommendation: promote the final bounded information and fit repairs,
subject to the parent's final suite, while reporting football calibration
and open-field tails as unresolved and materially regressed in the game
guard.** The initial candidate remains withheld evidence. Do not restore
hidden information merely to recover its score distribution, and do not
present the repaired candidate as an NFL-calibrated or complete awareness
model. The next controller work should diagnose approach, wrap choice, and
recovery on these retained adverse trajectories.
