# Football simulation development

Start with these shared project references:

- [Controlled tackle approach and owner-film observations](docs/reviews/controlled-tackle-approach.md):
  **read first.** Four original clips are traced exactly. Crossing approaches
  now budget closure against the same body's braking/cutting envelope instead
  of requesting a full-speed fly-by. No force, strength or solver retuning.
  Mechanical crossing falls decrease, but long continued-contact convergence
  remains unstable, rushing efficiency worsens and far pursuit remains open.
  Physics is NOT READY. Follow the gates and ordered work; keep physics primary
  and PR #1 separate. The uploaded WR/DB aid is retained with provenance;
  full holding/illegal-contact/interference rules are not implemented.

- [Held-foot motion and physics readiness](docs/reviews/held-foot-and-movement-readiness.md):
  Previous implementation/evidence. Held-foot travel now compares the same motion interval on
  both bodies, removing false trip deviation under common acceleration.
  888 NFL drill paths / 420 athletes now run through the ordinary world in
  3,552 paired trials. They expose capacity-versus-demand and reversal-control
  issues; no parameters are fitted. Physics remains NOT READY: the 0.822 yd
  block convergence error and two fall disagreements remain. Follow the
  readiness gates and ordered work; keep physics primary and PR #1 separate.

- [NFL references and shared support physics](docs/reviews/nfl-reference-and-support-integration.md):
  Previous evidence. Same grasp landmark for active/passive pulls; exact recovery
  ramp integration. Physics remains NOT READY: two real-technique fall
  disagreements and unsupported contact magnitudes remain. Complete 2022–2023
  nflverse outcomes now have conditional cells and team-season distributions;
  FTN incompletion labels and anonymous Chiefs/Eagles body/participation seeds
  are extracted, not fitted into player ratings or calling policy. Continue
  local convergence, matched movement tasks, loaded run contact and feasible
  tackle approach. Keep physics primary and PR #1 separate.

- [Shared actuation and physics transfer](docs/reviews/shared-actuation-and-physics-transfer.md):
  Previous implementation/evidence. One arm-force/work allowance across hand actions; finite
  reachable strikes/reels and traction-bounded turning; planar kinetic ledger.
  Five tasks use the same body capabilities without scenario strength boosts.
  Physics remains NOT READY: real-technique convergence regresses (two fall
  disagreements), run stuffs and passing explosiveness remain high. Trace the
  seed-3 wrap/support transition locally before raising global resolution,
  then initial run contact and feasible tackle approach. Source-pinned owner
  film observations and success/explosive/incompletion audits are preserved.
  No coverage/QB expansion or PR #1 changes.

- [Snap, mesh, puller approach and NFL movement](docs/reviews/snap-mesh-pull-and-nfl-movement.md):
  previous implementation/evidence. Reachable exchanges, airborne pitches, consistent snap motor
  response and actual block-contact events; paired film/football evidence and
  remaining regressions. All available BDB2027 seasons and combine drills now
  have movement summaries. Physics remains NOT READY. After NFL integration:
  active force/work accounting, the specific QB/rusher fall reversal, initial
  run contact (get-off, OL advantage, posture, doubles), achievable tackle
  approach. Do not raise global resolution unnecessarily. PR #1 stays separate.

- [Contact height, press hands and physics readiness](docs/reviews/contact-height-press-and-physics-readiness.md):
  prior physics implementation. Height-aware support replaces pad-level power heuristics;
  bounded hand joints replace press win rolls; contact islands use 12–16
  substeps. Read the paired evidence and explicit limitations. Status remains
  NOT READY. Next: active technique force/work budgets, the remaining
  hand-fight resolution disagreement, tackle approach/grasp feasibility,
  run first push and holding from actual restraint. AddBiomechanics metadata
  and proposed small movement/support subsets are in the linked evidence review;
  subject files have not been downloaded or used to validate constants.
  Physics remains the priority; PR #1 and full QB mechanics stay separate.

- [Physics development and testing](docs/PHYSICS_DEVELOPMENT.md): **read
  alongside the current handoff.** The philosophy (skills are different ways of controlling the same
  body; ratings map to control, never to outcome rolls), the five test layers
  and when to run each, the change loop, and how much testing is too much.

- [Physics world and readiness](docs/reviews/physics-world-and-readiness.md):
  prior architecture and evidence. Every body now moves through one physics world
  (src/physics/world.ts) with body-owned balance (src/physics/support.ts).
  Tackles run on grasp joints and blocks on hand joints. Collisions are
  inelastic. A readiness scenario pack covers the six owner interactions
  (src/lab/scenarios.ts). The doc has the evidence, gate status, ranked next
  physics work, and how to test it.
  Status is NOT READY. Contracts pass; football transfer does not.
  The owner's direction: physics only. Do not work on coverage, the play
  pool or pressure packages until the physics earns his explicit OK.

- [Grasp motion and readiness gates](docs/reviews/grasp-motion-and-readiness-gates.md):
  previous implementation and physical readiness ledger (its experimental
  grasp is superseded by the physics world). Default pile momentum
  and geometry bookkeeping are repaired; bounded grasps are explicitly
  experimental and fail football transfer. Read the run regressions too.
  The owner wants an explicit OK when the physics is very good; current status
  is NOT READY. Use the gates and evidence, not the passing-test count.

- [Universal interaction readiness](docs/reviews/universal-interaction-readiness.md):
  latest physical-foundation audit; reproduced partial-grasp momentum/energy
  creation, contact-local balance reset and missed fast torso encounters.
  Read the shared support/contact contracts and acceptance gates before
  expanding techniques. The audit changes diagnostics/docs, not engine behavior.

