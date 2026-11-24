# Blocking Phase 0: the staged bench, the sensitivity table, sources and the starting faults

Tools/Physics, 2026-11-24, for Integration (plan of record `2026-11-24-blocking-physics-plan.md`), Defense and the
line-play lane. Develop `9f514e92` (engine-96). **No engine change.** Everything here is measurement, reading and
sources. Section 9 is the short design note for Phase 1; no Phase 1 code is written.

## 1. What this says, in nine lines

1. Flex's staged result reproduces: rusher power x1.15 leaves the walk-back at 1.16 yd/s; blocker mass x0.9 makes it
   1.57; rusher power x0.85 or blocker mass x1.1 give about 0.97.
2. **Most of that 1.16 is the blocker's own request.** The staged blocker asks 0.49 yd/s toward the QB (the set's kick).
   With the controllers removed (World-only bench), a blocker who anchors is walked back 0.34 yd/s; a blocker who kicks
   back 1.5 yd/s gives 1.63 (+1.30). The set decides it more than the push does.
3. **Strength is inert above the cap and strong at the bottom.** Staged pair, both at the traction cap: +0.2 strength
   on either man changes nothing; -0.2 moves it 0.13-0.67 yd/s. Mass moves it the same size as the whole strength range.
4. **Arm strength and arm length do nothing at all** (press x1.3, reach +0.15 yd: exactly 0.00 on every row). The hand
   force never reaches the arm budget, and reach is not read by the contact.
5. **Pad level works only by changing traction.** Where the cap binds (today) lower pads win by 0.2-0.6 yd/s. Where
   the cap is relaxed so legs bind, the same lowering does nothing (+0.01) in the pass rep and a smaller amount in the run.
6. **A stronger, lower man does not beat a heavier, higher one on a level footing today.** Pass rep: the stronger-lower
   rusher gains 0.15 over base against the heavier-higher blocker, while the heavier-higher rusher against the
   stronger-lower blocker changes nothing (-0.01). Weight and pad level cancel; strength never shows.
7. **Nobody plays pad level in games.** Posture is a role constant (pass: defender 0.70, blocker 0.77; run: defender
   0.93, blocker 0.80). The gap between engaged men (median -0.04 yd pass, -0.07 run) is body height and bend. No
   rating, no read of the opponent. Lift at the median is +-2% of body weight.
8. **The sources put 1.1 below what cleats hold and below what athletes push** (section 4): dynamic cleat traction
   1.31-1.47 and static 1.50-1.68 (Penn State, read by me); sustained single-player scrum pushes about 1.8-2.3 body
   weights against a force machine with feet anchored (Morel, Bayne and Kat via a review).
9. **The NFL "walked back 1.3-1.6 yd/s whatever the weights" cell is not a push.** The held blocker retreats about as far
   as an uncovered lineman, and the data span a weight difference of only about +-30 to 60 lb.

## 2. The staged rep reproduced

`scripts/diag/effective-mass/anchor-staged.mts` on develop (SET_SPOT=1), one tick path with the engine's own controllers
(`data/reviews/blocking/phase0-anchor-staged.md`): base 1.16 yd/s toward the QB (rusher asks 4.34, gets 1.19; blocker
asks **0.49**, gets 1.13); both at the cap (blocker 1,551 N, rusher 1,507 N, traction 1,551 / 1,507).

| Arm | pair toward the QB (yd/s) |
|---|---|
| base | 1.16 |
| rusher power x0.85 / x1.15 | 0.97 / 1.16 |
| rusher mass x0.9 / x1.1 | 0.97 / 1.16 |
| blocker mass x0.9 / x1.1 | 1.57 / 0.98 |
| blocker power x0.85 / x1.15 | 1.15 / 1.17 |

## 3. The World-only staged bench and the sensitivity table

