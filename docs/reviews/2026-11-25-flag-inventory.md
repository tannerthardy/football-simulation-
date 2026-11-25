# Flag inventory (read-only): 517 flags, what is on, what is dead

Tools/Physics, 2026-11-25, for Integration. Read-only; no engine change. Develop `890558713`. Prompted by the user's
question how many flags there are, and by PLAN's "at most 10 experimental flags". Scripts: `scripts/diag/flags/`
(`inventory.py`, `offpath.py`, `classify.py`, `render.py`); data: `data/reviews/flags/flag-inventory.{tsv,json}` (one row per
flag: class, landing date, engine, read sites, last commit touching its read, open PRs, tests that set it to 0) and
`data/reviews/flags/pinned-on-real-engine.tsv` (the legacy-pinned core files, one row each).

## 1. Counts

Every `process.env.NAME` read in `src` is one flag: **517**, one `docs/FLAGS.md` row each, none missing either way.
By how it is read: **394 on unless `0`**, **95 off unless `1`** (94, plus `WRAP_FOOT`, retired and still read at
`src/sim/tackle.ts:89`), **28 numeric or mode** (`??` default, plus `CF_FLOW`). The FLAGS.md header line says
"387 on, 93 off, 29 numeric", which sums to 509 and is stale. `config/reference-stack.json` lists 321 on, 94 off, 1 retired
and 15 numeric: 86 flags read in `src` are not in it (73 on-by-default flags older than the stack, and 13 numeric ones).

| class | flags | read sites | code lines naming the flag | lines only an off arm (rough) | declaration comment lines |
|---|---|---|---|---|---|
| A | 163 | 174 | 285 | 99 | 987 |
| B | 231 | 256 | 608 | 199 | 1887 |
| C | 64 | 72 | 136 | 45 | 429 |
| D | 31 | 38 | 87 | 22 | 288 |
| E | 28 | 31 | 54 | 5 | 125 |

