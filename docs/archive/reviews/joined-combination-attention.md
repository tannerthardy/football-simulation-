# Personal reads in joined OL combinations

## Status and where to start

Joined double teams now give each lineman his own observation cadence and
confirmation. A player proposes his own climb; he cannot send his partner away
using his picture. Simultaneous proposals resolve before movement commands,
with actual keeper contact checked again. This extends the
[common OL controller](universal-ol-controller.md), using the existing World.

Watch [six fixed paired inputs](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/combo-attention.html) or the
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/combo-attention.zip). The inspector distinguishes a
scheduled attention attempt from an actual consumed picture, and shows the
departing player's cue, remaining hands and subsequent physical load. Read the
[evidence and rerun guide](../../../data/reviews/physics-world/combo-attention/README.md).

This fixes responsibility and attention, not rushing efficiency. The matched
panel has mixed outcomes, including substantial losses and three additional OL
falls. The next useful target is a reproduced cutoff approach/contact-frame
contradiction, detailed in the
[native diagnosis](../../../data/reviews/physics-world/combo-attention/cutoff-next-witness.md).
Do not compensate with stronger blockers or expanded anatomy.
The [unimplemented experiment](../../../data/reviews/physics-world/combo-attention/cutoff-implementation-design.md)
confirms the defect remains in this source and requires real containment/load
improvement, rather than merely lowering a computed leverage angle.

## One installation, two readers, shared physical ownership

The call still installs the down defender, partner and backer. Once both
members share real engagement, each has independent cadence, stable-contact
confirmation and a current self-departure proposal. Recognition and existing
mental state affect when that player can read. One player's failed confirmation
does not erase his partner's work; falling or losing the shared contact clears
the affected player's stale confirmation.

The actual prospective keeper must retain genuine live hands, adequate support
and useful fit. A promoted helper must already have useful physical contact.
These are physical eligibility checks, not perfect information supplied to the
reader. The eligible reader then consumes his own delayed keeper/DL picture,
confirms a credible surface, and reads the backer and runner for the trigger.
The existing finite .15s confirmation remains a stability law, not a timer
recognizing a play.

Two finite member states suffice. A small pre-command pass reads the pair and
resolves simultaneous self-proposals by personally observed backer distance
and the existing primary-departure cost. Arithmetic ties prefer the installed
helper. The release rechecks the actual job and hand joint, preserves the
keeper's acquired contact and changes jobs without changing bodies. Ordinary
same-tick updates cannot repeat the read. Newly joined pairs begin their own
confirmation when contact is actually established.

The original optional IZ/split-zone helper retains its separate check policy
and cadence. Obsolete shared fields perform unjoined bookkeeping only; they
cannot provide a fallback remote release after a stale or invalid partner job.
Calls are assumed installed. Position familiarity is still not call mastery.

## Frozen evidence

