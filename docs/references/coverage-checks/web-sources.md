# Coverage checks and pattern-match adjustments: a reference for implementation

Compiled 2026-10-22 from web coaching sources. Each item is tagged:

- **[S]** the source states it (short quotes are in "..."),
- **[I]** I inferred or synthesised it (not stated by any one source),
- **[C]** sources conflict (the conventions are given side by side).

Source keys (full URLs are in section G):

- **SAB-ST**: Sportstreatise, "Saban Pass Coverages". A transcription of Saban's Alabama coverage manual.
- **SAB-TD**: Throw Deep, "Complete Guide to Nick Saban Coverages". Same manual, with a few extra calls such as Seahawk, Steeler, CC and Bracket.
- **KS-TD**: Throw Deep, "A Worthy Rival: Kirby Smart Defense". Georgia 3-4, Saban terminology.
- **PRU**: USA Football, "Defending 3x1 Formations with Jeremy Pruitt". Covers Stump, Stubbie, Clip, Cone and Connie.
- **USAF-RL**: USA Football, a high-school coordinator's Rip/Liz details (Cogan).
- **USAF-TN**: USA Football, Ted Nguyen, "How to understand Nick Saban's pattern match cover-3".
- **USAF-Q**: USA Football, "College Coach details Quarters coverage". Covers Cover 7 Box, MOD, MEG, Cone, Switch and Red 7 Switch.
- **BRO**: Brophy Football, "Nick Saban: Split Safety Coverage (Cover 7)".
- **ROSS**: Wesley Ross, "Defeating Cover 7 Stubbie and Stump".
- **MQ-***: MatchQuarters (Cody Alexander) pages. Mostly paywalled previews: Zeus/Stuff, Solo/Poach ("Three coverages"), Mike lock, bunch/quads, glossary.
- **RO**: The Read Optional, "The Book of Fangio Part II".
- **BULL**: Mark Bullock, "Washington Coverages Part 2: Quarters" and "Commanders man variations".
- **CC**: Coach & Coordinator, Rob Everett, "Read 2 Quarters vs 2 Removed".
- **YFO**: Youth Football Online, "Quarters coverage alignment and assignments".
- **GLZ**: Glazier Clinics pages (Sewell quarters alignment; Cassity Cover 3 curl/flat).
- **SVEC**: Jon Svec Substack posts (motion in man coverage, jet motion, quads). These are Canadian football.
- **AEDB**: All Eyes DB Camp posts (bunch point man; Cover 3 seams).
- **NGS**: NFL.com, "Next Gen Stats new advanced metrics, 2025".
- **REPO-BDB**: `/home/user/football-simulation-/data/bdb2025-summary.json`. It aggregates PFF coverage labels from the 2022 season, weeks 1–9.

Many primary pages are paywalled or returned 403 (Eleven Warriors, Bleeding Green Nation, X&O Labs, SteelersDepot, Arrowhead Pride, Daily Norseman). Where only a search snippet was available, the item says so.

---

## 0. Shared vocabulary and numbering (needed for every rule below)

- **Receiver numbering [S]**: count from the outside in, on each side of the ball. The back counts as #3 or #4 when he releases. Saban's "Final 3" means the third receiver to a side *after* routes distribute, which is often the back (USAF-TN: "third-closest receiver to the QB after route distribution"). The Mike "relates to #3 … on a fast 3 he makes a Push call, then finds the new No. 3" (USAF-Q).
- **Apex [S]**: "first underneath defender inside the CB, usually #2". **Hook [S]**: the second underneath defender, "run-first, keys the RB in 2x2" (SAB-TD).
- **Fast 3 [S]**: "#3 going directly to the flat after the snap (e.g., arrow, swing)" (USAF-RL; also USAF-Q).
- **"Under" [S]**: "inside, short, first 5 yards" (SAB-ST/TD).
- **"Short" for MOD [S]**: "breaks at ≤5 yards" (SAB-TD, KS-TD).
- **Saban's line of demarcation [S]**: "one yard inside the top of the numbers (10 yards from sideline). Outside it, the CB keeps inside leverage; inside it, outside leverage" (SAB-TD).
- **Divider (HS Rip/Liz) [S]**: varies with ball position (USAF-RL):
  - ball on the opposite hash: "5 yards inside the top of the numbers";
  - ball in the middle of the field: "1 yard inside the top of the numbers";
  - ball on the near hash: "bottom of the numbers".
  - Post-snap: if the receiver goes inside the divider, trail outside-low ("forces a higher throw"); if he goes outside it, play "inside and on top"; if he aligns on it, line up head up.
- **[C] Divider conventions**: Saban uses one fixed line, top of numbers minus 1. The HS Rip/Liz version moves the line with the hash. **[I]** For implementation, make the divider a function of ball y, deriving the HS version from the MOF safety's range. SAB-TD says the MOFS "covers 6 yards outside each hash".
- **Step counting [S]**: the corner "counts steps: by default, three steps with no shallow move means he mans the route" (USAF-Q, Box/MOD). The HS Rip/Liz overhang "Scootch" says "after 3 scootch steps, if #2 is still vertical, he is in the seam" (USAF-RL).

---

## A. Pre-snap formation checks by structure

### A1. 2x2 (open; slot/WR on both sides)

**Cover 3 match, Rip/Liz (Saban "3/6")** [S] (SAB-ST/TD; USAF-TN; USAF-RL)

- **Shell and rotation**
  - Start in two-high and rotate "about halfway by the snap".
  - "Rip/Liz: the safety's declaration of which side he is coming down." Rip means the right safety rotates right; Liz means left.
  - "3" sends the safety to the passing strength (Strong Apex); "6" sends the safety away (Weak Apex). "3 Buzz" and "6 Buzz" make that safety the Hook instead.
  - USAF-TN: against 2x2 the Star goes to passing strength and rotation is *away* from the Star.
- **MOFS**
  - SAB-TD: starts ~15 yards deep, "denies seams first, then posts", and eyes "#2 releases (or #2 and #3 in 3x1) before looking at the QB".
  - USAF-RL: aligns at 14 yards and pedals to 20, "melting toward the passer's first look". From a 2-high look he runs "at 45 degrees into the middle".
- **CB**
  - Man on #1. If #1 goes under (inside, short, first 5 yards), he yells "Under! Under!", zones the deep third and eyes #2 (SAB).
  - USAF-RL adds: a hitch or under by #1 gets a "Smash" or "Under" call; after the call, read #2 while keeping outside-trail position.
- **Apex (both sides)**
  - Man on #2. If #2 goes under in 5 yards, call "Under", zone the curl and rob #1.
  - He "drops to #3 only if he can't help on #1 (e.g., fade) or the QB is throwing to #3."
- **Hooks**: these are the only true zone players.
  - Eye the #1 and #2 releases while dropping ~10 yards inside #2.
  - "If both are vertical, take any #3 to their side." Otherwise defend the hook area deep to short.
  - Take crossers only if the deep hook is empty.
  - USAF-TN: the hook zone is "10 yards from the line of scrimmage and 2 yards inside the hash marks".
- **Overhang, HS Rip/Liz version (USAF-RL)**
  - Rule 1, "2 in the Seam": match #2 if he stays vertical, unless #1 draws a Smash or Under call.
    - On a Smash call: leave #2 and "Hunt 1" (get to #1's upfield hip).
    - On an Under call: "squeeze the under route to the hook defenders".
  - Rule 2, Fast 3: "Sail" technique; fight for width, not depth, then rally to the flat.
