# Experimental checkpoint: film failures and bounded handoffs

**The failed handoff in the reel is real. Several different mechanisms also
produce the bad coverage, pursuit and ordinary rushing.** This audit locates
them in the existing games; it does not repair or promote runtime code. A
passing code suite did not establish that these football interactions work.

[Open the 16 annotated diagnostic clips and controls](../../data/reviews/current/experimental-film-audit/index.html) ·
[All-play scan](../../data/reviews/current/experimental-film-audit/scan.json) ·
[Complete compressed per-play index](../../data/reviews/current/experimental-film-audit/plays.json.gz) ·
[Machine-readable issue inventory](../../data/reviews/current/experimental-film-audit/issues.json) ·
[Witness manifest](../../data/reviews/current/experimental-film-audit/witnesses.json) ·
[Three failure paths](../../data/reviews/current/experimental-film-audit/failure-paths.png) ·
[Audit receipt](../../data/reviews/current/experimental-film-audit/receipt.json) ·
[Original checkpoint, eight complete film rooms and verification](experimental-game-checkpoint-2026-10-14.md)

## Scope and confidence

The offline scan covers **all 1,083 saved ordinary scrimmages**: 545 accepted
and 538 experimental, including flagged plays. Representative failures and
opposing controls receive a source/command/event review. This is not a claim
to have found every bug, or an independent coaching adjudication of every snap.
Six unfilmed two-point attempts and nonphysical special teams are outside the
film scan. **Zero additional snaps, games or code-suite runs.**

The experimental runtime remains the source tested at
`f62511a513f2187884d74ae3b94435835e43309c`, SHA256
`dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba`.
The accepted comparator remains `develop@a1b16e6`, runtime
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
Both recorded profiles have 44 flags and `RUN_CONTACT_COMPONENTS=1`.
Historical `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` stays separate.
No ref refresh is needed to interpret these immutable recordings.

Here **confirmed** distinguishes observable behavior or a code contract from
an inferred cause. A coverage loss or missed tackle is not automatically a
software defect. Standard recording has positions, commands, jobs, transitions
and events, but lacks complete consumed perception, body support/hand loads
and QB scored alternatives. Arrows in the audit viewer are requested velocity,
not achieved speed, force or gaze. Distances use nearest native sampled frames.

**Play IDs are `P = log.index + 1`, including special-teams log entries.**
They are not the ordinal among scrimmages; the viewer also shows `log.index`.

## What the complete scan finds

| Observation, including flagged plays | Accepted | Experimental | Interpretation |
| --- | ---: | ---: | --- |
| Intended exchanges |181|176|Installed QB handoff + RB mesh; all filmed designed runs in these games. |
| Intended exchanges with no exchange observed |11|9|QB remains the only offensive holder in saved frames; no handoff/pitch event. |
| Of those, clean plays |10|9|Separate from the earlier clean NFL comparison. |
| 25-second capped plays |7|5|Every cap in both arms belongs to the failed-exchange group. Not 12 independent contact-solver failures. |
| Runs with no credited rusher |11|9|Exactly the failed-exchange group in this sample. |
| Non-play-action pass calls with a secondary run-read event |67/319|74/318|21.0% / 23.3%; flags for review, not established bug rates. |
| Recorded catches with 20+ YAC |24|23|Includes two flagged experimental catches; the clean experimental count is 21. |
| Of those, no recorded post-catch carrier contact/wrap/miss/break |5|7|A different failure family from acquiring a hold that slips; absence of events does not prove no force between samples. |
| RB/blocker contact after a recorded handoff |20|44|Positive World-report contact with listed OL/TE/FB, ordinary snaps only; no automatic blame or NFL reference. |

These are overlapping observations, not counts to add together. Full-game
histories diverge; 9 versus 11 is not a controlled estimate that the bundle
repairs exchanges. The original checkpoint's broader teammate-contact operator
(120 versus 43 physical snaps) includes pre-exchange RB contact and tries; it
must not be substituted for this narrower after-handoff measure.

## Failure inventory

### EX-01 — exchange geometry/timing and missing recovery (first priority)

**Confirmed:** experimental west/spread **P22**, the reel's −5.79-yard run,
never hands off. It is Gun Doubles Outside Zone Weak, not play action or a QB
keeper. QB stays near `(62.3,29.8)` through 8 seconds while still holding the
ball. RB continues in `mesh`. The first recorded QB attempt/contact/wrap is
8.85/9.10/9.35 seconds; the tackle is at 10.20 seconds.

