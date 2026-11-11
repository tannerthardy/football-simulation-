# Coverage-rule audit: Cover 6 / Cover 8 half side, and Cover 1

Checkout: `dev` at develop `0d0f4af8`, read-only. This is a report only. I ran no sims. Every "ours" claim comes from reading the code.

Paths: `S` = docs/references/honest-nfl/text/coverage/, `R` = src/sim/coverage/rules.ts, `D` = src/sim/behaviors/defense.ts, `C` = src/playbook/coverages.ts, `A` = src/playbook/alignment.ts, `G` = src/sim/assign.ts.

Status: **present / partial / missing / wrong**. **Exec** says how the rule is carried out:
- **perceived**: through the defender's own picture.
- **fixed**: a hard threshold with no rating behind it.
- **HIDDEN**: the rule reads information the defender could not see.

## Execution machinery common to every slot below

- **Rule seats.** These are the slots that have a `rule`, and the `robber` zone (G:134-142). They run `CoverageDefender` (`defender.ts:89-131`). Each receiver read comes from `ReleaseReader` (reads.ts:81-135):
  - It starts from `sim.see` (a delayed and lagged picture) passed through `RouteObservation` (coverage-read.ts:12). Its horizon is the defender's `reactionTime`, and its trust is `anticipation × focus`.
  - The release class is set by fixed velocity-angle thresholds (reads.ts:111-114). It has to persist for `CONFIRM 0.12 s × (1.6 − 0.6·focus)` (reads.ts:58, 120) before he believes it.
  - So each declaration is late by his own perception and focus. The rule thresholds that act on it (depths 5/6/7/10/12/15 yd) are fixed. They are not rating-scaled.
- **Locks.** Once a rule sets `state.mode`, the branch stays locked. A misread is kept, and so is a correct read. A technique change builds a new behavior from his current momentum (`defender.ts:96-99`), so every exchange costs real time.
- **Deep help judgment.** `CoverageJudgment` (judgment.ts:21-75) adds "protect-vertical" and "squeeze-break" help. It applies only to rule seats whose nominal zone is deep. It runs at `decisionInterval`, using visible caps and break confidence that scale with `playRecognition`, `focus` and `discipline`.
  - **Every half safety and the Cover 1 FS have no rule.** They run plain `ZoneCoverage` (G:138-140), so they never get `CoverageJudgment`.
- **Plain `ZoneCoverage`** (D:880-1340). Threats come from `sim.see` + `RouteObservation`, with trust `anticipation × zoneCoverage × focus` (D:1023-1035). Threat selection is a fixed lateral band and a 0.7 s look-ahead. The target is re-picked every tick.
  - **HIDDEN:** `sim.qbEyes` is the QB controller's actual current read target, set at qb.ts:372/378/411/422. It is not a perceived gaze. It weights the deep split (D:1111), the deep read point (D:1082) and the underneath target pick (D:1203). CLAUDE.md says "Body facing is not measured gaze". This goes further: it reads the QB's private choice. (`CoverageJudgment` uses `sim.see(qb).facing` instead, which is perceived.)
- **`ManCoverage`** (D:627-878).
  - The target is fixed at alignment from the `prefer` list (A:1241-1291).
  - Tracking runs through `sim.see` with a route-read speed-up after a stable stem of `0.35 + 0.35·(1 − playRecognition·focus)` s (D:777-785).
  - `RouteObservation` trust is `anticipation × manCoverage × focus`.
  - Hip-flip timing uses `turnRate` and `anticipation` (D:812-819).
  - The ball reaction is `sawThrow`: it keys the QB's arm if his eyes allow, otherwise the receiver's hands (D:1422-1451). Both are perceived.
