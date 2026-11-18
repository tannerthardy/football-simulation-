# Coverage by position: coached rules and engine audit (tables)

Companion to [the spec note](2026-11-17-coverage-position-spec.md). Four read-only audits of develop c85e6b9d
(engine-77), one per family; no sims were run, so every engine claim is from reading code and line numbers drift
(search for the named function). Cells: 1 alignment and pre-snap key; 2 read progression and declare; 3 rule per route
(pass-off, call); 4 what moves him before the throw and when he may come downhill; 5 job on the throw and after the
catch. Sources: TC = taught consistently, VS = varies by staff (both sides given, with which our playbook is closer to).
Status: M matches, D differs, A absent. Links: L1 deep man comes downhill and is passed; L2 nobody deeper after a
pass-by; L3 underneath man moves away from the throw. Each family keeps its own path abbreviations, defined at its top.
HNFL-### are docs/references/honest-nfl texts (machine OCR; depths carry an OCR caveat). Sources marked unverified
were cited through docs/reviews/2026-11-17-zone-coached-rules.md, not re-opened.

## Cover 3 family: per-position coaching spec and engine audit (develop c85e6b9d, engine-77)

This was a read-only audit; nothing was run or changed. Every citation is `file:function:line` at c85e6b9d.

**Path abbreviations**
- C = src/playbook/coverages.ts
- R = src/sim/coverage/rules.ts
- RD = src/sim/coverage/reads.ts
- J = src/sim/coverage/judgment.ts
- CD = src/sim/coverage/defender.ts
- T = src/sim/coverage/techniques.ts
- D = src/sim/behaviors/defense.ts
- ZE = src/sim/zone-eyes.ts
- AL = src/playbook/alignment.ts
- RF = src/sim/run-fits.ts
- CM = src/sim/behaviors/common.ts
- OF = src/sim/open-field.ts

**Source tags.** HNFL-### are the texts under docs/references/honest-nfl/text/coverage. SAB-ST/TD and USAF-TN are taken from docs/references/coverage-checks/web-sources.md (A3 Mable). Named sources come from docs/reviews/2026-11-17-zone-coached-rules.md ("consensus").

### Wiring and flag facts (re-verified)

**Who runs which code**
- Plain zone vs rule:
  - A zone role with a rule runs as a CoverageDefender only when the style is `match` (src/sim/assign.ts:146-150).
  - Calls that carry rules are always `match`. Plain Cover 3 Sky takes `match` or `spot` from `coach.matchRate` (src/game/playcaller.ts:916-917).
- The deep middle has no rule in any Cover 3 call (C:25,250,272,294,304,315,326), so it is always a plain ZoneCoverage.
  - **This refutes the old audit's claim** that J can override the deep middle. CoverageJudgment only runs inside CoverageDefender (CD:update:100).
- Underneath seats are filled in list order, as many as there are free defenders (AL:1197).
  - With a 4-man rush, `mike_3` is dropped in Match, Seam, Cloud and Cover 9.
  - Which body (for example the nickel) gets which seat goes by least distance (AL:1199-1214). The nickel has no seat or code of his own.

**Flag defaults.** Code defaults agree with config/reference-stack.json.

| Flag | Value | Notes |
|---|---|---|
| ZONE_EYES | on | |
| ZONE_EYES_KEY | 9 | 0.9 s declare look |
| CURL_SINK, SETTLE_DEPTH, ZONE_SETTLE | on | |
| SHOULDER_READ, RELEASE_BELIEF, SHOULDER_LEAD | on | |
| ARM_BREAK | 1 | |
| BREAK_LOOK | on | receiver-side only, src/sim/behaviors/receiver.ts:142 |
| CUT_WALL | on | R:28 |
| CORNER_DROP, CARRY_POSTURE, CARRY_READ, CUSHION_BREAK | on | |
| SAFETY_DEPTH | on | |
| SEEN_EYES, QB_BODY_SEEN | on | |
| CURL_FLAT_BACK, OPEN_FIELD, ARRIVE_LEAD, TECH_CONT | on | |
| OFF_PEDAL | 3 | |
| INFO_HONEST | 63 | |
| APEX_LEVERAGE | 7 | quarters-only effects, R:311,367,422 |
| QCORNER | 0 | |
| JUDGE_SEEN_BALL, QB_RELEASE | off | |
| ZONE_HOLD | 114 | bits on: eyes 2, pick 16, lean 32, handoff 64. **Band/vertical hold (bit 1) is off**, so deep threat sets are re-picked every tick. |

**What changed since 0d0f4af8 (2026-11-11)**
- Fixed or improved:
  - **QB eyes are now perceived, not the QB's internal target** (D:seenQbEyes:161-191). The old audit's "hidden qbEyes" flag is fixed.
  - A curl-flat in zone now widens toward a back or #3 showing to the flat (CURL_FLAT_BACK, D:2177-2205).
  - CURL_SINK: he widens at his curl window's depth (D:2202).
  - Deep safeties keep depth over the deepest route and hold over a stopped route (SAFETY_DEPTH, D:2004-2008, 2047-2052).
  - The match corner bails on the snap until he sees the release (CORNER_DROP, D:1575-1578, cornerDrop 1069-1079).
  - Hooks wall a shallow crosser and pass him instead of carrying him (CUT_WALL, R:cutWall:259-281; CD:passUnder:148-164).
  - ZONE_EYES head sequence (ZE:41-67).
  - Underneath plant on the throwing motion (SHOULDER_READ, D:1836, 2472-2499).
- New problem: RELEASE_BELIEF plus the shoulder break (D:2680-2736) **introduced the ungated deep arm-bite** (suspect 1).
- Unchanged: the `owned` filter, the deep-drive guard, the seam/flat zone-off latch, the China zone-off on c3Corner, the wheel, the hook's #3 over, #3 to the flat with #2 up, the squeeze-wide band, and the mike_3 seat drop.

### Known suspects: verdicts

| # | Suspect | Verdict and evidence |
|---|---|---|
| 1 | Arm-bite and shoulder break not gated for deep players | **Confirmed.** `playBelievedBall` (D:2680-2736) plants on the load (stopDrop, D:2715) and on an arm-only "through" (a pump counts, src/sim/release-belief.ts:9-10) runs to the receiver the passer's shoulders point at (runThrough at 0.9 speed, D:2717-2730). There is no `deep` or coverage-family check. It reaches every ZoneCoverage deep player (Sky corners, every deep middle, a zoned-off Tight 1/3 corner) and the Rob technique (T:43). Only a deep man carry with protectDepth is exempt, because zoneEyes is false (CD:65-68). Underneath plant is gated `!this.deep` (D:1836); the believed-ball path is not. |
| 2 | Pre-throw deep drive on a stopped stem | **Confirmed.** D:2014-2029 runs in any non-spot deep zone: every deep middle in a ruled call, Sky match corners and FS, and zoned-off match corners. It runs before the SAFETY_DEPTH "hold over a stopped route" logic (D:2047-2052), which it pre-empts. Its guard `climbing` counts only receivers within 8 yd laterally (D:2018), so a seam 9+ yd away does not stop the drive. For third corners it is computed over the owned-filtered list, so it is always false. |
| 3 | Deep middle splits two verticals by leaning to the QB's look | **Confirmed.** Weight is 0.35/0.65 toward the receiver he sees the QB looking at (D:2034-2037), otherwise the midpoint. The eyes are now perceived. |
| 4 | Mable post safety relating to #3 has no rule | **Confirmed.** FS is `z('deep_mid')` (C:326). The note at C:322 is not implemented anywhere. |
| 5 | Plain Sky corners don't bail | **Partly refuted.** A Sky corner drops to the 16-yd landmark (AL:783-786) with a 45° bail opening whenever a threat is in his band (deepReadPosture D:1082-1090; bailSeat D:1003). Once #1 is upfield he plays a cushion carry over #1 (D:2032-2045), not a bail to depth. CORNER_DROP itself only exists in ManCoverage (D:1575). |
| 6 | Match defenders commit at once with no declare phase | **Confirmed for seam/flat and hook.** Seam/flat is man on #2 at a vertical ≥3 yd (R:199-200) and latches `zoned` on the first confirmed non-vertical declaration (R:211). Confirmation takes about 0.12×(1.6−0.6·focus) s, roughly 0.12-0.19 s (RD:58,120). c3Hook has no read directive and commits on #3 vertical ≥3 yd (R:296). The corner's "In" call does wait (NO_COVER 5 yd, DECLARE 0.35 s, R:96,102). |
| 7 | Sky corner's `owned` filter | **Confirmed.** D:1990-1996: once #1 is in `vert`, `vert=[#1]`. `vert` admits any receiver moving upfield at more than 1 yd/s past the line (D:1976), so it applies almost immediately. The split (D:2034) and the #2 squeeze cannot run, and the deep-drive guard is defeated. It also hits Clue's "both vertical" case, because clueCorner falls to a zone (R:660). |

### Per-position table

