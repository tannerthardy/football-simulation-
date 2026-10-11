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

No engine behavior changed in this reset. All 84 `src` files are byte-identical
to `663193d`; a fixed Inside Zone and Smash also retain exact events and results.
All 1,108 TypeScript assertions, 121 Python tests, typecheck and build pass.

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

**Start with pocket adjustment diagnosis**, using G1-P057 (2.6–3.2s), G6-P140
(2.3–2.75s) and G2-P037 (2.5–2.8s), plus ordinary clean-pocket controls.
Trace what was seen, requested and achieved before changing anything. Then
expand random run review around G1-P060 and G8-P115's puller timing. Do not
increase strength or traction to make either result look better.

## Keep the project light

`npm test` runs 934 production contracts; six slow game/ensemble assertions are
in `test:integration`, and 168 paused anatomical/sole assertions in
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
