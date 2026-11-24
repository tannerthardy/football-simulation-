# Read plans, as taught: the quick game (2026-11-24, Rules + Coaching)

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

**Expected by coverage family:** the key (index 0) against Cover 3, 4 and 2, and against man, where the stick turns out
away from his man (Stanford Daily). Cover 2 is the contested case: the corner becomes the flat defender and can
undercut, so the hole shot to the vertical is its answer (Throw Deep; Wilhite).

**Pick (the flip):** `leverage`. "Pre-snap if the flat defender is lined up inside the Y, the QB knows it is very likely
he will be throwing the shoot ... outside the Y, the QB is now thinking stick" (Ross, on Leach).

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

**Read: a structure pick by the corners' cushion, then a progression on that side.**
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
- Cover 3 and Cover 4: #1's quick out, index 0. "It works best when you have soft corners in cover 3 or cover 4"
  (Kratzer).
- Cover 2: #2's hitch, index 1. The squatting corner takes the out (Win With The Pass, Cover 2 beaters).

**Pick (the flip):** `cushion`, the softer corner.

**Variants:** #1 fade with an inside quick out (Win With The Pass, "Brown"); fade conversion against press.

## The schema additions (agreed with the QB lane)

The QB lane accepted all three, in `plan.ts` at 9a8a3902 (claude/exciting-cori-hc8l4u), which this branch carries
verbatim:
1. `side?: 'S' | 'W'` on a key look: whose defender, for the backside reset.
2. `hot: HotRule[]`: one hot answer per side.
3. `pick?: 'cushion' | 'shell' | 'leverage'`: what decides the flip.

## Concept gaps

Where our installed concept differs from the taught version, the plan carries an analogue or a missing piece.
`CONCEPT_GAPS` in `read-plans.ts` is the list, kept so that a decision can correct the concept rather than bend the
plan around it:
- **slant_flat.** Taught, the back releases and is the checkdown ("throw the ball to the tailback", Klatt; the back in
  the flat in Dunn's install). Ours has `back: 'block'`. The plan uses #3's hook (S3) as the checkdown from the first
  hitch. ANALOGUE.
- **quick_outs.** Taught, the back's shoot route is the outlet ("Back - Shoot route ... will always be an outlet",
  Kratzer). Ours has `back: 'block'`. The plan has no checkdown.
- **All four.** The hot answer is the generic replacement rule. No source names the rusher.

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
