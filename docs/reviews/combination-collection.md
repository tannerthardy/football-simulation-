# Combination release and collection: bounded result

**No controller change is promoted.** The one acquired-check trial improves
G73-I48's actual linebacker protection, but loses first-level protection in a
preserved wide-zone control. It is archived at
`4074038c4cd966e1c213e204ca47d528e7260968` and withdrawn from the final tree.
Final runtime/config/production tests are byte-identical to PR #5's starting
`3fac00b` and PR #4's `b64910e`. Comparison remains **4ded6b6**; shared World,
movement files, capacities, roster generation and experimental hands are unchanged.

[Final validation](combination-collection-validation.json): 81 focused checks,
typecheck and build pass. The prior 1,673 TypeScript / 145 Python full validation
is reused because runtime/config/production tests are unchanged; it is not
reported as a newly run full suite. The archived trial passed 90 focused checks
and typecheck, but failed the football control below.

The useful general principle is **a combination exchange must preserve access
control until the runner arrives, while giving the departing player an
achievable collection**. Live hands, a square chest, good support, a climb event
or even a loaded linebacker block are individually insufficient. Earlier is
sometimes useful, sometimes harmful; yards cannot certify the exchange.

## Exact inputs and sources

[The receipt](combination-collection-receipt.json) records every flag, source,
input and ending. Node 22.23.3, center World, experiments off except the one
candidate `STRETCH_HELPER_CHECK=1`; no hand-policy combination was tested.

- Original native witness: roster RNG 71, strength .55, generated home then
  away, game 73, zero-based log index 48, play seed 2986046475. OZ weak,
  Offset I 21, flip true, third-and-two, LOS 72.5. The saved census was collected
  on source `fb924f...` with experiments off. It is exactly reproduced on final
  source `09c65f...` **and directly on actual 4ded6b6/source `8433e8...`**, including
  the complete `eca2500...` state/RNG history and 2.90-second tackle ending.
- Trial runtime hash `2da6243f85f0b48663f07eb9e273e98a223eeb3db2f55d648bd48fcea205828c`.
  Its named native snap is cloned after the original game prefix, preserving
  fatigue, scouting, audibles, perceptions and all object identities. The
  untouched clone must match the saved complete history. Each counterfactual
  is observed/plain exact. The candidate installation is applied only to this
  snap, with the preceding game prefix unchanged.
- [Ten transfer controls](combination-collection-inputs.json) reuse actual
  4ded6b6 results: eight previously successful OZ/WZ second-level blocking
  inputs across three existing generated roster pairs, plus two Duo controls.
  Selection preceded candidate results. No additional census or game campaign.

## G73-I48: what actually fails

[Consumed cues, bodies, support, commands and keeper loads](combination-native-trace.json)
retain the original acquisition times. At .80 s, RT already carries DE_W with
about 375 N of transmitted hand load, full support availability, .612 yd
separation and .034-quarter-turn chest error. RG remains unjoined. At 1.05 s
his ordinary picture places LB_W 4.04 yd away; at 1.30 it places him at
(75.874,20.978), flowing (-1.778,-2.240) yd/s, from a .30-second-old sample.
The keeper remains loaded and facing the end. These are opportunities to
investigate departure, rather than orders to leave on those clocks.

The installed full stretch double requires actual joining before its personal
release path can work. RG does not join until about 1.85 s. His first joined
confirmation is 1.90, release 2.15, and LB_W contacts the RB at 2.30. The RB took
the handoff at 1.60. This is an assigned backer left uncollected, not an
unaccounted defender or a defender winning a block against RG.

At release RG is moving (.559,-2.630) yd/s. His consumed LB picture is
(73.195,19.399), flowing (-3.422,-1.658), age .30. He requests
(-.225,+.754) toward his meeting point; spacing delivers (+2.131,-1.750),
avoiding the moving keeper. Removing only RG's spacing after the original
release does **not** rescue collection or the run (-.26 to -.46 yd). This is
not evidence for disabling teammate safety.

[Frozen interception controls](combination-interception-controls.json) use the
actual request, acquired picture and complete body/support state. The free
forecast barely reaches the predicted backer at +.15 s, the same tick as the
runner's contact. Against the subsequently recorded real backer path, it is
still .283 yd outside strike range then. Three existing OL locomotor profiles
and their geometric mirrors have the same qualitative result; no capacity was
tuned. Those are empty-space capability contrasts, not native roster changes
or knowledge available to the controller. The delayed picture's flow forecast
changes; an attainable predicted touch is not timely actual protection.

| Departure counterfactual | First RG→LB_W load | Gain | Interpretation |
| --- | --- | --- | --- |
| Native, release 2.15 | none | -.26 | Too late to collect before arrival |
| Forced .30 | 1.45 | +1.30 | No keeper hands yet: better yards do not certify permission |
| Forced 1.05 | 1.75 | +1.67 | Earlier collection is physically possible in this input |
| Forced 1.30 | 2.05 | +1.96 | Useful load before arrival, original end still accounted for |
| Forced 1.55 | 2.10 | -.60 | Acquiring hands alone fails to protect the route |
| Forced 1.80 | none | -.53 | No timely collection |
| Actual acquired-check candidate, release 1.30 | 2.05 | +.23 | LB_W stays blocked; first runner contact becomes LB_M at 2.85 |

All end by 3.90 s; none is censored. Forced departures happen before the tick's
decisions and omit normal exchange bookkeeping. The actual helper release
happens after RT's update; their first different keeper request is at 1.30,
because the forced case lets RT consume his solo zone read that tick. Thus the
forced endpoint is not the promised result of an implemented release policy.
The tested candidate nevertheless retains RT's real end block through 2.85,
and transmits RG→LB_W load from 2.05 through that runner arrival.

