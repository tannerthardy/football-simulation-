# Manual contact mechanics probes

These are exact copies of the small phase observer and branch-only load probes
used in the contact receipt. They stay outside production and default tests.
No capacities or solver policy change. Use Node 22 and installed dependencies.

The files keep their original relative imports and output paths. Copy them into
a fresh Git archive rather than editing the live checkout or overwriting old
evidence. The original law/refinement receipt used transient source `a8b6633e`;
commit `c56ad68` has the same World and a later trace-only wording change.
Do not relabel old hashes. New repetitions produce their own source/tool pins.

```sh
mkdir -p out/contact-mechanics-repeat
git archive c56ad68 src scripts package.json package-lock.json | tar -x -C out/contact-mechanics-repeat
ln -s "$PWD/node_modules" out/contact-mechanics-repeat/node_modules
mkdir -p out/contact-mechanics-repeat/out/reduced-support-final-mechanics
cp docs/archive/research/contact-mechanics/relax-hand-slip.ts out/contact-mechanics-repeat/out/reduced-support-final-mechanics/relax-hand-slip.ts
(cd out/contact-mechanics-repeat && node --import tsx out/reduced-support-final-mechanics/relax-hand-slip.ts)
```

This repeats 24 mirrored base/heavy jams at 12/48/96 subdivisions in both hand
modes. The observer compares actual fixed-position torso solve impulses and
checks unobserved endpoint equality. Nonmonotonic trajectory differences and
fall transitions remain evidence to diagnose, even when momentum/work close.
The unchanged 144-case hand oracle and six torso controls also remain in the
active scripts/tests; see the prototype review for commands.

For the separate `claude/run-blocking` package at its reviewed immutable commit:

```sh
mkdir -p out/load-anchor-repeat/snapshot
git archive 88bfc45147f58f670444f3d1159c288bafff1521 src scripts package.json package-lock.json | tar -x -C out/load-anchor-repeat/snapshot
ln -s "$PWD/node_modules" out/load-anchor-repeat/snapshot/node_modules
cp docs/archive/research/contact-mechanics/load-probes.ts out/load-anchor-repeat/snapshot/load-probes.ts
(cd out/load-anchor-repeat/snapshot && node --import tsx load-probes.ts)
```

The branch commit must be fetched before archiving if absent. This does not
merge it. The fixed output goes to the snapshot's parent directory. Three
declared cases test a distant bystander, combined ground yaw
and translation, and simultaneous unloading. They expose coupling defects,
not targets for NFL yardage or a reason to forbid leverage/double teams.

## Shared material-point law check

`material-hand-law.ts` is a small independent accounting audit retained from
the angular-contact repair. From the repository root:

```sh
node --import tsx docs/archive/research/contact-mechanics/material-hand-law.ts out/angular-contact-next/graph-law.json
```

It checks a three-body graph, torso collisions, material contacts on both
bodies, mirrors, coordinate changes, solver steps and coincident half-cap rows.
Bodies are free of ground force. This is not a test of grounded football
technique, NFL capacities or complete convergence. See the current
[angular review](../../../reviews/angular-contact-repair.md).

## Interior flow and climb follow-up

`zone-climb-observer.ts`, `reduce-zone-climb.py` and `zone-lateral-audit.ts`
are preserved manual probes for immutable source `036b15a9`, not production
controllers or default tests. They reconstruct the original keeper rules;
do not reuse their gate labels on a changed controller without a fresh audit.
The observer makes no extra perception/RNG calls. Extended OZ neutrality was
not separately certified. See the [current plan](../../../reviews/wide-zone-guidance.md).

From the repository root, with Node 22 and the two commits available, repeat
in a fresh ignored folder. Large results stay there:

```sh
mkdir -p out/zone-repeat/out/engaged-zone/final out/zone-repeat/out/zone-climb
git archive ebff3938494b0e343df4aa00c9b8c492b60e881f src | tar -x -C out/zone-repeat/out/engaged-zone/final
git archive 8a2682c src/physics | tar -x -C out/zone-repeat/out/engaged-zone/final
cp docs/archive/research/contact-mechanics/engaged-zone.ts out/zone-repeat/engaged-zone.ts
cp docs/archive/research/contact-mechanics/zone-climb-observer.ts out/zone-repeat/out/zone-climb/native-climb-observer.ts
cp docs/archive/research/contact-mechanics/reduce-zone-climb.py out/zone-repeat/out/zone-climb/reduce-climb.py
cp docs/archive/research/contact-mechanics/zone-lateral-audit.ts out/zone-repeat/out/zone-climb/physics-audit.ts
(
  set -e
  cd out/zone-repeat
  node --import tsx engaged-zone.ts out/engaged-zone/final out/engaged-zone/final-center.json center
  node --import tsx engaged-zone.ts out/engaged-zone/final out/engaged-zone/final-patch.json patch
  node --import tsx out/zone-climb/native-climb-observer.ts
  python3 -I out/zone-climb/reduce-climb.py
  node --import tsx out/zone-climb/physics-audit.ts
)
```

The source guard and prior endpoint checks are deliberate. These repeat the
historical measurement stage, including its adverse cells; they do not measure
the current branch or its new explicit-model free-preview helper.