`scripts/diag/blocking/staged-bench.mts` (World only, no controllers; the C and DT_W of `contactFixture`, hands latched,
control 0 frozen, fixed requests and posture, 2.0 s, mean over 0.5-2.0 s). Pass: rusher bulls (asks 4.5), blocker
anchors (asks 0, posture 0.8). Run: blocker drives 3.0, defender presses 1.5. One change per row; the table shows the
change in the pair's velocity (yd/s; + = blocker walked back / defender driven back) at `TURF_MU_SCALE` 1.0 (today) and
1.25 (traction relaxed, so legs bind; 1.5 gives the same rows). `--trace` prints per-tick hand force, felt force, lift,
posture, base offset and state. Hand speed and hands inside versus outside have **no mechanism**; they are not in the
table (the plan's rows for them start in Phase 2).

| case | pass, cap 1.0 | pass, cap 1.25 | run, cap 1.0 | run, cap 1.25 |
|---|---|---|---|---|
| base (staged C vs DT_W) | 0.34 | 0.13 | 0.33 | -0.11 |
| rusher strength +0.2 | +0.00 | +0.08 | +0.00 | +0.12 |
| rusher strength -0.2 | -0.26 | -0.06 | -0.67 | -0.52 |
| blocker strength +0.2 | +0.00 | -0.00 | +0.00 | -0.01 |
| blocker strength -0.2 | +0.22 | +0.46 | +0.13 | +0.59 |
| rusher heavier +10% (power with mass) | +0.33 | +0.14 | +0.35 | +0.26 |
| blocker heavier +10% (power with mass) | -0.23 | -0.01 | -0.38 | -0.23 |
| rusher stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker stronger arms (press x1.3) | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher longer arms (+0.15 yd) | +0.00 | +0.00 | +0.00 | +0.00 |
| blocker longer arms (+0.15 yd) | +0.00 | +0.00 | +0.00 | +0.00 |
| rusher lower pads (posture 1.0) | +0.29 | +0.01 | +0.22 | +0.20 |
| blocker lower pads (posture 1.0) | -0.18 | +0.01 | -0.17 | -0.01 |
| blocker higher pads (posture 0.45) | +0.31 | +0.02 | +0.44 | +0.45 |
| blocker wider base (balance 0.9) | -0.00 | -0.00 | -0.03 | -0.03 |
| blocker more flexible (bend 0.9) | -0.26 | -0.03 | -1.02 | -0.34 |
| blocker kicks back (asks 1.5 away) | +1.30 | +1.50 | +1.15 | +1.59 |
| COMBO rusher stronger and lower vs blocker heavier and higher | +0.15 | +0.14 | +0.12 | +0.29 |
| COMBO rusher heavier and higher vs blocker stronger and lower | -0.01 | +0.13 | -0.17 | +0.21 |

Full rows (both sides, lighter, higher pads, and the force columns) are in `data/reviews/blocking/phase0-sensitivity.md`
and `out`. Reading, row by row against the plan's test ("each must move the result the right way by a believable
amount"):

- **Stronger legs: fails above the cap.** +0.2 strength on either man does nothing today; it moves the pair only when the
  man is leg-bound. At cap 1.25 the rusher's +0.2 gives +0.08 (pass) and +0.12 (run), still smaller than 10% weight
  (+0.14 / +0.26). Weak men are punished (-0.2: -0.26 to -0.67) and strong men are not rewarded.
- **Stronger arms, longer arms: no effect, at any cap.** The hands joint's force is set by the legs and the contest;
  `pressForce` (about 2,270 N for these men) is never reached (hand force 1,090-1,520 N). Reach is not read by
  the hands joint (extension is fixed in the fixture at the sum of the radii plus 0.1 yd). In the run rep the hand
  force is constant at 1,093 N across every row: the joint's push command, not a contest result.
- **Heavier: right way, large.** +-10% weight moves the pair 0.2-0.4 yd/s, the largest single physical row.
- **Lower pads: right way, large, but only through traction.** At cap 1.0 it is +0.29 and -0.59 (rusher, pass and run).
  Relax the cap and the pass rep shows +0.01: the load transfer (`liftFelt`) changes only the traction cap, and the
  cap no longer binds. The run rep at cap 1.25 is mixed and unexplained: the rusher's lower pads still give +0.20 and
  the blocker's higher pads +0.45, but the blocker's lower pads give -0.01.
- **Base width: no effect.** The base does not carry a direction; width acts only through `balance` into `baseRadius`,
  and nobody falls in this rep.
- **The user's gate (a stronger, lower man beats a heavier, higher one): not met.** Row 1 of the combos is +0.15 / +0.12
  against base; row 2, where the heavier-higher man is the rusher, is -0.01 / -0.17. The strong-low man gains little,
  because strength is inert and the two advantages are of the same size as the weight edge.
- **The request dominates.** A blocker who kicks back 1.5 yd/s is walked back 1.2-1.6 yd/s beyond the anchored base.
  Everything the staged contest does with strength, weight and pads fits inside 0.3 yd/s.
- **The pair moves as one block.** In every row the two bodies' mean velocities are within 0.01-0.2 yd/s of each other (the
  "pairs move as one block" in the plan): the hands joint and the contact ground both bodies together.

