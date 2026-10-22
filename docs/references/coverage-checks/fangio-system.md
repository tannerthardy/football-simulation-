# The Fangio defensive system: a reference for the simulation's defensive playbook

Compiled 2026-10-22, read-only against `/home/user/football-simulation-` at `e2ed2d59`. No repo files were edited.

## Conventions

- **Evidence tags**
  - **[S]**: the source states it. Short quotes are in "…".
  - **[D]**: I read it from the original image (diagram or legible print), not from the OCR.
  - **[I]**: my inference or synthesis.
  - **[C]**: the sources conflict. The versions are given side by side.
- **Citations**
  - `HNFL-NNN` is a sheet in `docs/references/honest-nfl/`.
  - I viewed these images directly: **HNFL-008, 011, 056, 073, 137, 139, 261, 324**. Everything else comes from OCR, cross-checked against the existing index `docs/references/coverage-checks/honestnfl-index.md` (called **IDX** below).
  - Web sources are listed with full URLs in section G and keyed like **[W-SHARP]**.
- **Provenance caveat.** HonestNFL is an offense-side teaching archive. Its sheet headers carry an "NFL", "Cowboys", "Eagles" or "2026 Ravens" logo or label. These are the archive author's labels, not authenticated team installs (IDX "Provenance").
  - Two sheets are titled **"Fangio System"**: HNFL-008 and 011.
  - Several "Sub" sheets carry the Eagles or Cowboys label and use Fangio vocabulary: Stuff/8, Roy/Lou, Rob/Lee, Trix, Zeus/Ring, Whip/Slug.
  - The "2026 Ravens" sheets use descendant vocabulary from the Macdonald/Orr tree: Pack/Stuff/Pound/Chicago, simulators.
  - I treat all three groups as one tree with local naming differences, and I flag the conflicts.
- **Repo vocabulary.** `CB_S/CB_W/NB/DB/SS/FS/LB_M/LB_W` are the repo's slots. "Nickel" = `NB` (the strong apex). "Dime" = `DB`, or `LB_W` in nickel personnel (the weak apex). "Mike" = `LB_M` (the midpoint). "Strong/weak" in Fangio sheets means **nickel side / passing strength**, which is not necessarily the repo's "side with more receivers" (see E1).

---

## A. Core principles

1. **Two-high shell on nearly every snap. The final coverage is decided late.**
   - Rams and Broncos showed two-high pre-snap on ">75% of defensive snaps" in 2020. No other team exceeded 60% (SIS data) [S, W-SHARP].
   - 2025 Eagles: open pre-snap alignment on 87% of plays (1,012). MQ elsewhere says "~90% two-high shell" [S, W-MQ9].
   - Scouting report HNFL-186: "STRUCTURE PRESENTATION = 2 DEEP (75%), 1 DEEP (18%), NO DEEP (7%)", but "FINAL STRUCTURE … MIDDLE CLOSED (49%), MIDDLE OPEN (43%)" [S]. A two-high look rotates to middle-closed about half the time.
2. **Disguise is one-directional: open to closed.**
   - Of 488 disguised Eagles snaps (2025), "98% were open-to-closed". Closed-to-open happened 8 times, the fewest in the NFL [S, W-MQ9].
   - Fangio disguised ~41% of closed-post snaps [S, W-MQ9].
   - In 2023, disguise was 39–61% for the Dolphins (Fangio), Rams and Panthers (Evero), versus 26% for Staley's Chargers [S, W-MQW6].
   - Design reason: weak rotation keeps "the Weak Safety … in the same place", so "the quarterback's key read stays in one spot"; Philadelphia wants "everything to look the same" [S, W-MQSB].
   - The NGS disguise flag: "If a defense shows split-safety zone and rotates to single-high man (or spins to Cover 0), we flag it as disguised" [S, W-NGS25].
3. **Rotate away from the nickel. Weak rotation is home base.**
   - "Cover 9 is a 3 deep, 4 under middle-closed zone coverage with rotation away from the Nickel/Sam" (HNFL-054) [S].
   - MQ: Fangio uses "weak rotation Cover 3 as home base from a two-high shell" [S, W-MQAMB].
   - Cover 8 "aligns almost identically to his Cover 9 base" [S, W-MQ8].
   - All rotations in the Fangio rotation menus are "RELATIVE TO THE NICKEL SIDE (SUB) OR PASSING STRENGTH (BASE)" (HNFL-008, 011) [D].
4. **Split-field coverage by formation, by target and by game plan.**
   - Cover 6 = quarters to the nickel, halves away. Cover 8 = halves to the nickel, quarters away (HNFL-073, 115, 324, 325) [S/D].
   - Roy/Lou put "the 1/2 side to the most dangerous threat and/or protect a CB's matchup" (HNFL-260) [S].
   - Zeus/Lord/Ring tie the half side to a jersey number (HNFL-260, 261) [S/D].
   - BAL Chicago puts the half side toward a GP stud, else the "offset HB", else "Back @ home = Half to field" (HNFL-229) [S].
   - Fangio-tree coaches play split-field 18–25% of snaps, "more than double the league average" [S, W-MQ8].
5. **Light box, plus one from depth, gap-and-a-half.**
   - Rams 2020 light box ("six or fewer") on 78% of snaps, Broncos 77%. Both allowed 38% positive-play rate on runs vs light boxes [S, W-SHARP].
   - Fangio front mechanics: "Gap Control (One-Gap) and Gap + ½" (HNFL-061) [S]. Primary gap "by alignment"; the half gap "becomes the focus once the primary is out of play for the runner". The sequence is "LOCK … PEEK … SHED … TACKLE" (HNFL-061) [S].
   - Gap + ½ is "similar to 2-gap, defenders up front are playing inside-out and spilling the ball to force them to play horizontally while the backers overlap to fit off of the front" (HNFL-137) [D].
   - The safeties are the extra fitters. Rams primer: the drop safety "reads the offense from depth and fills the open gap left in the front" [S, W-MQRAMS]. "Easier to play down than to play back" [S, W-MQRAMS].
6. **Keep the ball in front and make the offense drive.**
   - Evero: "The offense has to be perfect for 14 plays. The defense just needs to make 1 play" [S, W-EVELY].
   - Light boxes + two-high "invit[e] the run and short completions" [S, W-EVELY].
   - Staley-style: "take away deep passes … just fine inviting opponents to run" [S, W-search summary of MQ Rams primer].
   - Read Optional: "Coverages all look better when the four rushers get home" [S, W-RO1].
7. **Rush four. Pressure by simulation, not by numbers.**
   - Scouted 4-man rush "80% (10% FEATURE AN UNKNOWN)", 5-man 14%, 6+ 4%. Pressure coverages: "FIRE ZONE (35%) … BONUS FIRE ZONE (12%) … DEUCE ZONE (8%) … QUATTRO (4%)" (HNFL-186) [S].
   - "Sim pressures are … blitzing a linebacker or defensive back but dropping an overhang defender – or sometimes an interior lineman – to maintain a four-man rush" [S, W-ITB].
   - Fangio blitz rate is typically ~20–24% [S, W-ITB]. One season was 19.3%, "fifth-lowest" [S, W-search, PhillyVoice].
   - NGS: league blitz rate from two-high is 10.0%, versus 39.7% otherwise (2018–25) [S, W-NFL-SPLIT].
8. **Key & match zone everywhere.**
   - "Defenders are matching routes that break into their leverage side and delivering routes that break away from them into their help … play like 'Lurk' against verticals & out-breakers or 'Trey' against shallows & unders" (HNFL-063) [S].
   - Zone alignment: "Corners align relative to #1, Apexes … #2, Midpoint … #3 … All motions are bumped across" (HNFL-063) [S].
   - Motion response is scouted at "BUMP IT ACROSS (85%), RUN WITH IT (15%)" (HNFL-186) [S].
9. **Tackling and rally.** No HNFL sheet quantifies tackling. The web sources stress rally and "eliminates big plays" only qualitatively [S, W-KOU]. [I] For the sim, tackling stays a physics/controller outcome. The scheme's contribution is numbers arriving from depth, through fits and forces (B12).

---

## B. The coverage tree, defender by defender

### B0. The Fangio rotation menu (HNFL-008 2x2, HNFL-011 3x1) [D]

Where each safety goes, by call, relative to the nickel/strong side. **SS** = nickel-side safety, **WS** = weak safety.

| Call | SS (nickel side) | WS (away) | Notes |
|---|---|---|---|
| 2, 8, Spread | deep 1/2 | 2 / Spread: deep 1/2. **8: quarters** | Cover 8 = half strong, quarters weak |
| 6 (Stuff) | quarters (inside 1/4) | deep 1/2 | QQH |
| 4 (Quads) | quarters | quarters | |
| Tampa | Tampa 1/2 (wider) | Tampa 1/2 | the Mike runs the middle |
| **9** | **rotates to the post (middle 1/3)** | 9 Sky: down to curl-flat weak. 9 Buzz: down to hook weak. **9 Cloud**: rolls out to the deep 1/3 weak (corner squats) | weak rotation |
| **3** | 3 Sky: down to curl-flat strong. 3 Buzz: down to hook strong. **3 Cloud (Pillow)**: deep 1/3 strong | rotates to the post | strong rotation |
| Dbl Cloud | deep 1/3 strong | deep 1/3 weak | both corners squat. [I] The middle is played by an underneath runner; exact rules are not on the sheet |
| Dbl Buzz | hook strong | hook weak | [I] a three-deep with corners and one more deep player; not detailed |
| 2 Sky / 2 Sky Weak | 2 Sky: curl-flat strong | 2 Sky Weak: curl-flat weak | [I] inverted halves |

3x1 additions (HNFL-011) [D]:
- SS checks to **Book/Area** (2/8 side) and **Buster/Book/Area** (4/6 side).
- **9 → Strap / Clue / Spot**.
- WS adds **"✓TRIX"**: a drop toward the trips side for #3. "ALL 3x1 ROTATIONS BY WS LISTED ARE IF 'TRIX' IS OFF".
- "WIDTH OF WEAK SAFETY DROPS ARE BASED ON THE SPLIT OF THE ISO RECEIVER."
- **"✓PATTY"** sits on the 9 Sky / 2 Sky Weak drop.
- Checkmarks mean "DROPS AND LANDMARKS ARE DETERMINED BY RELEASES".

