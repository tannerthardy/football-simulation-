<!-- Compiled 2026-10-22 by a research agent for the def-alignment session (PR #194) from public sources: scanned NFL defensive playbooks in the Internet Archive's historic playbook collections, coaching clinics and analysts. Every rule is marked [D] direct (quote or close paraphrase), [I] interpretation, or [S] search-snippet only. It is a catalog of what sources say, not engine behavior: see PR #194's description for what is implemented and measured. Section 8.2 numbers were computed from out/align/nfl-snap.csv.gz (2022 weeks 1-9) with throwaway scripts; the PR's numbers come from scripts/diag/align/deflook.py. -->

# Defensive pre-snap alignment: a codable catalog of rules from sources

Research date: 2026-10-22. Scope: NFL and college defensive pre-snap alignment rules for a physics-based simulation.

## How to read this

- **[D]** marks a direct statement from the cited source. A quote or close paraphrase follows.
- **[I]** marks my interpretation, inference or synthesis.
- **[S]** marks a claim I saw only in a search-engine summary. I could not fetch the page because of a paywall or a 403. Treat it as weaker evidence.
- **NOT SPECIFIED** marks a gap that no source I read covers numerically.
- Where sources disagree, both versions are shown. Nothing has been averaged.

### Primary NFL playbooks used

These come from the Internet Archive's "Historic \<team\> Playbooks" collections. I read them as OCR text. I also rendered and visually checked the key pages listed below.

| Short name | What it is | Archive item | Pages visually verified |
|---|---|---|---|
| **TB99** | 1999 Tampa Bay Buccaneers defense install (Dungy/Kiffin, Tampa 2, 4-3 Over/Under) | https://archive.org/details/historic-tampa-bay-buccaneers-playbooks (`1999-Cover-2-Dungy-Tampa-Bay-Buccaneers-Kiffin-Defense-Install.pdf`) | PDF pp. 58 (Under), 62 (Over), 70 (Over 2 alignment chart) |
| **TB99-DL** | 1999 Bucs DL manual, same item (`...-Kiffin-DL.pdf`) | same | pp. 9 (1-tech), 13 (3-tech), 18 (closed-end 5), 24 (loose 5), 28 (stack-end 7) |
| **NYJ97** | 1997 NY Jets defense (Belichick as DC) | https://archive.org/details/historic-new-york-jets-playbooks | OCR only |
| **ATL03** | 2003 Atlanta Falcons defense (Wade Phillips) | https://archive.org/details/historic-atlanta-falcons-playbooks | pp. 37 (Sam & Will Tonto), 43 (Will Bullets), 54 (Cov 1 Dog) |
| **PHI90** | 1990 Philadelphia Eagles 46 defense (Buddy Ryan) | https://archive.org/details/historic-philadelphia-eagles-playbooks | p. 5 (46 alignment) |
| **BAL05** | 2005 Ravens 3-4: Mike Pettine (OLB coach) Glazier clinic, Rex Ryan scheme | https://archive.org/details/historic-baltimore-ravens-playbooks | OCR only |
| **CIN02** | 2002 Cincinnati Bengals defense | https://archive.org/details/historic-cincinnati-bengals-playbooks | OCR only |
| **CHI98** | 1998 Chicago Bears defense | https://archive.org/details/historic-chicago-bears-playbooks | OCR only |
| **NYG84/91/95** | Giants defense books (1984 3-4, 1991 Bud Carson, 1995) | https://archive.org/details/1984-ny-giants-34 | OCR only |
| **CAR97, NE91, SF92** | 1997 Panthers 3-4, 1991 Patriots 3-4, 1992 49ers 3-4 | `historic-carolina-panthers-playbooks`, `historic-new-england-patriots-playbooks`, `historic-san-francisco-49ers-playbooks` | OCR only |

Caveats:
- These playbooks are 1990–2005. They are excellent for exact alignment conventions and numbers, but they predate the nickel-as-base era. Section 8 covers modern usage.
- OCR text can garble words. Every number quoted as [D] from an "OCR only" source appeared legibly in the OCR. Treat those numbers as slightly lower confidence than the page-verified ones.

---

## 1. Technique numbering and depth off the ball

### 1.1 Standard numbering (most common modern convention)

The pattern is that even numbers are head-up and odd numbers are on a shoulder. An "i" means an inside shade. The table counts outward from the center.

| Tech | Most common definition | Sources (all [D]) |
|---|---|---|
| 0 | Head-up on the center | Wikipedia "Gap (American football)"; Lance Reisland; MatchQuarters glossary |
| 1 (also called "shade" or "0-shade") | Shoulder of the center, in one A gap | Wikipedia; Reisland ("outside shade of the center"); TB99-DL p. 9: "slightly cocked outside shade of center and play as tight to him as possible without being hooked" |
| 2i | Inside shoulder of the guard | Wikipedia; MQ glossary |
| 2 | Head-up on the guard | Wikipedia; ATL03 |
| 3 | Outside shoulder of the guard (B gap) | Wikipedia; TB99-DL p. 13 ("slightly cocked outside shade of offensive guard … as tight … as possible without being hooked") |
| 4i | Inside shoulder of the tackle | Wikipedia; ATL03 ("41 [=4i] technique – inside alignment on the tackle") |
| 4 | Head-up on the tackle | Wikipedia; ATL03; BAL05 ("LE 4 tech, N 0 tech, RE 4 tech") |
| 5 | Outside shoulder of the tackle | Wikipedia; TB99-DL p. 18 (closed end, "slightly cocked outside shade of offensive tackle") |
| 6 | Head-up on the TE | Wikipedia; ATL03 |
| 7 | Inside shoulder of the TE | ATL03 ("7 technique – inside alignment on TE"); TB99-DL p. 28 ("Stack End, 7 technique … inside shade of tight end"); Reisland ("the exception to the numbering pattern") |
| 9 | Outside shoulder of the TE, or a set width outside the tackle when there is no TE | ATL03 ("9 technique – outside alignment on TE"); Wikipedia ("usually a couple feet on the outside away from any blocker"); MQ glossary ("wide outside shoulder of the Tight End") |
| Loose 5 / wide 5 | Wider than the 5. TB99-DL p. 24: "Loose 5 technique … slightly cocked one yard outside tackle" | [D] TB99-DL; BAL05 lists "open end – wide 5 tech" for obvious pass |
| Wide 9 | A 9 widened further from the core. Ends "removed … and adjusted their stance" (angled in) | [D] Bowen, BR 4-3 basics; [D] NFL.com: ends "inch outside the offensive tackles over the 'nine' gap"; [S] phillymag: about "three feet wider than usual"; [S] philadelphiaeagles.com: "about a yard outside of the offensive tackles" |
| Ghost / "6" or "9" with no TE | A defender outside on air on the open side | [D] Football Toolbox/Campbell 4-2-5 PDF: "a ghost alignment … a defender outside on air, usually to an open side"; "ghost nine technique has … outside (contain) responsibility" |

Precise definitions of a shade:
- [D] Campbell, Football Toolbox 4-2-5: "the base alignment [for a shade] will be the inside foot of the defender splitting the midline of his offensive alignment. Whenever talking about a wide alignment it will be the inside foot to outside foot of the offensive personnel."
- [I] Codable version: a shade puts the defender's near foot on the blocker's midline. A "wide" or "loose" technique puts the defender's inside foot on the blocker's outside foot. TB99-DL makes "loose 5" about 1 yard outside the tackle.

### 1.2 Where sources disagree on numbering

| Item | Version A | Version B |
|---|---|---|
| **7 technique** | Inside shoulder of the TE: ATL03, TB99-DL, Reisland, Wikipedia ("can mean") | Outside shoulder of the TE: Bowen, BR 4-3 ("closed-side defensive end in a '7-technique' (outside shoulder of tight end)"); BR 3-4 puts the Okie Sam "in a 7-technique outside the tight end". Phinsider: "6i between the tight end and tackle, and a 7-technique would be outside the tight end", then 8i/8/9 beyond, while noting that some teams use the 6/7/9 scheme instead. |
| **1 technique** | Shoulder of the center: most sources | Inside shoulder of the guard: PFF (Monson, "Defensive Line Techniques – The Prototypes"); ATL03 / Wade Phillips: "1 TECHNIQUE – INSIDE ALIGNMENT ON GUARD" with "SHADE TECH – plus or minus alignment on the center" |
| **5 technique** | Outside shoulder of the tackle: most sources | PFF (Monson): "the traditional 5-technique is a two-gap player, lining up directly over the offensive tackle". That is a 4 in the standard scheme. |
| **Hole/gap numbering** | Bucs/Jets: "even numbers are always to our left, odd to our right" (hole numbers) | Falcons: "0 hole over right hip of center, 1 hole over left hip …" (holes counted per side) |

[I] For the simulation: store alignment as geometry, meaning a lateral offset from a named blocker's midline plus a depth. Keep the technique number as a label only. The labels conflict across sources and the geometry does not.

### 1.3 Depth off the ball (DL and stand-up edges)

- [D] TB99-DL, 1-tech and 3-tech: "play as tight to him as possible without being hooked". Stance is "3 point with your outside foot back".
- [D] TB99 (Over Stem / Over): the closed end has the coaching point "stretch 5 yds". This describes his run-play path, not his alignment.
- [D] BAL05 (Odd, two-gap): "BASE TECHNIQUE: 2 GAP (align slightly off the ball)".
- [D] NYG95 goal-line tackles: "Stance – four point … Alignment – … as close to L.O.S. as possible."
- [D] ATL03 stand-up edge: "WILL BACKER – 2 YDS OUTSIDE TACKLE ON L.O.S. '8'". The Sam is head-up on the TE "6", or outside eye to outside half of the TE "9".
- [D] PHI90 46: "WEAK END: 1 YARD OUTSIDE THE WEAK OFF. TACKLE". Jack and Charley are "on the line of scrimmage", bracketing the TE foot-to-foot.
- [D, weak] Coaching-forum results via search: a reading 50 nose sits about 6–18 in off the ball, and a crowded 6-tech sits about 6 in. Treat these as anecdotal.
- **NOT SPECIFIED** by any NFL source I read: a numeric depth, in inches, for one-gap 3/5 techniques. The NFL convention is "crowd the ball" for one-gap penetrators and "slightly off" for two-gappers. [I] A reasonable default is 0.3–0.5 yd for one-gap and 0.6–1.0 yd for two-gap. Let reaction time and the read-versus-penetrate trade-off follow from that depth instead of stipulating it.

---

## 2. Strength calls: how the front and coverage set their "strong" side

### 2.1 Run strength and pass strength are separate declarations

- [D] **NYJ97 (Belichick):** "STRENGTH IS DEFINED AS THE TWO RECEIVER SIDE FOR COVERAGES PURPOSES, THE DEFENSIVE FRONT STRENGTH IS ALWAYS DETERMINED BY TE LOCATION. THE BACKFIELD SET IS DESCRIBED SEPARATELY AND DOES NOT CHANGE STRENGTH."
  - The book also shows a diagram with "COVERAGE STRENGTH RIGHT / RUN STRENGTH LEFT".
  - LB call at the LOS: "1. BACKFIELD SET … 2. RECEIVER STRENGTH (LEFT or RIGHT) … 3. TIGHT END ALIGNMENT".
- [D] **CHI98:** "Run strength is to tight end; pass strength is to 2 receivers." Also: "The run strength will be called by Mike LB'er to the TE side of formation."
- [D] **Bowen (BR, 4-3):** "When the offense breaks the huddle … the defense will then 'set' the front with a 'closed' call to the tight end side. If two tight ends are in the game, the defensive coordinators will identify which tight end they are going to close the front to during game-week prep." The Mike makes the "closed right/left" call.
- [D] **CIN02:** "Free Safety will recognize and call out the offensive strength. Strong Left (Lou) Strong Right (Roy)." The Buck (ILB) makes the "Closed"/"Open" call "to identify location of TE only if significant".

### 2.2 TB99 strength rules (Kiffin/Dungy), as written [D]

1. Any two-back formation: strength is called to the 2-receiver side.
2. One-back formation with two receivers on each side of the center, by priority:
   - (A) two receivers to the same side;
   - (B) one receiver on Y's side with H aligned away from Y;
   - (C) one receiver each side with two TEs in the game: strength to the **stud TE**.
3. Any trips (three receivers to one side): strength goes to the 3-receiver side.
4. Versus Regular and Ace, when a receiver **crosses the ball** the strength goes to the side he is going.
5. Versus Regular and Ace, if the formation begins as a Pro set and **Y motion crosses the ball**, strength goes to the side Y is going.
6. Versus Regular personnel, a "Yukon" call (Trips Out / Outside Y-off) "will not change strength".
7. Versus Diamond (11 personnel): strength to the two-receiver side.
8. Versus Flush (0 TE, 4 WR): strength goes "to the wide side then left". If the formation begins as trips and a receiver peels to double, strength stays on the original side.

Also [D] TB99: "Mike: Make 'closed' call to identify location of TE only if significant." The strong safety gives the "support call to closed side".

### 2.3 High-school and college conventions (2-receiver / defense-left defaults)

- [D] Campbell, Football Toolbox 4-2-5 and 3-4 huddle pages: the call "is dependent upon the Tight End, if no Tight End then the call will be made to the two receiver side. Versus a balanced formation and no Tight End then the linebackers will make their call to the defenses left side or the offenses right side."
- [S] MatchQuarters (paywalled; seen as a search snippet): in the NFL, calls are set off passing strength rather than field/boundary, because the hashes are narrow. Lower levels set by field and boundary.
- [I] Field geometry backs this up. The NFL hash is 70 ft 9 in from the sideline (Wikipedia "American football field"; TB99: "Boundary to hash – 23 yards 1'9"").
  - NFL: the boundary is about 23.6 yd and the field side about 29.8 yd, a difference of only about 6.2 yd.
  - College (hash 60 ft): 20.0 yd versus 33.3 yd, a difference of 13.3 yd.
  - [I] So field/boundary strength matters roughly twice as much in college.

### 2.4 Named strength "sources" in modern terminology

From the MatchQuarters glossary (https://www.matchquarters.com/p/comprehensive-defensive-football-glossary) [D]:

| Front name | How its strength is set |
|---|---|
| **Fight** | "the strength is set based on the Tight End's alignment" |
| **Strength** | "set to the passing strength or wide side of the field" |
| **Bound** | "set to the boundary" |
| **Mint** | "the defensive line sets its strength weak of the Nickelback's alignment" |
| **Bub** | "the 3-technique … is set away from the Nickelback" |
| **Bench** | "defensive linemen align to one side, away from the passing strength" |
| **Over** | "3-technique … set to the strong side" |

- [D] Rex Ryan / Pettine (BAL05) on pressures: "Designate to FIELD, BACKS (TO & AWAY), PASS STRENGTH, TIGHT END, INDIVIDUAL, R/L etc." Strength is itself a call parameter.
- [D] Fangio tree (Bleeding Green Nation, "Vic Fangio Defense 101 Part 2"): "the nickel cornerback is always aligned with the passing strength."
- [D] Saban tree (Derrick Ansley clinic via USA Football): "The 'star' is our rover. He goes to the passing strength of the formation. The rotation takes place away from the 'star.'"

### 2.5 Directional words do not mean the same thing across staffs

All of the following are [D].

| Terms | Meaning by source |
|---|---|
| Lou / Roy | CIN02: formation strength Left/Right |
| Lex / Ray | CIN02: cloud (corner-force) rotation left/right |
| Larry / Ralph | CIN02: "Secondary rotation to our left with Left Safety playing Hook–Curl (Backer Force)". CAR97: "Ralph-Larry call" for a 3-deep adjustable zone. MQ glossary (Gregg Williams tree): safety force direction in Cover 3. |
| Roger / Louie | NYG84, NYG91, NYG95: line **slant/stunt** direction ("Sam will give a 'Roger/Louie' call slanting the line toward the tight end"). NYG84 unbalanced: "UNBALANCED LT. – MOVE LEFT – 'Roger'". |
| Ringo / Lucky | NYG84/91/95: a DL stunt technique ("Ringo technique – inside rusher weak"). MQ glossary: zone-pressure direction. SF92: SS-side coverage adjustment ("'LUCKY' ADJUSTMENT – STRONG SAFETY ALIGN LEFT"). ATL03: Cover 3 rotation audible ("COV.3 … AUDIBLE = ROGER/LUCKY"). |
| Rip / Liz | Saban: which safety rotates down in single-high (Brophy; Ansley). MQ glossary (Muschamp tree): "LIZ/RIP: A front mechanics call declaring which EDGE is the 4th rusher". |
| Rita / Linda | Saban: safety rotation right/left (Brophy). |
| Sally / Rose, River / Lake | Cover 3 rotation side; Cover 2 half-rotation (MQ glossary, Muschamp tree). Aranda/Roberts tree: "LAKE/RIVER: a call in Nickel Man to set the front, usually made to the TE or away from the RB". |

[I] Model "strength" as a set of independent pointers, each with its own source rule:
- run strength (TE),
- pass strength (receiver count),
- field side,
- back side,
- nickel side,
- pressure side.

Calls then reference one pointer. Do not use a single "strong side".

### 2.6 What changes versus 12/13, 10/11 2x2, 3x1 and empty

- **2 TE (12/13):**
  - [D] TB99: strength to the stud TE when the formation is balanced.
  - [D] Bowen: game-plan choice of which TE to close to.
  - [D] ATL03 short yardage: "SHORT YARDAGE STACK ZONE … USED VS. 22, 13 PERSONNEL".
- **No TE, 2x2:**
  - [D] TB99 Flush rule: wide side, then left. [D] Campbell: defense's left.
  - [D] NYJ97: "ACE STRENGTH MUST BE DECLARED", meaning a declaration is needed when there is no indicator.
- **3x1:** pass strength goes to trips (TB99, NYJ97, CHI98). Front strength stays on the TE where one exists (NYJ97).
- **Empty:** see §4.6.

---

## 3. Front catalog

The tables give each defender's technique, and the LB alignment and depth where a source gives one. "Closed" means the TE side and "open" the split-end side.

### 3.1 4-3 Over (3-technique to the closed/strength side)

**Bowen (BR, 4-3)** [D]:
- 3-tech DT to the closed side; Nose "0 shade" or "2i" to the open side.
- Closed DE in a "7-technique" (outside shoulder of the TE, in his scheme). Open DE at 5, 7 or 9 by game plan.
- LBs "tan-zero-tan", meaning stacked over the tackles and the center.
- Fits vs Pro I, closed left: open DE → C; Will → B; Nose → A. Closed DE → D; Sam → C; 3-tech → B; Mike → A.

**TB99 Over (Kiffin), PDF p. 62** [D, page-verified]:

| Position | Align | Key | Run responsibility |
|---|---|---|---|
| Closed end | "STACK, HEAD UP" (on the TE) | TE | play to C, away C, chase. C.P. "stretch 5 yds, play inside out" |
| Under tackle | 3 tech | guard | B gap, squeeze A. C.P. "2 gap off guard iso" |
| Nose | 1 tech, open side | center | open A |
| Open end | 5 tech | tackle | C, squeeze B, chase |
| Sam | "STACK B" | backs | "align away from closed call" |
| Will | "TAN" (head-up on the tackle) | backs | "align to closed call" |
| Mike | "STRONG ZERO" | backs | depends on coverage |

- [D] TB99 Over Stem: closed end at a **9 tech**; the rest is the same.
- [D] TB99-DL p. 28: the "Stack End" is a **7 technique, inside shade of tight end**.
  - [I] This conflicts with the "head up" in the install table. The DL manual probably describes the stack end's detailed shade. Either way he is on the TE.
- **Disagreement on which LB is the closed-side backer in Over:**
  - TB99 puts the **Will** to the closed (TE) side at "Tan" and the Sam away. The p. 70 Over 2 diagram shows W over the closed tackle and S over the open tackle.
  - Bowen and most textbook versions put the **Sam** to the strength.
  - [I] This is naming, not geometry: one Tan backer goes on each side and the Mike is at 0. Code the geometry and let the label be scheme-specific.
- [D] TB99 Over 2 alignment chart (p. 70): Sam "Tan", Mike "0 Technique", Will "Tan".
- **LB depth: NOT SPECIFIED in TB99.** See §3.11 for depths from other books.

### 3.2 4-3 Under (nose to the closed side, 3-tech to the open side, Sam on the TE)

**TB99 Under, PDF p. 58** [D, page-verified]:

| Position | Align | Key | Run |
|---|---|---|---|
| Sam | "BACKER" on the TE (S drawn outside the closed end over the TE) | TE | D gap, "fold late" |
| Closed end | 5 tech | tackle | C, squeeze B, "chase on play away" |
| Nose | 1 tech (closed side of the center) | center | closed A |
| Under tackle | 3 tech (open side) | guard | B, squeeze A, "alert double team" |
| Open end | **LOOSE 5** | tackle | C, chase; "spill all plays to you except turn out. Man in C gap: align in 7." |
| Mike / Will | "BASE" | backs | by coverage |

- [D] TB99-DL p. 24: Loose 5 = "slightly cocked one yard outside tackle".
- [D] Bowen: "With the Nose (N) aligned to the closed side … the Sam 'backer (S) now walked up over the tight end, the '3 technique' … moves to the open side. … both the Mike (M) and Will (W) 'backers shift to the 'bubbles' (uncovered gaps) with the closed side defensive end (LE) kicking down inside over the right tackle." This is the "0 shade" nose.
- [D] BAL05 (3-4 personnel playing Under): "CLOSED END – 4 TECH; N – SHADE (CLOSED); OPEN END – 3 TECH". Closed end two-gaps.
- [D] Bowen 3-4 Under (Wade Phillips, Houston 2013):
  - Nose 0-shade to the closed side; closed DE 5 or 6; Sam 7 (outside TE); Mike → B.
  - Open DE at 3 (B) with the Jack to A, or bumped to 2 and two-gapping.
  - Will plays cutback/boot from a 6 on the open side.

### 3.3 Even / "4-3 Wide" / Wide 9

- [D] Wikipedia (4–3 defense): "In schemes whose base set is an even 4–3, there is no nose tackle." Tackles are on the guards.
- [D] MQ glossary: "Even Front: … two defensive tackles aligned over the guards and no nose tackle over the center." "Tuff Front: both Defensive Tackles … in 2-technique." "Wide Front: … defensive ends … in wide-9 techniques."
- [D] Bowen: Lions "Wide 9" = 3-tech closed, nose 2i open, LBs tan-zero-tan, ends in 9 "removed … adjusted their stance."
- [D] BAL05 nickel 4-man fronts:
  - "Strong against run": closed end 7, closed DT 3, open DT 1 (G), open end 5.
  - "For obvious pass situations": closed end **9**, DTs **3 or 4i**, open end **wide 5**.
- [D] Fangio, Eagles (BGN Part 1): on early downs the nickel 4-man front is "two 9 techniques, a 0/1 … and a 3 technique (9-3-Shade-9)".
- [D] CIN02 "Wide" family (OCR):
  - "Open reduction with Open Tackle in 3 technique, Nose in a Plus and the Closed End in a wide 5 technique. Elephant '7' Technique".
  - "Out tells End to align in a 9 tech."

### 3.4 Tite (4i-0-4i) and Mint

- [D] MQ glossary: "Tite Front: … 0-tech Nose and two 4i-technique defensive ends."
- [D] MQ (Even front/odd spacing): "The 'Tuff' or 'Tite' front is used to reduce a four-down front into a 3-4 alignment with 4i-techniques on both sides of the nose."
- [D] breakdownsports "Tite Front Defense":
  - The DEs are 4i and the nose 0.
  - Overhangs align "between the offensive EMOL and the closest receiver (known as an 'Apex' technique). They typically align 4-5 yards off the LOS."
  - It lists 4-man, 5-man and 6-man box variants, and says "Mint" is the 5-man box with an overhang walked down to make 6.
  - Nose techniques: lag versus push.
- **Mint definitions disagree:**
  - Strength set weak of the nickel: MQ glossary.
  - "4 man front disguised in 3 down": [S] search summary.
  - 4i-0-4i with "a Jack LB walked down on the edge or in a 3x3 split, creating a quasi-Under front": [S] search summary.
  - Saban's "Mint Package (Tite alignment package in Saban terms)" versus the "literal Tite Front (Aranda/Roberts)": [D] MQ teaser, body paywalled.
- [I] Codable reading of Mint: DL at 4i-0-4i (or 4i-0-3). A 4th rusher (Jack/edge) on the LOS away from the nickel. The 4th-rusher side follows the strength pointer "away from nickel".

### 3.5 Bear and 46

**Buddy Ryan 46 (PHI90 p. 5)** [D, page-verified]:

| Player | Alignment |
|---|---|
| Strong end | "HEAD UP WITH THE STRONG OFF. GUARD" |
| Nose tackle | "HEAD UP WITH THE CENTER" |
| Weak tackle | "HEAD UP WITH THE WEAK OFF. GUARD" |
| Weak end | "1 YARD OUTSIDE THE WEAK OFF. TACKLE" |
| Jack (left LB) | "INSIDE FOOT ON OUTSIDE FOOT OF TIGHT END, ON THE LINE OF SCRIMMAGE" |
| Charley (right LB) | "OUTSIDE FOOT ON INSIDE FOOT OF TIGHT END, ON LINE OF SCRIMMAGE" |
| Mike | "HEAD UP WITH STRONG OFF. TACKLE, 4 YARDS OFF THE LINE" |
| Strong corner | "7-8 YARDS OFF THE LINE" |
| Strong safety | "HEAD UP WITH THE WEAK OFF. TACKLE, 4 YARDS OFF" |
| Weak safety | "FROM CENTER TO WEAK TACKLE, 8-10 YARDS OFF" |
| Weak corner | "7-8 YARDS OFF" |

Other PHI90 variants on later pages (OCR):
- "46 Jayhawk": Charley head-up on the strong tackle at 4 yd; Mike head-up on the weak tackle at 4 yd; SS "line up on the back or 3rd wide receiver. Depth will vary".
- Another variant: "SAM: head up with the tight end on the LOS"; "STRONG SAFETY: 2 yards outside the tight end and 7 yards off".

**Disagreement:**
- PHI90 puts the 46 interior **head-up on the guards** (2-0-2).
- MQ glossary defines "Bear Front" as "0-tech Nose, two 3-tech Defensive Tackles" (3-0-3). Most modern writing uses 3-0-3.

**Modern NFL frequency/efficiency** (MQ "NFL Front Families", PFF 2025 run plays) [D]:
- Bear family runs: Base 426 attempts at 3.08 YPC; Sub 152 at 3.58 YPC. "Covering both guards and the center blocks natural vertical double-teams."

### 3.6 Okie / 3-4 (5-0-5 versus 4-0-4)

- **5-0-5** [D] Bowen BR 3-4: "The defensive ends (in a base 3-4) align in a '5-technique' with the nose tackle in a '0-technique'." Okie OLBs: Sam 7 (outside TE), Will 6 (open side), both on the ball. ILBs (Mike/Jack) over the guards ("bubbles").
- **4-0-4** [D] BAL05 "ODD": LE 4, N 0, RE 4, two-gap, "align slightly off the ball". "Nearly 100% on base downs vs base off. personnel."
- **4-0-4** [D] ATL03 (Phillips) "Sam & Will Tonto", p. 37:
  - strong end 4; nose 0; weak end 4;
  - Sam head-up on the TE "6"; Will "2 yds outside tackle on L.O.S. '8'";
  - Mike "head up on the guard 3½ yds off"; Mo "head up on the guard 4 yds off";
  - "VS. 1BACK 'SOLO' = NOSE SHADE STRONG (+A)".
- **Will Bullets** [D] ATL03 p. 43: strong end "outside eye of tackle to head up '5'"; nose 0; weak end "head up on tackle '5'" (sic); Sam "outside eye of TE to outside ½ of TE '9'"; Mike 3½ yd; Mo 4 yd; Will 2 yd outside the tackle on the LOS.
- [D] MQ glossary: "Okie Front: … 0-technique Nose Tackle and two 4i or 5-technique Defensive Ends."
- **Eagle (3-4)** [D] Bowen: ends in 4i (B gap), nose to the front side of flow, Sam two-gaps from a 6 on the TE, ILBs "A-gap to scrape", Will 6 on the open side.

### 3.7 Nickel fronts (Over/Under/Mint/Bub/Rush)

- Four-down nickel layouts: see BAL05 and Fangio in §3.3.
- [D] Bowen Cover 3: in nickel the "open-side linebacker (or nickel)" takes curl-flat.
- [D] Campbell 4-2-5 "31 / Over": "an automatic 6i technique towards the Tight End and an automatic 5 technique to the backside". Rover "3 yards outside the openside tackle"; Sam "3 yards outside the tight end". "Sam and Rover will always be responsible for getting aligned according to the number two receiver to their side."
- **NOT SPECIFIED** with numbers in accessible sources: a "Rush/Plus/Flex" nickel call book. The MQ glossary gives these names but no alignment numbers.
  - "Flex Front: both inside linebackers are walked up into the A-gaps."
  - "Mug: … linebacker … over the center in the A-gap."
  - "Boss Front: a five-down front, often created by walking up a linebacker."

### 3.8 Goal line, Bear, 5-2 and Pinch

- [D] CIN02 goal line, OCR:
  - "Strong End: Outside Eye Of Tackle. Take Goal Line 'Target' Charge Into 'C' Gap."
  - "Tackles: Goal Line Target Charge Into 'A' Gaps."
  - "'Tight' End: Inside Eye Of Guard. … Into The 'B' Gap."
  - "Crawl: Heavy '9' On 'Y'. Jam Him. Play 'D' Gap."
  - "Buck & Mack: Align With Ample Depth. You Must Scrape & Fill Down Hill."
- [D] CIN02 "Sneak": "Buck to align tight to the line of scrimmage, Mac aligns at heel depth of the defensive tackle."
- [D] NYG95: goal-line tackles in a four-point stance, "as close to L.O.S. as possible".
- [D] NE91 short yardage / goal line: "Mike – 2 pt. stance 4-5 yds. deep on Offensive Center". NE91 also lists stunt names "Gap Pinch – Half Out – Dbl. Out – Suicide – Crush".
- [D] MQ teaser, goal-line "6-1 'pinch' front": "an easy adjustment that keeps four defenders in the secondary". Details are paywalled.
- [S] Smart Football (Kiffin vs Florida), page 403, seen via search summary: on "first and short-yardage downs" Kiffin went to a 5-2 double eagle, with a nose, "two defensive linemen in 'three techniques' … two stand-up types in 'five techniques' … two linebackers".
- [D] Football Toolbox 5-2: a short-yardage front that adds size. "Most 5-2 teams will rush all 5 defensive linemen."

### 3.9 Field/boundary fronts

- [D] MQ glossary: "Bound Front", "Strength Front (passing strength or wide side)", "FIB (Formation Into Boundary): An alert".
- [D] BAL05: Eagle 2 "is designated to passing strength – can also go to Wide Field (FALCON)".
- [I] In the NFL the field side is only about 6 yd wider (§2.3), so the field is rarely the primary pointer. College staffs such as Saban's and Patterson's divorce front and coverage and set each side of the secondary independently.
  - [D] MQ, Gary Patterson: "the front six worked independently in alignment with the five DBs … each side of the secondary could 'match' the formation to their side."

### 3.10 Movements: slant, sink, pinch, stem, crawl

All [D]:
- MQ glossary:
  - "Slide / Slip: … shift their alignment one gap over."
  - "Crawl: … shift from a 3-down to a 4-down alignment (or vice-versa) after the offense is set."
  - "Stem: The D-line aligns in one front and shifts to another on a 'move' call."
  - "Ram/Lion: a defensive line slant to the right (Ram) or left (Lion)."
- TB99 LOS calls:
  - "Pirate: Will LB alerts the under tackle and open end to cheat down their alignments and run a quick pirate."
  - "Go: very high pass possibility. The closed end widens and the nose moves to a 'G' alignment."
  - "Omaha: call off any stunts and return to base."
- BAL05: "Flexibility / Disguise – slant to / stem to other fronts."
- CHI98: "Movement by defensive line before snap from one front to another to confuse blocking schemes." "TE MOVE – E shifts from one side to the other (C.P.: … as a slide call)."

### 3.11 LB depth and width, and how it changes by situation

| Source | Depth / width | Situation |
|---|---|---|
| ATL03 (3-4) [D] | Mike head-up on the guard 3½ yd; Mo head-up on the guard 4 yd; Will on the LOS 2 yd outside the tackle | Base |
| PHI90 46 [D] | Mike / SS / Charley at 4 yd | Base 46 |
| NYG91, NYG95 [D] | ILB "3½-4 yds. deep" (repeated in several fronts) | Base |
| CAR97 [D] | ILB "3-4½ YDS. DEEP" | Base |
| CIN02 [D] | ILB "4 to 4½ yards deep"; some calls "5 yards deep"; SS "2x6 yards deep cover TE" | Base / man |
| NE91 [D] | Mike "4-5 yds deep on offensive center" | Short yardage and goal line |
| CIN02 "Sneak" [D] | Buck tight to the LOS; Mac at the DT's heel depth | Short yardage |
| Bowen Cover 2 Green 2 [D] | Mike "pre-snap depth of 10 to 12 yards" | Prevent / 3rd-and-long |
| TB99 [D] | "Loose = corners play Cathy and LB's loosen up" (no number) | Passing downs |
| Tite overhang (breakdownsports) [D] | Apex between the EMOL and #2, 4–5 yd off the LOS | Spread |
| Campbell 4-2-5 [D] | Sam 3 yd outside the TE; Rover 3 yd outside the open-side tackle | HS 4-2-5 |
| NFL tracking, 2022 wk 1–9 [D, my computation; see §8] | ILB/MLB median 4.5 yd on early downs (p10–p90: 2.9–5.8). On 3rd & 7+ the median is 3.8 yd but the distribution is bimodal (p10 1.1, p90 7.0), reflecting mugs and deep droppers. | — |

---

## 4. Adjustments to offensive looks

### 4.1 Attached TE, flexed TE, wing and slot

- [D] CHI98: "Flex: Tight end open alignment more than 3 yards."
- [D] CIN02 receiver positions: "H WING – Off the line 1-3 yards from the End Man on the LOS"; "CRACK – 4 to 6 yards from the tackle"; "NORMAL – 1-3 yards on the line from the Tackle".
- [D] TB99 receiver alignments: "TITE 1-2 YDS", "INDIAN 3-5 YDS", "Z WING 1-2 YDS", "Slot man split 1-3 yards from tackle in slot formation".
- [D] TB99 Over 2 versus a wing or slot:
  - SS "C.P. Wing rule stack D x 7. Slot: Stack C x 7".
  - FS "Wing rule D x 7. X tight stack C x 7".
  - Weak corner "Wing rule 2 x L.O.S."
  - [I] Read this as: versus a wing, the safety drops to about 7 yd stacked over the D gap (C gap versus a tight slot). The corner versus a wing comes to about 2 yd outside, on the LOS.
- [D] TB99: "If Over Stem 2 is called versus any form of slot (aligned or motion to), Will LB gives DE a 'Buck' call; LB's now play base slot Over 2 rules." "Y motion (2 back) = check Pirate." "Weak corner – align 2x2 if Triples."
- [D] Football Toolbox (Glazier 4-3 talk): "This tight end adjustment eliminates one defensive bubble by bumping the anchor defender down and walking up the Sam linebacker outside the tight end."
- [S] X&O Labs survey, search snippet: versus a closed TE, "45 percent of coaches will use a 5-technique alignment with that player".
- [D] Bowen Cover 3: versus a slot formation, the closed-side corner "walks down" as the primary run-support defender and "the strong safety roll[s] down over the No. 2 receiver (slot receiver) to the open side".

### 4.2 The Sam/overhang versus #2: apex, walk-out, "on the TE"

- [D] Campbell: Sam and Rover align on #2 to their side.
- [D] Brophy, Cover 7: "If second receiver aligns (outside the box) the Will adjusts and walks out to split the difference."
- [D] sportstreatise (Saban): "Apex … the first underneath defender inside the cornerback … generally responsible for the #2 receiver."
- [D] MQ glossary: "Apex: A position … between two receivers, splitting the difference"; "Push Alert: … linebackers adjust their alignment wider"; "Screw: … outside linebacker aligns outside the #2 receiver."
- Depth:
  - Apex 4–5 yd [D, breakdownsports].
  - Gregg Williams Cover 3 SS "3x5 off the tight end" [D, Bowen "Welcome to the NFL … Playbook"]. [I] That is 3 yd outside and 5 yd deep.
  - CIN02 cover alignment: "4x4 Yards Vs. TE … Outside 4 Yards Vs. WR" [D, OCR, context partly garbled].

### 4.3 Trips checks: Solo, Mable, Stubbie, Poach, Trix and others

| Term | Definition(s) [D] | Source |
|---|---|---|
| **Mable** | "push the coverage strong and play man-on-man on the backside receiver" | MQ glossary |
| Mable | in Saban Cover 3 versus 3x1: "manning the single-receiver backside, and pushing the zone coverage to the passing numbers … ('mable' … the same thing as 'skate' in Cover 6)" | Brophy |
| Mable / Skate | "'Mable' means that the safety is dropping down to the passing strength … 'Skate' means the safety is dropping down away from the passing strength." | sportstreatise |
| **Skate** (conflict) | "A true 3-deep spot-drop zone coverage with no pattern matching" **and** separately "A coverage check against bunch formations" | MQ glossary |
| **Stubbie / Stump** | Corner "locks" #1 (MEG); 2-read (Cloud/Palms) on #2 and #3; Nickel, FS and Mike make a triangle | MQ "What is Stubbie" [S]; MQ glossary: STAR/Safety man-match #2 and #3; sportstreatise: "Stubbie is just Mod adapted to a 3-man surface" |
| **Solo** | Backside corner left one-on-one | MQ glossary (quarters) |
| Solo | "man coverage adjustment for 1-back sets where ILBs read the back, the OLB covers the TE" | MQ glossary (Aranda/Roberts tree) |
| Solo | a man-to-man coverage term; "VS 1BACK SOLO = NOSE SHADE STRONG"; "'SOLO' – 2 LB's have TE and back" | ATL03 |
| **Poach** | "a safety reads the quarterback's eyes to leave their assignment and intercept … deep crossing routes" | MQ glossary |
| **Seahawk** | "backside safety acts as a 'poach' or 'robber' player on the #3 receiver" | MQ glossary |
| **Trix** (Fangio) | "the safety away from the passing strength looks out for a crossing route from the Trips side"; it "leaves the cornerback one-on-one with the opposing X receiver (MEG)" | BGN Fangio 101 Part 2 |
| **Zeke** | an in/out bracket by the LBs versus trips. "OLB takes the first out route, ILB the second." | Brophy Cover 7; MQ glossary |
| **Cover 8 vs 3x1** | "often called against 3x1 sets", halves to the passing strength and quarters opposite (Fangio) | BGN |
| **Stick / Stump** (no-huddle quarters) | Stump: the corner mans #1, and #2/#3 are banjoed by the Nic, SS and Mike. Stick: #3 is manned, 3-on-2 on #1/#2 | Brophy no-huddle |

- [D] Brophy no-huddle: "The standard quarters answer to 3x1 was always to man the single-split and zone combo the 3-man side."
- [I] Codable implication: trips checks rarely move the front. They move the backside safety (poach/Trix/Mable rotation) and the apex/nickel width. The front keeps its run strength on the TE (NYJ97).

### 4.4 Bunch and stack

[D] MQ glossary:
- Box: "Defenders align in a 'box' pattern" versus bunch.
- Bingo: match "flat, vertical, vertical".
- Clipper, Traffic and Interstate.
- Tophat: versus stacks.
- Tango: 3-on-2 versus a stack.

NOT SPECIFIED numerically: alignment distances versus bunch. [I] The pattern across terms is two defenders stacked or leveraged at about 1 yd and about 5–7 yd over the bunch, with a third over the top.

### 4.5 Unbalanced line and "tackle over"

- [D] ESPN Bob Davie "Football 101: Unbalanced line": unbalanced looks "cause confusion … Many defenses align their personnel based on where the tight end is aligned … Putting a tackle over creates confusion". Against a 4-man surface the defense must "shift their entire front over or adjust with the secondary. If the defense adjusts with the secondary, the offense has an advantage with a big tight end blocking a smaller defensive back."
- [S] X&O Labs survey, search snippet: "most coaches (73 percent) adjust with the front seven, while nearly 22 percent adjust coverage rotation and only 6 percent pressure."
- [D] NYG84: "UNBALANCED LT. – MOVE LEFT – 'Roger' (Cover #2)", meaning the front shifts over and can stunt back.
- [D] BAL05 coaching note: "Review tougher looks – Empty, Unbalanced, Bunches."
- [I] Codable rule: count the blocking surface on each side of the center. Lineman count plus attached TEs gives the gap count. Re-run the front-strength rule with "surface size" replacing "TE location", then slide the front one gap toward the larger surface.

### 4.6 Empty

- [D] Campbell 4-2-5: "If we want to stay in Cover 1, [we] must walk out Will and then Rover must rock to the Free Hitter position."
- [D] Brophy no-huddle: "MASH" (Mike and Sam blitz) man-free on the 3-man side and banjo on the 2-man side. Alternatively, Tampa 2 with the nickel running the middle.
- [D] Bowen (Redskins, Gregg Williams): "if the offense comes out in an empty look … this zone blitz checks to a man pressure with the defensive tackle dropping to the inside hook (called a 'spade' check)."
- [D] MQ glossary:
  - "Razor: an adjustment to an empty formation where the MIKE linebacker becomes the 'Rat'."
  - "Mohawk: a coverage check against empty formations."
  - "YELLOW: … vs. Empty where the Rover covers the RB."
- [D] TB99 Over 2 diagrams include Empty (OCR, garbled). The Over 2 call is "play it" versus most motions.

### 4.7 Two-back sets (I, offset, split) and backfield keys for the front

- [D] NYJ97: "NEAR – 'A' BACK OFFSET TO TE; FAR – 'A' BACK OFFSET AWAY FROM TE; STRONG – 'B' BACK OFFSET TO TE, 'A' DEEP; WEAK – 'B' BACK OFFSET AWAY FROM TE." The backfield set "does not change strength".
- [D] CIN02: "Near Back – an offset back aligned to the Tight End in a one-back set; Far Back – … to the open side; At Home Back – … behind the center."
- [D] ATL03: "C.P. – (LB'S) ALERT BOSS AND BOW BY BACKFIELD SETS."
- [D] CIN02: "BOS – Backer Over Strong", "BOW – Backer Over Weak". These shift the ILBs by backfield set.
- [D] MQ glossary: "TOM / NOB: defensive line stunt calls based on the running back's alignment. 'TOM' (To Me) … 'NOB' (Not On Back)." "LAKE/RIVER … set the front, usually made to the TE or away from the RB."
- [D] MQ, "Sky Force vs Cloud Force: Defending the Trips Nub": "the key read is the running back's alignment, which dictates the defensive adjustment", and "the defensive end's technique changes depending on the defensive call". Detail is paywalled.
- [D] Football Toolbox (Glazier 4-3): "Against spread formations, strength calls target the B-back position to defend power-G concepts … Will linebacker keys the B-back from a 3×3 alignment."
- **Colts "Auto" (near back gives a 6-tech; dot/far back gives a 9): NOT FOUND.** No source I could access confirms this exact rule. Calling it [I]: it is consistent with the general pattern above, where end technique is tied to the back's side.
  - Do not confuse it with the MQ glossary's "Auto: an adjustment in Cover 3 against 2 open receivers weak, where the JACK linebacker becomes a rusher."

### 4.8 Heavy, tackle-over and box counts

- [D] Brophy no-huddle: "with only 5 offensive linemen and 1 back, the need for an 8-man front just isn't there (you can live in split-safety with a 7 man box). When you couple that arithmetic with no tight end, now you can control the box with just 6 defenders." Also: "you're going to account for those 6 offensive gaps with your linemen and linebackers."
- [D] Saban (quoted by Brophy): "sometimes you've got to be able to play middle-of-the-field coverage to get an extra guy in the box." Plus the 1994 Browns story: "we could not play 8-man fronts to stop the run because they would wear us out throwing it."
- [D] Bowen Cover 3: shows up "in early down-and-distance situations to create an eight-man front", walking the SS down as force.
- [D] PFF (Galina): a single-high look gives "an extra player in the box".
- [D] jonsvec "defending quarterback runs", seen via search: a defense "usually can add a seventh defender to the box to handle all the run gaps, but this is not the case against QB runs".
- [I] Codable gap-count rule: gaps = (OL + attached TEs + 1) + (1 if an offset/lead back can insert as a blocker or create a new gap) + (1 if the QB is a designed run threat).
  - The defense targets box = gaps for gap-sound play, with the rest spread across coverage.
  - It goes "+1" only by accepting single-high or a light coverage shell.
  - This is a synthesis. No single source states it as a formula.

---

## 5. Motion and shifts

### 5.1 Rules from playbooks

All [D]:
- **NYJ97:**
  - "ZAC – Z motion across the ball to a slot set. This changes strength." "SIN – slot motion in toward the ball. Does not change strength."
  - "Y motion across the ball. This changes strength." "Y motion in toward the ball. Does not change strength."
  - "WAC – W motion across the ball … change of strength. WIN … does not."
- **TB99:**
  - Motion across the ball changes strength (rules 4 and 5 in §2.2).
  - "Yukon will not change strength."
  - Over 2 versus Double/Peel, Trips/Fly, Slot motion, Detroit fly, Triples peel, Y open, Y motion, Yukon: "PLAY IT".
- **CIN02:**
  - "If motion across formation and no change of strength – Free Safety call 'Play It'. If shifting and no change of strength – Free Safety call 'Play It' … 'Stay Lou' or 'Roy'. If shifting and change of strength – Free Safety will make the appropriate check."
  - "STAY: … we have set our defense and motion will not change it."
  - "BUMP: … pass defenders on motion … slide one man over."
  - "LOCK: … all coverage defenders … stay on their man."
  - "COWBOY: formation alert for a shift or motion to an Oscar look."
- **CHI98:** "TE MOVE – E shifts from one side to the other (… slide call). After TE move, strong right." Glossary: "Term used to shift front and linebackers on tight end move."

### 5.2 Modern adjustment menu

All [D]:
- MQ glossary:
  - "Bump", "Spin: … safeties … exchange responsibilities on motion across the formation", "Rocket: safeties spin and take the #1 back on motion".
  - "Roll It: … linebacker … take a back or TE motioning to the split end side".
  - "Glue / Paste: … stick with their man".
  - "Skittles: a check for when the offense motions from a 3x1 to a 2x2".
- jonsvec "Defensive Reactions to Jet Motion" (Canadian football context, 3-down rules differ): options are **Track** (one defender follows "on the back hip"), **Rotate/Spin** (the FS adjusts down, the boundary half goes high), **Bump**, or "**DO NOTHING**". "It's beneficial to have your Jet adjustment match your Quads adjustment … though this is not always possible due to the late timing of the Jet."
- Brophy (Mable): "The motion won't change the 'coverage' … you're only dealing with how the receivers play out."

### 5.3 Timing: what can be adjusted before the snap

- [D] sportstreatise (Saban): "As the quarterback starts the snap count if under center or put his hands out for the ball while in shotgun, the safeties will rotate … the safeties will be about halfway into position by the time the ball is snapped. The purpose … is … denying the offense the time to audible."
- [D] BGN (Fangio): "the safeties rotate into single-high coverage when the quarterback runs the play fake and is not looking." Post-snap rotation is used against under-center play-action.
- [D] PFF (Galina, 2020): two-high looks spun down post-snap as a robber "just under 13% of the time".
- [D] Bowen: Cover 3 "Buzz" safeties drop from a two-high look "with … depth based on the down and distance"; "Don't show too early" (BAL05, repeated on every pressure page).
- [S] Coaching-forum post: "rotates AT the snap and only based on the QB / Ball read, NOT based on motion". Anecdotal.
- Rules context [D, NFL 2026 rulebook index]: illegal shift 7-4-7; illegal motion 7-4-8; "disconcerting acts or signals" 12-3-1(i).
  - [I, from rulebook knowledge, not fetched text] After a shift, offensive players must be set for one full second. Only one player may be in motion at the snap, and not toward the LOS. The defense has no set requirement.
- [I] Codable timing model:
  - A strength or front reset requires perception of the motion plus a communication delay, measured from the motion start.
  - Fast jet motion, around 1 s, can only be answered by individual rules (track, bump or spin by a pre-assigned defender), not by a new front call.
  - A slow shift with a set gives time for a full re-call ("Play it", "Stay", or a new strength).
  - Safeties can rotate in the final ~0.5–1 s, keyed to cadence or hands-out, not to motion.

---

## 6. Secondary alignment versus formation

### 6.1 Field landmarks (needed to code depth and width)

| Measurement | Value | Source |
|---|---|---|
| NFL numbers | Bottom 12 yd from the sideline, 2 yd tall, so the top is at 14 yd | [D] NFL field spec via search (Wikipedia / NFL field PDF); TB99: "Boundary to outside edge of numbers – 12 yards … inside edge – 14 yards"; "Boundary to hash – 23 yards 1'9"" |
| College numbers | Top 9 yd from the sideline | [D] via search summary of the NCAA rule. The landmark "top of numbers" therefore differs by about 5 yd between NFL and college. |
| Hash marks | NFL 70 ft 9 in; college 60 ft | [D] Wikipedia via search |

### 6.2 Coverage alignment numbers from sources

| Coverage | Corner | Safety | Underneath | Source |
|---|---|---|---|---|
| Tampa/Cover 2 (TB99 Over 2) | "4 yds from L.O.S., outside eye on #1"; funnel #1 inside; "hold off the fade 18-20 yards deep" | SS "2 x 12 off TE"; FS "2 x 12 off weak OT"; deep-half POA "22 yds deep 2 yds inside top edge of numbers" | Mike 0-tech, Sam/Will "Tan" | [D] TB99 p. 70 |
| Tampa 2 (Bowen) | press and jam to force an inside release, then sink at 45° | "align at a depth of 15 yards and work to 18 yards at the snap with the top of the numbers as their zone landmark" | seam-hook "10 to 12 yards between the numbers and hash"; Mike runs the seam | [D] Bowen Cover 2 |
| Green 2 / prevent | jam/re-route | "align at 18 yards" | Mike pre-snap 10–12 yd | [D] Bowen prevent |
| Cover 3 | "align off at a depth of seven to eight yards or use a 'press-bail'" (Seattle press with an outside shade) | FS deep middle; often rolled from 2-high | curl-flat "10-12 yards to the top of the numbers"; hook "10-12 yards outside of the hash" | [D] Bowen Cover 3 |
| Cover 3 (Saban) | line of demarcation "one-yard inside the top of the numbers": #1 outside the line → inside leverage, inside it → outside leverage | FS area "6 yards outside the hashmarks to each side … about 15 yards deep" | hook zone "10 yards from the line of scrimmage and 2 yards inside the hash marks" (Ansley) | [D] sportstreatise; USA Football (Ansley) |
| Cover 1 (man-free) | "outside shade (outside eye of the receiver) and 'funnel'" | FS splits the formation, to "bottom of the numbers" vs a 9 route | — | [D] Bowen man pressure |
| Cover 0 | "inside shade (inside eye of the receiver)" | none | — | [D] Bowen man pressure |
| Cover 1 Dog (ATL03) | "HEAD UP BUMP" | FS "10-12 yds deep outside weak (OG)/(OT) gap" | — | [D] ATL03 p. 54 |
| Quarters (CIN02) | 3-10-30 technique when off; press and run-off at times | "Safeties at depth of 12 yards", align on #2 | — | [D] CIN02 (OCR) |
| Giants (NYG95) | corners 5–7 yd and 7–10 yd (by technique); deep third aim "3 yds. inside numbers – 17 yds. deep" | 10–12 yd; "Slide to center of field 15-18 yds deep" | — | [D] NYG95 (OCR) |
| 46 (PHI90) | 7–8 yd | WS 8–10 yd between the center and weak tackle | — | [D] PHI90 |
| Cover 2 deep half (NYG91) | — | "Ball on near hash – drive for 2 yds outside numbers, 12 yds deep" | — | [D] NYG91 (OCR) |
| Zone definitions | flat 1–7 yd; hook 9–15 yd; curl 8–15 yd; deep thirds from 16 yd | — | — | [D] TB99; CIN02 (hole/hook/curl "8 to 16 yards deep") |
| Squat (disguise) | "4 yards from receiver, nose to outside shoulder. Used to disguise zone coverages." | — | — | [D] TB99 terminology |

**Disagreement on 2-high safety pre-snap depth:**
- TB99 (1999 Bucs): 12 yd, 2 yd outside the TE or weak OT.
- Bowen (2010s NFL): 15 yd, working to 18.
- CIN02 quarters: 12 yd.
- [I] Depth varies by era, coverage, down and distance (§7), and by individual speed. Model it as a parameter whose cost/benefit (reaction distance versus run-fit time) emerges from physics. Do not hard-code one value.

### 6.3 Nickel, field/boundary corner, cloud/sky

- Nickel side:
  - [D] Fangio: always to passing strength.
  - [D] Saban: Star to passing strength, rotation away.
  - [D] MQ glossary: "Park: … the Star (Nickel) aligns away from the passing strength". This is a deliberate exception check.
- Force names:
  - [D] NYJ97: "SLAM – safety force; CLOUD – corner force; BACKER – linebacker force; EASY – defensive end force (openside); STUD – defensive end force (tight end); CLEO – inside corner force (slot)."
  - [D] CIN02: "RAY/LEX: Cloud rotation right/left; RALPH/LARRY: … Safety playing Hook–Curl (Backer Force)".
  - [D] MQ glossary (Muschamp): "READ FORCE: Force assignment (Backer, Sky, or Cloud) is determined by the release of the tight end."
- Trips-nub: [D] MQ: Sky Force (safety fills) versus Cloud Force (corner force); the RB's alignment dictates which.

### 6.4 Disguise and rotation

- [D] Brophy Cover 7: "Because the defense is presenting a 2-high shell, you could be playing a Cover 2, 4, 7, or 8 concept." Brophy no-huddle: "The secondary aligns in the same 2-high look for every snap, with corners inside #1, cocked inside facing the ball."
- [D] BGN Fangio: two-high pre-snap "allow[s] you to get into various coverages post-snap while keeping the pre-snap look identical", and "it is harder [to rotate from single-high] because the safety has to run backward."
- [D] Bowen Cover 3 Buzz: "Defenses will show a two-deep shell or quarters look … and drop the safety with his depth based on the down and distance … In 3rd and 2-6 … tighten … in longer down-and-distance … sit deeper (near the sticks)."
- [D] Brophy no-huddle: "Despite leading the innovation for a decade, Saban rarely uses [Rip/Liz] … I was only able to locate a handful … Because he (like most defenses of today) remain[s] 2-high every snap."
- Timing: see §5.3.

---

## 7. Down-and-distance and situational rules

### 7.1 Third and long and passing downs

- [D] BAL05: "FOR OBVIOUS PASS SITUATIONS … CLOSED END – 9 TECH, LT – 3 or 4i, RT – 3 OR 4i, OPEN END – WIDE 5", "primarily used to execute pass rush games".
- [D] TB99: "GO" call (Mike at the LOS, "very high pass possibility"): "closed end widens and the nose moves to a 'G' alignment". "GREEN" (huddle): "high pass possibility and they can execute pass games."
- [D] TB99 objectives: "Win 1st down run (3 yards or less): force 2nd & long so you can get into your Go's and Greens for rush and your 7 man fronts."
- Double-A mugs:
  - [D] USA Football (double mug): LBs walked into both A gaps. "If offenses chose option one [fan + RB on an A-gap LB] …"; "'peel' adjustment for defensive ends is a necessary tactic"; "'Double Gum' front … puts the interior tackles in the A gap and the linebackers in the B gap."
  - [D] Coach Kou: "The NFL will take one of the mug linebackers with the running back. They call it half man protection."
  - [S] Yahoo/USA Football: "popularized in the NFL by … Mike Zimmer".
  - The term **"Sugar"** for a double-A mug: **NOT FOUND** in any source I read.
- [D] Bowen prevent: Green 2 safeties at 18 yd, Mike 10–12 yd, corners jam. Gregg Williams "Tent Anchor": the nickel drops to the deep middle and the safeties widen "off the numbers to 'top' No. 1".

### 7.2 Short yardage and goal line

- See §3.8 for the CIN02 goal line, NYG95, NE91 and the 5-2 double eagle.
- [D] Bowen Cover 2: "Once the ball moves into the deep red zone (plus-15-yard line), Tampa 2 turns into Red 2." Corners play "soft squat".
- [D] NYG95: "GOAL LINE MAN COVERAGE … STRONG CORNER 3 yds. off LOS, outside shade."
- [D] ATL03: "SHORT YARDAGE STACK ZONE … USED VS. 22, 13 PERSONNEL."
- [D] Bob Davie (ESPN): substitution is either matched to offensive personnel "or by down and distance. When it's second or third and long, you commit to your nickel or dime defense regardless of the offense's personnel."

### 7.3 Two-minute

- [D] Bowen prevent: "NFL defensive coordinators are going to play their core schemes, adjust the depth/alignment of the back seven"; "two-deep zone shows up on the tape across the league in prevent situations"; 2-Man "in the trash" for prevent.
- [D] CIN02 lists situational calls. "The last two minutes of the half or game and we are protecting the lead" is a named situation.
- [S] MQ "Defending the Two-Minute Drill: Split-Field Coverage & Stunts" is paywalled.

---

## 8. Quantitative findings

### 8.1 Published

| Finding | Value | Source |
|---|---|---|
| Base vs nickel usage | Base "dropped in the last five years from ~27% to 21.2%"; five-DB use was 55.5% in 2019 and "~67% (PFF)" now | [D] MQ "Golden Age of the Nickel" |
| | Base ~21% in 2023 and ~23% in 2024; late 2025 nickel "falling toward 60%", base "about 27%" | [D] MQ Chargers |
| | Lions 44% base in 2024; Rams 36% | [D] MQ Lions |
| Front families on runs (PFF charting, 2025) | Even-Over: 2,749 base + 4,833 sub run attempts (3.65 / 4.52 YPC). Under: 2,459 + 1,793 (3.97 / 4.43). Bear: 426 + 152 (3.08 / 3.58). [I] So Over/Even is about 61% of charted runs, Under about 34%, Bear about 5%. | [D] MQ "NFL Front Families" |
| Middle-of-field-closed rate, early downs (PFF) | 57.6% (2019), 53.9% (2018), 48.6% (2020). 2020 Rams 11% pre-snap MOFC; 2015 Seahawks 75%. 2-high spun to a robber post-snap just under 13% (2020). | [D] PFF Galina |
| Pre-snap two-high (SIS) | 2020: Rams and Broncos above 75%; no other team above 60%. 2021: 17 teams at 50% or more pre-snap two-high, but "zero" teams played two-high *coverage* more than 50%. Top post-snap two-deep rate 45%. | [D] Sharp Football (SIS data) |
| Light boxes (SIS) | 2020 Rams light box (6 or fewer) on 78% of snaps, Broncos 77% | [D] Sharp |
| Coverage usage (TruMedia/PFF, 2021) | Cover 3 34.5%, Cover 1 22.5% | [D] Sharp |
| Unbalanced response (coach survey) | front 73%, coverage 22%, pressure 6% | [S] X&O Labs |
| TCU split-field rate | 60% of snaps (2021); Texas 42% → 58% | [D] MQ Patterson |
| NGS stacked box (8+ in box), attempt-weighted over qualifying rushers' season lines | 2016 25.7%; 2017 31.1%; 2018 22.4%; 2019 21.2%; 2020 21.8%; 2021 23.3%; 2022 22.6%; 2023 19.5%; 2024 20.5%; 2025 25.3% | [D, my computation] from nflverse `ngs_rushing.csv.gz` (https://github.com/nflverse/nflverse-data/releases/tag/nextgen_stats), week=0, REG. Qualifying rushers only, about 9k attempts per season. NGS does not publish its box geometry. |
| Wide-9 rate, mug rate, Over/Under/Tite share by down | **NOT FOUND** in published sources | — |

### 8.2 Computed from the 2022 NFL tracking snap extract (BDB 2025, weeks 1–9)

How these were measured:
- **Input:** the existing snap-frame extract `/home/user/def-alignment/out/align/nfl-snap.csv.gz`, 15,936 plays. Here `x` is depth from the LOS (defense positive) and `y` is the lateral field coordinate. PFF positions come from BDB.
- **Status:** these are my computations, not published findings.
- **Scripts:**
  - `/tmp/claude-0/-home-user-football-simulation-/d0ae8a37-3e6f-5e8e-a0fb-1246395fd6b3/scratchpad/tools/snapbox.py`
  - `/tmp/claude-0/-home-user-football-simulation-/d0ae8a37-3e6f-5e8e-a0fb-1246395fd6b3/scratchpad/tools/snapshell.py`
  - `/tmp/claude-0/-home-user-football-simulation-/d0ae8a37-3e6f-5e8e-a0fb-1246395fd6b3/scratchpad/tools/snapedge.py`
- **Caution:** the operator definitions are mine. Box counts in particular change by a factor of about 3 between plausible definitions. Use identical operators on sim output before comparing.

**Box count at the snap.** Definition A: depth 0–7 yd and laterally within ±2 yd of the outermost OL or attached TE. Definition B: depth 0–8 yd and ±4 yd.

| Situation | Runs, A: mean / 8+% | Runs, B: mean / 8+% | Passes, A: mean | Passes, B: mean |
|---|---|---|---|---|
| 1st down | 6.25 / 13.9% | 7.57 / 50.5% | 5.33 | 6.82 |
| 2nd & <7 | 6.33 / 15.9% | 7.63 / 51.9% | 5.33 | 6.94 |
| 2nd & 7+ | 5.89 / 11.4% | 7.26 / 40.6% | 4.90 | 6.52 |
| 3rd & 1–2 | 6.89 / 35.8% | 8.28 / 74.5% | 5.52 | 7.19 |
| 3rd & 7+ | 5.11 / 6.6% | 6.76 / 26.4% | 4.12 | 6.01 |
| 4th | 7.50 / 46.9% | 8.88 / 87.5% | 4.88 | 6.78 |

[I] NGS's 22.6% stacked-box rate for 2022 falls between A and B. Report the operator with any box number.

**Pre-snap shell at the snap.** "2-high" means the two deepest defenders are both at least 9 yd deep and at least 10 yd apart laterally. "1-high" means the deepest is at least 9 yd and the 2-high condition is not met.

| Situation | 2-high | 1-high | Nobody at 9 yd or deeper |
|---|---|---|---|
| 1st | 40.3% | 53.5% | 6.2% |
| 2nd & <7 | 35.3% | 51.0% | 13.7% |
| 2nd & 7+ | 50.6% | 46.3% | 3.1% |
| 3rd & 1–2 | 10.4% | 66.9% | 22.8% |
| 3rd & 3–6 | 32.0% | 56.8% | 11.2% |
| 3rd & 7+ | 61.3% | 35.4% | 3.3% |
| 4th | 23.7% | 46.2% | 30.1% |

Shell at the snap versus the PFF post-snap coverage family:
- 2-high looks became 1-high coverage in 35.4% of plays and stayed 2-high in 61.0%.
- 1-high looks became 2-high coverage in 17.3%.
- [I] This is consistent with the SIS finding that pre-snap shells over-state 2-high coverage.
- Note that snap-frame positions already include rotation started during the cadence (§5.3).

PFF post-snap coverage family by down (BDB 2025 `plays.csv`, 16,124 plays):

| Situation | 1-high (C1/C3 variants) | 2-high (C2/C4/C6/2-Man) | Cover 0 |
|---|---|---|---|
| 1st | 58.2% | 34.9% | 2.5% |
| 2nd & 7+ | 52.4% | 41.9% | — |
| 3rd & 1–2 | 65.7% | 14.8% | 11.2% |
| 3rd & 7+ | 52.0% | 39.5% | — |
| 4th | 51.3% | 20.6% | 16.1% |

**Edge width.** This is the lateral offset beyond the end man on the line (OL or attached TE) of the outermost DE, DT, NT or OLB within 2 yd of the LOS, measured player center to player center.

| Situation | Median offset | p75 | p90 | Share at 2.5 yd or more |
|---|---|---|---|---|
| Early downs | 1.8 yd | 2.4 | 2.8 | 20% |
| 3rd & 7+ | 2.4 yd | 2.8 | 3.2 | 43% |
| Short yardage (1–2 to go) | 1.4 yd | — | — | 15% |

[I] A crude wide-alignment proxy. Ends widen on passing downs, as BAL05 and TB99 prescribe.

**Other measurements:**
- **Mugged A gap.** This counts non-DL defenders within 2 yd of the LOS and laterally between the guards: at least one on 2.0% of early-down plays and 17.2% of 3rd & 7+; at least two on 0.5% and 5.4%.
- **CB depth at the snap (median).** 5.1 yd on early downs (p25 2.5, p75 7.3). 5.8 yd on 3rd & 7+ (p75 8.2, p90 9.8). 3.0 yd in short yardage.

---

## 9. Codable rule skeleton

This whole section is [I]: my synthesis of the sources above, for engine design. Nothing here is a source statement.

1. **Pointers, set at line-up from observed (delayed) information:**
   - `runStrength`: attached-TE side. Two TEs: game-plan TE (Bowen) or stud TE (TB99). No TE: the back side or the declared side (NYJ97 "must be declared"; TB99 "wide side then left"; Campbell "defense's left").
   - `passStrength`: receiver-count side. Trips side; otherwise the two-receiver side (TB99, NYJ97, CHI98). Ties go to a declared tiebreak: field, then TE, then left.
   - `fieldSide` (hash); `backSide` (offset RB: near or far relative to the TE; dot/home); `nickelSide` (= `passStrength` by default, per Fangio and Saban; "Park" flips it); `surfaceSide` (blocking-surface count, for unbalanced lines).
2. **Front = a named template** of (blocker reference, shade offset, depth) per defender, plus a strength pointer.
   - Over/Fight → `runStrength`; Mint/Bub → away from `nickelSide`; Bench → away from `passStrength`; Bound → boundary; Strength → `passStrength` or field.
   - Store the technique label separately, because 7-tech definitions conflict (§1.2).
3. **Box sizing:** the target box defenders equal the gap count from §4.8. Shell choice (2-high vs 1-high) trades a box defender for a deep defender.
4. **Overhang/apex placement:** on #2, split the difference between the EMOL and #2 at about 4–5 yd depth. Walk out to cover position when #2 is wide or the call is man. "Push" widens.
5. **Trips/empty:** keep the front on `runStrength`. Move the backside safety (Trix, Poach, Mable), the backside corner (Solo/MEG) and the apex players.
6. **Motion:**
   - Motion across the ball changes `passStrength`, and possibly `runStrength` if the TE crosses.
   - Motion in does not (NYJ97).
   - Responses are Play It, Bump, Lock/Track, Spin/Rocket or Stay.
   - Re-call fronts only on a shift with a set, given perception plus communication delay.
7. **Rotation timing:** safeties start rotating at QB cadence or hands-out and are about halfway there at the snap (Saban). Optionally they rotate post-snap on under-center play-action (Fangio).
8. **Situational modifiers:**
   - 3rd & 7+: ends widen (9 / wide 5), a mug option, the shell deepens, the 2-high share rises.
   - 3rd & short and goal line: DL crowd the ball (four-point possible), LBs tighten (Mac at DT heel depth), box +1 or +2, Cover 0/1 share rises.
   - Prevent: safeties at 18 yd, Mike at 10–12 yd.

---

## 10. What the sources do not specify (gaps)

- A numeric DL depth off the ball in NFL books beyond "tight as possible" and "slightly off". Coaching forums give 6–18 in for a reading 0-tech (weak evidence).
- An exact wide-9 width. Estimates from journalism range from "~a yard outside the tackle" to "three feet wider than usual". There is no playbook number.
- A Colts "Auto" near/far-back end rule: not located.
- "Sugar" as a double-A term: not located.
- Published league rates for wide-9, Tite or mug fronts by down: not located. §8.2 gives operator-defined proxies from tracking.
- The NGS box geometry definition: not published. NGS publishes only the "8+ defenders" rate.
- Numeric bunch alignments: not located (terms only).
- Full MatchQuarters bodies (Stubbie, Poach, Mint vs Tite, Trips Nub, Unbalanced Counter, Two-Minute): paywalled. Only teasers and the glossary were read.
- Saban's 2008 Alabama playbook (empty checks and more), the LSU and Michigan State playbooks: links point to Google Drive (sign-in required) or Scribd (blocked).

## 11. Source list (URLs)

**Primary playbooks (Internet Archive):**
- https://archive.org/details/historic-tampa-bay-buccaneers-playbooks
- https://archive.org/details/historic-new-york-jets-playbooks
- https://archive.org/details/historic-atlanta-falcons-playbooks
- https://archive.org/details/historic-philadelphia-eagles-playbooks
- https://archive.org/details/historic-baltimore-ravens-playbooks
- https://archive.org/details/historic-cincinnati-bengals-playbooks
- https://archive.org/details/historic-chicago-bears-playbooks
- https://archive.org/details/1984-ny-giants-34
- https://archive.org/details/historic-carolina-panthers-playbooks
- https://archive.org/details/historic-new-england-patriots-playbooks
- https://archive.org/details/historic-san-francisco-49ers-playbooks

**Matt Bowen (Bleacher Report, NFL 101):**
- 4-3: https://bleacherreport.com/articles/1999358-nfl-101-the-basics-of-the-4-3-defensive-front
- 3-4: https://bleacherreport.com/articles/2007958-nfl-101-the-basics-of-the-3-4-defensive-front
- Cover 3: https://bleacherreport.com/articles/2047445-nfl-101-introducing-the-basics-of-cover-3
- Cover 2: https://bleacherreport.com/articles/2039934-nfl-101-introducing-the-basics-of-cover-2
- Man pressure: https://bleacherreport.com/articles/2140586-nfl-101-breaking-down-the-basics-of-man-pressure
- Prevent: https://bleacherreport.com/articles/2499421-nfl-101-introducing-the-basics-of-prevent-defenses
- Playbook install: https://bleacherreport.com/articles/2076186-welcome-to-the-nflheres-your-first-playbook

**Cody Alexander / MatchQuarters:**
- Glossary: https://www.matchquarters.com/p/comprehensive-defensive-football-glossary
- Front families: https://www.matchquarters.com/p/front-families-nfl-run-defense-data-mechanics
- Even front, odd spacing: https://www.matchquarters.com/p/even-front-odd-spacing-nfl-defense-walk-solid
- Golden age of the nickel: https://www.matchquarters.com/p/golden-age-of-the-nickel-defense-titans-mccreary
- Chargers / Minter: https://www.matchquarters.com/p/chargers-run-defense-small-ball-jesse-minter
- Lions 2024: https://www.matchquarters.com/p/tdetroit-lions-2024-defense-scheme-hybrid-players-glenn-sheppard
- Gary Patterson trips checks: https://www.matchquarters.com/p/gary-patterson-usc-defense-trips-checks-special-solo
- Trips nub, Sky vs Cloud: https://www.matchquarters.com/p/how-to-defend-trips-nub-set-sky-vs-cloud-force
- Stubbie (paywalled): https://www.matchquarters.com/p/what-is-stubbie-coverage-special-mini-lock-x-trips-coverages
- Mint vs Tite (paywalled): https://www.matchquarters.com/p/mint-package-vs-tite-front-saban-aranda-roberts
- 6-1 Pinch goal line (paywalled): https://www.matchquarters.com/p/goal-line-defense-6-1-pinch-front

**Brophy (Get Back To Fundamentals):**
- Rip/Liz: https://brophyfootball.blogspot.com/2010/08/nick-saban-cover-3-adaptation-ripliz-to.html
- Mable/Skate: https://brophyfootball.blogspot.com/2010/08/nick-saban-cover-3-adaptation.html
- Cover 7: https://brophyfootball.blogspot.com/2010/10/nick-saban-split-safety-coverage-cover-7.html
- No-huddle check-with-me: https://brophyfootball.blogspot.com/2012/07/no-huddle-check-with-me-defense.html

**Saban tree:**
- Ansley clinic (USA Football): https://blogs.usafootball.com/blog/5615/how-to-understand-nick-saban-s-pattern-match-cover-3-defense
- Saban pass coverages: https://sportstreatise.com/2021/01/saban-pass-coverages/

**Fangio:**
- Defense 101 Part 1: https://www.bleedinggreennation.com/2024/8/8/24211112/vic-fangio-defense-101-basics-every-eagles-fan-should-know-philadelphia-scheme-defensive-coordinator
- Defense 101 Part 2: https://www.bleedinggreennation.com/2024/8/15/24211869/vic-fangio-defense-101-part-2-mfo-coverages-eagles-defensive-coordinator-scheme-nfl

**Tite front:**
- http://breakdownsports.blogspot.com/2019/05/football-fundamentals-tite-front-defense.html

**Football Toolbox:**
- 4-2-5: https://footballtoolbox.net/defense/understanding-the-4-2-5-defense
- 4-2-5 PDF: https://footballtoolbox.net/wp-content/uploads/2017/11/getting-Lined-up-right-using-a-4.2.5-Aproach.pdf
- 3-4 huddle procedures: https://footballtoolbox.net/3-4-defense-huddle-procedures
- 4-3 alignments (Glazier): https://footballtoolbox.net/defense/stop-getting-torched-4-3-defense-alignments-that-actually-work
- 5-2: https://footballtoolbox.net/5-2-defense

**Mug pressure:**
- https://blogs.usafootball.com/blog/6893/using-double-mug-pressure-to-create-strategic-advantages
- https://coachkoufootball.substack.com/p/3rd-down-defense-4-2-double-mug-pressures

**Motion:**
- https://jonsvec.substack.com/p/defensive-reactions-to-jet-motion

**Unbalanced line (Bob Davie, ESPN):**
- https://assets.espn.go.com/ncf/columns/davie/1463998.html

**PFF:**
- Galina two-high: https://www.pff.com/news/nfl-galina-why-two-high-defenses-are-set-to-take-over-the-nfl
- Monson techniques: https://www.pff.com/news/defensive-line-techniques-the-prototypes

**Sharp Football (SIS data):**
- https://www.sharpfootballanalysis.com/analysis/two-high-shell-staley-fangio-nfl-defense-2021/
- https://www.sharpfootballanalysis.com/analysis/2022-nfl-draft-safety-value-versatility-hamilton-cine-brisker/

**Technique numbering and wide 9:**
- https://en.wikipedia.org/wiki/Gap_(American_football)
- https://lancereisland.substack.com/p/defensive-line-techniques-and-gap
- https://www.thephinsider.com/2016/4/16/11443574/football-101-understanding-the-wide-nine-technique
- https://www.nfl.com/news/philadelphia-eagles-ditching-wide-nine-d-line-scheme-0ap1000000106622

**Field and rules:**
- https://en.wikipedia.org/wiki/American_football_field
- https://operations.nfl.com/rules-officiating/2026-nfl-rulebook

**NGS data:**
- https://github.com/nflverse/nflverse-data/releases/tag/nextgen_stats

**Seen only via search summary (fetch blocked):**
- X&O Labs: https://www.xandolabs.com/the-lab/defense/front/odd-front-structures/defending-heavy-personnel-concepts-from-3-4-spacing-case-2-defending-concepts-from-unbalanced-1-and-2-back-formations/ and https://www.xandolabs.com/?p=14079
- Smart Football: https://smartfootball.com/defense/monte-kiffins-scheme-for-urban-meyers-offense
- phillymag wide 9: https://www.phillymag.com/birds247/2016/01/25/all-22-jim-schwartz-philadelphia-eagles-new-defense/
