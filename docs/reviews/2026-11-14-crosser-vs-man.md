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

## Re-read on engine-63, like with like (2026-11-14)

**Rules + Coaching's correction:** our crossers follow their drawings. The depth gap is the call mix: 51% deep crosses
against the NFL's about 31%. So item 4 is dropped, and crossers are split by their peak depth while the ball is held
(`--class`): shallow under 6 yd, deep 8 yd or more.

**Populations.**
- **Sim:** branch 0496327e (develop 3c2f968d, engine-63, merged), same 16 games.
- **NFL:** as above.

| p50 | NFL shallow (610) | Ours shallow (56) | NFL deep (382) | Ours deep (18) |
|---|---|---|---|---|
| Receiver speed, 1.0 / 2.0 / 3.0 s (yd/s) | 3.61 / 6.32 / 7.00 | 3.54 / 5.41 / 6.52 | 4.47 / 7.11 / 7.91 | 4.03 / 5.59 / 6.80 |
| His speed across the field, 2.0 s (yd/s) | 6.0 | 4.5 | 4.0 | 1.5 |
| His depth past the line, 2.0 s (yd) | 2.2 | 3.8 | 6.2 | 5.6 |
| Shadow speed, 2.0 s (yd/s) | 4.92 | 3.81 | 5.70 | 3.54 |
| Receiver minus shadow, 2.0 s (yd/s) | 1.09 | 1.57 | 1.16 | 1.78 |
| Shadow ahead along his travel, snap / 1.0 s (yd) | 2.60 / 1.08 | 3.92 / 3.00 | 2.60 / 1.22 | 4.40 / 2.93 |
| Shadow deeper than him, snap / 1.0 s (yd) | 2.9 / 1.9 | 4.3 / 3.3 | 2.9 / 1.7 | 4.7 / 2.9 |
| Traffic within 1 yd of the shadow | 40% | 45% | 18% | 22% |
| Separation change across traffic / same window, clean (yd) | +0.79 / −0.03 | −0.62 / −1.45 | +1.76 / −0.36 | (4 routes) / −2.20 |

**Reading, like with like.**
- **Position (item 2) departs first, at the snap, for both classes.** Our man defender is 1.4–1.8 yd deeper and
  1.3–1.8 yd further ahead along the crosser's path, and still well ahead at 1.0 s. The crosser runs into a defender
  already in his lane.
- **Speed (item 3):**
  - Our shallow crosser is at NFL speed at 1.0 s (3.54 vs 3.61). He falls behind after his break: 5.41 vs 6.32 at
    2.0 s, crossing at 4.5 vs 6.0.
  - Our deep cross is slower from 1.0 s, but n = 18.
  - The receiver still outruns his shadow by at least the NFL's margin. Our shadow is slow too, but positioned.
  - Our shallow also runs 1.6 yd deeper at 2.0 s (3.8 vs 2.2 for NFL crossers that stay under 6). That is within the
    drawing (2.5 → 5 yd) and inside the coached 3–6 yd range, so it is not a fault. It does put him at the defender's
    depth sooner.
- **Traffic (item 1) is not the departure.** Its effect relative to clean routes matches: shallow +0.83 vs NFL +0.82.
  The closing is on clean routes: shallow −1.45 vs −0.03 yd over 0.8 s at 1.5 s.

## Deep cross, man side: why the trail man is 0.8 yd off (engine-64, staged; Integration follow-up)

Population: our league deep crosses vs man are few (n 18), so staged Cover 1 reps: `press-lab.mts --plays`
gun_doubles y_cross / hitch_cross / post_cross, gun_trips y_cross, 25 seeds × flip (200 dropbacks, 102 deep
crosses), under `npm run ref`. The exporter now records each defender's assigned man: the nearest-shadow rule
picks the assigned man on 244/250 crossers, so the operator measures the right pair.

| deep cross vs man (p50) | NFL (382) | ours | ours, CUSHION_NEED=0 (diagnostic arm) |
|---|---|---|---|
| separation at 1.0 / 2.0 s | 1.46 at 2.0 s | 3.59 / 0.80 | 3.54 / 1.55 |
| receiver speed at 1 / 2 s | 4.47 / 7.11 | 4.03 / 4.95 | 4.03 / 5.59 |
| depth at 2 s | 6.2 | 5.0 | 5.7 |

