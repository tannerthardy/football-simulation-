# The pre-snap side of the quick game, as taught (2026-11-14)

Spec only; no build. Rules + Coaching for the QB lane, which builds it after the key read (Integration's schedule).

**The gap.** The sources teach the quick game as a decision at the line. The quarterback picks a side, or takes an
alert, from what he sees before the snap: corner cushion and press, the apex defender, the safety count, and numbers.
Ours has none of that inside a called quick concept:

- the plan's order fixes the side;
- an alert is not honoured on a keyed plan (QB lane, 2026-11-14);
- the only pre-snap quick-game logic is `QBMind.quickCheck`. It is an audible out of a loaded-box run or a killed
  screen into hitches, quick outs or slant-flat, chosen by the average corner depth (> 5 yd, < 2.5 yd), with no
  source given.

**What the QB can use.** Every look below is something he can see at the line, with his alignment noise (QB_SEEN_MAN's
`sig`). He never reads a defender's assignment or the called coverage. A shell is a hypothesis, not the coverage
(Moorhead: it "narrows the coverage menu but doesn't confirm the post-snap structure"). That holds here as in the NFL:
a two-high look before the snap is a single-high call after it on 38% of NFL dropbacks, and 32-39% of ours (table
below).

## The table

The pool's quick concepts are the ten the QB runs on a quick or gun-three drop. Sides: a concept installed on both
sides (mirrored) can pick one; a strong-side concept has a fixed side, and only an alert can move the ball off it.

| concept (ours) | taught as | the look at the line | what it selects | if the look is ambiguous | source |
|---|---|---|---|---|---|
| `hitches` (mirrored) | All Hitch | each corner's cushion over #1 | the side with the softer corner, then outside hitch to inside hitch | cushions within 1 yd: the wide side of the field | Maurek, Konecki and Banks, *The Quick Game* (High Speed Spread, 2010); hitch depth 4-5 yd |
| `quick_outs` (mirrored) | Quick Out ("Owl") | each corner: soft or pressed | a soft corner to one side: the quick out that side. Both corners pressed: the fade (the outside receivers convert to the fade when pressed) | no mismatch: the progression, #2 to #3; "assume man coverage until they recognize zone" | Kratzer, *The Quick Game* (AFQ, 2020) |
| `slant_flat` (mirrored) | slant/arrow ("skinny and arrow") | the safety count; the apex defender's run-support position (in the box or walked out) | one-high: the slant-flat side. The apex's position decides skinny (slant) or arrow (flat) | the wide side of the field | Lombardo (Football Toolbox; "one-high safety look: go to the slant/arrow or spot/arrow side"); Maurek et al. ("the QB's presnap read should be the OLB's run support position"); Playbooktech slant-flat sheet ("if the defense plays 1 deep safety read the slant flat side") |
| `fade_flat` (strong) | Cover 2 beater, cloud-corner read | the safety count; press over #1 | two-high: the concept as called (its corner read after the snap). Zero high: the fade shot | run as called | Lombardo ("cover zero: take a shot on the inside fade"); Kratzer (press: the fade) |
| `stick` (strong, from trips) | Y-Stick | the flat defender (who he is); the vertical | name the flat defender before the snap; "peak" the vertical (two-high: the hole shot "is usually the best route if the quarterback can throw" it) | the stick read after the snap | Wilhite, *What is Y-Stick?* |
| `seam_hitch` (mirrored) | In and Seam | the safety count and the single safety's leverage | one-high: the seam away from the safety's leverage, then the hitches; "look for the most grass" | the hitches | Maurek et al. |
| `double_slants` (strong) | double slants | the safety count | fixed side as installed; no pre-snap rule sourced beyond "pick a side pre-snap, read inside out" (our install has one slant side) | as installed | Playbooktech double-slants sheet (weak); Lombardo: against one-high, pair an in-breaker with an out-breaker |
| `trips_stick` (backside W1 go) | trips stick with a backside alert | the isolated backside #1: pressed, with no deep defender on his side | the alert: the backside fade, before the stick read | no alert; the stick read | no stick-specific source. The pieces: Kratzer (pressed: the fade; both press: a mismatch, the fade), Lombardo (zero: the fade shot). **Weak**: the QB lane decides whether to build it |
| `hitch_out`, `seam_slant` (strong) | — | none sourced | fixed side; no alert | — | none found; stays as installed |

What no row does:

- A **press conversion** (hitch to hitch-and-go, out to fade) is the receiver's rule at the line (Kratzer), not the
  QB's choice. It belongs to the route lane, if anyone's.
- A **hot throw against a blitz** ("blitzes alert H, Y and B that they are automatically hot", Kratzer) is the QB
  lane's existing hot rule, not a pre-snap selection.

## How often each look occurs, at the snap

`scripts/diag/eyes/presnap-looks.py` reads both sides with one operator. It works from geometry only, at frame 0 (see
its docstring).

- **NFL:** BDB 2025 weeks 1-6, traditional non-play-action dropbacks with no screen route (3,873).
- **Sim:** develop 3c2f968d exports (seeds 101/105/109/113, 4 games each; 1,117 dropbacks), the same filter by concept
  name.

What the operator was checked to see (CLAUDE.md, an inferred category):

- **The defender "over #1" against labels**, 800 plays a side: NFL 78% CB, plus 5% safeties rolled down, 6% OLB and 6%
  no defender within 4 yd; sim 92.5% CB_S / CB_W.
- **#1 must be a wideout** (9+ yd from the ball). At 6 yd, 23% of the NFL picks were edge players over a slot or wing.

| look | NFL | sim (all) | where it decides |
|---|---|---|---|
| shell: zero / one-high / two-high | 5.4 / 33.8 / 60.8% | 9.7 / 39.2 / 51.1% | slant_flat, fade_flat, seam_hitch, stick |
| two-high before the snap, single-high call after | 38% | 32-39% | how far a shell can be trusted |
| corners pressed: both / one side | 11.2 / 31.7% | 18.6 / 9.7% | quick_outs (both: the fade), fade_flat |
| soft corners (5+ yd): both / one / none | 11.5 / 36.3 / 52.2% | 32.6 / 28.8 / 38.6% | quick_outs, hitches |
| a clear softer side (1+ yd apart) | 34.9% | 30.7% | hitches (else: the wide side) |
| apex over #2 walked out: both / one / none | 16.4 / 61.1 / 22.5% | 11.5 / 53.8 / 34.7% | slant_flat (skinny or arrow) |
| a side outnumbered (defenders > receivers outside the box) | 27.6% | 23.4% | (screens and RPOs: `screenLook`) |
| 3x1: the backside #1 pressed with no deep defender on his side | 8.4% of 1,563 | 13.6% of 514 | trips_stick's alert |

The per-concept rows (the looks on the sim's calls of each concept, n 18-46 each) are in the script's output.

**The size, for the QB lane:** about a third of quick-game snaps have a clear side by cushion or press. About two in
five have a shell that sends slant_flat to a side. The fade alerts are rare: both corners pressed 11% in the NFL;
the isolated, uncovered backside 8%.

## What the measurement shows about our defense, not the QB

Our corners align as a pair: both soft (32.6% vs 11.5%) or both pressed (18.6% vs 11.2%). One-side press is a third
as common as the NFL's (9.7% vs 31.7%). The NFL mixes, a pressed boundary corner and an off field corner. So a
pick-the-softer-corner QB sees fewer clear sides here than he would in the NFL, through the defense's alignment, not
the QB's read.

That is the Defense / Coverage lanes' alignment (dbSpot), and worth their look before the QB lane's build is
measured. Our shells are also a little more one-high and zero (48.9% vs 39.2%).

## Commands

```sh
python3 -I scripts/mechanics/nfl_bdb2025.py --weeks 1 2 3 4 5 6 --plays-out out/mechanics/nfl-plays-ids.jsonl.gz --out out/mechanics/nfl-ids.json
for s in 101 105 109 113; do node --import tsx scripts/mechanics/sim-export.ts --seed $s --games 4 --out out/x16/e-$s.jsonl.gz; done
python3 -I scripts/diag/eyes/presnap-looks.py --data data/raw/bdb2025/big-data-bowl-data nfl=out/mechanics/nfl-plays-ids.jsonl.gz sim=out/x16/e-101.jsonl.gz,out/x16/e-105.jsonl.gz,out/x16/e-109.jsonl.gz,out/x16/e-113.jsonl.gz
```

Sources:
- J. G. Maurek, J. Konecki, T. Banks, "The Quick Game", High Speed Spread Football (2010): http://highspeedspreadfootball.blogspot.com/2010/01/quick-game.html
- D. Kratzer, "The Quick Game", AFQ X's and O's (2020): https://xsandos.americanfootballquarterly.com/5900-2/
- T. Lombardo, "Gain the Upper Hand in Quick Game vs. Any Coverage with These Pre-Snap Reads", Football Toolbox: https://footballtoolbox.net/offense/gain-the-upper-hand-in-quick-game-vs-any-coverage-with-these-pre-snap-reads
- E. Wilhite, "What is Y-Stick?": https://emorywilhite.substack.com/p/learning-to-teach-y-stick
- "Coverage Before Concept: Joe Moorhead's QB Pre-Snap Framework", Coach and Coordinator: https://coachandcoordinator.com/?p=14600
- Playbooktech slant-flat and double-slants sheets: https://firstdown.playbooktech.com/editable-plays/2590/slants-slant-flat, https://firstdown.playbooktech.com/editable-plays/4778/double-slants-slant-flat
