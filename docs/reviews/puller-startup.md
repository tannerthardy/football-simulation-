# Puller start-up: bounded propulsion trial, native transfer held

**HOLD for adoption.** A moderate target speed currently requests a gentle
start as well as a low eventual speed. An explicit full-propulsion request
can separate those actions within existing capacities. The tested puller
caller is not a safe unblock for `FB_TRACK` or `OL_ALIGN`.

Accepted base: `f4146275ce7539816bf57b4ed55a0d2be10e48c7`; canonical queue
`9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`. Claude's reviewed Part7 source is
`bdadfedb77ed5d12c77cf8797ea342847a8a9700`. No research parent is imported.
[Compact settings, inputs, successes, failures and selected kick ledger](../../data/reviews/current/puller-startup.json).

## Cause and proposed change

The ordinary gait intentionally accelerates toward a moderate speed on the
sprint time constant. A guard in the saved input requests 2.65 yd/s and
reaches only **0.929 yd/s after 0.5 s**, in empty space with intact support.
The same body reaches **2.354 yd/s** when requesting top speed. That difference
does not demonstrate inadequate strength or traction: the model already has
the capacity. It demonstrates a missing distinction in the request interface.

`MoveCommand.propulsion = 'full'` requests available propulsion toward the
existing bounded speed target. The drive/cutting ellipse, fatigue, facing,
traction, contact and support limits still execute that action. Braking is
unchanged. Unspecified commands keep the old moderate-speed easing; this is
not `GAIT_STEP` activation. The 2.65-yd/s explicit request reaches the same
2.354 yd/s at 0.5 s without exceeding its eventual target. It costs more
energy; ordinary World and `stepBody` effort accounting agree.

The API/helper change is independently extractable at `f62527c`. The proposed
caller at `9606280` requests it only for the initial pull waypoint. It changes
ordinary puller behavior **if merged**, so keep this draft held. All registered
flag values and accepted production behavior remain unmodified.

## Native evidence and adverse cases

These are fixed inputs, not an outcome-selected sample or a game campaign.
Every prefix is bounded at four live seconds; a live play has no reported final
gain. Formation `flip` variants are not exact geometric mirrors. Pure mechanical
mirrors are tested separately.

| Accepted-base input | Actual lateral 1.5 yd/s, old → first-step trial | Result at/before 4 s, old → trial |
| --- | --- | --- |
| Default weak counter, pair31, seed1, RT / RG | 1.05 → 0.85 s / 0.85 → 0.75 s | 1.92-yd tackle → −1.77-yd tackle |
| Same counter, formation flipped | Same timing improvement | 2.04-yd tackle → live/censored |
| I-power, pair11, seed77, LG | 0.80 → 0.65 s | Both live/censored |
| I-power, formation flipped, RG | 0.75 → 0.65 s | Both live/censored |
| Fresh I-trap, pair31, seed71009 | 0.95 → 0.95 s | Exact state identity, −0.24-yd tackle |
| Inside-zone drive control | No puller request | Exact state identity, 3.91-yd tackle |

An earlier, broader caller applied full propulsion on the first **two** legs.
It improved lateral timing more but regressed counter and both power controls;
one counter kick never acquired its defender. Preserve that rejection. The
first-step revision restores the existing wrapper-command contract but retains
the counter adverse above. No third gain/phase adjustment was attempted.

To answer the actual dependency question, the same small correction was applied
to a saved source extraction of Claude's Part7, with its existing mesh package
`UC_MESH MESH_TEMPO QB_CARRYOUT PACE_LEAD`, then `FB_TRACK` and `OL_ALIGN`
**separately**. Two inputs: the published strong-counter/ace12/over2/pair31/1
family and the I-power control. All other settings are in the receipt.

- **FB_TRACK:** the counter kick loads at 2.20 rather than 2.25 s, but loses
  useful shoulder position later. Both baseline plays are still live at 4 s;
  the candidate finishes in 0.69- and 0.78-yd tackles. Do not turn their baseline
  censored positions into final gains or call this a football benefit.
- **OL_ALIGN:** both complete state hashes are identical, including the
  strong-counter −0.54-yd loss. Its deeper stance skips the first waypoint
  before this request executes. This trial cannot repair its kick-out shed.

The strong-counter ledger shows the remaining question. With FB_TRACK and the
trial, the blocker starts inside his end at 2.20 s; by 2.50 s his y is 22.50
versus the defender's 23.00, and by 2.80 s he is upfield/outside at (39.81,21.87)
while the defender is (39.42,22.70), toward the runner at (38.70,24.55).
The hands still carry load. First runner contact from that end is 3.05 s;
the later log/end does not identify the first positioning error. This narrows
the contact/fit question; it does not prove either a bad law or a legitimate win.
Do not increase acceleration or grip strength to conceal that distinction.

## Measurement and verification limits

The existing NFL displacement results are useful context, reused without a new
NFL scan. One claimed timing needs correction: Claude's
`scripts/diag/stretch/pullers.py` tests **total speed ≥1.5 yd/s plus a positive
lateral sign**, not lateral speed ≥1.5. Its selected lateral-displacement
survivors also cannot establish maximum effort. The new native diagnostic
records the actual lateral velocity component. Its times must not be fitted
directly to that mislabeled NFL threshold.

**94 distinct focused contracts pass across compatible runs:** 88 preserved
contracts plus 6 new ones. This includes ordinary sprint/braking/cuts, real
mirrors, unchanged profile/fatigue limits, World forecast agreement, exactly-once
energy, and blocked-contact ground/energy accounting. Typecheck passes. No
existing assertion was weakened. Earlier compile/test-fixture mistakes and the
broader caller's failed wrapper assertion remain classified in the receipt.

26 native prefixes across the three accepted-base arms and two paired research
contexts cost 23.32 s of instrumented collection; one initial 1.2-s puller probe
is separate. This is not an uninstrumented performance benchmark. No full suite,
new games, roster campaign, contact solver, recovery law or capacity calibration.
Integration owns combined verification only after independent acceptance.

Reproduce the accepted-base prefix on Node 22.23.3:

```sh
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx scripts/diag/puller-startup.ts out/puller-startup/current.json
```

For the strong-counter context, use `--case counter-default,power-control
--direction strong --engine PATH` with the receipt's Part7 source and resolved
settings. Build the host with `git archive`, not by moving another checkout.
Apply only the three runtime-file diff from accepted develop to `9606280` for
the candidate host. Full generated traces stay ignored; the collector, exact
inputs/settings and selected causal ledger are shared.

**Next decision:** Run and Physics should review that strong-counter kick's
first shoulder exchange through runner arrival. Establish whether its fit
request is adequate before attributing the later loss to physical execution.
The optional actuator API and the held first-step caller need separate review;
neither establishes NFL calibration or clears the existing mechanical holds.
