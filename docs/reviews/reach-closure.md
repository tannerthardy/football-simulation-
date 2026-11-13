# Which contact approach deserves more work?

**Park expansion of the compression brace.** Its force-law correction is worth
retaining, but simpler earlier acquisition on the existing grip law preserves
finishing much better. Neither is ready for promotion. Also, the large apparent
early-speed gain does not survive sampling both versions at the same time.
The next useful investigation is the transition from an acquired reach to pile
movement and an earned wrap, on the retained rear-angle acquisition loss.

Branch `codex/reach-contact-closure` starts at `fda39f7`. Runtime source:
`8209ff6d8b70073c6c344983e3b397df25580b0ac4af74d84a6a4ea9605b6b18`.
[Receipt](https://github.com/tannerthardy/football-simulation-/blob/67301d24ef56a72b4a205185fb6c76b6dd845c7b/data/reviews/current/reach-closure.json) includes stage/tool/input
pins, every changed finishing pair, actual live sample counts and failures.
The [previous brace experiment](reach-contact.md) remains its own source-pinned
stage. `REACH_CONTACT` stays default-off; no OL/RB or other default changes.

## A quick alternative screen

Start with 12 mirrored reps: the saved 45°/6 failing hold, 90°/6 dive, fast
front arrival, rear drag, side cut and slow front control. Then use the same
144 matched and 96 fresh inputs as the previous experiment. Comparisons run
observed/plain with exact native endpoint and RNG equality.

The alternatives are diagnostic interventions at a World boundary:

- Acquire at standing reach with the ordinary grip and its original reel.
- Acquire at standing reach with the ordinary grip and no reel.
- Retain compression until the bodies stop closing along the hold, then
  remove the brace and restore the existing reel.

No force, player capacity, traction, support integrator, approach speed or
production technique is retuned. The last alternative is a screen, not a new
installed phase rule. It does not rescue the selected 45° hold and remains
substantially worse in the broader comparisons.

## One demonstrated law correction

The prototype used the muscular compression limit as the limit on the entire
grip vector. In the 45°/6 witness, at 2.65 s the structural grip can restrain
954.8 force units, but the whole vector was capped at 768.8 by the arm motor.
Compression spends that smaller allowance, leaving no sideways restraint.
The existing ordinary hold permits passive shear through its structural grip.

The correction separates those existing limits:

- Compression remains bounded by the allocated arm request.
- The total normal/shear vector remains bounded by the existing structural
  grip. Passive shear does not acquire a second grip allowance.
- Pure compression does not slide the grip down the runner; saturated shear
  can slip using the existing slip threshold and slide law.

Duplicate holds still share capacity and stiffness. Zero/tiny claims still
cannot starve another hand. No strength is added. Two independent sideways
arrival tests fail before the correction and pass afterward, for center and
patch contact. The original 16 law tests and 91 adjacent law checks also pass.

The selected mirrored 45° failure now finishes by stopped progress, **not a
physical fall**. It gains real shear restraint at 2.65 s rather than waiting
for later separation. The unchanged diving control still physically falls;
overpowering front arrivals still produce real torso collision. This is a
mechanical improvement, not a solved tackling package.

## Finishing comparison

The controls use `LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1`; these and the new
contact feature remain experiments. Production defaults separately reproduce
122 falls, 20 escapes and two censored endings on all 144 inputs.

| Approach | Matched falls / stopped / censored | Matched finishes | Fresh falls / stopped / censored | Fresh finishes |
| --- | ---: | ---: | ---: | ---: |
| Finish controls | 100 / 4 / 20 | 104 | 74 / 0 / 0 | 74 |
| Previous compression brace | 58 / 10 / 56 | 68 | 36 / 12 / 26 | 48 |
| Compression then restore reel | 70 / 6 / 46 | 76 | 50 / 6 / 18 | 56 |
| Corrected structural shear | 62 / 18 / 44 | 80 | 48 / 14 / 12 | 62 |
| Earlier acquisition, ordinary grip/reel | 100 / 0 / 24 | 100 | 68 / 4 / 2 | 72 |
| Earlier acquisition, ordinary grip/no reel | 112 / 0 / 12 | 112 | 66 / 4 / 4 | 70 |

There are 20 escapes per matched arm except compression-then-reel, which has
22; each fresh arm has 22. Censored holds are not tackles.

The correction gains 12 matched and 14 fresh finishes over the old brace,
with **no lost finishes relative to that brace**. Against the finish controls,
it still loses 32 matched finishes while gaining eight, and loses 12 fresh
without gaining any. It therefore remains disabled.

Ordinary grip/reel loses 14 matched finishes and gains ten. Its two fresh
losses are mirrors of one 135°/6 input, roster 71/72, seed 4001. No-reel wins
the matched aggregate but loses four fresh finishes. An aggregate winner is
not enough to promote either acquisition alternative.

## The contact clock matters

Median change over the first 0.2 s from each arm’s **own** first transmitted
load is −1.004 yd/s for finish controls, −0.331 for the old brace, −0.442 for
corrected shear and −0.581 for ordinary earlier acquisition. All 126 loaded
matched reps have those boundary samples. Fresh loaded denominator is 82.

That measurement also starts earlier when the hold forms at reach. To test
whether runners are actually faster at the same point in the play, sample both
arms at the control’s first force-bearing interval plus 0.2 s. Across all
126 matched pairs, median candidate-minus-control speed is −0.047 yd/s for
the old brace, −0.108 for corrected shear and −0.032 for ordinary early
acquisition. Fresh differences are zero, −0.025 and zero respectively.

There is **no median same-clock speed benefit** in this comparison. Some
individual contact histories improve, but the large headline change cannot
be interpreted as comparable speed preservation or fitted to the NFL gap.
The receipt retains both clocks and later sample counts. Acquisition, positive
load and actual torso collision remain separate; no terminal sample is extended.

## Why simpler acquisition also loses controls

The slow front witness acquires a shallow reach with zero lower-body share,
then physically closes to a wrap but retains that share. Its control starts
later with a 0.271 lower share and physically falls. A diagnostic substitution
of the matched control depth **only after achieved torso proximity** restores
the slow front physical fall in both mirrors. This points to an earned change
in hold depth, not more reel strength. The substitution is not a feasible
re-grab model and must not be installed as a free geometry change.

The fresh rear witness is more complicated. At 4.30 s, both arms have exactly
the same incoming positions and velocities. Acquiring a reach switches the
movement request from `(9.118, 1.407)` to `(7.261, 0.569)` yd/s, starts the
strike and changes grip quality before the control acquires at 4.55 s. The
early version closes to torso proximity by 4.65 s, yet later extends out to
1.183 yd and remains upright at the time limit. Its control physically falls.

Copying the control’s lower share at achieved proximity **does not** rescue
this rear witness. Depth alone is insufficient; requested movement, grip
strength history and achieved geometry already diverged earlier. The diving
controls and fresh escapes remain unchanged by that probe. No broad re-grab
or new pile policy was added to compensate for the loss.

## Verification and the best next step

18 reach-contact law tests pass; 109 focused law checks pass. Full defaults:
**1,614 pass, only the existing Tite assertion fails**. Python 141, typecheck
and build pass. Enabled focused controls: 189 pass and two preserved failures
remain—the approach-finishing guard and the deliberately changed waiting
expectation. Default and finish-control results **and full recorded frames**
match the previous source exactly on all 144 inputs.

Eight mirrored center/patch tapes replay at 12/24/48/96 substeps without
imposing recorded compression, slips or falls. The repaired 45° case remains
upright and ends through stopped progress; position disagreement shrinks
0.033→0.020→0.008 yd. The dive falls at all resolutions. Rear dragging and
fast patch escapes remain failures; finer stepping does not award a finish.

**Next: isolate the first movement/quality transition on the mirrored fresh
135°/6 reach.** Preserve the existing grip law and approach before that point;
compare the acquired hand’s actual restraint with the decision to enter pile
movement. Treat touch, an extended hold and a physically earned wrap as distinct
states. Determine which transition first loses useful geometry before writing
a new rule. Keep the slow-front depth witness and diving controls alongside it.
This is a smaller, better-supported direction than extending the compression
brace or strengthening its capacities.

Reproduction: the existing `reach-contact-panel.ts` collects current native
controls/candidate; `reach-closure-compare.ts MODE OUTPUT --full [--fresh]`
collects the alternative arms. `--probe` selects the bounded depth diagnosis.
Run with all four experimental flags set to one, and keep the referenced finish
control outputs available under `out/reach-contact/`. The receipt pins every
actual stage; historical operators do not certify a later engine.
