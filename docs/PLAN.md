# Plan

Approved by Tanner on 2026-10-22. It changes only at a review. The full
reasoning is in the [operating plan](https://claude.ai/artifact/QyJcg5wYYaxaYwHPzf7A6K)
and the [audit](https://claude.ai/artifact/TXYF6DZsWiNVLnNALHxVGz).

## Goal

Close to the most realistic football engine possible, mostly physics-based and
driven by real football logic, so play feels expressive, living and adaptive.
It then becomes a management game.

## How we work

- **One trunk.** Every branch starts from it.
- **One ranked gap list:** [GAPS.md](GAPS.md). At most three gaps are worked at
  once, one per lane.
- **Cycles, not a calendar.** Pick, work, review, as short as the work allows.
  The plan and the gap order change only at a review.
- **The scorecard is a diagnosis, not a verdict.** It shows where our football
  looks unrealistic and where a change moved it. It never decides whether a
  mechanism is correct.
- **Testing stays cheap.** Use the smallest check that answers the question:
  unit or scenario tests, then `npm run scorecard` (quick tier, 6 games), the
  PR tier (12 games, run by CI), and the full tier (48 games) only for big
  fixes.

## Merging

A PR is merged when its mechanism is right on its own evidence: football
logic, tracking measures of that specific behavior, film and tests. The PR
attaches its scorecard and explains each stat that moved.

- A stat that gets worse usually exposes another missing or mistuned
  mechanism. Log it as a new or re-ranked gap. Don't reject the PR for it.
- Block a PR only when the regression traces to a bug in the new mechanism.
- A PR that has to wait for another gap is parked as "waits on Gx", with its
  branch kept. It is never closed as failed.

## Names

- Lanes: `run`, `defense`, `coverage`, `trenches`, `physics`, `rules`, `tools`,
  and later `coaching` and `league`.
- Branch: `<lane>/<gap-id>-<short-goal>`, for example `defense/G1-open-field-tackle`.
- PR title: `[G1] Defenders take pursuit angles to the ball carrier`.
- Labels: one `lane:*`, one `gap:*`, and one of `ready`, `needs-tanner`, `hold`.

## Rules for every agent

- Start from the trunk. Work only on your gap, on the branch named in your brief.
- Keep one open PR per agent. At most three agents are active at once.
- Add physics detail only when a gap's diagnosis traces the failure to physics,
  and check it against what tracking data can measure.
- Register every new flag in [FLAGS.md](FLAGS.md) with an expiry two reviews
  out. Keep at most 10 experimental flags. At expiry, a flag becomes the
  default and its old path is removed, or the flag is deleted.
- No receipts, ledgers or evidence files in Git. Put output in `out/`, and the
  summary in the PR.
- Anything that changes this plan, a gap's target or the trunk is labeled
  `needs-tanner` and waits for a review.
