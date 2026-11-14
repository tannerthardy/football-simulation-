# Read plans for the 32 pool concepts (2026-11-14)

Rules + Coaching, for Integration and the QB lane's acceptance rule. This is a report; no engine change.

## The question

The QB lane traced the engine-62 target shift (FLAT 34.9% of targets against the NFL's 14.1%; crossers 4.9% against
11.8%) to the quarterback's acceptance rule. He throws to the first man in his order whose chance clears a bar, so a
ready flat beats a later dig. The coached replacement needs the plans to carry more than an order. For each pool
concept, this review gives four things:
1. the read type;
2. the order and rhythm;
3. the outlet;
4. where the crosser belongs.

Each comes with a coaching source, or is marked unsourced.

## The plan-side finding first: the back is read early, not last

The compiled plans (READ_PLAN, `src/playbook/read-compiler`) place the back's check release inside the order by
when he comes open (BACK_FRONT: "the reset after the front side's reads"). In practice he lands:
- first in flood;
- second in stick, mesh, y_cross, levels, fade_flat, hitch_post, hitch_out and seam_hitch;
- third in most of the rest.

`initPlan` pushes the outlet "last", but he is already in the order, so that push does nothing. Every source below
that names the back puts him last. The exceptions are concepts where the back runs the flat as a designed route
(Walsh or Air Raid stick, slant-flat with the back in the flat) or the swing in some mesh installs.

**Measured** (16 league games, seed 101, develop 57325109, one scratch change: the outlet removed from the order and
read last). It is matched on population, unpaired on plays:

| | plans as compiled | outlet last | NFL |
|---|---|---|---|
| FLAT targets | 35.0% | 25.7% | 14.1% |
| deep targets | 10.3% | 13.7% | 18.2% |
| air yards an attempt | 5.84 | 7.35 | |
| yards a dropback | 8.03 | 8.88 | |
| completion | 68.6% | 66.3% | |
| sacks | 2.9% | 2.2% | |
| hitch targets | 21.6% | 26.6% | 15.6% |
| cross targets | 4.9% | 5.5% | 11.8% |

Moving the outlet last takes out about half the FLAT excess. Most of the rest moves to the hitch, the next early
answer. Crossers barely move. That residue is the acceptance rule's: a ready short answer still beats a later
crosser.

## The table

Column meanings:
- **Coached read:** the sourced read type. *Key X* is a high-low or inside-out on the named defender. *Prog* is a
  pure progression.
- **Coached order:** the order, with the rhythm. "On rhythm" means thrown on the last step; "hitch" means the read
  comes after a hitch.
- **Outlet:** B last unless stated.
- **Ours (READ_PLAN):** the compiled plan from gun doubles, or trips for the trips concepts.
- **Mismatch:** what differs.
- **Source grade:** S strong, M moderate, W weak, U unsourced. URLs and quotes are in the appendix.

