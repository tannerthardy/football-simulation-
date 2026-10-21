# Run-blocking assignments against coaching doctrine

Audited 2026-10-21 against branch `claude/great-mccarthy-85uf8b` (parent
`3b5bf9b`). Engine source was not changed. This review checks the snap-time
plans from `planRunBlocking` (`src/sim/behaviors/blocking.ts:243`) against
standard gap- and zone-scheme rules. The rules come from the FootballXOs spread
playbook's power, counter and trap rule pages and from general coaching
doctrine (see [playbook references](../PLAYBOOK_REFERENCES.md)). Then it
measures what the assignment errors cost.

**Summary:** several of the worst run cells are assignment errors, not
physics or ratings. Power against the Under front is stuffed 83% of the time
and counter against the Over front 73%. In both, a playside tackle is told to
down-block a 1-technique two yards inside him while the guard over that
defender climbs. The defender left in the gap makes most of the tackles. One
narrowed window cuts those rates to 33% and 21% in an experiment (below). That
is evidence for the diagnosis, not the fix. The other defects: blockers who
get no target while box defenders go free, a trap rule that leaves every
playside lineman except the trapped one unblocked, and a playside 5-technique
nobody blocks on counter against the odd front.

## Reproduce

```sh
node --import tsx scripts/diag/run-plans.ts i_pro_21 power,counter,trap,iz_strong,oz_strong over,under,odd 200
```

The script prints each blocker's plan (positions in yards from the ball, + =
playside; `L` = off the line), the box defenders no plan names, and the
outcomes of 200 forced repetitions. The calls are fixed (I-form Pro, no
coaches, alternating flip and Cover 2/3, 0.55-strength generated rosters), so
these are E1 mechanism cells, not NFL comparisons.

## Baseline (200 reps per cell)

| Concept | Front | Median | ≤0 yd | 2–5 yd | 10+ yd | Leading tacklers | Unassigned box defenders |
|---|---|---:|---:|---:|---:|---|---|
| power | over | 0.2 | 43% | 8% | 7% | LB_M 46, SS 41 | — |
| power | **under** | −0.5 | **83%** | 2% | 1% | **LB_M 137**, DT_S 35 | — |
| power | odd | 0.6 | 21% | 14% | 6% | SS 53, DE_S 42 | DE_W (backside) |
| counter | **over** | −0.8 | **73%** | 8% | 3% | **DT_W 106**, LB_W 49 | — |
| counter | under | 0.0 | 48% | 11% | 4% | LB_W 115, DE_W 35 | LB_S (backside) |
| counter | odd | 1.2 | 19% | 18% | 16% | DE_W 51, NT 46 | **DT_W (playside 5-tech)**, DE_S |
| trap | over | 1.1 | 20% | 14% | 14% | LB_M 52, DT_S 42 | **DE_S (playside)** |
| trap | under | 0.3 | 39% | 9% | 8% | LB_W 91, DT_S 38 | **DE_S, LB_S (playside)** |
| trap | odd | 0.7 | 25% | 16% | 6% | LB_W 85, NT 36 | DE_S (playside), DE_W |
| inside zone | over | 0.9 | 34% | 14% | 14% | DT_S 69, SS 51 | DE_W (backside) |
| inside zone | under | 1.1 | 17% | 17% | 12% | LB_M 52, DE_S 35 | DE_W (backside) |
| inside zone | odd | 1.6 | 10% | 21% | 19% | LB_M 77, SS 35 | DE_W, **DT_W (backside 5-tech)** |
| outside zone | **over** | −0.4 | **72%** | 4% | 2% | **DE_S 87**, DT_S 44 | DE_W (backside) |
| outside zone | under | 0.0 | 50% | 7% | 6% | DE_S 107, LB_S 34 | DE_W (backside) |
| outside zone | odd | 0.5 | 34% | 8% | 11% | DE_S 66, SS 41 | DE_W, DT_W |

An unblocked *backside* end on zone is often intentional (the cutback
constraint, the boot or read key). An unblocked *playside* defender, or an
idle blocker while defenders are free, is not.

## Findings

### 1. Gap schemes: the playside tackle takes the guard's defender

**Code:** the gap-scheme candidate window `off > -2.0 && off < 0.6`
(`blocking.ts`, playside loop), processed playside-first.