**Alignment ruled out.** Splitting by where the man started (ahead along the crosser's travel, deeper): NFL men who
start as far ahead and as deep as ours (both 3.5 yd or more, n 138) have *more* separation at 2.0 s, 2.00 yd. Ours
from the same start have 0.72 (n 79); from a closer start, NFL 1.22 vs ours 1.00. The gap opens after the snap.

**First divergence: the man comes downhill onto the crosser's line.** NFL vs ours in that matched start group:

- His speed at 1.0 s is 2.06 yd/s vs ours 0.71.
- His speed along the crosser's travel at 1.5 s is 2.61 vs ours 1.41.
- He is 1.0 yd ahead of the crosser at 1.5 s, vs ours 2.0.

Per-tick trace (`deep-cross-probe.mts`, y_cross, 29 reps):

- The man's depth over the crosser goes from 3.1 to 0.6 yd between 0.75 and 2.0 s, while he is still ahead on the
  crosser's line.
- A body is in the crosser's path on 97–100% of ticks from 1.5 s, and that body is his man.
- Route-craft bends the crosser underneath (the correct side; never over him), but he decelerates. He requests
  7.4–7.6 yd/s and achieves 4.7–5.4 from 1.5 s.
- The NFL crosser keeps accelerating (6.4 → 7.2 yd/s) with his man 1.0 yd ahead at 1.5 s.

**Mechanism.** CUSHION_NEED (on since engine-27, `defense.ts` 927) cuts the off-man cushion to the receiver's
observed *vertical* threat once the release is seen: 1.8 yd plus closing over his flip time plus the upfield burst.
A deep crosser threatens along his travel, toward the man sitting inside him. Early in the route the crosser's
upfield speed is low (ours 0.7 yd deep and 3.8 yd/s at 1.0 s), so the computed need is small. The man then closes
the "excess" cushion down onto the crosser's line, ahead of him. The crosser runs into him, bends under him, slows,
and the man is level at 0.6–0.8 yd. With the trim off (diagnostic only), the matched-start group goes to 1.68 yd
(NFL 2.00), all deep crosses to 1.55 (NFL 1.46), and the man's speed at 1.0 s to 2.06 (NFL 2.06).

**Opening his hips at the release does not help** (probe arm HIPS_EARLY, not an engine flag): 0.75 yd at 2.0 s.
The open-hip target is the receiver's seen position plus leverage, so he still heads for the crosser's line.

**Not a recommendation to turn CUSHION_NEED off.** Its own witness, a back or tight end releasing short under a
linebacker who should squeeze him, is real football. The proposed repair is Coverage's, in `defense.ts`:

- The threat the cushion protects against is the receiver's observed velocity along his travel, toward where the
  defender is, not only his upfield component.
- When the receiver's line runs at or past the defender's leverage spot, the defender keeps the cushion.

Controls for that change:

- CUSHION_NEED's original witness: Cover 1 linebackers over a short-releasing back keep moving at him (5.1 yd/s
  NFL).
- The shallow-cross class: unchanged by construction or measured.

**Receiver-side residue (my lane, not built).** Even with the trim off, our deep crosser is 5.6 yd/s at 2.0 s vs
7.1. Contributors seen here:

- The get-off: 4.03 vs 4.47 at 1.0 s, LINE_START.
- The bend's speed cost: request vs achieved with route-craft active.

Rules' CROSS_OVER (deep-cross release, attempt 1) is not on develop; re-read once it is.

Commands: `node scripts/ref.mjs -- npx tsx scripts/diag/release/press-lab.mts --cov cover1 --seeds 25 --plays
gun_doubles_11:y_cross,gun_doubles_11:hitch_cross,gun_doubles_11:post_cross,gun_trips_11:y_cross --out
out/cross/c1cross.jsonl.gz` (add `--flag CUSHION_NEED=0` for the arm); `python3 -I
scripts/diag/crosser/crosser-man.py --data <bdb2025> --class deep nfl=... lab=...`; `node scripts/ref.mjs -- npx tsx
scripts/diag/crosser/deep-cross-probe.mts y_cross 15`.
