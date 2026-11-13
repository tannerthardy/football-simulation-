# Loaded falls in games: what drops a lineman (diagnostic)

`scripts/diag/physics/fall-census.ts` counts every non-dive fall in full games
by group, play kind, cause and context (carrier, tackler, engaged in a block,
free), with the hardest body contact, lean and balance deviation in the 0.4 s
before. Default engine, 2 games each on rosters 101 and 202.

**Rates.** Non-dive falls per 100 player-plays: OL 1.7 (runs) / 4.4-5.2
(passes), DL 3.6 / 5.0, LB 5-7, ball carriers 75 on runs (how tackles end).
There is no NFL fall label in tracking, so these rates are context, not a
target.

**Two kinds of lineman fall.**

| Context | Share of OL/DL falls | Before the fall |
|---|---|---|
| Free in traffic or engaged in a run block | about 75% | a hard hit: closing ~4.5-5.5 yd/s, ~2.5 yd/s velocity change |
| Engaged in pass protection | about 20% | a modest bump (closing 0.9-1.7 yd/s, ~1 yd/s change) while leaning at about body weight (lean ~1,600-1,900) |

The pass-pro case is the loaded-recovery problem in football terms. Lineman
push capacity is 1.0-1.07 x body weight (traction caps it at 1.1), and the lean
follows the felt load (up to +25%), so two linemen in a bull-rush stalemate
lean on each other at about body weight. That puts the capture point about
0.95 yd ahead of the feet against a recovery limit of about 1.1 yd, so any change
of load (a spin, a release, a bump) drops him. The physics is coherent; rugby
scrummagers lean beyond body weight on each other and collapse when the other
side gives way.

**Who bumps them.** On roster 101 the blocker's own running back was the
partner in 5 of 23 engaged pass-pro falls, and in 11 of 22 with `PASS_SINK`.
A back releasing or setting in protection runs into his own leaning blocker.

**`PASS_SINK=1` (off).** An engaged pass blocker under a heavy load sinks his
hips (lower COM, less lean offset for the same push, at the gait's pad-level
speed cost). Engaged pass-pro OL falls: 1.9 to 1.7 and 1.3 to 0.9 per 100.
Lean force is unchanged (it follows the load), so the effect is small and
within noise. Kept off.

**What this points to.**

1. Pass-pro technique, not the balance law: every pass blocker asks for full
   lean (`push: 1`) into his rusher, where coaching keeps weight back and lets
   the hands do the work. A blocker who matches the rusher's force with his
   arms (now possible with `HAND_MOTOR` shove) and his base, not his chest
   over his toes, would carry less loaded risk.
2. Backs colliding with their own blockers: teammate spacing for the back's
   protection and release paths.
3. The physics session's loaded-recovery numerics (rear/angled tackle
   convergence) are a separate question from these game falls.
