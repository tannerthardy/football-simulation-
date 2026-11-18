# Zone coached rules: underneath and deep (2026-11-17)

The user asked for the coaching points of underneath and deep zone defenders across the coverage families, how match
rules change them, and what the engine lacks. Their direction: proper coaching points get an implementation.
Integration adopted the list below as the zone coached-rules backlog (Defense owns A and B; Coverage owns item 13).
Code facts come from two read-only audits of this branch; line numbers drift, so search for the named function. Tags:
[shared] = two or more independent sources, [single] = one.

## Coaching consensus

**Underneath** (hook, curl, buzz, hole, flat, curl-flat)
- At the landmark (about 10-12 yd; hash for hooks, top of the numbers for curl-flat) by the QB's set; stop when the
  QB sets and break from a set base on live feet [shared: Bowen, Lawanson/Glazier, Burkett/AFQ].
- Break on the QB's body: shoulder cocked = load the hips; front elbow or off hand leaving the ball = go; front
  shoulder gives direction, its height deep vs short; eyes to the receiver on the break, not the ball [shared:
  Vanderlinden/Human Kinetics, Waugh/AFQ, Burkett/AFQ].
- Eyes: #2/#3 first, then the QB at the landmark ("if you can't see the QB, you're wrong") [shared].
- Wall and detour, never chase; carry a vertical #2 to 12-15 yd or to help; don't take a 3-yd teaser ("let the ball
  bring you down") [shared: Saban Rip/Liz, McDonald/AFQ, Clark/Glazier].
- Widen only when the receiver declares ("hold the curl until #2 out-leverages you") [shared].
- Straight-line, full-speed break; call "ball" [single: Waugh].
- After the catch: the flat defender forces outside-in (upfield hip), hooks pursue inside-out [shared].

**Match rules change who he watches and what moves him**: a ~3-step / 5-yd declare phase on #2/#3; then a declared
route is played man-like (carry, "low-shoulder outside leverage"); the break cue is the receiver's head and hands
when his eyes are on the man ("one eye on the seam receiver, one on the QB"); hand-offs run on calls (Under, Robot,
Smash, Push, banjo). Yards after the catch then come from busts (rubs, mismatched pictures), not late breaks.

**Deep** (thirds, halves, quarters, the post)
- Deeper than the deepest; the corner sits at ~11 yd when nothing is vertical; the post gets depth so his break is
  45° downhill, never lateral [shared: Bowen, Coach Phillip, Kent State/AFCA].
- Read the release and route distribution first, then the QB "through #2"; staring at the QB early is the most
  common cause of completions given up [shared].
- Turn when the cushion breaks (2-4 yd); "up" = past ~8 yd at speed; two verticals in one zone: midpoint [shared].
- Break only on the release, never on a pump; weight forward on the elbow, commit on the hand; the Rip/Liz post melts
  to the QB's first look and breaks on the second [shared; post rule single].
- In phase: look and lean; out of phase: play the hands [shared].
- By family: single-high and Cover 2 deep players hold until the throw; Quarters safeties come downhill pre-throw on
  #2's route, a short #2 or the run (paid for on play action); the Palms corner drives on #2's out [shared].

**Rally** (both levels): aim where the carrier will be, deeper and farther defenders take deeper angles and adjust
back upfield only, never trail a teammate; corner/force outside-in, safeties/alley inside-out on the cutback; come to
balance at 3-4 yd without stopping the feet (Bowen: stopping early and overrunning both miss); the last defender
keeps him in front and uses the sideline. People intercept by holding a constant bearing on a predicted point, with
about 0.5 s to detect motion (Fajen and Warren 2007); experts read a side-step from the hips, not the head (Brault
et al. 2012).

## Backlog (ordered by how directly it feeds zone yards after the catch)

A. Throw reaction (the underneath defender starts late) — Defense
1. Wall, CrossWall, Rob and Trap call `playBall` with no continuation (`techniques.ts`); on an arm-only belief they
   coast on their current velocity until the ball is seen. Needs both match triggers.
2. The arm read pays perception delay, then a second reaction wait after the shoulder pick; the load only plants.
3. Box backers drop only at pPass ≥ ~0.95 (`dropStart`); measure first.

B. Deep discipline (comes downhill, gets passed, nobody behind) — Defense
4. Arm-bite plant and shoulder-break are not gated on deep (`playBelievedBall`); family-dependent triggers.
5. Pre-throw deep-drive on a stopped stem (match style) fits a Quarters rob, contradicts Cover 3/2.
6. Deep defenders drive at the catch point at full speed; ARRIVE_LEAD is underneath-only; gather at ~2.5 yd.
7. No last-line mode: OPEN_FIELD on-top drops once passed by 0.8 yd.
8. Pursuit is a straight-line forecast intercept with a per-play bias; no constant-bearing, depth-scaled angles or
   lane spacing; effort 0.75+0.2·workRate beyond 12 yd.
9. Leverage is field-position only; no call-assigned force/alley roles or funnel to help he sees.

C. Reads and communication — waiting
10. Halves and the post split two verticals by leaning to the QB's look; coaching midpoints; no first/second-look rule.
11. Mable's "post safety relating to #3" has no rule.
12. Calls (ball, Under, Smash, Push, banjo) as heard cues on BALL_CALL's mechanism.
13. Information cheats — Coverage, now: (a) zone defenders' sight had no view bound; (b) defenders read the true
    flight under BALL_EST 6145. See below.

