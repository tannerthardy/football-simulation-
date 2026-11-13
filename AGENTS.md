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

<a id="no-github-actions"></a>
## No GitHub Actions

Since 2026-10-26 (Tanner's decision), no CI runs on GitHub. The workflows
in `.github/workflows/` run only when started by hand, and nobody starts them
for routine work: they used up the month's Actions minutes in four days.
Missing or "skipped" checks on a PR are expected, not a failure to chase.

- **Authors** run the checks that apply to the change in their own
  environment (`npm test`, `npm run test:integration`, `npm run typecheck`,
  `npm run build`, `npm run test:data`). A change that touches plays also
  needs a matched restage (at least 4 RNG-shifted replays when the RNG path
  changes) or a local scorecard. Paste the commands and their pass/fail results, with the tested
  commit SHA, in the PR body.
- **The merger** re-runs the affected checks locally on the PR head after it
  is updated with the latest `develop`, and merges only when they pass. This
  applies to every PR, not just ChatGPT/Codex ones.
- Do not re-enable automatic triggers, re-run workflows, or start one by hand
  without Tanner's explicit OK.
