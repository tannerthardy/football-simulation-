# What makes a low posture cost something? Sources and what they mean for the engine

Run Game lane, research only (no `src` changes), 2026-11-13. Asked by Integration for
Tanner. Feeds Flex's stance/base physics proposal and finding 4 of
`docs/football-handbook/pass-protection-base-anchor-sources.md` (1f81a8f9,
branch `claude/admiring-bell-t3ji19`).

> **Correction (2026-11-14, from Flex's build).** Section 6 assumed the engine's posture 1
> (a COM drop of up to 25%) is a deep squat past 100° of knee flexion. By geometry it is a
> half squat:
> - With an upright trunk, equal thigh and shank and hip height 0.5 of stature, the drop
>   d = 0.25·posture·(0.4 + 0.6·bend) gives about **62 / 72 / 87° of knee flexion at
>   posture 1** for bend 0.2 / 0.5 / 1.0, and **48–67° at posture 0.6**.
> - So the engine's whole posture range lies at or before the force optimum (about
>   50–75°) in the evidence below. The proposed force-angle factor cost at most 7%.
>
> Flex built it as `POSTURE_FORCE` and it changed nothing on the staged pass-rep witness
> (OL posture 0.7 vs 1.0: 2.81 vs 2.73 yd given up, with and without it), so it was
> removed.
>
> In the World alone, pushing does not depend on posture: "lower wins" comes from the
> balance model (base and ω0 grow with posture) and the controllers' lean bounds, not leg
> force. So the coached "too low" cannot occur in the engine at all.
>
> What survives inside the range is mobility (Takayama, section 3), parked as
> `POSTURE_MOBILITY` in `docs/PARKED.md`. See
> `docs/reviews/2026-11-14-stance-base-proposal.md` on `claude/quirky-franklin-9lbwbp`
> (1b76a93f). The evidence below stands; the mapping and the proposal in section 6 do not.

**Question.** Our engine treats a lower posture as better for balance. Line coaches
describe an optimum: past about 90 degrees of knee flexion "the center of mass sits too
far behind" (Bentley). What makes a lower posture cost something?

**The hypothesis to test:** the cost is mainly fatigue; staying low is more tiring.

**Answer, in order of size within a play:**
1. **Force by joint angle.** Leg drive and push fall off past a mid-depth crouch, at
   once, on the first rep.
2. **First-step and lateral quickness.** A deep crouch is slower off the mark sideways.
3. **Geometry.** Deep flexion puts the center of mass behind the feet unless the trunk
   leans or the ankles bend. That is the coached "too low" failure: stood up, pulled, or
   pushed back.
4. **Fatigue.** Real, large, and angle-dependent, but it bites over minutes (a drive, a
   game), not inside a 4 s rep.

So fatigue is a true cost, and the right one for "why does he rise as the game goes on".
It is not what makes "lowest" lose a single rep. The cost that does is that a crouched
leg pushes less and moves less.

## 0. Is the engine's reading right? Yes, lower is monotonically better for balance

From `src/physics/support.ts` at develop `516d8729`:

- **Center of mass** (`comHeightAt`, line 149):
  `h = comHeight · (1 − 0.25 · posture · (0.4 + 0.6 · bend))`.
  - Posture 1 drops the COM by 10–25%, by flexibility.
  - `omega0 = sqrt(g / h)` (line 161) rises 5–15%.
- **Base** (`baseRadiusAt`, line 166): `baseRadius · (0.75 + 0.5 · posture)`. It is
  1.67× larger at posture 1 than at 0.
- **Point of no return** (`criticalDeviation`, line 216): `base + stepSpeed / omega0`.
  The stepping term shrinks as he gets lower, but the base term grows faster.
- **How far a hit pushes him toward falling.** An impulse that exceeds what his gait
  can follow displaces the capture point by `Δv / omega0`. The fraction of the fall
  threshold it uses is `Δv / (base · omega0 + stepSpeed)`, which falls as posture rises
  on both counts. So for any hit, lower is never worse.
