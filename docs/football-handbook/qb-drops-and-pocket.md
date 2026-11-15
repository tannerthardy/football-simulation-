# Quarterback drops and pocket movement

Researched 2026-11-15. This chapter records how quarterbacks are taught to drop
back, set, hitch and move in the pocket, so the engine can model the coaching
instead of tuning a timer. It is a teaching synthesis in our own words, with
sources. It is not an authenticated NFL installation, a list of implemented
features or a set of NFL facts. Systems differ: the same word ("hitch", "punch",
"climb") means slightly different footwork in different installs, and the
chapter names the source wherever that matters.

Every claim carries one label:

| Label | Meaning |
| --- | --- |
| **[coached]** | What a named coach, clinic, coaching book or blog teaches. Verifies a teaching example, not how common it is. |
| **[sheet]** | The user's supplied HonestNFL scheme sheets (coached material, attribution not independently authenticated). |
| **[observed]** | Film, charting or tracking measurement. Repo rows were measured by our own operators on NFL tracking. |
| **[literature]** | Biomechanics or vision-science papers. |
| **[inference]** | Our reading or proposal. |

Sources are keyed `[S1]`... and listed at the end with URLs. Where a page could
not be reached, the list says so and nothing from it is quoted.

## 1. Under-center drops

### 1.1 The family and what each drop is for

- **[coached]** The drop is chosen by the route: "the deeper the pattern that
  the receiver runs, the deeper the quarterback's drop should be" (Thomas Bass,
  *Football Skills & Drills*, Human Kinetics excerpt, as returned by search
  [S3]; the page itself did not render on fetch). The same rule appears in the
  Football For Dummies article [S9]: routes 5–6 yd downfield get "no more than
  three steps", 10–12 yd routes five steps, posts and streaks seven.
- **[coached]** Bill Walsh's 49ers notes, as reposted by Smart Football [S1],
  tie step count *and step size* to the individual route:
  - three-step: "3 quick steps when throwing out", "3 big steps when throwing
    hitch". The three-step game "takes advantage of a bad defensive adjustment".
  - five-step: "Square out = 5 quick steps"; square-in "QB 5 BIG STEPS - HITCH
    and throw on time"; flanker post "5 BIG steps and Hitch"; curl "5 step
    timed". Five-step is "ball control, timed passes".
  - seven-step: "Bread and Butter BIG chunk offense". Go "7 step hitch and
    throw"; deep comeback "7 step and hitch step and throw to spot. Ball should
    be released as WR is planting foot."
  - the go changes to a five-step inside the 25 (the route is shorter).
  - The notes are a blog copy of what the poster calls "old notes"; the blogger's
    own comments are marked separately in the post.
- **[coached]** Alen Dumonjic (Bleacher Report, describing Walsh's own QB
  tutorial) [S2]: Walsh taught two five-step drops. In the "quick five" the ball
  comes out as the fifth step plants. In the "long five" five big steps are
  followed by a hitch that "moves the QB up through the interior of the
  pocket". Three- and five-step drops are called "rhythm" or "timing" drops.
- **[coached]** Mike Pina (vIQtory Sports, QB Velocity) [S5]: three-step for
  quick game, five-step for intermediate and deep developing routes (post,
  curl, corner, dig), seven-step for shot plays "usually with six-man or Max
  protection". Seven-step drops are rare below college.
- **[coached]** One-step drops under center exist for the fastest throws
  (screens, fades, quick hitches). SIS charts a "0/1 step" class [S12]. No
  coaching source found gives it separate footwork beyond a single step back
  and throw.

### 1.2 Footwork, step by step

- **[coached] The first step.** Every source makes the first step a depth step
  away from the line, taken with the throwing-side foot (right foot for a
  right-hander). Pina: "the first step creates separation"; the second is a
  crossover; the third a plant [S5]. vIQtory's quick-game article: "big,
  little, little" — a big first step for separation (useful "if the center gets
  knocked back"), a small crossover that gathers the weight, a small plant of
  the back foot [S6]. Justin Arth (A11 Performance): "the first step of any drop
  is going to be straight back", "it's the second step that determines your
  direction", and the steps open the hips toward the throw instead of blocking
  them off [S7].
- **[coached] Crossover, not backpedal, is the default for the depth steps.**
  Pina, Bass (as summarized [S3]) and Terry Shea's USA Football "quick step"
  drill (a lead step and a return crossover "on a real pass drop", ball "at
  chest level, in the carriage position", eyes up) all build the drop from
  crossovers [S5][S3][S18].
- **[coached] Backpedal as an exception.** The Football For Dummies article [S9]
  has the quarterback back up rather than turn when the formation and threat
  are on his blind side, "so he can keep watching the linebacker on that side",
  because "he can't afford to half-turn his back to that side". This was the
  only coaching source found that discusses backpedalling a quarterback's drop;
  we found no source comparing the speed or depth of the two techniques.
- **[coached] Long steps, then short steps.** Glazier Clinics' 5/7-step drill
  [S4]: in the five-step "the first two steps are deep and the last three are
  short and choppy"; in the seven-step "the first four are long and the last
  three are short and choppy". The fourth step lands at about 45 degrees, the
  throwing motion should start by the fifth, and in the seven-step "the fifth
  step is the balance step". Walsh's "big" against "quick" steps [S1] add
  another variable: the same step count can cover different depths in
  different times.
- **[coached] The plant or brake step.** Bass: the quarterback "extends the
  final step, unless he is on a wet or loose field, to stop his momentum away
  from the line of scrimmage" (Canadian version of the excerpt, via search
  [S3]). Others disagree about extending it: USA Football's rhythm drill (Keith
  Grabowski) warns that "young quarterbacks often overreach on the last step"
  [S10], and Shea's ground-up mechanics article [S19] says overstriding the
  *throwing* step locks the front leg. These are compatible if the last drop
  step is long enough to stop the body but not so long that the hips end up
  behind the feet. That reconciliation is **[inference]**.