Baseline commit `4e2abaf`, source
`d6dfa190412da52725780c71db02f73305b3e3f5541b4c8e9d755a3296ee568f`,
is reused by reference. Final source is
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
Only blocking.ts and playsim.ts change. World remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`;
profiles, traction, arm/grip/work limits and physical resolution are unchanged.

All 162 complete recorded initial projections and hashes match. All 324
observed/plain controls match and finish naturally. The ordinary 160 use one
balanced .55 roster pair, eight concepts, five fronts, both sides and seeds3/11.
The two older roster41/42 witnesses remain a separate population.

| Ordinary panel | Before | After |
| --- | ---: | ---: |
| Whole-play climb events | 119 | 116 |
| Optional check climbs | 5 | 5 |
| Mean gain, yd | 1.4026 | 1.3860 |
| Stuffs | 37 | 37 |
| OL falls | 14 | 17 |

69/160 complete public results are exact; 18/160 full signatures are exact.
Signatures include private state/tags, so their differences do not establish
142 changed physical outcomes. There are 42 negative yard pairs, six ordinary
losses of at least two yards and seven gains of at least two yards. The
supplemental OZ/Over/left witness falls 28.49→2.44 yd and is retained separately.
These inputs are not an NFL concept distribution, roster sample or league rate.

The old command-local collector misses the new prepass: its count119→5 omits
111 actual candidate departures. The table instead counts whole-play events.
Native accounting stays within floating-point tolerance at the retained rows;
that does not establish useful blocking or NFL force calibration.

Six predeclared inputs use a new common, neutral B/C tap: IZ/Over both sides/S3,
Duo/Odd both sides/S11 and Power/Under both sides/S3. Baseline has five climbs,
two remotely ordered by another reader. Candidate has five current self-climbs,
each with actual own keeper/DL/backer/RB pictures, valid cues, unchanged bodies
at decision and the same loaded keeper joint through the following real solve.
Later assigned-backer loaded contacts fall five→four; Duo/Odd/left's missing
contact and all three negative witness yard pairs remain visible.

The candidate records 69 attention attempts, 15 actual keeper/DL reads and
eight backer/RB reads in these six inputs. Fifty-four attempts stop at actual
contact/security eligibility before visual consumption. Seven pairs schedule
both members; five have some visual consumption, none have both members consume
surface pictures in this natural sample. Controlled good-fit tests prove both
can read and resolve conflicting self-proposals. Do not call every attempt
eye use or claim every ordinary-panel release has the detailed continuity proof.

Twenty new attention tests pass; pinned B fails 19 feature cases and passes one
nonmember control. All 18 prior optional-helper controls still pass B; the new
down/rise recovery regression fails B and passes the candidate. Existing tests
now ask the departing member to read while retaining their body, contact,
holding and shared-capacity assertions. All 812 TypeScript tests, 22 Python
tests, typecheck and build pass. New export/diagnostic tools also compile.

## Review of the large losses

Four separately labelled post-hoc B/C taps reproduce the cached outcomes and
initial players, with eight neutral controls and natural finishes. Their first
body/intent/job divergence occurs at a changed release, not an earlier hidden
physical perturbation. All six candidate departures have current own cues,
unchanged bodies at decision and the same loaded keeper joint after solving.

The [detailed adverse audit](../../../data/reviews/physics-world/combo-attention/adverse-review.md)
traces two examples. OZ/Odd/left's guard self-climbs at1.35 instead of being
sent away by the tackle at1.55. Both propose themselves; his personally read
cost is lower. He reaches real LB hands earlier, yet later spacing, sheds and
contacts yield fewer yards. Split/Bear/right instead promotes the guard and
lets the center self-climb at1.70: the guard's own delayed view does not confirm
the opposite keeper, while the center's does. No later assigned-backer loaded
contact is established. This exposes a useful future question about differing
observation ages and coached inference, not grounds to widen a threshold to
recover the old yards.

No hidden shared-clock inheritance or stale stand command was found in these
audits. They support retaining independent readers; they do not prove optimal
football decisions or explain every downstream yard with one collision.

## Limits and next work

Personal delayed perception can now change which member stays, when he leaves
and which later contacts happen. It cannot guarantee that his installed path
is good. The cutoff witness reaches the requested shoulder but the acquired
surface axis scores that shoulder as severe lost leverage. Separate useful
contact surface from displacement intent where that contradiction is reproduced,
preserving successful inside-shade and mirrored controls.

Then inspect recovery and work collection: a healthy assigned DL may remain
the job after it has passed the useful surface. Require a concrete stale-job
witness before teaching abandonment. Contextual run foot/hand skill also needs
a specialist control; currently engaged traits emphasize pass-block ratings.
Improve execution without adding scenario-specific strength.

Replay positions are post-physics with tick-start timestamps. The native
inspector uses completedAt≤visual time and can trail bodies by .05s; the final
solve lies outside seeking. Original phases are unretimed. Facing remains body
orientation, not tracked eyes. The physics foundation is useful but has not
earned a universal readiness or percentage-completion claim.
