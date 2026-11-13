# Coverage-rule audit: Cover 2 (spot, match), Tampa 2, Wild and Inverted

Checkout: `dev` @ 0d0f4af8 (read-only). Report only. No code changed.
Paths are repository-relative. Line numbers are from this checkout.

## 0. How the family is wired today (verified)

| Call | CB_S / CB_W | SS / FS | Underneath seats (filled in order) | Source |
|---|---|---|---|---|
| `cover2` | `flat_s`/`flat_w`, **no rule** | `deep_half_*`, **no rule** | `hook_s, hook_w, hook_mid, curl_flat_s, curl_flat_w`, all unruled | src/playbook/coverages.ts:361-371 |
| `cover2_match` | `flat_*` + `sink_corner` | `deep_half_*`, **no rule** | `hook_s/hook_w` + `c2_hook`, `hook_mid` + `mike_3`, curl-flats unruled | coverages.ts:372-383 |
| `cover2_wild` (trips check) | as match | **no rule** | `hook_mid` + `vertical_hook` | coverages.ts:384-394 |
| `cover2_invert` | `deep_half_*` at 7 yd, **no rule** | `flat_*` + `cloud_corner` (sink=false) at 10 | as match | coverages.ts:395-405 |
| `tampa2` | `flat_*` + `sink_corner` | `deep_half_*`, **no rule** | LB_M `tampa_mid` + `tampa_mike`; `hook_s/hook_w` + `c2_hook`; curl-flats unruled | coverages.ts:406-417 |
| `deuce` / `deuce_dot` | `palms_corner` (dot: W `sink_corner`) | `palms_safety` (dot: FS unruled) | `q_apex`, `bonus_hook` | coverages.ts:418-444 |
| Cover 6 / 8 half side | `sink_corner` | `deep_half_*`, **no rule** | `c2_hook` on the half side | coverages.ts:524-575 |

Dispatch: a zone role with a rule and match style becomes `CoverageDefender(rule)`. Anything else becomes `ZoneCoverage(zone, style)` (src/sim/assign.ts:133-139). An unruled call such as `cover2` is played match or spot by `coach.matchRate`. Any ruled call is forced to match (src/game/playcaller.ts:813-818).

**Seat filling matters.** Underneath seats go to the free defenders in list order, only as many as there are defenders (src/playbook/alignment.ts:1170-1199). With a four-man rush and seven droppers, both corners and both safeties have roles, so the three free defenders take `hook_s, hook_w, hook_mid`. **The `curl_flat_*` seats in Cover 2, Cover 2 Match and Tampa are therefore empty unless the defense drops eight.** In these calls the "curl/apex" players are the `hook_s/hook_w` defenders (landmark: ball ±5 yd at 10 yd, alignment.ts:795-798) and the flat players are the corners.

**Unruled half safeties.** In every Cover 2, Tampa, Wild, Cover 6 half side and Cover 8 strong side, the deep-half safety runs the generic deep branch of `ZoneCoverage` (src/sim/behaviors/defense.ts:1056-1140) inside the lateral band `zoneBand('deep_half_*')`. That band runs from 3 yd past the middle of the field to the sideline and is centred on the field, not the ball (defense.ts:1377-1380). His landmark is 15 yd deep and 13.5 yd from the sideline (alignment.ts:775-778). His alignment depth is 8.2 yd (alignment.ts:858, DEF_ALIGN tracked depth). The generic logic is described in section 2.

### Common execution machinery (cited once, referred to below)

- **E-RR (rule reads).** Rule defenders read through `ReleaseReader` (src/sim/coverage/reads.ts):
  - **Perception.** Each read goes through `sim.see` and `RouteObservation`, with the defender's `reactionTime` and an `anticipation × focus` confidence (reads.ts:91).
  - **Confirmation delay.** A new declaration must persist `CONFIRM 0.12 s × (1.6 − 0.6·focus)` before he believes it, which is 0.12–0.19 s (reads.ts:58, 116-124).
  - **Fixed classification.** Velocity and depth thresholds are fixed, with no rating: break when lateral speed > 1.8 yd/s and > 0.6·|vx|; flat vs out at 3.5 yd; under vs in at 6.5 yd; vertical when vx > 2.5; stop when speed < 2.2 (reads.ts:111-114).
  - **No corner/post/wheel class.** A corner route is 'out' (or 'flat' if shallow and not yet climbed). A post is 'in' (or 'under' if < 6.5 yd). A wheel is 'flat' and then 'vertical'.
