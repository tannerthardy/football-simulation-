# Where the defence gives up yards (2026-11-10)

Report only. Operator: `scripts/diag/defense-yards/yards.py`. It runs the same code on NFL tracking and on sim plays, both in the common format (`scripts/mechanics/metrics.py`).

| Side | Source | Runs | Dropbacks | Catches |
|---|---|---|---|---|
| Sim | run-ref-14 (develop `f122c83c`), 16 games from `sim-export.ts` | 656 | 1,517 | 895 |
| NFL | BDB common format (`nfl_bdb2025.py`) | 6,223 | 9,713 | 5,323 |

First contact is the shared geometric index: the first frame after the handoff (or the snap, or the catch) in which a defender's centre is within 1.0 yd of the carrier's. The primary tackler is the defender nearest the carrier at that frame. See `docs/reviews/2026-11-10-tackle-forms.md`, "The shared index".

## Headline

| | Sim | NFL |
|---|---|---|
| Yards a carry | 4.51 | 4.48 |
| Yards a dropback | 10.6 | 6.2 |
| YAC a catch, mean | 9.6 | 5.0 |
| YAC a catch, p50 | 5.5 | 3.2 |
| Catches reaching +10 after the catch | 31.5% | 13% |
| Yards after +10, mean (catches) | 13.4 | 7.0 |

- Run yards match the NFL.
- The excess is in the pass game. Yards after the catch (+4.6 a catch, about +2.7 a dropback) make up most of the dropback gap; the rest is air yards and completions.
- Almost all of the excess YAC comes on catches that reach 10 yd after the catch.

## Ranked by yards explained

Estimates overlap: each is (sim rate − NFL rate) × the yards per event.

| # | Item | Sim | NFL | Yards | Mechanism | Lane |
|---|---|---|---|---|---|---|
| 1 | Defenders reach the catcher late | first contact at +2.6 yd after the catch; no contact before the end on 19% | +0.8 yd; 9% | about +1.5 to 2 a catch | Defenders break on the ball late. At the throw, the nearest defender heads 74° off the catch point, against the NFL's 48°. | Coverage |
| 2 | Pursuit once the carrier is loose (at +10) | aim of the nearest two off the line to the carrier: 30° on catches, 41° on runs; level with or ahead of him (within 15 yd): 2.18 / 1.93; speed share 0.76 on runs | 48° / 50°; 2.95 / 3.30; 0.82 | about +1.5 to 2 a catch, plus the run tail | They chase his current position instead of taking an angle that gets in front of him. | Defense |
| 3 | DBs break tackles on catches | DB first contact: made 51%, broken 39%; all catches: missed 0% | 63% / 18%; 4% | about +0.5 a catch | The approach is NFL-like (5.2 against 5.5 yd/s; broke down 28% against 26%). The solo finish fails: every grab becomes a hold, then a break. | Flex |
| 4 | Run stuffs | 9.0% of runs; a free man at the line hits first 27%, then stuffs 17% | 17.8%; 31%, then 43% | about −0.35 a run | The unblocked man arrives, but the runner falls or drives forward. | Flex (the finish), Defense (the fit) |
| 5 | Safety depth and shells | at the snap, 1-high safety 12.0 yd deep, 2-high 12.3 / 11.1; shells 0 / 1 / 2-high 17 / 53 / 30% | 14.4; 14.6 / 12.2; 9 / 45 / 47% | none directly; feeds item 2 | Shallower safeties and fewer 2-high shells leave fewer men ahead of a loose carrier. Nobody deeper than the deepest receiver: 3% (1-high), 1% (2-high), NFL 3% / 2%. | Rules + Coaching |

## Run-down detail

The carrier at +10 yd past his start (from the line on runs, from the catch on catches).

| | Sim runs | NFL runs | Sim catches | NFL catches |
|---|---|---|---|---|
| Reach +10 | 8.2% | 12.0% | 31.5% | 13.0% |
| +20 given +10 | 24% | 23% | 44% | 22% |
| +40 given +20 | 54% (7 of 13) | 24% | 31% | 13% |
| Defenders within 5 / 10 yd | 4.37 / 8.65 | 3.61 / 7.12 | 2.21 / 4.43 | 2.52 / 4.48 |
| Level with or ahead of him, within 15 yd | 1.93 | 3.30 | 2.18 | 2.95 |
| Speed as a share of his top speed, p50 | 0.76 | 0.82 | 0.86 | 0.85 |
| Aim: intercept / chase / off | 33 / 51 / 16% | 24 / 43 / 32% | 30 / 55 / 15% | 33 / 40 / 27% |
| Nearest two, aim off the line to him, p50 | 41° | 50° | 30° | 48° |
| Closing over the next 0.5 s | 30% | 26% | 46% | 43% |

