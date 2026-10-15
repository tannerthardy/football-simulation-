# P045: the first proven request defect precedes the throw

October 15, 2026 (America/Phoenix).

**The first demonstrated controller error is an off-man approach discontinuity
at 1.15 s, before the safety's help choice and before release.** Its isolated
continuity prototype improves early corner leverage but does not repair P045;
it also reduces achieved corner speed at catch. It is archived, not promoted.
The safety's late help cannot be treated as an established roof, but it creates
two legitimate ball contests. Removing that help produces an incompletion
through changed random-draw ordering, with the same receiver catch probability.
That is not better defense. The catch-to-pursuit transition is not the first
failure. No production controller change is proposed from this investigation.

[Exact comparisons, flags, receipts and failures](../../data/reviews/current/p045-defensive-diagnosis.json) ·
[Restartable selected inputs](../../data/reviews/current/p045-defensive-inputs.json) ·
[Measurement's unchanged NFL query result](../../data/reviews/current/p045-nfl-week1-return.json)

## Scope, identities and sources

Accepted develop was rechecked at `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`,
engine SHA256 `e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
P045 is the original experimental spread-air game, roster seeds 27101/27102,
game702, evidence `4ae667e29b3ce085f43c5cb911b294349cda2b8f`, recorded engine
`f62511a513f2187884d74ae3b94435835e43309c` / `dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba`.
Historical evidence has not been renamed as a current-source measurement.
The new same-setup accepted-source comparisons are separately recorded.

P045's actual target/catcher is **A2-WR1, X/index8**, the W1 post within
Y-Cross. **H2-CB2, CB_W/index18** covers X. **H2-S2, FS/index20** keys #2/H
under weak-side Quarters MOD. #2 is a genuine route threat, not permission to
send the safety toward the eventual catcher before observing the throw.

The useful P006 tackle is **A2-CB3, NB/index19**, on **H2-WR2, H/index10**.
Historical P010 is **H2-CB3, CB_S/index18**, intercepting the pass intended for
**A2-WR5, Z/index9**. The pass target and actual intercepted carrier remain
distinct. QB contact at P045 2.15 s is not receiver contact.

#58's blocking-read correction and #61's incidental-flight acquisition remain
independently reviewable. Neither is part of these runtimes. Shared spacing,
helper assignments, physics, grips, braking, ratings, perception opportunities
and release rules were not changed. The archived smoothing probe changes only
one existing man-coverage cushion objective.

## 1. Corner approach: a real defect, an insufficient repair

The original controller holds a shrinking off-man cushion, then cuts its
remaining size in half as observed route depth crosses three yards. At P045
1.15 s, that changes requested forward speed **5.11 → 2.29 yd/s**, although
the acquired receiver continues accelerating. At 1.20 s the request is 2.63.
The defender has not yet opened his hips. This is a chosen movement request;
physical speed limits or a later catch transition did not cause the request jump.

An actual-controller fixed-body probe, changing acquired depth by .0002 yd,
produces a **3.05 yd/s** request jump. It recurs on three generated rosters.
The small prototype narrows the cushion continuously between existing early
and developed-stem depths. On the exact native input, its first change is at
1.15 s with **all incoming bodies and consumed cues identical**. It makes no
new observation, random draw, route lookup or capacity change.

| Accepted-source P045 measurement | Original | Continuity prototype |
| --- | ---: | ---: |
| Forward request at 1.15 s, yd/s | 2.29 | 5.28 |
| Corner downfield lead at release, yd | −.617 | −.157 |
| Corner gap at release, yd | .828 | .572 |
| Corner gap before catch step, yd | 2.485 | 2.301 |
| Achieved corner speed before catch step, yd/s | 7.553 | 7.208 |
| Relative closing speed at that step, yd/s | −1.164 | −1.492 |
| Velocity heading difference from receiver, degrees | 2.04 | 1.35 |
| Actual receiver contact / grasp | None | None |
| Completed outcome / YAC | TD / 49.50384 | TD / 49.50385 |

A smaller gap does not establish a better tackle opportunity. At catch the
prototype is more parallel but slower, still trailing and losing distance.
That adverse achieved movement outweighs a prettier early request. The
historical-source comparison also keeps the 49.52-YAC TD. No arrival gate,
forced tackle, extra delay or stronger rear grip is justified by this probe.

The [parked patch](../archive/research/catch-contact/p045-cushion-continuity.patch)
and [six-check specification](../archive/research/catch-contact/p045-cushion-continuity.test.ts.txt)
retain this unsuccessful experiment outside the active engine/test suite.
26 focused candidate checks pass, including existing Quarters/Palms rules,
judgment contracts, acquired-versus-hidden information, real plant response and
three-roster continuity. Those are not fresh-play football transfer or
integration certification. No typecheck/full-suite promotion was attempted.

## 2. Safety help: late recovery is not an established cap

At 2.10 s the exact consumed rule is `q_safety`, mode unset, followed by
judgment `protect-vertical:X`. X is declared vertical at 9.682 yd with observed
velocity (7.494,0). H remains declared vertical at 6.970 yd, but an acquired
plant has reduced the route reader's forecast to (2.564,−1.138). The underlying
consumed H picture is still (4.69,−.71), age .25 s. Forecast deceleration is an
inference from observed movement, not proof that #2's threat disappeared.

At 2.15 s the installed rule commits to carrying H (`mode=two`), while judgment
continues overriding to X. Its own-threat guard requires forecast vx>3, so H's
still-vertical declaration no longer protects the primary responsibility.
This is a specific future coaching question about reconciling a declaration
with an observed plant; it is not a mandate to send the safety to X earlier.

The safety starts help almost stationary and turning: actual velocity
(−.558,−.447) yd/s, while requesting (8.005,5.164). The saved-picture estimate
cannot intercept X's unchanged observed straight stem within its three-second
search horizon. A hindsight estimate to the actual catch vicinity takes about
2.09 s against 1.65 s remaining, but uses approximate body reconstruction and
is not a supported-World impossibility proof. Measurement's stronger midpoint
necessary speed bound remains separately pinned. Neither is live knowledge of
the eventual catch point.

Crucially, **covering X over the top and playing the airborne ball are different
opportunities**. The baseline safety actually reaches the earlier ball corridor
and executes defenderPlay at 3.35 and 3.40. Both contests fail. By catch he is
still about seven yards from X, so there is no rescue tackle or grip to blame.
The call/route distribution can legitimately create an offensive win after
those failed defensive chances.

A diagnostic arm executes this safety's installed primary before the throw,
while still running the original judgment's consumed reads, cadence and draws.
It resumes ordinary ball perception/contests during flight. This is a
one-witness ablation, not a production helper rule. It keeps H, loses both
ball-contest opportunities, and leaves X, QB and corner motion through the
original catch unchanged. Recorded ball positions match through 3.70 s; their
.1-yd rounding is retained rather than claiming unrecorded flight-state equality.

| P045 receiver catch at 3.75 s | Baseline | Primary-only diagnostic |
| --- | ---: | ---: |
| Receiver catch probability | .6540259847 | .6540259847 |
| Uniform draw | .2178937576 | .9588896884 |
| Catch succeeds | Yes | No |
| Prior FS defenderPlay draws | .9588896884, .8137809271 | None |

Different earlier opportunity/looking draws shift the shared stream. The
primary-only arm's incompletion is **execution ordering, not increased pressure
on the catch or a smarter approach**. Passive catch audits reproduce each
cached native signature exactly, and each matches its uninstrumented execution.
Do not report this incompletion as zero YAC, a successful tackle or evidence
that all discretionary help should be removed. No new randomness model is proposed.

## 3. Catch-to-pursuit transition and contact control

The corner is already trailing before release and roughly 2.5 yd away before
catch. At 3.75 s the original catch-drive request is approximately (7.33,−2.29),
then pursuit requests (8.65,−4.99) at 3.80: it asks for acceleration, not a new
stop. The first loss is therefore earlier than the transition. This does not
certify pursuit globally; it rejects that boundary as P045's first defect.
There is no recorded post-catch receiver contact or loaded grip in P045, so no
force, grip-survival or recovery-law inference is available from it.

P006 supplies the useful opposing outcome. Its actual NB/receiver pair reaches
body contact at 3.35, wrap at 3.65 and first solved form+behind grasp at 3.70:
force **1,307.23 kg·yd/s²**, capacity **1,601.65**, leg coupling **.5133**,
not slipping. It finishes a tackle at 4.40 and −.079 YAC. The continuity
prototype preserves its entire native signature on both source comparisons.
Successful rear tackles do not require a global grip boost.

Historical P010 remains an interception by the same corner under the prototype
(release moves 2.50→2.55 s). **On current accepted source this frozen setup
already completes before the prototype**, with release at 2.40; its candidate
completes at 2.45 and tackles after .013 rather than .323 YAC. This pre-existing
source-transfer distinction is retained, not credited to or concealed by the
candidate. Historical controls are not current-source outcome guarantees.

## Measurement handoff and contest research

Measurement owns the reusable query at `81e43e7279a26c43f2ae5ea29a2282316f42899c`.
We supplied the [verified existing restoration](../../data/reviews/current/bdb2025-existing-restoration.json)
and executed its unchanged `d0ebac7` wrapper here because its executor lacks our
filesystem. Four CSVs, the existing 1,219,840,421-byte ZIP and all three pinned
Python modules passed their checksums. No download, extraction, competing NFL
collector, filter widening or engine import was needed for that execution.

[Returned result](../../data/reviews/current/p045-nfl-week1-return.json): 13,975
bytes, SHA256 `7911a33decb4ce9f2dfef768f37c527936e573506664b273d231b6c0d0f7f60c`.
Counts: 26 label candidates, 3 converted, 3 invalid, 1 geometry match, 1 contained,
**zero qualifying offensive-win witnesses**. The contained example is
2022091101-4104, actual target/catcher nflId 52595, fixed defenders 46527/52472.
It keeps original event/frame identities and excludes contact/future samples
from approach velocity. Defender 52472 retains positive downfield lead
5.5→3.7→1.4 yd while closing. The receiver is slowing/changing direction;
its pre-contact catch speed is about 4.61 yd/s. P045's receiver remains fast.
One illustrative contained POST/Quarters example does not certify a matching
MOD responsibility, roster capability or required tackle. The empty explosive
bin stays empty. [Result returned to Measurement](https://github.com/tannerthardy/football-simulation-/pull/58#issuecomment-6199846750).

The [previous primary-source BDB review](yac-tracking-followup.md#big-data-bowl-research-that-helps)
is reused. Opportunity creation versus conversion is useful; sampled missed-
tackle classifications, retrospective MOTT outcomes, eventual landing points
and ideal straight lines are not player knowledge or physical tackle laws.
P045's help ablation is a concrete warning against judging an approach by its
ending alone. No contest model, online learning or privileged cue was imported.

## Reproduce and next decision

Node22.23.3, all44 flags, `RUN_CONTACT_COMPONENTS=1`, experiments off, centered
hands/integration, legacy support, mean support integration and adaptive World.
The evidence records complete settings, each actual source/collector hash,
archived prototype source and failed checks. The historical archive's enclosing
Git HEAD is metadata about this research checkout; its actual archived source
is `f62511a`/`dd173a3e…`, not that enclosing commit.

The old passive prefix lacks restartable setup/full prethrow body state. One
necessary historical prefix recaptures 35 scrimmages plus three restoration
checks, verifies selected native stats/outcomes/frames, and publishes all three
inputs. **Reuse those inputs; no repeat prefix is needed**:

```sh
export PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs inspect data/reviews/current/p045-defensive-inputs.json out/p045-native/accepted.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs inspect data/reviews/current/p045-defensive-inputs.json out/p045-native/primary.json.gz primary-only
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs audit data/reviews/current/p045-defensive-inputs.json out/p045-native/accepted-audit.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs audit data/reviews/current/p045-defensive-inputs.json out/p045-native/primary-audit.json.gz primary-only
```

Run on the declared accepted engine to reproduce that arm. The parked patch
plus copied test can reconstruct the rejected prototype in an isolated checkout;
its accepted-base source must be `92a1343c36f961d93756b50a24f69a839ef33f94ea04a4cbe92cca8ef016bd85`.
The corresponding historical prototype is `e41747a674736d5849f825ce4f1b477373f993a92f967ccb2393d05fff61ee5e`.
Do not merge either diagnostic stack into #58/#61 or describe their combination
as tested. No active engine source change remains here.

Total: 68 native play executions including the one prefix/restoration checks,
32.39 s summed launcher-command time including the intended red checks;
5.01 s existing-archive/member verification and 15.49 s unchanged NFL query.
**Zero new full games or full suites.** No failed diagnostic invocation is
counted as a completed football outcome. The three candidate continuity checks
fail on unchanged develop and pass under the prototype; all 26 focused candidate
checks pass. They remain archived with the rejected prototype.

**Integration:** no additional P045 controller candidate is ready. Keep #58/#61
separate. The next smallest useful experiment, if this approach work continues,
is a same-body prethrow comparison that explicitly preserves a feasible moving
cushion/hip turn, with an acquired plant/crosser opposing control, and measures
achieved velocity through the catch. Do not retain the smoothing prototype just
because it removes a discontinuity, force the safety to erase P045, or discard
legitimate ball contests. A better candidate must improve achievable football
position while preserving #2 and offensive wins, then transfer to fresh plays.
