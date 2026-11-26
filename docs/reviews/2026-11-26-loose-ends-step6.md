# Step 6: loose ends from step 5 (2026-11-26)

Rules + Coaching, for Integration. Base: develop b53912bf8. Each item is its own commit and its own flag (default on,
`=0` restores).

| item | flag | ordinary calls | game digests (seeds 1-8) |
|---|---|---|---|
| 1. Defenders key the back they see | `BACK_SEEN` | play-identical (3 staged single-back calls) | all 8 change |
| 2. The climber's surface by where defenders stand | `SURFACE_ON_LINE` | play-identical (ordinary Over vs ace_11) | all 8 change (with item 1) |
| 3. F carrying: the LB_M carrier, and 3.00 vs 6.77 yd | none | — | — |

**Digests.** Method as in steps 4 and 5. With `BACK_SEEN=0 SURFACE_ON_LINE=0` the branch reproduces develop's 8
digests exactly. With both on, all 8 differ (seed 1: 146 plays, 30-19, `1aef6c0da9088114`).
- A game diverges from its first affected snap: the game state and random draws differ from there on. So the per-game
  digest cannot isolate ordinary calls. The staged cases below are the identity check: the ordinary calls give the same
  per-play event hash on and off.
- Every game calls split-back and empty sets, which item 1 changes.

