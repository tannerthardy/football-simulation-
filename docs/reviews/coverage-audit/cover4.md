# Cover 4 / Quarters coverage-rule audit (MOD, MEG, Palms; trips/bunch deltas)

Checkout: `develop @ 0d0f4af8`, read-only. All code citations are file:line in that checkout.

## Family definition used

The **HonestNFL "Quads" quarters series** (HNFL key-and-match quarters):
HNFL-192 (family), 194 (Sub Quads assignments), 196 (route pickups), 198/096 (strong side),
199/098 (weak side), 201/093/079 (Quarter = corner), 202/092/077 (Inside Quarter = safety),
200/094/078/365 (Quarter Flat = apex), 029 (technique dictionary). Palms is HNFL-051 "Read"
(also called 2-Read, Clamp, Catch in the same sheet). Trix is 197/021, Book 050, Area 052 and Box 053.
`docs/references/coverage-checks/fangio-system.md` §B1 summarises the same series and maps it to
`cover4` / `cover4_palms` / `cover4_poach`. Where the Coverage OS manuscript adds something
(ch. 4, 10, 11 and 14), it is cited as **COS §n**.

The sources are OCR of diagrams. Where a rule is my reading of a route chart and not stated
text, I mark it **(inferred)**.

## How the machinery works (needed to read the tables)

- **Dispatch.** A role with a `rule` under the `match` style becomes a `CoverageDefender`
  (`src/sim/assign.ts:136-140`). Ruled calls are always `match` (`src/game/playcaller.ts:818-819`).
  Plain seats (`hook_s`, `hook_w`) become a bare `ZoneCoverage`.
- **Each tick** the rule returns a directive (`src/sim/coverage/defender.ts:93`). A changed
  directive builds a *new* sub-behaviour (`defender.ts:96-100`, `make` at `134-146`). A new
  `ZoneCoverage` starts with fresh observation maps and an `initialDepth` taken at the switch.
- **Release vocabulary** (`src/sim/coverage/reads.ts:20, 109-114`): none / block / vertical /
  out / flat / under / in / stop. A route counts as a break once it leans about 30° off vertical.
  It has **no corner, post or wheel class**:
  - a post becomes `in` as soon as it leans in;
  - a corner route becomes `out`, the same as a deep out;
  - a wheel is `flat`, then later `vertical`.
  A declaration is believed after it has persisted for 0.12 s scaled by focus (`reads.ts:58, 116-124`).
  `climbed` latches once the receiver is past 7 yd and still climbing (`reads.ts:100`).
- **Judgment override for deep seats only** (corners and safeties: `isDeepZone`, `judgment.ts:21-75`).
  Once per decision interval it can do one of two things:
  - **protect-vertical**: take man-over-top on the deepest *visible, uncapped receiver whose
    release is `vertical`*, within 14 yd laterally (`judgment.ts:47-57`);
  - **squeeze-break**: switch to `rob` on a short `stop/in/out/under` (`judgment.ts:58-72`).
  Because posts and crossers are classed `in`, protect-vertical never fires on them.
- **"Zone" after a rule mode.**
  - Deep quarter seat (`defense.ts:1058-1139`): the threats are every receiver whose 0.7 s
    future position falls in the lateral band (`zoneBand` `defense.ts:1381-1388`). The seat
    prefers its numbered #1 (out) or #2 (in) *only if that receiver is vertical*
    (`defense.ts:1070-1078`). Otherwise it takes the **deepest vertical in the band, re-picked
    every tick** (`1087-1088`).
    - It plays **2–3 yd over and inside** that receiver (`1107-1133`).
    - It **deep-drives** on a stopped deepest receiver when nothing else is climbing within 8 yd (`1093-1104`).
    - With no vertical, it drifts toward the QB's eyes from the landmark (`1079-1086`).
  - Underneath seat (`defense.ts:1179-1282`):
    - **carry** any receiver above 4.5 yd/s that is 2 yd to 10 (curl-flat) or 13 (hook) yd deep
      and within 6 yd of the landmark; nearest to the landmark wins, re-picked (`1183-1197`);
    - otherwise **sit in the lane of the threat nearest the landmark**, re-picked each tick
      (QB-eyes bias; `1198-1209`, `1253-1282`).
  - Neither is a stable assignment with a handoff.

## Execution model: script or perception? (applies to every row below)

Each row in the slot tables gets an **Execution** note in the bullet list under its table.
The note says whether the rule is run as a script or through the defender's own perception.

The codes used in those notes:

- **P (perceived declaration).**
  - Every rule key goes through `ReleaseReader.read`, which uses the defender's own
    `sim.see(a, r)` picture: perception delay, focus-dependent (`reads.ts:91`).
  - That picture is filtered by `RouteObservation.read` with a horizon equal to his
    `reactionTime` and a trust of `anticipation × focus` (`reads.ts:91`; `coverage-read.ts:12-40`).
  - A new declaration is believed only after it persists for `0.12 × (1.6 − 0.6·focus)` s,
    i.e. 0.12–0.19 s (`reads.ts:58, 116-124`). A fake that reverts resets the chain (`125-130`).
  - Each defender has his own reader (`defender.ts:42`). Two defenders keyed on the same #2
    can therefore disagree for a beat, so exchanges can be late or bust. **This part is not a script.**