- **[coached] The hitch.** After the plant, a short step or shuffle forward that
  resets the base under the hips and is used to time a later route or move to
  the next read. Arth: a "small hitch or slide step at the top of three-, five-
  or seven-step drops" helps generate power, especially for young throwers, but
  overstepping or bringing the feet too close together spoils it [S7].
  Walsh's long five uses the hitch to move *up* into the pocket [S2].

### 1.3 Depth per drop

| Drop | Coached landing depth | Source |
| --- | --- | --- |
| Three-step | Not given in yards by most sources; "three quick steps" or "three big steps" depending on route | [S1][S5] |
| Five-step | About 7 yd from the line | Bass [S3]; Dummies [S9] |
| Seven-step | About 9 yd from the line | Bass [S3] |
| Sprint/half-roll (for contrast) | 45-degree path to 5–6 yd, then level off | Chris Brown [S24] |
| Dropback pocket generally | QB "5-7 yards behind the center" | Chris Brown [S24] |

Measured depths are in section 7. **[observed]** They run deeper than the
coached seven yards for the five-step.

### 1.4 What the body does on the way back

- **[coached] Ball.** Two hands, chest high, "carriage position" [S18]. Two-hand
  security through drop and movement is also Gary Goff's and Emory Wilhite's
  point for pocket work [S22][S23].
- **[coached] Eyes.** The keepingthechainsmoving post, working from Walsh's
  quick game, keeps the eyes "centered down field" during the drop so the throw
  is not tipped off [S8]. Shea's drill: eyes up while the feet work [S18].
  The supplied sheets make the drop itself a reading period: on a three-level
  stretch "the corner will be read during the drop so as not to waste any
  valuable time on platform" (HNFL-135) **[sheet]**; on Madden/All Go "use your
  body language on your drop to control the Post Safety" (HNFL-001) **[sheet]**.
  Players read the coverage, especially the safeties, during the drop, before
  the plant.
- **[coached] Weight and base.** Over the balls of the feet in an athletic
  stance after the drop ("like a boxer", "cat on a hot tin roof"), feet about
  shoulder width, slight knee bend (Shea [S19]). Arth: feet under the body;
  feet far outside the frame cost throwing efficiency [S7].
- **[coached] Hips.** Open toward the intended side. Arth's example: on a throw
  to the left, stepping straight back turns the hips in and blocks the throw
  [S7]. Glazier: hips closed when throwing right, left shoulder low when
  throwing left [S4].
- **[observed] Shoulders.** The coaching sources say little about how square
  the shoulders are during the drop. Our tracking measurement does: the NFL
  thrower's chest is still about 61 degrees off the eventual target 1.0 s
  before release, 45 at 0.3 s and 19 at release (BDB 2025, n 2017;
  `docs/reviews/2026-11-13-qb-gather.md`). So the QB carries the ball side-on
  and squares late, during the hitch and windup. Tracking `o` is the chest, not
  the eyes.

## 2. Shotgun drops

### 2.1 Equivalence: the gun takes depth before the snap

- **[sheet]** HNFL-299 (dropback protection 20–21): "5/7 Step Drop (3/5 in
  Shotgun)". HNFL-001: "5-step Pocket Science (3-step from Gun/Pistol)".
  HNFL-132 and HNFL-109: "3-step footwork (5-step pocket science)".
- **[coached]** Pina: a three-step under center becomes a one-step in the gun,
  a five-step becomes a three-step, a seven-step becomes a five-step "to keep
  the same timing" [S5].
- **[observed]** PFF's charting bands use the same mapping: 4–6 yd = "the
  3-step game (one step from shotgun)", 7–8 yd = five-step (three from
  shotgun), 9+ yd = seven-step (five from shotgun) (Steve Palazzolo, 2014
  [S13]).
- **[inference]** So a gun drop is named by its *timing class*, not its step
  count. A "gun 3" should land at about the depth and beat of an under-center
  five-step. The engine's `DropType` names (`gun3`, `gun5`) should be read the
  same way.

### 2.2 What changes

- **[coached] Catching the snap first.** The vIQtory shotgun guide [S11]: a
  stance that lets the hips open at once (flat or barely staggered); for the
  one-step, "pivot on the front foot and step the back foot toward the target",
  summarized as "catch, open, throw". The QB still has to look the ball in,
  which costs part of the early read. We found no source that measures how long
  the catch takes.
- **[coached] Shorter, choppier steps.** Arth: under center the steps are
  bigger to escape the line; from the gun "you already have depth", so steps
  are "shorter, choppier, and kept under your body", needing only about three
  or four yards [S7].
- **[coached] Punch against hitch finish.** The vIQtory shotgun guide [S11] has
  two finishes for a gun three-step. On the "punch" (routes 5–7 yd) "the ball
  comes out as the back foot lands, with no pause". On the hitch finish (8+ yd,
  intermediate and vertical shots) the QB sinks and gathers on the back foot
  for one more beat. It warns that punching on a route still covering ground
  throws too early. vIQtory's quick-game article warns the opposite way: "a
  3 step hitch on every throw" kills quick-game timing [S6].
