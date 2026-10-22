# Where pressure comes from, and the inside-run hole

Measured 2026-10-22 for the run-offense session, which asked two questions:

1. Its profile's dropbacks are pressured 45% of the time against the NFL's
   30.5%. Is the excess from rushers who win after contact, or from rushers
   nobody blocks?
2. Its back crosses the line 2.1–2.4 yd from the nearest DL, against 1.6 in
   the NFL. Do NFL backs run through tighter creases, or do the DL simply
   sit closer?

Engine source unchanged.

Operators run one code path on NFL tracking and sim exports, using the
common play format with positions quantized by `metrics.Play`. Every
definition is from positions; neither uses block labels or contact events.
- `scripts/diag/pass-pressure.py`: pressure as in `metrics.py` (a defender
  within 2 yd of the QB from 0.5 s to the throw).
  - **Who:** classified by alignment at the snap: interior or edge on the
    line, or off the ball.
  - **Engaged:** within 1.0 yd of an offensive non-QB player for 0.2 s or
    longer.
  - **Escape:** read just after his release, relative to his last blocker:
    "through", "inside", "outside", or "still engaged" when he reaches the QB
    while still on the blocker.
- `scripts/diag/run-hole.py`: the lateral opening between the nearest
  defenders on each side of the back as he crosses the line (bodies within
  1.5 yd of his depth). It also measures the same opening between OL/TE, and
  how the opening at the hole forms over the last second.

Samples:
- **NFL:** BDB 2025, 2022 weeks 1–9: 7,007 dropbacks without play action;
  3,261 inside runs.
- **Run-offense profile:** `claude/run-game-v3` `547af69d`, candidate
  profile with `PASS_CORNER`, `OL_ALIGN` and `SNAP_REACT` on. Seeds 301–308,
  937 plays (444 dropbacks without PA, 277 inside runs). Receipt
  `run-1792650850881-360`, inputs unchanged, exit 0.
- **`develop` `d91c9014`:** candidate flags, the same seeds, for context.

## 1. Pressure: the excess is all on the edge

Dropbacks without play action, pressures per 100 dropbacks (median time
after line start):

| Pressurer | NFL | Run-offense profile | develop |
|---|---:|---:|---:|
| Interior, engaged first | 8.7 (2.39 s) | 8.6 (2.10 s) | 5.6 |
| Interior, never engaged | 0.6 | 0.0 | 0.0 |
| **Edge, engaged first** | **16.9** (2.39 s) | **27.0** (2.06 s) | 22.3 |
| **Edge, never engaged** | **1.1** | **5.0** | 1.9 |
| Off the ball (blitz), engaged | 2.8 | 0.7 | 1.4 |
| Off the ball, never engaged | 1.1 | 1.1 | 0.3 |
| **All** | **31.3** | **42.3** | 31.6 |

How engaged pressurers got there:

| | NFL interior | Profile interior | NFL edge | Profile edge |
|---|---:|---:|---:|---:|
| Still on the blocker at the pressure | 67% | 58% | **73%** | **8%** |
| Released through (ahead of the blocker, toward the QB) | 14% | 8% | 11% | **76%** |
| Released inside / outside | 9% / 10% | 5% / 29% | 8% / 8% | 10% / 7% |
| Contact to release, median | 1.40 s | 1.00 s | 1.10 s | **0.40 s** |

Every engaged line rep (all dropbacks, not only pressures), share that ends
with the rusher free before the throw:

| | NFL | Profile | develop |
|---|---:|---:|---:|
| Interior | 9.7% (after 1.40 s engaged) | 4.6% (1.00 s) | 2.8% |
| Edge | 15.4% (0.80 s) | **36.2%** (0.50 s) | 27.2% |

**Reading.**
- **Interior pressure already matches the NFL** (8.6 vs. 8.7 per 100).
  Fewer sim interior reps get free, so the interior is not the problem.
