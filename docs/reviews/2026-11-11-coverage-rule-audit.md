# Coverage rules: what is coached, what we do (2026-11-11)

Report only; no engine change. Rules + Coaching, for Integration (Tanner's coverage
direction). Read against develop 0d0f4af8. The family tables are in
[`coverage-audit/`](coverage-audit/):
- [Cover 3](coverage-audit/cover3.md): Sky spot and match, Match/Rip-Liz, Seam, Buzz, Cloud, Cover 9.
- [Cover 4](coverage-audit/cover4.md): MOD, MEG, Palms, plus the trips and bunch checks.
- [Cover 2 and Tampa 2](coverage-audit/cover2-tampa.md).
- [Cover 6 and Cover 8 half side, and Cover 1](coverage-audit/cover6-cover1.md).

Each family table gives, per defender slot:
- the coached rule, with its source;
- our code at `file:line`;
- present, partial, missing, wrong, or extra;
- how ours is executed: through the defender's own perception, or as a script.

**The question.** Do our defenders carry the coverage rules players are coached
to play? Where they don't, which missing rules most plausibly explain:
- the excess yards after catch, by family (YAC trimmed and the share of catches
  with 10+ after the catch):
  - C4 6.60 / 35.5% vs NFL 4.82 / 17.9%;
  - C2+Tampa 6.23 / 28.5% vs 4.94 / 14.3%;
  - C3 5.72 / 25.8% vs 5.18 / 18.5%.
- Coverage's finding that corner routes are caught over the underneath defender
  6 yd deeper than in the NFL (11.4 vs 5.4)?

**Answer.**
- **There is much more coverage rule structure than "nearest in a band" implies.**
  `src/sim/coverage/rules.ts` already carries about 30 pattern-match rules with
  HNFL citations: MOD/MEG/Palms, Rip/Liz, Push, Smash, Box, Area, Banjo, Trix,
  Book, Strap. They run on each defender's own perception.
- **Two gaps recur across every family. Together they produce the corner-over
  picture directly:**
  1. Our release reads have no class for a break that keeps climbing.
  2. Underneath defenders let #2 go when he breaks outside. Each family's deep
     player then sits over the top of the corner route rather than under it.
- **Whole seats have no rule at all.** These are the Cover 3 post, every half
  safety, and the Cover 1 free safety. Plain Cover 3 and Cover 2 calls have no
  rules for anyone. These seats re-pick "the deepest man in my band" every tick.
- **The biggest YAC hole after that:** #3 or the back to the flat while #2
  climbs has no owner in Cover 3 or Cover 4.
- **Execution is mostly perceived; the trigger thresholds and branch locks are
  scripts.** The deep and plain zone seats also read the quarterback's internal
  read target, which no defender can see.

The ranking below is mechanism reasoning from the code and the coached rules. It
has not been measured against film or the by-family YAC; the fixture tests are
where each item gets measured.

## Sources and definitions

- **Coached rules** come from the HNFL coverage notes in
  `docs/references/honest-nfl/text/coverage/` (machine OCR; depths quoted from
  OCR need checking against the images), with
  `docs/references/Coverage_Operating_System_Manuscript.md` and the handbook.
- **One family definition per coverage:**
  - Cover 3: the HNFL Danger/Nine "Key & Match" sheet (HNFL-204/056/335/016/292);
    Sky is judged against its true-zone column (HNFL-027/067).
  - Quarters: the HNFL Quads quarters series (HNFL-077/079/092–094/198–202),
    with Palms from HNFL-051.
  - Cover 2 and Tampa: HNFL halves, squat and Wild (HNFL-015/028/068/097/099/130/241/334).
  - Cover 6 and 8: HNFL-073/097/195; Cover 1: HNFL-207/209/240.
- **Tanner's research note** (forwarded via Coverage) has not reached this
  session yet. Its two code claims Integration has verified:
  - the per-tick route-read rng is gone;
  - a per-tick "look" roll remains at `defense.ts:1505` (Coverage is fixing it).

  Nothing here depends on the note.

## How the machinery works (needed for every table)

- **Dispatch.** A call's slot either has a pattern-match rule or a plain zone
  (`src/playbook/coverages.ts`):
  - a slot with a rule runs `CoverageDefender` (`src/sim/assign.ts:134-141`);
  - every other slot runs `ZoneCoverage`, in match or spot style by the coach's
    `matchRate` (`src/game/playcaller.ts:814-820`);
  - calls with rules always run as match.
