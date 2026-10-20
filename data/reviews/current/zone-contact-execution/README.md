# Zone contact execution packet

[Controller report](../../../../docs/reviews/zone-contact-execution.md) ·
[Before/after chart](before-after.png) · [Scalable chart](before-after.svg) ·
[Measurements and costs](summary.json) · [Manifest](manifest.json).

Candidate: `859d0255fdaca7ceba26a56258c97890fe263009`.
Accepted base: `2c98bed94adad8087c65f381d4090444ad283985`.
Baseline diagnostic checkpoint: `fabba9909451aa870036f11d2b760b18f88752ae`,
whose entire `src` tree matches accepted develop.

The patch realizes a held **solo runoff** drive's tangent in component mode.
It leaves reach/seal/combinations, legacy composition, cadence, capabilities,
rosters, physics, release, mesh and all44 settings alone. See the report for
the new strong DT–runner impact and fresh Tite's unachieved late collection.
These are retained costs, not omitted failed runs. Narrow source review is
positive; Integration still owns independent disposition/combined verification.

Inputs were selected before candidate results:

| Label | Exact case | Window |
| --- | --- | --- |
| strong | `oz/strong/ace_12/over3/pair11/77` |8s; both censored |
| weak | `wz/weak/ace_12/over2/pair31/1` |Through actual tackles,3.55/3.65s |
| fresh-tite | `oz/strong/ace_12/tite4/pair11/77` |3s; baseline terminal, candidate censored |

Pair11 uses generated teams11/12; pair31 uses31/32, strength.55. The case
constructor is copied from Claude's zone-lab construction, without importing
its experimental runtime. Compact trace headers include complete PlaySetup,
selected physical profiles, exact input SHA256, node and resolved flags.

Six `*-baseline.json.gz` / `*-candidate.json.gz` files are **compact traces**,
not restart snapshots or full World ledgers. They retain all22 positions,
velocities/facing, raw and final commands, acquired zone reads, actual hand
loads, contact impulses and selected contact-controller observations. Full
support state and per-actor work arrays are reduced to support state and
budget maxima. Their source full-ledger gzip hashes remain in summary.json;
the committed collector can regenerate the originals. No film or zip archive
was generated. Static charts are directly viewable/downloadable.

Time convention: `t` is the pre-execution controller/World interval start;
`end=t+dt` labels achieved positions/velocities. Carrier event2.50 identifies
the subsequent `[2.50,2.55]` interval. Do not treat entry velocity as execution
of that tick's new request. Weak/strong cases are not exact geometric mirrors.

The extra [runner-read diagnostic](strong-runner-read.json) consumes the
existing read observer, not new perceptions. Both the initial strong contact
observer and this expanded diagnostic preserve full body/RNG/event signatures
against a plain prefix. Runner scores are cost/risk proxies, not proofs of
feasible or optimal routes.

To reproduce, use Node22.23.3 with installed dependencies and an isolated
checkout at the named runtime. For each case, the command is:

```sh
node scripts/baseline.mjs --candidate --receipt out/receipt.json -- node --import tsx scripts/diag/zone-contact-execution.ts --case oz/strong/ace_12/over3/pair11/77 --until 8 --out out/zone-contact-execution/strong-candidate-extended.json.gz
```

Change the case/window/output exactly as in the table. Baseline source is
the diagnostic checkpoint above; candidate source is859d0255. For the extra
runner analysis, use the published collector with `--until 3 --runner-read
--verify-observer`. Its diagnostic-only additions do not change runtime.
The original archive baseline inherited its parent checkout's Git status;
its receipt's dirty-root metadata is not a clean-tree claim. Use the explicit
exported checkpoint and matching source SHA4273994f…; all baseline runtime
files were verified against accepted develop. Candidate continuations bind
clean runtime859d0255/source573bc9c….

After regenerating the full originals under `out/zone-contact-execution/`,
[summary script](../../../../scripts/diag/zone-contact-summary.py) recreates
the compact data, costs and measurements. [Chart script](../../../../scripts/diag/zone-contact-evidence.py)
reads only the compact data, runs zero simulations, and writes PNG/SVG.

Receipts retain the corrected baseline fixture's3 expected failures,
development-stage invalid-direction fixtures, final13 focused passes, the
compatible33-check receipt, typecheck and all native invocations. Earlier
fixture staging errors are not counted as candidate regressions or successful
proof. No shared suite, games, broad census or NFL scan was repeated.
