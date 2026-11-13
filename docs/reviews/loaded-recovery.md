# Loaded recovery: what resolution does to a held runner (diagnostic + flag)

Follows the physics session's [continued recovery](continued-recovery.md),
[phase reconstruction](recovery-phase-reconstruction.md) and
[loaded grip refinement](loaded-grip-refinement.md). Their two witnesses (seed
3001: rear 180 deg at 6 yd/s with center hands; angled 45 deg at 8 yd/s with
patch hands) are reproduced natively on `claude/live-gaps` by
`scripts/diag/physics/loaded-refinement.ts` (4.5 s; both mirrors exact).

## What happens

| Substeps per tick | Rear hold | Angled hold |
|---|---|---|
| 12, 16 (production is adaptive 12-16) | never falls, drags 22.6 yd | escapes at 21.5 yd |
| 24, 32 | never falls | holds (censored) |
| 48 / 64 / 96 / 192 | falls after 16.8 / 16.2 / 15.2 / 14.7 yd | holds |

The rear outcome converges toward a fall about 3.4 s after contact. Every
resolution up to 32, including production, misses it.

**Where the error is.** Splitting the runner's capture-deviation change per
substep over the window where the runs separate (2.40-2.85 s): the leg-hold
trip input converges (0.596 yd at 12 substeps vs 0.590 at 192), while the
recovery outside the base does not (-0.83 vs -0.90). Recovery speed, foot
request, achieved foot speed and grip force are identical at both
resolutions. The held runner sits outside his base, where the capture-point
law is gravity-unstable (deviation grows at w = sqrt(g/h), about 3.3/s for a
back) and the step pulls it back: two large opposing terms whose small
difference sets the outcome. Integration error early in the hold grows about
five-fold in half a second. At 12 substeps the deviation at 2.85 s is 0.306 yd
against about 0.215 converged (40%).

**One law-level inconsistency.** `prepareRecovery` caps the held body's
requested corrective foot speed at `(deviation beyond base) / h`, a dead-beat
request whose gain depends on the substep, while the capture-point law assumes
the stepping speed itself. Removing the cap (diagnostic, reverted) makes the
angled witness agree at every resolution; the rear one is unaffected.

## How much it matters

Tackle panel, 288 reps (6 seeds), compared rep by rep with 96 substeps:

| | Production (adaptive) | Floor 48 while a grasp is live |
|---|---|---|
| Default physics: same ending as 96 | 286/288 (2 rear reps censored instead of tackled) | 288/288, yards within 0.02 (p90) |
| With `LEG_BRACE`, `TACKLE_ROLL`, `WRAP_BIND`: same ending | 282/288 | 288/288, yards within 0.04 (p90) |

So the resolution error flips about 1-2% of tackle outcomes, concentrated in
rear and angled holds. The 42-44 unfinished slow side/rear holds under the
tackle flags are present at 96 too: they are a missing mechanism (the tackler's
weight hanging on the runner, [physics ideas](physics-ideas.md) 9), not a
resolution artifact.

## `HOLD_SUBSTEPS=n` (experimental, off)

While any grasp is live, the contact island uses at least `n` substeps. With
48, both witnesses reach the converged outcome at native resolution and the
panel matches 96 exactly. Cost: one full game 25-28 s to 31.7 s (about +20%).

## Recommendations (physics session owns the World)

1. Adopt a grasp-time substep floor (48), or an error-controlled step for
   islands with a live grasp, rather than a further support-law rewrite: the
   error comes from integrating an unstable state with large opposing inputs,
   and refinement converges.
2. Remove the `(e - rb) / h` dead-beat cap on the held body's foot request,
   or replace it with the analytic crossing the capture-point law already
   computes, so the foot and balance credit the same corrective motion.
3. Treat the remaining unfinished slow holds as a missing mechanism (hanging
   weight), and loaded falls in pass protection as technique
   ([loaded falls](loaded-falls.md)), not as recovery numerics.
