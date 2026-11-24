# Call theory: why a combination works from a look, and how the caller uses it (2026-11-24, Rules + Coaching, design only)

Status: **proposal for review.** No code. It extends the approved call composition
(docs/reviews/2026-11-24-call-composition.md; CALL_COMPOSE steps 1-2, #900 and #903). It folds in Integration's playbook
gap audit (docs/reviews/2026-11-24-playbook-gap-audit.md, #910).

The user's points, as relayed by Integration:
1. We need stated theories for why a route combination works from a given look.
2. Calls should be modular, the way real coordinators call.
3. Anything the Madden playbooks hold that we lack is a gap.

**Sources:** 188 quotes from 50 pages, each checked verbatim against the saved page (scratchpad pages6, quotes6.tsv;
0 misses).
- [CLINIC]: a coach's own lecture or article.
- [PRESS]: journalism quoting or by coaches (Bowen, Grantland, team sites, Hudl).
- [BLOG]: an analyst (Smart Football, Throw Deep, Win With The Pass, breakdownsports, FirstDown).
- [LOW]: generated or tertiary. Not used for a claim on its own.

**The rule this note keeps:** a theory says why a defender is put in conflict, and the World decides whether he is.
Nothing here is a "works better" weight.
- If a taught advantage does not appear in our games, that is a missing mechanism to find (§E), not a number to add.
- The caller chooses by requirements and by what he believes about the defense (§D), never by a success bonus.

## A. What each look does, and what each composition needs

### A1. Formation structure: the mechanism each look relies on

| look | what it does to the defense (sourced) | the mechanism it depends on in our World |
|---|---|---|
| **3x1 (trips)** | Isolates the backside X: OCs "isolate that “X” receiver… trips formation best highlights his skill set, especially when he’s the lone receiver to the backside" (Hudl [PRESS]). Forces a trips check: "“solo” to the #3 receiver… allows him to play two-on-one on the single receiver side (X)"; poach "take[s] away the slant of the single receiver" (Hudl). "Backside of a 3x1 formation in the NFL is a high alert to the slant (X receiver)" (Bowen [PRESS]). | The defense's **trips checks** (solo, poach, zone it). Without them, trips stresses nothing that 2x2 does not. Whether they exist is Coverage's, and must be verified. |
| **2x2** | Mirrored half-field reads and a picked side: "In a base 2x2 smash concept, the quarterback is taught to pick a side of the field to read pre-snap"; "he will be late… if he tries to work both sides" (Throw Deep [BLOG]). Holds both safeties: "4 verticals out of a 2x2 formation… both safeties are put in a bind" (Throw Deep). Pairs a beater per side: "call one side of your formation to beat a specific coverage and the other side to beat a different coverage" (Coaches Insider [CLINIC]). | The QB's pre-snap side pick (Flex's module B) and safeties who must honour two verticals. |
| **Bunch / compressed** | Built against man: stack, bunch and mesh are "specifically designed to attack inherent weaknesses found in man coverage"; a defender "pressing the point… can easily be picked or rubbed off the LOS" (ULM co-DC, Coaches Insider [CLINIC]). Forces a banjo: "defenses will play a cover-1 with a “banjo” technique while pressing the “point”… to avoid getting picked" (USA Football [BLOG]). | **Traffic in man**: a defender who has to get through or around other bodies to stay with his man, resolved by the World's contacts. Plus the defense's **banjo/switch** rules. |
| **Stack** | A free release: "The defender aligned on the point receiver may fight him off the ball, which gives our back receiver a free release" (Bailey, Coaches Insider [CLINIC]). "Anytime you see receivers in a stack look… it should be an alert to a Hi-Lo concept" (Bowen). | **Press at the line** on the point man, and traffic for the back man's defender. |
| **Empty** | Five in protection: "you have five offensive linemen to protect and that is it. Any more rushers and you have a hot throw" (FirstDown [BLOG]). "Most of the time they know how to make you hot when you go empty" (FirstDown). | The **protection count and hot throw** (PRO_CALL, hot rules). The numbers argument has only [LOW] sources and is not used. |
| **Splits** | Room for the route: the out "requires room… will either align at the bottom of the numbers or stem to the bottom of the numbers from a plus split"; from a plus split an outside release leaves only "comeback and fade"; a reduced split creates "room outside of the numbers" (Bowen [PRESS]). Tight splits for crossers: "Without the tight splits, the quarterback is likely to be laying on their back" (FirstDown [BLOG]). "Adjust splits to break in or out"; quick out from an 8 yd split, slant and hitch from 12 (Walsh's notes, Smart Football [CLINIC]). Width has a cost: a hook runner "too wide" lets "a flat defender… play the hook and flat" (Gridiron Strategies [CLINIC]). | **Route room** (ROUTE_ROOM's field and boundary) and landmarks relative to the numbers and sideline. |
| **Motion** | A man/zone tell: "a defender goes with him, it's likely a man coverage"; a running start, "an extra burst" (Rams: LaFleur, Stafford, Nacua [PRESS]). "Make the defense declare" (Coach and Coordinator [PRESS]). Walsh motioned the flanker "to explode through all that man-traffic" (Smart Football). | **The QB's seen reaction** of a defender to motion (perception, not the call). The defense's motion rules (travel, bump, spin) are Coverage's. |

### A2. The compositions: requirements and reasons

- **Receivers:** the number a side needs, and its splits.
- **Stress:** the defender put in conflict and how.
- **Beats / poor against:** as sourced.

"Ours" marks a judgement with no source.

| composition | receivers, splits | stress | beats / poor against |
|---|---|---|---|
| **stick** | 2-3 to a side (the flat by #3 or the back) | Flat/hook defender, horizontal: "force a defender to choose between two possible attacks on his zone" (Bowen) | Zone; preferred "against teams with four down linemen" (Bowen) |
| **slant-flat / double slants** | 2 to a side; plus splits "to create room inside on the slant" (Bowen) | Hook/flat squeeze (USA Football); double slants are "one-on-one routes" read off the hook defender (breakdownsports) | Press and single-high, used to "identify man coverage" (Bowen) |
| **quick outs** | Slot best: "Best place to throw quick out is from SLOT formation" (Walsh notes); 8 yd split (Walsh) | Flat defender: if he "sinks under the curl… hit the speed out" (Gridiron Strategies) | Off coverage; needs room outside |
| **all hitches** | 2x2 | Cushion | "Soft cover 4 or soft man" (Win With The Pass); converts to a go against press or cloud (FirstDown) |
| **smash** | 2 to a side; picked side from 2x2 (Throw Deep); "better into the boundary" (Bailey) | Corner high-low (Glazier) | Cover 2 (Throw Deep; Glazier also Cover 4); "Cover 3 is problematic" (Throw Deep); safeties "have learned to overplay the route" (Smart Football) |
| **curl-flat / spacing** | Spacing: trips, inside receiver "three yards off the tackle" (USA Football [CLINIC]) | Horizontal, "a cousin of flat-curl family" (USA Football) | Spacing "will eat up soft zone coverage" (Bowen) |
| **mesh** | 2x2, tight splits signal it (Coaches Insider) | Rub against man: "natural picks/confusion" (Throw Deep) | Man and man-under "because the rub" (Win With The Pass); "struggle against a zone blitz" (Throw Deep) |
| **four verticals** | 2x2 | Safeties: "really attacks the safeties" (Smart Football) | Cover 2 (two safeties "have to split both verticals", Bowen); converts to comebacks against Cover 3 (Bowen); Cover 4 "harder" (Throw Deep) |
| **flood / sail** | 3 to a side, or 2 and the back; routes "look the same for the first 3 to 4 yards" (Gridiron Strategies) | Curl-flat defender, three levels: must "sink… to play the 7" (Bowen) | Cover 3 (Bowen) |
| **dagger** | 2 to a side | Clear-out over the dig | "beats Cover 2 (clear-out Mike’ backer) and Cover 1/Cover 3 (occupy free safety…)" (Bowen) |
| **drive / shallow** | Tight or normal splits | Hook defenders, low-high: "the shallow pulls the linebackers while the square-in… find[s] the void" (Smart Football) | Cover 2: the safety "has to choose between the post and the dig" (Win With The Pass) |
| **Y-cross** | 3x2 in its source form: "a weakside flood concept from a 3x2 alignment" (Black41) | Two high-lows against two-high (Throw Deep) | A one-high post safety is the caveat (Throw Deep) |
| **levels** | 2 to a side, plus split for room (Bowen) | Hook defender, vertical: "a two-man high-low or vertical stretch concept… designed to attack Cover 2" (Smart Football) | Cover 2; man through the rub (Smart Football) |
| **comebacks** | Room outside | Corner's depth: "must create enough separation… by selling the fade" (Bowen) | Off and soft coverage (ours) |
| **fade-flat / corner-flat** | 2 to a side; plus split for the 7 cut's room (Bowen) | Corner held low: "the corner is held low with a route in the flat" (Throw Deep) | Cover 2 and press man (Smart Football); poor against a corner who reads #2 (USA Football, Cover 2 Read) |
| **Texas / angle** | The back | Mike against the back: "settle in under the Mike" (Smart Football, Holmgren) | Tampa 2 (Smart Football) |
| **Y-option** | Slot or TE | Leverage read by both receiver and QB: the receiver must "see the same defensive deployment… as the quarterback" (Inside the Pylon) | "Versus Cover 1… almost every time"; "Cover 4 is probably the best defense against this route" (Win With The Pass) |

**Thin or missing:**
- China is one sentence in one blog, so it gets a geometry definition only, until a coach source is found. Snag
  appears only as Bowen's "spot" (a "curl-7-flat combo run out of a bunch").
- Bench has one blog only.
- The trips checks named "mable" and "special" were not found; only solo and poach were.

**Where sources conflict:**
- Smash against Cover 4: Glazier and Throw Deep call it a beater; Smart Football says it is overplayed.
- Width as room (Bowen) against width as a cost (Gridiron Strategies; Win With The Pass).
- Bunch: coaches give banjo as the answer; offensive coaches give the counters to banjo (pivot rubs, follow, trail).

## B. The call axes we lack (from the gap audit)

CALL_COMPOSE has the formation, a half per side or a full-field concept, tags, the back's job, and (declared) the
protection. The theory in §A needs these too.

1. **Splits as a call:** plus, normal, reduced, nasty, per receiver.
   - A split changes the room a route needs (out and fade outside, crossers inside), so a half's routes re-fit by
     landmark rather than a fixed offset.
   - "Adjust splits to break in or out" (Walsh) is a rule, not a weight.
   - Today the split belongs to the formation row, plus ROUTE_ROOM's nudge.
2. **Bunch, stack and compressed sets as modifiers** of any 2- or 3-receiver side (bunch tight or wide, stack on #1 or
   #2, tight doubles, reduced trips), not hand-written formation rows. Each is a geometry the World runs: who is behind
   whom, and how far apart.
3. **Formation modifiers:** the back strong or weak, and the TE on, off or flexed. The gap audit counts 24 hand-written
   rows that cannot say "Trips, Y-off, back weak, nasty".
4. **Motion vocabulary:** short, orbit, shifts, TE trade, to and from bunch or stack. The motion man's role is in the
   call (a free release, a rub, a tell), and the QB reads the defense's reaction from what he sees.
5. **Protection as a called piece:** ProtectionCall is declared and unread. The slide side, six or seven, and the back's
   release word drive who is out (step 2 already has the back's word; the protection count is PRO_CALL's).
6. **Movement passes:** boot, naked, sprint-out.
7. **Route families:** depth as a parameter of the route in the call; the post family (glance first); option routes and
   sight adjusts; double moves; whip/pivot/return.
8. **Staples:** spacing, snag/spot, scissors, post-wheel, mills, Yankee, switch verticals, China, the shallow series.

## C. Call systems: one standard

- **Coryell:** route digits ("a three-digit number that gives assignments to each of three pass receivers"; Grantland:
  "built around the concept of a route tree").
- **West Coast:** named concepts and formations, with long calls ("essentially a memory system", Grantland).
- **Erhardt-Perkins:** a concept word per side ("“ghost/tosser,” which has the Patriots run the ghost concept to one
  side and the tosser concept to the other"; "they only have to know at which position they’re lined up", Grantland).

**Recommendation: Erhardt-Perkins concept words per side as the standard,** which is what CALL_COMPOSE's halves already
are.
- A concept word is defined by geometry and read; the names from the other systems are aliases (West Coast "Dragon" is
  slant-flat to both sides, Bullock).
- Coryell digits are a later presentation layer over the same halves: a digit is a route on a number, and the tags are
  ours.
- West Coast long calls are what a full call renders as (formation, motion, protection, concept). That is a display
  format, not a different structure.

## D. How the caller uses the theory

1. **Requirements are filters, as now.**
   - A half needs its receivers on its side after motion (CONCEPT_FIT).
   - A split modifier must leave the route its room.
   - Eligibility is checked after motion (Flex's adapter).
   - The drop must fit the primary reads, and protection must cover the released routes.
   - A call that fails is not drawn.
2. **Beliefs choose among what passes.**
   - The caller's belief about the defense (scouting tendency, what he has seen this game, man or zone by down and
     distance) tilts the pick toward compositions whose `beats` match. A coordinator's game plan does exactly this.
   - The tilt's size is a stated choice of the caller, and it averages 1 over the beliefs, like the situation terms in
     step 2. It moves calls between beliefs and does not raise a family.
   - No term reads whether a call will succeed.
3. **The QB adjusts at the line from what he sees** (Flex's module B): the pick of side, alerts, kills. That is the
   theory used post-call, and it is the QB's information, not the caller's.
4. **Nothing pays a combination for working.** If bunch against press man does not free a receiver in our games, the
   caller still calls it at its share, and §E's test shows the missing mechanism.

## E. The test: a staged matrix

Concept × look (2x2, 3x1, bunch, stack, wide, tight) × coverage (Cover 0, 1, 2, 3, 4, 2-man; press or off), on fixed
bodies and seeds. For each cell, the theory states before the run who should come open, and why. The operators measure:
- separation at the break and at the throw;
- who covered whom;
- contacts and path deviations between defenders and other receivers (traffic);
- the defense's check (solo, poach, banjo).

**Predictions to test first:**

| cell | the theory predicts | if it does not appear, look for |
|---|---|---|
| bunch vs Cover 1 press | the point man's defender is rubbed or delayed by the other receivers; #2 or #3 is open by the break | traffic in man (bodies in his path), defenders' path planning through receivers |
| bunch vs banjo | the banjo exchanges, and the rub fails | whether a banjo rule exists |
| 3x1 vs Cover 3, solo | X is one-on-one with no help over the top | whether the trips check exists (Coverage) |
| 2x2 four verticals vs Cover 2 | each safety has two verticals in his half | safety split rules |
| mesh vs man | the crossers' defenders are slowed at the mesh point | traffic in man |
| fade-flat vs Cover 2 | the corner squats or sinks on #2's release, and the other route opens | the corner's #2 read |
| tight vs wide splits, drive | crossers clear the hook defenders sooner from tight | route room and landmarks |
| motion vs man | a defender travels, and the QB's man belief follows from seeing it | the QB's seen motion response |

Where our World does not produce a taught advantage, the repair is the missing mechanism (traffic, checks, press),
owned by the lane it belongs to. A weight is never the repair.

## Order (Integration's, with where I differ)

Integration's order after this note:
1. splits, stack, bunch and formation modifiers;
2. motion;
3. protection as a call;
4. movement passes;
5. option routes and sight adjusts;
6. double moves and whip/pivot;
7. slow screens;
8. post-snap RPOs;
9. staples.

**Where I differ:**
1. **The matrix first, on the formations we have** (2x2, trips and the one bunch). Whether bunch and trips change
   anything depends on mechanisms (traffic in man, the trips checks, press) that the matrix shows to be present or
   missing. Building split and bunch axes before knowing that could add looks the World cannot tell apart.
2. **Route depth as a parameter and the post family next,** as agreed for the route vocabulary. The glance is needed by
   the RPOs, and depth by the split axis (a route re-fitting to its room is a depth and landmark change).
3. **Then Integration's (1)-(3).**
4. **Staples that need no new machinery** (Yankee, mills, switch verticals, spacing from the existing trips) can ride
   along with (1) as table entries, rather than wait for (9).
5. **Movement passes need the QB lane's movement and Run Game's fake;** I'd keep them where they are.
