# The body that goes down at speed: slide, then rise (Integration/Defense, 2026-11-18)

Base develop bcb27ea1. Measurement, then `DOWN_RISE_PLANT` (off) built as proposed; results at the end.

## Mechanism (src/physics/world.ts, `passive()` and the passive branch of the ground force)
- `falling`: ground friction FALL_FRICTION 0.25 g (2.7 yd/s²) plus FALL_TIP, for `fallTime` (about 0.4 s). Then `down`.
- `down`: friction DOWN_FRICTION 0.75 g (8.05 yd/s², g = 10.73 yd/s²) on the whole body, translation and spin sharing one allowance. He goes to `rising` only when his speed is under 0.3 yd/s **and** he has been down 0.3 s.
- `rising`: the same 0.75 g friction, for `getUp` (0.6-1.4 s from agility and weight, 0.9 s default), then `up` with the capture-point deviation reset to zero.
- So the time off his feet is fall 0.4 + max(0.3, (v - 0.3) / 8.05) + getUp. A body going down at 8 yd/s waits about 0.96 s to start a rise whose own friction would stop it in 0.9 s anyway. FALL_FRICTION, DOWN_FRICTION and FALL_TIP are unsourced (as the HANG notes say); I did not change them.

## How often (8 ordinary games, seeds 7-14, Ironmen v Comets 0.55, 2,296 play sims, 2,023 off-feet episodes; `scripts/diag/body/down-slide.ts`)
- Defender episodes that reached `down`: 858, of which 426 are dives (the rest contact). Speed when he goes down: dives p50 3.6, p75 5.2, p90 6.7, max 9.4 yd/s; contact falls p50 1.2, p90 3.1.
- Slide (time in `down` before `rising`) by speed going down: under 1 yd/s 0.30 s; 1-2 0.30; 2-3 0.35; 3-4 0.45; 4-6 0.60; 6 and over 1.0 s (the law gives 0.9). Of 115 dives that went down at 5 yd/s or more, 17 rose before the whistle (slide median 0.9 s); the rest were still down when the play ended.
- Every completed defender episode is over 1.5 s off his feet (233 of 242; median 1.7, p90 2.0): the floor is fall 0.4 + the 0.3 s minimum + 0.9 rise = 1.6 s, with or without a slide. That is the gate's cost for every fall, not only dives.
- Cost of waiting for the slide to end, against rising as soon as he is down: dives that rose before the whistle (72) were up a median 0.46 s later (p90 1.08). With the play still live at the moment he would have been up (down time + getUp): 35 dives were up more than 0.3 s late and 66 more were still down at the whistle, 101 of 426 (24%, 12.6 per game), median 0.33 s of play left (p75 0.66). For all defender falls 317 of 858 (37%, median 0.24 s left): mostly contact falls held by the 0.3 s minimum.

## Proposal, from the body (no timer shortened)
A body that is rising is still sliding under the same 0.75 g, so it reaches its feet at `v_up = max(0, v - 0.75 g x getUp)` (8 yd/s going down gives 0.75 yd/s up after 0.9 s). What stops a real player coming up while moving is that his feet cannot take load while they slide faster than he can plant them; the engine's own number for that is PLANT_SPEED, 2.5 yd/s ("below this he has planted and can square to a new heading", kinematics.ts). So:
1. The `down` to `rising` gate becomes **predicted speed at stand-up at most PLANT_SPEED** (v - 0.75 g x getUp <= 2.5), in place of "current speed under 0.3". Any dive up to about 9.7 yd/s starts rising when the fall ends; only a body faster than that waits for the slide.
2. The 0.3 s minimum in `down` stays as the time to stop his spin and settle (his spin must be under the same small bound), so the shortest off-feet time is 0.4 + 0.3 + 0.9 = 1.6 s as now, and the slide stops adding to it.
3. He still slides the same distance (the friction is unchanged; 8.4 yd at 8.4 yd/s counting the fall), so only the time he is off his feet changes (about 0.8 s less at 8 yd/s, 0.2 s at 4 yd/s).
No friction or timer is tuned; the rule is the same friction and the engine's own planted-speed threshold.

**Keeping a ball carrier apart.** The whistle and the spot come from the tackle and down-by-contact logic (carrier.ts and the tackle bond), not from the `rising` transition, and a held body is held by its tacklers. The new gate applies only to a free body: no hold on his legs (`feetLock` zero, no engagement or tackle bond), not the ball carrier, and the contact that felled him over. A tackled carrier keeps today's gate and slides to rest for the whistle; a diver who missed is free and rises on the body's terms.

## Test plan (as run, below)
Lone body at 4, 6, 8, 9.5 yd/s going down: off-feet time and slide distance, flag off (identical to today) and on (distance equal, time shorter by the slide); a held body and a carrier (unchanged, byte-identical); then the 8-game count above with the play still live at the stand-up.

## Built: `DOWN_RISE_PLANT=1` (off by default)
`world.ts` `passive()`: `down` goes to `rising` when `t - since >= 0.3` and (speed under 0.3 yd/s **or** `risesSliding`): free body (not `World.ballCarrier`, not in `heldBodies`, `feetLock` zero, no `HANG_LOAD` weight on him), his spin settled (footprint edge speed under 0.3 yd/s) and `v - 0.75 g x getUp <= PLANT_SPEED` (now exported from kinematics.ts). PlaySim names the carrier to the World (`world.ballCarrier`). Friction, the 0.3 s minimum and the get-up time are untouched. Registered in `config/baseline.json`, `config/reference-stack.json` (off), `docs/FLAGS.md`.

**Lone body** (`scripts/diag/body/down-rise-bench.mts`, 12 safety bodies, medians; the test is `test/down-rise-plant.test.ts`): going down at 3.8 / 4.8 / 6.6 / 8.4 / 9.4 yd/s, off the flag slide 0.50 / 0.65 / 0.85 / 1.10 / 1.20 s and off his feet 1.85 / 1.95 / 2.20 / 2.45 / 2.50 s (Defense's trace: 2.4 s); on, slide 0.30 s at every speed and off his feet 1.65 s; the distance travelled (2.75 / 3.66 / 5.79 / 8.37 / 9.90 yd) and the speed when he is up (0.0) are the same. As the ball carrier the numbers are identical to the flag off at every speed.

**Flag off is identical to develop:** one game (seed 7) gives the same log and score hash on develop and on this tree with the flag off (6b734273bbaaddce6858, 146 plays).

**Ordinary games, off vs on (16 games, seeds 7-22, each arm; the arms diverge after the first changed play, so counts are noisy):** defender dives 789 / 802; still down at the whistle with the play live at the moment he would have been up 120 / 134; zone completions 741 / 735, YAC mean 5.96 / 6.73, 10+ yd YAC 100 / 123 (13.5% / 16.7%); missed-tackle plays 170 / 165, then a touchdown 10 / 15; touchdowns 111 / 117; yards per play 6.07 / 6.36. These are within what two unpaired 16-game runs differ by and are not a paired effect.

**Staged, paired (720 zone plays: 12 concepts x 5 coverages x 2 formations x 3 rosters x 2 seeds, identical until a defender dives; `down-rise-staged.ts`):** 239 plays have a defender dive in either arm, and **3 plays differ** between the arms (2 worse for the offense, 1 better; both completed on 3: YAC +0.92 yd). Completions 422 / 422, zone YAC mean 7.22 / 7.22, 10+ yd YAC 61 / 61, missed-tackle plays 3 / 3 then a touchdown 1 / 1, touchdowns 23 / 24, yards per play 7.85 / 7.84. The repair changes the diver's own time on the ground, which almost never reaches the play.
