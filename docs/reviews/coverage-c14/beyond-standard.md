# What the coverage engine carries beyond the taught standard

This was diagnosis only. I changed no repo files; the only file I wrote was a share estimate in the scratchpad.

**Correction to the premise.** The cards' "No source found" list (rules-cards-v2.md:63-72) only covers public coaching pages. All eight variants do have a source: the user-supplied HonestNFL sheets in the repo (`docs/references/honest-nfl/`):
- HNFL-203 "Cover 9 adjustments: Strap (any x1), Clue (#1 stacked/bunched), Grab (3x2 empty)";
- HNFL-073 "Cover 6 Stuff and Stuff/Area";
- HNFL-050 "Book";
- HNFL-068 "Cover 2 Wild";
- HNFL-074/075 "ROLEX = Pounder strong and Fist weak".

So they are one NFL staff's checks, which makes them scheme options rather than our inventions. One card error: cover9_strap × CB_W (card line 1249) says "man on X". The engine and HNFL-203 instead treat Strap as a #2/#3 distribution with the X corner still in a third. The card's reasoning is wrong there; the code is not.

**How I estimated the shares.** These are base call shares from the VARIANTS and famW weights at 1st-and-10 with matchRate 0.6, before formation checks. Each check variant then fires only on the matching structure.

## 1. Variants

