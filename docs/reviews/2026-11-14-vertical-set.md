# VERTICAL_SET: the tackle's vertical set (Flex, 2026-11-14, engine-64)

## The change (off; VERTICAL_SET=1)

The tackle's kick against an edge rusher gives ground vertically and keeps an inside-out relationship, as it is taught:
- he kicks no wider than TACKLE_SET's set line from his alignment (0.4 of the rusher's snap width outside him, 0.3-1.0
  yd): a wider rusher gets a wider, deeper set, a tight one a flatter set;
- his lateral lead is only the rusher's inward motion (the inside counter he mirrors), never the rusher's outward run.

TACKLE_SET's depth floor is not part of it. Off, the kick copied the rusher's lateral velocity, so at first contact the
tackle was still sliding out across the rusher's path.

## Lane read

Develop 3d445688 + VERTICAL_SET only, seeds 11 / 23 x 8, against default. Off is bit-identical to develop (seed 999,
f45b8a7e377c73b2). The dither budget passes with it on. Operators are the same code on NFL BDB 2025 tracking and sim
exports (scripts/diag/pass-operators/edge-rush.py, pressure-source.py, early-sack.py, fall-proxy.py).

| | default | VERTICAL_SET | NFL |
|---|---|---|---|
| the tackle at first contact, rusher aligned wide: retreat / outward p50 | 2.50 / +0.75..+1.00 yd/s | 2.75 / 0.00 | 2.50 / 0.00 |
| the same, very wide | 2.75 / +0.50 | 3.00 / -0.25 | 3.00 / -0.25 |
| contact time against a very wide rusher | 1.3 s | 1.5 s | 1.5 s |
| first contact lands wide (> 0.9 yd outside the tackle) | 26 / 27% | 54 / 50% | 49% |
| wide contact: the rusher's speed before -> 0.2 s after | 4.25 -> 3.75 | 4.83 -> 4.12 | 4.74 -> 4.43 |
| wide contact: into-and-past, 0.2 s after | +0.99 / +1.12 | +1.77 / +1.75 | +2.41 |
| inside at the edge win | 72 / 60% | 54 / 41% | 47% |
| edge win (within 2 yd of the QB) | 10 / 8% | 9 / 8% | 13% |
| pressured | 32.0 / 26.2% | 29.2 / 29.6% | |
| edge pressure, inside / past outside, of dropbacks | 11.4 / 7.4%, 1.0 / 0.7% | 7.2 / 4.9%, 1.2 / 0.4% | |
| interior pressure, of dropbacks | 11.4 / 8.5% | 10.5 / 12.4% | |
| sacks (timing definition, pooled) | 5.5% | 5.4% | 6.7% |
| OL proxy falls (still under 0.5 yd/s for 1.0 s after moving) | 4.2 / 5.9 /100 | 5.8 / 6.8 /100 | |

The fresh run set (1295 plays, paired): +0.02 (SE 0.02), every concept within 0.06; missed + broken 0.271 -> 0.272.

## Read

- **The set and the landing are now the NFL's** in both alignment families, from one coached rule. At contact the
  tackle is retreating straight back at the NFL's speed, contact against a very wide rusher comes at 1.5 s, and half the
  first contacts land wide.
- **The inside counter does not open.** The inside share at the win falls to 41-54% (NFL 47%), so the old edge
  pressure was the tackle's wrong set.
- **The corner still does not finish:**
  - wide contacts get into-and-past 1.75-1.77 against 2.41;
  - edge win is unchanged at 8-9% against 13%;
  - the rusher at the hip is held at the tackle's arm (the edge review on claude/quirky-franklin-9lbwbp has the
    diagnosis).
- **Sacks and run game:** sacks are unchanged on engine-64; the run game is untouched.
- **Falls:** OL proxy falls rise 1-1.6 per 100, a cost to watch.

**What to expect on a card:**
- the landing and set rows move to the NFL's;
- pressure is about flat, its mix shifted from the edge's inside to the interior;
- sacks flat, the run game flat;
- OL falls up slightly.