Starting faults for the bench, as a list: (1) strength inert above the cap; (2) press and reach inert; (3) pad lift acts
only on traction; (4) no hand place, so no inside or outside; (5) no hand speed; (6) the base has no direction.

## 4. Sources

Verified by me from the primary document: Penn State. Everything else was opened by a research subagent and is marked
as it reported; the one that I could cross-check against the page (Martin and Beckham's abstract) matched. Ratios in
body weights are the agent's arithmetic (BW = kg x 9.81) unless stated.

**Grip: cleat on turf (decides the cap).**
- **Penn State Center for Sports Surface Research, Supercleat evaluation, Oct 2011** (read by me:
  <https://plantscience.psu.edu/research/centers/ssrc/documents/supercleat-report.pdf>). Pennfoot, loading weight 245 lb
  (about 1,090 N). Traction coefficient = force to start (static) or keep (dynamic) linear motion divided by the normal
  force. Static: control cleats 1.57 (screw-in) and 1.53 (molded); by surface 1.50 (bermudagrass) to 1.68 (bluegrass
  on sand); molded control wet 1.47. **Dynamic: 1.47 (screw-in), 1.31 (molded).**
- Sabick, Cooper, Kuhlman, Pfeiffer (Boise State), *Lower Extremity Review* 2009, secondary (read via
  <https://lermagazine.com/?p=1177>): dynamic about 1.2 for four cleat types at 900 N on FieldTurf; the peak coefficient
  1.7-5.3 depends on the cleat and the angle, and the 5.3 is a digging artefact.
- Kuhlman et al. 2010, Proc IMechE P 224:155 (abstract): coefficients vary with load (222-1,776 N); the slope of the
  load-versus-traction curve changes at 888 N. No numbers reached.
- **Reading:** the dynamic coefficient 1.2-1.5 and static 1.5-1.7 are above our 1.1 by 10-50%, from loads around one foot's
  share of a back's weight. They are not Coulomb friction (cleats dig and shear the infill), and the load dependence changes
  slope near 900 N (Kuhlman). Nothing found at a lineman's per-foot load of 1,200-1,800 N. **1.1 is below every measured dynamic value
  found; what the right engaged value is at lineman loads is an open measurement.**

**Horizontal force a set, leaning athlete puts out (body weights).**
- Green et al. 2019 review, *S Afr J Sports Med* 31(1) (full text read by the agent, <https://pmc.ncbi.nlm.nih.gov/articles/PMC9924573>):
  individual machine-scrum forces with body mass: 1,370 N peak at 96.9 kg (1.44 BW); 1,171 N peak at 85.5 kg (1.40 BW);
  Morel 1,609 N mean over 5 s at 90.9 kg (**1.80 BW**); Bayne and Kat 2,290 N mean over 9.5 s at 100.7 kg
  (**2.3 BW**); Cazzola 2,800 N engagement peak at 102.4 kg (2.8 BW).
- Bayne and Kat (ISBS; <https://ojs.ub.uni-konstanz.de/cpa/article/view/7065/6357>): 19 front-row players on a
  single-player load-cell machine, mean over 9.5 s: parallel feet 2,072 +- 375 N, staggered 1,763-1,823 N, **feet on
  anchored sprinter-block supports, so friction was not the limit** on that test.
- Martin and Beckham 2020, *BMC Sports Sci Med Rehabil* 12:33 (abstract and body read; <https://pmc.ncbi.nlm.nih.gov/articles/PMC7249338/>):
  individual sustained forces "generally ranged from 1000 to 2000 N" and full packs 4,000-8,000 N; **maximum force at
  shoulder height about 40% of body height, feet parallel, knee and hip angles about 120 degrees**; parallel feet gave more
  forward force than staggered, which raised lateral force. The review's other numbers (normalised pack force 0.95-1.46,
  live scrums about 50% of machine force) I could only see in a summary, not verbatim; I do not use them.
- Sprint F0 at the first steps, spikes on a track, about 0.7-1.1 BW (Haugen et al. 2019; Cross et al. 2018): net force
  at the first step, not a sustained lean.
- **Not found:** a force-plate measurement of horizontal ground force per lineman in a drive block; Gatt et al. 1997
  (five Division I linemen, 3,013 +- 598 N at a force-plate sled, no body mass or angle) is the only lineman number and
  is an impact.
- **Reading:** single players holding a low machine push sustain about 1.8-2.3 BW, above our leg drive for the strongest
  player (power/mass 0.55 + 0.75 s: 1.23 BW at s = 0.9) and above the grip limit of any turf coefficient found
  (1.3-1.5). A man pushing from cleats cannot exceed his grip, so a sourced model has **grip below legs for a set, low
  athlete**: the contest is grip, and strength must act through the normal load (section 9). That is consistent with the
  literature's emphasis on body height, joint angles and stance, which are what change normal load and where force goes.

**Arm force by extension, hand speed.**
- Elbow-extensor isometric torque peaks near 55 degrees of elbow flexion (0 = full extension): Pinter, Bobbert, van Soest,
  Smeets 2010, *J Electromyogr Kinesiol* 20:923 (men about 77 N m peak). A force-by-extension curve for a push in N, or
  the lockout versus mid-range ratio, was **not found**.
- Boxing: hand speed 9.14 +- 2.06 m/s in Olympic boxers (Walilko, Viano, Bir 2005, abstract); a straight lead punch 7.16
  m/s elite, contact velocity 5.56 m/s (Liu et al. 2022). Short-latency stretch responses 25-50 ms, long-latency 50-100 ms
  (Weiler, Gribble, Pruszynski 2015). **Football lineman hand speed: not found.**

## 5. Pad level in games (Phase 0 item 3)

`scripts/diag/blocking/pad-gap.mts`, a read-only tap on `PlaySim.tick`; 12 games (seeds 101, 202, 303, 404 x 3); one
sample per hands-joint pair (offensive lineman against a defender) at 0.3, 0.6, 1.0 and 1.5 s
(`data/reviews/blocking/phase0-pad-gap.md`; 24,242 samples).

| 1.0 s | pairs | gap p10 / 50 / 90 (defender minus blocker, yd) | defender lower by > 0.05 yd | blocker lower | defender posture p50 | blocker posture p50 |
|---|---|---|---|---|---|---|
| pass | 4,183 | -0.15 / -0.04 / +0.08 | 47% | 18% | 0.70 | 0.77 |
| run | 1,614 | -0.21 / -0.07 / +0.09 | 56% | 15% | 0.93 | 0.80 |

- **The gap is anthropometry and role constants, not play.** Pass: defender posture 0.70 (0.6-0.8 in
  99% of pairs), blocker 0.77 (0.7-0.9 in 82%). Run: defender 0.93, blocker 0.80. By slot the passes' defender posture is
  0.70-0.72 for every slot, the runs' DE/DT 0.94-0.95, LB 0.17-0.19 (standing).
- Correlation of the gap with the defender's mass +0.53, with his bend -0.59 and with the blocker's bend +0.59: **taller,
  heavier, less flexible men have higher pads**, which is height. The rating inputs set it through the body, not the choice.
- Lift at the median is +0.01 / -0.02 of body weight (pass) and +0.02 / -0.03 (run): pad level contributes about 2% of
  traction typically and about +-20% in the tails (p10 and p90).
- **So the physics that rewards pad level is nearly unused: a controller gap.** Nobody plays pad level as a contest
  (arrive low, hold low under load, stand the other man up). That belongs to the line-play lane's Phase 3-4 and to
  Defense's `SINK_LEAD`-type work; Phase 1 only has to make the physics reward it correctly (section 9).

## 6. The NFL "held walk-back" cell (Phase 0 item 4)

Operator `scripts/diag/pass-operators/held-walkback.py` on BDB 2025 weeks 1-9 (9,671 dropbacks; 25,562 held pairs),
re-implemented by a subagent (it reproduced the operator's four row counts exactly) with two controls
(`data/reviews/blocking/phase0-walkback-*.md`, scripts in `scripts/diag/blocking/walkback/`):

- Operator, p50 yd/s toward the QB by window (0-0.5 / 0.5-1.0 / 1.0-1.5 / 1.5-2.5 s): +1.61 / +1.59 / +1.32 / +0.84.
- **Weight range:** blocker p10-p90 297-327 lb (sd 12); rusher 265-328 lb (sd 26); difference p10-p90 -50 to +21 lb. Only
  1,814 pairs have |difference| of 60 lb or more and 273 of 90 lb or more. 92% of rushers are DL, 8% LB.
- **Slope of the pair's mean velocity on rusher-minus-blocker weight** (per 30 lb; 95% CI, clustered by play): 0-1 s -0.114
  [-0.129, -0.099]; 1-2.5 s +0.064 [+0.043, +0.087] (DL only +0.026 [+0.001, +0.051]). The early slope has the wrong sign
  because the heavier rusher closes more slowly and the window includes his approach. A mass-proportional model with a free
  closing speed of 3-5 yd/s predicts +0.07 to +0.25 per 30 lb. **The data exclude the upper end of that range for DL and
  not the lower end.** "Flat in weight" is supported for about +-30 to 60 lb and says nothing beyond.
- **It is not the blocker's walk-back.** The pair's mean velocity averages the rusher's closing speed (alone +1.87 in the
  first 0.5 s) with the blocker's retreat (+1.09). Against the retreat of **uncovered interior linemen** over the same
  windows after the snap, the held blocker's retreat in the first 0.5 s is +1.18 against +1.17, and +1.58 against +1.35 in
  0.5-1.0 s, +1.30 against +1.19, +0.90 against +0.98: excess at most 0.2 yd/s. The walk-back is **mostly the set**.
- About a quarter of the pairs have a second defender within 2 yd of the blocker for half their frames (doubles and
  stunts), and half the pairs last under 1 s.
- **Verdict: not a target.** It cannot test a mass law outside +-60 lb and it cannot separate a push from a set.

## 7. The two ledger tests (`stretch-closure`, `stretch-normal-follow`)

**Not an engine leak: stale fixtures.** The tests teleport the defender and set his velocity on the body. With
`ENGAGE_FELT` (default on) the blocker's request reads the defender as he has him through `sim.see`, a delayed picture
from the perception history, and the fixture recorded that history 24 ticks before the teleport (the defender 0.82 yd
upfield). Evidence: with `ENGAGE_FELT=0 ENGAGE_TRUNK=0` the 7 and 17 tests pass; `ENGAGE_TRUNK=0` alone still fails; re-recording
perception for 24 ticks after the teleport turns the 0.522 yd/s upfield command into exactly 0.000 (vel.y 0.000).
Fix: record perception after moving the bodies (a test change, nothing in `src`); I can make it in the Phase 0 PR if you
want the tests off the ledger.

## 8. The base-shape failure (item: re-diagnose before building)

Not re-run; the removed builds are not in the tree. What the record says (`2026-11-14-stance-base-proposal.md`): both
`BASE_ORIENT` attempts reshaped the base **at constant area** (an ellipse), and falls rose (OL 3.6 -> 8.5 and 6.7; DL 4.8
-> 8.2 and 7.4 per 100 dropbacks; attempt 2 less); the fallers in the unflagged engine were hit **more side-on** than
those who stayed up. My reading, unconfirmed: a constant-area ellipse **removes** support across the short axis exactly
where side-on hits arrive, so it must lose more than it gains along the stagger, and the bench's own row agrees that the
base radius is a scalar (balance 0.9 changes nothing because nobody falls). The re-test the design needs: keep the old
circle and **add** length along the stagger (a two-point support segment, area increasing), then count falls by direction
of the hit (the unflagged engine's direction histogram is the control). That is a Phase 1 build step with a gate, not
Phase 0 work; I did not re-run the old flags.

## 9. Design note for Phase 1 (legs and base), before any code

What the sources and the bench say together:

1. **The cap is mostly a modelling choice, and the choice is low.** Dynamic cleat grip is measured at 1.3-1.5 per unit of
   normal load (static 1.5-1.7) at about 1,100 N; the engaged value at lineman loads is not measured. Choose it as a
   range, not a point: 1.3 (the measured dynamic floor) with 1.5 as the other end, state the load dependence, and keep
   `TURF_MU` as the one shared constant. Everything that rests on grip moves with it (cuts, tackles, recovery).
2. **Strength must have a place above the cap.** Sustained single-player pushes of 1.8-2.3 BW against a force machine mean the
   legs are not the limit for a set athlete; the grip is. In a contest grip is not fixed: it is the **normal load**, and
   that is where strength acts: the man who gets under the other, holds a low posture under load and presses him into the
   ground raises his own normal load and lowers the other's (`PAD_LEVERAGE` is the right shape); a man who cannot hold
   his posture is stood up. So: (a) make the **vertical part of the hands force** a result of arm force at the stroke's
   angle, bounded by the arm's own capacity (press), which today is never reached; (b) make **posture under load** an
   outcome: a body holds a requested pad level only as far as his leg and hip strength against the vertical load on him
   allows, a force-posture relation that does not exist today (`legDrive` has no posture term in the staged call; the
   posture slews freely); (c) keep a leg limit with a force-velocity relation (`LEG_FV`, parked) so strength still shows
   below the grip.
3. **Hands are contact points with height (Phase 2)**; until then, the vertical component of the hand force is the
   pad-height line of action and the arms' capacity is the cap on it. The bench rows "stronger arms" and "longer arms"
   stay at 0.00 until then; they are the Phase 2 gate.
4. **Base shape** as in section 8: add support along the stagger, count falls by direction.
5. **Gates for Phase 1 (from the bench, re-measured as rows):** strength +0.2 moves the staged pair (the same size as
   +10% weight, not zero); the stronger-lower man beats the heavier-higher in the combos (positive by more than the
   +0.15 / -0.01 above); pad level keeps working at any cap; matched pairs can move each other; no strength row goes
   the wrong way; blocker falls stay in the NFL's 1-5 per 100 dropbacks; energy and momentum accounted for (ground
   impulse plus hand impulses close); no rating awards an outcome. NFL's held walk-back is not a gate (section 6).

**Decisions I need from Integration before Phase 1:** (i) the grip coefficient as a range 1.3-1.5 and which end to start
at (the dynamic floor 1.3 is the sourced minimum); (ii) whether posture under load (2b) is in Phase 1 or waits for hands in
Phase 2 (it can start from the vertical load the pads already carry); (iii) whether I fix the two ledger tests now (section 7).

## Reproduce

```sh
node --import tsx scripts/diag/blocking/staged-bench.mts pass|run [--trace]       # TURF_MU_SCALE=1.25 for the relaxed cap
python3 -I scripts/diag/blocking/sens_table.py out/p0/bench-pass-cap1.txt out/p0/bench-pass-cap1.25.txt out/p0/bench-run-cap1.txt out/p0/bench-run-cap1.25.txt
node --import tsx scripts/diag/blocking/pad-gap.mts --seed 101 --games 3 --out out/p0/pad-gap-101.json
python3 -I scripts/diag/blocking/pad_gap_report.py out/p0/pad-gap-*.json
```
