# Coverage ownership and pressure rules: sources and what they mean for the engine

Reviewed 2026-11-13 for Coverage, Defense/Flex, Rules + Coaching and the Fable sim
agent. Input is a pasted research summary (a "65-source pack" that I do not have;
only the pasted text) and the sources it cites. Companion to the
[coverage rule audit](../reviews/2026-11-11-coverage-rule-audit.md), the
[YAC decomposition](../reviews/2026-11-10-yac-decomposition.md), the
[flat-open review](../reviews/2026-11-11-flat-open.md) and
[Defense and perception](defense-and-perception.md). Nothing here changes the engine.

**Bottom line.**
1. The summary's central claim is right and already written into our own rules file:
   quarters has no single flat defender; who owns the flat depends on the call, the
   number of receivers to the side, the back's release and whether defenders exchange.
   `src/sim/coverage/rules.ts` carries about 30 such rules with Push, Smash, Banjo,
   Trix, Palms, Cloud and Cover 9 already. The sharper finding from reading the code
   against these sources is narrower: **the quarters apex (`quarterFlat`) and the
   quarters Mike (`mike3`) have no "first to the flat" or "fast 3 / Push" rule that
   includes the back**, though the Cover 3 match hook does. See section 4.
2. The pressure side is also further along than the summary implies (fire zone,
   Whip, Slug, Sting, Deuce and the mug packages exist, with named droppers). What is
   missing is the conditional pressure (green dog, peel) and the offense's side:
   **named protection families, a declared Mike, and hot rules that depend on which
   protection was called.**
3. Two numbers in the summary, "13-yard YAC against roughly 7" and "5.7-yard
   separation", do not match any figure I found in the repository (section 6).

## How the sources were read