- **E-SW (switching cost).** When a rule changes its directive, a fresh technique starts from his current body state (src/sim/coverage/defender.ts:95-100). Handoffs therefore cost real movement time, but the switch itself is instantaneous once the rule fires.
- **E-ZC (zone reads).** Generic `ZoneCoverage` sees receivers through `sim.see`, then `RouteObservation` with confidence `anticipation × zoneCoverage × focus`, projecting each receiver 0.7 s ahead (defense.ts:1029-1039). The responsibility choice (deepest, nearest, split) uses fixed geometry with no rating.
- **E-TH (throw).** On the throw, every technique calls `playBall` after `sawThrow` (defense.ts:1422-1450):
  - A zone-eyed defender facing the QB reacts at the windup plus `observationDelay(reactionTime·(1−0.4·anticipation))`.
  - A man-technique defender reacts when he sees the ball or reads the receiver's hands, which is later.
  - The rule-defender techniques Wall, Trap and Rob are zone-eyed (src/sim/coverage/techniques.ts:22, 34). A `ManCoverage` directive is not.
- **E-JD (deep judgment).** `CoverageJudgment` adds bounded deep-help overrides for **rule** defenders in deep zones only (src/sim/coverage/judgment.ts:21-75). The overrides are protect-vertical and squeeze-break, driven by visible caps, `playRecognition`, `discipline`, focus and QB facing as perceived. **It does not apply to unruled half safeties**, because they are plain `ZoneCoverage`, not `CoverageDefender`.
- **H-NUM (hidden info: numbering).** Rule keys (#1, #2, #3) come from `sim.offAlign.numbering`, the offence's exact alignment numbering (reads.ts:138-141, rules.ts:64-66). Numbering is visible pre-snap, so this is mild. However, it is never rebuilt from what the defender sees after the snap (`ReleaseReader.sideNow` exists at reads.ts:149-157 but no Cover 2 rule calls it). "Final #3" and "new #2" are therefore unavailable to the rules.
- **H-EYES (hidden info: QB target).** `ZoneCoverage` reads `sim.qbEyes` directly at defense.ts:1083, 1111, 1204, 1250 and 1311. That value is the QB controller's internal current read, set in src/sim/behaviors/qb.ts:372-422. At 1083 and 1250 the code also uses `sim.qbEyes.pos`, the receiver's true position, not a perceived one. This conflicts with the CLAUDE.md rule that facing is not measured gaze and that cues must be observable. `CoverageJudgment` does it correctly: it uses perceived QB facing (judgment.ts:64-66).

Status key: **present / partial / missing / wrong**. "Exec" notes how ours is executed: **script** (fixed geometry or threshold, identical every time), **perceived** (through his own delayed and possibly wrong reads), or **hidden** (reads information he could not see).

---

## 1. Family definitions used

- **Cover 2 Match (and Cover 6/8 half sides, Wild).** I use the single definition **"Wild" key & match halves**: HNFL-334 (*Split safety concepts – Wild*), with the role text from HNFL-097 (*Roy/Lou techniques – call side*) and the technique dictionary HNFL-028 (*Coverage techniques – halves*). The squat corner detail is HNFL-099/255 (*Squat reads and reactions*). The code cites HNFL-097/099/255/131/334 for these rules, so the definitions agree.
  - HNFL-071 (*Buster*) is a different member of the family. Its sink corner "Smash = zone off" and "fall off on #2 sail" rules are cited only where they show the source disagreeing with the code.
- **Tampa 2.** Primary definition HNFL-241 (*2026 Ravens Tampa*): Squat corners; apexes "Hook #2"; Mike "Middle Read #3"; safeties "Tampa ½". Cross-checked against HNFL-028 (Tampa ½, Mid Run, Reroute) and HNFL-291 (Tampa corners align in "Smash"). docs/references/coverage-checks/fangio-system.md §B7 and §E10 already record these as the spec delta versus `tampa2`.
- **Cover 2 spot.** "Cloud", true vision & break halves (HNFL-070, HNFL-130 §"2 (Cloud)"), plus the Coverage OS Manuscript §8.
- **Inverted.** Coverage OS Manuscript §8 ("corners as deeper half defenders, rotate safeties toward the short flats").
- **Unverified.** HNFL OCR is machine OCR. Specific depths below that come from OCR are marked (OCR) and should be checked against the image.

---

## 2. Half safeties (deep ½): Cover 2 Match, Cover 2 spot, Wild, Tampa (as ½), Cover 6 half side, Cover 8 strong side

Rule (HNFL-334 SAFETY, HNFL-097 STRONG SAFETY): **"Deep ½ – key #1→#2. Drop to deep-half landmark while seeing the release of #1. If #1 is vertical, widen and see #2. If both vertical, vision & squeeze. If either cancels, cap the remaining vertical threat"**; "If #1 cancels, tighten to deflate #2 top-down." HNFL-028: "keying routes outside-in to eliminate verticals and know how much width they need." HNFL-071/015: "All go = split & squeeze", "No #1 deep = deflate #2 top-down", "Top-down #2 corner", "maintain the roof."

Note for the brief: the brief says "half safety: #2 to #1". **The sources say #1→#2** for the Wild/Roy deep ½ (HNFL-334, 097) and for Tampa ½ ("see #1's release to determine your width", HNFL-241). Only the Buster *tight ½* worries "only about #2/#3" (HNFL-130).

Ours: no rule. Generic `ZoneCoverage` deep branch (defense.ts:1056-1140) works as follows:
1. **Candidates.** `vert` = every non-lineman whose 0.7 s-projected y is in the band, and who is either projected deeper than 7 yd or moving upfield past the line (defense.ts:1028-1038, 1058). There is no numbering, so his own #1/#2, a #3, the back and a backside crosser all qualify.
2. **No vertical.** He goes to the landmark, leaning 0.2·anticipation toward `sim.qbEyes.pos` (defense.ts:1079-1085).
3. **Deepest.** He sorts by projected depth and re-picks `deepest` every tick (defense.ts:1087-1088).
4. **Drive.** If the deepest has slowed below 3 yd/s, is under his landmark, and no other receiver is climbing within 8 yd laterally, he drives on it (match only) (defense.ts:1093-1103).
5. **Position.** Depth is the deepest receiver plus a cushion of about 1.6 + 0.16·vx − 0.6·anticipation (≈1.9–2.5 yd) (defense.ts:1107-1119). Laterally:
   - With 2 or more candidates he takes the midpoint of the two deepest, weighted 0.35/0.5/0.65 by `sim.qbEyes` (defense.ts:1109-1112).
   - With one candidate he sits 0.8 yd **inside** its projected y (defense.ts:1113).
6. **Hip turn.** Hip flip and run are decided by closing speed and turn rate (defense.ts:1120-1126). `DeepCoverage.choose` then keeps depth physically achievable (src/sim/coverage-leverage.ts:16-88).

| Situation | Football rule [source] | Ours [file:line] | Status / Exec |
|---|---|---|---|
| Key and ownership | Key #1→#2 on **his** side; width set by #1's release [334, 097, 241] | No key. The band holds all receivers by projected y; `deepest` is re-picked every tick [defense.ts:1037, 1058, 1087] | **Wrong.** Ownership is "deepest in a field band, re-picked each tick". Exec: perceived positions (E-ZC); choice is script geometry |
| Landmark | Deep ½ ≈1 yd inside the top of the numbers at ≈20–22 yd; Wide ½ ≈3 yd outside the numbers [291, OCR, pairing of numbers to labels unverified] | 15 yd deep, 13.5 yd from the sideline (≈4.5 yd inside the numbers) [alignment.ts:775-778]; aligned at 8.2 yd [alignment.ts:858] | **Partial.** Shallower and narrower. Only used when no vertical is present. Exec: script |
| #1 vertical, #2 not vertical (out/flat/under/stop) | Widen with #1, squeeze to #1, aware of #2 [334, 097] | `vert` = [#1] (unless another body is in the band). He sits 0.8 yd inside #1's projected y, about 2 yd over the top [defense.ts:1113-1119] | **Present (approximate).** Inside-shaded over-top. Exec: perceived; fixed 0.8 yd shade and cushion with no rating, except anticipation trims the cushion |
| #1 vertical + #2 vertical (all go) | Vision & squeeze: split, then break on the QB [334, 015 "split 'em & squeeze", 071] | Midpoint of the two deepest, weighted by `sim.qbEyes` (0.35/0.5/0.65); depth = deepest + cushion [defense.ts:1109-1112] | **Partial.** The split exists. The "squeeze" is driven by the QB's internal read target (**H-EYES**), not perceived eyes or shoulders. In 3x1 the third vertical is ignored |
| #1 cancels (hitch/in/out short), #2 vertical (seam, bender) | Tighten and deflate #2 top-down [097, 015] | `vert` = [#2], 0.8 yd inside, about 2 yd over [defense.ts:1113] | **Present** while #2 stays in the band. Exec: perceived. No intent to "tighten" beyond following the deepest |
| #1 corner + #2 seam (both climbing) | Both vertical: vision & squeeze. Squat corner under #1 [334, 099] | Split of the two by projected y, eyes-weighted. The corner route's projected y moves outside quickly, so the midpoint drifts wide while the seam sits behind the hook's 12 yd handoff [defense.ts:1109-1112; rules.ts:300] | **Partial** |
| Smash: #1 hitch + #2 corner | #1 cancels, so deflate #2's corner top-down. The vertical-curl nickel can **undercut the corner with no #1 vertical, knowing the SS helps** [015]. Squat corner stays under #1 (Wild) | Safety: `vert` = [#2 corner]. No drive while vx > 3. Over the top, 0.8 yd **inside** the projected y [defense.ts:1095, 1113]. No underneath defender is under the corner (see §4, §3) | **Partial.** He is top-down, but alone. Exec: perceived. Leverage shade is fixed toward the ball |
| #2 post / bender into the middle (Cover 2, middle open) | #2 vertical is his to deflate top-down. In Cloud: "close the post" vs #2/#3 seam [130, OCR placement ambiguous] | The band ends 3 yd past the field centre. Once #2's projected y leaves it, he drops #2 and the **other** safety's overlapping band may pick him up as its "deepest", competing with its own #1 [defense.ts:1037, 1377-1380] | **Wrong** (implicit, uncommunicated handoff by geometry). Exec: script band boundary |
| Backside / crosser / #3 / back entering the band | Relates only to his #1/#2 (#3 in 3x1 Wild belongs to the vertical hook) [334, 068] | Any receiver in the band can become `deepest` [defense.ts:1058] | **Wrong.** He can be pulled by a deep over from the far side |
| Wheel / out-and-up by #2 or the back | Squat corner: "top-down the flat". Safety caps the remaining vertical [099, 334] | Picked up only once it projects past 7 yd and is the deepest [defense.ts:1058, 1087] | **Partial**. Exec: perceived; late by construction |
| Every route stops (curl, dig, comeback under him) | Cap the remaining vertical. If none, play the throw top-down | Drive on the stopped deepest route if nothing else climbs within 8 yd laterally (match only; spot waits unless in the red zone) [defense.ts:1093-1103] | **Present.** Exec: perceived; gated by focus·(0.4+0.6·playRecognition) > 0.35 [defense.ts:1099] |
| Handoff from the hook (#2 walled to depth) | Hook walls #2, then the safety deflates him [334, 097] | No handoff. The hook stops walling at a fixed 12 yd [rules.ts:300]. The safety independently has #2 in his band | **Partial** (handoff by coincidence, no observable trigger such as "safety on top"). Exec: script 12 yd |
| Tampa ½ | Deep ½ to a **wider** landmark; see #1 for width; vision & squeeze upfield threats outside-in. The Mike owns the post and seam [241, 028] | Identical to the Cover 2 safety. The band still extends 3 yd past the middle, so he splits #1 and the seam the Mike is carrying [coverages.ts:412-413; defense.ts:1377-1380] | **Wrong.** He is not wider and double-covers the pipe |
| Wild 3x1 backside (weak) safety | "Wide ½": ≈3 yd outside the numbers, essentially a cloud rotation over X, because the vertical hook carries #3 [291, 068] | Generic `deep_half_w`. The band extends 3 yd onto the strong side, so trips #3 can enter [coverages.ts:390-391] | **Partial** |
| On the throw | Break on the QB's release to the catch point [070, 130] | E-TH; zone eyes [defense.ts:940] | **Present.** Exec: perceived reaction (anticipation, observation delay) |
| Deep help judgment (protect vertical, squeeze break) | Vision & squeeze | Not available: E-JD runs only for rule defenders | **Missing** for unruled halves. Ruled `palms_safety` (Deuce) has a real #2-key rule [rules.ts:357-374] |

---

## 3. Squat / sink corners (Cover 2 Match, Tampa, Cover 6 half side, Cover 8 strong, Deuce DOT weak): `sink_corner` → `cloudCorner(c, true)` (rules.ts:380-400)

Rule (HNFL-099/255, HNFL-097 CORNER, HNFL-334 CORNER):
- **Alignment:** squat at cloud depth, 5–7 yd, about 1 yd outside #1.
- **Release:** collision #1 with 2 lateral shuffles outside-in and funnel him inside. Then open and get depth, "ass-to-sideline", while seeing #2 and #3.
- **Flat:** top-down the flat; the ball brings you flat. Against a vertical stretch (high/low) **maintain depth** and squeeze the deep window.
- **No flat threat:** convert to man under on **final** #1 with the safety looming. "Sink with #1 until the ball brings you down. Top-down any high/low route combination and compress the space for any potential hole shot."
- **Run:** primary force.

| Situation | Football rule [source] | Ours [file:line] | Status / Exec |
|---|---|---|---|
| Alignment | 5–7 yd, ~1 yd outside #1 [099/255] | `flat`: 4 yd, shade 0.5 outside [alignment.ts:857] | **Partial**. Exec: script (tracked depth) |
| Release: collision and funnel #1 inside | 2 lateral shuffles, outside-in reroute [099, 097, 241] | No collision technique for zone or rule defenders. `CoverageDefender.make` always builds `ManCoverage` with `press=false` [defender.ts:140]; `ZoneCoverage` has none | **Missing** |
| Before #2/#3 declare | Open, gain depth, eyes through #2/#3 [099] | `zoneOf(flat_*)` → match-underneath `ZoneCoverage`: lane of the receiver nearest the 4 yd flat landmark (usually #1), re-picked each tick [rules.ts:399; defense.ts:1198-1209, 1253-1282] | **Wrong** (no sink; sits in the lane at about 4 yd). Exec: perceived positions; script choice |
| #2/#3/back declare flat (flat, or out < 6 yd) | Top-down the flat; keep depth vs high/low; "only the ball will bring you down" [099/255] | Locks `mode='flat'` → generic flat-zone lane on the receiver nearest the landmark. Target `min(lane.x, best.pos.x − 0.5)` drives him down to the flat route's depth [rules.ts:382-386; defense.ts:1253-1254]. `ZONE_SETTLE` (default on) then plants him at his current depth once the QB sets [defense.ts:62, 1045-1054, 1278-1279] | **Wrong**: he triggers on the flat by route position, not the ball, and gives up depth under #1's corner/fade (Sail/Snag high/low). Exec: flat trigger perceived (E-RR); the lock is permanent |
| Flat declared, then #2 turns up (wheel) | Top-down the flat; #2 up becomes a vertical for the safety, corner carries the wheel ("chase the wheel", HNFL-071 Bingo) | `mode='flat'` never unlocks; flat lane only [rules.ts:383-385] | **Wrong** |
| No flat threat, #1 releases | Man under final #1 with safety help [099/255, 334 "latch onto #1 from underneath and deflate the space"] | When all of #2/#3 have declared non-flat, `mode='under'` → `man(#1, outside, trail)`, no depth limit [rules.ts:392-398] | **Present**. Exec: perceived declarations (E-RR) for both #1 and inside receivers. The trigger waits for every inside receiver to declare, so a slow #2 release delays the conversion. Fixed rule, no rating |
| x1 side (no #2/#3) | Squat on lone #1 ("Smack" vs an oversplit funnels wide) [241, 068] | `inside=[]` → `declared` is true at once → man under #1 on his first release [rules.ts:392-397] | **Partial** (no Smack funnel-wide variant) |
| Converted to man-under, then the back releases late to his flat | Locked: "convert to man under" (the ball brings you flat) [099] | The flat check runs **before** the `under` check, so a later flat threat flips him to `mode='flat'` and he leaves #1 [rules.ts:382-394] | **Wrong**: abandons #1 mid-route, which opens the hole shot |
| Smash: #1 hitch + #2 corner | Wild squat stays under #1, but must "top-down any high/low route combination and compress the space for any potential hole shot" [097]. Buster sink corner: "Smash = zone off (sink…)" [071, OCR]. Tampa "Smash" corner: play #1 inside-out, flip hips, see the QB through #2/#3 [028, 291] | Man-under trail on #1. ManCoverage closes on the hitch; nothing sinks under #2's corner [rules.ts:394-397; defense.ts:847] | **Partial/wrong**: no high/low top-down; the corner route is 1-on-1 with the safety (see §4) |
| #1 corner route | Man under #1, outside leverage, safety over | Man-under trail, outside lev [rules.ts:397] | **Present**. Exec: ManCoverage technique (ratings via ManCoverage) |
| Sail (#1 clear-out, #2 corner/sail) | Buster: "sink with #1, fall off on #2 sail" [071] (Wild text silent) | Trails #1 vertically; never falls off | **Missing** (Buster detail; lower priority) |
| On the throw | Plant and attack the catch point; tackle on first contact [099] | Flat mode: zone eyes, E-TH. Under mode: `ManCoverage` → `sawThrow(man)` waits for the ball or the receiver's hands [defense.ts:1443-1449] | **Present**. Exec: perceived; man mode reacts later to throws elsewhere |
| Comment/code mismatch | n/a | Docstring and coverages note say "sinks under #1 to ~13 yd" [rules.ts:377-378; coverages.ts:374]; the code has no depth limit | Doc drift only |

**Tampa corners** use the same `sink_corner`. HNFL-241 Tampa "Squat" is a **vision** technique: "flip hips to get vision back to the QB. Sink until the ball brings you back down." HNFL-028/291 say Tampa corners align in "Smash" (play #1 inside-out, then see the QB through #2/#3). Ours plays a key-and-match man-under on #1 with man eyes. **Partial/wrong family.**

**Cover 2 unruled corners** (`cover2`, both styles: 2.3% spot, 1.7% match-style). The rule (Cloud, HNFL-070/130) says the cloud flat defender plays "fade-to-flat", corners and apexes "only sink until called off by deep help", and they poach routes using their eyes.
- **Spot style:** `spotUnderneath` sprints to the 5.5 yd spot, settles and leans to `sim.qbEyes` (**H-EYES**) [defense.ts:1291-1336].
- **Match style:** lane of the nearest threat to the 4 yd landmark, re-picked each tick [defense.ts:1198-1282].
- **Both styles:** no reroute and no sink. **Wrong.**
- **Low red zone special case.** Ours sinks under #1 with outside leverage unless a flat threat enters [defense.ts:1142-1162]. **Present (red zone only).**

**Inverted Cover 2.**
- **Corners** run the generic half safety (§2) from a 7 yd alignment [coverages.ts:399-400]. **Partial.**
- **Safeties** use `cloud_corner` (sink=false) at 10 yd: flat zone on any flat threat, otherwise a flat zone anyway. They never sink and never wall #2 [rules.ts:380-399 with sink=false; coverages.ts:401-402]. The dedicated `invert_safety` rule (wall #2 to 12) exists [rules.ts:737-739] but **no coverage uses it**. **Partial; dead rule.**

---

## 4. Hook/apex ("vertical curl") players: `c2_hook` → `verticalCurl` (rules.ts:514-523, `wallTwo` 294-306)

Used by `hook_s/hook_w` in Cover 2 Match, Wild, Inverted and Tampa, and on the Cover 6/8 half side.

Rule (HNFL-097 NICKEL, HNFL-334 APEX, HNFL-028 "Vert. curl"):
- **Key:** #2→#1. Wall #2 with awareness of #1.
- **#2 up:** match #2 up & in, OR zone the curl and wall off any new #2 coming back to you.
- **#2 shallow:** take him if #3 occupies the midpoint.
- **#2 fast flat:** zone the curl and close off the window.
- **#2 corner:** HNFL-015 adds "Nickel can undercut corner w/ no #1 vertical knowing SS helps" and "wall #2."

| Situation | Football rule [source] | Ours [file:line] | Status / Exec |
|---|---|---|---|
| Alignment | Wall alignment inside #2, or heads-to-wall [291, 068] | Hook seat; landmark ball ±5 yd at 10 yd [alignment.ts:795-798]; alignment 4.5 yd, shade −0.5 [alignment.ts:860] | **Partial** (relative to the ball, not to #2). Exec: script |
| #2 vertical | Wall #2 and match him up [097, 334] | `Wall` on #2 until 12 yd, then `mode='zoned'` → hook zone [rules.ts:299-302; techniques.ts:89-103] | **Present** (wall). Handoff is a fixed **12 yd**, not "safety on top". Exec: release read perceived (E-RR); handoff is a script depth; wall speed uses `zoneCoverage` [techniques.ts:99] |
| #2 intermediate in (post/dig, "up & in") | Match #2 up & in [097, 334, 028] | `release==='in' && depth<14` → `man(#2, inside)`, locked with no end depth [rules.ts:516-519] | **Present**. Exec: perceived. The 'in' class needs ≥6.5 yd (reads.ts:112) |
| #2 corner route (out-breaking at 8–12 yd) | With no #1 vertical, undercut the corner knowing the SS is over [015]; "wall #2" | When #2's read becomes 'out', `wallTwo` sets `mode='zoned'` [rules.ts:304] → hook zone at ball ±5 and cut. **He releases #2 as it breaks away** | **Missing** (direct source of the corner-over-the-underneath-defender pattern and the Smash fixture). Exec: perceived trigger; the drop is scripted |
| #2 shallow under (drag) | Take #2 shallow if #3 occupies the midpoint [097] | `zoned` → `cut()`: jumps the nearest 'under' crosser ≤7 yd coming toward him within 9 yd [rules.ts:201-233, 522] | **Partial** (generic cut, no #3/midpoint check). Exec: perceived |
| #2 fast flat | Zone the curl and close off the window (under #1's curl) [097, 334 "zone the curl and wall off the new #2"] | `zoned` → generic hook zone: lane of the receiver nearest the **hook** landmark (radius 7.5 + 2), re-picked each tick [defense.ts:1198-1209] | **Partial/wrong**: hook landmark, not the curl window; #1's curl at the numbers is often outside his pick radius |
| New #2 coming back (#1 dig/under inside) | Wall off any new #2 coming back to you [097, 334] | Generic lane or cut; no "new #2" concept (H-NUM: numbering fixed at alignment) | **Partial** |
| #2 stop (curl/hitch at 6–10) | Zone the curl / squeeze | `zoned` → generic lane, usually #2 | **Present (generic)** |
| On the throw | Break | Wall and zone are zone-eyed (E-TH) | **Present** |
| **Tampa apex ("Hook #2")** | "Aggressive reroute on #2 before dropping inside the final #2. See release of #1 to determine how to proceed" [241]; HNFL-028 "Reroute: reroute #2 and drop to close the curl window". The Mike has the seam | Same `c2_hook`: walls #2 vertical to 12 yd, so he is pulled out of the curl/dig window the Tampa structure wants him in [coverages.ts:416] | **Wrong family** (Wild technique in Tampa; no reroute; no final-#2 drop) |
| **Cover 2 unruled hooks** (`cover2`) | Cloud "curl vision": get to the spot, vision, break on the QB's cue [070, 130] | Match style: carry a vertical within 6 yd of the landmark to 13 yd, else lane of the nearest threat, re-picked each tick [defense.ts:1183-1209]. Spot style: `spotUnderneath` with `sim.qbEyes` lean [defense.ts:1311-1327] | **Partial**. Exec: perceived positions; target choice from H-EYES |

**Curl-flat seats (`curl_flat_*`)** are unfilled in these calls with seven droppers (§0). When filled (eight droppers) they are unruled generic curl-flat zones: carry to 10 yd, the special flat expansion, then the lane [defense.ts:1183-1246]. Rule: n/a in the 5-under Wild structure, since the corner is the flat player. **Not audited further.**

---

## 5. Middle hook (Cover 2 Match `mike_3`) and Wild vertical hook (`vertical_hook`)

Rule (HNFL-334 MIDPOINT, HNFL-097 MIKE): "Middle hook – key #3→#2→#1. Wall technique on the final #3 in the distribution. #2 will almost always be occupied by corner or apex, so focus on #1 & #3." "If 3x1 and no Trix, play vertical hook technique and carry #3."

| Situation | Football rule [source] | Ours [file:line] | Status / Exec |
|---|---|---|---|
| Key | #3→#2→#1, **final** #3 [334, 097] | Keys only the back `B` (`B2` ignored) [rules.ts:256] | **Partial** (no final #3; a TE or flexed #3 in 2x2 is not keyed; H-NUM) |
| #3 (back) vertical / angle / under | Wall and carry final #3 [334] | `man(B, inside)` to 15 yd, then `zoned` [rules.ts:257-260] | **Present** (man, not wall). Exec: perceived; script 15 yd |
| #3 to the flat / blocks | Zone the hook, find #1 inside (dig) | `cut()` or the hook_mid zone lane [rules.ts:261] | **Partial** |
| 3x1 Wild | Vertical hook: carry #3 up the middle between the halves [028, 097, 334 "Midpoint has #3 vertical with minimal help"] | `vertical_hook`: when S3 is vertical, `man(S3, inside, trail)` to 18 yd, else `mike3` [rules.ts:528-539] | **Present**. Exec: perceived. The S3 identity is the alignment numbering (H-NUM; a motion that changes trips after alignment is not re-read) |

Unruled `cover2` `hook_mid` uses the generic hook zone (§4 row). Cloud says "Middle read: zone high hole to post, key #3 #2 #1" [070]. Ours: **partial**.

---

## 6. Tampa Mike: `tampa_mid` + `tampa_mike` (rules.ts:402-412)

Rule (HNFL-241, HNFL-028):
- **HNFL-241:** "Middle Read #3 = open hips to the Nickel side and look for any seam threats to determine how much depth you need. Close the post vs. any seam threat."
- **HNFL-028 "Mid Run":** "closing the post if either #2 or #3 are a vertical threat. If not, they will stay low for #3."
- **Manuscript §8:** "the route he is responsible for determines how and when he opens his hips."

| Situation | Football rule [source] | Ours [file:line] | Status / Exec |
|---|---|---|---|
| Key | #3 (and #2) seam threats, opening to the nickel/passing-strength side [241, 028] | No numbering. Any receiver whose read is `vertical` at ≥4 yd and ≤20 yd, within 9 yd of the snap ball y [rules.ts:408] | **Partial** (can take #1 in a tight split, a TE or the back). Exec: perceived reads (E-RR) |
| Two seams (4 verts) | Close the post: get depth in the middle and squeeze from inside; the safeties widen [241, 028] | Takes the one laterally closest to the ball, **re-picked every tick with no state** [rules.ts:405-411]. Two seams near the ball make him flip between them, and each flip rebuilds a `ManCoverage` (E-SW) | **Wrong** ("nearest threat re-picked each tick", no stable assignment) |
| One seam | Run the pipe / close the post | `man(seam, inside, trail)` with `protectDepth` [rules.ts:411; defender.ts:141] | **Present** (trail on the hip rather than the post landmark; physical result untested here). Exec: ManCoverage technique |
| Seam bends / flattens (bender, post) | Close the post: stay in the middle | The read becomes 'in', `vertical()` fails, so he falls to the `tampa_mid` deep zone (deepest in a ±7 yd central band) [rules.ts:408, 411; defense.ts:1375-1376] | **Partial** |
| No #2/#3 vertical | Stay low for #3 [028] | `tampa_mid` is a **deep** zone: 13 yd landmark at the ball, deep-read branch leaning to `sim.qbEyes.pos` [alignment.ts:773-774, 840; defense.ts:1079-1085] | **Wrong** (stays deep, does not stay low). Exec: H-EYES |
| Deep judgment | n/a | E-JD applies (`tampa_mid` is deep): protect-vertical can override toward any uncapped climber within 14 yd laterally [judgment.ts:38-57] | Exec: perceived, with rating and judgment error |
| Depth ceiling | Runs to the depth the seam threat needs | Drops the candidate past 20 yd [rules.ts:408] | **Partial** (script 20 yd) |

---

## 7. Execution notes (cross-cutting)

- **Rule intent with perceived execution (good, matches the brief):**
  - sink-corner, c2_hook, mike_3 and vertical_hook triggers read declarations through each defender's own `ReleaseReader`: `sim.see`, reaction time, `anticipation × focus` prediction, and a 0.12–0.19 s focus-scaled confirmation (reads.ts:91, 116-124).
  - Exchanges cost movement time (E-SW). Wall, Rob and Trap speeds use `zoneCoverage` (techniques.ts:99, 119).
- **Script thresholds with no rating dependence:**
  - Declaration classes: 1.8 yd/s, 0.6 ratio, 3.5 / 6.5 yd (reads.ts:111-114). "Flat threat" = flat or out < 6 yd (rules.ts:382).
  - Wall handoff at 12 yd (rules.ts:521); in-match < 14 yd (rules.ts:517); Mike_3 15 yd; vertical hook 18 yd; Tampa 9 yd / 20 yd windows (rules.ts:408).
  - Generic band edges, 0.7 s projection, 0.8 yd inside shade, carry-to 10/13 yd, pick radius (defense.ts:1036-1037, 1113, 1183-1205).
  - These are intent parameters. They do not vary by player, and there is no misread beyond the delayed perception feeding them.
- **Re-picked each tick (no stable assignment):**
  - The generic deep-half `deepest` (defense.ts:1087).
  - Generic underneath `best` (defense.ts:1198-1209).
  - `tampaMike` (rules.ts:405-411).
  - The flat-mode corner (generic lane).
- **Locked forever (no re-evaluation):**
  - Sink corner `flat` mode (rules.ts:383-385).
  - c2_hook `in` mode (rules.ts:516).
  - c2_hook `zoned` after any non-vertical #2 read (rules.ts:304).
- **Hidden-information flags:**
  - **H-EYES:** `sim.qbEyes` (QB controller's internal read, and the target's true position) drives every unruled Cover 2/Tampa zone defender's lean, split and pick (defense.ts:1083, 1111, 1204, 1250, 1311).
  - **H-NUM:** receiver numbering is the offence's alignment table, never rebuilt into "final" numbering from the defender's own picture.
  - **Teammate assignments:** no Cover 2 rule reads a teammate's private assignment. The c2_hook → safety "handoff" is not communicated at all (each acts independently), so it is neither cheating nor a real handoff.

---

## 8. Ranked missing/wrong rules by expected effect on YAC and 10+ after-catch rate

Context: C2+Tampa YAC 6.23 / 28.5% vs NFL 4.94 / 14.3%. 50% of our targets are climbing breaks vs NFL 24%. Corner-route catches over the underneath defender are 6 yd deeper.

1. **Vertical-curl apex drops #2 when #2 breaks out (corner/smash).** It should undercut the corner with no #1 vertical while the safety tops it (HNFL-015). Today `wallTwo` zones off on the 'out' read and returns to an inside hook landmark (rules.ts:304, 521-522), so every #2 corner is caught over and outside the underneath defender with only a top-down safety converging. This is the most direct cause of the corner-over finding and the Smash fixture.
2. **Half safety has no #1→#2 key and no stable ownership.** He takes "deepest in a field band, re-picked each tick", splits by the QB's hidden read, drops a #2 post/bender at the band edge for the other safety to inherit, and can be pulled by backside crossers (defense.ts:1037-1113). Climbing breaks between or beside the halves get caught with the nearest defender still mid-split. That covers 50% of our targets and about 20% of dropbacks (C2, Tampa, Cover 6/8 half sides).
3. **Squat corner in flat mode drives on the flat and plants (ZONE_SETTLE) instead of keeping depth until the ball brings him flat** (rules.ts:382-386; defense.ts:1253-1254, 1278). High/low (corner/fade/sail over flat, wheel) leaves #1's route over his head with no squeeze, and the lock never re-opens for a wheel.
4. **Squat corner in man-under mode has no "top-down any high/low, compress the hole shot" behaviour, and a late flat threat pulls him off #1** (rules.ts:382-397). The hitch is covered tight while the hole shot behind him is open. The late-flat flip creates an uncovered #1 at depth.
5. **Tampa: safeties are not wider and the Mike is unkeyed and re-picked each tick.** Safeties use the Cover 2 landmark and band, so they split the Mike's seam and give #1's fade/corner more space. The Mike flips between seams with no "stay low for #3" (coverages.ts:412-414; rules.ts:403-411). Outside deep catches and middle catches after a flip both arrive with no defender closing.
6. **c2_hook after #2 fast flat zones the hook, not the curl window, and has no "new #2" wall** (defense.ts:1198-1209). #1's curl or dig at 10–14 yd is caught with the hook 7+ yd away, producing intermediate YAC.
7. **Tampa apex uses the Wild vertical-curl wall instead of "Hook #2: reroute and drop inside the final #2"** (coverages.ts:416). He leaves the dig/curl window to wall a seam the Mike already owns.
8. **No reroute/collision on #1 (squat) or #2 (Tampa hook)** (defender.ts:140). Releases are clean, so route timing and break depth are uncontested. The effect is indirect, through timing.
9. **Mike_3 keys only the back, not the final #3** (rules.ts:256). A TE or slot #3 in 2x2 runs into the middle hole unwalled.
10. **Cover 2 spot/unruled corners and hooks have no sink, use generic re-picked lanes and `sim.qbEyes`; Inverted safeties use cloud (no wall) and the `invert_safety` rule is unused** (defense.ts:1291-1336; coverages.ts:399-402; rules.ts:737). Low usage (2.3% + 1.7% + 0.7%), but the same flat-trigger and no-sink problem as items 3–4.

Unverified: HNFL OCR depths (Deep/Wide ½ landmarks, Buster "sink to 7") and the placement of "close the post" in HNFL-130 need the images. Item ordering is mechanism reasoning, not measured attribution.
