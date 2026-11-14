# Receiver release vs press: measurement and design note (no code)

Run Game for Integration, 2026-11-14, on engine-64 (develop 3d445688 merged into run/G3-oz-backfield). Step 1 of
the press-release assignment: measure with one operator on NFL tracking and ours, then source the techniques
([sources](../football-handbook/press-release-sources.md)), then this note before any code.

## Operator and populations

`scripts/diag/release/press-release.py` (docstring has every definition). Outside receiver = widest WR/TE on his
side, running a route, non-designed dropback. "Pressed": nearest DB within D yd at the snap, no deeper than 2.5 yd
past the line. `--holds` drops corners who gain 1+ yd of depth by 0.6 s (bailers: 50 of 3,903 NFL, 0 of ours).

- NFL: BDB 2025 weeks 1–9 (out/cross/nfl-plays-ids.jsonl.gz).
- Ours: league games almost never press (9 pressed outside receivers in 5,691 across 32 games), so staged reps:
  `scripts/diag/release/press-lab.mts`, Cover 1 (press) vs gun trips four_verts, gun doubles four_verts, gun
  doubles comebacks, 12 seeds × flip = 72 dropbacks, 144 outside receivers. Under `npm run ref` the output is
  byte-identical (stack = defaults for these flags).

**Definition change, stated before comparing:** the 2.0 yd "pressed" cut excluded every one of our reps. NFL
pressed alignment is gap 2.00/2.28/2.55 yd (corner 1.4 deep, receiver 0.8 off), and ours is 2.30/2.31/2.50 (1.3 and
1.0). So our alignment is NFL-like, and the 2.0 cut was too tight on both sides. Tables use D = 3.0 (NFL 3,903
receivers, 24% of outside receivers; 2,534 reach 5 yd). At 2.0 the NFL numbers move by 1 point or less.

## Step 1 results (p25/p50/p75)

| | NFL | ours (Cover 1 press lab) |
|---|---|---|
| time to 5 yd | 1.80/2.00/2.20 | 2.10/2.10/2.10 |
| lateral at 1 yd (outward +) | −0.80/+0.10/+1.00 | +1.20/+1.30/+1.40 |
| lateral at 5 yd | −2.60/0.00/+3.40 | +3.80/+4.00/+4.30 |
| speed 0.3/0.5/0.7/0.9/1.1 s (median, yd/s) | 0.56/1.46/2.46/3.47/4.37 | 0.56/1.46/2.57/3.47/4.25 |
| speed release / jab-stutter / through (close contact) | 59% / 6% / 33% | 86% / 1% / 14% |
| stutter t5 | 2.00/2.20/2.40 | (n 1) |

Release side by route and corner shade (released outside / n):

| route | outside shade | head-up | inside shade | lateral at 5 yd |
|---|---|---|---|---|
| NFL GO | 132/235 (56%) | 476/634 (75%) | 139/154 (90%) | 1.0/3.2/4.6 |
| ours go | 14/20 (70%) | 72/72 (100%) | – | 3.8/4.0/4.3 |
| NFL HITCH (incl. comeback, curl) | 14/98 (14%) | 154/248 (62%) | 45/57 (79%) | −1.9/1.2/3.3 |
| ours comeback | 7/10 (70%) | 36/36 (100%) | – | 3.9/4.1/4.2 |
| NFL SLANT / IN / POST | 0–5% | 6–15% | 10–52% | inward |

What the numbers say:

1. **The side is a fixed rule, not a read.** Against a head-up corner every one of our receivers releases outside;
   NFL go receivers do so 75% of the time, hitches 62%. Shade moves the NFL release strongly (go: 56 → 75 → 90% outside from
   outside to inside shade). Ours moves only past 0.3 yd of shade. Source: `receiver.ts` PRESS_RELEASE picks the
   route's break side (outside on any vertical) and flips only for a shade beyond 0.3 yd. No input from what the
   corner does after the snap.
2. **Stop routes release like gos.** Our comeback runs the go's release, 4.1 yd wide at 5 yd; NFL hitches are 1.2
   (and 14% outside against an outside shade). The sources teach a modest release on stop routes that keeps the
   corner on the inside shoulder.
