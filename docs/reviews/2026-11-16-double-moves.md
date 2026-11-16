# Double moves: what a base install carries, and what our routes would need (report, 2026-11-16)

Rules + Coaching, for Integration and Defense. **Report only; nothing is built.**

## Why
The pool has no double move: no sluggo, hitch-and-go, out-and-up, stutter-go or post-corner.
- Defense is building a shared "stem has stopped" read for off corners and man defenders.
- Without a double move, nothing in the game tests or punishes a corner who bites on a plant.
- In real football that is the answer to a corner who drives on the break. So it belongs in the install, not as a cap on
  the defenders' read ("never ban what works too well": the cost of biting has to exist).

## Sources and their strength
- **page:** checked against the page this session.
- **summary:** from a search summary only; not cited for a build.

| source | strength | what it gives |
|---|---|---|
| Bleacher Report, "Black and Gold X's and O's: the slant route" | page | the sluggo is built on the slant; the QB's pump and hitch |
| FirstDown PlayBook, "Receiver Double Moves Are All Different" | page | man coverage; sell the first move "at least three steps"; the DB "scared to death about getting beat on the initial move" |
| FirstDown PlayBook, "Double Move Concept Install" | page | a whole double-move play: formation, routes, protection, QB reads |
| FirstDown PlayBook, "Don't Forget To Dial Up Your Hitch Route" | summary | the hitch paired with the go; QB and receiver convert to the go when the corner jumps |
| Viqtory Sports, "The Complete Coaching Guide To Football Routes" | summary | out-and-up: a 5 yd out that converts after three steps; the sluggo for a defender who reacts forward |
| PFF, "NFL route analysis: most and least effective routes, last five years" | summary | out-and-ups, post-corners and slant-and-gos have lower completion rates than the wheel (43%) |

## What a base install carries
**1. The double moves, each the stem and first break of a base route it is called off.**

| double move | built on | sources |
|---|---|---|
| sluggo (slant-and-go) | the slant | Bleacher: "the receiver still runs his slant in much the same way" |
| hitch-and-go | the hitch | FirstDown, summary |
| out-and-up | the quick or speed out | Viqtory, summary: after three steps out |
| stutter-go / stutter-comeback | the go: sold vertical, stutter, then go or come back | FirstDown install: "X sells vertical first, stutters partway, then returns to the stem at 18 yards" |
| post-corner | the post | named by PFF; no checked page of its own |

**2. Pairings.** The double move replaces the base route in that route's own concept: slant-flat or double slants
(sluggo), hitches or verts-hitch (hitch-and-go), quick outs (out-and-up). Bleacher adds a second stick: "the receiver
only needs a second stick toward the sideline before heading vertical on the seam".

FirstDown's install is a whole play, "STUTTER 5OH5 F CROSS H CHIP":
- formation 2x2, gun or pistol;
- both outside receivers on the stutter-comeback;
- F on a cross ("at 12-14 yards break inside and read man or zone");
- H chips the end, Y is in "full time protection";
- the drop is "DOUBLE MOVE FOOTWORK".

So the double move is called with more protection (a chip and a protecting end), because the ball comes out late.

**3. When it is called.**
- Against man: "Double moves normally work better vs man coverage so the matchup is vital" (FirstDown).
- Against a defender who drives on the first break: the sluggo against "a linebacker and safety both [who] get
  overanxious" (Bleacher); the hitch-and-go when "the corner jumps" (FirstDown, summary).
- So it is called off what the defense has shown: the base route has been run and jumped.

**4. How often.**
- No checked source gives a rate. PFF's route analysis (summary) has them among the least-completed throws.
- The NFL labels we hold (BDB `routeRan`: GO, HITCH, OUT, SLANT, POST, ...) have no double move.
- A tracking signature (a route labelled GO, POST or WHEEL with a deceleration below about 0.6 of top speed and a
  lateral plant before 10 yd, then re-acceleration) could count them. It is an inferred category, so it has to be
  checked on film first.
- I'd expect a small share of routes, called in sequence, not a fixed menu weight.

**5. The QB's read and the pump.**
- "The QB will often pump his way, hitch up, and prepare to throw the seam route" (Bleacher). The pump is on the first
  break, toward the faked route, then a hitch, then the throw over the top.
- He reads the defender on the double move: bitten (driving on the first break), throw it; not bitten, the rest of the
  play ("MOF CLOSED: Z-F-H OR X-F-H"; "MOF OPEN: ... THINK INSIDE F-H", FirstDown install).
- FirstDown's install page does not describe a pump. Bleacher's is the only checked pump source.

**6. The receiver's craft.** "Has to sell the initial move"; he "can't get impatient before breaking to the second part
of the route. I usually say at least three steps"; three steps is "enough to get the cover man to trigger and bite on
the initial route" (FirstDown). The sell is a real break: deceleration a defender can see, and the plant. It is not a
signal.