"Read sites" are `process.env` reads. "Code lines naming the flag" are non-comment lines in `src` that name it (guards,
ternaries, imports excluded). "Lines only an off arm" is a rough lower bound: a `FLAG ? new : old` on one line counts
once, and the old arm is usually a few tokens (`e.phi`, `d`, `b`), so the off paths are small. What is large is the declaration
comment above each read (the flag's history), and the tests.

Classes: **A** on by default and promoted by 2026-11-09 (or older than the stack); **B** on by default since 2026-11-10;
**C** off, no live signal; **D** off, live; **E** numeric or mode. "Live" (D) is a heuristic and the weakest column here: an open
PR updated on or after 2026-11-18 that names it in its title, branch or (for PRs naming fewer than 9 flags) body; or GAPS/PLAN
naming it; or a review doc dated 2026-11-23..25 naming it; or a `src` change to its read since 2026-11-18. Lanes should
correct the D/C line.

## 2. Class A: on by default, promoted before 2026-11-10 (163)

| group | flags | code lines | off-arm lines |
|---|---|---|---|
| on in the stack at the 2026-11-09 promotion (run-ref-4) | 90 | 151 | 33 |
| on before the stack existed, never listed in it | 73 | 134 | 66 |

Their off path is the legacy engine only. For the 90 stack flags the legacy pin (`config/legacy-env.ts`, used by every project
except `core-defaults`) sets them to 0; the 73 older ones are never pinned, so only an in-file stub sets them to 0.
Rows and per-flag evidence: the TSV, `class = A`.

## 3. Class B: on by default since 2026-11-10 (231)

| date landed on develop | flags |
|---|---|
| 2026-11-10 | 24 |
| 2026-11-11 | 19 |
| 2026-11-12 | 28 |
| 2026-11-13 | 16 |
| 2026-11-14 | 40 |
| 2026-11-15 | 17 |
| 2026-11-16 | 41 |
| 2026-11-17 | 3 |
| 2026-11-18 | 29 |
| 2026-11-23 | 2 |
| 2026-11-24 | 12 |

Date is the first commit on develop whose `reference-stack.json` lists the flag `on` (engine id in the TSV). Whether anything
other than a legacy-pinned file still sets a B flag to 0: 65 of the 231 are set to 0 by a file that runs on the real engine
(an in-file pin or an off-versus-on contrast), 15 are set to 0 by a script, and 2 only by pinned files. 152 are never set to 0
anywhere except by the blanket pin. Across A and B, 87 `core-defaults` files stub 97 flags to 0 in-file (largest:
`punch-strike` 17, `qb-rhythm` 8, `qb-gather-throw` 8, `acc-radius` 6, `craft-hold` 5); 23 pinned files do it too. Per flag
in the TSV (`zero_def_tests`, `zero_scripts`).

## 4. Class C: off, parked or failed, no live signal (64)

No fresh open PR, not named in GAPS/PLAN or a recent review doc, `src` read untouched since 2026-11-17. Last commit that
touched the read, and the FLAGS.md status, per flag. Thirty-three have not been touched since 2026-11-10 or earlier.

| flag | last commit touching its read | status (FLAGS.md) | stale open PR |
|---|---|---|---|
| PULL_PLAN | b143f1ba6 2026-10-12 | experimental |  |
| READ_RISK_TRACE | 9cfaa23b7 2026-10-12 | experimental |  |
| RUN_CONTACT_TRACK | 4f2ffd7d7 2026-10-12 | experimental |  |
| RUN_READ | f3b764d27 2026-10-12 | experimental |  |
| RUN_READ_TURN | 9cfaa23b7 2026-10-12 | experimental |  |
| DL_FIGHT | 53c525b0f 2026-10-13 | experimental |  |
| DL_HANDS | b648a3942 2026-10-13 | experimental |  |
| HAND_FIGHT | 67a60a316 2026-10-13 | experimental |  |
| PASS_SINK | 41a584626 2026-10-13 | experimental |  |
| PULL_CUE | 00a01c08d 2026-10-13 | experimental |  |
| REACH_CONTACT | fda39f724 2026-10-13 | experimental |  |
| RUN_HANDS | 32eeeed12 2026-10-13 | experimental |  |
| TACKLE_TOUCH | 23de24f4f 2026-10-13 | experimental |  |
| ATTACK_LANDMARK | 80823538d 2026-11-03 | experimental |  |
| FLOW_INTERCEPT | 2f9d1af9e 2026-11-03 | experimental | #405(2026-11-09) |
| DL_GAMES | b9e1e8068 2026-11-05 | experimental (G2, 2026-11-05) |  |
| DEF_STANCE | 347f1d923 2026-11-06 | experimental |  |
| SAM_ON_TE | 1dfb80c54 2026-11-08 | experimental |  |
| WRAP_FOOT | a1b3986db 2026-11-08 | retired, inert (tackle finish, 2026-11-08; #418 deletes the recovery c |  |
| GAZE | dbad82cbe 2026-11-09 | experimental (G10 field of view, stage 1, 2026-11-09) |  |
| RACE_LEAN | 975e22945 2026-11-09 | experimental |  |
| BRACE_EVIDENCE | 637f708d4 2026-11-10 | experimental (CARRIER_BRACE trigger, 2026-11-10) |  |
| CONTACT_LAYER | a12130305 2026-11-10 | experimental (effective mass step 1, 2026-11-10) |  |
| DL_SNAP_TIME | fec124e8e 2026-11-10 | experimental (DL get-off, 2026-11-10) |  |
| GRAB_CONNECT | b13598d3f 2026-11-10 | experimental (tackle forms part 2, 2026-11-10) |  |
| MAN_PHASE | 34dc47742 2026-11-10 | experimental (G3 coverage, 2026-11-10; measured with `WR_SNAP`, `QB_RH |  |
| OL_ON_COUNT | 0b6a8cc3d 2026-11-10 | experimental (run game, 2026-11-10) |  |
| QB_FEEL | 28c11560e 2026-11-10 | experimental (G9 QB pocket, 2026-11-10; read on THROW_BODY 2026-11-11: |  |
| REACH_HANDS | bebc2dcd4 2026-11-10 | experimental (run game, 2026-11-10) |  |
| TKL_EXEC_STATE | 80bfa51d0 2026-11-10 | experimental (tackle forms step 1, 2026-11-10) |  |
| TKL_WHIFF | ff5c75b7b 2026-11-10 | experimental |  |
| TORSO_CAPSULE | 4a8c9bc3c 2026-11-10 | experimental (torso shape, attempt two of the collision work, 2026-11- | #745(2026-11-14) |
| WHIFF_MARGIN | 80bfa51d0 2026-11-10 | experimental (tackle forms step 1, 2026-11-10; needs `TKL_WHIFF`) |  |
| PICTURE_AGE | 06104925b 2026-11-11 | experimental (sacks attempt 2, timing half, 2026-11-11) |  |
| POCKET_CLIMB | 7c21a9ae5 2026-11-11 | experimental (sacks: escape, 2026-11-11) |  |
| SHOULDERS_SET | 91a752cc4 2026-11-11 | experimental (QB in the pocket: throw mechanics, 2026-11-11) |  |
| EDGE_ARC | e10c0c2a4 2026-11-12 | experimental (edge rush: the rusher's arc, 2026-11-12; two attempts, n |  |
| EXTEND | 6828431b6 2026-11-12 | experimental (QB in the pocket: no throw in time, 2026-11-12) |  |
| HOLD_CALL | 90f87a6f8 2026-11-12 | experimental (holding committed / material / called, 2026-11-12) |  |
| OPEN_HANDS_BACK_ONLY | b2b3f4a01 2026-11-12 | diagnostic (with OPEN_HANDS, 2026-11-12) |  |
| RUSH_INTENT | b6f2a8d17 2026-11-12 | experimental (the rusher between moves, 2026-11-12) |  |
| TACKLE_ANCHOR | 1b800758c 2026-11-12 | experimental (with TACKLE_SET; the anchor and inside-half leverage, 20 |  |
| TACKLE_BRAKE | de1e51192 2026-11-12 | experimental (the anchor: brake the pair into the set, 2026-11-12) |  |
| TACKLE_RESET | 285860f7f 2026-11-12 | experimental (the anchor's base re-set, 2026-11-12) |  |
| TACKLE_SET | 4699df939 2026-11-12 | experimental (edge rush: tackle set, 2026-11-12; attempt 2: depth and  |  |
| QB_COMMIT | d236f6299 2026-11-13 | experimental (pump commitment, 2026-11-13) |  |
| QB_PEEK | 2a29434f3 2026-11-13 | experimental (four-verts check-down timing, 2026-11-13; partial) | #669(2026-11-13) |
| QB_POCKET | 64b850faf 2026-11-13 | experimental (QB lane, P2: movement in the pocket, 2026-11-13; third a |  |
| QB_RELEASE | b54c39aab 2026-11-13 | experimental (QB out of the pocket as a live passer, P3 part (i), 2026 |  |
| RUSH_ARM_BALANCE | 97a8b95cb 2026-11-13 | experimental (with RUSH_HANDS; the rusher behind his own long-arm, 202 |  |
| RUSH_ONE_HAND | 46a731298 2026-11-13 | experimental (with `RUSH_HANDS`; RUSH_HANDS attempt 3, 2026-11-13) |  |
| SCREEN_QB | 2602a24d4 2026-11-13 | experimental (screens, 2026-11-13; work in progress) | #754(2026-11-14),#664(2026-11-13) |
| THROW_PLATFORM | 7f67b5961 2026-11-13 | experimental (QB lane, throw mechanics, 2026-11-13; first build, not y |  |
| HEAD | e7ecf8c1f 2026-11-14 | experimental (one head per player, perception proposal section 13, agr | #769(2026-11-16) |
| KEYED_FELT | ca86ff2be 2026-11-14 | experimental (information honesty, the hand model's keyed moves, 2026- |  |
| LONGARM_STRUT | 10b45831d 2026-11-14 | experimental (the hand model's long-arm: the blocker not disarmed, 202 |  |
| QB_BREAK | d95ed2de0 2026-11-14 | experimental (QB lane, the out-of-pocket phase, 2026-11-14; work in pr | #767(2026-11-16) |
| QB_GATHER_THROW | 2e3e19663 2026-11-14 | experimental (QB lane, 2026-11-14; read once on engine-58, `docs/revie |  |
| QB_KEY_THROW | fb4b6098a 2026-11-14 | experimental (QB lane, 2026-11-14; the re-diagnosed design after two w |  |
| RUSH_RIP | 52b239d00 2026-11-14 | experimental (PRO-INFO #9, the rating rolls: the second move, 2026-11- |  |
| EXPORT_SHOULDERS | 62d775dc9 2026-11-15 | diagnostic (2026-11-14) |  |
| QB_LOOKOFF_RHYTHM | 07b1ba464 2026-11-15 | experimental (QB lane, 2026-11-15) |  |
| GRASS_READ | 0ef292db6 2026-11-16 | experimental (read plans, 2026-11-16; the QB lane's grass-read contrac | #805(2026-11-16) |
| QB_FELT_EDGE | 0ef292db6 2026-11-16 | experimental (QB lane, 2026-11-16; Tools' margin-less threshold census |  |

## 5. Class D: off and live (31)

| flag | live because | last commit touching its read |
|---|---|---|
| ACC_RADIUS | open PR #682 | a9bb1a04a 2026-11-13 |
| BELIEVED_BODY | src touched 2026-11-24 | 778620adb 2026-11-24 |
| CALL_COMPOSE | open PR #903,#899; in 4 review doc(s) 11-23..25; src touched 2026-11-24 | 3c07513c1 2026-11-24 |
| CARRIER_BRACE | named in GAPS.md | 0cad3cbb8 2026-11-08 |
| CROSS_OVER | open PR #879 | fe14536e1 2026-11-14 |
| FLIGHT_LEAD | src touched 2026-11-23 | c7e65da4f 2026-11-23 |
| FREE_BOUND | named in GAPS.md | e8f3d1710 2026-11-12 |
| HAND_MOMENT | in 1 review doc(s) 11-23..25 | 30b24322d 2026-11-16 |
| HAND_MOTOR | in 1 review doc(s) 11-23..25 | 231273baf 2026-10-13 |
| HAND_SITE | in 1 review doc(s) 11-23..25 | 906a6b930 2026-11-13 |
| HANG_AIRBORNE | named in GAPS.md | a031f5627 2026-11-12 |
| HANG_GRIP | named in GAPS.md | b0799ab23 2026-11-12 |
| HOLD_SINK | named in GAPS.md | 72b6d5732 2026-11-12 |
| HONEST_FLIGHT | in 1 review doc(s) 11-23..25 | 57d8755c8 2026-11-14 |
| JUDGE_SEEN_BALL | named in GAPS.md | 791dafb7f 2026-11-11 |
| PERCEIVE_TRACK | named in GAPS.md | ed6286846 2026-11-14 |
| QB_ALIGN | src touched 2026-11-18 | e51c228af 2026-11-18 |
| QB_BODY_FOLLOW | src touched 2026-11-18 | e51c228af 2026-11-18 |
| QB_CLOSE_BELIEF | src touched 2026-11-18 | d57506543 2026-11-18 |
| QB_DEEP_WAIT | src touched 2026-11-18 | e51c228af 2026-11-18 |
| QB_EYES | open PR #682 | 8c9f16d37 2026-11-13 |
| QB_GATHER | open PR #682 | 21082f391 2026-11-13 |
| QB_MOF_READ | src touched 2026-11-18 | e51c228af 2026-11-18 |
| QB_PEEK_CLOCK | src touched 2026-11-18 | e51c228af 2026-11-18 |
| QB_STANCE | src touched 2026-11-18 | d57506543 2026-11-18 |
| QB_V2 | open PR #925,#903,#898,#682; named in GAPS.md+PLAN.md; in 8 review doc(s) 11-23..25; src touched 2026-11-25 | 2e02ca9a5 2026-11-25 |
| READ_WINDOW | open PR #846; src touched 2026-11-18 | d57506543 2026-11-18 |
| ROUTE_EFFORT | open PR #857 | ca27c6ba8 2026-11-14 |
| RUSH_HANDS | named in GAPS.md; in 3 review doc(s) 11-23..25 | dfda7f09d 2026-11-13 |
| SET_DECIDE | named in GAPS.md | 8006d678b 2026-11-11 |
| SINK_LEAD | in 1 review doc(s) 11-23..25 | b49aebe34 2026-11-08 |

## 6. Class E: numeric and mode flags (28)

| flag | read form | in the stack numeric section | file |
|---|---|---|---|
| APEX_LEVERAGE | ??7 | yes | src/sim/coverage/rules.ts |
| ARM_BREAK | ??1 | yes | src/sim/behaviors/defense.ts |
| BALL_EST | ??6145 | yes | src/sim/ball-estimate.ts |
| BALL_EST_NECK_SPRINT | ??45 | no | src/sim/ball-estimate.ts |
| BALL_EST_TAU_SD | ??7 | no | src/sim/ball-estimate.ts |
| BALL_GLANCE_DEPTH | ??10 | no | src/sim/ball-estimate.ts |
| BALL_SERVO_KB | ??30 | no | src/sim/ball-servo.ts |
| BALL_SERVO_KD | ??15 | no | src/sim/ball-servo.ts |
| BEND_FORECAST | ??1 | yes | src/sim/behaviors/common.ts |
| CF_FLOW | raw | no | src/sim/counterfactual.ts |
| DEF_GETOFF | ??1 | no | src/sim/agent.ts |
| END_KEY | ??2 | yes | src/sim/behaviors/defense.ts |
| GAIT_STEP | ??0 | no | src/physics/kinematics.ts |
| HAND_MOMENT_CAP | ??150 | yes | src/physics/world.ts |
| HOLD_SUBSTEPS | ??0 | no | src/physics/world.ts |
| INFO_HONEST | ??63 | yes | src/sim/behaviors/defense.ts |
| OFF_PEDAL | ??3 | yes | src/sim/behaviors/defense.ts |
| QB_FOOTWORK | ??3 | yes | src/sim/behaviors/qb.ts |
| QB_KEY_COMMIT | ??1 | no | src/sim/behaviors/qb.ts |
| QB_QUICK_DRIFT | ??0 | yes | src/sim/called-drop.ts |
| QCORNER | ??0 | yes | src/sim/coverage/rules.ts |
| ROB_COMMIT | ??7 | yes | src/sim/coverage/rules.ts |
| SIGHT_STALE | ??7 | yes | src/sim/sight.ts |
| TRUNK_RANGE_DEG | ??55 | no | src/physics/kinematics.ts |
| TRUNK_RATE_DEG | ??360 | no | src/physics/kinematics.ts |
| TURF_MU_SCALE | ??1 | no | src/physics/world.ts |
| ZONE_EYES_KEY | ??9 | yes | src/sim/zone-eyes.ts |
| ZONE_HOLD | ??114 | yes | src/sim/behaviors/defense.ts |

`GAIT_STEP`, `HOLD_SUBSTEPS` and `CF_FLOW` are registered `off` in FLAGS.md but are modes (default 0 / null).
The stack numeric section has 15; the other 13 are read with `??` and are not in the stack file.

## 7. The legacy-pinned tests

`vitest.config.ts` runs every project except `core-defaults` with each stack-`on` flag at 0 and each numeric flag at its legacy
value. Counted with `vitest list` on develop:

| project | files | tests | env |
|---|---|---|---|
| `core-defaults` | 462 | 3,096 | real engine |
| `core` (the `pinned` list in `test/engine-pin.json`) | 141 | 1,445 | legacy |
| `workflows` | 4 | 32 | legacy |
| `integration` | 7 | 11 | legacy |
| `research` | 20 | 225 | legacy |

So **172 files and 1,713 of 4,809 tests are legacy-pinned**; the pin is 36% of the test count.

I ran each of the 141 pinned core files alone on the real engine (`TEST_ENGINE_DEFAULTS=1`, files one at a time; a
whole-project run lost a worker). Results (`pinned-on-real-engine.tsv`):

- **3 pass** and could leave the pin now: `dl-attack-landmark`, `receiver-run-eligibility`, `route-craft`.
- **136 fail**: 438 failing tests of the 1,418 run. Two files (`cov7-abandonment`, `coverage-mechanics`) were killed by memory when
  run in parallel and are not classed.
- To split A from B, the 136 were run again with only the 231 B flags pinned to 0 (A on, so A's off path is unused): 73 pass. The
  other 62, run with B and the 15 numeric flags pinned: 3 pass, **59 still fail (175 failing tests of 592)**. Those 59 files
  are the ones that need a stack-A flag at 0 (the 73 older A flags are never pinned, so they are not in this count); the 77
  that pass depend only on B or numeric flags. The largest A-dependent: `responsibility-ledger` 16,
  `combo-transfer` 15, `support-work-off` 9, `support-escape-objective` 9, `man-run-continuity` 8, `runner-side-recovery` 7,
  `combo-attention` 7. This agrees with REFERENCE_STACK's count at the 2026-11-09 promotion (173 tests in 61 files).
- The workflows, integration and research files (31 files, 268 tests) were not run.

## 8. What deleting would take

**Class A off paths (163 flags).** Mechanically small: about 285 code lines name these flags, about 100 of them hold an off arm
that is not shared with the on path, and about 990 lines are declaration comments (mostly history; PR #824 is open on that
wording). A flag's removal also touches four registries: its FLAGS.md row (and the stale count line), `config/reference-stack.json`,
`config/baseline.json` (431 flags at 0: it is the 2026-10-13 profile, and it stops being reproducible once a "0" does nothing),
and its REFERENCE_STACK.md section. What it needs first is tests. The 59 pinned core files above (592 tests, 175 failing on
the default A path) must be re-recorded on the default engine, or retired where they only pin the old behaviour, before the
stack-A pin can come off; the 32 A flags that `core-defaults` files stub to 0 in-file (and the same pattern in 23 pinned files)
are deliberate off-versus-on contrasts and go with them. `npm run ref -- --off` and the `off` arm of `ref:report` are the legacy
engine as a comparator; they end with the off paths, and anything that wants a before-picture needs a frozen engine commit
instead. The 31 pinned workflow, integration and research files need one run before the order is known. The 3 files that pass
now can leave the pin today. I'd delete in this order: A flags whose pinned files are all re-recorded (the TSV lists the files per
class, and `scripts/diag/pin-bisect.ts` names the flags per file), batch by lane so each owner re-records their own.

**Class C (64 flags, plus `WRAP_FOOT`).** Nothing is pinned and the stack lists them off, so no suite needs re-recording.
For an off flag the code to delete is the on path: about 136 code lines name them plus about 430 declaration-comment lines, and
they are named in 53 test files (a flag's own test file goes with it; the others stub it to 1 in one scene). Each needs a row in
PARKED.md first (PLAN), then the guards, the FLAGS.md row, the `reference-stack.json` and `baseline.json` entries, and its tests. The
single check: that none is on its way back in an open PR (the TSV lists stale PRs naming it: `QB_PEEK` #669, `GRASS_READ`
#805, `SCREEN_QB` #664/#754, the `DEF_STANCE`/`SAM_ON_TE`/`RACE_LEAN`/`FLOW_INTERCEPT` set in #411, `HEAD` #769, `TORSO_CAPSULE` #745).
Thirty-three of the 64 are untouched since 2026-11-10 or earlier, and 13 since the 2026-10-12/13 first week, so those 13 are the
safe first batch.

## 9. Limits of this count

- D versus C is a heuristic; a lane may name a "C" flag as next week's work. `QB_ALIGN`, `QB_BODY_FOLLOW`, `QB_DEEP_WAIT`,
  `QB_MOF_READ`, `QB_PEEK_CLOCK`, `QB_STANCE`, `QB_CLOSE_BELIEF` and `READ_WINDOW` are D only through a 2026-11-18 `src` touch and may be
  superseded by `QB_V2`.
- Landing date is the stack file's first `on` on develop, not the PR's merge; a flag promoted in a merge shows the merge date.
- Off-arm line counts are lower bounds and ignore multi-line ternary arms.
- The pinned-file run attributes failures to class A by pinning; a file that fails for a mix of A and B flags is counted with A.
- Four inputs to `classify.py` (the stack file's per-flag first-`on` history, the tests-and-scripts search for flags set to 0, the
  open-PR list, and the code-reference counts) were produced by one-off commands, not saved scripts; their results are the TSV columns.
- 117 PRs are open; the D test used their titles, branches and bodies, not their diffs.
