# Carrier boundary evidence

Read [the diagnosis and repair](../../../../docs/reviews/carrier-boundary-control.md).

`parent.json.gz` is the exact historical `RC-R3-counter-under-L-S3` full 11-on-11
Counter witness, generated from the complete source tree at
`c02a3b94ef0a0d6d689c7cb4feda43d3276e13ff`. Its source SHA is
`34f408b5ecee53740d9c61218e46b5ae0842e74f3d0f9cd0e3256dd8685abb02`,
and its physical signature exactly matches the previously retained run panel.

`carrier-only.json.gz` uses that complete historical tree with only
`src/sim/behaviors/carrier.ts` changed by `carrier.patch`. Its engine SHA is
`d2c2a24b486194d455568ba814207aa4a659ef09cbdf680dd859da29ac4e59f0`.
The tool imports the explicitly selected tree, not whichever production engine
happens to be in the working directory. Input/profile equality, actual command,
all source hashes and an exact unobserved/unrecorded versus observed/full-recorded
physical signature are retained in both reports.

`comparison.json` records the identical carrier-state/command prefix and the
first different command at 5.85 seconds. It does not turn the larger subsequent
gain into evidence of an NFL rushing rate or claim that every later physical
interaction improved. The file retains exact existing source/signature pins.

`current.json.gz` records the separately labelled combined production source
`bf3da801c3f8ad3b9729d6e808665bb6f67f9e59c0dbdb0262316267307cf631`,
including the centered-hand repair. Its ordinary unobserved/observed check also
passes. It finishes a tackle at 25.23 yards / 9.00 seconds. Because its first
carrier-state difference begins at 1.80 seconds, it is not interchangeable with
the one-change carrier-only comparison. The three-mode viewer and ZIP are
linked from the diagnosis report.

To reproduce, use fresh ignored directories from the repository root. The
following creates explicit historical source trees; it does not switch the
working checkout. Use the pinned Node installation documented in the project:

```sh
mkdir -p out/carrier-boundary-parent
git archive c02a3b9 src | tar -xf - -C out/carrier-boundary-parent
mkdir -p out/carrier-boundary-only
cp -R out/carrier-boundary-parent/src out/carrier-boundary-only/
git apply --directory=out/carrier-boundary-only data/reviews/physics-world/carrier-boundary/carrier.patch
node --import tsx scripts/diag/carrier-boundary-review.ts out/carrier-boundary-review/parent.json out/carrier-boundary-parent
node --import tsx scripts/diag/carrier-boundary-review.ts out/carrier-boundary-review/carrier-only.json out/carrier-boundary-only
node --import tsx scripts/export-carrier-boundary-review.ts out/carrier-boundary-review/parent.json out/carrier-boundary-review/carrier-only.json out/carrier-boundary-review/paired.html
```

For a separately labelled validation recording of the current engine, run the
same diagnostic without an engine-root argument. Pass that report as the optional
fourth exporter argument, after the HTML output path. That third clip includes
any other changes in the current source and is explicitly labelled as a combined
source replay, rather than the isolated one-change comparison.

The focused test panel covers both sidelines through actual World motion:
recoverable clean redirects, physically unavoidable out-of-bounds momentum, and
legitimate hit-avoidance exits even after an earlier boundary recovery command.
Existing contact-choice and run-execution tests also pass. No grip, force,
agility, strength, physical resolution or NFL-rate constants were changed.

`verification.json` pins the three raw sources, actual film files/ZIP, scripts,
controller and test. Decoded frames (time, position, ball and possession) and
full telemetry match the stored recordings; event timestamps retain existing
packing precision. The existing posture display rounds to tenths (maximum 0.05
difference). The ZIP contains byte-identical HTML. `browser-current.json` and
`browser-smoke.py` retain the focused offline Chromium check for all three modes,
inspection/layers/scrubbing/events, exact-ID search, OOB filtering and mobile
layout. It is not the complete generic checker or a new video-export check.

`remaining-outside-zone-exit.json` keeps selected actual cues/commands from the
one remaining OOB in the combined 144-run guard. Its closing safety and explicit
sideline choice distinguish it from the repaired clean-space Counter defect.
It is a small retrospective audit summary, rather than a fourth full recording
or a claim that every carrier utility switch is correct.
