# Screen lab: blocking in space

Question: when players release into the field to find blockers (screens), how
does our blocking work, and how does it compare with NFL tracking of the same
plays?

Football reference: [screens handbook page](../football-handbook/screens.md).

## What is installed

Five screens in `SCREEN_CONCEPTS` (`src/playbook/concepts.ts`). They are not in
the play caller's pool, so games are unchanged: one full game (seed 101) is
byte-identical to develop `85952c95`. They are called only from the lab.

| Screen | Formation | Receiver | Who blocks |
|---|---|---|---|
| `rb_slip_screen` | gun doubles | RB, sells pass pro, slips out at 0.6 s and drifts wide behind the traffic | screen-side T (out), G (up), C (in) |
| `te_screen` | gun trey | attached TE, blocks, releases on the count | T (out), G (up), C (in) |
| `bubble_screen` | gun trips | #2 bubble | #1 stalk, #3 crack |
| `bunch_now_screen` | gun bunch | #1 comes back | #2 stalk, #3 crack |
| `tunnel_screen` | gun doubles | #1 comes back inside | #2 stalk, T (out), G (up) |

Mechanics (`src/sim/behaviors/screen.ts`, `ScreenBlocker`):

- **Released linemen** (`PassProtector` with a called release) pass-set until
  the count. Each lineman has his own rhythm, ±0.12 s. On the count they
  release their hands and slide flat to a landmark beside the catch point, a
  yard behind the line. Once the ball is thrown they attack their man. They
  stay within a yard of the line until the throw, because they are ineligible
  downfield.
- **Assignment rules.** Out, up and in work as follows: out is the outermost
  threat to the catch point, up is the alley in front of it, and in is a
  chaser from inside. Stalk is the man nearest where the blocker aligned, kept
  while he is blockable. Crack is the next man inside, toward the catch point.
- **What blockers see.** Every target is chosen from the blocker's own delayed
  perception, re-read every 0.3 s. A man already claimed by a teammate is
  skipped. Except on the in job, a perimeter or alley block never takes a man
  aligned on the ball near the tackles, because that man is the rush.
- **Approach and block.** Before the throw, a receiver's stalk or crack works
  to leverage between his man and the catch point. He stays near his own
  depth (at most a step, 0.5 yd, deeper), lets the man come, and does not chase a man
  who bails. Once the ball is out, he attacks: he runs to the man, then breaks
  down inside 4 yd and closes under control (`track`), the "buzz the feet"
  technique. The block itself is the ordinary run engagement,
  with the hands and bodies in physical contact. Screen blockers keep their jobs through the
  catch. Everyone else becomes the existing `DownfieldBlocker`.
- **Receiver release.** A back stays in while his blocking assignment is a free
  rusher, because a blitz kills the screen. An attached end always releases
  on the count.
- **Short set.** A lineman with a called release sets no deeper than 0.7 yd
  (NFL released linemen stay about 0.7 yd off the line through the set). He
  punches and lets the rusher by near the line instead of kicking back to the
  QB's depth, and he skips the edge cut-off kick.
- **Letting the rusher by.** A released lineman leaves on the count once his man
  is past his hip toward the QB, or 0.3 s after the count at the latest.
  Before the throw he steps around any defender directly upfield of him (gets
  off the rusher), then back up to half a yard behind the line, no more than
  2 yd across toward the screen. That
  way a rusher who stops is not left sitting in the screen. Before the throw,
  he may block a defender who is still behind the line.
- **Throw touch on slow screens.** The QB chooses float or firm from what he
  sees. He floats it (flight max(1.5×, +0.25 s) of his natural ball) over a
  rusher in the near half of his lane, or to a back still drifting into his
  spot. He throws it firm when a defender would reach the catch point within
  a beat. Quick screens keep the natural ball.
- **The QB** reads only the screen. On a slow screen he throws on
  anticipation once the receiver is within 3.5 yd of his spot. NFL slow
  screens leave the hand with the receiver still 2.3–2.9 yd from where he
  catches it. A lofted "touch" option was tried and removed: the throw-window
  evaluation never chose it.

## How to run it

```sh
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 -- npx tsx scripts/diag/screen-lab.mts --seeds 8
python3 -I scripts/mechanics/screen_reference.py out/screens/sim-screens.jsonl.gz --by type
python3 -I scripts/mechanics/nfl_screens.py           # once: 821 NFL screens -> out/screens/nfl-screens.jsonl.gz (~25 min)
python3 -I scripts/mechanics/screen_reference.py out/screens/nfl-screens.jsonl.gz --by group
npx tsx scripts/diag/screen-one.mts rb_slip_screen gun_doubles_11 cover3 1   # one snap, traced
```

- **Lab size:** 160 snaps, made of 5 screens × 4 calls × 8 seeds. The four
  calls are Over Cover 3, Over Cover 1, Over Cover 2, and Over Cover 1 with a
  Mike A-gap blitz. The run takes about 1 minute.
