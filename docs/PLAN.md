# Plan

Approved by Tanner on 2026-10-22; on 2026-10-23 he asked for the outside
audit to be folded in (the seam check, measurement claims, and "Next after
the film threads"). It changes only at a review. The full
reasoning is in the [operating plan](https://claude.ai/artifact/QyJcg5wYYaxaYwHPzf7A6K)
and the [audit](https://claude.ai/artifact/TXYF6DZsWiNVLnNALHxVGz).

Brought up to date on 2026-11-24 at Tanner's request (develop `engine-95`):
the testing and merging steps as they are run now, the lanes, and
"Current direction". The goal, the merge criteria and the long-term direction
are unchanged.

## Goal

Close to the most realistic football engine possible, mostly physics-based and
driven by real football logic, so play feels expressive, living and adaptive.
It then becomes a management game.

## How we work

- **One trunk.** Every branch starts from it.
- **One ranked gap list:** [GAPS.md](GAPS.md). Usually three gaps are worked at
  once, one per lane; Tanner can add one when a gap becomes urgent (G5 was
  added this way on 2026-10-22).
- **Cycles, not a calendar.** Pick, work, review, as short as the work allows.
  The plan and the gap order change only at a review.
- **The scorecard is a diagnosis, not a verdict.** It shows where our football
  looks unrealistic and where a change moved it. It never decides whether a
  mechanism is correct.
- **Testing stays cheap.** Use the smallest check that answers the question:
  unit or scenario tests, then `npm run scorecard` (quick tier, 6 games), the
  PR tier (12 games), and the full tier (48 games) only for big fixes. There
  is no GitHub CI ([AGENTS.md](../AGENTS.md#no-github-actions)): the owning
  lane runs the checks locally and reports them in the PR.
- **Compare like with like.** Measure a change against a base arm in the same
  run, or a saved card whose provenance matches (#209). Games that change on
  the first few plays lose most of the pairing, so check a second seed before
  calling a whole-game move. A landing card is run on the engine's defaults
  (`npm run ref`) with a `ref` arm beside the candidate arm, over several
  seeds; one arm alone compares nothing. A result conditioned on a rare event
  (the play after a missed tackle, one coverage cell) needs more games than a
  whole-game rate before it is read.
- **Every landing shows it broke nothing.** `node scripts/red-diff.mjs` runs
  the core suite against the recorded list of failing tests
  (`test/red-ledger.json`, #878) and reports new and fixed failures. A landing
  shows "new red: 0", or names and explains each new one. Checking only a
  fixed list of tests hid about 68 failing tests on develop before this.
- **Check the seams before the brain.** Most "dumb player" film examined so
  far came from a hand-off between systems, not missing intelligence: an aim
  kept after the target changed, a shortcut to hidden state, contact granted
  before the body arrived, or a later stage rewriting the command (outside
  audit, 2026-10-23). For a clip, restage the exact play, find where it first
  diverges, and check what the player saw, what he asked for, which stage
  changed the request and what the body did. Only then call it a decision
  problem.
- **Say what a number measures.** A tracking statistic supports only the
  claim its operator measures. A per-play maximum of smoothed speed loss isn't
  a braking capacity, and the fastest orientation change on a path isn't a
  turning capacity. Label the limits next to the number.

## Merging

A PR is merged when its mechanism is right on its own evidence: football
logic, tracking measures of that specific behavior, film and tests. The PR
attaches its scorecard and explains each stat that moved.

- A stat that gets worse usually exposes another missing or mistuned
  mechanism. Log it as a new or re-ranked gap. Don't reject the PR for it.
- Block a PR only when the regression traces to a bug in the new mechanism.
- A PR that has to wait for another gap is parked as "waits on Gx", with its
  branch kept. It is never closed as failed.
- The coordinator merges, after the owning lane's evidence and any sign-off
  from a lane whose shared code it changes. A PR that turns on mechanisms other
  lanes built gets those lanes' confirmation first.
- A test pinned to an older setting so a staged scene keeps working carries a
  comment saying why, and the open question goes in
  [KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md).
- A change that removes hidden information (a player reading true state he
  could not perceive) lands as soon as it is correct, whatever it does to the
  statistics (Tanner's standing rule, 2026-11). Numbers measured before such
  a removal are re-measured before anything is built on them.
- A flag the scorecard is to compare must be registered in
  `config/reference-stack.json` (`"on"` or `"off"`) and `config/baseline.json`
  (`"0"`), and read in code only as `process.env.X === '1'` (off by default)
  or `process.env.X !== '0'` (on by default); other forms are rejected by the
  provenance check. Engine ids (`engine-N`) are given in merge order.

## Names

- Lanes as of 2026-11-24: `qb`, `coverage`, `defense`, `run`, `rules`
  (Rules + Coaching), `tools` (Tools / Physics) and Flex, with Integration as
  the coordinator. `trenches` has no lane at present; blocking changes go to
  Defense. `league` is later.
- Branch: `<lane>/<gap-id>-<short-goal>`, for example `defense/G1-open-field-tackle`.
- PR title: `[G1] Defenders take pursuit angles to the ball carrier`.
- Labels: one `lane:*`, one `gap:*`, and one of `ready`, `needs-tanner`, `hold`.

## Rules for every agent

- Start from the trunk. Work only on your gap, on the branch named in your brief.
- Keep one open PR per agent. Usually three gap lanes are active at once (see above).
- Add physics detail only when a gap's diagnosis traces the failure to physics,
  and check it against what tracking data can measure.
- Commit to mechanisms that make clear football sense. A change that is
  plainly more realistic lands on by default, with its moved stats explained
  in the PR. "Default" means the value in the code, which games, tests and
  the scorecard run, not a profile in `config/baseline.json`. A flag that stays off and changes nothing anyone tests is not
  progress.
- Use a flag only for a real open question: two credible ways to do it, or a
  mechanism that needs another gap fixed first. Register it in
  [FLAGS.md](FLAGS.md) with an expiry two reviews out, and say what evidence
  decides it. Keep at most 10 experimental flags. At expiry, a flag becomes
  the default and its old path is removed, or the flag is deleted. Flags
  promoted on 2026-10-22 keep their `=0` switch until review 2, then the
  off path goes. A
  deleted or parked flag gets a row in [PARKED.md](PARKED.md), so the idea
  isn't lost.
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

## Current direction (2026-11-24)

Set by Tanner over 2026-11-23 and 2026-11-24. [GAPS.md](GAPS.md) has the
diagnosis and owner of each item.

1. **The pass game is the priority, and the quarterback's decision is first.**
   It is being rebuilt, not patched:
   [the plan of record](reviews/2026-11-24-qb-decision-plan.md) replaces the
   passer's read logic, timing models and window judgment with one controller
   (`QB_V2`) that models the taught procedure: a pre-snap plan, each read on a
   step of his feet, a look that takes time to resolve, and a judgment of the
   few defenders that matter to the throw. Plays carry their reads as taught.
   It takes over one concept family at a time, quick game first, each phase
   gated on release against the break, what is thrown when, his belief
   against the outcome, and passers of different ratings behaving differently.
2. **In parallel:** coverage of the deep outside throw and the flat in
   Cover 2 and Cover 6; defenders re-aiming; pursuit after the catch; coming
   off a shed block; the tackle.
3. **Slowed or parked behind these:** the pre-snap movement build, the catch
   model rebuild, and scheme options. Where coaching points differ, the most
   standard version is built now and the variants become scheme options
   later.
4. **Standing rules restated in this period:** realistic and bug-free lands
   whatever it does to scoring, and a gap that opens points to the next
   missing mechanism, not to a dial; every information leak found is removed
   and a real solution built; a technique that works too well is given its
   real cost, never banned; a failed attempt stays on its lane branch,
   written up, and is not landed off unless another lane needs it.

## Next after the film threads (2026-10-23, historical)

Superseded as the working order by "Current direction"; kept because its rule
on leak removals still holds. Set on 2026-10-23 from the outside audit; the findings are in
[KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md). Each step is small and judged on
restaged plays with a control:

1. **Tools, with games identical** (F1). *Done* (#249, #250, #252–#254, #257,
   #262, #265, #270): a fixed actor build order and slot-keyed error streams, a
   record of who owned each command (PERF-6), the mechanics guard and data
   tests in CI (PERF-3), scorecard wording (PERF-4), saved-play capture and
   replay, and the film-scout and paired-scout review queues.
2. **Seam repairs** (G10). *In progress.* Aims tied to their target (ACT-1)
   landed in #251. #238's hidden gate now reads acquired pose (#258). Both
   routes to the true ball carrier (INFO-1, #260) and one reach geometry for
   standing, lunge, dive and hold (TKL-5, #264, with QB-3 and TKL-1) are held
   for rework: each removed a leak or a wrong rule correctly but also removed
   something a real player has (a scramble cue, the laid-out body), and the
   matched plays showed it. #256 (engaged work-off) waits on #260.
3. **COV-6** for Coverage. ACT-1 has landed, so it can start; the turning
   measurement in #255 is held.
4. **The first adaptation test:** the P029 corner (COV-7). From what he has
   seen, he may stay in man, take his capped alley fit, or chase, and he pays
   a real price when it's a halfback pass or a stalk-and-release. Its
   abandonment-cost fixture landed in #271; the pilot (#269) is next.

**Rule from the latest reviews:** a PR that removes a leak adds back, in the
same PR, what a real player could see or do. Judge it on matched plays (same
seed, bodies and call), not only on the card, because the card mixes the
mechanism with game divergence.

The decision-layer question, one shared chooser or role-specific policies,
waits until these are done. Success is defined in football terms: a player
keeps a valid commitment, drops an obsolete action without inheriting the old
plan, and makes a justified adaptation for his role on a case he wasn't built
for. A shared chooser has to be earned by a failure two roles share that local
fixes can't solve. Tanner's research phase comes before any such build: how
players process a play, and when rules should win over making a play.

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