- **F (fixed threshold).** The classification geometry and the rule thresholds are constants with
  **no rating dependence**:
  - break at about 30° and speed above 1.8 yd/s; vertical needs vx > 2.5 (`reads.ts:111-114`);
  - NO_COVER 5 yd and DECLARE 0.35 s (`rules.ts:80-82`);
  - safety carry at 7 yd (`rules.ts:281`); apex wall handoff at 10 yd (`rules.ts:342`);
  - Mike carry to 15 yd (`rules.ts:258`); quick-out depth 7.5 yd (`reads.ts:172`).
  - Ratings change *when* he believes a declaration (focus, anticipation, reactionTime). They
    never change *what* counts as one or the depth at which he hands off. `focus` is a mind
    state (readiness, fatigue, stress, lapses: `mind.ts:53`), not a recognition rating.
    `playRecognition` and `zoneCoverage` do not enter the rule triggers at all.
- **L (mode lock).**
  - Once a branch fires, `state.mode` makes it permanent (`rules.ts` modes
    `two/one/flat/zoned/...`). Execution after the lock is deterministic intent; there is no
    re-read and no chance to mis-hold.
  - The lock itself was reached through P, so a late or wrong read *can* lock the wrong branch.
    That is a realistic bust source, but it is never recovered from.
- **T (technique execution).** Once a directive is chosen, body execution is rated:
  - `ManCoverage`: `manCoverage`, `playRecognition` route-read timing, `anticipation`, turn rate,
    DeepCoverage physical feasibility (`defense.ts:776-870`);
  - `Wall` and `Rob`: `zoneCoverage` (`techniques.ts:99, 119`); `Trap`: lead from `anticipation × focus` (`techniques.ts:75`);
  - `ZoneCoverage`: `zoneCoverage × anticipation` for perception trust (`defense.ts:1034-1035`),
    pattern hesitation when `focus·(0.5+0.5·zoneCoverage) < 0.52` with two routes in the area
    (`defense.ts:1169-1177`), and deep-drive gated on `focus·(0.4+0.6·playRecognition)` (`defense.ts:1099`).
  - Every switch builds a new sub-behaviour from his current position and momentum
    (`defender.ts:96-100`), so a handoff costs physical time.
- **J (CoverageJudgment, deep seats only).**
  - It re-decides every `decisionInterval`, which depends on reaction, focus and stress
    (`mind.ts:64-65`; `judgment.ts:30-31`).
  - The squeeze uses a `playRecognition × focus` confidence plus a stable per-player judgment
    error (`judgment.ts:67`).
  - The cap test uses `sim.see` of teammates with error from `discipline` (`judgment.ts:95-101`).
  - It is perceived and rated, but it reads only `vertical`-class danger.
- **H (hidden or privileged information).** These are listed in the "Hidden-information flags"
  section near the end of this file.

---

## 1. Corners: CB_S / CB_W (`q_corner_mod`, `q_corner_meg`, `palms_corner` on `quarter_*_out`)

Both corners run the same rule. On the weak side vs x1, China is not available
(`rules.ts:269` passes `china = !!ref(c,2)`).