- **NFL reference:** BDB 2025, 2022 weeks 1–9. A screen is a dropback whose
  targeted receiver ran `SCREEN`.
- **The operator** (`screen_reference.py`) uses positions only, with the same
  code on both sources. Its definitions are in its docstring. In short:
  - *released OL*: the lineman gets past +1 yd;
  - *convoy*: blockers and threats ahead of the receiver at the catch, within
    6 yd laterally and 10 yd in total;
  - *blocks in space*: an offensive player within 1.2 yd of a defender for at
    least 0.3 s, more than 1 yd past the LOS or more than 5 yd wide;
  - *first defender to the carrier*: the first defender within 1.5 yd after
    the catch, recorded as unblocked or shed.

## Results (sim at `claude/screens`, candidate profile)

The NFL column groups by receiver position; the sim column is by screen.
Values are p50s.

| | NFL RB | sim slip | NFL TE | sim TE | NFL WR | sim bubble | sim bunch now | sim tunnel |
|---|---|---|---|---|---|---|---|---|
| caught / thrown | 232/271 | 14/32 (was 2) | 124/140 | 14/32 (was 10) | 366/409 | 21/32 | 32/32 | 26/32 |
| time to throw, s | 2.20 | 2.95 | 2.40 | 2.65 | 1.40 | 1.40 | 1.25 | 1.40 |
| catch depth, yd | −3.0 | −2.7 | −2.6 | −2.9 | −1.6 | **+3.5** | −0.9 | −1.0 |
| first OL past the LOS, s | 1.9 | **4.0** | 1.4 | 3.7 | 1.0 | – (no OL release) | – | 3.8 |
| blockers / threats ahead at the catch | 2/2 (2 OL) | **0/1** | 2/2 | 1/1 | 2/2 | 1/1 | 2/3 | 1/1 |
| first defender reaches carrier, s after catch | 1.0 | 1.6 | 1.1 | 1.0 | 0.9 | **0.1** | **2.7** | 0.1 |
| …and he was unblocked | 57% | 86% | 60% | 92% | 53% | 100% | 88% | 92% |
| yards (caught plays) p50 / mean | 6 / 6.9 | 3 / 3.3 | 7 / 7.6 | 1 / 7.2 | 5 / 5.6 | 22 / 39.6 | 11 / 12.5 | 0 / 8.3 |

## What the lab shows (ranked by frequency × consequence)

1. **Slow screens: the QB now gets the ball out, but the linemen arrive too
   late to lead.**
   - **First pass.** RB slip completed 2/32. The screen-side end the tackle
     released stopped rushing and sat at the back's catch point, so the QB
     correctly read the throw as covered. Separately, a free DT reached him
     at 2.3–2.5 s.
   - **The fixes (approved):**
     - QB anticipation timing, with a touch option over the rush, screen
       calls only;
     - linemen let their man by, then release;
     - linemen block the screen area behind the line before the throw.
   - **Result.** RB slip 14/32 and TE screen 14/32 complete.
   - **What remains.** The throw comes at 2.95 s (NFL 2.20), and the back
     catches with a median of **0 blockers** ahead of him (NFL 2, both
     linemen). The first released lineman crosses the line at 4.0 s (NFL 1.9).
     On the remaining failures the rush reaches the QB just before the throw
     (seeds 5–6), and there is one drop (seed 8).
   - **Next question: how linemen get from letting their man by to the front
     of the screen.** They slide flat behind the line and do not turn
     upfield until the ball is out. NFL linemen are past the line about
     0.3 s before the throw.

   Coverage call barely matters on the slip screen: Cover 3, 1 and 2 give
   identical events with the same front. The pressure call does change them.

2. **Defenders are slow to rally to quick screens.** On the bunch now screen,
   the first defender reaches the catcher 2.7 s after the catch, versus about
   0.9 s on NFL WR screens. The catcher gains 11 yd at the median, versus 5 in
   the NFL. This is coverage and pursuit reacting to the throw, which is
   Defense's lane. Their perception-to-trigger timing is the likely place to
   look.
3. **The bubble is caught downfield and late.** Catch depth is +3.5 yd (NFL
   WR −1.6). Either the first defender is on the catcher within 0.1 s, or
   nobody is and he scores. The route's downhill turn comes before the throw
   arrives, and on the traced snap (seed 1 vs Cover 3) the throw travels about 0.8 s over 15 yd. The QB's choice of
   throw speed and flight time on a short perimeter pass needs a look.
4. **Released linemen cross the line late, and receiver screens release none.**
   In the NFL the first lineman crosses about 1.0 s after the snap on WR
   screens, with 3–5 linemen releasing; the sim releases none on its receiver
   screens. On slip and TE screens the NFL first crossing is 1.9 s and 1.4 s,
   against 3.6 s in the sim. The sim holds linemen behind the line until the
   throw, and the slow screens throw late.