- **[sheet]** The supplied installs use the same vocabulary. Quick game: "GUN —
  Punch, plant to either/or: SLANT — FLAT, hang on back foot or bounce vs.
  press" (HNFL-102, HNFL-223). Two-minute: "GUN - 3, plant throw to LIGHTNING"
  (HNFL-103). Intermediate: "GUN — 3 and 1 hitch to either/or: CORNER — FLAT,
  reset to SHL, climb the pocket to the BASIC" (HNFL-236). Deeper: "GUN - 5 and 1
  hitch to DP CRS, reset to SHL, climb pocket to DAGGER" (HNFL-104, HNFL-246);
  "GUN 5-STEP DRIVE DROP WITH A HITCH, PLATFORM & OPEN" (HNFL-166). Double
  moves: "plant +2 FW" (HNFL-350, HNFL-351, HNFL-102). We read this as two more
  steps of footwork after the plant before the Bench-and-Go or Sluggo is thrown
  **[inference]**; the sheets do not define it.

### 2.3 "Gather" and "hop"

- **[coached]** The vIQtory guide rejects them on the one-step: "a gather step
  or a hop before opening the hips adds a half count that a 1 step drop can't
  afford" [S11]. The quick-game article says a hitch on the gun one-step sinks
  the QB into his back leg, dips the body and invites overstriding [S6].
- **[sheet]** The supplied quick-game call allows a "bounce vs. press" (HNFL-102):
  a deliberate re-gather to wait on a slant that is held up at the line. We read
  "hang on back foot" as holding the plant without hopping. Both are
  installed alternatives to throwing on the plant, not errors.
- **[coached]** USA Football (Grabowski) treats a gather and hitch forward
  forced by feet "out of position" at the top of the drop as an error, with a
  recovery he puts at about 0.9 s [S10]. That figure is the author's estimate,
  not a measurement.
- **[inference]** Two ideas share these names. A planned gather or bounce is a
  timing tool chosen for the route. A forced one is recovery from a bad last
  step. Film distinguishes them by whether the feet were under the hips at the
  plant.

## 3. Rhythm and timing

### 3.1 The drop is the clock

- **[coached]** Homer Smith's phrase "the rhythm feature of the passing game"
  is quoted by Grabowski [S10]: a QB should know when the ball must come out on
  each route, and the target is "a proper drop with the throw made on the last
  step". Shea: practice every route "using the proper drop and footwork" [S20].
  Walsh: "Ball should be released as WR is planting foot" [S1].
- **[sheet]** HNFL-140 (pure progression): "routes are designed for our feet and
  eyes to progress through the routes smoothly and in rhythm", and "the 'open
  to — reset to — finish to' process fits directly into the five progressions".
- **[coached]** The vIQtory shotgun guide puts the rhythm against the defender:
  the ball should arrive "before the cornerback's feet stop moving"; a late drop
  lets the corner plant and drive [S11].

### 3.2 Throw on the step or on the hitch

| Throw point | Typical use | Source |
| --- | --- | --- |
| On the plant of the last drop step | Quick game (slant, quick out, hitch); Walsh's "quick five"; gun "punch" | [S1][S2][S5][S11]; HNFL-103 "plant throw" |
| After one hitch | Intermediate (square-in, post, dig), five-step "long five", gun "3 and 1 hitch" | [S1][S2]; HNFL-101/104/236 |
| Hitch and throw to a spot | Seven-step go and deep comeback | [S1] |
| Climb, or plant plus two | Later reads in the progression; double moves | HNFL-104/246 "climb pocket to"; HNFL-350 "plant +2 FW" |

- **[coached] Disagreement on the three-step hitch.** Pina: on a three-step "the
  QB should never take a hitch step, because he is already close to the line"
  [S5]. The keepingthechainsmoving post, working from Walsh, gives the quick
  fade "three big steps, then hitch" [S8]. HNFL's gun "3 and 1 hitch" is a
  five-step-equivalent drop, so it does not contradict Pina. **[inference]**
  The quick fade is the case where a three-step route still has ground to
  cover when the feet land.

### 3.3 Hitches tied to the progression

- **[sheet]** The sheets bind each read to a footwork event. HNFL-043: "THROW
  '49er' OFF PLANT, HITCH TO 'CORNER', CLIMB TO 'BASIC'. RESET TO 'WIDE'."
  HNFL-001: "throw the Seam (Bender) routes off of '5 + Hitch' footwork, then
  hitch to the outside Go routes before resetting back down to the underneath
  outlet." HNFL-111: on three-level stretches "rip the high element once you
  come to balance."
- **[coached]** Walsh's long five moves the QB up with the hitch [S2]. A
  coaching forum post found in search makes read 1 a rhythm throw on the fifth
  step and read 2 after a hitch-up or gather step. That page could not be
  fetched (HTTP 406), so it is not relied on.
- **[inference] The synthesis.** A teaching sequence common to these sources:
  read 1 on the plant, read 2 on the first hitch, read 3 on a climb or second
  hitch, then the outlet ("finish to"). Each move resets the feet toward the new
  read, so feet and eyes progress together. The sheets show this is
  installation-specific: the same concept can be "3 and 1 hitch to either/or"
  in one install and "plant throw" in another.

### 3.4 Defenders read the plant too

- **[sheet]** HNFL-053, HNFL-015 and HNFL-072 (match Cover 2 against bunch):
  underneath defenders "will latch onto quick game by planting when the QB
  does." The QB's plant is an observable cue to the coverage, not only a private
  timing event.
- **[observed]** Repo: NFL defenders facing the QB close on the eventual catch
  point before release at +1.5 yd/s (zone) and +2.5 (man); ours +0.3 and +0.6
  (`docs/reviews/2026-11-13-qb-gather.md`, from `break_release.py`).

## 4. Pocket movement after the set

### 4.1 Movement is part of the play, not only an escape

- **[sheet]** "Climb the pocket to DAGGER" (HNFL-104/246) and "climb to 'BASIC'"
  (HNFL-043) are scripted parts of a clean-pocket progression.
- **[coached]** Walsh's long five moves the QB "up through the interior of the
  pocket" [S2].