| Situation | Football rule [source] | Ours [file:line] | Status |
|---|---|---|---|
| Key / alignment | Key #1→#2→#3. Press or off; leverage set by #1's split: oversplit → inside, minus split → outside, widen by route [HNFL-201, 093] | Man directive always `lev:'outside'` (`rules.ts:268, 270`). Leverage is not a function of split or of whether inside help exists | **wrong** (fixed outside) |
| #1 vertical (go/fade) | Man #1 out & deep [HNFL-194, 201] | `man(one, outside)` (`rules.ts:270`), protectDepth (`defender.ts:140-141`) | present |
| #1 intermediate in-breaker / dig / post with #2 **vertical** (no inside help: "#2 up = no help") | Man #1. HNFL-202 warns that "#2 clearout + #1 deep ⇒ #1 in-breaker (void attacker)"; HNFL-196 (Dagger): corner M/M on #1's stem, Mike squeezes the window from below | Man #1 with the same **outside** leverage (`rules.ts:270`), i.e. trails an in-breaker that has no inside help | **partial/wrong**: no help-dependent leverage |
| #1 in-breaker with #2 cancelled (safety squeezing) | Man #1 with outside leverage; the safety squeezes inside-out [HNFL-196 "bracket on #1 by CB & FS"] | Outside man + safety `helpOne` inside over top (`rules.ts:137-141`) | present |
| #1 under/shallow ("In", "Under") | Zone off **once #1 truly declares shallow**, then zone ¼ top-down **relative to the new #1** [HNFL-079, 201] | `zoneOffOne`: an `under` (or `in` with China) before #1 clears 5 yd → pending, then locked after 0.35 s (`rules.ts:91-120`, NO_COVER `80`, DECLARE `82`) | trigger **present**; behaviour after zone-off: see the "zoned" row |
| #1 fails to clear 5 yd (hitch, quick out, stop) = "China" | Zone the ¼ and **sink to close the corner-route window** (Smash). The safety plays #2 from top shoulder inside, so the two "suffocate the catch point" together [HNFL-201, 093, 202; HNFL-196 "sink to the 7"] | Zone-off while #1 stays short (`rules.ts:119`, not locked; re-man on hitch-and-go `104`). The corner then plays the generic deep zone (row below) | trigger **present** |
| After the In/China call: pattern read | Look for **#2 on corner, then seam, then curl**; "look for something coming back across on a deeper level" [HNFL-079] | `ZoneCoverage quarter_*_out`: preferred #1 is shallow, so he takes the **deepest vertical whose 0.7 s future is in band [3W/4−2, W]** (`defense.ts:1070-1088`, band `1381-1384`), **re-picked every tick**. Until the #2 corner route enters the band he holds the landmark at 13 yd, 8 yd from the sideline (`alignment.ts:779-780`; `defense.ts:1079-1086`). A #2 curl (inside the band edge) or seam is never his | **partial**: nearest/deepest in band, not "#2 corner > seam > curl" |
| #2 corner route after China ("sink to the 7") | Corner **sinks underneath/outside** the 7 route while the safety is top-down inside [HNFL-202, 093] | When the corner route enters the band he plays **over and inside it**: `tx = pos + cushion (≈1.6+0.16·vx)`, `ty = fut.y + 0.8·inside` (`defense.ts:1107-1133`). The safety is also over the top (`rules.ts:283`, `defense.ts:840-846`). **Both are over the top; nobody is under the corner route** | **wrong** (directly drives the corner-over-underneath finding) |
| #1 out / comeback past 5 yd | Man #1 [HNFL-201 black routes] | Man #1 outside (`rules.ts:104, 270`) | present |
| #1 corner route | Man #1 [HNFL-201] | Man #1 outside (corner route is `out`) | present |
| #1 wheel / out-and-up | Man #1 once past the no-cover zone | A stop/out/flat zone-off is unlocked; man again when `deepest > 5` (`rules.ts:104, 119`) | present |
| Stack / switch with #1 under #2 ("In" relative to new #1) | Zone, top-down on the **new #1** [HNFL-201] | Numbering is fixed at the snap (`reads.ts:137-141`), so "new #1" does not exist. He takes the deepest band vertical | **partial** |
| MEG | Man #1 everywhere, no China (5-over-3 inside) [HNFL-192] | `man(one, outside)` with no zone-off (`rules.ts:268`) | present (leverage caveat as above) |
| Palms/Read corner | Key #2→#1. #2 out/flat under 5 = **trap it**; #2 up/in = match #1 with depth. Smash rule built in [HNFL-051; COS §11.1] | `palmsCorner`: `isQuickOut(two)` (out/flat, depth < 7.5, not climbed) → Trap, locked (`rules.ts:346-354`, `reads.ts:170-173`); else MOD (`353`) | present (source says under 5; code uses 7.5) |
| Palms: #2 out then wheel | The corner must stay with it; the exchange made it his [COS §11.1, §21.2] | `Trap` is locked (`rules.ts:348`) and aims at the receiver's position + lead with x ≤ the receiver's +0.6 (`techniques.ts:71-81`). It has no turn-up/over-the-top branch | **partial** (trap continues on him, but technique has no wheel phase) |
| Throw | Drive to the catch point / play the ball | `ManCoverage.update` → `playBall(R)`; zone → `playBall(null)` once seen (`defense.ts`, `ZoneCoverage.update`; `playBall` `1476`) | present |
| Deep-seat override | (not in source) | `judgment.ts:47-72` can take him off #1 to protect another `vertical` route or rob a short break | extra mechanism; posts and crossers are invisible to it |

**Execution (corners):**

- **Key / leverage: F + H.**
  - Leverage is a constant `'outside'` with no rating or split input.
  - #1 is identified as `offAlign.numbering['S1'/'W1']` (`reads.ts:137-141`). That is alignment
    data, not his own pre-snap count, and it is frozen at the snap.
- **Man on #1: P + T.**
  - The man directive follows a perceived read.
  - Phase, hip-turn and route-read timing come from `manCoverage`, `playRecognition`,
    `anticipation` and turn rate (`defense.ts:776-830`). Depth feasibility comes from
    DeepCoverage. This is genuinely rated.
- **In/China trigger: P + F + L.**
  - The `under`/`in`/`stop` declaration is perceived with the 0.12–0.19 s confirm, so he can be
    late or fooled by a stem that reverts.
  - The 5 yd no-cover depth and the 0.35 s hold are fixed, so a rookie and an All-Pro "truly
    declare" on the same clock.
  - The inside zone-off locks (`rules.ts:98`); the stop/out zone-off does not.
  - There is no communicated "In"/"China" call. The apex infers the same picture independently
    through his own reader (`rules.ts:334`), which can produce realistic disagreement.
