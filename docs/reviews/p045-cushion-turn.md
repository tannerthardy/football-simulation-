# P045 cushion-to-turn: local continuity is insufficient

October 15, 2026 (America/Phoenix).

**No new corner candidate is ready for integration.** Hip opening introduces a
second abrupt change in the movement request. Smoothing that change improves a
short same-body preview, but native execution reaches the catch slightly closer
and slower. Combining it with the parked cushion correction magnifies that
tradeoff. All prototypes are archived; production remains unchanged.

The useful new finding is later in flight: all four arms request movement toward
the same stationary point. Earlier position gains enter its arrival-braking
region sooner. This explains an important part of the lost speed without
changing physical turning, braking capacity or random execution.

[Exact evidence, sources, all flags and receipts](../../data/reviews/current/p045-cushion-turn.json) ·
[Same-body previews](../../data/reviews/current/p045-turn-previews.json) ·
[Frozen native inputs](../../data/reviews/current/p045-defensive-inputs.json) ·
[Earlier diagnosis](p045-defensive-diagnosis.md)

## PR #63 controller review: approved and handed to Integration

The [published controller-owner review](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200453995)
approves the revised zone-key contract and recognition contribution. Publication
`0f70bb2a4205497d7df8ed1ed59391d87084c603` has the same source/test/tool/settings
as tested `a862a05713d0b8bbd22683ce8a70d5ac16eb18e2`. Independently recomputed
source SHA256 is
`2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad`.

A waiting upright local receiver supplies no blocking evidence: the revised
expectation is **unsure**, not an automatic run or pass declaration. The existing
opposing controls retain releasing local key **pass→pass**, low pads
**run→run**, and own-contact geometry **run→run**. Changing distant X movement
does not change the selected local-key trajectory. No numeric threshold was
relaxed. Recognition uses its acquired picture and observer-local contact
geometry rather than private call, engagement label or remote teammate state.
Geometry remains evidence, not proof of transmitted load.

This was a read-only review of pinned code, controls and receipts. **Zero tests,
simulations or suite reruns for #63.** Reuse Integration's passing 1,720 TS / 145
Python / typecheck / build receipt. This approves the assigned recognition
contract, not unrelated contributions or a merge. #58 and #61 remain separately
reviewable; none of the corner prototypes below was added to those PRs or #63.

## Separate the request change from physical turning

