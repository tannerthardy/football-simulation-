# Slow rear contact: reject the gather trial, isolate wrap geometry

The handoff really does discard a gathered request, but restoring it is not a
successful tackle repair. The trial loses six matched finishes and still fails
the selected slow rear. It is retained at `6dabd20` and **reverted** on
`codex/slow-rear-contact`. The final engine tree exactly matches `182f01c`.
`TACKLE_TOUCH`, all companion physics experiments and RB-read features retain
their defaults. No capacity or shared physics change is installed.

[Receipt](https://github.com/tannerthardy/football-simulation-/blob/67301d24ef56a72b4a205185fb6c76b6dd845c7b/data/reviews/current/slow-rear-contact.json) pins the trial,
adverse outcomes, actual acquired picture, diagnostic interventions and tools.
Runtime source after restoration is
`b74545da8e72fd35321ef4e16bbdb54153262711eb40deb361a1d10b6de63e88`.

## First mistake and the failed correction

Keep the original roster 61/62, seed 3002, 180°/3 yd/s input and its mirror.
Times here are World input/output boundaries, not the earlier event timestamp
assigned inside `tryTackles`. A hand first exists at the 2.65 s input; it has
not yet transmitted force. The initial hold has depth index 0.500 and capacity
686.678 kg·yd/s², exactly as in the successful earlier-acquisition comparison.

At 2.60 s chase requests 6.802 yd/s. At 2.65 s its actual acquired runner
picture is 0.15 s old, dead-reckoned to the current position, with observed
speed 3.0 yd/s. The existing gather computes 6.545 yd/s with full gather weight.
Joining the bond bypasses that result and returns pursuit at 9.359 yd/s.
The experimental strike transition preserves this faster command.

The trial reused the existing gathered command for held defenders, while
continuing to exclude free-body forecasts on constrained bodies. It added no
observation, random draw, strength or new tackle rule. This removed the request
jump, but the selected rear remained upright at the time limit.

| Compared with the prior contact candidate | Matched 144 | Previously inspected fresh 96 |
| --- | ---: | ---: |
| Prior finishes | 100 | 74 |
| Gather trial finishes | 94 | 74 |
| Finishes lost / gained | 6 / 0 | 0 / 0 |
| Paired completed end spots worse by >0.1 yd | 28 | 42 |

The six losses are the mirrored 135°/3 seeds 3001 and 3002, and 135°/6 seed
3002. The trial has 94 physical falls, 20 escapes and 30 censored plays.
Fresh retains 70 falls, four stopped-progress finishes and 22 escapes, but
preserving finishes hides its many worse spots. Median speed difference at
the same prior-force-contact +0.2 s is zero in both sets (126/82 paired samples).
There is no evidence here to promote this approach or claim the early-speed
gap is fixed. No extra game sweep or new holdout was collected after rejection.

## The first physical difference

The defender stays behind the runner throughout the diagnosed interval; this
is not a collision caused by passing him. Preserved strike footwork produces
a harder rear arrival:

| Boundary / measured response | Earlier acquisition with pile footwork | Preserved strike footwork |
| --- | ---: | ---: |
| Defender speed at 2.80 s | 6.723 | 7.438 |
| Defender speed at 2.85 s | 6.368 | 7.979 |
| First real force-bearing interval | 2.90–2.95 s | 2.85–2.90 s |
| First torso impulse, kg·yd/s | 145.942 | 263.798 |
| Runner speed after that interval | 4.290 | 5.339 |
| Native first fall | 5.10 s | None; time-limit censor |
| Observed advance after acquisition | 7.857 yd | 13.415 yd |

Both later request a plant. Both attain tight body proximity and grow grip
capacity to 2,267 kg·yd/s². The failing hold is not breaking or losing its grip
force ceiling. At 3.65 s the failing runner's capture deviation is about
0.255 yd; the earlier comparison reaches 0.324 yd and continues toward a fall.
The failing pair then separates while corrective support recovers. A late
censored snapshot alone would hide the harder impact and differing recovery.

The successful early hold has the same initial depth as the failing hold.
Therefore **shallow depth alone is not the cause**. Arrival load, fixed hold
location and the subsequent corrective-support trajectory interact. The
existing gather correction changes this trajectory but does not repair it.

## Isolate the hold location without installing a free re-grab

At the failing pair's first actual tight-wrap boundary, 2.85 s, substitute only
the depth index from the matched finish control's acquired hold: 0.500→0.805.
The control's depth includes its original execution draw; this is a deliberately
unavailable counterfactual, not a rating bonus or a new decision. Grip capacity,
incoming bodies and the first torso impulse stay unchanged at this boundary.
Subsequent native controllers derive their grip/coupling updates normally.

The substituted pair physically falls at 3.85 s and advances 5.035 yd instead
of remaining censored after 13.415 yd. The repaired 135°/6 fresh pair remains a
physical fall, and the selected diving controls are unchanged. On the twenty
selected fresh inputs there are no lost finishes; four front stopped-progress
finishes become physical falls. These are selected diagnostic controls, not a
frequency estimate or validation of a re-grab policy. Collinear 180° mirrors
share the same incoming state and are not independent confirmation.

The depth change alters contact height and subsequent force-transmitted
recovery coupling. This probe does **not** separate those two effects, show
that hands can achieve the lower location, or account for a re-grab's cost.
It must not be turned into “near the torso means deeper grip.”

## Reproducible physics handoff and verification

[Two-body witness](../../data/reviews/current/slow-rear-witness.json) is 24 KB:
the full shared incoming bodies, original joint and two decision tapes through
4.25 s. It retains sprint-load, squeeze and support history. One tape has no
intervention; the other explicitly changes depth once. It contains no imposed
slip, break, fall or new contact law. The replay checks existing arm impulse,
arm work, support motor work and passive-work budgets.

```sh
LEG_BRACE=1 node --import tsx scripts/diag/physics/slow-rear-replay.ts
```

At 12 substeps both tapes reproduce every native boundary position exactly.
The unchanged-depth tape stays upright at all four resolutions; the depth
probe falls at 3.85/3.80/3.80/3.80 s. Probe position disagreement from 96 steps
shrinks 0.1043→0.0136→0.0054 yd. This is convergence evidence for this frozen
decision tape, not ground truth for tackle timing. `--candidate` explicitly
permits comparing a changed physics source without claiming native equality.

The earlier successful shallow hold also falls at all resolutions, at
5.10/5.10/5.15/5.15 s, with 0.1330→0.1114→0.0164 yd position disagreement. At
96 steps its last recorded boundary remains falling, rather than down; its
physical fall is observed, but the frozen native endpoint is not extended.
Repaired rear and dive controls remain falls. All acquisition/probe captures
pass exact observed/plain endpoint, body, mind, intent and RNG equality.
The new acquired-picture observer reproduces the old native rear endpoints.

Focused contact/approach checks: **97 pass**. Typecheck and build pass. The
engine has been restored exactly, so the prior complete source-pinned
[validation](reach-transition.md) remains the baseline: 1,622 pass and the
existing Tite assertion, plus the preserved experimental waiting expectation.
The complete suite was not rerun for these diagnostic-only final changes.

Regenerate native and depth tapes with `reach-transition.ts current` or
`tight-depth`, `--rear-loss`, and the same flags as the previous review:
`TACKLE_TOUCH=1 REACH_CONTACT=0 LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1`.
For selected controls use `--fresh`. `reach-transition-refinement.ts` now
accepts explicit `--rear-tape`, `--fresh-tape` and `--control-tape` paths; it
replays the depth probe's one explicit intervention rather than silently
treating recorded depth progression as physics. The receipt preserves failed
trial panels separately from the restored native tapes.

## Single best next step

Have primary review **how a reach hold can earn a different force point after
physical closure**, using the two-body witness and the successful shallow-hold
control. First separate height/pitch loading from corrective-support coupling;
then account for any physically attainable re-grab and its cost. A speed-only
controller change failed this comparison. Another grip-strength increase,
automatic deepening rule or brace extension is not supported by this evidence.
