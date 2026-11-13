# Playing the ball in the air: DB and receiver technique, the rules, and interception science

Run Game lane, research only (no `src` changes), 2026-11-13. Asked by Integration for
Coverage's spec.

This **fills gaps** in Tools'
`docs/football-handbook/ball-in-air-perception-sources.md` (commit ac1c6c66, branch
`claude/admiring-bell-t3ji19`; "Tools" below) and does not repeat it. Tools already
covers:
- phase as Daberkow and Kelly define it;
- Grayvold's turn, trail and "look and lean";
- the Coach & AD eye progression (hip, ear hole, eyes, hands);
- AFQ's interception point 6–8 yd in front of the receiver;
- the perception architecture papers;
- the BDB 2026 cohort;
- the engine's `ThrowSight` / `findsBall` / `acquireFlight` reading.

**Reading levels used below:**
- **original** = I read the text myself;
- **summary** = through a search or page-reader summary;
- **Tools** = already in Tools' note.

Coaching sources are what is taught, not how often NFL players do it.

## Bottom line

1. **The engine gives both sides an oracle flight.**
   - **The defender:** `acquireFlight` (`src/sim/possession-read.ts` line 16, develop
     516d8729) copies `sim.ballPath`, the full future path with height, the tick he sees
     the throw. It is the same as Tools found.
   - **The receiver:** `TrackBall` (`src/sim/behaviors/receiver.ts` ~571–640) reads
     the true `sim.ballPath` **every tick** through `catchSpot`. This starts
     0.08–0.33 s after the throw (`reactAt`), **whether or not he is facing the ball**.
     His only error is one constant offset per throw (σ = 0.5 yd × (1 − ballTracking)).
     Neither player ever has to discover where the ball is going.
2. **Interception science does not support "predict the landing point, then run."**
   - Skilled fielders start moving about 0.5 s into a flight.
   - They steer continuously on the ball's optical motion. They arrive running, at the
     moment the ball does, rather than waiting at a predicted spot.
   - When the flight is changed mid-air in virtual reality, they correct at once.
   - Visuomotor correction runs at about 110 ms.

   **The faithful model is a continuously updated estimate driven by what he sees, with
   a steering rule toward it, not a one-time landing-point prediction.** The estimate's
   error should shrink as more of the flight is seen and grow when the ball is not
   looked at.
3. **The coaching and the rules agree on one split.**
   - **In phase:** look, then play the ball. He has the same right to the ball's path
     as the receiver, and incidental contact while both play the ball is legal.
   - **Out of phase:** do not look. Read the receiver's eyes and hands and play
     through the hands at the catch.
   - Contact while not playing the ball, through the back, across the body or hooking
     is interference.
   - **NFL rules have no face-guarding foul.** Contact "when ... neither player is
     looking for the ball" is incidental if it does not restrict him (8-5-3(a)).

   The engine's pass-contact judge already keys on whether a player is playing the ball
   (`pass-interference.ts`, `ballAttention`). So the phase decision and the foul share
   one input.

## 1. Phase, and when the DB turns his head

| Point | Source (read) |
|---|---|
| In phase = shoulder locked, even, in step; out of phase = not. Look only when in phase | Tools (Daberkow, Kelly, Grayvold) |
| "Keep hips parallel to the receiver's so you can look back"; many corners "run with no contact and look back too late" | CoachUp deep-ball tips (summary) |
| "The hips tell you where he is going, and the hands tell you when the ball should be arriving" | USA Football, *4 key skills for DBs* (summary) |
| "Wide eyes = play the ball", next to "play the man until he declares" | DB clinic slides (Gaskins, summary) |
| Trail technique: shadow the receiver's footsteps from a hip behind, taking away the inside break; needs "exceptional recovery speed" | Glazier coverage drill (summary) |

**Named relationships** (coaching vocabulary; no measured distances found):
- **On top:** above the receiver, between him and the ball's deep path.
- **Even / in phase:** shoulder to shoulder in stride.
- **Hip pocket / trail:** about a hip behind and inside. In man trail this is a
  deliberate position (underneath help over the top), not a failure.
- **Out of phase:** behind the hip and not in stride.

The coaching rule is about the relationship, not a yardage. I found no source with a
yard threshold, so derive one from bodies: in phase means within about a body width
laterally and level in depth, in stride.

