# Run offense: the blocks and reads the offense should make (2026-10-21)

Branch `claude/run-game-v3`, after the [contact model](contact-model.md)
(`99320664`). User priority: "figure out how to get our guys to
intelligently lay blocks ... if everyone on our offense does what they
SHOULD do in the run game" — runs may become very effective; the defense is
the next step (another session owns run depth and pursuit).

## Question and answer

**Question.** Where does the offense not do what a coached NFL offense does
on runs, measured with the shared operator against 2022 tracking?

**Answer.** Five repeated mechanisms, each traced on film cases and counted
on the lab cases (zone `ace_12` iz/oz/wz 1,200 plays; gap
`i_pro_21`/`ace_12` power/counter/duo/trap 1,600; shotgun zone 600):

1. **The uncovered double-teamer helped the wrong man** on inside zone weak:
   with a shade in the gap beside him he joined the tackle on the end
   outside instead (`COMBO_GAP`, committed `37dd12c2`).
2. **The back read a defender's torso, not his arms.** Most zone stuffs end
   with the stopper reaching the back from a block; the lane check let a
   route pass a lineman's chest at arm's length (`RUN_REACH`).
3. **Stretch doubles never released unless both members were on the man.**
   On 88 of 143 lab doubles the man stands on the owner's backside; the
   helper held him about 2 s and the owner about 0.5 s while running the
   track, then touched nobody, and the double's linebacker ran free
   (`COMBO_SOLO`).
4. **The outside-zone back's landmark followed the end onto himself.** The
   live C/D gap is bounded by the inline end; an end who drives the tight
   end wide while penetrating drags the landmark outward, and in traffic
   every lane's risk saturates, so the landmark decides. Tracked backs cut
   inside the play-side end on 65% of outside zone and run at him on 13%
   (22% of those lose yards); ours ran at him on 21% (49% lost)
   (`STRETCH_AIM`).
5. **The power fullback kicked out like a linebacker lead.** He ran full
   speed at the intercept of the end's center, hit him running upfield,
   carried past, and the end slipped under into the backfield: 48 of 73
   power stuffs were that end, released, 1.5 yd deep and inside him. The
   pulling guard's kick already fits the inside shoulder and matches the
   end's motion (`FB_KICK`).

## Changes (all on in this branch's pinned profile; defaults off)

| Flag | Where | Rule |
|---|---|---|
| `COMBO_GAP` | `blocking.ts` `planRunBlocking` | An uncovered zone blocker doubles the man in the gap beside him when his play-side neighbor's man is outside that neighbor. |
| `RUN_REACH` | `carrier.ts` `runReadAim` | The route check gives a defender 0.4 of his reach beyond his torso. |
| `COMBO_SOLO` | `blocking.ts` `readUnjoinedCombination` | A free member of an unjoined stretch double who sees his partner holding the man alone and securely (the joined read's keeper evidence, 0.15 s on his own beat) climbs when the backer shows. Inside/split zone keep their check installation. |
| `STRETCH_AIM` | `carrier.ts` `liveAim` | Outside/wide-zone backs press the snap landmark; inside zone and gap runs keep the live gap. Where the line's flow opens a lane is the read's job. |
| `FB_KICK` | `blocking.ts` `attack` | The power fullback's kick (`lead`, role `kick`) uses the kicker's fit: inside shoulder, matching the end's seen motion. |
| `GAIT_STEP=0.3`, `PULL_STEP`, `MESH_POINT` | `kinematics.ts`, `blocking.ts`, `qb.ts`/`assign.ts` | Existing flags, on at the user's request; the gait law now respects direction, effort and holding ground (below). |
| `RB_AWAY` | `assign.ts` `alignBackAway` (called in `playsim.ts` before the defense aligns) | On a shotgun zone call the offset back lines up away from the run and crosses the QB's face. |
| `RUN_ARMS` | `carrier.ts` lane forecast | A block holds a defender's feet, not his arms: his release allowance applies only beyond his reach. |
| `RUN_PROJECT` | `carrier.ts` `runReadAim` | The entry route check meets each body where his seen motion puts him (at most 0.6 s ahead). |
| `LOG_READ` | `carrier.ts` `runReadAim` | Kick or log is read from the seen kicker against his installed end, not the kicker's own tag. |
| `LANE_DEPTH` | `carrier.ts` `runReadAim` | A closed lane also costs the yards behind the line where the runner is met on the way. |
| `KICK_INTERCEPT` | `blocking.ts` pull track | A kick/trap puller's flat track aims where the end will be when he can get there (the climbs' intercept law). |
| `LOG_CONTACT` | `blocking.ts` `readLogAtContact` | A kicker whose end crossed his face as they met logs him: the drive turns inward. |

No capacity, rating, contact law or defensive controller changed. The gait
law (`locomotionAccel`) changed only under `GAIT_STEP`.

## Results

Lab arms, pinned profile, same cases and seeds. Before = the contact-model
package (`cmF*`); after = all five flags (`sa1co`, `fk1gap`, `sa1gun`).
Shared operator (`scripts/diag/stretch/bands.py`, `scripts/mechanics/metrics.py`)
against the committed NFL 2022 reference.

| | zone (ace) | shotgun zone | gap | NFL |
|---|---|---|---|---|
| Lost yards | 15.3 → **6.4%** | 9.2 → **5.5%** | 5.9 → 5.3% | 7.6 / 7.6 / 7.4% |
| Distance from NFL run distribution (TVD) | 13.6 → **9.8** | 10.2 → **7.2** | 14.0 → 17.4 | |
| 10–19 yd | 5.0 → 4.8% | 5.8 → 7.0% | 6.3 → 6.7% | 8.6 / 8.6 / 11.3% |
| 40+ yd | 6.6 → 7.2% | 5.0 → 6.2% | 7.8 → 9.0% | 0.8 / 0.8 / 2.0% |

By concept (lost / median yards):

| | before | after |
|---|---|---|
| Inside zone (ace) | 4.5% / 4.9 | 2.2% / 5.1 |
| Outside zone (ace) | 19.8% / 2.8 | 8.5% / 2.8 |
| Wide zone (ace) | 21.8% / 2.7 | 8.5% / 3.1 |
| Shotgun OZ / WZ | 8.5% / 3.4, 13.5% / 3.0 | 4.5% / 4.4, 8.5% / 4.1 |
| Power | 12.2% / 4.3 | 7.5% / 5.3 |
| Counter, duo, trap | 9.8 / 1.0 / 0.5% | 10.0 / 1.2 / 2.5% |

Mechanism checks, same operator:

- **Outside-zone crossing vs the play-side end** (`oz-edge.py`): inside/at/outside
  51.5/20.5/28.0% → 69.5/14.5/16.0% (tracking 64.7/13.0/22.3%); runs at the end
  lose yards 49% → 22% (tracking 22%).
- **Doubles released by 2.0 s** (`combo-owner.ts`): 47–77% → 63–80% by man
  position; stranded owners (under 0.3 s on the man, no release) disappear.