- **[observed]** Repo: on clean pocket throws, between his deepest point and the
  motion the NFL QB moves at a median 1.0 yd/s (under 0.5 yd/s only 25% of the
  time), about 0.5 yd net and mostly up. Ours stood still in 61–78% of cases
  before QB_GATHER (`docs/reviews/2026-11-13-qb-pocket.md`, `qb-pocket.py`,
  BDB 2025 2022 weeks 1–9, n 9,140 dropbacks). NFL chest-facing and
  speed-toward-target rows begin about 0.6 s before release
  (`2026-11-13-qb-gather.md`).

### 4.2 Climbing, sliding and resetting

- **[coached] Edge pressure: climb.** "When edge pressure gets high, the answer
  is usually not to escape wide"; two quiet steps up and reset. The summary rule
  is "Edge high, climb. Interior push, slide." (The QB Stable blog, author not
  named [S21].) Pat Shurmur on Drew Lock: "If it requires stepping up and
  throwing, step up and throw. If it requires sliding and throwing, do that."
  [S17]
- **[coached] Interior pressure: slide.** QB Stable: slide one gap, "slide,
  replace, throw" [S21]. Tyler Allen (West Virginia QBs, AFCA 35 Under 35):
  "use the back foot to step during lateral movement"; a "flat down the line"
  escape for edge pressure while keeping rhythm and vision; a "depth escape"
  backward that resets the base [S14]. Gary Goff's flush drill pushes the QB in
  a direction and calls a target [S22].
- **[observed] The tracking agrees with the coached rule.** Repo, first DL/LB
  within 3 yd after the drop, ball held 0.5 s more, QB moves 1+ yd (NFL n 854,
  `2026-11-13-qb-pocket.md`):

  | Nearest body | Up | Lateral | Back |
  | --- | --- | --- | --- |
  | At the edge (wide of him, not ahead of his depth) | 59–67% | 29–36% | 4–5% |
  | In front or inside | 23% | 56–58% | 19–21% |

  It is not "directly away from the body" (20–22%) nor "the most open grass"
  (11–15%, chance 12%). A lateral slide goes to the side he later throws to 96%
  of the time, though that is measured after the fact. Before the decision the
  side his chest faced predicts the slide 66% of the time.
- **[coached] Reset, don't fade.** QB coach Steve Calhoun (via Zach Hicks, SI
  Colts): "Move and reset, not move and throw off of one foot"; off-platform
  throws are "maybe only seven or eight times a game". Tony Racioppi's reset
  drill: see pressure, move, reset (front foot sets the new platform, back
  foot swings into alignment), throw [S16].
- **[coached] Small and economical.** Emory Wilhite: movements "tight and
  efficient", the QB shouldn't "be dramatic"; on a step-up "bring his feet
  together" and keep the base from the back of the drop [S23]. Clarence
  Anderson (Hutchinson CC, AFCA): do not reach for the cone, keep tall hips,
  no shuffling, "stay underneath yourself", "controlled chaos" [S15]. Allen:
  "avoid heel clicks" [S14].
- **[coached] When to move.** Matt Waldman calls the timing of the move "the
  least-discussed and one of the most important facets of pocket presence".
  A good escape often waits until the rusher is "within 1-2 steps of contact",
  which commits the rusher to a path. Brady sometimes moved early, with the
  rusher "at least 4-6 steps away", into a secure pocket [S25]. These are
  observed film examples, not a rule.
- **"Bubble" movement.** We found no coaching source defining a "bubble" as a
  distinct pocket technique. The nearest idea is Gridiron Strategies' pocket as
  "something like a half moon" with four to five yards of cushion [S26].

### 4.3 Eyes and feel

- **[coached]** Walsh, *Building a Champion* (quoted as an epigraph [S27]): "The
  ability to peripherally feel the pass rush and see downfield is the very basis
  of NFL quarterbacking."
- **[coached]** Chris Haddad (vIQtory) builds pocket presence in phases. It
  starts with a slow collapsing-pocket drill whose only cue is "eyes up, feel
  the pocket", and he does not coach footwork in that phase. It moves through
  half-line and blitz pickup to team reps. He says a QB usually bails
  because he does not trust his protection, so walking him through the
  protection fixes it [S28].
- **[coached]** Allen and Anderson both keep the eyes downfield during movement
  and throw when a receiver uncovers [S14][S15].
- **[literature] Not found.** We found no peer-reviewed eye-tracking study of
  quarterbacks in a pocket. The visual-search literature returned was
  basketball and soccer. We did not use it for quarterback numbers.

### 4.4 Escaping

- **[coached]** Donnie Kirkpatrick (former ECU OC, Glazier) [S29]: a bail drill
  of stepping up and escaping on a hand signal, dipping under or spinning out. Left-handed QBs
  work their harder side, escaping right, 2:1. On a scramble they run toward
  the intended target rather than east–west, carry the ball in two hands, and
  practise "bail and pull up" to stop momentum before throwing. Scramble rules
  for receivers: the deepest works the deep third, intermediates "the 5-0 yard
  area" as the page renders it (probably 5–10 yd; our reading), the backside
  mirrors the QB.
- **[coached]** Shurmur: when there is no protection, "eat it" or throw it away
  rather than fade [S17].

### 4.5 Drills (as described; most are partial)

| Drill | Teaches | Source |
| --- | --- | --- |
| Collapsing pocket | Eyes up as space shrinks | Haddad [S28] |
| Predetermined then reactive movement, one side then either side | Step up / back / away with base kept, ball swiped at | Wilhite [S23] |
| Flat down the line; depth escape | Lateral and backward reset with vision | Allen [S14] |
| Base movement bag; reactive wave | Moving under control, throwing on a clap or a receiver uncovering | Anderson [S15] |
| Bail drill; bail and pull up | Escape direction, two-hand carry, stopping to throw | Kirkpatrick [S29] |
| Flush drill | Thrown off the spot, throw to a called target | Goff [S22] |
| Reset drill; tennis-ball feet drill | Reset the platform after moving | Racioppi, Calhoun [S16] |
| Lava (IMG, Jeff Blake) | Small-pocket footwork | [S30]; contents behind a paywall |

