# QB_V2 card spec §1 as ruled, and the combined patch (2026-11-25)

QB lane. This supersedes `2026-11-25-qbv2-picture-age.md` (the first build) and the attempt-2 WIP.

**Combined patch:** `docs/reviews/patches/qbv2/combined-on-094b46f3a.patch` (sha256 40a38d63f3b6…, 17 files,
+264/−46, on develop 094b46f3a; test/engine-pin.json lists the two new test files). QB_V2 stays off.

It carries:
- the planFor swap;
- escape;
- the widened scan;
- the believed-body fallback;
- picture age with the stale-key look.

## Invariant 2, restated (Integration's ruling, for the card spec)

> Holding a defender's believed position and motion fixed, a throw's estimate never rises with the time since he was
> last seen. The one-way advance runs on time the man's motion could have changed without his seeing it: the sensing
> delay of his picture plus the time with no new sighting, up to the estimate's dead-reckoning horizon.

His belief moving toward the man's job (QBMind's blend to the expected spot) is anticipation from his coverage read. It
is allowed, and is not a violation.

Test: `test/qbv2-picture-age.test.ts` drives the real QBMind (seenSpread, unseenFor, jobWeight, pictureSpread) with the
estimate frozen, sweeping age to 2.5 s into the job regime. `test/qbv2-judge.test.ts` sweeps age and job weight on three
placements.

## The rule as built

