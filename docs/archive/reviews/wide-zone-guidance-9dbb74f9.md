# Outside/wide zone: guidance for the controller work

Read-only review of `claude/live-gaps` at **`9dbb74f9`**, including its newest
torso-facing release and stretch-retention change. No controller code was
merged here. The earlier game tables in `live-gaps.md` precede that last change;
they do not certify its final behavior.

## Keep the useful changes

Gaps now follow observed bodies; guards supply personally acquired flow cues.
Stretch doubles finally request the track before contact. Stronger early
requests acknowledge that acceleration takes time, and teammates can know a
rehearsed call. Separating the intended seal from the attained contact surface
also lets a lateral block remain useful without awarding a vertical drive.

The goal is those relationships, not 3.4 yards of lateral OL movement. A slant,
an aggressive force player, a reach that becomes runoff and an early cutback
should produce different tracks. Use the [trench teaching](../../football-handbook/trenches.md)
and [back's reads](../../football-handbook/offensive-skill-and-playcalling.md)
already reviewed in this project, with scheme-specific installations.

## Next, in order

1. **Follow the request through contact.** `zoneFlow` opens the hips before
   contact; `stepRunRep` then replaces the command and faces the defender.
   That can turn a running reach into a shuffle. The subsequent anchor can
   also fire when useful lateral motion aligns with felt load, replacing the
   stretch request with opposite-load drive. Trace behavior → engagement →
   anchor → spacing → World. Re-anchor for lost useful support/depth, not merely
   because a moving lateral block is loaded. Keep a genuinely driven-back
   blocker as the adverse control.
2. **Make the approach depend on the observed threat and role.** The existing
   reach/runoff/seal read runs later than the new `zoneFlow` early return.
   A uniform playside floor can keep a helper moving beyond his assigned half.
   Reuse personally held reads for covered reach, near-gap help, overtake and
   backside cutoff; collect a slant instead of blindly running past it.
   A fast widening defender can legitimately defeat a hook. Useful runoff
   and a bend lane should remain possible.
3. **Prove a lateral overtake can earn a climb.** The new release rule uses
   torso facing, but `keeperCandidate` and `readJoinedSurface` still reject
   `|phi| >= .65/.55` in the acquired frame. This is a possible mismatch, not
   permission to loosen every release. Compare a secured moving takeover
   against a penetration/weak-keeper control. Retain each climber's delayed
   read, actual surviving hands, support and attainable path to the backer.
4. **Predict a called track as motion to achieve.** `calledMotion` publishes
   `.45*vmax`; spacing treats that as instantaneous velocity across the visual
   age. An isolated native-profile startup shows why that is unsafe: at 0.2 s,
   median attained travel is 0.051 yd, while constant call-tempo transport
   predicts 0.678 yd. This is a startup counterexample, not a native spacing
   diagnosis. Use observed velocity plus attainable acceleration and snap
   readiness. Interrupted tracks and genuine teammates in the way still need
   collision avoidance.
5. **Then give the back a moving controlling block.** Press the installed
stretch key, distinguish outside access from an adjacent vertical seam and
   a secure bend, and preview the attainable entry. Avoid a fixed press timer
   followed by an unrestricted search across every midpoint. Read force,
   backside pursuit and whether the combo actually secured its man; retain
   errors from delayed cues and imperfect placement.

## Small controls that decide the next change

Use matched bodies and calls, mirrors, Over/Under plus one tight front. Start
with an even shade, widening shade, inward slant, an uncovered helper with a
threatened near gap, useful lateral takeover, failed takeover and backside
cutoff. Add differing snap readiness and a neighbor whose track is interrupted.
Retain Inside Zone and Power/Counter as unaffected controls.

Record the read and its age, assigned half, command before/after each layer,
actual facing/speed, first **loaded** contact, signed world hand force,
ground translation/yaw, support and the reason for release. The branch's
`pair-probe.ts` uses absolute hand scalars and net tick traction: neither
establishes which force brakes the track or which substep budget binds.
The patch already reports attained world hand forces and moments.

Measure tracks and transitions before run yardage. `stretch-shape.py` infers
direction from achieved OL flow and excludes plays ending before two seconds.
Keep it as a descriptive survivor view; report censoring and use installed
direction for paired sim comparisons. Match NFL situations by front, formation,
back depth, role and stage of the block; inspect unsuccessful runs too.

## Physics ownership

The bare-body envelope responds substantially to request and facing: five
native OL profiles travel a median 0.221 yd at 0.5 s with a 1.7 yd/s request,
0.329 with a full request facing forward, and 0.498 with a full request and
45-degree facing. These are controlled capabilities, not NFL targets or proof
of loaded movement. No demonstrated field-side physics lock justifies stronger
traction, arm force or another foot solver.

The physics session is repairing the grip/contact laws independently. Keep
the unchanged helper/transfer and common-patch promotion witnesses while
changing these controllers. In particular, the new `profile.turnRate*dt`
release allowance is optimistic recovery credit: World also limits acceleration,
balance and available torque. A body that could turn at its maximum rate is
not a body that actually recovered its chest or hands.

The bare-body check is preserved outside production and the default test run:
`node --import tsx docs/archive/research/contact-mechanics/zone-motion-envelope.ts out/zone-motion.json`.
It records unchanged profiles, request/facing, achieved motion, ground impulses
and source/operator pins. It does not replace a loaded block or native film.
