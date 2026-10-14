# Shared Ace replay on accepted develop

**Use this receipt before replaying these inputs again.** Integration owns this
shared measurement; run-game workers can reuse it for candidate selection and
matched comparisons. [Physics review/handoff](https://github.com/tannerthardy/football-simulation-/pull/18#issuecomment-6173825589)
cleared bounded controller work without promoting experimental contact mechanics.

## Exact reference and scope

Refreshed `develop`: **`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`**, unchanged
from the reviewed head. Collector/input commit:
**`ac6f663f958f4d59cb0f3e0e9d25c84e1c06dd79`**.
Production source, existing tests, profile, dependency lock and launcher match
that accepted development reference. No experimental contact API is selected:
center hands, centered integration, legacy support, mean support integration.
All **44 accepted flags** are resolved explicitly, including components `1`;
the original 43 values remain exact.

- Source SHA256: `e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
- Flags SHA256: `e9b97b1c55905956e5e356fa4f87985aaf60103ef6e92d2c3a35f84e81ef2f69`
  (UTF-8 compact JSON, sorted keys, null preserved).
- Node 22.23.3; actual source/flags/World/lock/input/collector/harness hashes
  and command receipts are in the [single shared receipt](../../data/reviews/current/ace-production-replay.json).

Same original Ace recipes: roster seeds 31/32, strength .55, play seed 3,
LOS 40, exact engine field center, first down 50, Over/Cover 3/base43.
Existing generation/selection bytes are unchanged. This regenerates the same
declared players, not a fresh roster sample. The legacy “mirror” ID is a
**TE-placement contrast**, not a geometric mirror; the weak call supplies the
opposite run direction. [Input manifest](../../config/ace-production-replay.json).

## Complete outcomes

Each input ran **once**, to a natural ending. No timeout, censoring or skipped
case. Gain below is official two-decimal output; the receipt also preserves
unrounded dead-ball gain and all events, stats, segments, clock and turnover fields.

| Input | Gain | First carrier contact, native event label | LOS crossing | Ending |
| --- | ---: | --- | --- | --- |
| Strong Y-side, unflipped | +1.49 yd | CB_S grasp, 3.65 s; +.3754 yd depth | 3.60 s | Tackle, 4.30 s |
| Strong H-side, placement flip | -.21 yd | DE_S body collision, 2.65 s; -.2343 yd depth | None | Tackle, 3.25 s |
| Weak H-side | +2.37 yd | DE_W grasp, 2.30 s; -.9623 yd depth | 2.60 s | Tackle, 3.40 s |

These are current production observations, not desired yardage targets.
The weak call is **not a clean pre-contact arrival** here: contact precedes LOS,
then a hold breaks. The historical isolated-law weak gain +9.50 and clean arrival
belong to a different source/World selection and remain separate evidence.

## Controller and contact observations

- RT's first nominal participation in the strong Y rep is at controller time
  1.20 (World boundary 1.25); its first nonzero hand tick average is over
  1.60–1.65. Nonzero sampled RT/DE_S averages extend through boundary 3.70;
  Y climbs at native event label 2.00. The isolated-law claim of lost RT load
  at 2.00 does not describe this production history.
- In the placement-flipped H case, sampled RT/DE_S hand load spans controller
  1.40 through boundary 2.80. At the interval containing first RB/DE_S contact,
  its normal/tangent averages are approximately 766.45/471.52. A loaded blocker
  still does not prove control of the defender's route through runner arrival.
- **No RG–DE_S body collision** is reported in any of these three production
  histories. The earlier isolated-law collision is not reproduced as a current
  production defect. RT/RG requested-versus-delivered motion is saved, without
  attributing every difference solely to spacing.
- Z consumes **zero CB_S pictures** in all three executions; no Z/CB_S hand
  load is recorded. This is compatible with #24's independently demonstrated
  input error; it is not a replay of that proposed correction or proof of rescue.
- Hand force fields are signed **tick-average impulse/dt**, not final-substep
  samples or proof of continuous latch. Center mode's unavailable patch-only
  vector/moment fields are null. Event labels and completed World boundaries
  remain distinct. Work/budget residuals are recorded, not a new angular-law pass.

Historical center and patch/legacy outcomes are reused from their pinned
[context](../../config/ace-production-historical-context.json), with their own
43-flag/source identities. All three complete state/RNG history hashes differ
from the old center references; similar outcomes do not establish exact-state
compatibility. No historical baseline was rerun or relabeled.

## Reuse, cost and next decision

The [781 KB shared observation packet](../../data/reviews/current/ace-production-observations.json.gz)
contains complete outcomes, input/player/profile data, every tick's full-state
hash, key-actor motion/request/delivery, engagements, World-end hand reports and
body contacts. Detailed support/pictures/contact phases are sampled at stated
checkpoints and major events. Included numeric fields were checked exactly
against the full raw packet. This is not a graph-complete mechanical replay.
Full raw traces and logs remain under ignored `out/ace-production/`, with hashes
in the receipt. No broad output upload is needed.

Inspect/reduce the shared packet **without simulating**:

```sh
python3 scripts/diag/zone/ace-production-report.py
```

Only if changed code/inputs or a specific new question requires reproduction:

```sh
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/ace-production/replay-launcher.json -- node --import tsx scripts/diag/zone/ace-production-replay.ts out/ace-production
```

Collector 2.028 s; wrapped three-play command 2.849 s; new collector typecheck
10.781 s. A .409-s preflight rejected an initially rounded field-center manifest
before any PlaySim was constructed; its failed receipt/log hash is retained.
The corrected run alone executed the three plays (219 ticks). Offline reduction
advances no simulation. No full games, new roster samples, duplicate plain runs,
experimental selections or full combined suite.

Next: run-game workers choose bounded candidates against this shared production
reference, preserving successful and adverse cases and actual defender access.
#24's visual-input extraction remains independent; #23 earns a separate loaded
TE-base question. Keep RT joining/recovery and RG anchoring separate, preserve
acquired information/spacing/physical limits, and coordinate shared movement
with YAC. Full combined verification belongs to the integration owner only when
an actual reviewed runtime candidate is ready. No controller/law promotion,
merge, baseline designation or default change occurs in this evidence pass.