| concept | coached read | coached order / rhythm | outlet | ours (READ_PLAN) | mismatch | src |
|---|---|---|---|---|---|---|
| slant_flat | key curl-flat defender (after the over-the-ball alert) | slant on rhythm / flat by the flat defender; 3-step | back is a primary only when he runs the flat; ours blocks | pure S1>S2>W1>W2 | not keyed | S |
| stick | key flat defender, outside-in | flat (arrow) if he fails to widen, else stick; 1-3 step | B check-down last | pure S2>**B**>S1>W1>W2 | B 2nd; not keyed | M |
| quick_outs | key flat (Will) defender | out, else hitch inside him | B last | pure S1>S2>W1>W2 | not keyed | W |
| hitches | prog, pick a side | outside hitch > inside hitch, side picked pre-snap | B last | pure S2>S1>**B**>W1>W2 | B 3rd, mid-side | M |
| smash | key corner | corner (high) / hitch (low) on time | B last | key curl-flat S1/S2 @1.8 | keys the curl-flat, not the corner; B 3rd | M |
| curl_flat | key curl-flat defender | curl / flat by him; 5-step | B last | key curl-flat S2/S1 @1.7 | matches; B 3rd | M |
| mesh | prog; installs differ | (a) corner > mesh crosser > swing (Leach, via his QB); (b) flare > shallow > deep drag (Throw Deep) | varies: the swing is first in some installs | pure S2>**B**>S1>W2 | defensible by (b); conflicting | M/W |
| four_verts | key middle safety | seam (rhythm) > other seam (hitch) > back (second hitch) | B last, second hitch | vertical peek S2,S1 | close; B 3rd | M |
| flood | key flat defender (after a go peek) | go peek > out / flat by him > back | B last | pure **B**>S2>S1>W2>W1 | B first; flat (S3) missing from the order | W |
| dagger | key deep defender over the seam | seam peek > dig (primary) > shallow (low answer) | shallow is the check-down; B unsourced | key deep S1/S2 @2.7 | matches; B 3rd | S |
| drive | key hook linebacker | go peek > dig over shallow > back | B last | key deep S2/S1 @2.6, shallow last | the shallow belongs before the back; key is the hook, not the deep | M |
| y_cross | deep to short; installs differ | (a) go/out then cross (Leach, via his QB); (b) post > cross > back (Throw Deep); (c) deep look > cross as primary (ITP) | B last | pure S2>**B**>S1>W2>W1 | B 2nd; conflicting on cross vs. deep | M/W |
| levels | key hook defender, short to deep (after an alert) | seam alert on rhythm > short in > dig > back | B last | pure S2>**B**>S1>W2 | B 2nd; matches otherwise | M |
| comebacks | prog | Z > X > H; 5-step + hitch; ball out before the break | not named | vertical peek S2,S1 | not a peek in the sources | S |
| pa_post_dig | key free safety, then linebackers | post > dig | unsourced | key curl-flat W2/W1 | key is the safety, not the curl-flat | S/U |
| pa_flood | conflicting | (a) flat primary, low to high (Glazier, boot); (b) sail > cross > flat (W) | B last | vertical peek S2,S1 > B 3rd | conflicting | S/W |
| pa_shot | key safety | post vs. safety; beyond that unsourced | unsourced | key deep W2/W1 | partly sourced | U |
| double_slants | key the defender inside the inner slant | inside-out | B last | pure S1>S2>W1>W2 | not keyed | M |
| fade_flat | key the corner (Cover 2 beater) | fade (high) / flat (low) by the corner | B last | pure S2>**B**>S1 | B 2nd; not keyed | M |
| hitch_post | U | nearest analogue: post vs. middle safety, hitch under | B last | pure S1>**B**>S2 | B 2nd | U |
| double_outs | U | analogue: flat-defender high-low | B last | pure S1>S2>**B** | B 3rd | U |
| hitch_out | U | analogue: stick (flat defender) | B last | pure S1>**B**>S2 | B 2nd | U |
| seam_slant | U | analogue: double slants (inside-out on the hook) | B last | pure S2>S1>W2>W1 | | U |
| hitch_cross | U | analogue: drive (the cross over the hitch, keyed on the hook) | B last | pure S2>S1>**B**>W2 | B 3rd | U |
| post_cross | U | analogue: PA post / deep cross ("1. post, 2. deep cross, 3. flat", USA Football, Kolste) | B last | pure S2>S1>W2 | the cross is read before the post | S (analogue) |
| sail_corner | U | analogue: smash (key the corner) | B last | pure S1>S2>**B** | B 3rd | U |
| corner_flat | key the corner (smash high-low) | order unsourced | B last | key curl-flat S2/S1 | key is the corner | S/U |
| trips_stick | key flat defender, as stick | flat > hitch, outside-in | B last | alert W1 > S3>**B**>S1>S2 | B 2nd | M |
| trips_sail | U | analogue: flood | B last | triangle S1,S2,S3 | | U |
| seam_hitch | prog (hitch, then seam, then back) | hitch > seam > back | B last | pure S1>**B**>S2>W2 | B 2nd | W |
| trips_outs | U | analogue: flood | B last | triangle | | U |
| verts_hitch | U | analogue: four verticals | B last | vertical peek S2,S1 > B 3rd | | U |

