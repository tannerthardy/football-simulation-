# Read plans, as taught: quick game, dropback, play-action and screens (2026-11-24, Rules + Coaching)

Module A of the QB rebuild (docs/reviews/2026-11-24-qb-decision-plan.md §3 A, §6). Each concept's read is authored as
data the passer receives (`src/playbook/read-plans.ts`), against the QB lane's interface (`src/sim/qbv2/plan.ts`,
taken unchanged from claude/exciting-cori-hc8l4u d4b5c78c, plus the three additions agreed with the QB lane, below).
Nothing in the engine reads it yet.

**Conventions**
- One standard version per concept. Where coaches differ, the version with more sources is authored and the other is
  listed under its variants, as a later scheme option.
- Plans are written for the strong side. The passer's pre-snap state flips them (S <-> W), and `pick` names what
  decides the flip.
- Steps: 0 = the plant (the third step under center, one step from the gun), 1 = the first hitch.
- Defenders are named only by the role a coach teaches the passer to find. The flat defender is the curl/flat,
  apex or nickel man outside the box on that side, who can get to the flat.
- He finds the flat defender outside-in: the first underneath defender over or outside #2, the corner included when
  the corner squats (Cover 2, Bowen). If nobody fills that spot when he looks (`none`), the flat is uncovered and he
  throws to where that defender would be: the flat, or the quick out on quick outs. Ross on Leach ("flat defender lined
  up inside the Y ... he will be throwing the shoot") is the same logic. `none` is something he sees. A side he has not
  looked at yet is not read, and the next look or the hot and checkdown rules apply (QB lane, 2026-11-24).

## The quick-game family rule

Sources agree on the shape:
- The ball comes out on the last step of a short drop: three steps under center, one step or a catch-and-throw from
  the gun.
- The routes break at 3-6 yd, so the receiver breaks as the drop ends.
- A two-route combination puts one underneath defender in conflict, and the throw is away from him.
- Hot answers are built in: the route on the blitz side replaces the blitzer.
- Throws are on rhythm, before or at the break.

Shared sources:
- Hewitt, "Follow these 8 rules for quarterback and receiver sight adjustment" (USA Football): "The quarterback must
  release the ball by the third step whenever possible"; "the receiver will replace the area the blitz is coming
  from, and that route is automatically hot".
- Brown, "Quarterbacking made simple" (Grantland): "every play has at least one hot route — a quick out, shallow
  cross, or slant".
- The QB Stable, "How quarterbacks learn to throw with anticipation": "the ball must come out on the final step or
  first hitch".

## Slant-flat (`slant_flat`)

**Read: a key on the flat defender, on the plant.**
- The flat, then the slant, in taught order: "The eyes have to go to the tight end running a drag route first ... If
  the defender on the tight end gets width, look at the receiver running a slant above him" (Klatt).
- Widens with the flat: the slant behind him. Squeezes or sinks under the slant: the flat. "Throw the slant if he
  expands. Throw the flat if he sits inside" (Football Playbook Designer, slant-flat).
- Both throws are on rhythm: "Quarterbacks should trust their feet and throw on rhythm" (Football Playbook Designer,
  Dragon).
- Against Cover 2 the key is the corner, who becomes the flat defender: "the CB is taught to widen vs. the flat route
  (throw the slant)" (Bowen, National Football Post). The role is still "the flat defender", whom the passer resolves
  after the snap.

**First hitch: reset to the backside slant-flat.** "Reset to the backside only if both routes are covered" (Football
Playbook Designer).

**Hot:** the slant on the blitz side (Bleacher Report, the slant route; Hewitt's replacement rule).

**Checkdown:** #3's hook on the strong side, from the first hitch. Ours has the back blocking. The sources' checkdown
is the back ("throw the ball to the tailback", Klatt), and #3 in the middle is the nearest route ours has. Analogue.

**Drop pairing:** "The slant should be a three-step slant" with a three-step or one-step drop (Klatt; Bowen, NFL 101
route tree). "On that third step ... the ball should be out before the LBs can break into the passing lane"
(Bowen, NFP). The flat "goes no further than 3 yards".

**Expected by coverage family:** the key read (index 0) against every family.
- Cover 3 and single-high: the flat defender in conflict (Throw Deep, five plays that beat Cover 3).
- Cover 1 and Cover 0: the slant against man (the Browns' cut-up, Win With The Pass).
- Cover 2: the corner widening (NFP).
- Cover 4: the flat (the Browns: "the flat defender will chase the arrow, and the safety can rob the slant").

**Pick (the flip):** none sourced for slant-flat on both sides. The pre-snap choice in the sources is between this side
and a double-slant (lion) or double-stick side by the shell (Klatt; the Browns' double stick-dragon). That is a
two-concept pairing, left as a variant.

## Stick (`stick`)

**Read: a key on the flat defender, outside-in, on the plant.**
- Read outside-in: "The QB will read this concept outside-in, looking from the arrow route, to the stick route" (Throw
  Deep, Stick); the same order in Klatt and in Ross's account of Mumme and Leach.
- "If the nickel widens with the arrow route, the QB should transition to throw the stick route"; if he "fails to
  widen, the QB can swing it out to the arrow route" (Throw Deep).
- Walsh's 49ers: "If he took the flat route ... fire the stick to the TE. If he squatted on the stick, he would hit
  Roger Craig on the move in the flat" (Ross).
- Wilhite (Learning to teach Y-stick): "We teach this as a 'key defender read'", with the Mike as the danger player
  inside.
- **The cue is positional, by which route he takes.**
  - `squats` = he sits inside the flat's landing, between it and the stick, walling the stick. Throw the flat.
  - A flat defender sitting over or outside the flat landing has taken the flat (`widens`). Throw the stick.
  - Speed does not decide it: a Cover 2 corner squatting over the flat is `widens`.
  - Settled with the QB lane, 2026-11-24, after their staged Cover 2 cells threw the flat into the corner sitting on it.

**First hitch: the backside slant, then the backside stick.** "If there was any hesitation for the quarterback on the
stick side he would shuffle back and work the backside" (Ross). "The backside slot receiver runs a slant, and sits
down before he crosses the ball" (Win With The Pass).

**Hot:** the flat (#3) on the stick side and the slant on the backside. A blitz takes "the best matchup or the shorter
throw" (Shaw, Gridiron Strategies). No source names the hot against a particular rusher; the replacement rule decides.

**Checkdown:** the back, from the first hitch: "his RB will become available for a check-down throw underneath LB
level" (Throw Deep).

**Drop pairing:**
- A three-step drop under center or one step from the gun (Coaching Football Insights).
- Walsh: "one long and two short steps before throwing off of the flat defender's reaction" (Ross).
- "That one step drop doesn't have enough time in it to go through a progression" (Wilhite).
- The stick at 5 yd (Throw Deep, Shaw). The arrow's landmark at 3 yd (Throw Deep).
- The plan's drop is `quick` (three steps under center, one from the gun), the taught drop. The installed concept keeps
  CONCEPT_DROPS' gun3 for the old controller (`PLAN_DROP_DIFFERS`). The QB lane's staged plays had the gun3 plant 1.1 s
  after the stick's break (2026-11-24).

**From doubles (no #3):** BACK_AS_THREE puts the back on the flat, so `stick+b3` is the same read with the back where
S3 was (`backThreePlan`; flood and pa_flood likewise). The back is then not also the checkdown.

**Expected by coverage family:** the key (index 0) against Cover 3, 4 and 2, and against man, where the stick turns out
away from his man (Stanford Daily). Cover 2 is the contested case: the corner becomes the flat defender and can
undercut, so the hole shot to the vertical is its answer (Throw Deep; Wilhite).

**Pick: none.** Stick is a one-side concept, called to its side. "Pre-snap if the flat defender is lined up inside the
Y, the QB knows it is very likely he will be throwing the shoot ... outside the Y, the QB is now thinking stick" (Ross,
on Leach) is a lean on which throw comes on the stick side, not a flip of sides. The key read on the plant answers it.
(Corrected 2026-11-24, after Flex asked what the leverage pick looks at: no source gives stick a side choice.)

**Variants, not authored:**
- Stick-first, then the arrow (Win With The Pass: "Stick, Arrow, Check Down"; one source).
- Mouser (Glazier): the corner as the key.
- The hole-shot vertical as a third read against Cover 2.

## All hitches (`hitches`)

**Read: a structure pick by the softest corner, then outside to inside.**
- "The all hitch concept is a simple outside to inside read by the QB. First, he identifies the side of the field
  pre-snap. Then he simply reads outside hitch to inside hitch" (Win With The Pass, all hitch).
- "Primary read is the hitch route with the softest corner coverage" (Goff, Glazier).
- On the plant, #1's hitch, on rhythm: "we anticipate he will be open and then go to our second read if the CB makes an
  adjustment", and "he will throw this ball before you look" (Win With The Pass, hitch-seam).
- First hitch: #2's hitch.

**Hot:** #2's hitch on the blitz side. "Y may be a hot receiver if there is an inside blitz to his side of the center"
(Kratzer, Gridiron Strategies, "The Quick Passing Game").

**Checkdown:** the back (it checks, then releases), from the first hitch (Goff; Win With The Pass).

**Drop pairing:**
- A three-step drop under center, one step from the pistol, "a hip turn and throw from the Gun" (Kratzer).
- "Catch the snap, get the ball up and get rid of it!" (Win With The Pass).
- Hitches at 5-6 yd (Goff); at 6 yd, "drop your head, patter your feet and turn inside" (Win With The Pass).

**Expected by coverage family:**
- Cover 3, Cover 4 and soft man: #1's hitch, index 0 (Kratzer; Win With The Pass: "This route was made for Cover 4").
- Cover 2: #2's hitch, index 1. The corner squats on #1 ("Cover 2 takes a lot of these routes away because the CB sits
  in the flat"; in trips, "the hitch to the H should be open", Win With The Pass, Cover 2 beaters).

**Pick (the flip):** `cushion`, the softer corner.

**Variants:** hitch-seam with the seam read against one high ("read seam to seam", Win With The Pass); converting to a
fade against press. Neither is authored: neither is a route ours runs from this call.

## Quick outs (`quick_outs`)

**Read: a pick of side by the corners' cushion, then the corner over #1, then the apex, at the plant.**
Revised 2026-11-25 (Integration and the QB lane's corrected scorecard): keyed on the apex, V2 threw the out into a
squatting Cover 2 corner on 21 of 30, because the apex had dropped inside and "no flat defender" read as "throw the
out". The corner over #1 is the first check in every coverage:
- Corner off, sinking, carrying or bailing: #1's out on its break. Nobody over or outside #1 when he looks (`none`):
  the out is uncovered.
- Corner tight, squatting or jumping: not the out. "If the corner is off, we take the speed out. If the corner is hard
  and has safety help ... that side of the field is closed" (Shaw); "Pre-snap, the QB will read the corners. If a soft
  corner to the quick side, go to quick out" (Kratzer); "Corner tight or squatting, or a trap corner: do not throw it"
  (the outside reviewer's notes, docs/reviews/2026-11-24-qbv2-outside-audit.md §4).
- Then the apex, with only #2's hitch thrown from that read: "Apex widening into the window: move inside or backside"
  (same notes). An apex widening into the out's window when the corner has bailed is the out's lane defender, judged on
  that throw; the out not judged open moves his eyes to the apex read. Nothing the apex does, `none` included, throws
  the out.
- First hitch: the backside #1.
- Earlier revision (2026-11-24): the apex as the only key ("the apex (flat) defender: he widens to the out: #1 hitch
  inside him; he sits on the hitch: #2 out", hitch_out's read line; "sinks under the curl ... hit the speed out",
  Gridiron Strategies).
- Before the revision, the plan was a structure read: #1, then #2.
- "Pre-snap, the QB will read the corners. If a soft corner to the quick side, go to quick out to X with progression
  continuing on the weak side ... If both corners are pressing, you have a mismatch and can go to a fade adjustment"
  (Kratzer).
- "If the corner is off, we take the speed out. If the corner is hard and has safety help ... that side of the field
  is closed" (Shaw).
- On the plant, #1's quick out, on the break: "A high school QB throwing the speed out before the break is
  anticipation" (The QB Stable).
- First hitch: #2's hitch.

**Hot:** #2's hitch on the blitz side: "blitzes will alert H, Y and B that they are automatically hot in the quick
game" (Kratzer). The quick out is also named as a built-in hot (Brown, Grantland).

**Checkdown:** none. Ours has the back blocking. The sources' outlet is the back's shoot route ("Back - Shoot route
... will always be an outlet", Kratzer). Without it the passer throws away when the side is closed. Left for the
concept owner: a back release would restore the taught outlet.

**Drop pairing:** "Quick out is a three-step route with no plant and a cut run at the corner to get to 5-7 yards depth"
(Kratzer); the speed out at 4-6 yd (Shaw).

**Expected by coverage family:**
- Cover 3 and Cover 4: the corner read (index 0) gives #1's quick out. "It works best when you have soft corners in
  cover 3 or cover 4" (Kratzer).
- Cover 2 and Tampa 2: the corner squats, so the apex read (index 1) gives #2's hitch. The squatting corner takes the
  out (Win With The Pass, Cover 2 beaters).

**Pick (the flip):** `cushion`, the softer corner.

**Variants:** #1 fade with an inside quick out (Win With The Pass, "Brown"); fade conversion against press.

## Fade-flat (`fade_flat`)

Sources: 90 quotes, each checked verbatim against its saved page (scratchpad pages7, quotes7.tsv; 0 misses).

**Read: a key on the flat defender (the corner in Cover 2), on the plant.**
- Hold the corner low with the flat and throw behind him. "Both smash, and the fade-out combination are two route
  concepts offenses use to push the ball downfield as the corner is held low with a route in the flat" (Throw Deep,
  Five plays that beat Cover 2).
- "With the cornerback's eyes on the #2 WR in a cover 2 defense, the fade-out combination applies stress immediately as
  the CB honors the X WR's out-breaking route" (Throw Deep).
- The Cover 2 corner's rule is what the key reads: "If #2 goes flat, they release the WR and cover the flat route. If #2
  goes vertical, the CB should keep running with WR" (Win With The Pass, Cover 2 beaters).
- The only verbatim statement of the whole rule is a low-authority page: "If the Cornerback drifts deep with the Fade,
  then throw the ball to the Out Route in the flats. If the Cornerback stays in the flats to jump on the Out, then throw
  it over the top to the Fade" (bestflagfootballplays). The coach-authored sources above give the same mechanism.

**Alert: the fade against press with no help.**
- "Pre-snap, we always look to see if we have the home run. By that I mean do we have a single coverage on our Z or X
  with bump man-to-man? Is there safety help?" (J.D. Shaw, Gridiron Strategies, 3-step passing).
- "If the corner plays bump and run, the quarterback can adjust the receiver to a fade route" (Hewitt, USA Football).
- "If both corners are pressing, you have a mismatch and can go to a fade adjustment" (AFQ, quick game).
- The plan's condition: `{press: 'S1', shell: 'closed'}`. No source ties the alert to the single-high safety's distance;
  "Is there safety help?" is the closest.
- Smart Football prefers a middle-of-field key to press/soft, because press/soft "is often subtle and difficult to gauge
  in 1.5 seconds". The alert uses both.

**First hitch:** #3's hitch, then the backside hitch (the concept's `read` line). **Checkdown:** the back, from the
first hitch.

**Drop and timing.**
- "In a 3-step drop, the ball is thrown "on time" in the window between the corner and the safety playing over the top
  in his half of the field" (Hancock, Gridiron Strategies).
- "one… two… three… throw now" (Marinelli, Gridiron Strategies).
- The plan's drop is `quick`; the installed concept keeps gun3 (`PLAN_DROP_DIFFERS`), as with stick.

**Expected:** the key (index 1) against Cover 2, 3, 4, 6 and 2-man ("The safety has to honor the fade, so the quick out
should be open", Win With The Pass); the alert (index 0) against Cover 0 and 1 with press.

**Poor against:** a corner taught to read #2 first. "Our Cover 2 Read takes away the things that usually attack Cover 2
like smash, fade-flat and slant" (USA Football, Cover 2 Read). The flat is jumped and the fade is carried.

**The ball's placement off the defender (for the QB lane's throw, not the read).** Gridiron Strategies (Marinelli)
gives a three-way rule:
- defender behind the receiver: the holeshot;
- defender "still even with the receiver. The ball will be thrown over the top and to the outside shoulder";
- defender "over the top of the receiver ... the quarterback will throw the ball with velocity and to the outside ...
  the receiver will break off his route by planting on his outside foot and pivoting into the ball".

**Sources conflict on the even case.** The Texans' film piece: "if the defensive back is chasing and losing the race,
then throw the fade. If he's lockstep with the receiver, then throw the backshoulder fade." Bowen (Bleacher Report)
says the back shoulder "works best when thrown versus a defensive back trailing the play". The receiver reacts to the
ball rather than knowing the call: "Hopkins doesn't really need to know which throw it is - he can just react to either
one" (Texans).

**Release:** "win with an outside release in press-man, to stack on top of the defensive back" (Bowen). Keep "3 to 5
yards between him and the sideline" (Marinelli). AFQ says reduce splits for room, while Bowen notes a plus split
leaves only the fade or the comeback from an outside release.

## Composed plans (`planFor`; CALL_COMPOSE step 3 for the quick game, 2026-11-25)

A call is composed from a frontside half, a backside half and the back's job, each drawn by NFL share. The plans above
were each authored on one whole-field version, so with CALL_COMPOSE on they fit only their own draw: quick_outs 17%,
slant_flat 16%, stick 4% of their calls (4,000 draws). `planFor(call)` composes the plan the way the call is composed:
- **The frontside is the authored plan's:** its reads, key rules, frontside hot and alert, unchanged. The call must run
  the routes they use, or it takes no plan.
- **The backside:** the authored backside when the call's backside is the authored one (then, with the authored back,
  the authored plan itself). Otherwise one reset on the authored reset's step, as taught, and after it the checkdown.
  Reads are tied to the feet, and a late arrival on a timing route is a throw into a closing window. The second source
  is the outside reviewer's second read, docs/reviews/2026-11-25-qbv2-second-read.md §2; its sources are partly
  tertiary, so each entry below is that table checked against ours.

  | backside half | on the reset |
  |---|---|
  | curl-flat | reset: key the flat defender, the curl if he widens, the flat if he sits ("its depth fits a later clock") |
  | hitches, speed out-hitch, slant-hitch, go-hitch, go-hook | reset: #2's settle ("An interior settle (spacing) can be a reset") |
  | slant-flat | the flat only ("The slant window closes with each hitch; late, take the flat or the checkdown") |
  | double slants, slant-go, slant-stick | none (a late slant invites the undercut) |
  | an outside quick hitch, a quick out, a stick | none ("the corner plants and drives"; "any hesitation lets the corner undercut it"; "Never come back to it once left") |
  | fade-flat, a go or seam pair, every other half | none (pre-snap choices; dead after the snap) |

  The W hot is still that half's first quick route (Hewitt's replacement rule): the hot is thrown on the blitz, not
  late.
- **The back:** a checkdown only when the call releases him, on the route the call gave him, seen open.
- **The side pick** (cushion) holds only on the authored backside: otherwise there is no mirror half, and the concept
  is run to its called side.

Fit with `planFor`, same 4,000 draws (#903 head; the frontside matched on every draw):

| plan | whole-field fit | planFor | identical to the authored plan | no reset (the checkdown) | back in, no checkdown |
|---|---|---|---|---|---|
| quick_outs | 17.1% | 100% | 38.9% | 0% | 32.2% |
| slant_flat | 15.9% | 100% | 19.8% | 46.3% | 14.7% |
| stick | 3.6% | 100% | 3.8% | 15.0% | 0% |
| hitches | 44.3% | 100% | 49.1% | 0% | 21.0% |
| fade_flat | 7.0% | 100% | 0% | 75.5% | 5.5% |
| curl_flat | 83.7% | 100% | 23.4% | 0% | 6.5% |

**Open: three authored resets disagree with the second read.** These are kept because they are the staged plans
(Integration to decide):
- quick_outs resets to the backside quick out ("progression continuing on the weak side", Kratzer); the second read
  says do not reset to a quick out.
- stick resets to the backside slant then its stick; the second read says a late slant closes and the stick is never
  come back to.
- slant_flat resets to the backside slant-flat's full key (Klatt); the second read says late, the flat or the checkdown.

## The schema additions (agreed with the QB lane)

The QB lane accepted all three, in `plan.ts` at 9a8a3902 (claude/exciting-cori-hc8l4u), which this branch carries
verbatim:
1. `side?: 'S' | 'W'` on a key look: whose defender, for the backside reset.
2. `hot: HotRule[]`: one hot answer per side.
3. `pick?: 'cushion' | 'shell' | 'leverage'`: what decides the flip.

## Concept gaps (decided: the concepts are corrected)

Integration's decision is to correct the installed concepts to the taught versions, not bend the plans. The plans in
`read-plans.ts` are the taught versions. Each taught version is a CALL_COMPOSE step-2 setting of its concept (#903;
it replaces `CONCEPT_TAUGHT`, #896). A plan is used only on a call that runs the routes it was authored on (`planFits`);
any other call runs the old controller. `CONCEPT_GAPS` records what each plan would meet on the installed default:
- **slant_flat:** the back check-releases (Klatt). Installed default: he blocks, so there is no checkdown on the field.
- **quick_outs:** the back runs the shoot (Kratzer). Installed default: he blocks, so there is no outlet.
- **levels:** S1 runs the 5 yd in, S2 the 10-12 yd square-in (Brown). Installed default: the key pair is inverted.
- **flood:** the backside slant is the backside hot (Miller). Installed default: W1 runs a dig.
- **mesh:** a corner on both sides, the better one picked (Win With The Pass). Installed default: the flipped first read is a go.

Curl-flat is not a gap: ours matches Heck's "Florida 4", whose sit (#3) is the blitz throw. All other hot answers
marked GENERIC follow the replacement rule, because no source names the rusher.

The consistency test checks each plan against the routes it was authored on (`routesOf`).

## Sources

Every quote above was copied from the fetched page text (curl, then pandoc). The pages:
- Throw Deep Publishing, Stick: https://throwdeeppublishing.com/blogs/football-glossary/stick-concept
- Throw Deep Publishing, five plays that beat Cover 3: https://throwdeeppublishing.com/blogs/football-glossary/five-plays-that-beat-cover-3
- Bowen, National Football Post, slant-flat vs. Cover 2: https://www.nationalfootballpost.com/drawing-up-the-slantflat-vs-cover-2
- Bowen, Bleacher Report NFL 101, route tree: https://bleacherreport.com/articles/2016841-nfl-101-breaking-down-the-basics-of-the-route-tree
- Bleacher Report, the slant route: https://bleacherreport.com/articles/199383-black-and-gold-xs-and-os-identifying-concepts-the-slant-route
- Hewitt, USA Football, sight adjustment: https://blogs.usafootball.com/blog/4307/follow-these-8-rules-for-quarterback-and-receiver-sight-adjustment
- Klatt, Fox Sports, quick game concepts: https://www.foxsports.com/stories/college-football/understanding-football-joel-klatt-explaining-quick-game-passing-concepts
- Alert the Post, Browns double stick-dragon: https://alertthepost.substack.com/p/cutup-friday-2021-browns-double-stick
- Ross, Walsh, Mumme and Leach on stick: https://wesleyrossfootball.substack.com/p/bill-walsh-the-stick-concept-and
- Wilhite, Y-stick: https://emorywilhite.substack.com/p/learning-to-teach-y-stick
- Shaw, Gridiron Strategies, three-step passing: https://gridironstrategies.com/article/3-step-passing-to-success
- Kratzer, Gridiron Strategies, the quick passing game: https://gridironstrategies.com/article/the-quick-passing-game-2
- Win With The Pass:
  - stick-arrow: https://winwiththepass.com/stick-arrow-concept/
  - all hitch: https://winwiththepass.com/the-all-hitch-concept/
  - hitch-seam: https://winwiththepass.com/blue-hitchseam-concept/
  - man beaters: https://winwiththepass.com/how-to-beat-man-coverage/
  - Cover 2 beaters: https://winwiththepass.com/cover-2-beaters/
  - Cover 4 beaters: https://winwiththepass.com/cover-4-beaters/
- Goff, Glazier, vertical hitch (a video summary): https://glazierclinics.com/football-coach-resources/how-to-exploit-what-the-defense-gives-you-with-the-vertical-hitch-concept
- Brown, Grantland, quarterbacking made simple: https://grantland.com/features/quarterbacking-made-simple/
- Stanford Daily, stick film study: https://stanforddaily.com/2022/10/03/stanford-film-study-stick-concept/
- Coaching Football Insights, Packers stick: https://coachingfootballinsights.substack.com/p/2023-packers-stick-concept
- Football Playbook Designer (youth product pages; weighed lower):
  - slant-flat: https://www.footballplaybookdesigner.com/library/article/slant-flat
  - Dragon: https://www.footballplaybookdesigner.com/library/article/dragon
- The QB Stable, anticipation: https://theqbstable.com/blog/how-quarterbacks-learn-to-throw-with-anticipation

Not readable: Smart Football (403), X&O Labs (403), Weekly Spiral (403). No primary Walsh or Gillman text was found.

## Gaps

- No source names a hot against a particular rusher in these concepts. The replacement rule (the route on the blitz
  side) is authored for each.
- An explicit throw step is sourced only for the slant (the third step) and Walsh's stick (one long, two short). For
  hitches and quick outs, "on the final step" is the family rule.
- Quick outs and slant-flat have no back in the route here, so the sources' checkdown is missing. That is a concept
  question, not a read question.

# The dropback family

Same conventions. Every quote was matched by script against the saved page text
(`scratchpad/pages2`, checked with `verify.py`).

**Source weight.**
- Higher: Matt Bowen (National Football Post, Bleacher Report); Jimbo Fisher (American Football Monthly); Chris
  Brown's smartfootball blogspot; the coaches' own Gridiron Strategies articles.
- Middle: Black41, Wesley Ross and Alert The Post, which summarise clinics.
- Lower: Throw Deep, Win With The Pass, FirstDown PlayBook and YouthFootballOnline; footballnationusa is the weakest.

**GENERIC hot** marks a hot answer that follows the replacement rule (the route on the blitz side; Hewitt) because no
source names one for the concept.

## Curl-flat (`curl_flat`)

**Read: key the flat defender on the plant; the flat, then the curl, the back last.**
- "If the SS or Will hang on the curl, throw the flat. If they are quick to jump on the flat route, then target the
  curl. Simple high to low read with the check down (R) as a final option" (Bowen, NFP).
- "If the flat defender widens at the snap, the QB must be a little patient to let the curl open up. If the flat
  defender sinks under the curl, the QB must quickly hit the speed out" (Heck, Gridiron Strategies).
- So the flat is on the break, and the curl is seen open: "QBs will hold the ball until the defender breaks to the
  flat to throw the curl route" (Bowen, NFP, Cover 3).

**Drop pairing:** a five-step drop with a 12 yd curl coming back to 10, or a three-step drop with an 8 yd curl
(Heck).

**Hot:** the sit over the ball, #3's hook. In Heck's five-step "Florida 4", which ours matches (curls at 12 yd coming
back to 10, a sit at 10, the back checking then releasing), the sit is the blitz throw: "Sits down at 10 yards. Keeps
his eyes on the QB, as he is also a blitz throw." Not a concept gap: his "Tennessee" shallow belongs to another
version.

**Expected:** Cover 3 (YouthFootballOnline).

## Smash (`smash`)

**Read: high-low the corner on the first hitch.**
- "If the corner gains depth and honors the corner route, the quarterback will throw the hitch on time. If the corner
  plays low and honors the hitch, the quarterback will throw the corner route" (Throw Deep).
- Fisher (AFM): "If the coverage is a hard corner coverage such as coverage 2, the QB will hold the safety on the hash
  with his eyes and read the corner".
- A corner in between is "baiting the QB into throwing the smash. The QB should keep his eyes high and throw the
  hitch". So the default is the hitch.
- "be patient and content with throwing the hitch, do not force the smash" (Fisher).

**Drop pairing:** "a 5-step drop from underneath the center. If he is in the shotgun formation, he will take a 3-step
drop. This will also include a hitch at the end of the drop" (Fisher). The read is on step 1.

**Checkdown:** the back, "if the QB's read is unclear" (Throw Deep).

**Hot:** GENERIC; none found.

**Expected:**
- Cover 2: the corner route ("should also be open almost every time", Win With The Pass).
- Cover 4: the hitch.
- Cover 3: the hitch on time.
- Man: the corner route ("Versus man, we will almost always throw the Corner route", WWTP; Throw Deep).
- All of these are answered by the one key read.

**Variant:** a three-step drop with the corner first, on the third step (Win With The Pass, one source).

## Dagger (`dagger`)

**Read: the seam clears; the dig is primary, high-low with the shallow on the alley (curl) defender, on the plant.**
- The dig is "the primary read on the play" (Bowen, NFP). "most teams have the deep dig route from the outside
  receiver as the primary read" (Bullock).
- "read the alley player (curl, flat defender). You read the dig to the shallow" (Kou).
- "As long as the alley/nickel defender doesn't get depth and an inside position, the quarterback should have a
  throwing window open for the dig" (Longo via Ross).
- The dig is thrown "before he gets to the hash" (Longo), on the break.

**Drop pairing:** none sourced. The five-step drop with the 15 yd dig is the family rule.

**Hot:** GENERIC.

**Expected:** Cover 2, Cover 1 and Cover 3 (Bowen, BR: "beats Cover 2 ... and Cover 1/Cover 3").

**Variant:** the seam first, then the in, then the shallow (Longo; FirstDown; 2 sources against 4).

## Mesh (`mesh`)

**Read: a progression. The corner on the fifth step, the mesh point on the reset, the back.**
- "As he takes his five step drop, his eyes go to that corner route ... If that grass is open he throws the ball on his
  5th".
- "If the Z is covered or there is a safety sitting in that grass, he resets and looks the mesh point to see which
  receiver breaks open ... he finds his back in the flat" (Win With The Pass).
- "With the corner route the first read, the X's crosser the second read, and the back the third read" (Black41 on
  Mumme and Leach).
- The sit is the zone answer ("should never get the ball when facing man coverage", Ross on Holgorsen). It is last on
  the reset.

**Hot:** the backside vertical. "exists purely as a 'hot' read ... in the case of a big blitz or pressure from the
defense with no safety deep" (Black41).

**Expected:** none sourced by family.

**Variants:** the wheel or rail first (Holgorsen); the flare first (Throw Deep base); the Z's choice route
pre-snap (Glazier).

## Y-cross (`y_cross`)

**Read: deep to short.**
- "Leach and Mumme taught their QBs to read deep to short" (Black41).
- The post on the plant: "Post-snap, the QB should identify whether the FS freezes his feet or plays downhill, in this
  case, the QB should look to take the home-run shot to the post runner" (Throw Deep).
- On the first hitch, the Will: "If the Will LB fails to gain significant depth, the QB should look to hit the crosser
  ... If the Will sinks ... the RB on his check-down, or the dig from the backside become the 3rd option" (Throw Deep).
- In ours, the 3rd option is the flat, then the back. The confirm on the drop is the middle-of-field safety.

**Drop pairing:** a five-step drop (BYU; Kentucky from under center took seven). From the gun, "1 long step, then two
short steps with their eyes on grass" (Ross).

**Hot:** front-side pressure, the flat; back-side pressure, the back stays in (Kolste, Chip Kelly's version).

**Expected:**
- Cover 4 and man: the post (Throw Deep).
- Cover 3 and Cover 2: the crosser read. A two-high shell closes the vertical (Black41). Against Cover 3 the
  defense takes the vertical and the flat (Kolste).

## Flood (`flood`)

**Read: key the curl-flat defender on the plant between the out and the flat; the backside on the first hitch.**
- "The primary read, though, is the flat route. If it is open, hit it immediately. If the flat defender squeezes the
  flat right, then look to hit Y out of his break on his speed cut. If the coverage is rotated strong, work the
  backside route" (Miller, Gridiron Strategies).
- "The offense is looking for the SS to shorten his drop or jump the FB in the flat so they can target the TE on the 7"
  (Bowen, NFP).

**Hot:**
- "This route is hot vs. blitz": the flat (Miller).
- The taught backside hot is a slant ("the hot receiver vs. blitz from his side"). Ours runs a dig and a shallow, so
  the shallow stands in. ANALOGUE.

**Expected:** Cover 3 (Bowen, BR: "targets Cover 3").

**Variants:** the sail first (YouthFootballOnline, one source); peek the vertical first, against Cover 4 (Kou).

## Levels (`levels`)

**Read: an alert on the divide route at the end of the drop, then short to deep on the defender between the levels.**
- "The quarterback begins by 'peeking' or getting an 'alert' read of the divide route. If that route comes open ... the
  quarterback throws the ball on rhythm at the end of his drop ... If it is not open, he goes into his normal 1-2-3
  progression".
- "this play is read short-to-deep".
- "if he stays home to attack that quick in, the square-in comes open in the void behind him. If he drops back to follow
  the slot man ... the quick five-yard in should be open" (Brown).
- "if the middle linebacker ... flows over to take away either the square-in or the quick-in, then the quarterback will
  drop it off to the runningback underneath" (Brown).

**Concept gap:** taught, the outside man runs the 5 yd in and the slot the 10-12 yd square-in (Brown). Ours runs the
dig with the outside man (S1) and the short in with the slot (S2). The key keeps high = dig, low = short in, as
installed. Listed for a concept decision.

**Hot:** GENERIC.

**Expected:** Cover 2 ("the play is designed to attack Cover 2", Brown; "first and foremost a two-high safety
beater", Wilhite). Cover 2 Man is "a horrible coverage to run levels into" (Wilhite).

## Four verticals (`four_verts`)

**Read: the locked seam on the plant, the seam reader and the backside streak on the first hitch, the back on the
second.**
- "The QB starts his eyes on the locked seam, timed up with a quick five-step drop (from shotgun, a quick
  three-steps)".
- "If he has to hitch, his eyes must move from the locked seam to the other slot, the 'seam reader'".
- "If he hitches again he has to move his eyes to the back" (Dan Gonzalez via Chris Brown).
- "the first read must be thrown as soon as the back foot hits. It is what is known as a rhythm throw".

**Hot:** GENERIC. The seam reader looks at once against a blitz (Gonzalez).

**Expected:** Cover 3. The seams attack the free safety (Bowen, BR). "When an offense calls Four Verticals, they are
hoping for single high coverage" (Alert The Post).

**Variants:** a shell read (Bullock); the side by handedness (Mumme via A.J. Smith); matchup or pure progression (Alert
The Post).

## Verticals-hitch (`verts_hitch`)

**Read: key the middle-of-field safety on the plant.**
- The concept's own read line: "he stays middle: #2 seam; he shades to #2: #3 hitch under the seam, then the backside".
- Gonzalez's hitch steps put the backside on the first hitch and the back on the second.
- The drop is the installed gun three-step ("from shotgun, a quick three-steps", Gonzalez).

**Hot:** GENERIC.

**Variant:** hitch, seam, check down from a 0-step drop (Win With The Pass, BLUE).

## Dropback: concept gaps (in `CONCEPT_GAPS`)

- **levels:** the routes are swapped (outside on the dig, slot on the short in).
- **flood:** the backside slant is a dig and a shallow, so the shallow is the analogue hot.
- **mesh:** no wheel or rail; the Air Raid order is authored with the backside go as the hot.

## Dropback: gaps

- No source ties a drop step to dagger's dig, flood or levels' dig. The family rule (the plant) is used.
- Hot triggers by rusher are rare. Named ones are used where they exist: Y-cross (Kolste), flood (Miller) and mesh
  (Black41). The rest are GENERIC.
- Expected-by-family is sparse for mesh, curl-flat and flood. Only sourced families are listed.

**Dropback sources (URLs):**
- Bowen, NFP:
  - curl-flat: https://www.nationalfootballpost.com/expect-to-see-the-curlflat-route-this-weekend
  - Cover 3: https://www.nationalfootballpost.com/inside-the-playbook-cover-3
  - dagger: https://www.nationalfootballpost.com/2026/05/29/breaking-down-the-basics-of-the-dagger-route
  - beating Cover 3: https://www.nationalfootballpost.com/how-do-you-beat-cover-3
  - levels: https://www.nationalfootballpost.com/playbook-breaking-down-the-levels-concept
- Bowen, BR, route combinations: https://bleacherreport.com/articles/2024638-nfl-101-introducing-the-basic-route-combinations
- Heck, Gridiron Strategies: https://gridironstrategies.com/article/proven-methods-for-integrating-the-curl-route-into-the-passing-game
- Miller, Gridiron Strategies: https://gridironstrategies.com/article/flood-series-drowns-defenses
- Hewitt, USA Football: https://blogs.usafootball.com/blog/7291/basic-knowledge-about-reads
- A.J. Smith, USA Football: https://blogs.usafootball.com/blog/7368/podcast-review-aj-smith-talks-all-things-about-4-verticals
- Fisher, AFM: https://www.americanfootballmonthly.com/Arena/NS_Magazine/Current/smash.html
- Throw Deep:
  - smash: https://throwdeeppublishing.com/blogs/football-glossary/smash-concept
  - mesh: https://throwdeeppublishing.com/blogs/football-glossary/mesh-concept
  - y-cross: https://throwdeeppublishing.com/blogs/football-glossary/y-cross
  - four verts: https://throwdeeppublishing.com/blogs/football-glossary/4-verts-concept
- Win With The Pass:
  - smash: https://winwiththepass.com/smash/
  - mesh: https://winwiththepass.com/mesh/
- Troxler, Glazier: https://glazierclinics.com/football-coach-resources/basic-passing-concepts-smash-concept
- Ross:
  - smash: https://wesleyrossfootball.wordpress.com/2019/12/24/breaking-down-the-smash-concept-part-1/
  - Longo's dagger: https://wesleyrossfootball.substack.com/p/breaking-down-phil-longos-dagger
  - Holgorsen's mesh: https://wesleyrossfootball.wordpress.com/2021/02/14/dana-holgersen-and-the-return-of-mesh/
  - y-cross: https://wesleyrossfootball.wordpress.com/2019/01/17/history-and-evolution-of-y-cross/
- Kou:
  - dagger: https://coachkoufootball.substack.com/p/dagger
  - sail/flood: https://coachkoufootball.substack.com/p/nfl-pass-concepts-4-sailflood-route
- Alert The Post:
  - Lions dagger: https://alertthepost.substack.com/p/concept-cutup-2022-lions-dagger-drop
  - Monken four verts: https://alertthepost.substack.com/p/todd-monkens-four-vertical-concept
- Bullock: https://markbullock.substack.com/p/breaking-down-scott-turners-passing
- Inside The Pylon, dagger: https://scoutingacademy.com/itp-glossary-dagger-concept/
- FirstDown, dagger: https://firstdown.playbooktech.com/coaches-community/94-or-dagger-concept-cuts-the-d-either-way
- Black41:
  - mesh: https://black41flashreverse.substack.com/p/learn-a-holgorsen-play-mesh-and-shallow
  - y-cross: https://black41flashreverse.substack.com/p/learn-a-holgorsen-play-y-cross
- Kolste, Chip Kelly's y-cross: https://rileykolstefootball.com/2018/02/23/chip-kellys-y-cross-concept/
- Stanford Daily, y-cross: https://stanforddaily.com/2022/09/27/stanford-film-study-y-cross/
- YouthFootballOnline:
  - curl-flat: https://youthfootballonline.com/curl-flat-passing-concept
  - flood: https://youthfootballonline.com/flood-passing-concept/
- Wide Zone Warriors: https://widezonewarriors.substack.com/p/a-new-way-to-run-flood
- Brown, levels: https://smartfootball.blogspot.com/2009/01/peytons-favorite-pass-play-levels.html
- Gonzalez, four verticals: https://smartfootball.blogspot.com/2009/03/getting-vertical-with-dan-gonzalez.html
- Wilhite, levels: https://emorywilhite.substack.com/p/doing-more-with-one-concept-part
- Win With The Pass, BLUE: https://winwiththepass.com/?p=111

# Play-action

Every quote was matched by script against the saved page text (`scratchpad/pages3`, 156 of 156).

**Weight.** Practitioners: Bowen (BR); the Coaches Insider clinic notes; Gridiron Strategies; AFM; Chris Brown's
blogspot, including Norm Chow's read notes. Analysts: Inside The Pylon and the Substack writers. Lower: Throw Deep and
Glazier summaries. Lowest: FirstDown, Viqtory, cfbtrack, youth pages.

**Shared rules.**
- Max protection leaves no hot. A blitz seen before the snap goes to the underneath options ("he has 3 potential
  underneath options if he recognizes blitz pre-snap", Throw Deep, Yankee). Our post-dig and shot keep the back and
  the inline end in.
- Steps count from the set after the fake. The read is on the hitch: "We want our quarterback to drop back, hitch, and
  throw" (Coaches Insider, intermediate and deep passing game); Chow's "5 step drop and hitch".
- "After the play fake, the QB should find the FS" (WRWR).

## PA post-dig (`pa_post_dig`)

**Read: key the safety on the hitch.**
- "the quarterback reads the free safety, watching whether he drives forward on the dig route or stays deep on the
  post" (Inside The Pylon, Mills).
- "If the defender gets caught flat-footed, or drives downhill toward the dig, the middle of the field is completely
  exposed".
- So: jumps, or is caught flat (squats), throw the post; stays deep (sinks or bails), the dig.
- Against two high, the key is the strong safety: "remove (or occupy) the strong safety underneath with the dig route
  ... while targeting the outside leverage of the cornerback on the deep post" (Bowen, Cover 4). The role stays "the
  safety over it".

**Then:** the backside dig, seen open.

**Hot:** none. Seven- or eight-man protection ("7-Man Protection (Delayed Release)", CoachDan; Glazier, Flinn).

**Expected:** Cover 4 ("primarily used to attack Cover 4", ITP), single-high (Cover 3, Cover 1).

## PA shot (`pa_shot`, the Yankee)

**Read: the free safety on the hitch.**
- "If the FS plays low, he can throw the post. If he sinks deep into coverage, he can look to find the dig route runner
  over LB level" (Throw Deep).
- "the free safety can either get depth to protect the post or drive on the crossing route, but can't take away both"
  (USA Football).
- The post is thrown "to the opposite hash" (Throw Deep), on the break.

**Then:** the backside verticals, seen open. No back release, because it is max protection ("It is most often run with
play action and max protection", ITP).

**Expected:** Cover 1 and Cover 3, the single-high looks it is called against (ITP). Cover 4 is disputed: Throw Deep
says "transition quickly to the underneath routes"; USA Football says "almost always throws the deep post". Left out.

**Variant:** a pure progression, post, cross, flat (USA Football; one source against three for the key read).

## PA flood (`pa_flood`)

**Read: an alert on the vertical, then high-low the curl-flat defender on the hitch, then the backside cross, then
the back.**
- Chow's "65": "5 step drop and hitch. Read the S/S. Peek at Z #1; Y = #2; FB = #3" (via Chris Brown).
- "the QB proceeds to high-low the flat defender with an out-breaking sail route at 14-16 yards, and an eligible
  receiver stretching the flat to that same side" (Throw Deep, five plays that beat Cover 3).
- "sneak a peak to the post (especially vs cover 4) then read the curl flat defender for the sail" (Kou).

**Hot:** the flat against one-man pressure ("There is always a pattern in the flat that the quarterback can use as a hot
throw on one-man pressure", Coaches Insider).

**Expected:** Cover 3, the key read (index 1).

**Variant:** a bootleg read low to high, the flat first (DeBerry via Glazier: "Primary read is the arrow/flat route ...
Read pattern: low to high"). Ours is a dropback off an outside-zone fake, not a bootleg. Deep to shallow has 5 sources
and low to high 3.

# Screens

One read: the screen's receiver. The decision to throw it is each screen's own pre-snap rule, already installed as its
`kill` (numbers for the bubble, press for the wide now screen):
- "QB reads are based on numbers and leverage" (Glazier).
- Count the box; "when they do hit them with the constraint plays like bubble screens" (Brown).
- "the number one rule for now screens is we can't throw them into cloud or press corners" (Wilhite). Two sources
  disagree (Coaches Insider, Utah State: "we still run the now screen" against press). Three to two for the kill.

**Footwork.**
- Quick screens are catch and throw, on the break: "the quarterback is raising up and throwing as quickly as he can"
  (Coaches Insider, screen and draw); "catch the ball and get it out as fast as he can" (Coaches Insider, three
  screens).
- Slow screens are thrown when the receiver is set, seen open, after drawing the rush: "Three-step drop, stop and sink,
  stare downfield and draw defenders, find a throwing lane" (Coaches Insider, detachment screens). The drop depth
  differs by source (3, 5, or 5 plus 2 steps).
- The tunnel: "at most, takes a three-step drop. Other times, he will simply rise up and zip it out" (AFM).

**When it is covered or a rusher is in the lane:** get it there anyway.
- "if the QB sees any defender sitting on the TE, he must throw the ball at the TE's feet" (Gridiron Strategies, TE
  screen).
- "Get the ball there any way possible (sidearm, jump, bend, etc.)" (Coaches Insider, detachment).
- The schema has no throw-at-the-feet option. It is listed for the QB lane as an execution choice, not a read.

**Gaps:**
- No bunch-specific now-screen source.
- The bubble's post-snap overhang read ("If the over-hang commits to the box, the quarterback is going to throw the
  bubble", Coaches Insider) belongs to an RPO, not our called screen.
