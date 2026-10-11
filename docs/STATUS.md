# Current status

Updated 2026-10-11. This is the current handoff; older reviews are historical.
Work on `claude/engine-priorities`. Main and PR #1 are outside this work.

## What is live

The reduced shared World handles body movement, collisions, bounded ground
traction, shared hand/grip force and work, posture, balance and achieved
recovery. Bodies use a planar model with height/posture approximations; the
ball moves in three dimensions. There is no skeletal limb simulation.
Football controllers request actions; actual movement and contact execute in
that World. Coverage, run blocking, perception and game calling already have
substantial implementations, with incomplete technique and information rules.

Accounting, mirror, force/travel and controlled interaction tests provide a
useful foundation. They do not prove NFL force magnitudes, universal numerical
convergence or good football decisions. Physical-profile mappings and contact
capacities still have limited empirical evidence. Some controllers still use
private state; light films cannot establish what a player actually perceived.

The cleanup preserved the engine at `663193d`. The subsequent run-coaching
increment changes three controller mechanisms below. Every `src/physics` file
and all shared force/movement capacities remain unchanged. All 1,140 TypeScript
tests and 121 Python tests pass; typecheck and build are clean.

## Latest run-game work

The [current receipt](../data/reviews/current/run-coaching.json) connects the
owner's selected clips and supplied twelve-play review to exact native traces,
coaching sources, matched controller experiments and ordinary controls.

- **Kick/trap pullers read moving targets after clearance**, retain their
  delayed picture on normal decision cadence, and progress against the observed
  landmark. Five native comparisons include two earlier random-review controls.
  Wrappers keep their separate work. Better reads still permit lost blocks.
- **Force/edge fits gather before contact**, using the existing pursuit law
  and the acquired runner picture while retaining the installed shoulder.
  G6-P181 establishes a natural wrap; three ordinary native controls are exactly
  unchanged. The first unsuccessful candidate was withheld. Existing chase
  requests and achieved movement match exactly across 108 controlled calls.
- **Fast lead blockers remain blocking cues.** The old 3 yd/s veto sent a
  run-reading linebacker back into coverage in G2-P136. Low pads or apparent
  blocking geometry now survive acceleration; pass interpretation and upright
  releases still matter.

These are selected policy replacements on the unchanged original Game prefix
and constructor, **not paired complete candidate games or frequency estimates**.
The full suite includes current-engine games, but supplies no new NFL realism
or scoring claim. Physics passed its existing contracts; it is not certified done.

**Next blocking priority: keeper-specific combo security and an attainable climb
exit.** In G1-P059/G4-P023, release checks grade the departing primary, while
promotion would carry his hand-control state onto the keeper. Actual helper load
does not establish inside hands, and both climb routes contain obstacles. A
gate-only patch was withheld. Then test a DL response to a second blocker using
the same capacities. The [tracking pilot](../data/reviews/current/run-displacement.json)
finds a larger late displacement tail near OL, but the native defender already
opposes load near his traction limit and recovers balance. No stronger anchor or
travel cap is justified. Proximity is not proof of a double-team force.

Also diagnosed, unmodified: backfield man alignment can bunch linebackers;
disguised alignment can exclude an installed flat player from force allocation;
Draw's pass influence can postpone its covered owner's rusher read. Fix their
installed responsibility and acquired cue rules before changing physical ability.

## Random film review: choose the next investigation

The [review records](../data/reviews/current/random-play-review.json) preserve
48 uniformly selected snaps from 1,015 eligible saved plays across eight games,
seed `20261011`: 12 runs and 36 passes. Two engineering agents reviewed paths,
calls and events; this was not an independent expert coaching panel. Selection
preceded reviewing outcomes. Reviewers were not strictly blinded to results.

These are **concerns requiring traces, not confirmed bug rates**. Several
categories overlap. The order weighs repetition, potential consequence and
confidence. The sample is too small to rank rare failures reliably.

| Priority | Observed concern | Count | What to inspect |
| --- | --- | --- | --- |
| 1 | Little late QB adjustment as a defender approaches | 11/36 passes | Acquired pressure, blocker control, throw commitment and available escape movement. One reaction window is especially short. |
| 2 | Runner meets the edge before the puller's response is established | 2/12 runs | Puller path, edge squeeze, actual hand load and runner timing together. |
| 3 | Early edge contact/fall during release or protection | 2/36 passes | Job, requested path, impulse and recovery; an ordinary lost engagement is plausible. |
| 4 | Missed tackle approaches | 2/48 plays | Achievable contact and support; a miss alone is not a physics defect. |
| 5 | Deep-half defender narrows away from an outside vertical | 1/36 passes | Installed responsibility, acquired threat and help; Cover 2 inherently leaves some sideline space. |

Thirty-two plays had no clear wrong mechanism under the positional rubric;
16 need richer traces. No general physics fault was established. In G2-P136
the safety **does brake** before missing. G7-P109 retreats and G3-P068 throws
away; neither supports a blanket claim that QBs always freeze.

The original random review prioritizes **pocket adjustment diagnosis**, using
G1-P057 (2.6–3.2s), G6-P140 (2.3–2.75s) and G2-P037 (2.5–2.8s), plus ordinary
clean-pocket controls.
Trace what was seen, requested and achieved before changing anything.
G1-P060 and G8-P115 now also serve as declared puller controls. Do not
increase strength or traction to make either result look better.

## Keep the project light

`npm test` runs 966 production tests; six slow game/ensemble tests are
in `test:integration`, and 168 paused anatomical/sole tests in
`test:research`. `test:all` retains them all. The 12 unused research modules stay
as reproducible references; removing them would break research collectors
without speeding production. Active support/contact tests remain in the default.

Large generated films and evidence are recoverable at immutable commit
`663193d`, with hashes and a [retrieval guide](../data/README.md). New output goes
to ignored `out/`. Git history was preserved, so its old storage has not shrunk.
Exact sizes and timings are in the [cleanup receipt](../data/reviews/current/cleanup.json).

Read [validation](VALIDATION.md) for the five layers, existing commands,
matched controls, the two-attempt stopping rule and the future untouched exam.
The biggest gaps are measured contact capacities, comparable movement coverage,
decision/load visibility and wider random coaching review. The physics is a
usable foundation, not certified finished.
