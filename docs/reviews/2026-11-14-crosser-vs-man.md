# Crossers against man: why the trailing defender gains (2026-11-14)

Run Game lane, report only, for Integration. The question comes from the QB lane's `crosser-sep.py`
(claude/exciting-cori-hc8l4u 0e87ceb4): against man, our CROSS separation shrinks 1.7 → 1.2 yd while the NFL's holds
at 1.8–1.9.

**Operator.** `scripts/diag/crosser/crosser-man.py`, with the same route labels and man/zone split as `crosser-sep.py`.
- **Shadow:** the DB or LB nearest the crosser on average over 0.5–2.0 s. The NFL data has no assignments.
- An earlier pass let a pass rusher be the shadow. That turned every "traffic" case into an OL/DL pair at the line,
  so it was corrected before any reading.

**Populations.**
- **NFL:** BDB 2025 weeks 1–9 (`nfl_bdb2025.py` with player ids, 1,148 CROSS routes against man).
- **Sim:** 16 league-sampled games, `sim-export --seed 101`, branch 7f8e8dba (develop engine-62 merged), 106 CROSS
  routes against man.

## First departure, in time order

### 2. Position at the snap (first in time)

The shadow sits deeper and further ahead along the crosser's path.

| Shadow relative to the crosser, p50 (yd) | NFL | Ours |
|---|---|---|
| Ahead along his travel, at the snap / 1.0 s / 2.0 s | 2.60 / 1.14 / −0.80 (trailing) | 3.85 / 2.82 / −0.12 |
| Deeper than him, at the snap / 1.0 s / 2.0 s | 2.9 / 1.8 / 0.4 | 4.4 / 3.0 / 0.6 |

### 4. The route: our crosser is slow; our other routes are not

| Speed (yd/s, p50) | 0.75 s | 1.0 s | 1.5 s | 2.0 s |
|---|---|---|---|---|
| NFL CROSS | 3.25 | 4.16 | 5.77 | 6.67 |
| Ours: cross / shallow / shallow_high / under | 2.70 | 3.58 | 4.96 | 5.27 |
| NFL GO / IN | 3.26 / 3.29 | 4.26 / 4.26 | 6.09 / 5.80 | 7.04 / 6.25 |
| Ours GO / IN (dig, short in) | 3.54 / 3.50 | 4.56 / 4.50 | 6.31 / 6.01 | 7.50 / 7.00 |

- **Depth:** ours climbs to the defender's depth sooner, gaining 3.4 yd upfield by 1.5 s against the NFL's 2.9.
- **No contact, no facing cost:** probe `scripts/diag/crosser/cross-probe.mts` (mesh vs Cover 1, 8 snaps, 16
  crossers):
  - he asks for 7.4–8.0 yd/s from the snap (vmax 9.47 × effort 0.85) and achieves 3.15 at 1.0 s and 5.8 at 2.0 s;
  - no contact or hand joint with a defender;
  - facing within 13° of travel.
- **Candidates in the route controller** (`src/sim/route-motion.ts`):
  - `getOffDrive`: the push share out of the stance until he declares his stem is 0.4 + 0.03 × break depth, so about
    0.48 for a shallow against 0.70 for a go;
  - the through-speed cap at the shallow's break (`steerRoute`: `tgt.s × vtop × …`, then
    `sqrt(lateral × cutSkill × 1.3 / (1 − cos))`).

  Neither has been isolated; that is the next diagnostic, not a build.

### 3. Speed

The relative speed is NFL-like; both men are slower.

| p50 (yd/s) | NFL 1.0 / 2.0 / 3.0 s | Ours |
|---|---|---|
| Shadow speed | 2.24 / 5.32 / 6.52 | 1.80 / 3.64 / 5.02 |
| Receiver minus shadow | 1.62 / 1.09 / 0.55 | 1.77 / 1.24 / 0.96 |

### 1. Traffic: not the departure

| | NFL | Ours |
|---|---|---|
| Routes where a third body comes within 1.0 yd of the shadow | 29% | 43% |
| Separation change across it (−0.3 to +0.5 s) | +1.03 | −0.24 |
| Same window on clean routes (at 1.5 s) | −0.23 | −1.47 |
| Traffic's effect relative to clean routes | +1.26 | +1.23 |

Traffic helps our crosser by the same margin as the NFL's, so contact or avoidance through bodies costs our defender
the same. The closing happens on clean routes.

## Plays watched (sim unless marked; ids are `sim-export` play ids)

Clean, closing:
- **S103-P62** (WR, DB shadow): the DB waits at x 3.4–4.2 moving 1.7–4.0 yd/s. The crosser climbs 0.2 → 3.7 yd at
  3.8–5.9 yd/s into him; separation 3.2 → 0.8.
- **S104-P125** (TE, DB): the DB sits at x 3.7–3.9 at 0.7–1.7 yd/s; the TE climbs to him; 2.7 → 0.5.
- **S101-P118**, **S104-P56** (two crossers), **S104-P27** and **S105-P21**: the same pattern, separation 4.2 → 2.2,
  3.6 → 1.2, 4.5 → 2.3 and 2.5 → 0.7.
- **S101-P70** (TE, LB): steady at 2.0 yd. **S103-P86**: opens 3.1 → 4.9.

Not real crossers, but labelled CROSS:
- **S103-P94:** an RB check release behind the line.
- **S105-P133:** a TE stopping to 0.3 yd/s by 2.0 s.
- **S103-P104:** a WR held behind the line at 0.7–1.8 yd/s.

NFL traffic, before the operator fix: **2022091113-1101**, **2022091108-216** and **2022091111-1192**. In each the
nearest "defender" was a DL engaged with an OL at the line, which is why the shadow now excludes DL.

## Reading

- **What departs, in time order:**
  1. At the snap, our man defender is aligned deeper (+1.5 yd) and further ahead along the crosser's eventual path
     (+1.25 yd).
  2. From 0.75 s our crosser is slower than the NFL's, by 0.6 yd/s at 1.0 s and 1.4 at 2.0 s, while our digs and gos
     are at or above NFL speed. He also climbs to the defender's depth sooner.
- **Why the defender gains:** the receiver runs into a defender already waiting in his path. The defender does not
  gain by outrunning him; the receiver–shadow speed difference is NFL-like.
- **Traffic is not the cause.** It helps ours by the same 1.2 yd.
- **For whom:**
  - the crosser's speed is the route controller (receiver lane);
  - the shadow's alignment depth is the man-coverage alignment (Coverage).

**Next diagnostic (not a build):** isolate `getOffDrive` and the break through-speed on the shallow, with the same
probe, against a control go route from the same alignment.