- **Hook, HS Rip/Liz version (USAF-RL)**
  - Rules are "Hook" and "Final 3 Through". If #3 checks to the flat, carry him there.
  - Weak hook "bingo" drop: read weak #2 for early in-routes. Otherwise push back toward the strong hook.
- **Skate (USAF-TN)**: same defense, but the star "moves inside No. 1 to his side instead of matching No. 2".
- **Pete Carroll Soft Sky (2x2 seam answer)** [S] (USAF Soft Sky)
  - A pre-snap "zebra" (seam) alert.
  - The down safety "removes the second seam", otherwise plays a regular hook.
  - The MOF safety shades 60/40 away from the down safety and "stays over the boundary seam".
  - Most often seen "against 2x2 … out of an over front, particularly versus an in-line tight end".
- **Alternative: Drop-8 "3 Flats"** [S] (AEDB): corners align inside #1 and play "between 1 and 2 in their deep 3rd", which robs the seam.

**Quarters, Saban Cover 7 ("7 X" sets the triangle vs 2x2)** [S] (SAB-TD; KS-TD; USAF-Q; BRO)

- **Call structure**: "7 X" puts triangle X on the 2-detached side and defaults to **Cut** on the 1-detached (TE/WR) side. "77 X" puts the same triangle on both sides.
- **MOD**
  - CB: press, man on #1 unless #1 breaks at ≤5 yards, then zone the deep quarter.
  - Apex: takes the first man to the flat and reroutes #2 if vertical.
  - Safety: takes all vertical #2; if #2 isn't vertical, brackets #1.
  - Hook: if the opposite call is Clamp, Cut or Switch, he takes the uncovered #3; otherwise he plays the hook area. If the opposite call is Mod or Box, he is man on #3.
- **Box**: MOD with a soft (off) CB. USAF-Q: inside leverage, with the safety in "robber technique (2-1 read)".
  - If #2 is up, the safety mans #3 with inside on-top leverage; if #2 goes in or out, he robs #1.
  - **[C]** This Box safety rule differs from SAB-TD's Mod safety ("all #2 vertical").
- **MEG**: same alignment as MOD, but the CB is "man everywhere he goes", with no Under or switch exceptions.
- **Clamp (2-read inside Cover 7)**
  - CB: soft, man on #1, except he takes #2 "if out in first 5 yards", or zones the deep quarter if #1 breaks ≤5.
  - Apex: man on #2, except when #2 is out in 5; then he relates to #3, and with no #3 he robs #1.
  - Safety: takes #1 vertical if #2 is out in 5; otherwise all vertical #2; if #2 isn't vertical, brackets #1.
- **Switch**
  - CB: press, man on #1.
  - Apex: man on #2, except he robs #1 if #2 goes out.
  - Safety: brackets #2, except he robs #1 if #2 runs under short; if #2 goes out, the safety is man on #2.
  - USAF-Q version: the CB "mans him unless No. 1 goes behind No. 2, then switches to No. 2". The Apex aligns 5 yards off and plays "inside-bottom trail" on #2.
- **Bracket**: CB man on #1, Apex man on #2, Safety brackets "the deeper of #1/#2" (SAB-TD; KS-TD).
- **CC**: soft CB and Apex with outside leverage on #1 and #2. The Safety brackets the first inside man; with none, he brackets #2 if vertical, else #1. The Hook is man on #3 (SAB-TD).
- **Smart's Georgia frequency order vs 2-detached** [S] (KS-TD): "Bracket, Switch, Clamp". Against WR+TE: "mainly Cut, some Mod".

**Generic quarters (Patterson/Narduzzi lineage)** [S]

- **Alignment** (GLZ Sewell): CBs "7 yds off or press" by divider rules. Safeties "10-12 yds from L.O.S.; inside a detached #2". Sam and Will in apex alignment vs a detached #2.
- **Safety alignment** (search snippet, X&O Labs): "two yards inside and ten yards deep on a normal spaced number two" and "two yards outside … on a tightly spaced number two".
- **Safety rule** (YFO): read #2. If #2 goes vertical "past a landmark … 5 yards", the safety has him man "wherever he goes". If #2 breaks before 5 yards, rob #1. With nothing to rob, look for a crosser from the opposite side.
- **Corner rule** (YFO): read #1. Past 5 yards, man him. If #1 breaks before 5, rob #2's out-breaking cut.
- **"Wall #2"** (BULL): if #2 is vertical, "wall him off from breaking inside, then peel off". If the corner calls a shallow cross by #1, carry it. If the corner calls a hitch, get to the flat and defend #1.

**Read-2 / Palms / Cloud vs 2 removed** [S] (CC table, "number two tells me what to do")

| Defender | #2 vertical | #2 out | #2 in |
|---|---|---|---|
| Corner | Over #1 | Under #1 | Under #1 |
| Overhang | Wall #2, look for #3 | Squeeze #2, eyes to #1 | Carry #2 |
| Safety | Over #2 | Over #1 | Over #1 |

