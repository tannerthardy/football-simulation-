# Reproduce the original catch/contact pairs

This is an archived diagnostic, outside the default tests. It reconstructs four
original native inputs from game seed 105, then compares those inputs under two
frozen sources. It does not run a new season or tune player capabilities.

Use Node 22 and the installed project dependencies (`npm ci`). Run from the
repository root. Freeze the original baseline with Git archive; no checkout or
worktree is needed:

```sh
mkdir -p out/catch-contact-census/frozen-source
git archive cd25757 src scripts package.json package-lock.json tsconfig.json | tar -x -C out/catch-contact-census/frozen-source
ln -s "$PWD/node_modules" out/catch-contact-census/frozen-source/node_modules
```

After committing the candidate, freeze it separately. Replace `HEAD` with a
specific candidate commit when reviewing historical work:

```sh
mkdir -p out/catch-contact-census/candidate-source
git archive HEAD src scripts package.json package-lock.json tsconfig.json | tar -x -C out/catch-contact-census/candidate-source
ln -s "$PWD/node_modules" out/catch-contact-census/candidate-source/node_modules
node --import tsx docs/archive/research/catch-contact/pair-probe.ts out/catch-contact-census/frozen-source out/catch-contact-census/candidate-source out/catch-contact-census/pair-check
```

Use new archive directories if existing ones contain another source. Reuse an
existing correct dependency symlink instead of recreating it. Use a new output
directory for each run: outputs refuse to overwrite earlier evidence. To reuse
input capture, copy only `exact-inputs.json` into the new output directory first.
The probe checks its source, input and native execution pins before using it.

With no cached inputs, the probe regenerates the original game prefix through
play 165. It observes the actual coordinator calls and preserves personnel,
snap seed, situation, fatigue and learned scouting before the game writes them
back. Immutable native initial, endpoint and copied-RNG pins validate that
capture; no old ignored packets or exact-input file are required.

Each standalone pair must reproduce the original baseline, and observed/plain
runs must agree on result, all bodies, intents, minds and RNG. The probe records
actual visual reads, raw and applied commands, achieved bodies/support, joints,
loads, work and the exact catch air segment. It does not ask for extra visual
reads, run a controller again or draw from the live RNG. The small body codec
preserves nonfinite support clocks and own undefined fields.

The original baseline source is
`0398418c6e8b8d53a1517a17f7087c697230ac62f12dd37373af2b6548bd1df7`.
The first facing-only candidate was `6847fa8`, source
`4c06bb7dbd720ad99c1778d6350dd840ebe937d3be36823d53ccda3c24e3a96a`.
The later last-reach research snapshot was source
`a8b6633e90340f86e0a71ceb686aa9a2fa34de66a1e44c976aeb7441e02ca672`;
that snapshot includes patch-only World changes, while these inputs use the
production center-contact mode. A later trace-wording change legitimately
produces a different source and tool receipt. Do not relabel older evidence.

## Original random review

`selection.json` retains the exact pre-outcome draw, including eligible IDs and
input pins. `native-contact-commands.ts`, `blend-sign-audit.mjs` and
`catch-heights.py` are exact copies of the original observers/reducers; their
historic hashes are in the contact receipt. They are manual research, not new
production recording infrastructure.

To regenerate the ordinary traces, first export the two original baseline
cohorts from the archived source. This takes longer than the four-play probe.
The paths below match the collectors' original dependency contract:

```sh
mkdir -p out/pursuit-controller
(cd out/catch-contact-census/frozen-source && node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out ../../pursuit-controller/combined-plays101.jsonl.gz --review-out ../../pursuit-controller/combined-outcomes101.json)
(cd out/catch-contact-census/frozen-source && node --import tsx scripts/mechanics/sim-export.ts --seed 202 --games 8 --out ../../pursuit-controller/combined-plays202.jsonl.gz --review-out ../../pursuit-controller/combined-outcomes202.json)
cp docs/archive/research/catch-contact/selection.json out/catch-contact-census/random-sample.json
node --import tsx docs/archive/research/catch-contact/native-contact-commands.ts out/catch-contact-census/frozen-source out/catch-contact-census/baseline-traces
cp docs/archive/research/catch-contact/blend-sign-audit.mjs out/catch-contact-census/blend-sign-audit.mjs
cp docs/archive/research/catch-contact/native-body-codec.mjs out/catch-contact-census/native-body-codec.mjs
node --import tsx out/catch-contact-census/blend-sign-audit.mjs --source out/catch-contact-census/frozen-source --out out/catch-contact-census/repeated-blend-audit.json out/catch-contact-census/baseline-traces/S*.json.gz
python3 docs/archive/research/catch-contact/catch-heights.py
```

Use a fresh workspace or preserve any existing output before these fixed-path
historic commands. Source and native outcomes must reproduce; regenerated
metadata/compression hashes can differ with tooling versions. Never substitute
candidate game IDs for the original selection. The broader offline reach-gate
counts nominate opportunities using already consumed pictures; they are not
exact extra controller reads. The standalone pair and acquired-possession tests
provide the causal reach evidence.

Limits:

- These IDs refer to original baseline inputs, not the same numbered play in a
  later candidate game whose earlier outcomes may have changed.
- Four inputs include three ordinary controls and one nominated long touchdown;
  they do not establish a population tackle rate. The separate random review
  and wider controlled panels matter too.
- A created hold is not a proven load. Tick-average force and boundary capacity
  are different measurements; a slipping flag denotes saturation.
- Direct-pair initial body/profile/mind/RNG pins are checked. The older original
  native receipt did not independently serialize initial minds; it retained
  initial body/profile/RNG and complete endpoint pins including minds.
- A changed gain is evidence to examine, not a target. Preserve failed attempts,
  legitimate escapes, adverse changes and unchanged controls.
