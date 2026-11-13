# Solo hand-fight contract after the approved motor correction

The first combined verification of `075e2148a8c94c80ba90743a324e4670091998c0`
failed both historical six-tick solo-hand physical hashes. Preserve that failure.
The historical test covers complete commands, bodies, loads, work and RNG; it
therefore also freezes the old default angular motor. It is stronger than a
claim that a helper repair leaves solo hand policy unchanged.

The explicit #180 adoption changes default yaw response and the traction
reserve remaining for recovery. A bounded diagnostic asks whether the failures
come from that approved motor, new Rule12 metadata, or an unintended composition.
No frozen production file or test was edited during execution.

## Exact paired evidence

[Summary, complete differences and source/settings receipts](../../data/reviews/current/solo-hand-motor-contract/summary.json)
include six compressed complete traces, capture code and all three logs. The
same test capture normalizes only the already-reviewed Rule12 observation
metadata (`contacts.first` and the new strike observation descriptors). It
retains every historical physical field and its order.

| Source | Run full trace | Pass full trace |
| --- | --- | --- |
| Accepted `2c98bed94adad8087c65f381d4090444ad283985` | `1d242a5a613c06473f32afd65b32a5cd87b9f31d487a990e1e537332355c2ecd` | `d3f9cf19cf7b9fceecc192c3b093699a0038d7ee108697cdd6c76724e5d55edc` |
| Isolated #180 source `03233b05…`, checkout `7869fb686148d5b3210b2e593c61ecea97c7f342` | `ff0afb4f0e3991b6b29c28a0206ee3d6ab8976a916e5a300e4b9f23e41827ad1` | `ec267981978140e716b46855663fcddefc6e7b61f3ef8b2709d54450eb09f94e` |
| Combined `075e2148a8c94c80ba90743a324e4670091998c0` | Exactly the isolated #180 trace | Exactly the isolated #180 trace |

Accepted source reproduces both historic hashes exactly. Isolated #180 and the
combined source agree on **every normalized trace field**, not just their
hashes. All three agree exactly on commands, contact control and the next RNG
draw across all six ticks. The first physical difference is at tick six.
The pass fixture changes facing/spin and yaw/work accounting. The run fixture
also changes body motion/support, contact and arm/ground loads through the
shared dynamics. These are not metadata-only differences or a claim that only
yaw values change.

This attributes these two failures to the selected motor. It does not approve
a separate mirror failure, helper behavior, a gameplay endpoint or all possible
solo hand encounters.

## Test disposition

Keep the accepted command/control/RNG contract pinned independently. Its digest
is derived from the accepted trace with the original order and `nextRng`:

- Run: `82b6a93e956e652f136d93444a82bb718f209ddebf98f3bce86d18da8f0b12dc`.
- Pass: `a86cbcee799208e979666c327ebeaa9557ae41fd0e40297df933ec9f74e7a19d`.

Retain a full physical-trace assertion, explicitly qualified to independently
reviewed #180, using the isolated motor's two hashes above. Preserve the old
physical hashes here and in the original failed logs. The unchanged fixture
step continues checking work closure, arm impulse/work limits, support motor
work and ground traction on every tick. Other hand ownership/acquisition,
reflection, helper and pass controls remain unchanged.

This is a source-qualified contract repair after a diagnosed, approved default
motor change, not a favorable new football target or a tolerance relaxation.
It is invalid if #180 is excluded; that candidate should retain the accepted
motor's physical hashes instead.

## Reproduction and cost

Use Node22.23.3. Place the saved `capture.test.ts.txt` in `test/` as
`run-hand-diagnostic.test.ts` in an isolated checkout at each source above.
Execute through the existing launcher:

```sh
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 \
  --receipt out/hand-diagnostic/receipt.json -- \
  node node_modules/vitest/vitest.mjs run test/run-hand-diagnostic.test.ts \
  -t 'matches frozen' --maxWorkers=1
```

The motor and combined capture runs intentionally retain the old assertions
and fail; those failures remain in their logs. Six fixtures, six ticks each;
zero games or shared suites. Total recorded child-command time **5.228615011s**.
No repeated physics benchmark or broad native campaign. Static independent
review is required before accepting the test disposition; exact combined
verification remains Integration's.