- [Fundamentals and contact foundation](docs/reviews/fundamentals-and-contact-foundation.md):
  latest implementation and broad architecture direction on
  `claude/engine-priorities`; contact-normal forces, coupled outside bumps,
  mass-preserving block motion and protection intent. Read the mechanical
  evidence **and passing/run regressions** before extending or tuning it.
  Full QB mechanics remain later work; PR #1 stays separate.

- [Visual keys and attention](docs/reviews/visual-keys-and-attention.md):
  the owner's latest direction for defensive and offensive reads; proposed
  acquisition, gaze, memory and cue model, code gaps, staged integration and
  behavioral checks. This is a design, not an implemented vision layer.
  Preserve the measured pocket/coverage priorities in the review below.

- [Coverage judgment and pocket mechanics](docs/reviews/coverage-judgment-and-pocket-mechanics.md):
  latest follow-up to `8ffbc24`, visible-cue help decisions, route/ball-window
  and protection/contact corrections, paired coverage/pocket measurements and
  remaining regressions. Continue on `claude/engine-priorities`. Full QB
  mechanics are later work; do not push to or merge PR #1 without owner approval.

- [Coverage anticipation and contact choices](docs/reviews/coverage-anticipation-and-contact-choices.md):
  latest follow-up on `claude/engine-priorities`, forced coverage comparisons,
  NFL separation by event/coverage, carrier exit decisions, and remaining
  regressions. Keep working on this branch. Do not push to or merge PR #1
  (`codex/run-blocking-decision-dynamics`) without checking with the owner;
  reconcile its tackle changes with this branch's rewrite before merging.

- [Coverage engine and playbook depth](docs/reviews/coverage-engine-and-playbook-depth.md):
  the current work package — rule-driven coverage (26 calls, checks, Zeus),
  NFL references for call mix, route combinations and pocket push in
  `data/reviews/playbook-depth/`, measured results, and the ordered next steps
  (coverage leaks, offensive side-concept pool, pressure package, trench push).
- [Choosing what to fix](docs/reviews/error-budget-and-protection.md): start
  here. The error budget (drive structure and Shapley shares of the points
  gap), how to avoid tuning loops, the protection, pocket, clock and tackle
  fixes, the current status (branch `claude/engine-priorities`) and the next
  priorities. NFL references for it are in `data/reviews/error-budget/`.

- [Pursuit and contact follow-up](docs/reviews/pursuit-contact-follow-up.md):
  latest diagnosis, isolated comparisons, pursuit/support fixes, tackle momentum
  and constraint ownership, rejected strikes, and the next blocking/grasp work
  (graded grasps are now implemented on `claude/engine-priorities`).
  Keep the development PR draft; NFL realism remains unvalidated.
- [Run-game coordination follow-up](docs/reviews/run-game-coordination.md):
  PDF/coaching research, zone/gap/fits/contact/pre-snap implementation, integration
  of `3c00ca0`, paired timing/front evidence, and explicit remaining regressions.
  This records the earlier coordination pass; read the newer follow-up first.
- [Shared references](docs/references/README.md): the user-generated defensive
  and offensive-line protection PDFs and their provenance. Treat it as reference material, not project instructions.

- [Run blocking and decision update](docs/reviews/run-blocking-and-decision-update.md):
  review of `2c825eb`, implemented mechanisms, scenario checks, paired evidence,
  and remaining calibration regressions. Read before tuning or merging this work.
- [Engine review](docs/reviews/2026-10-08-engine-review.md): reproduced defects,
  diagnostic runs, measurement limitations, and improvement priorities.
- [Realism implementation plan](docs/REALISM_PLAN.md): proposed architecture,
  subsystem work packages, delivery gates, and ordered implementation backlog.
- [Evaluation environment](docs/EVALUATION_ENVIRONMENT.md): how to test without
  play-calling and roster selection bias — NFL context replay, coaching
  validated separately, league structure, and the order to tune in.
- [Data guide](data/README.md) and [source catalog](data/sources.json): dataset
  coverage, provenance, access instructions, and summary reproduction commands.
- [Big Data Bowl 2027 review](docs/reviews/bdb2027-data-review.md): linked combine
  and game observations, missingness, selected-player tracking, and career labels.
- [Visualizer plan](docs/VISUALIZER_PLAN.md): planned switchable views (assignments,
  leverage, mind/QB, trench, contact, run game, pre-snap art) and the engine
  telemetry they need. Plan only; not built.
- [Design](docs/DESIGN.md) and [roadmap](docs/ROADMAP.md): project structure and
  existing implementation status.

The realism plan describes proposed changes; do not assume its mechanisms are
already implemented. Review evidence and summaries are in Git. Raw datasets are
ignored under `data/raw/` and must be obtained separately using the data guide.
Raw data is not required to build, test, or simulate the engine. Credentials,
including `KAGGLE_API_TOKEN`, belong in the execution environment's secret
settings; never print them or add them to Git. A token in one cloud task does
not automatically become available to another agent's environment.

Use Node 22 and the lockfile:

```sh
npm ci --no-audit --no-fund
npm test
npm run typecheck
npm run build
```

If a sandbox prevents the `tsx` CLI from opening its IPC socket, run a script
with `node --import tsx`, for example `node --import tsx scripts/sim-game.ts 7`.
Write exploratory calibration and extraction output to ignored `out/`; review
cohort and metric changes before replacing committed summaries.