"Ladder" and "chair" pocket drills appear in search snippets (a ladder-and-cone
course to navigate with eyes downfield), but we could not reach a page that
described them. They are not described here.

## 5. What goes wrong

- **Drifting / fading.** **[coached]** Shurmur on Lock's "fadeaway" drift,
  attributed to a basketball habit; fix by trusting protection and stepping up
  or sliding [S17]. Calhoun and Hicks: Wentz "fading away", throwing off the
  back foot [S16]. Gridiron Strategies: linemen set to the "spot" where a
  rusher's path meets the QB's launch point, and "must know the launch point"
  [S26]. **[inference]** A QB who drifts behind his set point therefore moves
  out of the geometry the protection was built around. No source found measured
  this.
- **Bailing.** **[coached]** Haddad: usually distrust of the protection, not
  toughness [S28]. Steve Young's early breaking "out of the pocket too early"
  is a commonly told example (search snippet only; not fetched).
- **Stepping into pressure.** **[coached]** The QB Stable rule (climb on edge
  pressure, slide on interior push) exists because climbing into an interior
  push meets the rusher [S21]. **[observed]** NFL QBs climb only 23% of the
  time when the nearest body is in front or inside (repo table, 4.2).
- **False steps and skipped steps.** **[coached]** vIQtory: skipping a step in
  the three-step means the ball "won't be timed correctly" [S6]. A
  hitch on the one-step costs a half count [S11].
- **Too deep or too long a drop.** **[coached]** Dummies: an unnecessarily
  long drop gives the defense time to recover [S9]. A deeper drop also asks the
  line to block longer: NFL.com's line series says "the deeper the quarterback
  drop, the deeper the lineman's drop" [S31]. **[observed]** SIS: pressure rates
  rise with drop depth (under center 15% at 0/1-step to 43% at seven-step)
  [S12]. Longer-developing routes are also part of that rise.
- **Losing the base.** **[coached]** Overreaching the last drop step
  (Grabowski [S10]); overstriding the throwing step locks the front leg and
  sends balls low and short (Shea [S19]); feet too wide or too close (Arth
  [S7]); heel clicks (Allen [S14]). Kurt Warner on Bryce Young (X, January
  2026): "until he cleans up his feet in the pocket & learns to set strong &
  ready at top of drop..." [S32].
- **Poor timing with the routes.** **[coached]** Punching on a route that
  still has ground to cover (too early) [S11]; a universal three-step hitch
  (too late) [S6]; a late drop that lets the corner plant and drive [S11].
- **Moving off read 1 too soon / too late.** Emory Wilhite's Burrow breakdown
  credits "the timing of the drop" and "having the eyes in the right place"
  against all-out pressure, with "not a sliver of rush or panic" [S33].
- **Batted balls (thin).** **[coached/observed]** The sources we could reach say
  little. Search summaries attribute batted passes to a low release point more
  than height (an On3 article on Drew Pyne quoting Tommy Rees, "Everybody is
  looking for lanes"), and say bending at the waist lowers the release (a Stack
  tip). A CMU student study associated taller QBs with fewer batted passes. We
  could not fetch any of these three pages (403, empty, 503), so we do not rely
  on them. **[observed]** Matt Waldman on Drew Brees: "altering the path of the
  drop to anticipate the open throwing lane" [S34]. That is a lane found with
  the feet, not the arm slot. We found no coaching source on changing arm slot
  to avoid batted balls. The SI cover story records trainers now spending
  "about a third of practice" on off-platform and nontraditional arm slots
  (Joshua Harris) [S35].
- **Experience.** **[coached/observed]** Rookie-level errors recur across the
  sources: overreaching the last step (Grabowski), dropping the eyes to the
  rush, feeling the rush too early and abandoning the progression (scouting
  snippets, not fetched), drifting (Shurmur), and an unset top of the drop
  (Warner). Veterans are described by economy: small resets, late but
  well-timed moves (Waldman on Brady), and resets under a sped-up process
  (Rivers in [S16]). **[observed]** SIS footwork charting (2018–19, Alex
  Vigderman [S36]): planted throws were catchable 80%, shuffling 83%, moving
  74%, hit as he threw 59%. In a clean pocket, moving throws were catchable 85%,
  so the off-platform throw itself is not always the problem. Mahomes was
  off-platform on 21% of clean-pocket attempts at 82% catchable, while Dalton
  was planted on 96%.

## 6. Play action and moving launch points (contrast only)

- **[coached]** Sprint-out and half-roll (Chris Brown, Smart Football, 2005)
  [S24]: the QB moves at about 45 degrees to 5–6 yd, then levels off, and may
  keep running parallel or stop, step up and throw. The play is "designed as a
  full-sprint out" but QBs usually set up after a half roll. Most throws go
  outside and are read outside-in. It is "less precisely calibrated" than the
  three- and five-step. Protection depends on the QB finding space.
- **[coached]** High Speed Spread blog: "gain depth THEN sprint out"; a poor
  drop gives a bad throwing angle. Shoulders square first to the flat, then the
  curl; follow through two or three steps [S37]. CoachTube's sprint-out
  article (Drinkall) sets the feet to throw rather than throwing on the run,
  especially moving opposite the throwing arm [S38].
