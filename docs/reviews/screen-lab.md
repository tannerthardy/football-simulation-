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
| `rb_slip_screen` | gun doubles | RB, sells pass pro, releases on the count | screen-side T (out), G (up), C (in) |
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
- **Letting the rusher by.** A released lineman leaves on the count once his man
  is past his hip toward the QB, or 0.7 s after the count at the latest. That
  way a rusher who stops is not left sitting in the screen. Before the throw,
  he may block a defender who is still behind the line.
- **The QB** reads only the screen. On a slow screen he throws on
  anticipation once the receiver is within 3.5 yd of his spot. NFL slow
  screens leave the hand with the receiver still 2.3–2.9 yd from where he
  catches it. He may also loft the ball over the rush; his usual throw-window
  evaluation decides whether to.

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
