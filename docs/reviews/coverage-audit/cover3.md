# Cover 3 coverage-rule audit (Sky spot, Sky match, Match/Rip-Liz, Seam, Buzz, Cloud, Cover 9)

Checkout: `develop @ 0d0f4af8`, read-only. Nothing was run. Every code citation is `file:line` on that commit.

## Which football definition is used

All rules come from the **HNFL "Danger / Nine" Key & Match Cover 3/9 family**. It is the most complete per-slot text in the repo, and HNFL-054 calls Nine "aka 6 Rip/Liz".
- Primary source: HNFL-204 *Sub 9 Rob/Lee* (`docs/references/honest-nfl/text/coverage/hnfl-204-*.md` l.30-110). Its OCR is the cleanest.
- Additions: HNFL-056 (l.20-60), HNFL-335 *Danger to 3* (l.40-110), HNFL-016 *Danger 3x1*, HNFL-292 *Individual techniques* (l.46-54) and HNFL-203 *Cover 9 adjustments* (l.140-170, 340-371).
- Spot Sky is judged against the **"true zone / vision & break" column of the same sheet**: HNFL-027 and HNFL-067 (Clue 1/3, Curl-Flat "hold curl, push flat", Hook-Curl, Middle 1/3). The HNFL tree defines no separate "Sky spot" corner.

Status key: **present**, **partial**, **missing**, **wrong**, and **extra** (code does something the source does not say). Paths are abbreviated as follows: `R` = src/sim/coverage/rules.ts, `D` = src/sim/behaviors/defense.ts, `J` = src/sim/coverage/judgment.ts, `RD` = src/sim/coverage/reads.ts, `C` = src/playbook/coverages.ts.

### Wiring (applies to every slot)
- Cover 3 Sky (`C:245-254`) has no rules. Its zone style comes from `coach.matchRate`: `match` gives ZoneCoverage match technique and `spot` gives spotUnderneath (`src/game/playcaller.ts:814-820`, `src/sim/assign.ts:134-141`).
- Calls with rules always run as match. Match/Rip-Liz is `C:267-277` (c3_corner, c3_curl_flat, c3_hook, mike_3). Seam is `C:289-297` (c3_seam = carry 99, no deliver). Buzz is `C:299-308`. Cloud is `C:310-319`. Cover 9 is `C:22-31,331-341`: post = SS `deep_mid` and FS = `curl_flat_w c3_seam`. Strap, Clue and Grab are `C:343-358`.
- **The deep middle has no rule in any Cover 3 call.** It is always the plain `deep_mid` ZoneCoverage.
- A rule is re-run **every tick** (`src/sim/coverage/defender.ts:93-105`). Stability comes only from `state.mode` latches inside each rule. Plain zones (Sky, the zoned-off branches, every deep middle) re-pick their target each tick, choosing the deepest threat or the threat nearest the landmark.
- The release taxonomy has no corner, post or wheel class (`RD:109-114`). Any path ~30° or more off vertical is `out`/`in`, at any depth. Only `climbed` (`RD:100`) remembers that the route went deep.
- Underneath seats are filled only up to the number of free droppers (`src/playbook/alignment.ts:1181`). With a 4-man rush and 4 underneath, `cover3_match`'s fifth seat (`hook_mid mike_3`) is **dropped**. *Not verified* which personnel groups actually field mike_3.

---

## 1. Corners (CB_S, CB_W): "Tight 1/3" (match) and "Clue/true 1/3" (spot)