**Doctrine:** the playside rule on power and counter is *gap–down–backer*.
Block a defender in your inside gap first. If there is none, block the man on
the next lineman inside. If there is none, go to the backer. A lineman's
inside gap ends at the next inside lineman (about 1.3 yd here). The spread
playbook's power and counter pages give the PSG "block man on to backside"
and the PST "combo with the PSG to the backside LB". The center: "head up —
block man on; uncovered or weak shade — block backside to replace BSG".

**Observed:** the window reaches two yards, so the PST claims a 1-technique
before the PSG looks. In power vs Under, RT downs the strong 1-tech, RG climbs
to the backside Will, and Mike comes through the vacated B gap (137/200
tackles). In counter vs Over, LT downs the 1-tech and LG climbs (DT_W makes
106/200 tackles).

**Experiment (not committed):** narrowing the window to `off > -1.45` changed
the 150-rep cells as follows:

| Cell | ≤0 yd before → after | Median before → after |
|---|---|---|
| counter vs over | 73% → 21% | −0.8 → 1.0 |
| power vs under | 83% → 33% | −0.5 → 0.3 |
| counter vs under | 47% → 31% | 0.0 → 0.5 |
| power vs over | 43% → 36% | 0.2 → 0.5 |

It also exposed the next defects. In power vs Under the puller is then left
with no target, because RT and C claim both linebackers first. In counter vs
Over, the center climbs to Mike instead of blocking back on the backside
3-technique. That leaves the 3-tech free behind the pulling guard. A real fix
should implement the rule, not a narrower number:

1. Assign the PSG and center before the PST, using gap ownership (inside
   gap → man on the next inside lineman → backer).
2. Center: block back (replace the pulling guard) when uncovered or the nose
   is shaded backside.
3. Reserve the playside linebacker for the puller ("first LB to show
   playside"). Send the PST or PSG combo to the *backside* linebacker.
4. EMLOS = the outermost playside defender on the line after the down
   blocks; the kicker (FB on power, BSG on counter) gets him.

### 2. Blockers with no target while box defenders are free

`lbNear` returns `null` once every linebacker is claimed. Plans keep a `null`
target instead of falling back to the next threat:

- **FB, every I-form zone call, counter and trap:** `F lead → none`. On I-form
  inside zone the fullback normally takes the backside end (insert or slice)
  or leads on the playside backer. On counter he typically blocks the
  backside edge that the pulling guard and tackle vacate.
- **Pullers:** LG on power vs odd, RT on counter vs odd.
- **LT on inside/outside zone vs odd:** climbs to nobody while the backside
  5-tech and the 9-tech both go free. A backside tackle with no backer should
  cut off the nearest defensive lineman.

Fallback rule: if a blocker's primary target class is exhausted, take the
most dangerous unassigned box defender toward the play (playside first, then
backside cutoff).

### 3. Trap leaves every playside lineman but one unblocked

**Code:** `scheme === 'trap' && b.slot !== 'C' && r > 0 ? undefined : …`
skips the candidate for *every* playside non-center lineman.

**Doctrine (spread playbook trap page):** only the trapped man is left.
The PST "if the trapped DL is aligned over you, release inside to the second
level; if he is inside of you, block man on to the outside gap". So the DE is
blocked whenever the trapped man is inside the tackle.

**Observed:** DE_S is unassigned vs Over, Under and Odd; LB_S too vs Under
(RG climbs to nobody).

### 4. Counter vs odd: playside 5-technique unassigned

The puller kicks the 9-tech OLB (the EMLOS), and the PST climbs because his
gap is empty, so the 5-tech between them is nobody's. Systems handle this
either by kicking the first defender outside the PST's down block or by a
tackle–puller exchange call. The engine needs one of these, chosen
explicitly.

### 5. Outside zone vs Over: assignments correct, technique fails

The assignments match doctrine: the Y and RT combo the head-up 6-technique,
RG and C combo the 3-technique, and the backside scoops. Even so, DE_S makes
87/200 tackles and 72% of carries go nowhere. This is the reach/leverage
problem the roadmap already lists (reach blocks on 3-techniques). It belongs
to the technique and contact layer, not the assignment table. Also check that
a failed reach sends the back to bend or bang instead of continuing to the edge.

## What this does not establish

- The cells use generated rosters and fixed calls. Before-and-after rates are
  comparisons within the engine, not NFL targets. Compare with NFL cells via
  [the evaluation environment](../EVALUATION_ENVIRONMENT.md) (E2).
- Front alignments (for example, whether the strong-side end in the Over is a
  5- or a 6-technique) were not audited against a source page. Coaching
  systems differ, and they need a cited source before changing.
- Runner reads, defensive fit behavior and engagement physics were only
  observed through outcomes.
