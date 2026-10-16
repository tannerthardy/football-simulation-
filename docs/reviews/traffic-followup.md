# Movement follow-up: keep the real brakes, hold the restoration trial

**Keep #94 frozen; hold the added runner policy. Independently accept Run's
standalone #96 near-strike correction for Integration.** A useful local forecast
does not establish a useful sequence of reacting movement decisions. Neither
zero contact nor the old yardage is an acceptance target.

## Runner question and one bounded trial

Accepted/fetched develop remains `bb6d4c73948d53ba841dd9338dd240146c739f8c`,
source `668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`.
New branch `codex/traffic-followup` starts there. Pending #94 stays unchanged at
`4564a66c7b349975ad336ceb122a2aebba9863d1`; it is not accepted development.
Its saved A028 body/raw/pre-spacing/final/acquired-picture stages explain the
remaining slower runner approach without another baseline or panel.

The back is requesting acceleration, then spacing brakes around a reacting LG.
At2.00 the raw achievable held path intersects the acquired LG picture by0.104yd;
the chosen action clears that picture by0.536yd. From2.00–2.75 the raw path
continues to intersect it. The accepted-build A028 witness likewise has useful
braking at2.55–2.65. Removing those requests or forcing LG to yield is unsupported.

One earlier decision is different. At1.85 the raw held-command forecast has
**0.350yd minimum peer clearance and2.808yd progress** along the original request;
the spacing action has0.286yd clearance and2.077yd progress. At1.90 that dominance
ends: raw clearance0.099yd versus chosen0.648yd. These are conditional0.60s
forecasts, using the same body, observed positions/velocities/timestamps and
original radii; no extra extrapolation of observation age.

Trial **`bd765f061ee8a5e5e96405ae1607814cba3fbef6`**, source
`551195eb7171a27734f0f209d2a394d4a990552b4e74cda7f5587e592d98972f`, restores
only the runner's original action when its upright, clear achievable forecast
materially improves both clearance and forward progress over the modified one.
It uses existing TURN_MARGIN, known acquired peer fields and own free-movement
eligibility. No new direction/option, gap choice, memory policy, private state,
physics or body change. Carrier scope only. Exact pending #94 runtime was staged
as an explicit research dependency at1cee51b; no experimental ancestry imported.

Five focused controls pass: changed1.85, retained clear/necessary1.70/1.90/2.00,
unknown-timestamp decline. Peer-private getters throw; body selection is read-only.
Then one three-case naturally reacting continuation set reuses #94's saved
references. No margin adjustment or second policy variant follows the result.

| Reacting window | Observed trial result |
| --- | --- |
| A028 through2.80 | First changed actor RB at1.85; all22 entering bodies and consumed pictures exact. Next tick brakes again. End x advances only0.050yd, y changes0.065yd. |
| A018 through3.95 | Every captured body/request/picture stage and event stays exact, including the useful block and later LG/C collision. |
| A006 through3.95 | Every captured stage/event stays exact, retaining the successful defense. |

A028 adds a glancing RB/LG sampled impact at2.70:17.776kg·yd/s impulse,
0.195yd/s closing. **That contact alone does not reject the trial.** The problem
is that the held forecast's large gain does not become sustained useful passage.
No repeated precontact stop was repaired and no claim about the unfinished ending
is supported. The runner keeps moving in both arms.

The first50ms prediction matches actual position exactly and velocity to
5e-16yd/s. At the0.60s boundary, own position differs from the held forecast by
**1.301yd**: the controller replans and brakes immediately. LG's actual position
differs from the observed constant-velocity projection by**0.959yd** as his real
kick/log develops. His picture was only0.05s old; fresh evidence still does not
reveal a future reacting block. A narrower number is not a guaranteed corridor.
Forcing the original command to persist or lowering a margin would ignore this
demonstrated limitation. There is no numerical movement-law discrepancy here.

**Decision:** hold restoration as a complete movement improvement; leave the
runner's necessary local brakes and parked navigation alone. A future proposal
must establish useful achievable passage under the sequence of replanned requests
and the loaded block's acquired movement, rather than reward a held0.60s sprint.
This does not prove all local steering is optimal or justify a whole-route oracle.
The normal revert a7a292d restores all runtime source/tests to accepted development;
the trial and its focused tests/fixture remain in immutable history and the saved
patch. #94 itself was neither edited nor reverted.

## Cost, reproduction and next supported work

**18.796 native/check/forecast launcher seconds total**, including5.528s for
native collection and10.738s final diagnostic typecheck. Three new short native
continuations,10.70 simulated seconds; no new reference,
panel, game, roster, seed or full suite. Node22.23.3,44 accepted flags/components1,
unchanged World defaults. Five trial checks and final diagnostic typecheck pass.
[Exact launcher costs and comparison](../../data/reviews/current/traffic-followup/comparison.json)
include saved-state forecasts/checks/native execution/typecheck; offline reduction
and review are separate filesystem/API work. The initial git lazy-blob read failed
authentication; the GitHub connector supplied review files, without credentials
being inspected or any native recollection.

[Held patch, all new captures and hashes](../../data/reviews/current/traffic-followup)
reuse the baseline packet at4564a66. The saved-only summary script reruns no plays.
There is no new runtime patch for Integration from this runner trial.

After restoring that baseline's `free-footwork` folder, pass its path to
`python3 scripts/diag/traffic-followup-summary.py BASELINE_FREE_FOOTWORK_FOLDER`.

The next supported movement improvement is Run's #96: apply the already existing
near-contact foot fit to a planned climb, rather than running past a backer after
an otherwise successful interception. [Independent review](pr96-independent-review.md)
accepts its standalone correction and preserves its controls/adverse ending.
Integration owns independent composition with #94 and required combined checks;
this follow-up does not silently certify that combination.