- **Zoned-off pattern read: T + H.**
  - Threats are perceived (`defense.ts:1029-1039`, RouteObservation).
  - The target choice is "deepest in band" (geometry, no rating).
  - The split between two verticals uses `sim.qbEyes` (`defense.ts:1111`): the QB's *internal*
    read target. **H.**
  - The no-threat landmark drifts to `sim.qbEyes.pos` (`defense.ts:1083`): the true position of
    the receiver the QB intends. **H.**
- **Palms trap: P + F + L + T.**
  - The quick-out depth of 7.5 yd is fixed.
  - The trap is locked.
  - The lead comes from `anticipation × focus`.
- **Throw: T.**
  - The defender must recognize the throw himself: `sawThrow` gates `playBall`, which then plays
    acquired flight (`defense.ts:1476-1495`).
  - Before he recognizes it, man coverage continues.

## 2. Inside-quarter safeties: SS / FS (`q_safety`; Palms `palms_safety`; on `quarter_*_in`)

| Situation | Football rule [source] | Ours [file:line] | Status |
|---|---|---|---|
| Key / alignment | Key #2→#1 with awareness of #3. Head-up #2 at 12–14 yd. Attached #2: "curl-to-post" mindset; detached #2: "post-to-curl" [HNFL-202, 077] | Keys #2 then #1 (`rules.ts:274-291`). Landmark at 12 yd, ball ±7 (`alignment.ts:783-786`). No #3 awareness, no attached/detached distinction | **partial** |
| #2 not yet declared | Read step and keep cushion [COS §10.2] | `zoneOf` → deep zone, preferring #2 if vertical (`rules.ts:290`, `defense.ts:1070-1078`) | present |
| #2 vertical (seam/fade) | Match #2 with **vertical separation** on any upfield route, top-down [HNFL-202, 198] | At #2 `vertical` and depth ≥ 7 → mode `two` locked, `man(two, overTop, inside)` (`rules.ts:281-284`). Over-the-top cushion is `0.8+0.15·vx` yd (`defense.ts:840-846`); protectDepth feasibility (`defense.ts:848+`) | present (the cushion is small: about 2 yd at full speed) |
| #2 corner route (7) | Top-down on #2; pattern priority **corner > seam/fade > post > basic**. With China, play #2 from the top shoulder **inside** while the corner sinks under [HNFL-202, 092] | Locked man over top with **inside** leverage on #2 (`rules.ts:277`); the break goes away from his leverage. He is correct *only if* someone is underneath. With China the corner is also over the top (corner table), so the route is bracketed from above only | **partial**: his part is right; the pair relation is wrong |
| #2 post | Top-down #2 | Locked `two` man stays on him | present |
| #2 intermediate in-breaker / dig (post-dig, Mills) | The rule covers "any **upfield** route by #2". A flat in-breaking dig under him is taken from underneath (Mike "dig to dump", "look up the new #3 and squeeze the window from underneath", HNFL-196). With a detached #2 he plays post-to-curl, so #1's post is his concern [HNFL-077, 202] **(inferred: the post-dig pairing is not drawn on these sheets)** | Mode `two` **never re-evaluates** (`rules.ts:277`): he runs man over the top of the dig across the field, the inside ¼ is vacated, and the #1 post is left to a corner with outside leverage | **wrong (inferred)** |
| #2 out / flat / under / stop ("#2 cancels") | Zone the ¼, **first check far-side immediate threats** (#3 / backside crossers into the vacated inside ¼), then squeeze #1 inside-out, post > curl [HNFL-077, 202, 198] | Locks mode `one` → `helpOne(#1)` (`rules.ts:286-289`). No far-side/#3 check. The judgment override only sees `vertical` releases (`judgment.ts:47,53`), so a backside post or deep cross is not seen | **partial/missing** (far-side check) |
| Help on #1 that is climbing | Squeeze #1 inside-out (bracket with CB) [HNFL-196] | `climbing(one)` → `man(one, overTop, inside)` (`rules.ts:139`) | present |
| Help on #1 not climbing (slant/hitch/early in) | Post > curl mindset: keep the top, then drive the curl or in-breaker; rob the post only by game plan [HNFL-202, 077] | `rob` #1 (`rules.ts:140`). The Rob technique aims between `los+min(7, depth−.5)` and receiver+1 yd in the QB-receiver lane (`techniques.ts:110-122`): **downhill, under #1, no roof**. Re-evaluated each tick; if #1 later climbs (slant-go, hitch-go) he switches to over-top from underneath | **wrong order** (curl-before-post when #1 has not yet climbed) |
| #2 blocks | Pass-read dependent: help #1, else fit [HNFL-202; COS §6] | `knowsPass ? helpOne : zoneOf` (`rules.ts:285`) | present |
| China call by the corner | Play #2 from the top shoulder inside; suffocate with the corner [HNFL-202] | No change: same `two` man (`rules.ts:277`) | present for him (corner half wrong) |
| "In" call by the nickel | Zone the ¼, shift focus to #1's inside breaks so the corner can be aggressive [HNFL-202] | Equivalent to `helpOne` when #2 is under (`rules.ts:286-288`) | present |
| Deep exchange (snakes/scissors) | "Zone it" call with the corner [HNFL-202, 196] | None; locked `two` follows #2 through the exchange | **missing** |
| No #2 (x1 side) | Squeeze to #1 / tight ¼ with corner [HNFL-194 "no threat = squeeze X"] | `climbing(one) ? man over top : zoneOf` (`rules.ts:279`) | present |
| Palms safety | #2 seam = ¼ technique; #2 out/flat = **width to #1 with depth**; #2 under = squeeze #1, zone ¼ [HNFL-051] | Quick out → mode `one`, man #1 over top outside (`rules.ts:363-366`); vertical(7) → `two` (`367-370`); under/in/stop → `helpOne` (`371`) | present |
| Throw | Break on ball | man → `playBall`; rob → `Technique.update` `playBall(null)` (`techniques.ts:31-37`) | present |