The installed mesh time is **1.15 seconds**. The closest sampled QB/RB
separation is **1.24 yd at 0.60 seconds**; by the first eligible exchange time
(1.00 seconds) it is **1.98 yd** and opening. Gun QB's fixed mesh is already
his starting location. After the moving back passes his landmark, he continues
toward the run aim without possession. QB's follow branch is limited to an
available teammate picture near that old landmark. There is no transition to
a failed-exchange/recovery state when those opportunities disappear.

[QBHandoff](../../src/sim/behaviors/qb.ts),
[mesh installation and RunnerToMesh](../../src/sim/assign.ts),
[actual handoff reach](../../src/sim/ball-transfer.ts) explain the interaction.
The exact teammate picture consumed at the missed window was not recorded;
its contribution must not be presented as a measured root cause.

**Supporting witnesses:** experimental power/zone P14 keeps the ball until the
25-second cap. All nine experimental failures are gun Outside/Wide Zone Weak.
Accepted west/spread P37 has the same formation/call and a capped failed
exchange. The problem predates this bundle.

**Opposing control:** experimental west/spread **P69**, Gun Doubles Wide Zone,
actually exchanges at 1.05 seconds and gains 5.13 yd. It is the same team and
formation, not the same game state or run direction. Preserve this success.

**Next decision:** repair the achievable exchange/cadence and a possession-aware
failure/recovery contract, using P22 and P69 first. Do not teleport the ball,
extend arm capacity, declare possession on the mesh clock, or import the held
gather/release/post-mesh trials as a shortcut. A successful opposing control and
a genuine keeper/play-action distinction matter more than another roster sweep.

### DEF-01 — the pre-exchange RB key can remain active indefinitely

**Confirmed code contract:** [executeRunFit](../../src/sim/run-fits.ts) treats
`carrier === qb && !scrambled && handoffAt < 0 && back exists` as premesh.
In that state it reads the RB's geometry instead of the QB holder. This has no
expiry or acquired contradictory-possession transition. It also suppresses
the normal declared-carrier chase branches. A run belief does not establish
that the RB actually received the ball.

This explains part of the apparent decoy pursuit on P22. It is **not true that
every defender permanently pursues the RB**: some keep support landmarks, some
retain man/match jobs, and DE_S eventually reaches the QB. The missing recovery
from a prolonged failed exchange is the actionable contract.

**Next decision:** establish what an individual defender can actually observe
about the failed exchange, then reacquire a holder or preserve an appropriate
fit. Do not give the entire defense instant global ball knowledge or make it
immune to real play action. Coordinate this with EX-01, but keep the defender's
information contract separate from the offensive exchange.

### LOG-01 — failed exchanges lose rushing attribution and hide losses

**Confirmed:** the nine clean experimental failed exchanges total **−45.73 yd**;
the ten clean accepted cases total **−49.37 yd**. They have no `stats.rusher`,
and the description prints `? runs for …`. [Game.recordStats](../../src/game/game.ts)
credits rushing yards/attempts only when a rusher is found (or a scramble supplies
the QB), so these ordinary failed-run losses disappear from player rushing
credit and team rushing/total-yard boxes. Field position still uses the play
result. This is a bookkeeping defect in addition to the controller failure.

The published clean-play checkpoint/NFL comparison reads native play gains and
already includes these losses; it is not based on the overstated rushing boxes.
Do not rewrite its committed receipts. A correction should attribute the real
holder/possession segment and retain the fact that the intended exchange failed.

### COV-01 — false run commitment pulls a hitch corner out of coverage

**Confirmed sequence:** experimental power/zone **P36**, All Hitch, is the
88.8798-YAC touchdown. CB_W is installed in `flat_w`, keys X, and commits to
**run at 0.95 seconds (`pPass=0.25`)**. X stays near sideline y≈6; the corner
moves inward to y=11.2 at 2.00 seconds and y=16.0 at 3.20 seconds. Throw is at
2.30; the corner only commits back to pass at **2.55 (`pPass=0.99`)**. At the
3.25-second catch he is 10.22 yd away; the nearest defender is FS at 9.03 yd.

[ZoneCoverage.update](../../src/sim/behaviors/defense.ts) allows run belief to
override its zone behavior. [Recognition.cues](../../src/sim/recognition.ts)
can count a nearby slow receiver as a stalk look (`t>.6`, gap<5, speed<3);
RB/QB proximity can also look like a mesh. These are plausible conflations of
quick-route braking/protection and run evidence. **The events establish the
misread, not which unrecorded cue caused it.** Recognition and run-fit source
are unchanged from the accepted comparator.

