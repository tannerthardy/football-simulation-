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
