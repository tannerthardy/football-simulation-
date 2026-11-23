# Pass-coverage technique inventory: what the engine models against what is taught

I read the code at `coverage/C14-cards` @ 9b3624487 (develop plus diagnostic scripts) with flags at their in-code defaults, cross-checked against `config/reference-stack.json`. No repo files were changed.

## Before the table: three corrections to the brief

**1. Several flag comments are out of date.** These comments say "experimental, off", but the code reads `!== '0'`, so each flag is **on**, and the reference stack agrees:
- CORNER_DROP
- CARRY_POSTURE
- CARRY_TURN
- CUSHION_BREAK
- PEDAL_CAP
- OPEN_FIELD
- OFF_PEDAL (=3)

**2. PEDAL_CAP's 0.76 is not a share of top speed.** It is the pedal-to-side-on ratio (`physical.ts` PEDAL_RATIO CB 0.76). The CB pedal works out as `shuffle(≈0.62) × 0.76 ≈ 0.47` of top speed. Under DIR_CAP (on), facing 130° or more away from the line of travel pays the full backpedal share. So a FLAT_SINK corner who faces the QB while sinking runs at about 0.47 vmax under a #1 at full speed. That alone explains a corner stuck 5-6 yd deep.

**3. None of the seven flags is in `src` on this branch or in the reference stack.** Each exists only as a commit on its own branch (section 3).

## Summary

Counting the 71 rows of the table below (some rows cover several techniques):
- **13 modeled**
- **37 partly**
- **21 absent**

The absent items cluster in three areas:
- press-hand technique;
- the zone corner's pre-throw drive on the QB's set;
- defender-to-defender calls (Under, In/Out, switch, Lock/Cut, robber keys).

---

## 1. Technique inventory

Class: **M** = modeled, **P** = partly, **A** = absent. "d.ts" is `src/sim/behaviors/defense.ts`.

