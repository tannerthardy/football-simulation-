# Run-blocking assignments against written gap and zone rules

Audited 2026-10-21 on `develop` `d91c9014`, default flags. Engine source is
unchanged. The question: does `planRunBlocking`
(`src/sim/behaviors/blocking.ts`) give each blocker the man a written rule
would give him, against the three fronts the engine installs most often? The
rules come from the FootballXOs spread playbook's power, counter and trap pages,
the user-supplied 2020 Browns OL manual (see
[external playbook sources](../references/nfl-playbook-sources.md)) and the
[trenches chapter](../football-handbook/trenches.md).

This is an assignment (installed responsibility) audit. It says nothing about
technique, contact or achieved movement. The outcome columns give context only:
more or fewer yards is not the criterion.

## Reproduce

```sh
node --import tsx scripts/diag/run-plans.ts i_pro_21 power,counter,trap,iz_strong,oz_strong over,under,odd      # plans only, instant
node --import tsx scripts/diag/run-plans.ts i_pro_21 counter under 150                                         # plus outcomes
```

The script prints each blocker's snap-time plan (yards from the ball, + =
playside, `L` = off the line), the box defenders no plan names, and optional
forced repetitions. Those use I-form Pro, no coaches, alternating flip and
Cover 2/3, and 0.55-strength generated rosters. Outcome runs took 0.3–2 s per play on `develop`.

## Already fixed on `develop`

The same audit on the older `3b5bf9b` checkout found two errors that `develop`
has since repaired independently, and its code comments describe both:

- **Gap schemes:** the playside tackle down-blocked a 1-technique two yards
  inside him while the guard over it climbed. Counter vs. Over gained zero or
  less on 73% of carries and power vs. Under on 83% (200 reps each), and the
  free defender made most tackles. `develop` now assigns inside-out
  (`gapLine` sorted by distance from the ball) and has the center cover the
  pulling guard.
- **Trap:** every playside lineman except the center left his man for one
  trapper. `develop` reserves exactly one trap defender.

The `off > -2.0` window is still in the code. Inside-out ordering is what now
prevents the tackle from crossing a guard's man, so keep that ordering if the
loop is restructured.

## Remaining mismatches

Fronts and alignment are the engine's as installed (`FRONTS` in
`src/playbook/defense.ts`); positions are snap-time yards, + = playside.

### 1. Linebacker ownership on power: puller idle or sent backside

**Rule (spread p. 66; common to gap schemes):** the PST/PSG combo works to the
*backside* linebacker. The puller wraps through the hole for the first
linebacker to show *playside*.

**Engine:** non-pullers claim linebackers first through `lbNear` in the
combo and climb branches. Pullers then take whoever remains.

| Cell | Combos and climbs take | Puller gets |
|---|---|---|
| power vs. Odd | RG ⇒ LB_W (−1.4), RT ⇒ LB_M (+1.3) | **nobody** (pull/lead with no target) |
| power vs. Over | Y climbs to LB_S (+3.5), RG ⇒ LB_M | LB_W at **−2.0**, behind his own pull |

**Proposed rule:** reserve the playside linebacker for the lead puller before
any combo or climb picks. Send combos to the backside linebacker. On counter,
the lead puller's target is already reasonable (Mike or Will through the hole).

The Browns OL manual (pp. 31–32, 37) gives a more general form. The center
calls numbered linebacker *spots*: "Deuce" or "Trey" doubles go to a
called spot, and the pulling guard wraps for a *designated* linebacker
("OH at 6-7"). So the planner should allocate the double's backer and the
puller's backer **jointly**, from one called count of box linebackers.
Neither should be left with nobody while the other takes a backer behind
the play.

### 2. Backside cutoff takes the outside man first

**Rule:** a backside hinge or cutoff blocker protects his *playside* gap first,
because that is the gap the pullers just vacated. The defender outside him is
the lower priority.

**Engine:** the backside branch takes the nearest defensive lineman by lateral
distance. In counter vs. Under, Y (−3.9) takes the 9-technique LB_S (−4.6,
0.7 yd outside). The 5-technique DE_S (−3.1, 0.8 yd inside, in Y's playside
gap) goes free behind both pullers.

**Proposed rule:** for backside cutoff, prefer an unclaimed defender in the
playside gap. Take the outside defender only when that gap is empty. The
Browns OL manual's "post hinge" (p. 33) states the same order for the
backside tackle or TE on power: the most dangerous man from his *inside* B
gap to his outside C gap.

### 3. Fullback with no target while a box defender is free

