# Counter GT count / insertion boundary

Read-only source and saved-trace inspection, 2026-10-20. No new simulations,
tests, controller changes or count variants. The native traces inspected are
`out/puller-technique/k01-corner.json.gz` and `k04-corner.json.gz`, source SHA
`bc20ffcef1505ea929381bd20cc738c23187bf0f3372ec223358ec053133b449`.
These are the parent's declared corner diagnostic, **not accepted-baseline
results**. K01 recorded input SHA is
`d46d95a3ada575ef41049ead6847bcfc98f7027301ad97cdf0727ec1884167b0`;
use the trace's complete setup and settings rather than substituting a current
formation by name. Historical review evidence is separately qualified below.

## What actually reserves the other backers

`src/sim/behaviors/blocking.ts:479` builds a unique `claimedLB` ledger.
`lbNear` ranks unclaimed backers by lateral distance, with an optional 1.5-yard
playside penalty. It does not measure route feasibility, a point-LB contract,
runner arrival or the timing of an optional combo release.

For weak K01/K04, playside is +y, ball y=26.67, B-gap insertion y=28.62.
The gap line is processed inside-out for first-level ownership, then pending
blockers acquire their combo/climb backers **before** GT's wrapper is installed.

| Blocker | Installed first job | Installed next responsibility |
|---|---|---|
| C | Down/back block DT_S, covering RG's vacated surface | No initial backer claim |
| LG + LT | Down double on DT_W; LT is the initial helper | Will (`LB_W`), reserved by `lbNear(28.77, true)` |
| H, attached playside | Immediate climb | Mike (`LB_M`), reserved by `lbNear(29.57, true)` after Will is taken |
| Y, attached backside | Cutoff DE_S | No initial backer claim |
| RG | First puller kicks DE_W | No LB claim |
| RT | Second puller wraps through y=28.62 | Sam (`LB_S`), the only remaining LB when `lbNear(hole)` runs |

Initial backer y: Will 28.6755, Mike 25.9300, Sam 23.3129. Will is only
0.0555 yards from the nominal insertion latitude; the wrapper's assigned Sam
is 5.3071 yards away on the opposite side. These are snap setup measurements,
not attainable interception calculations.

The observed LT release at 1.25s (`secured DT_W; LG stays`) confirms its Will
job. In K01-corner, sampled LT/Will load is present at ticks 2.05–3.40 and
H/Mike load at 2.55–3.15. In K04-corner, LT/Will is sampled 2.30–4.55
(with gaps; 30 samples) and H/Mike 2.90–4.35 (28 samples).
Thus **Will and Mike are not simply forgotten**. Redistributing them would
trade existing work, and cannot be graded as a harmless RT routing repair.
Sampled force/engagement presence alone does not certify all defender routes
are protected.

## Why the apparent opposite-direction request is insufficient proof

At K01 tick 2.00, RT is at (38.504,26.818), assigned Sam is actually at
(41.788,24.172), while RT requests (+0.718,+3.564) yd/s. His held acquired
Sam picture is approximately (41.831,24.358), velocity (-1.726,+1.861),
age 0.25s. RT is still on flat route leg 1 toward the installed insertion,
not yet issuing a final strike request at Sam.

The positive-y request therefore is **not itself a wrong-side strike command**:
the player is clearing a prescribed wall/corner, and the backer is also flowing
playside. After the insertion, the ordinary approach forecasts that acquired
motion. Do not compare his body velocity or the target's instantaneous position
to a future command as though the command has already executed.

`availableTarget` deliberately preserves an installed named lead job; it does
not silently discard Sam based on private live engagement ownership. That
accepted information contract should remain intact. Fixing an installation
would belong before this acquired approach, or require an explicit supported
handoff/read contract, not a nearest-defender retarget shortcut.

## Football judgment

The handbook's reference GT call (`moving-run-footwork.md`, section 4.2) has
guard kick, tackle wrap to the point/first valid lane threat, with first-level
wall and vacated-gap protection retained. It also explicitly distinguishes a
reference installation from a universal rule and prohibits selecting a target
just because it is nearest. A three-backer count with a double to Will, an
attached TE to Mike and a wrapper accounting for the remaining backside flow
can be a defensible *specific installation*. No rule requires every wrapper
to hit the initially nearest LB or every installed job to acquire hands.

The engine currently has no explicit GT point-LB/count data explaining that
choice. It produces it as a side effect of greedy optional claims. Therefore:

* **Demonstrated:** GT's conditional combo/backer claims precede the wrap claim,
  leaving a named RT job materially separated from its installed insertion.
  It is an earlier assignment/route-compatibility question, not proof that
  the later locomotion law cannot execute a useful request.
* **Not demonstrated:** that Sam should be swapped with Will/Mike in all GT
  calls, that the existing count violates every valid Counter installation,
  or that missing RT/Sam load causes these two native endings.
* **Important adverse-to-the-hypothesis evidence:** neither corner trace
  requires Sam to be blocked to preserve its observed run. K01 RB crosses
  x=40 at tick 2.80, y=31.886; Sam is y=24.756. His minimum actual center
  distance to the RB from 1.50s onward is 6.570 yards. K04 crosses x=40 at
  3.05, RB y=32.768 versus Sam y=24.954; minimum later center distance is
  3.787 yards. Both end with a CB tackle (6.24 and 6.13 offensive yards).
  These distances are descriptive, **not** free-path reachability estimates.
  No RT/Sam hand load is present, but absence of that load is not a proven
  protection failure when Sam never threatens the actual observed route.

## Boundary and recommendation

GH intentionally reserves the H's immediate backer before optional jobs
(`blocking.ts:580–585`); its tests preserve that separate installation.
Applying the same ordering to GT would be a **new GT installation/count
change**, not the already accepted GH, #88 collection or acquisition repair.
It would change who must leave the double and which TE path is needed. Keep
that decision independent of any supported corner-execution correction.

The historical Counter review already rejected repeated late routes and said
the next GT question was earlier count plus attainable insertion. It also
preserved useful LT/Will body work in the GT sniffer contrast. That history
supports prioritizing the question; it is not current-build success/failure
evidence and is not a license to reapply an old count experiment.

**Recommendation:** finish any already-demonstrated corner correction, then
stop adding exit variants. If RT collection remains a real current failure,
inspect its installed point responsibility and the entire wall/TE/backer
account before proposing a count change. A valid small diagnostic must hold
first-level protection and the successful LT/Will and H/Mike work accountable,
identify the defender that can actually access the runner's available lane,
and establish a physically reachable replacement job. The present K01/K04
corner results alone do not justify changing the count or optimizing for
additional RT hands. If no such access failure survives, preserve them as
valid control outcomes and select a saved case with a genuinely consequential
miss rather than tune these toward more contact or yards.
