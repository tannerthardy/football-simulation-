# Agent instructions

Read [CLAUDE.md](CLAUDE.md) for shared model/testing rules and
[the integration queue](docs/INTEGRATION.md#accepted-development) for the
accepted develop pin, ready/blocked work and authority. These rules apply to
Codex and other coding agents; old task paragraphs are historical snapshots.

- Before new work or a handoff, fetch `origin develop`, record its full SHA and
  HEAD, and compare it with the accepted queue pin. Do not start from GitHub's
  old default or treat `4ded6b6` as current development. If the fetched ref and
  accepted record disagree, resolve that discrepancy before adopting it.
- Start a new task in an isolated branch/worktree from accepted develop. Claim
  bounded files/functions in [WORKBOARD](docs/WORKBOARD.md); preserve other
  agents' checkouts and uncommitted work.
- Existing owners reconcile relevant accepted changes at clean checkpoints.
  An intentionally pinned research host is allowed, explicitly identified;
  it does not establish current-develop behavior. Keep genuine dependency
  stacks and original evidence; use minimal portable extractions for promotion.
- Do not reset, clean, force-push, rewrite published history, move another
  worker's branch or import an experimental parent to avoid a conflict.
  Ask the affected owner when behavior/contracts are ambiguous.
- Use [TESTING_COSTS](docs/TESTING_COSTS.md): one question, smallest reproducer
  and opposing control, compatible evidence reuse. Integration in this chat
  owns verification of the exact combined candidate; contributors do not
  repeat it. No automatic roster matrix, game campaign or per-push full suite.
- Publish fetchable code/evidence with exact base, dependencies, flag intent,
  failures, runtime and next decision. Integration updates the shared queue
  and accepted pin only after required acceptance under existing authority.
  No new merge, baseline/default or branch-deletion authority is granted here.
