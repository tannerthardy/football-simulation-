# Back-man insertion from acquired possession

## The reproduced instruction

The prior [pursuit/contact review](pursuit-and-tackle-transfer.md) retains an
untouched 90.6-yard Duo touchdown from Game 2/P100, snap seed 3438958840.
`LB_M` owns the running back in off-man and an installed B-gap insertion.
He commits to run at 1.25 s but the old man-to-fit transition also requires his
receiver to look like a blocker. The downhill runner is not blocking. At 1.60 s
the linebacker requests positive downfield velocity, eventually retreating at
a requested 5.29 yd/s at 2.00 s. Live pursuit starts only when his acquired runner
picture passes LOS at 2.30 s. The runner has no actual body or tackling contact.

This is a controller transition witness. Stronger defenders, tighter grips or
more detailed ground physics cannot repair that requested retreat. It does
not prove that the native touchdown must become a stop or establish a bust rate.

## Bounded repair

The new branch requires all four conditions:

- The player has an installed `insert` fit.
- His known man target is a running back/fullback aligned in the backfield.
- His existing personal interpretation is `run`.
- His consumed target picture has affirmative `carrying === true`.

He submits the existing fit using that keyed target and already-consumed
picture. Deep mesh geometry keeps the insertion on its installed surface;
the existing declared-crease geometry permits attacking the back. An observed
runner past LOS receives ordinary pursuit. The new path never chooses a
different target from the true carrier, live handoff flag, hidden call or
scramble state. Existing unkeyed fit callers retain their prior behavior.

The ball-in-flight technique still owns an airborne ball. Outside receivers,
split-out backs, force/alley/cutback jobs, unsure/pass interpretations and
negative/unknown possession do not enter this branch. The older visible-block
transition remains. Negative possession alone is not evidence of blocking.
This does not add universal chase or claim a defender always knows the ball.

The first actual branch choice is recorded once as `coverage-run-fit` in
standard/full replays. It names the acquired carrying cue, run belief,
installed gap, known target and observation age. It distinguishes that keyed
picture from confirmed live possession. It adds no observation or RNG draw.
Replay behavior remains `man`; the decision record exposes the actual change
of work without changing the behavior/recording schema.

## Information and coaching limits

An alternative would fit the known back on a committed run belief alone.
That could reproduce a man linebacker biting on a play-action fake, but it is
a different coaching hypothesis with additional adverse passing consequences.
It is withheld here. Existing recognition and zone/fit players can still make
mistaken run reads. The new branch does not overwrite recognition.

The possession channel represents historical held-ball state sampled with
the same latency as position/velocity. It is a compact acquired model cue,
not measured player gaze, ball visibility through every body or an occlusion
model. `Recognition` still adds a private delayed handoff-time cue; that
information debt remains separate. Native perception is recorded before the
QB controller can transfer at 1.05 s, so a normal .20 s lag can acquire the first
positive RB snapshot around 1.30 s rather than inheriting the 1.25 s private read.
The native witness collector must establish the exact candidate boundary.

## Validation boundaries

`test/back-man-run-fit.test.ts` has 24 feature/control checks. All 24 pass,
with 44 existing nearby awareness, coverage and cushion checks passing too.
Against the exact previous source `8bc3e…`, the new file has 10 genuine failures
and 14 retained passing controls. Failure logs and source/test hashes are in
the working `out/run-fit-awareness/` packet for publication with the final
increment. These are mechanism checks, not a final league calibration claim.

The feature fixture translates the native first-retreat geometry but uses
separate generated players and explicitly supplied interpretation/possession
cues. It verifies mirrored insertion and actual World braking, bounded ground
impulse/work, installed-gap differences, cue-only transitions and invariance
to hidden current carrier/handoff/call/body changes. Controls preserve ordinary
man releases, false/unknown pictures, play action, visible blocking, far-side
fits, pass-flight behavior and live pursuit. Standard/full decision recording
does not change the requested action or RNG and records no false transition.

Natural selected-snap replay, ordinary panels, adverse outcomes and full-game
checks remain the root validation work after source freeze. Do not infer a
prevented touchdown or improved NFL rushing from these unit checks. Shared
World laws, ratings, strengths and traction have not changed.