- **The edge has two separate excesses:**
  - **+10 per 100 from edge rushers who beat the tackle after contact.**
    NFL edge pressures arrive with the tackle still on the rusher (73%),
    riding him past the QB. Sim edge rushers lose contact after 0.4 s and run
    free through the tackle's spot (76%). That is contact or technique: the
    tackle cannot keep a hold, or the rusher sheds too easily. It is not
    timing, since `PASS_CORNER` already moved contact later.
  - **+4 per 100 from edge rushers nobody touches.** That is protection
    assignment: a free edge no back or tight end picks up.
- **Blitz pressure is lower than the NFL** (1.8 vs. 3.9 per 100). This is
  context for the defensive caller, not part of the excess.
- **On `develop`** the total matches the NFL (31.6%), but only because two
  errors offset: weak interior pressure and too much edge pressure.
  Matching the total is not evidence the trench is right.

## 2. The inside-run hole: NFL creases are tighter and close on the back

Opening at the crossing, in yards. Medians; NFL counts are runs, all
formations:

| Concept | NFL defender opening | NFL nearer defender, lateral | NFL blocker frame | Profile defender opening | Profile nearer defender | Profile blocker frame |
|---|---:|---:|---:|---:|---:|---:|
| Inside zone (1,327) | 2.50 | 0.70 | 2.40 | 3.90 | 1.10 | 3.90 |
| Duo (936) | 2.30 | 0.50 | 2.50 | 4.20 | 1.20 | 4.50 |
| Power (530) | 2.50 | 0.70 | 2.30 | 3.00 | 0.20 | 3.60 |
| Counter (364) | 2.40 | 0.70 | 2.50 | 4.50 | 1.20 | 3.60 |
| Trap (104) | 2.90 | 0.70 | 2.90 | 4.60 | 1.50 | 4.20 |

The defender opening at the hole's y over the last second (−1.0 / −0.6 /
−0.3 / 0 s before crossing):

| | NFL | Profile |
|---|---|---|
| Inside zone | 2.8 / 2.7 / 2.6 / **2.3** | 3.5 / 4.3 / 4.3 / **3.9** |
| Duo | 2.8 / 2.7 / 2.5 / **2.1** | 3.8 / 4.0 / 3.9 / **4.1** |
| Counter | 3.0 / 2.7 / 2.7 / **2.3** | 4.3 / 4.0 / 4.4 / **4.3** |
| Trap | 3.6 / 3.9 / 3.3 / **2.7** | 4.5 / 4.8 / 4.8 / **5.0** |