Man menu (HNFL-008/011) [D]:
- Fist/Finger: SS deep 1/2. Pounder: SS 1/4 ("over #2" in 3x1). Trap: lateral, "WIDTH … RELATIVE TO THE #1 WR".
- **1** = WS to the post. **1 Weak** = SS to the post.
- **Robber**: either safety down to the high hole.
- **Thief/Hole/Lurk**: SS down to the low hole.
- Brackets: **Cut** (#1), **Cone/Inc** (#2) and **Trio**, directed from either safety. 3x1 adds **53 Man** (SS wide) and **Trix** in man (WS key #3).

### B1. Cover 4 "Quads" (key-#3 & match quarters, both sides) and its tools

Base 2x2 rules: HNFL-194 Sub Quads, HNFL-185 "44", HNFL-193 [S].
- **Corners, Quarters.** "Match #1 out & vertical (unless 'In' or 'Under' call is made)". On In/Under: "zone your ¼, play top-down".
  - Clue alignment (7+ yds, outside #1) is the default. HNFL-193: "Rarely will we see MOD against this unit."
  - China: if #1 doesn't clear the 5-yd No-Cover Zone, zone off. The apex "push[es] to the route of #1 so the Corner can sink."
- **Apexes (NB strong, DB/Will weak), Quarter Flat.** "Reroute #2 with eyes to #1. Match any flat by #2 (or Fast #3) … match the 1st flat by #2/3 or match the final #2 underneath." Wall alignment "1 yard inside and 4–6 yards deep" (HNFL-094).
  - "#3 away": no delivery, take #2 back across (HNFL-065, 325).
- **Mike, Quarter Hook.** "Key 3-2-1 … relate to the final #3 … carry if #3 is a vertical threat" (no Trix).
- **Safeties, Inside Quarters.** "Key 2-to-1. Match #2 vertical up the seam or zone your ¼ and squeeze to danger (usually to #1 inside-out, but possible 'Shove' strong by G.P.)."
  - Alignment "10–12 yards depth relative to #2" (HNFL-073) [D]. [C] HNFL-092/202 say 12–14.
  - Scouted: safeties "don't look to bracket #1 if there is no seam threat — they will act more like Robber" (HNFL-193) [S].

Tags and checks in the Fangio tree (rules in IDX §A1–A5 unless new):
- **MOD**: press-bail corner, "Man Outside & Deep" (HNFL-031).
- **MEG**: corners "Man Everywhere he Goes", "5-over-3 inside … (no China)" (HNFL-033).
- **READ/Palms/Soft Squat** vs a detached #2 (HNFL-051 [D], 195, 219): "Think quarters *unless* #2 is out or flat under 5y". Then the CB traps #2 and the safety "get[s] width to #1 w/ depth". This is the repo's `cover4_palms`.
- **ZORRO / ZONE IT** vs stacked/reduced #1: zone exchanges off (HNFL-193, 194, 269).
- **BOX** vs bunch (HNFL-053, 272): the repo's `cover4_box`.
- **TRIX** vs 3x1: the FS keys "#3-to-X. Overtake any vertical by #3 or zone your ¼ and find work" (HNFL-197). The Mike gets "no vertical responsibility" (HNFL-325). The weak corner plays "Tight ¼ — Man #1 unless shallow. No China" (HNFL-194). This is the repo's `cover4_poach`.
- **BOOK / STUBBIE / STUMP / AREA / ERASE / TRIO / BINDER**: trips 3-over-2-weak tools (HNFL-050, 309, 270, 052, 073).
- **JUMP** ('X' nasty): "Cut #1 off inside / match final #1 in the count" (HNFL-230, 251).
- **SCREW**: MOD unless play-fake mesh, then "apex triggers and the strong safety takes #2 up & out" (HNFL-114).
- **CUT / CONE / INC / CLAMP / CATHY / CONNIE / SANDY** are **man (Hands) brackets**, not zone tags (HNFL-261/262; B9). [C] MQ's glossary gives Fangio's "Cone" as a #2 bracket (nickel outside, safety inside), consistent with HNFL-262 "CONE – Nickel/Dime & Safety Bracket #2" [S]. Saban's Cone brackets #1 (IDX web conflict).
- **Clamp**, in the HNFL Cover 2 page, is "'Wild' coverage played from … a man-aligned presentation" (HNFL-291) [S]. It is not a quarters tag.

Run fit: Quads uses **APEX FORCE** (HNFL-139) [D].

| Player | Run job |
|---|---|
| Playside apex (¼ flat) | "1st FORCE … leveraging the ball from outside-in" |
| Playside inside-¼ safety | **ALLEY** |
| Playside corner | 2nd force ("think pass, react to run") |
| Mike | "SCRAPE A-C … fit the playside A/B/C gap based on blocking" |
| Backside apex | "CUTBACK-BOOT-REVERSE" (CBR) |
| Backside safety | inside ¼ (pursuit from depth) |

[C] HNFL-193 (a scouting report) says in Quads "Safeties are primary force vs. the run." HNFL-139 (teaching sheet) gives the apex as primary force and the safety as alley. Use HNFL-139 as the default. Treat a safety force as a team variant.

### B2. Cover 6 = "Stuff" (base/older label) = "Pack" (BAL/2026 label): QQH, quarters to the nickel

HNFL-073 [D], 324 [D], 310, 275, 231, 273.
- **Quarters side (to the nickel):** CB Quarters, NB Quarter Flat, SS Inside ¼, as in B1. Mike Middle Hook: "relate to final #3 … Possibly carry if #3 is a vertical threat in a normal Quads call" (HNFL-324) [D].
- **Half side (away; the "Roy/Lou" side):**
  - **CB Squat**: "Funnel #1 in, see #2, sink for depth. Top-down the flat. Ball brings you back down." Technique: "COLLISION → FUNNEL → OPEN → SINK", "2 lateral shuffles", aligned "5x1 O/S" (HNFL-097). "Squat (5–7 yards) depth about a yard outside of #1" (HNFL-099). Primary run force (HNFL-097) [S].
  - **DB/Will Vertical Curl**: "Wall #2, see #1. Match #2 up & in. If #2 is flat, find #1 and prepare to wall him off as the new #2. Match final #2 to you." "Take #2 shallow if #3 occupies the midpoint" (HNFL-097).
  - **FS Deep ½**: "Key outside-in for vertical threats. Top-down. Vision & squeeze" (HNFL-324) [D]. Key #1→2: "If #1 is up, widen and squeeze … If #1 cancels, tighten to deflate #2 top-down" (HNFL-097). Landmark "≈1y inside the top of the numbers at ≈22y" (HNFL-291 [D], via IDX).
  - Halves alignment: "14+ yards relative to #2" (HNFL-068).
- **Half-side tools.** Each is a per-side swap.
  - **Wild / Squat**: as above.
  - **Cloud**: true vision-and-break halves. Corner "cloud flat", primary force (HNFL-070, 230). BAL "Cloud & Choke = Deep ½ Field (0x12 Heads #2)" (HNFL-230).
  - **Smack** vs oversplit #1: "Aggressive reroute on an oversplit #1 funneling them wide outside. Finish the same way you would in Squat" (HNFL-241). BAL Pack: "#1 oversplit = Smack" (HNFL-231). The safety plays "Wide ½" (HNFL-231) at "≈3y outside the numbers at ≈20y" (HNFL-291 [D]).
  - **Read / Soft Squat** vs a detached #2 weak: CB "Soft Squat (Bail or 1x7 I/S #1)", key 2-to-1. Safety "2 to 1 Read (1x12 I/S #2)". Apex "Read Flat (Wall #2)" (HNFL-230/231).
  - **Choke**: BAL half tool, "Deep ½ Field (0x12 Heads #2)" (HNFL-231). Its details are not defined beyond alignment.
  - **Patty**: "PATTY (IF FLOW IS POSSIBLE)" (HNFL-273). MQ: "a call to a single WR that makes the LB responsible for the RB to the flat" [S, W-MQZ]. It sits on the weak-sky drop (HNFL-011) [D]. [I] Patty = with a lone weak #1 and the back to that side, the weak LB takes the RB's flat release, so the squat corner can stay on #1 and the FS can play tighter.
  - **Sink / Tight ½** (Stuff adjustment vs trips): "Weak Corner converts from 'Squat' to 'Sink' so that they own any upfield route by #1 … Free Safety converts from 'Deep ½' to 'Tight ½'" (HNFL-273) [S].
- **Quarters-side tools vs formation.** Sub Stuff menu (HNFL-324) [D]:
  - "Trips: BOOK or AREA vs. Normal, AREA vs. Exchanges"
  - "Bunches: BOX or BUSTER"
  - "#1 Stacked/Reduced: ZONE IT … Possible READ"
  - Empty: "BOOK/READ" (trips side Book with CB lock; 2-side Read).
  - BAL Pack menu (HNFL-231) [S]: Strong "Stubbie/Stump"; Weak "Quads, Read"; Bunch "Zone It/Read Buddy"; Snug "Stubbie/Stump"; Speed "Stubbie, Stump"; Empty "Cloud or Read Buddy" / "Cloud/Smack" / "Cloud/Read".
- **6 Area vs 3x1** (HNFL-073 [D]):
  - SS "TOPPER — #2 or #3 deep = top it; #2 & #3 deep = vision & squeeze" (a ¼ post keyed 3→2 in HNFL-324).
  - NB "¼ FLAT — outermost underneath".
  - Mike "¼ HOOK — innermost underneath (wall final #3)".
  - CB "¼" (soft quarters, "China built in").
  - Backside: Wild (squat CB, DB/Will vertical hook "wall final #2", FS deep ½).
- **Strengths and stressors** (HNFL-324) [D]: "Can Stuff an 'X' or 'Z' at #1 weak using the Squat CB and Deep ½ FS." "#2 vertical occupies the SS, can result in a voided deep inside ¼ (Alert Post)." "Nickel must chase Wheel routes."
- **Run fit (Cloud/Squat side; HNFL-137 [D], 139 [D])**, with flow to the half side:

  | Player | Run job |
  |---|---|
  | Squat/cloud CB | **1st force** |
  | Deep-½ safety | **2nd force** (alley in HNFL-139's Cloud-force panel) |
  | Playside apex ("slot") | **plug**: "upfield cut inside the force" |
  | Mike | "MID READ A-C TO FLOW (SCRAPE/OVERLAP)" |
  | Backside quarter-flat apex | **CBR** |
  | Backside SS | inside ¼ |
  | Front | spill-overlap |

### B3. Cover 8 = "Stuff Nickel"/"8"/BAL "Stuff": HQQ, halves to the nickel, quarters away

HNFL-325 [S], 115, 230; W-RO2.
- **Half side (to the nickel):**
  - **CB Squat** (as B2).
  - **NB Vertical Curl**: as the B2 Dime. Plus: "'Trips Rules' = Deep Hook technique. Carry #2 vs. All Go Special." BAL Cloud: "Vertical Hook #2. Key 2-1 … Play '2/3 Read' vs. Trips. Carry #2 only if #3 is vertical" (HNFL-230).
  - **Mike Middle Hook**: "Key 3-to-1 (Apex or Corner have all of #2) and relate to the final #3 … 'Trix' = No vertical responsibility … play aggressively underneath on the final #3!"
  - **SS Deep ½**.
- **Quarters side (away):**
  - **CB Quarters** (In/Under = zone your ¼).
  - **DB/Will Quarter Flat**: "Take #2 across with #3 away."
  - **FS Inside Quarters**, key 2-to-1. Vs 3x1, **Trix**: "Key #2-to-X" (Sub 8 diagram) or "#3-to-X" (HNFL-197).
- **Menu** (HNFL-325) [S]:
  - "Trips: TRIX vs. Normal. Poss BOOK (4-over-3), or BUSTER (2/3 close)."
  - "Bunches: SQUAT (w/ TRIX) or BUSTER."
  - "#1 Stacked/Reduced: SQUAT (to Nickel) or BOX (away)."
  - Empty: "BOOK/READ".
- **What Cover 8 Trix buys vs 3x1** [S, W-RO2]: "Halves to the passing strength, a common answer to 3x1 … cloud corner over #1, nickel and linebacker play zone match rules, a safety plays deep half, and a Trix safety … five defenders over three receivers." "Staley's approach is to lock the backside in man and flood the frontside in zone." HNFL-115: "POSSIBLE 5-OVER-3 STRONG VS. 3x1 IF #3 IS UP OR OVER ('TRIX'/'TRIP')" [S].
- **Stressors** (HNFL-325): "#2 vertical occupies the FS … (Alert Post)"; "Dime is vulnerable to inside breaks when #3 is away (Mike pushes thru strong)."
- **Usage** [S, W-MQ8]: "Cover 8 was run on more than 12% of plays by the Chargers, Cowboys, Lions, Packers, and Vikings. The Packers ran it on 20%" (2024/25).

### B4. Targeted split-field: Roy/Lou, Lord, Zeus, Ring, Chicago

- **Roy/Lou** names the half side. "Stuff" = Roy/Lou away from the nickel. "8" = Roy/Lou to the nickel (HNFL-324/325) [D/S].
- **Lord (Rt/Lt/#)**: "A 'Roy/Lou' call will be made to the Jersey # or a predetermined direction … Final coverage plays as 'STUFF' or '8' based on the call side" (HNFL-260) [S].
- **Zeus.** HNFL-261 says "'RING' = Man version of 'ZEUS' Safety with 'FIST' & 'POUNDER' instead of 'ROY/LOU' & 'QUADS'" [D]. It follows that Zeus is the zone version [I, well supported]:
  - Target **wide at #1** → Roy/Lou (half side) to him.
  - Target **inside the numbers** → Quads.
  - Cross-check: the repo's `resolveZeus` maps S1 → Cover 8, W1 → Cover 6, inside → Cover 4. This matches.
- **Ring diagrams** (HNFL-261) [D]:
  - Trips with # at trips #1: SS "Fist ½" over him, FS **Trix**.
  - Twin stack: "Triangle" with the safety, Pounder ¼ away.
  - E-look with # at #1: "Fist ½" + "Cut" on the other #1.
  - Bunch with # at the backside #1: "Buster/poss Box" + SS Tight ½ to the bunch, Fist ½ to #.
  - Bunched #: "Mini Pounder", In/Out #1 & #3, Trix.
  - Empty # inside: Pounder ¼ + Trix.
  - **[I] Zeus vs 3x1 therefore resolves to Cover 8 + Trix when the target is trips #1, and to Stuff with Book/Area when he is the backside X. The repo maps both to plain `cover6_rev`/`cover6` without Trix or Book.**
- **Ring** ("targeted Hands"): "If at #1 wide, play 'FIST' to them with 'POUNDER' away. If aligned inside the numbers, it plays as 'POUNDER' across the board" (HNFL-261) [S]. The intent: "four eyeballs on the tagged threat without sacrificing the overall integrity" [D].
- **BAL Chicago**: the half side goes to the GP stud, else the offset HB, else to the field when the back is at home. "Stud to trips = Stubbie or Stump; stud away = … Trix; Empty = play Pound" (HNFL-229) [S].
  - Chicago Home Invert (HNFL-211): "Home Trips" (back at home) becomes Cover 3 "Rob": CB Clue ⅓ strong, Tight ⅓ weak, SS rolls down curl-flat weak (IDX) [D].

### B5. Cover 9: weak-rotation Cover 3 from two-high ("Rob/Lee", "Nine/Strap")

HNFL-054, 056 [D], 063, 203, 304, 228; W-RO2.

**Rotation.** "It always begins as a 'Rob/Lee' call made away from the Nickel (weak Sky rotation), but may end up as 'Sally/Rose' … (weak Buzz rotation) by G.P., formation, or situation" (HNFL-056) [D].
- From the HNFL-056 diagrams: the **nickel-side safety travels to the POST** and the **weak safety comes down as the weak Seam/Flat apex** [D].
- The weak safety is the "anchor" whose position does not change [S, W-MQSB].
- Whip variant: the post safety "Spin[s] weak into the post" (HNFL-060).
- Alignment: "Safeties align left & right (possibly strong & weak by G.P.) … Free Safety is the weak Apex aligning relative to #2 weak. Mike & Dime align inside" (HNFL-056) [D].

**Defender rules ("Danger" key & match; HNFL-056) [D]:**
- **Corners, Tight ⅓**: "M/M #1 unless they are Shallow. #1 Shallow = Zone Your ⅓". "'Shallow' = Receiver's jersey # is visible to you within 2 yards of the route." Vs "#1 Stacked/Bunched/Reduced = Clue ⅓ technique with a 2-to-1 read." Diagrams label it "TITE ⅓ / MUSH #1".
- **Apexes (NB strong; rotated WS weak), Seam/Flat**: "Match-Carry-Deliver … Match #2 out, Carry #2 vertical, or Deliver #2 back to ILB and zone off thinking Seam→Corner→Flat." "'#2 Out' = Any route by #2 that crosses your face to the flat area." "'Push Alert' = … Apex & ILB … exchange jobs if #3 is fast to the flat." Diagrams: "SM/FLAT / MUSH #2".
- **Backers (Mike, Dime/Will), #3/Hook**: "#3 dictates responsibilities. Match final #3 or zone the Hook." Vs x2 the two backers "Combo #3": the LB to #3's side matches, the LB away zones the hook (HNFL-063).
- **Post safety, Middle ⅓**: "Key inside-out … Widen only as needed. Split and/or squeeze Seams from top-down, inside-out. No Seams = turn attention outside to squeeze wide if #1 is vertical."

**Adjustments:**
- **STRAP** (any x1: 2x1, 3x1, 4x1; HNFL-054/056/203) [D/S]. "the ILBs push to overload the strong side with Dime handling anything up or over by the final #3" (HNFL-054).
  - **Mike = Bonus Hook**: "apex #2/3 … overdrop #3 and relate to the final #3 underneath … no vertical responsibility".
  - **Dime/Will = #3 Receiver Hook**: "get depth and key #3-to-2. Cut off any over route by the final #3. If #3 cancels, zone the Hook and look for the final #4 coming to you" (HNFL-203 via IDX). In HNFL-063 this weakside hook is responsible for "final #3 deep, the 1st shallow, or the final #4 in 'Flow'".
  - "aka '6 Rip/Liz'" (HNFL-054).
- **SITE / KEY** (3x1, by game plan; HNFL-063, 203/304, 227/228) [S/D]:
  - "If #2 weak scat releases or carries it, the Free Safety is the weak Apex defender (Sky Weak). If #2 weak blocks or is slow to go, the Free Safety is the '#3 Receiver Hook' defender while the Dime is the Apex (Buzz Weak)."
  - BAL: "SITE refers to seeing the release of the HB in 3x1".
  - Read Optional [S, W-RO2]: "If the back is unlikely to release out or checks protection, the linebacker takes the back and the down safety becomes the three-up player … If the back is a significant receiving threat or is going out to the flat fast, the safety takes the back and the linebacker plays three-up."
  - [C] Name: HNFL-203 calls it "KEY"; HNFL-304 calls it "SITE".
- **GRAB** (= 9 Buzz; empty 3x2, and 3x1 by GP): "Dime becomes Seam/Flat on #2 weak. FS becomes #3/Hook, responsible for anything up or over the LB level by the final #3" (HNFL-054/063) [S]. "Converts rotation from Sky to Buzz." [C] HNFL-283 calls this WASP.
- **PUSH** (fast #3/#4 to the flat): the seam/flat defender chases the flat top-down. "The callside #3/Hook defender pushes to the new #3 … backside #3/Hook defender pushes to become the Hook defender" (HNFL-203) [D].
- **CLUE** (stacks/bunches/reduced): match zone pickups; Clue ⅓ corners keyed 2→1 (HNFL-054/056/063).
- **SPOT** (bunches): true vision-and-break spot drops (HNFL-054).
- **9 Cloud** (HNFL-008 [D]): the WS rolls to the weak deep ⅓ and the weak corner squats.
- **3-Seam** (Eagles "3-Seam" 11.6% of snaps, "96% … from open-to-closed disguise") [S, W-MQ9/W-MQ8]. [I] This is the seam-carry Cover 3 family the repo has as `cover3_seam`.

**Run fits.** Cover 9 = "8-man spacing underneath" and "Gap control" (HNFL-056) [D]. Sky force (HNFL-139) [D]:

| Player | Run job |
|---|---|
| Playside rotated safety (curl-flat) | **1st force** |
| Corner | 2nd force |
| Post safety | alley |
| Playside hook | plug |
| Backside apex | CBR |

[I] With weak rotation, flow to the weak side meets the rotated WS as force. Flow strong meets the NB/apex as force and the post (formerly the SS) as alley.

**Stressors** (HNFL-056) [D]: "Seams that key Post Safety's squeeze"; "Corners are often isolated vs. #1 vertical"; "Tough leverage for Apex on 3-step inside routes by #2 weak with #3 away". Read Optional's core problem: "three up is three": the weak hook may chase a fast #3 on four verticals [S, W-RO2].

**2026 change** (BAL/HNFL-280) [S]: "Cover 9 = … 'DANGER' principles … sky, buzz, or cloud rotation to either the strong or weak side … NO LONGER JUST FOR WEAK-ROTATED." The terminology now separates mechanics (Danger = key & match, Trey = vision & break) from rotation direction.

### B6. Cover 3 strong rotation in the tree ("3 Sky/Buzz/Cloud", "3 Lock", "Buzz")

- HNFL-008 [D]: 3 Sky (SS down to curl-flat strong), 3 Buzz (SS to hook strong), 3 Cloud/"Pillow" (SS to deep ⅓ strong, corner squats). The WS goes to the post in each.
- BAL **"3 Lock"**: "MUSH, SKY, or SORT principles to each side based on alignments. Rotation is 'ROB/LOU' away from the Nickel vs. all formations except 3x1+/Slot Unbalanced/Trey — then … 'RITA/LINDA' to the Nickel ('BUZZ')" (HNFL-227) [S].
  - BAL techniques (HNFL-228) [D]:
    - Corner: "MUSH #1 = Man #1 Unless Shallow."
    - Nickel: "MUSH #2 = Man #2 Unless Shallow. #2 Shallow = 'In' call and zone off Curl-to-Flat"; "SORT = Match outermost of #2 & #3"; "FAST = Push flat with #3."
    - Weak hook: "WEAK HOOK ('3 UP IS 3') = Cut off final #3 over or zone the Hook. Play Bender-Dig-Dump."
- HNFL-186 (scouted team): "99 WEAK [SKY] 21%" of nickel snaps, "33 BUZZ 3%". Weak rotation dominates [S].

### B7. Cover 2 / Tampa in the tree

- **2 Wild** (key & match halves): Squat corners, vertical-curl apexes, middle hook, deep halves (HNFL-068/291/334; IDX A1).
- **2 Cloud**: vision-and-break halves; corners cloud-force (HNFL-070).
- **Tampa** (BAL HNFL-241) [S]:
  - Corners "Squat" (or "Smack" vs oversplit #1).
  - Apexes "Hook #2 = Aggressive reroute on #2 before dropping inside the final #2. See release of #1."
  - Mike "Middle Read #3 = Open hips to the Nickel side and look for any seam threats to determine how much depth you need. Close the post vs. any seam threat."
  - Safeties "Tampa ½ = Deep Half technique to a wider landmark and see #1's release to determine your width."
  - "Vs. Jet motion = 'Shove' it."
  - Variants: **"Miami" = Tampa from man alignments**; **"Boca" = Tampa with a Buzz invert to the Nickel side** (HNFL-241/245) [S]; **"Tupac" = "Tampa 2 coverage that is played from a Cover 1 pre-snap presentation with M/M alignments before rotating late in the cadence or post-snap"** (HNFL-227) [S].
- **Buster / Squat** vs bunch: halves-based bunch tools (HNFL-069/072/273).
- **Clamp**: Wild from a man-aligned presentation (HNFL-291) [S].
- Usage in the tree is small: "22 TAMPA (1%)" dime, "SAM 22 TAMPA (8%)" penny, "WILL 2 (13%)" base (HNFL-186) [S]. Fangio's Cover 2 is a structure for the half **side** much more than a full-field call [I].

### B8. Cover 1 from two-high: Robber, Thief, Hole, Lurk, Rat, Dog/Cat, Double

- **Family definition** (HNFL-209) [S]: "SINGLE SAFETY MAN-TO-MAN … WITH AN ADJUSTER … extra rusher, an inside zone help defender, a spy … or … some sort of double team."
  - **1 Hole**: man alignment, the adjuster zones the low hole.
  - **1 Lurk**: "ZONE ALIGNMENT PRESENTATION, BACKERS COMBO #3"; "DEFENSES USE THIS AS A CHANGEUP TO WEAK SKY CONCEPTS (3Wk, 9Wk, 9Whip)".
  - **1 Robber**: man alignments, the open-side safety robs the high hole.
  - **1 Thief**: the closed-side safety robs.
  - **1 Dog**: an LB blitz with DL. **1 Cat**: a DB blitz with DL.
  - Multiple core threats: "they will 'BANJO' it."
- **Sub Lurk** (HNFL-240) [S]: "single safety Cover 1 variation played from zone alignments using man pickups … Designed to seamlessly marry up with single safety zones."
  - **Corners**: "Man-to-Man #1 … from a Cover 9 presentation."
  - **Nickel**: "Man-to-Man #2 to the passing strength."
  - **Mike & Dime, Back/Hook**: "HB offset to you = man coverage on HB. HB away = Lurk technique. Zone the Hook and provide inside-out squeeze help using vision technique. HB at home = Combo HB." "Mesh = Possible switch. Cut off the shallow with leverage. Original defender will zone the Hook."
  - **Down safety, man**: "2x2 = Down away from Nickel. Man coverage on #2 weak. 3x1/E Look = Down to the Nickel. Man coverage on #3 strong. I-Form = Down to the Nickel. Play 3-on-2 pickups with Mike & Dime on the backs."
  - **Deep safety**: Middle ⅓.
  - **Call**: "'RANDY/LEO' = Denotes the side the Safety goes down to." "Bunch = Play to leverage based on the 1st break. No In & Out."
  - Run fit "EASY FORCE" (HNFL-139) [D]: playside edge = 1st force ("CRUSH"), corner 2nd force, playside midpoint = plug, backside midpoint pursues, post = alley, backside apex = CBR.
- **Rat** = an LOS defender drops into the low hole (HNFL-031). "MIKE 11 DBL RAT" appears in HNFL-186 [S].
- Read Optional: "Late backside safety rotation into robber spots disrupted quarterbacks" (2021) [S, W-RO1].
- MQ: "Late, down-dependent safety movement is used to 'rob' crossers or 'bracket' top receivers" (Eagles Cover 1) [S, W-MQ9].
- Bullock: "1-Robber/1-Rat shows two-high pre-snap, then one safety drops to the post and the other steps up underneath" (IDX web).

### B9. Hands (two-deep man) family and brackets

HNFL-074, 206, 261, 262 [S/D]:
- **Fist** = "Traditional 2-Man Technique (Inside & Underneath Position)", deep halves.
- **Pounder** = "Traditional 4-Man Technique (¼'s Safeties, Man Under)". Leverage "relative to near Safety help".
- **Finger** = Fist strong + Pounder weak. **Rolex** = Pounder strong + Fist weak. **Thumbs** = "Inverted Fist. Safety Buzz under #1".
- **Trap** = "2-to-1 Trap Technique to cut off any Flat or Choice route by #2".
- **Triangle** = "3-over-2 Zone Pickups vs. a Stack".
- **Cut** = CB & safety bracket #1. **Cone** = Nickel/Dime & safety bracket #2. **Inc** = reverse Cone.
- **Buster** (bunch). **Trix** (FS 5-over-3 if #3 up/over). **Hit** = "Edge rusher will chip … a receiving threat coming from the core".
- **BAL "Biggie"** = "aggressive 2 deep, 5 under Man-Match Bracket coverage with the safeties bracketing the most dangerous threat to their side ('Uno' 'Dos' 'Tres' rules)" (HNFL-227) [S].
- Usage scouted: "55 FIST (5%) … 55 POUNDER (3%)" of dime (HNFL-186) [S].

### B10. Pressure family

**Fire zone, "Ringo/Lucky" / "Freeze"** (3 deep, 3 under behind 5; HNFL-059, 064, 278, 373) [S]:
- Rotation: "Ringo/Lucky (Sky rotation with the Safety as the Apex), Myrtle (Buzz … Safety inserting as the Midpoint), Thunder/Lightning (Cloud … Safety as Tight ⅓ on #1)." 2026: "BURN ZONE is the BUZZ version … 'MYRTLE' is dead" (HNFL-281).
- **Corners**: Tight ⅓ (Mush #1).
- **Apexes**: Seam/Flat MCD. "If #3 is away, you must also take #2 back across."
- **Midpoint**: "#3 Rec. Hook — … relate to the final #3 … Possible 'PUSH' … Take #3 flat if #2 is up."
- **Post**: Middle ⅓.
- "'2-3-2' principle … Apex-Midpoint-Apex matching the final #2-#3-#2." "Plays like 'SINGLE' (Cover 1 with a 5-man rush) vs. All Go."
- Checks: "Trips: Play It (FREEZE)"; "Bunches: CLUE or SPOT"; "#2 & 3 Close: SORT"; "Fast #3 or #4: PUSH". "Ringo/Lucky follows [the nickel]" on COS motion (HNFL-059).
- Example **Punch**: a nickel-edge 5-man (HNFL-059) [S].
  - Front: "Tackle to Call = Edge Pressure Rules; Tackle away = Penetrate Gap; End to Call = Edge Pressure Rules; End away = Contain Rush".
  - Coverage: SS & Dime seam/flat, Mike #3 RH, FS middle ⅓.

**Simulated / "Bonus" fire zones (4-man; the Fangio signature)** [S]:
- **Whip** (HNFL-060; "4-Man Simulated Pressure"):
  - Rushers: Dime LB blitzes weak B or C gap by GP. "End to Call — Crash 9T / Contain Rush"; tackles rip A-gap / B-to-contain.
  - Dropper: **the end away from the call (the strong edge, since the call is weak), "Bonus Drop between #2 & #3"**. As a Bonus Hook: "Overdrop #2 to apex of #3. Close hot window." [I] The OCR's "end away from call" and "strong edge" lines name the same player, because the Dime blitzes weak.
  - Coverage "3 deep, 4 under 'Ringo/Lucky' Fire Zone coverage with a Bonus Dropper … plays out like '9/STRAP' with rotation away from the Nickel":
    - Corners Tight ⅓.
    - Nickel Seam/Flat MCD, with the bonus dropper inside #2.
    - Mike #3/Hook (x2) or #3 Rec. Hook (x1).
    - Safety to call: Seam/Flat away from the nickel.
    - Post: "Spin weak into the post … Final #3 deep vs. All Go Special."
  - "complement[s] 'BACKER FZ' and 'COUGAR' presenting the same pressure path with different coverages."
- **Slug** (HNFL-057): "Bonus Fire Zone with Ringo/Lucky rotation to the Nickel." **Nickel contain-blitz off the edge; the end opposite the call drops Seam/Flat** ("Possible Bonus Hook on Switch vs. #2 detached"). "Plays like STRAP underneath vs. x1." Married to Punch, plus "the bonus dropper closing the hot window away from the pressure path."
- **Bird Wasp / Bee ("Sting")** (HNFL-242/360):
  - Rushers/droppers: "Open side ILB will be the 4th rusher blitzing through the 'A' gap. Sam & Will drop into coverage. Ends are contain rushers." "BEE" = closed-side version.
  - Coverage: "plays as 'QUADS' to 'x2' formations and 'BUZZ' to 'x1' formations."
  - Sally/Rose (x1) assignments:
    - Strong CB: Clue ⅓.
    - Weak CB: Tight ⅓.
    - Sam: Buzz Flat.
    - Will: Seam/Flat.
    - Cover LB: #3 Rec Hook.
    - **SS: "Curl Insert — Key #2-to-1. Pattern read for Corner/Out of #2 or Dig of #1"**.
    - FS: Middle ⅓.
  - "STING coverages minimize the need for formational adjustments."
- **Base sims from the scouting report** (HNFL-184) [S]:
  - **"WILL 6"**: QQH "behind a 4-man charge with the WILL as the 4th rusher … primary coverage … in the 2-back world and some 12P". [S, W-MQW6] gives Staley's Saints "Will 6" as a base rotational call.
  - **"BACKER 4"**: quarters "behind a 4-man charge with the weakside ILB as the 4th rusher with both edges dropping as the apexes".
  - **"SAM 8"**: HQQ "with SAM as the 4th rusher".
  - The scouted team's mix: "WILL 6 (25%), BACKER 4 (20%) … SAM 8 (10%)" (HNFL-186).
- **BAL simulators** (HNFL-226/227) [S]. Every one rotates to replace the rusher's coverage job.
  - **Cover 3 simulators** ("plays out as 3 LOCK"):
    - **Favre**: field apex (nickel) rushes, boundary edge drops, rotation to the field.
    - **Brady**: boundary apex (dime) rushes, field edge drops, rotation to the boundary.
    - **Manning**: Mike rushes, boundary edge drops, Rita/Linda with the safety inserting to the field to replace the Mike on #3.
    - **Cam**: boundary CB rushes, field edge drops, Rob/Lou to the boundary with the safety "spinning down wide to replace the CB as the ⅓ defender".
  - **Cover 2 simulators**:
    - **Fisher**: nickel rushes, boundary edge drops. "super rotation" with "2 TRAP" strong and "inverted 2 BUZZ" weak (CB deep, edge buzzes).
    - **Curry**: boundary CB rushes, field edge drops, the safety spins down as the squat defender. Tampa.
    - **Lakers**: "(Showing 1 SPLINTER) … stacked LB as the 4th rusher … through the A-gap while the Edges both drop as the Hook defenders. The post safety buzzes down as the Middle Run defender … down safety & Nickel … invert … Tampa ½."
- **Usage**: Eagles 2025: "Off-ball simulated pressures led the NFL at 37%" [S, W-MQ9]. The denominator is unclear; I read it as a share of pressure calls [I].

**Deuce (2-deep, 4-under behind 5)** (HNFL-302, 372/373, 119–121) [S]:
- **Corners**: "Soft Squat — Key #2-to-1. Stay on top of #1 unless #2 goes to the flat right now, then trap it."
- **Apexes**: "Deuce Hook/Wall — Key #2-to-1 and insulate #2 … Match the final #2." Plays as quarter flat if #3 is to them and vertical curl if #3 is away. Vs trips the backside apex plays **DOT** ("Drop off of #3. Do not carry vertical. Top-down any crossing route by the final #3").
- **Safeties**: "Deuce ½ … See #1's release to determine how much width … Prioritize #2 deep." **"Pop the top"**: if #2 is detached and the hook dropper is selling, hold off the pop pass before dropping (HNFL-373).
- "To any x2, play Deuce to both sides. To any x1, play DOT strong & Smack weak."
- **Sand Deuce** (dime): the safety to the call rushes with the dime; "Once Rip/Liz call is made, it does not change vs. motion" (HNFL-121).
- Variants: **Deuce Roll** ("super rotation to the pressure side behind a 6-man charge"), **Deuce Trap** (man-match), **Deuce Read**.

**Other pressure coverages** (HNFL-115/281/372) [S]:
- **Quattro**: 4-deep / 2-under behind 5, "3-over-2 quarters principles to each side with #3 Away rules", mostly vs stacks or an oversplit #1 next to an attached #2.
- **Quiz**: quarters to the nickel, Cover 0 away.
- **Hot zone**: 3-deep / 2-under behind 6, vision & break.
- **Tracy**: "Fire Zone … with a 4-strong overload involving the ILB & Nickel" (HNFL-263).
- **Spin**: a fire zone with "DL & Nickel (or LB/FS by formation)" (HNFL-264). Shared Tracy/Spin rules:
  - Post: "Lean to most dangerous side in 2x2. Overtake #3 vertical from Dime."
  - #3 Rec Hook: "You do not carry #3 vertical — FS will handle it."
  - [C] This differs from the HNFL-064 fire zone, where the midpoint carries #3.
- **Bandit** (man pressure with 2 low-hole players behind loaded 4-strong pressures; HNFL-216):
  - "LB away from pressure — Bandit drop to side of pressure: hole help / RB to your side / QB scramble."
  - "Edge rushers will peel on flare."
  - "Vs Empty the cover LB adjusts and takes the RB."
- **Cover 0 family** (HNFL-210):
  - **Train**: "any rusher can take the HB if he releases thru their lane".
  - **0 Dbl Hole**: 4-man rush, two hole defenders.
  - **Zilch**: zero with zone-match distribution.
  - **0 Lurk / 0 Hole (#)**: the high safety brackets a named threat. These are two-high-looking zero looks.
- **Sack-It** (empty pressure check; HNFL-215): "check Sack-It vs any aligned Empty or shift to Empty (not motion) … The Safety will pressure rush the RB" (IDX).

### B11. Red zone

HNFL-287–290 (via IDX §D) [S]: applies from "about the +15 yard line to the goal line"; "utilizing the back of the endzone as a 12th defender".
- **Red 7 Bracket**: +1 man-match per side; Cut/Cone/Inc/Banjo etc.
- **Red 6 / Red Pack**: Red Mod strong, Red Wild weak, Red Smack vs 3x1 with an oversplit weak #1.
- **Red 8 / Red Stuff**: Red Wild/Buster/Cloud strong, Red Quads/Mod/Trix weak.
- **Red 2 Tampa / Red 20 Tampa Rat**. **Red Hercules**. **Red Fence** (7 across at the goal line).
- **Red middle runner**: "maximum depth about 5 yards into the end zone."
- **Red 4 Mod**: "plays out more like Bracket."
- Read Optional: "Cover 4 … used in its purest form in the red zone" [S, W-RO2].

### B12. Run fits from two-high: consolidated table

From HNFL-137 [D], 139 [D] and 097. "Corresponding run fit responsibilities are determined by the coverage" (HNFL-139). Front = gap + ½, spill/overlap.

| Coverage to the flow side | 1st force | 2nd force | Alley | Plug (inside force) | Mike | Backside apex | Backside safety |
|---|---|---|---|---|---|---|---|
| Quads (quarters) | ¼-flat apex | corner | inside-¼ safety | (Mike) | scrape A–C | CBR | inside ¼ / pursuit |
| Cloud / Squat (halves; Stuff weak, 8 strong) | squat/cloud CB | deep-½ safety | deep-½ safety | slot apex | mid read A–C to flow | CBR | per call |
| Sky (Cover 3/9 rotated side) | rotated safety (curl-flat) | corner | post safety | playside hook | hook-curl | CBR | — |
| Lurk (Cover 1) | edge ("crush") | corner | post safety | playside midpoint | backside midpoint pursues | CBR | — |

Rams/Staley 3x1 example: "The EDGE tucks to the open side in the B-gap, and the DS attacks the A-gap and scrapes to the C-gap" [S, W-MQRAMS]. One web source says "the strong safety acts as the C-gap player against the run" [S, W-KOU]. [I] That fits the Cloud/Squat table, where the safety is 2nd force/alley.

### B13. Rotation mechanics and timing

- The safeties hold a common depth and width until late. Rotation is post-snap or "late in the cadence".
  - MOD/press-bail corners bail "usually late in the cadence -- sometimes post-snap" (HNFL-063) [S].
  - Tupac rotates "late in the cadence or post-snap" (HNFL-227) [S].
  - "the safeties usually stay in 2 High and don't rotate until after the ball has been snapped" [S, W-search summary].
  - Packers example: the spinning safety "jogs" down rather than sprinting, which keeps both pass and run options [S, W-EVELY].
- **Who rotates where:** see B0. Default 9 = SS to the post, WS down. 3 = WS to the post, SS down. Buzz = the safety drops to a hook while the apex keeps the flat. Cloud = the safety rolls out to the deep ⅓ and the corner sits.
- **Width of the weak safety's drop is set by the iso receiver's split** (HNFL-011) [D].
- **Pre-snap tells offenses look for** [S, W-RO2]: "linebacker alignment that leaves space for a down safety, and pressed corners that signal a cloud side."
- **Pre-snap read** [S, W-MQRAMS]: "A high weak-side safety suggests Quarters or Cover 2. A safety near the box suggests Cover 1 or Cover 3."

---

## C. Pre-snap rules: formation, field/boundary and motion

| Situation | Fangio-tree answer | Source |
|---|---|---|
| **Strength reference** | Nickel always aligns to passing strength over #2; safeties L/R (or strong/weak vs 3x1); corners L/R ("do not follow X/Z"); "All motions are bumped across". Nickel "runs with motion **only** if it changes the passing strength". | HNFL-324/325/056/063 [D/S] |
| Strength ties (2x2) | "If all else is equal, the call goes to the field side" (184). "No TE attached = closed call to the back" (055/058). Chicago: half to offset HB, back at home → half to field (229). | [S] |
| **2x2** | 6 Stuff / 8 / 4 Quads / 9 Nine (both #3/hooks combo #3) / Lurk (down safety away from nickel on #2 weak). Detached #2 → Read on that side; oversplit #1 weak → Smack; nasty #1 → Cloud or Jump. | 073, 324, 325, 194, 056, 240, 230/231 |
| **3x1** | Cover 4/8: **Trix** default ("TRIX (55%)" scouted); Book/Area/Stubbie/Stump to stay 3-over-2 weak; Cover 6: Book/Area + weak "Sink / Tight ½"; Cover 9: **Strap** (Site by GP); Lurk: down safety to the nickel on #3; fire zone: Freeze (Mike/Dime may flip). | 186, 194, 325, 273, 056, 203, 240, 059 |
| **Empty 3x2** | Book/Read (Quads/Stuff/8); Cubs (BAL Raven/6); Pound (Chicago); Cover 9: Grab (9 Buzz); Lurk: E look = down to nickel; Sack-It by GP. | 194, 324, 325, 212, 229, 056, 215 |
| **4x1** | Strap ("any x1 … 4x1"); Push (Will shifts to trips per MQ glossary). | 203; IDX web |
| **Bunch** | Box (Trix) 45%, Clue 20%, Squat (Trix) 15% (scouted); Box/Buster (Stuff), Squat w/Trix or Buster (8); Clue/Spot (9, FZ). Bunch definition: "#1 & #3 … within about 5–6 yards". | 186, 324, 325, 056, 281 |
| **Stack / reduced #1** | Zorro / Zone It (quarters), Clue (Cover 9/FZ), Triangle (man/GP). | 194, 324, 056, 064 |
| **Nub / attached #2 / 2-back / 12–21P** | "WILL 6 … primary coverage played … in the 2-back world and some 12P"; Patty if flow possible; quarters weak side vs x1: "Tight ¼ … man #1 unless In (China not available)"; I-form Lurk: 3-on-2 back pickups. | 184, 273, 095, 240 |
| **Field/boundary** | Rotation to the field or boundary by GP (2026 Cover 3/9); simulators named by field/boundary; Slide: nickel stays to the field. | 280, 226/227, 214 |
| **Motion: COS** | Nickel travels and the call follows ("Ringo/Lucky follows him!"); "NICKEL WILL RUN WITH A CHANGE OF STRENGTH MOTION! THAT IS NOT A MAN COVERAGE INDICATOR!" | 059, 192/291 [D] |
| **Motion: non-COS** | Bump across; Sand Deuce exception: call fixed. | 063, 121 |
| **Motion 2x2→3x1** | "handled with a TRIX adjustment" (scouted); Raven: "Coverage is adjustable on all motion!" | 193, 212 |
| **Jet** | "Shove it" (Tampa, Tracy, Spin). | 241, 263, 264 |
| **Y motion** | "Slide/Bump the front." | 055, 214 |

---

## D. Usage data (with years and definitions)

**League-wide shell vs post-snap coverage (definitions differ, so do not mix them):**
- **NGS, pre-snap two-high looks on pass attempts:** 44% (2019) → 63% (2024). Weeks 1–3 only [S, W-NGS-shift].
- **NGS, post-snap split-safety coverage on dropbacks:** 32.9% (2018), 34.1% (2019 avg), 37.8% (2021), 40.4% (2024), **42.0% (2025)** [S, W-NFL-SPLIT].
  - 2025 by type: Cover 2 13.9% (2018–24 avg 13.2%), Cover 4 17.2% (13.9%), **Cover 6 9.2%**.
  - Blitz from two-high 10.0% vs 39.7% otherwise.
  - Vikings (Flores) split-safety blitz rate 33.1% (2024) and 37.4% (2025).
  - Chiefs 58.2% split-safety usage in 2023 (team record).
- **TruMedia via theScore:** "20% in 2020 … peaked in 2023 at 22.6% … 21.6%" [S, W-SCORE]. **[C]** The definition is unknown and inconsistent with NGS. Do not use it.
- **MQ:** league Quarters 14% (2024), 15% (2025); Cover 6 8.5% (2024), "about 8–9%"; Cover 2 14.8% (2024); "Middle-of-the-field disguises rose to nearly 30%" [S, W-MQQ, W-MQ8].

**Fangio-tree teams:**

| Team / season | Data | Source |
|---|---|---|
| Broncos 2019 (Fangio) | PFF: Cover-3 18.5% and Cover-6 19.0% of coverage snaps | [S, W-PFF19] |
| Broncos 2019 (Fangio) | two-high "78%" (1st), light box 65% (2nd) | [S, W-COSELL] (definition unclear) |
| Broncos 2021 (Fangio) | two-high 72% (1st), light box 75% | same source |
| Rams 2020 (Staley) | two-high shell >75% of snaps | SIS [W-SHARP] |
| Rams 2020 (Staley) | light box 78% | SIS [W-SHARP] |
| Rams 2020 (Staley) | 3.8 YPC allowed (3rd) | [W-PFF-STALEY via search] |
| Rams 2020 (Staley) | five pass rushers on 90% of snaps (PFF) | [W-MQRAMS] [C]: likely "five on the line", not five rushers |
| Broncos 2020 (Fangio) | two-high shell >75% | SIS [W-SHARP] |
| Broncos 2020 (Fangio) | light box 77% | SIS [W-SHARP] |
| Dolphins 2023 (Fangio) | quarters ~12% | [S, W-MQQ] |
| Dolphins 2023 (Fangio) | disguise in the 39–61% band | [W-MQW6] |
| Eagles 2024 (Fangio) | quarters "nearly 20%", 5th in NFL | [S, W-MQQ] (the summary attributed this to "Dolphins 2024" [C]; Fangio coached PHI in 2024) |
| Eagles 2024 (Fangio) | blitz rate 4th-lowest | [W-search CBS] |
| Eagles 2025 (Fangio) | 87–90% two-high shell | [S, W-MQ9] |
| Eagles 2025 (Fangio) | 41% of closed coverages disguised; 98% open→closed | [S, W-MQ9] |
| Eagles 2025 (Fangio) | Cover 3 34% (3-Seam 11.6%), Quarters+6/8 33% (Quarters 14%), Cover 1 18% | [S, W-MQ9, W-MQ8] |
| Eagles 2025 (Fangio) | sim pressures "37%" | [S, W-MQ9] |
| Chargers 2023 (Staley) | disguise 26% | [S, W-MQW6] |
| Saints 2025 (Staley) | base: split-field 63% (lg 40%), Cover 3 ~⅓, quarters ~2× lg 17%, man ~4% | [S, W-MQW6] |
| Fangio-tree coaches | split-field 18–25% | [S, W-MQ8] |
| Scouted team (HNFL-186) | presentation 2-deep 75 / 1-deep 18 / 0-deep 7 | [S] |
| Scouted team (HNFL-186) | final middle-closed 49 / middle-open 43 | [S] |
| Scouted team (HNFL-186) | mechanics: match zone 55%, man 32%, zone 11% | [S] |
| Scouted team (HNFL-186) | nickel calls: 99 Weak Sky 21%, 44 MOD 17%, 11 Lurk 14%, 88 13%, 66 9%, 11 Dog 8%, FZ 6%, 99 Whip 5% | [S] |

**Repo BDB 2022 (PFF labels, weeks 1–9; `data/reviews/playbook-depth/nfl-defense-calls.json`).** Post-snap only; there is no pre-snap shell field.
- **Overall dropbacks:** Cover-3 family 31.8%, Cover-1 21.2%, Cover-2 14.0%, Quarters 13.1%, Cover-6 9.6% (L 4.8 / R 4.8), Cover-0 3.6%, 2-Man 1.8%.
- **Post-snap two-high** (C2 + Q + C6 + 2-Man) = **38.4%**. This is consistent with NGS 37.8% (2021) and 40.4% (2024).
- **By down & distance, two-high share** (computed here):

  | Down & distance | Two-high share | Plays |
  |---|---|---|
  | 1st & 7–10 | 40.4% | 3214 |
  | 2nd & 3–6 | 33.8% | |
  | 2nd & 7–10 | 41.9% | |
  | 2nd & 11+ | 53.1% | |
  | 3rd & 1–2 | 19.4% | |
  | 3rd & 3–6 | 27.1% | |
  | 3rd & 7–10 | 34.5% | |
  | 3rd & 11+ | 49.5% | |

  - Two-high rises with distance and falls in short yardage and the red zone. Goal-to-go is Cover 0 33.6% and Red Zone 26.7%.
- **By defensive personnel:** Cover-3 41% in base, 32% in nickel; Cover-1 29% and 2-Man 5.6% in dime.
- **Simulated pressure (DL-only definition): 1.48% of dropbacks.** It is 5.2% when edge OLBs count as droppers. Blitz (5+) 28.0%.
- **Comparison [I]:**
  - A Fangio team should be ~50–60% post-snap two-high: Eagles ~33% Q/6/8 plus Cover 2/2-Man. Compare the 2022 league average of 38%.
  - It still plays ~34% Cover 3, mostly weak-rotated 9/3-Seam, and ~18% Cover 1.
  - Its pre-snap two-high is ~85–90% versus ~60% league-wide.
  - Sim pressure: Fangio and Macdonald-tree sim rates are far above the 1.5–5% league rate.
  - The repo's `two-high` tree multipliers give roughly C3 28%, C1 13%, C2 17%, Tampa 2.6%, C4 18%, C6 18% (my arithmetic on `src/game/playcaller.ts:333–343` before situational factors). Cover 2 looks high and Cover 1 low against the Eagles 2025 numbers. Within Cover 3, `cover9` gets only ~26% of the family weight (cover3 Sky ≈26%) with matchRate 0.5. In the Fangio tree, weak rotation (9) and 3-Seam should dominate (E2).

---

## E. Prioritized gap list against the repo catalog and engine

Repo state used here:
- `src/playbook/coverages.ts`: 33 calls including `cover9`, `cover6`, `cover6_book`, `cover6_rev`, `cover4_poach`, `cover4_stubbie`, `cover4_box`, `cover4_palms`, `cover1_robber`, `tampa2`, `cover2man`, `split_quarters_2man`.
- `defense.ts` pressures: `mike_a`, `will_b`, `double_a`, `nickel_edge`, `fire_zone`, `zero_6`.
- `Pressure.droppers` maps a slot to a **ZoneId only**.
- Disguise: `alignDisguised` stands DBs in the shown call and rotates "at the snap" (`alignment.ts:652`).
- `resolveZeus` maps S1/W1/inside to Cover 8/6/4. Structure tags include `trips`, `bunch_*`, `stack_*`, `empty_3x2`, `nub_*`, `two_back`, `iso_weak`, `reduced_*`, plus `backOffset` and `strongToField`.
- Match rules include `c3_seam`, `poach_safety`, `stubbie_safety`, `vertical_hook`, `cloud_corner`, `sink_corner`, `read_hook`, `mush`, `rat`, `robber`, `clue_corner`.

Priorities reflect frequency × consequence in Fangio film (D), and how much engine work each needs. Each item gives the rule spec to implement and the decision it serves.

### E1 (P1) Nickel-side strength and COS-only travel (engine, small)

- **Gap.** The repo orients `_s`/`_w` to "the side with more receivers" (`coverages.ts` header). Fangio orients every rotation to **the nickel side**:
  - The nickel aligns over #2 to passing strength.
  - Ties break to the field (HNFL-184), else the back side or TE (HNFL-055).
  - The nickel moves only on change-of-strength motion. Other motions are bumped (HNFL-063, 324, 059).
- **Spec.**
  - Add `nickelSide: 'S'|'W'` resolved pre-snap: 3x1 → trips side; 2x2 → field side, unless a GP or TE rule applies.
  - On motion: if the motion changes the receiver-count strength, the NB travels and nickel-relative calls (Rob/Lee, Roy/Lou, Ringo/Lucky) flip. Otherwise apexes bump across and the rotation side holds.
  - Exception flag `fixedVsMotion` (Sand Deuce).
- **Why first.** Weak rotation, Stuff/8 side and Ringo/Lucky all inherit from this. Wrong orientation produces wrong rotations on every 2x2 snap.

### E2 (P1) Make Cover 9 the two-high tree's Cover 3, with its formation adjustments (catalog + rules)

- **Gap.**
  - `cover9` exists (SS deep_mid, FS curl_flat_w `c3_seam` at 9 yds, hooks `c3_hook`, `mike_3`). It has no structure checks, and the two-high tree weights it under Cover 3 Sky.
  - Fangio's Cover 3 is overwhelmingly 9 (HNFL-186: 99 Weak Sky 21% vs 33 Buzz 3%). The Eagles' Cover 3 is 34%, of which 3-Seam is 11.6%.
- **Spec: `cover9` ("Nine", any x2):**
  - CB_S/CB_W `c3_corner` as Tight ⅓ = man #1 unless shallow ("jersey visible within 2 yds"), then zone the ⅓ (In call).
  - NB: Seam/Flat M-C-D on #2 strong.
  - FS (rotating) Seam/Flat M-C-D on #2 weak, from the two-high depth.
  - LB_M / LB_W(DB): **#3/Hook combo**. The LB to #3's side matches the final #3; the LB away zones the hook.
  - SS: post, middle ⅓, inside-out squeeze.
- **Checks to add:**
  1. `trips`/`iso_weak`/x1 → **`cover9_strap`**:
     - Mike = new rule **`bonus_hook`**: overdrop toward the apex of #2/#3 strong, relate to the final #3 underneath, no vertical.
     - DB/LB_W = new rule **`three_rec_hook`**: key #3→#2; cut off/carry any final #3 up or over the LB level; if #3 cancels, zone the hook and look for the final #4 coming to you.
     - FS still Seam/Flat on weak #2 (RB).
  2. `bunch_*`/`stack_*`/`reduced_*` → **`cover9_clue`**: Clue ⅓ corner key 2→1 (existing `clue_corner`) + zone pickups.
  3. `empty_3x2` → **`cover9_grab`** (9 Buzz): DB → Seam/Flat on weak #2; FS → `three_rec_hook` on the final #3 up/over.
  4. **Push** as a live rule inside the seam/flat and #3/hook rules: if #3 (or #4) releases flat immediately, the apex chases the flat top-down with wheel alert; the callside hook pushes to the new #3; the backside hook pushes to the hook.
- **Playcaller.** For the `two-high` tree, put most Cover 3 weight on `cover9` (+ `cover3_seam`); keep `cover3` Sky small. Target: Cover 3 family ~30–35% with ≥⅔ weak rotation [I from D].
- **Engine needs.**
  - Two new match rules (`bonus_hook`, `three_rec_hook`). Possibly `c3_hook` + `vertical_hook` cover part of this; verify against the specs above.
  - The rotating FS must start from the shown two-high depth (E3).
- **Evidence.** HNFL-054, 056 [D], 063, 203.

### E3 (P1) Rotation timing as a modeled cost (engine)

- **Gap.** Disguise starts the rotation exactly at the snap with a shown coverage picked at random from a pool (`playcaller.ts:414–419`). Fangio's shell is **one consistent home look**, ~90% of snaps. The rotation timing varies: late cadence, at the snap, or post-snap jog.
- **Spec.**
  - Add `rotation?: { startsAt: number /* s relative to snap, negative = pre-snap */ }` on the call, with defaults per role. Safety spin −0.3…+0.2 s; MOD bail −0.5…+0.3 s; Tupac late cadence or post-snap.
  - The **two-high tree always shows one "home shell"**: both safeties at quarters depth (10–12 over #2, or 12–14), apexes "heads-to-wall", corners in Clue/MOD alignment. Do not show a random coverage.
  - A rotating safety's run/pass fit and route matching begin from where he actually is (physics), not his landmark.
  - The QB's coverage belief (`qbmind.ts`) should read the shell, then the movement, from delayed information. Rotation started pre-snap leaks information; post-snap rotation costs the defender depth/time. That is the real trade-off, not a rule.
- **Decision this serves.** Whether disguise produces the late-read and "muddy read" effect (more checkdowns, HB-DP), or a free advantage.
- **Evidence.** HNFL-063 ("late in the cadence -- sometimes post-snap"), 227 (Tupac), W-MQ9/W-MQSB/W-EVELY.

### E4 (P1) Cover 8 Trix and Cover 6 trips/half-side tools (catalog)

- **Gap.** `cover6_rev` (Cover 8) has no trips check and no Trix. `cover6` checks trips only to `cover6_book`. Half-side tools (Smack/Read/Patty/Sink) are absent.
- **Spec `cover8_trix`** (trips or COS-to-3x1):
  - CB_S: Squat (`cloud_corner` or a new `squat_corner`: funnel #1 inside with 2 lateral shuffles, sink with #1 unless a flat threat, ball brings him down; primary run force).
  - NB: Vertical Curl with "trips rules = deep hook" (`vertical_hook`): wall #2, carry #2 only if #3 is vertical.
  - LB_M: Middle Hook, aggressive on the final #3 low, **no vertical** (since the FS has #3).
  - SS: deep ½ strong.
  - FS: `poach_safety` keyed #3→X (overtake any #3 vertical or over; else zone the ¼ / rob the X's dig).
  - CB_W: Tight ¼ = man #1 unless shallow, no China.
  - LB_W/DB: Seam/Flat on the RB / weak #2, or "Patty" (RB flat).
- **Spec `cover6_area`** (trips, exchanges):
  - CB_S soft ¼ with China built in.
  - NB ¼ flat (outermost underneath).
  - LB_M ¼ hook (innermost underneath).
  - SS Topper ("#2 or #3 deep = top it; both deep = vision & squeeze").
  - Backside: squat CB / DB vertical hook / FS deep ½.
- **Cover 6 trips weak adjustment (`stuff_sink`)**: CB_W `sink_corner` (owns any upfield #1); FS tight ½.
- **Half-side tags**, as per-side variants keyed on structure:
  - `iso_weak` + oversplit → **Smack**: corner funnels #1 **outside**; FS wide ½ landmark ≈3 yds outside the numbers at ≈20 yds.
  - Detached weak #2 → **Read** (soft-squat CB traps a #2 flat inside 5 yds; FS 2→1 read).
  - `two_back`/RB to the iso side → **Patty**: the weak LB owns the RB flat.
  - These are best as side modifiers rather than whole new calls [I]. A minimal version adds `cover6_smack`/`cover6_read` calls.
- **Engine.** Probably none beyond rules. Check that `cloud_corner` implements squat (funnel inside, sink) rather than hard cloud (flat), since Fangio's half side is Squat by default (HNFL-324 [D]).
- **Evidence.** HNFL-073 [D], 273, 324 [D], 325, 230, 231, 241; W-RO2.

### E5 (P1) Simulated pressures as first-class calls (engine: dropper rules; catalog)

- **Gap.** Only one sim-like pressure exists (`fire_zone`: SS+Will blitz, DE_W drops `curl_flat_w`, Cover 3). `droppers` accepts a zone but **no match rule**. No 4-man sims, no Bonus FZ, and no two-high coverages behind sims.
- **Engine spec.** Change `droppers: Partial<Record<DefSlot, ZoneId | UnderSeat>>` (zone + rule), and let a Pressure name its coverage family (fire zone / bonus FZ / quarters / QQH). The dropped lineman's coverage is limited by his own body (speed, change of direction, play recognition). Never by a rule that weakens the call.
- **Catalog: five calls cover most of the film.**
  1. **Whip** (4-man; HNFL-060):
     - Blitz: DB (or LB_W in nickel) through the weak B/C gap.
     - DE away from the call: **bonus drop between #2 and #3** (`bonus_hook`); DE to the call crashes/contains.
     - Coverage `cover9`/`cover9_strap` with FS seam/flat away from the nickel and SS spinning to the post.
  2. **Slug** (4-man; HNFL-057):
     - Blitz: NB off the edge (contain).
     - DE_W drops Seam/Flat (M-C-D) on weak #2.
     - Coverage: Ringo/Lucky fire-zone 3-deep with SS seam/flat strong (replaces the NB), LB_M/LB_W #3/hook, FS post, Tight ⅓ corners.
  3. **Wasp/Bee "Sting"** (4-man; HNFL-242):
     - Blitz: open-side ILB through the A gap.
     - Both edge OLBs drop; ends contain.
     - x2 → Quads (edges as quarter-flat apexes). x1 → Buzz: SS "curl insert" key #2→1, Sam buzz flat, Will seam/flat, cover LB #3 RH, Clue ⅓ strong CB, Tight ⅓ weak CB.
  4. **Will 6 / Backer 4 / Sam 8** (base; HNFL-184):
     - QQH / Quads / HQQ behind a 4-man rush where one off-ball LB rushes and the edge (3-4 OLB) drops as the apex.
  5. **Ringo/Lucky fire zone "Freeze"** (5-man; HNFL-064), the existing `fire_zone` made explicit:
     - Corners Tight ⅓.
     - Apexes Seam/Flat with "#3 away = no deliver".
     - Midpoint #3 RH (carry final #3; Push when #3 is fast flat; take #3 flat if #2 is up).
     - Post middle ⅓.
- **Decision this serves.** Whether 4-man pressure with an unknown rusher creates protection mistakes, unblocked rushers and hot-throw timing without opening coverage holes. The BDB league sim-pressure rate (1.5–5%) is the comparison control.

### E6 (P2) Cover 1 from two-high: Lurk / Robber rotation (catalog + small rule)

- **Gap.** `cover1_robber` has `shell:'one-high'` with no `look:'two-high'` and no formation logic. The Fangio Cover 1 is **Lurk**: rotate from the Cover 9 look.
- **Spec `cover1_lurk`** (look two-high):
  - Corners man #1 (outside leverage).
  - NB man #2 strong.
  - **Down safety (Randy/Leo):** 2x2 → the safety away from the nickel comes down, man on weak #2. 3x1/empty → the nickel-side safety comes down, man on #3 strong.
  - The other safety goes to the post (middle ⅓).
  - **LB_M & LB_W/DB, Back/Hook:** HB offset to you → man on the HB. HB away → "lurk": zone the hook, inside-out squeeze help. HB at home → combo the HB. Mesh → switch (cut off the shallow with leverage; the original defender zones the hook).
  - I-form → SS + Mike + Dime 3-on-2 on the backs.
- **Rule needed.** `combo_back`: man if the back releases to your side, else zone the hook. Existing `mike_3`/`robber` may be adapted.
- **Run fit.** Edge = force ("crush"), post = alley, playside midpoint = plug (HNFL-139).
- **Evidence.** HNFL-240, 209, 008 [D].

### E7 (P2) Targeted coverage completeness: Zeus vs trips, Lord, Ring, Chicago

- **Gap.** `resolveZeus` ignores formation family. The `ref === 'W1'` ternary has two identical branches (dead distinction).
- **Spec.**
  - Target is trips #1 → `cover8_trix`.
  - Target is the backside iso #1 → `cover6` with trips check Book/Area (half side squat + FS deep ½ over him).
  - Target is inside (slot/TE/#3) → Quads with a Cone tag (NB + SS bracket #2) or Trix if #3.
  - Target in empty inside → Pound/Quads + Trix (HNFL-261).
  - **Lord** = Roy/Lou to a jersey (same resolver, any coverage).
  - **Ring** = the man version: Fist on a wide target, Pounder elsewhere (needs E9).
  - **Chicago**: the half side goes to the offset HB or the field when no target is set.
- **Evidence.** HNFL-229, 260, 261 [D]; W-MQZ.

### E8 (P2) Run fits keyed to the post-snap coverage (verification, then rules)

- **Gap.** `src/sim/run-fits.ts` derives support from coverage seats (line 77 comment). The Fangio force table (B12) must hold per side and per call. In particular:
  - quarters → apex force, safety alley;
  - squat/cloud → CB force, safety 2nd/alley, slot plug;
  - Sky (rotated FS in Cover 9) → safety force;
  - Lurk → edge force;
  - backside apex → CBR.
- **Spec.** A table `forceBy[family][side] = {force, secondForce, alley, plug, cbr}` used by run-fit assignment. The rotating safety's fit begins from his actual (two-high) position, so the light box is real and paid for by depth.
- **Decision.** Whether light-box runs gain because of a missing alley or CBR player (a wrong mechanism), or because of the honest numbers deficit.
- **Evidence.** HNFL-137 [D], 139 [D], 097, 061.

### E9 (P2) Hands family: Pounder and bracket tags (catalog + `double` man role)

- **Gap.** There is `cover2man` (Fist) and `split_quarters_2man`. **Pounder** (4-man: two inside-¼ safeties, man under with leverage toward near help) and Finger/Rolex are missing. The **Cut/Cone/Inc** brackets are missing (the `double` and `overTop` man flags exist).
- **Spec.**
  - `pounder`: CBs/NB/DB/LB man (inside leverage). SS/FS inside ¼, keying #2 to #1 for a double.
  - `finger` = Fist strong / Pounder weak; `rolex` the reverse.
  - Tags:
    - **Cut**: CB + safety on #1; CB under/outside, safety over/inside.
    - **Cone**: NB/DB + safety on #2; NB outside-under, safety inside-over.
    - **Inc**: reversed Cone.
    - **Trix (man)**: FS takes #3 up/over.
- **Evidence.** HNFL-261/262 [D/S], 008/011 [D].

### E10 (P3) Tampa variants and Deuce

- **Tupac / Miami / Boca.**
  - **Tupac** (Tampa from a Cover 1 man presentation, late rotation): needs E3 timing and `shown: cover1`.
  - **Boca**: Tampa with a buzz invert to the nickel side.
  - **Spec delta vs `tampa2`**: safeties take a **wider Tampa ½ landmark set by #1's release**; Mike "Middle Read #3", opening to the nickel side; apexes "Hook #2" (reroute #2, drop inside the final #2) (HNFL-241).
- **Deuce** (5-man 2-deep / 4-under; HNFL-302/373):
  - Corners soft squat 2→1 (trap #2 flat).
  - Apexes deuce wall on #2 (quarter flat if #3 is to them, vertical curl if away). The backside apex plays DOT vs trips.
  - Safeties deuce ½ prioritizing #2 deep, with "pop the top".
  - Pairs with E5 droppers (the rushing safety comes from two-high).

### E11 (P3) Red-zone versions, Cover 0 tags, Sack-It

- **Red 6 / Red 8 / Red 7 Bracket**: shallower safeties, Red middle runner ≤5 yds into the end zone; the end line acts as a defender (HNFL-287–290).
- **Cover 0 Train rule**: any rusher takes the HB through his lane (HNFL-210).
- **Sack-It**: vs aligned empty, the safety rushes and the coverage locks.
- Lower priority: BDB goal-to-go is already Cover 0/RZ-dominated league-wide, so this is not Fangio-specific.

### E12 (P3) Personnel and front names

- **Penny** (3-3-5 showing 5-1; "Penny Sam 8") and **Cheat/Cassie** sub fronts (3 & 9 closed, 2i open).
- The repo has `tite`/`odd`/`wide9`. Penny personnel is missing from `DefPersonnelId`.
- Needed only if E5 sims are installed from the Penny looks named in HNFL-186 (e.g. "SAM 44 25%, WILL 99 WHIP 20%").

---

## F. Conflicts between sources (summary)

1. **Cover 6 / Cover 8 names.**
   - Fangio/HNFL-073/115/324: Cover 6 = "Stuff" = QQH (quarters to the nickel).
   - HNFL-280 (2026) and BAL: sub Cover 6 = "Pack" and "Stuff" = Cover 8 (HQQ).
   - MQ-Zeus: "Fangio's system mainly calls this [QQH] 'Cover 6' … Stuff: Quarters to the Ni side and Cover 2 away".
   - Keep the structure, not the word.
2. **Is Fangio "Cover 3 dominant" or "Cover 6 based"?**
   - PFF 2019 Broncos: C3 18.5% ≈ C6 19.0%.
   - MQ 2025 Eagles: C3 34%, Q+6/8 33%.
   - Analysts note that rotations make charting unreliable (W-search summary).
3. **Primary run force in Quads.** HNFL-139 says apex force with the safety as alley. HNFL-193 (scouted team) says the safeties are primary force.
4. **Trix key.** "#3-to-X" (HNFL-197, 230) vs "#2-to-X" (Sub 8 diagram OCR, HNFL-325). [I] The safety keys #3 first, then #2.
5. **Site vs Key; Grab vs Wasp** (HNFL-203 vs 304; HNFL-063 vs 283). Wasp is also a 4-man sim (HNFL-242).
6. **Fire-zone midpoint.** It carries the final #3 (HNFL-064). In Tracy/Spin it does not, because the FS overtakes #3 (HNFL-263/264).
7. **Quarters safety depth.** 10–12 (HNFL-073/193) vs 12–14 (HNFL-092/202) over #2.
8. **Two-high league rates.** NGS 63% pre-snap (2024 wks 1–3) vs NGS 40.4% post-snap (2024 season) vs TruMedia ~21.6% (unknown definition).
9. **"Cone".** Fangio/HNFL = a bracket on #2 (NB + S). Saban = a bracket on #1.
10. **Nickel vs motion.** It runs with COS only (most sheets), except Sand Deuce (fixed).

---

## G. Sources

**In-repo (HNFL IDs)**
- Images viewed: 008, 011, 056, 073, 137, 139, 261, 324.
- OCR read: 007, 054, 057, 059, 060, 061, 063, 064, 097, 115, 121, 184, 185, 186, 193, 194, 203, 209, 210, 211, 213, 216, 226, 227, 228, 229, 230, 231, 240, 241, 242, 251, 260, 262, 263, 264, 273, 275, 280, 281, 287, 291, 302, 310, 325, 372, 373.
- IDX: `docs/references/coverage-checks/honestnfl-index.md`. Web index: `docs/references/coverage-checks/web-sources.md`.
- Data: `data/bdb2025-summary.json`, `data/reviews/playbook-depth/nfl-defense-calls.json`.
- Code: `src/playbook/coverages.ts`, `src/playbook/defense.ts`, `src/playbook/types.ts`, `src/game/playcaller.ts:320–430`, `src/playbook/alignment.ts:387,652`, `src/playbook/structure.ts`, `src/sim/coverage/rules.ts`.

**Web**
- W-SHARP: Sharp Football Analysis (Pizzuta, 2021), SIS 2020 data — https://www.sharpfootballanalysis.com/analysis/two-high-shell-staley-fangio-nfl-defense-2021/amp/
- W-MQ9: MatchQuarters, "Fangio's Cover 9: The Eagles' Weak-Rotation Cover 3" (preview) — https://www.matchquarters.com/p/fangio-cover-9-eagles-two-high-disguise
- W-MQ8: MatchQuarters, "Fangio's Cover 8: Trix/Poach" (preview) — https://www.matchquarters.com/p/fangios-cover-8-trix-poach-mechanics
- W-MQQ: MatchQuarters, Fangio quarters, Eagles 2024 (preview) — https://www.matchquarters.com/p/vic-fangio-quarters-coverage-eagles-scheme-2024
- W-MQZ: MatchQuarters, "Explaining Fangio's Sub-Zeus tag" (preview) — https://www.matchquarters.com/p/explaining-fangios-sub-zeus-tag
- W-MQSB: MatchQuarters, Super Bowl coverage concepts (preview) — https://www.matchquarters.com/p/three-coverage-concepts-that-helped-win-the-super-bowl-nfl-philadelphia-eagles-kansas-city-chiefs-vic-fangio-andy-reid-patrick-mahomes
- W-MQAMB: MatchQuarters, "How Vic Fangio Creates Ambiguity" (preview) — https://www.matchquarters.com/p/fangio-creates-ambiguity-in-coverage-dolphins
- W-MQRAMS: MatchQuarters, "The Rams' Defensive Primer Pt. 1" — https://www.matchquarters.com/p/the-rams-defensive-primer-pt-1
- W-MQW6: MatchQuarters, Saints "Will 6" (Staley) (preview) — https://www.matchquarters.com/p/saints-will-6-coverage-brandon-staley-base-defense
- W-RO1: The Read Optional, "Book of Fangio Part I" — https://www.readoptional.com/p/the-book-of-fangio-part-i-the-philosophy
- W-RO2: The Read Optional, "Book of Fangio Part II" — https://www.readoptional.com/p/the-book-of-fangio
- W-NFL-SPLIT: NFL.com (NGS), split-safety usage 2018–2025 — https://www.nfl.com/news/the-coverage-that-turned-the-seahawks-into-super-bowl-winners-and-is-taking-the-nfl-by-storm
- W-NGS-shift: NFL.com analytics, "How Defensive Schemes are Shaping the NFL's Passing Game in 2024" (via search snippet; the page 404'd on fetch) — https://edge-operations.nfl.com/gameday/analytics/stats-articles/how-defensive-schemes-are-shaping-the-nfls-passing-game-in-2024
- W-NGS25: NFL.com, NGS 2025 metrics (disguise definition) — https://www.nfl.com/news/next-gen-stats-new-advanced-metrics-you-need-to-know-for-the-2025-nfl-season
- W-SCORE: theScore (TruMedia) — https://www.thescore.com/nfl/news/3084522/return-of-ball-hawking-safeties-is-stifling-nfl-passing-offenses
- W-PFF19: PFF 2019 coverage rankings — https://www.pff.com/news/nfl-2019-nfl-secondary-rankings
- W-COSELL: Greg Cosell "five defenses" (inkl repost) — https://www.inkl.com/news/the-xs-and-os-with-greg-cosell-five-nfl-defenses-that-will-be-very-different-in-2023
- W-ITB: Inside the Birds, Fangio sim pressures — https://www.insidethebirds.com/13365-2-philadelphia-eagles-vic-fangio-sim-pressures/
- W-EVELY: Dusty Evely, "Stopping the run from two high" — https://dustyevely.substack.com/p/stopping-the-run-from-two-high
- W-KOU: Coach Kou, Fangio schemes — https://coachkoufootball.substack.com/p/vic-fangios-successful-defense-schemes
- W-FFR: Football Film Room (Kehoe, 2023) — https://www.footballfilmroom.com/p/the-two-areas-that-will-determine
- W-RINGER: The Ringer, Staley run defense 2022 — https://theringer.com/2022/08/05/nfl/brandon-staley-los-angeles-chargers-run-defense-2022-sebastian-joseph-day-khalil-mack
- PFF Staley Chargers scheme (search snippet: 2020 Rams 3.8 YPC, 3rd) — https://pff.com/news/nfl-brandon-staley-los-angeles-chargers-personnel-defensive-scheme
- Blocked (403) or paywalled, not used beyond titles: Bleeding Green Nation "Vic Fangio Defense 101" parts 2–4; Blogging the Boys, Dolphins scouting report; FiveThirtyEight two-high article (now redirects).
