# Independent joined-helper controller review

Read-only engineering/coaching review, against the current `engagement.ts` and
the repository's trench handbook. No simulations or production changes were
made by this reviewer.

## Finding

The reported Draw adverse rep is consistent with a controller mismatch rather
than a missing strength law. `helperSupport()` admits useful direction only
when the helper is on the positive side of the acquired contact surface and
still within actual hand reach. Existing `helperIntents()` instead follows the
owner's current hip and adds normal 2.2 yd/s run drive unconditionally.
An owner on a poor surface can therefore provide a poor hip target. A helper
still trying to replace his base receives the same drive request as a useful
contributor. More hand strength or a better global solver does not repair that
request.

Three details matter:

1. `hs` is recomputed from current helper/owner separation each tick. Crossing
   the owner's lateral plane switches the desired hip discontinuously. A
   personally acquired joining-side/near-hip intention should survive at least
   the player's existing decision beat.
2. The hip offset currently uses owner radius plus **defender** radius.
   Owner/helper clearance should not accidentally depend on defender size.
   Respect actual owner/helper body width while preserving a reachable near
   defender surface; do not create a body-position constraint.
3. The drive axis and contact surface are intentionally different in some
   stretch/cutoff blocks. Recovering against the negative drive alone can
   undo that distinction. Use the acquired surface for fit eligibility and
   the installed drive only for the subsequent displacement request.

## Smallest defensible next step

Change joined **run** helper movement only. Preserve the owner's command,
physical `helperSupport`, hand joints, grip/steer budgets, acquired surface and
the complete pass-helper branch. No new solver or technique strength bonus is
needed.

At the helper's existing finite decision cadence, acquire his own delayed
owner and defender pictures. Retain a near-hip target on his joining side.
If that hip lies behind the intended contact surface, move only the requested
target into the positive surface half-plane. Ensure the target remains beside
the owner instead of passing through his center. Current helper position,
velocity, posture/support and actual local hand feedback are proprioception;
partner/defender targeting is visual and should consume his delayed pictures.

Request finite foot recovery toward that fit before adding normal drive when
the surface is clearly unusable. Existing movement, traction, support, hand
reach and collisions must determine whether he actually arrives. Retain real
hands while he tries; do not rotate the acquired axis, reset control, preserve
a contact by teleportation, or relocate support anchors. A failed recovery is
an acceptable outcome. A new read can recognize that the useful surface is
again attainable without guaranteeing an overtake or release.

Prefer ordinary geometric bounds and existing movement capabilities to a new
four-stage technique machine. A read record with rep identity, joining side,
next read and consumed target is sufficient if state is required. Reset on
engagement change, including a helper becoming the new owner; do not let an
old read constrain a later unrelated block. State lifetime must also handle
pass-to-run conversion without treating previous pass data as a run read.

This is requested movement control, not a new force cap. Do not multiply hand
force by a subjective fit estimate: the unchanged physical support calculation
already measures actual direction/reach, and the shared world already bounds
work and traction.

## Coaching basis and limits

`docs/football-handbook/trenches.md` sections 2 and 4 describe establishing a
base, neighboring bodies delivering compatible loads without crowding feet,
distinct owner/helper approach paths, and physically earned transfers. Section
3 distinguishes an attainable reach from merely running with a widening
defender. Those support gathering and replacing feet before the helper drives.
They do not justify requiring perfect hip-to-hip geometry on every combination,
or forcing every uncovered OL to establish prolonged four-hand contact.

The repository's C1–C4 examples are installation examples, not universal NFL
rules. Keep the existing check/post versus sustained-combination distinction.
The joined contact controller must not decide that the helper ought to climb;
personal combination attention already owns that football decision.

## Tests and retained risks

The native adverse Draw witness should establish the first changed request,
consumed picture age, actual recovery movement, actual useful load and final
owner support. Reduced gain or longer contact is not itself success.

Retain these controls:

- Useful ordinary inside-zone/Duo helpers still contribute, with identical
  player capacities and an attainable path; mirrored input should mirror the
  controller even when the resulting play retains legitimate uncertainty.
- Surface and drive differ in a zone/cutoff fixture. The helper must seek the
  acquired surface rather than rewrite the axis to manufacture a good angle.
- Held visual pictures plus altered current non-contact target state cannot
  supply fresh targeting knowledge. New pictures affect the next existing
  read. Real local load can still cause a physical response.
- Pass helpers, no-helper reps, unjoined approaches and stable ordinary loaded
  helpers preserve their intended behavior. Test useful assistance instead of
  celebrating blanket braking.
- Crossing the owner's lateral plane within one read does not flip the target;
  a later read can legitimately change work. Owner/help transitions and a new
  engagement do not inherit stale state.
- Hand identities/extension/control and owner movement are not reset by the
  recovery request; actual support and delivered load change only through a
  shared-world step.

Potential failures remain visible: delayed owner pictures may aim into current
traffic; no feasible near-hip path may exist; a moving shoulder may outrun the
helper; pass-to-run existing hands may not be suited to run displacement; and
the existing one-second Draw installation is not a visual recognition model.
None is a reason to force assistance or retune player strength for this rep.

The one-native-rep counterfactual plus normal/adverse/mirrored transfer panel
can support this bounded change. It cannot establish a complete OL footwork
model or NFL rushing calibration.