5. **Knockdowns from perimeter blocks: fixed.** Stalk and crack blockers first
   ran through their man at 0.6 vmax. `scripts/diag/screen-falls.mts` found
   the strong safety put down by the inline end's crack on 18 of 32 bubbles,
   and the corner or safety put down by his stalk on 14 of 32 bunch now
   screens. Breaking down inside 4 yd cut stalk/crack knockdowns to 1 (bubble)
   and 2 (bunch now).
   - **Nearby defenders on the bunch now screen** (DB/LB within 12 yd of the
     catch; same operator on both sides). They now close at 0.9 yd/s at the
     catch (was 0.1; NFL WR screens 3.2), and 19% are slow at the catch (NFL
     3%). The first defender still arrives 2.6 s after the catch.
   - **What remains** is closing at the catch, which is Defense's item 2.

6. **The stalk released like a route: re-diagnosed and fixed.** A first try
   that held a cushion on the man was reverted, because it followed bailing
   DBs.
   - **NFL vs sim.** `release_pace.py` and `stalk_reference.py` measure NFL
     screen blockers and the DBs they block with the same code as the sim:

     | p50 | NFL | sim before | sim now |
     |---|---|---|---|
     | blocker speed / downfield at 0.9 s, yd/s | 1.9 / 0.6 | 4.4–4.7 / 4.3–4.7 | 1.3–2.4 / 0.5–0.6 |
     | blocker downfield / lateral on a DB at 0.9 s, yd | 0.5 / 0.7 | 2.1 / 0.3 | 0.5 / 0.8 |
     | blocker downfield / lateral at the catch, yd | 1.7 / 3.1 | 5.2 / 0.8 | 1.6 / 1.3 |
     | the DB's movement toward the line at the catch, yd | 1.9 toward | 2.5 away | 1.3 toward |

     NFL screen blockers barely release; they work across while the DB comes
     downhill to them. Ours released like route runners, the DB bailed as if
     covering a route, and the blocker chased him.
   - **Bunch now after the fix** (all vs NFL WR screens):
     - closing at the catch 1.6 yd/s (was 0.9; NFL 3.2);
     - slow at the catch 5% (was 19%; NFL 3%);
     - first defender at the carrier 2.1 s (was 2.6; NFL 0.9);
     - median gain 7.4 yd (was 11.4; NFL 5).
   - **Bubble:** median gain 17.9 yd. Its run tail is still long.
   - **Knockdowns** before the catch, all causes: 4 bunch now, 5 bubble.
   - **The release leverage depth is a step (0.5 yd).** At 1.5 yd the
     blockers still went 1.8–2.0 yd/s downfield at 0.9 s.
   - **Remaining divergences:**
     - our blockers move 1.3 yd laterally by the catch (NFL 3.1);
     - the DB's trigger on the screen is Defense's read: Coverage's pace or
       downfield cue now has a matching sim signal.

7. **Released linemen get in front of slow screens: partly fixed.**
   `screen_ol_reference.py` measures released linemen on caught RB/TE screens
   with the same code for NFL and sim. NFL linemen let the rusher by, step
   back up to the line near their own lane (0.6 yd behind it, 2.6 yd from
   the ball at the throw), and lead: they are 3.2 yd ahead of the catcher at
   the catch. Ours stayed at pass-set depth and slid wide behind the rush,
   then were driven backward stepping straight into the man they had
   released.

   | p50 | NFL | sim before | sim now |
   |---|---|---|---|
   | depth / distance from the ball at the throw, yd | −0.6 / 2.6 | −3.8 / 5.6 | −3.0 / 5.2 |
   | crosses the LOS rel. throw, s | +0.5 | +1.2 | +0.9 |
   | ahead of catcher at the catch, yd | 3.2 | −0.4 | 1.6 |
   | OL ahead at the catch: slip / TE | 2 / 2 | 0 / 1 | 1 / 2 |
   | yards p50: slip / TE | 6 / 7 | 5.5 / 7.4 | 7.5 / 6.1 |

   Still open: linemen remain about 3 yd deep at the throw, and the slip
   screen completes 11 of 32.

8. **Lineman depth and slip completions.**
   - **Depth over time** (`screen_ol_reference.py`), released linemen on caught
     RB/TE screens, depth behind the line at 0.5 / 1.0 / 1.5 / 2.0 s:

     | | 0.5 s | 1.0 s | 1.5 s | 2.0 s |
     |---|---|---|---|---|
     | NFL | 0.7 | 0.7 | 0.8 | 0.6 |
     | sim before | 1.3 | 2.2 | 3.1 | 4.0 |
     | sim with the short set | 1.2 | 1.7 | 2.4 | 3.0 |

     They are still driven back after the set.
   - **Slip screen with the short set:**
     - throw p50 2.25 s on three of the four calls (NFL 2.20);
     - 2 OL ahead of the catcher (NFL 2);
     - QB hit before the throw on 5 of 32 snaps (14 without the short set).
   - **TE screen with the short set:** 11/32 caught (16 without).
   - **Why slip snaps fail** (`scripts/diag/screen-outcomes.mts`, 32 snaps):

     | | slip | TE |
     |---|---|---|
     | caught | 12 | 11 |
     | thrown, missed | 11 | 7 |
     | QB hit before the throw (sack, scramble, hurried drop) | 5 | 7 |
     | other (throwaway, breakup, drop, batted) | 4 | 7 |

     The misses are not blocking. The QB's throw arrives at its planned time
     about 1.1–1.4 yd from the back: either short of its point (seed 1), or
     at its point while the back has drifted past it tracking the ball
     (seed 6). These are the shared receiver-forecast and ball-tracking
     systems on a receiver decelerating into his settle point.