**Execution (safeties):**

- **#2 read: P + F + L.**
  - `vertical(7)` and the "anything else" cancel are perceived and confirmed.
  - The 7 yd commit depth is fixed.
  - The result is locked (`two`/`one`) for the rest of the play. This is the main scripted
    element: after the lock he cannot misread or re-read a dig as a cancel. Lack of skill
    shows only as a late lock, never as a wrong continuation.
- **Over-the-top carry: T.**
  - Rated man technique.
  - The roof size is fixed geometry (`0.8+0.15·vx`, `defense.ts:844`).
  - DeepCoverage checks physical feasibility.
- **Help #1 (cap vs rob): P + F.**
  - The choice between cap and rob is `climbing()`: the release is `vertical`, or the `climbed`
    latch (7 yd, vx 2.5). It is perceived, with a fixed geometric threshold.
  - Rob execution uses `zoneCoverage` for speed, but aims at a lane from the **true**
    `sim.qb.pos` (`techniques.ts:115`) and faces the true QB (`techniques.ts:120`). **H (minor).**
- **J overrides.**
  - Rated and perceived: interval, `playRecognition`, judgment error, teammate cap from `sim.see`.
  - But they only see `vertical` releases, so the "find work elsewhere" reaction cannot
    perceive a post or a crosser at all.
  - That is a vocabulary gap, not a rating effect.
- **Pre-declare zone: T + H.**
  - It is the same generic deep zone as the zoned-off corner, including the `sim.qbEyes` biases
    (`defense.ts:1083, 1111`). Apexes (quarter-flat): curl_flat_s / curl_flat_w (`q_apex`; Palms apex = Read Curl)

| Situation | Football rule [source] | Ours [file:line] | Status |
|---|---|---|---|
| Key / alignment | Wall alignment 1 yd inside #2 at 4–6 yd. Key #2→#1 with **#3 awareness** [HNFL-200, 094] | Keys #2, #1; `threeAway` (`rules.ts:130-134, 318-343`). Landmark curl_flat at 8.5 yd (`alignment.ts:791`) | partial (#3 used only for "away") |
| #2 vertical | Reroute #2 up the seam, ride it with vision for 8–10 yd until the safety overtakes, then **find the final #2 underneath** (and #1 coming back under) [HNFL-200, 196] | `wallTwo(10, readStem)` (`rules.ts:294-306, 342`); at 10 yd → `zoned` → generic curl-flat zone: **lane of the threat nearest the landmark, re-picked each tick** (`defense.ts:1198-1209, 1253-1282`) | **partial**: wall present; "final #2" replaced by nearest-threat re-pick |
| #2 quick out / flat | Match the first flat by #2, **chase it and stay on top, alert wheel** [HNFL-200, 365] | `isQuickOut` → mode `flat`, `man(two, inside, overTop)` (`rules.ts:327-331`) | present |
| **#3 (or the back) fast to the flat** | Match the first flat **by #2 or #3**; Mike alerts "#3 flat". With #1 and #2 vertical and #3 to you, fall off the seam once #3 crosses #2's tracks and push to the flat top-down [HNFL-194, 198, 365] | **No branch.** The flat check is #2 only (`rules.ts:327-328`). While walling #2 he ignores the back. After `zoned`, `ZoneCoverage`'s flat expansion is #2-only and is *disabled* when a fast back is present (`defense.ts:1222-1224`). He reaches the back only if the nearest-lane re-pick happens to choose him | **missing** |
| #1 shallow ("China"/"Under") | Push to #1 underneath so the corner can sink [HNFL-200, 194] | `cornerOnOne && oneShallow(one)` → mode `one`, `man(one, inside)` (`rules.ts:334-337`); MOD only (`323`) | present |
| #2 shallow inside, #3 to him | **Deliver** #2 to the ¼ hook (midpoint) and find the next work / new #2 [HNFL-078, 199] | `wallTwo` sees `under` → `zoned` → nearest-lane zone (`rules.ts:304`). There is no explicit deliver/receive with Mike; Mike's `cut` may jump him (`rules.ts:201-232`) | **partial** (implicit) |
| #2 shallow inside, #3 away | **Take #2 back across** until help calls you off [HNFL-078, 094, 199, 196 Drive] | `two.release==='under' && deepest ≤ 7 && away` → `man(two, head)` (`rules.ts:338-341`) | present (but the China check at `334` wins if #1 is also shallow) |
| #2 goes under #3 (trips/stack) | Squeeze in to the **new #2** [HNFL-200] | Numbering is fixed; no "new #2" | **missing** |
| #2 stays #2, intermediate (curl/dig/stop) | Match anything underneath by #2 [HNFL-200] | `wallTwo`: stop/in → `zoned` → nearest-lane zone (`rules.ts:304`) | **partial** (not a match) |
| #1 & #2 vertical, #3 away | Think **curl-to-comeback by #1**, vision and squeeze [HNFL-365] | After handoff: nearest-lane zone at the curl-flat landmark | partial |
| Palms (Read Curl) | #2 up = wall, see #1. #2 out/flat = **zone the curl, close the curl window, eyes to #1** (the corner traps the flat). Wall whoever becomes #2 [HNFL-051, 195] | Flat branch is skipped (`cornerTakesFlat`, `rules.ts:322, 327`). The `out` goes to `zoned` and the generic zone runs its **flat expansion toward #2's flat** whenever #1 is the nearest-lane threat and there is no #3 or fast back (`defense.ts:1216-1246`). That duplicates the corner's trap and vacates the curl window | **wrong (conditional)** |
| Throw | Break on ball | Technique and zone → `playBall(null)` once seen | present |