NFL nearest DL at the crossing is 1.46–1.86 yd (reach-contact.py's 1.6);
the profile's is 1.75–2.75.

**Reading.**
- **NFL backs run through creases 1–2 yd narrower,** with the nearer
  defender only 0.5–0.7 yd beside them. So the back runs past defenders'
  shoulders, not through an empty gap.
- **The NFL blocker frame is just as tight (2.3–2.9 yd).** The sim's is
  3.6–4.5 yd, so sim backs go through wider spaces between their own
  blockers too.
- **NFL creases shrink 0.5–0.9 yd in the last second** as defenders squeeze
  the hole. The profile's stay flat or widen. Its defenders do not converge on
  the back's crossing point as he arrives.
- **So both causes are present.** The sim's openings are wider, and
  defenders do not close them. Changing the runner's crease choice alone
  would not reproduce the NFL picture.
  - The defender squeeze belongs to the run-defense owner (fits, flow,
    pursuit).
  - The blocker frame (splits and where blocks finish) belongs to run
    blocking.
- **Power is the exception.** Its median opening (3.0) is close, and the
  nearer defender sits only 0.2 yd beside the back. But one side is empty
  within 8 yd on 48% of runs (NFL 24%): the back runs off a single defender.
  Under center, the NFL opening is about the same (2.0–2.5).

## 3. Edge reps: how the sim rusher gets free

Follow-up question: does the rusher win because the tackle stops gaining
depth, because the tackle cannot match his lateral speed, or because he is
past the tackle's hip early?

Method: `scripts/diag/edge-rep.py`, same samples, positions only.
- **Reps:** each edge rusher whose first engagement is with an OL, followed
  from that first contact to the throw or pressure.
- **hip:** blocker x − rusher x; + means the rusher is deeper than the
  tackle, toward the QB.
- **lateral:** + means the rusher is outside the tackle.
- Velocities are ±0.2 s central differences on both sources.

Outcome of each rep:

| | Still engaged | Free | Other |
|---|---:|---:|---:|
| NFL (9,295 reps) | 79% | 5% | 16% |
| Run-offense profile (537) | 45% | **42%** | 13% |

Medians at first contact and 0.4 s later:

| | First contact (s after line start) | Hip at contact → 0.4 s | Lateral at contact → 0.4 s | Tackle retreat / outward speed, yd/s | Rusher speed, yd/s |
|---|---:|---|---|---|---:|
| NFL, engaged | 1.20 | −0.5 → −0.2 | +0.8 → +0.5 | 2.75 / −0.50 | 4.1 |
| NFL, free | 1.15 | −0.5 → −0.1 | +0.7 → +0.1 | 2.25 / −0.25 | 4.0 |
| Profile, engaged | 0.45 | −0.5 → −0.5 | +0.5 → +0.4 | 0.25 / **+0.75** | 2.5 |
| Profile, free | 0.89 | **+0.4 → +0.9** | +0.7 → **−0.5** | 3.00 / **+1.25** | **4.7** |

Where free rushers leave:
- **NFL:** inside 38%, outside 33%, through 29%. Engaged for 0.9 s; at
  release the hip is +0.4.
- **Profile:** through 78%. Engaged for 0.4 s; at release the hip is +0.8.

**Reading.**
- **The sim rusher who gets free is already past the tackle's hip at first
  contact** (+0.4 yd, against −0.5 for every NFL rep). The tackle meets him
  late, after 0.89 s, while the rusher is running 4.7 yd/s.
- **The tackle is still kicking outward** (+1.25 yd/s) as the rusher turns
  back inside behind him (rusher lateral speed −1.5 → −3.0 yd/s, lateral
  +0.7 → −0.5 yd). The rusher crosses under the tackle's hip toward the QB.
- **So it is neither a stalled kick nor a lateral speed limit.** The
  tackle's retreat (3.0–3.5 yd/s) is faster than the NFL's. The rep is lost
  at the hip before contact, and the tackle's outward momentum cannot turn
  back with the rusher.
- **NFL rides close to the hip.** Engaged NFL reps bring the hip from
  −0.5 to −0.1/−0.2 and keep it there: the tackle stays level with the
  rusher.
- **The profile's engaged reps are a different population.** First contact
  is early (0.45 s), the tackle barely retreats and moves outward, and the
  rusher is slow (2.5 yd/s). That is consistent with leftover early (jump)
  meetings.

## 4. Unblocked edge pressures

Edge pressures where the rusher was never engaged: NFL 64, profile 22.

| | NFL | Profile |
|---|---|---|
| Same-side tackle's first block before the pressure | nobody 39%; an edge inside the rusher 25%; interior 25%; an edge outside 6% | **nobody 86%**; interior 9%; edge inside 5% |
| Nearest RB/TE at 0.5 s | 4.0 yd away; blocked nobody 77% | 5.7 yd away; blocked nobody 87% |
| Nearest offensive player at 0.5 s | free OL 64%, 2.2 yd inside him | free OL 73%, 2.5 yd inside him |

**Reading.**
- **NFL unblocked edges are mostly by design** (a slide or a man
  assignment): half the time the tackle blocked somebody inside the rusher.
- **The sim's tackle usually blocks nobody at all.** He sits about 2.5 yd
  inside the rusher, unengaged, and the rusher runs past him untouched.
  That is a protector who neither takes the inside man nor the edge, not a
  slide or a back's assignment. Check his requested target (for example,
  an assignment to a rusher who dropped) before calling it execution.
- The samples are small: 22 sim cases.

## 5. The long-run tail: deep support overruns the play

Question: are long sim runs a pursuit-angle problem, a deep-support problem
or a tackling problem?