**Next decision:** trace the first contradictory acquired receiver/possession
cue on this ordinary hitch and a real stalk/play-action control. Correct a
demonstrated cue/commitment error without granting knowledge of the pass call.
Do not “fix” it by requiring every defender to read every pass correctly.

### COV-02 — correct pass belief still permits large man/crosser separation

**Observed football failure; first wrong request unresolved:** experimental
spread/air **P74**, Y-Cross, catches with SS 8.16 yd from H. SS is assigned
`man:H` and reads pass at **0.40 seconds**, so this is not P36's false run
read. The play produces 64.76 YAC with no recorded carrier contact or attempt.
The center safety initially carries other threats; post-catch pursuit does not
recover. Keep off-man cushion, hip turn, cross-field closing and help geometry
distinct from simple recognition.

**Next decision:** trace SS's consumed H picture and achievable request around
the release/break, with the existing immediate-wrap control below. Ratings,
momentum, attention and controller error remain possible contributors. Do not
infer “defender needs more speed” from separation alone.

### COV-03 — rapid rule changes repeatedly reconstruct coverage technique

**Confirmed transition sequence:** experimental west/spread **P101**, PA Flood,
has LB_M alternate `man:H` / `zone:hook_s` **seven times from 2.10 to 2.40
seconds**, including consecutive 0.05-second ticks. The pass is incomplete;
an outcome-only pass/fail check would not flag the coordination sequence.
[CoverageDefender.update/make](../../src/sim/coverage/defender.ts) constructs a
new technique whenever its directive key changes. Man release/hip-turn history
is local to that technique. Why the consumed rules toggle, and which state
ought to persist across a legitimate exchange, still need adjudication.

**Next decision:** inspect these recorded directive changes and the underlying
rule read before choosing hysteresis or state persistence. Preserve legitimate
handoffs between zones. This does not clear #34's parked COV-001/COV-002
contracts or authorize importing its branch.

### PUR-01 — pursuit crosses behind the runner without reaching a tackle

**Observed geometry; exact wrong request/body response unresolved:** in P36,
FS is ahead/inside at 4.00 seconds `(23.9,9.2)` while X is `(20.5,5.6)`.
At 4.50 FS is `(21.3,6.9)`, behind X `(21.9,4.5)`; closest sampled defender
distance is **2.47 yd**, with no recorded carrier contact/wrap/miss/break.
By 6.00 FS has run down toward y=.6 while X is already ahead near `(31.3,2)`.
This is a lost arrival/containment opportunity, not a slipping grip.

[chase/pursuitPoint/gatheringApproach](../../src/sim/behaviors/common.ts) use
delayed motion, forecasts, leverage and gathering;
[chooseApproach](../../src/sim/approach-control.ts) has a short free-movement
preview. These are already present and byte-identical to accepted develop.
After a catch, [onBallCaught](../../src/sim/assign.ts) changes defenders to
Pursuit, but retains body, perception and `runFit`; it does not erase all
leverage. Standard film cannot distinguish stale-picture error, a bad command,
unachievable braking/support or a legitimate receiver cut by itself.

**Next decision:** one near-approach trace around 3.8–4.7 seconds, using the
actual acquired picture and achieved body state. Preserve zone/reference P29:
Stick gains 9.00 yd, only **0.116 YAC**, with catch/contact/wrap at 3.15 and
tackle at 3.90. No global pursuit-speed or grip-strength increase follows.

### BLK-01 — runner/blocker interference survives successful handoffs

**Confirmed contact sequence; ownership of the mistake unresolved:**
experimental zone/reference **P61** hands off at 1.40, then contacts its own
LT at **2.60** before recorded opposing carrier contact at 3.35. Sixteen
positive RB/blocker World-report intervals total **758.82 kg yd/s**; the run
gains .83 yd. This is summed impulse exposure, not net momentum or a force-law
failure. On power/zone **P62**, LG/RB contact at 2.25 has **328.59 kg yd/s**
and coincides with an RB contact fall; the run gains .35 yd.

Runner steering, blocker surface tracking, information availability, coordination
and body recovery can all contribute. No per-PR causal attribution is justified
by this combined bundle. These witnesses should go to the run/awareness and
blocking owners together, with the shared contact observation preserved.

**Next decision:** examine the two actors' last consumed picture and first
conflicting request before P61's contact. Opposing control power/zone **P118**
has no positive RB/blocker contact, an ordinary defender grasp at 2.45 and a
1.69-yard gain. A short run is allowed. Do not add universal neighbor avoidance,
make blockers release automatically, or let the runner ignore colliders.

