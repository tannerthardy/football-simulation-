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

Run on develop `f502f7bd` plus #286, today's defaults. Yards are man →
support → squeeze. "Depth" is the corner's depth leverage on Z at the QB's
release (negative: Z is past him).

| Fixture | Toss | PA Shot | PA at release: depth / lateral gap / separation, man → support → squeeze |
| --- | --- | --- | --- |
| 8⅓ yd, look 1.0 s | 4.08 → 2.25 → 2.25 | inc → inc → inc | −0.08 / 0.85 / 0.85 → −1.10 / 2.40 / 2.64 → **−2.47 / 1.46 / 2.87** |
| 10 yd | 2.08 → 5.47 → 4.50; squeezing corner wraps 4.40 s and makes the tackle at 5.35 s | inc → inc → inc | same as 8⅓ to 0.1 yd |
| 11⅔ yd | 2.48 → 1.97 → 1.65; closest approach 4.39 → 1.02 yd, no contact | inc → **30.5-yd catch** → inc | same as 8⅓ to 0.1 yd |
| Vertical (Z first), 8⅓ | — | inc → inc → inc | identical to PA Shot: the QB already throws Z's go at 2.65 s |
| Look until 1.3 s | 1.71 → 1.07 → 2.43 | 14.1 (to H) → inc → inc | man throws to H at 3.80 s; squeeze to Z at 2.80 s: −2.72 / 0.99 / 2.90 |

Predictions:

1. **Held.** Squeeze admitted at 0.65 s on every call, the same tick and
   pictures as the support arm.
2. **Held.** PA depth at release is 2.4 yd worse than man (−2.47 vs −0.08),
   and the lateral gap (1.46) is smaller than the support arm's (2.40): he
   pays in depth, not in lateral abandonment.
3. **Held.** Separation from Z at the release 2.87 vs 0.85 yd. The QB's own
   last evaluation of Z: completion 0.58 vs 0.55, interception risk 0.001 vs
   0.019.
4. **Not held as stated.** At 10 yd the squeezing corner has the carrier
   contact (wrap and tackle) and the man corner doesn't, but the play gains
   4.5 vs 2.1 yd: the paths diverge at 3.25 s and LB_W's first contact moves
   from 3.35 to 3.75 s. At 11⅔ yd the yards are shorter and he gets within
   1.0 yd, but without contact.
5. **Held.** The exchange is seen at 1.10 s (pitch 0.55 s), and from then
   on the squeeze arm's Toss is the support arm's (same tackle, same yards
   at 8⅓).

**PA cost.** The geometry cost is clear and the same at every split. The
outcome is incomplete in all arms because the QB leads Z 1.3–1.8 yd past where
Z gets to (ball at (62.5, 14.2) at 4.22 s; Z at 61.2 in squeeze, 60.7 in man),
with the corner 4.7 yd behind in squeeze vs 2.4 in man. That's an open Z,
overthrown: a passing-lane question, not a coverage one. Not fixed here.

**Stop rule** (two attempts where the choice never fires on today's defaults
or fires with no PA cost): **not hit on attempt 1.** It fires on defaults on
every call, and PA charges 2.4 yd of depth and 2 yd of separation.

### Ordinary games, matched

`scripts/diag/cov7-squeeze-matched.ts games`: seeds 7 and 8, the game played
with `STALK_SQUEEZE=0`, every scrimmage snap replayed in both arms.

| | Seed 7 | Seed 8 |
| --- | --- | --- |
| Runs: fired / took the fit / changed | 33 of 41 / 11 / 19 | 28 of 48 / 12 / 24 |
| Runs where it fired, mean yards off → on | 6.05 → 6.29 | 8.36 → 6.22 |
| PA: fired / changed | 0 of 7 / 0 | 1 of 9 / 1 (P72, PA Flood vs Cover 3 Match: 25.4 → 38.4) |
| Other passes: fired / changed | 4 of 82 / 0 | 5 of 84 / 0 |
| Plays changed without firing | 0 | 0 |

- Nothing changed on a play where the squeeze didn't fire.
- Run yards move both ways across seeds: no claim from 89 runs.
- It fired on 9 ordinary non-PA passes (smash, drive, four verticals,
  dagger) against man and match calls, changing none of them. Those
  corners read run and saw a low, closing receiver; why they read run on a
  dropback is a recognition question to look at next, and is logged below.
- The paired-play grid count (`grid` mode) didn't finish in this session.

### Open

- **#293** (throw reaction) also edits `defense.ts` and can move the PA
  arm's timing. Re-run these fixtures after it merges.
- The 9 ordinary-pass activations (recognition read run on a dropback).
- The overthrown open Z on the PA fixture (QB lead vs receiver arrival).
- A run fixture where the corner's decision, rather than his presence,
  decides the yards on default switches is still to be recorded.
