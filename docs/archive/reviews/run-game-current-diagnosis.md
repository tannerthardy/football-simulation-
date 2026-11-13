# Run game: outcomes, contact and decisions

The current controlled run game is **too cramped, not excessively explosive**.
On the audited `d087104` baseline, 160 balanced ordinary calls average 1.28 yd,
with 39 stuffs, thirteen gains of at least four yards and one ten-yard gain.
First contact averages close to the LOS. These are fixed diagnostic inputs,
not an NFL call mix; they nevertheless warrant tracing how the offense creates
and enters space before changing physical strength or traction.

This increment corrects two demonstrated controller defects: offensive run
contact used pass-block training for hands/feet, and the carrier's forecast
could give a physically fallen defender negative recovery time. It changes
neither World nor physical profiles, force/work limits or solver resolution.
Correcting a skill/read contract is useful even when average yardage does not
improve. Keep the adverse outcomes visible rather than calling this an overall
rushing-performance improvement.

Read the [NFL study](run-reference-current.md),
[OL audit](run-ol-current-audit.md), [carrier audit](run-carrier-current-audit.md)
and [run-defense audit](run-defense-current-audit.md). The
[engine packet and reproduction](../../../data/reviews/run-game-current/engine/README.md)
own the exact source/tool identities, native traces, full comparisons and
checks. Prior published evidence remains unchanged.

## What realistic outcomes mean

The new full-season 2022/2023 nflverse extraction contains **26,228 clean
designed runs**: mean 4.27 yd, 18.71% stuffs, 10.59% gains of ten-plus,
2.37% of twenty-plus, and 49.24% yards-based 40/60/100 success. Listed RB/FB
carriers account for 23,272 gains, mean 4.26 yd and 17.94% stuffs. QB designed
runs, sneaks, realized scrambles and ordinary back runs stay separate.
Scramble selection excludes sacks and must not define the expected success
of every attempted escape.

For early-down, distance 8–10, non-red-zone RB/FB runs in a neutral score
context before the final ten regulation minutes, both seasons average about
4.6 yd with 15.6–15.7% stuffs. This is a better broad ordinary-run guard than
all-carry averages, but still lacks named blocking concepts or defensive fronts.
Short-yardage runs can have fewer yards and greater success. A five-yard TD
cannot produce a twenty-yard gain; use field-eligible tail denominators too.

The separate nine-week BDB2025 metadata study retains 6,103 non-sneak runs,
including QB, WR and trick carries. In that provider population:

| Primary label | n | Mean | Stuff | 10+ yd | 40/60/100 success |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inside Zone | 1,343 | 4.20 yd | 14.30% | 9.23% | 50.71% |
| Outside Zone | 1,641 | 4.34 yd | 18.83% | 10.54% | 45.03% |
| Power | 589 | 5.16 yd | 17.15% | 13.92% | 55.18% |
| Counter | 396 | 5.09 yd | 21.46% | 15.40% | 50.25% |
| Trap | 108 | 6.31 yd | 12.96% | 18.52% | 53.70% |

Outside zone's lower success but modestly greater tail supports the user's
intuition in this sample. It is not an intrinsic scheme multiplier. Power,
Counter and Trap's selected means mix opponents, rosters, situations and teams.
`MAN` is not verified Duo; `OUTSIDE ZONE` does not isolate our Wide Zone or Toss.
Secondary `SPLIT` tokens exist on 735 plays, with compound annotations retained;
they do not establish our exact slice/kick/log installation. PBP run direction
and BDB snap-front proxies are not called concepts/fronts.

The NFL's 64 observed team-seasons have p10/p90 designed-run means of
3.71/4.83 yd. That is descriptive variation under actual schedules and call
mixes, not a mandatory range or confidence interval for generated players.
Use multiple generated rosters and conditional tasks, sensible movement/contact,
and film alongside outcome distributions. Do not force each roster to 4.27.

## What the current panel measures

The unchanged collector runs eight concepts × five fronts × two directions
× seeds 3/11: **160** native ordinary plays, on generated roster seeds 31/32
at strength .55. Ace 11 is used except Split Zone in Gun Wing 12; LOS 40,
centered ball, first-down marker 50 and stock Cover 3. Two prior roster 41/42
witnesses remain supplemental. Front declarations also select their stock
personnel; this is not an equal-box causal front experiment.

Native `offenseYards` measures the offensive possession's gain. A fumble's
defensive return endpoint cannot supply offensive rushing yards. Holding event
flags are not accepted/enforced NFL penalties. First-contact YBC uses the
engine's own contact operator, not a provider annotation. All collected ordinary
plays finish naturally; no inspection cutoff supplies a final gain.

Baseline / OL-only / final use identical inputs, bodies, public profiles and
the same collector. Each of the 162 executions per phase is checked against a
plain run: full result, final bodies, intents and next RNG draw. Ten full films
per phase are selected before outcomes, including native adverse cases.

