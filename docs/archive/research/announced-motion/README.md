# Recorded announced-motion experiments

These are the original executed diagnostic sources, not production dependencies
or a new automatically run panel. Large outputs stay ignored under `out/`.
The pure, portable counterexample and fast-peer opposing control are in
`test/called-motion.test.ts`, using its frozen generated fixture.

The native collector declares every input: rosters31/32,strength.55,Ace11,
WZ/IZ,Over/Cover3,LOS40,CENTER_Y,seed3,with/without the formation flip.
`native.ts` verifies observer neutrality on the selected play.
`mirror-diagnosis.ts` adds the one targeted adverse prefix and checks delivered
contacts, actual ownership and requests. Those prefixes are censored at2.65s.
Legacy `.gain`/`.reason` fields are absent from the original native output;
the report uses recorded contact depth/time and final runner coordinates,
not an invented gain field.

To reproduce in the original `/workspace/football-simulation-` checkout:

```sh
mkdir -p out/gait-response/baseline-host out/loaded-movement-audit/candidate/engine
git archive 2c98bed94adad8087c65f381d4090444ad283985 src | tar -x -C out/gait-response/baseline-host
git archive 24ff632b142183d295068c3720b5990bf8c956f8 src | tar -x -C out/loaded-movement-audit/candidate/engine
cp docs/archive/research/announced-motion/native.ts out/loaded-movement-audit/candidate/
cp docs/archive/research/announced-motion/mirror-diagnosis.ts out/loaded-movement-audit/candidate/
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx out/loaded-movement-audit/candidate/native.ts
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx out/loaded-movement-audit/candidate/mirror-diagnosis.ts
```

Use Node22.23.3. The recorded files retain their executed absolute host/output
paths and source digests; for another checkout change those host paths only,
record that collector variant, and preserve the immutable inputs/settings.
The native-compatible final helper refinement is explicit in the receipt:
native pictures have age0 or.05, so using the ordinary.05 planning interval
preserves those trajectories while correctly handling younger public inputs.

`compact-evidence.ts` is the executed local reducer/cost probe; it depends on
the original ignored raw evidence plus candidate fixture. Its batch means are
not a net-native runtime benchmark or individual-call tail measurement.
Use the published receipt rather than recollecting unchanged plays routinely.
