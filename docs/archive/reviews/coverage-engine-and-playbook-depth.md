# Coverage engine v2 and playbook depth (work in progress)

**Newer follow-up:** [coverage judgment and pocket mechanics](coverage-judgment-and-pocket-mechanics.md)
implements cue-driven help, coverage movement/catch-window fixes and the first
launch-relative pocket-push changes. Read its measured regressions before
continuing this plan. The offensive pool and coordinated pressure package
remain pending.

The user asked for four things: a much deeper offensive and defensive call
pool (real plays pair a concept on one side with a different concept on the
other; defenses play far more than stock Cover 2), much deeper coverage
mechanics (Cover 2 match, inverted 2, trap, split-field, Cover 6/8/9,
Fangio calls and checks such as Zeus), much more pocket push and collapse in
the trenches, and more mug fronts and blitzes. This document records what is
done, what was measured, and where to pick up.

**Status:** the coverage engine and catalog are done and tested. The
offensive pool, pressure package and trench push are measured and designed
but not built.

## NFL references (new, aggregates only)

All four were extracted from the Big Data Bowl 2025 data (2022 season).
They are committed in `data/reviews/playbook-depth/`; the scripts are in
`scripts/data/`.

| File | Script | What it gives |
|---|---|---|
| `nfl-defense-calls.json` | `bdb2025_defense_calls.py` | Coverage family shares (overall, by alignment, down and distance, field zone, personnel); per-player PFF assignments by coverage; rush counts, blitz and simulated-pressure rates; pressure and sack rate by rush count |
| `nfl-route-combos.json` | `bdb2025_route_combos.py` | Route tuples per side by side size, full-play pairings, back routes, mirrored share, concentration |
| `nfl-pocket-push.json` | `bdb2025_pocket_push.py` | QB, OL and rusher depth curves; interior push; how often pressure arrives with the blocker still attached; pocket shape |
| — | (web research) | `docs/research/coverage-terminology.md`: per-player rules for Cover 2 match, inverted 2, trap, split-field, Cover 6/8/9, the Fangio tree (Zeus, Lord, Ring), Cover 3 and Cover 1 variants, trips checks, pressure terms; about 75 sources, with "sources disagree" notes |

Headline numbers (2022 dropbacks):

- **Coverage:**
  - Cover 3 family 31.8%, Cover 1 21.2%, Cover 2 14.0%, Quarters 13.1%, Cover 6 9.6%, Cover 0 3.6%, 2-Man 1.8%.
  - Man 26.6%.
  - Third and 3–6 is 41% Cover 1; third and 11+ is 80% zone.
- **Rush:**
  - 4 rushers on 67.5% of dropbacks; 5+ (blitz) on 28.0%.
  - Simulated pressure on 1.5–5.2% depending on definition (5.2% counting 3-4 edge OLBs).
  - Blitz rate by family: Cover 0 85%, Cover 1 44%, Cover 3 34%, Cover 2 10%, Cover 6 8%.
  - Pressure rate: 31% with 4 rushers, 40% with 5, 53% with 6.
- **Routes:**
  - Both sides run the same route tuple on only 3.95% of plays.
  - The top 100 full-play pairings cover only 21% of plays, but the top 20 single-side tuples cover 48.5% of sides.
  - So plays should be built from separate side concepts plus a back route, not whole-play templates.
  - Back routes: flat on 33% of plays, angle 16%, none 29%.
- **Pocket:**
  - At 2.0 s mean OL depth is 3.67 yd (4.48 at 2.5 s); rounded medians are 3.9 and 4.7. Interior blocker retreat includes voluntary setting, with the rusher still about 0.8 yd away.
  - When a defender first gets within 2 yd of the QB, his listed blocker is still within 1.5 yd 76% of the time. Attached first proximity occurs on about 21% of dropbacks. Our older 1.5–3.5% figure counted active engagements, a different definition; use the newer geometric/engagement comparison in the follow-up.

## Coverage engine v2 (done)

**Rules, not fixed zones** (`src/sim/coverage/`):

- **Release reader** (`reads.ts`). Each defender classifies the receivers he keys from his own perception: vertical, out, flat, under, in, stop or block.
  - A declaration must persist briefly before he believes it, so two defenders reading the same #2 can disagree for a beat.
  - In- and out-breaks count once the path leans about 30° off vertical.