- **[observed]** Repo, play action from tracking (`2026-11-12-pa-drop.md`, BDB
  2025 weeks 1–3): gun PA is a short mesh and a shallow set (deepest 6.0 yd at
  2.1 s, pass at 2.3 s). Under-center PA is the fake plus a full drop (depth
  1.9 / 3.3 / 5.3 / 7.1 yd at 0.5 / 1.0 / 1.5 / 2.0 s; deepest 8.1 yd at 2.6 s;
  pass 3.2 s).
- **[coached]** The Draft Network notes that an under-center QB turns his back
  to the defense on play action, losing time to read the shell (via search;
  not fetched).
- The boot, naked and gap-fake paths are in
  [play-action protections](play-action-protections.md). The contrast with a
  straight drop: the QB's launch point is on the move. The protection sets to
  a moving spot or not at all. Throws to the side he moves toward are easier and
  throws back are harder.

## 7. Measured numbers

| Quantity | Value | Context | Source |
| --- | --- | --- | --- |
| Coached five-/seven-step depth | ~7 yd / ~9 yd from the LOS | Coaching text | Bass [S3] |
| Drop band → step mapping | 4–6 yd = 3-step (1 gun); 7–8 = 5 (3 gun); 9+ = 7 (5 gun) | PFF charting, 2013 season | [S13] |
| Throw depth by drop, under center | 3.2 / 8.3 / 11.5 / 13.3 yd (0-1 / 3 / 5 / 7) | SIS 2018–19 | [S12] |
| Throw depth by drop, shotgun | 4.9 / 9.4 / 12.3 / 15.1 yd | SIS 2018–19 | [S12] |
| Pressure rate by drop, under center | 15 / 30 / 40 / 43% | SIS 2018–19 (SIS definition) | [S12] |
| Pressure rate by drop, shotgun | 21 / 38 / 46 / 45% | SIS 2018–19 | [S12] |
| League time to throw | 2.70 (2020) → 2.79 (2023) → 2.86 s (2025) | PFF | [S39] |
| Single QB, initial movement to release | stationary 0.82 s; one-step 1.29–1.35; three-step under center 2.03; three-step gun 2.25; five-step 2.61 | One D-I QB; drill throws; ball speed unchanged (48–51 mph); rear-leg peak GRF 1.34–1.51 kN | Cabarkapa, Fry & Mosier, *The Sport Journal*, 2020 [S40] |
| NFL five-step class set | gun: 28% of drops set 3.5–5 yd behind the snap spot, ending at 2.2 s (IQR 2.0–2.4), ball out 3.0 s; under center: 46% set 6.5–8.5 yd, ending at 2.4 s (2.3–2.6), ball out 3.5 s | Repo, BDB 2025, finished non-designed drops. Depth relative to the QB's snap position as the code comment describes it | `src/sim/called-drop.ts`, `scripts/diag/escape/drop-time.py` |
| NFL non-PA dropback, all classes | gun: deepest 7.6 yd at 2.2 s, pass 2.5 s; under center: 7.1 yd at 2.1 s, pass 2.3 s | Repo, BDB 2025 weeks 1–3, a different operator | `docs/reviews/2026-11-12-pa-drop.md` |
| Post-set movement | median 1.0 yd/s, ~0.5 yd net, mostly up | Repo, clean throws | `docs/reviews/2026-11-13-qb-pocket.md` |
| Chest to target | 61 / 58 / 45 / 19 deg at −1.0 / −0.5 / −0.3 s / release | Repo, BDB 2025, n 2017 | `docs/reviews/2026-11-13-qb-gather.md` |
| Speed toward target, p75 | +0.37 / +0.52 / +0.67 yd/s at −0.6 / −0.5 / −0.4 s | same | same |

Cautions **[inference]**:

- The two repo drop operators disagree on time to pass by about half a second.
  They select different plays (one drop class against all classes), so the gap
  is not a contradiction. Use one operator for any comparison.
- Coached depths are from the line of scrimmage and measured depths from the
  snap position. Under center that is about one yard different.
- The Sport Journal times are one athlete throwing drill passes from first
  movement. They show the ordering of drop types, not NFL game times.

## 8. For the engine (proposed tests, not facts)

These are observable quantities a simulation could reproduce and test with the
same measurement operator on tracking and sim exports. They are our proposals.
Each one tests what the body achieved against what the coaching asks for. None
of them sets an outcome.

1. **Timing class equivalence.** For each called drop, compare the time from
   snap to plant and the plant depth between under center and gun, by class
   (under-center 3 ≈ gun 1, 5 ≈ 3, 7 ≈ 5). Test: the gun plant comes no later
   than the under-center plant of the same class.
