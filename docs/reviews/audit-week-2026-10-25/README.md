# Audit follow-through: plan and agent handoffs

> **Archived 2026-10-26. Superseded; don't act on these briefs.** Packages A and INFO-next are done (#274, #280, #282), and later work merged (#283, #287). Current work is in the "Next moves, Oct 26" plan and docs/PLAN.md and docs/GAPS.md. This folder is kept as a dated record of the audit.

Published at Tanner’s request. This is the canonical reading index for the October25 audit follow-through package. It proposes the October26–November1 work; it does not amend the approved repository PLAN or make pending PRs accepted. The review snapshot is develop `9ace17336ce8593b9d29454bebaa9ebaf11132e0`, October25 at12:23p.m. Phoenix. Refresh heads before implementation.

## Start here

- [Complete technical plan](TECHNICAL-PLAN.md) — technical packages, ownership, dependencies, daily checkpoints, difficulty, verification, stopping rules and A01–A21 reconciliation.
- [20-page PDF](TECHNICAL-PLAN.pdf).
- [Original deep audit](original-audit/REVIEW.md) and [original revised roadmap](original-audit/ROADMAP.md).

## Copy-and-paste agent prompts

1. [Do-It-All!](briefs/01-Do-It-All.md)
2. [Run Game](briefs/02-Run-Game.md)
3. [Catching And Defensive Pursuit](briefs/03-Catching-And-Defensive-Pursuit.md)
4. [Measurin](briefs/04-Measurin.md)
5. [Integration](briefs/05-Integration.md)

## Supporting reviews

- [Contact and launch](inputs/contact.md)
- [Run and Coverage](inputs/run-coverage.md)
- [Information and sequencing](inputs/info-strategy.md)
- [Validation and workflow](inputs/validation.md)
- [Independent plan check: validation](inputs/plan-review-validation.md)
- [Independent plan check: Run/Coverage](inputs/plan-review-run-coverage.md)
- [Push/readiness probe and reproduction](experiments/push-readiness/README.md)

## Complete evidence and original bytes

The dedicated evidence branch is separate from this documentation PR and is not intended for merging. Its pinned commit preserves all source archives, including original workspace reports, snapshots, the reviewed Run patch, reproduction scripts and outputs. The readable copies here improve navigation; archived originals retain exact bytes and all internal forensic paths.

- [Archive index and provenance](https://github.com/tannerthardy/football-simulation-/blob/73a800464a7b2a057a2f4df59d772c89bbd87b21/artifacts/audit-2026-10-25/README.md)
- [Complete original audit, all evidence and reproduction files](https://github.com/tannerthardy/football-simulation-/blob/73a800464a7b2a057a2f4df59d772c89bbd87b21/artifacts/audit-2026-10-25/Football-Sim-Deep-Audit.zip)
- [Original week-plan package, HTML/PDF/Markdown, reviews and snapshots](https://github.com/tannerthardy/football-simulation-/blob/73a800464a7b2a057a2f4df59d772c89bbd87b21/artifacts/audit-2026-10-25/Gridiron-Next-Week-Technical-Plan.zip)
- [Push/readiness script and recorded results](https://github.com/tannerthardy/football-simulation-/blob/73a800464a7b2a057a2f4df59d772c89bbd87b21/artifacts/audit-2026-10-25/Push-Readiness-Experiment.zip)
- [Previous agent assignment packages](https://github.com/tannerthardy/football-simulation-/blob/73a800464a7b2a057a2f4df59d772c89bbd87b21/artifacts/audit-2026-10-25/Previous-Agent-Assignments.zip)
- [Archive SHA256/byte manifest](https://github.com/tannerthardy/football-simulation-/blob/73a800464a7b2a057a2f4df59d772c89bbd87b21/artifacts/audit-2026-10-25/MANIFEST.json)

To retrieve an archive without relying on another agent’s workspace:

```sh
git fetch --depth=1 origin evidence/audit-2026-10-25
mkdir -p out/audit-publication
git show 73a800464a7b2a057a2f4df59d772c89bbd87b21:artifacts/audit-2026-10-25/Football-Sim-Deep-Audit.zip > out/audit-publication/Football-Sim-Deep-Audit.zip
```

Use the same pattern for the other ZIPs and MANIFEST.json, then verify SHA256. Original audit links into evidence/, figures or local research snapshots resolve inside that full archive. Local-path names in historical reports identify their original source, not a requirement to access the author’s machine.

This publication changes documentation only. Agent-reported simulation results remain qualified; source/patch review and packet-integrity checks are distinguished from independent football reruns. Agents are required to verify the actual source and deciding controls before implementing the plan. No other chat is automatically resumed by publication.
