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

## READ_WINDOW (off): a passed quick read is dead (Integration's go)

**How he got back to the flat** (single-play traces): his reads run out at 2.6–3.1 s, and QB_RELOOK resets him to
read 0, the flat. Or a late flip of the key read (2.0–2.8 s) reapplies the pair and resets him to its first route.
Either way he is on a read he passed, and throws it at 3.1–3.5 s.

**Built (READ_WINDOW=1).** On a quick concept, a read he has moved off is dead for the play.
- The progression still advances on its own clock (the dwell and the plan's beats).
- Neither the relook nor a key flip reopens a dead read.
- Out of live reads, the plan's checkdown gets one more look. Then the best live option, else the existing pocket break
  or throwaway.
- The window per step is the existing dwell / beat; no compiler data is needed.

**Late-cross probe** (176 slant_flat-from-trips plays):

| | off | on |
|---|---|---|
| late (3.1 s+) and long (1.3 s+ flight) throws | 49 | **0** |
| throws | 176 | 100 (the rest thrown away, scrambled or sacked) |
| completions | 120 | 62 |
| 20+ yd YAC | 21 | 1 |

**Games** (8: seeds 11 and 31):

| arm | throws | completion | ints | time to throw p25 / 50 / 75 / 90 |
|---|---|---|---|---|
| off | 640 | 0.694 | 9 | 2.35 / 2.70 / 3.20 / 3.70 |
| on | 607 | 0.694 | 14 | 2.30 / 2.70 / 3.10 / 3.60 |

Completion by band (off → on): 0–5 yd 0.743 → 0.735; 5–10 yd 0.703 → 0.705; 10–15 yd 0.527 → 0.556; 15+ yd 0.50 → 0.47.

Pass plays (`pumps.ts`, same seeds), off → on:
- sacks 4.6% → 5.8%;
- throwaways 5.1% → 6.2%;
- no throw 7.2% → 9.5%;
- touchdowns 41 → 31.

**Interceptions 9 → 14 are not explained.** Only quick concepts change, and the games diverge. To trace with the
picker probe before landing.

**The second part** (the lead stopping at the route's last installed point) is the same code path as FORECAST_FINISH.
It folds into that flag when FORECAST_FINISH is rebased for its landing.

Patch: `read-window-on-fe150600.patch` (develop fe150600, engine-83). Scan, guard, registry, provenance and read-plan
pass.

**The 9 → 14 interceptions traced** (`int-margin.ts`, same games):
- With READ_WINDOW on, 4 of the 14 picks are on quick concepts, the only plays the flag can change.
- One is the same play as off (quick_outs, cover6_rev, thrown at 1.95 s).
- The new ones are thrown early (quick_outs at 1.9 s; double_slants at 2.5 s), not on a reopened read.
- The other 10 are on concepts the flag does not touch: game divergence, not the mechanism.