- **Lean/anchor limit** (`src/sim/engagement.ts` around line 1049):
  `m · omega0² · base · (0.5 + 0.5 · balance)`. This grows with posture too: the
  lowest man has the strongest anchor.

**What already costs something:**

| Cost | Where | Size |
|---|---|---|
| Speed | `src/physics/world.ts` ~line 1506: `effort × (1 − 0.12 · max(0, posture − 0.3))` | up to −8.4% of commanded effort at posture 1 |
| Time to change posture | `POSTURE_RATE = 2.5`/s (`world.ts` line 338) | 0.4 s for a full change |
| Tired players stand taller | `world.ts` ~line 2082: target posture `− 0.2 · (1 − energy)` | an output of fatigue, not a cost of being low |
| Energy | `spendEnergy` (`src/physics/kinematics.ts` ~lines 299–316): base, work, speed and isometric pushing | **no posture term**: holding a deep crouch is free |
| Force | none | **no strength-by-posture term** apart from the anchor limit, which rises as he gets lower |

So nothing makes posture 1 worse than 0.7 except the 8% speed term, and that is
outweighed in contact by a larger base, a larger `omega0` and a stronger anchor.

## 1. Fatigue: holding and moving in a deep knee bend

| Source (read) | Numbers | Notes |
|---|---|---|
| Pethick et al. 2021, *Eur J Appl Physiol* (**original read**, PMC8505307) | 11 adults; intermittent isometric knee extension at **50% of max torque** (6 s on, 4 s off) at 30, 60 and 90° of flexion. Time to failure **7.0 ± 4.1 min at 90°, 13.4 ± 4.7 at 60°, 27.9 ± 6.8 at 30°**. Muscle O2 use rose less, and more slowly, at 30° (2.1 vs 3.3 %/s at task end). Max torque 227 / 200 / 104 N·m at 90 / 60 / 30°; the authors put the optimum at "~75°" of flexion | Same *relative* load at each angle. At a deeper knee the absolute torque was higher and it fatigued four times faster |
| Place et al. 2005, *J Appl Physiol* (abstract via search summary) | 20% MVC held to exhaustion: **974 ± 457 s at 35°** vs **398 ± 144 s at 75°** flexion | Same direction: the flexed knee tires about 2.4× faster |
| Knee moment rises with squat depth (Chan; "Knee joint kinetics in relation to commonly prescribed squat loads and depths", PubMed 23085977; summaries only) | Net knee moment rises with depth and load; "typical decreases in squat loads used with increasing depths are not enough to offset" it | Holding a deeper crouch also needs *more* knee torque for the same body weight |
| Crouched walking (summaries; Murphy et al. 2014, *J Arthroplasty*, simulated contracture; Ortega and Farley 2005) | A brace holding the knee in flexion raised walking energy cost once it passed **about 15–20°**. Mid-stance knee flexion needs knee-extensor torque "more than 3 times higher" than normal walking | A figure of 13 / 19 / 38% at 15 / 30 / 45° circulates in summaries. I could not find its original, so **unverified** |

**How fast it bites.**
- **A rep (about 2–4 s):** a lineman works near maximal effort, where time to failure
  is seconds, but recovery between snaps (25–40 s) is long against these time constants.
  A deeper bend costs more *per rep* (more torque, more O2 per unit of torque). The
  in-rep loss from fatigue is small next to the angle's immediate force cost (section
  2).
- **A drive and a game:** this is where it compounds. In Pethick's protocol, a
  6-on/4-off duty cycle at 90° failed in **7 minutes** against **28 at 30°**. A lineman's
  sustained contact time over a 10-play drive is about 30–40 s of high effort; over a
  game it is a few minutes.
