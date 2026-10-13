# Reach-to-pile transition: preserve the committed step

The rear-angle acquisition loss was a movement conflict: first hand contact
queued a body strike, then pile movement asked the same body to brake while
that strike was still driving it. Stronger grip alone did not fix it.

`TACKLE_TOUCH=1` now tests earlier standing acquisition on the ordinary grip
law, preserving the actual cached approach velocity through a queued or
ongoing strike while the hold remains extended. It restores both selected
rear failures and preserves every finish on the 96 previously fresh and 48
new inputs. **Default-off:** the matched panel still loses finishes and contains
a new slow-rear regression. No third controller adjustment was stacked on it.

Branch starts at `d4ec81c`. Final runtime source is
`b74545da8e72fd35321ef4e16bbdb54153262711eb40deb361a1d10b6de63e88`.
[Receipt](https://github.com/tannerthardy/football-simulation-/blob/67301d24ef56a72b4a205185fb6c76b6dd845c7b/data/reviews/current/reach-transition.json) pins the stages,
input states, tools, force-bearing samples, changed finishes and adverse advances.
World, strength, traction, grip capacities, hold depth, recovery integrator,
RB-read and production defaults are unchanged. Primary retains shared-law
review and production promotion.

## First difference and causal tests

Use the mirrored 135°/6 yd/s input, roster 71/72, seed 4001. At 4.30 s both
versions have the same incoming bodies. Early hand acquisition changes the
request to `(7.261, 0.569)` yd/s while also queuing a strike of
`(2.138, 0.770)` yd/s. The cached pursuit command is `(9.287, 1.682)`.
The strike persists in body support after that first tick.

The defender's achieved speed rises from about 8.0 to 8.637, 9.220 and
9.379 yd/s at the next three boundaries, despite the progressively smaller
pile request. These are actual achieved velocities, not the requested strike
added directly to speed. Ground, support and contact resolve the movement.
The hold later closes to torso proximity but extends again; the runner stays
upright at the time limit. The original control physically falls.

Matched diagnostic substitutions isolate the causes:

| Probe on that input and its mirror | Result |
| --- | --- |
| Original early acquisition/reel | Censored hold |
| Recorded control movement before its later acquisition | Physical fall |
| Remove only the initial reach strike | Physical fall |
| Recorded stronger grip after control acquisition | Still censored |

Recorded control commands and strength are counterfactual diagnostic inputs,
not information available to a player. The final controller uses its own
already computed command and its own queued/felt strike state. It performs
no extra observation, forecast or random draw.

## Two bounded controller attempts

The first attempt, retained at commit `39823e9`, allowed early hand acquisition
without automatically queuing a body strike when the supported read still
favored gathering. It repaired the selected fresh losses but reduced matched
finishes from 104 to 88. Removing a useful strike was not a general repair.

The second preserves the original strike, miss and fumble attempts. During a
queued `lunge` or an ongoing body-owned `strike`, it retains the cached velocity,
cut skill and effort instead of replacing them with the pile's braking velocity.
The pile's facing/posture, grip update and physical constraints remain active.
This applies only while both players are upright and separated beyond the
existing tight-wrap boundary (`torso + .15 yd`). At a tight wrap, with no active
strike, or when either player is down, the existing finish/follow behavior acts.
No timer, guaranteed speed, earned depth substitution or forced fall is added.

## Outcomes and controls

The comparison's finish controls are `LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1`.
All are experimental; `REACH_CONTACT=0` for the final controller candidate.

| Arm | Matched falls / stopped / censored | Matched finishes | Fresh falls / stopped / censored | Fresh finishes |
| --- | ---: | ---: | ---: | ---: |
| Finish controls | 100 / 4 / 20 | 104/144 | 74 / 0 / 0 | 74/96 |
| Earlier acquisition/reel, prior stage | 100 / 0 / 24 | 100/144 | 68 / 4 / 2 | 72/96 |
| First attempt: suppress early strike | 82 / 6 / 36 | 88/144 | 70 / 4 / 0 | 74/96 |
| Final: coherent strike footwork | 96 / 4 / 24 | 100/144 | 70 / 4 / 0 | 74/96 |

Each matched arm has 20 escapes and each fresh arm 22. Time-limit holds remain
censored, not tackles. Against finish controls, the final matched arm loses
14 finishes and gains ten. Against prior early acquisition it loses two and
gains two: it repairs the mirrored 135°/6 seed-3002 case but loses the mirrored
180°/3 seed-3002 case. The fresh rear loss is repaired with no lost fresh finish.

For the selected fresh 135° case, the first physical fall begins at 5.00 s;
the native play ends through down by contact. The diving 90°/6 control remains
unchanged. The slow-front zero-depth failure remains censored: this patch
does not magically move a hand from a shallow grab to a lower wrap.

The additional 48 inputs use roster 91/92 and seed 5001, declared before
collection. Both control and candidate finish all the same 34 inputs. Control
has 12 escapes/two censored; candidate has 14 escapes/no censored. They are
new generated checks, not a reserved blind NFL test.

With only `TACKLE_TOUCH=1` and all companion physics flags off, the matched arm
has 118 physical falls, 20 escapes and six censored versus production's
122/20/two. It loses four finishes without gaining any. The patch is not a
standalone production improvement.

Preserving a finish does not guarantee a better spot: ten paired completed
matched plays and eight paired completed fresh plays end more than 0.1 yd
farther downfield than their finish controls. No such adverse completed advance
appears in the additional 48. The receipt retains every one, using absolute
field end spots rather than differing acquisition-relative clocks.

## Measurement and verification

All panels run observed/plain with exact endpoint, body, mind, intent and RNG
equality. Production and finish-control results **and recorded frames** exactly
reproduce the prior source on 144 inputs each. Positive transmitted grip load,
actual torso impulse and mere acquisition are distinct.

All 126 force-loaded matched, 82 fresh and 38 additional inputs have +0.2 s
samples. At the **same control-contact +0.2 s** boundary, median candidate-minus-
control runner speed is zero matched, −0.0002 fresh and −0.0385 yd/s additional.
This is not a demonstrated repair of the NFL early-speed gap. Later sample
counts and both clocks remain explicit; no terminal state is extended.

Six selected native World tapes—the repaired rear pair, diving controls and
new slow-rear losses—replay at 12/24/48/96 substeps. Full incoming bodies include
sprint-load and squeeze history, plus the exact recorded step duration. Native
12-step replay reproduces boundary positions within 2e−11 yd. No recorded
slip, depth progression, break or fall is imposed; only controller requests,
capacity and coupling updates are held fixed.

The repaired rear falls at 5.00 s at every resolution; position disagreement
from 96 steps shrinks 0.0118→0.0071→0.0021 yd. The dive still falls. The slow
rear loss remains upright/censored at every resolution, with disagreement
0.0255→0.0142→0.0021 yd. Finer stepping does not rescue the regression.

Eight new contact/transition contracts cover ordinary acquisition, committed
and last-chance strikes, physical reach, queued/ongoing footwork, tight wrap
and no-strike transitions without awarding finishes or changing grip depth.
Full defaults: **1,622 pass, existing Tite assertion fails**. Python 141,
typecheck and build pass. Enabled focused checks: 198 pass; only the preserved
old waiting expectation fails because early acquisition deliberately changes
it. The approach-tackle physical guard now passes.

## Single best next step

Trace the new **180°/3, seed 3002** rear pair from its first queued strike through
loss of useful hold geometry, alongside the repaired 135°/6 pair. Determine
whether continuing the step chooses the wrong leverage or the shallow hold
cannot transmit the required load. Keep the full original input and incoming
state; do not conclude from the time-limit snapshot. Preserve the slow-front
depth witness and do not grant a deeper hold without a physical re-grab.
Two controller attempts have now been measured, so re-diagnose this trade
before a third rule or any promotion.

Reproduction: run `reach-contact-panel.ts` for native arms (`--fresh` and
`--extra-fresh`), then `reach-transition.ts current` for selected traced arms
(`--fresh` or `--rear-loss`). `reach-transition-refinement.ts` replays those
native tapes. For diagnostic probes, retain the referenced control panels at
`out/reach-closure/finish.json` and `out/reach-contact/fresh-finish.json`; both can
be regenerated on this source with all acquisition flags off. The receipt pins
the actual historical tools and data; it does not certify later engines.