| Source | Read how |
| --- | --- |
| X&O Labs, *The Quarters Coverage Study* (Kuchar, 2014, 159 pp.) | **Text extracted from the PDF**; read Case Three (open sets), the Case Four push passage and the problem-area solutions in full; the rest skimmed |
| 2004 New England Patriots offensive playbook (74-page scan) | **Read visually**: pp. 1-6, 28-33, 48-58 (protections, hot and sight rules, route cards). Not text-searchable |
| Iske, *Offensive Line Manual*, Ch. 13 (protection) | **Full text** of the chapter |
| USA Football, Cover 7 quarters parts I and II (Bartee / Cason); Throw Deep (Saban's coverages); USA Football Rip/Liz; AFQ underneath terminology and Tampa; AFQ fire zone x2; AFQ half-slide protection; Bleacher Report man pressure; USA Football sight-adjustment rules | Through a summarizing page reader |
| MatchQuarters: Fangio coverage system, Trix/Poach, Aranda creeper manual, packaging creepers | **Paywalled**: only the free portion was visible |
| Big Blue View green dog, X&O pages (LB pattern reads, three fire zones, cross-dog read-out rules, six-man protection, defensive identification), Notre Dame 2012 terminology | **Not read**: 403, or the host's certificate had expired (503 / TLS failure; I did not bypass it) |

Check any number against the original before quoting it. The sources span NFL
playbooks, college and high-school installs; levels are noted. They disagree, by
design.

## 1. Coverage: who owns the flat, by system

The summary's table is a fair outline; what I could verify, with the rules written out.
Descriptions are paraphrased for this project.

**Saban-tree quarters (Cover 7 / MOD family; USA Football Bartee, Throw Deep).**
- **Apex is the first-to-flat player** and expects #2 until a Push call. If #2 goes in
  or out and no fast #3 shows, the apex takes #2 across the field.
- **Fast 3** is a back (or #3) running straight to the flat out of the box at the snap.
  **The Mike makes the Push call**, the apex pushes to the old #3, the Mike finds and
  takes the new #3. With #3 on the ball (SWITCH), the Saban-level adjustment has the Mike
  push to the apex, take his inside-trail job on #2, and the safety bracket outside.
- Corner **counts steps, not yards**: three steps with no move into the shallow, then he
  mans the route; an inside release makes an "Under" call to the overhang.
- Throw Deep's list: MOD (press, man on #1 unless #1 breaks at 5 yd or less; apex first
  man to flat; safety all #2 vertical), CLAMP (soft corner takes #2 out within 5 yd),
  **CUT (soft corner takes the first man to the flat, including the back if he swings
  out)**, SWITCH, CC, BRACKET; Stubbie, Stomp, Seahawk, Zeke, In-Out, Steeler against
  3x1. Its Rip/Liz article: apex = first underneath defender inside the corner, hook =
  second; a shallow break of 5 yd or less triggers "under" rules; the safety's
  rotation direction is the declaration.

**Fangio tree (MatchQuarters; mostly paywalled).** Three quarters teachings: vision
(spot, eyes on the QB), zone-match (underneath defenders match, carry and deliver to the
caps), man-match (overhang carries #2). The overhang's athleticism decides which; a big
nickel points to zone-match. Cover 2 zone-match (cloud/Palms): the corner takes #2 only
if #2 breaks out; both vertical means carry man. Cover 8 / Trix and the QQH Cover 6
rules were behind the paywall: **I cannot confirm the summary's QQH row.**

**Pattern-match quarters in the X&O study (college and high-school coordinators).**
- **Two-read / Palms / Alert / Cathy / Cleo:** the corner and safety read #2's release.
  Palms: #2 vertical, corner on #1; #2 out, corner comes off to #2 and the free safety
  takes #1. Corner at 7 yd, safety 10-12, Sam apexes between #2 and the tackle and
  backpedals three steps. Cathy: #2 **out within 5 yd** puts the corner on the flat, the
  safety over the top and the OLB on the curl; #2 in, corner on #1 and safety brackets;
  #2 over 10 yd, safety on #2. Cleo (tight splits or stacks): the corner takes the first
  outside and the safety the first inside regardless of depth. "Ash likes 10 yd as the
  vertical benchmark; others use linebacker depth."
- **The Push call (printed pp. 136-138).** If the back is set to the outside
  linebacker's side the Mike makes an **Alert** call to him; if the back flares, the Mike
  yells **Push**: the Sam or nickel plays the back, the Mike becomes the nickel and takes
  the dig by #2, and the Will carries any crosser because the Mike and Will are both
  gone. "We won't pass off a crosser unless we visually see one of our own guys will be
  there." Taught with a "Core Drill".
- **The problem routes and how coaches answer them** (useful as witnesses): a three-level
  flood puts the OLB in a bind between #2 and #3 (corner turns and holds everything to the
  flat; or robber so the Sam buzzes the flat); the scissors (post/corner) between #1 and
  #2: **68.1% of surveyed coaches switch it post-snap**, one passes it off only in a
  stack and locks over 5 yd, another locks always; mesh: match concept or drop concept,
  and "everything starts with the release of three".
- **Disagreement on the cue.** One coordinator reads the quarterback's elbow ("we don't
  care where the QB looks; the ball goes where the elbow goes"); others read #2's stem or
  the back's set. The summary's caution stands: model the teaching being installed, not
  one cue for every linebacker.

**Cover 2, 3 and Tampa (AFQ).** Cover 3, Area #1 (Sam/free safety) reads #2: out or in early
means curl, quick flat means leverage outside the curl window, vertical means re-route
away from the deep middle, **Area #1 does not carry wheels (the corner owns them)**;
Area #2 (Mike/Will) reads #3 and drops to the hook if #3 blocks. The article does not
say how a back's release changes ownership. Tampa (Hardin-Simmons, Wilkinson): flat
corners with inside leverage who key the QB's count (three-step: break on the ball;
five-step: sink and read), hook-curl linebackers (#2 out: hold the curl and find #1; #2
vertical: depth and weave inside), the Mike 7 yd deep over the ball playing the high
hole; no back rule given.

The summary's table also lists "traditional Tampa 2: cornerback owns the flat" and
"Cover 3 spot: curl-flat dropper": consistent with the above.

## 2. Pressure: the three mechanisms

- **Fire zone (five rush, three deep, three under).** Volker (Georgia State, 2016):
  five rush and six drop; every LB and DB must know all six dropper jobs; 2x2 is "Gold"
  (match/carry/deliver: match outs, carry verticals, squeeze ins to the hook), "Spot" is a
  true zone for stacked splits, trips is "Zone It". **Hook-3 matches #3 and takes the
  first crosser.** Blitz technique is written as reads: edge blitzers "squeeze smart"
  (run-to: squeeze; zone read: shoulders square, no more than a yard past the line;
  run-away: look for the boot); the inside blitzer aims at the inside lineman's butt and
  reads his hip, following a pull. A second AFQ piece: **HOT defenders (the two widest
  underneath) play the first route that shows, in order seam, curl, flat**, jamming the
  seam (the most dangerous route) with an inside "man turn"; the HOLE defender keys #3,
  jumps crossers, takes the back's inside routes, and calls **"Banjo"** to switch when #2
  crosses inside with #3 wide. Six rushers would thin the zones.
- **Simulated pressure / creeper (MatchQuarters, Cody Alexander; partly paywalled).** Four
  rush with coverage integrity, but the rushers' origins change: in a **replacement
  pressure** a second- or third-level defender attacks the box while a first-level
  defender (usually the edge) drops, and **on early downs the edge must read run or pass
  before dropping**. Aranda's two stated rules: "if the OL blocks IN, we rush OUT; if the OL
  blocks OUT, we rush IN." Wizard 4 reads the tackle: if he sets to the backer, bend back to
  the near A gap; if he slides away, come off his butt for the edge. Favre 3 overloads the
  field with the nickel, a looping end, slants and a dropping boundary backer behind Cover
  3 Sky; its checks ("Gone", "Go", "Panther") are call-level.
- **Green dog and peel (Bleacher Report; Big Blue View unread).** A linebacker or safety
  with man on the back **adds to the rush when the back stays in to block**; if the back
  releases he covers him. **Peel:** an edge rusher "buys" a releasing back instead of
  rushing, and continues the rush if the back stays. A conditional decision on an observed
  back, not a delayed blitz.

## 3. Protection and hot rules

- **Patriots 2004 (NFL, pp. 50-58).** Protections are numbered by drop and family.
  **50 (7-man)**: "Flare control with the remaining back having dual pickup Mike to
  strongside force. Y slow blocks and the line will slide away from the number ... QB will
  identify the Mike ... **Only secondary blitzers can trigger sight adjusts.** Halfback
  blocks Mike to force strong or weak." **52-59 (6-man)**: the back duals Mike-Sam-strongside
  force, or runs a designated route if no blitzer unless called to stay; the line slides
  away from the number from the first bubble onside guard; QB identifies the Mike; "**a
  hot principle on the strongside and a sight adjust on the weakside**"; on the 3-step
  versions "the hots and sights are built in" and **tackles may cut**. Each protection has a
  chart per front (Over, Under, Even, 3-4, Diamond, "Tom/Tim" variants) with line calls:
  **Solid** (guard, if he and the center are covered by linemen), **Hard** (off tackle, if the
  Will walks outside on the line), **Lion/Area/Fan**, **Tally/Terry/Packer** against the
  Diamond front with a "big man rule", and "alert for Will walked out or possible **Mike recall
  by QB (this will be the norm)**". Play cards carry the hot: "Y: under at 5 yards. Alert Hook
  (hot) vs 2 strong"; QB: "check 2 strong = Y = hook".
- **Iske, Ch. 13 (college).** Turn protection (half man, half slide) for 3-, 5- and 7-step
  drops; 5-, 6-, 7- and 8-man protections with one set of line rules.
  Five-man: **any blitzer to the man side is the quarterback's** (he throws hot);
  six-man: the back or tight end is responsible for the man-side blitzer and the QB gets
  the ball out against a four-man side; seven-man: two backs or a back and a tight end
  check to the man or slide side. First install slides to the three technique. **Who calls
  it:** sideline, quarterback (he pays for it, best pre-snap view, but already busy) or
  center (he calls the front; never a tackle, whose sight angle is wrong). **Call a slide every
  play, even on runs**, so the defense has no clue; **do not align the back to the man side
  every time** (it gives the slide away): go under center or have the back cross the QB's
  face post-snap. Slide **away** from Tampa-style two-off-an-edge pressure: "common sense says
  the opposite but it clears things up". Game-week breakdown questions: field or boundary
  pressure team, three-technique or shade side, down-and-distance tendency, favorite blitzer,
  alignment and safety tells. Players get one or two things to watch at most.
- **AFQ half-slide (Hepola, 2012).** Six protect and the seventh rusher is the QB's
  through built-in hot or sight routes; slide side is a three- or four-man slide toward the
  A-gap lineman "with three hands on the A-gap player and two eyes on the Will"; the back
  makes a **double read from Mike to Sam**, protect first then release ("if in doubt, check it
  out").
- **USA Football sight adjustment (summary).** Track the safeties before and after the snap;
  a free safety moving toward the line is abnormal; **the receiver takes the area the blitz
  vacates and that route becomes the hot**; no audible means no back is assigned to the
  blitz, so release by the third step.

What the summary says about Iske is slightly off: it describes the QB being hot against
Mike or Will in five-man and the back checking them in six-man. Iske defines it by **side**
("any blitzer to the man side"), not by named defender; the named-defender version is the
Patriots' "Mike to Sam".

## 4. What the engine already has (develop `516d8729`)

Read from code and the in-house reviews; nothing run.

**Coverage.**
- `src/sim/coverage/rules.ts`: about 30 pattern-match rules on each defender's own
  perception (a declaration is believed after 0.12-0.19 s), so exchanges "emerge from
  complementary rules reading the same receiver ... and can bust when one reads it
  late". Rip/Liz **Push** is implemented: `fastFlat` (#3 or the back to the flat inside
  2 yd) puts the match hook on #2 up the seam and the seam/flat player on the new #3
  (`seamCurlFlat`, `c3Hook`); Smash, Banjo, Trix/Poach, Palms, Cloud, Cover 9 with "the
  released back is #2". Call ids include `cover4` (MOD), `cover4_meg`, `cover4_palms`,
  `cover4_box`, `cover4_stubbie`, `cover4_poach`, `cover6` (QQH), `cover6_rev` (Cover 8),
  `cover8_trix`, `cover3_match`, `cover3_cloud`, `cover9`, `cover2_match`, `tampa2`.
- **Not found by id:** Cut, Switch, CC/Bracket, Clip, Zeke, Steeler, Seahawk, Cathy,
  Cleo, Alert. Some may be covered by other rules (Cleo resembles Banjo); check before
  adding.
- **The quarters apex and Mike.** `quarterFlat` (the `q_apex` rule, base `cover4`)
  handles #2's quick out (the flat), #1 shallow, and #2 under with #3 away; it does **not
  key #3 or the back for a fast flat**, and it has no Push mode. `mike3` carries the back
  on a vertical, in or under release and, in the lines I read, has no "back to the flat" case. The source rule
  (Cover 7: apex = first to flat, expects #2 until Push; Mike calls Push on a fast 3) is
  the case that falls between them. The Cover 3 match hook has it. This matches the
  in-house audit, which said the biggest YAC hole after the two recurring ones was "#3 or
  the back to the flat while #2 climbs has no owner in Cover 3 or Cover 4" (audit read at
  `0d0f4af8`; Cover 3 appears to have been addressed since, Cover 4 not): **Coverage should
  confirm.**
- **The two gaps the audit found recur** and the sources bear on them: no release class
  for a break that keeps climbing, and underneath defenders let #2 go when he breaks out.
  The sources' thresholds are installation choices: "under" is 5 yd or less (Throw Deep,
  Cathy) or three steps (Cover 7); vertical is 10 yd (Cathy) or past linebacker depth
  (others). Ours are fixed constants independent of ratings, named in the audit
  (break about 30 degrees, NO_COVER 5 yd, safety carry 7, apex handoff 10, Mike carry 15).
  That is consistent with the sources; what the sources say is that **they vary by
  installation**, not by player.
