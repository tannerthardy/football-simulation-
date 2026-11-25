# QB_V2 card spec §1: picture age, built (2026-11-25)

QB lane. This implements `docs/reviews/2026-11-24-qbv2-card-spec.md` §1. Patch:
`docs/reviews/patches/qbv2/picture-age-on-890558713.patch` (sha256 7f3d77dfecd1…, applies to develop 890558713). It touches V2 only and is
behind `QB_V2`, so behaviour with flags off is unchanged.

## The judge (src/sim/qbv2/judge.ts)

`arriveSigma` is replaced by `arrival(d, recvSig, horizon, margin)`, used at all three places arrival is judged: the
coverer, the lane (including its near-point term) and the driver.

- **Fresh spread:** `hypot(ARRIVE_SIGMA0, hypot(d.spread, recvSig) / vmax)`.
- **Unseen advance (s):** `(0.5 · UNSEEN_DRIFT · age² + UNSEEN_DRIFT · age · horizon) / vmax`.
- **Arrival chance:** `pArrive = phi((margin + advance) / sigma)`.

This is labelled in the code as a caution the passer applies, a stated choice, not a claim that unseen men close.

Age can refuse a throw but never grant one. The test "picture age acts one way" checks it on three placements and five
ages. The audit's §3 #2 test still passes.

**A finding for the spec.** "Identical to today at age 0" never happens. The picture's age carries his perception
delay: about 0.30 s even on a man he is looking at (stick vs cover3, 122 ticks in his clear cone: min, p25 and p50 all
0.30 s). So the advance always includes a delay term. UNSEEN_DRIFT's calibration absorbs it. Measuring age from the
delay instead would be a separate change. Not made here.

## UNSEEN_DRIFT, checked on the role rows

Same 8 staged cells × 30, `QB_V2=1 QB_QUICK_DRIFT=3`, a mid passer. Per judged role: mean believed arrival against the
actual arrival rate. Rusher lanes (pArrive 1) are left out. "Base" is the landed judge.

| Judge | Cmp | INT | Sacks | Release p25 / 50 / 75 | P believed / actual | Risk / INT | Coverer | Driver | Lane | Σ\|err\|·n |
|---|---|---|---|---|---|---|---|---|---|---|
| Base (landed), 2.5 | 185 | 5 | 3 | 1.36 / 1.46 / 1.71 | 0.81 / 0.79 | 0.021 / 0.021 | 0.09 / 0.08 | 0.05 / 0.05 | 0.27 / 0.28 | — |
| **§1, 2.5** | 187 | 3 | 3 | 1.41 / 1.56 / 2.36 | 0.83 / 0.80 | 0.015 / 0.013 | 0.08 / 0.04 | 0.04 / 0.04 | 0.42 / 0.29 | **7.0** |
| §1, 1.5 | 182 | 5 | 3 | 1.36 / 1.51 / 1.86 | 0.84 / 0.78 | 0.015 / 0.021 | 0.08 / 0.08 | 0.03 / 0.05 | 0.33 / 0.25 | 12.7 |
| §1, 1.0 | 183 | 6 | 3 | 1.36 / 1.46 / 1.66 | 0.85 / 0.78 | 0.014 / 0.026 | 0.07 / 0.11 | 0.03 / 0.06 | 0.29 / 0.24 | 19.6 |
| §1, 0.5 | 181 | 6 | 3 | 1.26 / 1.46 / 1.61 | 0.86 / 0.77 | 0.012 / 0.026 | 0.07 / 0.13 | 0.02 / 0.06 | 0.22 / 0.24 | — |

**Kept at 2.5,** not lowered as the spec expected. Lower values under-believe the coverer's and the driver's arrival
and the interceptions. 2.5 has the smallest summed role error and the closest overall P and risk.

**Its cost:**
- Lane arrival is believed at 0.42 against 0.29 actual: the lane defenders are the men he sees least.
- Release p75 moves 1.71 → 2.36 s.
- More checkdowns: slant-flat vs cover3 19 → 23, stick vs cover3 to the back 11.

INT counts are 3–6 of 234, so the risk columns are thin.

## The stale key (src/sim/qbv2/cycle.ts, look.ts)

On a key read, a key look he resolved earlier but has not had in his clear cone for longer than one look of his (tau)
is looked at before it is judged. That tick returns the look, not a throw. If his eyes cannot get there (`canReach`
false), he judges on what he has.

The staleness comes from his own eye history: `Looks.sinceClear`, the time since the target was last in his clear cone.
It does not come from the picture's age. The first build used the age, and that fired on every play (age ≥ 0.30 s >
tau 0.27 s even while he looks). That build held the hitch vs man 28 → 20 complete and doubled the sacks. It was
discarded.

In the staged cells the rule never fires: every key read is the first look, with the key in view. The cells are
identical to "§1, 2.5". It guards revisited key reads (the second pass, structure out).

Test: qbv2-cycle "a stale key is looked at before it is judged; out of reach of his eyes, he judges on what he has".

## Checks

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run test/qbv2-*.test.ts test/decision-information-scan.test.ts`: passes (38).
- `npm test` on the tree: see the PR note or the message to Integration.
