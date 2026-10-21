# Retained pursuit and tackle counterexamples

These are deliberately selected source-law counterexamples, not a football
frequency sample, NFL calibration or a promoted repair. See the
[technique audit](../../../../../docs/reviews/pursuit-and-tackle-technique-audit.md).
The primary engine boundary is commit
`80e815102709a19026eb5398a7e5daaa844d7bb4`, whole-source SHA256
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.

- [probe.json.gz](probe.json.gz): original unchanged C-source receipt. Four
  two-body traffic cases hold the first spacing-adjusted command for sixteen
  ordinary 50-ms production-World steps. The same report also retains the
  gather-threshold, force/alley and staged rear-wrap cases.
- [replanned-C.json.gz](replanned-C.json.gz): feedback variant re-run from an
  immutable `git archive` of C. It resets the original request and applies
  spacing to exact current teammate states before every ordinary World step.
  Both mirrors still first contact at .55 seconds, with closing speed
  2.8275915603 yd/s and impulse 130.168620464 kg·yd/s. Both straight controls
  remain clear through .8 seconds. It retains the other diagnostic cases too.
- [interim-replanned.json.gz](interim-replanned.json.gz): the original feedback
  receipt, explicitly pinned to interim source `a1606da3…`, whose full source
  was not archived. Its entire numeric case payload matches the immutable-C
  rerun exactly. It is retained for provenance; it is not relabeled as C.
- [provenance.json](provenance.json): original and published tool hashes,
  uncompressed/compressed data hashes, source boundaries and collection scope.

Gzip compression uses `mtime=0`; decompressing the original receipts recovers
their exact original JSON bytes. `original-*.ts.txt` preserves the original
collector bytes, including their old scratch-path imports. Those are receipts,
not executable tools at this folder location.

Reusable tools are
[pursuit-technique-probe.ts](../../../../../scripts/diag/pursuit-technique-probe.ts)
and
[pursuit-technique-replanned.ts](../../../../../scripts/diag/pursuit-technique-replanned.ts).
Their default source gate requires C. Import/output/source-gate adjustments
change their hashes; the published feedback tool actually collected the C
rerun, while the published held-intent tool did not collect the original receipt.
Do not rerun them in a concurrently changing engine and call the result C.

To reproduce, make an isolated C archive or checkout with the existing project
dependencies, copy the pinned published tool to its `scripts/diag/`, and run
from that archive's root:

```sh
node --import tsx scripts/diag/pursuit-technique-probe.ts --output=out/pursuit-probe.json
node --import tsx scripts/diag/pursuit-technique-replanned.ts --output=out/pursuit-replanned.json
```

An intentional later-engine diagnostic may specify
`--expected-source=<whole-source-sha256>` and a separate `--output=`. It is a new
sample. No physics capabilities, roster ratings, grip strengths or solver
resolution are changed by these tools. The traffic checks use exact observed
teammates so they isolate movement forecasting from perception errors. Facing
is body orientation, not a gaze measurement; the rear-wrap probe is staged
before body contact and invokes the existing tackle selector.
