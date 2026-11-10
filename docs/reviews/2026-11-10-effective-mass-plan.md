# Effective mass at first contact: plan

Integration, 2026-11-10, for Flex. Tanner chose mechanism 1 of Flex's front-on collision note (effective mass at first contact) and asked for a plan before code. This is that plan. It keeps Flex's reproducer, controls and two-attempt rule, and adds what has to be settled first so the law that gets built is the right one.

## What the engine does today

Read from `src/physics/world.ts` and `src/physics/support.ts` at develop e951efa9.

- A body is one planar point mass. A torso contact is a compliant row (`CONTACT_HZ` 9, critically damped) between two whole-body masses, so a front-on hit reaches the inelastic common velocity of both whole bodies in about 0.05 s. Flex measured exactly that: 3.5 -> 1.4 yd/s in 0.1 s for a 96 kg runner and a 117 kg hitter.
- Contact height is `min(padHeight_i, padHeight_j)` unless a caller passes one. `addLoad` turns the load's moment about each body's COM into a capture-point term: `tip += f * (z - c) * c / pitchRadiusSq / m`, with `pitchRadiusSq = (0.3 * height)^2`.
- That pitch term is one-way. It moves the capture point (`xi`), which can make him step or fall, but it never changes how much linear momentum the contact row exchanges, and the contact point has no velocity of its own. The row sees the COM.
- Upright, pads are 0.67 of height and the COM 0.55; at full posture both are near 0.40-0.41. So a hit on an upright body lands above his COM and the tip term pitches him backward (Flex: 84% of front-on contacts).

## What "effective mass" can and cannot do

This section is the reason for the order of work below. Check it; if any of it is wrong, say so before building.

