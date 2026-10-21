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

No capacity, rating, contact law or defensive controller changed.

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
- **`GAIT_STEP` (the speed-up law) is right for the trench but not yet for
  the game.** On the current offense it improves ace zone (TVD 6.7 → 6.2,
  losses 7.7 → 6.0%, medians up 0.4–0.7) and the gap distribution (14.5 →
  9.1) and doubles line flow, but 8-game collectors (`mech:sim`, with and
  without, plus 0.5 s) show it lifts peak speeds and accelerations above
  tracking for nearly every position (WR max speed 7.0 → 7.65 yd/s, NFL 6.45;
  DB max accel 4.6 → 5.7, NFL 4.2; QB 3.8 → 5.3, NFL 3.8), at 0.3 and 0.5 s
  alike. The old law hid controllers that ask for near-top speed; those
  requests need fixing before the law can be on. Off.
- `MESH_POINT` (new, off): the shotgun exchange at the tracked spot instead
  of at arm's length (`gun-mesh.py`): stretch handoff 1.15 s, 0.5 yd own side,
  4.1 yd/s (tracking 1.1 s, 0.2, 4.7). Shotgun stretch losses fall
  18.5/24.5 → 12.5/17.5% with the gait (tracking 12% for this alignment) but
  rise on the pinned body (6.0 → 16.0% outside zone): the back now hits a line
  that has not moved. Waits on the gait.
- `RUN_LATERAL DL_FEEL` with the gait (Part 9's stack) make the defense flow
  more and the offense lose more (ace TVD 12.5); not kept.

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
```

Contracts: `test/combo-gap.test.ts`, `test/run-reach.test.ts`,
`test/combo-solo.test.ts`, `test/stretch-aim.test.ts`, `test/fb-kick.test.ts`,
`test/run-game-flags.test.ts` (exchange package). 2,865 core tests pass with
the profile; typecheck passes.

## Next

The counter pull (arrival and the log read), the back's lane read in traffic,
and the line's start-up (with the physics owner's decision on `GAIT_STEP`).