- **Rules re-run every tick** (`src/sim/coverage/defender.ts:93`). Stability
  comes from `state.mode` latches inside each rule. A latch, once set, holds for
  the rest of the play.
- **Plain zones** (`src/sim/behaviors/defense.ts` `ZoneCoverage`, about 880–1340):
  - **deep:** each tick, take the deepest vertical whose 0.7 s future is in my
    lateral band. Split two verticals weighted by the QB's read target. Drive on
    a stopped route if nothing else is climbing nearby;
  - **underneath (match):** carry a vertical in the band to 10/13 yd. Otherwise
    sit in the lane of the threat nearest the landmark, re-picked each tick;
  - **spot:** drop to the spot, then lean toward the QB's read target.
- **Release reads** (`src/sim/coverage/reads.ts`):
  - the classes are none/block/vertical/out/flat/under/in/stop;
  - any path about 30° off vertical is `out` or `in` at any depth, so a 14-yd
    corner route is an "out" and a post is an "in";
  - only a `climbed` flag remembers a deep stem.

**Seats with no rule.** In the 32-game card (3,016 dropbacks), each share below
is the share of dropbacks in calls with that seat:

| seat | runs | calls (share of dropbacks) |
|---|---|---|
| Cover 3 post (deep middle) | plain deep zone | every Cover 3 call (~25%) |
| half safeties | plain deep zone | Cover 2, Tampa, the half side of Cover 6/8 (~17%) |
| Cover 1 free safety | plain deep zone | every Cover 1 call (~15%) |
| all eleven | plain zones | Cover 3 Sky (7.6%), Cover 2 plain (4.0%) |
| robber | plain zone (`rules.ts:777` returns zone; `Rob` is never used) | Cover 1 Robber, the Cover 1 base robber seat |

## Ranked: what is missing or wrong

Each item gives the coached rule, ours, the families it touches, and why it
should matter. **[C]** marks items expected to drive the corner-over finding;
**[Y]** marks YAC and 10+ after-catch items.

1. **[C][Y] No release class for a break that keeps climbing** (`reads.ts:111`).
   - Corner, post, wheel and drifting deep out read as `out`/`in` at any depth.
   - Every deep-help trigger that asks "is he vertical?" goes blind once the
     route leans. These are `vertical()`, the judgment override
     (`judgment.ts:47`), the 12-yd Match delivery and the quarters safety's
     carry. Post and corner priorities ("corner > seam > post") cannot be
     written.
   - Every family is touched. This is the enabling cause for items 2–4 more than
     a YAC cause by itself.

2. **[C] Underneath defenders let #2 go on an outside break; no one undercuts the corner route.**
   - **Coached:**
     - Cover 3 seam/flat "match #2 out & up" (HNFL-056/335);
     - the Cover 2 vertical-curl apex undercuts #2's corner with #1 not vertical
       while the safety tops it (HNFL-015);
     - the quarters corner sinks under the corner route on China/In while the
       safety stays top-down (HNFL-202/093).
   - **Ours:**
     - Cover 3: `seamCurlFlat` latches `zoned` on any non-vertical release by #2
       (`rules.ts:191`). The curl-flat zone then sits underneath
       (`defense.ts:1183,1254`).
     - Cover 2: `wallTwo` zones off on the `out` read and returns to an inside
       hook landmark (`rules.ts:304`).
     - Quarters: a zoned-off corner plays the plain deep zone and sits about
       2 yd over and inside #2's corner route (`defense.ts:1107-1133`), as does
       the safety carrying #2 (`rules.ts:283`).
   - **Families:** Cover 3 Match/Seam/Buzz/9 (~18% of dropbacks), Cover 2 Match
     and Tampa (~8%), quarters (~13%).
   - **Why it matters:** this is the corner-over picture exactly: the window
     between levels, with both deep defenders above it and the underneath one
     released.