9. **QB aim and ball tracking: not a general problem; the slip misses are
   the back's path.**
   - **Regular passes match the NFL.** 4 sim games (seeds 201–204, 329
     thrown passes, throwaways excluded) against 2022 NFL plays by air yards:

     | air yards | sim comp | NFL comp | sim miss + drop (no defender) | NFL incomplete, no PD |
     |---|---|---|---|---|
     | ≤ 0 | 67% (n 12) | 75% | 25% | 16% |
     | 1–5 | 73% | 73% | 21% | 18% |
     | 6–10 | 54% | 62% | 28% | 24% |
     | 11–20 | 65% | 56% | 21% | 29% |

   - **The slip misses, traced** (`screen-one.mts` with `TRACE_FC`,
     `TRACE_CATCH`, `TRACE_SLOT`). At release the QB's receiver forecast
     cannot place the back on his installed route (`progress: null`), so it
     extrapolates a 0.25 s old picture in a straight line. The back is not
     following his route: he asks for 6.8 yd/s and achieves about 3.3,
     slowed by the bodies at the line, and he turns while doing it. With the
     stale picture, the aim lands 1.2 yd behind where he arrives (seed 6).
     The ball tracking then cannot reverse his upfield momentum during a
     0.5 s flight.
   - **A tried change, reverted.** Re-anchoring the QB's forecast on the
     back's release spot and time changed no slip outcomes.
   - **The lever is the back's path out of the backfield through the traffic.**
     That is screen work; the shared QB and catch code stay as they are.

10. **The slip back's path: fixed.** `screen_back_reference.py` measures the
    back on caught RB screens, with the same code for NFL and sim.
    - **What NFL backs do.** They are 1 yd wide of their start by 1.1 s and
      drift wide behind the traffic. At the throw they are 3.5 yd deep and
      6.7 yd from the ball, with the nearest body 3.1 yd away.
    - **What ours did.** He left 0.1 s after the linemen's count, stepped
      inside during the set, and climbed toward the line (route settle 2.5
      yd deep, 4.5 yd across). His lateral release came at 2.5 s, he was
      3.6 yd from the ball at the throw, and the nearest body was 1.3 yd.
    - **Fix, part 1: the route.** It now settles 3.5 yd deep and 6 yd across,
      on a deeper, wider path. Alone this made things worse (6/32 caught): he
      arrived later and the rush got home first.
    - **Fix, part 2: release time.** The screen gets a separate receiver
      release time, 0.6 s for the slip back; the linemen keep their 1.0 s
      count.

    | RB slip, p50 | NFL | before | now |
    |---|---|---|---|
    | lateral release, s | 1.1 | 2.5 | 1.5 |
    | at the throw: depth / from the ball / nearest body, yd | −3.5 / 6.7 / 3.1 | −3.6 / 3.6 / 1.3 | −4.5 / 5.4 / 3.6 |
    | throw, s | 2.20 | 2.80 | 2.20 |
    | OL ahead of the catcher | 2 | 1 | 2 |
    | yards | 6 | 7.5 | 6.8 |

    **Outcomes (32 snaps):** 13 caught (12 before), missed throws 1 (11
    before), drops 7, QB hit before the throw 11 (8 of them on Cover 1 Mike
    A, the blitz that kills screens). Still open: the drops, and catch depth
    −4.1 yd and width 7.7 yd (NFL −3.0 / 9.9).

11. **Slip drops and screen throw touch.**
    - **Why the drops happen.** A temporary catch trace showed slip catches
      tried at the edge of reach: ball 1.04 yd from the body (stretch 0.68),
      arriving from behind (fromBehind ≈ 0.95) while the back drifted wide.
      That gives pCatch ≈ 0.82, against ≈ 0.94 for a ball into the body.
    - **NFL screens are floated** (`throw_flight_reference.py`, same code).
      Flight over 6–10 yd: RB and TE 0.8 s (p25 0.6, p75 0.9); WR 0.8 s at
      10–14 yd. The sim's natural ball was about 0.5 s on every screen.
      Regular short passes are also faster in the sim (6–10 yd: 0.45 vs
      0.70 s), but part of that is sim catches happening early, at the edge
      of reach, rather than the throw itself.
    - **The float rule** is in the mechanics list above.
    - **Floating quick screens too was tried and reverted:** the bubble went
      from 24 to 13 caught (19 misses), because the forecast over the longer
      flight misses a receiver running away.
    - **Result, slow screens with the float** (32 snaps each):
      - slip: flight 0.75 s (NFL 0.8); 10 caught (13 before); drops 5 (7);
        3 batted;
      - TE: 14 caught (11 before).

      The net is about even. Still open: quick screens fly 0.4–0.5 s (NFL
      about 0.8), and catches at the edge of reach.

