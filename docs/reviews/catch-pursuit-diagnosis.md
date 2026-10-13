# Catch-to-pursuit diagnosis — 2026-10-13

**Current priority:** the user has asked to note and park the defensive
catch-awareness finding. No acquisition controller change is planned now.
The acquisition experiment below remains a recorded idea, not the active next
task. Current diagnosis concerns explosive YAC: arrival geometry, first loaded
contact, loss of control and subsequent pursuit on the unchanged baseline.

The focused follow-up is now in [coverage/contact/containment diagnosis](catch-chain-diagnosis.md):
nine exact native witnesses, 324 completed field/helper comparisons, loaded-joint
contrasts and a full-native helper request probe. Its report supersedes the
earlier broad next-step suggestion; no production candidate is promoted.

Diagnosis-first work on `codex/catch-pursuit-diagnosis`, based on the agreed
integration pin `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. The attached
handbook supplies hypotheses and historical evidence; the user's requested
diagnosis takes precedence over its suggested later implementation milestones.
No controller or physics change is planned in this pass.

## Inputs declared before film/results

Ordinary football: generated roster cohorts 3101 and 4202 (strength .55),
native game seeds 1001 and 2001 respectively. Draw 16 completed-pass snaps
uniformly without replacement from each game using the named sample stream
`catch-pursuit-20261013:COHORT`. Keep flagged plays and timeout/censored
catches separately labelled. Actual coordinator calls, fatigue, preferences,
audibles, and both learned scouting histories are captured before mutation.
Do not treat two fixed roster pairs as 32 independent talent samples.

Route lab: eight existing NFL-style concepts, each against an attack hypothesis
and a defense-favorable adverse control, two rosters, three fresh snap seeds
(701, 907, 1201), both call flips: 192 full-body snaps. The combinations,
formations and hypothesized conflicts are defined in
`scripts/diag/catch-pursuit-audit.ts`. These are diagnostic calls, not a native
coordinator cohort or proof of general NFL scheme superiority. Flipped calls
retain native field/slot behavior; they are not promised exact physical mirrors.
No invented route or universal scripted defensive win is installed.

## Recording contract

Reuse the `catch-contact-review.ts` saved-context protocol and existing full
ReplayTrace. Copy only cues consumed by controllers; wrap existing command
and World calls without introducing another observation, decision or draw.
Keep raw commands, commands after contact/spacing amendments, achieved motion,
body/strike impulses and solved grasp forces distinct. Restore an unobserved
copy of every traced input and compare full result, all bodies, final intents,
RNG and perception with the original context.

Pursuit aim and flight choice are explicitly labelled read-only reconstructions
from actual consumed cues and the pinned formulas. The private pursuit bias is
reconstructed from an independent named RNG stream; never draw from the real
controller's stream. A reconstructed intercept is not necessarily the final
blended near-contact movement command. Native tick boundaries provide 0.05 s
timing; do not invent sub-tick acquisition times.

Use `baseline:run` without flag overrides for every comparison. Preserve
the full 43-flag profile, World API defaults, source/collector/input hashes and
actual commits in receipts. `timeout` after the native 25-second cap is censored,
even though the engine builds a dead-ball result. No post-catch delay, capability
boost, grip change, prolonged-hold or ground-hold experiment is permitted here.

## Result: global acquisition is the demonstrated controller error

At a catch, `PlaySim.possess` calls `onBallCaught`, which replaces every
defender with `Pursuit`. Pursuit chooses `sim.carrier` directly, then asks for
that player's delayed motion. It does not acquire identity from those pictures.
This gives remote players the actual recipient before an acquired possession
cue. It changes free movement. **No production controller or physics changed;
the diagnosis does not establish a cause of the broad YAC tail.**

The remote integration branch still points to
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. Runtime SHA-256 is
`8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`.
Every simulation used Node 22.23.3, `baseline:run`, and the complete 43-flag
`run-game-2026-10-13` profile with **no overrides**. Full source/collector/input
hashes, actual commits, flags, commands and exit statuses are in the
[compact receipt](../../data/reviews/current/catch-pursuit-diagnosis.json).
Native collection and first panel ran at `c05adf1`; the identity probe and full
verification at `8bce526`; the receiver-validated bespoke call panel at `0ba4da5`.

All native and route inputs use baseline center hands, centered integration,
legacy support and adaptive stepping. The existing `coverage-contracts.ts`
fixture lab explicitly uses **fixed 12 substeps**. Its eight fixtures have zero
hard violations and seven inspection points; this does not grade their movement
or NFL realism. `src/`, tests, capacities, manifests, profile and launcher remain
unchanged. Shared controller files and World were not edited. The run-game
chat's PR #4 protection diagnosis was inspected read-only; coordination and
the proposed next boundary are recorded in the workboard.

## Native football, controls and causal probe

The fresh games contain 181 dropbacks and 99 completed passes. The uniform
sample has **32 catches: 24 tackles, seven touchdowns and one out-of-bounds
ending**, with one flagged play retained separately. All reach natural endings;
none is a timeout. Two fixed roster pairs are not 32 independent talent samples.
Two actual catchers differ from the intended target.

Full recording matches the original snap and an unobserved repeat for result,
all bodies, final intents, RNG and perception: **32/32 native and 8/8 selected
bespoke fixtures**. The bespoke trace selection retains five completions and
three incompletions. Wrappers copy actual consumed reads and cached rule state;
they do not introduce another observation or decision. Missing decision causes
remain unknown. Body facing is not eye gaze, and this engine does not provide
a full visual/occlusion acquisition channel.

There are **334 first-postcatch pursuit commands** with catcher pictures. All
334 consumed pictures still say `carrying: false`. Eight are from players over
ten yards away, with torso turned away and no recorded `onBall` tag, across
four plays and both roster cohorts. These are conservative witness selectors,
not proof of human gaze. Nearby players can sometimes infer a catch; the
unconditional handoff gives remote players the same true identity.

The clearest witness is **R3101-S1001-P65**:

| Boundary | Trace |
| --- | --- |
| Catch label 2.25 s | Actual RB `COM-RB3`; intended `COM-TE2`. |
| Prior job | CB_W `IRN-CB3` covered X. |
| Pursuit at 2.30 s | Actual catcher 16.72 yd away; torso cosine −0.50; no `onBall`; consumed .15/.35-second-old pictures say not carrying. |
| Baseline raw request | `(2.80, −8.15)` yd/s toward the globally identified RB. |
| Identity-only probe | Point only this controller's global carrier access at its prior X; leave real possession unchanged. Request becomes `(9.83, 2.46)` yd/s. |
| Achieved first step | Request difference 12.725 yd/s, velocity difference .421 yd/s, position difference .01052 yd. |

Five independent restored witnesses preserve identical prefixes. Plain/observed
controls match exactly. Three remote free-player probes change achieved movement.
Two near-contact controls change raw requests by 15.66/18.31 yd/s yet have
**identical achieved first movement**, because contact amendments/constraints
govern those steps. One is the explicitly retained flagged P78. A changed raw
command alone is not a football improvement.

The redirected identity is an intentionally invalid diagnostic alternative,
not a deployable acquisition policy. Each arm stops after one tick and remains
unfinished; none supplies a final gain or tackle verdict. The causal conclusion
is reliance on private global identity and its movement effect, not reduced YAC.

## Contact sequence and ordinary successful defense

**29/32** catches receive positive solved grasp load. The three without recorded
defensive impulse/load include two immediate scoring catches and one long escape.
This does not certify every earlier coverage request or every grasp. Earliest
coverage/window/arrival correctness remains a per-play question; it cannot be
deduced from final gain or from this acquisition diagnosis.

| Native case | Actual catcher / first loaded defender | Football sequence |
| --- | --- | --- |
| R3101-S1001-P58 | X `COM-WR2` / FS `IRN-S2` | Catch 2.55; wrap label 3.00; positive grasp at step end 3.10, force 1344.65 and arm impulse 29.48; slip/break label 3.15; 38.60 YAC TD. Nearest-at-catch was a different CB_W. |
| R3101-S1001-P173 | X `IRN-WR2` / FS `COM-CB3` | Catch 3.65; positive grasp at 4.70, force 489.59 and arm impulse 24.48; break label 4.80; 76.25 YAC TD. Its nearest CB_W changed from ball arrival to receiver-window drive before the catch. |
| R3101-S1001-P111 | Y `COM-TE2` / CB_W `IRN-CB3` | Lunge-behind grasp has positive load while tackler is falling, then breaks; 65.47-YAC TD. A costly last reach is not automatically a bad decision. |
| R4202-S2001-P95 | H `IRN-WR1` / LB_M `COM-LB3` | Near in-phase catch, loaded grasp at 4.55; ordinary 3.58-YAC tackle. Preserve against blanket delay policies. |
| R4202-S2001-P67 | X `COM-WR2` / CB_W `IRN-CB1` | Positive grasp at 4.80; tackle label 5.35; zero official YAC. Achieved body travel after contact is not official forward progress. |

The [saved-path figure](../../out/catch-pursuit/contact-control-film.svg) shows
the actual catcher, nearest defender and distinct loaded defender. Its viewport
is catch −0.6 to +2 s; the reported full outcomes come from complete traces.
Catch occurs after World, and a new grasp loads on a later solve. Times above
are **0.05-second step-end observations**, not sub-tick onset. Grasp force is
the end-of-step resultant; arm impulse separately records delivered load.
These cases support a physics handoff, not stronger grips or a claim that the
known angular defect caused these particular escapes.

## Nasty route combinations and adverse calls

The second panel constructs four **lab-only** call objects from installed routes:

- **Mills:** #1 post over #2 dig, #3 shallow outlet, backside vertical. Stress
  #2 responsibility versus the outside post's roof.
- **Yankee:** post, deep over and flat outlet. Stress the middle roof and
  underneath handoff; no artificial play-action cue is inserted.
- **Mesh-rail:** opposing strong/weak #2 shallow crossers, outside vertical
  clears and an RB wheel. Stress man traffic and flat-to-vertical
  redistribution; no scripted pick.
- **Texas-seam:** seam clear, back angle and replacement dig. Stress Tampa
  Mike's depth responsibility and underneath inside leverage.

[Route drawings](../../out/catch-pursuit/route-conflicts.svg) are schematics,
not achieved player paths. These use fresh rosters 8081/9092 and seeds
4049/5051/6067, both flips and two coverages: **96 snaps**, in addition to the
192 installed-concept snaps. Native QB choices, protection and physical limits
remain active; no receiver is forced to catch. Flips are not exact physical
mirrors. Initial rail prototypes had parallel unders or referenced weak #2
from a trips formation where that eligible did not exist. Their source,
manifests and outputs remain `custom-parallel-under*` and
`custom-trips-under-prototype*`. The final doubles call has actual S2/W2
crossers and an RB wheel; all declared routes/progression references are now
validated against installed numbering before simulation. All 96 final inputs
were rerun. Prototype results are not pooled as extra evidence.

Each cell below has 12 snaps. Catches/throws exclude sacks/scrambles from the
throw denominator. Mean is native **offense yards per snap**, retaining flagged
snaps; clean-only cells, flags and every input signature are in the receipt.
No primary panel snap is censored.

| Combo | Effective attack coverage: catches/throws; mean gain | Effective adverse coverage: catches/throws; mean gain |
| --- | --- | --- |
| Mills | Quarters **Poach**: 5/12; 24.67 yd | 2-Man: 7/12; 9.13 yd |
| Yankee | Cover 3: 5/9; 5.11 yd | Quarters Poach: 9/12; 44.14 yd |
| Mesh-rail | Cover 1: 7/12; 10.71 yd | **Palms**: 7/12; 5.99 yd |
| Texas-seam | Tampa 2: 11/12; 14.06 yd | Cover 1 Robber: 8/12; 2.51 yd |

Native trips checks changed requested Quarters to Poach; the earlier trips
rail prototype also changed Palms to Stubbie. The final doubles rail call
retains actual Palms. Mills has fewer completions but four offensive TDs against Poach versus
none against 2-Man. The selected offensive win catches the outside receiver
at speed; the selected 2-Man control instead catches the back and tackles him
immediately. These are different actual targets and catch states.

Texas-seam, the valid mesh-rail and static-hitch controls follow the expected
direction. **Yankee reverses the presumed defensive-control advantage**;
preserve those adverse results before claiming a scheme failure. The installed
panel also gives useful counterexamples: Mesh gains 2.30 yd/snap against Cover 1
versus 4.28 against 3-Match; Flood is 17.70 versus 17.22 against 3/Stubbie.
Levels has seven catches in twelve throws in both arms but gains 14.05 against
trips Mable versus 3.70 against Robber. Hitches gains 6.48 against 3 versus 2.53
against press 1 (10/12 versus 7/12). Smash has only five/six throws in twelve
snaps; QB/scramble selection confounds a simple scheme grade.

These small panels are not NFL rankings. A completion can be a good defensive
play, a void can be a legitimate overload, and fewer completions can coexist
with severe escapes. No final YAC value or `beats` tag proves the mechanism.

## Explosive YAC: the current working diagnosis

The strongest current football pattern is **marginal arrival followed by failed
containment**. A nearby defender does not necessarily have the angle, matched
motion or support to control a running receiver. In the explosive cases the
first loaded tackle is usually a reach/lunge from behind, and a brief real
hold often breaks. Recovery is too late to prevent the gain becoming explosive.
The awareness finding is parked and has not been shown to cause this pattern.

This follow-up reuses the same unchanged-source recordings and original uniform
32-catch draw; there is no new simulation, resampling or candidate. All eight
20+ YAC catches are clean and have natural endings. The compact receipt's
`explosiveYacFollowup` pins the operator, identities and individual splits.

| Observation | Eight 20+ YAC catches | Other 24 catches, including the one flagged control |
| --- | ---: | ---: |
| First positively loaded grasp recorded | 7 | 22 |
| Rear origin among those first grasps | 7/7 | 11/22 |
| Reach/lunge origin among those first grasps | 6/7 | 5/22 |
| Plays with a recorded broken tackle | 5/8 | 0/24 |
| Median catch to first loaded boundary | 1.70 s | 0.78 s |
| Median nearest-defender distance at catch | 3.84 yd | 2.04 yd |

Among the seven loaded explosives, approximately **83% of their combined
recorded YAC remains after the first loaded-grasp boundary** (257.9 of 312.1 yd).
This is a 20 Hz displacement split, not a causal percentage: the approach
establishes the poor grip geometry, and later controller choices, support,
contact execution and other players can all affect subsequent yards. It does
not mean physics is responsible for 83% of the problem.

| Native explosive | YAC | Estimated gain at first loaded boundary | Remaining recorded YAC |
| --- | ---: | ---: | ---: |
| R3101-S1001-P173 | 76.2 | 1.8 | 74.5 |
| R3101-S1001-P58 | 38.6 | 1.9 | 36.7 |
| R3101-S1001-P143 | 22.4 | 10.8 | 11.7 |
| R3101-S1001-P87 | 34.0 | 4.1 | 29.9 |
| R3101-S1001-P111 | 65.5 | 4.5 | 60.9 |
| R4202-S2001-P121 | 27.3 | 20.6 | 6.7 |
| R4202-S2001-P156 | 48.0 | 10.5 | 37.5 |
| R4202-S2001-P86 | 50.5 | No loaded grasp | No loaded grasp |

P173/P58 are particularly consequential: the first loaded grasp occurs within
about two yards of the catch, slips, and leaves most of the eventual gain ahead.
P121 demonstrates a different path: about 21 of its 27 yards occur before the
first loaded grip. P86 receives no recorded loaded grasp. Thus both arrival
and contact survival matter; an aggregate YAC figure cannot choose a repair.

Ordinary controls also contain successful rear tackles. Do not forbid rear
approaches, force every receiver to slow, increase grip strength or award a
tackle for proximity. The remaining causal question is **why the first approach
becomes marginal, and why that real loaded contact fails to contain the runner**.
The initial arrival request, achieved approach and first loaded interval must
be isolated against successful same-geometry controls before choosing a
controller correction or sending a contact-law correction to the physics owner.
The sample identifies the recurring football failure; it does not yet identify
one code defect explaining the engine-wide explosive rate.

## Recorded acquisition experiment — parked by the user

Coordinate one acquisition-boundary experiment with the run-game owner before
editing `assign.ts`/shared pursuit. Keep both native recipient mismatches,
the three remote witnesses, ordinary in-phase P95/P67, flagged P78, and
incomplete/turnover route controls. Hold original inputs, flags, World and RNG fixed.

Replace global identity selection with a bounded per-defender acquisition path
while retaining ongoing receiver/ball-window tracking and physical near-contact
actions. Separate earned near-catch inference, delayed `carrying` observation
and any explicitly implemented communication source. Do not freeze every
defender for a timer or give him the intended target. Falsify the proposal with
remote redirection without acquired evidence and lost ordinary in-phase contact.
Compare raw, amended and achieved movement; a cleaner request alone is insufficient.

Before a full-play controller trial, give the physics owner a same-prefix
loaded P58/P173 World witness with all existing joints/loads. Do not substitute
identity redirection, stronger grips, or another hold experiment for contact-law
diagnosis. Native inputs here reached their endings; one-tick probes remain
explicitly censored, and later full-play trials must retain unfinished outcomes.

**Football behavior improved: none changed. Production regressions: no candidate
introduced. Integration: diagnostics are reviewable; there is no controller
candidate ready for integration.** Coverage/flight hypotheses and loaded-slip
causes remain distinct from the demonstrated acquisition dependency.

151 focused recording/coverage/catch/pursuit checks passed. Complete verification
at `8bce526` passed **1,652 TS tests in 136 files, 145 Python checks, typecheck and
build**, with no worker errors. Later changes are diagnostic call construction,
saved-only reporting and figures; engine and existing tests remain unchanged.

## Reproduce from the existing checkout

Use this branch and Node 22.23.3; no worktree or raw NFL data is required.
The following commands were executed through the baseline launcher:

```sh
export PATH=/workspace/.football-tools/node-v22.23.3-linux-x64/bin:$PATH
npm ci --no-audit --no-fund
npm run baseline:info
npm run baseline:run -- -- node --import tsx scripts/diag/catch-pursuit-audit.ts native out/catch-pursuit/native3101.json 3101 1001
npm run baseline:run -- -- node --import tsx scripts/diag/catch-pursuit-audit.ts native out/catch-pursuit/native4202.json 4202 2001
npm run baseline:run -- -- node --import tsx scripts/diag/catch-pursuit-audit.ts trace out/catch-pursuit/native3101.json out/catch-pursuit/trace3101.json.gz
npm run baseline:run -- -- node --import tsx scripts/diag/catch-pursuit-audit.ts trace out/catch-pursuit/native4202.json out/catch-pursuit/trace4202.json.gz
npm run baseline:run -- -- node --import tsx scripts/diag/catch-pursuit-audit.ts panel out/catch-pursuit/panel.json
npm run baseline:run -- -- node --import tsx scripts/diag/route-conflict-lab.ts out/catch-pursuit/custom.json
npm run baseline:run -- -- node --import tsx scripts/diag/catch-acquisition-witness.ts out/catch-pursuit/acquisition.json
```

Retain the first declared roster 8081, seed 4049, unflipped input per bespoke
call/coverage in `custom-selected.json`, including incompletions, then:

```sh
python3 - <<'PY'
import json
from pathlib import Path
root = Path('out/catch-pursuit')
packet = json.loads((root / 'custom.json').read_text())
packet['clips'] = [c for c in packet['clips'] if c['input']['roster'] == 8081
                   and c['input']['seed'] == 4049 and c['input']['flip'] is False]
