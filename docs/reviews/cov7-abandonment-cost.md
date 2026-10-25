# COV-7: one installed block-look abandonment-cost case

This continues [#269](https://github.com/tannerthardy/football-simulation-/pull/269)
with the missing native scenario capability. It tests **support admitted by run
belief, acquired receiver blocking evidence and an unconfirmed exchange**.
It does not test a policy requiring acquired non-QB possession. A QB-retained
fake cannot satisfy that stricter boundary.

## Source and declared inputs

Accepted base: `50b80062815716b902438f9a7fa227535a255ea0` (includes #267).
Implementation branch: `defense/G3-COV7-abandonment-cost`; exact tested head,
engine/settings identities, constructor checksums and runtimes are in the PR
and generated output. Node 22.23.3. Output is ignored `out/`, not a Git ledger.

#260 remains pending at `b956e3d6bced25328f7a54f5b015232fd0a4930b`.
#224 remains pending at `87e77773929bba8ecf197e83a1bf8bb9fc108f94`.
Neither is composed. The vertical release therefore uses accepted coverage
without #224's pending man cushion. Coverage
[agreed the offensive interfaces](https://github.com/tannerthardy/football-simulation-/pull/224#issuecomment-6389818530).
This is not certification of either pending treatment or their composition.

One fixed pair: Cover1 Off, ace_11, roster7, snap1, flip=false, LOS40,
first down50, left hash. Toss is the run; PA Shot is the deception. Z's split
is explicitly 8⅓ yd from the ball in both, retaining his off-line depth1.2.
This prevents the existing run/route room calculation from widening the pass
receiver by4.1 yd. The rest of the calls retain their normal installation;
the entire offensive line/backfield pictures are not declared identical.
No roster/capacity/seed search, forced completion or parked bystanders.

Stable actors: **DEF-CB3 / D / CB_S / index17** marks
**OFF-WR2 / O / Z / index9**. Installed duty remains **alley, D-gap, side−1**,
not force. The original primary remains stored through support/reacquisition.

## One small installed capability

`OffensivePlayCall.receiverBlockLook = { Z: { until: 1 } }` gives a detached
receiver a called, non-contact stalk presentation. From his acquired picture
of the snap-aligned corner, he steps toward a shallow stand-off with low pads.
The request includes physical posture `.7`; World's normal finite posture,
traction, acceleration and yaw determine what happens. It never calls engage,
installs hands, forces belief, supplies perception or translates a body.

At the called release time, the run reinstates its original RunBlocker. The
pass constructs the installed ordinary RouteRunner from the receiver's own
then-current body, with the release clock included in route readiness. The
QB retains a conditional installed prior until an acquired picture supports
a forecast. Native QBPass executes its fake, progression, evaluation, windup
and actual throw. No low-level throw is inserted by the diagnostic.

This is an offensive choreography clock, not a new defensive persistence
timer. Defensive cadence, aim, reads, recognition and contact are unchanged.
Untagged calls take their existing path; no play caller schedules a new play
family and no default-off flag is added. The fixture does not modify shared
RunBlocker, run-fit, receiver-route or coverage controllers.

The compared alternative opens only this corner's existing PASS_FIRST=0 alley
path during its own update, with the environment restored immediately. All
other actors retain defaults. This is a role-local diagnostic intervention,
not a promoted defensive rule or a universal chooser. Its alley can later
chase under the existing run-fit contract; it is not permanently depth-capped.

## Cue → decision → actual motion

Both calls admit support at **0.65 s**. Across calls, the selected corner's
full own body and consumed Z picture are exactly equal at admission: low
stance, x39.187 yd, vx0.806 yd/s, picture age0.35 s. Physical receiver posture
is about.699. The consumed QB carries=true and RB carries=false in both.
Admission therefore spends man responsibility on expected exchange/blocking
evidence, not on an observed carrying back.

The QB/back pictures differ numerically and are retained. For example the
QB's consumed vx is −.224 on Toss versus −1.054 on PA; neither is a positive
carrying-back confirmation or a definitive pass release. Run beliefs also
have different confidence. This is comparable early evidence, not identity of
every information input or a claim the real calls are indistinguishable forever.

On PA, the first raw request at.65 changes from **(.979,.544)** to
**(−.956,6.328) yd/s**; no downstream modifier rewrites it. World realizes the
change gradually. The receiver comes upright into his route at1.0, while the
corner still consumes the older low-pad picture. At **1.4**, the first
acquired upright cue restores man. His actual velocity is still
**(−.611,+3.352) yd/s**, despite requesting **(+2.578,−1.416)**. Inward lateral
momentum does not stop until **2.0**: a measured.6 s after the correction.
The controller corrects before its broad pass belief flips at2.15.

| PA, same clock2.4 s | Retain man | Take installed alley |
| --- | ---: | ---: |
| Depth ahead of Z, yd | 1.009 | .050 |
| Absolute lateral gap, yd | .886 | 3.042 |
| Center separation from Z, yd | 1.343 | 3.042 |
| Actual velocity, yd/s | (2.500,−.699) | (2.772,−2.080) |
| Body facing, rad | 5.889 | 5.598 |
| Travel heading, rad | −.273 | −.644 |

That is real loss of leverage and finite recovery, even though both passes
are incomplete. Body facing is not travel or measured gaze. At QB evaluation2.45,
the baseline's completion estimate is.550; the alternative's is.482 with a
different forecast point and higher interception risk. It declines that window,
then evaluates.562 at2.50 and releases to Z at2.70 (baseline2.65). These are
actually consumed evaluations, not extra counterfactual queries. They do not
show a uniformly improved offensive window or a causal completion probability.
The extra lateral separation does not guarantee the safety, throw or catch loses.

Toss changes TD70→tackle7.56 yd. The support corner actually wraps at3.60 and
receives the tackle event4.25. That establishes physical participation, not
that the entire63-yard difference measures the marginal support decision:
later actors, contact and execution streams diverge. Better run yardage alone
does not certify this policy as safe.

## Legality and limits

The official [NFL rulebook](https://operations.nfl.com/the-rules/nfl-rulebook/)
served the 2025 rules text when inspected for this work. Relevant restrictions:

- **8-1-5:** an eligible-number player legally at least one yard behind the
  line may receive. Z is #87, installed1.2 yd behind, inbounds and eligible
  in the native snap assessment. No covered-end or reporting shortcut is used.
- **8-5-4:** prethrow offensive blocking more than one yard downfield, and
  certain blocking in the thrown receiver's vicinity while airborne, are
  interference. This prelude requests no block. In both actual pass arms Z
  has **zero physical contacts and no engagement before the native release**.
  A block fake does not require an illegal downfield block.
- **8-3-1:** ineligible players cannot unlawfully advance before the pass.
  The maximum measured forward edge among snap-ineligible bodies before/at
  release is40.008, below LOS+1=41. Native protection supplies their motion.
- **8-1-2:** one forward pass from behind the line, before the ball crosses it
  or possession changes. The QB retains the ball until the one native forward
  throw; the maximum QB forward edge over its prefix is38.676<40. Release
  centers are33.607/33.441. No second pass, forward HB exchange or hidden
  possession transition is required.

The native NFL-2026 rules path reports no foul or pass-rule limitation in
these two executions. The installed-snap model explicitly retains its common
**3-18/7-4 line/set/helmet-beltline abstraction**. The test requires that exact
known limitation, rather than pretending the engine measures helmet/set mechanics.
No new rules law or enforcement behavior is implemented here. Later body
contact in the failed-catch sequence is recorded separately from a prethrow
block; zero prethrow contact is not a blanket proof of every later contact.

## Reproduction and stopping decision

```sh
# In the published candidate checkout, Node22.23.3, normal resolved defaults.
npm ci --no-audit --no-fund
node --import tsx scripts/diag/cov7-abandonment.ts out/cov7-abandonment
```

This produces the two exact `.setup.bin` constructors/checksums, results,
events, normal selected command traces, consumed cue copies, first branch
entries, QB evaluations, release/contact/presnap evidence and full final
bodies/minds/recognition/perception/RNG. Each policy runs with and without the
observer, asserting complete equality. It uses only returned values or states
already computed in normal execution, adding no sightings, decisions or draws.
`film.html` uses the existing replay viewer for all four actual executions;
its clock/score are clearly labelled display placeholders for declared scenarios.

The first failed construction is retained in ignored output: unconstrained
route-based splits differed, and nearest-defender selection picked a box player,
producing mostly lateral receiver motion and no active pass cost. The correction
uses the explicit shared split and a snap-aligned corner, not a cue threshold
change or a seed search. #269's untagged PA/Slant-Flat controls remain labelled
**inactive**, not promoted to active deception witnesses.

The missing scenario capability now exists. It demonstrates that the weak
unconfirmed-exchange option has both a benefit and a recovery cost. It does
not justify replacing PASS_FIRST everywhere, certify the acquired-holder
boundary, or solve the later pursuit/contact question. A subsequent COV-7
policy must name its information boundary and preserve this pair, including
the incompletions and nonmonotone QB evaluation, against any proposed benefit.