| Call | Position | Cell | Coached rule [source; TC/VS] | Engine today [file:function:line] | Status |
|---|---|---|---|---|---|
| Match, Seam, Buzz, Cloud (W), Mable (S), C9 | Corner (Tight 1/3) | 1 | Tight over #1, outside leverage; key #1→#2 [HNFL-204, HNFL-335; TC] | c3Corner is man #1, outside leverage, over top (R:c3Corner:166-170). Bails on the snap until the release is seen (D:cornerDrop:1069; gate 1575). Head stays on his man (ZE:zoneEyesFor:36 excludes man). | M |
| same | Corner (Tight 1/3) | 2 | Man #1 unless shallow across the no-cover zone ("In"); then zone the 1/3 [HNFL-204; Saban/USAF 7272; TC] | NO_COVER 5 yd; In/Under held 0.35 s before zoning off (R:zoneOffOne:111-138) | M |
| same | Corner (Tight 1/3) | 3 | Vertical: stay on top. Out, stop or flat: still #1; only "In" frees him. Smash (#1 short, #2 vertical): bail under #2 [HNFL-204/016; SAB; TC]. Zoned off: pattern read Corner→Seam→Curl [HNFL-204] | Zones off on **any** out, flat or stop ≤5 yd whatever #2 does (china=true, R:139,168). The comment at R:125-127 promises x1 handling, but only qCorner gets it (R:336). Zoned off, he takes the deepest threat in the outer band, with no Corner→Seam→Curl order (D:1979-1983,2012). | D |
| same | Corner (Tight 1/3) | 3b | #1 curl at 10-14: HNFL "plays as Cover 1 vs verticals & outs", i.e. man [HNFL-335]. Consensus says deep players stay deeper than the deepest [Bowen, Kent State; VS]. Our call follows HNFL. | Over-top roof 0.8 yd over a stopped #1 brings him downhill before the throw (D:ManCoverage:1554-1560; CARRY_READ hold fades 1591-1599). Judgment `squeeze-break` sends him to rob a short break within 10 yd (J:decide:68-82). | M (HNFL) / D (consensus) |
| same | Corner (Tight 1/3) | 4 | Pass first; break on the release, not a pump; hold through run action [consensus; TC] | In man there is no arm read (CD:zoneEyes:65-68), so he reacts to the ball or the hands. Once zoned off or robbing he gets the arm-bite plant and shoulder break (D:playBelievedBall:2698-2731; T:43). | M in man / D once zoned |
| same | Corner (Tight 1/3) | 5 | Play the ball over the top; after the catch rally outside-in, keep the runner inside and in front [consensus; TC] | Earliest reachable point, else full-speed drive to the catch point (D:flightApproach:2850-2891). After the catch, chase on top with field-position leverage (D:pursueIfLive:251; CM:pursuitLeverage:293); no force or alley role. | D |
| Sky (spot/match) | Corner (deep 1/3) | 1 | Off and bail; eyes #1 to #2, then the QB "through #2"; owns #1 **and** #2 deep [HNFL-027/292 Clue 1/3; Bowen; TC] | Landmark 16 yd (AL:zoneLandmark:783-786). Head on #1 for 0.9 s then the QB (ZE:keyRefs:41; zoneEyesTarget:53). Opens 45° (D:deepReadPosture:1082). | M |
| Sky | Corner (deep 1/3) | 2 | Read the 2-to-1 release; "up" means past about 8 yd at speed [consensus; TC] | Any receiver moving upfield at >1 yd/s past the line counts as vertical (D:1976); the owned filter then keeps only #1 (D:1990-1996) | D |
| Sky | Corner (deep 1/3) | 3 | #1 and #2 both vertical, or #2 corner route: squeeze both, deeper than the deepest [HNFL-027; TC]. #1 stops: hold, break on the throw [consensus; TC]. Hitch: sit about 11 yd [Bowen, Kent State; TC]. | Owned filter means only #1; the split is unreachable (D:2034). Match style: deep drive on #1's stop while #2 climbs (D:2014-2029). A hitch empties `vert`, so he retreats to the landmark at about 15 yd (D:2009). | D |
| Sky | Corner (deep 1/3) | 4 | Never break on a pump; single-high deep players hold until the throw; QB eyes shade only [consensus; TC] | Arm-bite plant and shoulder break, ungated (D:playBelievedBall:2698-2731). Leans to the seen eyes laterally when nothing is vertical (D:2001). On a run read: alley ease-down plus lateral flow (D:1845; RF:executeRunFit:479-503). | D |
| Sky | Corner (deep 1/3) | 5 | Over the top, in phase look; after the catch rally, last-line discipline [consensus; TC] | Catch-point drive (D:2850-2891). OPEN_FIELD on-top approach is dropped once passed by 0.8 yd (OF:35,68). | D |
| Cloud | Strong safety (rotates to deep 1/3) | 1-3 | Cloud 1/3: key 1-2, responsible for #1 **and** #2 verticals, vision and squeeze [HNFL-027, HNFL-292; TC] | `c3_corner`: man #1, from 11 yd (C:314). Judgment protect-vertical/rob only (J:63-82). | D |
| Mable | Weak corner | 1-3 | Lock the isolated #1, MEG [SAB-ST/TD; MQ; TC] | Man W1, inside leverage, protectDepth (C:325) | M |
| All calls | Deep middle (FS; SS in C9) | 1 | Middle of the field at about 12-15; key inside-out 3-2-1, both #2s [HNFL-292/335/204; TC] | Landmark 15, clamped to the middle third (AL:787-788). SAFETY_DEPTH floor (D:1798). Head on **S2 only** for 0.9 s (ZE:49), then the QB. No numbered key. | D (partial) |
| All | Deep middle | 2 | Drop favoring the most dangerous side; read the distribution, then the QB. Rip/Liz post melts to the first look and breaks on the second [Saban; VS, single] | No rule (C:25,250…). Deepest threat in band [W/3−3, 2W/3+3] (D:zoneBand:2395), re-picked every tick (ZONE_HOLD bit 1 off) | D |
| All | Deep middle | 3 | One seam: squeeze top-down, inside-out. Two seams: split at the midpoint [HNFL-056; consensus TC; Saban melt VS]. No seams: squeeze wide on a vertical #1 [HNFL-056; TC]. Stopped route under him: stay deeper than the deepest [consensus; TC]. | Splits 0.35/0.65 toward the seen eyes (D:2034-2037): closer to Saban's melt than to the midpoint. The band stops 3 yd outside the middle third, so there is no squeeze wide (D:2395-2396). Match style deep-drives a stopped route when no climber is within 8 yd laterally (D:2018-2029); SAFETY_DEPTH hold-over only when no drive (D:2047-2052). | D / A (wide) |
| All | Deep middle | 4 | Eyes may shade him; a pump must not; hold through run action until the throw [consensus; TC] | Arm-bite plant and shoulder break (D:2698-2731). Run read: alley ease-down plus lateral flow at 0.65 speed (D:1845; RF:479-503). Eye lean when nothing is vertical (D:2001). | D |
| All | Deep middle | 5 | Break at 45° downhill, not lateral; last line; alley or cutback inside-out after the catch [Bowen, Coach Phillip; consensus; TC] | No break-angle or depth control (D:flightApproach:2850-2891). After the catch, chase on top; alley role not used in pass pursuit (CM:293-298) | D |
| Mable | Deep middle | 3 | Post "relates to #3" (our note C:322). Sources vary: SAB has the hooks own #3; USAF-TN has FS on RB/first crosser [VS] | None: plain deep_mid (C:326) | A |
| Match, Buzz (c3_curl_flat); Seam, C9, Strap, Grab (c3_seam) | Strong seam/curl-flat (apex/nickel) | 1 | Squeeze alignment on #2; key 2→1, aware of #3 [HNFL-335, HNFL-292; TC] | Reads S2→S1→S3 (R:seamCurlFlat:182-185). Head on #2 for 0.9 s (ZE:45). | M |
| same | Strong seam/curl-flat | 2 | Declare phase of about 3 steps / 5 yd before matching [consensus; TC] | Read only while #2 is undeclared or under 3 yd vertical (R:199); man at 3 yd; zoned latch on the first confirmed out/under/in/stop, about 0.12-0.19 s (R:211; RD:58,120) | D |
| same | Strong seam/curl-flat | 3 | **Vertical:** carry. Rip/Liz carries to 12-15 then delivers [Saban; VS]; Nine carries seams with no limit [HNFL-204; VS]. **Out, incl. out and up:** "match #2 out (and up)", zone off Seam→Corner→Flat [HNFL-056; TC]. **Under:** deliver to the hook; #3 away means take #2 back across [HNFL-292; TC]. **Smash:** push to #1 [HNFL-016; SAB; TC]. **Fast #3:** Push [HNFL-204/016; TC]. **Wheel:** stays his [HNFL-056/203; TC]. | Vertical: carry 12 plus hasVisibleCap (Match/Buzz) or 99 (Seam/C9) (R:200-208, 844-845), each matching its own source. Out: latched `zoned` at any depth, never re-read, sits under (R:211; D:2267-2271). Under: zoned plus the hook's cutWall; no #3-away carry. Smash only on #1 `stop` ≤5 yd (R:193). Push on a fast #3 under 2 yd deep (R:173,189). Wheel: no owner. | vertical M; out D; under D; Smash partial; Push M; wheel A |
| same | Strong seam/curl-flat | 4 | QB eyes after the declare; don't take a 3-yd teaser; on the run he is the force [consensus; TC] | Carrying man, an arm read applies (OPEN_CARRY zoneEyes CD:66). When zoned: ZONE_SETTLE plant, head-line lean (D:1954-1963, 2261-2263). Run read: force fit (RF:147-160). | M |
| same | Strong seam/curl-flat | 5 | Break on the QB's front shoulder, straight line; after the catch force outside-in [Vanderlinden/HK, Waugh; consensus; TC] | Shoulder break (D:2717-2730); ARRIVE_LEAD to the upfield shoulder (D:2875-2881); force keeps the outside shoulder in pursuit (CM:pursuitLeverage:293-298) | M |
| Sky (spot) | Curl-flat (SS/overhang) | 1-3 | Curl dropper, eyes on the QB, feel routes inside-out, "hold curl, push flat" [HNFL-027/067; TC] | Spot at 11 yd (D:1788-1792). Cannot come below lm−2 (about 9 yd) before the throw (D:spotUnderneath:2352). Never leaves his radius. | D |
| Sky (match) | Curl-flat | 2-3 | Same as above, plus wall #2 vertical to 12-15 [Saban, McDonald; TC] | Carries a vertical inside 10 yd (D:2154-2173). CURL_FLAT_BACK widens at 8.5 (D:2177-2205). #2 flat expansion only with no #3 and no fast back (D:2235). Lane to the threat nearest his landmark, eyes-weighted (D:2206-2220). | M (partial) |
| Sky (match), all zoned seats | Curl-flat / hook | 4 | "Let the ball bring you down"; no teaser [Saban, Clark/Glazier; TC] | Lane target goes down to 0.5 yd off the nearest receiver before the throw (D:2267-2268). Held only for a climbing stem (hook) or a receiver behind the line (D:2281-2291). | D |
| Match, Buzz, Cloud (c3_curl_flat W); Seam (c3_seam W); C9 (rotated FS) | Weak curl-flat | 1-3 | Match-carry-deliver on #2 weak, aware of #3. With x1 the released back is #2 [HNFL-204/203; TC]. #3 away: take #2 back across [HNFL-292; TC]. | Same seamCurlFlat on W2, else backTo (R:183). FS shown at 11 (C:30). No #3-away carry. | M / A (back across) |
| Mable, Sky, cover3_trips | Weak curl-flat | 2-3 | Mable: weak apex is man on the RB if he flows weak, else cuts the first crosser [SAB-ST/TD; TC] | Plain curl_flat_w zone (C:328). CURL_FLAT_BACK widen only; no cut. | D |
| Match, Seam, C9, Cloud, Mable (S); Buzz SS | Hook (c3_hook) | 1 | 4-5 yd off over the guard/hash; key #3→#2→#1 [HNFL-335; TC] | Keys S3, else a back to his side (R:c3Hook:286). Head on #3 then #2 (ZE:46). Landmark 10 yd, ±5 (AL:811-814). | M |
| same | Hook | 2 | Declare phase of about 3 steps [consensus; TC] | No read directive; man on #3 at ≥3 yd vertical (R:296-297) | D |
| same | Hook | 3 | **#3 vertical:** match and carry [HNFL-016/335; TC]. **#3 over/in:** match the final #3 up/over [HNFL-292; TC]. **#3 flat with #2 up:** "take #3 through to the flat" [HNFL-335/204; TC]. **Fast #3:** push to #2 [HNFL-016; TC]. **Crosser:** wall and pass, don't chase [consensus; TC]. | Carry to 15, then zoned (R:296-299). Only `vertical` is matched, so #3 in/over is not his. A non-fast flat leaves his band and nobody takes him. Push (R:288-295). cutWall/passUnder (R:259-281; CD:148-164). | vertical M; over A; flat A; Push M; crosser M |
| same | Hook | 4 | Stop on the QB's set; slide with his eyes; low hat means fit [consensus; TC] | ZONE_SETTLE (D:1954-1963), head-line lean (D:2261-2263), SHOULDER_READ plant (D:1836), run fit (D:1845) | M |
| same | Hook | 5 | Break on the shoulder; inside-out pursuit [consensus; TC] | Shoulder break (D:2717-2730); ARRIVE_LEAD (D:2875); inside leverage (CM:298) | M |
| Sky (spot) | Hook | 3 | Hook drop with vision; "push to curl with #3" [HNFL-027; TC] | spotUnderneath: eye lean and lane squeeze; no push with #3 (D:2312-2359) | D |
| Match, Seam, Buzz, Cloud, Mable, C9 | Mike / hole (mike_3) | 1-3 | Final #3/#4 (the back). "#2 vertical means Mike/Dime must take #3 to the flat" [HNFL-204; TC] | mike3 carries the back's vertical/in/under to 15 (R:304-312). A back to the flat is not taken. The seat is often unfilled (AL:1197). | A (flat) / unverified fill rate |
| Strap / Grab | Bonus hook; #3-receiver hook | 1-3 | Bonus hook: overdrop #3, match final #3 underneath, no carry [HNFL-204]. #3-receiver hook: cut off any over route by #3 [HNFL-203/204; TC] | bonusHook (R:703-712); threeRecHook carries to 18, takes the back within 8 yd (R:668-696) | M |
| Cloud | Flat (strong corner) | 1-3 | Squat about 5 yd, funnel #1, sink and see #2/#3 to the flat. "No flat threat = man under #1" is the Wild/Squat text [HNFL-292; VS for Cover 3 Cloud] | cloudCorner sink=false: flat zone on any flat threat, otherwise a flat zone; never man under (R:480-500, 854) | D (VS) |
| Cloud | Flat (strong corner) | 5 | Force, outside-in [USA Football 866; TC] | Flat seat gets force priority 0 (RF:153-160); outside shoulder in pursuit (CM:298) | M |
| Cover 9 / Strap | Nickel | 1 | Aligns on #2 strong, always [HNFL-204; TC] | No nickel role; seats go by least distance (AL:1199-1214) | unverified |

### Ranked D and A items (by consequence)

Links: **L1** = deep man comes downhill and gets passed; **L2** = nobody deeper after a pass-by; **L3** = underneath man moves away from the throw.

1. **Arm-bite plant and shoulder break are not gated for deep players** (D:playBelievedBall:2698-2731; a pump triggers it, src/sim/release-belief.ts:9-10). It reaches Sky corners, every deep middle, zoned-off or robbing match corners, and the Rob technique (T:43). **L1, L2.**
2. **Pre-throw deep drive on a stopped route** (D:2014-2029). It applies to deep middles in every ruled call and Sky match, and to Sky match corners and zoned-off corners. It pre-empts the SAFETY_DEPTH hold-over (D:2047-2052). The 8-yd lateral `climbing` guard ignores a far seam. **L1, L2.**
3. **Sky corner `owned` filter** (D:1990-1996). It removes the #2 squeeze and split and disables the drive guard. It also hits Clue's "both vertical" case (R:660). **L2** (and L1 with item 2).
4. **Tight 1/3 corner and Cloud SS come downhill on a short #1 before the throw.** Causes: judgment `squeeze-break` rob (J:68-82) and the over-top roof on a stopped receiver (D:1554-1560). This matches HNFL's man-like rule but not the "deeper than deepest" consensus. **L1.**
5. **Seam/flat latches `zoned` on any out-break and never re-reads it** (R:211). No out-and-up/corner match, and the wheel has no owner past about 10 yd (carry cap D:2154-2155). **L2.**
6. **Deep middle has no squeeze-wide** (D:2395-2396) and **leans its two-vertical split to the QB's look** (D:2034-2037) instead of the midpoint. **L2.**
7. **Deep players flow laterally and ease down on a run read** (D:1845; RF:479-503), with no Cover 3 "hold". **L1, L2.** How often play action produces a run belief here is unverified.
8. **Deep ball play has no over-the-top or gather rule.** Full-speed drive to the catch point (D:2850-2891); OPEN_FIELD drops the on-top approach once passed by 0.8 yd (OF:35). **L1, L2.**
9. **After the catch only the force role survives** (CM:pursuitLeverage:293-298). Alley and cutback are run-only. **L2.**
10. **Cloud SS plays Tight 1/3 man on #1** (C:314) instead of Cloud 1/3 key 1-2 with #2 deep. **L2.**
11. **Mable post has no #3 rule** (C:326). Vertical #3 is carried by the hook to 15 yd, then nobody owns him. **L2.**
12. **Match commits with no declare phase.** Seam/flat zones off on a 0.1-0.2 s lean (R:199-211; RD:58,120); the hook commits at 3 yd (R:296). The apex drops to his zone while the throw goes to #2. **L3.**
13. **No "#3 away = take #2 back across"** for either seam/flat (R:211). The apex zones off from a #2 slant or under. **L3.**
14. **SETTLE_DEPTH keeps underneath droppers sinking after the QB sets** when they are more than 2 yd short of the landmark (D:shortOfDepth:1762-1767, 1962). Partly offset by the SHOULDER_READ plant (D:1836). **L3** (mild).
15. **#3 or the back to the flat while #2 is vertical is unowned.** c3Hook (R:285-301) and mike3 (R:304-312) ignore a non-fast flat; the apex is man on #2. CURL_FLAT_BACK only helps a zoned curl-flat. **None of L1-L3**: this is an unowned receiver, i.e. yards after the catch.
16. **c3Corner zones off on a short out or stop by #1 with no Smash** (R:139,168; the comment R:125-127 promises otherwise). He retreats toward the deep landmark. **None of L1-L3** (deep man moves away; yards after the catch).
17. **Sky corner retreats to about 15 yd on a hitch** (D:2009). **None** (cushion, yards after the catch).
18. **Sky spot underneath cannot push down to the flat** (D:2352) and the spot hook has no push with #3. **None** (cushion, yards after the catch).
19. **Underneath lane drives on a 3-yd teaser before the throw** (D:2267-2268). **None** (opens the window behind him).
20. **Hook does not match #3 over/in** (R:296 vertical only; cut takes unders ≤7 yd). **None** (window).
21. **Mable weak apex and cover3_trips weak side are plain zones** (C:328); no RB-man or cut rule. **None.**
22. **Deep middle's head looks only at S2** in the declare look (ZE:49), not inside-out 3-2-1. **L2** (mild; unverified effect).
23. **Cloud corner never sinks to man under #1** (R:854, sink=false). This varies by staff. **None.**

### Unverified

- How often `mike_3` is filled per personnel group, and which body (nickel or not) gets `curl_flat_s`.
- How often play action produces a run belief in deep players (item 7).
- How often the arm-bite fires for deep players. It needs their own eyes held on the QB (D:eyesHeldOnQB:2590, cosine above −0.2, so a 45° bail still qualifies) and a shoulder pick within 25° (D:2740). This is inferred from code, not traced.
- Trigger rates of Push and Smash.
- Whether typical sim corner routes are labelled `out` before the 12-yd carry ends (thresholds at RD:111).
- HNFL-027/067/016/335 are machine OCR; HNFL-204 and HNFL-056 are clean enough to quote.

## Cover 0, the Cover 1 family and fire zones: per-position coaching spec and engine audit (develop c85e6b9d, engine-77)

This was read-only. I ran no sims, so every engine claim below comes from reading the code.

**Path key** (all under /home/user/fb-fvs/):
- **D** = src/sim/behaviors/defense.ts
- **R** = src/sim/coverage/rules.ts
- **DF** = src/sim/coverage/defender.ts
- **J** = src/sim/coverage/judgment.ts
- **RD** = src/sim/coverage/reads.ts
- **T** = src/sim/coverage/techniques.ts
- **ZE** = src/sim/zone-eyes.ts
- **A** = src/playbook/alignment.ts
- **C** = src/playbook/coverages.ts
- **P** = src/playbook/defense.ts
- **PC** = src/game/playcaller.ts
- **CI** = src/playbook/call-integrity.ts
- **AS** = src/sim/assign.ts
- **RF** = src/sim/run-fits.ts
- **OF** = src/sim/open-field.ts
- **RB** = src/sim/release-belief.ts
- **MS** = docs/references/Coverage_Operating_System_Manuscript.md
- HNFL texts are in docs/references/honest-nfl/text/coverage/, except 064 and 278 (fronts-pressures/) and 065 (terminology/).

**Sources.** Brophy/Diaz and AFQ fire-zone texts are not in the repo; I tag them only through docs/reviews/2026-11-17-zone-coached-rules.md and mark their exact wording "unverified". The same applies to Bowen NFL 101.

