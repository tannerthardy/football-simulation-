# The back's release on dropbacks (BACK_RELEASE, 2026-11-11)

Run Game lane, at Integration's request: the back's release in the pass game.
It follows Rules + Coaching's read diagnosis (`docs/reviews/2026-11-11-qb-reads.md`, #549).

**Question.** Our released back is open at the throw a third as often as the
NFL's. Is that his route construction (when he leaves and where he goes)?

## Populations

**Sim.**
- Code: branch `run/G3-oz-backfield` at 001b4a52 (develop d20043f0, run-ref-24, merged).
- Games: 16 league-sampled games, seeds 101–116, `leagueSample`.
- Arms: base, and `BACK_RELEASE=1`.
- Exports: `sim-export.ts --seed 101 --games 16` and `qb-reads.ts --seed 101 --games 16`.

**NFL.** BDB 2025. All dropbacks for route labels. The common-format plays for
the path operator. Weeks 1–3 for `qb_reads.py`.

## NFL backs on dropbacks

BDB 2025 `player_play` routes for RB/FB on dropbacks:
- the back runs a route on 77% of dropbacks (8,106 of 10,499);
- of those routes: FLAT 48%, ANGLE 20%, OUT 10%, SCREEN 8%, GO 4%, HITCH 3%, WHEEL 2%, CROSS 2%;
- there is no settle-over-the-middle label.

## The release, same code on both sides

`scripts/mechanics/back_release_reference.py`:
- **Released:** past the line, or more than 6 yd wide of the ball, before the throw.
- **Open:** nearest defender 5+ yd away.

| | NFL | Base | `BACK_RELEASE=1` |
|---|---|---|---|
| Backs released before the throw | 66.1% | 50.5% | 63.4% |
| Release time p25/50/75 (s) | 1.10/1.70/2.30 | 0.60/2.20/2.50 | 0.70/1.90/2.30 |
| At the throw: wide / middle | 84 / 15% | 33 / 67% | 71 / 29% |
| Open at the throw | 40.7% | 33.9% | 43.4% |
| Open: wide / middle | 42.7 / 30.9% | 36.1 / 33.1% | 51.7 / 23.6% |
| Depth / width at the throw, p50 (yd) | 0.05 / 10.2 | 3.0 / 3.1 | 1.9 / 7.6 |
| Targets thrown before 2.0 s | 252 of 1,388 | 3 of 197 | 1 of 249 |

Rules + Coaching's operator (`qb_reads.py`, NFL weeks 1–3):

| | NFL | Base | `BACK_RELEASE=1` |
|---|---|---|---|
| Every released back at the throw: open | 36.4% | 11.6% | **24.9%** |
| ... targeted when open | 28.5% | 36.1% | 28.2% |
| Throws to a breaking route: the back open | 33.0% | 9.0% | 22.6% |
| Back targeted, all throws | 18.7% | 19.6% | 20.1% |
| Back targeted before 2.0 s | 18.9% | 3.3% | 0.7% |
| Throws before 2.0 s | 18.0% | 11.4% | 9.8% |
| Flat-class release p50 | 2.40 s | 2.90 s | 2.85 s |

## Cost: protection

Free first pressure is from `freerush.py`; sacks and yards are from `qb-reads`.

| | Base | `BACK_RELEASE=1` |
|---|---|---|
| Free first pressure per 100 dropbacks | 10.5 | 11.8 |
| Stand-up edge (LB on the line, outside) free | 0.8 | 1.8 |
| Off-ball inside backer free | 3.1 | 3.5 |
| Sacks per dropback | 1.8% | 1.6% |
| Scrambles | 4.5% | 4.9% |
| Completion | 62.1% | 63.7% |
| Yards per dropback | 9.41 | 9.79 |

The earlier pass-pro review measured NFL free first pressure at 10.2 per 100 (`docs/reviews/pass-pro-free-rushers.md`).

## The build (flag off)

`BACK_RELEASE` in `src/sim/assign.ts` applies to a back the concept installs
as `check`:
1. **The count.** It uses what the offense sees before the snap: box
   defenders (0–6 yd off the ball, within 3 yd outside the tackles) against
   protectors (the five linemen plus the ends the concept keeps in).
   - No more box defenders than protectors: no pickup, so he runs his route
     from the snap.
   - More: he checks.
2. **The check.** He sets beside the QB and takes a man the line hands him.
   He leaves once nobody is coming after 0.55 s plus his reaction time; the
   old wait was 1.0–1.3 s. Whom he has is the existing coordinator's call,
   from the line's seen picture.
3. **Where he goes.** Into space: the flat on his side (`back_flat`), or an
   angle when a teammate already runs that flat (flat, out or quick out on
   his side). He no longer goes to `checkdown`, which settles 4 yd over the
   middle among the backers.

Test: `test/back-release.test.ts`.
- Against a nickel box he checks.
- Against a dime box he releases from the snap into `back_flat` or `angle`.
- With the flag off, the old check-release stands against both.

## Reading

- **Construction was most of the gap.** He leaves earlier and lives outside
  the box. Open at the throw goes 11.6 → 24.9% on Rules' operator, and 34 →
  43% on the path operator (NFL 41%).
- **He is still not thrown early.** Back targets before 2.0 s fell to 1 of 249,
  and the flat class is still released at 2.85 s.
  - At 1.5 s he is 2.0 yd behind the line and 4.0 yd wide (NFL 3.7 behind, 5.1 wide).
    He is close to where the NFL back is, so he is not out late.
  - What is missing is the QB's estimate of a short, wide throw. That is
    Coverage's `window()` fix (flats open at the throw are targeted 4.8% vs
    NFL 32.6%). The two should land together.
- **The protection cost is real but small.** Free first pressure rises 1.3
  per 100 dropbacks, mostly stand-up edges. Sacks don't rise in these 16
  games.
- **Over the middle, the back is open less** (23.6% vs NFL 30.9%). Those are
  the angles, which turn inside at 5 yd into the backers. Wide releases are
  open more than the NFL's (51.7 vs 42.7%).

## Not built / next

- **The back's own read of his man after the snap.** Today he leaves when
  the coordinator has given him nobody. He doesn't key a particular backer,
  so a late blitzer after his release is free. The free inside backer is
  3.1 → 3.5 per 100.
- **Concept-specific back routes** (swing, wheel, option) beyond flat/angle.
- **Screens and angles in the call pool:** tell Rules + Coaching when they
  are callable (CALL_MIX).
