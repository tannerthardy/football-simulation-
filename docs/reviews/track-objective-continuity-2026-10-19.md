# Moving objective continuity at the old four-yard boundary

Independent controller proposal on accepted develop
`f4146275ce7539816bf57b4ed55a0d2be10e48c7`; no #162 physics ancestry.
Only `behaviors/common.ts:track` changes. Parent movement-continuity work owns
native transfer and the integration decision. No promotion is established here.

## What the probe distinguishes

Does a defender abruptly change his approach because of new acquired evidence,
or because the same moving objective crosses a helper's distance classification?
The old helper closes directly on positional error at `d <= 4`, but at `d > 4`
rotates that closure toward `error + observedVelocity * min(1.2,d/vmax)`.
That is a finite bearing jump for infinitesimal changes in distance. It is
separate from `requestToCover`, decision randomness and the yaw motor.

Using the saved OZ24 FS profile, an unchanged target moving laterally at
3 yd/s and distances `4 +/- 1e-8` produces a **2.107 yd/s / 19.89 degree** request
jump. Stationary and collinear opposing controls remain continuous. The
saved OZ24 FS alley sequence crosses 4.0075 to 3.8943 yd at 1.45 to 1.50 s:
the held point is unchanged, acquired target velocity changes only .160 yd/s,
and request changes 2.153 yd/s. No contact or engagement exists there.
Toss FS also crosses the boundary against a held point at 1.50 s, changing
request by 1.405 yd/s. Counter SS has another held-point crossing, with a
smaller .438 yd/s change. These are mechanism witnesses, not independent
population trials or proof that all visible wobble comes from this helper.

Forced old near/far requests on the **same** OZ24 body and acquired picture
differ by 1.932 yd/s / 18.22 degrees. In an unloaded one-body World, the first
.05 s movement agrees because support/traction limit the requests; at .4 s,
achieved position differs .309 yd and achieved velocity about 1.26 yd/s.
This is an isolated held-command prediction, not a simulated football ending.
The saved tape uses #162 runtime `51351a24...`; pure probes use that same source.
The local continuity contract fails directly on accepted develop, so the
controller defect does not depend on the proposed motor correction.

NFL tracking cannot establish requested velocity. #162's existing 10 Hz/.01 yd
comparison motivates reducing unsupported alternating movement, but does not
prove this decision defect. No additional NFL query/download is needed to
establish this mathematical discontinuity.

## Minimal correction and remaining cost

Keep one geometrical approach: lead only the error outside the existing
four-yard station-keeping region. `lead=min(1.2,max(0,d-4)/vmax)` reaches zero
continuously at that boundary. Match the same supplied target velocity and
close the same offset under the existing gain, maximum and braking envelope.
The same gain now applies at every distance; it was previously ignored above
four yards. The old maximum correction and final speed cap remain explicit.
The existing moving-objective metadata, requested facing and cut skill remain.
There is no timer, stored direction, new observation, draw, physical capacity,
contact or run-fit policy change.

The cost is less speculative leading between four yards and the distance at
which the existing 1.2 s cap is reached. That can change diagonal interception
and coverage leverage; smoother requests alone do not establish better
football. A useful next check is the saved alley witness plus a legitimate
moving vertical/crossing control, comparing acquired cue, request, achieved
position/velocity and leverage. Parent owns that small native experiment.

## Focused evidence

Candidate runtime `4e78e876ee1cd7af00be1b5fe79a3968d5d2fb2b63f95dba21fa9e02a3eb8ca3`.
All launchers use the recorded 44 baseline settings, `RUN_CONTACT_COMPONENTS=1`,
`CF_FLOW` unset and Node 22.23.3. Exact source, lock and test hashes are in
`out/continuous-track/*json`; parent is publishing those small receipts with
its diagnostic bundle.

- Accepted-source continuity contract: four failures, four opposing checks pass.
- First candidate: seven pass, one far-leading control fails because the
  correction maximum was omitted. Fixed by retaining the existing maximum;
  original failure is retained as adverse implementation evidence.
- Final: **39 focused checks pass**, comprising eight new contracts plus the
  existing coverage mechanics and coverage/run-support contracts. Purposeful
  new objectives still reverse immediately; stationary/collinear, far leading,
  target feed-forward, immutability and metadata controls hold.
- Typecheck passes. Zero new native snaps, games, roster sweeps or full suites.

Pure probe and saved-incidence reduction are in the parent's ignored
`out/movement-continuity/preview-audit/`. Diagnostic receipts are distinct from
native evidence. The candidate needs parent-owned native review and an
independent controller review before integration.