D. Smaller — waiting
14. Corners can sit shallower than the landmark while carrying; Sky corners don't bail; CURL_SINK and SETTLE_DEPTH off.
15. Deep ball skills take the earliest reachable point (an undercut bias); no over-the-top / in-phase rule.
16. Tackle type by approach angle (profile ~0-20°, angle/Hawk ~20-70°); the outcome stays in physics.

Measurement gap: no published NFL split of YAC by man vs zone, or time to first defender after a short catch; both
are computable from the 2022 tracking with the `mech:report` operator.

## Item 13

**(a) ZONE_EYES** (off): `src/sim/zone-eyes.ts`. A zone defender's head (head.ts's rate and neck range, on his
shoulders) follows the taught sequence: his key for the declare phase (ZONE_EYES_KEY, 0.9 s; flat and curl-flat #2;
hooks, hole, robber #3 else #2; thirds, halves, quarter-out #1; quarter-in and the middle #2), then the passer; on a believed throw,
the receiver his shoulder read picked; the carrier he chases (PlaySim.lookAt) first. Under BALL_EST with defenders
estimating, the ball estimate keeps its own head: sharing one head with the sequence raised staged zone YAC on the
honest arm without an explanation (cover 3 19.0 to 26.2, cover 2 26.5 to 29.9; sight alone moved nothing; two repairs
did not move it), so unifying the heads is an open item. He sees through the head's cone (SIGHT_COVER's head
view, release-evidence's head cone); outside it his picture ages from when he last had it. Man defenders keep
SIGHT_COVER's occlusion-only sight (their head is on their man by coaching): the same cheat for them is the next item.

**(b) The true flight.** Under the default BALL_EST 6145 (bit 4096, receivers only) a defender does not estimate:
after his recognition gate `acquireFlight` copies the true ball path. The honest-defender set on this branch (PR #793)
removes it:
- bit 4096 clear: defenders estimate from their own samples (the true path is never read);
- bit 32 (BALL_EST_INCIDENTAL): no cone-of-the-hips ball cue (the cheat found 2026-11-16); sight of the ball is his
  own sample;
- ACQ_SEEN and TRACKED_CATCH: repairs without which the honest arm leaves defenders on a stale flight after the catch
  (YAC 7.5 → 14.1 on the defense-only arm);
- bit 16384 (FLIGHT_SETTLE): commits to a catch point only once it has settled (honesty-neutral; without it he chases
  a one-look fit).
Smallest landing set that removes the true-path read for defenders: **BALL_EST 26657 (1 + 32 + 2048 + 8192 + 16384)
with ACQ_SEEN and TRACKED_CATCH**. HEAD_RIDE, NECK_FULL, ARM_LOOK, RUSH_ARM and BALL_CALL are improvements on top,
not requirements for honesty.

## Sources

Bowen NFL 101 Cover 1/2/3/4 (bleacherreport.com articles 2032934, 2039934, 2047445, 2094989); Human Kinetics, zone
coverage techniques; Burkett, AFQ Coverage 101; Waugh, AFQ inside linebacker technique; McDonald, AFQ underneath zone;
Glazier (Cassity curl-flat, Clark pattern-match drops, Lawanson, DB pursuit and tackling); Saban Rip/Liz
(brophyfootball 2010/08); USA Football blogs 7272 (Rip/Liz), 7382 and 7422 (quarters), 866 (force/cutback), 5006,
1737; Kent State Cover 3 (afca.com/?p=12234); Coach Phillip, Cover 3 DBs; Daberkow DB clinic (ncacoach.org);
Manes 2-Read (throwdeeppublishing); footballnationusa (Palms, MOD vs MEG, Cover 6); PFN quarters; Brophy/Diaz fire
zone; AFQ fire zone; vIQtory apex; SI on Seattle's zone errors and Kam Chancellor; Seahawks Hawk tackling handout;
Fajen and Warren 2007 (Exp Brain Res); Brault et al. 2012 (PLoS ONE e37494). MatchQuarters and X&O Labs were
paywalled or blocked.

## Future deep dive: the quarters / Cover 7 call tree (user, 2026-11-18)

"Quarters" is a family, not a coverage: what makes it work is when and why each check, tag and call is made. Saban's
Cover 7 is the reference (e.g. https://footballadvantage.com/cover-7/: MOD, MEG, Bracket with Push / Fast 3, Mix, Clip,
Smash / Under, split field). Today the engine has the pieces as separate calls (Quarters MOD, MEG, Palms, Box,
Book/Read, Poach/Trix, Stubbie, Cover 6/Stuff, Cover 8, Pounder/Finger/Rolex, Quarters / 2-Man split; Rip/Liz and Mable
on the Cover 3 side) but not Bracket, Mix or Clip; the calls are silent (each defender reads releases himself, so a call
cannot be late, missed or misheard: backlog item 12); and nothing chooses a check the way a staff does.

The work, in order:
1. Inventory the Cover 7 / quarters tree from coaching sources: every check, tag and call, the formation, route
   distribution, down-and-distance and opponent tendency that triggers it, and what it gives up.
2. Map it against `src/playbook/coverages.ts` and `src/sim/coverage/rules.ts`; build the missing variants.
3. Calls as heard cues (who makes each, when, and what a late or missed call costs).
4. A defensive game-plan layer: which checks a staff carries into a game against an opponent, and the in-game
   adjustments, so the playcaller chooses within the family for reasons a coach would recognise.