**What starts the head turn**, in coaching order:
1. Being in phase. The eyes may not leave the receiver before that.
2. The receiver's eyes getting big or his head snapping around (Tools: Coach & AD).
3. His hands coming up.
4. In zone, the QB's throwing motion.

Grayvold's "eyes to the sky, not to the QB" (Tools) means the turn finds the ball in
flight, not the passer.

**What the turn costs.** It is coaching description, not measurement:
- the body tilts toward the side he looks, so he drifts off the receiver's line
  (Daberkow: looking back before in phase "will cause you to lose the WR");
- running speed drops while his head is turned back;
- he loses his feel for the man unless the near hand stays on him (Grayvold: hand on
  the hip).

No quantified speed cost of a head turn while sprinting was found. Treat it as a
physical consequence of facing and gaze, not a number.

## 2. Out of phase or not looking: playing the hands, and the foul line

| Point | Source (read) |
|---|---|
| Out of phase: eyes on the near hip, recover, "rake through the basket"; "break the glass" (near arm up through his hands as they rise) | Tools (Kelly, Grayvold) |
| When hands come up, put yours inside his, then turn and play; if you can't get inside, rake down the arms or punch up between the hands; if you can't secure the ball, be in position to tackle | Tools (Coach & AD) |
| Back-shoulder and end-zone jump balls: "play hands, aim for far hand" | Tools (Daberkow) |

**The rules that bound it** (NFL 2026 Official Playing Rules, **original**, Rule 8):

**8-5-1, when it applies:**
- Interference is any act more than one yard past the line that "significantly hinders
  an eligible player's opportunity to catch the ball".
- Defensive pass interference "rules apply from the time the ball is thrown until the
  ball is touched".
- "When the ball is in the air, eligible offensive and defensive receivers have the same
  right to the path of the ball."

**8-5-2, prohibited acts:**
- (a) "Contact by a player who is not playing the ball that restricts the opponent's
  opportunity";
- (b) "Playing through the back of an opponent in an attempt to make a play on the
  ball";
- (c) grabbing an arm in a way that restricts the catch;
- (d) "Extending an arm across the body of an opponent ... regardless of whether the
  player ... is playing the ball";
- (e) cutting off his path by contact without playing the ball;
- (f) hooking that turns his body before the ball arrives;
- (g) shoving or pushing off to create separation. This applies to receivers too.

**8-5-3, permissible acts:**
- (a) "Incidental contact ... when both players are competing for the ball, or neither
  player is looking for the ball. If there is any question whether contact is
  incidental, the ruling shall be no interference";
- (b) inadvertent tangling of feet;
- (c) contact when "the pass is clearly uncatchable";
- (d) "Laying a hand on an opponent that does not restrict him";
- (e) "Contact by a player who has gained position on an opponent in an attempt to
  catch the ball".

**8-4, before the throw:**
- Within 5 yd a chuck is legal.
- Beyond 5 yd, "a defender cannot initiate contact with a receiver who is attempting
  to evade him" while the QB is in the pocket with the ball; incidental contact is
  allowed (8-4-3, 8-4-4).
- These restrictions end when the QB hands off, throws, leaves the pocket, and so on
  (8-4-7).

**What this means for "playing the hands":**
- **Legal:** a hand to the hands or the ball at the catch point. It is contact for the
  ball by a player competing for it, so it's covered by the equal right to the ball and
  8-5-3(a), and it is not across the body.
- **Interference:** arriving early and through the back, an arm across the body, or
  hooking.
- **Face guarding is not a foul at NFL level.** Not looking is legal; only restricting
  contact while not playing the ball is a foul.
- **What success looks like:** the hand arrives with or just after the ball, through
  the hands, so the ball comes loose (a breakup). Early is a foul; late is a catch.

Timing is off the receiver's hands, which rise as the ball arrives. Late hands
(section 6) exist to shrink that warning.

## 3. In phase and looking: lean, squeeze, high point, undercut or stay on top

| Point | Source (read) |
|---|---|
| "Look and lean" to narrow the window; attack the ball at its highest point | Tools (Grayvold) |
| Undercut only with both hands sure: "Never go in front of a receiver unless you think you can get both hands on the ball" | DB guide (summary, via search) |
| Intercept at the high point, or deflect with the inside arm; stay in phase until the ball arrives | DB guide (summary) |
| Do not get ahead of the receiver: it invites the back-shoulder throw or the comeback | Tools (Grayvold) |

**Squeezing him to the sideline:** a standard cue, but no source I could read spelled
it out. It isn't verified here, so leave it as a coaching phrase until a source is read.

