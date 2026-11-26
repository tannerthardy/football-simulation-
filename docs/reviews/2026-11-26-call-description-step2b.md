# Call description, step 2b: are the checker's catalog errors live? (2026-11-26)

Rules + Coaching, for Integration. Base: develop f04337e50.

## Live or not
How each kind was decided:
- **Playcaller reach** is read from the code. It was confirmed by drawing calls from `OffensiveCoordinator` and
  `DefensiveCoordinator` across varied situations: 40,000 offensive calls (20 teams, all five schemes) and 20,000
  defensive calls against the two formations involved.
- **What happens on the field** is read from the bodies `PlaySim` builds. The sample was 2,500 plays through the game's
  call flow, using real body radii.

| catalog error (step 2a) | live? | why |
|---|---|---|
| Gun split backs on gun runs: two backs on one spot (64) | **live** | Split-back gun gets its 2022 share of its personnel group's snaps, and the caller draws IZ, OZ, WZ, split zone and counter from it. In the sample, 51 of 15,000 calls (0.34%) were gun zone runs with a second back. On the field, the two backs spawn inside each other (0.45 yd apart against a 0.50 yd radius sum). Contact pushes them apart over about 0.6 s, and both start on the backside. |
| DB in man on an attached end, pressed into the front's end man (DE_S/DB against gun split twins 21 in dime; DE_W/CB_W against I jumbo on bear heavy) | **live** | Dime against 21 is drawn on third down. Heavy and goal line against 22 are drawn short. In the caller sample, `i_jumbo_22 bear goalline cover0` overlapped on 91 of 10,000 calls. More generally, a DB in man on an attached end comes up on 3.7% of calls. |
| te_screen with no S3, rb_slip_screen from empty (18) | **not live** | Neither is in the caller's pool. The quick screens are bubble, bunch now, now and tunnel, plus the RPO. Both are lab-only. |
| Split zone with no slicer (24) | **not live** | `chooseRun` weights split zone to zero without a slicer. Its rule agrees exactly with the checker's: the same 12 formations are allowed. No called motion removes the slicer (every motion, flip and ball spot, both directions). |
| Pressures in the step-2a count (72 of the 82 defensive overlaps; the 2a report listed only the two plain-call kinds) | **live**, left | See "Left for Integration". |

## Fixed
- **`SPLIT_BACK_SIDES`** (default on; `=0` restores). File: `src/playbook/alignment.ts`, `backsAway`.
  - On a gun zone run (inside, split, outside, wide) with two backs, the carrier aligns away from the play side and the
    second back takes the play side. Each keeps his depth.
  - That is where the sim's own job for the second back starts: the zone lead (`blocking.ts`, the backer one gap play
    side, or the stretch landmark outside the end) or the slice back across to the backside end.
  - Off, every back on the play side mirrored away, so from split backs he landed on the other back.
  - Single-back sets are unchanged.
  - Catalog: offensive overlaps fall from 64 to 8. The 8 are counter, which is left alone.
- **`MAN_TE_OFF`** (default on; `=0` restores). File: `alignDefense`'s man placement and its IR port.
  - A defensive back in man on an attached end aligns off by the existing man rule for an inside receiver (4 yd,
    inside shade). He is no longer pressed head-up at 1.3 yd, where the front's end man stands.
  - The two plain-call overlaps are gone. No new overlap appears in the 38,588-call catalog.
- **IR:** the describer writes `secondBackToPlay`, the resolver reads it, and the port reads the same flag. The
  equalities still hold: 9,360 offense alignments; 25,344, 13,244 and 2,256 defense alignments.
- **Test:** `test/ir-check.test.ts` now asserts both results: only counter overlaps on offense, and no DB pressed into a
  front's end man. With both flags `=0`, that test fails.

## What changed in ordinary play
- **0.34% of calls:** gun zone runs from split backs (and Y-off or close two-back sets). The second back now starts on
  the play side and the carrier starts away from it. Before, both started on the backside.
- **3.7% of calls:** a CB, NB or DB in man on an attached tight end now aligns 4 yd off with an inside shade, instead of
  pressed head-up at 1.3 yd.

## Left for Integration (coaching not settled here)
- **Gun counter from split backs (8 catalog calls).** `COUNTER_OFFSET` puts the carrier backside. Where the second back
  aligns on gun counter (and his job, the backside-first lead) is not settled here, so the overlap stays.
- **The okie nickel rover and a weak B-gap blitzer** (will_b, fire_zone and zero_6 against 2x2 and 3x1: 64 calls).
  - The rover (DT_W, a stand-up 3 technique at 2.6 yd) and the creeping Will (LB_W at 2.4 yd on B weak) are 0.29 yd
    apart.
  - Where the blitzer sets when a teammate stands in his gap (stacked behind him at depth, or a different creep spot)
    is unclear to me.
- **nickel_edge in dime** (8 calls). The blitzing nickel and the DB who takes the slot in man align on the same press
  spot over the slot. Where the edge blitzer cheats to is unclear to me.
- **Broader: spawn overlaps in game calls.** In the 2,500-play game-flow sample, 98 plays (3.9%) spawned two bodies
  closer than their radii, mostly defenders. Most common pairs:
  - DE_S/LB_S in over base;
  - LB/LB;
  - DT/LB;
  - LB/SS;
  - NB/SS.

  The plain catalog does not show these. They come with the call's extra fields (strength, mug, Sam-on, games), the
  coverage check and the alignment scatter. Each needs its own diagnosis.

## Red-diff (landing tree, `node scripts/red-diff.mjs`)
- **Full core suite:** 4,620 tests, 40 failing, 39 of them on the ledger. That is new red 1 and fixed 1.
  - The new red was `scorecard-provenance`: the baseline flag inventory lacked the two flags. They are now registered
    in `config/baseline.json` (historical "0") and `docs/FLAGS.md`, and that test passes.
  - The fixed test is `concept-menu`: "the quarterback throws most balls to the first two reads".
- **Re-run on the flag-registry and IR files** (174 tests): new red 0, fixed 4. The 4 are the concept-menu test above
  and three baseline-runner tests that had failed on the flag inventory.
- **Total: new red 0.**
