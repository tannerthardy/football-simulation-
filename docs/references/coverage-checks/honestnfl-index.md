# Coverage checks and adjustments: index of in-repo sources

Repo: `/home/user/football-simulation-` at `5629d006`. Nothing in the repo was edited.

## Conventions

- **Citations:** `HNFL-NNN` is a HonestNFL sheet. Its OCR text is at `docs/references/honest-nfl/text/<topic>/hnfl-NNN-*.md` and its image at `.../images/<topic>/hnfl-NNN-*.jpeg`. `MS §x` is `docs/references/Coverage_Operating_System_Manuscript.md`. `HB-DP` is `docs/football-handbook/defense-and-perception.md`, and `HB-PC` is `playcalling-and-schematic-packages.md`.
- **Evidence tags:**
  - **[S]** means the text states it, from OCR that I judged legible.
  - **[D]** means I confirmed it, or read it only, from the original image.
  - **[I]** means my inference or synthesis. It is not stated in the source.
- **Images viewed (20):** HNFL-016, 024, 025, 051, 053, 069, 120, 195, 203, 211, 212, 214, 228, 230, 269, 270, 272, 274, 291 and 365. All other HNFL rules come from OCR. Where OCR was fragmentary I relied only on the legible lines.
- **Missing file:** `docs/references/nfl-playbook-sources.md` does **not exist** in this checkout. No file named like it exists either (`find . -iname "*playbook*"`). The handbook files were read instead. They hold few concrete check rules. They point to the manuscript, to public Rip/Liz and Cover 7 articles, and to HB-PC P7, which says "Solo, Poach, Stubbie and Mable do not establish identical detailed rules across teams."
- **Provenance:** HonestNFL is an offense-side teaching archive (QB manual, "how we attack it"). Some sheets read like scouting reports of opponent defenses. These are the Ravens (Baltimore), Cowboys/Eagles "Sub" and "Roll" installs, and the RSG reports. Terms differ by "team". The labels CHI/BAL/DAL/PHI used below are the sheet headers, not authenticated NFL installs.
- **Manuscript caveat:** the manuscript calls its own vocabulary "illustrative, not a universal NFL vocabulary" (MS §3.1). It also warns there is "no universally fixed five-yard rule" (MS §4).

### Shared vocabulary

These definitions are needed to read the rules below.

- **Numbering and Final #s.** Receivers are counted outside-in as #1/#2/#3. **"Final #1-2-3-4"** means "receiving threats from outermost to innermost within the pattern after distribution" (HNFL-031, 063, 190) [S].
- **Positions.**
  - **Apex** is the defender between the corner and the midpoint, aligned relative to #2 (HNFL-359) [S].
  - **Midpoint** is the defender aligned relative to #3 [S].
  - In **zone alignment**, "Corners align relative to #1, Apexes align relative to #2, and Midpoint aligns relative to #3. Corners do not follow X/Z across vs. slot. All motions are bumped across." (HNFL-063, 065, 190, 283, 284) [S]
- **Match / Carry / Deliver / Zone off.**
  - **Match** is "latching onto a route that releases into the defender's leverage."
  - **Carry** is "running with vertical routes ... into their deep help."
  - **Deliver** is "passing off a route that releases away from the defender's leverage into their help underneath."
  - **Zone off** is "converting from a man technique to a zone technique with pattern reads to find work."
  - Sources: HNFL-031, 065, 075 [S].
- **#3 Away.** "#3 occupies the Midpoint." Therefore the flat defender (1/4 Flat or Seam/Flat) "is also responsible for taking #2 back across the formation (no delivery)" (HNFL-065, 190, 284) [S].
- **2-3-2 principle.** "Apexes match the final #2 to their side and the Midpoint matches the final #3." It applies to Quarters and Fire Zone (HNFL-065, 190) [S].
- **Lock / MEG / MOD / MUSH.**
  - **Lock**: man on all routes by a receiver inside a non-man concept (HNFL-031) [S].
  - **MEG**: "Man Everywhere he Goes" (HNFL-031; Stubbie spells it "M.E.H.G." in HNFL-270) [S].
  - **MOD**: "Man Outside & Deep" unless a China or In call is made (HNFL-031) [S].
  - **MUSH**: "Man Unless Shallow" (HNFL-270, 228) [D].
- **Alignment terms** [S]:
  - Clue alignment: corner 7+ yards deep, outside #1.
  - Wall alignment: apex or midpoint inside the receiver, "about 5 yards deep"; HNFL-094 gives "1 yard inside and 4-6 yards deep".
  - Squeeze alignment: outside the receiver, about 5 yards deep.
  - Heads alignment: head-up, used as disguise.
  - MOD alignment: press-bail.
  - Quarters alignment: 10-12 yards over #2 (HNFL-033, 192). HNFL-092 and 202 instead say "HEAD-UP FROM 12-14 YARDS".
  - Halves alignment: 14+ yards over #2 (HNFL-068, 291).

---

## A. Pre-snap formation checks, by offensive structure

### A1. 2x2 (normal splits, including attached-TE "Pro/Twin")

**Base defaults by family**

**Quarters "QUADS" / "MOD" / "MEG"** (HNFL-033, 096, 098, 192, 194, 244, 333, 332; Cover 4 glossary HNFL-190) [S]. These are 4-over-3 to the #3 side and 3-over-2 away from #3.

- **Corner, Quarters (1/4).** "Man on #1 unless a China or In call is made", then zone the 1/4.
  - From Clue alignment this is "Quads"; from press-bail it is "MOD"; locking #1 is "MEG".
  - **MEG** = "Corners MEG both #1's, 5-over-3 inside with normal Quads rules (no China)" (HNFL-033, 192).
  - Pre-snap leverage is set by the split: "If #1 is oversplit, play from an inside position. If #1 is a minus split, play from an outside position and widen as needed" (HNFL-093, 201).
- **Apex, Quarter Flat.** Wall alignment, key #2 to #1.
  - "Reroute #2 up the seam ... match 1st flat of #2 & #3 or the final #2 underneath."
  - "Deliver #2 shallow to the 1/4 hook defender unless #3 is away, then you must take #2 shallow" (HNFL-096, 098).
- **Midpoint, Quarter Hook.** Key 3-2-1. "Match final #3 ... must carry if they go vertical" (HNFL-096).
- **Safety, Inside 1/4.** Key 2 to 1. "Match #2 up the seam with vertical separation. If #2 cancels, zone the 1/4 and squeeze to #1" (HNFL-077, 096). "By G.P., we may rob the post instead" (HNFL-077).
  - Mindset: "If #2 is attached to the core, it is played with a curl-to-post mindset. If #2 is detached, play post-to-curl" (HNFL-077) [S].
- **When to check Quads:** "Check Quads when #3 is not a vertical threat or mismatch for the Midpoint (Mike) defender" (HNFL-096, 198) [S].

**Read / Palms / 2-Read / Clamp / Catch / Kathy / Hold / Zone It / Switch** (HNFL-051 [D], 030, 219; Cover 4 glossary HNFL-190). Played vs **a detached #2**. "Think quarters *unless* #2 is out or flat under 5y" (HNFL-051) [D].

- **Corner, Soft Squat.** Key #2 to #1.
  - #2 up/in: match #1 with depth.
  - #2 out/flat: **trap it** [D].
- **Apex, Read Curl.** Key #2 to #1.
  - #2 up: wall, see #1.
  - #2 out/flat: zone the curl [D].
- **Safety, Read #2.** Key #2 to #1.
  - #2 seam: 1/4 technique.
  - #2 out/flat: "get width to #1 w/ depth" [D].