**Execution (apexes):**

- **Reads: P.**
  - #2, #1 and the back are each read through his own reader every tick (the "key #3 every
    tick" comment at `rules.ts:324-326`), so a late `threeAway` is possible.
- **Quick-out, China push and take-back-across: P + F + L.**
  - Thresholds: depth < 7.5, deepest ≤ 5, deepest ≤ 7.
  - All three branches lock.
- **Wall: T + F.**
  - `Wall` speed comes from `zoneCoverage` and `unsureFactor` (`techniques.ts:99`).
  - The open-hips trigger is physical: turn rate against closing speed.
  - The handoff at 10 yd is fixed and is **not** conditioned on seeing the safety overtake.
  - Compare `seamCurlFlat`, where the Cover 3 version checks `hasVisibleCap` before delivering
    (`rules.ts:185`). Quarters has no visible-overtake check.
- **Installed-call knowledge (not flagged).**
  - `quarterFlat` reads the corner's installed rule from `defAlign.coverage.roles`
    (`rules.ts:321-323`). That is legitimate call knowledge, not the corner's live choice.
  - It means he pushes to #1 on his own read of #1, not on hearing an actual "China" from a
    corner who may have read it differently.
- **Post-handoff zone: T + H.**
  - The target is the threat nearest the landmark.
  - That threat gets a 3·`anticipation` yd bonus if it is `sim.qbEyes` (`defense.ts:1204`),
    i.e. the **QB's hidden intended target**. **H.**
  - The lane is drawn from the true `sim.qb.pos` (`defense.ts:1015, 1253`). **H (minor).**
  - Pattern hesitation is rated (`defense.ts:1169-1177`).
- **Palms flat expansion: H.**
  - It reads `offAlign.numbering`, `offAlign.spots` (S1/S2/S3 and backfield) and alignment
    deltas (`defense.ts:1219-1227`). That is alignment data rather than his own count.
  - The receivers' velocities are perceived. Mike (quarter hook / midpoint): hook_mid (`mike_3`)

| Situation | Football rule [source] | Ours [file:line] | Status |
|---|---|---|---|
| Key | **Key #3→#2→#1; relate to the final #3** in the distribution [HNFL-198, 194, 196] | Keys **only the back `B`** (`rules.ts:255-262`). No #2/#1 read; a trips #3 or a #2 that becomes #3 is invisible | **partial** |
| #3 vertical | Must carry #3 vertical (Quads) [HNFL-198]. With Trix on, play #3 aggressively underneath; the FS overtakes [HNFL-197] | Back vertical / in / under (>1.5 yd) → `man(b, inside)` to 15 yd, then `zoned` (`rules.ts:257-260`) | present (for the back) |
| #3 shallow / checkdown | Zone the hook top-down, **"dig to dump"** [HNFL-196 Flanker Drive] | Back flat/out: no branch → `cut` or hook zone with nearest-lane (`rules.ts:261`; `defense.ts:1198-1282`) | partial |
| #3 to the flat | **Alert the apex "#3 flat"** (the apex takes it) [HNFL-198] | No communication analogue; the apex has no #3-flat branch (§3) | **missing (pair)** |
| Delivered shallow #2 / crossers | Take the delivered #2; push with #3 until he is no longer #3 [HNFL-078, 196] | `cut`: nearest `under` receiver (depth ≤ 7, within 9 yd, moving toward him), carried until 8 yd through (`rules.ts:201-232`). **Nearest pick, not a handoff** | partial |
| Dig / intermediate in-breaker over him (Dagger, post-dig) | "Look up the new #3 and squeeze the window with body position from underneath" [HNFL-196 Dagger] | `cut` ignores `in` (depth > 6.5 is classed `in`, `reads.ts:112`). The hook zone sits in the lane of the threat nearest the 10.5 yd landmark (`defense.ts:1198-1209`, radius 6.5 `alignment` via `defense.ts:919`) | **partial** |
| Throw | Break on ball | `playBall` via man/zone | present |