## 1. Defenders key the back they see (`BACK_SEEN`, `src/sim/seen-back.ts`)
**The rule.** A defender's back key is a backfield player he observes at the snap:
- behind the line, inside the core (no wider than 1 yd outside the core's edge), and not the passer;
- with two backs at different depths, the deeper one: the I tailback, the gun mesh back. This is the taught I-formation
  key: the backers read the tailback through the fullback (the "near back" in split backs);
- with level split backs (within 0.25 yd of the same depth), the back nearer his own aligned spot: the near-back key
  for split backs;
- with none (empty), no back key.

**Per site: what the label gave him that he could not see.**

| site | what it is | the rule that applies | the label's extra information |
|---|---|---|---|
| defense.ts 886 | the holder or the back a defender watches | the deeper back; split: the near back | which of two level split backs is the tailback |
| defense.ts 1481 | the installed backfield read | the same | the same |
| defense.ts 1535 | blocking support (is the back blocking) | the same | the same |
| run-fits.ts 517 | the HONEST_READS runner fallback | the same | the same |
| run-fits.ts 525 | the fit's back when no picture names one | the same | the same |
| engagement.ts 2232 | the engaged defender's ball key | the same; empty: none | the tailback among split backs, **and a phantom back in empty sets**: the detached RB, wherever he stood |
| engagement.ts 2239 | the engaged run-contact read | the same | the same as 2232 |
| recognition.ts 384 | run/pass recognition's back | the same; empty: none | the same as 2232: it did not check the backfield |

So defenders learned two things from the label that they could not see:
- **Which split back is the tailback.** In gun split and the 21/20 split sets, RB and H stand level, 4.7 yd deep and
  2.4 yd either side. The label always pointed the backers at the RB. That is usually the carrier, the offense's private
  assignment.
- **A back in an empty set.** The detached RB, split out as a receiver, was still recognition's and the ball key's
  "back".

**What removing it costs (staged, 16 seeds each; `scripts/diag/ir/back-seen.ts`).**

| case | key (Mike, Will, Sam, 3-tech), on | mean yd off → on | per-play hash |
|---|---|---|---|
| ace_11 inside zone vs Over base | RB, RB, RB, RB | 7.92 → 7.92 | identical |
| gun_doubles_11 inside zone vs Over nickel | RB | 4.91 → 4.91 | identical |
| gun_doubles_11 stick vs Over nickel | RB | 13.81 → 13.81 | identical |
| I pro, F carries (inside zone) vs Over base | RB (the tailback) | 3.84 → 3.84 | identical |
| empty: gun_empty_11 stick vs Over nickel | none | 9.98 → 9.34 | changes |
| split: gun_split_11 inside zone vs Over base | Mike H, Will RB, Sam H, 3-tech H | 14.50 → 7.27 | changes |

- **Ordinary single-back calls are play-identical.**
- **I pro with F carrying.** The rule keys the tailback (RB), the deeper back, as the label did. So the defense does
  **not** read the fullback's path from its key. The FB dive works on backers keying the tailback, as it is meant to.
  The defense reaches the real carrier through the ball key and flow, as before.
- **Empty.** No back key. Mean yards 9.98 → 9.34.
- **Split backs: the cost of removing the label is negative here.** Mean yards fell from 14.50 to 7.27.
  - On this inside zone, H crosses the formation to lead on DE_W (+3.2 yd lateral by 1.2 s) while the RB meshes the
    other way.
  - With the label, the Mike keyed the carrier and flowed with him: −1.9 yd lateral by 1.2 s.
  - Keying the near back, H, he flows −0.8 yd. The crossing lead holds him, so he is home for the cutback.
  - Per seed, off: 9.0 7.2 8.9 9.8 7.1 4.0 14.0 −0.1 75.0 7.9 0.7 12.0 2.9 10.9 62.6 0.1.
  - Per seed, on: 4.2 1.1 4.4 1.5 1.5 0.3 8.0 2.8 65.6 1.2 0.4 3.9 0.7 10.4 9.8 0.6.
  - This is one look against one concept, so it is not a verdict on split-back runs. The near-back key is the taught
    rule. It costs the defense against plays where the near back is the carrier, and that case was not staged.

## 2. The climber's surface picture (`SURFACE_ON_LINE`, blocking.ts `onLineSurface`)
**The rule.** The first-level surfaces a climbing blocker steers around are the defenders who, at the snap, stand:
- within 2 yd of the line (FIT_RULES's LINE_DEPTH), by where they stand (the snap alignment);
- and no more than 2 yd outside the core (the end man). Without this limit a pressed corner at 1.3 yd would count.

**Not used: FIT_RULES's 2-3 yd rusher clause.** It reads the defense's own call (who rushes). That call is private to
the defense, and a blocker cannot see it. Without the clause, the okie rover (2.6 yd) is second level, as ruled.

**Staged (16 seeds; `scripts/diag/ir/surface-on-line.ts`).**

| case | within 2 yd at the snap | climber ticks with a detour, off → on | mean yd off → on | per-play hash |
|---|---|---|---|---|
| ace_11 inside zone vs Over base, double-A mug, cover 1 | DE_W, DT_S, DT_W (and the pressed corners, excluded by width) | 605/3384 → 600/3384 | 3.92 → 3.92 | identical |
| gun_doubles_11 inside zone vs okie nickel, cover 3 | DE_W, DE_S, DT_S (the rover DT_W at 2.6 is not) | 412/2327 → 312/2291 | 1.24 → 1.21 | changes |
| ace_11 inside zone vs Over base, cover 3 (ordinary) | DE_W, DE_S, DT_S, DT_W | 158/2101 → 158/2101 | 7.92 → 7.92 | identical |

**Ruling conflict: the mug.**
- The ruling names the mug as part of the surface. But the sim's double-A muggers stand at 2.4 yd (CREEP_DEPTH), with
  role blitz. The rover stands at 2.6 yd.
- So the 2-yd test leaves the mug out, as FIT_RULES does: a blitzer is never a front player there.
- A single depth that takes the mug and leaves the rover would have to fall between 2.4 and 2.6 yd. That would be fitted
  to these two cases, so I did not choose one. It needs a ruling: either the mug's creep depth, or what tells a blocker
  "mug" from "rover" at the snap. Stance is one candidate, but the sim has no observable stance.
- **The mug case is therefore play-identical.** Its one change from the label set is real but has no consequence here:
  the man-dropping DE_S stands 3.9 yd off and is no longer a surface.

## 3. I pro, F carrying
**(a) LB_M as the carrier on 1 of 16: not a bug.** Play 14 was a fumble:
1. 1.05 s: handoff QB → F;
2. 2.90 s: fumble F → LB_M;
3. 3.10 s: LB_M recovers;
4. he is then tackled.

**(b) F 3.00 yd against the RB's 6.77.** There are two causes. One is a label still acting.
- **The body and the depth.**
  - F is a fullback: 109 kg, top speed 8.96 yd/s, aligned 4.30 yd deep.
  - The RB is 103 kg, 9.46 yd/s, 7.50 yd deep.
  - F meets the line sooner with less speed and less time to read the blocks.
  - F's yards by seed: 2.4 4.8 5.3 4.1 3.2 −0.1 2.6 2.5 4.8 1.4 8.8 −0.3 −0.0 0.9 (fumble) 7.9 (15 of 16 recorded).
  - The RB carrying: 6.3 8.0 9.9 0.8 10.4 9.6 5.4 9.8 3.3 6.0 11.2 4.8 1.9 1.4 9.0 10.4.
- **A label still acting: the lead back.**
  - Blocking's `secondBack(sim)` is `offAlign.numbering.B2`. The backs are numbered RB first, by label, so B2 is F, the
    carrier.
  - No lead plan goes to the back who is not carrying. The RB falls into the stalkers and stalks the FS, instead of
    leading through the hole as a tailback would on a fullback dive.
  - The fix is to name the lead back from the description's roles (the back who is not the carrier). It is outside this
    step's list and not done here; nothing was tuned.

## Checks
- IR suites and the red-diff: see the PR body.