### INFO-01 — information ownership remains inconsistent after the catch

**Confirmed source debt; effect size unmeasured:**
[DownfieldBlocker/pickBlockTarget](../../src/sim/behaviors/receiver.ts) still
read true carrier/defender position, velocity, engagement/down status and other
blockers' private targets. The observer-owned teammate interface did not migrate
the whole engine. These access patterns can make pursuit/blocking coordination
unrealistic even when the animation looks successful. They can also *help*
blocking; removing them is not guaranteed to reduce YAC.

The older “DownfieldBlocker stands after a rejected engage” concern does
**not** apply to this source: it stands only when `engage()` succeeds, otherwise
continues the movement request. Do not copy that historical finding forward.

**Next decision:** migrate one demonstrated consumer contract with a hidden-state
invariance check and an acquired/tactile opposing control. Do not respond by
giving every controller perfect information or by disabling physical contact.

### PASS-01 / CONTACT-01 — serious outcomes requiring separate diagnoses

**Passing risk:** there are 26 experimental recorded interceptions including
flagged plays, 24 clean versus 13 clean accepted. Zone/reference **P11** throws
Smash to Y at 2.85; NB intercepts at 4.15 and Y tackles the returner. Standard
recording lacks complete QB alternatives/predicted risk, so this does not yet
prove whether the decision, prediction, execution or defensive play is wrong.
The packet preserves this risk rather than calling lower scoring progress.
Inspect one decision/release before changing risk thresholds or QB pressure
policy. Keep legitimate defensive interceptions and aggressive throws possible.

**Actual contact retention:** power/zone **P2**, Levels, produces 55.25 YAC
after a missed CB dive, an SS wrap at 3.85 that slips at 4.30, and a later FS
diving hold that slips at 6.45. This genuinely reaches acquisition/retention,
unlike P36. The opening experimental zone/reference P2 also breaks two holds
on its 34-yard run, versus 3.73 yd in the recorded accepted opening. Neither
favorable yardage nor an acquired hold proves correct loads. Reuse the physics
owner's relevant mechanical receipts, then inspect a short saved contact trace
if it could change the diagnosis. No experimental hands/grip solver promotion.

## Work order and cost boundaries

Follow [the existing tiny loop](../TESTING_COSTS.md), not a new suite for each
inventory item. Each local owner supplies one question, the nominated failure,
one relevant opposing control, directly affected correctness evidence and the
next decision. The suggested controls are reusable witnesses, not an order to
run every listed snap or a mandatory transfer ladder.

1. **Exchange/run controller + awareness:** EX-01/DEF-01, starting P22 and P69;
   repair attribution separately under LOG-01. This targets all five cap
   witnesses' shared failed-exchange family without another game campaign.
2. **Coverage/recognition:** COV-01's ordinary hitch first; distinguish COV-02's
   man/crosser and COV-03's rule churn. Do not combine all three candidate fixes
   before a local answer is demonstrated.
3. **Pursuit/arrival:** PUR-01 with P29's immediate wrap as an opposing control;
   separate it from actual acquired-hold contact work.
4. **Run/blocking coordination:** BLK-01's two-actor first conflict. Keep the
   current adverse information evidence and unique rejected trials intact.
5. **QB and physical-contact owners:** one scored throw and one short acquired
   hold where the missing telemetry could change the next action. No broad
   risk/strength tuning from aggregate INT/YAC.

These are handoff destinations, not claims that new messages were sent or
that other workers accepted assignments. Their existing branches remain
independent. Full combined verification belongs to one integration owner only
after there is an actual coherent runtime candidate. Additional games require
a specific unresolved interaction, not completion of this audit.

## Reproduction and validation

From the repository root, both commands read committed native games only:

```sh
python scripts/diag/checkpoint-film-audit.py --root data/reviews/current/experimental-game-checkpoint --out data/reviews/current/experimental-film-audit
python scripts/diag/checkpoint-audit-film.py --root data/reviews/current/experimental-game-checkpoint --out data/reviews/current/experimental-film-audit
```

The exporter's optional `--plot` reproduces the static path diagram when
matplotlib is available; it is not an engine dependency or verification phase.

The receipt pins original compressed-game hashes and runtime/profile/settings.
Offline scan/export, Python/embedded-JS syntax, witness identity/positions/events,
documentation links and all 16 viewer selections/seeks are checked. No source,
test, profile, existing receipt or original film is modified. The scan takes
about 7.4 seconds on this environment; subsequent film/UI work adds zero plays.
Original adverse results remain visible. `develop`, historical comparison,
existing PR ancestry and worker branches are unchanged.