12. **Target selection: not the main gap; tested and not kept.** The
    question was whether screen blockers take the wrong men. The NFL's first
    tackler had been blocked 40–47% of the time; ours 0–39% (71–100% unblocked).
    - **Plan tried** (preserved on branch `claude/screens-threat-blocking`):
      a shared "blocking in space" module that forecasts the carrier's lane,
      treats a defender as a threat only if he can reach that lane, finds where
      each blocker can get onto the threat's track, and matches threats to
      blockers most-urgent-first. Every blocker solves the match from his own
      picture; job rules (out/up/in/stalk/crack) are tie-breakers. It added
      commitment after the throw and a fit on the defender's line to the
      carrier. Three rounds moved the first-tackler share a little, raised
      target switches up to 15×, and moved tunnel yards a lot (median 11.8 →
      2.3) without a clear mechanism. Not kept.
    - **Re-diagnosis.** New position-only measures in
      `screen_reference.py`, same code for NFL and sim:

      | | NFL WR / RB / TE | Sim slip / TE / bunch now | Sim bubble / tunnel |
      |---|---|---|---|
      | Of the 3 defenders nearest the catch, share blocked before reaching the carrier | 35% / 24% / 20% | 13% / 38% / 61% | 23% / 29% |
      | Blocks on men ranked past 5th nearest | 29–49% | 31–60% | 29–34% |
      | First tackler's rank by distance at the catch (median) | 1 | 6 / 6 / 7 | 1 |
      | Blocks in space from the catch on: duration (median) | 0.7–0.8 s | 0.5–0.6 s | 0.6–0.9 s |
      | Nearest defender at the catch (median; share within 2 yd) | 4.0–4.4 yd; 11–16% | 7.3 / 4.6 / 3.7 yd; 0–18% | 3.0 / 1.9 yd; 36% / 62% |

      Our blockers already take near men at NFL rates or above, and our
      blocks don't last longer. The difference is what the defense does. In
      the NFL the first tackler is one of the two nearest men (52–58%), and
      when blocked he gets off after about 0.5 s. In our slow screens the
      nearest men never come to the ball: the tackle comes from a far man 2–3 s
      later, which is the long-gain tail. That is the screen read and rally
      already with Defense. On bubble and tunnel the ball arrives with a
      defender on the catcher (62% of tunnel catches within 2 yd vs NFL
      11–16%). No blocker can fix that: it is the throw timing, the receiver's
      path and the defender's cushion.
    - **Kept:** screen blockers start a block on body contact (actual
      distance), as every other blocker does, not on a perceived position up
      to 2 yd stale at screen closing speeds. The effect is small (the bunch
      now first-tackler-unblocked share falls from 61% to 52%; other screens
      unchanged within sample noise).
    - **Side findings:** on the bubble, the stalk blocker caught 4 of 32
      throws meant for #2 (ball through him). On the tunnel, a released
      lineman caught 2 of 32 (illegal touching is ruled). Both belong to
      shared catch code (who goes for a ball not thrown to him), not
      blocking.
    - `scripts/diag/screen-threats.mts` classifies each first tackler (shed,
      chosen but never reached, unchosen, rusher) and counts target switches.