| Source phase | Mean offensive gain | Stuff | Gain ≥4 yd | Gain ≥10 yd | Gain ≥20 yd | Native YBC proxy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 1.280 | 39/160 | 13/160 | 1/160 | 0/160 | 0.083 |
| ol-only | 1.281 | 52/160 | 15/160 | 1/160 | 0/160 | 0.050 |
| final | 1.315 | 51/160 | 14/160 | 2/160 | 1/160 | 0.054 |

The first-down gain threshold is a panel proxy, not a whole-season NFL success
operator. Final recovery-only comparison retains **141/160 identical complete
executions**, with eleven changed gains and four lower gains. IZ/Under/right/
seed 3 goes **5.02→4.80 yd**; the fixed source reproduces the corrected decision
but does not guarantee a better path. All three phases have 160 natural ends,
zero censors and zero stale-combination members. The isolated OL source is
`01a504…`; final is `09dd62…`, with unchanged World `494408…`.


| Fixed concept (20 plays each) | Baseline mean | Final mean | Final stuffs | Final 10+ | Final native YBC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inside Zone | 1.097 | 1.100 | 7/20 | 0/20 | 0.073 |
| Outside Zone | 1.550 | 1.587 | 4/20 | 0/20 | 0.278 |
| Wide Zone | 1.027 | 1.344 | 7/20 | 0/20 | -0.162 |
| Power | 0.751 | 1.542 | 11/20 | 1/20 | -0.321 |
| Counter | 0.750 | 0.753 | 6/20 | 0/20 | 0.087 |
| Trap | 1.904 | 1.953 | 5/20 | 1/20 | 0.289 |
| Duo | 1.875 | 0.996 | 6/20 | 0/20 | -0.081 |
| Split Zone | 1.286 | 1.248 | 5/20 | 0/20 | 0.270 |

Power's greater mean coexists with eleven stuffs; its single 21.69-yard run
matters heavily in twenty observations. The zone families still have zero
ten-yard gains here. This is a mechanism-screening panel, not enough support
to rank NFL scheme effectiveness. All forty concept/front cells and adverse
pairs remain in the packet.

The old command-local climb counter is unsuitable as a whole-play rate:
baseline has **112** whole-play climbs versus **5** command-local decisions.
Of 105 OL climbs, 68 have later same-pair positive hand or body load in the
recorded first-contact metrics. That is lower-bound evidence: absence of an
early record does not prove the player never contacted his backer. A climb
label alone does not prove a useful second-level block.

The [contact-operator audit](../../../data/reviews/run-game-current/reference/contact-operator-audit.json)
also explains why historical NFL YBC targets disagree. In the exact same
1,142 complete cases, football minus metadata LOS averages .372 yd; changing
to snap LOS gives .746; changing to runner position gives .997. The broader
1,310-contact study averages 1.164 with a different population/operator.
Retain those distinctions before diagnosing an initial-push magnitude from YBC.

## Repairs and what their evidence establishes

**Run-trained contact.** `engagement.ts` now selects the offensive hands/feet
technique from the actual engagement type, including a genuine pass-to-run
conversion. A run uses `runBlock` where a pass set uses `passBlock`. Defenders,
body capacities and the existing common pad/bend proxy remain unchanged.
Run training already influenced approach and shed sustain; it was not absent
from the entire run game. Per-call mastery is still not implemented.

In 48 reduced, actually loaded trials, identical bodies/RNG face the same
contact while training/context varies. All 24 pass traces remain identical
across the repair. Run specialists gain the hands/feet advantage in a run;
changing only pass training leaves the complete run trace unchanged. These
controls establish correct trait selection, not a calibrated NFL win rate.

The isolated OL native mean is almost unchanged, while stuffs rise **39→52**.
Duo falls **1.875→.996 yd**. Retained adverse films include Duo/Odd/left/seed 11
**11.61→4.72 yd** and Power/Under/right/seed 3 **4.13→−.28 yd**. In the adverse
Duo seed 3, the same NT combo release persists but the LT loses leverage
earlier; that LT has runBlock 65/passBlock 86 and previously received the
stronger pass proxy in a run. No OL fall causes that witness. This is evidence
of contact sensitivity and corrected skill semantics, not grounds to add force
to recover the old gains. The native comparison retains every adverse pair.

**Observed off-feet recovery.** Physical falls live in Support and leave the
scenario-only `downUntil` at −1. The old carrier combined true `isDown()` with
that deadline, creating recovery extras as negative as −4.25 s. A defender
could appear quicker after falling, including when the consumed picture still
showed him upright. The repaired evaluator uses that already-consumed pose
and its age, without another observation or an exact live recovery oracle.

An upright/unknown picture gives zero allowance; down gives public `getUp`,
rising half of it. Picture age reduces the estimate, bounded to one native
tick through the public duration. Half-duration and the floor are explicit
coarse controller assumptions, not biomechanics or NFL calibration. Positive
scenario parking retains its explicit scheduled absence; no negative deadline
enters a physical-fall forecast. Existing holds and body recovery remain real
World constraints. Other hidden-state shortcuts are separately documented debt.

## Where the biggest remaining gains are

