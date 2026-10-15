# P045: the moving approach never receives a receiver window

October 15, 2026 (America/Phoenix).

**The in-flight stationary objective is confirmed as fallback, not a selected
receiver catch window.** P045's corner receives no window in any of the 23
flight-aware decisions from 2.65–3.75 s. His command exactly follows the fallback
ball-landmark law even after that landmark fails a generous reach bound.
Consequently the existing moving-receiver approach is never eligible. Changing
its later arrival gates would not address this witness.

[Portable evidence, complete consumed pictures/bodies, previews and receipts](../../data/reviews/current/p045-flight-objective.json.gz) ·
[Earlier cushion/turn comparison](p045-cushion-turn.md) ·
[Unchanged frozen native inputs](../../data/reviews/current/p045-defensive-inputs.json)

This extends the diagnosis; the earliest demonstrated off-man request defect
remains the 1.15-s cushion contraction. No production change is proposed here.
Actual corner is H2-CB2 / CB_W / index18, actual catcher A2-WR1 / X / index8.
The safety's #2 responsibility and actual ball contests remain untouched.

## Consumed inputs identify the branch

The existing native recorder now has a `flight` mode. It passively copies the
flight path, tags and own speed scale, and evaluates the pure own-body
`catchSpot` estimator before the normal controller call. It makes no extra
`see` call, sensing opportunity, random draw or request. Existing recording of
consumed pictures, requests and full pre/post World bodies remains intact.

All three complete native state/RNG signatures match the previously saved
unchanged-source executions exactly; recorded/plain pairs also match. The
saved-input auditor mirrors the pinned private window selector using only
those consumed receiver pictures and existing public capability profiles.
Every P045 fallback request reconstructs with zero velocity residual.

| Witness / actual defender | Observed objective after throw recognition |
| --- | --- |
| P045 / H2-CB2 | 23 fallback drives, no receiver window |
| P006 / A2-CB3, NB | 14 observed H2-WR2 window drives; existing moving approach changes its command from 2.35 s |
| P010 / H2-CB3, CB_S | Three reachable-ball arrivals, then nine observed A2-WR5 carries |

Earlier rows lacking the consumed window-query pictures are labeled separately;
they are not invented window failures. Current-source P010 is the previously
documented completion/tackle, not the historical-source interception.

P045's fallback stays at (59.68600,39.04116), nominal flight time 3.70, through
3.55. At 3.05 it is 8.409 yd away. Even instant full speed plus arm reach gives
only 7.479 yd by its nominal time; the earlier report's more generous deadline
and spatial allowance also fail. From 3.60 it slides to progressively later
low/ground flight samples as the minimum lookahead advances. Those later
points still fail the necessary speed bound. They are not demonstrated tackle
intercepts or reachable interception opportunities.

The delayed acquired X motion does not satisfy either of the selector's
straight-path hand envelope or point-arrival estimates. At 3.05 its best
straight-path miss exceeds hand reach by 1.448 yd; minimum point-arrival slack
is +.224 s. Even at 3.75 the minimum straight-path miss is +.200 yd. This
explains the rejection from its inputs. It does not justify assuming that a
receiver cannot catch after continuing his break.

**Do not add the cue's age to its position again.** `PerceptionBuffer` already
dead-reckons sampled position with stale velocity. Age compensation would
double-count motion and conceal legitimate uncertainty about the developing
post. No private route, intended-target identity or later actual catcher state
was substituted into these decisions.

## Same-body opposing objective

Three actual unloaded corner bodies compare the recorded command with ordinary
`track` on the **already acquired assigned man**, using the existing movement
preview for .60 s. Both commands start from identical complete own state; the
inactive support clock is restored from JSON null to native −Infinity. Neither
trial acquires information or mutates the source body.

These are conditional held-command predictions against the same acquired
constant-velocity receiver hypothesis, not new live play endings or knowledge
of the receiver's next cut.

| Saved time | Heading error after .60 s, original → retain man | Radial closing, yd/s | Gap, yd |
| --- | ---: | ---: | ---: |
| 2.75 | 17.83° → 4.86° | −.517 → +.778 | 1.555 → 1.328 |
| 3.05 | 16.33° → 3.69° | −.365 → +.721 | 1.795 → 1.613 |
| 3.35 | 23.75° → 4.73° | −2.243 → +.377 | 2.722 → 1.980 |

This supports testing retention of the observed coverage objective when a ball
contest is already infeasible. It does not certify a tackle, contact geometry,
grip survival, better native YAC or a safe universal man-following rule. A real
receiver continues reacting, and the original command is updated every tick
rather than held for .60 s. The preview deliberately isolates requested angle
and achieved movement before spending on a candidate.

## Smallest next experiment and boundaries

Test one coherent observed-man objective across the flight/catch boundary when
the assigned man remains acquired and the existing forecast cannot produce an
attainable ball contest. Preserve the existing reachable-ball branch and genuine
receiver-window selection. Decide from the actual consumed cues and existing
interception/movement preview; no target-ID shortcut, fixed persistence timer,
new arrival gate, extra sighting, speed/braking change, forced delay or stronger
grip. Do not broaden a rule simply to include P173.

Start from these saved P045 inputs with P006's successful rear tackle and
P010's attainable ball/carry decisions as controls. Native evaluation must trace
achieved angle/velocity, first contact and grip entry/survival, with “no contact”
remaining distinct. A TD need not reverse. If the mechanism works, reconcile
the minimal candidate on current accepted develop and then check fresh players
and plays before promotion. Helper coordination, roster corrections, shared
physics and perception-policy redesign remain separate.

## Revision, costs and reproduction

Measured checkout `07bee7413ee02d7e417f046b599682a77dc9e0fc`, unchanged engine
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54` from
accepted `a1b16e6`. **Current develop is now `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`.**
Defense/common/catch-approach/perception and all physics bytes are identical
between those pins, supporting this local mechanism audit. Other accepted
changes include recognition and incidental acquisition; the old native tapes
are explicitly not a new-develop transfer result. #58/#61 are now included in
accepted #63; no experimental corner patch was imported.

Six new native executions (three cases × recorded/plain), 72 one-body preview
steps and two saved-data analyses cost **6.83 s of launcher commands**. No new
prefixes, full games, roster campaign or shared suite. All 44 flags, unchanged
World defaults, Node22.23.3, lock and script hashes are embedded in the packet.
Evidence SHA256:
`85650f17db66b2dc7067fae35553892e7820dec468bf24e720aee8ba1af16622`.

```sh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs flight data/reviews/current/p045-defensive-inputs.json out/p045-flight-new/native.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-flight-objective.mjs out/p045-flight-new/native.json.gz out/p045-investigation/accepted-native.json.gz data/reviews/current/p045-defensive-inputs.json out/p045-flight-new/objective.json
```

The second command expects the retained same-source accepted tape; its published
signatures and portable consumed inputs are in the packet. The first command can
recreate it without replaying a game prefix, using `inspect` and a fresh output
path if the local tape is absent. Do not rerun compatible evidence merely to
acknowledge this handoff.