- **Reading:** fatigue is the mechanism by which "stay low" becomes "can't stay low" late
  in a drive or game. That matches what coaches complain about ("he got tall in the
  fourth quarter").

**Engine.** `spendEnergy` charges isometric pushing (`0.03 · isometric`) but nothing for
the posture held. Energy feeds back on posture only through tired players standing
taller (`world.ts` around line 2082).

## 2. Force production by joint angle

| Source (read) | Numbers | Notes |
|---|---|---|
| Squat jump from 70 / 90 / 110° knee angle (180° = straight), *Front Physiol* 2025 (**original read**, 10.3389/fphys.2025.1551488) | 21 trained men, loaded squat jumps. Max force **F0**: stronger group **2,627 / 2,820 / 3,141 N**, weaker group 2,461 / 2,615 / 2,806 N at 70 / 90 / 110°. That is **16% less** from the deepest start than the shallowest. Pmax 2,292 → 2,421 W (not significant); v0 slightly higher when deeper | A deeper start gives a longer push but less force. 70° knee angle is 110° of flexion |
| Static-stretch squat-jump study (PubMed 20145567; abstract) | Starts at 50 / 70 / 90 / 110° knee angle: "peak power was obtained at 90 degrees"; jump height, peak force and max velocity rose as the start got shallower | Peak power sits mid-depth |
| Isometric squat at 90 vs 120° knee angle (Bazyler et al. 2015; Lynch et al. 2021, MDPI *Sports*; summaries) | Peak force is **lower** at 90° than at 120° (the review states it; I did not see Bazyler's means) | Multi-joint pushing force falls as the knee bends past about 120° knee angle (60° flexion) |
| Single-joint knee extensor torque–angle (Lund 1972 summary; Pethick 2021 above) | Peak isometric knee-extension torque at about **50–75° of flexion**, falling either side | The muscle's best angle is a half squat, not a deep one |

**Reading.** Horizontal push and anchor come from extending the hips and knees against
the ground. The leg's force capacity peaks around a half squat (knee flexion about
60–75°) and falls as he goes deeper.
- In the jump data, the deepest start loses about 15% of max force.
- Going too high also loses force at the optimum: single-joint torque falls toward a
  straight knee.

This is an optimum, exactly as coached, and it costs on the **first** rep.

**Engine:** the opposite. The anchor limit `m · omega0² · base` rises monotonically with
posture, and drive and push have no posture-dependent strength.

## 3. Mobility: first step, shuffle and redirect vs COM height

| Source (read) | Numbers | Notes |
|---|---|---|
| Takayama et al. 2015, Miyazaki University memoirs (**abstract read**, English) | 19 female basketball players, side-step from four hip/knee flexion postures (30/30, 70/70, 30/70, 70/30 degrees). Reaction time and first-step width **did not differ**. The **30/30 posture** gave significantly higher **initial trunk velocity** and **peak floor reaction force** than 70/70 and 70/30 | The deeper stance is slower off the mark sideways; reaction is unchanged |
| Pre-step knee bending, *Front Sports Act Living* 2021 (summary) | A small countermovement (knee bend) before the step **speeds** step initiation | Some bend is good: a dynamic dip, not a held deep crouch |
| Coaching (Llaneza, X&O Labs; summary) | Players taught "low man wins" "get so low that they have to raise post-snap or lose the ability to move effectively" out of the stance | The same thing in football words |

**Reading.** A moderate crouch moves best. Deeper costs initial velocity and push-off
force, and probably extra time, because he has to rise before he can step or run.

**Engine:** an 8.4% cut to *top-speed effort* at posture 1 (`world.ts` around line 1506).
There is no cost to acceleration or first-step force, and none to the time to rise
except the posture slew (`POSTURE_RATE`).

## 4. Geometry: COM behind the base, getting pulled, vision

| Source (read) | Points | Notes |
|---|---|---|
| Bentley, USA Football (via `pass-protection-base-anchor-sources.md`) | Past about 90° of knee flexion the COM is too far behind; "sinking your hips" is not "sitting in a chair that is pulled away" | Coaching |
| Fuglsang, Telling and Sørensen 2017 (summary, sci-sport) | To stay balanced as the hips go back, he must lean the trunk forward or push the knees forward (ankle dorsiflexion); the demand is greatest at parallel | The mechanism behind Bentley's rule |
| Kim et al. 2015, *J Hum Kinet* (summary) | Ankle dorsiflexion, hip flexion range and dorsiflexor strength go with squat depth (101 adults) | A big lineman with stiff ankles reaches "behind the base" sooner |
| Newsome ("bar stool"), Thomas ("hold roughly 90 degrees, re-sink") (via the pass-protection note) | Coached optimum | — |

**Reading.** Deep knee flexion moves the COM backward relative to the feet unless the
trunk leans forward.
- **Sitting back:** the COM sits near the back edge of the base, so a pull (snatch,
  push-pull) or a forward hit has little margin.
- **Leaning forward to compensate:** the head and eyes come down and the push line tips
  toward the ground. Coaches call this "bending at the waist" and "lunging": he falls
  off a block when the man slips.

Either way, the base is not centered under him. This is a **direction-dependent** cost,
not a smaller base. It belongs with candidate 4 of the pass-protection note (a base
that depends on direction) rather than with posture itself.

**Engine:** the base is an isotropic radius that *grows* with posture; there is no COM
offset within it. Vision is not tied to posture.

## 5. What coaching says too low looks like

- **Run block (my home ground).** "Low man wins" is the most repeated cue and the most
  over-applied. The failures described:
  - **Rising to move:** too low in the stance, he rises after the snap and loses his
    get-off (Llaneza).
  - **Lunging and bending at the waist:** the hips are behind the hands, so he can't
    run his feet through contact; when the man slips he falls off the block (drill
    guides: keep the bag close "so the blocker doesn't have to reach").
  - **No drive:** the leg can't extend from the crouch, so he stalls on contact and
    gets stood up.
  - Historically the most common fault was the opposite (too *high*: "charging too high
    and not staying underneath the man"), which is why the cue exists.
  - The coached target is mid-depth: the "wrist angle matches the knee angle" check
    (Llaneza). Sources: coaching articles and drill sheets, low weight.
- **Pass set** (from the pass-protection note):
  - "Do not drop your backside" (Bentley); "bar stool" (Newsome); about 90° and re-sink
    (Thomas).
  - Failure: sitting back, he is pulled forward or bull-rushed onto his heels with
    nothing to push back with. The anchor comes from hips and feet under him, not from
    being lowest.

## 6. Verdict, and the simplest mechanism I would propose (propose only)

**Is the main cost fatigue?** The evidence says no, not on the scale that decides a rep.
- **First-rep costs:** force and quickness fall in deep flexion (about −15% max push
  force at the deepest jump start; a slower lateral start) and the base sits off-center.
  These stop "lowest" winning a single rep.
- **Late-drive and late-game cost:** fatigue. Isometric endurance at 90° flexion is a
  quarter of that at 30°. It explains players rising as the game goes on, and it should
  be charged, but it can't by itself make posture 1 lose a rep that the force law
  already makes it win.

**Simplest coherent mechanism:** a leg force-angle factor on posture.
- One curve multiplies the body's leg drive capacity (push, strike, anchor limit)
  by posture. It peaks at a mid posture and falls deeper.
  - The mapping from posture to knee flexion is an assumption to fix first. A COM drop
    of 25% at posture 1 is a deep squat (above 100° of flexion); posture about 0.6–0.7
    is a half squat.
  - The curve's shape comes from the jump and torque–angle data (deepest start about
    −15% force vs the optimum), not from a football outcome.
- **Second, cheap and consistent:** add a posture term to the isometric charge in
  `spendEnergy`. Holding a deep crouch costs more per second, following Pethick's
  ratio of about 4× between 90° and 30°. That gives the game-scale fatigue the
  hypothesis describes, without inventing a new pool.
- **Not now:** a COM offset inside the base (geometry). It is real but needs the
  direction-dependent base that candidate 4 of the pass-protection note proposes. Do it
  only if the witness below still shows "lowest wins" after the force factor.

These are physical capacities. No posture is banned or capped; the controller stays free
to choose depth and pays the cost.

**The witness that would show it is needed.** One matched pair: the same two bodies,
inputs and seed, a drive block and a bull rush, with the blocker's requested posture
0.7 vs 1.0 (mirrored sides, and a weaker and a stronger blocker).
- **Today:** posture 1.0 holds or gains more ground and falls less on every row, because
  `omega0`, the base and the anchor all grow and nothing shrinks.
- **If that is so:** a "lowest wins" engine needs a cost, and the force-angle factor is
  the one the literature supports.
- **After the change:**
  - 1.0 should lose ground to 0.7 against a bull rush and drive the man less on a down
    block.
  - It should keep its advantage against a sudden pull or spin, where only balance
    matters.
- **Second witness, for fatigue:** a 10-play drive of the same snap, comparing the
  posture each lineman actually holds on play 1 vs play 10. It should rise only with the
  energy term.

## Sources

Original read:
- Pethick J, et al. Fatigue-induced changes in knee-extensor torque complexity and muscle
  metabolic rate are dependent on joint angle. *Eur J Appl Physiol* 2021.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8505307/
- Squat jump force-velocity profiles from 70, 90 and 110° starting knee angles.
  *Front Physiol* 2025. https://frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1551488/full

Abstract or summary only (numbers as reported there):
- Place N, et al. 2005, *J Appl Physiol*: 20% MVC endurance at 35 vs 75°.
  https://read.qxmd.com/read/15475602/
- Acute effects of static stretching on squat jump performance at different knee
  starting angles. https://pubmed.ncbi.nlm.nih.gov/20145567/
- Bazyler CD, et al. The use of the isometric squat as a measure of strength and
  explosiveness. https://read.qxmd.com/read/25426517/
- Lynch et al. 2021, The influence of maximal strength and knee angle on the reliability
  of peak force in the isometric squat. https://pmc.ncbi.nlm.nih.gov/articles/PMC8539608
- Takayama et al. 2015, Evaluation of movement speed and reaction time in the various
  posture at the defense in basketball. https://cir.nii.ac.jp/crid/1050288789739773952?lang=en
- Knee joint kinetics in relation to commonly prescribed squat loads and depths.
  https://pubmed.ncbi.nlm.nih.gov/23085977/
- Murphy et al. 2014, *J Arthroplasty*: simulated knee flexion contracture and walking
  energy cost (catalogue record).
- Ortega JD, Farley CT 2005 (via PMC2816028): mid-stance knee flexion needs over 3× the
  knee-extensor torque. https://pmc.ncbi.nlm.nih.gov/articles/PMC2816028
- Fuglsang, Telling, Sørensen 2017 (summary): ankle mobility, segment ratios and trunk
  lean in the back squat. https://sci-sport.com/en/influence-ankle-mobility-segment-ratios-back-squat-156/
- Kim et al. 2015, Lower extremity strength and range of motion in relation to squat
  depth. https://johk.pl/?p=3255
- Llaneza P., X&O Labs (coaching; "too low"). https://www.xandolabs.com/?p=20841
- Coaching sources on pass sets (Bentley, Newsome, Thomas) via
  `docs/football-handbook/pass-protection-base-anchor-sources.md` (1f81a8f9).

Not found or not verified: the 13 / 19 / 38% walking-cost figures at 15 / 30 / 45° of
imposed knee flexion; Escamilla 2001's knee-moment numbers. No published measurement of
a lineman's force or endurance by stance depth was found.