| Situation | Football rule [source] | Ours [file:line] | Status |
|---|---|---|---|
| Key / leverage | Key #1→2. Man #1 unless he goes shallow (HNFL-204 l.30; HNFL-335; HNFL-292 l.46). Tight alignment. | Match: `c3Corner` man #1, outside leverage, over the top (`R:146-150`). Sky: deep_third ZoneCoverage (`D:1056-1140`). | present (match) |
| #1 vertical | Stay on #1. "Corner is alone with #1" (HNFL-204 stressors). | Match: man #1 (`R:149`). Sky: the `owned` filter forces `vert=[#1]` (`D:1070-1078`). | present (match) / see next row |
| #1 vertical **and** #2 climbs into the third (Sky / true zone) | True-zone 1/3 is "responsible for both #1 & #2 deep", keying #2→1 with vision & squeeze (HNFL-027/067 Clue 1/3; HNFL-292 l.44). | `owned` filter: whenever #1 is in `vert` (depth > 7 **or** any upfield speed past the LOS, `D:1058`), the corner sees only #1 (`D:1076-1077`). The split-two-verticals code (`D:1109-1113`) cannot run for a corner. The comment at `D:1060` says "only takes #2 if #2 works out to him", but the filter blocks even that. | **wrong** (Sky spot and Sky match) |
| #1 stops or curls at 10-14 under him (Sky match) | Stay deep until the throw while #2 is still climbing in the third (same source). | Deep-drive is meant to be blocked "while another receiver is climbing" (`D:1091-1095`). `climbing` is computed over the filtered `vert` (#1 only, `D:1093`), so the guard is always false and the corner drives on #1's curl while #2 climbs behind him. Spot is exempt outside the red zone (`D:1095`). | **wrong** (Sky match) |
| #1 shallow "In" (under/in inside the no-cover zone) | "In" call: zone the 1/3 and pattern read Corner→Seam→Curl. Shallow = jersey visible within 2 yd of the route (HNFL-056; HNFL-204 l.30-36). | `zoneOffOne` locks the zone-off after 0.35 s when deepest ≤ 5 (`R:79-120`). Then deep_third ZoneCoverage takes the deepest threat in the band (`D:1087`). There is no Corner→Seam→Curl priority. | present / partial |
| #1 quick out, flat or short stop **without** #2 vertical | Still #1: only "In" releases him. The Smash exception (#1 short with #2 vertical: "Smash = push to #1", corner zones the 1/3) needs #2 vertical (HNFL-016). | `c3Corner` calls `zoneOffOne(c, one)` with `china=true` (`R:148`), so any out/flat/stop ≤ 5 yd zones him off (`R:119`), whatever #2 does. In the deep zone, `vert` is then empty and he goes to the 16-yd landmark (`D:1079-1086`, `src/playbook/alignment.ts:768`). The apex pushes to #1 only on `stop` with #2 vertical (`R:173-176`). **Contradiction:** the code's cited source is HNFL-079 MOD (a quarters corner), not the HNFL Tight 1/3. | **wrong** |
| #1 out-and-up | Still #1. | `zoneOffOne` is not latched for out/flat, so he re-mans #1 once deepest > 5 (`R:104,119`). The reaction costs a technique restart. | present |
| #1 intermediate in (dig) | Man #1 ("plays as Cover 1 vs verticals & outs", HNFL-335). | Man #1 (`R:149`). However, `J:52-57` can override to man on another climbing, uncapped `vertical` within 14 yd once #1's release is not vertical. | present + **extra** (help switch not in the source) |
| #2 corner route | Belongs to the seam/flat ("match outs"). A zoned-off corner reads Corner first (HNFL-204). | If #1 is vertical, he stays on #1 (correct). `J:47` counts only `release==='vertical'` as a deep threat, so an outside break never triggers help. | present (rule) / gap is in the apex row |
| Clue (bunch/stack) | Key 2→1. #2 cancels → lock #1. Only #2 vertical → squeeze #2. Both vertical → vision & squeeze (HNFL-091; HNFL-203 l.354-364). | `clueCorner` (`R:547-561`). The "both vertical" case is a plain zone, not a squeeze. | present / partial |
| Cloud strong side | Cloud corner: flat/force. Rotated safety plays the deep 1/3 (HNFL-027 Cloud 1/3, key 1-2, responsible for #1 and #2 verticals). | CB_S `cloud_corner` flat (`C:313`, `R:380-400`). SS deep third uses **`c3_corner`** (man #1, `C:314`), not a Cloud 1/3 key 1-2. | partial |
| On the throw | Play the ball. | ManCoverage `playBall` (`D:666-677`); ZoneCoverage `D:940`. | present |

## 2. Deep middle (FS; SS in Cover 9): "Middle 1/3"

| Situation | Football rule [source] | Ours | Status |
|---|---|---|---|
| Key / landmark | Key inside-out (3-2-1). Drop to the deep middle, favoring the most dangerous side; lean to speed (HNFL-335; HNFL-292 l.54; HNFL-016). | No rule in any Cover 3 call (`C:250,272,294,304,315,326`, `C:25`). Plain `deep_mid` zone: landmark 15 yd (`alignment.ts:771-772`), fixed band `[W/3-3, 2W/3+3]` (`D:1373-1374`). | partial (no numbered key) |
| One seam | Squeeze it top-down, inside-out (HNFL-056/204). | Takes the deepest threat in the band, re-picked each tick (`D:1087-1088`), 1.6-2.4 yd over the top (`D:1107-1119`). | present (nearest-deepest, no ownership) |
| Two seams | Split and squeeze (HNFL-056; HNFL-016 "vision & squeeze seams"). | Splits the two deepest, weighted 0.35/0.65 by QB eyes (`D:1109-1113`). | present |
| No seams | "Turn attention outside to squeeze wide if #1 is vertical" (HNFL-056). | The band stops 3 yd outside the middle third (`D:1374`), so he cannot squeeze to an outside #1. With nothing in the band he goes to the landmark and leans to the eyes (`D:1079-1086`). | **missing** |
| #2 corner / out-and-up from the slot | Not his. This is the seam/flat's "match outs". Squeezing from the inside is implied by "squeeze wide". | The route leaves his band as it breaks out (`D:1037`). `J:53-57` override needs `release==='vertical'` (`J:47`). | missing (no help) |
| Stopped route under him | Not stated in source ("vision & squeeze"; break on the throw). | Match style: deep-drive downhill on it when nothing else climbs in the band (`D:1095-1104`). `J:58-72` can also "rob" a short break within 10 yd. | **extra** |
| On the throw | Break on the ball. | `D:940` / `J:28`. | present |

## 3. Strong curl-flat / overhang ("Seam/Flat", Match-Carry-Deliver on #2)

Rules by call:
- Match and Buzz use `c3_curl_flat` = `seamCurlFlat(c,12,true)`.
- Seam and Cover 9 use `c3_seam` = `seamCurlFlat(c,99)` (`R:743-746`).
- Sky uses a plain zone (match or spot).

| Situation | Football rule [source] | Ours | Status |
|---|---|---|---|
| Key / leverage | Key 2→1, aware of #3. Squeeze alignment and squeeze technique on #2 (HNFL-335; HNFL-292 l.50). | Reads #2, then #1, then #3 (`R:160-165`). Waits on #2's release (`R:179`). Inside leverage while matched (`R:189`). | present |
| #2 vertical | "Carry seams": carry #2 vertical. No depth handoff in Danger/Nine. The post squeezes from above (HNFL-204, HNFL-335). | Seam/9: carry with no limit (`R:180-189`). Match/Buzz: deliver at **12 yd** unless no visible cap is projected (`R:181-188`). The 12-yd handoff is a Rip/Liz installation choice and is **not in the HNFL Nine text**. | present (Seam/9); partial (Match) |
| #2 out / flat (crosses his face to the flat) | "Match #2 out." "#2 Out" = any route by #2 that crosses your face to the flat (HNFL-056; HNFL-335 "match outs"). | Any non-vertical, non-block release latches `mode='zoned'` (`R:191`). He drops to curl_flat ZoneCoverage, which takes the lane of the threat nearest the landmark, re-picked each tick (`D:1198-1209,1253-1282`). The #2-flat expansion (`D:1216-1246`) runs only if the nearest threat is #1, **there is no #3, and no back is releasing fast** (`D:1224`). | **wrong** (zone-off instead of match) |
| #2 vertical → breaks out to the corner (corner, out-and-up, sail) | "Match #2 out **& up**." Carry, then stay on the out-break. After a zone-off, think "Seam→**Corner**→Flat" (HNFL-056; HNFL-204). | The break reads as `out` (`RD:111`). `R:191` then zones him off **at the break, at any depth**, before or after the 12-yd carry. As a zone, he can only carry `vel.x>4.5` threats inside 10 yd (`D:1183-1184`). Otherwise he sits **underneath** the route (`D:1254`, lane x ≤ receiver x - 0.5). | **wrong / missing** (core corner-over mechanism) |
| #2 flat → wheel | "Out & up" stays his (HNFL-056). HNFL-203 l.170: chase the flat threat top-down "with awareness for a potential Wheel". | Latched `zoned` on the flat (`R:191`). The zone carry stops at 10 yd (`D:1183`). The corner is man on #1 and the post's band is the middle. Past ~10 yd nobody owns the wheel. | **missing** |
| #2 under / shallow | "Deliver shallows" to the ILB, zone off curl-to-flat (HNFL-335). "#2 under = zone off & match final #2" (HNFL-016). **"#3 away = take #2 back across"** (HNFL-292 l.50). | Zoned (`R:191`), and the hook `cut()` picks up crossers ≤ 7 yd within 9 yd of him (`R:201-232`). There is no #3-away carry-across (that rule exists only in `quarterFlat`, `R:338-341`). | partial; **#3-away carry missing** |
| #2 intermediate in (dig by #2) | Not stated as a rule. HNFL-204 lists it as a known stressor ("leaves the Apex vulnerable"). | Zoned (`R:191`). | n/a (as source) |
| #1 short (Smash) with #2 vertical | "Smash = push to #1" (HNFL-016). | `smash` mode only when #1 reads `stop` with deepest ≤ 5 and #2 vertical (`R:173-176`). An out by #1 does not trigger it. | partial |
| #3 fast to the flat (Push) | Seam/flat chases #3 top-down; the hook pushes to #2 and carries the seam (HNFL-016; HNFL-203 l.150-170). | `push` (`R:169-172`): needs `release==='flat'` and depth < 2 (`R:153`). | present (narrow trigger) |
| Back releases to his side, x1 (weak seam/flat in Strap) | Seam/flat on the back (HNFL-203; `C:344` note). | `backTo` is #2 when there is no #2 (`R:162-163`). | present |
| Sky **spot** (vision & break) | "Curl dropper, eyes to the QB, feel routes inside-out. **Hold curl, push flat**" (HNFL-027/067). | Sprints to an 11-yd spot (`D:922-926`), leans to the eyes, and **cannot come below `lm.x-2` (~9 yd) before the throw** (`D:1330`) unless he planted shallower (`D:1331`). Never follows a route out of radius 11 (`D:1334`). | partial (push-flat has width but no depth) |
| Sky **match** | Same football rule. | Carries a vertical inside 10 yd, then lets it go (`D:1183-1197`). Nearest-threat lane re-picked each tick (`D:1198-1209`). | partial |
| On the throw | Break on the ball. | `D:940`; ManCoverage `D:666`. | present |

## 4. Weak curl-flat (Rip/Liz weak overhang; Cover 9 rotated FS; Strap seam/flat on the back)

Same football rule as section 3 ("Match-Carry-Deliver on #2 weak with awareness of #3", HNFL-204 l.76). Same code (`seamCurlFlat`, sides via `zoneSide`), with the same statuses. Differences:

| Situation | Football rule | Ours | Status |
|---|---|---|---|
| Cover 9 rotated safety alignment | Weak apex aligns relative to #2 weak, rotating from two-high (HNFL-056). | FS `curl_flat_w c3_seam` shown at 11 yd (`C:30`). | present |
| x1 weak side: back release | Strap: seam/flat takes the back. Weak ILB has "anything coming back from final #4" (HNFL-335). | `backTo` when there is no W2 (`R:162-163`). | present |
| #2 weak inside (3-step slant/under) with #3 away | Listed as a stressor ("tough leverage for Apex on 3-step inside routes by #2 weak with #3 away", HNFL-056). The answer is "#3 away = take #2 back across" (HNFL-292). | Zoned (`R:191`). | **missing** |
| Mable / cover3_trips / Buzz `hook_w`, `curl_flat_w` seats | Not specified. | Plain zones (`C:328`, `C:264`, `C:307`). | n/a |

## 5. Hooks (hook_s, hook_w; Buzz SS): "#3/Hook" Combo

| Situation | Football rule [source] | Ours | Status |
|---|---|---|---|
| Key | Key #3→2→1. ILBs combo #3: if #3 is to you, match it; if away, zone the hook and pattern read (HNFL-204 l.40-50; HNFL-335). | `c3Hook` keys `S3/W3 ?? back to side` (`R:236-252`), one hook per side (`zoneSide`). | present |
| #3 vertical | "#3 vertical or hook": match and carry. No depth limit stated (HNFL-016, HNFL-335). | Carries to **15 yd**, then latches `zoned` (`R:247-250`). | partial |
| #3 over / intermediate in-breaker | "Match the final #3" (Nine). Strap #3-receiver hook: "cut off any over route by the final #3" (HNFL-204). | `c3Hook` handles only `vertical`. An `in` at depth is dropped, and `cut()` takes only `under` ≤ 7 yd (`R:217`). This rule exists only in `threeRecHook` (`R:585`, Strap/Grab). | **missing** (Nine/Match) |
| #3 to the flat (not fast) **while #2 is vertical** | "Take #3 to the flat if #2 is up". "#2 vertical means Mike or Dime must take #3 to the flat" (HNFL-204 l.40,95). "Take #3 through to the flat unless Push" (HNFL-335). | Only `fastFlat` (depth < 2) triggers anything (`R:243`). A normal flat or arrow by #3 or the back leaves the hook band (`D:1400-1402`). The seam/flat is in man on #2 (`R:189`). The curl-flat expansion is disabled when #3 exists or the back releases fast (`D:1224`). **Nobody owns him.** | **missing** |
| #3 fast flat (Push) | Push to #2 and carry him up the seam (HNFL-016). | `push`: man #2 to 15 (`R:239-246`). | present |
| #3 away / blocks | Zone the hook and pattern read; look for work (HNFL-335). | `cut()` on shallow crossers, otherwise hook ZoneCoverage match lane re-picked each tick (`R:251`; `D:1198-1282`). | present (nearest-threat ownership) |
| Back check-release when a #3 receiver exists on his side | Final #3/#4 combo (HNFL-204/335). | `three = ref(c,3) ?? backTo` (`R:237`): with a #3 receiver present, the back is ignored by `c3Hook` and left to mike_3, which may be unfilled (see Wiring). | partial / *unverified frequency* |
| Sky spot hook | "Hook drop, vision to the QB, feel routes inside-out, **push to curl with #3**" (HNFL-027). | spotUnderneath: eyes lean and nearest-lane squeeze. No push with #3 (`D:1309-1336`). | partial |
| On the throw | Break on the ball. | as above | present |

## 6. Mike / hook_mid (mike_3; Strap bonus_hook / three_rec_hook)

| Situation | Football rule [source] | Ours | Status |
|---|---|---|---|
| Nine (x2) | No separate middle hook: two ILBs combo #3 (HNFL-054, HNFL-204). | `mike_3` seat listed fifth (`C:274`). Dropped with only 4 underneath (`alignment.ts:1181`). | n/a / *unverified usage* |
| Mike as the back's owner | Final #3/#4 is the combo's (HNFL-335). | `mike3`: carries a back's vertical/in/under to 15, else `cut()` or zone (`R:255-262`). | present |
| Strap bonus hook | "Overdrop #3, match final #3 underneath aggressively. No carry" (HNFL-204 l.54). | `bonusHook`: man on S3 under/in/stop < 9 yd, else `cut()`/zone (`R:603-612`). Never latches against a #3 that goes vertical (correct: no carry). | present |
| Strap #3-receiver hook | Key #3→2. Cut off any over route by final #3. If #3 cancels, zone the hook and look for final #4 (HNFL-203 l.150-170). | `threeRecHook` (`R:568-596`): carries to 18; takes the back if he comes within 8 yd. | present |
| Danger 3x1 Mike | "Bonus hook dropper" (HNFL-016). | `cover3_mable` uses `mike_3` (`C:328`), not `bonus_hook`. | partial |

---

## Ranked missing/wrong rules

### (b) The "corner over the curl-flat, under the corner" finding (corner routes caught 11.4 yd past the underneath defender vs 5.4 in the NFL)
1. **The seam/flat does not "match #2 out & up"; it zones off at the out-break** (`R:191` with `RD:111`). In Match, Seam, Buzz and Cover 9 (about 20% of dropbacks with the C3 family), a #2 corner, sail or out-and-up breaks while the corner is correctly man on vertical #1. The apex is then forced into a zone that only sits underneath the route (`D:1183,1254`), so this is exactly the "over the underneath, under the corner" window.
2. **The deep-third corner owns only #1 whenever #1 is upfield** (`D:1070-1078`). The true-zone 1/3 is responsible for #1 **and** #2 deep (HNFL-027). In both Sky styles (~7.6%), nobody deep accounts for a #2 corner route against #1 vertical. In Sky match, the filter also defeats the "another receiver climbing" guard, so the corner deep-drives #1's curl while #2 climbs behind (`D:1093-1104`).
3. **No rule treats a climbing outside break as a deep threat.** The taxonomy turns any 30° lean into `out` (`RD:111`), and `climbing()` (`R:78` uses `climbed`, but `vertical()` at `R:77` and `J:47` require `vertical`). The 12-yd Match handoff check (`R:185`), the corner's help override (`J:52-57`) and the post's override (`J:53`) are all blind to corner routes. This multiplies items 1 and 2.
4. **The post cannot "squeeze wide"** (`D:1373-1374`; HNFL-056 "no seams → squeeze wide if #1 vertical"). A corner route breaking out of the middle band is lost to him immediately, so there is no top-down help over the outside third.
5. **#2 flat → wheel has no owner past 10 yd** (`R:191` latch plus `D:1183`). This is a smaller share of targets but the same over-the-underneath geometry.

### (a) YAC and 10+-yd-after-catch rate (C3 25.8% vs NFL 18.5%)
1. **#3 or the back to the flat while #2 is vertical has no owner** (HNFL-204 "Mike or Dime must take #3 to the flat"; this is the manuscript's Lab 1 "Bust B"). The hook ignores a non-fast flat, the apex is in man on #2, and the curl-flat expansion is disabled when #3 exists. A flat catch with no defender inside ~8 yd is the most direct 10+ YAC generator.
2. **Sky spot underneath cannot push down to the flat before the throw** (`D:1330`, from 11-yd spots at `D:922-926`). Flats and checkdowns are caught with the curl-flat or hook ≥ 9 yd away, so every short catch starts with a long closing run.
3. **The corner zones off a quick out or flat by #1 even without Smash** (`R:148`, `R:119`; the rule is borrowed from the HNFL-079 MOD quarters corner, which contradicts HNFL Tight 1/3). He retreats toward the 16-yd landmark (`D:1079-1086`), and only the curl-flat lane is near #1. That means a sideline catch with a long pursuit angle.
4. **No "#3 away = take #2 back across"** (HNFL-292) for either seam/flat (`R:191`). A #2 slant or under with #3 away is delivered to a hook whose band may not reach (`D:1399-1402`). A shallow caught on the run invites YAC.
5. **The #2 out (flat) is a zone, not a match** (`R:191` → `D:1198-1246`): nearest-threat lane re-picked each tick, with the expansion special case off against 3-receiver sides. This leaves a cushion on outs and flats that turns into YAC, though less extreme than item 1.
6. The corner-over catches from (b) also feed (a): the catch point is between levels with the corner trailing #1 deep. Expect part of the 10+ YAC excess to fall when (b)1 and (b)2 are repaired.

### Not verified
- How often `mike_3` and the fifth Cover 3 Match seat are actually filled.
- Actual trigger rates of `push` and `smash`.
- That `RD:111` labels typical sim corner routes `out` before the 12-yd carry ends. This is inferred from the thresholds, not traced.
- HNFL OCR (HNFL-027/067/016) is machine OCR. HNFL-204 and HNFL-056 wording is clean enough to quote.

---

## Execution: does each rule run as a script or through the player's own recognition?

The coordinator added this question. "Perceived" means the trigger is computed from the defender's own `sim.see()` picture: delayed, lagged and focus-dependent. "Fixed" means a hard-coded threshold that no rating changes. "Hidden" means the trigger reads information the defender could not see.

### Shared read machinery (applies to every ruled seat)
- **Declarations are perceived.** Each defender owns a `ReleaseReader` (`defender.ts:42`). The reader reads `sim.see(a,r)` through `RouteObservation` (`RD:91`). That gives dead-reckoning over the picture's age with a horizon of `reactionTime`, trusted by `anticipation*focus` (`src/sim/coverage-read.ts:12-38`). A new declaration must persist `0.12*(1.6-0.6*focus)` s before it is believed (`RD:58,116-124`), and fakes reset the chain (`RD:125-130`).
  - Rating dependence: `focus` plus `anticipation`, then `reactionTime`. **`playRecognition` does not enter release confirmation.** Its only role is the initial pass/run `readAt` (`src/sim/assign.ts:116`).
  - The classification boundaries are **fixed geometry** (30° lean, 1.8 yd/s, depths 3.5/6.5/7, `RD:100,111-114`).
  - Two defenders keyed on the same #2 read him separately, so a disagreement or late exchange can emerge. This is perceived, not scripted.
- **Receiver numbering comes from the offence's alignment data.** `readRef` → `sim.offAlign.numbering` (`RD:138-141`), computed by alignment (`src/playbook/alignment.ts:472-494`). Pre-snap numbering is visible in principle. However, it is **never miscounted, never updated after the snap**, and "final #3" is not recomputed when a receiver crosses. `sideNow()` (`RD:149`) exists but the Cover 3 rules do not use it. Flag: **scripted numbering**.
- **Technique switches cost real time.** A new directive builds a fresh sub-behaviour from current position and momentum (`defender.ts:96-98,134-147`). Handoff lateness therefore comes from physics. There is no communication model: the delivering defender never knows whether a teammate accepted, except through `hasVisibleCap`'s perceived teammate geometry (`J:95-101`).
- **On the throw (perceived).** `sawThrow` needs eyes on the QB or ball, with reaction `reactionTime*(1-0.4*anticipation)` and the observation delay (`D:1422-1445`). `playBall` keeps the old technique until then (`D:1480-1484`).
  - Exception: `J:28` freezes help decisions on the true `sim.ball.kind==='air'`, **before** the defender has perceived the throw. This is mild hidden information because it stops re-deciding at the real release.
- **QB eyes are hidden.** `sim.qbEyes` is the QB controller's **internal current read target** (`src/sim/behaviors/qb.ts:372-422`). ZoneCoverage compares receiver identity against it directly (`D:1083,1111,1204,1250,1311-1313`), so a zone defender knows exactly whom the QB is reading, with no head/shoulder perception, delay or rating. Look-offs only work because the QB sets `qbEyes` to a decoy (`qb.ts:411`). By contrast, CoverageJudgment uses the perceived QB facing (`J:64-66`). Flag: **hidden** (affects every deep split and every underneath lane).

### Per rule

| Slot / rule | Execution | Rating dependence | Flags |
|---|---|---|---|
| Corner: man #1 (`R:149`) | Perceived trigger (reader). Man technique physics and `DeepCoverage` depth choice (`D:860-866`). | Reader: focus, anticipation, reactionTime. Man technique ratings in ManCoverage. | Numbering scripted |
| Corner "In" zone-off (`R:91-120`) | Perceived declaration, then a **fixed** 0.35 s hold (`R:82`) and **fixed** 5-yd no-cover zone (`R:80`). | None beyond the reader. Discipline and recognition do not move DECLARE or NO_COVER. | — |
| Corner China zone-off on out/flat/stop (`R:119,148`) | Perceived release, fixed thresholds. | Same as above. | Wrong rule (section 1); execution is fine |
| Corner help override (`J:47-72`) | Perceived, re-decided every `decisionInterval`. `protect-vertical` is gated on what is in his field of view (`J:43-45`). The cap test includes a stable per-defender judgment error plus `discipline` (`J:96`). `squeeze-break` confidence uses `focus*playRecognition` plus perceived QB facing plus a judgment draw (`J:67`). | focus, playRecognition, discipline, decisionInterval | Not in the source (extra), but executed through perception |
| Deep-third Sky zone (`D:1056-1140`) | Threats are perceived (`D:1033-1035`, trust `anticipation*zoneCoverage*focus`). The owned-#1 filter matches by **slot identity from numbering** (`D:1075-1077`), not by observed position. The deep-drive gate needs `focus*(0.4+0.6*playRecognition)>0.35` (`D:1099`). Turn-and-run timing is physical (`D:1122-1126`). | anticipation, zoneCoverage, focus, playRecognition, turnRate | Numbering by slot identity; `qbEyes` hidden (`D:1083,1111`) |
| Deep middle zone | Same as the deep-third zone, plus a judgment override (`J`). Re-picks the deepest threat in the band every tick. | Same | `qbEyes` hidden for the split weight (`D:1111`) |
| Seam/flat carry #2 (`R:179-190`) | Perceived release. `readRelease` waits for the declaration (`R:179`). Carry depth is **fixed** at 12/99 (`R:743-746`). The 12-yd delivery needs a perceived teammate cap via `hasVisibleCap` (error ∝ 1-discipline, `J:95-101`). | Reader; discipline for the delivery | Fixed depth with no recognition or speed dependence |
| Seam/flat zone-off on any break (`R:191`) | Perceived, **latched permanently** after one believed declaration. A later re-declaration (out-and-up, wheel) is never re-read. | Reader only | The latch makes it script-like after the first break |
| Push (`R:169-172`, `R:243-246`) | Apex and hook each read #3 **independently**, so a split read is possible (emergent bust). The trigger is fixed (`flat` and depth < 2, `R:153`). | Reader | — |
| Smash (`R:173-176`) | Perceived; fixed 5-yd and `stop` trigger. | Reader | — |
| Curl-flat underneath zone, match style (`D:1166-1282`) | Perceived threats. Carry thresholds are **fixed** (`vel.x>4.5`, 10/13 yd, `D:1183-1184`). Overload hesitation `focus*(0.5+0.5*zoneCoverage)<0.52` when two threats cross (`D:1169-1177`). Nearest-threat lane re-picked each tick. | focus, zoneCoverage, anticipation | `qbEyes` hidden (`D:1204,1250`) |
| #2-flat expansion (`D:1216-1246`) | Uses perceived velocities, but **identifies #2 by slot from `offAlign.numbering`**. Measures "outward" from `offAlign.spots` start positions (`D:1219-1227`), so it knows who #2 is and where he lined up without having to track him. `fastBack` uses `offAlign.spots[...].backfield` (`D:1222`). | knowsPass | Numbering/alignment data |
| Sky spot underneath (`D:1291-1337`) | Sprint to the landmark (fixed depths, `D:922-926`). The lean amount scales with `0.5*zoneCoverage+0.5*anticipation` (`D:1309`). The depth floor is fixed (`D:1330`). | zoneCoverage, anticipation | **`qbEyes` hidden**: in spot the lean target *is* the QB's internal read (`D:1311-1317`) |
| Hook `c3Hook` carry #3 (`R:247-250`) | Perceived release; **fixed** 15-yd release depth. | Reader | Numbering scripted (`R:237`) |
| `cut()` (`R:201-232`) | Perceived crosser: `under`, ≤ 7 yd, within 9 yd, closing > 1.5 yd/s, all fixed. Lets go after 8 yd. | Reader | — |
| `mike3`, `bonusHook`, `threeRecHook` (`R:255-262,568-612`) | Perceived, fixed depths (15/9/18 yd, 8-yd back pickup). `threeRecHook`/`bonusHook` read **`S3` regardless of which side the defender is on** (`R:569,604`): strength-relative numbering. | Reader | Numbering scripted |
| `clueCorner` (`R:547-561`) | Perceived, latched on first qualifying declaration. | Reader | — |

### What this means for the ranked findings
- The top-ranked issues are **intent** gaps, not execution gaps:
  - seam/flat zones off on the break;
  - deep third owns only #1;
  - nobody takes #3 to the flat when #2 is up.
  
  Better recognition ratings cannot repair them because no rule asks for the behaviour. The `R:191` latch also means a player who *does* see the out-and-up cannot react to it.
- Execution has scripted elements that rating differences cannot touch:
  - fixed DECLARE, NO_COVER and carry depths;
  - `playRecognition` absent from release confirmation;
  - numbering from alignment data with no "final #" recount;
  - `sim.qbEyes` as a direct read of the QB's target.
  
  The `qbEyes` read **favours the defence** in lanes and splits. It cannot explain excess YAC or corner-over, but it hides how much worse the zone players would be with perceived eyes.