- **Release information.** BACK_RELEASE (on): the back's route is part of the concept and
  the protection count (flat 48%, angle 20%, out 10% of NFL back routes).

**Pressure.** `src/playbook/defense.ts` has pressures with named blitzers and **droppers
with rules**: `fire_zone` (SS and Will blitz, the weak end drops as the seam/flat player),
`whip`, `slug`, `sting` (four-man simulated pressures with a dropping lineman as bonus
hook, seam/flat or quarter-flat apex), `deuce` (five-man two-deep four-under), `zero_6`,
`double_a`, and the mug packages (`mug_one`, `mug_sim`, `mug_fire`, `mug_both`, flag
`MUG_PRESSURES`), with `pressureIsInstallable` tying a pressure to a compatible
personnel, front and coverage. Defender creeps and front stems exist. **Not found:** a
conditional add (green dog), a peel rule, rushers that read the blocker (Aranda's "blocks
in, rush out"), or an early-down run-pass read before a dropping edge goes.

**Protection.** Pass protection is a **coordinator matching available blockers to rushers
each tick** (inside-out zone responsibility; backs and ends pick up free rushers; spare
linemen double) with a box-count versus protectors check (`PRO_CALL`, `BACK_RELEASE`).
**Not found:** named protection families (slide / man / half-slide, 5-8 man), a declared
Mike or protection call, line calls (Solid, Hard, Lion), a slide direction chosen from
the defense, or hot rules by protection. The QB's hot path throws the quickest route
when an alarm fires; it does not know who the scheme leaves unblocked. A blitzer from
depth is identified after a recognition delay.

## 5. What the sources add: candidates, in the order I would look at them

Each is a candidate. Name the decision it could change before building it; fix a bad
decision in the controller and incoherent execution in physics; give defenders only what
they can acquire; do not tune a speed or a statistic. Coverage, Defense/Flex and Rules +
Coaching own these.

1. **The quarters flat, with the back, as a named ownership rule (Coverage).**
   Apex first to the flat; a fast #3 or back triggers an Alert and Push exchange; the Mike
   takes the new #3 and the dig; the corner or the Sam replaces. Use the sources' own
   cases as the witnesses: **2x2 with a back releasing to the flat on the snap** against
   MOD, Palms and Cut-style calls; the same with #2 vertical and #2 out; the mirrored side;
   a back that stays in (no release). The Push needs a call the others can hear: today the
   exchange is "two defenders reading the same receiver", so decide whether the call is
   an information event (with a delay) or whether independent reads are enough.
2. **Thresholds are installation choices (Coverage).** If the audit's fixed constants
   stay, let them differ by call family the way the sources do (5 yd versus three steps,
   10 yd versus linebacker depth), not by rating.
3. **Link to the YAC finding.** In the in-house numbers about 2.0 of the 3.9 excess
   short-catch yards come from plays where **no defender gets within 1.5 yd of the
   receiver at all** (13.6% of ours, 3.6% of the NFL's). A receiver nobody owns produces
   exactly that. So the test is "does every back release produce an owner", which the
   summary proposed; it is a better first test than changing anyone's speed.
4. **Conditional pressure as a decision (Defense/Flex).** Green dog (man on the back, add
   if he stays in, cover him if he leaves) and peel (buy the back's release or continue
   the rush) need an observed back, so they use the back's own check-release read already
   in the engine. They are small, rule-shaped, and the sources agree on them.
5. **Fire zone and simulated pressure as whole packages (Defense/Flex).** The engine has
   the pieces; the sources add the **dropper rules** (seam, curl, flat priority; Hook-3 takes
   the first crosser; Banjo; deep thirds) and the **blitz technique as reads** (squeeze smart;
   aim at the inside lineman's butt and read his hip; read the tackle). The summary's warning
   is right: define the rushers, paths, replacements, QB contain and what each player may
   observe, or a pressure leaves an uncovered receiver by accident. Check whether every
   engine pressure's dropper has a rule that covers the zone the blitzer left.
6. **Protection families and the Mike (Rules + Coaching, QB).** The playbooks tie hot rules
   to the protection: five-man means the QB's man side, six-man means the back's,
   seven-man means only secondary blitzers trigger a sight adjust. A named protection plus
   a declared Mike would give the QB a pre-snap fact (who is accounted for) the engine
   does not have, and would let "which defender makes me throw hot" depend on the scheme.
   Iske's advice shapes the information design: one caller (center, QB or sideline), a slide
   called every play, the back not always on the man side (a tell). **Measure first:** how
   often does ours leave a rusher unaccounted for, and how does the QB's alarm-driven hot
   compare with the NFL, before adding a family. The same pre-snap tells are the scouting
   items the [Reamon checklist map](advance-scouting-checklist.md) found absent.
7. **Offense reads defense pre-snap for protection** (Iske's game-week list, the sight
   rules: track the safeties, a free safety near the line is abnormal) and **the receiver
   takes the vacated area as the hot.** Both depend on 6.

Test scenarios the summary proposed, with what each would exercise: 2x2 fast-back flat
(item 1), 3x1 Stubbie (the box coverages), Fangio Cover 6 on both sides (not verifiable here
for rules), Rip/Liz rotations (Push already exists), Tampa 2, double-A mug disguises (mug
packages exist), green dogs (item 4), six-man protection overloads (item 6). The matched
restage tool (`scripts/diag/matched-restage.ts`) replays saved snaps with a dice noise floor.

## 6. Cautions

- **The summary's numbers.** "13-yard YAC against roughly 7" and "5.7-yard separation at
  the catch" are not in the repository docs I searched. In-house: YAC per reception NFL
  5.19, sim 7.52 (YAC decomposition, 2026-11-10); short catches (0-10 yd) sim 7.7 against NFL 3.8
  (GAPS); separation at the catch 3.36 yd (KNOWN_PROBLEMS). Ask which operator and slice
  the summary used before quoting it.
- Saban's "Six" is a Cover 3 rotation and Fangio-tree "Cover 6" is quarter-quarter-half;
  the same word is two coverages. Use the engine's ids, not the label.
- These are coaching installs. Several are high-school or college. The Patriots pages are
  2004. Frequencies, thresholds and calls are not NFL measurements.
- Paywalled sources (Fangio, Trix, Aranda, Packaging) were seen only in part; do not
  extrapolate their missing pages.
- Defenders' calls (Push, Alert, Under, Banjo) are communication; model them as
  information with a cost, not as a shared private assignment.

## Sources

- Kuchar, [The Quarters Coverage Study](https://www.xandolabs.com/wp-content/uploads/2023/12/The-Quarters-Coverage-Study-1.pdf), X&O Labs, 2014
- [2004 New England Patriots offensive playbook](https://tipsdrills.wordpress.com/wp-content/uploads/2017/01/2004newenglandpatriots1.pdf) (scanned)
- Iske, [Offensive Line Manual](https://www.xandolabs.com/wp-content/uploads/2023/12/Iske-Offensive-Line-Manual-FINAL-BOOK-PDF.pdf), Ch. 13
- USA Football: [Cover 7 quarters, part I](https://blogs.usafootball.com/blog/7382/college-coach-details-quarters-coverage),
  [part II](https://blogs.usafootball.com/blog/7422/college-coach-details-quarters-coverage-part-2),
  [Rip/Liz Cover 3](https://blogs.usafootball.com/blog/5615/how-to-understand-nick-saban-s-pattern-match-cover-3-defense),
  [sight-adjustment rules](https://blogs.usafootball.com/blog/4307/follow-these-8-rules-for-quarterback-and-receiver-sight-adjustment)
- Throw Deep, [Saban's coverages](https://throwdeeppublishing.com/blogs/news/nick-saban-s-alabama-pass-coverages)
- American Football Quarterly: [underneath coverage terminology](https://xsandos.americanfootballquarterly.com/underneath-coverage-terminology/),
  [Tampa, part I](https://xsandos.americanfootballquarterly.com/tampa-coverage-part-i/),
  [fire zone blitz](https://americanfootballquarterly.com/article/6501-fire-zone-blitz/),
  [fire zone scheme](https://americanfootballquarterly.com/article/4577-fire-zone-scheme/),
  [sliding to protect](https://americanfootballquarterly.com/article/5890-5step-passing-game-protection-sliding-to-protect/)
- MatchQuarters (partly paywalled): [Fangio coverage system](https://www.matchquarters.com/p/unlocking-the-fangio-coverage-system),
  [Trix/Poach](https://www.matchquarters.com/p/fangios-cover-8-trix-poach-mechanics),
  [Aranda creeper manual](https://www.matchquarters.com/p/aranda-creeper-manual-simulated-pressures),
  [packaging creepers](https://www.matchquarters.com/p/packaging-your-creepers-and-sims)
- Bleacher Report, [NFL 101: man pressure](https://bleacherreport.com/articles/2140586-nfl-101-breaking-down-the-basics-of-man-pressure)
- Not read: [Big Blue View green dog](https://www.bigblueview.com/2023/6/24/23770651/green-dog-blitz-explained), X&O Labs pages on
  [linebacker pattern reads](https://www.xandolabs.com/the-lab/defense/coverage/two-high-coverage-structures/linebacker-pattern-reads-in-quarters-coverage/),
  [three fire zone blitzes](https://www.xandolabs.com/the-lab/defense/pressure/3-deep-3-under-zone-pressures/3-fire-zone-blitzes-from-the-under-front/),
  [cross-dog read-out rules](https://www.xandolabs.com/the-lab/defense/front/even-front-structures/read-out-rules-in-cross-dog-pressures/),
  [six-man protection](https://xandolabs.com/the-lab/position-groups/offensive-line/pass-protection-mechanics-offensive-line/identifying-and-blocking-pressure-in-6-man-protection-schemes/),
  [defensive identification](https://www.xandolabs.com/the-lab/defense/game-planning/communication/developing-a-defensive-identification-system/),
  and the [Notre Dame 2012 terminology PDF](https://footballcoachesnetwork.com/wp-content/uploads/2025/05/12-Notre-Dame-O.pdf)