| First questionable instruction | Small next experiment | What would demonstrate progress |
| --- | --- | --- |
| Runner selects a far crease midpoint, bypasses own-blocker corridor evaluation and requests full speed | Near-face approach/gather and achieved squeeze prediction for one retained crowded-entry witness | Valid curved/skinny entries survive; avoid a closing blocker/penetrator using the same traction; retain loaded and adverse cases |
| Engaged defender loses installed gap/box/spill objective and works toward the actual carrier | Carry a compact fit/shoulder objective into contact; update from personal delayed/haptic cues | Same body can squeeze, box or spill appropriately while loads remain bounded; uncertain reads stay uncertain |
| OL's healthy target eludes him and he retains the chase | First prove dead old work plus a personally observed, reachable replacement | A useful reassignment occurs without abandoning a still-live backside threat or stealing a keeper |
| Helper release, keeper and backer contact have different meanings | Inspect whole decisions plus actual surviving joint/load and reachable backer approach | Release supports a real lane and second-level contact, rather than merely increasing the climb count |
| Near tackle approach changes mode abruptly or loses force shoulder | Smooth attainable approach using existing support-aware limits | Better brake/hip approach on both mirrors, finite request changes and preserved leverage; not inflated agility |

Prioritize the first two through retained native cues, rather than broadening
the solver. The entry prototype already has withheld/adverse evidence; do not
revive its blanket straight-corridor veto. A bent path can be valid. Free
traffic previews currently exclude loaded, gripped and squeezed bodies;
respect that boundary when estimating a carrier's next action.

Healthy-target OL recovery is **not yet demonstrated as wrong football**.
A screen of ten baseline films finds retained targets behind the OL, but
none has the recorded carrier sufficiently past that defender or a personally
consumed replacement backer. A retreat can preserve a live threat. Do not
auto-climb just because the DL crosses behind. Draw's combo helpers also have
unfinished low-hat presentation; isolate that contract from ordinary zone work.

The defensive audit reproduces a 3.30 yd/s requested-speed discontinuity for
nearly identical pursuit headings. It also finds optional Under/Tite exchange
metadata that duplicates B-gap responsibilities. Those are staged source-law
counterexamples: the manual exchange is not enabled by ordinary playcalling,
and neither explains the current panel's aggregate without native evidence.

## Physics remains the executor, not the outcome target

The shared model already executes finite traction/turning, support/balance,
hand/grip forces, work budgets, impacts and real mesh reach. Across this panel,
momentum/work accounting stays numerically bounded and no unexplained motor
work appears. This establishes internal contracts; it does not calibrate NFL
strength, surface friction, grip magnitude or contact onset/convergence.

Reopen physics for an attainable instruction that produces unexplained load,
motion, support failure or timestep-sensitive behavior. A wrong aiming point,
contact objective or recovery belief belongs in the controller. The same small
physical capabilities must still transfer across anchor, drive, redirect, shed,
absorbed contact, press and tackle cases. Full anatomical foot expansion remains
paused, and no universal physics OK or percentage-exhausted claim is warranted.

The most useful data expansion is already local: `aid-1.zip` contains all nine
BDB2025 tracking weeks, though only two are extracted. Stream selected
concept/context cells with a declared runner/LOS/contact operator, then measure
first-step displacement, mesh velocity, approach curvature, contact development
and second-level arrivals. Tracking cannot directly label hand force or actual
block control. More context-matched trajectories and a few film judgments are
more useful here than another large general motion-capture download.

## Final checks and practical limits

All **895 TypeScript tests** and **66 Python data tests** pass; typecheck and
build pass. Baseline feature controls expose the actual defects: four OL
context checks fail on the old implementation; six of eight helper-independent
held-picture recovery checks fail before the repair and all eight pass after.
New API absence is not counted as a mechanism failure.

The matched 24-case pass guard retains all pairs. Its selected throwing/read
fields, attempts (18), completions (14), interceptions (2) and mean time to throw
(2.947 s) are unchanged. Only four complete executions are identical: YAC,
scrambles, returns and downfield run contact can change. One retained QB
scramble changes −3.26→−5.94 yd and records a fumble; one Four Verticals YAC
falls 55.08→14.67 yd. Preserve those controls rather than claiming pass football
is unaffected. Six sampled full/plain recordings per phase match.

The same two-game seed/league guard changes designed rushing 3.22→3.83 YPC,
stuffs 21.52→24.29% and points 20.5→35.5 per team-game. Later call/outcome
populations diverge, so these are descriptive regression observations, not
paired snaps or a league trend. The large scoring/YAC changes remain a reason
to inspect normal football and additional roster contexts at the next increment.
The collector's historical printed targets do not override the new conditional
references or harmonized contact operators. No force, rating or outcome
constant was fitted to either game result.

Watch [twenty saved paired clips](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/run-game-current.html) or use the
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/run-game-current.zip). Filter by concept/front and
source; each predeclared fixture has BEFORE and FINAL references. Inspect
requested technique separately from completed support, surviving hands and
delivered loads. The source-labelled viewer is an inspection aid, not a blinded
judgment that all changed plays look better.