3. **[C] The deep defender's ownership is wrong for the corner route.**
   - **Cover 3 Sky:** the deep-third corner considers only #1 whenever #1 is
     upfield (`defense.ts:1070-1078`). The coached third owns #1 and #2 deep
     (HNFL-027). The same filter defeats the "another receiver climbing" guard,
     so he drives on #1's curl while #2 climbs behind him (`defense.ts:1093`).
   - **Squat corner (`sink_corner`):** there is no "top-down any high/low,
     compress the hole shot" (HNFL-097/099). The rule's docstring promises a
     13-yd sink that the code does not do (`rules.ts:376-396`). Against Smash
     (#2 corner reads `out`), the corner never counts the inside receivers as
     declared, so he stays in his flat zone.
   - **Families:** Cover 3 Sky (7.6%); every squat corner, in Cover 2, Tampa,
     Cover 6 and Cover 8 (~17%).

4. **[C][Y] Deep seats with no rule: the Cover 3 post, half safeties and the Cover 1 free safety.**
   - **Coached:**
     - the halves safety keys #1 then #2 (HNFL-334/097/241);
     - the post squeezes wide when there are no seams (HNFL-056);
     - Tampa safeties play a wider half.
   - **Ours** run the plain deep zone, re-picking the deepest man in a fixed band
     each tick:
     - they split two verticals by the QB's internal read;
     - they drive on a stopped route with no throw cue whenever nothing else
       climbs within 8 yd (`defense.ts:1089-1103`), leaving posts and seams
       behind them;
     - a #2 post leaving a half safety's band passes to the other safety by
       geometry, not by a handoff;
     - the band keeps the post from squeezing wide to a corner route
       (`defense.ts:1373`);
     - the deep-help judgment the ruled seats get never runs for these seats.
   - **Families:** ~57% of dropbacks have at least one such seat.

5. **[Y] #3 or the back to the flat while #2 climbs has no owner** (Cover 3 Match and Nine, quarters).
   - **Coached:** "Mike/Dime must take #3 to the flat" (HNFL-204); the quarters
     apex and Mike have a #3-flat alert.
   - **Ours:**
     - `c3Hook` reacts only to a fast flat (`rules.ts:153,243`);
     - the apex is in man on #2;
     - the curl-flat flat expansion is switched off whenever a #3 or a fast back
       exists (`defense.ts:1222-1224`);
     - the quarters apex's flat trigger is #2 only (`rules.ts:327`).
   - A flat caught with no defender within about 8 yd is the most direct 10+ YAC
     play.

6. **[Y] Man coverage has no crosser or mesh exchange**, and a man on a blocking back never becomes hole help.
   - **Coached:** Lurk "mesh = switch; the original defender zones the hook"
     (HNFL-240).
   - **Ours:** a man defender's inside leverage flips sides when his crosser
     passes the ball (`defense.ts:791`).
   - **Families:** Cover 1 and Cover 0 (~20% of dropbacks). Crossers are run
     with a trailing defender and an empty hook.

7. **[Y] Quarters: fixed corner leverage, and a safety who never re-reads.**
   - **MOD/MEG corner:** always outside leverage (`rules.ts:268,270`), even when
     #2 has taken the safety vertical. #1's dig or post is then trailed into an
     empty inside quarter.
   - **The safety:**
     - he locks on #2 after a 7-yd vertical read (`rules.ts:277,281`). On
       post-dig he follows the dig and vacates the post (inferred from HNFL's
       "any upfield route" and post-to-curl priority);
     - his "#2 cancels" branch skips the far-side and #3 check (HNFL-077);
     - he robs a #1 who isn't climbing yet from underneath: the curl before the
       post.
   - **The Mike** keys only the back and does not squeeze the dig
     (`rules.ts:255-262`; `cut` ignores `in`).

8. **[Y] Underneath zone ownership re-picked each tick after a handoff.**
   - After a wall handoff, and on #2 stop or in, the apex and hook play "lane of
     the threat nearest my landmark, re-picked each tick" (`defense.ts:1198-1209`).
     The coached rule is "match the final #2 underneath" or "deliver to the
     midpoint".
   - Sky spot droppers cannot come below about 9 yd before the throw
     (`defense.ts:1330`), so every flat and checkdown starts with a long close.
   - In the half-side vertical curl, the hook is zoned 5 yd from the ball rather
     than the curl, with no "#2 flat → wall #1 as the new #2" (HNFL-324/325).

9. **[Y] Smaller rule gaps, per the family tables:**
   - the Cover 3 corner zones off #1's quick out without Smash (`rules.ts:119,148`;
     borrowed from the MOD quarters corner; HNFL Tight 1/3 is "man #1 unless In");
   - no "#3 away: take #2 back across" in Cover 3 (HNFL-292);
   - Tampa's Mike takes the vertical nearest the ball, re-picked, with no #2/#3
     key and no "stay low for #3". The Tampa apexes run the Wild wall, not
     "Hook #2" (HNFL-241);
   - the robber has no rule;
   - the Cover 8 Trix half safety has no "#2 vertical is mine";
   - no defender reroutes or collisions a receiver anywhere.

