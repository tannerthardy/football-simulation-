# Component-only candidate from PR #4

This isolated branch proposes enabling only `RUN_CONTACT_COMPONENTS` by default.
The comparison remains `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`; the shared
comparison profile and baseline designation do not change. The only production
delta from PR #4 (`b64910ee7975e679beca2590369714ff33994aa0`) is the existing
component switch's default. Explicit `0` reproduces PR #4's disabled path.

The correction removes drive velocity counted twice along the acquired shoulder
tangent in stretch contact. It retains the original drive's normal projection,
hand ownership, requested hand parameters, backdrive handling and release rules.
It fixes a request construction error; achieved movement still depends on real
support, contact and player capability. See the [original mechanism and matched
evidence](coupled-run-contact.md) and [complete native endings](hand-action-protection.md).

Handover and active hands remain disabled. Collection experiments are absent
from this branch. The withdrawn early-release trial and its unsafe keeper
control remain preserved on `codex/stretch-helper-check-trial` at `4074038` and
in [PR #5's collection diagnosis](https://github.com/tannerthardy/football-simulation-/pull/5).
No shared physics, capacities, roster generation or movement files change.

## Bounded verification

Use the [two-input manifest](run-contact-components-inputs.json) and the exact
[candidate settings](run-contact-components-settings.json). The affected native
control is mirrored WZ seed 3; counter seed 3 opposes accidental changes outside
stretch contact. Both stop at actual endings or explicit 25-second censoring.
Existing component/contact-surface contracts exercise projection, real loaded
contact, ownership, mirrors and physical limits. Compatible prior 60-input and
eight-completed-zone evidence is reused, with new-source results recorded
separately. No new census or full-game campaign is needed for this default-only
proposal.

At tested commit `176866ed47cacd56331b33b676c0509a350e95d7`, all **32 focused
assertions** and typecheck pass. Both native observed/plain pairs are neutral,
reach actual tackle endings and have no handover activation or active hand
request. Source SHA-256 is
`0ba6cfb6fe924d9d7edc5d04316218cadeb14ef5f604003e2549187f7d0e1678`;
validation SHA-256 is
`6afb7bc25b3db765e66c478a85034052c92d3026bfade16479d32b33e0771661`.
Subsequent receipt/docs changes leave both fingerprints unchanged. Node is
22.23.3, Linux x64; World remains
`ed1708d764c355da60bd31c115f557baf3d81af18c89f3479c471bf981732ca2`.

| Native control | Comparison baseline | Components only | Meaning |
| --- | --- | --- | --- |
| Mirrored WZ seed 3 | Crossing 2.60 s; first contact 2.65 s, DT_S; gain .677 yd | Crossing 2.65 s; first contact 2.70 s, LB_W; gain .683 yd | Clean arrival retained; the .05-s timing margin is unchanged. New complete state/RNG history exactly matches the saved component-only trace. |
| Counter seed 3 | Crossing 3.35 s; first contact 4.50 s; gain 3.063 yd | Identical, ending at 5.20 s | Complete state/RNG history exactly matches actual `4ded6b6`. |

WZ's 67 nonanchored stretch requests have maximum shoulder-projection error
`1.34e-15` yd/s; counter makes none. Actual arm/ground work and arm impulse
remain within the existing limits to floating-point tolerance. These checks
establish the corrected request and preserved protection through arrival;
they do not establish a broad gain improvement or certify the known angular law.

The reused 60-input component-only arm lost no clean approach, retained all
eight PA histories exactly, and reduced mean request-projection error from
.409329 to `1.69e-16` yd/s. The reused eight complete zone endings preserve all
seven previously clean approaches; the remaining same-step-uncertain case stays
uncertain. Completed gains still trade off: WZ seed 7 declines from 3.774 to
3.465 yd while retaining its clean arrival. This adverse result is preserved
in the [candidate receipt](run-contact-components-receipt.json).

Reused source `09c65f70...` selects the same component path under explicit `1`.
The older ending collector predates additional physical hashes and ablation
normalization, so its bytes differ; its original full state/RNG digest and the
input, profiles, initial poses and settings match the new WZ trace exactly.
Every new trace independently passes observed/plain neutrality. Prior broad
checks remain historical and are not relabeled as checks of this new source.

New command costs: focused checks 3.53 s, two native pairs 5.28 s, typecheck
9.80 s (run concurrently; 18.60 total command-seconds). Reuse required no new
broad simulations, games or full-suite run.

Testing follows [PR #6's shared policy](https://github.com/tannerthardy/football-simulation-/blob/codex/roster-capability-audit/docs/TESTING_COSTS.md)
(reviewed blob `df371a89c4d3918822bf15f7b2d0b42f8d8279da`). The designated
audit/integration owner performs final full verification after freezing the exact
combined candidate; this branch supplies directly affected evidence. A prior
full-suite pass is historical evidence, not verification of the newly combined
source.

## Reproduction and integration handoff

Fetch `codex/run-contact-components-candidate` and freeze its exact published
commit before integration. The tested engine change is commit `176866ed47cacd56331b33b676c0509a350e95d7`;
later commits carry receipts/docs only. This is a child of PR #4, with its
already-built handover still disabled, not an instruction to promote the whole
PR #4 feature stack. When applying to another integration tree, bring the
component implementation and its contracts from PR #4 plus this enablement,
and record that combined tree's own commit and fingerprints.

Use Node 22.23.3. The frozen launcher resets all 45 declared flags. Its default
profile still sets components to `0` for comparison, so the **explicit override
is required** for candidate verification. The complete settings file sets
`RUN_CONTACT_COMPONENTS=1`, with `PULL_HANDOVER`, `HAND_MOTOR`, `RUN_HANDS`,
`DL_HANDS`, `HAND_FIGHT` and `RUN_CONTACT_TRACK` all `0`.

```sh
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 \
  --receipt out/run-contact-components/focused-checks.json -- \
  npx vitest run --project core test/contact-motion.test.ts test/zone-reach.test.ts --maxWorkers=1
env -u HAND_REMOVE -u HAND_KEEP \
  FLOW_INPUTS=docs/reviews/run-contact-components-inputs.json \
  FLOW_STOP=25 FLOW_TRACE=1 CONTACT_TRACE=1 \
  npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 \
  --receipt out/run-contact-components/native-checks.json -- \
  node --import tsx scripts/diag/defense/hand-action-panel.ts out/run-contact-components/native.json.gz
```

The portable manifest and committed receipt include canonical input, profile,
initial-pose and complete-history digests; no original large trace is required
to check the two reproductions. After collecting, this offline check compares
the new native histories with the published component candidate:

```sh
python3 - <<'PY'
import gzip, hashlib, json
from pathlib import Path
def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
expected = json.loads(Path('docs/reviews/run-contact-components-receipt.json').read_text())
actual = json.loads(gzip.decompress(Path('out/run-contact-components/native.json.gz').read_bytes()))
assert actual['provenance']['flags'] == expected['settings']['flags']
assert actual['provenance']['intervention'] == {'remove': '', 'keep': ''}
assert actual['stop'] == expected['windowSeconds']
rows = {row['id']: row for row in expected['newNativeRows']}
assert [p['input']['id'] for p in actual['panel']] == list(rows)
for play in actual['panel']:
    row = rows[play['input']['id']]
    for name, value in [('inputSha256', play['input']), ('initialSha256', play['initial']),
                        ('profilesSha256', [p['profile'] for p in play['players']]),
                        ('stateRngHistorySha256', play['hashes'])]:
        assert fingerprint(value) == row[name], (row['id'], name)
    assert play['observerNeutral'] and not play['live']
    assert play['endTime'] == row['endTime'] and play['gain'] == row['gain']
    assert play['outcome'] == row['outcome'] and len(play['hashes']) == row['ticks']
print('Two complete candidate histories match.')
PY
```

The existing **audit/integration owner** runs the preserved full suite once on
the frozen combined tree and settings:

```sh
npm run baseline:verify -- --candidate --flag RUN_CONTACT_COMPONENTS=1 \
  --receipt out/run-contact-components/integration-verify.json
```

That final receipt must name the actual combined commit/source/validation
fingerprints and all resolved flags. Review precedes any new baseline designation.
Do not promote the hand stack, handover or helper release with this candidate.
The parked `RUN_CONTACT_TRACK=1` adjacent-block collision remains separate.
Known shared center-hand angular-law failures remain visible in the original
diagnosis; this request correction does not certify or modify those laws.
