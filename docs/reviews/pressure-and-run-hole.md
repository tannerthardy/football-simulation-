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

## 6. Pursuit angles

Question: do sim pursuers aim at the carrier (pure pursuit) at all
distances, or only up close where it is right anyway? Do they run flat out
where NFL pursuers throttle?

Method: `scripts/diag/pursuit.py`, same 16-game export.
- **Samples:** every other frame from the line to 15 yd past it, for
  defenders who are unengaged, more than 1 yd from the carrier, moving over
  1.5 yd/s, and in front of or beside him. NFL 194,912 samples; sim 21,432.
- **Intercept heading:** uses the defender's top speed on the play and the
  carrier's current velocity.
- **Aims at the carrier:** his heading is nearer the line to the carrier
  than to the intercept heading.
- **Speed/max:** his speed over his top speed on the play.

Medians:

| Bin | NFL error vs intercept | Sim error vs intercept | NFL aims at carrier | Sim aims at carrier | NFL speed/max | Sim speed/max | NFL can't intercept | Sim can't intercept |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| All | 20° | 18° | 23% | 26% | 0.85 | 0.82 | 25% | 18% |
| 0–3 yd | 27° | 28° | 19% | **32%** | 0.78 | **0.70** | 22% | 28% |
| 3–6 yd | 21° | 22° | 21% | **33%** | 0.82 | 0.79 | 22% | 21% |
| 6–10 yd | 18° | 16° | 26% | 28% | 0.88 | 0.88 | 22% | 16% |
| 10+ yd | 19° | 15° | 24% | 18% | 0.87 | 0.83 | 29% | 14% |
| Carrier 6+ yd/s | 17° | 16° | 12% | **24%** | 0.88 | **0.77** | 57% | 30% |
| Just cut (>30° in 0.5 s) | 26° | 28° | 33% | **44%** | 0.82 | 0.85 | 9% | 4% |
| Runs reaching 20+, within 6 yd | 20° | 27° | 11% | **42%** | 0.71 | **0.55** | 30% | **8%** |
| Runs reaching 20+, beyond 6 yd | 17° | 13° | 10% | 23% | 0.73 | 0.67 | 42% | **10%** |

**Reading.**
- **On ordinary runs, sim pursuit already looks NFL-like.** Heading error,
  far-field aim and speed fraction are close. Far pursuers are slightly
  better than NFL.
- **Up close, sim pursuers aim at the carrier more often.** At 0–6 yd it
  is about a third of samples, against a fifth in the NFL, and they run at a
  lower fraction of top speed. The same happens after a cut (44% vs 33%) and
  against a fast carrier (24% vs 12%).
- **The long-run difference is in speed as much as angle.** On sim runs of
  20+ yd, close pursuers run at 55% of their top speed and aim at the back
  42% of the time; NFL pursuers run at 71% and aim at him 11% of the time.
- **Sim pursuers could get there and don't.** Only 8–10% of sim pursuers
  on long runs could not intercept at their top speed, against 30–42% in the
  NFL, where the back really does outrun them.
- **So it is not "aims at the carrier at all distances".** It is close-range
  pursuers who are slow and aim at him: still accelerating after a shed or
  a turn, or throttled. A pursuit fix should first check requested against
  achieved speed for those defenders.
- **The pursuit angle is not the main long-run cause.** That remains the
  deep defenders' position (section 5).

## 7. Interior pass rush

Question: is the sim's interior a static wall where NFL interior gets pushed
back? Do NFL DTs win with lateral quickness or by depth? Does the QB step
up?

Method: `scripts/diag/interior-rush.py`, position-only, definitions as
`pass-pressure.py`.
- **Sim:** `claude/run-game-v3` `c735a6dd` (`PASS_KICK`, `PASS_RIDE`,
  `FRONT_ALIGN` on), candidate profile, 8 games, seeds 301–308. 425 dropbacks
  without PA, 852 interior reps. Receipts `run-1792658120622-319` and
  `-619-326`, inputs unchanged, exit 0.
- **NFL:** 7,007 dropbacks, 10,868 reps.

Medians, NFL vs sim:

| | NFL | Sim |
|---|---|---|
| Rep outcome: engaged at the end / free / other | 71 / 9.3 / 20% | 96 / 1.5 / 2.6% |
| Blocker depth at 1.0 / 2.0 s, engaged reps | 2.1 / 4.2 yd | 2.0 / 3.8 yd |
| Blocker retreat since contact at 1.0 / 2.0 s | +0.4 / +2.3 | +0.7 / +2.5 |
| Rusher depth at 1.0 / 2.0 s | +1.4 / +3.8 | +1.5 / +3.2 |
| **Rusher relative to blocker at 1.0 s: toward the QB / across** | **+0.63 / 0.45 yd/s** | **0.00 / 0.16** |
| Free reps: last 0.5 s before release, toward the QB / across | +1.11 / 0.87 | +2.14 / 0.63 |
| Free reps leave | inside 39, outside 32, through 29% (n 1,014) | through 54, outside 31, inside 15% (n 13) |
| Free reps: when, after how long engaged | 3.06 s, 1.50 s | 1.95 s, 1.10 s |
| Interior pressure per 100 dropbacks (pass-pressure.py) | 9.3 | 7.3 |

