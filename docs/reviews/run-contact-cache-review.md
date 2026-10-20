# Independent cache-compatibility review for the 172 × 174 comparison

**PASS: reuse the final strong/weak baseline and runoff-only full originals.** No tests, native continuations, source changes or new collection were performed by this reviewer. This decision is cache compatibility, not a disposition of the forthcoming combined behavior.

## Pins, operator and settings

- Accepted comparison: `2c98bed94adad8087c65f381d4090444ad283985` (current local `origin/develop` matches).
- Baseline diagnostic runtime: `fabba9909451aa870036f11d2b760b18f88752ae`. `git diff 2c98bed9 fabba9909 -- src package-lock.json config/baseline.json` is empty. Source receipt `4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571` is accepted runtime.
- Runoff-only final runtime: `859d0255fdaca7ceba26a56258c97890fe263009`; clean candidate continuation receipts bind source `573bc9cff09455aa59eccee98cfa2010fe9fcbaee133431744292bbcfde8e3fc`.
- Packet/collector reference: `ae6b1d9` (same runtime as prior `9bd54cf`). Published collector SHA256 `068aaf1992aaaf7e3fc42ce2532f008d339c194d6db32b6a61559029dac6879d` exactly matches its immutable manifest.
- All four full originals and receipts use Node `v22.23.3`, Linux/x64, dt 0.05, all 44 accepted resolved flag values, components=1, active hands=0, GAIT_STEP=0, RUN_CONTACT_TRACK=0, CF_FLOW unset. Receipt World defaults agree: center/centered hands, legacy support, per-solve work, speculative impacts, mean support integration, bounded attachment and adaptive substeps.

The copied collector from ae6b1d9 differs from the original diagnostic checkpoint only by importing/registering an **optional** existing runner-read observer and adding its output array. Without `--runner-read` it makes no new runtime registration or native-state change. The observer callbacks only clone/read data. No measurement/frame formula was silently changed. The new source may emit additional passive observation fields, but such schema additions are not a new physical measurement operator.

## Eligible saved arms

| Arm | Input SHA256 | End | Full-original gzip SHA256 |
| --- | --- | --- | --- |
| `strong-baseline-extended.json.gz` | `0f3a33aebca432f715d9372a95316260b6acb9dd1b7172b4a63be2e537789b96` | live/censored 8 s | `fb0d617cc9c6d3990a84876546c6506ed86f8602aa5dd64d75a278cf2ba49fae` |
| `strong-candidate-extended.json.gz` | same | live/censored 8 s | `dcb9331e152df8f7ba6f428b37eabb60856455c6b629eab022ccabb61f3eab60` |
| `weak-baseline-extended.json.gz` | `a14753ed8257d7c434271f9bc0b2ef25aa4fe2ede2a7fd11e5972a1111bde820` | actual terminal 3.55 s | `3adac06c46c804c5867c8cc43e0758b43a143a0caab5572dccb8519de16e7e64` |
| `weak-candidate-extended.json.gz` | same | actual terminal 3.65 s | `53c4cbba5d95f8decc76b2c89f4ba4a17431807c2c57e83b9232163b8994b7d4` |

All four gzip hashes match `originalGzipSha256` in immutable `ae6b1d9:data/reviews/current/zone-contact-execution/summary.json`. Their compact committed trace headers match the originals. Each baseline/runoff pair has deep-equal full PlaySetup, all 22 generated physical profiles and slot ordering; hashes and flags agree. Exact cases: `oz/strong/ace_12/over3/pair11/77` and `wz/weak/ace_12/over2/pair31/1`. Weak gains 2.89/2.91 are terminal credits; strong has no final gain/outcome and must remain explicitly censored.

Initial 60-frame prefixes for strong/weak accepted and preliminary candidate traces exactly match the final originals across before/after bodies, raw/final commands, hands and physical report fields. However, the preliminary candidate traces were generated before final guard cleanup under dirty source; their commit metadata alone does not identify final runtime. Use the **final extended originals and final receipts** as the actual reuse evidence. Prefix equality is supporting compatibility evidence, not permission to relabel dirty preliminary receipts.

## Observer and baseline-export qualifications

The initial accepted strong 3 s observer run and expanded final-candidate strong runner-read 3 s run explicitly verify plain-versus-observed full body/RNG/event signatures. The final full originals match those physical prefixes exactly. No separate plain-versus-observed signature check was performed over all four complete continuations, so do not claim one. Existing passivity proof plus unchanged clone-only collector and exact-prefix verification supports reuse without automatically repeating native collection.

The exported baseline’s receipt inherited parent-checkout branch/dirty-root metadata and has an empty validation hash. This is already disclosed in the packet: it is **not** a clean-checkout or test-overlay validation claim. The actual baseline source files, lockfile and baseline settings match the accepted commit, exact input/profile agreement holds, and full-original hashes bind the preserved data. The receipt’s exit 0/inputsUnchanged and source hash qualify runtime reuse despite the Git metadata artifact.

## Required checks on forthcoming arms

Before combining measurements, compare each new drive-only/both arm’s complete setup/profile/input hash, resolved flags, dt, Node, World settings and common-prefix observation semantics to the eligible saved case. Any mismatch must be explicit; do not silently substitute or aggregate an incompatible arm. The native source difference is intentionally the sole/both controller correction, not an instrumentation/capability/default change. Keep entry commands at t distinct from achieved motion at t+dt.

The planned Power transfer is not covered by these zone caches. It needs its named saved/current compatible input and source provenance separately; runoff’s source guard should be inactive there. Cache approval does not require either correction to improve every standalone play, nor does it certify the eventual composition. It only permits the declared 2×2 comparison to reuse trustworthy baseline and runoff-only arms.