packet['selection'] = 'First declared roster/seed/unflipped per custom call/coverage, all eight outcomes retained; mechanism witnesses, not a random frequency sample.'
(root / 'custom-selected.json').write_text(json.dumps(packet))
PY
npm run baseline:run -- -- node --import tsx scripts/diag/catch-pursuit-audit.ts trace out/catch-pursuit/custom-selected.json out/catch-pursuit/custom-trace.json.gz
python3 scripts/diag/catch-pursuit-figures.py
python3 scripts/diag/catch-pursuit-report.py
```

Figures need Matplotlib; collectors/tests do not. Raw contexts/traces, figures
and logs stay in ignored `out/catch-pursuit/`; source and compact evidence are
committed. Regeneration records the new actual checkout/harness rather than
pretending to run at an earlier diagnostic commit. Preserve prior packets
before overwriting comparisons.

## Complete native case matrix

The JSON additionally preserves nearest-at-catch identity, installed role,
cached declarations, cue ages, reconstructed selection and contact endpoints.
First approach means the first recorded tackle attempt on the actual catcher,
with a labelled nearest-at-catch fallback when none was recorded.

| Native clip | Catcher | First approaching defender | YAC | End | First solved contact |
| --- | --- | --- | ---: | --- | --- |
| R3101-S1001-P65 | RB `COM-RB3` | LB_M `IRN-LB2` | 15.21 | tackle | LB_M loaded-grasp at 4.20s |
| R3101-S1001-P173 | X `IRN-WR2` | FS `COM-CB3` | 76.25 | touchdown | FS loaded-grasp at 4.70s |
| R3101-S1001-P56 | Y `COM-TE2` | CB_S `IRN-CB2` | 2.48 | tackle | CB_S loaded-grasp at 3.10s |
| R3101-S1001-P163 | H `IRN-WR3` | NB `COM-S2` | 0.47 | tackle | NB loaded-grasp at 3.35s |
| R3101-S1001-P19 | H `COM-WR3` | CB_W `IRN-CB3` | 7.45 | tackle | CB_W loaded-grasp at 4.00s |
| R3101-S1001-P14 | RB `IRN-RB2` | LB_W `COM-LB2` | 1.96 | tackle | LB_W loaded-grasp at 3.60s |
| R3101-S1001-P58 | X `COM-WR2` | FS `IRN-S2` | 38.60 | touchdown | FS loaded-grasp at 3.10s |
| R3101-S1001-P7 | H `COM-TE1` | FS `IRN-S2` | 16.03 | tackle | FS loaded-grasp at 5.30s |
| R3101-S1001-P8 | H `COM-TE1` | SS `IRN-LB1` | 6.91 | tackle | SS loaded-grasp at 3.50s |
| R3101-S1001-P143 | X `IRN-WR2` | SS `COM-LB1` | 22.42 | tackle | CB_W loaded-grasp at 4.90s |
| R3101-S1001-P131 | Y `IRN-TE2` | LB_W `COM-LB2` | 1.03 | tackle | LB_W loaded-grasp at 4.20s |
| R3101-S1001-P106 | H `IRN-WR5` | LB_M `COM-LB3` | 5.51 | tackle | LB_M loaded-grasp at 4.30s |
| R3101-S1001-P87 | RB `COM-RB3` | LB_W `IRN-LB3` | 34.03 | tackle | LB_W loaded-grasp at 4.05s |
| R3101-S1001-P102 | Y `IRN-TE2` | LB_M `COM-LB3` | 3.34 | tackle | LB_M loaded-grasp at 3.90s |
| R3101-S1001-P103 | H `IRN-WR3` | FS `COM-CB3` | 8.02 | tackle | FS loaded-grasp at 4.05s |
| R3101-S1001-P111 | Y `COM-TE2` | CB_W `IRN-CB3` | 65.47 | touchdown | CB_W loaded-grasp at 4.30s |
| R4202-S2001-P95 | H `IRN-WR1` | LB_M `COM-LB3` | 3.58 | tackle | LB_M loaded-grasp at 4.55s |
| R4202-S2001-P121 | Y `IRN-TE1` | CB_S `COM-CB3` | 27.28 | tackle | CB_S loaded-grasp at 7.30s |
| R4202-S2001-P176 | Y `IRN-TE1` | LB_M `COM-LB3` | -0.83 | tackle | LB_M loaded-grasp at 3.80s |
| R4202-S2001-P60 | Y `COM-TE1` | SS `IRN-S2` | 3.19 | touchdown | None recorded |
| R4202-S2001-P115 | X `COM-WR2` | CB_W `IRN-CB1` | 3.90 | tackle | CB_W loaded-grasp at 3.20s |
| R4202-S2001-P23 | RB `IRN-RB1` | LB_M `COM-LB3` | 7.83 | tackle | LB_S loaded-grasp at 4.55s |
| R4202-S2001-P145 | H `IRN-TE2` | CB_S `COM-CB3` | 13.13 | oob | CB_S loaded-grasp at 5.35s |
| R4202-S2001-P156 | Y `COM-TE1` | FS `IRN-S2` | 48.02 | tackle | FS loaded-grasp at 6.10s |
| R4202-S2001-P74 | Y `COM-TE1` | SS `IRN-S2` | 1.70 | touchdown | SS loaded-grasp at 4.00s |
| R4202-S2001-P118 | H `COM-WR3` | NB `IRN-S1` | -0.33 | touchdown | None recorded |
| R4202-S2001-P86 | Z `IRN-WR6` | SS `COM-LB2` | 50.49 | touchdown | None recorded |
| R4202-S2001-P78 | Z `IRN-WR6` | CB_S `COM-CB3` | 3.12 | tackle (flagged) | CB_S loaded-grasp at 3.30s |
| R4202-S2001-P112 | RB `COM-RB1` | LB_W `IRN-LB2` | 2.78 | tackle | LB_W loaded-grasp at 3.40s |
| R4202-S2001-P91 | H `COM-WR3` | SS `IRN-CB3` | 0.67 | tackle | SS loaded-grasp at 2.90s |
| R4202-S2001-P67 | X `COM-WR2` | CB_W `IRN-CB1` | 0.00 | tackle | CB_W loaded-grasp at 4.80s |
| R4202-S2001-P142 | Y `IRN-TE1` | LB_W `COM-LB4` | 0.30 | tackle | LB_W loaded-grasp at 4.05s |