**Execution (Mike):**

- **Back read: P + F + L.**
  - The release is perceived, with the confirm delay.
  - The `under` threshold (> 1.5 yd) and the 15 yd carry are fixed.
  - `zoned` locks.
- **Cut: P + F.**
  - Candidates are perceived reads.
  - The choice is geometric: nearest, within 9 yd, moving toward him faster than 1.5 yd/s.
  - It is re-evaluated whenever the current cut ends.
  - There is no rating in the pick.
- **Box-backer read step before the drop: P.**
  - It depends on `recog` pass belief (`defense.ts:952-1012`).
- **Hook zone: T + H.**
  - Same `sim.qbEyes` lane bias as the apex (`defense.ts:1204, 1250`).

## 5. Plain hooks: hook_s / hook_w (cover4, MEG and Palms 4th/5th underneath seats)

These seats fill only when there are more than three free droppers (`alignment.ts:1172-1199`), for
example on a three-man rush. They have **no rule**: a bare `ZoneCoverage` in the hook band
(`defense.ts:1400-1403` band; landmark 10 yd at ball ±5, `alignment.ts:795-798`). They carry any
vertical to 13 yd, then take the lane of the nearest threat, re-picked each tick
(`defense.ts:1183-1282`). Quads has no such seat (4-over-3), so there is no football rule to
compare against. **Not verified:** how often these seats are filled in the 3,016-dropback sample.

## 6. Trips / bunch checks: only where they change a slot's rule

| Check | Football rule [source] | Ours [file:line] | Status |
|---|---|---|---|
| Trix/Poach FS | Key #3→X; overtake #3 vertical, otherwise zone ¼ and squeeze X; **"take 3 or who becomes 3"** [HNFL-197, 021] | `poachSafety`: numbered S3 vertical(6) → man over top; otherwise `helpOne(X)` (`rules.ts:418-432`) | present, except "who becomes 3" (fixed numbering) |
| Trix backside CB | Tight ¼: man #1 unless shallow ("In"), no China [HNFL-194] | Locked man `W1` inside, protectDepth (`coverages.ts:507`); no "In" release | partial |
| Trix Mike (hook_s `read_hook`) | Match final #3 underneath aggressively; no vertical carry [HNFL-197] | Wall #3 to 8 then hand off; man #3 shallow; fast #4 back (`rules.ts:441-468`) | present |
| Trix weak apex | Plays like seam/flat on #2: match anything up or out [HNFL-199] | `cover4_poach` has **no weak `q_apex`** (`curl_flat_w` is a plain seat, `coverages.ts:510`) | **missing** |
| Book/Stubbie nickel (`mush`) | Key #3→#2: #3 up/in = match #2; #2 fast flat = match it; **#3 out/flat = trap it** [HNFL-050] | #3 flat/out (< 5 yd) or #2 shallow → **zone** curl-flat (`rules.ts:476-488`) | **wrong** (zones instead of trapping #3) |
| Book safety | #3 up = match it; #3 out/flat = width to #2 with depth [HNFL-050] | `stubbieSafety` (`rules.ts:493-509`) | present |
| Box | Corner outermost upfield, safety innermost, nickel first flat, Mike first in; deep exchange = zone it off; FS Trix on final #3 [HNFL-053, 195] | `box()` (`rules.ts:645-662`). The backside is plain `QUARTERS_W` (`coverages.ts:486`), with **no FS Trix** | partial |

---

## Ranked missing / wrong rules: expected effect on YAC, the 10+ YAC rate and the corner-over finding

1. **China/In corner plays over the top of the #2 corner route instead of sinking under it**
   (corner `defense.ts:1107-1133` via `rules.ts:269`; safety `rules.ts:283`).
   - Both deep defenders sit over and inside the 7 route, so the open window is *underneath*
     them, beside the sideline.
   - The ball can be thrown short of both defenders with no one closing from below.
   - This is the clearest mechanism for corner-route catches landing about 6 yd deeper than the
     underneath defender.
2. **Fixed outside leverage for the MOD/MEG corner regardless of inside help** (`rules.ts:268, 270`).
   - When #2 goes vertical and takes the safety, #1's dig, post or slant past 5 yd is caught in
     stride with a trailing corner and an empty inside quarter.
   - In-stride crossing catches are the main source of 10+ YAC.
