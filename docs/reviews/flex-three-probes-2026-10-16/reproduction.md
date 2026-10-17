# Restoration and bounded reproduction

The [provenance JSON](../../../data/reviews/current/flex-three-probes/provenance.json)
contains full source pins, every capsule file SHA256, Node/platform, dependency
and validation fingerprints, 44 resolved flags, World defaults, per-arm runtime
hashes, exact commands and all launcher receipts, including the two nongreen
diagnostic receipts. The [summary](../../../data/reviews/current/flex-three-probes/summary.json)
contains identities, plans, endpoints, cues, requests, achieved movement and
the merged P020 execution/geometry trace. Measurements use tick-start body
state unless specified; catch fraction 1 is the interval endpoint, not its
start. Live prefixes are explicitly censored.

No frozen input is generated from rounded replay positions. The shared Physics
`reconstruct.ts` is unchanged, verifies post-constructor RNG/call/player-energy
identity, and rebuilds prior scouting from original calls. Native saved rows
for G1 P009/018/020/027/056/064/080/117/192 were copied from the verified original
G1 archive. The restorer rejects P064's missing pre-constructor staged inputs.
The first constructor receipt exits nongreen for that honest hold; it ran no
engine ticks. The first analysis exits nongreen because cached G2-P107 contains
no PBU. P080 is the actual opposing control, not a silently substituted label.

The independently published source evidence is:

- Original game input/archive receipt: `b9b9c17597970ddc87aa4a4e271fc4cfeef71909`.
  G1 archive SHA256 `32f521bb60cb9a0a4b755b1cffc25898a0c44c409d717897c8aed46644d14c8e`.
- #129 follow-up evidence: `0b43b456290fc6eed90d2560ab0e2e4817c41416`,
  archive SHA256 `5adf0a5dfe6760d382ed3f0f44e5e9624ac1101e2f8dadd204c33f1347073b36`.
- #131 exact captures/restorer: `b5b4fba9eefa5e59e8db192e77a6502341d81989`,
  archive SHA256 `7fc78954d2240c86c5bc9092c6a9d1345d9a3acbe3af061cbd33d006bb93f97b`;
  code `2f9085f1e3dc8e5a19c07fc8f561dc1689413a5e`.

The accompanying [bundle.json](../../../data/reviews/current/flex-three-probes/bundle.json)
pins data-only commit `eb9c4efd2ec22abf1dc447509c07c97c6ffa8b8e` and the
fetchable 14,721,296-byte archive (SHA256
`5a3b4e36c3468589446b30afbb220d8ace3a0d6475dec3e30a533424e407040a`). It restores
capsules, exact disposable runtime/runner copies, shared captures, receipts and
checksums under `out/flex-three-probes/`. The archive's teammate data symlinks are
relative. Its manifest verifies physical files; no executable engine changes
are installed in the checkout. Do not merge the data-only evidence branch.

Default reproduction is **saved-data only**, and executes zero snaps:

```sh
python scripts/diag/flex-three-probes-analyze.py
```

Reuse existing native evidence whenever its source/settings/input keys match.
If a specific result needs native repetition, use Node22.23.3 and the launcher,
with the archived host and exactly the necessary IDs. For example, the P018
candidate alone is:

```sh
node scripts/baseline.mjs --candidate --receipt out/flex-three-probes/repeat-pool.json -- \
  python scripts/diag/flex-three-probes.py --arm pool --ids G1-P018
```

This deliberately runs a disposable copy with its recorded runtime digest;
the launcher's production digest is not substituted for that digest. To prepare
a **fresh** host from the accepted checkout, move the restored host elsewhere
first and use `--prepare`; the tool refuses to overwrite evidence. The final
template supports the passive trace arm and validates checker mode; the preparer
also bounds allowed IDs and protects held P064. New preparations receive new
harness fingerprints. Use the archived hosts for exact measured-runner
repetition. Existing runtime transforms are unchanged. Exact archived
runner/preparer hashes remain in each preparation record; measured runner copies survive.
Each native case stops at its declared horizon or death, with a five-second
per-case wall budget and a 60-second process ceiling. No automatic escalation,
baseline recollection, fixture regeneration or game campaign occurs.
