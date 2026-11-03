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
- **The block itself** is the ordinary run engagement, with the hands and
  bodies in physical contact. Screen blockers keep their jobs through the
  catch. Everyone else becomes the existing `DownfieldBlocker`.
- **Receiver release.** A back stays in while his blocking assignment is a free
  rusher, because a blitz kills the screen. An attached end always releases
  on the count.
- **The QB** reads only the screen. On a slow screen he throws once the
  receiver is within 1.5 yd of his spot.

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
| caught / thrown | 232/271 | **2/32** | 124/140 | 10/32 | 366/409 | 21/32 | 32/32 | 20/32 |
| time to throw, s | 2.20 | 2.50 | 2.40 | 2.45 | 1.40 | 1.40 | 1.25 | 1.50 |
| catch depth, yd | −3.0 | −2.2 | −2.6 | −2.5 | −1.6 | **+3.5** | −0.9 | −1.0 |
| first OL past the LOS, s | 1.9 | 3.6 | 1.4 | 3.6 | 1.0 | – (no OL release) | – | 3.1 |
| blockers / threats ahead at the catch | 2/2 | 2/2 | 2/2 | 2/1 | 2/2 | 1/1 | 2/3 | 1/1 |
| first defender reaches carrier, s after catch | 1.0 | 2.1 | 1.1 | 1.5 | 0.9 | **0.1** | **2.7** | 0.3 |
| …and he was unblocked | 57% | 100% | 60% | 60% | 53% | 100% | 88% | 67% |
| yards (all plays) p50 / mean | 6 / 6.9 | 0 / −1.5 | 7 / 7.6 | 0 / 2.7 | 5 / 5.6 | 22 / 39.6 | 11 / 12.5 | 15 / 25.9 |

## What the lab shows (ranked by frequency × consequence)

1. **The RB slip screen fails: 2 of 32 completed.** On the traced snaps
   (seeds 1, 2, 3 and 5 vs Cover 3), the weak-side DT comes free up the middle
   when the center releases. He reaches the QB 2.3–2.5 s after the snap, so
   the QB is sacked, throws it away, or throws while wrapped. His wobbly ball
   on seed 1 was caught by the released LT, ruled illegal touching. The QB
   sits at his 5-step depth instead of drifting and throwing over the rush,
   and the back reaches his spot about 0.3–0.5 s later than NFL backs.
   Candidate mechanisms:
   - QB drift and launch timing on slow screens;
   - the center's job (the research has the playside G, C and backside G
     release, plus a "rat killer" who stays home);
   - the back's cue (release when he sees the guard go, not on a count).

   The TE screen shares the timing problem (10 of 32 completed).
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

- Make the slip screen a valid test, starting with QB drift/timing and the
  center's job. This needs a decision: on screens, the QB is a shared
  controller.
- Hand item 2 (screen recognition and rally) to Defense.
- After that, use the lab to judge blocking in space itself: arrival margin,
  sheds, and whiffs.
