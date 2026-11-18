# QB_INTENT held: what was measured and why nothing is carded (2026-11-18)

QB_INTENT is a numeric bitmask (off; `defense/C32-qb-body` ffb976b5, this branch `defense/C39-eyes-window` adds bit 8). An underneath zone dropper with his eyes on the quarterback leans toward the receiver the passer's look shows, and breaks when the arm loads.

| Bit | What it does |
|---|---|
| 1 | Lean on the seen head look. |
| 2 | Shoulders confirm only. |
| 4 | Shoulders override the head (aware dropper) or stand in for it. |
| 8 | The lean reads the receiver in his own window nearest the seen head line. |

Integration's decision (2026-11-18): nothing from QB_INTENT is carded now. The reason is the base check below. Re-run =1, =3 and =7, paired, once the QB lane's fix for the passer's early base turn is in.

## The lean (=1)

Staged paired set: 1,536 plays (cover 2/3/4/6, all non-screen concepts, doubles and trips, 3 seeds, flipped).

- In front: 61%.
- First defender within 1 yd: 0.75 s.
- Nearest underneath man at the catch: 11.27 yd.
- Whole game: no signal. The lean arm was mixed on four seeds; confirm-only (=3) showed nothing on three.

## The override (=7)

The six-seed card gave a yards-per-attempt mean of −0.37. On the first three seeds (override version), YAC per reception was −0.08 / −0.30 / −1.36 and yards per attempt −0.52 / −0.39 / −0.78.

On the staged set:

| Arm | yd/play | Comp | YAC |
|---|---|---|---|
| =1 | 7.92 | 73.8% | 5.20 |
| =7 | 7.72 | 74.5% | 4.79 |

The nearest man at the catch is 0.4 yd closer under =7.

## Probes

1. **Lean-less control.** Arms: =1 with a half step, =1 with a 0.3 s dwell, and =1 with no lean before the arm. None reproduces =7 (yd/play 7.92 / 7.80 / 7.84 against 7.72). Leaning less is not the mechanism.
2. **Override geometry.**
   - The override man is in the same place relative to the catcher's run under =1 and =7: inside-out 52 / 51%, median 7.7 / 7.6 yd.
   - About a quarter of the gain is the quarterback throwing elsewhere: 145 plays, −0.59 yd each. Our QB's choice responds to where an underneath man stands, which is right.
3. **Bit 8: the window on the look line, from the seen head.** It does not match =7.

   | Arm | yd/play | YAC |
   |---|---|---|
   | =9 | 7.80 | 5.18 |
   | =11 | 7.89 | 5.29 |

   Its gain is the QB throwing elsewhere (91 plays, −1.51 yd each); YAC does not move.
4. **Trunk and head at all override ticks** (=7, 1 seed, 9,790 ticks). During the set the QB's trunk stays turned to the side he set to while his head scans back inside:
   - Trunk 30°+ off square on 72% of ticks.
   - Trunk 10°+ wider than the head on 47% of ticks; head wider on 13%.

   At each defender's last override before the throw, trunk and head agree (median 1°). An earlier report stated that agreement for all ticks, which was wrong.

## Base check (the reason it is held)

One operator for both sources:

- Base: the QB's trunk or shoulders averaged over 0.3–0.6 s before the release, counted when 10°+ off square.
- Throw side: the lateral side of the target's spot at arrival, counted when 2+ yd.
- NFL: BDB 2025 weeks 1–2, `o` as the shoulders.
- Sim: 1,181 staged throws, 5 coverages.

| | Throw to the base's side | Base-to-throw angle, median (p25–p75) | Catcher runs to the base's side |
|---|---|---|---|
| NFL (n 1,713) | 61% | 53° (34–70) | 59% |
| Ours (n 992) | 76% | 20° (8–41) | 65% |

Our quarterback telegraphs with his base: he turns his trunk onto the throw earlier than NFL passers.

On our set and load ticks where trunk and head disagree by 10°+ (41,077 ticks), the throw is nearer the head 66% of the time. Where they point to opposite sides, the throw goes to the head's side 6,323 times and to the trunk's side 4,827 times.

A rule that reads the base would therefore be paid by an unrealistic quarterback. The gain would shrink or reverse once the quarterback is fixed. The base finding went to the QB lane as a quarterback realism item.

Tools (scratchpad, not committed): `override-why.mts`, `ov-geo.mts`/`.py`, `eyes-win.mts`/`.py`, `win-diag.mts`, `base-side.mts`/`.py`, `base-side-nfl.py`.
