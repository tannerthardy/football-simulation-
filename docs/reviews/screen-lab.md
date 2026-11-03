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

- **Blocking in space:** the released linemen's path from letting their man by
  to leading the screen (arrival at the convoy).
- **Handed to Defense** (Tanner, 2026-11-03): screen recognition and rally.
- After that, use the lab to judge blocking in space itself: arrival margin,
  sheds, and whiffs.