- **Power kick lane** (`kickout-timing.py`): the back reaches the end's lane at
  1.1 → 0.6 yd deep (tracking 0.5).
- **Second-level contact** (`second-level.py`, OL/TE within 1.2 yd of a
  linebacker by 1.5/2.0/2.5 s): ace zone 16/52/71% (tracking 16/50/70%), gap
  8/50/70% (16/51/73%). Shotgun zone is low: 7/23/47%, 69% ever (86%).

With `GAIT_STEP=0.3` (Part 8's responsive body, not in the profile) the same
flags cut outside/wide-zone losses 17.0/19.8 → 13.2/12.2% (`COMBO_SOLO` plus
`STRETCH_AIM`) and power losses 18.0 → 11.2% (`FB_KICK`).

## The under-center exchange package (Part 6), now on

Part 6's `UC_MESH MESH_TEMPO QB_CARRYOUT PACE_LEAD` (the under-center
exchange at tracked depth and time, the back taking the ball at tempo, the
QB's carry-out, the back pacing a lead from his real motion) was held at
review and never in the pinned profile. Re-measured on top of the five
flags above (`mp1*`), it is on now. Same operator (`handoff-speed.py`,
`mech.py`):

| | before | package | NFL |
|---|---|---|---|
| Back's speed at the handoff, under center gap / zone (yd/s) | 2.1 / 4.3 | **4.0 / 4.8** | 4.1 / 5.3 |
| Same at handoff + 0.5 s | 3.1 / 4.5 | 4.6 / 5.2 | 5.1 / 5.6 |
| Handoff time, zone / gap (s) | 1.55 / 1.56 | 1.45 / 1.40 | 1.30 |
| Line crossing, zone / gap (s) | 2.70 / 3.09 | 2.51 / 2.66 | 2.59 |
| Ace zone TVD / lost | 9.8 / 6.4% | **6.7** / 7.7% | 7.6% lost |
| Ace zone 40+ | 7.2% | 4.5% | 0.8% |
| Gap TVD / lost | 17.4 / 5.3% | **14.5** / 2.8% | 7.4% lost |
| Power / counter lost | 7.5 / 10.0% | **2.0 / 4.2%** | |
| Shotgun zone TVD / lost | 7.2 / 5.5% | 9.6 / 6.7% | |

`MESH_TEMPO` carries the gap gain (without it power loses 8.5%) and is also
the only flag of the four that touches shotgun (a reviewed contract: tempo
engages in shotgun on its own). There it lifts the handoff speed only
2.1 → 2.5 yd/s (tracking 4.1); with `GUN_MESH_SIDE` as well it reaches 3.5,
but shotgun stretch is structurally off before the exchange: the back takes
the ball 1 yd on the backside and crosses 2–3 yd outside the ball (tracking
7.3), the shotgun alignment issue noted in Part 6. `GUN_MESH_SIDE` stays off.
Five scenario witnesses timed on the installed exchange pin the package off
(`combo-strike-access`, `long-run-tail`, `planned-climb-fit`, `trap-read`,
`fb-kick`); `run-game-flags` covers the package.

## Stretch width (user: "our lateral movement on wz/oz has not been wide enough")

The deficit has been on record since the live-gaps work (2026-10-12: "the
ball was narrow") at about the same size, deferred each time as the
engaged-pair problem. One scorecard now measures every group by the side it
stood on (`stretch-width.py`, yd toward the play side at 2.0 s):

| | NFL | before | `ZONE_TE` (profile) | + `GAIT_STEP=0.3` |
|---|---|---|---|---|
| Carrier (crosses the line at) | 5.7 (7.3) | 4.7 (6.0) | (6.5) | 5.1 (7.4) |
| Play-side OL / middle / backside | 4.6 / 5.2 / 5.5 | ~1.5 | | 2.6 / 2.2 / 2.2 |
| Play-side TE / backside TE | 4.2 / 4.8 | 0.4 overall | 3.3 / −0.5 | 3.9 / −0.6 (0.3 with `ZONE_TE`) |
| Play-side DL / middle / backside | 3.4 / 4.7 / 5.1 | 1.0 overall | | 2.2 / 2.0 / 0.8 |
| Backers | 5.0 | 2.5 | | 2.6–3.8 |

What it says:

- **The ball carrier is at NFL width** once the exchange package and
  `STRETCH_AIM` are in; the gait puts his crossing on tracking (7.4 vs 7.3).
- **The backside barely moves.** Tracked backside defenders chase 5 yd by
  2.0 s and the backside blockers flow with them; ours stay home (0.8 yd), so
  the backside tight end has nobody to run with. That is defensive pursuit
  (sent to the defense session).
- **The offensive line is half of tracking** even with the gait. Engaged
  reach blockers match the defender's play-side speed once they have the
  shoulder (`stepRunRep`); with linemen who do not flow, pairs stand still.
- `ZONE_TE` (existing): the inline end runs the zone track. Ace zone TVD
  6.7 → 5.5, outside/wide-zone losses 10.0/12.5 → 9.2/9.2%, medians 3.2/3.1 →
  3.7/3.7; shotgun 9.6 → 9.8. **On in the profile.** A mock-sim stalk test
  exposed the surface check reading the alignment for every kind; the kind
  check now comes first (same behavior).
- **`GAIT_STEP` (the speed-up law)**: first measured here as right for the
  trench but lifting peak speeds above tracking. Now on; see "Gait and pull
  step on" below.
- `MESH_POINT`: the shotgun exchange at the tracked spot instead of at arm's
  length (`gun-mesh.py`): stretch handoff 1.15 s, 0.5 yd own side, 4.1 yd/s
  (tracking 1.1 s, 0.2, 4.7). Without the gait it raised shotgun outside-zone
  losses (6.0 → 16.0%: the back hits a line that has not moved). On with the
  gait (below).
- `RUN_LATERAL DL_FEEL` with the gait (Part 9's stack) make the defense flow
  more and the offense lose more (ace TVD 12.5); not kept.

## Gait and pull step on (user: "turn the gait on and add the pull step")

`GAIT_STEP=0.3`, `PULL_STEP=1` and `MESH_POINT=1` are on in the pinned profile.
Two corrections to the gait law first (`locomotionAccel`, `kinematics.ts`):

- **Direction and effort.** The law pushed on the full-sprint force-velocity
  line whatever the direction or effort, so a backpedal, a shuffle or a
  half-effort start accelerated like a forward sprint. It now pushes on the
  line of the speed he can reach in the wanted direction at that effort (the
  same directional cap the default law uses).
- **Holding ground.** Near standstill the law eased every correction over the
  0.3 s step, so a planted blocker answered a push softly. Only building speed
  along the wanted line is eased now; recovering lost ground and shedding
  drift are leg force, as fast as the legs allow (braking above 0.35 yd/s
  was already immediate).

Contracts: `test/gait-step.test.ts` (levels off at a wanted half speed within
a second without overshoot; backpedal and half effort accelerate less;
holding ground is not eased), `test/pull-step.test.ts` (power/counter, both
sides: the puller is 0.25-0.30 yd toward the hole at 0.5 s, 0.10-0.16 without
the open step; hips open, never past 100 deg toward his backfield). The pass
anchor fixture (`pass-contact`) scaled only the end's power, leaving him a
first step 2.3 times stronger than his own push (every generated roster has
first-step force below push force, EDGE at most 0.94); its weakened bodies now
lose first-step force with their push, and the anchor holds (0.03 yd) while a
clear drive advantage moves it (0.47-0.80 yd) under both laws. Nineteen timed
witnesses and exact replays are pinned to the laws they were recorded under.
`tackle-support-choice` is pinned for a different reason: under the default
gait the pinned contact package (`LEG_FV WRAP_BIND TETHER`; any one off removes
it) already splits that rear-finish fixture by 0.25 yd/s between 12 and 48
substeps when the carrier asks 6.1-6.2 yd/s (the fixture asks 6.0). The gait's
stronger drive crosses that threshold. It is a contact-solver discontinuity,
recorded for the physics owner, not a gait property.

Lab arms against the committed profile (same bodies and seeds; `gs1*` new,
`zte0co`/`zte0gun`/`gs0gap` before):

| | before | gait + pull step + gun mesh | NFL |
|---|---|---|---|
| Ace zone TVD / losses / 10-19 | 5.5 / 6.3% / 5.8% | 7.1 / 6.4% / 2.9% | 7.6% / 8.6% |
| Gap TVD / losses | 14.5 / 2.8% | 12.2 / 7.4% | 7.4% |
| Counter / power losses | 4.2 / 2.0% | 21.0 / 5.8% | |
| Shotgun zone TVD / losses | 9.8 / 7.7% | 13.3 / 16.3% | 7.6% |
| Shotgun outside / wide zone losses | 9.5 / 10.0% | 20.0 / 23.0% | |
| Stretch: play-side OL at 2.0 s, carrier crossing | 1.6, 6.5 yd | 2.5, 7.3 yd | 4.6, 7.3 yd |

8 games (`mech:sim`, `sim-gs1`), against the earlier gait law at the same
step (`sim-g1`): DB max acceleration 5.66 → 5.04 yd/s² (NFL 4.24), LB 5.27 →
4.88 (4.42), QB 5.33 → 5.03 (3.84); DL max speed 4.45 → 4.12 yd/s (4.07), OL
3.76 → 3.58 (3.26). Receivers and defensive backs still exceed tracked top
speeds (WR 7.75, NFL 6.45; 7.00 already without the gait): those controllers
ask for near-top speed on routes and in coverage (route/coverage owners).
Median run 3.7 yd (NFL 3.0).

What the gait exposes (the old law hid these; they are this branch's next
work, not reasons to turn it off):

- **Counter log plays.** With the pull on time, the kicker meets a squeezing
  end earlier (1.90 s) and more often ends outside him: logs 37 → 55% of
  counters (`out/counterprobe.ts`). The end keeps penetrating to about 1.3 yd
  deep, and the back's path outside the log runs behind him, within his arms:
  he tackles from the block (54 of 84 counter losses). Log plays lose 26%
  (5% before).
- **Reach blocks give ground.** Engaged DL are 1.2 yd in our backfield at 3 s
  (tracking: driven back 0.2). On outside zone ours keep penetrating after
  2.0 s (-1.06 → -1.37 yd at 2.5 s) where tracked DL are pushed back (-1.20 →
  -0.93; `oz-flow-profile.py`, now with DL depth). A stretch rep's normal
  request follows an attacking defender backward (up to about 1 yd/s); the
  existing `STRETCH_FLAT` removes that and is being measured.
- Shotgun stretch losses double. Not yet attributed.

## What the gait exposed, first repairs

All on in the pinned profile, defaults off. Same arms as above (`fc1co`,
`rd1gap`, `fc1gun` = the new profile; `zte0co`, `gs0gap`, `zte0gun` = before
the gait):

| | before the gait | gait on | + repairs | NFL |
|---|---|---|---|---|
| Ace zone TVD / losses | 5.5 / 6.3% | 7.1 / 6.4% | 5.4 / 6.2% | 7.6% |
| Ace stretch losses, inside-zone median | 9.2%, 4.1 | 8.0-9.8%, 3.6 | 8.2-8.5%, 4.4 | |
| Gap TVD / losses | 14.5 / 2.8% | 12.2 / 7.4% | 18.1 / 3.5% | 7.4% |
| Counter / power losses (median) | 4.2 / 2.0% (4.6 / 6.3) | 21.0 / 5.8% (4.1 / 4.7) | 6.0 / 3.0% (5.6 / 5.3) | |
| Shotgun TVD / losses | 9.8 / 7.7% | 13.3 / 16.3% | 9.0 / 5.8% | 7.6% |

8 games (`sim-fc1`): median run 3.72 → 3.95 yd (NFL 3.0), after contact 2.42
(2.4).

- **The shotgun back aligned on the play side (`RB_AWAY`).** Gun doubles puts
  the back on the weak side, so every weak zone call was a same-side
  exchange: he ran two yards back toward the QB for the ball, took it moving
  backside at 3 yd/s and reversed (`out/rbmesh.ts`). Those runs lost 16-17%
  before the gait and 30% with it; crossing runs 3% and 10-16%. Tracked
  offenses align the back away from the run (`gun-mesh.py`: 231 of 250 stretch,
  693 of 777 inside zone); the 19 tracked same-side stretches hand off 4.8 yd
  outside the ball. With the back aligned away, same-side losses are gone
  (30 → 3-4%) and shotgun losses 15.7 → 6.2%. The defense aligns to the moved
  back. Same-side geometry itself (`meshFor`) is unchanged.
- **Blocked defenders still have arms (`RUN_ARMS`).** Most losses with the
  gait are tackles from a block (shotgun stretch 55 of 86, counter 54 of 84):
  the lane forecast gave every engaged defender 0.7 s before he could touch
  the runner, even for a lane brushing his chest. Small gains everywhere
  (shotgun TVD 13.3 → 12.3, ace 7.1 → 6.9).
- **Counter's entry read (`RUN_PROJECT LOG_READ LANE_DEPTH`).** On counter log
  plays the end crosses the kicker's face after contact, so the kicker never
  tags a log and the back's preferred lane was inside the kicker, where the
  end is (`LOG_READ`, alone inert). The route check placed a penetrating end
  where he stood, not where he would be (`RUN_PROJECT`). In traffic every lane
  scores closed (risk 4-11) and the least bad was a far-outside dog-leg behind
  the line; a closed lane now also costs the yards behind the line where the
  runner is met (`LANE_DEPTH`). Together: counter losses 20.5 → 18.0%, power
  5.2 → 3.0%, duo 0.5 → 0%, medians up 0.4-0.5 yd; ace zone TVD 6.9 → 5.4
  (inside-zone median 3.6 → 4.4). Against: gap TVD 12.2 → 15.9 and shotgun
  8.1 → 9.0. The gap runs' 4-9 yd band (already 46%, NFL 39%) grows to 49% and
  the 40+ tail is the defense's pursuit; but these are decisions measured as
  better football (fewer runs met behind the line), not tuned to a band.
- `STRETCH_FLAT` (reach blocker never asks to retreat) measured with the gait:
  nearly inert (shotgun losses 16.3 → 15.2%, DL depth at 2.5 s -1.37 → -1.25).
  Absolute DL depth on shotgun stretch is at or shallower than tracking (median
  -0.2/-0.3 yd at 2.0/2.5 s, NFL -0.2/+0.1; deepest tenth -1.6/-2.1, NFL
  -2.2/-2.4; `out/dldepth.py`), so penetration itself is not the shotgun cause.
  Off.

- **The counter kicker overran his man (`KICK_INTERCEPT LOG_CONTACT`).** The
  flat pull track aimed 0.65 yd inside the end's *seen* spot. Against a
  squeezing end that station slides toward a puller already running flat at
  3.6 yd/s, so he arrived 0.3-0.8 yd outside the end: a log nobody called.
  The approach's log check (a delayed picture, a quarter yard ahead of
  contact) never fired, and the engagement kept the kick-out drive from
  outside the man, so the end slid past into the backfield and took the back
  from the block. The track now aims where the end will be (the climbs'
  intercept law); a kicker the end still crosses at contact logs him and
  drives him inside. Counter losses 18.0 → 9.8% (intercept) → 6.0% (both),
  median 4.6 → 5.6 yd (`out/counterprobe.ts`: log plays 26 → 3% lost).
  Meeting geometry stays on tracking (`kickout-timing.py`: kicker inside the
  end at the meeting 97%, NFL 84%; met at 2.0 s, NFL 1.8). Gap TVD 15.9 →
  18.1: losses now fall below tracking (3.5%, NFL 7.4) and the 4-9 yd band
  stays at 50% (NFL 39%); the 40+ tail (8.9%, NFL 2.0) is pursuit.

Contracts: `test/rb-away.test.ts`, `test/run-arms.test.ts`,
`test/run-read-fixes.test.ts`, `test/kick-log.test.ts`. `run-reach` isolates
the reach rule with `RUN_PROJECT` off; the FORCE_DEPTH witness in
`long-run-tail` pins the new reads; `motion-contact` (a split-zone H-back
recorded unable to reach) pins the kick flags.

## Gap schemes: the blocks that build the hole (user: "keep working on our gap scheme concepts")

A diagnosis workflow (36 agents) found 29 candidate mechanisms on power,
counter, trap and duo, and an adversarial verifier re-checked each with the
same operator on 2022 tracking and lab film: 1 confirmed outright, 26
"partly" (the symptom reproduced; the stated cause, size or fix did not), 2
refuted. Its ranked synthesis (offense items O1-O7, defense D1-D6, contact and
physics) drives this section. Then an adversarial code review (four lenses,
each finding re-checked by a skeptic) of the first repairs found four real
defects, repaired below before anything stayed on.

### On in the profile (defaults off)

- **`GAP_OUT`** (`planRunBlocking`): a play-side man aligned more than 0.3 yd
  outside his blocker, and outside the hole, is blocked out (inside shoulder,
  driven outward), not down. Down-blocking him drove him across the blocker's
  face into the trap hole (trap weak I-pro: runs under 2 yd 12 -> 6 of 20).
  Review repair: the first version ignored the hole and, on power, drove men
  lined up inside the off-tackle hole across it.
- **`CUTOFF_SEAL`** (`createEngagement`, gap schemes only): a solo backside
  cutoff takes his rep from his man's play-side front (30 deg play side of
  head-up), driving him away from the play. The installed cutoff drive's seal
  side lay backside, so pairs drifted away from the play. Review repair: the
  first version set only a seal angle in the old drive frame; that target was
  no resting point of the feet law, blockers overshot past the man's flank
  into the region read as a lost block (`win >= 0.6`), and the change leaked
  into zone cutoffs. Now the front is the rep's axis (phi at +1 s 1.37 -> 0;
  held reps 7 -> 11 of 36; the man 0.5 yd deeper). A skeptic's alternative
  (install the front as a contact surface, no drive) held as well without
  pushing the man; recorded, not taken.
