# Agent instructions

<a id="operating-plan-read-first"></a>

Start with [PLAN](docs/PLAN.md), then [GAPS](docs/GAPS.md). The approved
2026-10-22 plan governs assignments, review, testing tiers, flags and merging.
It supersedes the old integration queue, WORKBOARD claims, mandatory
integration-owner verification and Git-tracked receipts. Read
[CLAUDE.md](CLAUDE.md) for the shared football-model rules that still apply.

- The trunk is `develop`. Before work or handoff, fetch it and record its full
  SHA and your HEAD. GitHub's legacy default and historical `4ded6b6` are not
  the starting point. Do not compare against the retired queue's accepted pin.
- Work only on the assigned gap, in an isolated branch/worktree from the
  trunk. Follow PLAN's lane/gap naming, one open PR per agent and three active
  agents limit. Assignments and priorities come from Tanner through the
  coordinator; this cleanup does not create new assignments.
- Agree changes to shared functions with the owning lane. Preserve workers'
  checkouts, uncommitted work, genuine dependency stacks and pinned research
  hosts. Qualify old evidence by its actual source/settings; it does not
  establish current-trunk behavior.
- Do not reset, clean, force-push, rewrite published history, move another
  worker's branch or import an experimental parent to avoid a conflict.
- Use the smallest relevant local check, then PLAN's applicable scorecard and
  review tiers. Documentation-only navigation edits use documentation/path
  checks; they do not need football games. Existing diagnostic tools and older
  receipts remain usable references, not extra mandatory gates.
- Publish code in your PR with its exact base, dependencies, intended defaults,
  focused checks, known risks and explanation of moved statistics. Keep new
  raw output in ignored `out/` and the summary in the PR. Do not add receipts,
  ledgers or evidence files to Git. Preserve existing evidence and fixtures.
- Follow PLAN's `ready`, `needs-tanner` and `hold` decisions and flag registry.
  A readiness label is not permission to exceed the current task's scope.
  Historical baselines, repository defaults and destructive cleanup are
  separate decisions; no authority to change them is granted here.