Window-controlled, among reps whose window is still open at T:

| | 1.5 s | 2.0 s | 2.5 s | 3.0 s |
|---|---|---|---|---|
| NFL free by T / off the block by T | 0.9 / 5% | 1.6 / 12% | 2.9 / 20% | 7.4 / 34% |
| Sim | 0.0 / 1% | 1.2 / 3% | 1.5 / 4% | 3.0 / 10% |

QB depth at 1.0 / 1.5 / 2.0 s:
- **NFL:** 6.0 / 7.1 / 7.8. Throws from 7.3; step-up p75 0.2 yd; nearest
  interior rusher at the throw 3.8 yd.
- **Sim:** 6.5 / 7.7 / 7.9. Throws from 7.9; step-up p75 0.0; nearest
  interior rusher 4.6 yd.
- **The window is shorter in the sim:** 25% of NFL dropbacks last 3 s or
  more after line start, against 11% of the sim's.

**Reading.**
- **Not a static wall.** The pocket's depth over time, and how far the
  blocker is driven back after contact, are NFL-like or slightly deeper.
- **The difference is inside the engagement.** At 1.0 s an NFL DT is still
  working: gaining 0.63 yd/s on his blocker toward the QB and moving 0.45
  yd/s across him. The sim's pair moves as one rigid unit (0.00 / 0.16).
- **NFL rushers come off blocks.** About a third of NFL interior reps are
  off the block by 3 s (free, twisting, or reset), against a tenth in the
  sim. The NFL wins that do happen mix push and lateral: exits are balanced
  three ways, with about 0.9 yd/s across in the last half-second.
- **Part of the low free rate is the window.** NFL interior wins come late
  (median 3.06 s) and sim dropbacks end earlier. At equal time, the sim's
  free rate is about half the NFL's from 2.5 s on (1.5 vs 2.9%, 3.0 vs
  7.4%).
- **The QB is part of it too.** The sim QB sits about 0.5 yd deeper, throws
  from the top of his drop (no step-up), and ends 0.8 yd farther from the
  interior rushers.
- **Possible mechanisms** for the rigid engagement: the rusher's moves not
  producing relative motion (hand fight, swim or rip, push-pull), or the
  engagement holding the pair at a fixed offset. Check requested against
  achieved relative motion in a 1v1 interior reproducer before changing
  anything. The rusher must stay free to choose a move, and its cost and
  the blocker's counter should decide it, not a cap.

## 8. QB pocket movement

Question: do NFL QBs climb when the edge rushers get level with them, while
the sim's do not?

Method: `scripts/diag/qb-pocket.py`, position-only, same `c735a6dd` export.
- **Plays:** dropbacks without PA that end in a throw at least 1.0 s after
  line start. NFL 6,032; sim 386.
- **Set:** the QB's deepest point. Step-up = set depth − depth at the throw.
- **Edge level:** an edge rusher within 1 yd of the QB's depth or deeper,
  and within 4 yd of him laterally.

| | NFL | Sim |
|---|---|---|
| Set depth; time after line start; throw after the set | 7.6 yd; 1.86 s; 0.20 s | 7.9 yd; 1.69 s; 0.30 s |
| Step-up p50 / p75 / p90 | 0.0 / 0.2 / 1.0 yd | 0.0 / 0.0 / 0.5 yd |
| Step-up of 0.5+ / 1.0+ yd | 17% / 11% | 10% / 6% |
| An edge rusher gets level before the throw | 43% of throws, at 1.96 s | 30%, at 1.89 s |
| Climbs 0.3+ yd within 0.5 s of that | 20% (4% without an edge level) | 27% (0% without) |
| **Lateral slide after an edge gets level, p50 / p75 / p90** | **0.2 / 0.5 / 2.6 yd** | **0.0 / 0.1 / 0.2 yd** |
| Lateral slide, set to throw, no edge level, p50 / p75 / p90 | 0.0 / 0.2 / 0.6 yd | 0.0 / 0.0 / 0.0 yd |

**Reading.**
- **Climbing is uncommon in the NFL too.** The median NFL QB throws from
  his deepest point. Only about one throw in six involves a step-up of half
  a yard or more.
- **The sim QB already responds to the edge.** An edge rusher getting
  level is a climb cue in both: 20% vs. 4% in the NFL, 27% vs. 0% in the
  sim. The hypothesis that the sim QB does not climb is not supported.
- **The difference is sideways.** Once an edge rusher is level, NFL QBs
  slide: a quarter move half a yard or more, a tenth 2.6 yd or more. The
  sim QB stays on his spot (p90 0.2 yd), and never moves laterally without
  pressure.
- **The sim QB also sets 0.3 yd deeper and slightly earlier.** That gives
  edges a shorter path to his depth.
- **The fix belongs to the QB's pocket controller.** Lateral movement away
  from the nearest threat must be possible, at the cost of his set and his
  throwing platform. Don't push edges wider to protect a stationary QB.
- **Limits:** the NFL common format includes scramble-type dropbacks that
  end in a throw, which may inflate the NFL slide tail. The sim has 115
  edge-level plays.

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