## First contact and rally

| | Sim runs | NFL runs | Sim catches | NFL catches |
|---|---|---|---|---|
| Outcome: made / missed / broken / other | 57 / 5 / 19 / 19% | 37 / 9 / 27 / 27% | 56 / 0 / 34 / 10% | 62 / 4 / 20 / 14% |
| Open field: approach speed p50; broke down | 3.9 yd/s; 38% | 4.7; 27% | 5.2; 28% | 5.5; 26% |
| 2nd defender within 1.5 yd: p50 time; never | 0.2 s; 10% | 0.1 s; 7% | 0.4 s; 30% | 0.4 s; 42% |
| 3rd defender: p50 time; never | 0.7 s; 32% | 0.5 s; 26% | 0.8 s; 59% | 1.0 s; 75% |

- Help after first contact arrives about as fast as in the NFL.
- On runs the tackle ends in a pile (Flex: 3+ defenders within 1 yd at the end, 52% against 19%).
- The pass-side yards are lost before first contact, not in the rally.

## Limits

- The sim side is 16 games. The run tail (+40 given +20) rests on 13 runs.
- A fix should be judged on the fixed run set plus Coverage's pass panel.

## Follow-up: pursuit by role, pairs and the first man (2026-11-10)

**Caveat on absolute gaps.** Every sim game here is IRN vs COM, and both teams' alignment habits are seeded from the team id. So the safety depth and the "level with or ahead at +10" gaps above are a two-team sample, not the league (Rules + Coaching). Re-run on the per-seed team tooling before quoting them. Paired sim comparisons on the same teams are unaffected.

**Operators** (same code on NFL and sim common-format plays; carrier phase from the handoff or the catch):

- `scripts/diag/defense-yards/pursuit_roles.py`: from the carrier getting loose (+5), each unblocked pursuer is classed by help behind him. Help means teammates deeper than him who can reach the carrier's path. Class 0 is the last line. Per class it reports:
  - lead beyond the pure intercept and aim along the carrier's path;
  - speed share and break-down;
  - inside-out;
  - first-contact outcome.

  It also reports pairs at first contact (split vs same side, with the cutback lane) and the class-0 tackler by approach. `CLASS0_OUT` dumps each class-0 first contact.
- `scripts/diag/defense-yards/lastyard.py`: the first defender to reach hands range. That uses `grabs.py`'s rule: within 1.6 yd and closing. Over his last 3 yd it reports speed (share and yd/s), aim, closing speed, break-down, overrun and the carrier's cut, by outcome (contact, slowed, runs on).

**Findings.** Sim is run-ref-14/15, IRN vs COM, 16 games, against NFL BDB 2022. Shares are of the relevant plays.

| | Sim | NFL |
|---|---|---|
| Lead beyond the pure intercept, all classes | −8 to +5° | −2 to +5° |
| Class-0 speed share at +5, runs / catches | 0.76–0.79 / 0.83–0.84 | 0.90 / 0.89 |
| Class-0 inside-out, runs / catches | 61 / 71% | 73 / 76% |
| Class-0 first contact made / missed / broken, runs | 24 / 0 / 63% | 46 / 9 / 39% |
| Class-0 first contact made / missed / broken, catches | 41 / 0 / 53% | 58 / 5 / 35% |
| Pair at first contact, separation around the carrier (catches) | 59° | 101° |
| Cutback lane covered (catches) | 30% | 46% |
| First man at hands range on catches: carrier runs on | 22–24% | 10% |
| …those run-ons: speed 3 yd → hands; aim off the line | 5.0 → 5.3 yd/s; 24° | 5.0 → 4.7 yd/s; 41–43° |

- **Pursuit angle.** The NFL's last line does not lead more than the intercept, and ours already aims at its perceived intercept, to within 2–3° of the requested heading.
- **Speed.** The speed gap is acceleration after redirects. Aligned pursuers at full request reach 0.84 of top speed; facing is within 20° of travel 94% of the time; speedScale is 0.98.
- **`LAST_LINE` (full effort and inside-out for the last man).** Paired on run-ref-15 it changed none of these. The result is recorded in its FLAGS row on branch `defense/G1-last-line`.
- **Catch run-ons.** The excess comes from first men arriving from behind on a flat angle. That is position at the catch (Coverage's break/squeeze), not last-yard technique.
- **Last-line finish.** Mostly drags rather than grip breaks (Flex, `2026-11-10-tackle-forms.md`).
