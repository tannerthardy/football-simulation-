# Screens: how they work and what to test

Compiled 2026-11-03. Purpose: give a coach's view of how screens work, written
concretely enough to become controller rules and measurable checks. It does not
collect playbook trivia.

## Source-quality caveat (read first)

- In this session, direct page fetches were **blocked** for xandolabs.com,
  coachesinsider.com, olineskills.com and the blogspot clinic notes (DNS was not
  allowed). Claims credited to those sites come from search-engine excerpts of
  their pages, not from full-text reading. To verify them, allow those hosts and
  re-read the pages.
- Many coaching claims are one program's rules. Assignments differ by scheme.
  Treat them as *mechanisms to make possible*, not constants to hard-code.
- **Unsourced** marks a claim (often from the request's own prompt list or common
  coaching lore) that I could not find in any retrieved source.
- Section 7 has original numbers computed from the repo's local BDB 2025 data
  (2022 NFL, weeks 1-9). That evidence is first-hand.

---

## 0. The shared screen mechanism (all families)

The defense is invited to commit to one picture (a pass rush, or deep-coverage
landmarks). The ball then goes to a spot that commitment has vacated, and blockers
arrive there at the same time as the ball.

1. **Sell:** linemen pass-set normally and let rushers run upfield past the
   screen's spot ([Wikipedia: Screen pass](https://en.wikipedia.org/wiki/Screen_pass)).