## What our machinery has
- **Routes** (`src/playbook/routes.ts`): a route is a list of points, each with a break speed `s` (fraction of top
  speed), so a deceleration at a point is already a physical slowdown the body carries out (`steerRoute`, ROUTE_EFFORT
  and ROUTE_FILLET). A two-break route is a list with two breaks; the `slant` is `[{d:2, s:0.75}, {d:6.5, l:-4.5},
  {d:8.5, l:-12}]`.
- **Declared breaks** (`src/playbook/route-breaks.ts` BREAK_DECL): one declared break a route, at a point, with how it
  is thrown (`onBreak`, `seenOpen`). The QB's forecast and the plan time the route by it. Only the offense knows it.
- **The QB's pump** (`behaviors/qb.ts`): today a pump is a pull-down when a window goes bad after the windup. It is not
  a designed sell.
- **The defenders already see a pump.** `release-evidence.ts`: "A pump is a 'through' with no ball after it". The
  defense's release belief: "a pump he saw can make him bite, a pull-down he saw undoes it". So a designed pump has a
  body to act on: the defenders who look at the QB.
- **The pool's calls** have no double move, and the caller has no memory of how a defender played a route earlier.
  The coordinator's bandit learns by concept family only.

## What it would need (for the build; nothing built)
1. **Route definitions with a fake break.** The first break is run as the base route runs it (same points, same `s`,
   at least three steps), then a plant and the second leg.
   - sluggo: slant to its second point, plant, go;
   - hitch-and-go: the hitch's plant at 5-6 yd, then go;
   - out-and-up: three steps of the quick out, plant, go;
   - stutter-go: a vertical stem, a stutter (`s` about 0.5 with no lateral) at 10-12 yd, go.

   The deceleration is the receiver's own body, so a defender's "stem has stopped" read sees a real plant, from what
   he perceives. Nothing tells him it is a fake.
2. **A declared fake break.** BREAK_DECL gets a second entry kind: `fake` at the first break, then the real break or
   `seenOpen` vertical.
   - The QB's forecast, plan and window timing use the real route (it is his own call). He never throws on the fake.
   - The defense gets nothing from the declaration: it reads the body.
3. **The QB's designed pump.** A real arm-through without the ball, toward the faked route, at the fake break, then the
   hitch.
   - It costs him time and his base (a reset), as the existing pump does.
   - It works only on defenders who are looking at him (release-evidence already models that).
   - The QB lane owns it.
4. **The read.** The plan's key is the defender over the double move.
   - Bitten (driving on the first break, from his own delayed picture): throw it, over the top.
   - Not bitten: the rest of the order.
   - This is the read compiler's `defender_key`, with the high route the double move and the low route the next
     answer.
5. **Protection.** The ball is out late (the fake plus the second leg, about 3.0 s or more). The call keeps a chip or
   a protecting end in (FirstDown's H chip and Y protect), so it pairs with the protection-call note.
6. **The call.**
   - The double move replaces its base route in that base route's concept.
   - The coordinator calls it off evidence he has: how the defender played the base route earlier in the game (a
     memory per route and defender side, from results he saw, not from the defense's call). Against man looks more
     than zone.
   - That memory is new caller machinery, and a management-game feature too (sequencing).
7. **What makes it fail, as in real football.**
   - The long time to throw (sacks with too little protection).
   - A corner who does not bite (the throw is not there).
   - A safety over the top.
   - A defender who was not looking at the QB (the pump sells nothing).

   No cap on the corner's bite and no cap on the double move. Both pay their real costs.

## Measure before building
- **NFL:** the inferred double-move signature above, counted per game and by coverage (man or zone, where it can be
  told). Checked on a handful of film plays first.
- **Sim:** once Defense's "stem has stopped" read is on, the rate at which a corner drives on a hitch, slant or out
  plant. That is the population a double move would punish.

## Sources
- Bleacher Report (page): https://bleacherreport.com/articles/199383-black-and-gold-xs-and-os-identifying-concepts-the-slant-route
- FirstDown PlayBook, "Receiver Double Moves Are All Different" (page): https://firstdown.playbooktech.com/coaches-community/receiver-double-moves-are-all-different
- FirstDown PlayBook, "Double Move Concept Install" (page): https://firstdown.playbooktech.com/coaches-community/double-move-concept-install
- FirstDown PlayBook, "Don't Forget To Dial Up Your Hitch Route" (summary): https://firstdown.playbooktech.com/coaches-community/dont-forget-to-dial-up-your-hitch-route
- Viqtory Sports, "The Complete Coaching Guide To Football Routes" (summary): https://www.viqtorysports.com/?p=21860
- PFF, "NFL route analysis" (summary): https://www.pff.com/news/nfl-route-analysis-the-most-and-least-effective-routes-over-the-last-five-years
