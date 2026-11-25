# QB_V2 card: the pass rows on V2's plays (2026-11-25)

QB lane, for Integration's whole-game card. Patch: `docs/reviews/patches/qbv2/qbv2-card-split-on-399463573.patch`
(5 files, +106). It applies to develop 399463573.

## What it adds

- **`PlayPlan.qbV2Call`** (src/game/game.ts). This labels a pass call that QB_V2 takes: a staged concept whose read plan
  fits the call. It is set whether or not QB_V2 is on, so the same calls are known in both arms of a card.
  - It is computed by `qbV2Call(call)`, exported from qb.ts beside `QB_V2_STAGED`. That is the same test qb.ts uses to
    give a play to V2.
  - It is a label only: no behaviour reads it.
- **`PlayRec.qbV2Call` and `PlayRec.qbV2`** (scripts/scorecard/records.ts). They copy the call label and the play tag
  (`PlayStats.qbV2`). Both are absent when false.
- **`--splits qbV2`** (scripts/scorecard/metrics.ts). This splits the pass rows into "V2 call" and "other pass". The
  split uses the call label because a two-arm card splits both arms on one key.
- **`scripts/diag/qbv2/card-split.ts`**. It reads saved two-arm cards (`--out`; the base arm first) and reports:
  - completion, yards an attempt, sacks a dropback, interceptions an attempt, scrambles a dropback, and time to throw on
    attempts;
  - those rows on V2's calls against the same calls in the base arm;
  - the other passes as a control, since V2 does not take them;
  - 90% intervals from resampling whole games;
  - the label checks: V2's call share in each arm, the tagged share of V2's calls, and tags off a V2 call (which should
    be 0).

## Usage

```bash
npm run scorecard -- --tier pr --arm base: --arm v2:QB_V2=1,QB_QUICK_DRIFT=3 --splits qbV2 --out out/v2card.json --md out/v2card.md
```

```bash
node --import tsx scripts/diag/qbv2/card-split.ts out/v2card.json --md out/v2card-split.md
```

## Checks

- **V2 off:** one game (seed 7) against clean 399463573. The play records are identical apart from the label (122 plays,
  8 labelled V2 calls), and the game record is equal.
- **Smoke card,** 2 games an arm, base against QB_V2=1 (`QUICK_DRIFT` left at 0):
  - V2 took 18 of its 18 calls, and no tag appeared off a V2 call.
  - The call share is 12.2% (base) and 10.2% (V2).
  - Time to throw on V2's calls is 2.60 → 1.67 s.
  - The control passes also move (sacks, INTs) at 2 games. That is game divergence, which is why the control is
    reported.
- `npx tsc --noEmit -p .`: clean.
- scorecard-*, engine-pin, decision-information and information-guard tests: 130 pass.
