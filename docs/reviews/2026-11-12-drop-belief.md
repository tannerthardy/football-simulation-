# DROP_BELIEF: how often his receiver drops a ball that reaches him (2026-11-12)

**Question** (Integration, after engine-47's re-read of the beliefs). Defended and off-target held after the four
catch flags landed, but drops did not: on reached, untouched balls he believed 0.05 and 0.08 were dropped, at every
depth. Is his belief of the receiver's hands off, and by how much?

## Diagnosis

The window's last factor is `0.88 + 0.1·hands`: a believed drop of `0.12 − 0.1·hands`. On the engine-47 natural
league throws (seeds 101/201/301/401, 8 games each, both INT_BELIEF arms): 3,872 reached and not defended, 290
dropped.

| Receiver's hands | n | Believed drop | Observed |
|---|---|---|---|
| Under 0.5 | 350 | 0.078 | 0.126 |
| 0.5–0.6 | 385 | 0.063 | 0.078 |
| 0.6–0.7 | 1,147 | 0.054 | 0.078 |
| 0.7–0.8 | 1,290 | 0.045 | 0.067 |
| 0.8 and over | 700 | 0.036 | 0.059 |

The observed rate is `0.165 − 0.13·hands`, by likelihood.

- **Fit on one arm's games, checked on the other:** each half's fit lands within 0.004 of observed on the other half,
  in three hands bands. The current belief is 0.02–0.03 low in every band.
- **By seed:** drop rates run from 0.049 to 0.099, so a two-seed read cannot judge the level.

## Change (`DROP_BELIEF`, off)

`QBPass.window`:

- **The believed drop is the fitted rate,** `0.165 − 0.13·hands`, clamped to 0.005–0.5. It still falls with the
  receiver's hands.
- **His knowledge sets how well he knows it:** `exp((1 − know)·0.3·judgment('drop-belief'))`, two-sided. `know` is the
  same as DEF_BELIEF's, ACC_BELIEF's and INT_BELIEF's.
- **Nothing else moves.** Open, clear and accuracy are untouched; the fixture checks that.

## Read

**League games, engine-48 (develop 62b5badb, INT_BELIEF on), seeds 101/201/301/401, 8 games each:**

| | Off | On |
|---|---|---|
| Drops, believed / observed | 0.05 / 0.08 | 0.08 / 0.08 |
| Drops at urgency 0.5–1 | 0.05 / 0.09 | 0.08 / 0.08 |
| Sacks | 121 (4.1%) | 152 (5.2%) |
| Free rusher at 2 yd: throws / sacked | 68% / 18% | 62% / 25% |
| Completion | 0.666 | 0.664 |
| Yards a play | 8.23 | 7.68 |
| INT | 49 | 69 |

- **On engine-47 (INT_BELIEF off),** the same arms gave sacks 131 → 147, yards a play 8.05 → 8.02 and INT 46 → 48.
- **League games are not paired.** One different decision changes every later play. The INT rise (49 → 69, about
  1.8 SD unpaired) is in throws that clear his normal bar, at the same priced risk. It did not appear on engine-47,
  and the paired panel below shows no INT mechanism.

**Paired forced-concept panel** (`panel.ts`, 1,536 plays, engine-48):

| | Off | On |
|---|---|---|
| INT | 42 | 41 |
| Sacks | 48 | 48 |
| Completion | 0.602 | 0.601 |
| Yards a play | 8.23 | 8.07 |
| Time to throw p50 | 2.75 s | 2.80 s |

- **112 plays change** target, attempt, sack or timing: 1 new INT and 3 removed, 2 new sacks and 2 removed.
- **On the 105 changed plays that end in a throw,** completions go 61 → 56 and yards 9.0 → 6.9: he holds a little
  longer and takes a later, shorter throw.

## Reading it

- **The belief now matches what happens.**
- **Its cost runs one way:** a believed P about 0.02 lower everywhere means fewer throws clear his bars. He holds a
  little longer, so more sacks with a free rusher (NFL 25% sacked, 57% throws), and slightly fewer yards on the plays
  it changes.
- **Whether the bars should move is a separate question.** They were set against the old, optimistic P:
  - the rhythm throw: `P ≥ 0.6 − 0.12·aggression` (qb.ts, the top-of-drop timing throw);
  - the read bar: `thr = 0.6 − 0.12·aggression − 0.32·u`, with the screens' `need`;
  - the triangle: `P ≥ need`, and its peek's `0.85·need`;
  - the move-on glance: `P < 0.5·need`;
  - out of reads: `P ≥ thr − 0.1`;
  - the hot throw and its look: `P > 0.3`;
  - the outlet: `P ≥ need`;
  - the fastball's `P < 0.6`.
- **The same holds for the other belief corrections** (DEF_BELIEF, ACC_BELIEF): each lowered P, and none of the bars
  above was re-set after them.

## Fixture

`test/drop-belief.test.ts` covers a named panel of 8 plays at the first tick he is set, before either arm has thrown
(the same tick and QB position in both arms):

- every read evaluated both ways expects more drops with the flag on, by at least 0.015 on average and on at least
  70% of reads;
- open and accuracy are unchanged;
- better hands are still believed surer.

## Checks

- `npx tsc --noEmit -p .` is clean.
- `test/drop-belief.test.ts` passes.
- Raw output is in `out/drop`, `out/drop48` and `out/read-plan/panel-drop{0,1}.jsonl` (ignored).
