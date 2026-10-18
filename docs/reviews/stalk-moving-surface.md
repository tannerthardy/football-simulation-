# Perimeter blockers can actually meet a closing corner

The repeated error was the receiver's free approach. An assigned corner could
trigger downhill, pass underneath the receiver and tackle the runner without
ever being blocked. The receiver followed laterally because his movement target
was stationary and clamped so it could never ask him to move back downhill.
This was a failure to reach useful contact, not evidence of weak hands.

The candidate uses the corner's acquired position **and velocity** to approach
the near side of his body with the existing moving-arrival law. It applies only
to the exact perimeter defender installed for that stalk. Interior H/backer work
keeps its existing acquired approach. Four original corner witnesses and both
fresh corner-threat witnesses now produce real loaded contact. One corner still
escapes and tackles; interior defeats remain. This supports independent review
of the bounded correction, not a claim that run blocking is solved.

Code `265c40e8434d3c243fb0e0a78dec2bc429eebb73`; runtime
`d50530adb83384baa0cfc4b82caa08f0c269a20eb813048d2a33fde54a7ec3ac`.
Accepted develop `914f4d56a3b7ef2845ff0208f55d626c0ff5f880`; canonical queue
`e8d806b940a84c7cff7e5ee066022079723c78ef`. Both were fetched again unchanged
at publication. Accepted runtime is source5b710a1b, unchanged from0000e560.
The recorded enclosing HEAD914f4d5 is the base of the precommit worktree;
the receipt's source/validation hashes identify the tested code and tests.

## Discovery and the rejected explanations

The user authorized broader investigation of visibly poor blocking. A fixed
28-input discovery used generated ordinary rosters741/742, strength.55,
play seeds900–927, Cover3, Over/Under, Ace11/Ace12, mirrored directions, six
IZ/OZ/WZ calls and Duo/Power/Counter/Trap controls. All22 players continued
natively for up to5s:27 natural endings and one live prefix. This is a diagnostic
matrix, not a frequency-matched sample of football or an NFL comparison.

The first hypothesis was that installed zone travel prevented useful recovery.
None of the screened defenders who passed laterally away from their assigned
blocker was the first defender to contact the runner. Backside defenders can
legitimately be outflanked. That screen did not justify changing zoneFlow.
Its reducer initially inferred strength from flip; it was corrected to use the
actual installed drive, without rerunning a simulation.

Tracing the actual first tacklers instead found Z03/Z12/Z16/Z27 corner arrivals
with assigned X/Z stalks and no prior acquisition. The old fit was
`x=max(defender.x-1.2, blocker.x), y=defender.y`, with no defender velocity.
Even after a corner got underneath, that objective could request zero forward
motion but never a downhill correction. Both the assignment and the ordinary
perception buffer already existed; the approach failed to use them well.

Two broader replacements were rejected. Moving toward the defender's center
lost useful near-side leverage for H/backer work. Moving toward a near surface
for every stalk improved the corners but still lost useful fresh H/backer
access. The final correction distinguishes the **installed duty**, rather than
identifying jobs from a roster position or a later private behavior.

## Information, objective, request and achievement

