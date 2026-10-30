# Run Game tools index

First docstring/comment line of each script (auto-extracted). Counter card: ctrfirst, kicklog, ctrcard, wrapmeet, ctrdbl, ctrbacker. Many older scripts serve earlier tasks (zone doubles, pullers, backers, draw, pass rush); their docstrings say what they measure.

## tools/py (NFL vs sim unless marked sim-only)

| script | what it measures |
|---|---|
| `acrossclimb.py` | Zone doubles (leavepos definition), NFL vs sim. At the climber's leave frame, his target backer = the nearest LB |
| `aftertouch.py` | Plays whose first defender touch (within 1.0 yd) comes behind the LOS: share where the carrier still crosses |
| `aftertouch2.py` | Plays whose first defender touch (within 1.0 yd) comes behind the LOS: share where the carrier still crosses |
| `aggiz.py` | (no docstring) |
| `anticip.py` | Defense's anticipation split (their stated logic), NFL weeks 1-9 and sim: zone runs; play side s = sign of the |
| `anticip2.py` | Defense's anticipation split (their stated logic), NFL weeks 1-9 and sim: zone runs; play side s = sign of the |
| `asgreview.py` | Run-play assignment & approach review on traced run-only film (run-trace-watch frames: |
| `backerblk.py` | For box backers not touched although some blocker's current target was him: that blocker's plan kind and motion |
| `backerdiff.py` | Power box backers: who touched each one first in arm A, and whether arm B still touched him (same play, same shift). |
| `backergap.py` | Box backers on run-only sim film (run-restage/run-film-trace frames), same definition as run_film_reference.py: |
| `backergap2.py` | Box backers on run-only sim film (run-restage/run-film-trace frames), same definition as run_film_reference.py: |
| `backerside.py` | Box backers on inside zone and counter, NFL vs sim: split by side (play side = the carrier's side of the OL centre |
| `backertoucher.py` | Box backers, NFL vs sim through run_film_reference.py's own loaders and definition: first toucher's group (OL/TE/RB), |
| `backerwho.py` | Untouched box backers nobody ends up targeting: who targeted him at the snap and what that blocker targeted instead |
| `blockmap.py` | When, where and on whom blocks land, NFL vs sim, through run_film_reference.py's own loaders. |
| `boxcount.py` | Run snaps, NFL vs sim, same operator: box defenders at the snap (< 7.5 yd deep, within 6.5 yd of the OL centre) |
| `bsblk.py` | Blockers by side (OL/TE/non-carrier RB lateral at snap vs OL centre, signed by the carrier's crossing side): count per |
| `bsflow.py` | Backside zone: the DL man nearest the backside tackle / guard at the snap (within 2 yd lateral) -- how far he flows play |
| `bsgap.py` | Backside DL (nearest the BT/BG at the snap, within 2 yd): distance to the nearest OL at 0/0.2/0.3/0.5/0.7 s, and the |
| `bshow.py` | Backside zone: the DL man nearest the backside tackle / guard at the snap (within 2 yd lateral) -- how far he flows play |
| `bsnone.py` | Sim zone backside BT/BG with no LB/DB touch (by crossing+0.5 s): state at 1.0/1.5 s -- plan kind, target group, |
| `bsonset.py` | Backside DL (nearest BT/BG at snap, within 2 yd) lateral velocity toward the play side at 0.3..1.2 s, and the OL |
| `bsstate.py` | Sim zone backside tackle/guard with no 2nd-level touch: snap plan, plan kind and target group at 1.0/1.5/2.0 s, |
| `carrier.py` | Carrier progress by concept, NFL vs sim: x (yd past LOS) at 0.6/1.0/1.4/1.8/2.2 s, speed at 1.0/1.4/1.8 s, |
| `climbclose.py` | Zone climbs (block_climb events) on sim traces: over the 0.5 s after the climb decision, the climber's speed, his |
| `climbtrip.py` | After a planned combo's release (block_climb by a member), the climber's trip: time until he is 1.5 yd from the |
| `combos.py` | Planned combos (member plan 'combo' on a DL, partner on the same DL) by scheme: n, released (block_climb by a |
| `covtouch.py` | IZ/counter/power box backers touched by a covered OL (within 1.5 yd of a DL at 0.3 s), NFL vs sim: was that OL's |
| `crease.py` | Crease at the point of attack, NFL vs sim, same operator. Frame: the carrier first 1.0 yd behind the LOS after the |
| `ctrasg.py` | Sim counter snap assignments: wrap (lead puller) target vs combo climb targets (climb field of any plan) and other |
| `ctrback.py` | Counter back block, NFL vs sim, same operator: the backside line defender nearest the pulling backside guard's snap |
| `ctrbacker.py` | Counter box backers (run_film_reference's box-backer rule: LB, 2.5-8 deep, within 6 yd of the OL centre), NFL vs sim: |
| `ctrcard.py` | Counter scorecard, NFL vs sim, same operator (run_film_reference loaders, positions only). |
| `ctrclock.py` | Counter clock and backside line, NFL vs sim, same operator. Handoff time, carrier crossing time and his lateral at |
| `ctrcross.py` | Counter/power: carrier's lateral position when he crosses the LOS, signed toward the pull (+ = play side), from the |
| `ctrdbl.py` | Counter doubles, NFL vs sim, same operator (dblside's operator on COUNTER, pull side from the rule pullers). |
| `ctrdblwho.py` | Sim counter play-side doubles (ctrdbl operator): the two members' roles (ctrcard ranking) and snap plans/targets, the |
| `ctrfirst.py` | Counter first contact, NFL vs sim, same operator: at the first-contact time, the defender nearest the carrier; carrier |
| `ctrvariant.py` | NFL counter variants: OL rule pullers (count, which OL by rank toward the pull side) and non-OL wrappers: TE/RB/FB |
| `dblgeo.py` | Planned zone doubles (sim traces): geometry while both members are on the DL, before the first member climbs. |
| `dblgeo2.py` | Position-only zone doubles, same operator for NFL and sim (doublerel4 definition): while both OL are within |
| `dblgeo3.py` | Position-only zone doubles (doublerel4 definition), NFL vs sim, by time since snap: the covered member (nearer the DL |
| `dblphase.py` | Zone doubles (izclimb/doublerel4 selection), NFL vs sim: per double the timeline |
| `dblphase2.py` | Zone doubles (izclimb/doublerel4 selection), NFL vs sim: per double the timeline |
| `dblplan.py` | Sim geometric zone doubles (dblside definition) by side: the two OL's snap plans and targets, whether it was a |
| `dblside.py` | Zone doubles (izclimb/doublerel4 selection), NFL vs sim: per double the timeline |
| `dblwho.py` | Zone doubles (doublerel4 definition), NFL vs sim: who climbs (covered = nearer the DL at the snap) by the DL's lateral |
| `dlpursue.py` | DL motion between 2 and 3 s on runs, NFL and sim, same operator. Split by where the carrier is relative to the DL |
| `dlsign.py` | Zone doubles (two OL within 1.3 yd of a DL for 3 frames, starting in the first 1.0 s), NFL vs sim, same operator. |
| `doublerel.py` | Position-only doubles on zone runs, same operator for NFL and sim (x = yd past the LOS, 10 Hz). |
| `doublerel2.py` | Position-only doubles on zone runs, same operator for NFL and sim (x = yd past the LOS, 10 Hz). |
| `doublerel3.py` | Position-only doubles on zone runs, same operator for NFL and sim (x = yd past the LOS, 10 Hz). |
| `doublerel4.py` | Position-only doubles on zone runs, same operator for NFL and sim (x = yd past the LOS, 10 Hz). |
| `doubles.py` | Zone doubles from run traces: for each combo (2 OL with plan 'combo' on the same DL, with a climb backer), |
| `draw.py` | Draws: handoff time, first carrier contact (who, group, when, where), per OL first engagement time, |
| `drawlb.py` | Draws, NFL vs sim, position-only: box backers (LB group 2.5-8 yd deep within 6 yd of the ball at the snap): |
| `drawol.py` | Draws, NFL vs sim: the blocker who first touches each box backer: when he first crosses LOS+0.5, his distance to |
| `drawrel.py` | Draw combo releases (block_climb): release time, distance to installed backer then, whether the climber gets within |
| `drawset.py` | Draws: OL depth relative to LOS (negative = backfield) at 0.5/1.0/1.4/2.0 s, all OL and the eventual first backer |
| `edgekick.py` | Gap runs, NFL vs sim: the pull-side end man (first defender on the line, snap depth < 1.5 yd, outside the |
| `engtackle.py` | First defender within 1.0 yd of the carrier after the handoff, NFL vs sim, by concept: share where an OL/TE is within |
| `evengap.py` | Box backers on run-only sim film (run-restage/run-film-trace frames), same definition as run_film_reference.py: |
| `exchange.py` | Handoff health per arm: run plays (not draw, not qb draw) where the QB ends up the carrier, where an |
| `flips.py` | Matched flips in 'never crosses the LOS' between two arms' traces, by concept. usage: flips.py dir BASE ARM concept |
| `freeline.py` | Zone box backers untouched whose assigned blocker (frame target) is free (not engaged) and at/behind x<0.5 when the |
| `headon.py` | At the first touch (defender center within 1.0 yd, f >= 0.3 s): cos(runner heading, line to toucher), closing speed, |
| `headon_g0.py` | At the first touch (defender center within 1.0 yd, f >= 0.3 s): cos(runner heading, line to toucher), closing speed, |
| `hotail.py` | (no docstring) |
| `izbs.py` | Sim IZ (or CONCEPT env) in a given surplus bucket: for each box LB (unblk.py definitions), touched or not, and his |
| `izclimb.py` | Zone doubles (doublerel4 definition) climbs, NFL vs sim: at the climb mark and over the next 0.5 s, the nearest LB's |
| `keepalone.py` | Position-only doubles on zone runs, same operator for NFL and sim (x = yd past the LOS, 10 Hz). |
| `keeper.py` | Keeper quality after a zone double releases (block_climb by a member): is the doubled DL still engaged with |
| `kickgap.py` | Counter kick-out, NFL vs sim, same operator. Kick puller = the rule puller nearest the pull side at the snap (first |
| `kicklog.py` | Counter kick block, NFL vs sim, same operator (positions only). Two-OL-puller plays; kicker = the rule puller |
| `kicknone.py` | Sim counter kick pullers (plan pull, role kick) with no sustained contact (ctrcard rule): what happened. |
| `kickrank.py` | Rank counter snaps by kick-puller contact gain between two arms (sim traces, same snaps/shifts). |
| `kofilm.py` | Sim counter log cases (kicker outside his end by > .25 yd within 1.5 yd before the carrier crosses): per play a |
| `late.py` | Even/light-box zone backers whose targeting blocker was past the line but late (evengap definitions): when he first |
| `leadload.py` | Lead/turned-up pullers loading a second-level defender before the runner arrives. |
| `leavepos.py` | Position-only zone doubles (doublerel4 definition), NFL vs sim: at the climber's leave frame (last frame within |
| `linedrive.py` | DL vs LB displacement on runs, same operator for NFL and sim (common play format, metrics.Play). |
| `lineflow.py` | Zone runs: whole-line lateral flow toward the play side (sign from the carrier's lateral move snap -> first frame |
| `logcheck.py` | Sim counter: kicked end ends up inside the kicker (kicker lateral outside the end by > 0.25 while within 1.5 yd, |
| `logfilm.py` | Sim counter log cases (kicker outside his end by > .25 yd within 1.5 yd before the carrier crosses): per play a |
| `nevertgt.py` | Never-targeted box backers on a concept family: print snap jobs (plan, tgt, climb) of OL/TE and the defense front. |
| `newpen.py` | OZ snaps (same id) where the arm's first carrier contact is a DL behind the LOS and the base's is not: who hit him, |
| `notouch.py` | Kick/lead pullers who never engage anyone: at 1.5 and 2.0 s, where are they, their planned target and the carrier. |
| `olmove.py` | OL on runs: forward displacement at 1/2/3 s; how many OL are past +2 yd (beyond the LOS) by the time the carrier |
| `olrole.py` | Blockers by side (OL/TE/non-carrier RB lateral at snap vs OL centre, signed by the carrier's crossing side): count per |
| `pace.py` | Back behind the puller, NFL vs sim, power/counter/trap. Frames after 0.8 s while the carrier is behind the LOS |
| `passby.py` | Untouched box backers nobody targeted (backergap2 definitions): was a free climbing blocker (kind climb, not engaged) |
| `pen.py` | Zone/gap runs: share whose first defender contact with the carrier (1.0 yd) is behind the LOS, by whom (DL/LB/DB); |
| `penetrate.py` | Early DL penetration on runs, NFL vs sim, same operator: per play, the deepest DL into the offense's backfield |
| `penref.py` | First defender within 1.0 yd of the carrier (after he has the ball at x<=... any time): share behind the LOS, by DL, |
| `playside.py` | Play-side untargeted box backers on zone (passby definitions): box arithmetic at the snap (blockers OL/TE/FB vs |
| `powerdiff.py` | Even/light-box POWER box backers (evengap definitions, live window): touched in arm A but not in arm B, same snap id. |
| `pulldepth.py` | Kick/trap/lead pullers: x relative to LOS at snap and at 0.3..2.0 s, lateral progress toward the play, |
| `pullhit.py` | Pullers by rank (first = nearest the eventual hole at the snap), NFL vs sim: share that come within 1.2 yd of a |
| `pullpath.py` | Puller path, NFL vs sim, same operator (run_film_reference's puller rule): for each rule-detected puller on |
| `pullpath2.py` | (pullpath2: signed by the pull direction = mean puller lateral at 1.5 s; first = puller nearest the pull side at the snap.) Puller path, NFL vs sim, s |
| `pullrole2.py` | Per installed puller role: engaged anyone, first engaged man deeper than the carrier at that frame, |
| `pullroles.py` | Puller table by concept and pull role from run-film-trace frames (10 Hz). |
| `pullside.py` | Gap runs, NFL vs sim: does the carrier cross the LOS on the side the pullers went (pull direction = mean puller |
| `rbstart.py` | Carrier (ball-carrier back) start, NFL and sim, same operator. Backfield set by QB depth at the snap: |
| `rcpt.py` | (no docstring) |
| `reltime.py` | Zone doubles with a climb backer: release time (block_climb event by a member), time the carrier reaches the |
| `retreat.py` | (no docstring) |
| `simdbl.py` | Sim only: the position-only doubles of doublerel.py, split by whether the pair is a planned combo |
| `stalk.py` | (no docstring) |
| `stretch.py` | Zone stretch, NFL vs sim, same operator: play side = direction of the carrier's lateral displacement from the |
| `tfl.py` | Plays where the carrier never crosses the LOS (by 4 s or play end), NFL vs sim, by concept; for those, the first |
| `tfl2.py` | Gap runs that never cross the LOS: the first defender at the carrier, by where he lined up relative to the |
| `touchkind.py` | First OL touch on a box backer, NFL vs sim (run_film_reference loaders and definition): was that OL also within |
| `trench_flow.py` | Trench geometry and engaged flow on run plays, the same operator for NFL tracking and sim film traces. |
| `unblk.py` | Who goes untouched in the box, by surplus bucket: box defenders (box_count_reference definitions) touched by any |
| `unloaded.py` | Head-on first touches (at g0 = f-1: cos > .7, closing > 3), by band: share where the carrier keeps >= 80% of his g0 |
| `untouched.py` | Zone runs: box backers (defender 2.5-7 yd deep within 5 yd of the ball at the snap) untouched by an |
| `vacated.py` | DL lined up over a puller's snap spot (within 1.2 yd laterally), NFL vs sim, power/counter/trap: depth into the |
| `wall.py` | Counter/power: the down wall (non-pulling OL) depth during the pull, NFL vs sim: pullers = OL with /lateral move/ |
| `whoclimbs.py` | At each zone double's release (block_climb by a combo member), is the DL between the climber and the |
| `wrapdiag.py` | Sim counter wrap pullers (plan pull, role lead): first sustained contact (1.2 yd, 0.3 s, before carrier cross+0.6 s) |
| `wrapeng.py` | Sim counter lead (wrap) puller: first ENGAGEMENT (trace engagedWith) before carrier cross + 0.6 s, slot vs his |
| `wrapmeet.py` | Counter wrap puller vs the box backers, NFL vs sim, same operator. Rule pullers ranked toward the pull side at the |
| `wrapwho.py` | Sim counter pullers (snap plan 'pull', ranked toward the pull side: kick = first, wrap = second): first sustained |
| `wrfirst.py` | Receivers on runs, NFL vs sim, same operator: each WR's first defender within 1.2 yd (frames 2..carrier cross+6), |
| `ydist.py` | Run outcome distribution by family, NFL vs sim: carrier's final x (yd past LOS at play end) median, share <=0, 0-3, 4-9, |

## tools/ts (sim-only diagnostics; run with npx tsx, most take the worktree path as argv[2])

| script | what it does |
|---|---|
| `afterbeat.mts` | (see header) |
| `aimtrace.mts` | Carrier crease-read trace: every 'aim' observation (selected entry, best 5 candidates by score with risk), and the |
| `backblock.mts` | One counter play: the center (back block) and a DT every 0.1 s: positions (depth, lateral toward the pull from |
| `backreq.mts` | Mesh backs before the handoff, moving 2.3-3.3 yd/s: share of ticks requesting < 4.5 yd/s, by branch. */ |
| `backreq2.mts` | Mesh backs before the handoff, moving 2.3-3.3 yd/s: share of ticks requesting < 4.5 yd/s, by branch. */ |
| `blockback.mts` | Gap runs (power/counter/trap): the DL lined up over a puller's snap spot (within 1.2 yd laterally, on the line). |
| `bsend.mts` | Backside ends on zone runs away (end on the side opposite the play), engaged with a blocker, 0.5-3.0 s after the |
| `caprobe.mts` | From a worktree root with the __CA probe: classify departure climb-access results on zone runs (shift 0). |
| `cattrace.mts` | usage: node --import tsx cattrace.mts set.bin ID SLOT from to [out.json] */ |
| `chk.mts` | IZ helper check path: per check read, the gate result; split by combo defender (end vs interior). args: seeds */ |
| `churn.mts` | Free climbers (plan climb with a target, not engaged, carrier not yet at the backer) on run-only captures: |
| `churn2.mts` | Free climbers (plan climb with a target, not engaged, carrier not yet at the backer) on run-only captures: |
| `cid.mts` | (see header) |
| `climbfate.mts` | Per installed double: decision release, physical leave (last tick within 1.5 yd of a first-level man), reached +2 before carrier. */ |
| `climbmode.mts` | Released zone climbers (plan.departure set or plan climb after a combination) on run-only captures: per tick, the |
| `climbmode2.mts` | Released zone climbers (plan.departure set or plan climb after a combination) on run-only captures: per tick, the |
| `climbspd.mts` | Counter combos: after release, the climber's requested speed (his MoveCommand) vs achieved speed, joints still on |
| `climbwho.mts` | (see header) |
| `clipledger.mts` | Film clips: each puller's responsibility swaps from the #307 ledger, plus where he and his man were, and the result. */ |
| `cmbtrace.mts` | One snap: per 0.1 s, each combo member's engagement role on the combo DL, center distance, plan kind/step, velocity, |
| `cmdspeed.mts` | Head-on first touches (defender center within 1.0 yd; at t-0.1: cos > .7 and closing > 3): the carrier's commanded |
| `combowhy.mts` | Counter combos: why the joined release read declines, per combo (instrumented blocking.ts in the worktree). |
| `cov7time.mts` | (see header) |
| `ctrbind.mts` | Counter, first crease read that selects the backside: for the best pull-side candidate entry, each defender within |
| `ctrmirror.mts` | Integration's constructed counter-mirror witness: run-execution roster (seeds 11/12, strength .55), ace_11 / Over / |
| `ctrside.mts` | Counter/power/trap: per play the call side, the pullers' path direction, the carrier's designed aim lateral (rel. |
| `ctrside2.mts` | Counter: per play, pullers' roles (at the snap), each crease read (t, selected lateral +pull side, its risk, best |
| `ctrside3.mts` | Counter: per play, pullers' roles (at the snap), each crease read (t, selected lateral +pull side, its risk, best |
| `ctrstop.mts` | Counter plays that end at/behind the LOS (shift 0): the first defender to contact the carrier behind the LOS |
| `dblapp.mts` | IZ combo helper (combination.members[1]) from the snap until he joins the rep: position rel. the DL (field lat +away |
| `dblat.mts` | Engaged double members before release: play-side lateral request (raw decision, final after rewrites), achieved, and the down man's. */ |
| `dblforce.mts` | (see header) |
| `dblground.mts` | Doubled zone reps: ground impulse along the attack direction per tick for owner, helper, DL; masses; ratings. */ |
| `dblpos.mts` | Joined zone doubles before release, per tick: who is owner (e.blocker) / helper (e.helpers); each member's lateral |
| `dblreq.mts` | Joined zone doubles (both members engaged with the doubled DL), per tick before release: each body's requested and |
| `dblreq2.mts` | Joined zone doubles (both members engaged with the doubled DL), per tick before release: each body's requested and |
| `dbltick.mts` | One joined IZ double, tick by tick: helper rel DL (lat +away from owner, depth along axis), branch, final request, |
| `deadball.mts` | (see header) |
| `deepbranch.mts` | (see header) |
| `depticks.mts` | Departing climbers (plan.departure set), every tick: access kind (direct / detour by obstacle role / |
| `deptrace.mts` | First N zone departures: per tick from start: climber speed/commanded, distance to released DL and keeper (minus |
| `dldbl.mts` | Down man of each declared double, while doubled before release: play-side lateral request (raw/final), achieved; his posture. */ |
| `dlearly.mts` | Zone runs, front DL (snap depth < 1.5 yd), ticks 0-0.8 s after the snap: play-side lateral request (this tick's |
| `dlflow.mts` | Doubled run DL (engagement with >=1 helper), zone runs, per tick: requested vs achieved lateral velocity signed to |
| `dlflow2.mts` | Doubled run DL (engagement with >=1 helper), zone runs, per tick: requested vs achieved lateral velocity signed to |
| `dlflow3.mts` | Doubled zone DL, per tick: play-side lateral request vs achievement for the DL, the owner and each helper, read |
| `dlmode.mts` | Engaged run DL (single blocker) by time: which depth mode his command comes from, and the OL's normal request. */ |
| `downblk.mts` | Gap-run down blocks: per down blocker, snap lateral distance to his man, first contact time, the man's depth |
| `drawcombo.mts` | Draw doubles after the show: per member-tick in 1.0-2.5 s (before the carrier crosses LOS), which stage holds the double. */ |
| `dtblock.mts` | (see header) |
| `edgescan.mts` | (see header) |
| `eng.mts` | (see header) |
| `feetbudget.mts` | Single-blocker run reps on a down lineman: the feet law's split of ground force (instrumented World). */ |
| `fixmap.mts` | (see header) |
| `fixrg.mts` | (see header) |
| `flatleg.mts` | Power/counter pullers on the flat leg (pullIdx 1, not engaged), 0.6-2.4 s: requested lateral speed toward the hole |
| `forms.mts` | (see header) |
| `freeclimb.mts` | From a worktree root: free climbers (plan climb, target a box backer, no engagement, no departure, 0.5+ yd past LOS, |
| `freeclimb2.mts` | From a worktree root: free climbers (plan climb, target a box backer, no engagement, no departure, 0.5+ yd past LOS, |
| `freerush.mts` | (see header) |
| `g2capture.mts` | Capture the declared ordinary zone set on the current checkout (base). usage: node --import tsx g2capture.mts out.bin */ |
| `g2diverge.mts` | Per-tick body state for one declared play. usage: node --import tsx g2diverge.mts set.bin ID out.json */ |
| `g2measure.mts` | Measure the declared set on the current checkout. usage: node --import tsx g2measure.mts set.bin out.json */ |
| `g2measure2.mts` | Measure the declared set on the current checkout. usage: node --import tsx g2measure.mts set.bin out.json */ |
| `g2measure3.mts` | Measure the declared set on the current checkout. usage: node --import tsx g2measure.mts set.bin out.json */ |
| `g2scen.mts` | (see header) |
| `gametime.mts` | (see header) |
| `gapstop.mts` | Gap runs (power/counter/trap) whose first carrier contact is behind the LOS: the stopping defender D, who was |
| `gate.mts` | (see header) |
| `geo.mts` | (see header) |
| `ghtrace.mts` | One captured counter snap replayed as GH: the H's position, plan path index/waypoints, wrap corner, target, every 0.1 s. |
| `helperbody.mts` | (see header) |
| `helperstages.mts` | (see header) |
| `hfgeo.mts` | (see header) |
| `izleave.mts` | IZ doubles with a backer: per combo the timeline join -> secure-ready -> backer gate passes -> release decision |
| `izrel.mts` | IZ doubles with a climb backer: released before the carrier reaches the backer? For each one that has not, the |
| `k03.mts` | Usage (from a worktree root): node --import tsx <this> — replays K01..K03 (and flipped) to the end. |
| `k03pos.mts` | (see header) |
| `kc.mts` | (see header) |
| `kickcmd.mts` | One play: the kick puller's command trace from..to: decision raw/final velocity, rewrite stages, blocking changes. args: seed idx from to */ |
| `kicknear.mts` | One play: bodies within 2.5 yd of the kick puller every 0.1 s in [from, to]: slot, relative pos (depth, lat toward |
| `kicktrace.mts` | One play: the kick puller and his target every 0.1 s: puller pos (depth, lat from snap spot toward the pull), vel, |
| `kt.mts` | (see header) |
| `lane.mts` | (see header) |
| `leadpull.mts` | Counter lead puller (tackle), 0-2.2 s by 0.2 s bins: requested speed (decision), after spacing, achieved speed, |
| `leadtgt.mts` | Power/counter lead pullers, 1.2-2.8 s, not engaged: is his plan target engaged with a teammate (true state), and in his |
| `ledgerrel.mts` | (see header) |
| `ledgerwit.mts` | (see header) |
| `mates.mts` | Run plays, snap to 4 s: ticks with a body contact between teammates (World contacts), split offense/defense, |
| `meshdbg.mts` | From a worktree root: print the back's start, mesh, first-read preview and departure for the first few runs of a family. |
| `olclimb.mts` | Zone runs on run-only captures (shift 0): per OL, snap job; whether his target ever becomes a defender who starts |
| `one-turnup.mts` | (see header) |
| `onechg.mts` | (see header) |
| `onerel.mts` | (see header) |
| `ot.mts` | (see header) |
| `otcheck.mts` | Zone snaps whose combination owner climbs by the overtake read: at his block_climb, his partner has the man alone |
| `otfind.mts` | (see header) |
| `otprobe.mts` | (see header) |
| `otscan.mts` | Zone snaps whose combination owner climbs by the overtake read: at his block_climb, his partner has the man alone |
| `ozleave.mts` | IZ doubles with a backer: per combo the timeline join -> secure-ready -> backer gate passes -> release decision |
| `ozrel.mts` | Zone doubles with a climb backer, from 0.5 s until released or the carrier reaches the backer: per member read, |
| `ozreq.mts` | Outside zone: OL and DL lateral request vs achieved toward the play side at 0.2-1.5 s, split free (no engagement) |
| `p004.mts` | (see header) |
| `passend-int.mts` | (see header) |
| `passend.mts` | (see header) |
| `passsnap.mts` | (see header) |
| `plandiff.mts` | (see header) |
| `playtrace.mts` | One run play: every 0.1 s the carrier (pos, speed, behavior aim/press entry, designed flag), the line (OL/TE, DL, |
| `pseed.mts` | (see header) |
| `pull1.mts` | (see header) |
| `pullcensus.mts` | Every pulling blocker on saved runs: whom he engages, where that man is then (relative to the puller, the line and |
| `pullcensus2.mts` | Every pulling blocker on saved runs: whom he engages, where that man is then (relative to the puller, the line and |
| `pulldep.mts` | Counter/power pullers 0.3-1.8 s: depth (yd behind LOS, +), current waypoint depth, request vs post-spacing vs |
| `pullfate.mts` | Counter/power pullers: does each get within 1.2 yd (centers) of any defender before the carrier is 2 yd past the |
| `pullfate2.mts` | Counter/power pullers: does each get within 1.2 yd (centers) of any defender before the carrier is 2 yd past the |
| `pullpeer.mts` | (see header) |
| `pulltick.mts` | One saved run-only snap: every puller's internal pull state per tick (waypoint, clearance, cleared, command). */ |
| `pulltick2.mts` | One saved run-only snap: every puller's internal pull state per tick (waypoint, clearance, cleared, command). */ |
| `pulltrace.mts` | Power/counter pullers: installed hole (last waypoint y), role; time each waypoint index is reached; lateral |
| `r7p083.mts` | R7-P083 (ledger fixture, single-stream): the back's crease reads between 0.8 and 1.4 s: chosen entry and the |
| `rbride.mts` | Gun/pistol/under zone backs on run-only captures: per tick to the handoff, speed and the ride state. */ |
| `releaselag.mts` | Zone combination releases (block_climb by a member with a planned backer): release time, time until he is 2 yd |
| `relgate.mts` | Double-team release gates: for each combo with a backer, per read tick, the gate that stopped each member's |
| `relhash.mts` | (see header) |
| `relhook.mts` | (see header) |
| `relhook1.mts` | (see header) |
| `reltrace.mts` | usage: node --import tsx reltrace.mts set.bin out.json */ |
| `relwho.mts` | Joined zone doubles: per member (covered = nearer the DL at the snap) the gate result of each personal release read; |
| `repforce.mts` | Single-blocker run reps on a down lineman: what each side asks for, what ground force each puts down |
| `restageplay.mts` | (see header) |
| `routereach.mts` | For each run snap (shift 0) whose first carrier contact is behind the LOS: the carrier's mode at contact (crease read |
| `s8p005.mts` | S8-P005 from the responsibility-ledger fixture: first carrier contact, carrier events, and a per-tick dump of |
| `s8spc.mts` | (see header) |
| `samecheck.mts` | (see header) |
| `sealscene.mts` | (see header) |
| `sitdbg.mts` | (see header) |
| `slotcmd.mts` | One play, one offensive slot: command trace from..to (decision raw, final, rewrite stages), achieved velocity. args: seed idx slot from to */ |
| `snap.mts` | node --import tsx snap.mts <seedfile> <index> <slot> — replay one saved snap (shift 0) and print the puller's work vs the runner. |
| `snap25.mts` | (see header) |
| `spacecut.mts` | Run plays: unengaged run blockers with a target within 3 yd (their own picture is not used; truth positions). |
| `srcver.mts` | (see header) |
| `stkprobe.mts` | (see header) |
| `stuck.mts` | IZ combo releases: for each climber, every 0.1 s after his release until he is 1.5 yd off the DL (max 1.2 s): |
| `stuckdep.mts` | Zone departures with a keeper detour that are not 2 yd clear of the released DL 1.0 s after release: per 0.1 s, |
| `stuckreq.mts` | (see header) |
| `stuckreq2.mts` | For named stuck climbers: controller's raw request vs each rewrite vs final, upfield and speed, over a window. */ |
| `stuckwhy.mts` | Holdout stuck climbers: what holds each one, from the #307 responsibility ledger. |
| `sz.mts` | (see header) |
| `tiecheck.mts` | Scan run-only matched-restage captures for first-carrier-contact ties (the ledger census), on code defaults with the |
| `tiescan.mts` | Scan run-only matched-restage captures for first-carrier-contact ties (the ledger census), on code defaults with the |
| `traced-same.mts` | (see header) |
| `trapprobe.mts` | (see header) |
| `turnup.mts` | Pullers that turn up: when, the man they left, the work they find, and the defenders near the runner later. */ |
| `zonemap.mts` | Zone installation map on the current checkout (run from the repo root). |
| `zonetrace.mts` | (see header) |

## patches

Experiments as unified diffs against the base named in HANDOFF arms table (most against blocking.ts). Verdicts for this session's counter work are in HANDOFF §3; the rest are earlier tasks' arms (alignment, squeeze, sit, snap react, tackle leg bind, etc.), kept for reproduction.

- `c2.patch`: src/sim/behaviors/blocking.ts
- `c3.patch`: src/sim/behaviors/blocking.ts
- `cb2.patch`: src/sim/behaviors/blocking.ts
- `cb2cb3-full.patch`: src/sim/behaviors/blocking.ts
- `claim.patch`: src/sim/behaviors/blocking.ts
- `cushion-and-dnf.patch`: src/sim/run-fits.ts
- `deep-sit-v2.patch`: config/baseline.json
- `dlchase.patch`: src/sim/engagement.ts
- `dlkey.patch`: src/sim/behaviors/defense.ts
- `double-halves-arms.patch`: src/sim/behaviors/blocking.ts
- `down-seal-side.patch`: src/sim/engagement.ts
- `hand-clear-hip.patch`: src/sim/engagement.ts
- `hipread.patch`: src/sim/behaviors/carrier.ts
- `hipslide-and-arms.patch`: src/sim/behaviors/blocking.ts
- `izx-overlay-hooks.patch`: scripts/diag/matched-restage.ts
- `kick-wrap.patch`: src/sim/behaviors/blocking.ts
- `kick.patch`: src/sim/behaviors/blocking.ts
- `lbtempo.patch`: src/sim/run-fits.ts
- `legbind.patch`: src/sim/tackle.ts
- `olalign-develop.patch`: src/playbook/alignment.ts
- `olalign.patch`: src/playbook/alignment.ts
- `pa.patch`: config/baseline.json
- `padlev.patch`: src/physics/world.ts
- `pb.patch`: config/baseline.json
- `puller-path-P1.patch`: src/sim/behaviors/blocking.ts
- `ride.patch`: config/baseline.json
- `sit.patch`: config/baseline.json
- `sit2.patch`: config/baseline.json
- `snapreact.patch`: config/baseline.json
- `sq.patch`: config/baseline.json
- `sq2.patch`: src/sim/engagement.ts
- `st.patch`: config/baseline.json
- `track.patch`: src/sim/behaviors/carrier.ts
- `wide.patch`: src/sim/climb-access.ts
- `wrap.patch`: src/sim/behaviors/blocking.ts
- `xsp.patch`: src/sim/agent.ts
- `za.patch`: config/baseline.json
