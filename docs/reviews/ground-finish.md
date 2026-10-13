# Ground finish: does automatic rising undo a committed hold?

Branch `claude/ground-finish`, from `claude/contact-stability` on baseline
`4ded6b6`. Comparison baseline stays `4ded6b6`. The World is unchanged:
the proposed hook is emulated at runtime by a diagnostic module, and the
physics owner implements and reviews the real one.

**Answer.** The interface is small and coherent, and the contract tests
pass against the emulation. But no measured play's own result changes by
more than a fraction of a yard when the holder stays down. In the one reproduced rise, the rise is not what leaves
the hold unfinished: the converged ending is a tackle whether or not the
holder rises, and production resolution censors it either way. The rise
belongs to the near-fall timestep family from
[contact stability](contact-stability.md). Recommendation: keep
`GROUND_HOLD` off and give the hook low priority until a case appears where
rising changes an ending.

## The replay

`45/3 cut, seed 3003`, both mirrors, tackle panel, with `LEG_BRACE TACKLE_ROLL
WRAP_BIND TACKLE_DROP`:

```sh
npm run baseline:run -- --candidate --flag LEG_BRACE=1 --flag TACKLE_ROLL=1 --flag WRAP_BIND=1 --flag TACKLE_DROP=1 \
  -- node --import tsx scripts/diag/tackle/ground-rise.ts --rep 45 3 1 1 3003 [substeps] [--stay-down-hook]
```

Production resolution (12-16 substeps): the holder drops at 3.50 s and is
down holding at 3.90 s. The runner's deviation peaks at 1.09 at 5.45 s, he
slows to 0.6 yd/s, and the passive rule (down, slower than 0.3 yd/s for
0.3 s) stands the holder up at 5.85 s while he still holds. Censored at the
time limit, 5.9 yd after contact.

| resolution | rise while holding | ending |
|---|---|---|
| adaptive (12-16) | yes, 5.85 s | censored 5.9 |
| adaptive + hook (stays down 3.15 s) | no | censored 5.9 |
| 16 | | censored 5.3 |
| 24, 32 | | tackled 4.7, 4.6 |
| 48-192 | yes at 96 (5.70 s) | tackled 4.5 |

At converged resolution the runner falls from the same near-fall, even
though the holder rises: the rise doesn't decide the ending. With the hook
at production resolution, the holder stays down and the runner recovers and
drags him at about 1 yd/s, with the grip at capacity sliding toward the legs.
Ground friction, grip and the runner's balance decide that; none of it is
changed here.

## Frequency

| inputs | holders down holding an upright carrier | rose while holding |
|---|---|---|
| panel seeds 3000-3005, flags + drop (288) | | 2 (the replay pair) |
| fresh seeds 3100-3111, flags + drop (576) | 208 reps | 0 |
| fresh seeds 3100-3105, production (288) | 14 reps | 0 |
| 4 games, production profile (554 plays) | 19 | 2 |
| 4 games, flags + drop (539 plays) | 100 | 9 |

A downed holder is normally dragged faster than 0.3 yd/s, so the rise rule
seldom applies while he still holds. In games it happens mostly in piles
around a stopped carrier, shortly before the stopped-progress whistle: the
carrier gains 0.00-0.33 yd after the rise in 8 of the 9 flagged cases, and
1.23 yd in one.

## Proposed interface (for the physics owner)

One optional intent field, read in one place:

```ts
// Intent (world.ts)
/** Stay on the ground (a deliberate ground action, e.g. a downed holder
 * finishing a tackle). While set, a downed body does not start rising. No
 * effect on an upright, falling or rising body or on ground friction;
 * clearing it restores the ordinary rule at once. */
stayDown?: boolean;

// feet(): this.passive(b, sup, sp, report, i, !!intent.stayDown);
// passive(..., stayDown = false):
//   } else if (sup.state === 'down' && !stayDown && Math.hypot(b.vel.x, b.vel.y) < 0.3 && t - sup.since >= 0.3) {
```

The World never infers it from a grip; only a controller asks for it.
`scripts/diag/tackle/stay-down-hook.ts` emulates exactly this by wrapping
`feet` and `passive` at runtime; it is for diagnostics only.

**Contract tests** (`test/stay-down-contract.test.ts`, currently against the
emulation; delete its emulation import when the hook lands):

- ordinary get-up is unchanged without the field;
- a downed body at rest stays down while it is set;
- clearing it starts the rise on the next step, and the get-up takes the
  ordinary time;
- an upright or rising body is unaffected, and a fall completes at the same
  time;
- a live grip alone doesn't freeze a downed holder;
- ground friction on a dragged, downed holder is unchanged;
- mirror symmetry.

## Controller request (`GROUND_HOLD=1`, off)

`updateBond`: while the carrier is up, each downed tackler in the bond asks for
`stayDown`. It ends with the action: a broken grip removes him from the bond,
and once the carrier is down the ordinary rule applies. Until `Intent` gains
the field, `tackle.ts` uses a local `GroundIntent` type.
Tests: `test/ground-hold.test.ts` (off by default, downed holder on an
upright carrier, upright holder, carrier down, broken grip).

## Validation (candidate runs, `npm run baseline:run -- --candidate`)

Each arm is compared rep by rep with the same panel without `GROUND_HOLD`.
Endings and completed-tackle spots:

| arm | reps | endings changed | tackled in both, spot moved |
|---|---|---|---|
| `GROUND_HOLD` + hook alone vs production | 288 | 0 | 0 / 234 |
| + flags + drop vs flags + drop | 288 | 0 | 0 / 222 |
| same at 96 substeps | 288 | 0 | 0 / 222 |
| fresh seeds 3100-3105 | 288 | 0 | 0 / 210 |

Mirrors are inside each panel (both sides of every cell). Failed grips,
diving controls and ordinary get-ups are unchanged because no ending or spot
moved. The 12-vs-96 disagreement of the package (4 reps: the replay pair and
180/6 seed 3005) is the same with and without `GROUND_HOLD`.

Receipts: `out/gf/r-*.json` (ignored output; flags and source hash
recorded). Panel JSON now records its input manifest (seeds, `seed0`,
resolution, hand mode, hook, tackle flags).

**Games.** The same four games were rerun with `GROUND_HOLD` and the hook
(`ground-rise-games.ts 1 2 3 4 [--stay-down-hook] --out`, candidate
receipts `out/gf/r-g-*.json`). Six of the eight games are identical play by
play, including games where holders rose while holding. In the other two,
traced per tick with `--trace`:

- *Production game 2:* the holder (D.Lewis) rises at 4.25 s with his grip
  stretched. The grip breaks at 4.50 s in **both** arms with identical hold
  length, distance and carrier speed (a downed or rising holder keeps his
  ground reach), and the play ends at the same tackle. The game separates on
  the next play, from carried state.
- *Flags game 2:* two downed holders on a carrier moving 0.1 yd/s rise
  together. Staying down changes the carrier's speed by 0.01 yd/s before the
  stopped-progress whistle; the reported gain flips 16 -> 15 yd with the same
  19 yd after the catch (a rounding boundary).

Later differences in those games (scores) are the ordinary game-level
cascade from a fractional change, not finishing effects.

## What would change the recommendation

A recorded case where a holder rises through his own hold and the ending
changes at converged resolution. `ground-rise.ts --fresh` and
`ground-rise-games.ts` find and count these.
