# Tight-end approach: base action and movement cost

The existing .7 blocking-base action can lower the four saved first-level TE
approaches without materially changing their short free-motion paths. It does
not solve the TE owner's early arrival ahead of RT or establish useful loaded
protection. This answers one independent mechanical question while the user's
contact-retention review remains pending.

The same recorded body, profile, energy, momentum, facing and movement command
start each arm. Only the explicit posture request changes. World applies its
existing finite 2.5/s adjustment; no body reset, profile change or force-law
modification occurs. After .15 seconds, posture is .675 versus approximately .200
with the recorded command. Support availability remains 1 in both unloaded
arms: there is no demonstrated contact/support advantage yet.

| Saved first-level body | Change in x travel (yd) | Change in y travel (yd) |
| --- | ---: | ---: |
| Strong Y reach | -.000548 | +.000305 |
| Strong H backside cutoff | -.000426 | +.000365 |
| Strong H playside reach | -.000529 | +.000233 |
| Weak H playside reach | -.000578 | -.000010 |

These small costs support keeping base maintenance separate from lateral track,
gather and joining policy. The roughly .25-yd owner/helper approach difference
seen in prior film cannot be explained or repaired by this small movement
change. A lowered base may affect pad height, support width and contact moment
arms later; those loaded consequences remain untested. Numeric .7 is an existing
OL action, not a calibrated universal TE stance.

The ordinary WR stalk command and already-lowered RT command remain exactly
unchanged in their control arms. True geometric reflections agree within
7.11e-15. The original command's first step reproduces each of six saved native
body states **exactly**, establishing the empty-space reference before changing
the action. All bodies remain upright, all work residuals are below 2.25e-14,
and unchanged traction budgets hold. There are no hands, opponents, teammate
removals, RNG calls or fresh perceptions in the mechanical test.

Input [manifest](../../config/te-unloaded-approach.json),
[probe](../../scripts/diag/zone/te-unloaded-approach.ts) and
[receipt](te-approach-support-receipt.json) preserve the three declared Ace inputs,
compressed raw-source hashes, six body/command snapshots and exact settings.
The legacy TE-placement flip and actual reflected controls stay distinct.

Tested diagnostic commit `f25be9ab980bbda14277216884647a2a929b045c`; source base
`develop` `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`; runtime source remains
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
Flags match the exact accepted profile, including components=1; World center/
legacy source is byte-identical to historical 4ded6b6. No production native
replay or new baseline is claimed.

The probe executes 72 one-body World steps, zero plays/games. Probe plus
typecheck pass in 9.89 recorded command seconds; internal mechanical calculation
takes .024 seconds. No full suite or new native campaign is run.

```sh
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/te-approach/mechanical-checks.json -- node --import tsx scripts/diag/zone/te-unloaded-approach.ts config/te-unloaded-approach.json out/te-approach/result.json
```

The live controller remains unchanged. The next loaded question needs the
physics owner's acquired/reachable/retained/cleared contract, then the separate
current-production replay owned by integration. Assess first-level protection
through runner arrival and preserve the weak-call success before accepting a
role-specific base policy. RT joining/recovery, RG anchoring, WR collection,
release and experimental hands remain separate.