- **Fangio's Cover 2 side** (MQ-Zeus): Palms means the "CB takes any flat route, the Safety climbs to #1's vertical, and the overhang 'Wall-2' player does not push to the flat unless #3 is to his side."
- **Trap** (Throw Deep snippet, search result): the CB aligns "7 yards off … 2 yards inside of the numbers" and reads #2. "Hammer" technique attacks any immediate out-breaker (bubble or arrow).
- **[C] CB leverage for Trap/Palms**: one coach uses outside leverage (because of bubbles); another uses inside leverage (to be over #1's vertical).

**Cover 2 / Tampa 2** [S] (search snippets; viqtory; NFP via snippet)

- **CB**: jam and reroute #1 inside. Then "sink to about 10-12 yards" (snippet) or "drops to a depth of 12 yards" to protect the 7/flag route. A "Sink call from safety" comes when #2 is vertical.
- **Safety**: "15-18 yards at your landmark — top of the numbers".
- **Tampa Mike**: "opens strong and runs with any inside vertical route by No. 2. If there is no vertical by No. 2, he drops to a depth of 15 yards."
  - Against 3x1, "the MIKE backer will carry the Y should he release vertically".
  - Tempo drop: "only sprint through the middle of the field if a receiver is threatening him".
- **Five-under spacing**: "evenly from 0-7 yards" (viqtory). This is a generic install guide, so treat it as weak evidence.

**Cover 1 (Saban)** [S] (SAB-ST/TD)

- CBs man on #1 with "a fast, full man turn". Apex man on #2 with outside leverage.
- **Hooks "Funnel"**: the near-side hook takes the RB if he breaks to his side; the far side becomes the **Rat** (eyes the QB, robs the middle, mirrors a scrambling QB).
- **Variants**: "1 Invert" (safety to the TE/slot side becomes Apex), "1 Funnel", "1 Clue", "1 Cross" (down safety robs "at the sticks"), "1 Alert" (safety to the FB flow side becomes Apex).
- **Bullock (Washington)**: "1-Plug/1-Hole" has an LB in the underneath middle who "steps up" on a crosser that beat the corner. "1-Robber/1-Rat" shows two-high pre-snap, then one safety drops to the post and the other steps up underneath.

**Cover 5 / 2-Man** [S] (SAB): man under in "Dog" ("play aggressive … trail verticals"), with the safeties in deep halves.

- **"5 Cougar"**: if #2 is out in 5, the Apex calls "Out! Out!"; the CB takes #2 and the Apex cuts #1.
- **"55"**: each safety brackets the most dangerous receiver to his side.

### A2. 2x2 with a nub or attached TE (closed side, one detached WR + TE)

- **Saban default to the 1-detached side is Cut** [S] (SAB-TD):
  - CB soft, takes the first man to the flat.
  - Apex: if #3 releases to his side, man on #2 on everything; otherwise man on #2, but rob #1 when #2 goes to the flat.
  - Safety: takes all vertical #1; if #1 isn't vertical, brackets #2.
  - Sub-calls:
    - **Alert Smash** (#1 hitch, #2 vertical): the CB bails under #2 and the Apex takes the hitch.
    - **Push Alert** ("minus #1 split, no offset back nearby"): the Apex takes #1 underneath.
    - **Tokyo** ("plus #1 split, no offset back nearby"): the CB takes #1 underneath.
- **Sky quarters vs a single removed WR with TE/tackle** [S] (X&O Labs snippet): "corners have all of #1 vertical and the Safeties have #2 vertical and out". The safeties key the EMOL for run/pass and become "the 8th and 9th defender in the box".
- **Box apex vs an attached #2** [S] (USAF-Q): "If No. 2 is attached to the formation's core, he aligns 3x5 outside."
- **Zone Open / Zone Alert (Cover 3)** [S] (SAB): "Zone Open" brings down the safety away from the TE side. With a TE and slot in 2x2, he becomes the strong Hook. "Zone Alert" brings down the safety to the FB/H-back flow.
- **Fangio weak-side "Patty"** [S] (MQ-Zeus): "assigns a single WR to the LB, who is responsible for the RB to the flat". It appears on the Cover 2 side of Stuff and 8.
- **Georgia 4 Man** [S] (KS-TD): Mod rules with the CB man on #1, "used against TE/flanker, especially in short-yardage or red zone".

### A3. 3x1 open trips (three detached to one side, single WR backside)

**Cover 3 match vs 3x1: Mable / Skate** [S] (SAB-ST/TD)

- "Mable" means the safety drops to the passing strength (the trips side); "Skate" means away. Assignments are the same either way.
- **Strong CB**: bail to the deep third; man on vertical #1; "if #1 isn't vertical, take vertical #2".
- **Strong Apex**: man on #2, unless #2 goes under (then buzz to the flat). If #2 goes outside, cut underneath.
- **Strong Hook**: takes #3 if he goes outside. If #3 comes inside, push to the hook and take #2.
- **Weak Hook**: defends inside and deep crossers by #3. If #3 goes out, push to the hook.
- **Weak Apex**: man on the RB if he flows weak. If the RB stays or flows strong, cut the first crosser.
- **Weak CB**: MEG.
- BRO adds that "3 Buzz Mable" is a "man-match banjo, with the safety dropping into the hook area and Will expanding as the force player". It "also applies to 2-back strong flow". It is triggered when #4 flows strong.
- **[C] Glossary definition of Mable**: MQ glossary has Mable as "pushes coverage strong and plays man-on-man on the backside receiver", which is consistent. USAF-TN's 3x1 "skinny" version:
  - backside CB man;
  - FS takes the RB to his side or the first crosser;
  - SS has the deep third;
  - trips CB has the deep third;
  - Sam pushes to #2;
  - Mike pushes to #3 and carries him if he crosses.

**Fire zone vs 3x1 (Saban)** [S] (SAB): the Hook drops to the 3-man side and takes all #3 vertical. If #3 goes out, the Hook takes #2 man. The Apex walls #2 inside; if #3 goes out, the Apex takes #3 to the flat and "pass[es] #2 to Hook".

**Cover 1 vs 3x1** [S] (SAB): Strong Apex man on #2 (outside leverage); Strong Hook man on #3 (outside leverage); Weak Hook and Weak Apex Funnel the RB.

**Quarters family vs 3x1: the named checks** [S] (SAB-TD unless noted). The default is "Triple [box call]", and **Stubbie is the default vs all 3x1** (SAB-TD; BRO).

- **Stubbie**
  - CB: press, MEG on trips #1.
  - Strong Apex: man on #2, except man on #3 if #3 goes out, or zone off if #2 runs under.
  - Hook: matches any crossing #2/#3 under; otherwise "walls #3 inside and takes him to safety if vertical".
  - **Safety: "takes all vertical #3; if #3 isn't vertical, bracket/take #2 if vertical."**
  - Weak Apex depends on the backside call. With MEG, Cone, Dog or Tuff he takes weak #2, else the first crosser. With Cut, he is man on #2, except he robs #1 when #2 goes out.
  - ROSS: the nickel is "outside technique on #2 and responsible for #2 vertical"; the SS "responsible for #3 vertical. If #3 runs in or out, he tops #2"; the Mike "takes the first inside route out of #2/#3 … never carries #3 vertical".
  - PRU: "The star has all of No. 2 unless No. 3 runs to the flat or No. 2 runs under." Weakness: "Four verticals. It's hard for the star to carry No. 2 vertical from outside leverage."
- **Stump / Stomp**: Stubbie with Smash built in.
  - PRU Stump: the corner plays "1x8" (8 yards off, 1 yard inside or outside by divider) and takes #1 unless #1 is "short", in which case he zones the quarter.
  - The Star aligns 1 yard outside and 6 yards off #2 and "plays flat unless Nos. 1, 2, and 3 all run verticals".
  - The SS aligns 10 yards off, head up on a flexed #3, and takes #3 vertical, "if not, he doubles No. 2 from the inside".
  - The trips ILB "Poster" posts #3 at 5–7 yards.
  - ROSS: on a route by #1 under 5 yards the corner calls "under", the nickel takes #1, and the corner "sinks to help on #2 vertical".
- **Zeke**
  - CB: MEG.
  - Strong Apex: first OUT of #2/#3 (else man on #2).
  - Hook: first IN of #2/#3 (else man on #3).
  - Safety: deep half.
  - BRO frames this as an LB banjo: "OLB takes the first out route, the ILB takes the second out… For inside routes, the ILB takes the first, and the OLB takes the second."
- **In-Out**: CB takes the first man to the flat. Apex and Hook as in Zeke. Safety plays a deep half and always takes #1 vertical.
- **Seahawk** (SAB-TD)
  - CB: MEG from off/inside.
  - Strong Apex: jams #2 and plays the first out of #2/#3.
  - Hook: cuts off #2 if #3 goes out, else man on #3.
  - Safety: brackets the deeper of #2/#3, or "midpoints both" if both are vertical.
- **Steeler** (SAB-TD): CB man #1, Apex man #2, Hook man #3, safety in a deep half "midpointing verticals". Used "as an empty check, blitz bluff, or weak-side blitz cover".
- **Trio, Georgia red zone** (KS-TD)
  - Strong CB: MEG.
  - Strong Apex: first out of #2/#3; if none, #2 vertical; else zone curl.
  - Hook: first in of #2/#3; if none, #3 vertical; else zone hook.
  - Strong Safety: "second in/second out of #2/#3. If none, zone deep, splitting #2 and #3."
- **Palms (full field vs 3x1)**
  - Strong CB, Apex and Safety play Clamp.
  - Hook: man on #3, unless #3 goes under (zone curl) or runs a deep cross (trail, with the weak safety helping).
  - Weak Apex: man on weak #2 or the strong RB, else the first crosser.
  - **Weak Safety: poaches vertical #3; if none, poaches backside #1 vertical.**
  - Weak CB: MEG.
- **Clip (full field)**
  - Strong CB: first man to the flat.
  - Strong Apex: Cut rules.
  - Hook: man on #3, except he zones the curl when #3 is out, or carries #3 to the weak safety on a deep cross.
  - Strong Safety: all #1 vertical, else brackets #2.
  - PRU Clip details:
    - SS no wider than "2 yards outside the hash (18 yards from the sideline)", and "doesn't need to handle No. 1 until 16 yards downfield".
    - The Star ("cut") aligns at an apex halfway between #2 and #3 and takes #2 man if #2 is vertical or runs under. If #2 goes out, he looks to #1 on a curl or dig.
    - The trips ILB does the same on #3; if #3 goes to the flat, he cuts #1.
- **Solo / Poach / Steal (Narduzzi/Michigan/Fangio lineage)** [S] (MQ "Three coverages"; MQ-Zeus)
  - The backside (deep) safety keys #3. "If #3 goes vertical, the DS takes him man-to-man." If not, "the DS works to close the post ('Fox')".
  - The frontside CB, Sam and CS triangle plays Sky (quarters) or Cloud (2-read) over #1/#2 "depending on the split".
  - Backside CB: MEG. "Weakness: The boundary CB must handle the single WR alone."
  - **Solo vs Poach**: in Solo the safety "uses cheat steps into the middle of the field"; in Poach "he stays in his base alignment and reads".
  - **Poach vs Y-off (TE #3)**: if the TE goes to the flat or blocks front side, the BS plays like Sky and sits on the hash. If the TE crosses (split zone/counter), the BS sinks to the box edge as force. If the TE goes vertical, the BS takes him as in Solo.
  - **Steal (Michigan)**: the BS slides to the middle flat and reads crossers. An "Under" call on a shallow TE cross makes the BC "climb to the near hash and push the Steal safety to the next man".
- **Special (Fangio/MQ usage)** [S] (MQ-Zeus): "the Trips-side CB 'lock[s]' on #1 (MEG). The Ni, Safety, and LB play a Cloud concept over the other two WRs." This is functionally Stubbie.
  - **[C]** Heacock uses "Special" for the base 3-high-safety package (MQ glossary). Treat Special as a system-specific name.
- **Stress** [S] (MQ trips episode preview): "MOD Sky stretched across three WRs". No further detail is free.
- **Fangio Cover 6 / Stuff and Cover 8 / Trix vs 3x1** [S] (RO; MQ-Zeus; MQ Cover 8)
  - **Cover 6** (base) or **Stuff** (nickel): quarters to the passing strength, halves away. It clouds or brackets the isolated X.
  - **Cover 8** ("Penny Sam 8"): halves to the passing strength, "common against 3x1". A cloud CB over #1, nickel and LB on "zone match rules", one safety in a deep half, and "a Trix safety" to give "five defenders over three receivers".
  - Weak Safety in Cover 8: "can 'poach' the front side versus 3x1 or play vision".
  - **Trix vs 3x1 (RO)**: "backside safety reads the releases of the 3 and 2 receivers to the trips side for verticals or deep crossers, matching 3 on 3 against 4 verticals". The LB has the RB in man and the backside CB is locked. With no vertical threat, the safety can zone the quarter or "hang in the window to rob an inside-breaking route from the backside X".
  - **[C] What Trix is**: RO calls Fangio's Cover 4 "Trix". MQ treats "8 or Trix" as Cover 2 to the passing strength (nickel side). The MQ glossary defines Trix as "a split-safety tool for the weak side of a 3x1 … safety to help on the #3 vertical". **[I]** The constant across all three is a backside safety helping on trips verticals or crossers while the backside CB is locked.
- **Backside (single-WR side) calls vs 3x1** [S] (SAB-TD; PRU; ROSS)
  - **MEG**: CB man on #1, no exceptions ("wide #1 split").
  - **Dog**: CB trails with deep-half help over the top.
  - **Cone**: the CB plays #1 short and outside, the safety plays #1 deep and inside. Use it when the split is "slightly compressed" or the receiver is dangerous.
    - PRU: CB "slightly outside leverage … If X releases outside, it's man-to-man. If he releases inside, the corner and free safety double him."
    - USAF-Q: if #1 runs a sneak or cross to the field, the safety robs and mans #1 and the corner bails into MOD rules.
  - **Connie** (tight X split): "Corner takes the first outside route, will takes the first inside route" (ROSS).
  - **Tuff**: the safety takes the first man to the flat and the CB takes the first to the deep third. With no #2, the safety robs #1 underneath.
  - **Cut**: the Apex cuts #1 underneath inside and the safety brackets over the top.
  - Backside Will/ILB: man on the RB. If the RB blocks, he joins the pressure (USAF-Q Cone) or plays crossers.
  - **[C] What Cone is**: MQ's glossary says Fangio's Cone is "a bracket doubling #2 with Nickel outside and Safety inside", which differs from Saban's single-WR Cone. **[I]** "Cone" generally means an outside-short/inside-deep bracket applied to whichever receiver is named.

**Saban one-high with a 3x1 back offset** [S] (RO, Fangio Cover 9 "site adjustment")

- Against 3x1 with the RB away from trips, the down safety rotates to the RB side.
- If the back is unlikely to release, the LB takes the back and the safety becomes the "3-up" (#3 vertical / crosser) player.
- If the back is a real pass threat or goes fast to the flat, the safety takes the back and the LB plays 3-up.

### A4. 3x1 closed / TE-trips (TE is #3) and nub

- **Poach vs Y-off** (above): a TE #3 changes what the BS keys.
- **MQ "Mike lock"** [S]: in base 3x1 the Mike is "capped" by the quarters safety expanding over him. When splits are too wide to cap him, he must "Find your three!"
  - **Taser** (a Cover 2 family tag) "matches the Mike on #3 and locks him". It is used vs "#3 WR attacks and Y-Empty sets where the TE is #3, including RB pop-motion out of the backfield".
  - **Solo** there: the BS makes the call, "locking the backside CB and reading the TE's departure". If the RB pushes, "the Mike and Will can trade him".
- **Nub TE** [S] (MQ "Three coverages"): Solo is best "against crossing routes, or when the offense ignores backside reads … nub-TE formations on primary passing downs".
- **PRU Stump SS vs an attached TE**: "10 yards off and 2 yards outside an attached TE".

### A5. Empty 3x2 and 4x1 / quads

- **[S] X&O Labs survey** (snippet): with five receivers and four DBs, "another skill player, usually the Mike linebacker" must match #3. "32.9 percent of coaches will play Quarters coverage to both sides … and have the Mike LB carry #3 vertical."
- **[S] Saban "Steeler" as an empty check**: man #1/#2/#3 to the 3-side, with a deep-half safety midpointing.
- **[S] Saban vs #4 in the slot**: "If #4 aligns in the slot, MEG is adjusted to MOD by the corner" (BRO). The "Money" (dime) aligns "to the #4" (SAB-TD).
- **[S] Fangio "Quads" (4)**: quarters to both sides (MQ glossary/Zeus). Quads is also "possible adjustments".
- **[S] SVEC quads options** (Canadian, with no per-player rules):
  - "two over one to the boundary": two defenders on the single receiver, with the extra one free to cross-read, bracket or blitz;
  - "boundary half travels to field", which leaves 1-on-1 to the boundary;
  - a light 5-man box.
- **[S] Quads bunch (MQ)**
  - Man: "Lock-n-Level (C1)", where each defender locks and plays at a different level; or "Traffic (C0)", which mans the point and banjos the other two.
  - Zone: "Box" out of quarters with "DBs work straight back … as if on rails".
  - Box weakness: the CB is out-leveraged inside. When #3 is pushed to the flat, "the Sam must expand and the Mike must stay disciplined against the #2 inside seam."
  - Bingo read: "If 'one stays one,' play Bingo, expecting a Spacing or Flood concept."
- **[S] Fangio "Push" (Orlando)**: "tells the Will to shift to the trips side (4x1 sets)" (MQ glossary).
- **[I]** Common thread: in 3x2 empty, run quarters/MOD to the 2-side and Stubbie, Steeler or Mike-on-#3 to the 3-side. In 4x1, either push the Will or bring the backside safety over and leave the X on MEG.

### A6. Bunch / compressed and stacks

- **Box (zone)** [S]: "the bottom two defenders play the first inside and outside breaking routes, and the top two defenders play the second inside and outside breaking routes" (search synthesis of NFP/MQ).
- **Banjo / point (man)** [S] (AEDB): "get aggressive on the point with an inside shade"; "play banjo vs. the two remaining off the ball players". Force the point man inside into a "phone booth".
- **Banjo failure mode** [S]: "If all three receivers break the same way, the rules break down" (trail concept).
- **Stack/bunch "Under" check** [S] (MQ glossary): "a pre-snap check against stack or bunch formations". "Box" is also listed as a check against bunch.
- **Cover 7 vs stacks** [S] (USAF-Q Switch): open-field "Switch" with #2 on the ball. The CB "mans him unless No. 1 goes behind No. 2, then switches to No. 2."
- **Same-side stacks in man** [S] (SVEC): the options are "LOCK" (simple, but leverage is hard and it tips man) or "SWITCH" (better disguise and leverage, but "Any mistakes on the SWITCH could result in an uncovered Receiver").

### A7. 2-back / heavy (21, 12, 22)

- **[S] Saban "Under Front (21/12)"** (KS-TD): uses "1 Alert" (Cover 1 Robber) and "3 Alert" (Cover 3 match). The down safety to the FB/H-back side comes down to the apex; if the FB stays, the safety to his side comes down. Vs 2-detached: Mod or Bracket there, Cut opposite.
- **[S] "3 Buzz Mable" applies vs 2-back strong flow** (BRO).
- **[S] Georgia Cover 0 vs heavy / red zone** (KS-TD): "Second safety comes down for a 3-on-2 funnel: two safeties and the remaining ILB take TE and RB by flow; third player is the robber in the hole."
- **[S] Sky quarters vs TE+removed WR**: the safeties are the 8th and 9th box fitters (above).
- **[I]** Heavy personnel pushes coaches toward safety-force calls (Sky, Alert) and fewer pure two-high match calls. No source gave explicit 22/13 coverage rules.

### A8. Split-width effects (stated)

- **Saban corner leverage**: the line is 1 yard inside the top of the numbers. #1 outside it means inside leverage; #1 inside it means outside leverage.
- **Plus or minus split with no nearby offset back**: Tokyo means the CB takes #1 under on a plus (wide) split; Push Alert means the Apex takes #1 under on a minus (tight) split.
- **Tight split**: Cone or Connie on a tight backside X; MEG on a "wide #1 split" (SAB-TD; ROSS).
- **Quarters safety width**: 2 yards inside a normally spaced #2, 2 yards outside a tight #2.
- **Clip SS width**: hash + 2 (18 yards from the sideline), cheating to hash + 4 once the CB moves inside #1 (PRU).
- **MQ**: the triangle uses Sky or Cloud "depending on the split". Mike cannot be capped when splits are wide.
- **Fangio Cover 8 / quads**: no explicit split rules were available.

---

## B. Pre-snap motion and shift adjustments

**Man answers**

- **LOCK / travel** [S] (SVEC; MQ glossary "Lock … commitment to one receiver with no exchanges")
  - The defender follows his man across the formation.
  - Track technique: "stay on the Back Hip of the Receiver" to prevent a cutback.
  - It tips man coverage. An NGS-derived study notes that a "cornerback tracking a motioning receiver across the entire field may point to man-to-man", and CB random effects show "cornerbacks exhibit strong tendencies to follow receivers" (arXiv 2602.10784).
- **SWITCH** [S]: same-side or across motion causes defenders to trade receivers. This needs communication.
  - Failure case: a motioned receiver returned to his original spot "and the DBs switched without switching back" (SVEC comment).
- **BANJO** [S]: "Two defenders key the same back and determine man responsibility from his release" (MQ glossary/Venables). It is also the bunch/stack switch technique.
- **Rock & Roll** [S] (Orlando, MQ glossary): a safety exchange on motion, "where the post safety takes the motion player man-to-man".
- **"Roll It"** [S] (Cover 1): "a linebacker take[s] a back or TE motioning to the split end side."
- **Spin** [S] (Cover 1): "Safeties exchange responsibilities on motion across the formation."
- **Bump** [S]: "an alignment shift to keep leverage against motion". In Gregg Williams' system, "shifting coverage responsibility one man over".

**Zone answers to jet/orbit/across** [S] (SVEC "Defensive Reactions to Jet Motion"; Canadian)

1. **Track**: the boundary half (S/CB) follows the jet. It is simple, but it isolates the boundary CB.
2. **Rotate (Spin)**: "The Free Safety moves down toward the Jet side, and the Boundary Half goes high to replace him." This disguises better but needs communication.
3. **Bump**: the Sam bounces out to the jet and the LBs each shift one gap.
4. **Do nothing**, or play the quads adjustment if time allows.

**Motion that changes the structure**

- **[I]** Rules recompute from the final formation: 2x2 to 3x1 triggers the 3x1 check (Stubbie, Poach, Mable). Sources describe checks keyed to formation; SVEC says defending the "final formation" is the principle (MQ jet video outline: "How to defend the 'final formation'").
- **Saban Cover 7 vs a #4 back flowing strong** [S]: "3 Buzz Mable" (BRO).
- **Saban Cover 7 vs a fast #3** [S]: the Mike makes a "Push" call and finds the new #3 (USAF-Q).
- **Taser vs RB pop-motion out of the backfield to Y-empty** [S] (MQ).
- **[I] Rip/Liz under motion**: the declaration of the rotation side is made late ("about halfway by the snap", SAB-TD), so the rotation follows the final strength. No free source gives an explicit Rip/Liz motion rule. The Coachtube and Throw Deep "Rip/Liz adjustments" courses are paywalled.

**Back motion out (back becomes #3 or #4)**

- **[S]** Fangio Cover 9 "site adjustment" (RO): who takes the back depends on whether he is likely to release. If he releases fast, the safety takes him and the LB plays 3-up.

**Disguise and rotation**

- **[S] NGS 2025 definition**: "If a defense shows split-safety zone and rotates to single-high man (or spins to Cover 0), we flag it as disguised."
- **[S] Saban**: "safeties rotate late (about halfway by the snap)."
- **[S] Fangio**: Cover 8 "aligns almost identically to his Cover 9 base". The two-high shell makes "the first seconds look the same across Cover 6, Cover 8, Quarters (Quads), and Cover 9" (MQ). Post-snap rotation goes "from an MFO look to an MFC look."
- **[S] Staley Rams 2020** (Ferraiola snippet): "Cover 1 or Cover 3 variants on about half of coverage snaps despite two-high alignments", and Cover 6 on ~17% of snaps.

---

## C. Post-snap pattern-match calls

| Call | Trigger (receiver action / depth / timing) | Who reacts | Response | Source |
|---|---|---|---|---|
| **Under** (Cover 3 / MOD) | #1 (or #2) goes inside and short in the first 5 yards, called "within the first five yards" | CB calls it, Apex/overhang hears it | CB zones the deep third or quarter and eyes #2 (or helps on #2 vertical); Apex comes off #2 and squeezes the under route toward the hooks, or takes #1 (Stump). In Cover 7 Box, Under tells the Apex to man #1 | SAB; USAF-TN; USAF-RL; USAF-Q; ROSS |
| **Smash** | #1 hitch/stop short while #2 goes vertical | CB calls it | Overhang leaves #2 and "Hunt 1" (upfield hip); CB bails under #2 / "accelerate[s] to cover the flag". Saban "Alert Smash": CB bails under #2, Apex takes the hitch | USAF-RL; USAF-TN; SAB-TD |
| **Out / Cougar** | #2 out "in 5 yards" | Apex calls "Out! Out!" | CB takes #2, Apex cuts #1 (Cover 5 Cougar). In Clamp/Palms the CB takes #2 and the safety takes #1 vertical | SAB |
| **Push** | Fast 3 (back straight to the flat), or #3 out | Mike/Hook calls it | Each defender shifts one receiver over: Mike to the new #3, Hook to #2, Apex to #3 in the flat. Also "Push Alert" (Cover 1 post-snap exchange vs crossers/stacks) | USAF-Q; SAB (Mable); MQ glossary |
| **Wall #2** | #2 vertical | Apex/nickel | Wall him from breaking inside, then peel (quarters). Cover 3 apex "catch technique", inside reroute: "up or out" means man, inside means zone off to the curl | BULL; AEDB |
| **Carry / Robot** | Crossers; Y-cross dig | Mike/Hook | Carry #3 through to the flat on a check-release. Robot: "MIKE linebacker … cover a dig route on a Y-cross play"; vs mesh, "Both hooks robot on the under call and end back in the hook"; 49ers note LBs "robot (roll over and back) to locate the crossing route" | USAF-RL; MQ glossary; search snippet |
| **Cut** | Shallow crosser / #2 out | Rat/Apex/inside defender | Cut the first crosser (Rat), or the Apex cuts #1 when #2 goes out (Clip/Cut/Cougar). Fangio "Cut" = bracket doubling #1 | SAB; MQ glossary |
| **Switch / Banjo** | Stack/bunch release, or #1 going behind #2 | CB/Apex pair | Trade receivers by release: first out / first in; CB switches to #2 when #1 goes behind him | USAF-Q; BRO (Zeke) |
| **Zeke / In-Out** | First out vs first in from #2/#3 | OLB/Apex and ILB/Hook | Apex takes the first out, Hook the first in; the second out or in goes to the other defender | SAB-TD; BRO |
| **Poach / Solo / Fox** | Trips #3 vertical (Solo/Poach), else close the post | Backside safety | Man #3 over the top; otherwise close the post or rob the backside dig | MQ |
| **Wheel** | #2 out then up | Safety warns the CB | Safety makes a "Wheel" call ("the Out and Wheel of 2"); in Cover 3 "the flat defender takes a wheel route" | search snippet; USAF-TN |
| **Sink** | #2 vertical in Cover 2 | Safety calls it to the CB | CB gains depth under #1's 7 route | snippet ("Sink call from safety") |
| **Squeeze** | Cover 2/quarter-flat | Overhang/CB | "corner plays the flat from inside leverage on #1, and the deep-half safety handles #1 vertically". Read-2: if #2 goes out, the overhang squeezes #2 with eyes to #1 | MQ glossary; CC |
| **Rail** | One-back sets, four-verts alert | Cover 3 | "a Cover 3 call against 1-back sets to alert for four vertical routes" (Gregg Williams); "rail" also names a read-#1 technique (Kathy) | MQ glossary |
| **China** | Cover 2 corner underneath responsibility | CB | "Cover 2 responsibility for cornerbacks, who play underneath routes" (Venables) | MQ glossary |
| **Trix** | 3x1 verticals/crossers | Backside safety | Read #3 and #2 for verticals or deep crossers; otherwise rob the backside dig | RO; MQ |
| **Patty** | Crossers | All | "coverage alert against crossing routes, telling defenders to pass them off" | MQ glossary |
| **Hinge / Deliver / Collision** | (not found as defined calls) | | "Collision" appears as "collision & carry #2" (HARD technique) and "OLB looks to collision #2 and get eyes on #1" (Scribd doc). No free source defined Hinge or Deliver. **[I]** Treat Deliver as "zone off / pass to the next defender" (functionally Push/Under) | MQ glossary; snippet |

Additional post-snap specifics:

- **Count drops before declaring vertical** [S]: the CB's 3 steps "with no shallow move" means man (USAF-Q). The overhang's "3 scootch steps" declares a seam (USAF-RL).
- **Final 3 / bingo** [S]: the strong hook floods to a Fast 3 and expands to the curl, "pushing to the low, inside hip of #2". The weak hook reads weak #2 for early in-routes, else pushes back toward the strong hook (USAF-RL).
- **NCAA (levels)** [S]: the Hook takes the Under call, rolls to the middle looking for the dig and matches bottom-up. The opposite hook zones and matches the final 3 (USAF-RL).
- **Mesh** [S]: "Double under". The CF squeezes back to the hook and takes double drags from the opposite side (USAF-RL).
- **Cover 3 curl/flat spot-drop alternative** [S] (GLZ Cassity): "Initial aiming point: 12 yards, top of numbers". Read QB shoulders, not routes, and break to the flat when the "shoulders cross the defender's face". Underneath defenders use a "five-yard no-cover zone" to let routes distribute.
- **Seam ownership** [S] (snippet): "seam … 3.5 yards wide by 12 yards deep". One coach also defines the seam as "2 yards outside the hash to 2 yards inside of the numbers".

---

## D. Situational / game-plan checks

**Red zone** [S]

- **Saban "Red 7 Switch"** (USAF-Q):
  - Corner: "slow-bails to define No. 1's release".
  - Apex: mans #2 up or in; if #2 goes out, cuts #1.
  - Safety: mans #2 up or in; if #2 goes in, robs #1.
- **Georgia** (KS-TD):
  - "Trio" (3x1 red-zone box with first-in/first-out matching);
  - "Switch (short-yardage and red zone)";
  - "4 Man" (TE/flanker, short-yardage/red zone);
  - Cover 0 with a 3-on-2 funnel ("short-yardage and red zone").
- **Fangio**: "Cover 4 … Used in its purest form in the red zone" (RO). Bullock calls quarters "effective in the red zone".
- **Podcast summary** (unverified): match quarters "drops from 22% in the high red zone to nearly zero" inside the 10, "replaced by cover zero and bracket concepts". The red zone is split into a high zone (25 to 15) and a low zone (14 to 5).
- **PFF labels in REPO-BDB** (2022 weeks 1–9):
  - red zone (6–20, n=1718 plays): Cover-1 23.9%, "Red Zone" 21.5%, Cover-3 18.3%, Quarters 13.6%, Cover-0 7.3%, Cover-2 4.2%.
  - goal-to-go ≤5 (n=629): Cover-0 33.6%, "Red Zone" 26.7%, Goal Line 16.7%, Cover-1 15.9%, Cover-3 4.9%.
  - **[I]** Cover 3 collapses near the goal line and man/zero rises, consistent with the coaching sources.

**3rd down and the sticks** [S]

- Zimmer's Vikings had "safeties … planted at or just behind the first down markers" (PFF snippet).
- The Schwartz Eagles "picket fence": everyone back at the sticks, rally and tackle short (Inquirer snippet).
- "Sticks/Pressure" package was up to "80% of his 3rd & Long calls" (X&O Labs snippet).
- **REPO-BDB, 3rd/4th-long** (n=1352, 92.7% pass): Cover-3 25.8, Cover-1 23.1, Cover-2 15.2, Quarters 12.7, Cover-6L 5.0, 2-Man 4.5. Offense EMPTY on 19.2%.
- **REPO-BDB, 3rd/4th-medium** (n=935): Cover-1 43.1, Cover-3 16.4, Cover-2 13.7, Quarters 7.2, Cover-3 Seam 4.4, Cover-0 3.9.
- **REPO-BDB, 3rd/4th-short** (n=672): Cover-1 39.1, Cover-3 31.3, Cover-2 8.0, Cover-0 7.7.
- Saban's "1 Cross" has the down safety rob "at the sticks". Fangio/Graham weak-rotation Cover 3 uses a "3-Up" safety backstop to "eliminate intermediate crossers" on 3rd down (MQ preview).

**Early downs** (REPO-BDB)

| Down | Cover-3 | Cover-1 | Quarters | Cover-2 | Cover-6 L+R |
|---|---|---|---|---|---|
| 1st (n=6098) | 39.9 | 15.8 | 14.9 | 12.2 | ~9.7 |
| 2nd-long (n=2895) | 29.1 | 18.1 | 15.2 | 15.4 | ~12.4 |

**Backed up / two-minute**: no usable source was found; only video-game guides turned up. **[I]** Typical teaching is deeper landmarks, inside-out leverage to keep the ball in bounds and in front, and more Cover 2 and quarter-quarter-half. Treat this as unsourced.

**Field/boundary split-field** [S]

- Patterson-style coverage is "splitting fronts from coverages, with different coverages in each half of the field" (search snippet).
- Fangio puts "Cover 2 and Quarters on different sides to leverage their best or most dangerous receiver" (MQ). Cover 6 clouds the boundary X.
- **[I]** The rule of thumb: Cover 2 or Cloud to the boundary or nub side, quarters or 2-read to the field. Calls are set per side by the receiver count (2-detached triangle vs 1-detached Cut/Cone).

**NFL frequency context** [S]

- Man rate: 2023 league ~24% (2022 24.3%, 2021 27.9%, 2020 30.8%) per Fantasy Points. PFF has 33.9% for 2019–21.
- The BDB-labelled study had 2980 zone vs 983 man plays, ~75/25 (arXiv 2602.10784).
- FiveThirtyEight (2022): two-high was 34.2% of early-down snaps (vs 25.1% in 2016); single-high fell from 56.2% to 52.7%.
- **No free source gives coverage by receiverAlignment (2x2/3x1/empty).**
  - BDB 2025 `plays.csv` has `receiverAlignment` (values 1x0 … 3x2), `pff_passCoverage` and `pff_manZone`.
  - `player_play.csv` has motion flags.
  - A crosstab is the way to get this number. The repo summary currently aggregates coverage only by down-distance.

---

## E. Numeric thresholds stated by sources

| Threshold | Meaning | Source |
|---|---|---|
| ≤5 yd / "first 5 yards" | #1 short → MOD corner zones off; #2 "out in 5" → Clamp/Palms corner takes #2; "Under" window | SAB-ST/TD; KS-TD; BRO ("will not take #1 on anything under 5 yards") |
| 5 yd landmark | Quarters safety takes #2 vertical past 5; corner takes #1 past 5; else rob | YFO |
| 3 steps | CB counts 3 steps with no shallow move → man; overhang "3 scootch steps" → seam | USAF-Q; USAF-RL |
| 5–7 yd | Stump trips ILB posts #3 | PRU |
| 6 yd off / 1 yd outside #2 | Stump Star alignment | PRU |
| 1x8 | Stump corner: 8 off, 1 in/out by divider | PRU |
| 7 yd off | Quarters CB depth; Trap CB "7 yards off, 2 yards inside of the numbers" | GLZ; Throw Deep snippet |
| 10 yd | Hook drop "~10 yards inside #2"; hook zone "10 yards … 2 yards inside the hash"; Stump SS 10 off #3; quarters safety 10 (2 in/2 out of #2) | SAB; USAF-TN; PRU; X&O snippet |
| 10–12 yd | Quarters safety depth; Cover 2 CB sink | GLZ; snippet |
| 12 yd | Tampa 2 CB drop; Cover 3 curl/flat aiming point "12 yards, top of numbers"; seam box 12 deep | snippets; GLZ |
| 14 → 20 yd | HS Rip/Liz MOF safety align 14, pedal to 20 | USAF-RL |
| ~15 yd | Saban MOFS drop; Tampa Mike drop if #2 not vertical | SAB-TD; snippet |
| 15–18 yd | Tampa 2 safety depth, top of numbers | snippet |
| 16 yd | Clip SS needn't handle #1 until 16 downfield | PRU |
| 6 yd outside each hash | Saban MOFS range | SAB-TD |
| hash+2 (18 yd from sideline) | Clip SS max width, hash+4 when CB inside #1 | PRU |
| 1 yd inside top of numbers | Saban leverage line | SAB-TD |
| 5 in / 1 in / bottom of numbers | HS divider by ball position (opp hash / MOF / near hash) | USAF-RL |
| 60/40 | Soft Sky MOF shade | USAF Soft Sky |
| "halfway by the snap" | Saban rotation timing | SAB-TD |
| 0–7 yd | Cover 2 underneath spacing (generic) | viqtory |
| 5-yd "no-cover zone" | Cover 3 underneath let routes distribute | GLZ Cassity |

**[C] Carry depth for an apex/wall player handing #2 to a deep defender**: no source gave an exact "carry #2 to 12". The stated values are:

- the curl/flat 12-yard aiming point;
- the seam box 12 deep;
- Clip "16 yards";
- the Tampa Mike carrying the inside vertical with a 15-yard default drop.

**[I]** Hand-off depths of 10–12 for an apex walling #2 and 15–18 for a Mike carrying the pole are consistent with these.

---

## F. Conflicts between systems (summary)

1. **MOD**
   - Saban/Smart: "man on #1 unless #1 breaks at ≤5 yards" (SAB, KS-TD).
   - Fangio: "Man Only Deep … no coverage of routes under 5 yards" (MQ glossary).
   - Generic Cover 4 usage: "Man on Demand".
   - BULL also says "man on demand". The Reddit snippet says "Man On Deep".
   - **[I]** Behaviourally they are the same: man on #1 unless #1 declares short.
2. **MEG**
   - Saban: CB man "wherever he goes", no exceptions.
   - Heacock: "UP OR OUT" responsibility.
3. **Cone**
   - Saban/Pruitt: CB short-outside plus S deep-inside on the backside single WR.
   - Fangio (MQ glossary): a bracket on #2 with the nickel outside and the safety inside.
4. **Trix**
   - RO: Fangio Cover 4.
   - MQ: Cover 8, halves to the nickel side.
   - Glossary: a backside safety tool helping #3 vertical.
5. **Stuff / 6 / 8**
   - Saban: "6" = weak-rotation Cover 3.
   - Fangio: 6 = quarter-quarter-half (Stuff in nickel), 8 = half to the strength, 9 = weak-rotation Cover 3.
   - BRO's Saban list: "Cover 6: 3 deep, 4 under, with a weakside rotation; Cover 8: quarter-halves".
6. **Special**
   - Fangio/MQ: trips CB MEG plus Cloud over #2/#3 (≈ Stubbie).
   - Heacock: base 3-high package.
7. **Who caps #2 vs #3 in Stubbie** (consistent across 3 sources, opposite to some implementations)
   - The trips safety has #3 vertical first, then #2 if #3 isn't vertical (SAB-TD; ROSS; PRU Stump).
   - The Apex/Star carries #2 vertical from outside leverage. That is the coverage's acknowledged weakness against 4 verts.
8. **Box safety**
   - USAF-Q Box: the safety mans #3 if #2 is "up", and robs #1 if #2 is in or out.
   - SAB Mod/Box: the safety takes "all #2 vertical".
9. **Divider**: a fixed line (Saban: top of numbers minus 1) vs a hash-dependent line (HS Rip/Liz).
10. **Tampa Mike depth**: 15 yards (default drop) vs "the third safety", running through on threat.
11. **Rotation side naming**
    - Saban: Rip = right safety rotates right; Liz = left; Mable = safety to the trips strength; Skate = safety away.
    - Fangio: Cover 9 always rotates weak (away from the nickel).

---

## G. Sources (URLs)

- Sportstreatise, Saban Pass Coverages: https://sportstreatise.com/2021/01/saban-pass-coverages/
- Throw Deep, Saban Alabama coverages: https://throwdeeppublishing.com/blogs/news/nick-saban-s-alabama-pass-coverages
- Throw Deep, Kirby Smart defense: https://throwdeeppublishing.com/blogs/news/a-worthy-rival-the-kirby-smart-defense
- USA Football, Pruitt 3x1: https://blogs.usafootball.com/blog/7803/defending-3x1-formations-with-jeremy-pruitt
- USA Football, Rip/Liz details (HS coordinator): https://blogs.usafootball.com/blog/7272/high-school-coordinator-explains-the-details-of-rip-liz-coverage
- USA Football, Ted Nguyen Saban pattern-match Cover 3: https://blogs.usafootball.com/blog/5615/blank
- USA Football, College coach quarters (Cover 7): https://blogs.usafootball.com/blog/7382/college-coach-details-quarters-coverage
- USA Football, Soft Sky (Carroll): https://blogs.usafootball.com/blog/7141/soft-sky-how-pete-carroll-defends-four-verts-from-middle-of-the-field-close
- Brophy, Saban Cover 7: https://brophyfootball.blogspot.com/2010/10/nick-saban-split-safety-coverage-cover-7.html
- Wesley Ross, Stubbie/Stump: https://wesleyrossfootball.substack.com/p/defeating-stubbie-and-stump-coverage
- MatchQuarters, Three coverages (Solo/Poach/Steal): https://www.matchquarters.com/p/three-coverages-to-carry-this-fall
- MatchQuarters, Sub-Zeus tag (Stuff/8/Special/Solo/Palms): https://www.matchquarters.com/p/explaining-fangios-sub-zeus-tag
- MatchQuarters, Cover 8 Trix/Poach: https://www.matchquarters.com/p/fangios-cover-8-trix-poach-mechanics
- MatchQuarters, Fangio quarters (Eagles): https://www.matchquarters.com/p/vic-fangio-quarters-coverage-eagles-scheme-2024
- MatchQuarters, Mike lock 3x1 (Taser/Solo): https://www.matchquarters.com/p/locking-the-mike-in-3x1-coverage
- MatchQuarters, Quads bunch: https://www.matchquarters.com/p/defending-quads-bunch-formations
- MatchQuarters, trips checks ep.17 (preview): https://www.matchquarters.com/p/mq-quick-hits-ep-17-trips-checks
- MatchQuarters, glossary: https://www.matchquarters.com/p/comprehensive-defensive-football-glossary
- MatchQuarters, weak-rotation Cover 3 on 3rd down (preview): https://www.matchquarters.com/p/weak-rotation-cover-3-defending-the-sticks-3rd-down-raiders-patrick-graham
- The Read Optional, Book of Fangio II: https://www.readoptional.com/p/the-book-of-fangio
- Bullock, Washington quarters: https://markbullock.substack.com/p/washington-coverages-part-2-quarters
- Bullock, Commanders man variations: https://markbullock.substack.com/p/commanders-man-coverage-variations
- Coach & Coordinator, Read 2 vs 2 removed: https://coachandcoordinator.com/?p=1967
- Youth Football Online, quarters: https://youthfootballonline.com/quarters-coverage-in-football-alignment-and-assignments/
- Glazier, Sewell quarters: https://www.glazierclinics.com/football-coach-resources/the-quarters-coverage-that-forces-spread-teams-to-play-left-handed
- Glazier, Cassity Cover 3 curl/flat: https://www.glazierclinics.com/football-coach-resources/cover-3-breakdown-elite-curl/flat-defender-techniques
- Svec, motion in man: https://jonsvec.substack.com/p/adjusting-to-motion-in-man-coverage
- Svec, jet motion: https://jonsvec.substack.com/p/defensive-reactions-to-jet-motion
- Svec, quads: https://jonsvec.substack.com/p/defending-quads-formations
- All Eyes DB, bunch point man: https://alleyesdbcamp.beehiiv.com/p/defend-that-bunch-set-point-man
- All Eyes DB, Cover 3 seams: https://alleyesdbcamp.beehiiv.com/p/how-to-defend-that-seam-routes-in-cover-3
- NFL.com, NGS 2025 metrics (disguise definition): https://www.nfl.com/news/next-gen-stats-new-advanced-metrics-you-need-to-know-for-the-2025-nfl-season
- arXiv 2602.10784 (BDB coverage/motion HMM): https://arxiv.org/html/2602.10784v1
- Viqtory Tampa 2 guide: https://www.viqtorysports.com/tampa-2-coverage-in-football-explained-with-images/
- Search-snippet-only sources (pages blocked or paywalled; cited above as "snippet"):
  - X&O Labs quarters/empty/sky reports (xandolabs.com ?p=11499, 13866, 13906, 7333);
  - Steelers Depot Tampa 2 Mike rules;
  - Throw Deep trap coverage install;
  - NFP Cover 2 corner;
  - PFF Vikings 3rd down;
  - Philadelphia Inquirer picket fence;
  - Fantasy Points man rates;
  - FiveThirtyEight two-high;
  - Ferraiola Staley study;
  - "High Red vs Low Red" podcast.

---

## H. Notes against the current repo (read-only observations, not edits)

- `src/sim/coverage/rules.ts` `stubbieSafety` caps "#2 first, then #3". Saban/Smart (SAB-TD, KS-TD), ROSS and PRU all state that the trips safety takes **#3 vertical first** and #2 only if #3 isn't vertical. The Apex/Star carries #2 vertical from outside leverage, which is the coverage's known weakness. This is a direct contradiction worth reviewing.
- `qSafety` declares #2 vertical at 7 yards. Sources use a 5-yard landmark or "3 steps" (YFO; USAF-Q; USAF-RL). Clamp/Palms "out in first 5 yards" matches the repo's `isQuickOut` idea.
- `tampaMike` carries to ~20 yards. The source default drop is 15 yards when #2 isn't vertical; he runs with an inside vertical by #2 (snippet). The HS Rip/Liz MOF pedals to 20.
- `playbook/coverages.ts` lists 3x1 checks: cover3 → `cover3_mable`; cover4 → `cover4_poach` / `cover4_stubbie`; cover4_meg → `cover4_poach`. The sources would add:
  - **Cut** as the default single-detached (TE/nub) side;
  - **Cone/Connie/Tuff** backside variants keyed by X split;
  - **Zeke/In-Out/Trio** first-in/first-out matching;
  - **Push** on a Fast 3;
  - **Steeler / quarters-both-sides with Mike on #3** for empty.
