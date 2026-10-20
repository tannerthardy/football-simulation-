# Combined controller checkpoint: game context and retained limits

This is a data-only interpretation of Integration's four completed games. It
runs no further engine, recollects no panel and changes no acceptance policy.

- Previous accepted: `2c98bed94adad8087c65f381d4090444ad283985`, source
  `4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571`.
- Combined candidate: `7d5da0c79adea4d7c4b43b85c498876ffe6d8742`, source
  `12a5c88025b3c306c4673805fec54c45095e06730b9d8c98efc030694b36d1f9`.
- Existing frozen teams and seeds701/702;44 accepted flags, components1,
  full native recording. Candidate zone is the smoke and is reused. All four
  attempts completed; no timeout, retry or hidden skipped remainder.

[Compact game/runtime observations](../../data/reviews/current/finished-controller-game-context/football-context.json),
[score/time conservation](../../data/reviews/current/finished-controller-game-context/score-audit.json),
[possession audit including the preserved baseline failure](../../data/reviews/current/finished-controller-game-context/turnover-audit.json),
and [explicit comparable clip choices](../../data/reviews/current/finished-controller-game-context/comparable-selection.json)
are fetchable separately from large raw film archives. Integration publishes the
complete collector, official-credit, rules and source-verification receipts.

## What these games establish

| Matched fixture | Previous score | Candidate score | Collection seconds previous→candidate | World steps previous→candidate |
| --- | --- | --- | --- | --- |
| Zone reference |46–57|27–41|29.465→31.589|12,569→12,264|
| Spread/air raid |37–34|45–35|30.774→33.556|13,185→12,655|

The candidate completes these ordinary run/pass game contexts with consistent
credited plays, down attempts, official scores and time. Lower total points are
not the reason to adopt a correction. Later calls, fatigue, execution and RNG
history diverge; these are not 274 isolated same-state comparisons.

Collection cost rises7.2% and9.0%. Per1,000 observed World steps it rises from
2.344→2.576s and2.334→2.652s, or9.9% and13.6%. These include the identical passive
collector and changed native rules/controllers; they do not attribute the cost
to one feature or establish a population performance threshold. Film/artifact
production remains15.4–15.9s per game and is separated from collection. The
bounded four-game execution stays within the declared480s ceiling.

Both candidate scores independently conserve credited points. Zone is H1:
4TD+3XP=27, A1:5TD+5XP+2FG=41, with the failed two-point try contributing zero.
All games' scoring categories, including defensive scores and safeties where
present, reconcile without ambiguous categories. Complete regulation time of
possession sums to3600s per game.

## A real historical accounting defect remains visible

Baseline spread P023 (native index22), Slant-Flat, has actual possession history
O→D→O: H2's quarterback throws an interception to A2-CB1, the returner fumbles,
and H2-WR6 recovers. It has no foul or nullification. The original box has H2=4,
A2=1 turnovers; the actual complete-game possession history requires H2=5,A2=2.
The original values and recordings are preserved.

At old `game.ts:998`, team turnover credit depends on final `r.turnover`. This
omits the original interception when the offense regains possession. Its old
singular fumble fields also omit the defensive returner's lost fumble, although
the segments retain it. Quarterback interceptions therefore total six while the
team box totals five, and all achieved possession changes total seven. This is
not an accepted-foul case or a new integration regression.

PR188's `deriveOfficialPossessionStats` counts each official possession change
and the native fumble ledger, with O/D credits applied separately by Game.
Existing independent native tests cover loss-and-regain, return fumbles and
nullified histories. Both candidate games reconcile exactly: zone0/0, spread
H2=1/A2=4. These changed game paths do not themselves rerun baseline P023 under
new code; the supported fix consists of the explicit source contract plus its
existing independent controls. No game was repeated to diagnose this mismatch.

## Football remains mixed

Candidate games have274 physical scrimmages and257 charged plays. Compared with
the old two-game packet, box explosive plays are31→32, sacks13→18, rushing
TD10→11 and passing TD10→8. These counts are context, not tuning targets. Mean
YAC can fall while ordinary protection worsens. The smoke still includes76-,
49- and80-yard rushing touchdowns and passes with65/52YAC. The opening76-yard
run remains a75.99-yard touchdown in the candidate. Do not call the deep pursuit
or explosive-run tail solved.

The candidate zone's205 rules review items are not205 errors:95 uncertain
holding exceptions,42 unclassified teammate torso contacts,21 unproved holding
restrictions,12 selected holding modes, one uncertain OPI assessment, and34
instances of the same explicit teammate-assistance limitation. They preserve
missing legal predicates instead of inventing flags. The complete rules audit
also inventories kicks, tries and pre-snap entries; generic limitations alone
are not waived assertions or automatic failures. This build still does not
establish complete NFL officiating or a physical special-teams model.

## Three explicit native film comparisons

These are picked for installed football context, including adverse behavior,
not because each produces favorable yardage. GIFs preserve their full sequences.

1. **Counter, zone P011→P017:** same offense/call/front/coverage and1st-and10 at
   the35. The puller's DE receives runner contact at2.70→2.05s and finishes
   at3.40→2.90s; gain−0.24→−3.78. Earlier defensive access is real. It does not
   establish improved blocking, and earlier game history differs.
2. **Power, zone P008→P008:** same concept/front/coverage. Baseline RG climbs
   at1.10 and connects to Mike at1.70; candidate RT climbs at0.85 and connects
   at2.65. Mike then wraps at3.30, with Will assisting at3.90 and a4.00 finish,
   replacing the old missed Will dive and touchdown. This is an achieved
   defensive finish, not proof that a single patch caused it. Baseline context
   is1st-and20 at55.3; candidate is2nd-and10 at64.2.
3. **PA Post-Dig, spread P002→P002:** same opening call/front/coverage and
  1st-and10 at33.0/32.8. The edge still reaches the QB at2.90/2.85 and sacks
   him at3.15/3.20, for−7.95/−7.86. This is a useful retained failure/control,
   not a claimed protection improvement.

A changed blocker/defender interaction and a smaller gain are not automatically
better football. The reviewed mechanism and actual achieved work justify the
bounded corrections; these games test their combination and expose remaining
football work without a new broad research campaign.
