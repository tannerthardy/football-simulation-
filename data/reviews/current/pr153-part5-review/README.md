# PR #153 Part 5 independent controller evidence

Decision and limitations: [review](../../../../docs/reviews/pr153-part5-controller-review.md)
and [machine-readable decision](decision.json). This is review evidence, not
an activation or combined-verification receipt.

- Submission: `336e8fc940d08d119926276b7a4c7242eafb437a`.
- Runtime: `4bde200b1123f9048d6d2fd8b29a4db3ce51bb1d`.
- Accepted: `f4146275ce7539816bf57b4ed55a0d2be10e48c7`.
- Source: `4702192c48130bd8042207a569a0b6f3a981877a720f7ea64a57abc2c836a9b0`.
- Node 22.23.3; settings and exact commands: [checks.json](checks.json).
- Eight focused tests pass. Native pair: Power strong/Ace/Under/pair31/77,
  only DRIVE_CONNECT differs. Two terminal plays, 174 ticks; 4.350 s combined
  focused-test/native process wall time. No new games, broad lab or full suite.
- [Audit](audit.json) verifies four published witness hashes/receipts and eight
  arm source/tool manifests, preserves diagnostic dirty-file qualifications,
  and records the native first difference and protection timeline.
- Complete full-precision traces, gzip JSON: [off](native-off.json.gz),
  [on](native-on.json.gz). These are data, not generated film. They include
  all 22 actors and movement/end observations. Their uncompressed hashes are
  recorded in audit.json; compressed hashes are in decision.json.
- [Focused controls](pr153-drive-review.test.ts), [native driver](pr153-native.ts),
  [test/collection driver](checks.mjs), [audit driver](audit.mjs), and original
  `.log` files preserve what actually ran. Focused fixtures step no World;
  the two native plays execute ordinary full-context movement/contact.

To reproduce in a checkout with dependencies installed and the exact PR
history fetched, first verify that `out/pr153-part5-review/snapshot` is unused.
Use Node 22.23.3 on PATH. No worktree, branch switch or production edit is
needed:

```sh
mkdir -p out/pr153-part5-review/snapshot
git archive 336e8fc940d08d119926276b7a4c7242eafb437a | tar -x -C out/pr153-part5-review/snapshot
ln -s "$PWD/node_modules" out/pr153-part5-review/snapshot/node_modules
cp data/reviews/current/pr153-part5-review/pr153-drive-review.test.ts out/pr153-part5-review/snapshot/test/
cp data/reviews/current/pr153-part5-review/pr153-native.ts out/pr153-part5-review/snapshot/
cp data/reviews/current/pr153-part5-review/checks.mjs out/pr153-part5-review/
cp data/reviews/current/pr153-part5-review/audit.mjs out/pr153-part5-review/
node out/pr153-part5-review/checks.mjs
node out/pr153-part5-review/audit.mjs
```

The launcher resolves all registered settings through the exported baseline
environment helper and changes DRIVE_CONNECT alone for the native pair.
It hashes the exported `src/` files before and after. The snapshot inherits
the parent checkout's Git metadata, so the receipt records the explicit
exported source/submission pin rather than pretending that metadata is its
runtime HEAD. Raw native output is unrounded; the author witnesses remain
at their original rounded sampling rate and producing pin.

Reuse the preceding response review for the unchanged draw/fullback repairs,
UC dependency witnesses and remaining acquired-RB identity failure. They
were not rerun or counted as new passes. No acceptance of DEPART_TEMPO,
ZONE_TE, mesh changes, LB_KEY, SHED_PURSUE or physical laws is bundled here.