2. **Step structure.** Count foot-strike-like speed minima (or the gait
   model's steps, if any) between snap and plant. Long early steps and short
   late ones should show as a falling stride length with speed peaking
   mid-drop and dropping into the plant (the Glazier description).
3. **Speed profile per drop.** Depth against time at 0.5 s intervals (the PA
   operator already does this under center: 1.9 / 3.3 / 5.3 / 7.1 yd). Test:
   the sim's curve lies within the NFL band by drop class.
4. **Carriage orientation.** Chest-to-travel angle during the drop (side-on
   crossover against backpedal), and chest-to-target at −1.0 / −0.5 / −0.3 s /
   release. The NFL row is 61 / 58 / 45 / 19 deg. Test: squaring happens late,
   through the hitch and windup.
5. **Throw start on a footwork event.** Classify each release by the
   footwork event it follows: on the plant, after one hitch, after a climb or
   reset, or on the move. Test: the class distribution by drop and route
   family. Quick game should be mostly on the plant and five-step mostly
   plant-or-hitch.
6. **Read tied to footwork.** For installed progressions, record which footwork
   event his eyes reach each read on (plant, hitch 1, climb). Test: the eyes
   reach read 2 on or after hitch 1, not before the plant.
7. **Post-set movement.** Speed and net displacement between deepest point and
   motion on clean throws: NFL median 1.0 yd/s, about 0.5 yd, mostly up.
8. **Pressure-direction response.** The repo's edge/front table (4.2): up
   against an edge body about 60%, lateral against a front or inside body
   about 57%. Test that it emerges from his own felt picture, with the same
   direction held until a perceived change clears a margin (CLAUDE.md's
   commit-to-a-decision rule and `test/dither-budget.test.ts`).
9. **Reset before the throw after a move.** After a 1+ yd move, the time from
   stop to release and whether the release follows a support reset. Test: the
   share of releases off one foot or fading back falls with experience and
   rises with rusher proximity.
10. **Move timing against rusher distance.** The rusher's distance when a move
    starts (Waldman's 1–2 steps from contact against 4–6 steps). Test: the
    distribution, by experience rating.
11. **Drift.** Net depth gained after the set, by pressure. Test: a drifting QB
    loses throw accuracy through his platform, and the line's set point stays
    where the call put it. Neither result may be scripted.
12. **Defenders read the plant.** Underneath defenders' break onset relative to
    the QB's plant and hitch (HNFL "planting when the QB does"). Test: the
    break follows the observed plant, not the release, and not his private
    target.
13. **Ordering of total times.** Stationary < one-step < three-step < five-step
    to release, from the one-athlete case study, as a sanity check of the
    footwork model only.

What not to build from this chapter **[inference]**: a fixed timer per drop
that releases the ball, or a rule that bans a fade, hop or off-platform throw.
Model the footwork the coaching asks for and the physical cost of doing it
badly, and let the release and its accuracy come from the platform he
actually reaches.

## Sources

Retrieved 2026-11-15 unless stated. "Not reached" means nothing from the page is
relied on.

- [S1] Bill Walsh, 49ers dropback notes, reposted by Chris Brown, *Smart Football*,
  2009. https://smartfootball.blogspot.com/2009/04/bill-walshs-49ers-notes-on-dropback.html
- [S2] Alen Dumonjic, "Football 101: Breaking Down the West Coast Offense",
  Bleacher Report. https://bleacherreport.com/articles/1087386-football-101-breaking-down-the-west-coast-offense
- [S3] Thomas Bass, *Football Skills & Drills* (2nd ed.), Human Kinetics excerpt
  "Five- and Seven-Step Drops". https://us.humankinetics.com/blogs/excerpt/five-and-seven-step-drops
  — page did not render on fetch; content as returned by search only.
- [S4] Glazier Clinics, "Quarterback 5 and 7 Step Drop Drill" (2021, no coach named).
  https://www.glazierclinics.com/free-football-drills/quarterback-5-and-7-step-drop-drill
- [S5] Mike Pina (QB Velocity), "How To Coach a 3 Step Drop & 5 Step Drop", vIQtory Sports.
  https://www.viqtorysports.com/3-5-7-step-drops/
- [S6] vIQtory Sports, "How To Coach Quick Game Footwork". https://www.viqtorysports.com/how-to-coach-quick-game-footwork/
- [S7] Justin Arth, "Quarterbacks, Throwing Starts with Your Feet", A11 Performance.
  https://a11.squarespace.com/a11-performance-blogs/1ch269t25ch31h6am4akk9hfe8vh0l
- [S8] "Three Step Drop", *Keeping the Chains Moving* (blog, 2011, drawing on Walsh).
  https://keepingthechainsmoving.blogspot.com/2011/12/three-step-drop.html
- [S9] "The Quarterback's Stance, Drop Back and Hand Off", Dummies (Football For
  Dummies series; no author shown). https://www.dummies.com/article/home-auto-hobbies/sports-recreation/fantasy-sports/fantasy-football/the-quarterbacks-stance-drop-back-and-hand-off-186755/
- [S10] USA Football blog, "Use this rhythm drop drill..." (credited Ken Taylor; bio is
  Keith Grabowski, Oberlin). https://blogs.usafootball.com/blog/907/use-this-rhythm-drop-drill-to-promote-proper-footwork-and-timing-in-the-passing-game
- [S11] vIQtory Sports, "Quarterback Drop Step: 1 And 3 Step Drops From Shotgun".
  https://www.viqtorysports.com/?p=34609
- [S12] Alex Vigderman (Sports Info Solutions), "How Drop Depth Affects Our View of
  Quarterbacks", 2019. https://www.sharpfootballanalysis.com/analysis/how-drop-depth-affects-our-view-of-quarterbacks
- [S13] Steve Palazzolo, "QBs in Focus: Drop-back Depth", PFF, 2014.
  https://www.pff.com/news/qbs-in-focus-drop-back-depth
- [S14] AFCA, "35 Under 35 Presents | Tyler Allen | QB Movement Drills".
  https://www.afca.com/35-under-35-presents-tyler-allen-qb-movement-drills/
- [S15] AFCA, "Mastering Quarterback Readiness with Reactive Pocket Movement Drills"
  (Clarence Anderson, Hutchinson CC), 2026. https://www.afca.com/?p=17449
- [S16] Zach Hicks, "The Mechanics of Carson Wentz: Resetting When Off-Platform", SI
  (Steve Calhoun, Tony Racioppi). https://www.si.com/nfl/colts/film/mechanics-of-carson-wentz-resetting-off-platform
- [S17] Chad Jensen, "Shurmur attributes Drew Lock's ill-advised tendency to drift
  back in pocket...", SI, 2020. https://www.si.com/nfl/broncos/onsi/news/shurmur-attributes-drew-locks-ill-advised-tendency-to-drift-back-in-pocket-to-basketball-background
- [S18] Terry Shea, "Offseason QB workouts: Quick step drill...", USA Football.
  https://blogs.usafootball.com/blog/1369/offseason-qb-workouts-quick-step-drill-improves-footwork-during-the-drop-back
- [S19] USA Football, "Build passing mechanics from the ground up" (Shea series).
  https://blogs.usafootball.com/blog/1118/build-passing-mechanics-from-the-ground-up
- [S20] Terry Shea, "Developing a quarterback skill that is tough to defend", USA
  Football (search summary). https://blogs.usafootball.com/blog/655/developing-a-quarterback-skill-that-is-tough-to-defend
- [S21] The QB Stable, "Pocket Presence Drills: 7 Ways Quarterbacks Can Stay Clean"
  (author not named). https://theqbstable.com/blog/pocket-presence-drills-7-ways-quarterbacks-stay-clean
- [S22] Gary Goff (McNeese State), Glazier Clinics, "QB Development: 3 Pocket Presence
  & Reaction Drills". https://www.glazierclinics.com/football-coach-resources/qb-development-3-pocket-presence-reaction-drills-that-get-results
- [S23] Emory Wilhite, "QB Drills to Practice Pocket Awareness & Movement".
  https://emorywilhite.substack.com/p/qb-drills-to-practice-pocket-awareness
- [S24] Chris Brown, "Sprint out and half roll passing", *Smart Football*, 2005.
  https://smartfootball.blogspot.com/2005/08/sprint-out-and-half-roll-passing.html
- [S25] Matt Waldman, "RSP Boiler Room No. 119: An Underrated Facet of Pocket Presence", 2017.
  https://mattwaldmanrsp.com/2017/11/29/rsp-boiler-room-no-119-an-underrated-facet-of-pocket-presence/amp/
- [S26] Gridiron Strategies, "The five keys to drop back pass protection" (author not
  shown). https://gridironstrategies.com/article/the-five-keys-to-drop-back-pass-protection
- [S27] Bill Walsh, *Building a Champion*, quoted as epigraph in "The Quarterbacks",
  Ursa Major Substack. https://ursamajor.substack.com/p/the-quarterbacks
- [S28] Chris Haddad, "5 Steps To Build Quarterback Pocket Presence", vIQtory Sports.
  https://www.viqtorysports.com/?p=34615
- [S29] Donnie Kirkpatrick, Glazier Clinics, "Perfect Your QB's Escape Technique: 3
  Bail Drills". https://www.glazierclinics.com/football-coach-resources/perfect-your-qbs-escape-technique-3-bail-drills-that-improve-accuracy
- [S30] IMG Academy (Jeff Blake), "Lava" drill page; video behind membership.
  https://www.imgacademy.com/resources/videos/football-drill-for-quarterbacks-lava
- [S31] NFL.com, "More than just a pocket: Inside look at NFL pass protections"
  (Behind the O-Line; undated). https://www.nfl.com/news/more-than-just-a-pocket-inside-look-at-nfl-pass-protections-0ap3000000796282
- [S32] Larry Brown Sports on Kurt Warner's post about Bryce Young, January 2026.
  https://larrybrownsports.com/football/kurt-warner-shares-doubts-bryce-young/734716
- [S33] Emory Wilhite, "Not a Sliver of Panic" (Burrow, 2022). https://emorywilhite.substack.com/p/not-a-sliver-of-panic
- [S34] Matt Waldman, "RSP NFL Lens: QB Drew Brees and Smart Footwork", 2018.
  https://mattwaldmanrsp.com/2018/07/05/matt-waldmans-rsp-nfl-lens-qb-drew-brees-and-smart-footwork/
- [S35] Conor Orr, "In the Throws of Change", SI, 2021. https://www.si.com/nfl/2021/11/16/cover-story-how-the-qb-evolution-sparked-a-coaching-revolution
- [S36] Alex Vigderman (SIS), "How does footwork impact quarterback performance?", 2019.
  https://www.sharpfootballanalysis.com/analysis/how-does-footwork-impact-quarterback-performance/amp/
- [S37] High Speed Spread Football, "Sprint Out Part Two: QB", 2011.
  https://highspeedspreadfootball.blogspot.com/2011/08/sprint-out-part-two-qb.html
- [S38] CoachTube, "Sprint-Out Passing: Move the Pocket for Success".
  https://coachtube.com/football/articles/sprint-out-passing-move-the-pocket-for-success
- [S39] Daire Carragher, "NFL quarterbacks are holding the ball longer than ever", PFF, 2026.
  https://www.pff.com/news/nfl-quarterbacks-are-holding-the-ball-longer-than-ever-the-trends-behind-time-to-throw/
- [S40] Dimitrije Cabarkapa, Andrew C. Fry, Eric M. Mosier, "Kinetics and Kinematics of
  Commonly Used Quarterback Throwing Approaches: A Case Study", *The Sport Journal*, 2020.
  https://thesportjournal.org/article/kinetics-and-kinematics-of-commonly-used-quarterback-throwing-approaches-a-case-study/

**Supplied sheets cited:** HNFL-001, -015, -043, -053, -072, -101, -102, -103, -104,
-109, -111, -132, -135, -140, -166, -223, -236, -246, -299, -350, -351 under
[`docs/references/honest-nfl/text/`](../references/honest-nfl/README.md). OCR
text; check the original image for exact wording.

**Not reached or not usable:** ESPN "Five new quarterback drills to reimagine the
NFL combine" (empty on fetch); On3 Drew Pyne batted passes (403); CMU batted-pass
slides (content truncated); Stack three-step article (503); Dick's Sporting Goods
pro tips (403); JCFB forum rhythm-throw thread (406); core.ac.uk QB biomechanics
thesis (403); the Human Kinetics excerpt page body; ITP hitch-step glossary
(verification wall); Phil Longo's CoachTube Air Raid lessons and Glazier Drive
videos (paywalled). No Throw Deep Publishing material was found by search.
