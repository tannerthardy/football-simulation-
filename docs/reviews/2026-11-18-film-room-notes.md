# Film room notes, engine-91 (develop 7a157055), 2026-11-18

The user's notes from the first film room (60 random pass plays F01-F60, 20 zone 10+ YAC plays F61-F80;
4 games at seed 101, pick-seed 1; https://claude.ai/artifact/UPaXk8MZYnp8udHJgzSSLD). Work list for when
work resumes. Each item is the user's observation, to be traced on that play before anything is built.

## Themes (the user's words, condensed)

- **Pursuit is the YAC.** F62, F64, F65, F66, F67, F69: defenders take angles the runner simply runs past
  ("he falls underneath the receiver while running at him"). The user rejects "it's not pursuit". Earlier
  measurement found no general pursuit-angle gap in aggregate; these plays say look at them one by one.
- **Coverage assignments and pass-offs are busting**, especially match rules, Deuce, quarters vs the flat,
  and empty / motion-to-empty: "we have people wide open way too much".
- **QB eyes**: the cone snaps instead of moving; he throws the instant his eyes arrive, or before they do.
- **Blitzers get nowhere**; the QB has the cleanest pockets.

## Random plays

- **F02 (screen)**: vision cone snaps, not smooth. QB's body faces the first read while his eyes are not on
  him; the moment the cone snaps to him he fires. Quarters corner stands and watches the screen: should he
  come down? Nickel's pursuit after shedding his block: not a vice tackle.
- **F03 (mesh)**: Z is bumped slightly off his route, then takes a straight line back to the drawn route
  and runs into the other receiver. He should carry on with the concept (cross and rub), not return to a
  line. Route flexibility after a bump.
- **F04**: SS trails the flat player and ends up underneath him; Y turns upfield and he is beaten. Does
  that leverage make sense even in man?
- **F05**: the corner following motion bumps into a teammate before the snap; nobody else adjusts and he
  does not go around. Needs pre-snap movement / a man check against motion and tight splits.
- **F07**: Cover 3 buzz assignments look odd; X wide open on the dig. Where the QB starts his windup and
  where he is looking differ (target only in peripheral vision).
- **F08**: quarters shown as single-high pre-snap. Defenses usually disguise from two-high and rotate
  down, not from one-high rotating back (harder for safeties to go backward).
- **F09**: quarters: nobody takes the flat. NB does not pass off H, so LBW and NB both cover H and Y runs
  free to the flat. "College stuff."
- **F11**: LBW sits in the throwing window and the QB decides before his eyes lock on X. FS drifts wide
  away from every receiver in a fire zone: with no threat outside, should he be more aggressive?
- **F12**: does the NB play this correctly?
- **F13 (Deuce DOT)**: Z's route looks flipped (a deep curl, not a comeback). CBW holds his zone but does
  not close on the RB in the flat. FS drifts away from X running deep. QB turns down a wide-open X.
- **F15 (Deuce)**: CBW and LBW both track X; no trade-off. Blitzing LB gets stuck in the bunch instead of
  going around; clean pocket. Nobody takes Y's hitch. Coverage struggles vs empty and motion to empty.
- **F16**: CBS does not sink under the vertical with nobody threatening his flat; SS does not pick him up;
  X on the other side wide open. Deep safeties' coverage.
- **F17**: trail technique: CBW lets X run by; looks like zone, not trail.

## Zone 10+ YAC plays

- **F61**: coverage bust; the curl-flat defender is pulled far out of position by play action, the flat
  runner nowhere near him. Possibly run-fit logic.
- **F62**: CBS turns a full 360 with the ball in the air, late to react, then a pursuit angle H runs past.
- **F63**: collision at the line keeps Y from his route; QB dumps it fast. Corner route left open; LBW
  should help on Y but may not see him as a route runner while he is stuck behind the line.
- **F64**: LBW nowhere near his zone or responsibility; CBW, FS and LBW all on H; after the throw LBW is
  not moving toward him; then CBW takes "the worst angle". Small gain becomes a touchdown.
- **F65**: pursuit, SS.
- **F66**: good Cover 3 beater; CBS's pursuit makes it bigger.
- **F67**: open-field tackle / pursuit; believable if the tackle is broken, then FS takes a bad angle.
- **F68**: SS picks up a back who is not running a route (but looks like it) while the fullback runs the
  route. Backs on play action who neither route nor block confuse defenders.
- **F69**: looks normal; maybe small pursuit problems.

## State when paused

All lanes stopped. Develop at engine-91. Open, uncarded or half-carded: #859 (release + slant; card
stopped partway), #850 (DIR_START), #855 (open-field pair), QB's READ_WINDOW flip, #861 (TAUGHT_ORDER),
#793 (joint honest-tracking + defender catch landing; dither row over budget), Defense's deep-safety pair,
#860 (JAM_SQUARE) with Coverage's MAN_TURN, #862 (YAW_CAP, hold), #863, #864.

## Priorities set by the user after the film (2026-11-18)

The two biggest fixes, in this order of weight:

1. **Coverage assignments and how defenders relate to the receivers in their zones.** "We're just leaving
   dudes way too wide open too often." Includes pass-offs and match rules, and, as part of the same work,
   **run fits and play action**: defenders look drawn too far out of their zones by play action; it looks
   "a bit too effective" (F61, F68). Check against the NFL before assuming it is wrong.
2. **Pursuit.** To the eye, a corner takes an angle that is not "safe" enough and the receiver runs by him.
   The user's hypothesis, to test first: it happens **when the receiver catches the ball without much speed
   and then accelerates**: the defender's angle is right for the speed he sees at the catch and wrong for
   the speed the runner reaches. (Check what speed the pursuit planner and the open-field approach assume
   for the carrier: his current seen speed, or what he can reach.) They may also be broken tackles the
   viewer cannot see; the film room should show contact and broken-tackle events so that can be told apart.
   The user allows that it might be normal; measure same-situation NFL plays (catch speed low, defender
   3-6 yd away and deeper) before and after.

Also: the passing numbers "should be worse": the QB **turns down a lot of wide-open throws** (F13). His
pricing still hides how open receivers are; fixing coverage will show less than it should until he throws
to open men.