13. **Quick screens thrown into a covered man: mostly the defense's early
    trigger, plus our routes.** `quick_screen_reference.py` follows, on NFL
    WR screens and on the lab (16 seeds), two defenders from the snap to the
    catch:
    - the man over the receiver (nearest DB/LB at the snap);
    - the "closer" (the defender within 10 yd who gains most on the receiver
      before the throw).

    NFL screens are classed by the receiver's motion: in (tunnel-like), out
    (bubble-like) and now.

    | Medians | NFL in / now / out (zone) | Sim tunnel / bunch now / bubble (zone) |
    |---|---|---|
    | Closer's depth, snap → throw | 5.5→4.9 / 4.8→4.2 / 3.7→3.3 yd | 4.0→−0.3 / 5.8→0.1 / 4.5→2.2 yd |
    | Yards the closer gains on the receiver before the throw | 1.0 / 0.2 / −0.3 | 4.7 / 4.4 / 0.6 |
    | Receiver's travel by the throw | 1.2 / 0.8 / 2.2 yd | 5.2 / 0.9 / 3.6 yd |
    | Throw time | 1.6 / 1.3 / 1.5 s | 2.0 / 1.8 (p75 3.0) / 1.2 s |
    | Catch point vs alignment (depth, lateral) | −0.6, −3.0 / −1.8, +0.5 / −2.1, +4.1 | −1.0, −5.4 / −0.9, −0.5 / +1.6, +7.1 |
    | Nearest defender at the catch; within 2 yd | 3.0; 32% / 4.5; 10% / 4.7; 9% | 1.1; 79% / 2.1; 46% / 4.2; 0% |

    | Medians | NFL in / out (man) | Sim tunnel / bubble (man) |
    |---|---|---|
    | Man over him at the snap: depth, cushion | 2.2, 4.2 / 1.2, 4.9 yd | 1.3, 2.5 / 1.3, 2.5 yd |
    | Man over him to the receiver at the catch | 4.1 / 6.4 yd | 2.1 / 1.9 yd |

    - **Zone (tunnel, bunch now): the flat defender drives before the
      throw.** Traced on tunnel vs Cover 3: the curl-flat SS reads pass at
      0.35 s. He then pattern-matches the receiver coming underneath and
      drives downhill at 4–5 yd/s, reaching the line by 1.4 s. NFL zone
      defenders over a quick screen gain about 0–1 yd on the receiver before
      the throw; ours gain 4–5. He is often in the throwing lane, so the QB
      rightly holds the ball (traced: completion estimate 0.1, from the
      undercut along the flight). The throw then comes late.
    - **Man (tunnel, bubble): mostly the lab's call mix, not the cushion.**
      The lab's man calls were all press. Defense's check: NFL man coverage
      is 51% press, and our press depth (1.3 yd) is the tracked one. The lab
      now has `--off-man` (adds Cover 1 Off), and the operator splits press
      (the man over him is a DB within 2 yd of the line) from off.

      | Man coverage, within 2 yd at the catch (receiver to his man) | NFL | Sim |
      |---|---|---|
      | Tunnel vs press | 18% (3.6), n 11 | 5% (2.9) |
      | Tunnel vs off | 29% (5.0), n 14 | 0% (6.2) |
      | Bubble vs off | 13% (6.4), n 30 | 0% (8.7) |
      | Bubble vs press | 0% (6.6), n 9 | 33% (2.4) |

      The one gap left is the bubble vs press, on 9 NFL plays. There the NFL
      press defender aligns 2.8 yd inside the slot; ours is head-up (+0.1).
      Defense checked all 2022 man snaps. NFL press on #2 is median 0.2 yd
      outside (IQR 0.77 outside to 0.03 inside, n 325), and ours is in that
      band. So the screen rows reflect which looks screens are called into,
      not alignment. Parked: 9 plays can't separate selection from press
      technique after the snap.
    - **Our routes add to it:**
      - The tunnel comes 5.4 yd inside its alignment (NFL 3.0), into the
        flat defender's area. The receiver has run 5 yd by the throw
        (NFL 1.2).
      - The bubble runs 3.6–6.4 yd before the throw and is caught 1.6–3.9 yd
        past the line (NFL 2.1 yd behind it).
    - **Tried and reverted:** measuring the QB's catch-point contest to the
      ball side of the receiver on screens. It did not change his estimate,
      because the undercut along the flight drives it.

14. **Tunnel and bubble paths from NFL tracking; the tunnel thrown to its
    spot.** `screen_wr_path_reference.py` measures the screen receiver's path
    from his alignment over time (same code for NFL and sim).
    - **NFL tunnel ("in" WR screens).** A slow vertical sell to +0.8 yd by
      1.2 s, a turn inside at 1.8 s, and the catch 3.1 yd inside, 0.6 yd
      behind the line. The ball is thrown at 1.6 s, before the turn, and flies
      about 1 s.
    - **NFL bubble ("out").** Drifts back and out at 1–3 yd/s, 1.5 yd out at
      the throw (1.5 s), and is caught 4.1 yd out, about 2 yd behind the line.
    - **Changes:**
      - The tunnel receiver first sells a stalk block on the corner (the
        existing receiver block look, `ScreenSpec.receiverSell` 1.1 s). He
        then retraces inside to a spot 3 yd inside, 0.7 yd behind the line.
      - Its line release moves from 0.4 to 1.0 s.
      - The bubble drifts to 2 yd behind the line, then out to 4 yd before
        turning up.
      - On a screen with a sell, the QB throws to the designed spot
        (`screen-spot.ts`, shared with the blockers). He leads the receiver
        to it, as the sell hides the route from a forecast built on what he
        sees. Throwing to the spot on the bubble made it worse (later throws
        against our press man), so it is gated to sell screens.
    - **Results** (16 seeds × 4 calls; share of catches with a defender
      within 2 yd):

      | | NFL | Before | After |
      |---|---|---|---|
      | Tunnel: turn inside | 1.8 s | 0.9 s | 1.5 s |
      | Tunnel: catch (depth, lateral) | −0.6, −3.1 | −1.0, −5.4 | −0.6, −3.8 |
      | Tunnel: within 2 yd, man / zone | 24% / 32% | 35% / 79% | 5% / 15% |
      | Tunnel: first defender to the carrier | 0.9 s | 0.2 s | 0.6 s |
      | Tunnel: caught / yards p50 | — / 5 | 39 of 64 / 9.6 | 35 of 64 / 3.1 |
      | Bubble: catch depth (from the line) | −2.1 | +1.6 / +3.9 | −1.0 |
      | Bubble: within 2 yd, man / zone | 10% / 9% | 64% / 0% | 33% / 12% |
      | Bubble: caught | — | 44 of 64 | 50 of 64 |

    - **Still open:**
      - The tunnel vs Cover 3 is caught 3 of 16: the curl-flat safety drives
        onto the spot and the QB rightly holds to 2.7 s. That is item 13's
        pre-throw trigger, handed to Defense.
      - The bubble receiver still runs faster than the NFL drift (4.5 vs
        2.8 yd/s at the throw) and is caught wider (5.8–7.0 vs 4.1 yd). A
        slower drift (through-speeds 0.2/0.4) matched the NFL catch spot
        (−1.7 to −2.0 yd, 4.6–5.0 out). But the press man reached him sooner:
        within 2 yd went to 45% man / 23% zone, and the first defender came
        at 0.3 s. Not kept, until the man cushion (Defense) is NFL-like.
      - The tunnel's linemen are behind the line at the catch (no convoy):
        they may not cross before the throw.
      - Slip, TE and bunch now are byte-identical to before.