Method: `scripts/diag/long-run.py`, position-only.
- **Sim:** 16 games at `claude/run-game-v3` `e9eb6ac1`, candidate profile.
  Seeds 301–316, 879 designed runs. Receipts `run-1792654087511-328` and
  `-513-326`, inputs unchanged, exit 0.
- **NFL:** 6,223 designed runs.
- **Deep defenders:** 8+ yd deep and within 12 yd of the ball at the snap.
- **Intercept heading:** the heading that meets the carrier, given his
  velocity and the defender's top speed on the play.

| Runs reaching | 10 yd | 20 yd | 40 yd |
|---|---:|---:|---:|
| NFL | 12.1% | 2.7% | 0.7% |
| Sim | 14.8% | **6.6%** | **4.4%** |

Runs reach 10 yd about as often as in the NFL. The excess is beyond 10:
- **Of runs that reach 20 yd, 67% reach 40 in the sim**, against 26% in the
  NFL.

Runs that reach 20 yd:

| | NFL (171) | Sim (58) |
|---|---|---|
| Deep defenders when he reaches 10 yd: distance; ahead (+) or behind (−) him; lateral | 5.7; **+3.1**; 3.3 | 5.1; **−3.6**; 2.2 |
| Deep defenders at the handoff: depth, width | 13.7, 4.8 | 12.2, 7.1 |
| Their forward speed 0.5 / 1.0 s after the handoff, yd/s | −0.25 / +1.00 | **+2.00 / +3.25** |
| Nearest 3 defenders at 10 yd | 2.4 / 4.0 / 5.3 yd, many beside him | 2.4 / 4.9 / 6.1 yd, mostly behind him |
| "Chasing" (heading nearer where he is than the intercept), at 5 / 10 yd | 6% / 3% | **32% / 17%** |
| Defenders within 2 / 1 yd between 10 and 20 yd, mean | 1.54 / 0.74 | 0.67 / 0.16 |
| Nobody within 2 yd between 10 and 20 yd | 15% | **47%** |
| First defender within 1 yd after 10 yd | deep DB 46%, DB 24%, none 18% | **none 66%**, DB 28%, deep DB 3% |

On every run (not only long ones), deep defenders come forward at
+1.5 / +2.75 yd/s after the handoff (NFL +0.5 / +1.75), from 7.1 yd wide
(NFL 5.1).

**Reading.**
- **It is not a tackling problem.** Sim long runs have fewer chances, not
  more misses: 0.16 defenders within 1 yd between 10 and 20 yd, against
  0.74 in the NFL.
- **It is mainly deep support.** NFL safeties on long runs hold, or even
  drift back at first, and are still 3 yd in front of the back when he
  reaches 10 yd. They are the first to touch him 46% of the time.
- **Sim safeties come downhill fast from wider alignments.** They are
  already 3.6 yd *behind* the back when he gets to 10 yd. Anyone through
  the second level has no one left in front.
- **Pursuit angles add to it.** Sim defenders run at where the carrier is
  (chasing) five to ten times as often as NFL defenders.
- **A fix should come from the deep defender's information.** Model what
  he must see before he commits downhill (run read, cost of being wrong,
  his fit as the last defender), not a speed cap. The pursuit angle is the
  pursuit controller's part.
- **Limits:** 58 sim runs reached 20. The deep-defender set is an alignment
  proxy and includes off corners inside 12 yd on both sources.

## Limits

- Sim samples are small: 44–81 runs per concept, 188 pressures. Medians move
  by a few tenths between seeds.
- "Engaged" (1.0 yd for 0.2 s) and "free" (no blocker within 1.5 yd and past
  him) are proximity proxies, applied identically on both sources.
- "Still engaged at the pressure" partly reflects QB depth: a deeper QB
  gives a rider more room. NFL and sim QB depth were not compared here.
- No change is proposed or tested. Use
  [behavior review](../BEHAVIOR_REVIEW.md) and a focused reproducer (a 1v1
  edge rep, for example) before attributing the edge shed to a mechanism.
