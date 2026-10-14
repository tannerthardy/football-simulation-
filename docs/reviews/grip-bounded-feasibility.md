# Actual bounded attachment and partial lower share

Question: does force-within-interval integration work on the saved acquired
angled witness's actual bounded geometry and partial/changing lower share?
The shared baseline remains `4ded6b6`, corrected slow reference `8e36cce`
is unchanged, and all new code is diagnostic. No World, capacity, recovery,
fatigue, production default, keeper law or support-history change is included.

## Mechanical scope and changes

The original 45-degree/8 seed-3001 checkpoint starts at lower share
`.170625133951`. Its bounded material coordinate is initially zero and moves
under the existing support motor. Two mirrors retain the original body
states, grip capacity, reach, initial legs, coupling and pull request. Ground
is isolated, with the original `stepSpeed/pushForce` support slope explicitly
prescribed and zero corrective request. The acquired frontal 0-degree/3
packet is the successful force-free opposing control.

Two additional declared mechanical controls displace the bounded material
coordinate to `(-.25L, side*.125L)`. They exercise a nontrivial anisotropic
Jacobian and a substantial held-body torque. They are not native film or
new tackle outcomes. A rotated version checks the coordinate transform.

For `r=R*bounded(z)` and lower share `s`, the World Jacobian is
`J=s*R*D(z)*R^T`. Generalized foot load is `J^T*F`; achieved support velocity
is `u=mu*J^T*F`; material transport is `z'=s*R^T*u`, not `J*u`.
The latter instead belongs to the contact point's world velocity. This
distinction matters as the map curves. Body work and motor work use that
same force/point/Jacobian; both bodies' torque and temporal moments are kept.

The acquired interval has zero attained normal force and reel at every
independent World row. The candidate queries the actual anisotropic point
velocity when checking normal/reel demand. It refuses an unsupported
normal/reel channel instead of inserting an unverified mixed-channel law.
The earlier full-share linear mixed-load candidate remains separately
preserved. No multi-contact or World insertion is claimed.

The existing slipping marker is 98% of shared capacity. Lower share grows
as `(1-legs)/.3` while slipping. The candidate locates cap exit and the 98%
marker inside the force calculation, then stops the leg-share growth and
retains the viscous tail. It carries the existing hold phase at that event.
Collision/reach/chart events, renewed slipping, active motors and excessive
angular travel fail closed. Local refinement and event/retry loops are bounded.

## Evidence and retained adverse results

The unchanged-World collector does not import the candidate. Acquired mirrors
and the frontal control converge at 32768/65536 pieces. The displaced controls
initially fail the reference allowance because their discretized slip-marker
time changes the final legs. Only those two cases are refined to
262144/524288; they then pass. The first collection, failed controls, exact
collector bytes and receipts remain under `out/grip-bounded`.
The combined literal fixture retains each case's own checked reference,
input manifest and convergence. Reference accuracy is unchanged for motion,
attachment and work; the new dimensionless legs requirement is `1e-6`, with
the same 1/16 allowance for reference convergence.

The first uniform force kernel passes all five references. It needs 512
uniform pieces, mostly to close work across the short stiff viscous tail.
That candidate and its exact bytes/results are retained. A separate adaptive
tail attempt initially refuses the displaced controls: subtracting large
kinetic energies creates a roundoff floor in tiny local work checks. Computing
delta energy as `(v_after-v_before)*(v_after+v_before)` corrects that numerical
accounting defect. The final check uses delta energy from the same impulse
ledger that recovers endpoint motion; body power remains independently
integrated. This also avoids tiny rounded velocity differences. The global
`1e-8` energy and `1e-7` angular gates and all
motion/work tolerances remain unchanged. Both strategies are tested; cost
determines the recommendation, not a forced choice of the adaptive method.

The kernel is not inserted into World. No native tackle finish, live-at-.8 s
or full-engine runtime improvement follows from this mechanical experiment.
The prior nine patch failures and .24-yard support-history divergence remain
independent. The historical full-suite receipt describes its own revision;
this pass follows the shared focused-testing policy.

## Reproduction and next boundary

Literal inputs/reference outputs ship in `config/grip-bounded-reference.json`;
focused tests can reproduce them without raw packets. Reference/cost collection
also requires the original immutable `out/grip-timing` packets and manifest.
Use Node 22.23.3 and the baseline launcher, recording the exact candidate:

```sh
npm run baseline:run -- --candidate --receipt out/grip-bounded/check.json -- npx vitest run --project core test/grip-bounded.test.ts test/grip-supported.test.ts test/grip-force-feasibility.test.ts
npm run baseline:run -- --candidate --receipt out/grip-bounded/reference-check.json -- node --import tsx scripts/diag/physics/grip-bounded-reference.ts
npm run baseline:run -- --candidate --receipt out/grip-bounded/offset-check.json -- node --import tsx scripts/diag/physics/grip-bounded-reference.ts --coarse=262144 --fine=524288 --offset-only
npm run baseline:run -- --candidate --receipt out/grip-bounded/combine-check.json -- node --import tsx scripts/diag/physics/grip-bounded-reference.ts --combine
npm run baseline:run -- --candidate --receipt out/grip-bounded/cost-check.json -- node --import tsx scripts/diag/physics/grip-bounded-evidence.ts
```

The first reference command intentionally retains its displaced-case failure;
the checked acquired cases are reused by `--combine`. Benchmarks run serially
without observers/profilers and exclude restore/construction. The prescribed
motor is on World.prototype so every corrected-reference scratch/live interval
receives the same boundary, and the prototype is restored afterward.
