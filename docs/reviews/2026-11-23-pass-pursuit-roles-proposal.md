# Proposal (not built): pass-play pursuit roles after the catch (2026-11-23)

Status: a written proposal only, per Integration, for a later step after CARRIER_ACCEL. Nothing here is implemented.

## The taught rule

From the coached-rules cards, `docs/reviews/2026-11-17-zone-coached-rules.md`. Each is marked [shared] there
(Vanderlinden, Waugh, Saban, Clark, McDonald, Bowen):

- **After the catch:** the flat defender forces outside-in (upfield hip); hooks pursue inside-out.
- **Rally:**
  - aim where the carrier will be;
  - deeper and farther defenders take deeper angles and adjust back upfield only, never trailing a teammate;
  - corner/force outside-in, safeties/alley inside-out on the cutback;
  - come to balance at 3-4 yd without stopping the feet;
  - the last defender keeps him in front and uses the sideline.

The handbook says the same: `docs/football-handbook/defense-and-perception.md` §10, "A force player protects outside
access; an alley player approaches inside-out"; its failure row: "Force and alley converge ... both aim at the same
current point and collide".

## What the engine does now (the diagnosis, §5)

- **Each pursuer solves his own intercept alone.** `chase` and `pursuitPoint` use no teammates.
- **The only leverage is a field-position inside shade, the same for everyone.** `leverage()` in
  `src/sim/behaviors/common.ts`, applied through `pursuitLeverage`.
- **A called shoulder exists only for run fits.** `runFit` with force or edge.
- **Teammates interact only through spacing.** The spacing stage (`spaceTeammates`, `src/sim/spacing.ts`) avoids
  collisions after the decision.

**F09 under CARRIER_ACCEL.** The NB and CB_S aim at the same forecast spot ahead of the carrier. The spacing stage
then cuts the NB's upfield turn for 0.4 s, and he ends up trailing: the handbook's "force and alley converge" failure.

## Proposal

1. **The role is the player's own, from his call.**
   - Pass coverage already knows its post-catch shoulder from the coverage family.
   - The flat or curl-flat defender and the corner force outside-in. Hooks and safeties take the alley, inside-out.
   - Kept as a per-defender shoulder sign for the play, like `runFit.side`. It is assigned at the snap from the call,
     not at the catch.
2. **The shoulder sets the leverage offset in pursuit.** `pursuitLeverage` would read the pass role the way it reads
   `runFit` now. Force means the carrier's outside shoulder; alley means his inside shoulder. The magnitude and its
   fade with distance stay as they are.
3. **"Never trail a teammate" is a rule about the defender's own picture.**
   - A pursuer who sees a teammate between himself and the carrier, on the same shoulder, takes the next angle
     (deeper, or the other shoulder).
   - This uses only the teammate he sees and where that teammate is heading, never the teammate's assignment.
   - The decision persists with enter and exit margins (commit rule). It is re-decided only when the picture clears a
     margin.
4. **Spacing stays physics-of-avoidance.** With complementary aims the spacing stage should rarely bind. Its binding
   rate on pursuers is the check that the roles work.

## Measures (the existing operator)

- **Pursuit diagnosis rows.** The "together" row (bracketed share and the angle between the two nearest defenders), the
  first-defender failure classes, and how often spacing cuts a pursuer's request (from `pursuit-tap.mts` stage
  intents).
- **Dither budget.** Holds per controller.

Open questions for Rules:
- the exact role table per coverage family, including match and quarters variants;
- whether the last defender's "use the sideline" is a separate rule or falls out of force leverage.