15. **Released linemen open the gate.** `screen_ol_reference.py --wr in`
    measures released linemen on WR screens (same code for NFL and sim).
    - **NFL in-breaking WR screens.** Usually 3–5 linemen release. They stay
      at their stance depth (−0.8 / −0.7 / −0.2 yd at 0.5 / 1.0 / 1.5 s), cross
      the line with the throw (+0.1 s), and at the catch are 2.1 yd ahead of
      the catcher and 8 yd inside him: they climb to the inside pursuit.
    - **Ours.** The tunnel released 0–1. Its linemen were driven to −2.9 yd
      by 2.0 s, crossed 1.3 s after the throw, and at the catch were behind
      the catcher (−1.3 yd) beside him.
    - **First divergence (traced).** A released lineman still set on his
      rusher's line to the QB, as in ordinary protection. The rusher
      bull-rushed through him. The count's time-out then released him with
      the rusher still in front, and the rusher carried him back.
    - **Tried and reverted:** setting at the line (set depth 0) on quick
      screens. Depth did not change (−1.4 at 1.0 s): the push, not the set
      point, was driving it.
    - **Kept.**
      - **"Open the gate."** A lineman with a called release sets beside his
        rusher's line to the QB, on the side he is already on, at his
        short-set depth, and does not strike. The rusher takes the lane, runs
        past his hip, and he releases. Bodies still collide physically.
      - **The tunnel also releases the center ("in").**

      | | NFL | Before | After |
      |---|---|---|---|
      | Tunnel: linemen released (all plays) | 3–5 per play | 14 in total | 63 in total |
      | Tunnel: lineman depth at 2.0 s | +0.4 | −2.9 | −1.2 |
      | Tunnel: released linemen in the convoy at the catch | 31% | 7% | 48% |
      | Tunnel: caught of 64; yards p50 | — ; 5 | 35; 3.1 | 41; 6.2 |
      | Slip/TE: released lineman depth at 2.0 s | −0.6 | −2.9 | −1.3 |
      | Slip/TE: caught of 64 | — | 29 / 29 | 25 / 32 |
      | Slip/TE: yards p50 | 6 / 7 | 5.5 / 10.2 | 4.7 / 7.3 |
      | Slip/TE: first defender to the carrier is DL | 14% / 16% | 0% / 3% | 26% / 23% |

    - **The cost.** The rusher who is let through now sometimes chases down
      the screen: DL go from almost never first to the carrier to a little
      over the NFL rate. The QB on slow screens also throws earlier (slip
      1.95 vs 2.25 s, NFL 2.2), with the rusher coming free sooner.
    - **Still open:**
      - Tunnel linemen cross the line 0.8 s after the throw (NFL 0.1).
      - Tunnel vs Cover 3 (the flat defender, Defense).