3. **No jab exists.** 1% stutters (one incidental) vs 6% in the NFL; NFL stutters cost +0.2–0.3 s to 5 yd.
4. **Every rep is the same rep.** t5 2.10 in all 138 reps (NFL IQR 0.4 s); identical lateral paths across seeds.
5. Speed through the first second matches; the corner's hands are not the gap. Our close-contact share is 14% vs
   33%, but see the label check: in both datasets "contact" mostly marks a close pass-by at 1.0–1.4 s rather than
   a jam at the snap. Not used as evidence.

### Label checks (20 reps printed with `--list 4`: gap and lateral offset every 0.2 s)

- NFL "speed" reps: gap 2.0–2.6 at the snap falls to 1.3–1.8 by 1.4 s, no contact, side change visible in dy.
  Labels correct.
- NFL "through" reps: the gap reaches ≤1.0 at 1.0–1.4 s as he runs past the corner (e.g. 2022091200-3723 at
  0.8 yd at 1.4 s, dy 0). That is a close pass-by, not a jam at the snap, so "contact" here means bodies within
  1 yd, not hand fighting.
- Ours: identical traces rep to rep (gap 2.3 → 1.1 by 1.4 s; dy 0 → +0.8 outward, starting at 0.4 s).
  "Outside shade" reps at dy −0.3 released outside (the 0.3 yd override threshold), at −0.7 inside.
- 2022091101-686 (earlier 2.0 yd run) is a bailing corner; `--holds` now removes those.

## Step 3: design note (for approval; nothing built)

**RELEASE_READ (off)**: the pressed receiver plans, jabs and reads the corner from his own picture. It replaces only
the side choice in the PRESS_RELEASE branch of `RouteRunner.handleRelease`; the corner's jam, hands and mirror are
unchanged (Coverage's files untouched).

1. **Plan (at the snap, from what he saw).** He sees the corner's shade as he sees it (`sim.see`). His preferred
   side is the route's (outside on a go; break side otherwise). If the corner is shaded away from that side, or the
   route is a stop route, there is no reason to jab: speed release, attacking 1–2 yd past the corner's leverage on
   the preferred side. If the corner is head-up or sits on the preferred side, he plans a jab: one quick step to the
   other side (toward a shade, opposite the preferred side when square).
2. **Jab = real steps.** The jab is a lateral request at the LINE_START get-off drive for one step (his own stride
   time, about 0.25–0.3 s), not a timer on the result. It costs what a lateral step costs: no upfield drive in that
   step. Better route runners step quicker and sharper (existing `cutSkill`/drive scaling), not "win more".
3. **Read.** After the step, with his own perception delay, he compares the corner's seen lateral movement and
   position with his own. If the corner followed the jab (seen lateral velocity or position shift toward it beyond
   his body radius' worth), he releases the other way. If the corner sat, he releases to the preferred side. Either
   way the release then uses the existing PRESS_RELEASE path, width and RELEASE_THROUGH.
4. **Why it can fail.** Our corner already mirrors the receiver's seen position with reaction delay (PRESS_MIRROR,
   `defense.ts` 1157). A quick corner with a short delay recovers. A patient corner (Coverage's call; dependency
   noted, not built here) gives the jab nothing to read, and the receiver has spent a step. Nothing is banned or
   capped.
5. **Stop-route width (second attempt only, if the read alone leaves finding 2).** A stop route's release clears
   the corner's body and reach and then returns to its stem line, keeping the corner on his inside shoulder. It
   does not hold the go's wide line. This is a separate change and gets its own read.

**What would answer it (stated before results).** On the same lab (same bodies, seeds, Cover 1 press),
release side by route × shade moves from 100% outside head-up toward a mixed split that depends on the corner. Jabs
appear on head-up/same-side shade reps and cost time to 5 yd (positive Δt5 on jab reps). Off-coverage receivers
change on 0 reps. Not a target: matching 75%/62%. If jab reps lose time and gain no side wins against our
mirroring corner, that is a finding about the corner's patience, not a number to tune.
**Controls.** Off-coverage receivers (unchanged by construction; checked); a placebo seed pair; an inside-shade
go, which should stay a speed release outside. **Witness fixtures.** The press lab above; Coverage's SOLO_JAM
fixture (coverage/C14-solo-jam, not on develop) if they want it read there.
**Not changed.** Press alignment, the corner's mirror/jam/hands, QB timing, ratings coefficients.