## The unblocked people

There are nine blockers after reserving QB and RB. The installation accounts
for four DL, three LB and two corners; both safeties remain free. That is a
normal numbers constraint, not eleven defenders who must all be blocked.

| Defender(s) | Installed responsibility | Native evidence / diagnosis |
| --- | --- | --- |
| DE_W | RT + RG, then RG→LB_W | RT carries actual load from .55 through the ending; first-level end is accounted for |
| DT_W | C + LG, then LG→LB_M | Loaded from .45; LG releases 2.10, but never loads LB_M before the 2.90 ending |
| DT_S / DE_S | LT / Y | Loaded first-level blocks; neither causes first runner contact in this play |
| LB_W | RT/RG combination | Primary uncollected threat; own carrying-RB cue is present by 2.15, age .20; real wrap at 2.30 |
| LB_M | C/LG combination | A second collection/arrival gap; becomes the first stopper when LB_W is protected |
| LB_S | F lead | Assigned, never loaded. F follows the residual backside LB rather than leading along the RB's weak-side route; by 2.15 the flowing LB is 1.56 yd across from F and still outruns his collection |
| CB_W / CB_S | X / Z stalk | Never loaded, but remote from this runner before the whistle; no demonstrated bust |
| FS / SS | no blocker assigned | Intentionally free deeper threats; no demonstrated missed assignment |

F's job deserves a separate assignment/interception test: reserving both nearer
LBs for combinations leaves the fullback chasing the remaining backside LB.
The present trace establishes the mismatch and failed collection, not that a
particular replacement job would preserve all first-level work. Do not silently
reassign F or delay the runner to make RG's late climb look successful.

LB_W's fast flow through an open route is information-consistent: he reads run
at .30 and later sees carrying RB. He never wins an offensive hand fight in the
original play. The loss is therefore not explained by a universally superior
defender. Legitimate defensive fits and later tackles must remain possible.

## Why the one correction was withdrawn

The trial permits an original unjoined OZ/WZ helper to check his keeper using
existing personal cadence, stable confirmation, acquired chest orientation,
real keeper hands/support/control, first-level threat and departure-corridor
checks. It uses existing assignments; no private future runner path or new
capacity. Ninety focused assertions pass, including mirrored loaded departures,
missing/separated hands, poor support, a stale chest picture and an unaccounted
near-level threat. That establishes useful contracts, not football transfer.

Seven of eight OZ/WZ controls retain **exact complete World-input/output
histories**; their extra check bookkeeping means they are not complete
state/RNG matches. Both Duo controls retain complete state/RNG histories.
The eighth, `new-wz_strong-s23`, is adverse:

- Native: RT joins/helps the Y→DE_S surface and departs at 1.65. LB_S gets
  loaded before runner contact at 3.75; gain +1.448 yd.
- Candidate: RT checks and leaves at 1.20. Y's existing contact looks square,
  loaded and supported, but DE_S later crosses it. RT never loads LB_S;
  DE_S contacts the runner at 2.50 before LOS; gain -.720 yd.
- RT's actual acquired keeper picture at release: Y (40.630,21.862), facing
  -.962, age .05; DE_S (40.956,21.323), flow (.001,-1.952), age .25;
  LB_S (43.293,22.817), flow (-1.604,-1.080), age .25. The requested climb follows
  his assigned backer. The error is not a wrong-side command.

[The compact paired trace](combination-keeper-trace.json) includes those consumed
peer cues; observing them preserves the failed case's full history exactly.
The failure disproves momentary-contact certification as a sufficient keeper
rule. We stop here rather than add a TE exclusion, strength threshold, release
timer or another reach/angle exception. No expanded panel follows a failed control.

## Portable blocker and ownership

[The 12.7 KB two-body Y/DE_S witness](combination-keeper-world-witness.json)
reproduces the release-step World output within 4.45e-15 in position, velocity,
facing and spin. Its separate free-motion control has zero ground/yaw impulse,
zero body contacts and zero strikes, yet changes angular momentum by
**+4.7644624349 kg yd²/s**. Linear residual is recorded. Active hand motor is
off; removing drive gives the same passive defect. This extends the existing
shared contact dependency into an ordinary combination-release control.
It does **not** prove that defect caused the football endpoint, nor certify
the endpoint as a legitimate defensive win. The sole physics owner must
resolve/review that law independently and return the same native interval.

Blocking owner: after that review, compare the safe G73 RT keeper and unsafe
WZ Y keeper using developing route protection and achievable helper departure,
with release/read ordering preserved. Keep the original successful combination
and mirror as permanent controls. YAC owner: no shared movement file changed;
the late spacing conflict and frozen interception witness are available for
movement composition review, but spacing removal failed this run.

Reproduce under Node 22.23.3 on the final branch:

```sh
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/combination-release-ablation.ts out/combination-collection/repro.json --native-only
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/hand-action-world-replay.ts --witness docs/reviews/combination-keeper-world-witness.json
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/combination-interception-witness.ts docs/reviews/combination-interception-witness.json
```

To reproduce the rejected controller, use an isolated checkout of `4074038`,
its Node 22.23.3 setup and exact saved manifest. Run the panel with only
`--flag STRETCH_HELPER_CHECK=1` and `FLOW_INPUTS` pointing to the ten-input
manifest, `CONTACT_TRACE=1`; `FLOW_PEERS=1` on the final diagnostic collector
adds observational teammate cues. The native ablation script's `--trial` arm
uses that same archived source with default prefix flags. No baseline designation
or merge is authorized by this receipt. `RUN_CONTACT_TRACK`'s parked collision
witness remains separate.