2. **Release:** linemen release after a count and get out in front as lead
   blockers ([Wikipedia](https://en.wikipedia.org/wiki/Screen_pass)).
3. **Arrival timing:** the play only works if blockers, ball and carrier converge
   together. Releasing too early wrecks the timing
   ([X&O Labs Screen Game Special Report, Case 2](https://www.xandolabs.com/?p=16304)).
   Blocking too early also wastes the blocks
   ([Coaches Insider, detachment screens](https://coachesinsider.com/football/detachment-screens-article/)).
4. **When to use it:** screens are usually deployed against aggressive defenses
   that rush the passer ([Wikipedia](https://en.wikipedia.org/wiki/Screen_pass)).

What this means for the sim: a screen's success should come from **relative
arrival times** and **defender commitment states**, both emerging from physics
and perception. A scripted "screen works" flag should play no part.

---

## 1. RB slow / slip screen (and middle screen)

### OL pass-set duration ("sell the pass")
- The offensive line "sets up in pass protection for usually one to two seconds,
  then releases" ([Wikipedia](https://en.wikipedia.org/wiki/Screen_pass)).
- X&O Labs reports that "a two-count release from the line of scrimmage continues
  to be the timing of choice." Some coaches are moving away from it because
  "individuals do not count in the same rhythm"
  ([X&O Labs Case 2](https://www.xandolabs.com/?p=16304)). *Sim implication:* a
  count-based release gives each lineman his own timing spread. An alternative
  trigger is a cue, such as "the rusher has passed my hip" or a QB/RB event.
- Coaches Insider's delay-screen breakdown gives the playside guard, center and
  backside guard each a **two-second set** before they release or turn
  ([Coaches Insider](https://coachesinsider.com/football/detachment-screens-article/)).
- Some sources say a slow RB screen takes **3-4 s** from snap until the RB has
  the ball (excerpt credited to a clinic write-up, via
  [Coaches Insider](https://coachesinsider.com/football/detachment-screens-article/)
  search excerpt; low confidence). Compare the BDB numbers in section 7: RB screen
  time-to-throw has a median of 2.20 s and a p90 of 2.90 s.
- The phrase "1-thousand-2" as a count: **unsourced**. The "two-count" concept is
  sourced, as above.

### Release technique
- Southeastern Louisiana (Allen Rudolph) teaches **set, punch, extend, release**.
  "If the defensive line stops and peeks, the offensive line will redirect and
  take it" ([clinic notes](https://ytttr.blogspot.com/2010/06/screen-game-allen-rudolph-southeastern.html),
  via search excerpt). This is a *conditional* rule: if the rusher stops rushing,
  the lineman stays on him.
- The Chiefs (OL coach Andy Heck) teach "set, extend and then release". The
  release comes only after a normal set and arm extension
  ([FirstDown PlayBook / Bullock film room excerpts](https://markbullock.substack.com/p/how-eric-bieniemy-can-improve-the)).
- Dartmouth (Keith Clark) teaches a **"yank"**: stab-and-grab with the hand on
  the side the defender rushes. When the count expires, "violently pull the
  defender down past your hip," then release on the screen path
  ([X&O Labs Case 2](https://www.xandolabs.com/?p=16304), excerpt). *Sim:* this is
  a real physical action, a lateral/downward impulse that speeds the rusher past
  and clears the lineman's lane. It belongs in the contact model, not a teleport.
- Brian Westbrook (Eagles All-22): linemen "strike their man and almost act like
  as if they're beating them"
  ([Philly Mag, All-22: The Art of the Screen Play](https://www.phillymag.com/2013/10/17/art-screen-play/)).
- Departing linemen **must not cross a defensive lineman's face** on the way out
  ([search excerpt, screen coaching material](https://firstdown.playbooktech.com/coaches-community/screens-are-about-your-offensive-line)).
- Arizona's approach (reported): contact and drive. If the defender does
  something other than rush, retreat to the LOS to avoid an ineligible-downfield
  penalty (same excerpt set; source page not individually confirmed).

### Which linemen release
- One staff: on back screens **only the interior linemen release**, while on
  receiver screens all five release (search excerpt; page not individually
  confirmed: [Coaches Insider, three types of screen passes](https://coachesinsider.com/football/three-effective-types-of-screen-passes-article/)).
- The Coaches Insider delay example releases the PSG, C and BSG
  ([Coaches Insider](https://coachesinsider.com/football/detachment-screens-article/)).
- The common NFL pattern of "playside G/C/T release, backside stay in": **partly
  unsourced** as a universal rule. It varies by scheme.
- A youth program's rule: the backside guard is the **"rat killer"**. He blocks any
  DL who reads the screen and peels back
  ([Youth Football Online, easy rules for RB screen](https://youthfootballonline.com/easy-rules-for-the-running-back-screen)).

### Assignment rules for released linemen
- **"Out, Up, In"** (X&O Labs, Brett Dudley): all five line positions share the
  same steps, path and rules. The first releaser looks **out** for an unoccupied
  defender (the force/corner), the next looks **up** the alley, and "the 3rd OL to
  release looks back **in** for anyone chasing the screen down from inside"
  ([X&O Labs ?p=7079](https://www.xandolabs.com/?p=7079), excerpt).
- Another X&O Labs scheme (tunnel/jailbreak context): "the guard blocks out, the
  center blocks up, and the backside guard and tackle block in"
  ([X&O Labs ?p=7079 / ?p=15739](https://www.xandolabs.com/?p=15739), excerpt).
- The center works to get leverage on the linebacker, but only after clearing the
  DL (search excerpt on middle screens; page not confirmed).
- "First wrong color", "block the most dangerous man" (for OL) and "don't block
  anyone going away": **unsourced** for OL screen rules. "Most dangerous man"
  does appear as a **WR** rule ("#1 MDM") in perimeter-screen material
  ([Youth Football Online](https://youthfootballonline.com/protecting-the-bubble-screen-constraint-plays-to-make-sure-your-receivers-can-block/)).
- Penalty-avoidance cues: "No blocks behind the play" and "No blocks in the back"
  (search excerpt, coaching article). *Sim implication:* a defender moving away
  from the ball, or one already behind the carrier, is a low-priority target.
  This matches "don't block anyone going away" in spirit.

### RB technique
- Line up behind the playside guard and "get lost in the line". Snap the head
  around for the ball **when the guard leaves**, and go slow to the block so you
  aren't there too early (clinic excerpt via
  [Coaches Insider](https://coachesinsider.com/football/detachment-screens-article/)).
  *Sim:* the RB's cue is the guard's release, an observable event, not a timer.
- The back "delays in the line and pops out." He catches about 2-3 yards behind
  the LOS and "must be behind the line of scrimmage when he catches"
  ([Youth Football Online, RB slip screen](https://youthfootballonline.com/?p=25829)).
- Mike Tomlin: timing depends on "how long [the back] fakes or holds his potential
  block". "If there's a defensive line stunt, that can throw off the timing. If
  there's a blitz and the back gets hung up in that, that can throw off the
  timing" ([Steelers.com](https://steelers.com/news/hearing-from-coach-mike-tomlin-3126869)).
  *Sim:* blitz pickup duty competes with the screen. The controller must be able
  to stay in and block a free blitzer, which kills the screen.

### QB drift / depth / timing
- The QB takes a deep drop, then turns, plants and "dump[s] the pass over the
  rushing D-linemen"
  ([Youth Football Online](https://youthfootballonline.com/?p=25829)).
- On TE/RB slip screens off play-action, "your quarterback is going to set up
  somewhere behind the Tight End area"
  ([FirstDown PlayBook: Lions Understand How To Protect Screens](https://firstdown.playbooktech.com/coaches-community/lions-understand-how-to-protect-screens)).
- A specific QB depth (for example 7 yd): **unsourced**. BDB 2025 gives a median
  `dropbackDistance` of **3.3 yd** on RB screens and **0.8 yd** on WR screens
  (section 7). Note that this is the drop from the snap point, not depth behind
  the LOS.

### Catch point
- Behind the LOS. BDB: RB screens have median air yards of **-4** (p10 -6, p90 -1).

### Middle screen
- The middle screen is like other screens except the linemen stay in the middle
  instead of releasing to the sides; the C and G work a lane up the middle
  ([Wikipedia](https://en.wikipedia.org/wiki/Screen_pass);
  [Cardinals film room](https://www.azcardinals.com/news/cardinals-film-room-middle-screen-success)).

---

## 2. TE screen / TE delay screen

- Everyone pass-blocks for two counts, then releases. "The end man engages and
  works upfield." The second man runs down the line until the end man clears,
  then looks to kick out
  ([Gridiron Strategies: TE screen moves the chains](https://gridironstrategies.com/article/tight-end-screen-moves-the-chains)).
- Inside-zone-action TE screen: the TE first blocks the end or SAM, then
  releases. After the fake, the QB "drift[s] laterally and for depth to find a
  throwing lane to the TE"
  ([FirstDown PlayBook, screens/TE](https://firstdown.playbooktech.com/coaches-community/screens-tight-ends-fullbacks-dominate-nfl-tv)).
- The Lions used a second TE in motion to protect the QB's set-up spot behind
  the TE area ([FirstDown PlayBook](https://firstdown.playbooktech.com/coaches-community/lions-understand-how-to-protect-screens)).
- The specific TE delay technique (how long he blocks, and where he settles):
  **unsourced** beyond the "block, then release" pattern above.
- BDB: TE screens are **53% play-action** (versus 21% for RB and 30% for WR),
  with median TTT **2.34 s** and median air yards **-3**. They were the only
  positive-EPA screen family in the sample (+0.175 EPA/att, n=140). Small sample.

---

## 3. WR bubble / now (quick) / tunnel / jailbreak

### Bubble
- **#2 catches, #1 blocks.** The outside receiver's block is what lets the inside
  receiver gain yards. #1 stalk-blocks: "we insist that they make the defender go
  through them to get to the ball carrier"
  ([Youth Football Online, coaching points for the bubble route](https://youthfootballonline.com/coaching-points-for-the-bubble-route/);
  [Gridiron Strategies, receiver screen package](https://gridironstrategies.com/article/receiver-screen-package-racks-up-huge-passing-numbers)).
- Blocking aim: "turn the defender's shoulder and hook him inside" (search
  excerpt, youth bubble material).
- Bubble path: the receiver gets some depth behind the line and turns his head
  back after a couple of steps. On about his **second or third step** he starts
  getting back downhill (the "apex on the 3rd step")
  ([Youth Football Online](https://youthfootballonline.com/coaching-points-for-the-bubble-route/)).
- Catch quality: "catches this in stride, facing downfield. There is no delay
  between the catch and run." If the receiver must "catch the ball diving or
  twisting backwards, this is disastrous"
  ([MGoBlog: Bubble Screen Professor](https://mgoblog.com/content/picture-pages-bubble-screen-professor)).
  *Sim:* this can be measured directly as the velocity vector at the catch.
- The bubble works partly because the blocker *occupies* a defender without great
  blocking skill: his release alone displaces the defender
  ([MGoBlog: Final Bubble Treatise](https://mgoblog.com/content/picture-pages-final-bubble-treatise)).
- WRs struggle to stalk-block in space for more than **2-3 s**
  ([Youth Football Online](https://youthfootballonline.com/protecting-the-bubble-screen-constraint-plays-to-make-sure-your-receivers-can-block/)).
- Read: "if the corner bails, the bubble is wide open". If the corner comes
  downhill, that is the constraint shot (bubble-go)
  ([Youth Football Online bubble-go](https://youthfootballonline.com/?p=17907), excerpt).

### Now / quick (hitch) screen
- "Number one rule for now screens": **don't throw them against press or cloud
  corners**. They are good against off corners and against overhangs/safeties
  that can easily be blocked
  ([Emory Wilhite, Don't Throw WR Screens Against This Look](https://emorywilhite.substack.com/p/dont-throw-wr-screens-against-this)).
  Opinion based on 2023 clips.
- Press-man look stifles a WR screen; "forced into traffic against tight
  coverage" ([Pride of Detroit film breakdown](https://www.prideofdetroit.com/2016/12/22/14049402/film-breakdown-wr-screen-press-man-coverage-ebron-boldin)).
- Bunch/now variant: #1 fires 2 steps upfield, comes back catching behind the LOS
  and reads his blocks (playbook excerpt,
  [Eisenhower HS bunch passes](https://www.scribd.com/doc/247296328/Bunch-Passes-Eisenhower-HS)).
- Air Raid: the outside receiver blocks the #1 defender and the next receiver
  inside blocks the #2 defender
  ([X&O Labs Air Raid bubble](https://xando.secureorderingonline.com/share/bubble-screen-in-the-air-raid-offense), excerpt).
- BDB: the fastest WR screens (TTT < 1.2 s, n=103) completed **95%**, gained
  5.6 yd/att, and had EPA about 0 with 52% success. Slower WR screens (TTT ≥ 1.2 s,
  n=306) completed 88%, gained 4.8 yd/att, at -0.16 EPA with 36% success. This is
  a correlation, not a causal claim.

### Tunnel / jailbreak
- The receiver comes back **inside** toward blockers after the catch. Receivers
  and TEs block defenders both inside and outside, forming a "tunnel"
  ([ITP Glossary: Tunnel Screen](https://scoutingacademy.com/itp-glossary-tunnel-screen/);
  [cfbtrack glossary](https://cfbtrack.com/glossary/tunnel-screen)).
- In a jailbreak, linemen sprint out in front of the receiver
  ([Wikipedia](https://en.wikipedia.org/wiki/Screen_pass)).
- One staff's rules: the OL block on their clock, the RB swings away from the
  screen, and receivers block **"one man back"** (excerpt,
  [X&O Labs ?p=7079](https://www.xandolabs.com/?p=7079)).
- G/T tunnel (North Texas) case study exists
  ([X&O Labs ?p=151038](https://www.xandolabs.com/?p=151038)); its contents were
  not retrieved.
- Outside receivers can **crack** back on an inside defender, while the RB kicks
  out or lead-blocks
  ([Youth Football Online, jail screen](https://youthfootballonline.com/using-the-jail-screen-to-maximize-the-bubble-screen/), excerpt).

---

## 4. Bunch / trips screens

- In the traditional alignment, the bunch point man is on the numbers
  ([Gridiron Strategies: add some bunch](https://gridironstrategies.com/article/add-some-bunch-to-your-playbook), excerpt).
- On a toss, the point man blocks down on what is "usually a cornerback," and
  this is "usually a kick out block"
  ([youthfootballonline bunch](https://youthfootballonline.com/?p=10960), excerpt;
  run context, not screen).
- An Emory Wilhite film piece on a bunch empty screen exists
  ([why this bunch empty screen worked](https://emorywilhite.substack.com/p/why-this-bunch-empty-screen-worked));
  its contents were not retrieved.
- **The rules "point blocks the inside-most threat" and "back man blocks the
  corner": unsourced.** A generic rule that is consistent with the sourced
  principles: each blocker takes the defender with leverage on the catch point,
  in outside-in priority, so that #1/#2/#3 block the defenders who align over them
  (the "#2 blocks #1's defender" family: X&O Labs Air Raid excerpt above).

---

## 5. Defensive answers and failure modes

### How defenders recognize screens
- **DL:** do not freeze. A rush that suddenly feels too easy, or a blocker who
  stops resisting, means retrace to the receiver or into the passing lane
  ([Glazier, DeLattiboudere: Avoid the DLine Freeze Mistake on Screens by Teaching Recognition and Retrace](https://www.glazierclinics.com/football-coach-resources/avoid-the-dline-freeze-mistake-on-screens-by-teaching-recognition-and-retrace)).
  Retrace drill: stay in the hip pocket, locate the receiver, finish the tackle
  or get a hand on the ball (same source / search excerpt).
- DL can **clutch and hold** a releasing OL to keep him out of the screen
  (search excerpt;
  [D-Line Examples 065, How to destroy screen](https://dlineexamples.substack.com/p/d-line-examples-065)).
- **LB:** sniff it out when several linemen leak downfield, then retrace and
  pursue. Against zone, stay **outside the first blocker** and force the back
  inside, and watch for the **second blocker releasing outside**
  ([Human Kinetics zone coverage excerpt](https://us.humankinetics.com/blogs/excerpt/zone-coverage);
  [LB Chalk Talk](https://lbchalktalk.substack.com/p/defending-the-screen-pass)).
  In man coverage, the LB on the RB must beat a block in space (LB Chalk Talk).
- Communication: call "screen" before it sets
  ([LB Chalk Talk](https://lbchalktalk.substack.com/p/defending-the-screen-pass)).
  *Sim:* a shouted call is information that spreads with delay, so it can be
  modelled as a perception event.
- CBs vs perimeter screens: press or cloud corners kill now screens
  ([Wilhite](https://emorywilhite.substack.com/p/dont-throw-wr-screens-against-this)).
  Cover-3 variations designed to defend RPO/WR screens exist
  ([Glazier, Ruley](https://www.glazierclinics.com/football-coach-resources/3-cover-3-variations-to-shut-down-rpos-and-wr-screens)).

### Failure modes (what kills screens)
| Failure | Source |
|---|---|
| OL releases too early, which tips the play and wrecks timing | [X&O Labs Case 2](https://www.xandolabs.com/?p=16304) |
| Blocks thrown too early are wasted | [Coaches Insider](https://coachesinsider.com/football/detachment-screens-article/) |
| DL stunt or blitz catches the back | [Steelers/Tomlin](https://steelers.com/news/hearing-from-coach-mike-tomlin-3126869) |
| OL whiffs in space: "go to make a massive block … then get beat in space by the linebackers"; the fix is "buzz feet" before contact | search excerpt (coaching article) |
| One missed block "can get the ball carrier blown up quickly" | [Boston Globe, Patriots screens](https://www.bostonglobe.com/2021/12/02/sports/why-screen-pass-has-reemerged-potent-weapon-patriots-offense) |
| Press/cloud CB, free runner, poor WR blocking on now screens | [Wilhite](https://emorywilhite.substack.com/p/dont-throw-wr-screens-against-this) |
| Bubble catch while diving or twisting backward | [MGoBlog](https://mgoblog.com/content/picture-pages-bubble-screen-professor) |
| Deep defender comes downhill unthreatened | [Youth Football Online bubble](https://youthfootballonline.com/coaching-points-for-the-bubble-route/) |
| DL reads it and retraces | [Glazier](https://www.glazierclinics.com/football-coach-resources/avoid-the-dline-freeze-mistake-on-screens-by-teaching-recognition-and-retrace) |
| Holding/clutching of releasing OL | [D-Line Examples](https://dlineexamples.substack.com/p/d-line-examples-065) |

---

## 6. Blocking in space

- **Run, buzz, block:** run your path (out/up/in), **buzz** the feet to gain
  control before contact, then block. Target the **sternum**, with strike points
  at the pecs (youth program excerpt). Buzzing gets the lineman under control
  before contact.
- The over-aggressive whiff is the main failure. Linemen need both speed to get
  downfield and agility to block secondary defenders (Westbrook,
  [Philly Mag](https://www.phillymag.com/2013/10/17/art-screen-play/)).
- **Aim point "near number / inside hip":** **unsourced** in retrieved material.
  It is the common lore that the blocker keeps inside-out leverage so the carrier
  can cut off it.
- **Cut blocks on screens:** **unsourced**. No retrieved source covered them.
- **Priority:** out, then up, then in (the X&O Labs "Out, Up, In" rule above).
  Do not block behind the play or in the back.
- **Carrier's job:**
  - Position behind the convoy. "Timing is of the utmost importance"
    ([Boston Globe](https://www.bostonglobe.com/2021/12/02/sports/why-screen-pass-has-reemerged-potent-weapon-patriots-offense)).
  - Patiently follow the blockers
    ([NFL video, Woody Marks screen](https://amp.nfl.com/videos/woody-marks-follows-blockers-to-convert-third-and-long-screen-pass)).
  - Bubble: "get vertical and bend towards the sideline" after the catch
    (search excerpt).
  - Explicit "set up the block / cut off the blocker's hip" teaching:
    **unsourced** in retrieved material.
- **Blocker arrival vs ball arrival:** no published numeric target was found
  (**unsourced**). The qualitative rule is "together": not early (wasted or tipped
  blocks) and not late.

---

## 7. Quantitative facts

### Published
- 2024 NFL: screens were **11.0% of dropbacks**, the third straight year above
  10%. On average they added the same EPA as designed runs, less than dropback
  passing, and less than running into blitzes
  ([PFF, May 2025](https://www.pff.com/news/nfl-screen-pass-rates-success-study-2025)).
- Miami 2025: **20.3%** of pass attempts were screens, the league high
  ([PFF via search excerpt](https://www.pff.com/news/nfl-mike-mcdaniel-could-transform-the-chargers-offense-with-screens)).
- 2022-23 passes thrown at or behind the LOS: about **22-23% of attempts**, with
  ~-0.23 EPA/att and 33% success. WR/TE screens within that group were ~35%
  of targets, at -0.11 EPA and 39% success
  ([Sharp Football Analysis](https://www.sharpfootballanalysis.com/analysis/nfl-teams-passing-success-adjustments/amp/)).
- 2023: the 49ers led in screen EPA/play at 0.357
  ([SI/PFF](https://www.si.com/nfl/49ers/news/pff-brock-purdy-gets-more-help-than-any-other-nfl-quarterback-01j0rmxqqwjs)).
- NGS air yards are negative for passes caught behind the LOS
  ([nflreadr NGS dictionary](https://erised.las.iastate.edu/CRAN/web/packages/nflreadr/vignettes/dictionary_nextgen_stats.html)).
  No NGS screen-specific leaderboard was found.

### Computed from local BDB 2025 (2022 NFL weeks 1-9)
- Data: `data/raw/bdb2025/big-data-bowl-data/{plays,player_play,players}.csv`.
- Definition: the targeted receiver's `routeRan == "SCREEN"`, with
  penalty-nullified plays excluded.
- Script: `an ad hoc query (reproduce with scripts/mechanics/nfl_screens.py + screen_reference.py)`.

Screens made up 821 of 8,371 targeted passes (**9.8%**). Of them, **95%** had air
yards ≤ 0, 98% were thrown inside the box, and 97% came from a traditional
dropback.

| Group | n | Comp% | Air yds med (p10/p90) | TTT med (p10/p90), s | Drop dist med, yd | Yds/att | YAC/comp | EPA/att | Success (EPA>0) | PA% |
|---|---|---|---|---|---|---|---|---|---|---|
| All screens | 821 | 88.1 | -3 (-5/0) | 1.67 (1.13/2.84) | 1.5 | 5.58 | 9.05 | -0.047 | 42.5% | 31 |
| RB | 265 | 86.0 | -4 (-6/-1) | 2.20 (1.36/2.90) | 3.3 | 5.85 | 10.34 | -0.054 | 40.0% | 21 |
| WR | 409 | 89.5 | -2 (-4/0) | 1.37 (1.07/2.00) | 0.8 | 4.97 | 7.78 | -0.122 | 39.9% | 30 |
| TE | 140 | 88.6 | -3 (-5/+1) | 2.34 (1.36/3.27) | 3.4 | 6.70 | 10.15 | +0.175 | 53.6% | 53 |
| Non-screen targets | 7550 | 64.9 | +6 (0/21) | 2.63 (1.83/3.84) | 3.2 | 7.58 | 4.65 | +0.150 | 49.3% | 24 |

Quartiles of time to throw:
- **RB:** 1.36 / 1.84 / 2.20 / 2.62 / 2.90 s (p10/p25/p50/p75/p90).
- **WR:** 1.07 / 1.20 / 1.37 / 1.60 / 2.00 s.

Caveats:
- The `SCREEN` label is PFF's charting.
- RB screens with TTT under 1.6 s may include swing-like quick screens. A true
  slow screen sits in the 2.2-3.0 s band.
- The tracking data (`tracking_week_*.csv`) could also give OL release time,
  blocker positions at the catch and first contact. That extraction was not done
  here.

---

## What to test (measurable checks per screen type)

**Shared (all screens)**
- **Arrival margin:** for each released blocker, t(blocker reaches his target
  defender's path) − t(that defender reaches the carrier's path). It should be
  ≤ 0 on successful reps. Report its distribution, not a pass/fail.
- **At the catch:** the count of blockers between the carrier and the nearest
  N defenders (in the downfield cone), and the carrier's velocity vector
  (speed and the downfield component).
- **First defender to contact the carrier:** classify him as unblocked, blocked
  and shed, or blocked and not shed. Record his role (DL retrace / LB / force /
  CB) and when he perceived the screen.
- **Requested vs achieved action:** compare each releasing lineman's intended
  target with whom he actually contacted. Whiff rate in space depends on
  approach speed at contact (does buzzing reduce whiffs?).
- **Retrace-recognition latency:** for each DL, the time from "blocker resistance
  ends" to the rusher's velocity reversing. It must be driven by perceived cues
  (no resistance, OL releasing, QB drift), not by play-type knowledge.
- **Penalty sanity:** released OL beyond the expanded neutral zone before the
  catch, and blocks in the back.

**RB slow/slip and middle screen**
- OL release time after the snap is distributed (about 1-2 s, with
  per-player spread). Releasing linemen let their rusher pass their hip before
  leaving.
- Rusher depth at release: rushers are upfield of the QB-to-RB throwing lane.
  The QB's ball clears the rushers (lob trajectory) on ≥ some fraction of reps.
- The RB's release cue is the guard leaving (event-driven). The catch is behind
  the LOS. Sanity bands from BDB: TTT ≈ 1.8-2.9 s (IQR 1.84-2.62) and air yards
  ≈ -6 to -1.
- Control cases:
  - Blitz or stunt: the RB picks up the free rusher and the screen dies.
  - DL "stops and peeks": the lineman stays on him (redirect rule).
  - Middle screen: the C and G create an interior lane, and the LB is contacted
    before he reaches the RB.

**TE screen / delay**
- The TE's block holds the end/SAM for about two counts, then he releases. The QB
  drifts laterally and deeper to open the throwing lane.
- The catch is behind or near the LOS. The kick-out man runs down the line and
  kicks out only after the end man clears.

**WR bubble / now / tunnel / jailbreak**
- Bubble:
  - Measure the catch velocity's downfield component (target: ≥ 0, in stride, no
    backward twist).
  - The receiver reaches the route apex by about step 3.
  - The #1 blocker is between his defender and the catch point at ball arrival.
- Now screen:
  - TTT ≈ 1.0-1.4 s (BDB WR IQR 1.20-1.60).
  - Opposing control: the same play vs press/cloud CB and vs off CB. Outcomes
    should differ through physics, with no rule causing it.
- Tunnel/jailbreak:
  - Linemen outrun or out-angle pursuit to their landmarks.
  - The carrier turns inside behind them.
  - The inside/outside walls exist at the catch (defenders on both sides are
    contacted).
- WR stalk duration in space: a hold of more than 2-3 s should become hard
  physically (balance/fatigue), not by rule.

**Bunch / trips screens**
- Each blocker engages the defender with leverage on the catch point, assigned
  outside-in. No defender is blocked twice while another is left free.
- Track the free defender's identity and his first-contact time against the
  carrier.

**Defense**
- DL retrace rate and latency versus how convincing the OL sell was (pass-set
  duration and contact before release).
- LB stays outside the first blocker and forces the ball inside.
- CB squeeze/press effects on WR-screen yards.
- Clutch/hold of a releasing OL is a physical contact with a penalty risk, not a
  scripted delay.