### Counts
- Sourced (S or M): 15 concepts.
- Weak only: 4.
- Unsourced, or analogue only: 13.
- The back in ours at place 1–2: 11 concepts. At place 3: 10. Last: 0.
- Where the key differs from the source: smash and corner_flat (the corner, not the curl-flat), pa_post_dig (the free
  safety), drive (the hook linebacker, not the deep defender over the vertical).
- Read type: 8 of the sourced key reads are compiled as pure orders (slant_flat, stick, quick_outs, double_slants,
  fade_flat, hitch_out, trips_stick, seam_slant).

### The crosser (item 4)
- **drive:** the shallow belongs ahead of the back, read with the dig as a high-low on the hook defender. Ours puts
  the shallow last, after the back. Smart Football: "if neither is open the runningback should be open."
- **dagger:** the dig first, the shallow as the low answer. Ours matches.
- **levels:** the short in, then the dig, then the back. Ours matches apart from the back's place.
- **post_cross:** the sources for the play-action version read the post first, then the deep cross, then the flat.
  Ours reads the cross first.
- **mesh, y_cross, pa_flood:** the sources disagree by install. No single order is coached, and the flag should say
  which install we run.
- **hitch_cross:** unsourced; the drive analogue would put the cross ahead of the hitch.

## Recommendations for the QB lane's build (through Integration)

1. **The outlet is the last answer.** Take him out of the order and read him when the order is exhausted or the
   rhythm runs out. This is measured above. Keep him a primary only where the concept makes the back a route (none
   of our pool concepts run him in the flat except pa_flood's back_flat, and mesh's swing in one install).
2. **Key reads where sourced.** The plan should carry the keyed defender's role and the two answers. That covers
   smash and corner_flat on the corner, drive and double_slants on the hook, pa_post_dig on the free safety, and
   stick, slant_flat, quick_outs, fade_flat and trips_stick on the flat defender. The compiler infers keys from
   geometry; four of its keys name a different defender than the coaching does.
