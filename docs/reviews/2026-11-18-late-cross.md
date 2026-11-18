# engine-83's never-touched long runs: the late cross-field flat (Integration via Defense)

QB lane, 2026-11-18. Develop fe150600 (engine-83). `late-cross.ts`: slant_flat from gun_trips_11 against cover 1/2/2-match/3/
3-match/4/6/tampa2 × 3 rosters × 4 seeds × flip. Per throw: its time and decision time, target route, his P, intRisk and
planned flight, his read position, whether QB_STICK kept a throw the old recheck pulled, the target's route state, the
receiver against the aim at the release, the catch and the nearest defender, and the yards.

**The throw.** 49 of 176 plays are released at 3.1 s or later with a flight of 1.3 s or more; 47 go to H's flat.
- **Decided:** 2.7–3.4 s, on read 0 or 1 of 4.
- **Priced:** P 0.49–0.68, intRisk about 0.
- **Planned flight:** 1.3–1.8 s.
- **Where it goes:** at the release the flat runner is 5–6 yd past the line and 20 yd wide. The ball is aimed 12–15 yd
  downfield, 8–10 yd upfield of him and 2–4 yd from the sideline: leading him up the sideline on his route's extension
  (the flat family's continuation past its points). He is caught there, 12–16 yd deep, with the nearest defender 4–7 yd
  away. Several go 70 yd.
- **Not QB_STICK:** no kept pull-downs.
- **Not a forecast defect:** the forecast and the receiver agree. He does run up there.

**Per flag** (the same plays):

| arm | late + long throws (flat) | completions | 20+ YAC | yards per completion |
|---|---|---|---|---|
| engine-83 | 49 (47) | 120 | 21 | 22.7 |
| the five QB flags off | 45 (44) | 91 | 14 | 22.0 |
| QB_DRIVE off | 39 | 113 | 16 | 20.2 |
| QB_WINDOW_ARRIVE off | 41 | 116 | 18 | 20.9 |
| QB_KEY_PLANT off | 51 | 106 | 29 | 27.3 |
| QB_RHYTHM_THROW off | 42 | 102 | 16 | 20.9 |

- **The throw predates engine-83.** No single flag creates or removes it.
- **Engine-83 completes more of these balls** (91 → 120), and so produces more of the runs.
- **The throw has no taught basis.** Slant-flat is a quick-game read: the flat is thrown on the plant to its landmark,
  or not. A flat thrown at 3+ s cross-field, led up the sideline onto the runner's extension, is a ball every defender
  has time to break on (ours do not: Defense's half).

**Proposed QB repair (not built).** The forecast's lead stops at the route's last installed point. A receiver past his
declared points (on the path's ext) is thrown to where he is, not led up his extension. This is the same family as
FORECAST_FINISH, and as taught: the flat is thrown to the numbers.

Separately, a quick concept's read that is not thrown by its window ends in the checkdown or the throwaway, not a late
cross-field flat. A ruling for Rules / Integration if wanted.