### Flags that matter here (config/reference-stack.json)

**On:**
- Throw and arm reading: RELEASE_BELIEF, QB_BODY_SEEN, SEEN_EYES, SHOULDER_READ, SHOULDER_LEAD, ARM_BREAK=1 (bit 2, the load step, is off), TECH_CONT, HANDS_CUE.
- Zone and safety play: ZONE_EYES (ZONE_EYES_KEY 9, i.e. 0.9 s), SAFETY_DEPTH, CURL_FLAT_BACK, CURL_SINK, SETTLE_DEPTH, ZONE_HOLD=114 (bits 2/16/32/64; **bit 1 band hysteresis is off**).
- Carries, cushion and pursuit: CUSHION_BREAK, CUSHION_NEED, OFF_PEDAL=3, CARRY_READ, OPEN_CARRY, CUT_WALL, ARRIVE_LEAD, OPEN_FIELD, CATCH_CARRY, DRIVE_CATCH.
- Press and man: PRESS_MIRROR, PRESS_RELEASE, DB_SLOWPLAY.
- Pressure package: RUSH_PROMISE, MUG_PRESSURES, MUG_CALLS.
- Other: BLITZ_READ/DEPTH/SKILL, HONEST_READS, INFO_HONEST=63.

**Off:** MAN_PHASE, HONEST_FLIGHT, JUDGE_SEEN_BALL (but INFO_HONEST bit 1 covers it).

**BALL_EST=6145:** bit 256 (BALL_EST_MAN_LOOK) is off and defenders do not estimate the ball, so the in-phase man look never runs.

### How the coverage behind each pressure is set

- **fire_zone** (P:247): SS blitzes C, Will blitzes B, DE_W drops `curl_flat_w` with rule `c3_seam`. It has no `coverage` field, so the called Cover 3-family call stays.
  - CI:pressureIsInstallable:72-100 rejects calls whose deep zone the SS held (Cover 9 family, Cloud). It accepts Sky, Match, Seam, Buzz, Mable and Trips.
  - Seats left by the SS and Will are refilled from the call's `underneath` list by least total distance (A:1186-1216). In 2x2 Sky or Match the three under are: DE_W at curl_flat_w, then curl_flat_s and hook_s filled by NB/LB_M (or LB_S/LB_M in base), whichever is nearer each landmark. So the midpoint sits 5 yd strong of the ball, not in the middle. Against 3x1 the check to `cover3_trips` puts LB_M at hook_mid.
- **mug_fire** (P:308): `coverage: 'cover3'` replaces the called coverage with Sky (C:installCoverage:684-685), then the structure checks run.
- **mug_both** (P:314): replaces the called coverage with cover0.
- **zero_6** (P:275): Cover 0 only. PC:872-876 forces zero_6 (else mike_a) when cover0 is called without a pressure.
- Mug packages are drawn only from the mug table (PC:57, 950-961), never from the random blitz pool (PC:865).
- **Zone style:** it is set at PC:917 from the *coverage's* rules only. A dropper's `c3_seam` is ignored. Under a spot-style Sky call the DE becomes a plain spot dropper (AS:146-150).

### Table