- **`GAP_FIT`** (`RunBlocker.attack`): first-level gap blocks by a lineman or
  inline end on a man at the line close on his near surface on the zone
  track's depth law instead of running through him. Down blocks met their man
  at +1.07 yd/s upfield at 0.5 s (tracking +0.42) with the same lateral; with
  the law +0.38. Review repairs: the depth target now allows for lateral
  offset (double-team members had stalled at the line and climbed from behind
  it; now they touch at -0.04 yd and leave at +0.46, as with the flag off), it
  covers inline ends on the same jobs, and toss/draw (zone-planned) are out.
- **`LANE_DEPTH` meeting point** (`runReadAim`): a closed lane costs the yards
  behind the line where the runner and the first defender meet: a free
  defender closes from the entry; one the runner sees body to body with an
  upright blocker meets him at the entry. A contract test caught the first
  version reading the engagement record; it reads pictures only.
- **`FRONT_FIT`** (`team.ts pickDefense`): interior line slots weigh
  familiarity at DT, as the edge slots weigh it at EDGE. Raw 3-technique
  suitability (pass-rush finesse, burst, agility; no mass or strength) put a
  109-114 kg EDGE at DT in 32 of 120 base 4-3 slots across 60 generated teams,
  including the lab defense's DT_S; 60% of box defenders on gap runs were
  under 125 kg (tracking 13%). The displaced edge may play SAM. Inside-zone
  doubled DL driven back at 3 s +1.0 -> +0.4 yd (NFL +0.5).