1. **Momentum.** If two bodies stay in contact and nothing else pushes, their final common velocity is fixed by their whole masses and incoming velocities, whatever the contact model. A lower effective mass changes *when* each part of the body gets there and how the bodies rotate. It does not, alone, leave the runner with more speed at the end.
2. **So the gain has to come from somewhere real.** There are only four places:
   - (a) force from the ground during the contact (his legs keep driving; the hitter's do or do not);
   - (b) force from third bodies (a blocker still pushing the hitter; a second tackler);
   - (c) the hitter giving ground (the pile moves: NFL hitters are driven back 0.57-0.94 yd, ours 0.28-0.46 on the reference);
   - (d) where the runner goes down relative to the contact (falling forward over the hitter is about a body length better than falling back or straight down).
   Effective mass matters because it changes (a), (c) and (d): if only the struck part is checked at first, the runner's hips and legs are still moving and still under him, so his feet act while the exchange is in progress, he pitches over the contact instead of stopping as a block, and the hitter, struck on his torso while his own feet are planted, is rocked back.
3. **A rigid body is not enough.** Treating each player as one rigid body free to pitch about his COM gives an effective mass at the contact point of `m / (1 + (z - c)^2 / k^2)`. With the engine's own numbers (upright, `z - c` = 0.12 of height, `k` = 0.30 of height) that is 0.86 m: a 14% change. It cannot explain a gain that is 2.7 times ours at 3-5 yd/s. The candidate that can is a body with at least two coupled parts, the struck upper body and the hips and legs, with the legs on the ground.
4. **NFL tracking measures the shoulder pads, not the COM.** The chips are in the pads. A runner whose torso is checked while his hips keep going shows a *larger* speed drop in tracking than his COM has. So "speed kept at +0.1 s" must be compared pad to pad: the sim side of every NFL comparison in this work is the velocity of the contact point (pad height), not `body.vel`. Today those are the same number; under this law they are not.
5. **The first 0.1 s may not be where the gap is.** The sim's pile averages about 0.6 yd/s over the contact (0.9 yd in 1.4 s); the NFL's about 1.6 yd/s (2.4 yd in 1.5 s). The initial inelastic speed for these masses is about 1.4-1.7 yd/s in both. If NFL pads also drop to about 1.5 yd/s by +0.1 s and then *hold* that for a second, the gap is what sustains the pile (2a-2c) and who is still on his feet (2d), and the law must be judged on the 0.3-1.5 s course, not the first tenth.

None of this argues against mechanism 1. It says the deliverable is a law that gets the *partition and timing* of the exchange right, with the fall direction and the pile's motion as its football consequences, and that the NFL speed course decides its shape.

## Phase 0: the NFL course, before any model (no engine change)

One operator, same code on the 2022 tracking export and on a sim dump, added to `scripts/diag/run-operators/` and to the stored NFL output so it shows up in `npm run ref:report`.

For front-on first contacts (the `hitterback.py` definition), split by approach speed (<3, 3-5, 5+ yd/s) and hitter class (blocked / shed / free):
- runner pad speed along his approach at -0.1, 0, +0.1, +0.2, +0.3, +0.5, +1.0 s;
- the hitter's speed along the same axis at the same times (who gives ground, and when);
- separation between them over time (does he go through, over, or stay stuck);
- relative momentum at contact, `m_r v_r + m_h v_h` along the axis, against the gain (does the NFL gain follow incoming momentum, as point 1 says it must unless the ground or others add to it);
- time to down and whether a third body is within 1 yd of the hitter's back (a blocker still on him) or of the runner (second tackler) at +0.2 s.

Sim side: the same, with the runner's and hitter's *contact-point* velocity where the law gives one, and `body.vel` alongside it.

Additions agreed with Flex (2026-11-10), built into the operator (`scripts/diag/run-operators/frontcourse.py`):
- **(a) Collision, not proximity.** The first-contact rule (centres within 1.0 yd) includes arm's-reach touches. Each
  contact is flagged by whether the two centres close to torso distance (<= 0.65 yd) within 0.3 s, and the minimum
  separation is reported, so NFL touches are not compared with sim collisions.
- **(b) Contact point, not COM.** A runner who pitches over the hitter moves his pads forward by most of a torso length
  while his COM moves less, so a forward fall is already inside the NFL gain. Every comparison uses the contact point's
  displacement and speed (pads on NFL tracking; the sim's contact point once the law gives one).
- **(c) Masses.** If the source carries no weights, the momentum column is omitted and the speed course (runner and
  hitter along the approach axis) stands in, with group medians, and the output says so. Sim dumps now export masses.

**Gate 0.** Write down, from these tables only:
- how much pad speed NFL runners keep at +0.1 s, by bin (this is the target for the first exchange);
- when the NFL and sim courses separate: by +0.1 s, or between +0.3 and +1.0 s;
- how much of the NFL gain is the hitter's displacement and how much is the runner relative to the hitter.
If the courses match to +0.1 s and separate later, phases 1-2 still go ahead, but the acceptance measures are the late course, hitter displacement and fall direction, and the write-up says plainly that the first-tenth loss was not the gap.

## Phase 1: the law on paper and on a bench (no game code)

**Design note first** (`docs/reviews/effective-mass.md`), with the derivation, before a line of `world.ts` changes.

Model to derive (the smallest one that can produce the effect):
- Each body keeps its planar COM state and gains **one reduced pitch degree of freedom per horizontal axis**: a pitch rate (how fast the upper body is rotating over or back from the hips), with inertia from the existing `pitchRadiusSq` and the COM height. This is the same quantity the `tip` term already estimates; it becomes a state the contact row can see instead of an after-the-fact capture-point push.
- A torso contact row acts on the **contact point**, whose velocity is the COM's plus the pitch rate times the height of the contact above the COM. Its effective inverse mass is the body's `1/m` plus the pitch term, `(z - c)^2 / (m k^2)`. With `z = c` the row is exactly today's row.
- The pitch is restored toward his posture by the trunk and hips (a stiffness and damping the athlete owns: strength and balance set the torque limit, not an outcome), and that restoring torque is what carries momentum between upper body and hips over the following steps. Beyond the torque limit he folds or is stood up; that is the existing fall logic's input.
- The support model takes this pitch state in place of the instantaneous `tip` impulse for torso contacts: a runner whose upper body is checked while his hips drive forward has his capture point *ahead* of his base (he pitches forward over the contact); a body rocked back has it behind.
- Hands and grasp joints are out of scope for the first version. They keep today's `tip` path. Say so in the code where the two paths meet, and make sure no load is counted on both.

Things the note must settle with sources, not tuning:
- the upper-body mass share and pitch inertia (segment anthropometry: de Leva / Zatsiorsky tables), against the engine's `pitchRadiusSq = (0.3 h)^2`;
- trunk and hip stiffness and damping as a natural frequency and damping ratio, and the peak hip-extension torque that limits them (biomechanics literature on trunk perturbation and tackle impacts; rugby and American-football tackle studies report effective mass and impact duration: use them for the first-exchange check);
- why two parts and not three (if a head/arms or thigh/shank split changes the answer by less than the uncertainty in the sources, do not add it).

**Bench** (`scripts/diag/`, real `World`, two bodies, no game):
- identity: with both contact heights at the COM, every trace equals today's to the last bit;
- conservation: linear momentum of the pair exact at every substep with no ground force; total energy never increases;
- the sweep the football depends on: approach speed 2-7 yd/s x contact height (hitter's pads from knee to chest) x runner posture x mass ratio, reporting contact-point speed and COM speed at +0.05 / +0.1 / +0.3 s, each body's pitch, and who is on his feet at +0.5 s;
- expected signs, written before running: lower pads keep more speed and pitch forward; an upright runner hit at chest height is stood up; the heavier, lower body gives less ground; nothing in the sweep creates momentum.

**Gate 1.** The bench reproduces Gate 0's first-exchange numbers for NFL-like inputs within the source uncertainty *without fitting to yards*, and the identity and conservation checks hold. If the two-part model cannot reach the NFL course with sourced parameters, stop and re-diagnose (that is attempt one of two); do not widen parameters to get there.

## Phase 2: in the engine, behind a flag

- Flag `EFFECTIVE_MASS`, read `=== '1'`, off, listed `off` in `config/reference-stack.json` (the stack is now the code default; new mechanisms still start off).
- Torso contact rows only. `strike()` impulses and joints unchanged in version one.
- Substep cost: one extra state per body and one extra term per torso row. Measure `npm test` time before and after; say if it moves by more than a few percent.
- Tests with the flag on: the bench's identity and conservation cases as unit tests, plus one opposing control (a side hit and a rear hit do what they did).
- Remember the suites run on the legacy engine (`vitest.config.ts` pins the promoted flags to 0). Write the new tests against the real defaults by stubbing the pin off for what they need, or they will be testing a body nobody plays with.

## Phase 3: judged in football

Every arm on the same inputs: the 162 front-on in-game contacts, the 1-v-1 tackle panel, and `npm run ref:report -- --flag EFFECTIVE_MASS=1` (fixed 1,321 runs, paired against the reference).

Moves that would count as the mechanism working:
- the Phase 0 course: contact-point speed at +0.1 / +0.3 / +1.0 s by approach-speed bin, toward the NFL's;
- gain after a front-on contact **rising with approach speed** (NFL +1.03 / +2.43 / +3.31; sim flat at about +0.9);
- the hitter driven back toward 0.57-0.94 yd;
- fall direction: fewer runners going down backward or straight down within 0.5 s of a front-on hit.

Controls that must not move materially (a move here is a blocker until explained):
- side and rear contacts (already near the NFL);
- the engaged push contest: `trench2` DL depth and driven-back shares, the s9-39 fixture, the lopsided bench pair. Pads meet near both COMs in a block, so the law should change little there; if it changes a lot, the contact heights in blocks are wrong and that is a finding in itself;
- pass protection: time to pressure and sack rate on Coverage's pressure grid (a bull rush is a torso collision);
- press and jam contacts.

Whole-game checks, because this touches every collision:
- `ref:report`: yards, runs for no gain, 10+ runs, **broken and missed tackles a run** (0.17 / 0.23 on the reference);
- quick scorecard, flag off vs on. Watch **YAC a reception** (11.9 against an NFL band of 4.5-5.9) and yards an attempt: the pass game is already the largest error in the sim, and a runner who keeps more speed through first contact will push it further. If rush gains move toward the NFL and YAC moves away, report both; that is a tackling-in-space problem this law exposes, not a reason to bend the law.

## Order, stops and what comes back

1. Phase 0 operator and tables, as a PR with no engine change. Send Gate 0's three answers.
2. Design note and bench, as a PR with no game-code change. Send the Gate 1 result.
3. `EFFECTIVE_MASS` behind the flag, with the Phase 3 tables.

Stops:
- Two attempts at the law. If the second does not reproduce the NFL course from sourced parameters, stop and re-diagnose with the tables in hand.
- Do not fold load height (mechanism 2) or contact duration (mechanism 3) into this as separate knobs. Contact height is an *input* to this law and the pad-height map should be audited in Phase 1 (is a running back's `padHeightAt` right at his running posture; is a tackler's), but as a check of an input, measured against tracking or film, not as a second lever.
- No number in the law is chosen because of what it does to yards.

Report each phase to the integration session with the PR number, what ran and the tables. Promotion of the flag is Tanner's call with Primary informed, as with any physics law.