16. **Blocking in space: from film notes to four mechanisms.** Tanner's film
    notes (slip vs Cover 3 rep 2, Cover 1, Cover 1 Off reps 1-2) named four
    things: no jostling at the point of the block, linemen parking at the
    line, blockers who never get leverage, and a back who runs wide away
    from his blockers. Each was traced to a first divergence.
    - **Engaged defenders did not fight to the ball.** A defender in a run
      engagement aims at the ball only after reading run or once the carrier
      is 2 yd past the line. On a screen his read is pass and the catch is
      behind the line, so he stood still in the block (TE screen: reading on
      2% of contact ticks). Now a blocked defender who sees a completed pass
      (a non-QB holding the ball) reads and declares that carrier
      (`engagement.ts` `runContactRead`). Reading is now 91-99% after the catch.
    - **Linemen parked at the line.**
      - Threats were measured from the fixed catch point; with off coverage
        every man was 16+ yd from it, so blockers had "no target".
      - With no target, they ran to a point 3 yd ahead of the catch spot or
        carrier and stopped there, in the back's path.
      - Now threats are measured from the ball. A blocker with no man leads
        upfield 4-6 yd ahead of the carrier, in the screen's lane, a little
        to his job's side, and never parks.
    - **Cut-off blocking.** The threat-based blocker (item 12, branch
      `claude/screens-threat-blocking`) is restored now that defenders come
      to the ball. Each blocker matches the threats to the carrier's lane
      from his own view and commits after the throw. Close in, he aims at
      the earliest point on his man's run to the ball that he can beat him
      to (`meetOnTrack`), re-read every step, as a pursuer aims at an
      intercept. Aiming just in front of where the man was arrived a beat
      late, behind him as he ran by.
    - **The back read his blocks wrong, three ways.**
      - Between 4 yd behind the line and the line, every carrier used the
        run game's crease read (gaps on a handoff); a slip back ran along
        the line to the sideline. A man who caught a pass now reads the open
        field instead.
      - A block credited the defender a flat 0.7 s toward every point,
        including his free side. Now a block slows him only toward points
        whose path the blocker covers. That is an engaged blocker between
        them, or a free blocker who can get onto the defender's run to the
        point before the defender gets there.
      - A teammate running away up the lane ahead of him is a lead blocker
        to follow, not a wall.

      These apply to a carrier who caught a called screen (his own play
      call). He decides from what he sees: a blocker touching a defender is
      on him, never the engagement record (the decision-information guard).
      Extending this to every catch changes ordinary games: the
      pursuit-arrival fixture's first six catches changed. So it waits for
      whole-game evidence.
    - **Checks.**
      - `npm test`: 3732 pass. The 3 failures are `baseline-runner`, which
        needs Node 22.23.3; this container has 22.22.
      - The screen blocker files join the guard's offense allowlist, beside
        `blocking.ts`.
      - One full game is byte-identical to develop.
    - **Results** (lab, 5 calls x 16 seeds; share of first defenders to the
      carrier who were unblocked; yards p50 / mean):

      | | NFL | Before | After |
      |---|---|---|---|
      | Slip | 57%; 6 / 6.9 | 75%; 5.0 / 10.8 | 55%; 8.7 / 12.9 |
      | TE | 60%; 7 / 7.6 | 89%; 6.4 / 12.6 | 67%; 6.9 / 13.1 |
      | Bubble | 53%; 5 / 5.6 | 92%; 18.4 / 32.5 | 42%; 47 / 42.9 |
      | Bunch now | 53%; 5 / 5.6 | 54%; 8.5 / 10.7 | 29%; 4.4 / 9.4 |
      | Tunnel | 53%; 5 / 5.6 | 75%; 8.2 / 15.9 | 74%; 7.3 / 14.3 |

    - **Still open.**
      - The bubble's long runs. Traced: half a second after the catch, four
        DBs are within 2-6 yd of the carrier and he runs past all of them.
        That is pursuit and tackling (Defense), not blocking; it was already
        a 33-yd mean before.
      - Defenders standing unblocked who never pursue (slip vs Cover 1 Off
        rep 1, LB_W).
      - The tunnel's first tackler is still unblocked 74% of the time.

What is **not** shown here: whether blocks in space are won or lost on
physics. Too few slow screens reach the catch to judge that. On the screens
that do, blocks in space per play run at the NFL rate (3–7).

## Tests

`test/screen-install.test.ts` covers two contracts:

1. Released linemen sell the pass until the count, release as out/up/in, and
   are never more than 1 yd past the line before the throw.
2. Perimeter blockers never target the pass rush, and keep their jobs through
   the catch.

## Next decisions

- **Quick screens thrown into a covered man** (item 13):
  - **Defense** (handed over 2026-11-04):
    - Zone flat defenders' pre-throw drive on a receiver behind the line
      (gain 4–5 yd vs NFL 0–1). Defense traced it to `ZoneCoverage`'s lane
      branch and asked Tanner who owns the fix.
    - The cushion and slot press leverage are NFL-like; the screen rows were
      call mix and selection (parked).
  - **Main Engine:**
    - Done: tunnel and bubble paths, the tunnel's QB timing (item 14), and
      released linemen (item 15).
    - Left: the bubble's drift speed (after the press check), and tunnel
      linemen crossing with the throw.
- **Revisit target selection** (branch `claude/screens-threat-blocking`)
  once defenders rally to screens; it matters only when near men come.
- **Blocking in space:** the released linemen's path from letting their man by
  to leading the screen (arrival at the convoy).
- **Handed to Defense** (Tanner, 2026-11-03): screen recognition and rally.
- After that, use the lab to judge blocking in space itself: arrival margin,
  sheds, and whiffs.