| Call | Position | Cell | Coached rule [source; TC/VS] | Engine today [file:function:line] | Status |
|---|---|---|---|---|---|
| C1 (man-free, robber, double) | Press man CB | 1 | Press about head-up on #1. Leverage follows where the help is (post plus hole/robber means inside) [HNFL-034 "leverages relative to help"; MS §7, §7.1; TC] | Press depth 1.3 yd, shade -0.15 outside (A:alignDefense:1330-1339); `lev` defaults inside (D:ManCoverage.trackReceiver:1493) | M |
| C1 | Press man CB | 2 | Read the receiver's torso and near hip, not head and shoulders, through the release; eyes go to the QB only once in phase [MS §5.1; TC] | Head-up mirror while #1 is under 3 yd (PRESS_MIRROR, D:1472). Reads the seen velocity via RouteObservation; route read after a 0.35-0.7 s stable stem (D:1456-1460). Sight is occlusion-only, with no head cone (ZE header). | M (sight cheat unverified at this commit) |
| C1 | Press man CB | 3 | Carry vertical (stay on top / in phase); play every break; on crossers keep the called leverage through traffic [MS §7.2; TC] | Hips open when the cushion is consumed (1.8 + closing·flip) or on a crosser (D:1510-1513). Inside leverage is re-signed every tick as sign(ballY − receiver.y) (D:1467), so it flips as a crosser passes the ball. No mesh switch. | D |
| C1 | Press man CB | 4 | Not moved by the QB's pump or eyes; run is read on his man's block [MS §5; TC] | Not a zone-eyes player, so he does not key the arm (D:believesThrow:2551-2557). Run on his man's block leads to blockingSupport (D:coverMan:1399-1404). | M |
| C1 | Press man CB | 5 | In phase, look for the ball; out of phase, play the hands; then tackle [zone-coached-rules "in phase look and lean"; TC] | Hands cue within 3 yd (D:readsHandsAt:2572-2585). The in-phase look needs BALL_EST bit 256 plus estimating defenders, so it is off (D:2697). On a hands cue with an arm-only belief he falls into the zone shoulder break, toward the receiver the QB's shoulders point at (D:playBelievedBall:2717-2729). | D (look absent; shoulder-break path unverified in play) |
| C1 Off / Lurk | Off man CB | 1 | Off with inside leverage to the post (Off), or outside leverage because help is inside short and in the post (Lurk) [HNFL-240; MS §7; VS by call; our calls follow both] | Off depth 6 yd (A:1330). Lurk `lev:'outside'` (C:88-89) | M |
| C1 Off / Lurk | Off man CB | 2 | Preserve cushion on the stem, then hips and transition; decide when to bring the eyes to the QB [MS §5; TC] | OFF_PEDAL never comes forward at a climbing stem (D:1547-1550). CUSHION_NEED (D:1537-1540). | M |
| C1 Off / Lurk | Off man CB | 3 | Lurk: inside breaks go to the hole/lurk help (mesh is a possible switch; cut the shallow with leverage) [HNFL-240; TC] | No exchange: the man runs the whole crosser. Leverage flips at the ball (D:1467). | A |
| C1 Off / Lurk | Off man CB | 4 | Pass first. Slow-play a run read without losing cushion to play-action [MS §6; TC] | DB_SLOWPLAY: gives ground at a fraction of tempo; a sprint release cancels it (D:slowPlay:1423-1435) | M |
| C1 Off / Lurk | Off man CB | 5 | Break through the hands, then rally outside-in [TC] | As the press corner | M/D as above |
| C1 family | Nickel/slot man on #2 | 1 | Align on #2, by matchup; the nickel always takes #2 strong (Lurk) [HNFL-240; HNFL-034; TC] | NB `prefer S2,W2` (C:73). Presses when the call presses (A:1329). TIGHT_OFF backs him off a tight #2 (A:1385-1393). | M |
| C1 family | Nickel/slot man on #2 | 2 | Release read on #2, then carry; inside squeeze help short and deep [HNFL-240 strengths; TC] | Same ManCoverage as the corners | M |
| C1 family | Nickel/slot man on #2 | 3 | Mesh/shallow: "possible switch… original defender zones the hook" [HNFL-240; TC] | No switch; leverage flips at the ball (D:1467) | A |
| C1 family | Nickel/slot man on #2 | 4 | Play-action: secondary gaps assigned or big voids open behind LBs [HNFL-240 stressor; TC] | Pass-first for perimeter men (D:1398) | M |
| C1 family | Nickel/slot man on #2 | 5 | Hands / tackle | As the corners | M/D |
| C1, C0 | LB in man on B/TE | 1 | Over the back at depth; the HB's position decides who has him (offset to you = man; away = lurk; home = combo) [HNFL-240; MS §7.1; TC] | Fixed preference: LB_W on B, LB_S on S3 (C:76-78, 92). Depth 5 yd on a back, 4 on a TE (A:1330). No HB-side combo. | D |
| C1, C0 | LB in man on B/TE | 2 | Key the back's release; accept a late check-release [MS §7.2; TC] | Tracks the back from the snap; CUSHION_NEED squeezes a short release (D:1537) | M |
| C1, C0 | LB in man on B/TE | 3 | Back stays in: low hole / green-dog / lurk; "both LBs cannot robot into the hole" [MS §7.1; HNFL-210 TRAIN; TC] | Keeps trackReceiver on a blocking back on a pass read (D:coverMan:1389-1410). No conversion. | A |
| C1, C0 | LB in man on B/TE | 4 | Run read through the back's path; play-action costs [TC] | Keyed fit when the back is seen carrying (D:1369-1380) | M |
| C1, C0 | LB in man on B/TE | 5 | Tackle the back after the catch | Common catch and pursuit path | M |
| C1 all | Free safety (deep middle) | 1 | Middle third, about 14-15 yd. Key 3-2-1 inside-out for deep threats [HNFL-209, -240, -292 "Middle 1/3 key 3-2-1"; TC] | 14.7 yd, shaded 0.34 toward the ball (A:1063). Landmark 15 yd (A:787). Eyes key S2, else W2, for 0.9 s, then the QB (ZE:keyRefs:49). | D (single #2 key, not 3-2-1 inside-out) |
| C1 all | Free safety | 2 | Top-down, inside-out, vision and squeeze; deeper than the deepest; don't lock on #2 and miss the #3 bender [HNFL-240; MS §5; zone-coached-rules; TC] | Threats are the routes in a fixed band [W/3−3, 2W/3+3] (D:zoneBand:2395), not hash- or ball-relative. Vertical test re-run every tick (ZONE_HOLD bit 1 off). Deepest climber, then depth over him by safetyOver (D:2047-2052). | D (band, no inside-out priority) |
| C1 all | Free safety | 3 | One vertical: over the top, inside shoulder. Two: midpoint, then squeeze to the QB's eyes. A stopped or in-breaking deepest route: do not drive on every in-breaker; hold for the throw [MS §7; HNFL-064 "post helps top-down"; zone-coached-rules "single-high deep players hold until the throw"; VS: some staffs let the post rob a dig with no vertical; our C1 notes do not ask for it] | Over the inside shoulder (D:2038-2040). Midpoint weighted 0.65/0.35 by the *seen* QB eyes (D:2034-2037; SEEN_EYES, the old hidden-information flag is resolved). **Deep-drive pre-throw on a stopped deepest route** (vel < 3, under landmark + 1, depth over 6) unless another climber is within 8 yd laterally. Match style, which man calls default to (D:2018-2029; AS:146). | D |
| C1 all | Free safety | 4 | Must not bite on a pump or the QB's first look; may come downhill only on the throw. Run: fit late, inside-out alley, with play-action respect [zone-coached-rules "break only on the release, never a pump"; MS §6; TC] | Zone-eyes player keys the arm (D:believesThrow:2554). Load leads to an arm-bite plant (stopDrop of his drop, D:2715). Arm "through" (a pump is one, RB:9) leads, after reaction, to a **shoulder-break runThrough downhill** at 0.9 speed until "pulled" is seen (D:playBelievedBall:2717-2729). No deep gate. Run: own recognition read leads to runFit (D:1845). | D |
| C1 all | Free safety | 5 | Break, arrive under control, tackle; last line: keep the carrier in front, take a cutoff angle [zone-coached-rules Rally; TC] | Full-speed drive to the catch point with a fixed control speed (D:flightApproach:2885-2891). ARRIVE_LEAD is underneath-only (D:2875). After the catch, chase onTop drops once passed by 0.8 yd (OF:35, 75). No last-line mode. | D / A |
| cover1 (LB_M), cover1_robber (SS) | Robber (high hole) | 1 | High hole about 10-12 yd over the ball, from depth (SS) or as a backer [HNFL-209; TC] | 11 yd over the ball (A:817-818). Band ±8, radius 6.5 (D:2427, 1785). | M |
| cover1, cover1_robber | Robber | 2 | Read #2 to #3 (crossers, dig), then the QB; rob the planned window [MS §7; VS: HNFL-209 just "high hole"; others read #3/QB eyes; our note "rob digs and curls" (C:145) is the window version] | Eyes: S3 else S2 (strong side only) for 0.9 s, then the QB (ZE:46). Rule `robber` = plain zoneOf (R:877). cover1 LB_M has no rule (C:77). | D |
| cover1, cover1_robber | Robber | 3 | #3 crosser or dig: jump the window. #2/#3 vertical: wall, then hand off. Stop: squeeze [MS §7; TC] | Generic match underneath: carry a vertical within 6 yd of the landmark to 13 yd (D:2154-2173), else the lane of the nearest threat (D:2206-2303). The Rob technique (T:142) is never used by the robber. | D |
| cover1, cover1_robber | Robber | 4 | Read run or pass first; then may come downhill on the QB's eyes or arm (that is his job), not on a pump [TC] | LB robber: box read step until pass (D:1853-1912). Plants on the throwing motion (D:underneathPlant:2472). Shoulder break on the arm-through (D:2717). Pump: plants, and restarts on the pull-down (RB). | M |
| cover1, cover1_robber | Robber | 5 | Drive on the catch, tackle the in-breaker | ARRIVE_LEAD upfield shoulder (D:2875-2881) | M |
| C1 Off / Robber / Banjo / Lurk | Hole / rat / lurk player | 1 | Low hole about 5-6 yd. Lurk: Mike/Dime back-or-hook by where the HB sets [HNFL-209, -240; TC] | `hole` 6 yd over the ball (A:819). Lurk LB_M hole+rat, LB_W man on B, static (C:92-93). | D (Lurk static) |
| C1 family | Hole/rat/lurk | 2 | Eyes on #3/back then the QB; vision and squeeze [HNFL-240; TC] | Eyes S3, S2, then the QB (ZE:46) | M |
| C1 family | Hole/rat/lurk | 3 | Cut the first shallow with leverage; the mesh's second crosser is defined (switch); robot to the dig [HNFL-240; MS §21.3; TC] | `rat` cut: an under at 7 yd or less, within 8 yd and moving toward the hole, is carried until across (R:cut:221-256, R:876). Second crosser: nobody. | D |
| C1 family | Hole/rat/lurk | 4 | Run/pass read, then break on the QB [TC] | Box read step plus underneath plant | M |
| C1 family | Hole/rat/lurk | 5 | Tackle the shallow catch | ARRIVE_LEAD | M |
| C1 (bunch check) | Banjo pair (CB_S out, SS in; NB locks the point) | 1 | Point locked, outside and inside defenders banjo #1/#3 by release [HNFL-074 Mini Fist, HNFL-209 "multiple core threats… banjo"; VS: HNFL-240 says Lurk vs bunch "No In & Out", play leverage on the first break] | cover1, Off, Robber **and Lurk** check to cover1_banjo (C:81, 96, 141, 158) | M for C1; **D for Lurk** (contradicts HNFL-240) |
| C1 banjo | Banjo pair | 2 | Declare phase about 3 steps / 5 yd, then lock [zone-coached-rules match-rule declare; TC] | readRelease until both declare. Vertical counts only past 5 yd; each release needs CONFIRM 0.12 s·(1.6−0.6·focus) (R:banjo:819-835; RD:58, 120). | M (lock waits for the slower declare) |
| C1 banjo | Banjo pair | 3 | Outside takes the first out (corner route included), inside takes the other; call "in/out" [HNFL-074; TC] | first(isOut), else the other of first(isIn), else #1 (R:827). Corner classed as out (RD:111). **cover1_banjo is `man:false`** (C:115), so CUT_WALL passUnder turns the inside man's shallow under (7 yd or less) into crossWall, then zone curl_flat_s (DF:passUnder:148-165). | D |
| C1 banjo | Banjo pair | 4 | Not moved by the QB | CoverageDefender man subs are zone-eyes under OPEN_CARRY (DF:65-67), so they key the arm | D (minor) |
| C1 banjo | Banjo pair | 5 | Play the hands, tackle | Man path | M |
| cover1_double | SS + CB_W bracket | 1-3 | Safety doubles a tagged threat; in/out (or high/low) allocation [HNFL-207 "1 DBL"; MS §7; TC] | Two independent ManCoverages (inside/outside) on W1, both follow every break (C:166-168). No bracket hand-off. | D (no freed defender) |
| C0 (cover0, zero_6, mug_both) | Man CB, no deep help | 1 | No deep help: leverage follows help, so with none, play the whole route and stay on top [MS §2.3/§7; HNFL-034; VS: much zero-blitz teaching presses inside to deny the hot/slant because the rush is coming (unverified source)] | cover0 press, default inside 0.7 yd (C:51-64; D:1493). **Our version is closer to the press-inside teaching.** | M (to press-inside) |
| C0 | Man CB | 2 | Read the man; no QB [TC] | Same as C1 | M |
| C0 | Man CB | 3 | Same rules as C1, but no post: never concede inside; nobody over the top [MS §7; TC] | The technique is identical to C1. Help is not modelled for pure man calls (breakOn/help only when !coverage.man, D:1508). Same hip trigger and press cushion 0.8 (D:1498). | D (no "no help" adjustment) |
| C0 | Man CB | 4 | No pump bite [TC] | No arm key for man (D:2551-2557) | M |
| C0 | Man CB | 5 | Through the hands; he is the last tackler | Hands cue; no in-phase look; open-field exit at 0.8 yd past (OF:35) | D |
| C0 | Extra rushers / no deep help | 1-3 | 6-7 man charge. "TRAIN": any rusher takes the HB if he releases through his lane. Dog/Cat/Blitz [HNFL-210; MS §7 "who owns the back if he stays/releases"; TC] | zero_6: LB_M A and LB_W B as Blitzers (P:275). Blitzer goes gap, then QB; no peel/hug on a back release (D:Blitzer.update:749-775). Man on the back keeps tracking a blocking back (D:1389-1410). | A |
| C0 | Extra rushers | 4-5 | Peel to the ball on the throw | Plays the throw on an acquired flight (D:766-770) | M |
| fire_zone / mug_fire | Corners, Tight 1/3 | 1 | Press-bail or off about 7 yd, outside; key #1 (then #2) [HNFL-278, -065, -064; TC] | One-high, off 7 yd, 0.8 outside (A:994, 1022) | M |
| fire_zone / mug_fire | Corners | 2 | Man #1 unless he goes shallow across the no-cover zone; "In" call, zone the third, find #2 as the new #1 [HNFL-064, -065, -292; TC] | Match calls: c3_corner, man #1 over-top outside unless shallow; In and China zone-off (R:c3Corner:166-171, zoneOffOne:111-141). Sky (mug_fire always, fire_zone sometimes): plain deep_third preferring owned #1 (D:1988-1996). | M (match) / D (Sky: zone, not man #1) |
| fire_zone / mug_fire | Corners | 3 | In call: pattern read the third; China is a separate call [HNFL-065; TC] | China also zones off on a short stop or out (R:140). Judgment can "rob" a stopped short route pre-throw (J:decide:72-81). Sky corner deep-drives a stopped deepest (D:2018-2029). | D |
| fire_zone / mug_fire | Corners | 4 | Not moved by the QB | Sky deep_third is a ZoneCoverage, so he bites on the arm (D:2698-2731). The c3_corner carry (protectDepth, not zone-eyes) does not. | D (Sky) |
| fire_zone / mug_fire | Corners | 5 | Over the top, then rally | Full-speed catch-point drive; no last-line mode | D |
| fire_zone / mug_fire | Deep middle safety | 1-2 | "Post: key inside-out for vertical threats, top-down, vision and squeeze; protect the post" [HNFL-064, -278; TC] | FS deep_mid, as the C1 free safety | D (as C1 FS) |
| fire_zone / mug_fire | Deep middle safety | 3 | Corners own #1, apexes carry #2, midpoint carries #3; the post helps top-down [HNFL-064 vertical rules; TC] | Same deep-drive and band logic | D |
| fire_zone / mug_fire | Deep middle safety | 4 | No pump bite | Arm-bite plant and shoulder break, no deep gate (D:2698-2731) | D |
| fire_zone / mug_fire | Deep middle safety | 5 | Last line | No last-line mode | D |
| fire_zone / mug_fire | Seam/flat: dropping DE_W (and strong apex NB/SS) | 1 | Apex aligns relative to #2 (squeeze or heads). Dropping end: seam/hot landmark under #2 [HNFL-065 "zone alignment"; HNFL-292 Bonus hook; Brophy/Diaz (unverified); VS: HNFL uses an apex, zone-blitz teaching a dropping end; ours is the end version] | DE on the line drops to curl_flat_w: 8.5 yd, about 12 yd from the ball, not #2-relative (A:809-810, P:250). He is a zone player with an edge run fit plus an inside option (RF:85-99). | D (landmark) |
| fire_zone / mug_fire | Seam/flat | 2 | Key #2 then #3 (2-3); declare in about 3 steps [HNFL-278, -292; TC] | Eyes #2 then #1 for 0.9 s (ZE:44). Reads #2 (the back if there is no #2), #3 for Push, #1 for Smash (R:seamCurlFlat:180-218). | M |
| fire_zone / mug_fire | Seam/flat | 3 | Match-carry-deliver: match the out, carry the seam, deliver the in/under to the midpoint. #3 away: take #2 across (no delivery). Fast #3 to the flat: Push [HNFL-065, -278, -064; TC] | c3_seam carries #2 vertical without limit (R:845; no deliver: M for #3 away). **Out/flat: zones off** (R:216-217); flat-expand only with no #3 on the side (D:2235). **In/under: always zones off, crossWall then release** (DF:passUnder) even with #3 away. Push: he takes #3 (R:193-196). Only the strong-side c3_hook takes #2 on a Push (R:c3Hook:285-300), so on the weak DE side #2's seam is nobody's. | D |
| fire_zone / mug_fire | Seam/flat | 4 | The run fits the edge; the QB's arm breaks him; must not run with the flat past the curl [MS §21.4; TC] | Run: edge fit (RF:85-99). Plant on motion and shoulder break (D:2472, 2717). **Spot-style Sky call: no rule, so a plain spot dropper sinks to 11 yd** (PC:917; AS:146-150; D:1788-1792). | D (spot case) |
| fire_zone / mug_fire | Seam/flat | 5 | Flat defender forces outside-in [zone-coached-rules; TC] | ARRIVE_LEAD upfield shoulder. Force by field position only (backlog B9). | D |
| fire_zone | Midpoint (#3 receiver hook, LB_M) | 1 | In the middle, relative to #3 [HNFL-065, -064; TC] | hook_s, 5 yd strong of the ball at 10 yd, in 2x2 Sky/Match (A:811-812; seat order C:252/274). hook_mid vs trips (cover3_trips). | D (2x2) |
| fire_zone | Midpoint | 2 | Key 3-2-1; relate to the final #3 [HNFL-292, -278; TC] | Eyes on #3 strong, then #2 (ZE:45). c3_hook reads ref #3 or the released back (R:286). Numbering never updates after the snap (RD:75). | D (final #3) |
| fire_zone | Midpoint | 3 | #3 vertical: carry up and over. Fast #3: Push to #2. Crosser: relate or deliver. "#2 vertical means the midpoint must take #3 to the flat" (stressor) [HNFL-064; VS inside HNFL-064 (Push vs take #3 flat); ours is Push] | c3_hook carries #3 to 15 yd, Push to #2 under 12/15 yd, CUT_WALL crossers (R:285-300, 259-282). Sky: generic hook lane. | M (match) / D (Sky) |
| fire_zone | Midpoint | 4 | Box read, then drop; break on the QB | Box read step, plant, shoulder break | M |
| fire_zone | Midpoint | 5 | Rally inside-out | ARRIVE_LEAD | M |
| fire_zone / mug_fire | Three under, hot rules | 3-4 | The dropper to the blitz side takes away the hot window (overdrop #3, wall #2's quick inside route). Underneath landmarks reached by the QB's set [HNFL-292 Bonus hook; MS §17 "replacement clock"; Brophy/Diaz/AFQ (unverified); TC] | No hot concept for defenders (HOT_LOOK is the QB's). Drops are to fixed landmarks, ZONE_SETTLE plants on the set (D:1954-1964), SETTLE_DEPTH sinks him back to depth. | A |

### D and A items ranked by consequence

1. **The deep man bites on pumps and shoulder-breaks downhill with no deep gate.** **L1**, also L2.
   - Who: the Cover 1 free safety, the fire-zone middle safety, and Sky deep-third corners.
   - Where: D:playBelievedBall:2698-2731, entered from ZoneCoverage.updateCore:1833. RB:9 says a pump counts as a "through".
2. **Pre-throw deep-drive on a stopped deepest route** (D:ZoneCoverage.zonePlay:2018-2029). **L1 and L2.**
   - It fires when no other climber is within 8 yd laterally of *him*. It is the default for match style, which man calls fall into (AS:146).
   - The same applies to fire-zone and Sky deep thirds. The c3_corner judgment can also "rob" a stopped short route pre-throw (J:72-81).
3. **No last-line mode after a pass-by, and a full-speed catch-point drive for deep defenders.** **L2**, also L1.
   - OF:35/75 drops the on-top approach once he is passed by 0.8 yd.
   - D:flightApproach:2885-2891 drives to the catch point at full speed; ARRIVE_LEAD is underneath-only (D:2875).
4. **Fire-zone seam/flat is not match-carry-deliver.** **L3**; the Push gap also feeds L2.
   - #2 out is zoned instead of matched (R:216-217).
   - #2 in/under is always delivered, even with #3 away (DF:passUnder:148-165).
   - A weak-side Push sends the DE to #3 and leaves #2's seam unowned, because only strong-side c3_hook pushes (R:193-196 vs R:285-300).
5. **Cover 1 banjo's inside man walls and then drops a shallow #3 crosser**, because cover1_banjo is `man:false` and passUnder is not exempt for banjo (C:115; DF:149). **L3.**
6. **Spot-style Sky under fire_zone turns the DE into a plain 11-yd spot dropper.** The dropper rule is ignored (PC:917; AS:146-150). **L3.**
7. **Man leverage flips sides at the ball on crossers (D:1467), with no mesh switch anywhere outside banjo.** **L3.**
8. **The robber has no rule** (R:877; cover1 LB_M C:77). Eyes are on strong #3/#2 only (ZE:46), the Rob technique is unused, and the dig/crosser window goes unrobbed. **L3.**
9. **A man on a blocking back never converts** to hole, green-dog or lurk (D:1389-1410). The Lurk HB-side combo is static (C:92-93) and the rat's second crosser is nobody's (R:cut). **L3.**
10. **Fire-zone landmarks.** The DE's landmark is ball/sideline-relative, not #2-relative (A:809), and the 2x2 midpoint sits at hook_s instead of the middle (A:1189 seat order). There is no hot-window rule for the three under (absent). **L3.**
11. **Cover 1 FS reads too narrowly.** His key is S2 only, not inside-out 3-2-1 (ZE:49). His band is fixed to the field's middle third (D:2395), and ZONE_HOLD bit 1 is off. **L2.**
12. **Lurk checks to In & Out banjo vs bunch** (C:96), contradicting HNFL-240 "No In & Out". **L3.**
13. **Cover 0 has no technique change for "no help"** (D:1508 gates help on zone calls), no TRAIN peel for blitzers (D:749-775), and no hug or green-dog. This is structurally L2, an indirect feed; the after-catch is decided by the man alone.
14. **No in-phase man look by default** (BALL_EST bit 256 off, D:2697). A man defender with an arm-only belief and a hands cue runs the zone shoulder break, toward a receiver that may not be his man (D:2717-2729). The frequency of that path is unverified. **L3** if it happens.
15. **Cover 1 Double has no bracket hand-off** (C:166-168). This one does not feed L1-L3 directly.

### Changed since the 0d0f4af8 audit

- **Fixed:**
  - The hidden `sim.qbEyes` read is gone: SEEN_EYES is on, D:seenQbEyes:161.
  - Wall, Rob and Trap now continue on an arm-only throw belief (TECH_CONT, T:21-46), instead of coasting until they see the ball.
  - ZONE_EYES adds a head key sequence.
  - CUT_WALL hands crossers off.
  - SAFETY_DEPTH holds depth over routes, but the deep-drive branch runs before it.
- **Still open:** the deep-drive (old #6), robber with no rule (#4), the man leverage flip and missing mesh switch (#2), the static Lurk back assignment (#9), and the Lurk-vs-bunch banjo contradiction.

### Unverified

- How man defenders' sight is limited at c85e6b9d. I rely on the ZE header's statement that it is occlusion-only.
- How often the man hands-cue shoulder-break path (item 14) occurs in play.
- The exact wording of the Brophy/Diaz, AFQ and Bowen sources, which are not in the repo.
- The press-inside Cover 0 teaching used as the second side of the VS in the Cover 0 row.

## Cover 2 family: per-position coaching spec and engine audit (develop c85e6b9d, engine-77)

I changed no files. Line numbers are from c85e6b9d. Paths are relative to /home/user/fb-fvs.

The HNFL texts are machine OCR, so their depths and wording carry an OCR caveat. Tags:
- **TC**: taught consistently.
- **VS**: varies by staff. Where two sources disagree, both are given with which one our playbook is closer to.
- **CR**: docs/reviews/2026-11-17-zone-coached-rules.md, with the source it names.
- **MS**: Coverage_Operating_System_Manuscript.md.

Engine status: **M** matches, **D** differs, **A** absent.

#### 0. Wiring and what changed since the old audit (0d0f4af8)

**Wiring is unchanged** (src/playbook/coverages.ts):

| Call | Lines | Corners | Safeties | Underneath |
|---|---|---|---|---|
| `cover2` | 362-371 | unruled | unruled | unruled |
| `cover2_match` | 373-383 | `sink_corner` | unruled | `c2_hook` ×2, `mike_3` |
| `cover2_wild` | 385-394 | `sink_corner` | unruled | `c2_hook` ×2, `vertical_hook` |
| `cover2_invert` | 396-405 | `deep_half` at 7 yd | `cloud_corner` (sink=false) at 10 yd | `c2_hook` ×2, `mike_3` |
| `tampa2` | 407-417 | `sink_corner` | unruled | Mike `tampa_mid`+`tampa_mike`; `c2_hook` ×2 |
| `deuce` | 423-433 | `palms_corner` | `palms_safety` | `q_apex` ×2 in the curl_flat seats |
| `deuce_dot` | 435-444 | S `palms_corner`, W `sink_corner` | SS `palms_safety`, FS unruled | `q_apex`, `bonus_hook` |
| `cover2man` | 177-191 | trail man | `deep_half` with no rule | man |

- **Unruled seats and match style.** Unruled seats become a plain `ZoneCoverage` (src/sim/assign.ts:143-151). Any call with a rule is forced to match (src/game/playcaller.ts:912-918). Man calls have no `zoneStyle`, so the 2-Man safeties' ZoneCoverage defaults to `'match'` (defense.ts:1787).
- **Curl-flat seats stay empty with seven droppers** (alignment.ts:1186-1215, unchanged).
- **The Deuce pressure drops no lineman.** It is the Mike through the A gap with five rushers (src/playbook/defense.ts:284-285). The only lineman droppers in the file are behind Cover 3/4 or base `cover2` (`mug_sim`, :301-303).
- **`invert_safety` (rules.ts:837-839) is still unused.**

**Fixed or changed since 0d0f4af8.** Every flag below is on by default and in config/reference-stack.json:
- **The QB's hidden read is gone.** `SEEN_EYES`, `QB_BODY_SEEN` and `INFO_HONEST`=63 bits 8/9 mean the zone lean, split and pick use the receiver the defender sees the QB looking at (`seenQbEyes` defense.ts:161-191, used at :1922, 2036, 2212, 2264). The old audit's hidden `sim.qbEyes` flag is closed.
- **`SAFETY_DEPTH`.** A half safety now sits 13.4−0.5r yd over the deepest route he sees, holds that depth over a stopped route, and never goes shallower than his landmark (`safetyOver` :1694-1697; `ZoneCoverage.zonePlay` :2047-2052). This is "deeper than the deepest" (M).
- **`CUSHION_BREAK`, `CARRY_POSTURE`, `CARRY_TURN`.** A seen cushion break turns him and he carries half-open (:2057-2110).
- **`ZONE_EYES` (engine-77).** The head follows a taught sequence: halves #1→#2, flat corner #2→#1, hooks #3→#2, `tampa_mid` S2 then W2. The sequence lasts 0.9 s (`ZONE_EYES_KEY`=9; zone-eyes.ts:25, 41-66). This is a sight bound only; no decision logic reads it.
- **`TECH_CONT`.** Wall, Trap, Rob and CrossWall keep their technique on an arm-only read (techniques.ts:21-25, 43).
- **`ARM_BREAK`=1.** One reaction after the delivery sample (defense.ts:2747-2753, 2721).
- **`CUT_WALL`.** Hooks wall a crosser shallower than 7 yd from their own area and pass him on (rules.ts:259-281; defender.ts `passUnder` 148-164).
- **`ZONE_HOLD`=114.** The eyes, pick, lean and hand-off holds are on; the band hold (bit 1) is off.

**Not fixed.** Every rule-level item in the old audit stands:
- `cloudCorner` flat lock, and the flat check running before the man-under check.
- `verticalCurl` zones off on an 'out' read.
- `tampaMike` re-picks the nearest seam each tick.
- `mike3` keys only the back.
- The halves have no #1→#2 ownership.
- The 12 yd wall hand-off.
- There is no reroute anywhere.

#### 1. Per-position table

| Call | Position | Cell | Coached rule [source; TC/VS] | Engine today [file:function:line] | Status |
|---|---|---|---|---|---|
| C2 Match / Wild | Squat corner | 1 | Squat at 5–7 yd, ~1 yd outside #1. Key #2/#3 (Wild key 3-2-1). Primary run force [HNFL-099, 334, 130; TC] | Aligns 4 yd deep, 0.5 yd outside (alignment.ts:zoneSpot:873). Eyes on #2 then #1 for 0.9 s (zone-eyes.ts:keyRefs:45). Force (run-fits.ts:136-160) | D (depth) / M (key, force) |
| C2 Match / Wild | Squat corner | 2 | Collide #1 on two shuffles and funnel him inside. Open ass-to-sideline and gain depth while seeing #2/#3 declare [HNFL-099; TC] | No reroute anywhere. Before any declaration he plays the generic flat-zone lane at the 4 yd landmark (rules.ts:cloudCorner:499 → defense.ts:zonePlay:2206-2303) | A (reroute) / D (no sink) |
| C2 Match / Wild | Squat corner | 3 | Flat threat: top-down the flat and keep depth vs high/low ("the ball brings you flat"). No flat threat: man under final #1, top-down any high/low and squeeze the hole shot. Wheel: chase it. Buster variant: Smash = zone off, fall off on #2's sail [HNFL-099/255, 334; Buster HNFL-071; VS, ours is Wild] | Flat threat (flat, or out < 6 yd) locks `mode='flat'` forever (rules.ts:cloudCorner:482-486). No flat after #2/#3 declare: man(#1, outside, trail) (:492-498). The flat check runs first, so a late flat pulls him off #1. No high/low rule. The wheel never unlocks | D |
| C2 Match / Wild | Squat corner | 4 | Only the ball brings him down. Not a route hint, and not the QB set [HNFL-099; TC] | In flat mode the lane target drives him to the flat route's depth (defense.ts:2268). `ZONE_SETTLE` plants him at his depth once the QB sets (:1954-1964). A pump that comes through brings an arm-bite plant or a shoulder break (:playBelievedBall:2698-2730) | D |
| C2 Match / Wild | Squat corner | 5 | On the throw, plant and attack the catch point. Force outside-in; tackle on first contact [HNFL-099; CR shared] | Flat mode: zone eyes, arm read, shoulder break (:2717-2730). Man-under mode: reacts to the hands or the ball (:believesThrow:2558-2566). Force fit (run-fits.ts:507-530) | M |
| Cover 2 (Cloud) | Cloud corner | 1 | Cloud alignment, funnel #1 in, primary force [HNFL-130, 070; MS §8; TC] | Same 4 yd flat spot. Unruled `flat_*` (coverages.ts:365-366). Force | D (depth) |
| Cover 2 (Cloud) | Cloud corner | 2 | Reroute, then get to the spot with vision to the QB, feeling routes [HNFL-070; TC] | Spot style: sprints to the spot (5.5 yd) and settles (defense.ts:spotUnderneath:2312-2359). Match style: generic flat lane | D (no reroute) |
| Cover 2 (Cloud) | Cloud corner | 3 | "Fade-to-flat": sink only until deep help calls him off, then take the first outside threat [HNFL-130, 070; MS §8.1; VS: spot rallies to the first threat, Sink waits] | Spot: settles at 5.5 yd and leans to the seen eyes. Match: lane of the threat nearest the 4 yd landmark. Red-zone-only sink under #1 (:2116-2133) | D |
| Cover 2 (Cloud) | Cloud corner | 4 | Moves on the QB's cue only [HNFL-070; TC] | Leans to the seen eyes (:2333-2349). `SHOULDER_READ` plants him on a seen motion (:2472-2499) | M |
| Cover 2 (Cloud) | Cloud corner | 5 | Break to the catch point; force [HNFL-070; TC] | Shoulder break or flight; force fit | M |
| Tampa 2 | Corner | 1 | Tampa: "Smash" alignment, #1 inside-out [HNFL-028, 291]. HNFL-241 (2026 Ravens): "Squat", reroute and funnel #1 in [VS; ours is closer to 241] | Same `sink_corner` and 4 yd spot (coverages.ts:410-411) | D |
| Tampa 2 | Corner | 2 | Reroute, then flip the hips to get vision back to the QB (a vision technique) [HNFL-241; TC within Tampa] | Key-and-match rule with no vision phase (rules.ts:cloudCorner) | D |
| Tampa 2 | Corner | 3 | Sink until the ball brings him down; flat by vision [HNFL-241] | Flat lock, or man-under on #1 with man eyes (rules.ts:494-498) | D |
| Tampa 2 | Corner | 4 | The QB/ball only [HNFL-241] | As the squat corner | D |
| Tampa 2 | Corner | 5 | Break; force [HNFL-241] | As the squat corner | M |
| C2 Match / Wild / Cover 2 | Half safety | 1 | Halves alignment 14+ yd. Key #1→#2. Deep ½ landmark ~1 yd inside the top of the numbers at ~20–22 yd (OCR) [HNFL-334, 291; TC on the key, VS on the landmark] | Aligns 14 yd at ±6.9 yd plus ball follow (alignment.ts:1053-1058). Landmark 15 yd, 13.5 yd from the sideline (:791-794). Eyes on #1 then #2 for 0.9 s (zone-eyes.ts:47) | M (key eyes) / D (landmark) |
| C2 Match / Wild / Cover 2 | Half safety | 2 | See #1's release to set width; then #2. Declare over ~3 steps [HNFL-334; CR shared] | No numbering. Candidates are any non-lineman projected 0.7 s into a band from 3 yd past mid-field to the sideline, deeper than 7 yd or climbing. Deepest re-picked each tick (defense.ts:zonePlay:1966-1976, 2012; zoneBand:2399-2402). Quarters and thirds own by number (:1988-1996); halves are excluded | D |
| C2 Match / Wild / Cover 2 | Half safety | 3 | #1 vertical: widen and see #2. Both vertical: vision & squeeze, midpoint, deeper than the deepest and widest. Either cancels: cap the other; #1 cancels: deflate #2 top-down [HNFL-334, 071 "split & squeeze"; CR Bowen; TC on midpoint, VS: Cloud and Tampa "vision & break" lean to the QB; our Match/Wild is closer to midpoint] | Two candidates: midpoint weighted 0.35/0.5/0.65 toward the receiver he sees the QB look at (:2034-2037). One: a shoulder inside him (:2038-2040). Depth 13.4−0.5r over the deepest (:2047-2052, M). A #2 post leaving the band passes to the other safety by geometry | D (eyes lean, no ownership) / M (depth) |
| C2 Match / Wild / Cover 2 | Half safety | 4 | Cover 2 deep players hold until the throw. Never move on a pump; read through #2 and do not stare at the QB early. Downhill only on the release [CR shared: Bowen, Saban Rip/Liz; HNFL-070] | (a) Pre-throw "deep-drive" on a stopped deepest route shallower than 16 yd when nothing else is climbing within 8 yd laterally (match style; every ruled C2/Tampa/Wild call, :2020-2028). (b) An arm-only belief plants him (`stopDrop`, :2715). A seen "through", including a pump (release-belief.ts:9-10, 58-62), fires the shoulder break: `runThrough` at 0.9 to the receiver the shoulders point at (:2717-2730). Neither is gated for deep | D |
| C2 Match / Wild / Cover 2 | Half safety | 5 | Break on the release to the catch point from over the top. Alley inside-out vs run; deeper angles in rally [HNFL-070; CR shared] | Ball phase via the shared playBelievedBall. Alley fit with `SAFETY_TEMPO` (run-fits.ts:479-503). Deep-help judgment (judgment.ts:CoverageJudgment.decide:29-85) is not available to unruled halves | M (alley) / D (no judgment) |
| Wild (3x1) | Backside half | 1–3 | "Wide ½": ~3 yd outside the numbers, essentially a cloud rotation over X, because the vertical hook carries #3 [HNFL-291, 068; VS] | Generic `deep_half_w`. The band reaches 3 yd onto the strong side, so trips #3 can enter it (zoneBand:2401-2402) | D |
| Tampa 2 | Tampa ½ safety | 1 | Wider landmark than Cover 2 [HNFL-241, 028; TC within Tampa] | Same 15 yd / 13.5 yd landmark and the same band (alignment.ts:791-794) | D |
| Tampa 2 | Tampa ½ safety | 2 | See #1's release to set width [HNFL-241] | As the C2 half: no key | D |
| Tampa 2 | Tampa ½ safety | 3 | Vision & squeeze threats outside-in; the Mike owns the post and seam [HNFL-241, 028] | The band still reaches 3 yd past the middle, so he splits #1 with the seam the Mike carries | D |
| Tampa 2 | Tampa ½ safety | 4 | Vision & break: the QB's cue, never a pump [HNFL-241; CR] | Same deep-drive, arm-bite and shoulder break as above | D |
| Tampa 2 | Tampa ½ safety | 5 | Break; alley | As above | M |
| Inverted C2 | Corner (half) | 1–5 | Corners bail to the halves from a soft look; half rules after that [MS §8; single source] | `deep_half` with alignment depth 7 (coverages.ts:399-400), generic half logic. `SAFETY_DEPTH` is off below 9 yd, so the normal cushion applies (:2047) | D (inherits the half-safety D items) |
| Inverted C2 | Safety (cloud) | 1–5 | Rotate down to cloud/curl-flat and wall #2 for the bailing corner [MS §8; single source] | `cloud_corner` sink=false at 10 yd: a flat zone, never sinks, never walls #2. `invert_safety` = `wallTwo(12)` exists but is unused (rules.ts:837-839) | D |
| C2 Match / Wild / Inverted | Apex hook (vertical curl) | 1 | Wall alignment inside #2. Key #2→#1, aware of #3 [HNFL-334, 291, 068; TC] | Nickel aligns 4.5 yd deep, 0.5 yd inside #2 (alignment.ts:871-877, 1029-1037). Seat landmark is the ball ±5 at 10 yd (:811-814). Eyes on #3 then #2 (zone-eyes.ts:46) | M (align) / D (eyes on #3 first in trips) |
| C2 Match / Wild / Inverted | Apex hook | 2 | Declare #2's release, about a 3-step / 5 yd phase [CR shared] | Commits on the first believed class after 0.12–0.19 s (reads.ts:58, 111-124; rules.ts:verticalCurl:617; wallTwo:366-371). No depth gate on 'in' or 'out' | D |
| C2 Match / Wild / Inverted | Apex hook | 3 | #2 vertical: wall and match up and in, hand off with safety help. #2 in: match. #2 flat: zone the curl, wall off the new #2. #2 corner with no #1 vertical: undercut it, the SS is over (HNFL-015). #2 under: wall and pass [HNFL-334, 097, 015; CR Clark; TC] | Vertical: `Wall` to a fixed 12 yd, then hook zone (rules.ts:wallTwo:361-373, verticalCurl:621). In < 14 yd: man inside (:617-619). **'out' or 'flat': zones off to the hook landmark (:371)**; corner not undercut. Under: CrossWall pass (:259-281) | D (out, flat, 12 yd hand-off) / M (vertical, in, under) |
| C2 Match / Wild / Inverted | Apex hook | 4 | Moves on #2's release and then the QB's body. Plant on the load, break on the arm [CR shared] | Wall stays square to the QB as he sees him (techniques.ts:Wall:127). `TECH_CONT` keeps the wall through an arm read (:43). `SHOULDER_READ` plant (defense.ts:1836) | M |
| C2 Match / Wild / Inverted | Apex hook | 5 | Break full speed; hooks pursue inside-out [CR shared] | Shoulder break or flight; ARRIVE_LEAD for underneath (defense.ts:211-216) | M |
| C2 Match / Inverted | Middle hook (mike_3) | 1–2 | Key #3→#2→#1; wall the *final* #3 [HNFL-334, 097; TC] | Keys only the back `B` (rules.ts:mike3:304-312). Eyes on S3 then S2 (zone-eyes.ts:47) | D |
| C2 Match / Inverted | Middle hook | 3 | #3 vertical, angle or under: wall and carry. #3 to the flat: zone the hook and find #1's dig inside [HNFL-334] | Man on the back to 15 yd, then zone. `cut`/CrossWall, otherwise the hook_mid lane (:306-311) | D (a TE or slot #3 is never keyed) |
| C2 Match / Inverted | Middle hook | 4–5 | As the hooks | As the hooks | M |
| Wild | Vertical hook | 1–3 | 3x1: carry #3 vertical up the middle between the halves, with minimal help [HNFL-334, 028, 291; TC] | #3 vertical ≥3 yd: man(S3, inside, trail) to 18 yd, otherwise `mike3` (rules.ts:verticalHook:628-639). S3 is the alignment numbering, not rebuilt after motion | M |
| Wild | Vertical hook | 4–5 | Eyes through #3 to the QB; break | Man-trail eyes in the carry; zone eyes otherwise | M |
| Tampa 2 | Mike (middle runner) | 1 | Align in the box and fit the run. Key #3 and open the hips to the nickel/passing-strength side [HNFL-241 "Middle Read #3"; MS §8; TC] | `tampa_mid` deep zone; run read gives an insert fit (defense.ts:1845; run-fits.ts:91). Eyes on S2 then W2, not #3 (zone-eyes.ts:keyRefs:49) | D (eyes) / M (fit) |
| Tampa 2 | Mike | 2 | Read #2/#3 for seams to know how much depth he needs [HNFL-241, 028] | Any receiver, any number, read 'vertical' ≥4 yd and within 9 yd of the ball, 20 yd ceiling. Nearest to the ball **re-picked every tick, with no state** (rules.ts:tampaMike:503-512) | D |
| Tampa 2 | Mike | 3 | Seam by #2 or #3: close the post and carry it. Two seams: depth in the middle, squeeze from inside, safeties widen. No #2/#3 vertical: stay low for #3 [HNFL-028 "Mid Run", 241] | Seam: man(seam, inside, trail) with protectDepth, sitting 0.6 yd under the hip (defense.ts:1561-1565). Two seams flip him each tick. No seam: deep zone to 13 yd at the ball (alignment.ts:789-790), so he stays deep instead of low | D |
| Tampa 2 | Mike | 4 | How and when he opens his hips is set by his route; vision on the QB [MS §8; HNFL-241 vision & break] | `CoverageJudgment` protect-vertical can pull him to any uncapped climber within 14 yd (judgment.ts:63-67). Pre-throw deep-drive applies in `tampa_mid` (defense.ts:2020) | D |
| Tampa 2 | Mike | 5 | Break from the pipe; inside-out pursuit | In the seam carry he plays man eyes (defender.ts:zoneEyes:65-68, protectDepth means not zone-eyed) and reacts to the hands or ball | D |
| Tampa 2 | Hook / apex | 1–3 | "Hook #2": aggressive reroute on #2, then drop inside the *final* #2. Read #1's release; close the curl window. The Mike has the seam [HNFL-241, 028 "Reroute"; TC within Tampa] | Same `c2_hook` Wild wall: walls #2 vertical to 12 yd, out of the curl/dig window (coverages.ts:416) | D |
| Tampa 2 | Hook | 4–5 | Vision & break [HNFL-241] | As the apex hook | M |
| Cover 2 (Cloud) | Hooks / middle | 1–3 | Get to the spot; curl vision; middle read "zone high hole to post, key #3-2-1"; poach with the eyes [HNFL-070, 130; TC] | Spot: `spotUnderneath` with seen-eyes lean (defense.ts:2312-2359). Match: carry a vertical to 13 yd, otherwise lane, held by `ZONE_HOLD` pick (:2154-2303) | M (spot) / D (no #3 key, no high-hole) |
| Cover 2 (Cloud) | Hooks | 4–5 | QB set, plant; break on the QB [CR shared] | `ZONE_SETTLE`, `SETTLE_DEPTH`, `SHOULDER_READ`, shoulder break | M |
| Cover 2, 8 droppers | Curl-flat | 1–5 | Only exists with eight droppers; generic curl-flat rules apply [CR shared] | Generic curl-flat with `CURL_FLAT_BACK`, `CURL_SINK` (defense.ts:2174-2205) | M (generic; rarely filled) |
| Deuce | Apex ("Deuce Hook" / wall) | 1–2 | Key #2→#1 and insulate #2. #3 toward him: quarter-flat style. #3 away: vertical-curl style [HNFL-302, 373; TC] | `q_apex` in the curl_flat seat (coverages.ts:431). Reads #2's stem (`readStem`), keys #3 away each tick (rules.ts:quarterFlat:385-410) | M |
| Deuce | Apex | 3 | #2 vertical: wall him. #2 flat: the corner traps it, so he zones the hook and looks for a new #2 coming back in. Match the final #2 underneath [HNFL-302] | Corner takes the flat (`cornerTakesFlat`, :389). #2 vertical: apex wall to 10 yd (:409, 421-424). #2 flat or out: zones to the **curl-flat** landmark (8.5 yd, ball ±12; alignment.ts:807-810), not the hook. No "new #2" | D |
| Deuce | Apex | 4–5 | As the apex hook | As the apex hook | M |
| Deuce | Corner ("Soft Squat") | 1–3 | Key #2→#1. Stay on top of #1 unless #2 goes to the flat right away, then trap it. Top-down any China combo [HNFL-302, 373; TC] | Trap #2's quick out (< 7.5 yd, not yet climbed); otherwise MOD on #1 (rules.ts:palmsCorner:446-454; qCorner:332-338; zoneOffOne:111-) | M |
| Deuce | Corner | 4–5 | Trap on #2's flat declaration; force [HNFL-302] | `Trap` drives downhill (techniques.ts:80-91); zone-eyed | M |
| Deuce | Safety ("Deuce ½") | 1–3 | See #1's release for width, then #2; prioritize #2 deep. #3 to him: play like "Read". "Pop the top" vs a detached #2 when the hook is selling [HNFL-302, 373; TC] | #2 quick out: over #1, outside. #2 vertical ≥7 yd: carry #2 over the top. Under, in or stop: help #1 (rules.ts:palmsSafety:457-473). Judgment overrides apply. No pop-the-top | M / A (pop-the-top) |
| Deuce | Safety | 4 | Hold until the throw except on these rule triggers | Man directives give pre-throw man/over-top movement. The shoulder break is ungated on the arm read (defense.ts:2717) | D |
| Deuce | Safety | 5 | Over the top; alley | ManCoverage overTop (defense.ts:1554-1560) | M |
| Deuce DOT | Backside apex, corner, FS | 1–3 | DOT: drop off #3, no vertical carry, top-down any cross by the final #3. Backside corner "Smack": reroute an oversplit #1 wide [HNFL-302] | `bonus_hook`: man-head on S3 under, in or stop < 9 yd (rules.ts:bonusHook:703-712), M. W corner is `sink_corner`: no Smack reroute, D. FS is an unruled half: all the half D items | M / D |
| Deuce | Dropping linemen | 1–5 | HNFL-302/373 describe four under (corners and apexes). No lineman drop is shown in Deuce [HNFL-302; single source] | The Deuce pressure has no `droppers` (src/playbook/defense.ts:284-285). Lineman droppers exist only for `mug_sim`, `whip`, `slug`, `sting`, `fire_zone`, `mug_fire` (:247-310) | A (not installed; consistent with the source, so low consequence) |
| 2-Man | Trail corner / nickel | 1 | Press or inside-trail alignment; key the man's hip [HNFL-074, 206 "Fist = 2-Man with inside trail"; MS §7; TC] | Press, trail, inside lev 0.9 (coverages.ts:177-189; defense.ts:1431). Press at 1.3 yd (alignment.ts:1000) | M |
| 2-Man | Trail corner / nickel | 2–3 | Trail underneath with inside leverage on every route. Safeties take anything over the top. Handle picks and rubs [HNFL-074; MS §7; TC] | `trail` sits 0.6 yd under the hip when he climbs (defense.ts:1561). No banjo or pick rule in base 2-Man | M / D (rubs) |
| 2-Man | Trail corner / nickel | 4 | Ignore the QB; play the man's hands [CR shared "out of phase: play the hands"] | Man eyes, hands cue (defense.ts:readsHandsAt:2572-2586) | M |
| 2-Man | Trail corner / nickel | 5 | Rake the hands; tackle; rally | Flight / CATCH_CARRY | M |
| 2-Man | Backers on backs / #3 | 1–5 | Man on the back or #3 [HNFL-074] | man prefer [S3, B, W2] (coverages.ts:186-188) | M |
| 2-Man | Half safety | 1–3 | Deep ½: key #1→#2 (#1 is in his read in Fist; Choke takes #1 out, HNFL-208). Deeper than the deepest; split two verticals [HNFL-206, 208, 074; TC] | Unruled ZoneCoverage `deep_half`, match style. Same deepest-in-band, eyes-weighted split (defense.ts:1966-2052) | D |
| 2-Man | Half safety | 4 | Do not come downhill before the throw; play over the top; scramble awareness [MS §7; TC] | The pre-throw deep-drive applies to man calls too (no zoneStyle → match, :1787, 2020). Shoulder break on the arm read | D |
| 2-Man | Half safety | 5 | Over the top to the catch | Shared ball phase | M |

#### 2. D and A items ranked by consequence

Link tags: **L1** = a deep man comes downhill and gets passed. **L2** = nobody deeper after a pass-by. **L3** = an underneath man moves away from the throw.

1. **The arm-bite plant and the shoulder break are not gated for deep players.** (L1, L2) Every half safety in C2, Match, Wild, Tampa, Inverted and 2-Man is affected, plus the Deuce DOT FS and the zone-phase Tampa Mike.
   - `ZoneCoverage.updateCore` gives the same continuation to deep and underneath players (defense.ts:1833).
   - `playBelievedBall` plants on the load (`stopDrop`, :2715). On a seen "through", which a pump produces (release-belief.ts:9-10, 58-62), it runs him at speed 0.9 to the receiver the shoulders point at (:2717-2730).
   - Coaching for Cover 2 and single-high deep players: break only on the release, never on a pump; hold until the throw.
2. **Pre-throw "deep-drive" on a stopped stem.** (L1, L2)
   - Where: defense.ts `zonePlay` :2020-2028. It applies to match style, which covers every ruled C2/Tampa/Wild call and 2-Man.
   - What it does: he drives at zs·1.05 on any deepest-in-band route that slows below 3 yd/s and is shallower than 16 yd, with only an "other climber within 8 yd laterally" check.
   - Why it is wrong: that is a Quarters rob, not halves (CR item 5). It also bypasses the `SAFETY_DEPTH` hold-over (:2047-2052) that would otherwise keep him over the curl or dig.
3. **Halves have no #1→#2 ownership.** (L2)
   - How he chooses: "deepest in a field band" re-picked each tick, with a band that reaches 3 yd past the middle (zoneBand :2399-2402, :2012). Two verticals are split by an eyes-weighted 0.35/0.65 lean (:2036).
   - What coaching says: midpoint, vision & squeeze, "deeper than the deepest and widest" (HNFL-334, CR item 10).
   - Consequences: a #2 post or bender is handed across by band geometry; a third vertical or a backside crosser can capture him.
   - Partial fix since the old audit: the eyes are now perceived and the depth now matches.
4. **The vertical-curl apex zones off when #2 breaks out (corner or smash).** (L3) `wallTwo` sets 'zoned' on any non-vertical read (rules.ts:371), so `verticalCurl` returns to the hook landmark inside (:621-622). HNFL-015 says undercut the corner when #1 is not vertical. The same branch sends him to the hook, not the curl window, when #2 goes flat (D on cell 3).
5. **Squat corner flat lock.** (L3, L2)
   - The first flat or short-out read locks the flat zone forever (rules.ts:482-486).
   - The generic lane then drives him to the route's depth (defense.ts:2268), and `ZONE_SETTLE` plants him (:1954-1964).
   - Result: he gives up depth under #1's corner, fade or sail, and a wheel never unlocks.
6. **Squat corner in man-under is pulled off #1 by a late flat.** (L2, L3) The flat check runs before the man-under check (rules.ts:482 before 494), and nothing does a high/low top-down.
7. **Tampa structure.** (L2, L3)
   - The safeties use the C2 landmark and band, not a wider one (alignment.ts:791-794).
   - The Mike reads any seam, re-picked each tick with no state (rules.ts:503-512). He stays deep at 13 yd instead of "low for #3" (:789-790), and keys S2, not #3 (zone-eyes.ts:49).
   - In the seam carry he has man eyes; the protect-vertical judgment can redirect him.
8. **Tampa hooks run the Wild wall instead of "Hook #2: reroute and drop inside the final #2".** (L3) coverages.ts:416.
9. **The hook's 12 yd wall hand-off is fixed, with no "safety on top" cue.** (L2) rules.ts:621. `hasVisibleCap` is used only in `seamCurlFlat`.
10. **Matches commit with no declare phase.** (L3)
    - Shared mechanism: the 0.12–0.19 s confirmation, then a fixed class (reads.ts:58, 111-124).
    - `tampaMike` takes any vertical from 4 yd.
    - `cloudCorner` takes a flat or a short out at any depth.
    - `verticalCurl` 'in' has no depth floor.
    - The 0.9 s `ZONE_EYES` declare phase bounds sight only; no rule reads it.
11. **`mike_3` keys only the back.** (L3) rules.ts:305. A TE or slot #3 runs into the middle hole unwalled.
12. **No reroute or collision for squat corners, Smack or Tampa hooks.** (indirect; affects timing) No such technique exists in techniques.ts.
13. **Inverted C2.** (L3)
    - The safeties play cloud with sink=false and no #2 wall; `invert_safety` is still unused (rules.ts:837-839).
    - The corners carry every half-safety D item.
14. **Deuce gaps.** (L3)
    - The apex zones to the curl-flat landmark, not the hook, when #2 goes flat (alignment.ts:807-810), and has no "new #2" rule.
    - The safeties have no "pop the top".
    - The Smack corner has no wide funnel.
15. **Corner alignment is 4 yd against the coached 5–7 yd.** (L3, minor) alignment.ts:873.
16. **Wild backside wide ½ not modelled.** (L2) There is no Wild 3x1 backside wide half; the band admits trips #3 (zoneBand :2401-2402).
17. **No lineman drop in Deuce.** (A, low) It is absent from the playbook entry (src/playbook/defense.ts:284-285) and also not shown in HNFL-302.

#### Unverified
- HNFL OCR depths: the Deep ½ (~22 yd) and Wide ½ (~20 yd) landmarks (HNFL-291), and the 5–7 yd squat depth (HNFL-099).
- Whether a man defender who saw the hands but not the ball reaches the shoulder-break branch (`believesThrow` :2560-2566 into :2695-2730). It looks possible from the code; I did not trace it.
- How much the `ZONE_EYES` head cone hides from a half safety during the 0.9 s on #1. I did not measure it.
- The consequence ranking is reasoning about mechanisms, not measured attribution.

## Quarters family and Cover 6/8: coaching spec and engine audit at develop c85e6b9d (engine-77)

I only read code (no runs, no edits). Every line number below is at c85e6b9d.

**Path abbreviations**
- R = src/sim/coverage/rules.ts
- RD = reads.ts
- J = judgment.ts
- DF = defender.ts
- T = techniques.ts
- D = src/sim/behaviors/defense.ts
- A = src/playbook/alignment.ts
- RF = src/sim/run-fits.ts
- ZE = src/sim/zone-eyes.ts
- C = src/playbook/coverages.ts
- REC = src/sim/recognition.ts

**Source tags**
- HNFL-### are the OCR sheets. Today I re-checked only HNFL-202 against the OCR text; the other HNFL tags follow the 0d0f4af8 audits and were not re-verified.
- ZCR = docs/reviews/2026-11-17-zone-coached-rules.md, its consensus section (Bowen, USA Football 7382/7422, Manes 2-Read, footballnationusa). I did not open those external pages, so treat them as unverified.
- COS = Coverage OS manuscript.

**Status codes:** M = matches, D = differs, A = absent.

### Flag defaults checked in config/reference-stack.json (engine-77)
- **On:** RELEASE_BELIEF, SHOULDER_READ, TECH_CONT, ARM_BREAK=1, ZONE_EYES (ZONE_EYES_KEY=9, i.e. 0.9 s), SEEN_EYES, QB_BODY_SEEN, INFO_HONEST=63, CUT_WALL, APEX_LEVERAGE=7, CURL_FLAT_BACK, CURL_SINK, SETTLE_DEPTH, SAFETY_DEPTH, CUSHION_BREAK, OPEN_CARRY.
- **Off:** QCORNER=0 (so QuarterShort is off) and JUDGE_SEEN_BALL (but INFO_HONEST item 3 makes judgment freeze on the throw he saw anyway).
- **ZONE_HOLD=114** means bits 2, 16, 32 and 64 are on. **Bit 1 (band hold) is off**, so deep zones still pick their target from an un-held band every tick.
- **Stale docstrings:** several flags say "experimental, off" in the code but default on: CUT_WALL (R:25), CURL_SINK (D:1667), SETTLE_DEPTH (D:70), SAFETY_DEPTH (D:1673), SHOULDER_READ (D:2443), QB_BODY_SEEN (D:2461).
- The zone-coached-rules doc also says ZONE_EYES, CURL_SINK and SETTLE_DEPTH are off; all three are now on.

### What changed since the 0d0f4af8 audits
- **Fixed: the hidden `sim.qbEyes` read.** Zone lanes, landmark drift and the two-vertical split now use `seenQbEyes` (D:161-191), which is the perceived QB head.
- **Partly fixed: apex vs #3/back to the flat.**
  - APEX_LEVERAGE bit 2: while walling #2, the apex stops leading him and holds about 9 yd over a back he sees (R:flatThreat:431-443; T:Wall:118).
  - APEX_LEVERAGE bit 4: the Mike widens to the hook on a flat back (R:mikeWiden:320-329).
  - CURL_FLAT_BACK: after the handoff the zone widens toward the back or #3 (D:2177-2205).
  - Still no rule takes the back or #3 in the flat as a match.
- **New since then:**
  - Zone eyes follow the taught key sequence (ZE:41-67).
  - Arm-read continuation for Trap/Wall/Rob (T:43) and ARM_BREAK bit 1 (D:2721).
  - SAFETY_DEPTH: a deep safety's depth over routes and a landmark never shallower than his alignment (D:1798, 2004-2051).
  - CUT_WALL's `passUnder` (DF:148-164) now rewrites the apex, Mike and corner directives on shallow crossers.
- **Not fixed:**
  - Corner leverage is fixed outside.
  - The China corner still plays over the top, not under.
  - The safety's `two` mode is locked with no re-read, and he robs #1 before #1 declares.
  - The Mike keys only the back.
  - The Palms 7.5 yd threshold, MUSH zoning instead of trapping, and the Poach weak apex are unchanged.
  - The cloud corner rule and the vertical-curl landmark are unchanged.
  - The half safety still has no rule and no judgment layer.
  - Deep-drive is still not gated by coverage.
- **QCORNER bit 4 (`QuarterShort`, T:201-216)** exists but is off. Even when on, it settles over #1's window; it does not sink under #2's corner route.

### Table

| Call | Position | Cell | Coached rule [source; TC/VS] | Engine today [file:function:line] | Status |
|---|---|---|---|---|---|
| Quarters MOD | Corner (CB_S/CB_W, `q_corner_mod`) | 1 | Off about 7-8 yd. Leverage set by #1's split and the help (oversplit inside, minus split outside). Key #1, then #2. [HNFL-201/093; depth and press VS] | 7.3 yd deep with a fixed 0.8 yd outside shade (A:zoneSpot:875; placeCorner:1014-1024). Eyes on #1 then #2 for 0.9 s (ZE:keyRefs:47). | D (leverage ignores split and help) |
| MOD | Corner | 2 | #1 must "truly declare" inside the 5 yd no-cover zone. [HNFL-201/079; TC] | NO_COVER 5, DECLARE 0.35 s for In/Under, reader confirm 0.12-0.19 s (R:zoneOffOne:111-140; RD:116-124). | M |
| MOD | Corner | 3 | Past 5 yd every route by #1 is his man. Under/in shallow: "In", zone off and find #2's corner, then seam. Short #1 with #2 present: "China", sink under #2's corner route while the safety plays the top. [HNFL-201/202/093; China name VS, Smash checks elsewhere] | Man on #1, outside (R:qCorner:337). In/China gives a deep ZoneCoverage over the deepest vertical in the band (D:zonePlay:1984-2072), so he ends **over** #2's corner route, as the safety does. QuarterShort is off (R:99-100). A slant at 5-6.5 yd stays `under`, and `passUnder` turns his man into CrossWall/zone (DF:148-164). | D |
| MOD | Corner | 4 | Pass first. Not moved by the QB's eyes or a pump while #1 is live. Run is secondary support after he reads it. [ZCR; run role VS] | In man he has no zone eyes (protectDepth, DF:65-68), so no arm-bite. Zoned off (ZoneCoverage), he plants on the load and shoulder-breaks on any arm "through", **a pump included** (D:playBelievedBall:2698-2730; release-belief.ts:9). Run: default `alley` job for a non-LB defensive back (RF:buildRunFits:91), easing about 1 yd down until the back declares (RF:479-503). | D (pump bite once zoned) |
| MOD | Corner | 5 | Play the hands at the catch point. Rally outside-in toward help. [ZCR rally; TC] | `ManCoverage.update` → playBall with hands cue (D:1339-1354, 2572-2586). Pursuit is generic and leverage is field-position only. | M (rally partial) |
| Quarters MEG | Corner (`q_corner_meg`) | 3 | Man on #1 wherever he goes; no China (5-over-3 inside). [HNFL-192; MOD vs MEG is a call choice, VS] | `man(one, outside)` with no zone-off (R:qCorner:335). Exempt from `passUnder` (DF:149). | M |
| MEG | Corner | 1, 2, 4, 5 | Same as MOD. | Same as MOD, minus the zone-off path. | as MOD (cell 1 D) |
| Palms (2-Read) | Corner (`palms_corner`) | 1 | Key #2, then #1. [HNFL-051; COS §11.1; TC] | The rule reads #2 first (R:palmsCorner:447-449), but zone eyes for `quarter_*_out` look at #1 first (ZE:47). | D (minor) |
| Palms | Corner | 2 | #2's out or flat under about 5 yd is the trigger. [HNFL-051 "under 5"; threshold VS] | `isQuickOut`: out/flat, depth < 7.5, not climbed (RD:170-173). | D (7.5 vs 5) |
| Palms | Corner | 3 | #2 out/flat: drive on it (trap). The safety takes #1 over the top. #2 up/in: MOD on #1. #2 out-and-up: stay on it. [HNFL-051; ZCR "Palms corner drives on #2's out"; COS §21.2; TC] | Locked Trap, outside-in with lead (R:448-452; T:Trap:80-91). The safety takes #1 over the top on the outside (R:palmsSafety:463-466). Trap aims at x ≤ receiver + 0.6 and has no turn-up phase for a wheel. | M (trap) / D (wheel) |
| Palms | Corner | 4 | His pre-throw downhill is earned by #2's out. An out-and-up or wheel pays for it. [ZCR; TC] | Trap fires on his own believed declaration (P), then locks. | M |
| Palms | Corner | 5 | Tackle the flat catch outside-in. [ZCR] | Trap → playBall with continuation (T:43). | M |
| MOD/MEG | Quarters safety (SS/FS, `q_safety`; strong and weak run the same rule in 2x2) | 1 | 10-12 yd over or inside #2. Key #2 through the tackle, aware of #3. [HNFL-202/077; depth VS (Saban about 10, HNFL 12)] | 12 deep, 6.65 yd from the middle, shaded 0.45 toward the ball (A:alignDefense:1053-1061). Landmark 12 yd at ball ±7 (A:zoneLandmark:799-802). Eyes on #2 then #1 (ZE:48). Run key: line plus receiver weights (REC:KEYS.S:182). No #3. | M (no #3 is minor) |
| MOD/MEG | Quarters safety | 2 | Declare phase: #2 must clear the no-cover zone. Read about 3 steps / 5 yd. A vertical past about 7 yd is a carry. [HNFL-202 "no cover zone"; ZCR 3-step/5-yd; TC] | Vertical needs depth ≥ 7 (R:qSafety:348). **Any other believed release locks `one` at any depth** after only the 0.12-0.19 s confirm (R:353-356; RD:120). No ReadRelease phase (compare R:seamCurlFlat:199). Until #2 declares he is a deep ZoneCoverage that can deep-drive (D:2018). | D |
| MOD/MEG | Quarters safety | 3 | #2 vertical: top-down on any upfield route, priority corner > seam > post. #2 cancels: zone the ¼, squeeze #1 inside-out, post > curl, check #3 and the far side. [HNFL-202/077/198; TC] | Mode `two`: locked man over the top of #2, roof 0.8 + 0.15·vx (R:344-351; D:ManCoverage:1554-1560). No re-read on a dig or curl. Mode `one`: `helpOne`; #1 climbing gives man over the top, otherwise **Rob** (R:157-161). No #3 or far-side check, and J only sees `vertical` releases (J:57-63). | D |
| MOD/MEG | Quarters safety | 4 | Comes downhill pre-throw only on: the run read, #2 short or out (then on #1's inside break, post first), or a plan to rob. Not on the QB's eyes or a pump. Play action is what pays for it. [ZCR; HNFL-202 post > curl; TC] | **Run:** `believesRun` → alley (D:zonePlay:1845; in man DF:117-137; RF:479-503). Matches. **Pre-throw downhill triggers that are not gated on #1's threat:** (a) Rob toward #1's window at most 1 yd over #1, floor at 7 yd or shallower (T:Rob:142-155); (b) J squeeze-break rob on any short stop/in/out/under within 10 yd when no uncapped climber is visible (J:68-82); (c) deep-drive on the owned #2 stopping (D:2018-2029); (d) in ZoneCoverage or Rob, a plant on the load and a shoulder-break on a pump (D:2698-2730). | D |
| MOD/MEG | Quarters safety | 5 | Over the top: break on the throw. Run: alley inside-out, cutback. Rally inside-out. [ZCR; TC] | playBall; alley job (RF:479-503); generic pursuit. | M |
| Palms | Safety (`palms_safety`) | 3 | #2 seam: ¼ technique. #2 out/flat: width to #1 with depth. #2 under: squeeze #1. [HNFL-051] | R:palmsSafety:457-473 implements exactly this. | M (cell 2 as MOD: D) |
| MOD/MEG/Palms; Cover 6 strong; Cover 8 weak | Apex / curl-flat (`q_apex`; nickel or Sam/Will, filled by distance) | 1 | 4-6 yd, about 1 yd inside #2 (wall). Key #2, then #1, aware of #3. [HNFL-200/094; TC] | 4.5 yd head-up (A:zoneSpot:876). Landmark 8.5 yd (A:807-810). Eyes on #2 then #1 (ZE:44). | D (minor: head-up) |
| same | Apex | 2 | Read #2's release, then wall it to 8-10 yd. [HNFL-200; TC] | `readRelease` until #2 declares (R:wallTwo:365). Wall to 10, level leverage (R:409, apexWall:421-424). | M |
| same | Apex | 3 | #2 vertical: wall it, hand to the safety, find the final #2 or #1 underneath. #2 flat: match it, alert the wheel. China: push to #1. #2 under with #3 away: take him across. #3 or back to the flat: take the first flat by #2 or #3. [HNFL-200/365/078/198] | Handoff at 10 yd with no visible-cap check (R:367-369), then the generic zone. Flat: man on #2 over the top (R:394-398). China: man on #1 (R:401-404). Take-across (R:405-408) is **overridden by CUT_WALL `passUnder`** into CrossWall/zone (DF:148-164). Back to the flat: hold-over only (R:431-443) or the CURL_FLAT_BACK widen (D:2177-2205). No "new #2". | D (partly fixed) |
| same | Apex | 4 | Moves on #2's release and the QB's set. Run: force; play action pays. [ZCR; TC] | Force goes to the curl-flat seat (RF:136-160) and is kept while matching the flat (DF:121). Underneath plant on the seen motion (D:1836). Lane pick weighted by the seen QB look (D:2212). | M |
| same | Apex | 5 | Break on the QB's shoulders. Flat defender forces outside-in after the catch. [ZCR] | Shoulder-break (D:2717-2730); TECH_CONT (T:43). | M |
| Palms | Apex (Read curl) | 3 | #2 out/flat: zone the curl and close the window with eyes on #1, because the corner traps the flat. [HNFL-051/195] | The flat branch is skipped (R:389, 394). `out` gives zoned ZoneCoverage, whose #2 flat-expand still fires when #1 is the pick and there is no #3 or fast back (D:2227-2257), duplicating the trap. | D |
| MOD/MEG/Palms; Cover 6/8 | Mike (`hook_mid` `mike_3`) | 1 | Key #3, then #2; relate to the final #3. [HNFL-198/194/324; TC] | Keys only the back B (R:mike3:304-312). Eyes on S3 then S2 (ZE:46). | D |
| same | Mike | 2 | Back's release; #3's stem. | under > 1.5 yd / in / vertical, believed release (R:306). | M (back only) |
| same | Mike | 3 | Carry #3 vertical. #3 to the flat: alert, zone the hook, "dig to dump", squeeze the dig from underneath. [HNFL-198/196] | Man on the back to 15 yd, then zoned (R:308-309). Widen to the hook on a flat back (R:320-329). Shallow crossers handled by `cutWall` (R:259-281). Man on an under back becomes CrossWall via `passUnder` (DF:148-164). Nothing for the dig. | D |
| same | Mike | 4 | Box read step; insert on run. [TC] | boxBacker read step (D:1853-1912); insert job (RF:91). | M |
| same | Mike | 5 | Break on the QB; pursue inside-out. | Shoulder-break; generic pursuit. | M |
| MOD/MEG/Palms | Plain hooks (`hook_s`/`hook_w` seats) | 1-5 | Quads has no such seat (4 over 3). | Plain ZoneCoverage (C:450). Filled only with more than 3 free droppers. | n/a |
| Box | CB / SS / nickel / hook | 3 | Corner takes the outermost upfield, safety the innermost, nickel the first out, hook the first in. Deep exchange: zone it. FS Trix on the backside. [HNFL-053/195] | `box()` (R:745-762); deep pickups lock only past 10 yd. The backside is plain QUARTERS_W with no Trix (C:486). | M / D (no Trix) |
| Book / Stubbie / Cover 6 Book | Nickel (`mush`) | 3 | #3 up or in: match #2. #2 fast flat: match it. **#3 out/flat: trap it.** [HNFL-050] | #3 flat/out under 5 yd or a shallow #2 makes him **zone** the curl-flat (R:mush:576-588). | D |
| Book / Stubbie | Safety (`stubbie_safety`) | 3 | #3 up: match. #3 out: width to #2 with depth. [HNFL-050] | R:stubbieSafety:593-609. | M |
| Poach / Trix | FS (`poach_safety`) | 3 | Key #3 to X. Overtake #3 vertical, otherwise zone the ¼ and squeeze X; "who becomes 3". [HNFL-197/021] | Vertical(6) on the fixed #3 gives man over the top, otherwise `helpOne(X)` (R:518-532). Numbering is fixed at the snap (RD:138-142). | M (no "new 3") |
| Poach | Weak CB, weak apex | 3 | Tight ¼ on X ("In", no China). Weak apex plays seam/flat on #2. [HNFL-194/199] | CB is locked man on W1 inside (C:507). `curl_flat_w` is a plain seat (C:510). | D |
| Cover 6 (strong) / Cover 8 (weak) | Quarters CB, safety, apex | 1-5 | As MOD. | QUARTERS_S (C:526) / QUARTERS_W (C:561). | as MOD |
| Cover 6 (weak) / Cover 8 (strong) | Cloud/squat corner (`sink_corner` on `flat_*`) | 1 | 5-7 yd, 1 yd outside #1. Collision and funnel #1 inside. Key #2 to #1. [HNFL-099/097; press vs soft VS] | 4 yd, 0.5 yd outside (A:zoneSpot:873). No collision rule. Reads #2, #3 and the back (R:cloudCorner:480-500). | D |
| same | Cloud corner | 2 | Two lateral shuffles reading the flat threat. [HNFL-099] | Waits for #2 and #3 to declare non-flat/out; a flat is an out under 6 yd (R:482, 492-493). | M |
| same | Cloud corner | 3 | Flat threat: top-down the flat ("ball brings you flat"). No flat threat: sink with #1, top-down any high-low, squeeze the hole shot; man under on the final #1. [HNFL-099/097/324] | Flat: ZoneCoverage `flat_*` lane, which sits under the flat route (R:483-486; D:2267-2271). Otherwise trail man under #1, locked as soon as the inside receivers declare (R:494-497), so he sits on #1's hitch while #2's corner route goes over him. | D |
| same | Cloud corner | 4 | Primary force on the run. Ball brings him down. [HNFL-097; TC] | Force (flat seat, priority 0, RF:139-160). | M |
| same | Cloud corner | 5 | Break on the catch point; force outside-in. | playBall (zone, or man trail with hands). | M |
| Cover 6 (FS `deep_half_w`) / Cover 8 and Trix (SS `deep_half_s`) | Half-field safety | 1 | About 14-15 yd, inside the numbers. Key #1, then #2, outside-in. [HNFL-097/324; fangio B2] | 14 deep, 6.9 yd off the middle (A:1056). Landmark 15 yd, 13.5 yd from the sideline (A:791-794). Eyes on #1 then #2 (ZE:47). | M |
| same | Half safety | 2 | Read #1's release for width, then #2. [HNFL-097] | No rule (assign.ts:148-150). The deepest vertical in a band from his half to 3 yd past the middle (D:1966-2013; band D:2399-2402); band hold is off (ZONE_HOLD bit 1). | D |
| same | Half safety | 3 | #1 vertical: widen and squeeze, aware of #2. #1 cancels: tighten to #2. Two verticals: stay at the midpoint, deeper than the deepest, break on the ball. [HNFL-097; ZCR midpoint; TC] | One vertical: over the inside shoulder. Two verticals: weighted 0.35/0.65 toward the receiver **he sees the QB looking at** (D:2034-2037, now perceived). | D |
| same | Half safety | 4 | Holds until the throw. Not moved by a pump or the eyes. Run only once it is certain (play action pays). [ZCR "Cover 2 deep players hold until the throw"; TC] | Pre-throw **deep-drive** on a stopped deepest route when no other climber is within 8 yd laterally (D:2018-2029). Plant and shoulder-break on a pump (D:2698-2730). No J layer. Run: alley, easing about 1 yd down (RF:479-503). | D |
| same | Half safety | 5 | Over the top; last line: keep the receiver in front. [ZCR] | playBall. No last-line mode (ZCR B7). | D |
| Cover 6 (`hook_w` `c2_hook`) / Cover 8 (`hook_s`) | Vertical-curl player | 1 | Inside #2 at **curl** depth. Key #2, then #1. [HNFL-097/324] | `hook_*` landmark 10 yd at **5 yd from the ball** (A:811-814). | D |
| same | Vertical-curl player | 2 | Read #2's release. | `wallTwo(c, 12)` with no readStem phase (R:621). | D (minor) |
| same | Vertical-curl player | 3 | #2 vertical: wall to about 12. #2 up and in: match. #2 flat: zone the curl, wall #1 as the new #2. #2 shallow with #3 in the midpoint: take him. [HNFL-097/324/325] | Wall to 12; an in-break under 14 yd gives man (R:verticalCurl:614-623). A flat gives the hook zone plus cut/CrossWall. | D |
| same | Vertical-curl player | 4-5 | Insert or flow on the run; break on the QB. | Generic. | M |
| Cover 6 Area | CB_S / SS `topper` / nickel `area_flat` / hook `area_hook` | 3 | Triangle pickups on #2 and #3: nickel takes the first out (no out: push to a short #1), hook the first in, Topper the deep one; both deep: vision and squeeze. [HNFL-052/073] | R:area:772-810 does this; CB_S is MOD (C:537). | M |
| Cover 8 Trix | Half safety (SS) toward trips | 3 | Corner and safety cap #1 and #2 respectively; the FS overtakes #3. [HNFL-195/325] | Deepest in band, with no "#2 is mine". He can double #3 with the poach FS and leave #2 to the 12 yd wall. | D |
| Cover 8 Trix | Nickel `curl_s` `c2_hook` / hook_s `read_hook` / FS poach / CB_W MOD / `curl_flat_w` `c3_seam` | 3 | Vertical curl at curl depth. Read hook walls #3 to 8 and matches the final #3 underneath. FS overtakes #3. Weak side plays a tight ¼ on X plus seam/flat. [HNFL-197/325] | `curl_s` landmark 11 yd, at most 9 yd from the ball (A:821-822). readHook (R:541-568). poachSafety (R:518-532). qCorner with no China vs x1 (R:336). seamCurlFlat (R:180-213). | M |

### Answers to the five specific questions
- **Deep-drive / rob: shared by every deep player, not gated to quarters.**
  - The ZoneCoverage deep-drive (D:2018-2029) runs for every match-style deep zone. The only gates are `!spot` and the goal line, so it covers halves, the post, thirds and quarters alike.
  - In quarter seats, the ownership filter (D:1984-1996) cuts `vert` down to the owned receiver. That empties the "another climber within 8 yd" guard (D:2018), so the seat drives even with a post climbing behind.
  - The J squeeze-break (rob) applies to every *ruled* deep seat (quarters, palms/deuce halves, `c3_corner`, poach, stubbie, topper, box deep), but not to the rule-less half or post safeties.
- **Arm-bite plant and shoulder break: not gated by coverage or depth.**
  - `playBelievedBall` (D:2680-2736) runs for anyone with zone eyes facing the QB (D:sawThrow:2526 / believesThrow:2554). That includes every deep ZoneCoverage, the Rob/Trap/Wall techniques, and CoverageDefender man carries without protectDepth.
  - A pump counts as a "through", so it sets `releasedAt` (release-belief.ts:9) and produces a shoulder-break.
  - Only the pre-belief `underneathPlant` is gated to non-deep players (D:1836). Deep man carries (protectDepth) escape only because they have no zone eyes (DF:65-68).
- **Quarters safety #2 declare phase: no.** A vertical commit needs 7 yd, but a cancel commits at any depth after a 0.12-0.19 s confirm, and nothing at the 5 yd no-cover zone.
- **Half-side split of two verticals:** it leans 0.35/0.65 toward the perceived QB look (D:2036), not the midpoint.
- **MOD/MEG corners:** both are always outside leverage (R:335, 337). MOD's China plays over the top, not under.
- **Palms corner on #2's out:** present (locked Trap), but the trigger is 7.5 yd, not 5, and the trap has no wheel phase.

### D and A items ranked by consequence
L1 = deep man comes downhill and gets passed. L2 = nobody deeper after a pass-by. L3 = underneath man moves away from the throw.

1. **[L1, L2] Deep defenders bite on the arm and on pumps.** The plant (stopped pedal) on the load and the shoulder-break on any "through" are not gated on deep or coverage (D:playBelievedBall:2698-2730).
   - This hits half safeties, zoned-off quarters corners, pre-declare quarters safeties and robbing safeties.
   - Coaching is "deep breaks on the ball, never the pump".
2. **[L1, L2] Pre-throw deep-drive on a stopped route for every match deep zone** (D:2018-2029).
   - In Cover 6/8 halves it contradicts "hold until the throw".
   - In quarter seats the owned-receiver filter (D:1984-1996) disables the climber guard, so the seat drives on #2's curl with #1's post climbing.
3. **[L1, L2] The quarters safety on a #2 cancel robs #1 before #1 has declared** (R:helpOne:157-161; T:Rob:142-155).
   - He sits at most 1 yd over #1, with a 7 yd floor, so hitch-go, slant-go and sluggo pass him while the corner trails on outside leverage.
   - Coached: post before curl.
4. **[L2] The quarters safety has no #2 declare phase** (R:qSafety:353-356). An early out, stop or flat locks `one` for good, so an out-and-up or wheel by #2 has no roof except the apex's 10 yd wall. Palms safety (R:471) and Poach (R:527) behave the same.
5. **[L1, L2] Mode `two` on #2 is locked, with a 0.8 + 0.15·vx roof** (R:344-351; D:1554-1560). On #2's curl or dig he comes down and across with it, leaving the inside ¼ open to #1's post. J cannot see the post because a post reads as `in` (J:57).
6. **[L3] MOD China: the corner plays over #2's corner route, not under it** (D:zonePlay:1984-2072; QCORNER=0). Both deep defenders are on top and nobody is underneath the 7 route.
7. **[L3] Cloud corner locks trail-man on #1's hitch once #2 declares** (R:cloudCorner:494-497). There is no sink to the hole shot, and in flat mode he plays under the route, not top-down (D:2267). This affects Cover 6/8, as well as Cover 2/Tampa through `sink_corner`.
8. **[L1, L2] The half safety has no rule and no J layer** (assign.ts:148-150). It takes the deepest receiver in an un-held band, leans the two-vertical split toward the seen look (D:2036), and deep-drives (item 2). Cover 8 Trix SS can double #3 with the poach FS.
9. **[L3] The vertical-curl player in 6/8 zones the hook 5 yd from the ball, not the curl** (A:811-814), and has no "#2 flat → wall #1 as new #2" rule (R:614-623).
10. **[L3] CUT_WALL `passUnder` turns the apex's "take #2 back across" (#3 away) and the Mike's man on an under back into wall-and-pass, then zone** (DF:148-164). With #3 away there is nobody to pass to, contrary to HNFL-078/196.
11. **[L3] Apex still has no match on #3 or the back to the flat**; only a hold-over or widen (R:431-443; D:2177-2205). The Mike keys only the back and does nothing for the dig (R:304-312).
12. **[catch-point, near L2] MOD/MEG corner leverage is always outside** (R:335, 337; A:875), even when #2 vertical has taken the inside help.
13. **[L3, minor] Palms:**
    - the 7.5 yd quick-out trigger (RD:172);
    - the trap has no wheel phase (T:80-91);
    - the apex's #2 flat-expand duplicates the trap (D:2227-2257);
    - the corner's zone eyes look at #1 first (ZE:47).
14. **[L3, minor] Book/Stubbie MUSH zones instead of trapping #3's flat** (R:576-588). cover4_poach has no weak apex rule (C:510) and its weak CB has no "In" (C:507). Box has no FS Trix on the backside (C:486).
15. **[none directly] Cloud corner has no collision/funnel; apex aligns head-up rather than inside #2.** (A:873, 876.)

### Unverified
- HNFL wording other than HNFL-202, and every external coaching source listed in ZCR.
- How often each branch runs in practice (no sims were run).
- Whether the corner's run role should be `alley` or force/cutback is VS, and I did not check it against a source.

## Build status (2026-11-17, Rules + Coaching)

- Built behind off flags, stacked: HALF_OWN (gap 3), MATCH_DECLARE (gap 6), C2_APEX (item 1), SQUAT_TOPDOWN (item 7),
  Q_APEX (item 2). Each flag's row in docs/FLAGS.md holds its staged before/after table.
- C3_HOOK (the Cover 3 hook matching #3's over, and #3 to the flat under a vertical #2): rule written, not landed; no
  installed concept presents the shape (trips #3 runs only flat, seam or hitch). Concepts that would: a trips Y-cross
  or drive with #3 on the over; a flood or sail with #3 to the flat under a vertical #2. A playbook that never asks the
  hook this question is itself a gap in what our offense attacks Cover 3 with.
- Diagnosed, not rules: drive's weak shallow against quarters and Cover 3 match is caught 1.5-3 yd past the line and
  goes 9-67 after the catch (pursuit); flood's weak dig and #2 out against Cover 3 match are tight (1-3 yd at the
  throw) and lost at the catch point; stick's #3 flat against quarters averages 5 yd but for one 65-yd run after the
  catch. The Book/Stubbie MUSH nickel zones #3's flat where HNFL-050 traps it (item 14).
- Tampa 2 Mike: carries any vertical within 9 yd of the ball, so he takes #2's corner stem on smash as a seam and
  releases only when his read turns it out, about 0.9 s after the break (item 9, the Tampa Mike row).
- Source check (2026-11-18): HNFL cells above rest on the OCR text unless noted. Checked against the sheet image:
  HNFL-050, 077, 114, 139, 194, 195 (in docs/reviews/2026-11-18-quarters-tree.md). The Book/Stubbie MUSH row is
  corrected by HNFL-050's image: the nickel (Soft Squat) traps #3's out or flat; "get width to #2 w/ depth" is the
  safety's line. Stubbie (HNFL-270) zones it (7-seam-flat). Built as MUSH_TRAP.
- Zone It / Zorro (quarters vs a stack or a reduced #1): held, like C3_HOOK. The check would be one line in
  QUARTERS_CHECKS, `{ when: ['stack_strong'], to: ['cover4_box'] }` (cover4_box already plays the Zone It pickups:
  corner outermost upfield, safety innermost, nickel first out, hook first in). No installed formation makes it fire as
  meant: gun_wing_12's stack_strong is a wing behind the Y (closed trips, Poach); heavy_13 has a weak stack and a
  reduced #1. A 2x2 or 3x1 set with a receiver stack or a reduced #1 would.
- PALMS_FIX (Palms trap on #2's out declared inside 5 yd, the wheel before the throw): written, held. It changed no
  staged play: no installed concept runs #2's out between 6 and 7.5 yd or a pre-throw wheel. Measured MOD vs Palms
  (gun_doubles_11, gun_spread_10, 70 plays each) differ by two or three single breakaway plays, within noise.
