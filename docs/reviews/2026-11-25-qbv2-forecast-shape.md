# QB_V2 receiver forecast: the installed shape carried through his picture (2026-11-25)

QB lane, Integration's item 3. Patch: `docs/reviews/patches/qbv2/forecast-shape-carry-on-7585be04f.patch` (3 files,
receiver-forecast.ts, qb.ts, test/qb-receiver-forecast.test.ts). It applies to develop 7585be04f alone or after
`qbv2-play-tag-on-7585be04f.patch`. It is V2 only (`ReceiverForecast.shapeCarry`, set by QBPass when V2 takes the play),
so play with flags off is unchanged.

## The fault

On sf_c3 seed 4 the flat dips at release. One peripheral picture (sampled 1.05 s, acquired 1.5 s) had him moving
(−2.17, −2.75) against a stated velocity spread of 0.45 yd/s. Its true velocity error was about 1.2 yd/s. That one
picture made inferProgress return null, and the forecast switched to a straight line from its velocity, 4.3 yd off by
2.2 s.

The same fault threw three slants vs Cover 3. On seeds 7, 8 and 30 the slant's forecast at 0.9 s was a straight line from one
picture's velocity, pointing behind the line. It priced the slant at P 0.92 (risk 0), and he threw it at 1.3–1.6 s.
Only 1 of the 3 was complete.

## The rule (shapeCarry)

1. **Carry the shape.** Off his line but running parallel to a leg (heading within about 25°, at 1 yd/s or more), the
   whole installed path and its start are shifted by his offset from that leg. The cap is twice that leg's hold tolerance
   (stem 1.2, after the break 1.6, no break 1.5). His progress is then read on the shifted path. The heading test is
   tighter than the hold's own 53° because it moves the whole remaining shape: a man 45° off a flat is not on a
   displaced flat.
2. **Leave the route on evidence.** A picture's position is its reliable part: 0.25 yd in the clear cone, 0.8 yd
   peripheral, against about 1.5 yd/s of velocity error (`2026-11-25-qbv2-picture-age-ruled.md`).
   - A picture that places him off every leg's hold tolerance is believed at once: the forecast follows the line he is
     seen on.
   - A picture with him on his line but moving against it is believed only once such pictures span OFF_CONFIRM, 0.3 s
     of sample time. Until then the last on-route forecast stands.

Two attempts before this one, both kept off:
- **Heading test at cos 0.6.** It carried a flat runner who was 45° upfield off his flat (sf_c1 seed 4, H). His +0.5 s
  error went from 0.49 to 2.66 yd.
- **OFF_CONFIRM on every off-route picture.** It held release-to-block men on their route 0.3 s after they had really
  left it. Seen H on sf_c1 went from 1.05 to 2.73 yd.

## The two stages Integration named

**The flat that dips at release, sf_c3 seed 4** (`diag/fc-flip-951.ts`).
- Before: the forecast is on the route until the 1.5 s picture, then a straight line, 4.3 yd off by 2.2 s.
- After: on the route throughout. Its error at the current time:

| t (s) | 1.1 | 1.3 | 1.5 | 1.7 | 1.9 | 2.1 | 2.3 |
|---|---|---|---|---|---|---|---|
| Error (yd) | 0.43 | 0.38 | 0.29 | 0.45 | 0.50 | 0.53 | 0.56 |

**A man who really has left his route** (`diag/fc-offroute.ts`, 30 seeds a cell). The census covers men he has a picture
of no older than 0.6 s, with the QB still holding the ball. Each row is the forecast 0.5 s ahead against where the man
really was.

| Cell | Rows | Before: median / p90 (yd) | After: median / p90 (yd) |
|---|---|---|---|
| Slant-flat vs Cover 3, on his path | 641 → 683 | 0.40 / 1.89 | **0.28 / 1.05** |
| Slant-flat vs Cover 1, on his path | 358 → 348 | 0.86 / 1.95 | 0.85 / 1.95 |
| Slant-flat vs Cover 1, H off his path (> 2 yd) | 45 → 37 | 1.05 | **0.85** |
| Slant-flat vs Cover 1, Y off his path | 12 → 17 | 2.13 | 1.91 |
| Slant-flat vs Cover 3, Y off his path | 13 → 12 | 2.52 | 2.97 |
| Quick outs vs Cover 1 and 2-man | — | — | unchanged |

Notes on the off-path rows:
- **H vs Cover 1** is a flat runner who goes 30–45° upfield off his flat. Once his picture places him off the flat he
  is followed, as before.
- **The one adverse row, Y vs Cover 3** (seed 13), is a late flat. He is still on his stem while the installed flat
  already has him out on it. The shape is right and the progress timing is ahead. That is 12 rows, against the 683
  on-path gain.

**Unseen men are outside this.** sf_c1 seeds 1 and 5: H runs about 45° off his flat with no picture at all through
1.95 s, and the forecast is his install, 5–7 yd off. Following him needs a look. Nothing in the forecast can do it
honestly.

## Decisions, 8 staged cells × 30 (mid passer, QB_V2=1 QB_QUICK_DRIFT=3, the #936 operator with the walled repair)

| Arm | Taught at the cap | Taught at the release | Complete | Stalls | Sacks |
|---|---|---|---|---|---|
| shapeCarry off | 160 | 163 | 189 | 4 | 2 |
| shapeCarry on | 157 | 160 | 191 | 3 | 2 |

The changed plays:
- **sf_c3, seeds 7, 8, 30.** The three slants thrown on backward forecasts (1 of 3 complete) become W2 at 2.3 s
  (W2 is 23 of 24 complete in this cell). On the honest forecast he prices the slant at P 0.35 and risk 0.09–0.21. The
  taught answer at the cap is the slant, so the cap count falls by 2. Whether that P under-believes the slant is a judge
  question, not a forecast one.
- **sf_c1.** Seed 3 goes from a stall to S2 (complete). Seed 25 goes from S2 to B (complete, not the taught answer).
  Seeds 22, 27, 28 and 30 keep their target with a changed release.
- **st_c2, seed 1: B (complete) becomes a stall.** Without the fix, at 2.6 s, an ambiguous picture of the back at a
  leg junction flipped his forecast to a straight line for one tick. His eyes then went to the back, and he threw it at
  3.0 s. With the fix the forecast holds the route through that tick, his eyes stay away, and he holds the ball to 6.6
  s, with the back priced at P 0.35. The forecast is right in both arms (`diag/fc-back-sc.ts`). The stall is a missing
  second look at the checkdown. That is a cycle item, logged and not chased here.

## Checks

On 7585be04f with the patch:
- `npx tsc --noEmit -p .`: clean.
- qb-receiver-forecast, qbv2-*, decision-information-scan, engine-pin, information guard, dither-budget: 54 pass.
- The new test, "with shapeCarry (QB_V2) …", covers:
  - on his line but moving across it: still on the route;
  - 0.35 s of such pictures: observed motion;
  - one picture 3 yd off his line: observed motion at once;
  - parallel and 2.5 yd off: the shape is carried;
  - 45° off: not carried.
- `npm test`: see the message to Integration.