3. **Rhythm:** read 1 on the last step, read 2 on a hitch, the back on the second hitch (Gonzalez, four verticals;
   Hewitt's progression rule). A read whose route is not ready on its rhythm step is passed, not waited for. This is
   the coached form of the acceptance rule: he does not hold the ball for the 0.49 dig if its step has passed, and he
   does not take the 0.71 flat if the flat is not his read yet.
4. **Unsourced concepts** stay on the compiler's order until a source is found. They are flagged in the table.

## Appendix: sources

The per-concept quotes, URLs and grades follow, as gathered on 2026-11-14 (about 50 lookups).
- X&O Labs returned HTTP 403, so its claims are search-summary only and are marked [snippet].
- No video-game or fantasy content was used.

#### Per-concept results

#### slant_flat (S slant/flat/hook, W slant/flat)
- **Read type:** Key-defender high-low on the **curl/flat defender**, after an alert on the over-the-ball route in the Dragon version.
- **Zach Dunn:** "The quarterback's read always starts with the 'over the ball' route." Next the QB reads the inside squeeze and works to the side away from it. There he reads "the curl/flat defender". Drop: three-step. In his diagram the offset RB runs the flat, so the back is the flat route, a primary option, not a checkdown.
  https://blogs.usafootball.com/blog/7512/detailing-slant-flat-and-how-the-quarterback-should-read-it (STRONG)
- **Second source [snippet], an uploaded playbook on Scribd (WEAK):** "Throw away from the flat defender. If he covers the slant, hit the flat/swing route. If he goes flat, hit the slant."
  https://www.scribd.com/doc/225841391/QB-READS
- **Rhythm:** a 3-step slant thrown on rhythm. No source says explicitly "no hitch".
- **Back:** a primary option when he is the flat runner. Otherwise unsourced.

#### stick (S go/stick/flat, W slant/stick, B check)
- **Read type:** Key-defender read on the **flat defender**, outside-in. A peek at the go is optional and decided pre-snap.
- **Michael Campbell (Throw Deep):** "identify the flat defender and throw off of his movement post-snap". "If the flat defender fails to gain width, the QB will throw it to the arrow route runner." Otherwise he goes to the stick. "his RB will become available for a check-down throw underneath LB level."
  https://throwdeeppublishing.com/blogs/football-glossary/stick-concept (MODERATE)
- **Bear Raid quick game (fan blog, WEAK):** 1-step drop from shotgun. The QB reads the WLB and throws where he isn't. "If the QB sees a safety rotate toward the stick side, he has the backside slant."
  https://calfootballstrategy.blogspot.com/2014/02/the-bear-raid-quick-passing-game.html
- **Walsh version (Wesley Ross, WEAK):** Montana takes "one long and two short steps", then throws off the flat defender. The Air Raid first read is the back's shoot route.
  https://wesleyrossfootball.substack.com/p/bill-walsh-the-stick-concept-and
- **Back:** the last answer when he is a check release. In Walsh and Air Raid stick the back IS the flat runner, so he is primary.

#### quick_outs / speed outs (S quick out/hitch/seam, W quick out/hitch)
- **Read type:** Key-defender read on the **WLB/flat defender**. This is the Bear Raid "Out": the WLB is read the same way as on stick. "If the WLB flies to the flat to cover H's out, the QB checks down to F."
  https://calfootballstrategy.blogspot.com/2014/02/the-bear-raid-quick-passing-game.html (WEAK)
- No strong coaching source was found for an out/hitch/seam combination: **unsourced** beyond this.

#### all hitches
- **Read type:** Pick a side pre-snap, then **outside-in progression**. Erick Streelman: "First, he identifies the side of the field pre-snap." "Then he simply reads outside hitch to inside hitch." Also "get the ball out now!"
  https://winwiththepass.com/?p=2509 (WEAK)
- **Glazier/Goff, hitch-seam version:** "Primary read is the hitch route with the softest corner coverage." Then the seam read. "If seam read is covered, checks down to running back."
  https://glazierclinics.com/football-coach-resources/how-to-exploit-what-the-defense-gives-you-with-the-vertical-hitch-concept (STRONG)
- **Back:** last.

#### smash (S hitch/corner, W hitch/corner)
- **Read type:** Pick a side, then key-defender high-low on the **cornerback** (the flat defender in Cover 2).
- **Chris Brown:** "In his progression read he will 'key' the cornerback." The order is "(1) corner, (2) hitch underneath". "If the cornerback sinks back to stop the corner route, throw the hitch; if he comes up for the hitch, throw the corner." The hitch is "a six-yard hitch route (five-steps - three big and two small)".
  https://smartfootball.blogspot.com/2008/01/divide-route-in-multiple-smash-concept.html (MODERATE)
- **Campbell:** "pick a side of the field to read pre-snap". "If the corner gains depth and honors the corner route, the quarterback will throw the hitch on time." Unclear read: check down to the RB underneath LB level.
  https://throwdeeppublishing.com/blogs/football-glossary/smash-concept (MODERATE)
- **Rhythm:** "the hitch on time" means the hitch comes on the last step. The corner usually needs a hitch. No QB drop depth was found.
- **Back:** last answer.

#### corner_flat (smash variant)
- **Read type:** Same high-low on the **corner** as smash. "The smash concept puts an immediate high-low on the CB in cover 2" (Ohio State corner-flat to the boundary).
  https://throwdeeppublishing.com/blogs/football-glossary/five-plays-that-beat-cover-2-diagrams-and-video (MODERATE)
- **Order of reads:** unsourced.

#### curl_flat (both sides)
- **Read type:** High-low on the **curl-to-flat dropper**, after picking a side.
- **Matt Bowen:** "Two options for the QB based off his read of the underneath 'curl to flat' droppers." He calls it a "Simple high to low read with the check down (R) as a final option."
  https://www.nationalfootballpost.com/expect-to-see-the-curlflat-route-this-weekend (STRONG)
- **Bill Hewitt:** if the strong safety "takes the flat, throw the curl; if he takes the curl, throw the flat". This is the "Traditional read" on three- or five-step drops.
  https://blogs.usafootball.com/blog/7291/basic-knowledge-about-reads (STRONG)
- **Back:** final option.

#### mesh (S corner/shallow, W go/shallow, B swing) — crosser placement
Sources disagree. That is itself the finding: mesh orders vary by staff.
- **Air Raid / Leach, per Alex Brink (WSU QB):** "you're always going to start with the out route, and you look at what the corners do". Next, "look at the mesh that comes to you, and if that's not there you look at the other routes." So the outside route comes first, the crosser second, and the back is not addressed.
  https://spokesman.com/stories/2019/aug/29/breaking-down-four-foundational-air-raid-plays-wit (MODERATE)
- **Smart Football, Rams mesh:** "The read is then right to left, X-Z-Y, or shallow, in, shallow." Against zone, if everything is covered, the ball goes to the RB or TE in the flat. The back is last.
  https://smartfootball.blogspot.com/2005/12/st-louis-rams-shallow-cross-concepts.html (MODERATE)
- **Campbell (Throw Deep):** "flare, shallow drag, deep drag, then FB arrow". This order "stays the same against all defensive looks". The corner is "mostly a pre-snap decision". Here the back's flare comes FIRST, before the crossers. (Wording as returned by the fetch tool.)
  https://throwdeeppublishing.com/blogs/football-glossary/mesh-concept (MODERATE)
- **[snippet] Mumme/Leach "triangle read":** "With the corner route the first read, the X's crosser the second read, and the back the third read." (Black 41 Flash Reverse substack, WEAK, not fetched.)
- **[snippet] Eagles, USA Football:** "pure progression... 1) Wheel, 2) Under Shallow, 3) Hunt". Here the back's wheel comes first. The page timed out twice when fetched.
  https://blogs.usafootball.com/blog/6295/how-the-philadelphia-eagles-have-utilized-the-mesh-concept
- **Conclusion:** the most common Air Raid order is corner (or outside route), then mesh crosser, then swing back. In the other versions the back's swing or wheel is read first.

#### four verticals (go/seam/seam, go/seam)
- **Read type:** Key-defender read on the **middle-of-field (free) safety**, plus a pre-snap shell.
- **Gonzalez via Smart Football:** "The QB starts his eyes on the locked seam". The read uses "the free safety's pre-snap location". The rhythm (last step, then first hitch, then the back on the second hitch) is quoted in the general rules above. The Air Raid version: "the QB reads inside to out from the free-safety".
  https://smartfootball.blogspot.com/2009/03/getting-vertical-with-dan-gonzalez.html
- **Campbell:** the tailback should "Check pass protection responsibilities, release to check-down".
  https://throwdeeppublishing.com/blogs/football-glossary/4-verts-concept
- **Back:** last, on the second hitch.

#### flood / sail (S go/out/flat, W dig/shallow)
- **Read type:** High-low on the **flat defender**, often after a peek at the vertical.
- **Shakes/Sail:** "If they sink, he throws the out route underneath them. If they come up, he throws the corner." (Fan blog, WEAK.)
  https://calfootballstrategy.blogspot.com/2014/03/downfield-passing-game.html
- **[snippet], several blogs:** "quick look at the vertical route, then read the flat defender". If the defender sinks under the deep out, throw the speed out. If he traps the speed out, throw the deep out.
- **Order for dropback flood:** no strong source fetched. Treat as **weakly sourced**: go peek, then sail/out versus flat by the flat defender, then the back.

#### dagger (S dig/seam/shallow, W go/hook) — crosser placement
- **Matt Bowen:** "the primary read on the play" is the X receiver's dig. The No. 2 seam clears the middle for it.
  https://www.nationalfootballpost.com/2026/05/29/breaking-down-the-basics-of-the-dagger-route (STRONG)
- **Coach Kou (WEAK):** "read the alley player(curl, flat defender. You read the dig to the shallow." Also "Dig window is closed so he throws the shallow off the curl flat defender."
  https://coachkoufootball.substack.com/p/dagger
- **Order (best available):** a seam peek against a middle-open look, then the dig, then the shallow as the low answer. The shallow comes after the dig and works as the check-down. No source gives the back's place.

#### drive (S go/dig, W go/shallow) — crosser placement
- **Read type:** High-low on the **hook/curl linebacker** (dig over shallow), after a peek at the go/post.
- **Smart Football:** "the shallow or the square-in should come open depending on who the linebackers pay attention to". If neither is open, "the runningback should be open". The QB "takes a full five-step drop".
  https://smartfootball.blogspot.com/2009/06/shallow-cross-drag-and-drive-in-west.html
- **Smart Football, Rams Drive:** against man, "shallow->in->corner (RB dump off)". Against zone, "corner (or wheel), in, to shallow".
  https://smartfootball.blogspot.com/2005/12/st-louis-rams-shallow-cross-concepts.html
- **Campbell:** "1) Go Route (X WR) 2) Shallow Cross (Slot WR) 3) Basic (TE) 4) Check-down (RB)". The QB is taught to "peek" the post pre-snap.
  https://throwdeeppublishing.com/blogs/football-glossary/drive-concept
- **Crosser vs. back:** in every source the shallow comes BEFORE the back.

#### y_cross (S go/cross/flat, W post/hook) — crosser placement
- **Read type:** Key-defender read. The deep part keys the safety; the cross and flat are a high-low on a linebacker or the flat defender. Overall the read goes deep to short.
- **Brink (Leach WSU):** the QB looks at the out and go routes first. "If the go route is pressed and there's no safety over the top, you throw it." If not, he looks to the out. The cross comes after those initial reads. Receivers are "gifted runners in the flat". This puts the **flat/out ahead of the crosser**. The wording around the quote is the fetch tool's paraphrase.
  https://spokesman.com/stories/2019/aug/29/breaking-down-four-foundational-air-raid-plays-wit (MODERATE)
- **Campbell, the post-side version:** "Post", "Deep Crosser", "RB Check-down OR Dig". Against 2-high, if the Will "fails to gain significant depth" the QB throws the crosser. This puts the **crosser ahead of the back**.
  https://throwdeeppublishing.com/blogs/football-glossary/y-cross (MODERATE)
- **Schofield (ITP):** "The QB takes a quick look first at the deep route... works to the primary route, which is the crossing route."
  https://scoutingacademy.com/itp-glossary-y-cross/ (MODERATE)
- **Glazier/Barnett:** read the safety. If it is squatting, "deliver the ball on their third step". If its hips open, work to the cross, then the dig.
  https://www.glazierclinics.com/football-coach-resources/create-instant-chunk-plays-with-the-air-raid-y-cross-system (STRONG, but a summary page)
- **[snippet] Black 41 substack:** "Leach and Mumme taught their QBs to read deep to short... From there... the quick out from the H, and last to the backside post-curl and the flat route from the back."
- **Conclusion:** the go is first. The Leach version puts the out/flat second and the cross third; the West Coast and Throw Deep versions put the cross second, with the flat or back last.

#### levels (S dig/short in/seam) — crosser placement
- **Read type:** **Short-to-deep** high-low on the hook defender, after an alert.
- **Chris Brown:** "Unlike most pass concepts which are read deep to short, this play is read short-to-deep." The play begins with a peek: "The quarterback begins by 'peeking' or getting an 'alert' read of the divide route." "the philosophy of the play is to throw the five-yard in route whenever it comes open." If it is covered, "the quarterback looks for the square-in behind him". If the MLB flows over, "the quarterback will drop it off to the runningback underneath".
  https://smartfootball.blogspot.com/2009/01/peytons-favorite-pass-play-levels.html (MODERATE)
- **Order:** seam/divide alert on rhythm, then the short in, then the dig, then the back last.

#### comebacks (comeback/dig, comeback/seam)
- **Charlie Coiner:** "read this Z-X-H". Against Cover 2 he reads Y-X-H instead. The QB takes a five-step drop with a hitch. The ball "must be thrown before the Z comes out of his break." The warning: "the corner is going to undercut the comeback for the dreaded pick 6."
  https://firstdown.playbooktech.com/coaches-community/comeback-route-from-couple-formation (STRONG)
- **Read type:** progression. The back is not mentioned.

#### play-action post-dig (Mills)
- **Read type:** Key-defender read on the **free safety** (post/dig), then the linebackers (dig/shallow).
- **Daniel Syed (ITP):** "the quarterback reads the free safety, watching whether he drives forward on the dig route or stays deep on the post."
  https://scoutingacademy.com/itp-glossary-mills-concept/ (MODERATE)
- **Glazier (Flinn):** the QB throws "the vertical against single-high or man coverage" and works the dig-post against quarters.
  https://glazierclinics.com/football-coach-resources/unlock-explosive-plays-how-to-add-2-big-gains-every-game-with-play-action (STRONG, summary page)
- **Order/back:** order unsourced beyond "post, then dig"; the back's role is unsourced.

#### play-action flood / boot (pa_flood) — crosser placement
The two sources conflict.
- **Matt DeBerry, naked boot (Glazier):** a quick peek at the fade, then "Primary read: the arrow/flat route", then the climb, then the post. "Read pattern: low to high." The QB must "whip head around" after the fake. Here the flat is first.
  https://www.glazierclinics.com/football-coach-resources/mastering-the-naked-bootleg-create-explosive-plays-from-multiple-formations-coachs-guide (STRONG)
- **Dusty Evely, PA boot (WEAK, a writer):** "Deep to Shallow": sail, then the crosser, then the flat last.
  https://dustyevely.substack.com/p/when-open-isnt-open-part-1-pa-boot
- **Yankee (PA post + deep over), Taylor Kolste via USA Football:** "1. Skinny Post, 2. Deep Cross, 3. Flat." The back leaks to the flat to hold the flat defender. Here the crosser comes before the flat.
  https://blogs.usafootball.com/blog/6266/how-to-create-explosive-passing-plays-with-the-yankee-concept (STRONG)

#### play-action shot (go/post, post/dig)
- Safety-keyed. Glazier/Flinn: the vertical against single-high or man, the dig-post against quarters (link above).
- Order beyond that: unsourced.

#### double slants
- **Read type:** Key-defender read on **the defender inside the innermost slant** (hook/Mike), inside-out.
- **Seth Galina:** the read is the defender "inside of the most inside slant", whether safety, nickel or linebacker. The standard slant is three-step. Oklahoma State's version is five-step.
  https://blogs.usafootball.com/blog/6377/why-you-shouldn-t-let-fear-of-interceptions-keep-double-slant-routes-out-of-your-playbook (STRONG)
- **[snippet]:** "the QB will read the Double Slant concept from inside-out."
- **Leach WSU backside double slants (Wesley Ross, WEAK):** the QB reads inside slant to outside slant.

#### fade-flat (Cover 2 beater)
- **Read type:** High-low on the **cornerback / flat defender**.
- **[snippet], Throw Deep / YouthFootballOnline:** "The first read for the quarterback against Cover 2 is the corner, who is the flat defender." Also "Vs Cover 2, look to the strong-side fade first."
- **Weakly sourced**: no strong page was fetched.

#### hitch-out, hitch-post, double outs, seam-slant, hitch-cross, post-cross, sail-corner, seam-hitch, trips outs, verticals with a hitch
- **Unsourced as specific concepts.**
- Nearest analogues:
  - seam-hitch: the Goff hitch-seam progression (hitch, then seam, then RB), STRONG, link above.
  - post-cross: the Yankee read post, then cross, then flat, STRONG.
  - sail-corner: unsourced.
  - verticals with a hitch: unsourced. Campbell has the outside receivers convert to a comeback at 15 yards if they cannot separate.

#### trips stick
- **Read type:** flat-defender read as in stick, outside-in.
- **Campbell:** in the trips flex version the QB "reads outside-in, looking from the arrow route, to the stick route". The wording is the fetch summary's.
- **Wesley Ross (WEAK):** backside double slants read inside to outside.
- Otherwise unsourced.

#### trips sail
- **Unsourced** beyond flood/sail.

#### Bottom line for crossers

| Concept | Crosser relative to flat/back | Best source |
|---|---|---|
| drive | shallow comes before the back; the back is the last outlet | Smart Football, Campbell |
| dagger | dig, then shallow; the shallow is the low/check answer | Bowen, Kou |
| mesh | Air Raid: corner/outside route, then crosser, then back. Throw Deep / Eagles [snippet]: back's flare or wheel first | sources disagree |
| y_cross | Leach: go, then out/flat, then cross. Others: deep, then cross, then flat/back | sources disagree |
| levels | short in, then dig, then back | Smart Football |
| PA post-cross / Yankee | post, then cross, then flat | USA Football / Kolste |
| PA flood / boot | clinic (DeBerry): flat first, low to high. Writer: sail, then crosser, then flat | sources disagree |
| flood, hitch_cross, post_cross (dropback) | unsourced | |

### Source grades and general rhythm rules

- **STRONG** (clinic, coach-authored article, coach's book or playbook text):
  - Glazier Clinics coach-resource pages (Gary Goff, McNeese State HC; Matt DeBerry, OC at College Station HS).
  - Charlie Coiner (former NFL assistant) on FirstDown PlayBook.
  - Matt Bowen (former NFL safety, analyst) on National Football Post.
  - USA Football coaching blogs by named coaches (Bill Hewitt, Zach Dunn, Keith Grabowski, Seth Galina, Taylor Kolste).
- **MODERATE**:
  - Smart Football (Chris Brown, smartfootball.blogspot.com archive). He is an analyst who synthesizes playbooks and clinics, and is widely used by coaches. I treat him as strong on structure.
  - Throw Deep Publishing glossary (Michael Campbell, publisher of coaching books). These pages are summaries.
  - Spokesman-Review, quoting former WSU QB Alex Brink about Leach's offense. It is a player's account.
  - Inside the Pylon / Scouting Academy glossary (Mark Schofield, Daniel Syed).
- **WEAK** (blog or forum): Coach Kou substack, winwiththepass.com, Wesley Ross substack, Dusty Evely substack (says he is a writer, not a coach), calfootballstrategy.blogspot (fan blog).
- **Not used**: video-game sites (civil.gg) and fantasy sites.
- **Blocked**: X&O Labs (xandolabs.com) returned HTTP 403, so none of its articles were read. Claims attributed to X&O Labs below are **[snippet]** only.

#### General rhythm rules (they apply across concepts)

- **Four verticals rhythm.** Dan Gonzalez via Smart Football: "timed up with a quick five-step drop (from shotgun, a quick three-steps)". Also "the first read must be thrown as soon as the back foot hits". After a hitch, "his eyes must move from the locked seam to the other slot". Then "If he hitches again he has to move his eyes to the back." This is the cleanest statement of the pattern: read 1 on the last step, read 2 on the first hitch, the back on the second hitch.
  https://smartfootball.blogspot.com/2009/03/getting-vertical-with-dan-gonzalez.html (MODERATE, but it quotes a coach)
- **Progression read (Bill Hewitt, USA Football).** "No. 1, then No. 2, then running back; QB runs as the last option." Read No. 1 "just before the gather step on a three- or five-step drop". Hewitt also names the quick-game progressions "flat-to-slant, outside-to-inside, flat-to-stick" and the dropback ones "mesh-to-flat" and "corner-to-flat-to-middle". (Fetched page; wording as returned by the fetch tool.)
  https://blogs.usafootball.com/blog/7291/basic-knowledge-about-reads (STRONG)
- **Shallow cross needs a full drop.** Smart Football: the shallow "takes a full five-step drop", and the QB waits for the receiver to "cross the centerline". The slant, by contrast, is three-step. The back: "if neither is open the runningback should be open."
  https://smartfootball.blogspot.com/2009/06/shallow-cross-drag-and-drive-in-west.html (MODERATE)

