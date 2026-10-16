# Pressed man stance beside the fixed front

The four saved Under/Cover1 OZ openings start the pressed nickel inside the
strong end's body: roughly .30 yards between centers against .55–.63 combined
radii. This is an impossible initial stance, not an earned collision. It changes
the front before either defender requests movement.

The independently reviewable correction keeps the assigned receiver, exact
lateral shade, press duty, installed front and actual body sizes. Only an
overlapping, assigned, pressed corner/nickel/dime changes his initial depth.
`fitPressStances` computes occupied depth intervals from every other teammate's
actual scattered body and chooses the nearest legal defensive-side depth on the
same lateral line. A teammate behind him can make the nearest stance forward;
the rule does not always move the defense deeper. Clear layouts stay exact.

The hook runs before the first history/World step. A called stem's replacement
starting presentation gets the same fit before its first history, while subsequent
pre-snap movement remains finite. Nothing repositions moving players at the snap.
No observation, random draw, coverage choice, force law or capacity changes.

## Pins and extraction

- Fetched/accepted base: `bb6d4c73948d53ba841dd9338dd240146c739f8c`.
- Base source: `668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`.
- Runtime implementation: `c2a08154199a0f7adb17105e4e86c5dac34a673c`.
- Final code/test candidate: `c574615d90943c9e839c506882989a1be6bc89eb`.
- Candidate source: `34375c7813ba221a589e50c63690f790958c9b8627431f6903a2526a1cb5b744`.
- Branch: `codex/press-front-stance`.

Extract only `src/playbook/alignment.ts`, `src/sim/playsim.ts`,
`test/press-front-stance.test.ts` and its small fixture. Diagnostics, reports and
receipts are evidence, not runtime dependencies. This starts on accepted
development and imports neither #94/#96 nor the older experimental stack.
Root reviewed both hooks and the interval rule before publication. The shared
alignment boundary was coordinated on #95 comment6210664704; coverage rules
remain with Catching.

## Mechanism and opposing controls

Twelve focused setup contracts cover the saved A002 geometry and mirror,
unchanged receiver/shade/press/front/radii, nearest forward departure when the
obstacle is behind, a second nearby backfield teammate, LOS legality, idempotence,
clear-layout identity and excluded roles. The production-hook test uses frozen
speed-gap players/seed71002, checks the first acquired picture, and proves the
idle front stays still on the first tick. Ten existing alignment checks and the
existing finite-stem/creep contracts pass: 24 distinct focused checks in all.
Typecheck passes. The finite-stem contract internally executes two ordinary
snaps; that cost is included, not omitted as a setup-only unit check.

The four standalone native executions reuse the original A002/A003 setups and
accepted flags, all 22 players reacting, cap2.80 seconds. No new roster, seed,
panel, full suite or game campaign. A003's entire initial state/plans/root RNG,
56 ticks of full bodies/physical commands/own objectives/contacts/loads/RNG,
events and capped PlayResult are exact.

A002 changes only NB's initial depth: x36.2→36.4472321603. His exact shade and
all other initial bodies/jobs/root RNG stay unchanged. DE/NB separation improves
.3017287996→.5481818182 yards, equal to combined radii. At t0 all commands match.
The old World nevertheless displaces DE x35.9→35.8776432927 and NB
x36.2→36.2290992063 while resolving their overlap (recorded impulse0). The
candidate leaves the two idle players exactly still. This is the demonstrated
mechanical improvement.

**The native football outcome is adverse.** RG's release moves1.30→1.15, but
Mike receives no recorded OL load versus ten sampled load ticks before. DE_S
earns a grasp at2.10 and tackle at2.70; candidate ends at2.75/−.86 yards while the
reference remains live/censored at2.80. Its partial `timeout` result is not a
finished zero-yard rush. Root RNG first diverges at.55 as changed physical access
alters native contact scheduling. The report does not attribute the final loss
solely to a deterministic block technique or claim that the earlier release helps.

## Cost, evidence and recommendation

Seven launcher receipts total **23.278350397 seconds**. The four standalone
native collectors total1.869111436 seconds within that total. Initial22 checks,
finite-stem1, typecheck, two native launchers, final12 changed setup checks and
the separate creep1 receipt are all retained. Every command passes; focused
name filters intentionally exclude unrelated tests and are visible in receipts.

The compact packet is `data/reviews/current/press-front-stance/`: comparison,
per-field full-precision hashes, startup stances, initial/root RNG, first-tick
commands/contact, actual Mike loads, all native events, original input identities
and seven launcher receipts. Its two compact inputs restore the original setups
exactly from the existing frozen `config/roster-screen.json` speed-gap lineup;
deep equality with the archived originals was checked without another simulation.
The four full raw tapes remain in ignored
`/workspace/press-front-stance/out/press-front-stance/{reference,candidate}`;
their hashes are published. They are not GitHub assets. Reproduction can regenerate
full tapes using the published diagnostic and compact inputs on each source pin:

```sh
npm run baseline:run -- --candidate --receipt out/press-stance-repro.json -- node --import tsx /path/to/evidence/scripts/diag/press-front-stance.mjs "$PWD" /path/to/evidence/data/reviews/current/press-front-stance/inputs out/press-stance-repro 2.8
```

Run from the pinned host root using Node22.23.3. The diagnostic reads existing
state only; it adds no perception queries, random draws or command changes.

**Recommendation: adopt the independently justified setup correction after
Integration's required review/combined verification.** Do not label it a run-game
benefit or breakthrough. A002's lost load/earlier defensive win stays visible;
the main stretch-contact footwork investigation is separate. Other formation
congestion, unpressed alignment and generic formation legalization are outside
this bounded change.
