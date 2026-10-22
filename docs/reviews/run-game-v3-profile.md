# run-game-v3 candidate profile: what is on, what it does, what is open

One page for integration. It lists every flag on in this branch's pinned
profile (`config/baseline.json`), the current results against tracking, and
the open problems with their owners. Evidence lives in the linked reviews.
Generated from the code's doc comments on 2026-10-22 at `0cc4e074`;
70 of 116 flags are on.

Reproduce: `npm run baseline:run -- --candidate -- <command>`. Lab arms:
`scripts/diag/open-field/arm.mjs` (called looks 1-10, seeds
77,71001,1,2,3). Games: `scripts/mechanics/sim-export.ts --seed 301` then
`scripts/mechanics/measure.py`; the playbook session's nine operators
(index: `docs/reviews/nfl-sim-operators.md` on claude/great-mccarthy-85uf8b) and the run-defense
session's (`depth/edgedepth.py`, `sidepass.py`, `catchbreak.py` on
claude/run-defense-develop) read NFL tracking and sim exports with one code
path.

Reading game numbers: follow the playbook session's arm-comparison protocol
(`docs/reviews/arm-comparison-protocol.md`, `scripts/diag/arm-power.py`, on
claude/great-mccarthy-85uf8b). Pressure differences need about 22-42 games
per arm for 5 points; 4-game arms are about +/-8-11 points. Same-seed games
diverge at the first play a change affects: one mechanism witness each, no
variance reduction. Use paired lab cases for mechanisms.

## Where it stands (current profile)

| | Sim | NFL | Source |
|---|---|---|---|
| Pressure, dropbacks without play action | 24-33% | 31.3% | pass-pressure.py, 4-8 games |
| Edge contact after line start / rusher depth | 1.09-1.16 s / 3.2-3.3 yd | 1.25 s / 3.4 yd | pass-contact.py |
| Tackle depth at 1.0 / 1.5 s | 2.29 / 3.62 | 2.17 / 3.42 | pass/tackle-kick.py |
| Interior pressure per 100 dropbacks, engaged first / total | 5.9-7.1 / 7.3 | 8.7 / 9.3 | pass-pressure.py |
| Time to pressure | 2.44 s | 2.71 s | measure.py |
| Lab zone losses / 40+ (under center) | 2.6% / 5.7% | 7.6% / 0.8% | stretch/bands.py |
| Lab gap TVD to NFL bands | 7.7 | - | stretch/bands.py |
| Draw losses / median | 2.8% / 6.6 yd | 10.3% / 5.0 | concepts.py, ds1/pkdr |
| Zone first contact by DL | 26-32% | 43-51% | gap/reach-contact.py |
| Inside crease at the line (before FRONT_ALIGN) | 3.0-4.6 yd | 2.3-2.9 yd | run-hole.py |
| Runs reaching 20 that reach 40 | 67% | 26% | long-run.py |
| Defensive pre-snap fouls per game | 2.0 | ~1.35 | align/snap-fouls.ts |

## Open problems and owners

| Problem | Diagnosis | Owner |
|---|---|---|
| Protection lasts 0.3 s less than tracked | rushers win soon after contact; interior moves land by a rating roll (about 9% per attempt), so pairs stay glued | run-defense (rusher moves) |
| Crease twice tracked width, few DL first contacts, few zone losses | down-blocked DL split their legs between attacking upfield and the lateral push; squeezing needs the scrape backer to fill behind | run-defense (squeeze + fill) |
| Long-run tail: too few defenders arrive (2.10 vs 2.69 per run reaching 5 yd; DL 0.02 vs 0.30) | the open-field meeting itself matches tracking (below); DL stay tied to blockers after the back passes, and the line barely flows with outside zone or the gap play | see "Pursuit arrival" below |
| After-catch: defenders in front come back at the receiver | the intercept itself, not the attack term; team leverage | run-defense |
| Front seven while the read is unsure | DL stand still laterally for 0.4 s (tracked 0.4 yd/s at 0.1 s); off-ball LBs drift back 0.2 yd (tracked: 0.2 yd downhill by 0.5 s); the read commits at 0.45 s and until then the rusher plays his pass plan | run-defense (proposed key step) |
| Gap-scheme line flow has the wrong sign | engaged pairs wash backside (-0.6 yd/s) where tracked pairs drift playside (+0.3) | run-defense squeeze first, then `DOWN_SEAL` |
| Outside-zone line flow half of tracked | pairs reach contact 0.3 s early against a stationary DL and plateau at 1.6 yd/s (tracked 3.0) | run-game (after the key step) |
| QB drop ends abruptly (`QB_SETTLE` off) | smoothing it exposes the protection gap above | run-game, after protection |
| Protection back steps up too early | holding him loses protection without a read-then-step-up pickup | run-game |
| False starts about half tracked | offense's own count timing | run-game |

