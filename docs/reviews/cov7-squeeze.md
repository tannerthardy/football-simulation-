# COV-7: the corner squeezes the stalk

Code for the choice designed in [cov7-support-choice.md](cov7-support-choice.md)
(#286). A pass-first man corner (`PASS_FIRST`, not the force player) who reads
run and sees his receiver stalk him now plays through the block instead of
backpedalling on a blocker. `STALK_SQUEEZE` is on by default; `=0` keeps the
old retain-man path for comparison until review 2.

## The rule

In `ManCoverage.coverMan` (`src/sim/behaviors/defense.ts`), for a pass-first
marker with an installed backfield:

| His pictures | He does |
| --- | --- |
| Run belief, block look on his man (`showsBlock` to admit, `observedBlocking` once admitted), no exchange seen | **squeeze**: close the cushion downhill to hand distance in front of his man, on the side of the flow he sees, with the lateral offset capped at his reach. Eyes in the backfield. |
| Receiver comes upright and runs (block look gone) | back to man, through the existing `trackReceiver`, with the receiver still in front |
| While squeezing, the back is carrying and the QB isn't | **installed fit** (`blockingSupport`, the same capped alley fit as before) for as long as he believes run |
| Recognized flight | all three states retire, as `blockingRun` already did |

Inputs: his recognition read, his pictures of his man, the QB and the back.
It never reads the `receiverBlockLook` tag or its `until` clock, the
receiver's behavior, the call, `sim.carrier` or handoff/throw times;
`test/decision-information-guard.test.ts` now also rejects any defensive read
of `receiverBlockLook`. Force players and non-pass-first markers keep their
existing rule. No time, route or call appears in the rule.

## Fixture arms

`scripts/diag/cov7-abandonment.ts` now runs three arms per call on the same
setup bytes, each switch applied to CB_S alone:

- **man**: `STALK_SQUEEZE=0` for him (the pre-COV-7 default);
- **support**: `PASS_FIRST=0` for him (the permissive diagnostic);
- **squeeze**: today's default.

Everyone else plays today's defaults, so other corners squeeze too in every
arm.

## Declared before running

Declared in this commit, before any of these runs, on today's defaults
(no `EDGE_CONTAIN`/`SEAL_HOLD` pins):

**Fixtures.**

1. The #286 fixture as recorded: Toss and PA Shot, Z split 8⅓ yd, look until
   1.0 s.
2. Run-arm re-qualification, **wider split**: the same Toss and PA Shot with
   Z split 10 yd and 11⅔ yd. On 8⅓ the toss bounces outside the corner's
   alley (runner near y 13.5, corner near 17.7), so a wider-aligned corner is
   the natural place for his support to decide something.
3. **Vertical cost arm**: PA Shot with Z moved to the front of the
   progression (`--vertical`). Z's route after the look is already `go`, so
   this measures the price of the bite when the QB looks at the stalk-and-go
   first.
4. The #286 release variation: the look sold until 1.3 s.

**Predictions** (squeeze vs man unless stated):

1. The squeeze is admitted at the same tick, with the same pictures, as the
   permissive support arm on every call.
2. PA Shot and vertical: at the QB's release the squeeze arm's depth
   leverage on Z is at least 1 yd worse than man, and its lateral gap is
   smaller than the support arm's.
3. Vertical: Z's separation at the release is larger in the squeeze arm than
   in man.
4. Toss at one of the wider splits: the squeezing corner has a carrier
   contact (contact, wrap or tackle) and the man arm's doesn't; the squeeze
   arm's yards are shorter.
5. On Toss the exchange is seen within 0.7 s of admission, and from then on
   the squeeze arm runs the same fit as the support arm.

No prediction on completions. Results are recorded below whichever way they
go.

## Results

(Pending.)
