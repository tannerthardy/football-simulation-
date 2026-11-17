# Coverage by position: coached rules vs the engine (2026-11-17)

Spec and audit for Defense (no code changes), develop c85e6b9d. Each cell (source, TC/VS, engine file:function, M/D/A)
is in [the table file](2026-11-17-coverage-position-table.md), by family: Cover 3 (Sky, Rip/Liz, Seam, Buzz, Cloud,
Mable, 9), Cover 0/1 and fire zones, Cover 2/Tampa/Deuce/2-Man, Quarters (MOD/MEG/Palms/Box/Book/Poach), 6/8.
Share of our 1,039 logged calls: Cover 3 36%, Cover 1 23%, Quarters/6/8 21%, Cover 2 15%, Cover 0 6%. Code-read only, no runs.

## Ranked differs/absents (share of calls touched x Defense's links L1/L2/L3)
1. **Deep players bite on the arm and on pumps** (L1, L2; ~94%: every deep zone, the C1 free safety, zoned-off corners,
   Rob). `defense.ts:playBelievedBall` plants on the load and shoulder-breaks at 0.9 speed on any arm "through"; a
   pump is one (`release-belief.ts` header). Only the pre-belief `underneathPlant` is gated `!this.deep`
   (`ZoneCoverage.updateCore`). TC: single-high and halves hold until the release, never break on a pump; Quarters
   safeties earn pre-throw downhill from #2's route, not the arm.
2. **Pre-throw deep-drive on a stopped route** (L1, L2; ~94%; man calls default to match style). `zonePlay`'s
   pattern-read branch drives at 1.05 zone speed when the deepest route stops, unless another climber is within 8 yd
   *of him*. It runs before SAFETY_DEPTH's hold-over, and in quarter and third-corner seats the `owned` filter
   empties the guard, so he drives on #2's curl with #1's post climbing. TC: a Quarters rob, wrong for 3/1/2/6/8 deep.
3. **Deep middle and halves have no taught ownership** (L2; C3+C1+C2+6/8 halves, ~70%). Threats are the deepest in
   a fixed band re-picked every tick (ZONE_HOLD bit 1 off). Two verticals are split 0.35/0.65 toward the seen QB
   look (TC midpoint; VS the Rip/Liz post melts, closer to ours). No squeeze-wide; the Sky corner's `owned` filter
   drops #2; the C1/C3 middle keys S2 only, not 3-2-1 inside-out.
4. **No last-line mode; deep defenders drive at the catch point at full speed** (L1, L2; all). ARRIVE_LEAD is
   underneath-only; OPEN_FIELD's on-top approach ends once passed by 0.8 yd.
5. **Quarters safety** (L1, L2; 21%). A #2 cancel locks `one` in 0.12-0.19 s with no 5-yd declare, then Robs #1
   before #1 declares (`rules.ts:qSafety/helpOne`); `two` stays locked on #2's dig. TC: post before curl. MOD China
   corner plays over #2's corner, not under.
6. **Match underneath commits without a declare phase and never re-reads** (L3; C3 match, fire zone, Q apex, C1
   banjo, ~45%). Seam/flat latches `zoned` on the first out (`seamCurlFlat`); the hook commits at 3 yd. No "#3 away:
   take #2 back across"; CUT_WALL `passUnder` turns that and banjo's inside man into wall-and-drop. Unowned: the wheel,
   #3 to the flat with #2 up, and #2's seam on a fire-zone weak Push.
7. **Squat/cloud corner locks** (L3, L2; C2 Match, Tampa, 6/8, ~20%). A flat read locks the flat for good; otherwise
   trail-man on #1's hitch while #2's corner goes over. No high/low top-down, no reroute anywhere.
8. **Cover 1 underneath** (L3; 23%). The robber has no rule and never uses Rob; man leverage flips at the ball on
   crossers, no mesh switch; a man on a blocking back never converts; Lurk's bunch banjo contradicts HNFL-240.
9. Smaller (L2/L3): Mable post has no #3 rule; Tampa Mike re-picks any seam per tick; `mike_3` keys only the back;
   6/8 vertical-curl zones 5 yd off the ball; Palms trigger 7.5 yd (taught 5); Cover 0 has no TRAIN peel.

## Variations and corrections
- VS, our pick: the Tight 1/3 corner on #1's curl follows HNFL's man-like rule; the consensus says deeper than the
  deepest (L1 if meant). Cover 0 corners press inside; the Cloud corner never sinks under #1.
- "Sky corners don't bail" is wrong: they bail to 16 yd; the fault is `owned`. ZONE_EYES, CURL_SINK, SETTLE_DEPTH are
  on (docstrings say off). Items 1-3 and 6 are zone-coached-rules B4, B5, C10 and the match declare.