- **Smash rule:** "Smash rule is built in" [D].
- **Calls**, from the diagram routes [D]:
  - Crash (#1 under): "UNDER" = help from CB. The SS keeps squeeze help on #2. The CB "Under = zone your 1/4". The Ni "Under = squeeze #1".
  - Hank, an "OUT" call:
    - Ni zones the curl.
    - CB cuts off #2.
    - SS pushes to #1 and drives on the curl.
  - Lion, an "IN" call:
    - CB drives and latches on #1.
    - SS drives down and cuts off #1.
    - Ni walls #2.
- **Selection rule:** "Played within Cover 4/6/8 to a detached #2, typically in scenarios where #2 is more threatening than #1" (HNFL-195) [D].
- **Glossary version:** "READ = A 3-over-2 key & match Quarters concept that plays as Quads or Wild (#2 Flat) based on #2's release" (HNFL-190) [S].
- HNFL-219's OCR interleaves two panels. One is a MEG-style panel: "locks the corner onto #1 and plays normal Quads rules inside". The other is the READ panel: "plays as Wild or Quads based on #2's release (#2 flat converts it to Wild)" [S].

**Halves "WILD"** (HNFL-068, 291 [D], 334; Cover 2 glossary HNFL-131/285/293) [S].

- **Corner, Squat.** Funnel #1 inside, sink, and see #2/#3 for a flat threat. "No flat threat = man under #1. Ball brings them flat."
  - Squat alignment: "Cloud (5-7 yards) depth about a yard outside of #1. Collision #1 on 2 lateral shuffles" (HNFL-099, 255).
  - Primary force vs the run (HNFL-097).
- **Apex, Vertical Curl.** Key 2-1. "Wall #2 ... match #2 up & in. If #2 is flat, zone the curl and wall off the new #2." "Take #2 shallow if #3 occupies the midpoint" (HNFL-097).
- **Midpoint, Middle Hook.** Key 3-1. Wall final #3 (#2 is owned by the Apex or Corner).
- **Safety, Deep 1/2.** Key 1-2-3: "If #1 is vertical, widen and see #2. If both vertical, vision & squeeze. If either cancels, cap the remaining vertical" (HNFL-334).
- **Landmark** [D]: deep-1/2 landmark "≈1y inside the top of the numbers at ≈22y deep".

**Cloud (true Cover 2 / 8)** (HNFL-070, 130) [S]. Vision-and-break zone.
- Corners are cloud flat (fade-to-flat) and primary force.
- Apexes play curl vision.
- The midpoint is a middle runner/read: "zone high hole to post".

**Tampa** (HNFL-028, 241, 245, 130) [S].
- Corner Smash/Squat funnels #1 wide.
- Apexes play re-route curl.
- The midpoint is Middle Run: "closing the post if either #2 or #3 are a vertical threat. If not, they will stay low for #3."
- Safeties play Tampa 1/2 with a wider landmark.
- BAL variants: "Miami = Tampa from man alignments"; "Boca = Tampa with a Buzz invert to the Nickel side" (HNFL-241, 245).

**Buster 2x2** (HNFL-071, 130, 219) [S]. "Key #3 & match zone coverage vs. tight splits" played to the side of tight #2 & #3, with "Wild or Smack on the backside."

**Cover 3/9 "Nine" vs any x2 formation** (HNFL-054, 062, 204, 237, 335) [S].
- **Corners, Tight 1/3.** Man #1 unless shallow across the No Cover Zone; then "zone your 1/3 and pattern read (think Corner→Seam→Curl)."
- **Apex, Seam/Flat with M-C-D.** "Match #2 out & up, carry #2 vertical, or deliver #2 back to ILB and zone off thinking Seam→Corner→Flat" (HNFL-056).
- **ILBs, #3/Hook "Combo".** The LB to #3's side matches #3. The LB away zones the hook (HNFL-063).
- **Post, Middle 1/3.** Vision & squeeze inside-out, leaning to the speed side (HNFL-016, 056).
- **Rotation:** "Cover 9 = weak rotation (Rob/Lee away from Nickel)." For 2026, Cover 3 and Cover 9 are no longer tied to strong or weak rotation (HNFL-280) [S].

**Man (Cover 5 "Hands" family)** (HNFL-074, 206, 208, 221, 012, 075) [S].
- **Fist (2-Man):** inside trail technique, deep halves.
- **Pounder (4-Man):** man under, quarters safeties.
- **Finger:** Fist strong, Pounder weak.
- **Rolex:** Pounder strong, Fist weak ("Safety Rolls to X").
- **Bracket tools:**
  - Cut = CB and safety on #1.
  - Cone = nickel/dime and safety on #2.
  - Inc = reverse Cone.
  - Slice = inverted Cut.
  - Cathy = bracket on the #3 threat.
  - Connie = bracket on the motion WR.
  - Sandy = bracket on the TE.
- **Switch** (5 Switch): "3-over-2 man-match concept that plays as Cut or Cone based on the release of #2" (HNFL-075, 219). If #2 is not vertical, the safety switches from Cone to Cut (HNFL-219) [S].
- **Bracket (Cover 4):** "Safety reads #2-to-1 looking to double the upfield threat. Plays as Cone unless #3 is fast to the flat, then it plays like MEG" (HNFL-190) [S].

**Cover 1 variants** (HNFL-034, 058, 207, 209, 240) [S].
- **Hole:** man alignment; the adjuster zones the low hole.
- **Lurk:** zone (Cover 9) alignment. Mike and Dime "Combo the back. Back to you = M/M. Back away = zone the short hole."
- **Robber:** the open-side safety inserts.
- **Thief:** the closed-side safety.
- **Rat:** a defender from the LOS drops into the low hole.

**2x2 detached-#2 tag:** "Possible READ vs. #2 detached" in nearly every split-safety sheet (HNFL-085, 194, 212, 363) [S]. Wild: "Possible SOFT SQUAT vs. #2 detached weak. Key 2-to-1 (READ)" (HNFL-363) [S].

**TE / attached #2**

- **KEY (2x2 nickel technique)** (HNFL-279) [S]. The Nickel and FS key the TE's release.
  - TE upfield: the nickel "Wall #2 up & in" with Vertical Curl carry.
  - TE cancels: the Nickel drops "Curl Vision, no carry", and the FS "push to #2 strong" overtakes #2 up/over.
- **BAL Raven (Under Pack @ Zorro)** (HNFL-212) [D].
  - To the closed call (TE side), 1/4 rules:
    - No #2 detached → "Quads".
    - #2 detached → "Read".
    - Bunch, Snug, Z Wing or Close ("3 yards from formation") → "Cloud".
  - Away from the closed call, 1/2 rules:
    - Single receiver at a normal split → "Smack".
    - Nasty X → "Cloud".
    - #2 weak → "Cloud".
    - #2 detached → "Read".
  - "Sam is the adjuster to #2 displaced to closed call. Will is the adjuster to #2 displaced to open side vs Pro."
  - Slot with no width → Zorro; slot with width → play the call.
- **Inside-quarter mindset vs attached #2:** curl-to-post (HNFL-077) [S].

**Nub / no #1 (single-width, x1)**

- **Weak-side quarters vs any x1:** "VS. ANY x1 FORMATION, PLAY TIGHT 1/4 TECHNIQUE AND MAN UP ON #1 UNLESS AN IN CALL IS MADE (CHINA IS NOT AVAILABLE)" (HNFL-095, 098, 199) [S].
- **Corner when #2 is in the backfield:** "play Tight 1/4 and man #1 unless he goes shallow. No China call applies" (HNFL-093, 201, 332) [S].
- **BAL Chicago** (HNFL-229) [S]. "Stack/YY Nub: Read Buddy (Stack); Quads Zone It (YY)." "If no specific threat is determined in the GP, the Half side will be to the offset HB. Back @ home = Half to field."
- **Slot coverages (definition):** "coverages designed specifically to be played against single-width slot/nub formations with X & Z aligned to the same side" (HNFL-281) [S].
- **Clue 1/3 does not apply to x1:** "DOES NOT APPLY TO ANY x1 FORMATIONS. IF #2 MOTIONS TO 3x1, CONVERT TO TIGHT 1/3" (HNFL-091) [S].

### A2. 3x1: trips open/closed, trey/TE-trips, back offset

**The core problem** [S]: "Typically not played vs 3x formations. A check to another concept to take the vertical stress off the midpoint is common" (HNFL-333). In "Quads" the Quarter Hook "must carry #3 vs 3x1" (HNFL-190).

**Quarters-family trips tools** (Cowboys "Quads Adjustments" HNFL-195 [D]; HNFL-019, 023, 026, 030, 218, 220; glossary HNFL-190/284).

**TRIX: backside safety poach, "#3-to-X"** (HNFL-021, 095, 097, 197, 195 [D]).
- **When:** "Pass downs from Cover 4/8 vs. most 3x1 looks and some 3x2 by G.P." (HNFL-195) [D]. "Check TRIX vs. 3x1 when #3 is a vertical mismatch for the 1/4 hook player" (HNFL-197) [S].
- **FS:** "Trix technique — Key #3-X. Overtake any vertical by #3 or zone your 1/4 and find work if #3 cancels." "TAKE #3 DEEP OR SQUEEZE TO X" (HNFL-030, 197) [S]. HNFL-021: "TAKE 3 OR WHO BECOMES 3".
- **Mike (Quarter Hook):** "Match final #3 underneath. Play aggressively, as the free safety will overtake any vertical threat by #3." "No vertical responsibility" (HNFL-085, 197) [S].
- **Trips side:** Corner Quarters, Nickel Quarter Flat, SS Inside 1/4. Unchanged from Quads (HNFL-197) [S].
- **Backside:**
  - Corner plays "Tight 1/4 — Man #1 unless they go Shallow. No China" (HNFL-194, 244).
  - The weak apex plays "more like a seam/flat defender relative to #2" (HNFL-094).
  - "Trix = Key #2→1. Play like seam/flat and match anything up or out by #2" (HNFL-095).
  - "Backside plays like Cover 1 or Fire Zone (varies by G.P.)" (HNFL-033, 192). "Weak Corner is not guaranteed help" (HNFL-019) [S].
- **Result:** "If #3 is up or over, it plays as 5-over-3 strong" (HNFL-190) [S].
- **Variant TRIP:** "#3-to-Post. Take #3 deep or zone the post." The backside plays Freeze or Cover 1 (HNFL-030, 190, 292) [S].

**BOOK** (also called Stubbie, Mini, Taxi, Area, Erase, Special, Mix, Lock: HNFL-050 aka list) (HNFL-050, 309, 195 [D], 220).
- **When:** "Played to traditional Trips formations when we must stay 3-over-2 weak" (HNFL-195) [D]. HNFL-309: "over 90% of our snaps against Book were in Trey with speed @ #3" [S].
- **Corner:** "Lock #1 — erase #1 ... with physical Fist technique denying inside. No key read" (HNFL-309) [S]. MEG alignment (HNFL-050).
- **Apex, Soft Squat:** "Key #3→2. Man on #2 unless #3 is flat. China & In rules apply" (HNFL-309). HNFL-050 instead says "#3 out/flat = trap it" [S].
  - **Conflict:** HNFL-190 and 284 say "Book ... No China or In calls available". HNFL-309 says "China & In rules apply". Stump is defined (HNFL-190) as Book with China/In available.
- **Midpoint, Read Hook:** "Key #3→2. Reroute #3 up the seam and match the final #3 underneath. No carry" (HNFL-309).
  - HNFL-050: "#3 up = wall, see #2; #3 out/flat = zone hook."
  - "If #2/3 both out fast, Nickel/Mike latch on."
- **Safety, Read #3:** "Match #3 up the seam with vertical separation. If #3 is flat, push for width to cap anything upfield by #2" (HNFL-309).
  - Per HNFL-195 [D]: "Safety is responsible for #3 up & over. If #2 & #3 are up, Nickel has #2. If #3 cancels, Safety will handle #2 up & over."
  - "If quick drop by QB, play Topper technique and drive on 2nd in/out break" (HNFL-292) [S].
- **Smash:** "No Smash rule in Book" (HNFL-050) [S].

**STUBBIE** (BAL/Ravens tool; HNFL-270 [D], 229, 231, 251).
- **Check:** "CHECK TO STUBBIE IF 3X1 AND 3 IS A VERTICAL MISMATCH."
- **Corner:** "M.E.H.G. (Man Everywhere He Goes)", press or off (situational).
- **Nickel:** "MUSH (Man Unless Shallow) on 2, unless 3 cancels." "Vs 2 shallow / 3 cancelled = 7-Seam-Flat." Aligned **6x1 O/S #2**, i.e. 6 deep and 1 outside [D].
- **Match 3 (Mike):** "Match #3 in the count. If 2 is under 3, rotate back with depth staying square, play high to low having body presence under the dig & drive the throw. Any fast 4, push thru w/ #4."
- **Safety:** "3/2 Read", aligned **12x1 O/S #3** [D].
- **Bunch:** "Gameplan Stubbie/Quads."
- **BAL Pack/Pound role table** (HNFL-231, 251):
  - WC "Stubbie = MEG #1".
  - Nickel "Stubbie = Soft Squat".
  - Safety "Stubbie = 3 to 2 Read (1x12 O/S #3)".
  - Mike "Stubbie = Read Hook (Wall #3)".
  - "Stump = Clue 1/3 / 1/4 Post / #3 Receiver Vertical Hook" [S].

**STUMP** (HNFL-026, 220, 190). "Plays like Book with a China call built in." "Typically played to 3x exchanges where #1 is not a vertical threat" [S].

**AREA** (HNFL-052, 195 [D], 019, 190).
- **When:** "Played to Trips exchanges and/or when #2 & #3 are aligned close" (HNFL-195) [D]. Also "when we put a TE/HB (non-vertical threat) at #1 strong" (HNFL-052) [S].
- **Corner:** "soft Quarters technique with China built in to squeeze off 7s" [D]. HNFL-052: "#1 unless Smash, Smash = zone 1/3" (Clue 1/3) [S].
- **Nickel, Mike, SS:** play "Triangle" on #2 & #3, keying 3-to-2 [D].
- The FS backside plays Inside 1/4 with no Trix [D].
- HNFL-019: "Free Safety zones off #2 & #3 with true zone pickups by area of release (Triangle). The backside stays 3-over-2" [S].

**BINDER** (HNFL-026, 220, 075). Lock #1, plus "Trap" over #2 & #3 keyed #3-to-2 [S]. In Cover 5 it is "Corner locks #1 with Trap played over #2 & #3" [S].

**TRIO** (HNFL-026, 220). Lock #1, plus "Triangle" over #2 & #3 with a Topper safety [S].

**ERASE** (HNFL-023, 218, 190). Lock #1, plus "Quads (#3 Away version) over #2 & #3" [S].

**ZORRO trips** (HNFL-026, 220). True quarters with "vision & break" that "functions as Box from normal splits." CB and safety take all verticals.
- CB True 1/4, key 2-1.
- Safety True 1/4, key 3-2.
- Detail (HNFL-029) [S]:
  - CB: "#2 vertical = tighten to #2, see #1; only #2 vertical = squeeze to #2; #2 not vertical = top-down #1".
  - Safety: "#3 vertical = tighten to #3, see #2 ... #3 not vertical = top-down #2".

**CHOKE (Cover 5)** (HNFL-074, 208, 023). Lock #1; Fist over #2 & #3; the SS plays Tight 1/2 [S].

**5 TRIX / FINGER TRIX** (HNFL-074, 208). The FS plays Trix (#3 up/over, else rob X) [S].

**5 PUSH** (HNFL-074, 075, 206). "Pushes both safeties strong (like 3 Cloud)" [S].

**Halves-family trips tools** (HNFL-068, 131, 291 [D], 334, 363).
- **Wild to trips:** "Midpoint becomes a Vertical Hook defender and must carry #3 upfield" (HNFL-131) [S].
  - 3x1 diagram [D]: backside "SMACK" corner and "WIDE 1/2" safety. The initial Wide-1/2 landmark is "≈3y outside the numbers at ≈20y deep (drop is dictated by release of #1). It is essentially the same as a cloud rotation."
- **LOCK (halves):** "CB locks #1 while the SS, Apex and Midpoint play Wild over #2 & #3" (HNFL-131, 291) [S]. "Midpoint has #3 vertical with minimal help. Apex has #2 vertical" (HNFL-334) [S].
- **8 TRIX:** Wild strong; the weak safety is Trix (HNFL-026, 220) [S].
- **TRAP (halves):** "CB locks #1 while Apex, Midpoint, and Safety play Read on #2 & #3" (HNFL-068, 291). This is the same structure as Book. See the naming conflict in the closing section.
- **Sub Wild trips menu:** "BOOK vs. Normal, BUSTER vs. #2/3 Close, LOCK & BINDER by G.P." (HNFL-363) [S].
- **Rush Wild:** "vs 3x1 — Mike, Dime can switch alignments & responsibilities. When #2 & #3 receivers are close: Nickel and Mike will make either an In/Out call or Lock call" (HNFL-364) [S].

**Split-field (Cover 6/8, Roy/Lou, Pack/Stuff) trips menus** [S]:
- **Sub Quads:** "Trips: TRIX vs. Normal, BOOK or AREA (HB/TE @ #1) if we need 3-over-2 weak" (HNFL-194, 244).
- **Sub Stuff (QQH, quarters to the nickel):** "Trips: BOOK or AREA vs. Normal, AREA vs. Exchanges by G.P. (Poss. HIT)" (HNFL-324).
- **Sub 8 (halves to the nickel):** "Trips: TRIX vs. Normal. Poss BOOK (4-over-3), or BUSTER (2/3 close) by G.P." The Nickel plays "Trips Rules = Deep Hook technique. Carry #2 vs All Go Special" (HNFL-325).
- **Roll / Roy-Lou (DAL/PHI):** "Trips = TRIX (To Call) — AREA or BOOK (Away) — ZORRO (By G.P.)" (HNFL-085, 087, 254).
- **6 family:**
  - 6 Book / Binder / Erase / Trio / Stump / Meg play the half side "Smack" vs trips (HNFL-310) [S].
  - **Stuff adjustments** (HNFL-273): "Weak corner converts from Squat to Sink so they own any upfield route by #1; Free Safety converts from Deep 1/2 to Tight 1/2."
- **BAL Stuff (half to the nickel):** 3x1 → "Cloud, Read, Trix" [D].
  - Nickel "Cloud = Vertical Hook #2 ... Play 2/3 Read vs. Trips. Carry #2 only if #3 is vertical" [D].
  - Mike "#3 Receiver Vertical Hook ... Trix = no vertical responsibility" [D].
  - Speed (trips) → Trix (HNFL-230).
- **BAL Pack:** 3x1 → "Quads, Read" (HNFL-231).
- **BAL Pound:** strong "Stubbie", 3x1 "Steal or Stubbie" (HNFL-251).
  - "Steal = Key 3-X. Overtake anything up/over by #3 from Mike." Steal is the BAL name for Trix.
  - "Jump (X Nasty) = Cut #1 off inside / match final #1 in the count" (HNFL-251, 230).
- **BAL Chicago** (HNFL-229, 211 [D]):
  - Half tools go to a GP stud or the offset HB; quarters tools go away.
  - Stud-to-trips: "Stubbie or Stump"; away: Trix.
  - HNFL-211 [D] "Far Gun Trips": trips side "AREA" (CB MEG, N Area, Mike Q/H, SS 3-to-2) with backside "CLOUD" (Dime V/H, FS 1/2).
  - "Home Trips" (back at home) "HOME (helmet tap)" becomes Cover 3 "ROB": CB Clue 1/3 strong, Tight 1/3 weak, N C/F, M/D H/C, SS rolls down C/F weak.

**Single-high trips tools** (Cover 9 adjustments HNFL-203 [D], 304; Sub 9 HNFL-055/056/204/237; Danger 3x1 HNFL-016 [D]).

**STRAP, vs "any x1 formation — 2x1, 3x1, 4x1"** [D].
- Mike = "Bonus Hook": overdrop #3 and relate to the final #3 underneath; "no vertical responsibility" / "No carry."
- Dime = "#3 Receiver Hook": "get depth and key #3-to-2. Cut off any over route by the final #3. If #3 cancels, zone the Hook and look for the final #4 coming to you."
- Rotation is "Rob" (FS rotates weak to Seam/Flat).
- "Aka 6 Rip/Liz" (HNFL-054) [S]. Danger 3x1 "aka Match, Seam, Steel, Carry, Rip/Liz, Gone, Skinny, Strap" (HNFL-016) [D].
- HNFL-016 3x1 Danger [D]:
  - Strong Hook "push to #2".
  - #3/Weak Hook "#3 vertical or hook; no #3 up = zone off".
  - Seam/Flat "#2 out & up, #2 under = zone off & match final #2, Smash = push to #1, Push = push w/ #3 flat".
  - Tight 1/3 "#1 unless Smash; Smash = zone your 1/3".
  - Davis example: "Overdrop #3, push to #2, zone off" (Mike); "Match #3 over" (Dime); "Carry #2 up the seam (O/S lev.)".

**KEY (#2 weak out fast)** [D] (Cowboys HNFL-203). "Played when #2 weak is a threat that we can use the FS to defend." The FS and Dime key #2.
- When #2 free-releases, play Strap with the FS in coverage on him; the Dime is #3 Rec Hook.
- **KEY (#2 weak slow/pro)** [D]: "When #2 is slow to go, we play Grab": Dime relates to #2 (curl-flat) and the FS becomes "#3 Rec. Hook to negate #3 over."
- HNFL-304 (later version) renames the same pair **SITE (#2 weak out fast / slow-pro)**. Conflict: see the closing section.

**SITE** (Cover 9 glossary HNFL-063/283; BAL 3 Site HNFL-228 [D]). "Cover 9 adjustment for 3x1 formations in which the form of rotation is based on the release of #2."
- "If #2 weak scat releases or carries it, the Free Safety is the weak Apex defender (Sky Weak)."
- "If #2 weak blocks or is slow to go, the Free Safety is the #3 Receiver Hook defender while the Dime is the Apex (Buzz Weak)."
- **BAL 3 Site** [D]: "Rob/Lou away from the Nickel unless we get 3x1 pass or Fast call, then play SITE (Rita/Linda away from Nickel)." 3x1 → "Rob/Lou WK / Site."
  - Defined as Rob/Lou rotation "vs. all formations except 3x1 passes with the HB slow to go — then it plays as SITE, which is BUZZ coverage (SITE refers to seeing the release of the HB in 3x1)" (HNFL-227) [S].

**GRAB, 3x2 empty (and 3x1 by GP when Rob/Lee is to a 2-man side)** [D].
- Dime becomes Seam/Flat on #2 weak.
- FS becomes #3/Hook, "responsible for anything up or over the LB level by the final #3."
- "Converts rotation from Sky to Buzz" (HNFL-054).
- HNFL-283 calls this **WASP**. HNFL-063 calls it GRAB.

**Trips in Sub 9:** "STRAP with a possible KEY by G.P. (usually when #2 weak is a stud)" (HNFL-204, 237) [S]. "x1 Formations: STRAP unless G.P. dictates otherwise. Possible SITE by G.P." (HNFL-056) [S].

**Single-high zone Trey/Load/Poison** (HNFL-066, 025) [S].
- Load: strongside Buzz overloading the passing strength.
- Poison vs Trey: "Plays as Danger with the SS inserting as the hook-curl matching #3 deep; vs quick exchanges it becomes Buzz" [D, HNFL-025].

**Fire zone vs trips** (HNFL-064, 239, 352, 059) [S]. "Trips: Play It (FREEZE / RINGO-LUCKY) with Match-Carry-Deliver rules." "Mike & Dime can flip vs. 3x1." "Zone alignments mean 3x1 formations leave the Midpoint responsible for #3 up & over."

**Deuce (2-deep zone pressure)** [S].
- "To any x2, play Deuce to both sides. To any x1, play DOT strong & Smack weak" (HNFL-302).
- "DOT = Drop off of #3. Do not carry vertical. Top-down any crossing route by the final #3."
- Sand Deuce Mike: "vs. 3x1 — D.O.T. — Deuce Hook off #3 away from call" (HNFL-121).

**Bandit (man pressure)** (HNFL-216, 266) [S]. "Safeties and Nickel — if not in the pressure, responsible for #2 strong and #2 weak / #3 strong."

**Manuscript general trips checks** (MS §14 and §14.1-14.3, Lab 3-4) [S].
- **Solo/Poach:** "the backside corner locks isolated #1; a backside safety helps on a specified #3 vertical/bender ... an underneath player walls/carries #3 until help arrives. The weak safety cannot instantly support a backside run until his #3 read is settled."
- **Special/Stubbie:** "strong corner can be MEG on trips #1 while the nickel, hook and safety form a triangle or box over #2/#3. The safety may take #3 vertical; the nickel may take #2 unless #3 runs to the flat; the hook replaces underneath crossers."
- **Mable:** "lock the isolated backside #1 while gaining numerical help to the trips side; another is to assign a safety or linebacker a special responsibility for vertical #3. Do not assume every system's Mable has the same man/zone combination" (MS §9).
- **Ownership warning:** "A coach must select either a strong-safety #3 vertical implementation or a weak poach #3 vertical implementation ... not both" (MS §14.2).

**Back offset in 3x1** [S]:
- BAL 3 Site uses HB release ("HB slow to go") to choose Site, which is Buzz (HNFL-227, 228).
- Lurk: "HB offset to you = man coverage on HB. HB away = Lurk technique (zone the hook ...). HB at home = Combo HB with Dime/Mike" (HNFL-240). "Possible My call with Ends if RB offset" (HNFL-058).
- BAL Chicago: half tools go to the offset HB unless a stud is game-planned (HNFL-229).
- Slide/Buzz (BAL): "Back at home play Buzz, back in the gun play Bulls (or Twister)" (HNFL-214) [D].

### A3. Empty 3x2 and 4x1 (quads)

- **Cover 9 GRAB** (3x2 empty) [D]: as in A2. In BAL Sub 9 tables (HNFL-055, 204) the empty diagram is "Rob/Strap" or "Nine" with Bonus Hook, and "Empty: Possible GRAB" (HNFL-056) [S].
- **STRAP vs 4x1:** "Played to all x1 formations — 2x1, 3x1, 4x1" (HNFL-203) [D].
- **Split-safety empty menus** [S, partially D]:
  - Sub Quads empty → "BOOK/READ" (trips side Book; 2-side Read) (HNFL-194, 244).
  - Sub Stuff / 8 empty → "BOOK/READ".
  - Roll: empty "LOU/LIZ: Lock + Book (trips side) / Read" (HNFL-085).
  - BAL Stuff/Pack empty → "Stubbie/Stump" and "Read" (HNFL-230 [D], 231).
  - BAL Pound empty → "Stubbie/Stump" (HNFL-251).
  - BAL Chicago: "Empty = Play Pound" (HNFL-229).
  - BAL Raven: "Empty = Cubs (Game Plan)": "Area" to trips with CB MEG and "GONE" (Sam walked out), "Read" to the 2-side (HNFL-212) [D].
  - BAL 6 family: empty "CUBS" (HNFL-275).
  - BAL 3 Site/3 Lock: Empty is the same as 3 Lock (HNFL-228) [D]. "BUZZ ... except Empty — then it plays as Rita/Linda away from the Nickel" (HNFL-227) [S].
- **Slide Gun Bulls empty** [D]: "Area" (trips side; N Area, SS 3-to-2) and "Read" (2-side; CB soft squat, FS Read 1/2).
- **Gun Bulls trips vs 4x1:** "#2 HIP VS 4X1 / ZONE IT" (HNFL-214) [D]. "Hip" appears in HNFL-212 too [D]. Rule detail not legible; meaning not stated.
- **Rush Wild vs empty:** "CHECK WIDE" (HNFL-364) [S].
- **Sack-It** (empty pressure check) (HNFL-215) [S]. "Sack-It can be an empty check for an entire game ... we will check Sack-It vs any aligned Empty or shift to Empty (not motion) ... We will not check if there are C-Area players on both sides. If they motion out of Empty back into 1-Back, we will keep sack it on. The Safety will pressure rush the RB."
- **Bandit vs empty:** "the cover LB adjusts and takes the RB" (HNFL-216) [S].
- **Manuscript:** "Empty 3x2: if the back becomes weak #2, the linebacker assigned to the back has to communicate whether his responsibility follows the back, converts to a zone distribution, or is exchanged with a DB" (MS §2.2). "Must specify who owns weak #2 and whether the middle linebacker has #3 vertical" (MS §15) [S].
- **Quattro zone** (4-deep/2-under pressure) "most commonly played to stacks or an oversplit #1 adjacent to an attached #2 ... 3-over-2 quarters principles to each side with #3 Away rules" (HNFL-281) [S].
- **Four-strong:** HB-PC P7 only (a manuscript/article proposal; no HNFL rule).

### A4. Bunch / compressed (including dirty bunch, bunch to boundary)

**Definition:** "when #1 & #3 are aligned closely (within about 5-6 yards) in a Bunch (3x) or Dirty Bunch (2x + HB)" (HNFL-281) [S]. BAL Raven treats "Close (3 yards from formation)" as compressed (HNFL-212) [D].

**BOX, quarters with zone pickups** (HNFL-053 [D], 025 [D], 195 [D], 272 [D], 331).
- **HNFL-053 / 025:**
  - Corner Outside 1/4: "#1 out deep"; Davis = split 1&2.
  - SS Inside 1/4: "1st in deep, defend deepest in cut"; Davis = split 2&3.
  - Nickel 1/4 Flat: "1st out low, defend flat-to-7".
  - Mike 1/4 Hook: "1st inside low".
  - Apex "up & outside on point"; CB "soft outside #1".
  - "Deep exchange = zone it off. 1 vertical route = 2-on-1 in coverage."
  - "In a true box look we call it Square."
- **HNFL-331:** Corner/SS are True 1/4 (outermost / innermost upfield; all go = split and squeeze). Nickel takes the outermost underneath, Mike the innermost.
  - "Check BOX to bunch formations when in quarters structure strong."
  - "Possible BOX/TRIX if both #2 & #3 are vertical mismatches for the 1/4 hook (1st inside low) defender."
- **BAL Box** (HNFL-272) [D]:
  - "CORNER = MOD, IF #1 UNDER = CLIMB" (alignment 1x8).
  - "QTR FLAT = MATCH #2 SHORT OF (#2 & #3)".
  - "3RVH = MATCH FINAL 3".
  - "SAFETY = MATCH THE 1/4 #2 WITH VERTICAL SEPARATION. IF 2 IS SHORT, ZONE THE 1/4" (1x10).
- **With TRIX:** "If Trix is on, Box plays out like Quads (no #3 vertical)" (HNFL-053) [D]. "Applies to Cover 4 only" (HNFL-025) [D]. "When: pass downs from Cover 4/8 vs. 3x1 Bunch with multiple deep threats ... If #3 is up or over, it plays as 5-over-3 strong with Fire Zone principles weak" (HNFL-195) [D].

**QUADS vs BUNCH (ZONE IT)** (BAL HNFL-269) [D].
- **Corner MOD (Zone It)**, aligned 7 deep and 1 outside #1: "Man on deep, if 1 stays 1, buy it. Match the deepest outside breaking route as they declare. Vs 2 deep vertical routes in the outside 1/4, play deep to short to buy time for the safety (vs spray release routes are declared)."
- **Qtr Flat:** "re-route 2 & match the width of the final #2 out. Protect the seam & press the branch (think Seam-Branch-China)."
- **3RVH:** "take 3 vertical unless 2 is short, then match final 3 in the count."
- **Safety** (1x14): "match the deepest inside breaking route ... if 2 deep I/S breaking routes (Dino) play deep to short."

**SQUAT, halves with zone pickups** (HNFL-015, 072, 025 [D], 336).
- Corner "Final #1 low"; Apex Vertical Curl "Final #2 (#2 up & in)"; Mike Middle Hook/Read "Final #3"; Safety Deep 1/2.
- Apex "up & inside on point"; Corner in squat alignment.
- Safety rules: "#1 deep = push to #1, see #2; #1 & #2 deep = split 'em & squeeze; no #1 deep = deflate #2 top-down" (HNFL-072).
- "If Trix is on, Squat plays out like basic Wild (no #3 vertical)." The backside "will usually end up playing out like Cover 1 Dog or Fire Zone" (HNFL-015, 072).
- **SQUAT TRIX:** "Pass downs from Cover 8 vs. 3x1 Bunch with multiple deep threats ... Mike doesn't need to take #3 up & over" (HNFL-336) [S]. Squat Trix "applies to Cover 8 only" (HNFL-025) [D].

**BUSTER vs bunch (aka Bingo, Key, Uno)** (HNFL-069 [D], 025 [D], 195 [D], 131, 075).
- **Rule:** "#1 Under #2 = play Box; #1 stays #1 = play Buster ... #1 must initiate the exchange. They are keying the release only."
- **Corner Sink:** "#1 stays #1 = M/M #1; #1 under #2 = zone 1/4."
- **Nickel Buster:** match final #2 / 1st out of #2 & #3.
- **Mike Middle Read:** match final #3 / 1st in of #2 & #3.
- **SS Tight 1/2:** key #1, deflate or squeeze. "#3 crosses face to the flat = match it (alert wheel)."
- **Alignment:** Nickel up & outside #2; Mike inside #3, eyes to bunch; Corner off & outside #1.
- **When** (HNFL-195) [D]: "Pass downs vs. Bunch when we must stay 3-over-2 weak and expect exchanges within the No Cover Zone."

**Other bunch tools (HNFL-025)** [D]:
- **TRIO:** lock the point man and play Triangle on #1 & #3, with a Topper safety.
- **LIMBO (bunch):** "3-over-3 true man coverage with defenders staggering depths to prevent rub routes. No matching."
- **LOCK & COMBO:** "Point man locks the point, then they play Combo on #1 & #3" (C and FS).
- **SPOT:** "3-over-3 MOFC vision zone with the corner clueing #2-to-1 and underneath defenders zone dropping."
- **POISON:** as in A2.

**Man-family bunch tools** (HNFL-074, 075) [S]:
- **Mini Fist:** "Apex locks the point, Corner & Midpoint Banjo #1 & #3, Safety plays 1/2."
- **Mini Pounder:** the same with a quarters safety.
- **Bandit:** "Possible alert DOS vs Snug & Bunch" (HNFL-216).
- **Lurk:** "Bunch = Play to leverage based on the 1st break. No In & Out" (HNFL-240).

**Single-high bunch** [S/D]:
- **CLUE:** "#1 stacked/bunched/minus split ... Corner converts to Clue 1/3 and keys #2-to-1 ... Nickel converts to Curl-Flat" (HNFL-203 [D], 337).
- "Bunches (including Dirty): CLUE or SPOT (true zone distribution)" (HNFL-204, 064).
- "CLUE — match unless there is an exchange out of the bunch, then zone off" (HNFL-204).

**Fire zone bunch** (HNFL-059) [S]: "Check CLUE vs. stacks, bunches, or reduced splits (any threat of quick exchanges)."

**Menus by system** [S]:
- Sub Quads: "Bunches (incl. Dirty): BOX w/ TRIX vs. Normal. BUSTER if we need 3-over-2 weak" (HNFL-194).
- Sub Stuff: "BOX or BUSTER by formation, alignments and G.P." (HNFL-324).
- Sub 8: "SQUAT (w/ TRIX) or BUSTER" (HNFL-325).
- Roll: "Bunches = SQUAT w/ TRIX (To Call) — BOX or BUSTER (Away)" (HNFL-085). The bunch-away diagram shows "CHECK BOX" [S].
- Sub Wild: "Bunches: Stay in SQUAT; BUSTER by G.P." (HNFL-363).
- BAL Stuff: bunch "Cloud, Box"; snug "Cloud or Read Buddy / Zone It / Read Buddy" (HNFL-230) [D].
- BAL Pound: snug "Stubbie/Stump" (HNFL-251).
- BAL Raven: "Bunch = Box" (HNFL-212) [D].
- Rat Bug Texas: "Bunch / Snug → Cloud" (HNFL-213) [S].
- Rush Wild: "vs. Bunch formation: Nickel has the Vertical! Must align inside #2" (HNFL-364) [S].

**Scouting tendency** (HNFL-186) [S]: bunch adjustments "BOX [TRIX] 45%, CLUE 20%, SQUAT [TRIX] 15%, COMBO 8%, LIMBO 5%, BUSTER 4%, LOCK 3%."

**Bunch to boundary:** no sheet gives a boundary-specific bunch rule [I]. The closest are:
- The Slide/Buzz field/boundary install, where the nickel stays to the field and the Dime to the boundary (HNFL-214) [D].
- Bunch Home "Buzz RT", and the Bunch FRG Gun Twister diagram (HNFL-214).

**Manuscript** (MS §15, Lab 6) [S]: "A banjo teaching call can assign two defenders to first in/first out, while a third defender handles deepest ... saying banjo is not enough: the defense must define the exact route space, release threshold, and whether a receiver going behind the line counts as out."

### A5. Stack / stacked pairs / reduced (#1 close to #2)

**Stack tools (HNFL-024)** [D]:
- **LOCK (stack):** "Point defender covers the point man and the back defender covers the back man. Depths staggered."
- **TOP HAT:** "Point defender covers the off man and the off defender covers the point man."
  - HNFL-013 [S]: "Re-route #2, lock #1 ... combat our short routes ... with point WR pressed (to avoid rubs) ... defenders stacked tighter than Lock."
  - Key alert: "#1 under #2 = exchange & cut off #1 on the shallow / pick up the new #2; #1 stays #1 = normal Top Hat rules. Man #1."
- **COMBO:** "2-over-2 man with pickups based on area of release. Outside man takes 1st out or 2nd in. Inside man takes 1st in or 2nd out." Defenders are usually on the same level.
- **TRIANGLE:** "3 over 2 zone match. Corner takes 1st out underneath, apex takes 1st in underneath, safety takes the vertical or cuts off 2nd in/out by leveraging the first break. Vs dbl in/out, free man gets depth. Vs all go, they trail with safety topping."
  - HNFL-014 [S]: "Corner leveraged outside #1, Apex inside #2, Safety 8-12y deep on the stack"; "1st vertical or 2nd in/out"; "#1 under #2 = think Smash, sink to 7"; "No Smash = replace safety deep."
- **LIMBO:** man; point covers point, back covers back; staggered.
- **KEY:** "2-over-2 man-match with both defenders keying #1. #1 stays #1 = Top Hat; #1 under #2 = Limbo."
- **TRAP:** "3-over-2 man-match keyed on #2. Corner plays #1 unless #2 is flat. Apex plays final #2 underneath. Safety plays #2 upfield or squeezes #1" (Trap 1/2, Sink, Trap hook).
- **ZORRO (stack):** "3-over-2 quarters with zone pickups. Apex 1/4 flat (#3 away), corner & safety play 1st vertical with intent to double it. Apex (nickel) must also take the 1st in back across (no delivery)."

**Quarters vs stacked/reduced #1** [S]:
- "#1 Stacked/Reduced: ZORRO (zone it off, expect exchanges). Possible READ by G.P." (HNFL-194).
- Sub Stuff: "#1 Stacked/Reduced: ZONE IT (zone it off, expect exchanges)" (HNFL-324).
- Sub 8: "SQUAT (to Nickel) or BOX (away). Possible READ" (HNFL-325).
- "#1 & #2 stacked on the backside = ZONE IT" (HNFL-196) [S].
- **Opponent scout** (HNFL-193) [S]: "Any close splits that present an exchange threat will automatically be zoned off with a ZORRO adjustment. Any formation with #1 & #3 in close proximity will be played with a BOX adjustment."
- BAL Chicago: stack → "Read Buddy (Stack)" (HNFL-229) [S]. Meaning of "Buddy" is not defined in the sheets [I: likely a Read variant with paired defenders].
- BAL 3 Site/3 Lock stack: "HALO (WIDE) / SKY (CLOSE)" [D]. Meaning of Halo is not defined.

**Cover 9 vs stacked/reduced** [S]:
- "#1 Stacked/Bunched/Reduced = Clue 1/3 with a 2-to-1 read" (HNFL-056).
- "Stacks/Bunches: CLUE and sort out any quick exchanges" (HNFL-056).
- "#1 Stacked/Reduced: CLUE — possible TRIANGLE by G.P." (HNFL-204).
- **Clue 1/3** (HNFL-091, 063) [S]: "If #2 eliminates themselves as a vertical threat, lock onto #1 M/M. If #2 is upfield, split #2/#1 & see #1 ... If #1 is also vertical, play vision & squeeze ... If only #2 is vertical, squeeze the seam from above the outside shoulder."
- Red Danger: "plays key & match to each side unless #1 is undersplit, then they mix in true zone principles" (HNFL-290) [S].

**#2 & #3 close** (single-high and fire zone) [S]: "SORT it. Zone them off with area pickups" (HNFL-064, 239). Also "#2 & 3 Close: Sort it out ... area pickups with match technique" (HNFL-204). BAL 3 Lock nickel "SORT = match outermost of #2 & #3"; Mike "SORT = match innermost of #2 & #3 underneath" (HNFL-228) [D].

**Manuscript** (MS §15, Lab 12) [S]: "Does the back receiver become #1 outside if he releases first? Is the defender chasing the point allowed to switch?" "If lock, they need physical stagger to avoid being picked. If banjo, they need a clear first-in / first-out threshold."

### A6. 2-back / 21 / 12 personnel / heavy

- **Lurk vs 2-back** [S]: "Y-Off or 2-Back = possible 3-on-2 Lurk pickups with Mike & Dime (By G.P.)." "Vs. 2-Back, the LBs & Down Safety will play a 3-on-2 Combo out of the backfield (mostly vs. I-Form)" (HNFL-058). "I-Form = Strong Safety, Mike, & Dime play 3-on-2 pickups on the backs" (HNFL-240).
- **Cover 1 Funnel:** "essentially a triangle concept vs. 2-back by the stacked backers ... sort the backs by release w/ 3-over-2" (HNFL-207) [S].
- **Patty:** "#2 weak in backfield: possible PATTY (pre-determined flow pickups)" (HNFL-363). "PATTY (if flow is possible)" (HNFL-273) [S].
- **Personnel tendency** (HNFL-184, 186, 187; scouting reports) [S]:
  - "WILL 6 (25%) ... the primary coverage played if we get into the 2-back world and some 12P."
  - 21P → "Base 34 (65%)".
  - 13P → "Base 34 (60%)".
- **Heavy:** "HEAVY — denotes a 9 man box" (HNFL-031) [S]. No heavy-specific coverage check in HNFL.
- **TE side:** "No TE attached = closed call to the back" (HNFL-055, 058) [S]. "Slide front — close to the TE; bump the front versus Y motion" (HNFL-214) [D].
- **Manuscript** (MS §2.2, §A5): "Counting nine people within 10 yards against a two-TE look may be rational." Run strength vs pass strength vs field strength are separate (MS §2, §A6.1) [S].

### A7. Splits and field/boundary width

- **Corner leverage by split** [S]:
  - "If #1 is oversplit, play from an inside position. If #1 is a minus split, play from an outside position and widen as needed" (HNFL-093, 201).
  - "Pre-snap leverage will be based on the split of #1" (HNFL-095, 098).
- **Weak safety width** [S]: "Width of weak safety drops are based on the split of the iso receiver" (HNFL-011).
- **Oversplit weak #1:**
  - "SMACK = aggressive reroute on an oversplit #1 funneling them wide outside" (HNFL-241, 245).
  - BAL Pack: "#1 oversplit = Smack" (HNFL-231) [S].
  - Sub Wild: "Possible SMACK vs. 1WR weak. Funnel #1 out wide (same as SMASH)" (HNFL-363).
  - Red 6 weak "plays Red Wild unless we go 3x1 with an oversplit #1 weak, then Red Smack" (HNFL-287) [S].
- **Nasty / reduced #1:**
  - "Jump (X Nasty) = match final #1 in the count / cut #1 off inside" (HNFL-230, 251) [D/S].
  - Raven: "vs Nasty X = Cloud" (HNFL-212) [D].
  - "POSSIBLE SHOVE TO MIDDLE VS. #1 NASTY RUNNING SHALLOW" (HNFL-079) [S].
- **Reduced or close to #2 → exchange threat → zone it off** (Clue / Zorro / Zone It / Box) (HNFL-203, 193) [S].
- **Tight splits:** Buster is "key #3 & match zone coverage vs. tight splits" (HNFL-130). "Played to formations that present an immediate exchange by #2 & #3" (HNFL-131) [S].
- **Field/boundary** [S/D]:
  - "Slide is a Field/Boundary defense — Nickel align and stay to the field, Dime align to the boundary" (HNFL-214) [D].
  - Roll / Roy-Lou "can also be directed to field/boundary" (HNFL-086, 088) [S].
  - "If all else is equal, the call goes to the field side" (HNFL-184).
  - Chicago: "Back @ home = Half to field" (HNFL-229).
  - Cover 3/9 rotation by "passing strength, field/boundary, or by game plan" (HNFL-280).
- **Manuscript divider rules** (MS §2.3) [S]: "A condensed receiver can attack a shallow or over across the formation with far more room ... a wide split can compress outside routes against the boundary while widening the safety's travel."

---

## B. Pre-snap motion / shift adjustments

**Who moves (zone-alignment rule)** [S]:
- "Corners do not follow X/Z across vs. slot. All motions are bumped across" (HNFL-063, 065, 190, 283).
- **Nickel and change-of-strength (COS) motion:**
  - "Nickel runs with motion only if it changes the passing strength" (HNFL-194, 324, 325).
  - "Nickel align to passing strength relative to #2 and only run with a C.O.S. motion. All other motions will be bumped across" (HNFL-228) [D].
  - "**NICKEL WILL RUN WITH A CHANGE OF STRENGTH MOTION! THAT IS NOT A MAN COVERAGE INDICATOR!" (HNFL-192, 291) [D].
- **Fire zone:** "Nickel runs with C.O.S. motion. Ringo/Lucky follows him!" ("Be alert: Nickel will run with motion, so blitz side can change") (HNFL-059). "Rt/Lt follows the Nickel" (HNFL-057) [S].
- **Sand Deuce:**
  - "Once Rip/Liz call is made, it does not change vs. motion" (HNFL-121).
  - "Nickel align to passing strength — do not run with change of strength motion" (HNFL-121).
  - **Conflict:** this contradicts the other sheets, so it is a package-specific rule [S].
- **Bandit:** "Nickel run with COS motion if not in the pressure. CBs & SAF bump" (HNFL-216) [S].
- **Raven:** "Coverage is adjustable on all motion!" (HNFL-212) [D].

**Motion that changes 2x2 → 3x1** [S/D]:
- "Any motion to 3x1 will be handled with a TRIX adjustment to relieve the vertical stress of #3 on the Midpoint" (HNFL-193) [S].
- **BAL Raven motion diagrams** [D]:
  - "Slot to Pro: Zorro to Qtr & Half tools."
  - "Pro to Slot: Half & Qtr tools to Zorro."
  - "Slot to Twinslot: Zorro to Half & Qtr tools ('Pirate')."
  - Pro YOff YMO: "Hip".
- **Clue 1/3 corner:** "If #2 motions to 3x1, convert to Tight 1/3" (HNFL-091) [S].
- **Sand Deuce motion pages** [D] (HNFL-120): "Trips to Twin 'Rip' Nickel Lt" (call holds). HNFL-119 shows "Twin to Trips" and "Speed".
- **Bandit:** "Twin to Trips" and "Trips to Twin" diagrams (HNFL-216, 266) [S]; rules are not legible beyond the COS line.
- **Manuscript** (MS §3.2) [S]: options are (A) travel a defender with the slot; (B) bump the apex players and shift pass strength; (C) keep both safeties deep and invoke Solo/Poach; (D) rotate into Cover 3 match.
  - "The key message must identify who now counts as #3, who owns #3 vertical, who owns first out, and what happens to backside #1."

**Jet / orbit / across** [S]:
- BAL Tampa/Boca: "Vs. Jet motion = Shove it" (HNFL-241, 245). Shove is used elsewhere as safety movement (HNFL-079, 092, 194: "possible Shove strong by G.P.", "can also Shove across if #2 cancels") [I: Shove = slide the safety/coverage across].
- **Manuscript** (MS §A6.3) [S]:
  - **Bump:** "apex widens for jet while inside linebacker becomes backside cutback/force; safety holds high help."
  - **Rock/roll:** "safeties swap down/post jobs, restoring support to the weak edge."
  - **Travel:** "nickel follows jet as man defender; backside safety/linebacker must explicitly replace weak force."
  - **Hold/check:** "refuses to chase motion, tells a DB to absorb the bubble."
  - Orbit (MS §A6.4): "train the nickel to widen enough to deter the orbit route but keep feet square and maintain force."
- **Manuscript message table** (MS §3.1) [S]:
  - PUSH/BUMP = "reassign adjacent slot/hook relationship".
  - LOCK = "stay on named receiver regardless of short exchange".
  - POACH/SOLO = "backside safety receives specified #3 vertical".
  - STAY = "hold original side assignments under late movement".
  - ALERT/CHECK = "confirmation required before rotation".

**TE trade / Y motion / shift** [S/D]:
- "Slide the front vs. Y-Motion" (HNFL-055).
- "Bump the front versus Y Motion" (HNFL-214) [D]. The Twin Home Y Mo diagram shows "Closed LT to RT" and "BUMP FRONT VS Y MO".
- **Roll:** "the closed call is always away from the direction or jersey #" (HNFL-086).
- **Manuscript** (MS §3.5, §A6.2) [S]: reset / hold / spin safeties / reduced-Bear options. "Make pass strength independent of front strength, but then teach both references."

**Back motion out of the backfield (to empty)** [S]:
- Sack-It "vs any aligned Empty or shift to Empty (not motion) ... if they motion out of Empty back into 1-Back, we keep Sack-It on" (HNFL-215).
- Bandit: "Vs Empty the cover LB adjusts and takes the RB" (HNFL-216).
- **Manuscript Lab 11** [S]: "retain man on back, exchange the back with a DB, or reset into a separate empty match/zone coverage ... Bust: Mike believes weak nickel owns RB; nickel believes Mike retained original man."

**Motion as a scouting signal** [S]: "MOTION REACTION = BUMP IT ACROSS (85%), RUN WITH IT (15%)" (HNFL-186). Offense doctrine: "We do not rely on motions for our man/zone tells" (HNFL-180) [S].

**Return / yo-yo** (MS §3.3) [S]: "make the final declaration based on the actual formation at the snap ... A return motion can expose a weak safety who had begun poaching."

**Calls not found in HNFL:** "Travel", "Fire" and "Slide" (as a coverage word) do not appear as coverage motion calls in the HonestNFL sheets [verified by grep/reading]. "Slide" is a front (HNFL-055, 214). "Spin" is a zone pressure (HNFL-264). "Rock/Roll/Travel/Bump" exist only in the manuscript. "Buzz/Sky/Cloud/Rob/Lee/Rita/Linda/Sally/Rose/Myrtle/Ringo/Lucky/Thunder/Lightning" are rotation names (next list).

**Rotation names** (useful for motion responses) [S]:
- Rob/Lee or Rob/Lou = weak Sky (FS down weak).
- Sally/Rose and Rita/Linda = Buzz.
- Ringo/Lucky = fire-zone Sky to the nickel.
- Myrtle = Buzz; replaced by "Burn Zone" in 2026 (HNFL-281).
- Thunder/Lightning = Cloud with the safety as Tight 1/3 (HNFL-064).
- Randy/Leo = the side the Lurk safety goes down to (HNFL-240).
- Roy/Lou = the half-side call in split-field coverage (HNFL-085, 260).
- Basic safety rotations are diagrammed in HNFL-007 and 008 (Fangio 2x2 rotations) and HNFL-011 (3x1 rotations, "if Trix is off").

---

## C. Post-snap player adjustments / pattern-match calls

Each entry gives the trigger, who reacts, and the response.

**"CHINA"** (Quarters CB; also Tight 1/3 vs Smash).
- **Trigger:** "made by the outer defender when the receiver they align over runs a route that doesn't clear the No Cover Zone" (HNFL-063, 065, 190). That zone is "5 yards" (HNFL-093, 201) [S]; the BAL scout says "at 5 yards exactly" (HNFL-193).
- **Response:** "zone it off in order to combat Smash concepts." The CB zones the 1/4 "by sinking to close off the hole" (HNFL-093) [S].
  - The CB pattern-reads #2: "starting by looking for #2 on a corner, seam, or curl" (HNFL-079); "Corner > Seam/Fade > Dig" (HNFL-085) [S].
  - **Safety:** "play #2 from their top shoulder inside and suffocate the catch point with the corner. Pattern read for #2 = Corner > Seam/Fade > Post > Basic" (HNFL-092, 202) [S].
  - **Apex (Quarter Flat):** "push to #1 underneath so that he can zone off and sink" (HNFL-094, 200) [S]. "CHINA = Push to the route of #1 so the Corner can sink to the deep threat" (HNFL-194).
  - Wild Apex: "CHINA = take route of #1" (HNFL-363) [S].
- **Not available:** vs x1 / backside of Trix / MEG / #2 in the backfield (HNFL-033, 093, 095, 194) [S].

**"IN" / "In, In, In"** (CB; also Raider apex, Mush defenders).
- **Trigger:** "runs shallow across the No Cover Zone" (HNFL-063). Also "when #1 runs shallow and exchanges with #2" (HNFL-093) [S].
  - HNFL-079 [S]: "An IN call will be made once #1 truly declares themselves to be running shallow and not just getting us to zone off, then running upfield."
  - Shallow defined (HNFL-056) [S]: "Shallow = Receiver's jersey # is visible to you within 2 yards of the route."
- **Response:** "zone the 1/4 top-down relative to the new #1" (HNFL-093). "IN = zone 1/3 & find work" (HNFL-027).
  - Safety: "If In call is made by the Nickel, zone the 1/4 and shift focus to #1. Protect against the potential inside breaks by #1 ... Post > Curl > Basic" (HNFL-202) [S].
  - **Conflict:** "made by the Nickel" (HNFL-202) vs "made by the outer defender (CB)" (HNFL-063).

**"UNDER" / "Under, Under, Under"** [S].
- **Trigger:** #1 "fail[s] to clear the No Cover Zone" (HNFL-079), or #1 crosses under #2 (Crash) (HNFL-077, 079, 051 [D]).
- **Response:**
  - CB zones the 1/4 and plays top-down (HNFL-194).
  - Safety: "UNDER = CB help ... #2 up = no help inside from safety" (HNFL-077).
  - Quarter Flat apex: "If an Under call is made, you are now responsible for #1!" (HNFL-078).
  - In Read (HNFL-051 [D]): "Under = help from CB" (SS); "Under = squeeze #1" (Ni); "Under = zone your 1/4" (CB).

**"OUT" (Read/Palms)** [D].
- **Trigger:** #2 out/flat.
- **Response** (HNFL-051 Hank): CB cuts off #2 (trap); SS pushes to #1 and drives on the curl; Nickel zones the curl and gets eyes to #1.
- Glossary (HNFL-292) [S]: "Soft Squat (Corner) — #2 flat → trap the flat"; "Read #2 (Safety) — #2 flat → push to #1."

**"PUSH"** (Cover 9 / fire zone / Danger).
- **Trigger:** "A live call used when #3 or #4 release immediately to the flat" (HNFL-203) [D]. "#3 fast flat = Push rule" (HNFL-016) [D].
- **Response:** "an automatic redistribution of routes to the side of the call."
  - The Seam/Flat defender "cuts the flat threat by chasing it (don't beat it to the spot) top-down, inside-out with awareness for a potential Wheel."
  - "The callside #3/Hook defender pushes to the new #3 and matches it."
  - "The backside #3/Hook defender pushes to become the Hook defender" [D].
  - Glossary (HNFL-065) [S]: "Apex matches the flat (new #2) while Midpoint pushes to take the new #3."
  - "Fast #3 or #4 Exchange: PUSH it. Bump strong and re-distribute routes post-exchange" (HNFL-204, 064).
- "Push Alert: a call for Apex & ILB to exchange jobs if #3 is fast to the flat" (HNFL-056) [S].
- **Timing conflict:** "Possible Push call to exchange ... pre-snap vs. a fast #3" (HNFL-278) [S] and "redistribute pre-snap vs. a Fast #3 only using a Push call" (HNFL-193). Elsewhere Push is a "live" call (HNFL-203).
- BAL "FAST" call is the same function (HNFL-228) [D]: Nickel "Fast = push flat with #3"; Mike "Fast = relate to the new #3 in the count when Nickel pushes."
- Stubbie Mike: "Any fast 4, push thru w/ #4" (HNFL-270) [D].

**"SMASH" rule** (Tight 1/3; Read/Area/Danger corners) [S/D].
- **Trigger:** #1 short (hitch) with #2 corner behind.
- **Response:** Tight 1/3 "#1 unless Smash; Smash = zone your 1/3" (HNFL-016) [D].
  - Seam/Flat: "Smash = push to #1" (HNFL-016) [D].
  - Area: "Smash = push to #1" (HNFL-052).
  - Buster corner: "Smash = zone off (sink to 7)" (HNFL-071).
  - Triangle: "#1 under #2 = think Smash, sink to 7" (HNFL-014).
- Status by concept: "Smash rule is built in" for Read (HNFL-051) [D]. "No Smash rule in Book" (HNFL-050). "Smash rule does apply in Area" (HNFL-052) [S].

**Seam/Flat M-C-D** [S].
- **Triggers and responses:**
  - "Match any route by #2 that crosses their face to the outside" (the "#2 Out = any route by #2 that crosses your face to the flat area", HNFL-056).
  - "Carry any vertical stem up the seam by #2."
  - "Deliver anything inside or shallow and zone off ... seam-to-flat mindset" (HNFL-063).
- **#3 Away:** no deliver; take #2 back across (HNFL-065).
- **#2 vertical:** "means Mike or Dime must take #3 to the flat" (HNFL-204). "Take #3 flat if #2 is up" (HNFL-204) [S].

**Quarter Flat (Quarters apex)** (HNFL-078, 094, 312, 365 [D], 276, 277 [D]).
- **#2 out/flat:** "Push for width as #2 widens, but it's not a race. Chase it and maintain your depth to suffocate the Wheel route" [D]. "Chase it, don't beat it — match I/S out & carry the wheel" (HNFL-276) [S].
- **#2 vertical:** "Reroute #2 up the seam with your outside hand while maintaining vision to #1 ... drop #2 to the safety." HNFL-276: "punch with outside hand, stay square, ride seam for 10-12 yds." HNFL-196: "ride #2 up the seam until a new #2 comes under or for 8-10 yards until the Safety overtakes it" [S].
- **#2 vertical + #1 in/under:** "When #1 comes under and crosses #2's tracks, he is now the final #2. Corner and Safety handle #2 deep" [D].
- **#1 & #2 vertical + #3 away:** "If #2 stays #2, sink and squeeze off any void attacker. Think Dagger-to-Comeback by #1" [D].
- **#2 shallow + #3 to you:** "Allow #2 shallow to go and find the new flat threat or #2 ... commit to the flat once he crosses #2's tracks" [D].
- **#2 shallow + #3 away:** "Mike is occupied and we can no longer deliver #2, so we have to squeeze it and take it back across ourselves until help calls you off" [D].
- **#1 & #2 vertical + #3 to you:** "Once #3 crosses #2's tracks to the flat, fall off of the seam route and push to the flat threat top-down" [D].
- "If #2 goes under #3, squeeze in to the new #2" (HNFL-094) [S].
- "3-step drop = lock onto #1" / "drive down on routes" (HNFL-078) [S]. "DO NOT OVERCOMMIT TO #2 GOING FLAT! ... (ALERT WHEEL)" (HNFL-078).
- Delivery space is the "No Cover Zone": "deliver anything working back across in the No Cover Zone to the midpoint defender" (HNFL-078) [S].

**Inside 1/4 safety inferences from #2** (HNFL-092, 202) [S]:
- "If a detached #2 is fast to the flat ... #1 will be running some form of Hank. Must always be alert for a double move into a post + wheel."
- "If #2 runs a clearout up the seam and #1 is also running deep ... #1 will be running some form of in-breaker (void attacker)."
- "If #2 stays #2 and fails to clear the No Cover Zone ... #1 will be running some form of in-break above the LB level."
- "Possible ZONE IT call between corner & safety vs deep exchanges (snakes/scissors)."
- "By formation, can also SHOVE across if #2 cancels."

**"ZONE IT"** [S/D]:
- Corner and safety zone off deep exchanges (HNFL-092).
- Danger: "possible Zone It if on alert for deep exchanges" (HNFL-016) [D].
- "#1 & #2 stacked on the backside = Zone It" (HNFL-196).
- Read is also aka "Zone It" (HNFL-051) [D]. Name overlap.

**Quads vs 2 receivers (BAL)** (HNFL-274) [D]:
- "Choice" (#2 skip/walk/delay): "Match #2 I/S out"; Man #1 on top; match #2 low (#3 away); zone qtr.
- "Pop": relate to new 3.
- "Scissors": "Man #1 (if alert 87 can pass off scissors)"; push to new 3; "man qtr with vert separation."
- "Branch": "press into branch."
- HNFL-277 [D]: "bring 2 back with 3 away"; "drive dig w/ #2 short"; "drive slant #2."

**Quads route pickups (HNFL-196/243)** [S]:
- **All Go:** CB M/M on #1 caps the vertical. "Two vertical stems against Quarters is likely to result in some form of void attacker."
- **Flanker Drive:** CB "In" call, sink to 7, Corner-Seam-Basic. Nickel "allow the shallow to pass through the No Cover Zone and match the final #2." Mike "if final #3 is shallow, zone the hook top-down (Dig to Dump)."
- **Crash:** CB "In" call, push to new #1. "Ride #2 up the seam ... 8-10 yards until the Safety overtakes."
- **Dagger:** "Once #3 goes flat, fall off #2 and push to the flat"; Mike "push with #3 until he is no longer #3."
- **Drive (stack, #3 away):** "When #1 stays #1 and #2 cancels, this essentially turns into a bracket on #1 by the CB & FS"; "#2 weak can not be delivered."

**Wall technique** (HNFL-292, 131) [S]: "responsible for anything inside & upfield by the final #2/#3 ... zone off and look for a new #2/#3 coming inside when their man goes flat." Used in Vertical Curl, Vertical Hook, Deuce Hook, Read Hook, Read Curl.

**Squat corner** (HNFL-099, 255, 097) [S].
- "Collision → Funnel → Open → Sink."
- "Sink with #1 until the ball brings you back down. Top-down any high/low."
- "No flat threat = convert to man under on final #1."
- "Only the ball will bring you down!"

**Sink corner (Buster)** (HNFL-131, 292) [S]: "#2 flat = overplay #1 expecting some form of Hank ... possibly steal #2 late within a void attacker." "Against deep exchanges (snakes & sails), he can fall off the clearout and steal the corner/sail route" (HNFL-130).

**Steal** (technique) (HNFL-075) [S]: "utilize a pattern read to fall off of the clearout route and trap the live route."

**Me/You (Buster / Middle Read)** [S].
- Apex is responsible for the outermost of #2/#3; Midpoint for the innermost (HNFL-131).
- "#2 out fast = lock #1" (corner) (HNFL-071).
- "New #3 post, match new #2" (HNFL-071).

**Box / Squat area rules** [D]: "Davis = split 2&3 / split 1&2"; "Deep exchange = zone it off"; "1 vertical route = 2-on-1"; "No in = zone off"; "Midpoint flat/7"; "Final #3 over = cut it off" (Trix FS) (HNFL-053).

**Clue 1/3 reactions** [S]: "#2 up + #3 away = buzz under #1"; "#2 cancels early, lock onto #1 or who becomes #1"; "stay above the wheel" (HNFL-091, 203).

**Combo (ILBs on #3 / back)** [S]: "LB to #3 matches the route & LB away zones the Hook (like Lurk)" (HNFL-292).

**Banjo:** "in/out match principles between linebackers on two threats in the core" (HNFL-031) [S]. Robber/Thief: "If there are multiple core threats to sort, they will Banjo it" (HNFL-209) [S].

**Switch (Lurk mesh)** [S]: "Mesh = possible switch. Cut off the shallow with leverage. Original defender will zone the Hook" (HNFL-240). Slug: "Possible Bonus Hook on Switch vs. #2 detached" (HNFL-057) [S].

**Train / Peel / Hit** [S].
- "TRAIN = any rusher can take the HB if he releases thru their lane" (HNFL-207, 210).
- "Edge rushers will peel on flare" (HNFL-216).
- "HIT — edge rusher will chip to disrupt a receiving threat coming from the core" (HNFL-261).

**Screw (play-action trigger)** (HNFL-114) [S]: "plays as MOD unless there is any sort of play fake between the QB & back, then the apex triggers and the strong safety takes #2 up & out. Nickel reroutes, but no carry." Key: "No mesh = 1/4 flat, reroute #2; Mesh = TE bigger = Apex force." It is "typically played when the split of #2 renders Read useless."

**Pop the top (Deuce safety)** (HNFL-373) [S]: "if #2 is detached & the Deuce hook dropper is selling, they will pop the top and hold off any pop pass to #2 before dropping deep."

**DOT** (HNFL-302): "drop off of #3; do not carry vertical; top-down any crossing route by the final #3" [S].

**Robber / Rob the post / Rat / Thief** [S].
- Robber = SS into the hole; Thief = FS into the hole; Rat = LOS defender into the low hole (HNFL-031).
- Inside 1/4 "may rob the post instead" by G.P. (HNFL-077).
- The BAL scout notes safeties "don't look to bracket #1 if there is no seam threat — they will act more like Robber" (HNFL-193).
- "Robot" does not appear in HNFL. It appears only in the manuscript (MS §5.1 "robot on crossers").

**Pirate / Hank / Bingo / Crash / Lion etc.** These are **offensive route-concept names** used as diagram labels showing the defensive pickup, not defensive calls (HNFL-077, 078, 079, 051) [S]. Their pickups:
- **Hank** (#1 hitch, #2 flat): Quarter Flat "match 1st flat"; CB "man #1"; Safety "squeeze to #1" (HNFL-077, 079).
- **Pirate:** "cut off #1"; "Under, Under!"; CB "zone your 1/4"; safety "top-down #2" (HNFL-077, 079).
- **Bingo:** "No new #2 means you can help ... deflate #2 from underneath"; "sink to the 7" (HNFL-078, 079).
- **Crash:** CB "Under" help; safety "top-down, inside-out #2; #2 up = no help inside from safety" (HNFL-077).

**Red-zone post-snap adjustments** [S]:
- "Red Middle Run ... maximum depth about 5 yards into the end zone. If there is no seam threat, drop back into the hook zone favoring the side #3 releases to" (HNFL-288).
- Red Mod: corner "#1 man-to-man unless shallow"; apex "1st flat of #2/3, the final #2, or #1 low (China call)"; safety "caps the seam of #2 or finds work (squeeze to #1 or rob the post)" (HNFL-287).
- Red Fence / Blanket: "sort out routes based on final #1-2-3-4" (HNFL-289).

**Manuscript general rules** [S]:
- Six moments of a route match: initial stem, declaration, communication, transition, replacement, catch point (MS §4.1).
- Handoff physical feasibility (MS §4.3).
- Under-defender errors: "chase too far, drop too early, fail to communicate" (MS §9.2).
- Palms tree (MS §11.1): "#2 quick out → CB drive/match #2, S replace over #1; #2 initially out then wheel → CB must stay."

---

## D. Situational / game-plan checks

- **Red zone** (HNFL-287 to 290, 281) [S]:
  - Applies from "about the +15 yard line to the goal line"; "within the 15" (HNFL-281); "utilizing the back of the endzone as a 12th defender."
  - Red 7 Bracket (+1 man-match bracket each side; tools Bracket, Cut, Slice, Cone, Inc, Cathy, Connie, Sandy, Thumbs, Nail, Triangle, Trio, Choke, Dbl).
  - Red 6 / Red Pack (Red Mod strong; Red Wild weak; Red Smack vs 3x1 with oversplit weak #1).
  - Red 8 / Red Stuff (Red Wild / Red Buster / Red Cloud strong with trips tools; Red Quads / Mod / Trix weak).
  - Red Cover 1: "utilizes the post defender as a bracketing tool on the most dangerous threat."
  - Red 2 Tampa: corners Red Smash, funnel #1 wide.
  - Red 20 Tampa Rat / Robber.
  - Red Hercules: 3-deep/5-under, both safeties invert to curl between #2/#3, apexes buzz-flat under #1, Will inverts to the post.
  - Red Fence: 7-across at the goal line.
  - Red Blanket: 5 deep, 1 under.
  - Red 2 Cloud: safeties "midpoint #1 & #2 emphasizing width over depth", midpoint "won't get deeper than 5 yards into the EZ".
  - Red 4 Mod: "plays out more like Bracket" (HNFL-290).
  - Red 9 Weak: "post safety ... cut off or squeeze routes earlier."
  - Cover 0 "typically utilized for pressure and/or low red zone" (HNFL-210).
- **Third down / passing downs** [S]:
  - Trix "pass downs from Cover 4/8 vs. most 3x1."
  - Box Trix "pass downs vs 3x1 Bunch with multiple deep threats."
  - Buster "pass downs vs bunch when we must stay 3-over-2 weak" (HNFL-195) [D].
  - Squat Trix "pass downs from Cover 8" (HNFL-336).
  - Cover 5 Fist/Pounder "typically in 3rd & XL situations" (HNFL-074).
  - Quads (scouted) "they basically only call this in passing situations" (HNFL-193).
  - Third-down fronts "3rd down rules" (HNFL-089).
- **End of half / Hail Mary** (HNFL-017 "Last 1 Shake / Check Squash") [S, OCR partial]:
  - Corners "align 20 yards off ... box out #1."
  - Safeties "align deep (endzone)."
  - Nickel / SS "align on #2/#3 ... blitz outside off of slot ... pull up sprint"; "make a Squash check in Gun Far Speed Trips."
  - Free safety "play over the entire middle of passing strength WRs ... jump/spike the ball."
  - **Inference [I]:** this is a prevent check vs trips.
- **Two-minute:** only offensive two-minute "Save Mode" installs (HNFL-103, 222, 223, 250, 342). Manuscript MS §19 [S]: "sideline, timeout and first-down needs modify how much underneath yardage is acceptable, but giving up an easy hole shot because every DB is playing the boundary is not a sound default."
- **Backed up / goal line:** no HNFL defensive check. MS §19 goal line [S]: "coverage and support must be integrated with a condensed front; a quick pop pass or TE leak can exploit a corner/safety who commits to the run."
- **Third-and-medium/long** (MS §19) [S]: "use 'sticks' as a landmark adjustment ... third-and-long, deeper vertical distributions, slot fades and crossers become a greater concern."
- **Field vs boundary / split-field:** see A7.
  - Roy/Lou: "Allows us to keep the 1/2 side to the most dangerous threat and/or protect a CB's matchup" (HNFL-085, 260) [S].
  - Ring #: "If [tagged threat] at #1 wide, play Fist to them with Pounder away. If aligned inside the numbers, it plays as Pounder across the board" (HNFL-261) [S].
- **Vs specific personnel / matchups** [S]:
  - Book "usually when #2 weak is a stud" → Key (HNFL-204).
  - Stubbie/Trix "when #3 is a vertical mismatch."
  - Area "when we put a TE/HB (non-vertical threat) at #1."
  - 5 Trap "typically used to Trips or to a stud receiver side" (HNFL-206).
  - Man alignment rules "speed on speed, size on size, skill on skill" (HNFL-031).
  - Chicago half to "stud (by GP)" (HNFL-229).
  - Personnel tendency tables (HNFL-186, 187).
- **Pressure/package-specific checks:**
  - Sack-It (empty) (HNFL-215).
  - Fire zone Clue/Spot/Sort/Push menu (HNFL-064, 239).
  - Sand Deuce Rip/Liz fixed vs motion (HNFL-121).
  - Slide Buzz: home → Buzz, gun → Bulls or Twister (HNFL-214).
  - Rat Bug Texas → Cloud vs bunch/snug (HNFL-213).
  - Rush Wild vs empty → "Wide" (HNFL-364).
- **Situational usage** (scouting) [S]:
  - "TRIPS/TREY (3x) ADJUSTMENTS = TRIX (55%), STRAP (20%), AREA (10%), BOOK (5%), ZORRO (5%), PLAY IT (5%)" (HNFL-186).

---

## E. Stated thresholds

All are [S] unless marked otherwise.

| Threshold | Value | Source |
|---|---|---|
| No Cover Zone (China trigger) | "5 yards"; "(5YDS FROM LOS)"; scout: "zone it off (at 5 yards exactly)" | HNFL-093, 201, 142, 193 |
| Read/Palms trigger | "#2 is out or flat **under 5y**" | HNFL-051 [D] |
| "Shallow" definition | "jersey # is visible to you within 2 yards of the route" | HNFL-056 |
| Quarter Flat seam ride | "ride seam for 10-12 yds"; vs "8-10 yards until the Safety overtakes" | HNFL-276; HNFL-196/243 |
| Squat corner | "Cloud (5-7 yards) depth about a yard outside of #1"; "collision #1 on 2 lateral shuffles" | HNFL-099, 255, 097 |
| Cloud corner | "4-7 yards off #1" | HNFL-031 |
| Press / Off corner | press "within 3 yards"; off ">7 yards" | HNFL-031 |
| Clue alignment | 7+ yards, outside #1 | HNFL-063 |
| Wall alignment | "1 yard inside and 4-6 yards deep"; glossary "about 5 yards" | HNFL-094; HNFL-190 |
| Squeeze alignment | outside, "about 5 yards"; recognition "4+ yards" | HNFL-063; HNFL-122 |
| Quarters safety | "10-12 yards relative to #2"; vs "12-14 yards"; "12 yds" | HNFL-033/192; 092/202; 006 |
| Halves safety | "14+ yards relative to #2" | HNFL-068, 291 |
| Halves landmarks | Deep 1/2 "≈1y inside the top of the numbers at ≈22y"; Wide 1/2 "≈3y outside the numbers at ≈20y" | HNFL-291 [D] |
| Triangle safety | "8-12y deep on the stack" | HNFL-014 |
| Stubbie | Nickel 6x1 O/S #2; Safety 12x1 O/S #3 | HNFL-270 [D] |
| BAL Box | Corner 1x8; Safety 1x10 | HNFL-272 [D] |
| BAL Zone It | Corner 7 deep / 1 outside; Safety 1x14 | HNFL-269 [D] |
| BAL Stuff/Pack | Safety 1x12 O/S #2 (Quads), 1x12 I/S #2 (Read), 0x12 heads #2 (Cloud/Choke); Soft Squat "Bail or 1x7 I/S #1"; Stubbie safety 1x12 O/S #3 | HNFL-230 [D], 231 |
| Bunch definition | "#1 & #3 ... within about 5-6 yards" | HNFL-281 |
| "Close" formation | "3 yards from formation" | HNFL-212 [D] |
| Red zone | "+15 to goal line"; "within the 15 yard line" | HNFL-287; HNFL-281 |
| Red middle runner | max ~5 yards into the end zone | HNFL-288, 290 |
| Hail Mary | corners 20 yards off | HNFL-017 |
| Cover 0 | "6-7 man pressure" | HNFL-210 |
| Corner collapse read (offense) | corner still dropping "as the route reaches 8-10 yards" | HNFL-135 |
| Manuscript timing | "snap-plus-0.3 seconds"; Lab 1 "first 0.4 s / at 0.8 s" | MS §22, Lab 1 |
| Manuscript caveat | "no universally fixed five-yard rule" | MS §4 |

**Not stated anywhere:**
- No "carry to 12" or "first 3 steps" threshold appears in any source. The closest are the 10-12 yd seam ride (HNFL-276) and "2 lateral shuffles" (HNFL-097).
- The QB-side "If #2 doesn't win by your 3rd step, reset" (HNFL-002) is an offensive rule.

---

## Conflicts and naming collisions between sheets

1. **Book China/In.** HNFL-190/284 say "No China or In calls available"; HNFL-309 says "China & In rules apply". The glossary distinguishes Book from Stump by exactly this.
2. **Key vs Site.** On the Cover 9 adjustments page, HNFL-203 labels the #2-weak fast/slow pair "KEY"; HNFL-304 relabels it "SITE".
3. **Grab vs Wasp.** HNFL-063 calls the 3x1/empty 9-Buzz adjustment "GRAB"; HNFL-283 calls it "WASP". "Wasp" is also a BAL simulated pressure (HNFL-242) and a Quarters/Buzz mechanism (HNFL-184).
4. **Trap.** In Cover 2 (HNFL-068, 291) Trap = CB lock #1 + Read on #2 & #3. In Cover 5 (HNFL-075) Trap = man-match corner/apex/safety keyed on #2. In stack tools (HNFL-024) Trap = 3-over-2 man-match. Binder = lock + Trap inside.
5. **Lock.** Stack Lock = point/back man (HNFL-024). Halves Lock = CB lock #1 + Wild inside (HNFL-131). Generic Lock = man within a non-man concept (HNFL-031). BAL "3 Lock" = Cover 3 match (HNFL-227).
6. **Key.** Stack Key (HNFL-024), 2x2 nickel TE Key (HNFL-279), Cover 9 Key (HNFL-203), and Buster aka "Key" (HNFL-069) are four distinct meanings.
7. **Nickel motion.** Most sheets: the nickel runs only with change-of-strength motion. Sand Deuce (HNFL-121): "Do not run with change of strength motion"; Rip/Liz fixed.
8. **Push timing.** Pre-snap (HNFL-193, 278) vs live / post-snap (HNFL-203, 065).
9. **Quarters safety depth.** 10-12 yds (HNFL-033/192/290) vs 12-14 yds (HNFL-092/202) vs 12 yds (HNFL-006).
10. **Seam ride.** 8-10 yds (HNFL-196) vs 10-12 yds (HNFL-276).
11. **Bunch apex leverage.** Box: apex "up & outside on point" (HNFL-053). Squat: apex "up & inside on point" (HNFL-072). Rush Wild: "Nickel has the vertical! Must align inside #2" (HNFL-364).
12. **Box corner/safety technique.** True 1/4, outermost/innermost upfield (HNFL-331) vs "Outside 1/4 #1 out deep / Inside 1/4 1st in deep" (HNFL-053) vs BAL "MOD, if #1 under = climb / match the 1/4 #2" (HNFL-272).
13. **Who makes the "In" call.** The outer defender/CB (HNFL-063, 093) vs "made by the Nickel" (HNFL-202).
14. **Cover 3/9 meaning changed for 2026.** Rotation direction is no longer tied to strong (3) or weak (9) (HNFL-280). Older sheets (HNFL-054, 115) tie 9 to weak rotation.
15. **Cover 6/8 naming.** Older sheets: Cover 6 = "Stuff" (QQH, quarters to the nickel) and Cover 8 = "Stuff Nickel" (HNFL-073, 115, 324). 2026 sheets: sub Cover 6 = "Pack" and sub Cover 8 = "Stuff" (HNFL-280). BAL: Pack = QQH and Stuff = HQQ (HNFL-227, 230, 231). CONCEPTS.md flags this.

## Implementation notes [I]

- Keep each check as a **semantic transformation** keyed on formation features: count of #1-#4, attached/detached #2, #1 split (oversplit/minus/nasty), #1-#3 spacing for bunch, stack, back location, field side, passing strength and nickel side. The spoken name should be a separate team-specific token. This is the manuscript's own advice (MS §3.1).
- The post-snap calls (In, China, Under, Out, Push, Smash, Fast) all reduce to observable route-declaration triggers. The relevant thresholds are the No Cover Zone depth, the "flat" region, "crosses face", "crosses #2's tracks", "#3 to/away" and "cancels".
- Simulate the handoffs as continuous relationships with physical overlap, not instant deletion. This follows MS §4.3 and HB-DP §8.