## Execution: intent or script

Under the new rule, a rule table gives intent; execution comes from the player.
Today:

- **Perceived (as it should be).** Every ruled seat reads releases through its
  own `ReleaseReader`:
  - delayed and lagged `sim.see`, dead-reckoned by reaction time and trusted by
    anticipation × focus;
  - a declaration must persist 0.12–0.19 s, scaled by focus, before he believes it;
  - fakes reset the chain.

  Two defenders keyed on the same #2 can disagree for a beat, so exchanges can
  bust on their own. Technique switches start from the defender's current
  position and momentum, so a handoff costs real time.
- **Scripted.**
  - **Fixed thresholds.** Every trigger is a constant with no rating dependence:
    5-yd no-cover zone, 0.35 s declare, 7-yd safety carry, 10/12/13/15/18-yd
    handoffs, 7.5-yd quick out, the 9/20-yd Tampa window.
  - **Permanent latches.** A latched branch never re-reads, so a defender who
    sees the out-and-up or the wheel never reacts to it (`rules.ts:191`).
  - **playRecognition** plays no part in release confirmation; it only times the
    initial run/pass read.
- **Hidden information.**
  - **`sim.qbEyes`** is the QB controller's chosen read target, set in
    `qb.ts:372-422`. Every plain zone seat reads it directly, for deep splits,
    underneath lanes and the spot lean (`defense.ts:1083,1111,1204,1250,1311`).
    `CoverageJudgment` already uses the QB's perceived facing; the zone seats
    should too. It favours the defence, so it does not explain the excess YAC.
    But it is wrong in kind and should go when the zone seats get rules.
  - **Receiver numbering** comes from the offence's alignment table
    (`reads.ts:138`). It is never miscounted and never re-counted after the snap,
    so "final #3" and "new #2" cannot be expressed from what the defender sees.
  - **`judgment.ts:28`** freezes help decisions on the true ball state, before
    the defender has seen the throw.

## Source contradictions found

- `cover1_lurk` checks bunch to an In & Out banjo. HNFL-240 says "No In & Out"
  for Lurk against bunch.
- The Palms quick-out trigger is 7.5 yd in code, against "under 5" in HNFL-051.
- The Book/Stubbie nickel zones the curl-flat; HNFL-050 has him trap #3's flat.
- "China not available vs x1" is cited to HNFL-095; it is in HNFL-098/199.
- The `sink_corner` docstring describes a 13-yd sink the code does not do.
- `invert_safety` is defined but no coverage uses it. Inverted Cover 2's
  safeties run the cloud rule.

Checked and not a gap: with a four-man rush, Cover 2's free droppers fill the
three hooks and leave the two curl-flat seats empty
(`src/playbook/alignment.ts:1170-1199`). In Cover 2 the squat corners are the
flat players, so five underneath is the coached shape.

## What the rule tables should hold (for the next step)

Per family and slot:
- **key** (who he reads, by observed number);
- **branches** (release class of each key → directive);
- **handoffs** (observable trigger: depth, break, a receiver crossing a
  landmark; and who accepts);
- **leverage and depth**;
- **on the throw.**

Two conditions before the tables can say what the coaching says:
- the release reads need a climbing-break class, with corner, post and wheel
  distinguished by direction while climbing (item 1);
- numbering needs to be recountable after the snap, from what the defender sees.

The thresholds belong to the table as the coached intent. How late or wrong a
defender is comes from his reader and technique ratings, not from the table.

**Fixtures named by Integration, and the items each should exercise:**

| fixture | items |
|---|---|
| four verts vs Cover 3 match | 1, 3, 4 |
| smash vs Cover 2 | 2, 3 |
| post-dig vs quarters | 7, 1 |
| curl-flat vs Cover 3 | 5, 8 |
| RB wheel | 2, 5, latches |
| hitch-and-go must still beat an early jump | the perception path; the anti-script test |

**Defense's build** (the underneath defender relating to a receiver in his zone)
is item 8's "match the final #2 underneath". It should end up as a rule in the
same tables.