| Piece | Where | What |
|---|---|---|
| Fresh spread | QBMind.seenSpread | The look's position error, and its velocity error over the sensing delay only. |
| Delay projection | drive.ts | His picture shows the man as he was a delay ago. It is carried forward over that delay at his seen velocity, so the belief is about now. |
| One-way advance | judge.ts arrival | It runs on time his motion could have changed unseen: the delay plus unseen time (QBMind.unseenFor), capped at 0.5 s (the estimate's EST_DR_HORIZON). It is never more than that time itself (the straight-line bound). Sized by UNSEEN_DRIFT 2.5. |
| Job spread | judge.ts | Past the horizon his belief is the man's job. JOB_SPREAD 2.0 yd (chosen, labelled; the expected spot has no spread of its own) applies by QBMind.jobWeight, one way: it can only raise the man's arrival chance. |
| Dead-reckoned spread | judge.ts | The look's velocity error carried over the unseen time (QBMind.pictureSpread) is forecast noise. It is applied one way too. |
| No cut-off | drive.ts, judge.ts | The 1.5 s drop is gone: nobody is forgotten. The lane's −0.3 s margin cut-off is gone. |
| Stale key | cycle.ts, look.ts | A key look resolved earlier but out of his clear cone for longer than his tau is looked at before it is judged, by his eye history (Looks.sinceClear). It never fires in the staged cells. |

**A perception fault outside V2, routed by Integration.** QBMind.estimate returns the sensed picture unprojected: with a
fresh memory it is about 0.3 s old, and a peripheral sighting can be 0.45–1.6 s old. Every user of the estimate has this
fault, the old passer included. V2 projects the picture in its own judge. QBMind's behaviour for others is unchanged.

## Why the delay counts toward the advance (the middle arm)

Same 8 staged cells × 30, a mid passer, QB_V2=1 QB_QUICK_DRIFT=3:

| Arm | Cmp | INT | Sacks | Release p25 / 50 / 75 | P believed / actual | Risk / INT |
|---|---|---|---|---|---|---|
| Landed judge | 185 | 5 | 3 | 1.36 / 1.46 / 1.71 | 0.81 / 0.79 | 0.021 / 0.021 |
| Ruled rule (no projection) | 180 | 7 | 3 | 1.26 / 1.46 / 1.61 | 0.86 / 0.77 | 0.012 / 0.030 |
| + projection, delay not counted | 185 | 5 | 2 | 1.36 / 1.41 / 1.61 | 0.86 / 0.78 | 0.010 / 0.021 |
| **+ projection, delay counted** | 190 | 3 | 3 | 1.41 / 1.51 / 2.31 | **0.84 / 0.81** | **0.013 / 0.013** |
| Combined patch on 094b46f3a | 189 | 4 | 3 | 1.36 / 1.51 / 2.36 | 0.84 / 0.81 | 0.014 / 0.017 |

Role rows (believed arrival / actual; n):

| Arm | Coverer | Driver | Lane |
|---|---|---|---|
| Projection, delay not counted | 0.05 / 0.10 (61) | 0.02 / 0.05 (398) | 0.05 / 0.07 (215) |
| Projection, delay counted | 0.01 / 0.05 (43) | 0.05 / 0.04 (414) | 0.08 / 0.07 (137) |

Without the delay term, coverers, drivers and the interception risk stay under-believed. So the term stays. It is an
allowance for unseen acceleration over the delay, sized by UNSEEN_DRIFT: a stated choice. On the traced press corner it
covers him being seen at 1.8 yd/s while really moving at 3.6.

## Where it holds longer, by hand

The p75 rise (1.61 → 2.31 s) comes from **quick outs vs Cover 3 and vs Cover 2**. The hitch vs man doesn't hold
(p75 1.46 s).

- **What changes:** he refuses the frontside out at 1.2–1.36 s and throws the backside out (W1) at about 2.3 s.
- **Vs Cover 3** (seeds 10 and 17): the out's P falls from 0.79 to about 0.37 at 1.16 s. The driver is the curl-flat
  safety at margin +0.1 s, priced 0.96 against 0.81 without the term.
  - On outs actually thrown he arrives 1 of 9, even on the landed judge (believed 0.19).
  - So here the allowance prices a zone dropper working his curl, not driving on the out.
  - This is the driver model's known over-pricing of an occupied man, and the allowance amplifies it.
  - The backside outs complete about as often, so the cost is time (about 1 s), not completions.
- **Vs Cover 2:** the same refusal sends him to the backside, which is better there. The corner under the out
  (lane-priced 0.17 against 2/12 played, where it was 0.04 against 4/16) breaks up the frontside outs.

Open, mine: the driver model for a zone dropper working his landmark (the curl-flat on the out), and the lane pricing of a
squat corner under a short out. Both are V2 judge items, after this lands.

## Checks

- `npx tsc --noEmit -p .`: clean.
- qbv2-* + believed-fallback + decision-information-scan + engine-pin + information guard: 43 pass.
- `test/information-guard-allowlist.ts`: `qb.ts capacity.profile` leak 11 → 9. The believed-body fallback no longer
  reads the true profile.
- `npm test` on the combined tree: see the message to Integration. 10 failures are pre-existing on develop (QB_STICK,
  CATCH_CARRY, delayed visible help).

## Note added after landing (#947): the delay projection is an interim caution

The delay projection in drive.ts (his picture carried forward over its sensing delay at the seen velocity) is **wrong in
principle**. It is kept for now as an interim caution standing in for the estimate's velocity lag (Integration's ruling,
2026-11-25, option 1). It is to be removed when perception velocity is honest. That fault has been routed to Flex, with
`docs/reviews/patches/qbv2/diag/proj-err.ts` as the reproducer.

Measured over every non-lineman at 1.2 s (5 staged cells × 15 seeds), QBMind.estimate's position is already near-current,
and projecting it makes position worse:

| Sightings | Estimate as is | Projected | Estimate's velocity error |
|---|---|---|---|
| In the clear cone | 0.25 yd | 0.60 yd | 1.45 yd/s |
| Peripheral | 0.83 yd | 1.28 yd | 1.62 yd/s |

The earlier premise, that the estimate returns the sensed picture unprojected, came from one accelerating press corner.
There the real error is velocity.

Removing the projection alone gives cmp 181 against 189, and P 0.83 believed against 0.78 actual. It acts as caution on
moving men whose velocity he under-reads.
