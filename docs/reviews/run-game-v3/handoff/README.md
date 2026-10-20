# Run game v3: integration handoff (minimal extractions)

Answers the Integration requests on #153 (comments 6300178882, 6300279449)
and the Claude section of the overlap audit (#187, `57e009b3`). Checked
2026-10-20 against:

- accepted develop `2c98bed94adad8087c65f381d4090444ad283985` (#168)
- queue `6575988fe9e72bd0aaf9e3573787f0dcb81ebf52`
- research `bae3fe80d189a7d792aaafbc4eea1ae2baa79573` (Parts 1-13)

**Nothing here is independently reviewed.** Each patch is one flag,
default off, with its own test. With every flag off, play is identical to
develop. No law, default, capacity or World change. Integration owns
composition and adoption. The research branch stays intact and is not a
merge candidate.

## What is ready, what is experimental

### Already delivered by reviewed successors (do not re-extract)

| Research item | Successor | Status |
| --- | --- | --- |
| `DRIVE_CONNECT` | #174 (includes #172 once) | Independent combined ACCEPT |
| QB carry-out direction (part of `QB_CARRYOUT`) | #168 | Merged |
| `ZONE_TE` near-surface overrun guard | Run review [43] | Accepted repair; the rest of `ZONE_TE` is held |
| `MAN_RUN_COMMIT` | #171 | Reviewed |
| Defensive work-off (`SHED_PURSUE`/`SHED_AWAY` area) | #169 + #177 | Reviewed; `SHED_PURSUE` HOLD stands |
| Force moving boundary and open hips (part of `FORCE_LEAD`) | #176; shoulder offset #175 | #176 narrow acceptance reported |
| Puller first-step facing and wall clearance (the `PULL_STEP` finding) | #185 | Reviewed; no `PULL_STEP` activation |
| Teammate spacing throttle (`SPACE_STEER`) | #183 + #186 | Reviewed, integration-ready |
| Pursuit approach/objective (`EDGE_SQUEEZE` calls `chase`) | #181/#182 | Reviewed |

### Offered now (experimental, for review)

| Patch | Base | Genuine dependency | Flag | Recommendation |
| --- | --- | --- | --- | --- |
| [force-flow-on-176.patch](force-flow-on-176.patch) | #176 `0b2addbe` (source = reviewed `9ae5a737`) | #176 (edits `forceTrack`) | `FORCE_FLOW` | Smallest force candidate; policy question below |
| [trap-read-on-develop.patch](trap-read-on-develop.patch) | `2c98bed9` | none | `TRAP_READ` | Review the defensive-win evidence before adoption |
| [lead-read-on-develop.patch](lead-read-on-develop.patch) | `2c98bed9` | none (composes after #185) | `LEAD_READ` | Experimental; outcomes neutral |
| [force-lead-on-develop.patch](force-lead-on-develop.patch) | `2c98bed9` | conflicts with #176 | `FORCE_LEAD` | Reference only; superseded by #176 + `FORCE_FLOW` |

### Still experimental, not extracted

These are unchanged held research flags. Shared files, contemporaneous
runs or package TVD do not make any of them a dependency of the patches
above.

- **Mesh family:** `UC_MESH`, `MESH_TEMPO`, `PACE_LEAD`, `GUN_MESH_SIDE`,
  the rest of `QB_CARRYOUT`. Genuine internal link: `MESH_TEMPO` applies
  under center only with `UC_MESH`.
- **Blocking:** `STRETCH_FLAT`, the rest of `ZONE_TE`, `OL_ALIGN`,
  `FB_TRACK`, `DEPART_TEMPO`, `RUN_LATERAL`, `COMBO_LEAVE`.
- **Defense:** `BACK_CHASE`, `LB_KEY`, `DL_FEEL`, `LB_GLIDE`,
  `EDGE_SQUEEZE`, `FORCE_DEPTH`, `SHED_AWAY`, `LB_DEPTH`, `DEEP_CAP`.
- **Contact and facing:** `BLOCK_FRONT`, `TRACK_FACING`.
- **Diagnostic only:** `DEF_GETOFF`.
- **Superseded:** `SPACE_STEER` (#183/#186).
- **Physics:** `GAIT_STEP`, not activated.

## Exact patches

Each patch was applied with `git am` to its base and reproduces the stated
tree.

| Patch | sha256 | Resulting tree |
| --- | --- | --- |
| force-flow-on-176.patch | `265bf3d4db8eec3da4393fdf4139c35dd5ec291d9127a7724f75d341daa47d8c` | `490bf8c657056a7168470c2b0de9712d839bef3c` |
| trap-read-on-develop.patch | `eb8bfca8f7d8c27176b620d9774e54ca5ff209242d6a88e99f393694e582bab5` | `9ed07d33ef3fc28350749efde87637013033a577` |
| lead-read-on-develop.patch | `7ea33897bafad3ebfc5d2522b4ebd43a3d22f3c16923617d5efbfa67951d0e8a` | `6da2c5bb2b6e9852bdecd0406a6d79de68b12c58` |
| force-lead-on-develop.patch | `3543b406ba00c7df580ee7ac4d69538659d2fbeefb3a30e1dbb23abaf5b7ded4` | `5d285ad611d8faafb34a22591c3dfe68d0ddccc7` |

Files touched:
- **force-flow:** `src/sim/force-track.ts` (one gate plus flag), config, `test/force-flow.test.ts`.
- **trap-read:** `src/sim/run-fits.ts`, config, `test/trap-read.test.ts`.
- **lead-read:** `src/sim/behaviors/blocking.ts` (`availableTarget` plus new `holeThreat`; `DefSlot` import), config, `test/lead-read.test.ts`.
- **force-lead:** `src/sim/run-fits.ts`, config, `test/force-lead.test.ts`.

**Combining.** The three develop patches combine cleanly except for one
trivial overlap: TRAP_READ and FORCE_LEAD both add a flag declaration
after `PULL_CUE`. Keep both.

**Merge-tree** (`git merge-tree --write-tree --merge-base=2c98bed9`)
against the heads of #171 `6cbdcc4d`, #174 `1e2415a7`, #175 `628ae0c0`,
#176 `0b2addbe`, #181 `8239e8d8`, #182 `4f293150`, #183 `dceec577`,
#185 `d0f76766` and #186 `7b70c343`:
- Every pair is clean except FORCE_LEAD × #176, which conflicts in
  `src/sim/run-fits.ts` (the same force landmark lines).
- TRAP_READ and LEAD_READ are clean against all nine.
- `FORCE_FLOW` is based on #176 and touches only `force-track.ts`.

## FORCE_LEAD → FORCE_FLOW: why the extraction is smaller than the flag

#176 already does what FORCE_LEAD added for feed-forward: the force
boundary moves with the runner's acquired lateral velocity, is retained
with its point on the decision beat, and the hips open for an outward run.
#176 deliberately declines an interception lead, because `track()`
already leads distant targets.

FORCE_LEAD differed from #176 in two ways:
1. An interception lead on the track.
2. Following the expected back's outward track before possession is
   identified. #176 requires `carrying === true`, and its own test asserts
   that `false`, `null` or `undefined` are never promoted.

The witness check below separates the two. Production settings, accepted
44 values, `RUN_CONTACT_COMPONENTS=1`, 2 plays per row,
[witness.ts](witness.ts):
- Margin is the playside force defender's lateral distance outside the
  carrier (yd) at the first tick the carrier is past the line.
- Gain is final yards.

| Source | AFTER-04 `oz/strong/ace_12/under3/pair11/7` | AFTER-14 `oz/strong/ace_12/wide9/pair31/8` |
| --- | --- | --- |
| develop `2c98bed9` | −1.35 / 70.00 (TD) | +1.69 / 1.91 |
| develop + FORCE_LEAD | +0.92 / 3.55 | +2.50 / 3.08 |
| #176 | −1.11 / 70.00 (TD) | +2.29 / 1.99 |
| #176 + lead only | −1.03 / 70.00 (TD) | +2.47 / 3.06 |
| **#176 + pre-possession flow only (`FORCE_FLOW`)** | **−0.20 / 5.13** | **+2.78 / 1.93** |
| #176 + both | −0.15 / 4.83 | +2.91 / 3.06 |

The interception lead is not what changes AFTER-04; the possession gate
is. The minimal increment is therefore `FORCE_FLOW`: one flag-gated change
to #176's gate. These are single-seed witnesses, not prevalence.

Questions for Run and the force owner (#175/#176):
- **Acquired-information policy.** Should a force player flow with the
  back's visible backfield track before possession is identified? The PA
  and keeper risk is real: he follows a faking back until the existing
  mesh-contradiction read switches him to the QB. The lab has no
  play-action fixture; use existing PA controls.
- **Opposing controls.** Cutback inside a widened force; IZ (small
  lateral velocity, largely inert).
- **Lead-only and FORCE_LEAD research numbers.** These remain research
  evidence and are not offered as a patch: Part 13, ace zone TVD
  7.2 → 4.4, edge lost 10 → 1%, measured inside the Part 12 package.

## TRAP_READ evidence (research package, now completed)

The `tr1gap` arm (`scripts/diag/stretch/part13-arms.sh`) is paired on
1,600 gap plays against `fl4gap`, the same package without TRAP_READ:
- **Trap negatives:** 25 → 40 of 200 (McNemar p 0.001).
- **All gap negatives:** 133 → 150 (p 0.002).
- **Other bands:** unchanged (4+ p 0.11; 10+, 20+, 40+ p ≥ 0.35).

The mechanism, from the contract test: the tackle now meets the trapper
0.05–0.21 yd in the backfield. Without the flag he waits at +0.26 yd.

This is defensive counterplay, not a yardage target. A reviewer should
decide whether the trap's answer (its blocking angle) should defeat it
before any adoption.

## LEAD_READ evidence (research package)

On 320 candidate pullers, lead pullers engaged anyone on 8% of plays
before and 13% after. The target changes among second-level defenders as
teammates' blocks pick them up and release them. Gap outcomes are not
significantly changed (paired p ≥ 0.09). It is a mechanism change without
a demonstrated outcome benefit. #185 does not touch target choice, so this
composes after it.

## Pending, unrun or not available

- **`SPACE_STEER=2` arms (`st2co`, `st2gap`): never ran.** The launcher
  accepts only 0/1 (`Flag requires 0 or 1: SPACE_STEER=2`). They are not
  evidence for anything. SPACE_STEER is superseded by #183/#186. Its
  research results stay in Part 13: shotgun negatives 101 → 77; ace inside
  zone and gap 4+ runs fall. `scripts/diag/stretch/spaceprobe.ts` remains
  available as a throttle-prevalence diagnostic for #186's reviewer.
- **DRIVE_CONNECT 40+ rows (request [43]).** The saved arms do not isolate
  DRIVE_CONNECT. `v5d0` → `v7dc` differ by that flag *and* by engine
  source:

  | Arm | Commit | Source |
  | --- | --- | --- |
  | `v5d0` | `92c1d0c1` | `cfc66cf5` |
  | `v7dc` | `ad633361` | `dde14c91` |

  Over 1,200 paired plays, 35 went from under 40 yd to 40+ and 23 went
  the other way. Example rows: `oz/strong/ace_12/under3/pair11/1` 3.49 → 70
  and `iz/strong/ace_12/under3/pair11/7` 70 → 5.37. First-changed-rep
  traces were not produced. #174's acceptance does not require them.

## Verification and cost

- **Typecheck** passes on each patched tree.
- **Focused tests** (vitest, Node 22.23.3, launcher, flags off unless
  stubbed):

  | Patch | New test | Affected suites | Total |
  | --- | --- | --- | --- |
  | FORCE_LEAD | `force-lead` | edge-fit, run-fit, zone-reach, pull-fit | 5 files, 55 tests |
  | TRAP_READ | `trap-read` | edge-fit, run-fit, pull/puller | 7 files, 60 tests |
  | LEAD_READ | `lead-read` | pull, puller, wrap, climb | 7 files, 68 tests |
  | FORCE_FLOW (on #176) | `force-flow` | #176's `force-track` contract unchanged, run-fit, force ownership | 5 files, 87 tests |

- **Flag-off identity:** 24 of 24 lab plays identical between develop and
  develop + all three patches. Cases: power, counter, trap, OZ, IZ, duo ×
  strong/weak × (i_pro_21 over2, ace_12 under3), pair31, seed 77, full
  result to 4 decimals.
- **Native plays this handoff:** 48 identity and 12 witness. No games,
  NFL queries, broad lab or full suite. The research arms reused here were
  run before this handoff.
- **`FORCE_FLOW` with the flag off** equals #176 by construction (the gate
  expression is unchanged). That wasn't run as a separate identity check.