P045's actual corner is **H2-CB2 / CB_W / index18**; catcher is **A2-WR1 / X /
index8**. FS **H2-S2 / index20** and its legitimate #2 responsibility are unchanged.
Accepted develop was pinned at `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, source
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
Inputs and physics are identical to the earlier accepted-source comparison.
Historical experimental outcomes are not current baseline measurements.

The earlier abrupt cushion contraction occurs at 1.15 s. A second request drop
occurs at hip opening, 1.35 s: the feedback gain changes from 1.6 to 2.673469
while the body still faces backwards. Forward request falls from 3.307 at 1.30 s
to 2.197 yd/s at 1.35, despite acquired receiver forward velocity increasing
5.816→5.972. The body has not instantly completed the requested turn.

Three saved complete bodies and consumed pictures, plus one counterfactual
acquired crossing picture, isolate the change using existing World previews.
Each holds one command for .6 s in empty space; it is not a native play forecast.
The crossing control retains the original .15 s picture age; it does not create
a new sensing opportunity. Reconstruction matches the three actual straight
requests within 1e−9 and previews do not mutate the saved source body.

At 1.15, removing the backward-facing request while keeping the same low
velocity request changes yaw but **does not change translation** over .6 s.
Earlier turning alone cannot overcome that low requested movement. At 1.35,
keeping gain 1.6 while requesting the existing turn changes forward request
2.197→3.637; after .6 s, achieved forward velocity is 2.129→2.967 and error to
the moving coverage goal is .878→.514 yd. The acquired crossing control remains
responsive; the orientation-blended and original requests coincide there because
the existing braking cap binds. No crossing improvement is claimed.

The isolated prototype blends off-man gain from 1.6 to its existing tracking
gain using **own actual orientation and acquired receiver travel direction**.
It changes no hip-opening trigger, target, sensing, timer, press/trail/top
technique, ball policy or capacity. Its first native change is 1.35 s, with all
incoming bodies and consumed cues exactly equal. The [patch](../archive/research/catch-contact/p045-turn-feedback.patch)
and [nine-check specification](../archive/research/catch-contact/p045-turn-feedback.test.ts.txt)
are preserved outside the active source/test suite because the native result
does not justify promotion.

## Native 2×2 comparison: closer but slower

The original and cushion-only tapes are reused. Only turn-only and combined
arms were newly executed on P006/P010/P045, with recorded/plain neutrality pairs.
Each entry below uses the same actual corner at release (2.25 s) and immediately
before the catch step (3.75 s). Negative radial closing means separation grows.

| Arm | Gap at release, yd | Gap at catch, yd | Achieved speed, yd/s | Radial closing, yd/s |
| --- | ---: | ---: | ---: | ---: |
| Accepted unchanged | .828 | 2.485 | 7.553 | −1.164 |
| Cushion only | .572 | 2.301 | 7.208 | −1.492 |
| Turn feedback only | .747 | 2.435 | 7.514 | −1.206 |
| Combined | .536 | 2.300 | 7.151 | −1.529 |

P045 completes to X for a roughly 49.50-YAC touchdown in every arm. None records
post-catch contact or a grasp on X; grip survival therefore cannot be measured
here. The touchdown is not a failing assertion. The adverse evidence is slower
achieved arrival and worse closing despite better early position. A lower YAC
ending was never required to count a mechanism improvement.

**P006's successful rear-form tackle is exactly identical in all four native
signatures**, actual NB A2-CB3 tackling H2-WR2. P010 is a completion/tackle on
this accepted source in all four arms; YAC is .323 / .013 / .000 / .054.
The historical-source interception remains earlier evidence, not a new turn-only
control or proof that current source preserves that historical ending. Recorded
and plain executions match in each new case. No unfinished case is scored as a
defensive success.

## Why the early gain is absorbed in flight

Fit one point from the accepted 3.05-s raw request using the existing ordinary
`playBall` arrival law. That yields **(59.68600, 39.04116)**. Keeping that one
point and the unchanged law predicts the other **39 commands across all four
arms from 3.05–3.50 s**, maximum velocity residual 9.3e−15 yd/s. This is not a
separate fit to every row. The point also agrees within .08 yd with the rounded
recorded ball frame at 3.65 s.

At 3.40 s the accepted corner is 5.868 yd from that point and requests 8.294
yd/s. The combined corner is closer, 5.293 yd, and requests **less**, 7.917.
All four use the same stationary-point arrival braking. Better early coverage
position therefore brings earlier deceleration toward that landmark, which
accounts for much of the lost approach speed. Altering physical turn rate is
not supported by this evidence.

For the accepted body at 3.05, the point is already outside a generous necessary
reach bound: distance 8.409 yd versus 8.129 yd even allowing instant maximum
speed, arm reach, .15 yd spatial allowance, and a 3.75-s deadline (.10 s beyond
the recorded near-point frame label). This is an offline bound, not runtime
knowledge of the eventual catcher or an interception award. The same
impossibility is **not** asserted for every closer prototype body.

The request equation identifies a shared objective. It does not independently
prove which upstream ball-approach branch selected it, nor establish the best
informed replacement. A reachable ball contest can correctly require slowing.
The next useful bounded question is whether an already-late ball landmark
should retain a moving defensive approach using available ball/receiver cues,
while preserving attainable contests and uncertainty. That needs a saved
consumed-flight-picture decision witness and a reachable-contest opposing
control before any production change. No new flight policy is implemented here.

## Evidence cost, exact sources and reproduction

New work: **46 focused turn-only checks pass; 12 native play executions**
(two arms × three saved cases × record/plain). Accepted-source red evidence is
three new continuity assertions failing and six opposing checks passing; these
are prototype assertions, not newly failing preserved tests. Combined has native
comparison/neutrality only and was rejected before more certification. Four
same-body preview inputs × three models × 12 World steps add no native plays.
Launcher commands total **14.99 s**. Zero new prefixes, full games, NFL queries
or full suites; no fresh-play transfer claim. No production source is changed.

| Arm | Engine SHA256 |
| --- | --- |
| Accepted | `e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54` |
| Cushion only, reused | `92a1343c36f961d93756b50a24f69a839ef33f94ea04a4cbe92cca8ef016bd85` |
| Turn only | `5407387b42adbaf7b1b57c48b453acd0e39d12aa5dfaba3cea157416646f5d01` |
| Combined | `31cde629773c7eda583160be90026f92021c7311e98c21f3e1d87e1978703212` |

Turn-only/combined were measured from checkout `8b47d9e0187574d96fe9bbc8a4955b9af6595881`
with the recorded temporary patches. Node22.23.3, lock hash, full 44-key flag
profile and unchanged World defaults are embedded per arm and per launcher in
the packet. `CF_FLOW` is unset, not silently enabled. Fixed input SHA256 is
`60c1f27e6f940b13eb8dc95a447ceeac449ea3ef11bf633264694b4a7649168d`.
No ambient experimental flags were adopted.

Reproduction commands (not an instruction to repeat compatible evidence):

```sh
# Accepted source, or a separately patched experimental worktree for another arm.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs inspect data/reviews/current/p045-defensive-inputs.json out/p045-reproduce/accepted.json.gz
# Preview script requires accepted source and the corresponding native tape.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-turn-preview.mjs out/p045-reproduce/accepted.json.gz data/reviews/current/p045-defensive-inputs.json out/p045-reproduce/previews.json
```

The archived turn patch applies to accepted source; adding the earlier archived
cushion patch reconstructs the combined arm. Copy the archived turn test into a
temporary test path only when reproducing its prototype checks. Neither archive
is a proposed integration diff. Keep helper coordination, #58/#61 recognition
and sensing changes, roster corrections and shared physics independent.
