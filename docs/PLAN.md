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
- Commit to mechanisms that make clear football sense. A change that is
  plainly more realistic lands on by default, with its moved stats explained
  in the PR. A flag that stays off and changes nothing anyone tests is not
  progress.
- Use a flag only for a real open question: two credible ways to do it, or a
  mechanism that needs another gap fixed first. Register it in
  [FLAGS.md](FLAGS.md) with an expiry two reviews out, and say what evidence
  decides it. Keep at most 10 experimental flags. At expiry, a flag becomes
  the default and its old path is removed, or the flag is deleted.
- No receipts, ledgers or evidence files in Git. Put output in `out/`, and the
  summary in the PR.
- Anything that changes this plan, a gap's target or the trunk is labeled
  `needs-tanner` and waits for a review.
- Agents may message each other directly for a concrete handoff between
  lanes: a question, a measurement, or a shared function's contract. Mention
  it in your next status. Priorities, assignments and plan changes come only
  from Tanner, through the coordinator.
- G1 to G3 meet where a defender reaches the ball. Coverage owns the reaction
  before the catch, Run Game owns the gap fits before contact, and Defense
  owns pursuit and the tackle. Agree on a change to a shared function with the
  lane that owns it before you push it.

## Long-term direction

Tanner set this direction on 2026-10-22. It is far off: no agent works on it
until the current gaps are fixed and the engine is fast enough to test many
games cheaply. It is here so that today's choices don't close it off.

**The big idea: no meta to abuse.** A user wins by being creative with what
they have: their players, their coaches and the opponent in front of them.
No play, scheme or archetype wins regardless. When something dominates, the
rule "never ban what works too well" applies: find its missing counter or
cost and build that.

- **Players differ the way real players do.** Some are very physical and slow
  to read, some are smart and unathletic, some are good at everything, some at
  little. Build each player from separate traits instead of an overall:
  - body: mass, strength, speed, burst, change of direction;
  - mind: processing speed, read accuracy, anticipation, discipline;
  - technique: one rating per skill.

  Draw them from correlated distributions fitted to real players, using
  combine and per-player tracking measures. Ratings stay capacities,
  perception and control (the model rules), so "physical but slow to read"
  shows up as a player who arrives fast after a late or wrong read.
- **Flexible play-calling.** A concept is a set of rules (routes with landmarks,
  blocking rules) that can run from any formation that meets its needs, as
  real offenses work, instead of a fixed list of plays. Testing doesn't cover
  every combination. It checks that each rule is executed correctly, and it
  checks outcomes by concept against tracking. A bad combination fails for a
  football reason, such as nobody there to kick out the end.
- **Coaches and scheme fit.** A coach knows his players but coaches what he
  knows. A season plan is a stock list of plays he builds around. A team runs
  some plays better without simply being better, through three mechanisms:
  - demands: a scheme needs certain archetypes (Veer and Shoot needs fast
    receivers who read leverage);
  - teaching: a coach's history sets how well his team executes each family
    of concepts, and practice time is limited, so an air raid staff that
    never taught wide zone can't build a great wide-zone team without
    stacked talent;
  - familiarity: defenses that rarely see a scheme play it worse. That is
    one reason an underdog like Kansas may be right to run triple option
    against a team like Alabama, along with higher variance and fewer
    possessions.

These grow out of G7 (play-calling) and G8 (league). The speed work (F2)
comes first, because testing these needs many games.
