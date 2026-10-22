# Defensive alignment and calling: the candidate on one page

2026-10-22. This page is for the first shared build. It covers the
def-alignment session's stack:
- #194 `claude/def-alignment` (on #190 `claude/run-defense-develop`);
- #196 `claude/motion-checks` (on #194, with #193's coverage rules and
  offensive motion merged).

Details:
- `docs/reviews/defensive-alignment.md` (#194);
- `docs/reviews/motion-checks.md` (#196);
- research catalog `docs/references/defensive-alignment-sources.md`.

Every flag is default-off in source and identical when off. The profile
(`config/baseline.json`) turns flags on.

## On in the candidate profile (user-approved)

| Flag | Owner | What it does | Evidence (tracked → before → after) |
|---|---|---|---|
| `FRONT_ALIGN` | #190, now this session | The front on bodies (shades at 0.57 yd); end men by surface, install rules and build | Edge 1.5+ yd outside the tackle on dropbacks: 89% → 51-58% → 88-92% |
| `DEF_ALIGN` | #190 | Secondary depth and shade by job | (#190's review) |
| `SHORT_PACKAGE` | #190 | Short-yardage package answers the heavy package anywhere | (#190's review) |
| `FRONT_STRENGTH` | this session | The front sets to the attached end; otherwise the team's lean | 3 technique toward the TE 82-86% → 27% → 74-78% |
| `FRONT_MENU` | this session | Fronts called as tracked by scheme, personnel and moment; backers at tracked spots; A-gap mugs | 3-4 base: bear ~45%, tite ~20%, 5-0-5 ~1% (sim used 5-0-5) |
| `BOX_ALIGN` | this session | Every detached #2/#3 answered; depth by situation; end men widen on passing downs; one-high down safety at his tracked spot | Weak #2 unanswered vs empty 6% → 48% → 2%; run box mean 6.23 → 6.06 → 6.27 |
| `DEF_PACKAGE` | this session | Nickel and dime by personnel and situation | Dime vs 11 on 3rd and 3-6: 29% → 6% → 31% |
| `SHELL_SHOW` | this session | Disguise rate by coverage, checked to the formation seen | Under center, one-high shows two-high: 13% → 32% → 12% |
| `COVER_CALL` | this session | Man weights read the matchup against league norms; early-down ratios; formation check | Early-down Cover 1: 18% → 34% → 23% |
| `PAD_LEVERAGE` (World law) | #190 | Traction on the actual normal load | User-approved; relayed to the main engine session |
| `DL_ANCHOR`, `DL_FLATTEN`, `SNAP_REACT` | #190 | Line play | (#190's review) |

**Games.** The run-defense session ran eight games on this set (f863ea2,
seed 101, guard 12/12):
- runs broke contact 12.9% (NFL 12.5%);
- run median 3.19 (3.0);
- DB first contact 29% (23%);
- 6-man box 35% (33%);
- two deep at the snap 38% (26%);
- report flags 32.

`COVER_CALL`'s own eight-game check left the top line flat: run mean 6.64 →
6.60, YAC mean 10.7 → 10.4.

**Tests** (Node 22.23.3):
- Core under this profile: 2,887/2,887 (#194 a1d20d61).
- `test:all` (12 of the flags, before `COVER_CALL`): 3,113/3,116, with the 3
  explained.
- `test:data`: 2 failures and 2 errors that reproduce on #190's tip.

## Off, proposed on in pairs (#196)

| Flags | Owner | What | Evidence |
|---|---|---|---|
| `MOTION` + `MOTION_CHECK` | #193 + this session | Offensive pre-snap motion, and the defense's answer to it: man locks or trades at the tracked rates, everyone else bumps by job exchange, the front stays | Zone across motions with a defender running the field 17% → 45% → 16%; zone empty 9% → 22% → 9%; nobody near the motion man 5% → 4% → 0% |
| `DEUCE` + `PRESSURE_CALL` | #193 + this session | Deuce (a five-man pressure with its own 2-deep coverage), and blitz chance scaled by the shell behind it | 5+ rushers behind one high: 38% → 24% → 36%; behind two high: 11% → 3% → 8%; all: 29% → 17% → 25% |

Core at #196 19a3769b: 2,963/2,963 plain, and 2,963/2,963 under the profile
with all four on. The `MOTION` + `MOTION_CHECK` eight-game check (earlier
motion plans):
- off flags 36 → 33;
- runs broke contact 16.6 → 13.5%;
- guard 11/12: run box percentiles, from the two games diverging; on the same
  motion plays the check lowers the box.

## Off, proposed

| Flag | Owner | What | Evidence |
|---|---|---|---|
| `AGAP_ALIGN` | this session | The 1 technique stands at the team's habit along the centre-guard split (tracked team medians 0.30-0.82), not on the centre's shoulder | Over/under centre covered: 48-51% tracked → 96-97% → 83-85%, and 53-56% with #190's `OL_SPLITS` |

## Staged-scene pins

These tests hold a flag off because the scene was set up on the installed
alignment. Each pin was diagnosed rather than added blind:
- `counter-gh`, `puller-route-progress`: `BOX_ALIGN` (the down safety in the
  box is a real second-level defender);
- `fangio-tree` Pounder: `FRONT_ALIGN` (the rush ends the ball-held rep);
- #193's `corner-one-release` and `cover6-half-side`: `FRONT_ALIGN`,
  `SNAP_REACT`, with held/released preconditions;
- #193's `cover3-cover2-rules`: `AGAP_ALIGN` (a sack ends the held rep
  before the read);
- #190's eight witness pins.

## Open items

| Item | Owner |
|---|---|
| Duo: a DB makes first contact 44% (NFL 27%, n=36), waiting on sample | run defense / this session |
| Two deep at the snap in games 38% vs tracked 26% (the snap frame matches: 32% vs 31%) | this session (game play mix) |
| Formation library: 12 sets attach both ends; WR splits 3-7× too wide (`WR_ALIGN` off) | offense |
| Jets in man: nearest defender 1.5 yd (tracked 0.7); strict travel 5% (47%), bounded by acceleration and reaction | this session; not tuned |
| Fangio E1 (strength and rotation to the nickel side), E3 (rotation timing) | this session, next |
| Shifts and TE motion (`MOTION` moves one off-ball player) | #193 / this session |
| After-catch YAC tail (p90 ~33) | workboard item |
| Coordinator generation (habits now league-average tables) | the user, later |
