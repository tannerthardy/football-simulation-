PR #385 evidence bundle (Run Game). Non-Git; regenerable from the pins in MANIFEST.json and
evidence/counter-scorecard:run-game/HANDOFF.md.

constructors/  run-only capture files (input constructors) seeds 7..29 odd, captured on develop e70cc2ab with the
               overlay `matched-restage.ts capture <seed> --run-only`. Each entry: {pass, call, setup(base64 captureSetup)}.
rows/<ARM>/    matched replay rows per arm: seed<N>-run-<ARM>.json, row i = capture index i (counter snaps only when
               replayed with --concept counter; PT*/PTK* = power and trap controls), streams 0..4 (`sh` = 1..4).
receipts/<ARM>/ baseline:run receipts (commit, sourceSha256, validationSha256, node, flags, inputsUnchanged, exit).
overlay/       the replay/trace overlay used (fs-ctr2 copy for CB*/PT*; latest adds --as-gh only).
MANIFEST.json  arm -> worktree, row/receipt counts, (commit, sourceSha256, validationSha256, node, inputsUnchanged);
               overlay file sha256 per worktree.

Arms: CB0 develop e70cc2ab + #382 143e554e; CB2 = CB0 + back-block fit; CB5 = 5e69fa82 + kick fit;
PT0/PT2 = power+trap controls on CB0/CB2 sources; KQ0/KQ1 = Defense bba64013 + #382 + 5e69 without/with kick fit
(eba81d05 + kick.patch); PTK0/PTK1 = power+trap controls for the kick fit (commit 88678421 as recorded);
D0 = Defense fc289d2a + #385; E0 = Defense aed85477 + #385; F0 = Defense 092f2192 + #385.
Not captured: per-row constructor hash inside rows (linkage is by capture index into constructors/, inputsUnchanged
true in receipts); PT0 has 12 row files but 8 exit-0 receipts in the worktree (an earlier PT0 attempt exited 1 and
was rerun; not all rerun receipts were retained). Stream seeds: stream 0 = saved setup seed, s>0 = Rng(seed).fork('shift:'+s).
