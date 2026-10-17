# Preserve the direction of settled contact moments

**Recommendation: review/adopt this bounded directional correction; keep real
mass and do not retune strength coefficients from the old NFL weight claim.**
There is now a concrete support inconsistency to repair. It does not explain
the mass-response results or establish better run-blocking outcomes.
[Draft candidate #118](https://github.com/tannerthardy/football-simulation-/pull/118).

This independent candidate starts from accepted #112
`d682b1f474cb6ba260a7b8b1119a62919c5a2159`, verified against queuebf493d8.
Only `src/physics/world.ts` changes runtime behavior:15 lines at the settled
moment cancellation. It imports neither #115's optional capacity interface nor
experimental solver/recovery ancestry. The ordinary physical capacities,
traction, mass/inertia, recovery rates, flag/default settings and expectations
are preserved. Develop is not changed by this draft.

Tested runtime `6d36c7d49b185d9121b64fb470c433b96af06a4c`, source
`19f0ce52abb734528929375f9fd3aee219e619d267c5656151dab57badc6f830`.
Final diagnostic/typecheck revision `a7b2e4f1a17ce5f563dc8c20988bc4aa21ac54ab`
has that same runtime. [Exact evidence/settings/costs](../../data/reviews/current/directional-load-bracing.json).

## Cause and correction

`addLoad` represents contact-height tipping as a **vector**. Achieved lean is
also a vector. Previously, the load-filter stage converted achieved lean into
one scalar and used it to cancel every component of the stored tipping moment.
Thus forward lean could cancel an independent sideways couple beyond the
explicit ankle/hip allowance `mass*G*baseRadius*availability`.

The correction retains the existing ankle response on the aggregate moment and
restricts additional lean bracing to the plane of the **actually achieved**,
ground-budget-clipped brace. For stored equivalent tip T, attained brace b,
ankle fraction a and legacy lean fraction l, cancellation is:

`a*T + max(l-a,0)*projection_b(T)`

The implementation retains the old subtraction and restores only its excess
transverse component using the two-dimensional cross product. Exactly
collinear represented components produce an exact zero cross product and keep
the original arithmetic. No angle tolerance hides a real transverse load.
Zero brace, zero moment and ankle-dominated cases retain their existing path.
The ankle budget is applied once per body to all its contacts, not once per hand.

This repairs direction accounting in the existing reduced support model. It
does not validate the legacy magnitude/sign of aligned lean, introduce a new
COM/COP or articulated-foot model, or clear the parked angular/contact-law holds.
Planar momentum/work closure alone cannot detect this error because those
ledgers do not include represented pitch/roll support motion as 3D energy.

## Decisive mechanical witness

The four-body World reproduction supplies three bounded active contacts:
forward load at target COM height, and equal/opposite transverse forces at
COM±.4yd. Each500kg·yd/s² force is within its actor's ordinary arm allowance.
The latter two contacts have zero net transverse impulse but a force×height
couple of400kg·yd²/s² (334.45Nm). Actor reactions, common arm budgets and
ground impulse/work remain in the ordinary World.

A declared prepared checkpoint supplies established felt load, committed lean
and felt moment to isolate the first response. This is not a claim that the
checkpoint was reached by a native football history; native invocation is
measured separately below. The expected400 moment follows from the applied
forces and heights, independently of the correction. The existing ankle
allowance is236.667kg·yd²/s² at the first substep.

| First response | Old canceled moment | Candidate canceled | Candidate remaining |
| --- | ---: | ---: | ---: |
| Transverse couple with forward lean |389.825|236.667|163.333|
| Same couple without forward lean |236.667|236.667|163.333|
| Collinear couple with forward lean |389.825|389.825|10.175|
| Small80-moment couple,no lean |80|80|≈0|

The old transverse cancellation exceeded its ankle allowance by about65%.
Candidate collinear **complete body/support execution is bit-for-bit identical**
to the saved accepted-source control. Rotation/reflection preserve the corrected
response. Over .05s, target transverse capture-point deviation changes
.004765→.020806yd; both remain up. This is restored response to a real moment,
not a test requiring a fall or matching trajectories.

At12 versus48 subdivisions, candidate endpoint deviation differs by
.000002644yd, versus.003144455yd before. The first-step moment bound holds at
both subdivisions. This is focused self-refinement, not clearance of the
experimental World solver or all timestep-sensitive behavior.

## Football and weight relevance

The observer steps normal controllers and records **actual-minus-former-scalar
support response at identical current states**. That identifies invocation;
it does not itself attribute an ending to the correction. Reported hand means,
positive/net torso impulses, nominal gaps and acquired grasps remain distinct.

| Matched input | Before→after gain/ending | First significant correction | First endpoint support fork |
| --- | --- | --- | --- |
| Strong WZ Over3,pair11,seed77 |2.53→2.53yd,tackle4.15s|CB_S3.59583s|CB_S3.60s|
| Weak WZ,same pair/seed |5.34→5.34yd,tackle4.00s|LB_M3.05417s|LB_M/RB3.10s|
| Useful-climb Duo fixture |both live,censored3.50s|SS3.48750s|SS/RB3.50s|
| Fresh strong WZ,seed78 |4.19→4.19yd,tackle4.30s|not substep-instrumented|recorded in evidence|

All three instrumented first corrections occur after first runner contact.
Their blocker hand-load histories are exactly identical; LOS/local-passage brackets,
engagement and interposition classifications are preserved. Strong first issued
requests fork at3.65s; weak at3.10s by about3e−9yd/s; Duo has no request fork
before its censor. Largest live runner position differences are about.000047yd
strong and1.91e−8yd weak. Support-state transitions and canonical contact events
match. Frame endpoints cannot order causes inside their .05s interval; the
substep records identify the first affected tackler. RNG state/counters were
not recorded, so equal seeds/endings are not a proof of retained random draws.

Fresh seed78 first support/pose differences appear at3.55s, after first contact
at3.15s; largest live runner difference is.000308yd. Its hand-load history is
not exactly identical: the first difference is C/LB_M tangent force
−518.261691→−518.274911kg·yd/s² in4.15–4.20s. This late .013220 change is
retained, with the same arrival/interposition/support-state classifications and
ending; it is not evidence of improved or regressed approach protection.

There is **no demonstrated run-blocking benefit or adverse approach-protection
change** in these controls. Tackle-phase support is slightly different; changed
force response is physically justified by the mechanical witness, not by a
yardage improvement. Four plays do not establish NFL rates or league transfer.

To answer whether this error caused the earlier weight result, six preregistered
existing mass controls were replayed: equal square,15% heavier square,equal
absolute-force15% heavier,stronger lighter,crossing defender,and generated
249/308lb TE/DT. **Every recorded step,force ledger and final state is exactly
unchanged.** Pair COM still advances1.153yd with mapped force versus.070yd with
equal absolute capacity; stronger lighter advances.077yd; the TE/DT square
mismatch remains. The cross case retains its release. This defect does not
explain those mass results; changing body mass would compensate for a different
question rather than repair the demonstrated directional error.

Real mass is required by inertia and contact momentum, while weight also
affects available friction. Keep those laws. Current strength/traction mapping
remains uncalibrated: the independent push/scrum sources in
[the calibration review](https://github.com/tannerthardy/football-simulation-/blob/44da6d2/docs/reviews/block-strength-calibration.md)
do not identify a new coefficient or mass exponent. Static support geometry
must satisfy `F*handHeight = mass*g*(COM−COP)` under its stated assumptions;
the reduced model does not explicitly represent every quantity in that test.
Do not disguise that limitation with a posture multiplier or bench-to-leg formula.

## Verification and adoption boundary

- 37 focused checks pass:7 new direction contracts,4 existing height controls,
 17 held-recovery and9 actuation checks. Typecheck passes, including final tools.
- The initial red run retained3 expected mechanical failures and one JSON fixture
 sentinel mismatch (`-Infinity` serialized to null). Restoring that existing
 sentinel fixed representation; no numeric tolerance was weakened.
- A first fresh-baseline command finished but its receipt rejected a changing
 validation tree while a separate observer file was written. It remains failed
 evidence. The frozen repeat passes with accepted sourcebed3c36 and identical
 fresh input/profile hashes; candidate source was restored byte-for-byte.
- All13 command receipts cost51.347s, including failures and three typechecks
 (38.708s as diagnostic files were added). Three instrumented native controls
 cost2.242s; candidate fresh .974s; stable fresh baseline1.319s; six mass controls
 .942s. These are collection costs, not an uninstrumented speed benchmark.
- The cached three-native baseline retains its real0a5e365a source pin, which
 contains only unused optional force inputs. Complete profiles/bodies match;
 its omitted-input arithmetic was independently checked identical. Mechanical,
 fresh and cached mass references use literal accepted sourcebed3c36.
- Independent read-only runtime review accepts the directional repair and shared
 budget treatment. Independent tape review confirms post-contact forks and
 preserved approach controls. No full suite, games, NFL scan, solver expansion,
 strength-default activation or waiver of historical failures.

**Adoption recommendation:** this is a small, supported correction to existing
directional support accounting, suitable for independent Integration review.
Keep #115's calibration interface and all new force coefficients separate.
Integration owns required combined verification once on the exact accepted
candidate; this worker has not merged or designated a new baseline.

**Single next step:** review/integrate the narrow World correction with its
focused contracts. Retain real mass; resume numerical capability calibration
only for a task-matched contradiction or identifiable force/support reference.

Reproduction uses Node22.23.3 and `scripts/baseline.mjs --candidate` with the
44 recorded settings/components1/CF_FLOW unset/RUN_READ0 and accepted World
defaults. Run `directional-brace.ts` for the mechanical panel,
`bracing-native.ts <output.json.gz>` for three saved controls, and
`block-protection.ts <output.json.gz> --fresh-only` for seed78. The six selected
IDs and every actual command/revision are in the evidence. Fresh baseline
used the literal accepted World file with otherwise fixed diagnostics, then
restored the committed candidate; its source overlay and rejected precursor
are explicit. `directional-brace-summary.py` only summarizes saved evidence.