3. **Safety locked on #2 after `vertical(7)`, with no re-read when #2 flattens into a dig/in**
   (`rules.ts:277, 281-284`).
   - He runs over the top of a dig across the field and vacates the inside ¼ against #1's post
     (post-dig, Mills).
   - Catches in the void have nobody in front of them. **(inferred from HNFL's "any upfield
     route" plus post-to-curl priority)**
4. **No rule for #3 or the back to the flat for the apex, and no Mike "#3 flat" alert**
   (`rules.ts:327-343`; `defense.ts:1222-1224` explicitly disables flat expansion with a fast back).
   - A back's flat or swing caught while the apex walls #2 is a classic uncontested 10+ YAC play.
5. **After the wall handoff (and on #2 stop/in), the apex plays "lane of the threat nearest the
   landmark, re-picked each tick" instead of "match the final #2 underneath / deliver to the
   midpoint"** (`rules.ts:300-305`; `defense.ts:1198-1209`).
   - Switching targets every tick leaves him in transit when the ball arrives on a shallow or
     curl, which raises YAC on underneath catches.
6. **The safety's "#2 cancels" branch skips the far-side and #3 check, and robs a non-climbing #1
   from underneath (curl before post)** (`rules.ts:137-141, 286-289`; `techniques.ts:110-122`).
   - A backside post, deep cross or #3 bender reaches the vacated inside ¼ unseen.
   - The judgment override cannot see these routes because they are classed `in` (`judgment.ts:47`).
7. **Mike keys only the back and does not squeeze the dig from underneath** (`rules.ts:255-262`;
   `cut` ignores `in`, `rules.ts:217`).
   - On Dagger and post-dig the dig lands with no defender underneath it, so the receiver turns
     upfield after the catch.
8. **The release taxonomy has no post, corner or wheel class** (`reads.ts:20, 111-113`).
   - No rule can express "corner > seam > post" or "deep exchange: zone it", and the
     protect-vertical override goes blind once a post leans in.
   - This enables items 1, 3 and 6 more than it causes YAC directly.
9. **Palms apex flat expansion duplicates the corner's trap** (`defense.ts:1216-1246` reached from
   `rules.ts:304`). Leaving the curl window open gives #1's curl or dig room behind him.
   Palms is only 4.1% of dropbacks, so the impact is lower.
10. **Book/Stubbie nickel zones instead of trapping #3's flat; Trix has no weak apex**
    (`rules.ts:480-484`; `coverages.ts:510`). These are trips-only and secondary, but each leaves
    a quick flat outside the nickel's leverage.

## Hidden-information flags (triggers or targets read from data the defender cannot see)

1. **`sim.qbEyes`: the QB's private current read target, with its true position.**
   - It is used by every zone seat in this family:
     - deep landmark drift (`defense.ts:1083`);
     - the two-vertical split weight (`1111`);
     - the underneath target-pick bonus (`1204`);
     - the no-threat landmark drift (`1250`);
     - spot-zone lane and drift (`1311-1325`).
   - It is assigned inside the QB controller (`behaviors/qb.ts:372, 378, 411, 422`). Even look-off
     decoys are written there, so a defender "sees" the decoy only because the QB sets it.
   - Defenders should infer gaze from the perceived QB head/facing. `judgment.ts:64-66` already
     does this with `sim.see(a, sim.qb).facing`.
   - **Highest-impact flag:** it makes zone defenders rally to the intended receiver regardless
     of their own vision or `playRecognition`.
2. **True `sim.qb.pos` for lanes and facing.**
   - Used in `defense.ts:1015, 1253, 1292, 1316, 1325` and `techniques.ts:100, 115, 120`.
   - It should be the perceived QB (`sim.see`), as in `judgment.ts:64`. This one is minor.
3. **Receiver numbering from `sim.offAlign.numbering`, fixed at the snap.**
   - Used in `reads.ts:137-141`, `defense.ts:1073-1076, 1219-1224` and the rules' `ref()`.
   - Pre-snap alignment is visible to a real defender, so the count itself is defensible.
   - But it is taken from offence data rather than his own count (it has no motion/shift
     recognition error), and it never updates post-snap. "New #1", "new #2", "who becomes 3",
     "final #3" (HNFL-201, 200, 021, 198) cannot be expressed.
4. **Not hidden, by design.**
   - `quarterFlat` reading the corner's installed rule (`rules.ts:321-323`) and `hasVisibleCap`
     (via `sim.see`) are both acceptable.
   - No quarters rule reads the called route or another defender's live directive. Each
     exchange is two independent perceived reads.

## Contradictions with cited HNFL references

- `rules.ts:105-107` cites **HNFL-095** for "China is not available vs any x1". HNFL-095 is a
  Roy/Lou away-side sheet. The quarters statement is in **HNFL-098/199**, and HNFL-201/093 adds
  the "#2 in backfield → tight ¼, no China" rule.
- `isQuickOut` uses 7.5 yd (`reads.ts:172`) for the Palms trigger. HNFL-051 says "out or flat
  **under 5**". The 7.5 is an installation choice, but it is not the cited source's threshold.
- `mush` (`rules.ts:470-488`) says the nickel zones the curl-flat when #3 goes to the flat. HNFL-050
  (Book) has the nickel **trap #3's out/flat**.
- The `quarterFlat` docstring cites HNFL-094/365 for "#3 awareness" but implements only "#3 away".
  HNFL-094/198/365 also make the apex responsible for **#3's flat**.

## Not verified

- Run-time frequency of each branch (e.g. how often the China zone-off occurs, or how often the
  safety locks `two` before a dig).
- Whether `DeepCoverage.choose` materially widens the 0.8+0.15·vx over-top cushion in practice.
- No sims were run; this is a static read.
