# CONCEPT_TAUGHT: five concepts installed as taught (2026-11-24, Rules + Coaching, off)

Integration's decision on the read plans' concept gaps (docs/reviews/2026-11-24-read-plans.md, "Concept gaps"): correct
the concepts to the taught versions rather than bend the plans around them. One flag, `CONCEPT_TAUGHT`, off and
registered. `src/playbook/concepts.ts` applies it after CONCEPT_DROPS, the same way the coached drops are applied.

| concept | taught | ours (flag off) | on |
|---|---|---|---|
| levels | the outside receiver runs a 5 yd in, the slot a 10-12 yd square-in | S1 dig, S2 short in | S1 short in, S2 dig |
| slant_flat | the back releases as the checkdown | back blocks | back check-releases (`check`) |
| quick_outs | the back's shoot route is the outlet | back blocks | back runs `back_flat` |
| flood | the backside #1 runs a slant, the backside hot | W1 dig | W1 slant |
| mesh | both outside receivers run the corner; the QB picks the better corner | W1 go | W1 corner |

## Sources (quoted from fetched pages; full lists in the read-plans review)

- **levels.** Chris Brown, smartfootball blogspot, "Peyton's favorite pass play: levels": "the outside receiver runs a
  five-yard in route, and the slot receiver or tight-end runs a ten-to-twelve yard square-in (with a slight outside
  release)".
- **slant_flat.** Klatt, Fox Sports: "If those two progressions aren't there, throw the ball to the tailback. If he's
  not open, then the quarterback runs."
- **quick_outs.** Kratzer, Gridiron Strategies, "The Quick Passing Game": "Back - Shoot route (or line) will always be an
  outlet."
- **flood.** Miller, Gridiron Strategies, "Flood series drowns defenses": backside receiver X "Runs a slant and is the
  hot receiver vs. blitz from his side".
- **mesh.**
  - Win With The Pass, Mesh: "The Progression is Corner, Mesh, Swing. As the QB comes to the line (or based on the
    scouting report) he is going to pick his best corner route match up", and "Versus a 2-hi safety look the corner
    routes will hold the safeties".
  - Black41 on Mumme and Leach: their changes turned the BYU post into a corner, "the corner route the first read, the
    X's crosser the second read, and the back the third read".
  - The wheel and rail versions are later (Kelly, Holgorsen), not the standard Air Raid install, so they are not built.

## Curl-flat is not a gap

The read plans first listed curl-flat's missing shallow. Heck's "Florida 4" (Gridiron Strategies) is the five-step
curl-flat ours runs:
- curls at 12 yd coming back to 10;
- a sit at 10 over the ball, which is the blitz throw ("Sits down at 10 yards. Keeps his eyes on the QB, as he is also a
  blitz throw");
- the back checking then releasing.

The shallow is in his "Tennessee", a different version. Curl-flat is unchanged.

## The protection, when the back releases (slant_flat, quick_outs)

With BACK_RELEASE on (engine default), a back assigned a release is in the protection only when the protection's count
needs him. PRO_CALL counts the box against the line plus any blocking end.
- **Count met:** he releases at once (0.1 s), and the five linemen block the rush.
- **Box outnumbers the line:** he checks his man first, then releases (CHECK_READ plus his reaction).
- **Beyond that, an unblocked rusher** is the quarterback's hot, the route on the blitz side, as the quick game is
  taught. The hot is authored in the read plans per side.

Off, both backs block on every snap, so the quick game always had six in protection and no outlet.

## The old controller

The old read compiler keys levels on the hook between "low S2" and "high S1". With the routes swapped, that key
follows the flag (`runtime.ts` KEYS). The two backs are added to the end of slant_flat's and quick_outs' authored
progression, where the old controller reads its outlet. The other three changes need no table edit:
- flood's backside is read as before, a slant in place of the dig;
- mesh's backside corner sits in the place its go held, and mesh's order reads S1 first.

## Checks

- `npm run typecheck` passes.
- `test/concept-taught.test.ts` (on: the taught installs; off: unchanged) and the flag-registry tests pass.
- Smoke, 4 games per arm, seeds 401-404, `npm run ref`. Both arms run to completion with no errors. Calls and
  catches differ by arm because game flow diverges.

  | concept | flag | calls | back on a route at the end | caught by the back | completions |
  |---|---|---|---|---|---|
  | slant_flat | off | 8 | 0 | 0 | 4 |
  | slant_flat | on | 8 | 2 | 3 | 6 |
  | quick_outs | off | 5 | 0 | 0 | 2 |
  | quick_outs | on | 13 | 5 | 0 | 6 |
  | levels | off | 8 | 2 | 1 | 4 |
  | levels | on | 12 | 4 | 1 | 8 |
  | flood | off | 1 | 1 | 0 | 0 |
  | flood | on | 6 | 0 | 0 | 5 |
  | mesh | off | 5 | 2 | 0 | 0 |
  | mesh | on | 4 | 2 | 0 | 2 |
- Untested: what the change does to whole-game outcomes. That is for the arms Integration cards, with QB_V2's
  plans.