## Pursuit arrival (matched operators)

Three operators run the same code on NFL tracking (`nfl-plays`) and sim
common plays (today's profile, 8 games, seed 301): `scripts/diag/open-field/meet.py`,
`scripts/diag/stretch/release.py` and `scripts/diag/stretch/lineflow.py`.

**The open-field meeting matches tracking.** A defender free of blockers
gets within 4 yd of a back 5+ yd past the line:

| | NFL | sim |
|---|---|---|
| met / passed / other | 48 / 19 / 33% | 49 / 14 / 36% |
| met, then 5+ more yards | 9% | 9% |
| same, back at 7+ yd/s | 25% | 23% |
| meetings per run reaching 5 yd | 2.69 | 2.10 |
| of which DL | 0.30 | 0.02 |

**Fewer defenders arrive, mostly DL.**

- Tied up (offensive player within 1.2 yd) at the crossing / +0.5 / +1.0 s:
  NFL 75 / 66 / 56%, sim 84 / 82 / 78%.
- When the back crosses 5 yd, DL are a median 0.4 yd downfield and 5.2 yd to
  his side; tracked 2.6 and 3.1.
- In the lab (450 paired cases), 2,412 of 3,074 DL rep ends after the
  crossing are re-latched by the same blocker within 0.25 s.
  `SHED_PURSUE BLOCK_FRONT` stop that, but DL arrivals only go 0.02 -> 0.04:
  the DL is still too far from the back.
- **Now on:** `SHED_PURSUE` (works off toward a runner he has declared at an
  ordinary read; edge fits declare 2 yd past the line, as `pursueIfLive`
  does) and `BLOCK_FRONT` (a run block starts only within 110 deg of the
  defender's front). Paired lab against the same cases (`c2` -> `sb3`):
  under-center zone 40+ 68 -> 54 of 1,200 (26 gone, 12 new, sign test p
  0.03), 20+ 87 -> 71 (p 0.04); gap 10+ 320 -> 294 of 1,600 (p 0.04), 40+
  155 -> 145 (p 0.35); shotgun unchanged; losses unchanged; median change
  -0.06 to -0.09 yd. An earlier version that let edges pursue at once cut
  zone 40+ to 43; it broke the contain rule and #169's possession rule.
  Fixture tests that build side or back contact pin `BLOCK_FRONT=0`.

**The line does not flow.** Mean lateral velocity toward the play side
while in contact range, 0.3-1 / 1-2 / 2-3 s (yd/s):

| family | NFL OL | sim OL | NFL DL | sim DL |
|---|---|---|---|---|
| inside zone | 0.62 0.71 0.64 | 0.61 0.79 1.13 | 0.53 0.73 0.72 | 0.44 0.83 1.19 |
| outside zone | 2.32 2.92 2.62 | 1.09 1.52 1.92 | 1.74 2.83 2.68 | 0.58 1.31 1.76 |
| duo | -0.17 -0.14 0.27 | -0.10 -0.09 -0.02 | -0.13 -0.06 0.48 | -0.08 -0.04 0.03 |
| power/counter/trap | 0.28 0.74 1.19 | -0.62 -0.43 -0.08 | 0.24 0.76 1.35 | -0.30 -0.46 -0.08 |

- On outside zone, tracked DL move laterally from 0.1 s (0.39 yd/s). Ours
  stand still for 0.4 s, because the read commits at a median 0.45 s and
  until then the rusher runs his pass plan.
- Our OL then reach a stationary DL about 0.3 s early, and the pair
  plateaus.
- The flow candidates already on this branch (`RUN_LATERAL DL_FEEL LB_GLIDE
  COMBO_LEAVE BACK_CHASE SHED_PURSUE BLOCK_FRONT`) flip the gap row's last
  window positive (+0.32), but leave the first second and outside zone
  nearly unchanged.

**Squeeze and `DOWN_SEAL` (run-defense's `DL_SQUEEZE`, d9369dcb, armed in a
scratch worktree).** Gap-row DL flow, 0.3-1 / 1-2 / 2-3 s: profile -0.30 -0.46
-0.08; with the squeeze -0.12 +0.17 +0.45; with `DOWN_SEAL` too -0.15 +0.11
+0.38 (NFL +0.24 +0.76 +1.35). Paired gap lab: the squeeze moves the median
-0.25 yd on changed plays, losses 82 -> 97 (p 0.13), tails unchanged;
`DOWN_SEAL` on top cuts counter losses 51 -> 36 (all gap 97 -> 78, p 0.025)
but adds no flow, so the down blocker's drive request is not the remaining
gap. The squeeze is a candidate for the first shared build; `DOWN_SEAL` stays
off.

## Pair separation (in progress)

Engaged pairs come apart only when a rule ends the rep. In run reps (lab,
96 IZ/OZ/power/duo cases, `out/handratio.ts`):
- A DL asking to move across his blocker requests 2.1 yd/s relative and gets
  0.3. The blocker is asking the other way (-0.66 yd/s), so this is mostly a
  leg contest with hands on, which is football.
- The hand row's tangential force sits at its steer limit on 73% of those
  ticks, and on 13-15% of all DL rep ticks the hands resist sliding with no
  push at all (tangential load, zero normal load). A DL asking to separate
  meets tangential load at a median 2.9 times the normal load.

`HAND_FRICTION` (physics, `world.ts` `solveHands`, off) bounds the hands'
tangential force by friction on the push they deliver (`HAND_MU` 0.6) plus the
grip budget while gripping, within the old steer budget. Push-free glue falls
from 14% to 1% of ticks. Paired lab vs `sb3`: zone and shotgun no detectable
change; gap losses 82 -> 116 of 1,600 (p 0.001; tracked share 7.4%), almost all
counter (35 -> 63 of 400, the kicked end slipping the kick-out) and trap
(5 -> 13). Kick-outs held the end by sideways hand force with little push.
Off: physics promotion belongs to the physics owner, and counter at 16% losses
needs the kick-out's own contact (approach speed, push) examined first.

**Kick-outs under `HAND_FRICTION`.** Kick-out reps (lab, `out/kickprobe.ts`)
close at 2.85 yd/s with a median tangential/normal hand load of 0.6, right at
the friction bound, so friction shortens them (1.75 -> 1.45 s). The back's
kick-or-log choice is not the counter defect: on tracking
(`scripts/diag/gap/kickside.py`, same code both sides) the end is kicked/logged
58/42% (sim games 57/43%) and backs go inside the puller 79/70% of the time
(sim 67-70/38-63%). Tracked backs mostly go inside even a log. Losses by lab
concept against tracking: counter 8.8% (NFL 11.6), trap 1.2% (3.8), power
10.0% (9.1), duo 0.5% (7.7). Duo never loses yards; that is the next run
question.

## First shared build (on: `DL_SQUEEZE DEEP_NO_FORCE`, reviewed by run-defense)

This branch now carries run-defense's `DEEP_NO_FORCE` (cd4a602), `DL_SQUEEZE`
(d9369dcb, merged with this profile's `read.chasing` in `recover`) and
`PULL_EARLY` (f28754c6) with their tests, now on (`PULL_EARLY` off). Run-defense reviewed the hunks and pins; their
review found the squeeze re-read the runner every tick, and the squeeze is
now decided at a read and held for the lineman's decision beat (5dab06be),
which removed run-contact-flow's pin.
Recorded-scenario tests that stage defenders without them pin
`DL_SQUEEZE=0` (combo-solo, combo-strike-access, gap-blocks, kick-log,
planned-climb-fit, run-contact-flow) or `DEEP_NO_FORCE=0`
(run-force-ownership). Core 2964/2964 with the flags off and with
`DL_SQUEEZE DEEP_NO_FORCE` on.

Proposed build: this profile + `DL_SQUEEZE=1 DEEP_NO_FORCE=1`. Paired lab
against this profile (`sb3` -> `bld`, same cases):

| | 40+ | 20+ | 10+ | losses | TVD to NFL bands |
|---|---|---|---|---|---|
| zone, under center (1,200) | 54 -> 30 (p 0.004) | 71 -> 50 (p 0.03) | 141 -> 117 (p 0.08) | 36 -> 39 | 9.0 -> 7.4 |
| gap (1,600) | 145 -> 116 (p 0.035) | 180 -> 144 (p 0.013) | 294 -> 262 (p 0.07) | 82 -> 98 | 8.9 -> 8.2 |
| shotgun zone (600) | 36 -> 20 (p 0.04) | 55 -> 34 (p 0.02) | 111 -> 86 (p 0.025) | 11 -> 21 | 10.6 -> 9.8 |

Games (8, seed 301): meetings per run reaching 5 yd 2.06 -> 2.31 (NFL 2.69);
gap-row DL flow -0.27 -0.43 -0.09 -> -0.23 +0.13 +0.47 (NFL +0.24 +0.76
+1.35); DL tied up 1 s after the crossing 69 -> 69% (NFL 56).

`PULL_EARLY` on top of the build is not proposed yet: shotgun and zone inert,
gap 10+ 262 -> 239 (p 0.09) and gap TVD 8.2 -> 9.9 (10-19 yd runs, already
under tracking, fall further). Its backer-flow mechanism still needs its own
games read on `pullers.py`.

Committed build (held squeeze), paired lab against the profile without it
(`sb3` -> `b2`): zone under center 40+ 54 -> 29 (p 0.002), 20+ 71 -> 45
(0.007), 10+ 141 -> 101 (0.002), losses 36 -> 34, TVD 9.0 -> 8.9; gap 40+
145 -> 109 (0.007), 20+ 180 -> 141 (0.009), 10+ 294 -> 248 (0.01), losses
82 -> 86, TVD 8.9 -> 9.0; shotgun 40+ 36 -> 22 (0.06), 20+ 55 -> 38 (0.05),
losses 11 -> 19, TVD 10.6 -> 7.1. Games (8, seed 301): meetings per run 2.28
(NFL 2.69), gap-row DL flow -0.13 +0.12 +0.43. The tails fall everywhere;
under center the 4-9 yd band grows where tracked runs have more 0-3 and
10-19 yd runs, so the distribution's shape there is unchanged.

Watch items after the build, both closed. Shotgun losses (11 -> 19 of 600)
are spread across ordinary block-origin holds by squeezing linemen (no
single defender or concept), at 3.2%, still under tracked inside/outside
zone (6.1/11.0%). Draws and tosses at 20+ (games 4.7 -> 9.1% on 55 plays)
do not reproduce on paired lab (`drof` -> `dron`, 1,200 cases): draw 20+
9.0 -> 8.8%, toss 7.8 -> 7.2%; draw losses 3.5 -> 6.0% (NFL draw 11.9%).

## Broken run contacts (run-defense bisection and second-tackler split)

Run contacts broken (runbreak.py): shared build 17.9%, NFL 12.6%. Run-defense
bisected the profile's contact flags on paired lab: only `LEG_BRACE`
(=0: 14.8 -> 11.9%) and `HOLD_POINT` (=0: 14.8 -> 16.9%) move it. Their
second-tackler split (`depth/secondtackler.py`, help = another defender
within 1.5 yd in the 0.5 s after first contact):

| | help at contact | broke with help | broke alone |
|---|---|---|---|
| NFL | 77% | 7.6% | 29.8% |
| shared build | 56% | 10.9% | 27.0% |
| build, `LEG_BRACE=0` | 51% | 10.9% | 14.4% |

The brace is right (a lone tackler breaks at the tracked rate with it, far
too rarely without). The excess breaks come from missing help, the
pursuit-arrival row. `LEG_BRACE` stays on.

Who is missing (`scripts/diag/open-field/helpwho.py`, same code both
sides): NFL first contact is at 0.6 yd past the line, by a DL 42% of the
time, the next-nearest defender 1.6 yd away, and a nearby DL arrives
within 0.5 s 66% of the time, tied up or not. On the build, contact is at
1.4 yd, by a DL 26%, the next-nearest 2.2 yd away, and nearby DL arrive 23%.
The back is through the line before he is hit, so the help is the crease
(3.5-4.3 yd vs 2.4-2.9) and alignment chain already in progress.
`ENGAGED_REACH` on the build (games): help 56 -> 55%, DL arrivals 23 -> 23%;
lab gap 40+ 109 -> 91 but losses 86 -> 100 and gap TVD 9.0 -> 9.9. Stays off.

## Outside-zone flow: the interior (diagnosis)

Per lineman, outside zone (`scripts/diag/stretch/ozpath.py`, same code both
sides; NFL vs the shared build, 8 games): the tackles match tracking
(playside tackle 1.6 vs 1.7 yd toward the play at 1.0 s). The interior does
not: center 0.5 yd (NFL 2.0), playside guard 1.1 (1.7), backside guard 1.0
(2.0). The center is within 0.76 yd of a defender at 1.0 s and stays there.

Lab (90 OZ cases, `out/ozint.ts`): free interior linemen request 2.3-3.1 yd/s
toward the play and reach 1.5 by 0.5 s; once engaged (32% at 0.5 s, 64% at
0.75 s) they request 0.45 and their defenders about 0, so the pair stands.
The reach rep's lateral work is "match his flow, reach the seal offset":
against a man who does not flow, nothing moves. `RUN_CONTACT_TRACK DL_FEEL`
(existing, off) raise the engaged pair to 0.87 yd/s at 0.75 s and the OL at
1.0 s from 1.47 to 1.67 yd/s (NFL 2.81); the center 0.5 -> 0.7 yd. The
contact track covers only solo reaches at 45% of top speed; about a quarter
of interior blocks are doubles, which it skips. Earlier attempts on this row
(Parts 9-13: `RUN_LATERAL`, `DL_FEEL`, `LB_GLIDE`, `COMBO_LEAVE`) also left
the first second short. Next: what an NFL center and his double do in the
first second of outside zone (the double moving as one toward the play), on
tracking, before any rule.

Tracking settles the interior (`scripts/diag/stretch/ozcenter.py`): on NFL
outside zone the center is covered (a DL within 1 yd laterally at the snap)
64% of the time, ours 92%; and the DL nearest the center moves 0.4 / 1.4 yd
toward the play by 0.5 / 1.0 s, where ours moves 0.0 / 0.0. The tracked nose
flows with the reach and the pair moves; ours does not ask to, so the pair
stands. That is the engaged lineman's controller (run-defense) and the front
mix (def-alignment), not the blocker's path; sent to both.

Who leads: run-defense's `nosereach.ts` shows the nose already asks to flow
about 0.25 s after the center moves, and tracking has the center leading
(0.6 vs 0.4 yd at 0.5 s), so the first mover is the center's reach. The
covered center (lab) asks 3.8 yd/s free but reaches 0.8 by first contact at
about 0.4 s; once engaged he asks 0.6. `RUN_CONTACT_TRACK` raises the solo
center's request to 1.1-1.3 and achieved speed at 1.0 s from 0.78 to 1.21
in the lab, but in games (8, seed 301) the covered center is unchanged
(0.5 yd at 1.0 s; NFL 1.9). Letting a stretch combo's man race his track
too (`COMBO_TRACK`) was inert and is removed. Two attempts: stopped. Next in
order is the A-gap alignment (def-alignment's `AGAP_ALIGN`, which needs
their alignment-style commits), then a fresh look at the center's
technique in games.

**`AGAP_ALIGN` (def-alignment, ported onto this branch, off).** The 1
technique stands at his team's tracked share of the centre-guard split.
Core 2969/2969 with it on. On this profile (8 games, seed 301): OZ center
covered 92 -> 29% (NFL 64%; this line's 1.6-yd splits are wider than
tracked 1.5); the uncovered center still moves 0.6 yd by 1.0 s (NFL 2.1),
so coverage was not what stalled him; help at contact 56 -> 51%; power
crease 3.3 -> 3.8 yd. Paired lab against the build (`b3` -> `ag`): TVD
zone 8.9 -> 7.1, gap 9.0 -> 7.1, shotgun 7.1 -> 14.6 (shotgun IZ median
4.1 -> 3.2, 4-9 yd 39 -> 25%). Right snap geometry, downstream not yet an
improvement: off.

## Flags on

| Flag | Value | Where | What it does (from its doc comment) |
|---|---|---|---|
| `ANCHOR_SPLIT` | 1 | `sim/engagement.ts` | Anchor braces along the drive line and keeps lateral work (ANCHOR_SPLIT=0 off). |
| `BLOCK_FRONT` | 1 | `sim/engagement.ts` | a run block is taken on the defender's front or side (within 110 deg of his facing); hands arriving on his back start no rep, and the bodies still collide. |
| `CLIMB_INTERCEPT` | 1 | `sim/behaviors/blocking.ts` | Climbs and leads intercept flowing backers (CLIMB_INTERCEPT=0: short lead). |
| `CLIMB_PLAN` | 1 | `sim/behaviors/blocking.ts` | Climbs planned with previewed own movement (CLIMB_PLAN=0 off). |
| `COMBO_GAP` | 1 | `sim/behaviors/blocking.ts` | an uncovered zone blocker doubles the man in the gap beside him. |
| `COMBO_SOLO` | 1 | `sim/behaviors/blocking.ts` | the man decides who stays. |
| `CUTOFF_SEAL` | 1 | `sim/engagement.ts` | on gap schemes a solo backside cutoff takes his rep from his man's play-side front (30 deg play side of head-up), driving him away from the play, instead of the cutoff's ... |
| `DEF_GETOFF` | 1 | `sim/agent.ts` | Diagnostic (DEF_GETOFF, default 1): scale on the defense's snap reaction latency, an unfitted assumption. |
| `DL_ANCHOR` | 1 | `sim/engagement.ts` | an engaged run defender who is doubled, or is being driven back by a real load, sits into his stance: pads down to get under the drive ("stay low", "drop the pressure leg... |
| `DL_FLATTEN` | 1 | `sim/engagement.ts` | a lineman who sees a zone step (his blocker moving laterally) flattens down the line instead of attacking upfield (run-defense session). |
| `DL_FLOW` | 1 | `sim/engagement.ts` | Engaged run fits plan their flow with their own body (DL_FLOW=0: proportional follow). |
| `DRAW_SET` | 1 | `sim/behaviors/blocking.ts` | on a draw the linemen sell pass by pass blocking: each sets between his man and the mesh and takes him on with a pass rep, instead of walking to a spot 1.2 yd deep and bl... |
| `FB_KICK` | 1 | `sim/behaviors/blocking.ts` | the power fullback's kick-out uses the kicker's fit, as the pulling guard's does: his inside shoulder, matching his seen motion. |
| `FLOW_READ` | 1 | `sim/run-fits.ts` | Backers flow inside-out on a declared track (FLOW_READ=0 off); yards inside the ball. |
| `FLOW_RELEASE` | 1 | `sim/behaviors/blocking.ts` | Climb when the backer shows flow or will arrive shortly (FLOW_RELEASE=0: proximity only). |
| `FRONT_ALIGN` | 1 | `game/playcaller.ts` | fronts are called as team installs use them (2017 Colts, 2013 Seahawks, 2020 Ravens via the playbook session): Under is the base front and Over a secondary call; nickel l... |
| `FRONT_FIT` | 1 | `league/team.ts` | interior line slots weigh familiarity at DT, as overallAt does and the edge slots already do. |
| `GAIT_STEP` | 0.3 | `physics/kinematics.ts` | time over which a player levels off at a wanted speed below his top speed. |
| `GAP_ACCOUNT` | 1 | `sim/behaviors/blocking.ts` | gap-scheme accounting by the written rules (docs/reviews/run-blocking-assignment-audit.md). |
| `GAP_FIT` | 1 | `sim/behaviors/blocking.ts` | first-level gap/duo blocks (drive, down, double, cutoff) by a lineman or inline end on a man at the line, on schemes not blocked by zone rules, approach on the zone track... |
| `GAP_OUT` | 1 | `sim/behaviors/blocking.ts` | on gap schemes a playside lineman whose man is aligned more than 0.3 yd outside him, and outside the hole, blocks him out (inside shoulder, drive outward, first step towa... |
| `HOLD_POINT` | 1 | `sim/tackle.ts` | a holder judges his wrap by how far his arms reach to the point they hold (a bound leg sits behind the runner's center), not by the distance to the runner's center. |
| `KEEPER_TORSO` | 1 | `sim/behaviors/blocking.ts` | Keeper eligibility from the achieved torso relation (KEEPER_TORSO=0: fixed frame). |
| `KICK_INTERCEPT` | 1 | `sim/behaviors/blocking.ts` | a kick/trap puller's flat track aims where the end will be when he can get there (the climbs' intercept law), not at the end's seen spot. |
| `LANE_DEPTH` | 1 | `sim/behaviors/carrier.ts` | when the first defender reaches an entry before the runner, the lane also costs the yards behind the line where he meets the runner on the way. |
| `LB_PLAN` | 1 | `sim/run-fits.ts` | Free fits plan lateral work with their own body (LB_PLAN=0 off). |
| `LEAN_AXIS` | 1 | `physics/world.ts` | a lean's leg strength depends on how he faces the load's line, not on which way along it he pushes. |
| `LEG_BRACE` | 1 | `physics/world.ts` | Experimental leg-hold bracing (LEG_BRACE=1); see addLoad. |
| `LEG_FV` | 1 | `physics/world.ts` | One force-velocity budget for propulsion (LEG_FV=1): the forward share of a lean into a load spends what the planned gait drive leaves at his actual speed, instead of sta... |
| `LEVER_FACING` | 1 | `sim/engagement.ts` | Run release measured against the blocker's torso (LEVER_FACING=0: fixed frame). |
| `LIVE_AIM` | 1 | `sim/behaviors/carrier.ts` | the runner aims at the live gap he perceives, not the installed landmark (LIVE_AIM=0 off). |
| `LIVE_GAPS` | 1 | `sim/live-gaps.ts` | Run fits use live gaps (LIVE_GAPS=0 restores snap landmarks, for A/B). |
| `LOG_CONTACT` | 1 | `sim/behaviors/blocking.ts` | see RunBlocker.readLogAtContact. |
| `LOG_READ` | 1 | `sim/behaviors/carrier.ts` | the back reads kick or log from where he sees the kicker against the end he was installed to kick, not from the kicker's own decision. |
| `MESH_POINT` | 1 | `sim/behaviors/qb.ts` | the shotgun exchange as tracked. |
| `MESH_TEMPO` | 1 | `sim/assign.ts` | the back takes the handoff moving. |
| `OL_ALIGN` | 1 | `playbook/alignment.ts` | the line aligns as tracked. |
| `PACE_LEAD` | 1 | `sim/behaviors/carrier.ts` | following a lead blocker through the hole sets the back's pace from the lead's observed motion instead of a fixed 28-40% of top speed. |
| `PAD_LEVERAGE` | 1 | `physics/world.ts` | pad level loads and unloads the feet. |
| `PASS_CORNER` | 1 | `sim/behaviors/blocking.ts` | a tackle cuts an edge rusher off where the rusher's arc has turned toward the QB (he has committed to the corner), not at the earliest point of the arc, which is at the l... |
| `PASS_KICK` | 1 | `sim/behaviors/blocking.ts` | a tackle sets against an edge rusher vertically instead of cutting off his arc. |
| `PASS_RIDE` | 1 | `sim/engagement.ts` | a rusher at the blocker's hip (/phi/ >= 1) is not free while the blocker's hands are still on him and his body is not past the blocker's toward the QB. |
| `PULL_READ` | 1 | `sim/run-fits.ts` | Pull reads (PULL_READ=0 restores the single nearest-shift read, for A/B). |
| `PULL_STEP` | 1 | `sim/behaviors/blocking.ts` | open pull step toward the play side. |
| `QB_CARRYOUT` | 1 | `sim/behaviors/qb.ts` | Run plays: open to the mesh point, hand off (or pitch), carry out the fake. |
| `RB_AWAY` | 1 | `sim/assign.ts` | on a shotgun zone call the offset back lines up away from the run and takes the ball crossing the QB's face, as offenses do (2022 tracking, shotgun: 231 of 250 stretch an... |
| `READ_EYES` | 1 | `sim/run-read.ts` | Keys seen focally, the rest peripherally (READ_EYES=0: no peripheral delay). |
| `RUN_ANCHOR` | 1 | `sim/engagement.ts` | Run-blocker anchoring against a felt drive (RUN_ANCHOR=0 disables, for A/B). |
| `RUN_ARMS` | 1 | `sim/behaviors/carrier.ts` | a block holds a defender's feet, not his arms. |
| `RUN_CONTACT_COMPONENTS` | 1 | `sim/engagement.ts` | Shoulder speed is a complete component; set 0 to reproduce the comparison baseline. |
| `RUN_PROJECT` | 1 | `sim/behaviors/carrier.ts` | the entry route check meets each body where his seen motion puts him when the runner gets there (at most 0.6 s ahead, the lane forecast's blocker horizon), not where he s... |
| `RUN_REACH` | 1 | `sim/behaviors/carrier.ts` | the runner's path check gives a defender's body part of his arm's reach (0.4), not only his torso. |
| `SCRAPE` | 1 | `sim/run-fits.ts` | Free fits scrape with the gap's motion, the earliest zone key (SCRAPE=0) and read the back's threatened crossing rather than his position (THREAT_READ=0). |
| `SHED_PHYSICAL` | 1 | `sim/engagement.ts` | A run shed is a decision executed by the body (SHED_PHYSICAL=0: rolled outcome). |
| `SHED_PURSUE` | 1 | `sim/engagement.ts` | once the runner a blocked defender has declared is past the line, he works off toward the ball at any range; the same blocker cannot re-latch him for the shed window when the rep ends because the runner passed. |
| `SNAP_REACT` | 1 | `sim/snap-count.ts` | starts come from the count: reaction to the ball or the man across, timed anticipation with error, hard counts; pre-snap fouls follow from represented acts (docs/reviews/presnap.md). |
| `STALK_CLAIM` | 1 | `sim/behaviors/blocking.ts` | Receivers claim distinct stalk targets (STALK_CLAIM=0: each takes his nearest). |
| `STRETCH_AIM` | 1 | `sim/behaviors/carrier.ts` | on outside and wide zone the back presses the snap landmark; the live gap does not follow the end. |
| `STRETCH_MESH` | 1 | `sim/assign.ts` | Stretch mesh on the back's track (STRETCH_MESH=0: inside mesh, back stops). |
| `STRETCH_REACH` | 1 | `sim/engagement.ts` | Stretch reaches stay connected rather than drive (STRETCH_REACH=0 off). |
| `TACKLE_ROLL` | 1 | `sim/tackle.ts` | Force a hold of quality q can sustain, kg·yd/s². |
| `TETHER` | 1 | `physics/world.ts` | a passive hold on the legs is an inelastic tether at the point it holds. |
| `THREAT_READ` | 1 | `sim/run-fits.ts` | Free fits scrape with the gap's motion, the earliest zone key (SCRAPE=0) and read the back's threatened crossing rather than his position (THREAT_READ=0). |
| `TRAP_FIT` | 1 | `sim/behaviors/blocking.ts` | a trapper on the last leg of his pull fits his man, as the counter kicker already does (the fit gate had only the kick's last-leg clause). |
| `UC_MESH` | 1 | `sim/assign.ts` | the under-center exchange as it is run. |
| `WRAP_BIND` | 1 | `sim/tackle.ts` | Experimental secure lower-wrap coupling; all transmitted loads still use World's existing grip, arm and recovery budgets. |
| `ZONE_FLOW` | 1 | `sim/behaviors/blocking.ts` | Zone linemen run the track before contact (ZONE_FLOW=0 disables, for A/B). |
| `ZONE_TE` | 1 | `sim/behaviors/blocking.ts` | an inline tight end on a zone call is part of the surface and runs the same track, rather than sprinting straight at his man's playside shoulder and meeting him with dept... |