- **Numbering.** Every "#1/#2/#3" in the rules is `sim.offAlign.numbering`, fixed from the offense's pre-snap alignment (reads.ts:138-142).
  - Numbering a set you can see before the snap is fair.
  - It is never re-numbered after the snap. A "final #2/#3" in the source (a crosser, a back, a new #2 after a flat release) only enters through generic `cut()`/`backTo()` logic.
  - This is not hidden information, but it is static information. The defender cannot re-count the distribution he sees.

---

# (A) Cover 6 (Stuff, QQH) and Cover 8 (HQQ): half side and the middle seam

**Reference definition: HNFL-324 "Sub Stuff – Roy/Lou away from nickel"** for Cover 6, and **HNFL-325 "Sub 8 – Roy/Lou to nickel"** for Cover 8. The technique detail is from HNFL-097/100 (Roy/Lou call side) and HNFL-099 (Squat reads).

Catalog mapping:
- `cover6` C:522-532: CB_W `flat_w`+`sink_corner`, FS `deep_half_w` (no rule), seats `hook_w`+`c2_hook` and `hook_mid`+`mike_3`.
- `cover6_rev` (Cover 8) C:555-565: CB_S `sink_corner`, SS `deep_half_s` (no rule), `hook_s`+`c2_hook`.
- `cover8_trix` C:566-576.
- `cover6_area`/`cover6_book` C:533-554: backside as in cover6.

**Seat fill.** Who fills the seats is found by least-total-distance over the first N seats (A:1172-1197). With 3 free underneath players, Cover 6's fourth seat (`hook_s`, plain) is dropped, and so is Area's (`hook_mid`).

**Source vs code naming.** `sink_corner` is named after the Cover 2 "sink". HNFL-324/325 call the half-side corner **Squat**, whose essence is "funnel, sink, top-down" (HNFL-099). The code's docstring (R:376-379) promises "sinks under #1's vertical to ~13 yards squeezing the hole shot". The implementation (R:394-397) does something else: trail man under #1 on any route. See A1.

## A1. Squat corner (CB_W in Cover 6; CB_S in Cover 8 and Trix), rule `sink_corner` → `cloudCorner(c, true)` R:380-401

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Alignment / release | 5-7 yd, 1 yd outside #1; "Collision #1 on 2 lateral shuffles", reroute and **funnel #1 inside**; "COLLISION→FUNNEL→OPEN→SINK" [HNFL-099, 097]. Stressor: "hole shots & routes into curl area are vulnerable if #1 is able to release outside on the CB" [HNFL-324/325] | Before any declaration: `zoneOf(flat)`, a plain `ZoneCoverage` drop toward the flat landmark (4 yd deep, 9 yd from the sideline; A:787-790). No collision, no funnel. Outside leverage starts only once he is in man under #1 (R:394-397) | **missing** | n/a |
| Key | #2-to-#1, with #3 awareness, "to gauge the threat to the flat" [099] | Reads #2, #3 and a released back for a flat (R:382). Waits until #2 and #3 have all declared non-flat/out (R:391-392) | present | perceived (ReleaseReader). Thresholds fixed: `out` < 6 yd |
| #2/#3/back fast flat (or quick out < 6 yd) | "Top-down the flat. Ball brings you flat", keeping depth so he is not "wasted" [099, 324] | Mode `flat` → `zoneOf(flat_w)` (R:383-386). This is generic underneath zone: lane = `lerp(QB, receiver, .82)` capped at `receiver.x − 0.5` (D:1253-1254). That puts him **in front of/under** the flat route. He picks the nearest threat to the flat landmark every tick within radius 13 (D:1198-1210), so it can be #1 rather than the flat route. | **wrong** (under, not top-down) and **partial** (re-picked target) | perceived; target choice per tick; uses `qbEyes` (**HIDDEN**) |
| Flat route turns up (wheel) | Top-down: he stays over the flat and must not be wasted; nickel "must chase wheel routes" [324] | Mode `flat` stays locked. The flat zone never carries a vertical (D:1186 excludes `flat_*`). His lane target is capped at the landmark radius (~15 yd deep). The wheel is left to the half safety | partial | fixed |
| No flat threat | "Convert to man under on final #1. Only the ball will bring you down" [099] | Once #2/#3 declare non-flat: `man(#1, outside, trail)` locked (R:394-397). Trail = he sits 0.6 yd behind #1's hip on a vertical (D:847). "Final #1" = alignment #1 | present (as a sentence) | perceived; lock is permanent |
| **High-low on the corner (Smash: #1 hitch/stop, #2 corner)** | "SINK with #1 until the ball brings you back down. **TOP-DOWN ANY HIGH/LOW ROUTE COMBINATION AND COMPRESS THE SPACE FOR ANY POTENTIAL HOLE SHOT**" [097/100]; "if the offense attempts to stretch the flat defender we maintain our depth… squeeze off the deep window… the ball brings you flat" [099]; Cloud stress points "hole shots behind the corner" [070] | #2's vertical stem counts as "declared", so he locks man on #1 (R:391-396) and sits on #1's hitch at the hitch's depth (ordinary cushion, D:810/827). Nothing keeps him at hole-shot depth. The corner route by #2 is covered only by the half safety from 15 yd / 13.5 from the sideline. This is the **corner-over finding**. | **wrong** | rule intent wrong; execution perceived |
| #1 corner/out-and-up | Sink with #1; the safety tops | Trail man under #1 | present | perceived |
| Throw | Ball brings you down; break on the catch point | `ManCoverage.update` → `playBall` after `sawThrow` (D:664-679). In man he keys the receiver's hands, not the QB (`zoneEyes` false, defender.ts:60-62) | partial (a squat corner should have QB vision) | perceived |
| Run | Primary force [097] | Not audited | - | - |

## A2. Deep-half safety (FS `deep_half_w` in Cover 6/Area/Book/split 2-Man; SS `deep_half_s` in Cover 8 and Trix). No rule, so generic `ZoneCoverage` deep D:1056-1139

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Alignment / landmark | ~14+ yd over #2; landmark ≈ 1 yd inside the top of the numbers at ~22 yd [fangio B2 citing HNFL-068/291] | Landmark 15 yd deep, 13.5 from the sideline (A:775-778). Band = his half plus 3 yd past the middle (D:1380-1383, `[W/2−3, sideline]`) | partial | fixed |
| Key | "Deep ½ — key #1→2. See release of #1 to gauge width" [097/100]; "key outside-in for vertical threats. Top-down. Vision & squeeze" [324/325] | No key. Candidates are any receiver in the band whose 0.7 s look-ahead is past 7 yd or who is moving upfield (D:1058). He takes the **deepest**, **re-picked every tick** (D:1088-1089). No numbering, no #1-first order | **missing** (no ownership, nearest/deepest threat in a band) | perceived (sim.see + RouteObservation), fixed thresholds |
| #1 vertical | "Widen and squeeze to #1 with awareness of #2" [097] | One vertical: over the top on the inside shoulder (`ty = fut.y + inside·0.8`, D:1113) | partial (inside shoulder over a trailing corner gives a high-low on #1) | perceived |
| #1 cancels (hitch/slant/out) | "Tighten to deflate #2 top-down" [097] | Only if #2 is then the deepest in band. No "tighten" landmark shift | partial | perceived |
| #1 and #2 both vertical | Squeeze #1, aware of #2. The vertical-curl apex walls #2 to ~12 [097] | Two verticals: midpoint, weighted 0.35/0.65 by `sim.qbEyes` (D:1109-1112) | partial | **HIDDEN** (`qbEyes` = QB's private read) |
| #2 corner route (with #1 hitch) | Squat corner sinks under, safety tops: a squeezed window | Safety alone, from 15 yd: the deepest climbing threat in band. No corner underneath (A1) | partial (correct alone, but no partner) | perceived |
| #2/#1 stops under him (curl, dig, comeback) | Vision & squeeze; break on the QB's cue (the corner's "ball brings you down"); not wasted on a high-low | **Deep-drive** when the deepest stops (`vel.x < 3`), is under his landmark, is past 6 yd, and no *other* climbing threat is within **8 yd laterally of him** (D:1089-1103). No ball or QB cue. A climbing route 8+ yd away in his half (a #1 go while he drives on #2's curl) does not stop the drive | **wrong** (pattern-triggered drive in a vision half; lateral-8 guard is narrow) | gate `focus·(0.4+0.6·playRecognition) > 0.35` (D:1097) is rating-dependent; the trigger itself is fixed |
| Post by #1/#2 into the middle | Half safety owns inside-out within his half; "Alert Post" void is on the *quarters* side when #2 vertical takes the SS [324/325] | The post stays a candidate while inside the band, which reaches 3 yd past the middle | present | perceived |
| Help judgment | - | No `CoverageJudgment`: no protect-vertical / squeeze-break overrides, unlike the quarters safeties (no rule → no CoverageDefender, G:138-140) | missing (inconsistent with the rule seats) | - |
| Throw | Break to the catch point | `sawThrow` → `playBall` (D:938) | present | perceived (QB arm if eyes on him) |

## A3. Vertical-curl apex (`hook_w`+`c2_hook` in Cover 6; `hook_s`+`c2_hook` in Cover 8; `curl_s`+`c2_hook` in Trix) → `verticalCurl` R:514-526 + `wallTwo` R:294-316

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Alignment / landmark | Wall alignment inside #2 at **curl** depth; zone the **curl** [097, 324] | Landmark `hook_w`/`hook_s` = 10 yd deep, **5 yd from the ball** (A:795-798). Band from the ball to 10 yd to his side (D:1393-1396). Only Trix uses the `curl_s` landmark (11 yd, ≤9 yd from the ball) | **wrong** for Cover 6/8 2x2 (he zones the hook, ~10 yd inside the curl window) | fixed |
| #2 vertical | Wall #2, see #1; carry to the safety [097: "WALL #2"] | `Wall` to 12 yd, then `zoned` (R:303-306; Wall technique techniques.ts:89-103) | present | perceived; wall speed scales with zoneCoverage/unsure |
| #2 up and in (dig/post) | "Match #2 up & in" [097] | `in` before 14 yd → `man(#2, inside)`, locked with no depth exit (R:516-520) | present | perceived; fixed 14 yd |
| #2 fast flat | "Zone the curl and close off the window" [097]; "If #2 is flat, **find #1 and prepare to wall him off as the new #2**. Match final #2 to you" [324/325] | `zoned` → hook zone + `cut()` of shallow crossers (R:308, 524-525) | **missing** (no #1-as-new-#2 wall; zones the hook, not the curl) | perceived |
| #2 shallow under, #3 in the midpoint | "Take #2 shallow if #3 occupies the midpoint" [097] | Only generic `cut()` (≤7 yd, within 9 yd, moving toward him; R:220-232). No #3-occupancy check | partial | perceived, fixed |
| New #2 coming back (crosser from the other side) | "Wall off any new #2 coming back to you" [097] | `cut()` only for shallow (≤7 yd) crossers. An intermediate crosser at 8-14 yd falls to the generic hook lane | partial | perceived |
| Trix / 3x1 "Trips rules" | "Deep Hook technique. Carry #2 vs All Go"; BAL: "carry #2 only if #3 is vertical" [325, fangio B3] | Same `verticalCurl`: hands off at 12 | partial | - |
| Throw | Break | `Wall`/zone: `sawThrow` → `playBall` | present | perceived |

## A4. Middle hook (Mike `hook_mid`+`mike_3` in Cover 6/8/Book; `hook_s`+`read_hook` in Trix) and the seam where the sides meet

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Key | "Key 3-2-1 and relate to the final #3 in the distribution. Possibly carry if #3 is a vertical threat" [324]; "Key 3-to-1 (Apex or Corner have all of #2)" [325] | `mike3` keys **only the back** as #3 (R:255-263). Vertical/angle/in release → man to 15 yd, then zoned | partial (a #2 who becomes final #3, e.g. weak #2 under, is only a `cut` candidate) | perceived; fixed 15 yd |
| Crossers | Relate to final #3 underneath; robot | `cut()` shallow ≤7 yd (R:201-234); otherwise hook zone, lane re-picked per tick (D:1198-1290) | partial | perceived; `qbEyes` in the pick (**HIDDEN**) |
| Trix (Cover 8 vs 3x1) | "No vertical responsibility… play aggressively underneath on the final #3" [325] | `readHook`: walls #3 to 8 yd, then hands off; matches #3 shallow (R:441-474) | present | perceived |
| Middle of field: quarters SS vs half safety | Quarters side "SS inside ¼, key 2-to-1, match #2 vertical or zone your ¼ and squeeze to danger"; "#2 vertical occupies the SS → voided deep inside ¼ (Alert Post)" [324/325] | Bands overlap ~5 yd across the middle (inside ¼ `[W/2−2, 3W/4+2]` D:1388-1391; half from `W/2−3`). The half safety takes any deepest climber that enters; the quarters SS carries #2 (`q_safety` R:274-292). Nobody owns a strong #3/back vertical past 15 yd except the half safety, as "deepest in band" | partial (works by band overlap, not a handoff) | perceived |

## A5. Formation checks, only where they change a half-side slot

| Check | Football rule [source] | Ours | Status | Exec |
|---|---|---|---|---|
| Cover 6 vs trips (Book/Area): backside lone X | "Weak corner converts Squat → **Sink** so they own any upfield route by #1… Free safety converts Deep ½ → **Tight ½**… if no #2 weak, look for the final #4 coming back" [HNFL-273] | With no inside receivers, `declared` is vacuously true (R:391-392), so the corner goes man under #1 at the release. That is Sink-like, but a trail (under), not on top. FS stays generic `deep_half_w`, no tight landmark. `hook_w`+`c2_hook` has no weak #2, so `wallTwo` returns zone (R:296) and it runs hook + cut. No "final #4 back across" rule | partial | fixed (vacuous `every`) |
| Cover 8 Trix, half side to trips | "Corner & SS… cap the verticals of #1 & #2 respectively"; FS overtakes #3 [195]; Trix key "#3-to-X" [197] vs "#2-to-X" [325 diagram] (a source conflict, fangio §F4) | SS is the generic deepest-in-band (A2). With #2 and #3 both vertical he can split #3/#2 and **duplicate** the poach FS (`poachSafety` on #3, R:418-439), leaving #2 to the nickel's 12 yd wall | **wrong** (no "#2 up = mine" ownership) | perceived; `qbEyes` |
| Area check (`close_23`) | Backside "Wild": squat CB, Dime/Will vertical hook "wall final #2", FS deep ½ [073, fangio B2] | Same backside as Book | partial (as A3/A2) | - |
| Split Quarters / 2-Man (`split_quarters_2man`) | Backside 2-Man/Fist: trail CB man #1, safety deep ½ over #1/#2 [074] | CB_W `trail` man W1, FS generic half, W2 only in a zone hook | partial | - |

**Source vs code naming.** `cover6_area`'s note cites HNFL-073, which says Area backside = "Wild" with a **vertical hook (innermost underneath)**. The code gives `c2_hook` (vertical *curl*) at `hook_w` (C:542). This is a minor mismatch in the label only; the code's behavior is equivalent with no weak #2.

---

# (B) Cover 1: Man-Free, Robber, Lurk, Off, Double, Banjo

**Reference definition: HNFL-209/207 "Cover 1 family"**: "single safety man-to-man… 5 defenders underneath… along with an adjuster". FS = "MIDDLE 1/3, INSIDE-OUT VERTICAL SQUEEZE". Variants: Hole = low hole; Robber/Thief = high hole; "multiple core threats… they will BANJO it". Lurk is from **HNFL-240 Sub Lurk**.

## B1. Free safety (FS or SS `deep_mid`, every Cover 1 variant). No rule, so generic `ZoneCoverage` deep D:1056-1139

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Landmark / key | "Middle 1/3. Key inside-out for deep threats. Top-down, inside-out. Vision & squeeze" [240]; "inside-out vertical squeeze" [207/209]; protect the true deepest threats, not every in-breaker [manuscript §7] | Landmark 15 yd, the ball's y clamped to the middle third (A:771-772). Band **fixed to the middle third ±3 yd of the field** (`[W/3−3, 2W/3+3]`, D:1374-1375), not hash- or ball-relative. Deepest climber in band, **re-picked every tick** | partial (nearest/deepest in a band; no inside-out priority) | perceived; fixed band |
| One vertical (seam/post/go inside the band) | Inside-out squeeze | Over the top on the inside shoulder (D:1113) | present | perceived |
| Two verticals (e.g. seams, or post + go) | Vision & squeeze from the middle | Midpoint weighted by `sim.qbEyes` (D:1109-1112) | partial | **HIDDEN** (QB's private read) |
| Deepest stops under him (dig/curl/comeback) | He must not drive on every in-breaker [manuscript §7] | Deep-drive with no ball cue unless another climber is within 8 yd laterally (D:1089-1103). A post/seam 8+ yd to the side keeps climbing behind him | **wrong** | gate rating-dependent (D:1097), trigger fixed |
| Crosser climbing (deep over) | Account for a climbing crosser [manuscript §7] | Becomes a candidate once in band and moving up | present | perceived |
| Outside go/fade outside the band | CB's alone (inside-out priority) | Excluded by band | present | fixed |
| Throw / rally | Break, then tackle the in-breaker after the catch | `sawThrow` → `playBall`; pursuit afterward | present | perceived |

## B2. Man defenders (corners, nickel, the safety in man, backers on backs): `ManCoverage` D:627-878, target from `prefer` A:1241-1291

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Leverage | Depends on the call and the help: e.g. 1-Rat CB inside leverage to #1 [manuscript §7.1]; Lurk corners "man #1… defenders have inside help underneath and in the post" → outside [240] | `lev` per call: Lurk/Double `outside`; others default `inside` (D:806). Press from `cov.press` | present | perceived; fixed 0.7 yd offset (0.9 trail) |
| Assignment | Stable man; numbering by alignment; Lurk "down safety" side by formation [240] | Fixed at alignment by preference order (A:1241-1291) | present | stable (good) |
| Crosser / mesh | Lurk: "**Mesh = possible switch. Cut off the shallow with leverage. Original defender will zone the hook**" [240]; Rat: cut the first crosser, someone replaces the middle [manuscript §21.3] | No exchange anywhere outside the explicit banjo rule. The man runs the full crosser. A rat that `cut`s the same crosser doubles it, and the hook he left stays empty | **missing** | - |
| Rub / pick / stack | Stay through traffic legally; handle switch releases [manuscript §7.2, 2-Man "careful pick/rub handling"] | No high/low-road technique; physics decides the contact. `inside` is re-signed from the ball each tick (`sign(ballY − receiver.y)`, D:791), so on a crosser his 0.7 yd offset **flips sides as the receiver passes the ball** | partial (contact is honest); the leverage flip is an artifact, not a rule | perceived |
| Back blocks (check-release/stay) | "Low-hole if RB stays, otherwise assigned help" [manuscript §7.1]; Lurk "HB away = zone the hook" [240] | The man on B keeps `trackReceiver` on a blocking back during a pass read (D:704-745). No hole or green-dog conversion | **missing** | - |
| Back check-release late | Accept the back after the release [manuscript §7.2] | Keeps him all along (no handoff needed) | present | perceived |
| Double move / out-and-up | Technique | Route-read confidence drops on a heading change > 0.35 rad (D:779-784) | present | perceived, rating-scaled |
| Throw | Play the hands | `sawThrow` with `man` → receiver hands cue +0.05 s (D:1431, 1449) | present | perceived |

## B3. Robber (LB_M `robber` zone in `cover1`; SS `robber`+`robber` in `cover1_robber`)

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Landmark | High hole [209] | 11 yd deep over the ball (A:801-802); band ball ±8 (D:1399-1400), radius 6.5 (D:919) | present | fixed |
| Key / job | Take away a planned window: rob digs/curls/crossers, read the QB [manuscript §7; C:145 note "rob digs and curls"] | Rule `robber` → plain `zoneOf` (R:777). In `cover1` he has no rule at all (G:138-140). Generic match underneath: carries any vertical within 6 yd of the landmark to 13 yd (D:1183-1196); otherwise the lane of the nearest threat, re-picked per tick. **The `Rob` technique (techniques.ts:110-123) is never used by the robber** | **missing** (no robber rule) | perceived; `qbEyes` (**HIDDEN**) |
| Box backer as robber | Read run/pass, then drop | `boxBacker` read step (D:946-1012) | present | perceived |

## B4. Hole / Rat (spare man → `hole`+`rat` in Off/Robber/Banjo; LB_M in Lurk)

| Situation | Football rule [source] | Ours [file:line] | Status | Exec |
|---|---|---|---|---|
| Landmark | Low hole [207/209] | 6 yd over the ball (A:803-804), band ±9 | present | fixed |
| Shallow crosser | Cut the shallow, then robot [manuscript §21.3, 240] | `cut(c, holeCenter)`: `under` ≤7 yd, within 8 yd laterally, moving across toward the hole; carry while it stays inside 8 yd (R:201-234, 776) | present | perceived; fixed thresholds |
| Second crosser (mesh) | Whoever replaces the middle must be defined [manuscript §21.3] | Locks the first cut; the second goes to the man defender only (B2: no switch) | partial | perceived |
| Otherwise | Zone the hole, vision on the QB | Generic underneath lane, re-picked per tick | present | `qbEyes` (**HIDDEN**) |

## B5. Lurk back/hook (Mike and Dime/Will in `cover1_lurk`, C:83-111)

| Situation | Football rule [source] | Ours | Status | Exec |
|---|---|---|---|---|
| Back assignment | "HB offset to you = man on HB. HB away = Lurk: zone the hook, inside-out squeeze help with vision. HB at home = **combo the HB**" [240] | Static: LB_W `man` on B; LB_M `hole`+`rat` (C:92-93). No back-to-you/away combo | **missing** (static) | - |
| Mesh | "Possible switch… original defender zones the hook" [240] | See B2 | missing | - |
| Bunch | "Bunch = play to leverage based on the 1st break. **No In & Out**" [240] | `cover1_lurk` checks bunch → `cover1_banjo` (C:96), which is In & Out | **contradicts** the cited source | - |

## B6. Banjo pair (`cover1_banjo`: CB_S `banjo_out`, SS `banjo_in`; NB locks the point) R:719-735

| Situation | Football rule [source] | Ours | Status | Exec |
|---|---|---|---|---|
| Rule | Mini Fist: apex locks the point; CB and midpoint banjo #1/#3 [074]; "multiple core threats… banjo it" [209] | Outside defender takes the first out, else the man other than the first in, else #1. Inside takes the other. Both read release until both have declared, then lock (R:719-735) | present | perceived; lock happens only after both declare, so a slow read is late |
| Corner route by #3 | Out-breaker belongs to the outside man | A corner route classifies as `out` (reads.ts:111), so the CB takes it | present | perceived |
| Wheel/whip after lock | - | Lock holds, man continues | present | - |

## B7. Double (`cover1_double`: SS `double` inside + CB_W outside on W1)

| Situation | Football rule [source] | Ours | Status | Exec |
|---|---|---|---|---|
| Bracket | "Safety doubles a tagged threat" [207 "1 DBL"]; brackets allocate in/out or high/low [manuscript §7] | Two independent `ManCoverage` on W1 with inside/outside offsets (C:165-168). Both follow every break; no bracket read or release | partial (coverage holds; no freed defender) | perceived |

---

# Ranked missing/wrong rules by expected effect on YAC and the 10+ yd after-catch rate

Usage weights: Cover 1 family ≈ 14.5% of dropbacks (plus Cover 0's 5.6% for the man/crosser item). Cover 6/8 ≈ 8.4%. Cover 2/Tampa also runs `sink_corner` and the generic half safety (C:374-416).

**Where Cover 6 should fall.** No split was given, so this is an estimate (unverified). Its half side runs exactly the Cover 2 machinery: `sink_corner`, generic deep half and `c2_hook`. Its other side runs Cover 4's. Expect it between C2+Tampa (6.23 / 28.5%) and C4 (6.60 / 35.5%), i.e. roughly 6.4 / ~32%.

1. **Squat corner never "tops down a high/low" or sinks to compress the hole shot.**
   - It locks man on #1's hitch as soon as #2 releases vertically (R:391-396).
   - The corner route is then thrown over an underneath defender sitting at hitch depth, with only a half safety arriving from 15 yd. This is the corner-over finding (11.4 vs 5.4 yd).
   - It hits Cover 2, Tampa, 6 and 8 at once.
2. **Man coverage has no mesh/crosser switch.** The Lurk "mesh = switch, original defender zones the hook" is missing, and the man leverage flips sides at the ball (D:791). Crossers run with a trailing defender and an empty hook in front. These are the classic Cover 1/0 YAC catches.
3. **Half safety has no #1→#2 key or ownership.** It is deepest-in-band re-picked per tick (D:1058-1113). It splits by the QB's hidden read target. It deep-drives on a stopped route with no throw cue whenever no climber is within 8 yd of him (D:1089-1103).
   - Climbing breaks (posts, corners, deep outs) get caught with the safety moving the wrong way.
4. **Robber has no rule** (R:777; none in `cover1`). The high-hole player never robs the dig or curl window (`Rob` is unused), so intermediate in-breakers vs Cover 1 Robber are caught in open grass.
5. **Vertical curl zones the hook, 5 yd from the ball** (A:795-798), not the curl. It has no "#2 flat → wall #1 as the new #2" rule (R:296-308). Curls, digs and deep outs by #1 behind the squat corner are uncontested.
6. **Cover 1 FS deep-drives on a stopped deepest route** whenever no climber is within 8 yd laterally (D:1093). This leaves posts and seams elsewhere in the middle third open with no deep tackler behind them. That shows up as 10+ yd YAC when they are hit.
7. **Squat corner has no collision/funnel of #1** (pre-declaration plain flat zone). Outside releases are the source's own stressor for "hole shots & routes into the curl area".
8. **Squat corner in flat mode plays under, not top-down.** The target is re-picked each tick and can be #1 (D:1198-1254), and wheels are left to the half safety. This matters less for YAC; it is mainly a wheel/hole risk.
9. **A man defender on a blocking back never converts to hole/lurk help** (D:704-745), and the Lurk back combo is static (C:92-93). This leaves the underneath middle short one player against crossers and digs.
10. **Cover 8 Trix SS has no "#2 vertical is mine" rule**, so it can double #3 with the poach FS and leave #2 on a 12 yd wall. Cover 6 vs trips backside has no Tight ½ or "find the final #4 coming back" rule (HNFL-273).
11. **Mike (`mike_3`) relates only to the back**, not to a #2 that becomes the final #3 (R:255-263). Intermediate inside breaks from the half side meet only the generic hook lane.
12. **Source contradictions:**
    - `cover1_lurk` checks bunch to In & Out banjo, but HNFL-240 says "No In & Out" for Lurk vs bunch.
    - The `sink_corner` docstring (R:376-379) promises a ~13 yd sink that the code does not do.

**Hidden-information flags**
- **`sim.qbEyes`** is used by every plain zone defender: the half safeties, the FS, robber, hole, flat and hook seats (D:1082, 1111, 1203; spot drops D:1316). It is the QB controller's chosen read, not a seen gaze. It should come from `sim.see(qb)` facing, as `CoverageJudgment` already does.
- **Numbering never updates after the snap** (reads.ts:138-142). "Final #2/#3" rules (A3, A4, A5) cannot be expressed from what the defender sees. This is static information rather than hidden information.
- **No rule reads another defender's private live choice.** `quarterFlat` reads the installed corner rule (R:323-325), which is called-call knowledge and is documented as such.

**Not verified**
- All HNFL text is machine OCR; the wording is checked against OCR only.
- The 22-yd half landmark is from the fangio summary of HNFL-291, which I did not open.
- I did not check `coverageDepth` compression near the goal, or run fits.
- No behavior was observed in film or sims; every status is from reading code.