The candidate separately reuses the exact small information correction from
open [#29](https://github.com/tannerthardy/football-simulation-/pull/29), pinned
`b8e4d86866a9880c59e2e3f0809114b7667c058b`: far movement reads `sim.see`, rather
than hidden live target coordinates. Only its tiny production extraction and
exact seven-test/helper/witness files are reused. No old diagnostic branch is
merged. The position-only arm is measured separately from the movement change.

At snap installation, the existing alignment-based `db` classification tags the
exact assigned perimeter target. That immutable target identity enables the
moving near-surface approach; a later retarget cannot accidentally inherit it.
The near surface is the observed center offset toward the blocker's installed
entry side by the existing body radii plus.15yd. The existing moving-arrival
machinery uses the delivered velocity and the blocker's own support availability,
braking and inertia. Its speed limit remains.85 of the same player profile.
The picture is already projected by perception; age is not added a second time.

For example, in Z16 at2.00s the acquired corner picture is approximately
y42.517, vy−2.865, age.25s. The position-only receiver is at y43.615, vy−2.907,
requesting vx.244/vy−3.450. The candidate is at y42.598, vy−3.394, requesting
vx1.829/vy−3.579. He has achieved the lateral alignment needed to enter the block
instead of merely requesting it. The first loaded sample is2.20s; its hands
report normal422.526/tangent−47.587. These are recorded force samples, not a
force integral or an invented catch-up teleport.

Far movement never reads the runner's private future or the target's live
velocity. The existing physical acquisition test still checks same-time bodily
distance and calls the unchanged `engage` before any far-movement query.
Contact eligibility, execution, hand laws, drive after contact, release,
capacities, global speed/braking, shared spacing/modifiers and physics are
unchanged. This does not certify every other target-availability consumer.

## Native football evidence

Each comparison below uses the exact same frozen setup and play seed. The
reference is **accepted plus the position-only #29 extraction**, separating
information repair from policy. Actor IDs, full consumed cues, plans, raw/final
requests, achieved bodies, physical reports, events and RNG states are retained
in the [summary and artifact manifest](../../data/reviews/current/stalk-moving-surface/bundle.json).

“Load” intervals are contiguous end-of-tick engagement samples labeled with tick
start; exact block events usually occur.05s later. Break/reacquisition gaps are
retained in the summary. No interval is a claim that a loaded hold is physically
ideal. Contacts and later execution can change the RNG stream, so final yardage
is contextual evidence rather than an isolated policy effect.

| Input / actual assigned pair | Reference load | Candidate load | First runner contact, reference → candidate | Completed gain, reference → candidate |
| --- | --- | --- | --- | --- |
| Z03 OZ, Z/CB_S | none |2.20–3.15| CB_S3.70 → Sam4.10 |.60 →2.27|
| Z12 WZ, X/CB_W | none |2.00–3.40| DE_W2.30 → DE_W2.40 |−1.05 →−.91|
| Z16 OZ, Z/CB_W | none |2.20–4.05| CB_W3.35 → FS3.55 |5.72 →7.26|
| Z27 Counter, X/CB_W | none |2.10–2.80| CB_W3.80 → CB_W4.00 |2.79 →3.40|
| Z08 IZ, H/Will | first2.20 | first2.20 | DT_W2.60 → DT_W2.60 |4.55 →4.53|
| Z26 Power, H/Will | first2.25 | first2.25 | Mike3.40 → Mike3.40 |live5s →4.66|
| Z28 Trap, H/Will |1.85–1.90;2.65–3.45| same intervals | Sam2.80 → FS4.00 |−.74 →live5s|

The corner in Z27 legitimately works free and still makes the tackle. Z12's
interior loss remains despite real perimeter contact. Z03's corner is delayed
without being held continuously through the runner's original arrival time.
The successful inside H first-load times survive; Z08's ordinary defensive
finish survives. Z28's changed ending is visibly retained as an unresolved
live prefix, not counted as an offensive success.

The information-only extraction itself has a material adverse comparison:
accepted Z12 gains7.23 with CB_W first contact3.45, whereas position-only Z12
loses1.05 with DE_W first contact2.30. This is not hidden inside the final
candidate's delta. Accepted/picture/native/prototype sources and outcomes all
remain independently reproducible. Other accepted→picture differences include
Z08 gains5.61→4.55 and Z26 changing from a completed4.60 to a live5s prefix.

Four fresh inputs were fixed before their outcomes using independent generated
rosters845/846 and seeds1001–1004. They include a reflected OZ, another OZ
interior-defeat control, Counter and Power/H-back help. The broad surface
prototype was also run on them, providing the adverse reason to retain the
installed perimeter boundary.

| Fresh input | What the final candidate does | Remaining finish/adverse evidence |
| --- | --- | --- |
| F01 reflected OZ, Z/CB_S | no load →1.95–4.40 | first CB_S3.45 → FS3.75; gain4.26→4.21; H loses Will contact |
| F02 OZ, LG/DT_W control | same interior load.50–2.30; perimeter also acquires | DT_W first contact2.30 preserved; loss−1.23→−1.18 |
| F03 Counter, X/CB_W | no load →2.20–2.75 | first CB_W3.60 → FS3.70; gain3.30→4.59 |
| F04 Power, H/Will control | exact first interval2.30–3.40 preserved | FS finish remains; reference live5s, candidate completed5.10 |

All fresh candidate cases have zero offensive teammate body impulses. Existing
Z03 RT/Y traffic remains in both arms; it is not repaired here. The two fresh
corner witnesses reproduce the **contact mechanism**; four fresh inputs do not
establish distribution-wide balance or complete run-scheme correctness.

First full-unit raw-request differences occur at.05s. First RNG differences
against the position-only reference occur at new interaction opportunities:
Z03 2.15, Z12 2.00, Z16 2.20, Z27 2.10, F01 1.95, F03 2.20s. The saved achieved
approaches before those draws are the strongest causal evidence. Final tackle
time and gain can also reflect later execution differences.

## A separate remaining dumb decision: F01 help continuity

The H/Will first load disappears in final F01, despite retaining the ordinary
inside movement policy. At2.25s C momentarily engages Will and loses him in
the same tick. H's target-availability logic reads that private live engagement
and drops Will without an acquired handoff. His prior consumed picture was at
2.20s. A same-tick shed event preserves the fleeting C/Will interaction even
though it is absent from the end-of-tick engagement snapshot.

An isolated continuity-only arm and a composed perimeter+continuity arm retained
the named H job across that fleeting engagement. Both were checked on F01 and
Z08/Z12/Z27. Retaining H's target **did not restore his Will load** in composed
F01. The private job drop is a real information/responsibility defect, but is
not a sufficient explanation of failed collection. Neither diagnostic patch is
included in the production candidate. The next useful owner question is the
remaining achieved H/Will collection geometry in that retained-target encounter,
not another automatic handoff timer or stronger grip.

## Verification, costs and handoff

**38 focused checks pass; typecheck passes.** Focused coverage includes installed
perimeter identity, interior/retargeted legacy behavior, hidden-motion invariance,
acquired-motion response, reflection, no extra age extrapolation, bounded request
versus inertial achievement, existing real physical acquisition, and the opposing
#29/stalk-ledger/run-base contracts. The initial focused failure was a new test
incorrectly forbidding the defender's legitimate key read during contact. Its
assertion now forbids the stalker's unnecessary far-movement query while still
requiring actual physical acquisition. That failed receipt is preserved.

Native evidence:76 individual continuations,36.002304 collector seconds,
70 natural endings and six5s censors across all arms. Discovery28; position-only7;
moving-center7; broad-surface7; fresh position-only4/broad-surface4; final
perimeter11; continuity-only4/composed4. These are repeated causal inputs, not
76 independent football samples. Final focused launcher2.504s; typecheck10.324s.
No full games/full-suite/ratings campaign. Integration owns exact combined
verification. Node22.23.3,44 recorded flags, RUN_CONTACT_COMPONENTS=1, CF_FLOW
unset and unchanged World defaults; every successful launch and tape records
its actual source, inputs, flags and costs.

[Data-only evidence15f5113](https://github.com/tannerthardy/football-simulation-/tree/15f5113709450363f3dbc744753cbc87b422e6f3)
contains all tapes, frozen setups, hashes, source patches, collectors, reductions,
six film plates and adverse/failure receipts. Seven archives total101,378,490
bytes, each below32MiB; every extracted payload was rehashed and checked for safe
regular-file paths. Do not merge the data branch. See its REPRODUCE.md for reuse
and optional exact replay; rounded film is never an exact simulator checkpoint.

Run should review the installed-duty split and near-side fit against #137's
assignment work and #146's independent Counter work. Their publication pins
remain cdaeff43/08cf673 respectively. This changes no assignment counts, puller
routes, shared modifiers or owned Physics. #29's information-only extraction is
an explicit independently measured prerequisite; #147's free-work picture,
#138's block lifecycle, held runoff/contact-frame trials and the failed F01
continuity variants remain separate. Ready for independent controller review;
not merged or certified as the combined integration candidate.
