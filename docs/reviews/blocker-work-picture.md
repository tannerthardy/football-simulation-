# Free blockers use their own carrier picture

**A free blocker can no longer change his work choice or movement merely because
the hidden live ballcarrier moved.** New work uses personally delivered positive
possession pictures. Between ordinary reads, the blocker carries that acquired
motion forward; when no carrier is acquired, he uses the installed work area.
This is an information correction, not a demonstrated yardage improvement.

Code `964683aa084b11f42c395285cb7e4747d7132e77`, source
`ac0c6df2bec5fffd3ef4652007d50f9ba8f551a9d2d01211916cbf4777642aa2`.
Base accepted develop `914f4d56a3b7ef2845ff0208f55d626c0ff5f880`, canonical queue
`e8d806b940a84c7cff7e5ee066022079723c78ef`. Its runtime remains source5b710a1b,
byte-identical to0000e560. No dependency on held perimeter/Counter candidates.

## The decision and evidence

The smallest question was whether an ordinary work search can distinguish two
hidden realities without a corresponding change in its acquired picture. The
accepted controller uses `sim.carrier.pos` in both `findWork` and its no-target
movement fallback. That bypasses possession recognition and information latency.

The regression encounter is synthetic, through actual `RunBlocker.update` and
the real perception buffer. An advancing snapshot records an exchange and RB
movement. The blocker's delivered pictures still show QB possession and RB
non-possession. In accepted source5b710a1b, hidden RB movement to opposite sides
changes the selected defender DE_W↔DE_S and changes the movement request. The
corrected controller selects DE_S in both worlds, then selects DE_W once the
exchange and opposite-side RB picture are actually delivered. No block or body
movement is awarded by this staged decision encounter.

## Contract and implementation

- `readBlockerWorkPicture` queries existing delayed teammate pictures, selecting
  positive carrying evidence. Conflicting pictures prefer known younger evidence;
  undated evidence cannot claim to be freshest. Ties use stable installed identity.
- The blocker owns that picture until his normal next decision. Prediction uses
  only elapsed held time, bounded by that beat; observation age is already
  included by the delivered picture and is not added again. Repeated update or
  diagnostic calls do not acquire another picture, record history or draw RNG.
- Without acquired possession, the reference is the installed LOS/ball-Y work
  area. Existing home lane/pull exit limits and search weights are retained.
  Neither unavailable information nor a turnover silently supplies live truth.
- Only `findWork`'s reference and the no-target movement fallback migrate.
  Target-availability filters, emergency priority, assignment count, trajectories,
  helper release, speed, braking, hand/contact rules and physical capacities stay
  outside the change. No global phase manager, learning or head model is added.

This does not add lookahead to the runner's future cut. It gives the blocker a
consistent reference for where useful work may be, with the existing uncertainty.
It does not certify that every available target is physically reachable.

## Focused checks and native transfer

**24 focused checks and typecheck pass** on the exact final source: seven new
information/controller contracts plus17 existing combination-retarget controls.
Tests cover advancing hidden reality, acquired opposite-side response, unavailable
and known-unheld possession, ordinary read cadence, held movement, repeated-query
invariance, no double age and conflicting dated/undated evidence. Actual body,
RNG and contact remain unchanged by the decision-only checks.

Four native pairs were selected for mechanism activation and opposing controls,
using unchanged full22 simulation. K02/K03 are existing frozen inputs; I01/F01
use fresh631/632 roster-generation seeds and play seeds991/992, fixed before
results. I01 alone did not activate work search, so F01 was added once to expose
the new reference in a fresh player's actual controller. No favorable-ending
selection or additional roster sweep.

| Input | First different request | Useful preservation / remaining cost |
| --- | --- | --- |
| K02 weak Counter Under |X4.25s, after first contact |CB contact4.05s; zero offensive teammate impacts; both live at5s. RT actually uses acquired work from0.05s. |
| K03 strong Counter Over |Z3.80s, after first contact |CB contact3.55s; same3.11yd tackle4.55s; existing40 offensive impact samples remain. |
| I01 fresh Inside Zone Over |none |All22 bodies/requests/RNG remain identical; DT_S contact2.50s and same1.67yd tackle3.35s. Work search inactive. |
| F01 fresh weak Counter Under |H2.80s |RT/H/LG/Z consume acquired work. Same runner and CB contact4.40s; zero offensive impacts; both live at5s. |