| item | what it does / how often | taught? | verdict | removal arm (what it falls back to) |
|---|---|---|---|---|
| cover6_area (coverages.ts:534) | Cover 6 vs `close_23` (trips with #2 and #3 tight). Triangle pickups `area_flat`/`area_hook` plus a `topper` safety. Cover 6 is 4.4% of calls league-wide (8.2% in two-high trees), plus Zeus→W1. | Cards: none (602, low). HNFL-073/052/195. | **defer** | Drop the `close_23` check. It falls to the `trips` check (cover6_book), or to base cover6 if Book is also off. |
| cover6_book (545) | Cover 6 vs trips: Stubbie rules on the trips side, cloud and half on X. Same parent call share as Area. Carries MUSH_TRAP. | Cards: none (615). The card names the nearest sourced form as Stubbie to trips with a half on the single side (Kou "Utah variation"). cover6 × CB_W r10a says "Cover 6 to 3x1 is common". HNFL-050. | **defer** | Base cover6 (cover6 has no `checks`), which is the card's standard. |
| cover9_strap (343) | Cover 9 vs `trips`: `three_rec_hook` plus `bonus_hook`. Cover 9 is 4.3% of calls league-wide, 18% in two-high trees, ~1% elsewhere. | Cards: none (1247; the card's rule is wrong, see above). HNFL-203/056. | **defer** | Base cover9 (no 3x1 check). The card's standard trips rule is cover3_trips-style (cover3 × LB_S r10a). |
| cover9_clue (349) | Cover 9 vs `bunch_strong` or `stack_strong`: Clue 1/3 corner, spot seats on the bunch side. | Cards: none (1259, low). HNFL-203/337. | **defer** | Base cover9. Note there is no bunch fallback at all for Cover 9. |
| cover9_grab (355) | Cover 9 vs `empty_3x2`: the rotator becomes the #3 hook (Buzz). | Cards: none (1261, low). HNFL-203/054/063. | **defer** | Base cover9. |
| cover3_clue (279) | cover3_match vs `bunch_strong`. cover3_match is 9.4% of calls league-wide (14.5% single-high, 1% two-high). | Cards: none (1070-1095, all low). HNFL-203/204/337. | **defer** | Falls to the distribution check: bunch 3x1 → cover3_mable (sourced, Saban), otherwise cover3_match. |
| cover2_wild (385) | cover2_match vs trips: the Mike becomes a `vertical_hook` on #3. cover2_match is 6.7% league-wide (11% Tampa, 9% two-high). | Cards: none (1426, low). HNFL-068 has "Vertical hook" and "Carry #3" vs 3x1. | **defer** | Base cover2_match. The card's standard is cover2 × SS r10a "Trips: widen" and LB_S r10a "Sam moves out". |
| rolex (228) | Pounder strong, Fist weak. 0.1-0.2% of calls (VARIANTS 0.3 in two-high trees, 0.1 elsewhere), plus `rolex_banjo` vs bunch. | Cards: none (1926, "Finger's mirror"). HNFL-074/075. | **defer** | The cover2man family renormalizes over 2-Man, Pounder and Finger; rolex_banjo goes with it. |

**Removal arm for all eight.** No flag exists. There are two ways to build one:
- **Harness:** mutate the catalog in process, as `scripts/diag/coverage/wide-census.mts` RUNG=2 already does. Filter `structureChecks` entries whose `to` is in the set. Rolex needs a code flag, because VARIANTS is a local constant inside `call()`.
- **One env flag** (e.g. `STD_CALLS=1`) covering both.

**What to measure.** Use wide-census on the same seeds. Split the wide-open rate and the labels by structure tag (trips, bunch, stack, empty, close_23) × called family:
- P9 (bunch vs Box/Area/Banjo);
- P10 (a structure tag nothing consumes);
- P1n (never owned).

Also check yards per throw on those structures. The specific risk is Cover 9 vs bunch or empty with no check at all.

## 2. Refinement flags

All 16 are on by default (FLAGS.md). The removal arm for each is `FLAG=0`, measured in wide-census on the named path.

| flag | what it does | taught? (card row) | verdict | what to measure |
|---|---|---|---|---|
| QUARTERS_CHECK (coverages.ts:689) | Replaces a random draw with formation logic. Vs 2x2, Cover 6 vs Cover 8 puts the half to the boundary. Vs 2x2 with both #2s detached, quarters → Palms; with an attached #2, MOD. | Half to the boundary: quarters (iii) cover6 row "quarters to field, half to boundary" (high). Palms vs detached: cover4_palms r10 "usually a 2x2 call". The detached/attached split itself is HNFL-051 (one staff). | **keep** (it removes randomness). The Palms split could be deferred separately. | Half-side flat and #1 open rate vs 2x2; Palms vs MOD wide-open on #2 outs. |
| MATCH_DECLARE (rules.ts:270) | The seam/curl-flat player reads #2 for about 3 steps (5 yd) before committing, and re-reads. | cover3_match × SS r5 and r7 "for 3 steps" (high); cover3 × SS r7. | **keep** | #2 seam and flat open rate vs Rip/Liz, Seam and Cover 9. |
| MUSH_MATCH (811) | The Book/Stubbie nickel mans #2 to the flat when #3 is not out. | cover4_stubbie × NB r5 "first out-breaker from #2 or #3" (med). | **keep** | Trips flat wide-open (slant_flat vs Book/Stubbie). |
| MUSH_TRAP (801) | Book only: the nickel traps #3 out or flat. | Book is unnamed in the cards; HNFL-050. Fires only in cover4_book_read and cover6_book. | **defer** (it goes with Book) | Empty and trips #3 flat. |
| C2_APEX (888) | The c2_hook apex: declare, then wall #2 vertical; match corner/sail from underneath; on a flat, curl window. | cover2 × LB_S r5 "#2 vertical wall, #2 in take, #2 out widen to curl" (high). The corner/sail match-under is an extra (HNFL-015). | **keep** | Smash and #2 seam open rate vs Cover 2 Match/Tampa. |
| SQUAT_TOPDOWN (640) | The sink/cloud corner plays the flat top-down, sinking under a high threat. | cover2 × CB_S r5 and r6 (high, med). | **keep**, but merge (see note below the table) | Hole shot and flat vs Cover 2 Match, 6/8 half side. |
| Q_APEX (512) | The quarters apex: #2 under with #3 away, carry across; #2 climbing with #3 to the flat, take the flat; on Palms, close the curl window. | cover4 × NB r5, r8 ("take two back across field"), r10c (high, med). | **keep** | Flat by #3 or the back vs quarters (F09). |
| CUT_WALL (29) | The hook walls a shallow crosser and passes him on, instead of carrying him 8 yd. | cover3_match × SS r8 "Under: #2 to the hooks (cut)" (high); cover3 × LB_S r8 and cover2 × LB_S r8 hand off crossers (low). The src doc comment still says "experimental, off" (stale). | **keep** | P2 label (let go through the pass-under). |
| BOX_IN (1053) | The Box low inside defender keeps the first in-breaker (exempt from CUT_WALL). | cover4_box × LB_M r5 "First inside" (low; HNFL-053). | **keep** | P9 vs bunch. |
| SCREW (447) | On a run read, the quarters safety mans #2 up and out. | Not a card row. The card's cover4 × SS r4 is the plain #2-override. The source (HNFL-114) calls Screw a game-plan call; the engine applies it to every q_safety. | **defer** | Play-action #1 and #2 deep vs quarters. |
| TAMPA_PIPE (700) | The Tampa Mike carries a vertical by #2 or #3 down the pipe and keeps him. | tampa2 × LB_M r5 (high). | **keep** | Seam and post between the safeties vs Tampa 2. |
| FLAT_SINK (defense.ts:86) | The unruled flat corner sinks with #1 until the flat is threatened. | cover2 × CB_S r5 "sink at 45° under #1", r9 (high). | **keep**, merge | Cover 2 hole shot at 15+ air yards. |
| FLAT_CARRY (90) | With #1 cancelled, the flat corner carries a #2 flat that turns up. | cover2 × CB_S r10c "wheel: sink with it" (low); r5. | **keep**, merge | Wheel and flat-up vs Cover 2. |
| CURL_SINK (1690) | The curl-flat player sinks to the curl window while widening to the back. Match style only. | cover3 × SS r5 "sink under #1's curl, break to flat on shoulders" (high). Stale "experimental" doc comment. | **keep** | RB-flat "nobody in front" rate. |
| OPEN_CARRY (1226) | An underneath carry keeps hips square to the QB as far as his speed allows. | Execution, not a coaching row. It is consistent with the eyes row (cover3 × LB_S r7 "QB, peeking"); NFL facing within 90° is 91% vs ours 62%. Stale doc comment. | **keep** (body control) | Carry facing; P1 open rate. |
| HALF_KEY (1720) | The unruled half safety keys #1 to #2 and squeezes. | cover2 × SS r2 "#1's release", r5 "#2 vertical: divider", r7 (high). | **keep** | 9 route and seam vs plain Cover 2. |

**Simplifications that lose no coverage:**
- **Merge the flat-corner rule.** SQUAT_TOPDOWN (ruled `sink_corner`/`cloud_corner`), FLAT_SINK and FLAT_CARRY (unruled `flat_s`/`flat_w`) are three implementations of one card row, cover2 × CB_S r5. Make them one rule.
- **Fix stale doc comments.** CUT_WALL, OPEN_CARRY, CURL_SINK and CURL_FLAT_BACK say "off; =1 turns on" in their doc comments, but the code reads `!== '0'` (on).

## 3. Random mixing

| item | what it does / how often | taught? | verdict | removal arm |
|---|---|---|---|---|
| zoneStyle coin flip (playcaller ≈917) | For calls with no ruled seat (cover3 Sky, cover3_trips, plain cover2), each snap plays the generic "match" branch with probability matchRate, which is U(0.3, 0.9) per coach (team.ts:119). That makes a third, unnamed version of Cover 3 and Cover 2 beside the sourced cover3_match and cover2_match. | Cards: spot is the day-one install (lines 96, 105); match is its own id (Rip/Liz; Saban "Cut", 1293). | **remove candidate** (pin the style per id) | The harness sets `coach.matchRate` to 0 and to 1 after generateTeam. Measure Cover 3 Sky and Cover 2 wide-open by path. Caveat: CURL_SINK and CURL_FLAT_BACK only run in match style. The card's Sky C/F row 5 (seam alert, curl sink) reads like the match branch, so Sky may need to be pinned to match. |
| matchRate as a variant weight (cover3 vs cover3_match, cover2 vs cover2_match) | Splits by coach. | A scheme choice (Saban/Belichick match vs spot). | **defer** | Pin at 0.6. |
| VARIANTS by coverageSystem (random pick of 5 per team, team.ts:120) | Variant weights per tree (HNFL-186 scouting, Eagles 2025). | Taught trees (Fangio, Saban, Tampa). | **defer** (team option) | Standard: base id per family, weights 1/0. Measure a family-level wide-open rate. |
| SYSTEM family multipliers and manRate U(.25, .55) | Family mix per coach. famW are NFL shares, which is play-calling. | Shares tracked, not taught. | **keep** the famW shares; **defer** per-coach manRate (fix at 0.4) | Pin manRate in the harness. |
| Disguise (`coach.disguise` U(.1, .45) × safety IQ × SHOW[family]; `rng.pick` of shown shell from a pool; two-high trees show cover4 85%) | Random presented shell, including closed-to-open looks (a one-high shown on two-high calls). | Cards say the NFL norm is two-high shown, rotating late, open-to-closed (quarters iv 263-273, cover3 iv 805, high). Closed-to-open is "a deliberate trap call, used rarely". Cover 2 is shown honestly (1308). | **remove candidate** (random pool); **defer** the closed-to-open tag | Standard: deterministic. Calls with `look: 'two-high'` show quarters; two-high calls are honest. Harness: `coach.disguise = 0` vs the deterministic rule. Measure QB shell-read errors and rotation-late wide-open (P8, P4). |
| Zeus (two-high tree & `coach.shadow` 35% & cover4/6 & `rng.chance(0.5)`) | Redirects to Cover 8, Stuff or Quads by WR1's spot. | Not on the cards; one staff (Fangio tag). | **defer** | `coach.shadow = false` in the harness. |
| Man-lock on motion (motion.ts:447, chance 51/66/69/58% by kind, per snap) | Lock vs trade on motion. | cover1 × CB_S r10b: "lock or switch… **the choice is pre-set**" (Svec, med). It is a call, not a per-snap coin. | **defer** (make it a pre-set option per call or team) | Replace the draw with a constant (env such as `MOTION_LOCK=1/0`). Measure P10 and P11 on motion plays vs man. |
| checkPick (team.ts:121, int 0-1) | Effectively dead. checkPrefer always lists both cover4_poach and cover4_stubbie (the only two-option check), and a non-installable fallback reverts anyway. | none | **remove candidate** (dead code) | Delete. No change is expected; confirm with an identical trace. |
| checkPrefer (playcaller:717) | Deterministic: quarters tree → Stubbie; two-high → Poach (Trix); otherwise Trix on passing downs, Book on early downs (HNFL-195). | Cards (ii): NFL uses Poach/Trix and college uses Stubbie. | **keep** Poach as standard; **defer** the system/down split | Force cover4_poach. |
| `learned()` in-game adaptation (playcaller ≈723) | Multiplies family weights by success and swaps the trips check. | Our own AI. | **remove candidate** from standard (defer as a management feature) | No flag; a harness `LEARN=0`. It also adds noise to controlled comparisons. |
| Other draws | frontStem and creep (coach.disguise), front strength, mugs, DL games: front/pressure, not coverage. Behavior dice (man-look, ball look, shoulder-read error) are rating-scaled perception. No rng in alignment.ts or coverage/*. | n/a | **keep** | n/a |

## Summary

1. **Calls:** one base id per family (Sky, Cover 1, Cover 2, Tampa 2, MOD, Cover 6, 2-Man, Cover 0), plus the card-sourced checks: Mable, Box, Poach, Banjo, half to the boundary, and cover3_trips.
2. **The eight variants are not inventions:** they are one HonestNFL staff's checks. Defer them all. Without them, the base call plays trips, bunch and empty, as the cards' 10a rows describe.
3. **Flags:** 14 implement card rows and stay on. Defer SCREW and MUSH_TRAP, and merge the three flat-corner flags into one rule.
4. **Mixing:** family shares stay at NFL rates. Per snap, remove the style coin flip and the random shown shell; make the man-lock a pre-set choice; delete checkPick and `learned()`.
5. **Scheme options to add later:** system tree, matchRate split, Zeus, closed-to-open, the lock/switch choice and Stubbie vs Trix. Each removal arm is a wide-census run on the same seeds, split by structure tag and path label.

The share estimate is in `/tmp/claude-0/-home-user-football-simulation-/4c3a5ab0-ab17-5ef4-a0e6-c7ac5f518309/scratchpad/shares.mjs`.