- **Rules** (`rules.ts`). They turn reads into a directive: play a landmark zone, man with a technique (leverage, trail, over the top), trap, wall, rob, or cut a crosser. The 18 rules are:
  - Cover 3 match corner, Rip/Liz curl-flat, Cover 3 seam carry, match hook, 3-match Mike;
  - quarters MOD and MEG corners, quarters safety (#2 read), apex wall;
  - Palms corner and safety;
  - cloud and sink corners, Cover 2 hook, Tampa Mike;
  - poach safety, Stubbie safety;
  - inverted safety, rat and robber.
- **Thresholds are named in the code.** Safeties commit to #2 vertical only past 7 yd (quick-out depth); the curl-flat carry goes to 12; hooks carry #3 to 15.
- **Exchanges emerge.** Complementary rules read the same receiver: the Palms corner traps #2's out while the safety takes #1 over the top.
- **The defender** (`defender.ts`) switches techniques when the directive changes and keeps a job history for tests and film.
- **Man options:** man coverage gained leverage (inside, outside, head-up), trail and over-the-top options. Underneath seats can carry rules; man calls can name rat and robber seats; bracket roles can double a receiver.
- **Formation checks:** checks run at the snap (Quarters vs. 3x1 becomes Poach or Stubbie by the coordinator's preference; Cover 3 Match becomes Mable).
- **Zeus:** resolves at the snap to Cover 8, Stuff or Quads by where the target lines up.

**Catalog** (`src/playbook/coverages.ts`): 26 calls in PFF families.

- **Cover 0 and Cover 1 family:** Cover 0; Cover 1 press, off with a rat, robber, and double (bracket); 2-Man.
- **Cover 3 family:** Sky, Match (Rip/Liz), Seam, Buzz, Cloud, Mable, and Cover 9 (Fangio weak rotation).
- **Cover 2 family:** Cover 2, Cover 2 Match, Inverted 2, Tampa 2.
- **Quarters:** MOD, MEG, Palms (2-Read), Poach, Stubbie.
- **Split field:** Cover 6/Stuff (quarters strong, half weak), Cover 8 (half strong, quarters weak), and a quarters / 2-Man split.

Calls can set a pre-snap look (rotations from two high) and per-seat pre-snap depth (a rotating safety cheats down).

**Coordinator:**

- **Coverage trees.** Each team has a coverage tree: single-high, quarters, two-high (Fangio), Tampa, or pressure-man.
- **Family, then variant.** The family is drawn from the NFL situational shares above, scaled by the tree, the man matchup and in-game learning. The variant within the family comes from the tree and the coach's match rate.
- **Disguise.** Two-high trees show two high on 85% of non-two-high calls.
- **Zeus** is called by two-high trees that shadow.

**QB identification** now targets the family (eight pictures), not each variant. Learning and scouting are by family.

### Tests and labs

- `test/coverage-rules.test.ts` has 11 fixed-scenario cases:
  - Palms trap and replace;
  - #2 vertical to the safety;
  - MOD zone-off against a slant;
  - the quarters safety's #2 read;
  - checks to Poach and Stubbie;
  - poach on trips #3;
  - Rip/Liz seam carry;
  - corner zone-off;
  - Cover 2 sink against squat;
  - the Tampa pipe;
  - Zeus resolution.
- All 178 tests pass.
- `scripts/coverage-matrix.ts` plays every call against every pass concept from 2x2 and 3x1, both flips, three paired rosters. It reports yards per attempt, explosive rate, separation, and the concepts and receivers that beat each call.
- `scripts/defense-calls.ts` compares the sim's call mix with the NFL.

### Measured results

**Lab** (2 reps, about 320 attempts per call): yards per attempt by call.

| Calls | Before the fixes | After the fixes |
|---|---|---|
| Classic calls | 7.7–10.1 | — |
| Inverted Cover 2 | 16.0 | 9.1 |
| Cover 3 Buzz | 13.1 | 12.0 |
| Cover 3 Cloud | 12.4 | 11.9 |
| Cover 9 (new) | — | 11.7 |

Mesh did most of the damage to Buzz and Cloud (30 and 32 yd per attempt). Three fixes:
- a pre-snap depth for rotating seats;
- the crosser cut for hook players;
- reshaping inverted 2 to the classic definition.

The remaining outliers are still rotations from two high: slants and crossers against a safety mid-rotation. Before tuning those, check them against NFL rotation timing.

**Games** (32, seed 7), comparing the branch head with this work:

| | NFL | Head (`324a937`) | This work |
|---|---|---|---|
| Points / team-game | 21–23.5 | 30.4 | 35.1 |
| Completion % | 63–66 | 67.0 | 65.4 |
| Yards / attempt | 6.8–7.2 | 9.26 | 9.50 |
| 20+ yd completions / att | 7–9% | 10.9% | 12.2% |
| YAC / reception | 4.8–5.6 | 6.44 | 7.03 |
| INT rate | 2–2.5% | 4.4% | 5.2% |
| Separation at catch | 2.8–3.2 | 3.76 | 3.53 |
| Tight windows | 13–17% | 4.6% | 5.2% |
| QB reads family right | 70–90% | 62% | 53% |

Coverage is tighter at the catch (separation and tight windows improved) and completion rate fell. But explosives, YAC and points rose. The excess is plays that break after the catch or behind rotating defenders. This is the next coverage task, before anything is tuned:
- use the matrix's worst-receiver column to find which seat is late;
- check rally and pursuit after the catch (YAC 7.0 against 4.8–5.6).

The QB's read rate fell because there is far more disguise and variety; it needs its own check against NFL disguise rates.

**Call mix** (32 games):

| | Sim | NFL |
|---|---|---|
| Cover 3 | 27.8% | 31.8% |
| Cover 1 | 27.8% | 21.2% |
| Cover 2 | 13.4% | 14.0% |
| Quarters | 11.9% | 13.1% |
| Cover 6 | 10.4% | 9.6% |
| Cover 0 | 6.4% | 3.6% |
| 2-Man | 2.2% | 1.8% |
| Blitz (5+) | 32.7% | 28.0% |
| 6+ rushers | 9.5% | 5.8% |
| 3 or fewer rushers | 0% | 4.4% |

Man coverage and Cover 0 are too frequent (the pressure-man tree plus situational boosts). The pressure package below fixes rush counts by family and situation.

## Design principle from the user

Do not write rules on the clock ("after 1.6 s do X") unless that is how it
works in real football. Players should react to what they see — releases,
depths, leverage, the quarterback — with judgment and some looseness, not
rigid timers. The coverage rules key on declarations and depths; the one
time gate (the Palms quick-out trigger) was removed. Two places still use
time and should be revisited the same way: the release reader treats a
receiver standing at the line after about half a second as a blocker, and
older behaviors in `src/sim/behaviors/` still have fixed read times
(`readAt`) and pocket clocks.

## Next, in order

1. **Coverage leaks** (above). Use `scripts/coverage-matrix.ts` and the play-trace pattern in this review's history (one play, every defender's job history at the throw). Fix seats, not global speeds.
2. **Offensive pool** (designed, not built).
   - `src/playbook/sides.ts` will hold side concepts by side size (1, 2, 3 receivers) from `nfl-route-combos.json`, weighted by NFL share, each with a read order and the families it attacks. Examples:
     - two-receiver sides: go-out, double go, go-hitch, double hitch, curl-flat, hitch-seam (Hoss), go-post, mesh pair, dig-shallow, double out, smash, slant-flat;
     - three-receiver sides: spacing, stick, flood.
   - Compose a play as strong side + weak side + back route (NFL distribution), with a small mirroring bonus. The progression starts on the side whose concept attacks the expected family.
   - Keep the existing whole-field concepts (mesh, Y-cross, drive, dagger, four verts) as full plays.
   - The coordinator gets side sizes from `alignOffense(...).counts`.
   - BDB route labels map to our routes: GO→go/fade/seam, HITCH→hitch/curl/stick, CROSS→shallow/cross, IN→dig/short_in, OUT→quick_out/out.
3. **Pressure package.**
   - Fronts and pressures to add: mug fronts (double-A, single), creepers / simulated pressure (DL drops, a second-level player rushes), fire zones (3 under, 3 deep, against Cover 3 match), zero pressures, overloads, edge pressures, DL games (T-E, E-T, tex). The NFL runs stunts on about 25–29% of passes.
   - The coordinator should match NFL rush counts by family and situation (table above, `nfl-defense-calls.json` → `pressure`).
4. **Trench push.**
   - Compare the sim against `nfl-pocket-push.json`: mean OL depth 3.9 yd at 2.0 s; interior blockers 3.3 yd deep and attached; attached pressure on 21% of dropbacks; time from first 2-yd proximity to the outcome 0.3 s median, 2.1 s p90 when attached.
   - Ours sets shallow and rushers come free (see the error-budget review). Build the measurement into a `scripts/pocket-anatomy.ts` that mirrors the extractor first, then fix the engagement push and the QB's response.

## Reproduce

```sh
npx vitest run test/coverage-rules.test.ts
node --import tsx scripts/coverage-matrix.ts 2            # ~2 min, all calls
node --import tsx scripts/defense-calls.ts 32 7 4         # call mix vs NFL
node --import tsx scripts/calibrate.ts 32 7 4
python3 -I scripts/data/bdb2025_defense_calls.py <bdb2025 dir> out/nfl-defense-calls.json
python3 -I scripts/data/bdb2025_route_combos.py <bdb2025 dir> out/nfl-route-combos.json
python3 -I scripts/data/bdb2025_pocket_push.py <bdb2025 dir> out/nfl-pocket-push.json
```