| seat family | technique (taught, short) | class | engine evidence (file:function, one line) | missing piece | flag that addresses it |
|---|---|---|---|---|---|
| corner | alignment by call (press, off 7-8, C2 hard) | M | alignment.ts:alignDefense `dbSpot`: press 1.3, off 6, C3 7.3, flat 4 | — | PRESS_ALIGN (press 1 yd off the man, not 1.3 past the LOS) |
| corner | cushion and leverage by split (sideline, reduced split, numbers rule) | P | alignment.ts:`dbSpot` only `room<9` → inside shade; `style.cbDepth` | no depth or shade by split width or receiver speed; no reduced-split rule | — |
| corner | pedal (controlled, then speed) | M | d.ts:ManCoverage.trackReceiver `man-pedal` facing π; physical.ts PEDAL_CAP; CUSHION_NEED / OFF_PEDAL pace | no distinct speed pedal (pace only from cushion need) | — |
| corner | flat-foot read through the QB on 3-step (Bowen NFL) | A | d.ts:CORNER_DROP comment: "flat-footed read is the existing release belief … not a timer" | no hold-and-read phase keyed to the QB's drop | — |
| corner | bail (C3, press-bail) | P | d.ts:cornerDrop (deep_third CB, 45° half turn, head on QB) | quarters corner and press-bail not covered; zone corners never press | — |
| corner | shuffle (Saban C3) | P | physical.ts MOVEMENT_TECHNIQUE.shuffle exists only as a facing-speed cap | no shuffle technique choice | — |
| corner | press jam (off-hand, timing, inside hand) | P | receiver.ts:handleRelease HandJoint push/steer ∝ `press` rating, ≤5 yd, man-press only | the corner makes no jam decision (the receiver's controller starts it); no hand choice or timing; zone corners (C2 hard) never jam | JAM_SQUARE |
| corner | press mirror / kick-step / patience | P | d.ts:trackReceiver PRESS_MIRROR `releasing` → head-up, lev 0 | no kick-step or patience; squared to the QB, then a hard flip | MAN_TURN |
| corner | soft shoe / catch technique | A | — | no catch (absorb-and-ride) or soft-shoe release counter | — |
| corner | ride in phase, hand on hip | A (default) | d.ts:MAN_PHASE (in src, `=== '1'`, off) | the default trails 0.7 yd inside, not in the hip | MAN_TURN, MAN_PHASE |
| corner | in-phase look for the ball; out-of-phase play the hands | P | d.ts:manLooks (BALL_EST bit 256, off at 6145); hands-cue.ts HANDS_CUE (on); CATCH_CARRY | man look decision off; man defenders have no head (body facing) | — |
| corner | trail vs on top (chosen by phase) | P | `opts.trail` / `overTop` fixed by call role; CARRY_READ holds depth | no switch between trail and on-top by situation; Cover 1 has no on-top rule | MAN_TURN |
| corner | man turn (open and run) | P | d.ts:trackReceiver `hipsOpen` on consumed cushion, never re-closes in man; orientation.ts rounded turn | no choice of which hip or speed turn; no turn along the man's run | MAN_TURN |
| corner | zone turn (open, eyes on QB) | M | d.ts:carryFacing/openTo (CARRY_POSTURE), carryOpenRun (CARRY_TURN), CUSHION_BREAK | — | — |
| corner | break read, man (throttle, hip sink, plant foot) | P | coverage-leverage.ts:stemStopped (speed projection) + OFF_PEDAL_SETTLE; orientation.ts fast turn on a seen >60° break | receivers have no hip or pad pose to read; he settles, then drives only on the throw | — |
| corner | break read, zone (3-step set, hitch, off hand) | P | d.ts:underneathPlant / shoulderTarget (SHOULDER_READ) for underneath and quarter seats | DEEP_GATE holds the C3 corner until the ball is out; no 3-step-set drive | — |
| corner | plant and drive (T-step, 45° reconnect, upfield shoulder) | P | d.ts:playBall → playObservedFlight; `track` cutSkill, body brake | no drive-angle technique; no punch through the hands | — |
| corner | funnel to help (outside lev with post help, inside in C0) | P | d.ts:ManCoverage `opts.lev ?? 'inside'`; only the lurk calls go outside | Cover 1 / Pounder funnel outside not taught | — |
| corner | C2 squat: jam #1 inside, sink 45°, deep-to-short | P | d.ts:ZoneCoverage.flatSink (1 yd under #1, 0.7 inside, facing QB); rules.ts:squatTopDown | no jam; sinks facing the QB at pedal speed; sink_corner waits for #2/#3 to declare | ZONE_LADDER (its first commit was this sink), HALF_CAP |
| corner | flat carry of a turned-up #2 | M | d.ts:ZoneCoverage.flatCarry (FLAT_CARRY on) | — | — |
| corner | deeper than deepest; split and squeeze in the third | M | d.ts:ZoneCoverage deep branch, OWNED_FIX, cushion 1.6+0.16·vx | — | — |
| corner | MOD / MEG declaration of #1 | M | rules.ts:qCorner, zoneOffOne; techniques.ts:QuarterShort (QCORNER=0, off) | QuarterShort settle is off | — |
| corner | double-move discipline | M | OFF_PEDAL_SETTLE; CUSHION_BREAK re-square; DEEP_GATE (pump) | — | — |
| corner | weave to hold leverage | A | — | — | — |
| corner | wheel / outside seam beside a #1 go | P | squatTopDown `wheel`; OWNED_FIX keeps #2 in the third | #3 or back wheel drops out of the set once #1 is vertical | — |
| slot/nickel | alignment over detached #2 / apex / tight #2 | M | alignment.ts SLOT_LEV, TIGHT_OFF, apex walk-out | — | — |
| slot/nickel | man on #2: outside lev toward the hole, 5-7 off | P | coverages.ts cover1 `NB press:true`; ManCoverage inside lev | taught outside lev off; we press inside | PRESS_ALIGN (depth only) |
| slot/nickel | option-route leverage (play the break both ways) | P | trackReceiver inside 0.7 yd, re-computed from the ball | no head-up "wait on the break" technique | — |
| slot/nickel | seam-flat: match #2 vertical | M | rules.ts:seamCurlFlat (carry 12 / c3_seam 99) | the fire-zone DE carries forever | — |
| slot/nickel | rub/stack exchange (In/Out, switch, Banjo) | A/P | rules.ts:banjo only via `bunch_strong` check | no In/Out or switch; stack, tight split and weak bunch get nothing | — |
| hook/LB | read step on G-C-G, then drop | M | d.ts:zonePlay `boxBacker` read-step, LB_GUARD_STEP | — | — |
| hook/LB | drop to hook landmark, eyes #3→#2→QB | P | alignment.ts:zoneLandmark; zone-eyes.ts:keyRefs | hook_mid/hole/robber eyes always start on the **strong** #3 | — |
| hook/LB | wall / carry #3 seam | M | rules.ts:c3Hook (to 15), mike3, readHook (wall to 8) | carry not latched (c3Hook) | — |
| hook/LB | robot / dig bottom-up (#3 in at 7-14) | P | rules.ts:cutWall (unders ≤7 near landmark) | no in-cut or dig match at 7-14 yd | ZONE_LADDER (parked) |
| hook/LB | collision of shallow crossers | M | techniques.ts:CrossWall (`cross-wall-collide`) | ≤7 yd only | — |
| hook/LB | hooks "on a string" / melt | A | band re-decided every tick (`zoneBand`) | — | ZONE_LADDER (in part) |
| hook/LB | Push (hook takes #2 on a fast #3 flat) | P | rules.ts:c3Hook / seamCurlFlat `push` | not in quarters (mike3, q_apex); target re-resolved B before B2 each tick | — |
| hook/LB | Under (take #2 in, curl-flat robs #1) | A | rules.ts:seamCurlFlatDeclared → zone on #2 in/under | — | — |
| hook/LB | pattern reads, spot vs match | P | d.ts:spotUnderneath (QB eyes only); match lane pick | spot style has no carry, crosser or expand | ZONE_LADDER |
| hook/LB | PA leash (#2/#3 release overrides the run key) | A | d.ts:zonePlay `believesRun` → runFit; LB WR weight 0 (recognition.ts) | — | — |
| hook/LB | green dog / peel when his back blocks | A | ManCoverage holds over the blocker | — | — |
| hook/LB | Tampa pipe | P | rules.ts:tampaPipe (field centre ±4) | not keyed to the ball or strength; no dig rob | — |
| curl-flat/apex | apex alignment EMLOS–#2 | M | alignment.ts apex walk-out | — | — |
| curl-flat/apex | wall #2 vertical (collision, inside lev) | P | techniques.ts:Wall (aim +1.2 yd, `insideBy`; APEX_LEVERAGE level / 1 yd outside) | position only, no hand reroute; leverage measured, not taught | — |
| curl-flat/apex | sink curl, widen on the QB's shoulders | M | SHOULDER_READ plant / break; lane pick 82% to receiver | — | — |
| curl-flat/apex | carry seam to 12-15, hand to safety | P | seamCurlFlat carry 10-12; wallTwo handoff 10 | fixed-depth end, no "safety has him" cue | HALF_CAP (safety side) |
| curl-flat/apex | first to the flat / #3 or back flat | P | rules.ts:quarterFlatTaught `flat3` only when #2 vertical ≥10 at vx>3 | — | — |
| curl-flat/apex | carry in-breaking #2 / Push from the Mike | A | rules.ts:quarterFlat / wallTwo → `zoned` | — | — |
| curl-flat/apex | Smash hunt #1 | M | seamCurlFlat `smash`; Smash corner coordinated | — | — |
| curl-flat/apex | wheel run-with | P | sink corners only | C/F has no wheel carry | — |
| curl-flat/apex | PA: curl depth before stepping up | A | run commit → force at 2.5 yd (run-fits.ts) | — | — |
| half safety | alignment 12-14, working to 15-18 top of numbers | M | alignDefense two-high; landmark 15 / 13.5 | — | — |
| half safety | key #1→#2 as a divider | P | d.ts HALF_KEY (weighted aim) | weighted between, not a divider | HALF_CAP |
| half safety | top-down; cap the remaining vertical | P | HALF_KEY drops a cancelled receiver until re-read vertical | turned-up flat or hitch-go not capped | HALF_CAP |
| half safety | depth by turn-and-run cushion vs speed | P | SAFETY_DEPTH 13.4−0.5r / landmark | drifts deep (19-21 yd) | DEEP_CUSHION |
| half safety | break on ball, not pump | M | d.ts DEEP_GATE | taught (low) also allows the QB hitch | — |
| half safety | quarters flat-foot #2 read, rob #1, Screw | P | rules.ts:qSafety, Rob; SCREW | no Screw in palmsSafety; no "fox the post" | — |
| half safety | poach / deep-crosser backstop | A | rules.ts:poachSafety latches "x" on any non-vertical #3 | — | — |
| half safety | pass-first on PA, alley only after the pass threat clears | A | zonePlay → runFit | — | — |
| post safety | middle, melt to the first look, break on the second | P | HALF_OWN midpoint; QB-look lean | no melt-then-break | — |
| post safety | split and squeeze, deeper than deepest | M | d.ts HALF_OWN | — | — |
| post safety | 60/40 seam shade; lean to trips #3 | A | deep_mid at the ball | — | — |
| post safety | late rotation from two-high (spin) | P | alignment.ts:alignDisguised, cov.look, SHELL_SHOW | no rotation footwork or timing: he heads to the landmark at drop pace from the snap | — |
| post safety | downhill angle on dig/post | P | playBall flight drive | no pre-throw angle | DEEP_CUSHION |
| robber/rat | rat: cut the first crosser | M | rules.ts:cut (`rat`) ≤7 yd, head-up, drop 8 past | base Cover 1 LB_M is `robber` = zoneOf, no cut | — |
| robber/rat | robber keys (QB through #2/#1 dig, drive on crosser) | A | rules.ts runRule `'robber': zoneOf(c)` | — | — |
| robber/rat | Funnel / release-side lurk; double lurk | A | cover1_lurk fixed LB_M rat | — | — |
| robber/rat | hand crosser back to his trailer | P | cut drops 8 yd past | — | — |
| all | rally and leverage tackling | P | open-field.ts:onTopPoint (OPEN_FIELD on); common.ts:leverage (inside by field position); tackle.ts | leverage set by field position, not by where help is; no rally coordination | — |
| all | scramble: plaster / come up | M | d.ts:pursueIfLive `plastersScramble` | — | — |
| all | disguise (shown shell) | M | alignDisguised, SHELL_SHOW, `look`, playcaller creep | — | — |
| all | late-rotation footwork (cadence creep, roll on the snap) | A | "no rotation rule" (machinery D4) | — | — |
| all | calls: Lock / Cut / Jump on motion | A | motion.ts:MotionRuntime random lock 51-69% | — | — |

---

## 2. Absent and partly items: who they plausibly leave open

**Corners**
- **C2/C6/Tampa squat corner sinks facing the QB at pedal speed (~0.47 vmax) and waits for #2/#3 to declare.** The #1 go or fade lands in the 10-15 yd hole shot against Cover 2, 2-Match, Tampa and the Cover 6 half side. Concepts: four verticals, smash-7, and slant-flat turned up.
- **No zone-corner jam (C2 hard, cloud).** #1 gets a free outside release on the fade or 7 route, widening the half safety against Cover 2 and cloud.
- **No flat-foot read and no drive on the 3-step set (DEEP_GATE holds the C3 corner).** #1's hitch, stop or out at 4-8 yd goes uncontested against Cover 3 and fire zones. This matches the census's "owner 4-8 yd off".
- **Man break read is speed-only; the corner settles, then drives on the throw.** #1's stop, out or comeback at 5-12 yd, against Cover 1 and 2-Man off coverage.
- **Shuffle and bail not taught for quarters or press-bail.** #1's out or comeback at 10-14 yd against quarters MOD from press.
- **Press: no catch, soft-shoe, kick-step or in-hip ride; squared to the QB, then a hard flip at ~1.4 s.** #1's go or fade at 15-25 yd and the back-shoulder fade, against Cover 1, Cover 0 and 2-Man press.
- **Inside leverage by default (no funnel).** #1's out, fade or corner against Cover 1 and Pounder; flat-then-up against Cover 1 (F04).
- **Trail versus on top fixed by call; man look in phase off.** #1's go and post against Cover 1 (F17-type trail losses with no help underneath).
- **Cushion and leverage not set by split.** A reduced-split #1's whip, out or corner, and a wide #1's slant inside, against Cover 1 and Cover 3.
- **Plant-and-drive has no angle technique.** YAC on quick outs and hitches, all coverages.
- **Wheel or seam leaves the third.** #3 or back wheel at 13-20 yd against Cover 3 and fire zones.

**Slot and hooks**
- **Slot man pressed inside, not outside-off.** #2's out, whip or option at 5-8 yd against Cover 1.
- **No In/Out or switch.** Rubs and stack releases at 2-6 yd (mesh, snag, stack-slant) against all man calls except a strong bunch.
- **No Under call; no in-breaking #2 carry; no robot at 7-14 yd.** #2's dig, drive or Y-cross at 8-14 yd, and #1's slant under, against match Cover 3, quarters (F09), fire zones and Mable.
- **No hooks "on a string"; spot style has no carry.** Seams and curls at 10-15 yd between hooks against plain Cover 3 and Cover 2.
- **Push only in Cover 3 match and unlatched.** The fullback's flat or post-cross against cover3_match (F68); #2 inside against quarters.
- **No PA leash for C/F, apex or hooks.** PA corner-flat, boot flat and the dig behind the hooks at 5-15 yd, all zone calls (F61).
- **No green dog or peel.** A wasted defender rather than an open man, against Cover 1 and Cover 0.
- **Tampa pipe fixed at field centre.** A hash-side seam at 15-22 yd, and the dig under the Mike, against Tampa 2.

**Apex**
- **Wall is positional only, level or outside.** #2's seam at 8-15 yd gets a clean release against quarters and Cover 3 match.
- **Carry ends at a fixed 10-12 yd.** #2's seam at 12-16 yd before the safety caps him, against plain Cover 3 and Cover 2.
- **First to flat is narrow.** #3 or back to the flat at 0-4 yd against quarters MOD and Poach.

**Half safety**
- **HALF_KEY drops a cancelled receiver; no divider.** A turned-up flat or hitch-and-go at 12-18 yd, against Cover 2 and Cover 6 (the "caught at 12 yd, never touched" case).
- **Drifts to 19-21 yd.** #1's go at 10-15 yd: the Cover 2/6 hole in the brief.
- **No Screw in Palms; no fox the post.** PA seam or post from 2×2 against Palms, the default quarters check.
- **No poach backstop.** The deep crosser from trips at 15-20 yd against Poach and Trix.
- **No pass-first rule.** PA post or seam against every two-high call.

**Post safety**
- **No 60/40 shade or trips lean; no melt.** Late post, the boundary seam and the #3 seam against cover3_seam and cover3_trips.
- **No rotation footwork.** Little direct loss. It is a disguise cost: Cover 9 and Buzz show their rotation.

**Robber and rat**
- **Robber is a plain zone at 11 yd.** Shallow, mesh and drive crossers at 3-10 yd against Cover 1 and the Cover 1 robber.
- **No Funnel, double lurk, or release-side lurk.** The back's angle or option route, and the backside-X dig, against cover1_lurk and lurk_trips.

**All seats**
- **No Lock/Cut/Jump on motion; locks are random.** Motion-to-flat and jet-arrow against man calls (F05).
- **Leverage at the tackle is set by field position, not help.** YAC on catches outside the numbers, all coverages.

---

## 3. The seven flags

None is in `src` on this branch or in `config/reference-stack.json`.

| flag | branch and commit | what it does | on or off | item it addresses |
|---|---|---|---|---|
| **MAN_TURN** | `origin/coverage/C14-man-turn`, 7613699ff | A press man faces his man one reaction time ahead and rides in the hip (both bodies plus a reach), not squared to the QB with a 1.4 s flip. An off man pedals until the cushion breaks, then opens along the man's run. | off (`=== '1'`), unmerged | press mirror, in-hip ride, man turn, trail vs on top |
| **JAM_SQUARE** | `origin/rules/jam-square`, 16bca776e | A press jam joins and holds only while the corner is square and not running off (receiver.ts, contact-holding.ts). | off, unmerged | press jam realism (its cost and timing) |
| **PRESS_ALIGN** | `origin/rules/press-align`, f4259b792 | The press corner aligns a yard off his man, not 1.3 yd past the line (alignment.ts). | off, unmerged | press alignment and cushion |
| **DEEP_CUSHION** | `origin/defense/C40-deep-declare`, 4bdc34bdd + 9c8693ed7 | A deep safety's depth = turn-and-run cushion over the deepest vertical he sees: 4 yd base + gap·(half-turn + reaction) + gap²/2a, with receiver speed max(9 yd/s, fastest seen). Floored at his landmark; he slows when over the cushion. | off (`=== '1'`), unmerged | half and post safety depth: the 19-21 yd drift that opens the 10-15 yd hole |
| **ZONE_LADDER** | `origin/coverage/C14-zone-ladder2` (v1-v5 plus record 137cd7212) | The underneath zone defender's relation becomes one pattern drift: a sitting route keeps its lane, else he leans with the soonest-arriving route. An early commit (46597767c) sank the C2 squat corner with #1. | off; recorded "not landed" (KNOWN_PROBLEMS COV-12: fails the shallow-under-dig and flood-flat controls) | hooks on a string, spot vs match, dither; the C2 sink idea survives as FLAT_SINK (on) |
| **HALF_CAP** | `origin/rules/half-cap`, b868a2fc5 | The half safety weighs a cancelled #1/#2 continuously, so he regains weight as he climbs. A sat hook weighs about 0. With nothing vertical left he plays his half and the QB. | off (`=== '1'`), parked | half safety cap of a turned-up flat or hitch-go; the C2/6 hole |
| **SIT_WORK** | `origin/rules/sit-work`, 2c202a4e2 | Receiver side: the settled receiver keeps working to the window from his own picture (receiver.ts). | off, parked (not measurable at flow_mix's key) | no coverage technique; it is the offensive control for spot and hook drops (sitting-route windows) |

One related in-src flag: **MAN_PHASE** (d.ts, `=== '1'`, off) gives the in-phase ride an arm's length off the hip once the hips are open.

Files I relied on:
- `/home/user/football-simulation-/src/sim/behaviors/defense.ts`
- `/home/user/football-simulation-/src/sim/behaviors/receiver.ts`
- `/home/user/football-simulation-/src/sim/coverage/rules.ts`
- `/home/user/football-simulation-/src/sim/coverage/techniques.ts`
- `/home/user/football-simulation-/src/sim/coverage/orientation.ts`
- `/home/user/football-simulation-/src/sim/zone-eyes.ts`
- `/home/user/football-simulation-/src/sim/ball-estimate.ts`
- `/home/user/football-simulation-/src/sim/hands-cue.ts`
- `/home/user/football-simulation-/src/sim/open-field.ts`
- `/home/user/football-simulation-/src/sim/behaviors/common.ts`
- `/home/user/football-simulation-/src/sim/coverage-leverage.ts`
- `/home/user/football-simulation-/src/players/physical.ts`
- `/home/user/football-simulation-/src/physics/kinematics.ts`
- `/home/user/football-simulation-/src/playbook/alignment.ts`
- `/home/user/football-simulation-/config/reference-stack.json`