# One near-hip objective: bounded shadow result

Follow-up: [moving-catch improvement](moving-catch-improvement.md) tests the
remaining flight-approach hypothesis and installs a minimal controller
candidate. Measurements and conclusions below retain their original source.

The same observed near-hip request does **not supply a general repair across
the catch boundary**. It already equals the pursuit request at several
post-catch ticks. Remaining differences have tradeoffs: reducing predicted
crossing can surrender distance or closing. Flight anchoring remains a narrower
hypothesis worth distinguishing, but no new controller is justified yet.

## One question and compatible evidence

Question: does one moving near-hip objective improve forecast contact entry
across catch without surrendering closing/leverage or an attainable ball contest?

Use P4's compromised crossing approach, P58's explosive approach/repair, P95's
ordinary success with a reachable ball contest, and P16's interception after an
unseen tip. The last two are opposing information/football controls. Their
complete recorded outcomes and P4's two actual execution values are reused from
[the causal study](catch-transition-diagnosis.md). No roster expansion or fresh
transfer claim is made.

The shared testing policy is adopted from [PR #6's TESTING_COSTS.md at
`f9617dd`](https://github.com/tannerthardy/football-simulation-/blob/f9617dde9456c0ead2d66b46d4b42608adcd3585/docs/TESTING_COSTS.md).
No branch switch/merge, test removal or full suite was required. The run-game
integration lead remains the designated full-suite owner if an engine candidate
becomes ready. This is independent diagnostic work, with no overlapping shared
controller changes.

The corrected tested revision is
`4f0f723` on `codex/catch-pursuit-diagnosis`; source remains byte-identical to
integration `4ded6b6`, runtime SHA-256
`8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`.
The [compact receipt](../../data/reviews/current/catch-nearhip-shadow-diagnosis.json)
pins full commit, collector/model/input/cache/dependency hashes, Node/platform,
43 flags, World defaults, selected times and per-prefix cost.

## What changes in the shadow

The hypothetical objective tracks a near hip anchored on the **consumed
receiver picture**. It uses existing interception, leverage, moving-arrival
and free movement-preview machinery. The same picture velocity defines the
moving path and the movement demand; a future interception point is not
double-led. Command metadata, capabilities, perceived information and ordinary
World limits are retained.

Flight eligibility is exactly the prior v2 eligibility. After catch, only a
target already acquired from an eligible visible window can be examined, using
its subsequently consumed pictures. No actual-catcher shortcut, unseen tip,
future cut, forced delay or persistence timer is introduced. No hypothetical
request is returned to the live controller. Loaded/recently contacted bodies
are excluded because a free one-body forecast cannot represent their constraints.

Eight short prefixes reconstruct the four inputs' baseline/arrival histories.
Every replayed boundary checks **all 22 bodies, applied commands, consumed
pictures and raw commands** against compatible complete film. Direct checks
also enforce no physical/information mutation, finite capped demands and
identical previews when evaluated original → alternative → original.
These checks passed; no numerical preview-order defect was found. Typecheck
passed on the same collector/model bytes subsequently pinned at `4f0f723`.

## Evidence for and against

Numbers below are **free forecasts**, not achieved candidate contact:

| Existing history / tick | Current request | Near-hip alternative | Implication |
| --- | --- | --- | --- |
| P4 arrival, 2.80 flight | Closest 1.458 yd; crossing 8.018; closing +0.446 yd/s | 1.453 yd; crossing 7.381; closing +1.147 | Better predicted entry, but only fingertips: geometric quality .016→.023 at .60 s |
| P4 arrival, 2.95 pursuit | Closest 2.076 yd; crossing 6.448; closing +0.625 | 2.110 yd; crossing 6.228; closing +0.024 | Distance and closure worsen; neither request reaches standing range in .60 s |
| P58 arrival, 2.55 flight | Closest 1.789 yd; no standing reach in .60 s | 1.065 yd; first standing reach at .55 s; closest quality .619 | Promising pre-catch anchor hypothesis; stronger closing also requires physical validation |
| P16 baseline, 3.80 flight | Closest 4.578 yd | 4.349 yd | Both outside reach; closer receiver distance is not a better ball contest |

For P4, the shadow exactly equals current pursuit at **2.85, 3.30 and 3.45**
in both existing histories. For P58 it equals pursuit at **2.60 and 2.70**.
At other ticks, signs differ: P4's 3.05 alternative reduces crossing but stays
outside standing reach; P58's 2.90 alternative trades slightly different reach
geometry against later closest approach. These are not blanket improvements.

P95's reachable ball branch at 3.65 is protected and never arms this objective.
P16's problematic old 3.30 diversion remains outside eligibility; later measured
receiver tracking does not reach him within the forecast. P16's interception
and ordinary P95 tackle remain **cached completed controls**, not newly achieved
endings under a candidate. No hypothetical grip survival or YAC is reported.

P4's previously established geometry-by-execution result still applies: both
native histories tackle with its stronger actual execution and concede TD with
its weaker execution. The shadow pass adds no evidence that its handoff caused
that regression. The remaining difference is partly **which observed anchor
the flight phase aims at**, rather than missing moving-arrival machinery after
catch. A difference in anchoring is not by itself an incorrect football decision.

## Cost, failure and next decision

Corrected pass: **618 native ticks, 38 selected rows, 24 forecast pairs, zero
new full plays/games**. Prefixes/forecasts took **1.97 s**, complete command
**3.44 s** on this environment, below the declared 5-s prefix / 30-s batch
budget. All new prefixes are censored; complete outcomes are explicitly cached.
The full suite and games were not repeated.

The initial collector captured a sampling flag in its behavior callback,
omitting selected flight measurements. Native prefix parity passed, but that
run is **invalid for the shadow question** and retained as
`out/catch-nearhip-shadow/initial-invalidated.json`. The callback was corrected
and declared sample coverage asserted before repeating only this small pass.
Both runs' costs and revisions are recorded; no favorable result was filtered.

**Keep live movement unchanged; no integration promotion.** There is no tooling
or preview-correctness blocker. The remaining evidence does not establish a
general objective defect, and free forecasts omit actual runner cuts, contact
loads and execution.

If pursuing the narrower hypothesis, the smallest discriminating experiment is
to isolate **current observed hip versus moving ball-window anchor before
catch** on P58/P4, keeping existing eligibility and physics fixed, and measure
native achieved entry/grip survival with both actual execution values. Continue
to reuse the opposing ball-contest evidence. No new gate, helper rule, roster
correction or broad screen follows from this shadow result alone.

The shadow can be repeated with compatible local complete recordings:

```sh
npm run baseline:run -- --receipt out/catch-nearhip-shadow/revised-receipt.json -- node --import tsx scripts/diag/catch-nearhip-shadow.ts out/catch-nearhip-shadow/revised
python scripts/diag/catch-nearhip-shadow-report.py
```

Missing/corrupt/incompatible cached film fails before reconstruction; it never
silently reruns complete plays. Historical receipts remain available separately.