- **`TRAP_FIT`** (`RunBlocker.update`): a trapper on the last leg of his pull
  fits his man, as the counter kicker already did. Across 40 trap cells he
  engages 0.05-0.15 s earlier or the same; last-leg reversals 5 -> 0.

| Lab arms on `1903df6a` (TVD to NFL60; losses) | zone | gap | shotgun |
|---|---|---|---|
| Profile before `FRONT_FIT TRAP_FIT` (`p5`) | 5.9; 6.0% | 16.2; 3.8% | 9.0; 5.3% |
| + `FRONT_FIT` (`g5`) | 4.2; 8.8% | 13.3; 3.8% | 11.5; 8.2% |
| + `FRONT_FIT TRAP_FIT` (`t5`, gap only) | | 13.4; 3.6% (trap 3.8 -> 3.0%) | |
| + `FRONT_FIT OL_ALIGN` (`o5`) | 12.2; 9.8% | 10.5; 5.9% | 15.4; 9.0% |
| NFL | 7.6% | 7.4% | 7.6% |

With real tackles inside, shotgun stretch losses rise to 10-14% (tracked
outside zone 10.9%) and its 4-9 yd band falls to 25% (NFL 37%).

### Off, with reasons

- **`OL_ALIGN`** (tracked line depths and splits) puts pullers on NFL lateral
  timing by 1.5 s (3.5 yd, NFL 3.5) and gap runs closest to tracking (TVD
  10.5), but doubles counter losses (13%; the kicked end tackles from his
  block more) and crowds zone and shotgun runs into 0-3 yd (54-56%), partly
  because backers fill early (the defense session's). Diagnose before on.
- **`DOWN_SEAL`** (`stepRunRep`): the owner of a gap down block reads his man
  from his own picture and mirrors only motion toward the hole. Down-rep wash
  at +1 s -0.92/-0.89 -> -0.69/-0.69 yd (tracking +0.2/-0.1); the rest is the
  defender's flow term (defense) and glued pairs (below). Gap arms on
  `47236478` (1,600 paired plays): TVD 13.4 -> 14.5, losses 3.6 -> 4.3%; on
  the 357 counter plays whose result changed, 20 new losses and 13 losses
  gone (trap 11 and 7, power 9 and 9), median change +0.24 yd: no outcome
  change beyond chance. Off until the glued-pair law lands, which holds the
  larger part of the wash.
- **`LEAD_HIP`** (lead puller turns up on the hip of the kick he sees; no
  private `block-log` read): won a three-design panel. On 120 fresh-seed
  power/counter plays the lead blocks a backer before the back crosses 6 ->
  34, losses 10 -> 5, gain p50 3.72 -> 4.11 (second seed set 9 -> 30, 3.27 ->
  4.26). Adverse cell: weak-side power-I, where the back bounces outside the
  kick 36 of 40 times either way. Two skeptics rated it flawed: the lead
  fixes his side before he turns up, and on every play he turns up before
  the kick lands, so the seen-log branch fired on 1 of 480 plays while
  counter kickers log about 90 of 160; he stays inside while the back goes
  outside (lead-carrier lateral at the cross -1.35 -> -2.7 yd). He also fell
  back to the installed backer his read had rejected, counted any nearby
  teammate as a block, and changed men about 4 times per play (off: 0.1).
  The probe stopped at 8 s and scored 19-28% of plays, mostly long runs, as
  0 yd. Gap arm: TVD 13.4 -> 14.6, counter losses 6.8 -> 7.5%, power 4.5 ->
  3.5%; with `DOWN_SEAL` too, TVD 15.8 and counter 9.2%. Repair (two
  attempts, then stopped for re-diagnosis as the rules ask): the probe now
  finishes every play and splits kick-out from log geometry; the lead keeps
  reading the kick behind the line, holds his man until that man is seen
  blocked, leaves the hole or someone steps into his path, and with nobody
  to fit continues up the runner's track instead of returning to the man
  his read set aside; every depth term follows the attack direction. On 240
  plays (seeds 2,71001,1,3; off -> on): backers blocked before the back
  crosses 15 -> 53, A-B-A returns 137 (first version) -> 70, gain p50 5.33
  -> 5.46, losses 16 -> 14. The log read still fails live: on log plays his
  turn-up ends 1.5 yd inside the kicker (outside on 4 of 94), so the seen
  log does not move him. In both arms the back crosses 1.3-2.1 yd outside the
  kicker, so the lead's side waits on the runner's path (O5) and the
  outside force (D1). Flag-off results are identical (120 plays).
- `READ_BLOCKS` (an engaged defender must get off his block to cover ground
  beyond his reach) left the runner's inside entries at 23-24% and read the
  private block-win value: removed. `LEAD_READ` stays off (untouched backers
  in on the tackle 34 -> 37%).

### What the runner's read is not

Tracked backs on power go inside the kick-out 69% of the time; ours 15%.
Forcing the back inside whenever his read preferred the kick's inside surface
(`scripts/diag/gap/forcein.ts`, run-read observer, no source edit) doubled
inside entries but left power gains unchanged (p50 2.55 -> 2.89 on the 47
changed plays) and made trap worse (losses 0 -> 7 of 70). The short runs
inside are the MIKE filling and the kicked end: the lane is not open in the
physics, so the read is roughly right about it.

### Engaged pairs: the wash is the controllers', not the hands

A diagnosis on 240 lab gap plays (down reps about 520, backside DL about 230)
logged each tick's requested and achieved velocities, the hand steer row
against its limit, torso contacts and leg saturation, then ablated the row.
The steer row is not a velocity lock: it sits at its limit (about a quarter
of one leg budget) on 82-89% of substeps and halves the pair's relative slip
(down reps 1.42 requested, 0.66 achieved; 1.28 with no steer). The pair's
lateral wash (-0.97/-0.93 yd at +1 s, tracking +0.2/-0.1) is a leg contest
in which both bodies ask to go backside: the down blocker's installed 45 deg
drive is -1.11 of his -1.32 yd/s lateral request, and the defender's command
averages +0.13 (he asks backside on 48% of ticks, following the blocker's
seen flow through `DL_FLOW`'s held term). With the steer intact, zeroing the
blocker's lateral request leaves -0.08/-0.06; a defender who asks to fight
toward the play goes +0.81/+0.34, and on the ticks where he already does the
World gives +0.19/-0.15, the tracked values. Every steer ablation moves the
wash by 0.2 yd or less without changing its sign. A backside DL who asks
toward the play moves the pair (+1.0 yd/s with `BACK_CHASE`); his reported
"asks +2.7, achieves -0.5" is mostly a 0.1-0.25 s lag. So the defense's
fight against pressure (handoff D2) is not blocked by physics.

The incoherent physics is narrow: a defender who controls the hands (45% of
down ticks) brakes his own slip. Removing only that brake doubles down-rep
flips (6 -> 11%), but the same coupling holds up pass protection (pressure
in 2.5 s 4 -> 16%) and doubles (driven back +0.34 -> penetration -0.66): a
replacement must be a hand-intent law (the steer row aims at the steering
actor's chosen hand motion within the arm budget) judged on down reps, pass
protection, doubles and the hands bench together. Its three design
prototypes did not finish (session limit); the diagnosis's probes are
preserved outside the repository. `DOWN_SEAL` stays off: the blocker's
seal reads were not what moved the pair.

### Leverage at the pass (`scripts/diag/runblock/leverage-pass.py`)

One operator for tracking and lab exports: when the runner passes a
defender engaged with a blocker (centers within 1.2 yd for 0.3 s, matched
one to one), is the blocker between them, and does the runner pass on the
blocker's side (covered) or the defender's free side? Block leverage is
already tracked: the blocker holds the defender's play side / backside at
the start of the engagement 26/54% on gap runs (tracking 36/47%) and 28/52%
on zone (22/56%). The runner's side is not:

| Runs | covered share of sided passes | runner passes the man's play side / backside | covered when the blocker is backside |
|---|---|---|---|
| Gap, under center | 47% (tracking 58%) | 61/35% (49/46%) | 36% (55%) |
| Zone, under center | 40% (55%) | 63/34% (41/55%) | 24% (60%) |
| Zone, shotgun | 38% (56%) | 53/45% (39/54%) | 33% (64%) |
| Duo | 60% (55%) | 60/38% (56/39%) | 48% (46%) |

Tracked backs cut behind a man whose blocker has his backside; ours keep
going to the play side, around him. On the covered side the blocker's body
does take the arm away: an engaged defender converts to first contact at
11-15% there, as in tracking (11-16%). Duo, whose aim follows the read key's
motion, is the one concept that matches. This gives the next runner work
(the read has no term for which side of an engaged man his blocker is on)
and answers the defense session's reach question: its free-arm reach adds
contacts where our runner over-exposes the free side, and blocked contacts
come 0.3-0.8 yd deeper. Thresholds (1.0/1.5 yd, 5 Hz, 0.4 yd body) keep the
gap. The three adversarial checks planned for the operator did not run
(session limit); its play-side inference matches the designed direction on
97-100% of gap and zone plays.

**Why the runner takes the free side** (`scripts/diag/gap/coverside.ts`, the
read's own candidates on 240 zone plays): he passes on whichever side his last
read chose (read covered, passed covered 18 of 18; read free, passed free 36
of 39), so it is the request, not his body. When the blocker has the man's
backside, the best covered-side entry is as closed as the free side (risk
12.4 vs 11.7; first defender there 0.87 s before the runner). The read timed
the engaged man on a straight line through his own blocker; `COVER_READ`
(off) routes him around the blocker's body, which takes him out of first
place on 83 -> 58 of 259 reads, but the covered entry stays closed by the
next man: an untouched backer (42 -> 107) or the next DT. Our zone backers
stand 1.8 yd deep a second after the handoff (tracking 2.5) and the untouched
ones are in on the tackle 45% of the time (32%; `second-level.py`): the
cutback behind a block is shut by the second level, which the defense
session owns. `COVER_READ` stays off until backers flow.

### For the defense session (taken there)

The run-defense session took the linebacker fill (its pull read waits for the
guard to be 0.5 yd deep and 1 yd across; backers flow 0.0 yd by 1.5 s on gap
runs, tracking 1.6), the backside DL's early read of the pull, and the
blocked-defender reach (`tryTackles`' `win >= 0.6` gate): flags on its branch.
Its log of the reach's added attempts puts most of them on the back's path off
the kick-out (outside an end kicked from inside, or inside a man logged from
outside): the runner's commitment below, not the gate.

**D1, the outside on power, counter and trap (handed over, not built).** At
the moment the back reaches 2 yd short of the line, defenders aligned outside
the play-side surface who are free outside the bounce point (1 yd past the
line, 2 yd outside the wider of the edge and the kicker): tracking 0.52 per
play, the lab 0.00 at `47236478` (`scripts/diag/gap/force/outfate.py`). The
outside-aligned backs collapse from 2.9 yd outside the surface at the snap to
0.6 by then (tracking holds 4.1; `blat.py`). In the code: `forceTrack`
aims at the greater of the runner + 0.7 and the surface + 0.5, at depth
`clamp(0.55 x homeDepth, 1.5, 6)` (`run-fits.ts executeRunFit`); `buildRunFits`
gives `tite4` no play-side force, `over4`'s Sam plays his inside gap first,
the cover-1 SS lines up inside the end; and the kicked end asks to widen away
from the hole (-1.9 yd/s; tracked ends squeeze, -0.6 to -1.6). End alignment
is not the cause (`edgealign.py`: in `wide9` the end stands 1.6 yd outside
the tight end and the bounce point is still free). Bounces average 16 yd and
make 104 of 120 gap runs of 40+ yd; `bear1` (goal line, no deep safety at
midfield) gives 47 of them, so report it apart (`bylook.py`). Operators take
`out/mechanics/nfl-plays.jsonl.gz` and an arm's `-common` file, from the repo
root. The runner's commitment (O5) is measured against the current defense,
stated as having no D1.

## The back's pace and the fit (on the tracked line, `f58cade4`)

Games (`out/align/sim-ps3`, 16 games) against 2022 tracking: the back meets
first contact at 6.0 yd/s (NFL 4.5; peak before it 6.7 vs 5.7), 1.5 yd past
the ball (0.6), and yards after contact keep the NFL median (2.4) with a
long tail (mean 5.2 vs 3.3, broken contact 18% vs 12%). In the lab
(`scripts/diag/align/backpace.py`, under center), NFL inside-zone and power
backs hold 4.8-5.2 yd/s, are slowest about 1.5 yd behind the ball 0.8 s
after the handoff, and meet contact at 4.2-4.5 yd/s right at the line; ours
are slowest at the handoff and meet contact at 6.3-6.5. Outside zone is
close (NFL 4.9, ours 5.9).

Tried and removed, `READ_PACE`: while his entry read is open (more than one
entry scoring within his design margin), the back presses no faster than
lets him brake and still cut, at the decision depth, to the sharpest open
entry (corner speed on his own lateral envelope). First in the designed
press only (no change: that phase ends 0.3-0.8 s after the handoff), then
also in the ordinary entry phase: contact speed 6.3 -> 6.0 (inside zone),
6.5 -> 6.1 (power), 5.9 -> 5.2 (outside zone); zone TVD 11.7 -> 18.7 (0-3 yd
53 -> 57%), gap 12.4 -> 10.8. Two attempts did not move the slowest point
toward the NFL's, so the law was removed and the cause re-diagnosed.

The fit (`scripts/diag/align/lbfit.py`): our box backers come downhill
about twice as fast in the first second (inside zone 2.95 yd/s at 1.0 s,
NFL 1.45; power 2.65 vs 1.55) and are closer to the line at 2.0 s (1.6-1.8
yd deep vs 2.2-2.5), yet first contact on power is later and deeper (3.0 s,
+1.6 yd; NFL 2.7 s, +0.3). They arrive early, get climbed on or overrun,
and the back runs past them at speed. That is the backers' fit tempo
(read, then fill), with the run-defense session (numbers sent). The lab
also shows three box backers per snap (NFL two): six of its ten fixed
looks are base 4-3, and the goal-line Bear at 60+ yd to go supplies a third
of counter's 40+ runs. The harness should call the defensive caller by
look and situation once it picks fronts that way (asked).

Where the gap-run tail comes from (`scripts/diag/gap/third-level.ts`,
`headon.ts`, `scripts/diag/open-field/geometry.py`): on gap runs that reach
10 yd, our defense has a median one defender downfield of the runner, the
deepest 0.7 yd ahead (NFL three, 4.8 yd), and nobody able to reach his path
on 124 of 263; 57% of them go 40+ (NFL 4.9%). The last men are defensive
backs whose wraps at 6+ yd/s from the side or behind break (corner from the
side 39%, safety from behind 45%; from the front 5-14%), with nobody behind
them. The goal-line Bear at 60+ yd to go adds a third of counter's 40+.

The earlier fit flags on this branch (Parts 11-12; not on develop or the
run-defense branch), all six on (`d9`: `LB_DEPTH DEEP_CAP FORCE_DEPTH
EDGE_SQUEEZE SHED_PURSUE BLOCK_FRONT`) against the profile (`p8`):

| Lab | losses / 0-3 / 4-9 / 10-19 / 40+ | TVD |
|---|---|---|
| NFL zone | 7.6 / 44.7 / 36.8 / 8.6 / 0.8 | |
| zone `p8` -> `d9` | 10.2 / 52.8 / 30.5 / 4.1 / 1.8 -> 5.9 / 44.8 / 41.2 / 6.5 / 1.1 | 11.7 -> 4.7 |
| NFL gap | 7.4 / 36.8 / 39.2 / 11.3 / 2.0 | |
| gap `p8` -> `d9` | 4.8 / 34.1 / 44.2 / 6.1 / 9.3 -> 3.2 / 28.2 / 37.8 / 21.9 / 5.6 | 12.4 -> 14.2 |

The backers' tempo overshoots the other way (power downhill at 1.0 s 2.65
-> 1.15 yd/s, NFL 1.55; depth at 2.0 s 1.59 -> 3.18, NFL 2.15), hence the
gap 10-19 yd surplus; the secondary is still thin at 10 yd (deepest 1.8 yd
ahead). Fits are the run-defense session's: the arm and a proposal went
there (interim base for these arms, or their own port).

Called looks (`scripts/diag/zone-lab/lab.ts`, `--looks call1,...,call10`: a
fresh defensive coordinator per rep calls 1st and 10 from the offense's 30
for the formation's personnel; the fixed ten looks stay for matched
comparisons): on the same profile, gap TVD 12.4 -> 9.2, zone 11.7 -> 6.7,
shotgun outside/wide zone losses 9-11% -> 5%. The fixed list inflated the
distance from NFL. The tail stays (40+ gap 10.2%, zone 3.6%; NFL 2.0,
0.8): at 10 yd the deepest defender is 0.2 yd ahead of the runner (NFL
4.8), with 0-1 defenders downfield on 268 of 301 runs. The six fit flags on
called looks cut gap 40+ to 6.2% but overshoot the backers (TVD 12.7 /
8.6), so they stay off; backer tempo and the secondary's run-support depth
are with the run-defense session.

Per concept on called looks (`c8`; NFL 2022, 60+ yd to go): power median
3.9 (NFL 4.0), losses 7.8% (8.0); counter 4.4 (4.0), 8.8% (8.1); outside
zone 3.2 (3.0), 11.5% (9.5); inside zone 4.5 (3.0), 2.5% (4.9). Every
concept is short of 10-19 yd runs and long on 20+ (the tail above). Duo
stands apart: median 6.3 with 0.5% losses (NFL man/duo 3.0, 7.5%).
`scripts/diag/align/dlwash.py` (line defenders single- vs double-blocked,
driven back by 1.5 / 2.5 s): duo doubles +0.47 / +1.49 yd (NFL -0.39 /
+0.06), singles -0.15 / +0.34 (-0.75 / -0.32); inside zone and power hold
ground like NFL linemen. Duo climbs are NFL-like (`climbphase.py
--concepts duo`: 41% touch then reach a backer, NFL 38%). The engaged reps
(`scripts/diag/gap/drive-push.ts`): both sides push with saturated force
(World's lean force saturates whenever a body is slower than its request
along the load); duo's straight drive keeps pushing for 2.5 s where zone
and power blockers taper after 1.5 s, so duo is a pure force contest the
line wins. Both sides carry posture 0.85, so pad level does not enter it.
Open, with the run-defense session: the defender's technique against a
vertical drive, or a leverage term in the push law (physics).

Outside-zone flow, split between the sides (called looks; the run-defense
session's measurement on this profile: their linemen follow the play-side
guard at 0.62 / 0.80 of his lateral at handoff +0.3 / +1.0 s, NFL 0.79 /
0.86, so the line's own flow is the main lever early). By state, the
guard's 1.0-1.5 s shortfall is about 40% the climbing guard (0.3 yd/s
sideways; NFL guard about 3), who aims at a backer that comes downhill
before he scrapes (`lbfit.py` play-side scrape at 1.0 / 1.5 s: NFL 3.05 /
3.95 yd/s with 1.45 downhill; ours 1.35 / 2.95 with 1.90 downhill), and
the rest engaged reach/runoff/seal/helping reps at 1.6-1.9 yd/s achieved.
The engaged reach follows the defender's lateral speed plus a shoulder
correction, so each side follows the other. `RUN_CONTACT_TRACK` (existing
trial: the reach's track tempo through contact) moved the guard 2.15 ->
2.28 yd at 1.5 s and made zone slightly worse; it stays off.

Three blocker-side changes for that flow, each tried on called looks and
removed (outside zone, play-side guard lateral at 1.5 s, NFL 3.23 yd;
profile 2.15):
- `RUN_CONTACT_TRACK` (existing trial: the reach track tempo through
  contact): 2.28; zone TVD 6.7 -> 8.5.
- `REACH_TEMPO` (engaged reach short of the shoulder runs at his lateral
  capacity instead of matching his man): 2.31; outside zone losses 11.5 ->
  9.0%, shotgun wide zone 5.5 -> 8.0%; backer scrape unchanged.
- `CLIMB_ANGLE` (climber's meeting point never short of his own run on the
  stretch angle at the backer's depth; Ravens "LB on the angle, PS #"):
  2.33; backer scrape at 1.5 s 2.95 -> 3.35 (NFL 3.95); 0-3 yd runs 46.9 ->
  49.2%.
None closes it. Line, backers and climbers follow each other (the
run-defense session's trace: the backers' scrape follows the line's live
gap speed, and their own backer mirror only overflowed), and the part no
technique reaches is the start: in the first 0.5 s the free guard requests
1.95 yd/s sideways and achieves 0.80 (0.37 yd at 0.5 s, NFL 0.55), then
2.29 vs 1.88. That is start-up acceleration in the gait law (N3), and the
backers' first step before their run read (run-defense session, next).

**Correction:** the start-up reading above is wrong. The tracked snap frame
lags the snap by about 0.1 s: 63% of NFL offensive linemen and 56% of
defensive linemen are already moving in its first 0.1 s. Shifted by that
lag, our linemen's start-up acceleration matches NFL. What differed was the
defense's start relative to the offense: line defenders started 0.12 s
after the man in front of them (median), vs +0.03 s in NFL runs. See the
snap section of `presnap.md` (`SNAP_REACT`).

Climbs on the tracked line are NFL-like under center
(`scripts/diag/align/climbphase.py --uc|--gun`: touch a down man then
reach a backer 30% of linemen, NFL 34%; by 2.0 s 17%, NFL 18%; direct to a
backer 4%, NFL 5%); shotgun doubles reach backers less (24% vs 30%).

## Evidence against and unresolved risk

- **Gap TVD worsens** (14.0 → 17.4): the pinned body's gap runs were already
  too consistent (4–9 yd 47–50%, tracking 39%; 0–3 yd 28–31%, tracking 37%).
  With `GAIT_STEP=0.3` the same gap arm is at 7.6.
- **Zone 0–3 yd rises** 40.7 → 48.1% (tracking 44.7) and the outside-zone
  back crosses narrower (median 5.8 → 5.0 yd outside the ball; tracking 7.3).
  Part of the width gap is the front: our play-side end aligns at 3.3–4.1 yd,
  tracked ends at 5.5.
- **Line movement is still slow**: outside-zone OL lateral at 1.0 s 0.5 yd
  (tracking 1.8); OL speed at 0.5 s 1.2 yd/s (2.1). Free linemen ask for about
  3.4 yd/s and approach it on the sprint time constant. `GAIT_STEP=0.3` (physics
  flag, Part 8) closes much of this and restores the tracked back track
  (handoff 4.8 yd deep, crossing 7.1 yd wide), but raises zone losses on the
  current defense. Evidence for the physics owner, not in the profile.
- **The back's lane read saturates in traffic**: every lane's nearest-defender
  margin is 0.6–0.9 s negative, so all lanes score "closed" and the landmark
  decides. A detour-around-blockers threat time (`RUN_WALL`) changed nothing
  and was removed.
- **Counter's pulling guard is late**: he meets the end at 2.2 s (tracking 1.8)
  and often ends outside him (a log), with the back reading the log outside
  into an end who keeps penetrating.
- Shotgun backside cutoffs touch nobody by 2.5 s on 34–35% of plays; receivers
  reach their corner 94–99% of the time (tracking 52–56%), yet on gap runs that
  corner is in on the tackle 20% (tracking 10%).
- Not run: 8-game `mech:sim`, `test:integration`. The integration owner checks
  the exact combined candidate.

## For the defense session

Same operator, current profile (`oz-flow-profile.py`, `oz-front.py`,
`second-level.py`):

- **Defensive linemen do not flow.** Outside-zone DL lateral at 0.5/1.0/1.5 s:
  0.01/0.12/0.43 yd (tracking 0.27/1.12/2.47). Inside zone 0.01/0.08/0.23
  (0.08/0.34/0.72).
- **Linebackers fill sooner**: depth at handoff + 1 s 1.8 yd (tracking
  2.3–2.5); an untouched backer is in on the tackle 44% on ace zone (32%).
- The play-side end aligns narrower than tracked ends (above).

## Tried and removed

- `RUN_DEEP`: the dog-leg route may also flatten behind the deepest
  defender. No effect on the track (the back commits to a direct diagonal
  before penetration shows); slightly worse.
- `LIVE_AIM=0` globally: same stretch gains as `STRETCH_AIM`, but shotgun
  inside-zone losses 3.5 → 5.0%; scoped to stretch instead.
- `RUN_WALL` (above).

## Reproduce

```sh
# arms (pinned profile; launcher flags for the before/after)
node scripts/diag/open-field/arm.mjs gs1co
node scripts/diag/open-field/arm.mjs gs0gap GAIT_STEP=0 PULL_STEP=0 MESH_POINT=0 -- --formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3
node scripts/baseline.mjs --candidate -- node --import tsx scripts/mechanics/sim-export.ts --out out/mechanics/sim-gs1.jsonl.gz
node scripts/diag/open-field/arm.mjs fc1gun -- --formations gun_doubles_11 --concepts iz,oz,wz --seeds 77,71001,1,2,3
python3 scripts/diag/runblock/gun-mesh.py out/open-field/all/fc1gun-common.jsonl.gz
node scripts/diag/open-field/arm.mjs sa1co
node scripts/diag/open-field/arm.mjs fk1gap -- --formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3
node scripts/diag/open-field/arm.mjs sa1gun -- --formations gun_doubles_11 --concepts iz,oz,wz --seeds 77,71001,1,2,3
for l in sa1co fk1gap sa1gun; do bash scripts/diag/open-field/common.sh $l; done
python3 scripts/diag/stretch/bands.py zone cmFco sa1co
# mechanisms (scripts/diag/runblock/)
python3 scripts/diag/runblock/oz-edge.py out/open-field/all/sa1co-common.jsonl.gz
python3 scripts/diag/runblock/second-level.py out/open-field/all/sa1co-common.jsonl.gz
python3 scripts/diag/runblock/stalk.py out/open-field/all/fk1gap-common.jsonl.gz
python3 scripts/diag/runblock/kickout-timing.py out/open-field/all/fk1gap-common.jsonl.gz
python3 scripts/diag/runblock/oz-flow-profile.py out/open-field/all/sa1co-common.jsonl.gz
python3 scripts/diag/runblock/handoff-speed.py out/open-field/all/mp1gap-common.jsonl.gz
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/runblock/combo-owner.ts --concepts oz,wz --list
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/runblock/lab-attrib.ts --out out/run-attrib/x.json
# gap schemes (this round): arms p5/g5/o5 (zone, gap, shotgun) and t5 (gap) on 1903df6a
node scripts/diag/open-field/arm.mjs g5gap FRONT_FIT=1 -- --formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3
node scripts/diag/open-field/arm.mjs t5gap FRONT_FIT=1 TRAP_FIT=1 -- --formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3
node scripts/diag/open-field/arm.mjs o5gap FRONT_FIT=1 OL_ALIGN=1 -- --formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3
python3 scripts/diag/stretch/bands.py gap p5gap g5gap t5gap o5gap
python3 scripts/diag/runblock/pullers.py NFL=out/mechanics/nfl-plays.jsonl.gz base=out/open-field/all/p5gap-common.jsonl.gz oa=out/open-field/all/o5gap-common.jsonl.gz
# probes (scripts/diag/gap/, run under the launcher; EXTRA flags via --flag): leadprobe.ts +
# leadsum.py (lead puller), downrep.ts (down-rep wash), cutrep.ts / cutgeo.ts (cutoff reps),
# trapw.ts (trapper), combo.ts (double-team members), forcein.ts (forced-inside counterfactual)
```

Contracts: `test/combo-gap.test.ts`, `test/run-reach.test.ts`,
`test/combo-solo.test.ts`, `test/stretch-aim.test.ts`, `test/fb-kick.test.ts`,
`test/mesh-point.test.ts`, `test/gait-step.test.ts`, `test/pull-step.test.ts`,
`test/rb-away.test.ts`, `test/run-arms.test.ts`, `test/run-read-fixes.test.ts`,
`test/kick-log.test.ts`, `test/gap-blocks.test.ts`, `test/front-fit.test.ts`,
`test/down-seal.test.ts`, `test/lead-hip.test.ts`,
`test/run-game-flags.test.ts` (exchange package).
2,888 core tests pass with the profile and without it; typecheck passes.

## Next

Gap schemes, in order: glued engaged pairs (hand law panel running), then
`DOWN_SEAL` on top of it; `LEAD_HIP`'s repair (the log read after the
turn-up, commitment to a fit, a fallback that stays in the hole) with its
adversarial re-check; why counter's kicked end tackles from his block under
`OL_ALIGN` and zone crowds into 0-3 yd (diagnosis running; the alignment
puts pullers on NFL timing but stays off until counter and zone hold); then
the runner's commitment against a kick-out (synthesis O5, after the defense's
force fix). Draws (42-48% losses in the lab) remain open. `GAIT_STEP` is a
physics law: promotion beyond this branch is the physics owner's decision.
