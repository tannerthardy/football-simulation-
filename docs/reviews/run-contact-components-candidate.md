# Component-only candidate from PR #4

This isolated branch proposes enabling only `RUN_CONTACT_COMPONENTS` by default.
The comparison remains `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`; the shared
comparison profile and baseline designation do not change. The only production
delta from PR #4 (`b64910ee7975e679beca2590369714ff33994aa0`) is the existing
component switch's default. Explicit `0` reproduces PR #4's disabled path.

The correction removes drive velocity counted twice along the acquired shoulder
tangent in stretch contact. It retains the original drive's normal projection,
hand ownership, requested hand parameters, backdrive handling and release rules.
It fixes a request construction error; achieved movement still depends on real
support, contact and player capability. See the [original mechanism and matched
evidence](coupled-run-contact.md) and [complete native endings](hand-action-protection.md).

Handover and active hands remain disabled. Collection experiments are absent
from this branch. The withdrawn early-release trial and its unsafe keeper
control remain preserved on `codex/stretch-helper-check-trial` at `4074038` and
in [PR #5's collection diagnosis](https://github.com/tannerthardy/football-simulation-/pull/5).
No shared physics, capacities, roster generation or movement files change.

## Bounded verification

Use the [two-input manifest](run-contact-components-inputs.json) and the exact
[candidate settings](run-contact-components-settings.json). The affected native
control is mirrored WZ seed 3; counter seed 3 opposes accidental changes outside
stretch contact. Both stop at actual endings or explicit 25-second censoring.
Existing component/contact-surface contracts exercise projection, real loaded
contact, ownership, mirrors and physical limits. Compatible prior 60-input and
eight-completed-zone evidence will be reused, with new-source results recorded
separately. No new census or full-game campaign is needed for this default-only
proposal.

Testing follows [PR #6's shared policy](https://github.com/tannerthardy/football-simulation-/blob/codex/roster-capability-audit/docs/TESTING_COSTS.md)
(reviewed blob `df371a89c4d3918822bf15f7b2d0b42f8d8279da`). The designated
audit/integration owner performs final full verification after freezing the exact
combined candidate; this branch supplies directly affected evidence. A prior
full-suite pass is historical evidence, not verification of the newly combined
source.

## Integration handoff

Pending the focused receipts. Do not promote the hand stack, handover or helper
release with this component candidate. The parked `RUN_CONTACT_TRACK=1`
adjacent-block collision remains a separate experimental witness. Known shared
center-hand angular-law failures remain visible in the original diagnosis;
this request correction does not certify or modify those laws.