**INT or breakup?** The rule taught is to go for the interception only with both hands
on the ball and without going through the man. Otherwise play through the hands.

## 4. Zone and off coverage: breaking on the throw

| Point | Source (read) |
|---|---|
| Underneath defenders: vision on the QB's throwing arm; break "when the quarterback's off hand leaves the ball"; a deep-zone defender breaks only when the ball is thrown | Human Kinetics, *Zone coverage techniques* (summary) |
| A QB "can only throw in the direction his off shoulder is pointing" | Human Kinetics (summary) |
| Zone break drill: read the QB's eyes and shoulders, gain ground without a false step, catch at the highest point with both hands | Active.com zone break drill (summary) |
| Break to where ball and receiver will meet, 5–7 yd in front of the receiver, not where he is | DB guide (summary); Tools has AFQ's 6–8 yd |
| Do not look back to the QB until you reach the intercept point | DB guide (summary) |

**"Tackle the catch"** (be in position to tackle if you can't play the ball) is in
Tools (Coach & AD). It is the zone defender's fallback when his angle to the catch point
cannot win: take the angle to the receiver after the catch.

**Engine.** `SHOULDER_READ` and the zone keys on the windup (`keysQB`) exist (Tools).
The off-hand and off-shoulder cue matches the "underneath plant on the windup" work.

## 5. Throw types that change the rules

- **Underthrown or back-shoulder.**
  - Aim point: "a foot above and a foot behind the wide receiver's back shoulder"
    (receiver coach, summary).
  - A defender who is on top or ahead and not looking can't react to it. That is why
    Grayvold says do not get ahead (Tools). It is also why an ESPN piece calls the throw
    against "everything" DB coaches teach, since their priority is the deep ball
    (summary; the page did not render).
  - Defending it: in phase and looking, he sees the ball short and plays through the
    near hand. Out of phase, he reads the receiver's turn and plays the hands
    (Daberkow's "far hand" on back-shoulder, Tools).
- **Fade vs go.** The fade is placed toward the sideline to the outside shoulder, where
  a defender inside him can't play it. The go is in stride. Nothing beyond Tools'
  sources was read.
- **Jump ball.** "Play hands, aim for far hand" (Tools).
- **Crossers.** The ball comes across the defender's face at short range. He breaks on
  the throw and plays the near hip or the hands. No specific source was read.

## 6. The receiver's side

| Point | Source (read) |
|---|---|
| Stack the DB, "a position that puts the defender directly behind you"; drive with eyes and shoulders downfield; "drive first and get their eyes up after"; "You will rarely be overthrown" | Pope, AFCA, *Winning vertically at the WR position*, 2023 (**original**) |
| Outside-shoulder throw: post up, nudge the DB inside, "finish with late hands"; "If you can feel the defender, you can control him"; "never give up your chest" | Pope (**original**) |
| Deep ball with air under it: club the DB's hands with the off arm, slingshot forward and run under it; back shoulder: "use off arm to swipe the defender by and attack the ball in flight" | Pope (**original**) |
| Late hands are a benefit of tracking the ball well on deep routes; "When you're facing press coverage or a guy is on you, you need late hands" (Marvin Jones); a DB coach builds drills around late-hands receivers | ESPN on Marvin Jones (summary) |
| Catch: open shoulders and front hip to catch softly; "always put his body in between the ball and the ... defender" | Human Kinetics, pat-and-go drill (summary) |

So the receiver also does not see the ball until he has won his position and looks up.
- **He adjusts by speed under the ball:** runs under it, slows to it, or comes back to
  the back shoulder.
- **He hides the catch timing with late hands,** which is the DB's cue.
- **He boxes out by keeping his body between the defender and the ball.**

Note the asymmetry. Rule 8-5-3(e) allows contact by a player "who has gained position",
and 8-5-2(g) forbids pushing off. The box-out is legal; the swipe or slingshot is legal
only before the ball is thrown or while it is incidental.

## 7. Perception science of intercepting a ball in flight

| Source (read) | Finding | Numbers |
|---|---|---|
| Chapman 1968, via McLeod and Dienes | Standing where the ball will land, the tangent of the gaze-elevation angle rises at a constant rate. A fielder who keeps d²(tan α)/dt² = 0 arrives there | — |
| McLeod and Dienes 1996, *JEP: HPP* (**original**, first pages) | Skilled fielders, balls from a machine 45 m away: they "ran at a speed that kept the acceleration of the tangent of the angle of elevation of gaze to the ball at 0". This "does not tell fielders where or when the ball will land, but it ensures that they run through the place where the ball drops ... at the precise moment that the ball arrives". It also works with wind resistance. They "waited for about 0.5 s and then started to run" | Run start about 0.5 s; they arrive running, not waiting |
| Fink, Foo and Warren 2009, *J Vision* (**original**) | 12 college ball players, VR, balls launched 36 m away landing ±4 m. Perturbed balls (linear descent after the apex) produced an immediate adjustment, consistent with optical acceleration cancellation. Tangential movement was unaffected, against the linear-optical-trajectory account; the fast mid-flight adjustments are against trajectory prediction. Conclusion: "a continuous coupling of visual information to movement", without an internal trajectory model | Catch rate in VR 44–55%; OAC R² > .99 on normal trials |
| McBeath et al. 1995 | Linear optical trajectory (lateral) | Tools |
| Brouwer, López-Moliner, Brenner and Smeets 2006, *Vision Research* (**original**, abstract) | Judging front or behind from a brief view: subjects "made systematic errors"; they use angular velocity, hardly angular expansion | Presentation of 319 ms |
| Oudejans, Michaels and Bakker 1996/97 (summary) | Mainly non-experts first moved the wrong way | — |
| Brenner and Smeets 1997/98 (summary) | In interception the hand is continuously adjusted to the target's perceived position, with a delay of about 110 ms; final error depends on the information about 100 ms before contact | ~110 ms visuomotor loop |
| Zhao and Warren 2017, *J Vision* ("Intercepting a moving target: on-line or model-based control?", summary) | Online control (constant bearing angle) vs model-based. A later paper argues the average paths cannot tell them apart, and that with realistic noise and delay pure online control degrades | — |
| Postma 2014 / 2017 | Eyes on the ball in about 95% of frames; catchability judgments graded | Tools |

**What this says for the engine's ball estimate:**
- **Prediction or steering?** Steering. Skilled catchers don't need, and don't seem
  to use, a landing-point prediction. They null an optical error continuously and arrive
  on time and moving.
  - A model-based estimate is defensible as a stand-in, but it must be updated
    continuously from what he sees, since behavior responds within about 0.1–0.2 s to a
    changed flight.
  - The simplest faithful form is an estimate from the ball positions he has seen so far
    (a fitted parabola, or the optical rule itself), refreshed each perception step, and
    held only while he is looking.
- **Error by flight time, distance and angle.** No source gives a landing-point error in
  yards against time. What the literature supports:
  - **Early:** the direction to move (front or back) is often unknowable or wrong for
    about the first 0.3–0.5 s, especially for non-experts (Oudejans; McLeod and Dienes:
    start about 0.5 s).
  - **Depth:** error along the line of sight is much larger than across it. Front and
    back must be judged from optical acceleration or expansion, which are weak signals
    (Brouwer); side to side is read directly from angular velocity.
  - **Late:** the error converges to near zero by the catch, because the controller
    nulls it.
  - **Not looking:** the estimate goes stale. The 110 ms loop and the hands-at-catch
    cue are what a non-looking player has instead.
- **What a receiver gets** is the same physics: he must look to refine it. A receiver
  running away from the passer views the ball from behind, which is the hardest depth
  judgment. That is what "drive first, eyes up after" and adjusting speed under the ball
  manage.

## 8. What a faithful minimal model needs, and what can wait

**Needs (in order):**
1. **One shared ball estimate per player, built only from what he has seen.**
   - It replaces `acquireFlight`'s path copy (defender) and `catchSpot`'s live
     `sim.ballPath` read (receiver).
   - It is refreshed each perception step while he is looking; it holds or decays while
     he is not.
   - Its error shrinks with viewing time and is larger in depth than across.
   - Start without fitted constants: an optical or parabola fit to his own delayed,
     noisy observations of the ball.
2. **A look decision from state the player can perceive:**
   - phase: shoulder relationship and stride, from what he sees and feels of the man;
   - the receiver's head and eyes;
   - the hands rising.

   Looking is free to choose and has physical costs:
   - while the head is turned back, the facing he can run along changes;
   - his picture of the man goes stale except by touch.

   Not looking has the costs above too: no ball estimate, so he plays the hands on the
   cue.
3. **Finishes as actions under the existing pass-contact judge:**
   - play the ball (high point / undercut with both hands);
   - play the hands (arrive at the hands with the ball);
   - tackle the catch.

   `pass-interference.ts` already judges contact by `playingBall`; keep "looking"
   (ball attention) as the single input to both.
4. **Steering to the estimate** as a continuous rule, re-aimed each step (the existing
   constant-bearing climb has the same shape), arriving moving, not stopping at a point.

**Can wait:**
- Gaze eccentricity and detect-vs-identify, beyond a simple field of view (Tools item 6).
- Ball spin or wobble, wind, and ball height above about catch height. The parabola is
  enough until a witness needs more.
- Receivers' push-off and swipe fouls (8-5-2(g)) beyond what the judge already sees.
- A measured cost of the head turn: no source gives one, so let facing and gaze carry it.

**Witness that the oracle matters.** Take the same saved deep-ball snaps with the
defender's and the receiver's flight knowledge from their own looks instead of the true
path. Check:
- arrival timing at the catch point;
- the share of in-phase vs out-of-phase finishes;
- breakups vs late hands.

Against BDB 2026: the targeted receiver and coverage cohort, flights of 1.5 s or longer
pooled across weeks (Tools section 3).

## Sources

**Read as originals:**
- NFL, 2026 Official Playing Rules, Rule 8 Sections 4–5:
  https://static.www.nfl.com/image/upload/fl_attachment/league/tqivdkzt9mu6wdgsh1ku.pdf
- McLeod P, Dienes Z (1996). Do fielders know where to go to catch the ball or only how
  to get there? *JEP: HPP* 22(3):531–543. https://users.sussex.ac.uk/~dienes/McLeod%20&%20Dienes%201996.pdf
- Fink PW, Foo PS, Warren WH (2009). Catching fly balls in virtual reality: a critical
  test of the outfielder problem. *J Vision* 9(13):14. https://pmc.ncbi.nlm.nih.gov/articles/PMC3816735
- Brouwer A-M, López-Moliner J, Brenner E, Smeets JBJ (2006). Determining whether a ball
  will land behind or in front of you. *Vision Research* 46:382–391 (abstract and method
  notes). https://personal.fbw.vu.nl/~jsmeets/2006/Balllanding-VIR06.pdf
- Pope K (2023). Winning vertically at the WR position. AFCA.
  https://www.afca.com/winning-vertically-at-the-wr-position/

**Summary only:**
- CoachUp, How to defend the deep ball. https://www.coachup.com/nation/articles/football-tips-defensive-back-how-to-defend-the-deep-ball
- USA Football, 4 key skills for DBs. https://blogs.usafootball.com/blog/1335/4-key-skills-any-defensive-back-can-strengthen-to-improve-coverage-skills
- Gaskins, Defensive back play (slides). https://www.slideshare.net/slideshow/defensive-back-play-gu-46377106/46377106
- Glazier, defensive coverage drill. https://glazierclinics.com/football-coach-resources/free-football-drills/defensive-coverage-drill
- Human Kinetics, Zone coverage techniques. https://us.humankinetics.com/blogs/excerpt/zone-coverage-techniques
- Active.com, The zone break drill. https://active.com/football/articles/the-zone-break-drill-for-defensive-backs
- DB guide on breaking to the meeting point and undercutting (search summary). https://www.scribd.com/document/642057777/Untitled
- ESPN, Marvin Jones late hands. https://www.espn.com/blog/nfcnorth/post/_/id/75470/having-late-hands-helps-lions-wr-marvin-jones-excel-as-deep-threat
- ESPN, The secrets of the back-shoulder fade (did not render). https://www.espn.com/blog/green-bay-packers/post/_/id/14582/the-secrets-of-the-back-shoulder-fade
- Human Kinetics, pat-and-go drill. https://us.humankinetics.com/blogs/excerpt/making-the-catch-with-the-pat-and-go-drill
- Oudejans, Michaels, Bakker 1997 (via Brouwer et al.).
- Brenner and Smeets, interception with continuous visual control. https://personal.fbw.vu.nl/~jsmeets/1998/Hitting-EBR98.pdf
- Zhao H, Warren WH (2017). Intercepting a moving target: on-line or model-based control?
  *J Vision* 17(5):12.

**Not read:** X&O Labs deep-ball and phase articles (403); sideline-squeeze sources (none
found). No measured cost of a head turn, and no landing-point error in yards against
time, was found.
