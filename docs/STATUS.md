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

The cleanup preserved the engine at `663193d`. Subsequent run work improves
controllers and how acquired hands use the existing contact law. All 24
`src/physics` files and the physical-profile mapping remain unchanged. Complete
check results and source pins are in the current receipt below.

## Latest run-game work

The [combination receipt](../data/reviews/current/run-combination-security.json)
records the latest run-game increment:

- **Each run helper earns his own hands**, using the existing hand-fight law
  and shared arm budgets. Reaching is distinct from acquired contact; positive
  load does not mean inside hands or a useful blocking side.
- **Release grades the remaining blocker.** Promotion retains his actual hand
  joint and control, including a contested near-neutral contact. It cannot
  borrow the departing blocker's hand position, cloth grab or landed move.
- **The climber reads an available first step**, around the observed DL and
  partner where necessary, then re-reads on his normal cadence. This grants
  neither instantaneous movement nor a completed linebacker block.
- **Wrong-side helpers still replace their feet.** A genuine but badly directed
  hand load no longer cancels recovery. Useful loaded contact still overrides
  an old visual picture. The existing physical recovery tests remain strict.

Eight predeclared ordinary Inside Zone inputs use identical recorded starting
projections and profiles across baseline/current engines. Actual climber/backer
contacts rise from 3 to 5; two persistent Under-front doubles release instead
of continuing their long drive. Six further native cases and sixteen ordinary
process controls retain adverse cases and verify observation does not change
execution or RNG. These are controlled football situations, **not frequency
estimates or paired full games**. Some climbs still miss. A moving DL can close
a previously available exit; the short arc does not solve every traffic problem.

The earlier [run-coaching receipt](../data/reviews/current/run-coaching.json)
preserves the puller-read, force-gather and fast-lead-cue repairs. Its selected
original-game policy comparisons remain historical evidence. The new paired
film is ignored output at `out/run-solidify/film/inside-zone-combo-review.html`.

**Next run priority: install force responsibility from the coverage job before
grading presentation and leverage.** Current-location filters can exclude the
intended curl-flat player and promote a deep safety. This also occurs without
disguise. Test matched aligned/presented calls, both sides, ordinary and adverse
fits before altering pursuit ability. Then inspect climbers that actually miss
their backer and the DL's acquired response to a second blocker. The
[tracking pilot](../data/reviews/current/run-displacement.json) motivates those
mechanism checks; it does not justify stronger anchors or a travel cap.

Also diagnosed, unmodified: backfield man alignment can bunch linebackers;
Draw's pass influence can postpone its covered owner's rusher read. Correct
responsibilities and acquired cues before changing physical ability.

The newly integrated [NFL mechanism comparisons](NFL_DATA.md) also flag
different tackling patterns on runs and after catches. Trace the shared
gathering approach: a frontal cue can brake early, while a crossing approach
can retain too much relative sideways speed. Compare acquired pictures,
requested velocity and achieved support/contact in the same controlled setup.
Nearest-defender speed is a tracking proxy, so it does not identify the actual
tackler or prove a grip-strength problem. Outside-zone lateral technique is
being investigated separately; do not retune movement capacities to mask it.
The new eight-game check assesses all twelve guarded metrics, with none
flagged off. Scoring still averages 78 points per team-game. Combo improvement
does not establish realistic whole games; the contact and coverage problems
remain substantial.

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

`npm test` runs the production tests; six slow game/ensemble tests are
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
