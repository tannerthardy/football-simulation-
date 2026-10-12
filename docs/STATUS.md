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
The new isolated angular-law audit also finds a concrete gap: tangential hand
restraint changes total planar angular momentum without a corresponding spin
or ground reaction. Existing linear momentum/work checks do not catch it.

The cleanup preserved the engine at `663193d`. The promoted run-controller work
left all 24 `src/physics` files and the physical-profile mapping unchanged.
The opt-in contact prototype below extends World without changing its production
default. Complete check results and source pins are in the current receipts.

## What to investigate now

The [pursuit review](reviews/pursuit-coverage.md) records the latest repair:
remove systematic underlead from the acquired intercept, retaining delayed cues,
per-play aiming error and shared physical limits. In 128 paired encounters,
ordinary contacts and faster-runner escapes remain; supplemental free-cut grips
increase 12→14 with adverse cases retained. Across two eight-game roster cohorts,
mean YAC falls 12.3→10.5 yd and points per team-game 55.9→47.5. These are
diagnostic outcomes, not tuning targets. Source/inputs and tradeoffs are in the
[receipt](../data/reviews/current/pursuit-control.json).

The [full engine review](reviews/full-engine-review-2026-10-11.md) preserves
the preceding subsystem assessment and its heavy-jam step-refinement outlier.
Its two game cohorts predate this pursuit repair; use the pursuit receipt for
the latest outcomes. The shared contact-law and ordinary run/pocket priorities
remain relevant.


The seed202 box-count guard fails (median seven→six, mean change −0.04);
the other 11 and all 12 pooled guards pass. Fixed starting states are unchanged;
the calling mix shifted. The threshold is preserved and the failure reported.
A proposed held-facing change produced mixed results and was rejected.

The integrated source `0398418c` passes all 1,238 TypeScript tests, 141 Python
checks, typecheck and build. Both eight-game tracking exports and native
outcomes reproduce the angle-stage results exactly. Controlled endings/cues
retain their behavior with tiny internal floating-point drift; observer checks
pass. The other session's common hand patch remains opt-in.

Next, trace actual failed acquisitions/loaded grips that break and pre-throw
coverage alignment. The supplied in-stride catch branch remains experimental;
outside/wide-zone work belongs to the other session. Early route separation is
already small. Avoid blanket coverage/strength changes. Ordinary gap/pull runs
remain weak; match pocket pressure by release time, QB depth and protection.
The [prior NFL review](reviews/nfl-gap-review.md) pins baseline comparisons and
the random 48-completion audit. Historical catch summaries without actual
recipient sidecars remain legacy. The old one-yard `playBall` stand-off is gone.

## Latest run-game work

The [combination receipt](../data/reviews/current/run-combination-security.json)
records independently earned helper contact, actual keeper hand continuity and
clear first steps off a double. Eight fixed IZ inputs increased actual climber
contacts from 3 to 5 with unchanged physics. Missed climbs remain.

The [support receipt](../data/reviews/current/run-support-install.json) records
force ownership from actual flat/curl-flat jobs, conditional same-side inside
fits, retained dropper run gaps and reserved exchanges. Disguise still changes
physical availability. Both explicit weak-exchange controls still need a called
outside replacement; their fallback promotes the deep safety. Backfield man
alignment can bunch linebackers, and Draw can postpone its covered owner's
rusher read. Correct those responsibilities/cues before changing ability.

The latest [OL review](reviews/ol-interactions.md) and
[receipt](../data/reviews/current/ol-leverage-review.json) distinguish path
leverage, orientation, contact ownership, support and escape access. Solo drives
now reuse bounded foot recovery when their consumed shoulder picture is already
lost. In eight fixed IZ inputs, known-lost acquisitions fall from 7 to 0; two
first-fork blockers recover actual loaded contact and later lose again. Five
others never regain their opponent before the natural end. Square drives,
unseen losses, live doubles and loaded contacts retain their policies.
This is pre-acquisition control, not a loaded-primary or physics rewrite.

The separate `claude/trench-investigation` was reviewed and reapplied narrowly;
see the [trench receipt](../data/reviews/current/trench-controller.json).
First-level interior/edge defenders now acquire blocker flow and preserve a
moving gap-side shoulder. Control/lag attempt bounded recovery toward their
first loaded-contact depth; attack retains forward intent. New runner choices
respect the held decision, and keeper transfers preserve depth. World and OL
lateral technique remain unchanged. The experimental force/traction bonuses
were withheld. Fourteen matched native plays retain mixed results: ordinary
climber contacts fall from 4 to 1, while the supplemental panel rises from 4 to
5. A longer Under run remains an adverse tackle/pursuit witness, not a solved
run game. Trace the missed RG climb and actual grips before another change.

**Next shared-physics priority remains coherent hand/contact angular transfer.** The
isolated oracle fails under tangential restraint with no ground reaction or
body spin; refinement does not fix it. A single effective common patch must
couple point velocity, angular effective mass, force/moments and rotational
work. Football payoff and implementation cost are unmeasured. Do that before
richer shoulder control, independent hands or additional foot detail. This
bounded law repair can proceed alongside football-controller diagnosis.

**Next tackling priority: attainable approaches**, tracing consumed picture,
requested motion, achieved support and actual first grip. Frontal gathering
can brake early; crossing approaches can retain excessive relative speed. Do
not strengthen grips to mask that. Nearest-defender tracking speed is a proxy,
not proof of grip failure. Then inspect missed climbers, loaded primary/DL
refits, the response to a second blocker and contact-clearing run sheds.
The [displacement pilot](../data/reviews/current/run-displacement.json) motivates
these checks; it does not justify stronger anchors or a travel cap.
Outside-zone lateral technique is being investigated separately.

The [zone-flow prototype](reviews/zone-flow-prototype.md) and
[receipt](../data/reviews/current/zone-flow-prototype.json) preserve two rejected
early-footwork attempts and an opt-in common hand patch. `handContact: 'patch'`
couples patch velocity, rotational effective mass, moments and work; its isolated
144-case angular audit passes. Production still uses center hands and retains
the known defect: the candidate fails six native helper/mirror controls, two
historic source-equivalence assertions, and the eight-game YBC mechanism guard.
Trace those first divergences before promotion. No controller, capacity or
assertion was changed to rescue these outcomes.

The pre-pursuit trench cohorts at source `b1164289` are historical. Their
drive proxy p90 is 2.6/3.2 yd; that number did not select the controller.
Current pursuit/game evidence is linked above, with diverging calls/RNG and
remaining contact/coverage gaps; it is not readiness proof.


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

The original all-snap review nominated **pocket adjustment diagnosis**, using
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