The FB lead falls back to `lbNear(…)`, which returns `null` once every
linebacker is claimed. Seen in counter vs. Under (DE_S free, see 2) and trap
vs. Odd (backside DE_W free). On counter the fullback typically takes the
backside edge the pullers vacate; on trap or zone with nobody left at the
second level, he takes the unblocked end (insert or slice).

**Proposed rule:** if the FB's primary target class is exhausted, take the
most dangerous unassigned box defender, backside edge first on counter and
trap.

### 4. Trap vs. Under traps the 5-technique

`trapReserved` is the first defensive lineman at least 1.05 yd playside. In
the Under, the strong side has a 1-technique, so the trap target becomes the
5-technique outside the tackle: a long-trap shape. The spread playbook runs
trap at the 3-technique and lists Under and Bear as fronts it **does not**
run trap against (p. 63). That is a play-calling fact (`beats` for `trap` in
`src/playbook/concepts.ts`). The Browns OL manual installs "trap or log at
6-7 hole", a long trap of the strong-side EMOL (p. 37), so the shape is
legitimate football. The defect is only that one `trap` call silently
becomes a different play by front. Either name long trap as its own concept
or have the caller avoid trap against the Under.

## Plans and outcomes on `develop` (150 reps per cell)

| Concept | Front | Unassigned box / idle blocker | Median | ≤0 yd | 2–5 yd | 10+ yd | Leading tacklers |
|---|---|---|---:|---:|---:|---:|---|
| power | Over | puller → backside LB_W | 1.1 | 29% | 21% | 7% | DE_S 43, LB_M 37 |
| power | Under | — | 4.6 | 7% | 36% | 7% | FS 55, LB_M 38 |
| power | Odd | DE_W (backside); **puller idle** | 4.6 | 7% | 34% | 13% | FS 40, LB_M 30 |
| counter | Over | — | 5.3 | 3% | 39% | 20% | FS 47, LB_W 28 |
| counter | Under | **DE_S (vacated gap)**; **FB idle** | 3.1 | 17% | 27% | 17% | **DE_W 30**, FS 28 |
| counter | Odd | — | 3.2 | 5% | 35% | 13% | FS 49, LB_W 28 |
| trap | Over | — | 2.6 | 3% | 33% | 7% | LB_S 71, LB_M 19 |
| trap | Under | — (traps the 5-tech) | 2.5 | 7% | 25% | 9% | LB_M 71, DE_S 23 |
| trap | Odd | DE_W (backside); **FB idle** | 5.4 | 4% | 24% | 17% | LB_M 47, FS 33 |
| inside zone | Over | — | 2.5 | 9% | 29% | 7% | LB_M 56, LB_S 23 |
| inside zone | Under | — | 3.8 | 4% | 22% | 17% | LB_M 49, FS 33 |
| inside zone | Odd | — | 4.8 | 11% | 25% | 19% | FS 38, LB_M 28 |
| outside zone | Over | — | 1.0 | 39% | 25% | 6% | DT_S 41, DE_S 23 |
| outside zone | Under | — | 1.3 | 25% | 17% | 9% | LB_M 36, LB_S 24 |
| outside zone | Odd | — | 0.7 | 43% | 23% | 8% | DE_S 41, LB_W 26 |

Outside zone stands out without an assignment explanation: 39% of carries vs.
Over and 43% vs. Odd end at or behind the line, with a playside lineman (the
3-technique, or the 9-technique end) as the leading tackler. The assignments
match the zone rule (reach plus an uncovered helper's combo), so look at reach
technique and the back's bend/bounce read, not at the planner.
One installed answer to exactly this front is the Browns manual's wide-zone
"Rake" (p. 25): the uncovered playside tackle hand-slams the 3-technique to
keep C-gap width before climbing. The planner already pairs C and RG on the
3-technique (their "wide single", p. 24), so Rake would be a technique
option, not a different assignment.

An unblocked *backside* end on zone or power is often by design (cutback
constraint, boot or read key). The findings above are about *playside* or
vacated-gap defenders and idle blockers.

## Limits

- One formation (I-form Pro) and three fronts; mirrored with flip. Gun, 11
  personnel and nickel fronts were not audited.
- Outcomes use generated rosters and fixed calls. They are not NFL
  comparisons, and they do not show that a proposed rule improves the
  football. Use the mechanism and film review in
  [behavior review](../BEHAVIOR_REVIEW.md) for any change.
- Front alignments were not checked against a source. Systems differ on, for
  example, the Over front's strong-end technique.
- Run blocking has owners on the [workboard](../WORKBOARD.md). These are
  proposals for them, not claims on their files.