Runner body histories, carrier-contact/tackle events, RNG histories and loaded
block interval membership are identical within all four pairs. Existing
first-level and backer jobs remain. F01 is **not** whole-world identity: loaded
force records differ beginning3.35s, and the LT/DT_W recontact event at5.00s moves
about0.01yd. Its pair/time and loaded intervals remain the same. These small
physical differences are retained; no solver or conservation diagnosis is inferred.
Other ending changes were not required. Censors have null outcome/gain.

The original three native pairs ran source2b56869c, which differs only in the
fallback rank for absent optional observation age. Production `PerceptionBuffer`
always supplies finite age; that path is unchanged. Their receipt/source and the
exact one-line compatibility reconstruction are retained. F01, final24 tests and
typecheck run exact final sourceac0c6df. Do not relabel the older receipts.

## Review and remaining work

The [separate controller review](run-blocker-controller-review-2026-10-18.md)
supports Run's explicit GH installation with its #140 prerequisite and the
independent cleared-kick correction. Those produce stronger native evidence of
useful coordination than another selected-play entry variant. They are not
dependencies or included changes here. The new patch applies mechanically to all
three pinned candidates; that is not combined runtime verification.

Important remaining debt is explicit: `availableTarget`/`findWork` still inspect
other players' private down/engagement state; adjacent exchanges and legacy GT
log/traffic reads need their own acquired-information contracts. Current teammate
`see` is delayed but does not model gaze/occlusion. Installed assignment can still
give a blocker a job his actual entry cannot achieve. Under's C/DT access and
retained-block traffic remain separate. This small migration repairs neither the
whole awareness model nor the whole run game.

Ready for independent review as an information correction. Run was notified of
the exact two shared-file seams; Integration owns combined verification and any
adoption. No full suite, game campaign, ratings tuning or automatic GH calling.

## Reproduce or reuse

[Compact paired evidence](../../data/reviews/current/blocker-work-picture/summary.json.gz),
[source compatibility](../../data/reviews/current/blocker-work-picture/compatibility.json),
[mechanical overlap checks](../../data/reviews/current/blocker-work-picture/overlap.json),
[focused receipt](../../data/reviews/current/blocker-work-picture/final-focused.json),
[typecheck receipt](../../data/reviews/current/blocker-work-picture/final-typecheck.json),
[full tapes and checksum](../../data/reviews/current/blocker-work-picture/bundle.json).

Data-only evidence `94c8988d41c86d2ffea85f407cd5d50d352f22d2`:13,387,869bytes,
SHA256 `52beaf1332e5bb2fbd0e1c8d42fb0c391d2d87a7046e6e133df729d2f84b8c3d`.
All32 files rehashed; no unsafe/symlink members. Do not merge the evidence branch.
Frozen full setups, selected hashes, preparation/reduction scripts, exact source
patch, both collectors and full flag/World-default receipts are included.
The candidate collector adds only passive work-picture metadata to Run's pinned
collector; it does not change sensing/update/World order. Reproduce from frozen
snap inputs, never from rounded body samples or incomplete observer history.

Node22.23.3,44 recorded settings/components1, CF_FLOW unset, unchanged World
defaults. Eight native continuations **4.826088 collector seconds**; four natural
endings/four5s censors. Final focused command1.955s/typecheck8.795s. Initial npm
launcher failed before tests because the local dependency link was absent; the
existing pinned dependencies were reused. Early source/typecheck/test receipts
remain visible. A nested archive patch check initially skipped paths; the final
overlap checks prevent ancestor-repository discovery, apply the actual patch,
verify the new helper bytes and record before/after source hashes. No native run
or claimed compatibility relies on that initial check.

```sh
node scripts/baseline.mjs --candidate --receipt out/work-focused.json -- \
  node node_modules/vitest/vitest.mjs run --project core --maxWorkers=1 \
  test/blocker-work-picture.test.ts test/run-combo-retarget.test.ts
node scripts/baseline.mjs --candidate --receipt out/work-types.json -- \
  node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
# Prefer the existing evidence; extraction includes reduce.py (zero new snaps).
python3 EXTRACTED_EVIDENCE/reduce.py
```

The native scripts/collectors use paths from their original repository locations;
place archived collectors in `scripts/diag/`, the input preparation scripts under
`out/blocker-decision-followup/`, and the baseline contract under `test/` in an
isolated source reconstruction. Launcher modes/IDs/horizons/input manifests are
recorded verbatim in their receipts. Recorded enclosing HEAD914f4d5 identifies
the worktree base; runtime content hashes identify the tested candidate and map
to code964683a.
