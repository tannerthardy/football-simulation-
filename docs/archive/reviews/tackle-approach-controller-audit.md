# Tackle approach: controller audit and bounded correction

## Recommendation

Keep the reduced body, support, traction and grip model. The demonstrated
approach defect is a **controller discontinuity**, not evidence that cleats
need a different friction law or that defenders need extra agility. Use the
existing support-aware moving-arrival primitive for incoming and crossing
approaches, blend into it continuously, and retain the ordinary distant
interception and escaping chase. The root implementation does this without
changing World, collision, traction, grip or balance capacities.

A runner's high radial incoming speed does not necessarily mean he is heading
into the defender. The early frontal gather must also consider the observed
runner path's lateral miss distance. Otherwise a stationary defender five
yards ahead and four yards outside slows before he has run his interception
angle. This adverse witness caught that regression in the initial candidate;
the final candidate adds a smooth near-hip corridor gate.

## What was independently inspected

Baseline is commit `fcafcaf`, canonical production source
`178751b67048eeaa91741090a4a19e43c108add8c5f1c5e0a586c09d57b3402c`.
Candidate receipts below are production source
`66b5ce3e6ed1cbab4372cfe39e0ed19049fac26e586eae1007dfbd4c98801635`.

Inspected `common.ts`, `approach-control.ts`, `tackle-window.ts`, tackle
selection, `kinematics.ts`, `reach.ts`, and support availability. Coaching
interpretation follows the bounded simulation synthesis in
[the defensive handbook](../../football-handbook/defense-and-perception.md#10-pursuit-gathering-and-tackle-selection).
That section is not a quantified NFL coaching study. No new force parameters
or NFL target rates were fitted here.

The baseline has useful mechanisms worth retaining:

- Chase consumes delayed, stress-dependent pictures. Its pursuit forecast
  estimates acceleration from older pictures and retains per-play angle error.
- Crossing arrival uses the body's actual braking/turn envelope and support
  availability. The far shortlist previews ordinary World movement rather than
  teleporting to an analytical interception.
- Tackle-window previews the previously issued command, not another behavior
  decision. Bodies with grip ownership or registered loads are excluded from
  that free-motion forecast.
- Physics executes the command over time. A requested velocity does not change
  actual velocity or establish a tackle grip immediately.

The baseline also had a separate head-on branch: a tiny incoming-angle change
selected a different velocity policy, and that branch ignored the close
arrival's fatigue/support budget and installed force shoulder. Those narrower
flaws are reproduced; they do not prove that every visually missed tackle has
the same cause.

## Reduced witnesses and adverse outcomes

Independent collector: ignored `out/tackle-approach-current/probe.ts`.
Baseline receipt: `out/tackle-approach-current/baseline.json`.
Exact candidate rerun: `out/tackle-approach-current/candidate-path-corridor.json`.
Both receipts have identical source-before/source-after pins and collector
hashes. There are 15 predeclared two-body approaches with consistent moving
history, ordinary 20 Hz World execution, and two held-picture controls.
**They do not call tackle acquisition and are not native 11-on-11 rates.**

| Witness | Baseline | Candidate | Interpretation |
| --- | --- | --- | --- |
| Mirrored incoming heading ratio .6999/.7001, 6 yd apart | Requested speed jumps 9.73 to 6.43 yd/s | Both 9.73; closest distances differ <.001 yd | Removes the old policy threshold; both still miss body contact within .8 s. |
| Mirrored force/alley, 4 yd ahead and 1.5 yd outside | Identical 2.99 yd/s requests and no body contact | Distinct shoulders; body contact at .75/.70 s | Known job affects technique; this does not guarantee a wrap or takedown. |
| Frontal runner 6 yd/s, defender stationary 4 yd ahead | Fresh and .35-energy request identical 1.76 yd/s | Fresh 2.15, tired 1.76 | Budget uses actual capability; both retain front attack and body contact at .55 s. |
| Defender already approaching at 6 yd/s | Body contact .35 s | Body contact .35 s | Does not erase existing momentum or prevent ordinary contact. |
| Fast crossing angle / late observed cut | No contact in .8 s | Still no contact in .8 s | Preserved adverse cases; no omniscient correction or artificially guaranteed tackle. |
| Faster runner escaping, 4 yd ahead | Sprint; no contact | Sprint; no contact | Failure to catch is legitimate negative evidence. |
| Unseen current runner displaced left/right after held history | Same request and next RNG | Same request and next RNG | Correction does not consume hidden current coordinates. |

All candidate runs keep work-accounting residual below `2e-12` in these
reduced probes. This protects accounting in these executions; it is not proof
of all-contact convergence or a new calibration of hit forces.

Focused [chase-arrival tests](../../../test/chase-arrival.test.ts) pass 12/12 at
this source, versus 7 failures and 5 passing controls with the exact test file
copied into the `fcafcaf` source archive: policy and achieved-path continuity, far-oblique sprint,
complementary mirrored shoulders, fatigue and recovering support, escaping
chase, ordinary frontal contact/work, held-picture/body/random neutrality,
foot/load exclusions and pending grip ownership. Existing pursuit/approach/
tackle-window tests remain separate guards; no prior test was weakened.

The new oblique witness uses a consistent moving past. The existing old
oblique test repeats identical positions with nonzero velocity, so
dead-reckoning advances its picture beyond the staged present. It remains a
useful retained guard, but its passing baseline result does not contradict
the newly reproduced constant-velocity oblique slowdown.

## Native situations worth inspecting

The preserved [awareness packet](../../../data/reviews/decision-awareness)
contains the `fcafcaf` source baseline and full 160-run panel. Suitable
continuation targets are:

- `CT-R1-split_zone-over-L-S11`: 70 yd touchdown. Holds slip at 3.35 and
  3.75 s; `CB_S` misses at 3.90 s and dives at 4.40 s.
- `CT-R1-oz_strong-tite-R-S11`: 22.45 yd; three holds slip at 3.75, 4.10
  and 4.70 s. These are loaded-grip outcomes, not automatically approach
  failures.
- `CT-R1-iz_strong-under-R-S3`: 6.23 yd; linebacker miss at 2.90 s.
- `CT-R1-power-under-L-S3`: 5.82 yd; linebacker miss at 2.80 s and safety
  hold slip at 3.65 s.

Use the same ordinary seed, mirror, source, rosters and run-end rules. A saved
event says which opportunity or grip failed; deciding *why* requires the free
approach, consumed picture, actual velocity, support and acquisition geometry
before that event. The old traffic probe uses legacy spacing without the
current context and is not sufficient evidence about today's traffic policy.

Root owns native candidate panels and final source promotion. Their complete
tails and negative controls, rather than the favorable reduced cases alone,
must decide whether to keep the correction.

## What remains unresolved

The continuous gather does not add a global gaze budget, teammate role
communication, perfect future-cut knowledge, or a full tackle-approach
optimizer. A force/alley offset remains a simplified job contract. The short
forecast assumes constant observed runner velocity and excludes constraints
it cannot faithfully preview. Far analytical reach is approximate; support
limits are applied by execution and the bounded near controller.

Rearward wrap orientation, curved teammate traffic, and lingering loaded-grip
slips need their own witnesses. The arrival shortlist can still switch when a
candidate beats another by the existing .1 yd margin; the new tests establish
continuity at the diagnosed old angle boundary, not global smoothness of every
decision. Investigate any remaining skating-looking clip by separating a poor
requested angle, delayed perception, failed acquisition and physically limited
redirect before modifying traction or adding solver complexity.

## Independent review of the combined follow-up

The combined follow-up also changes supported waiting (`tackle.ts`), late
closed-hip cushion compression (`defense.ts`), the teammate-turn shortlist
(`spacing.ts`) and the instruction used during an acquired side/rear grip
(`updateBond`). These are separate motor/decision repairs, not another force
model. Parent-owned source receipts and native panels must identify the exact
combined source; the earlier 15-case numbers above describe only `66b5ce3e`.

Static review finds no new strength, traction, grip-capacity, recovery or
collision multiplier in these additions:

- Waiting now requires affirmative evidence from a supported preview of the
  consumed picture and previously executed command. Missing/excluded previews
  cannot inherit an optimistic current-state constant-velocity forecast.
- A late man acquisition can close excessive cushion once observed receiver
  movement declares a release. It requests a turn/brake; it does not instantly
  remove the defender's momentum or perfect his route recognition.
- A turning player first considers one half-speed request before full braking.
  It preserves facing/posture/technique, uses ordinary movement, and must remain
  upright and clear every observed peer in the forecast. It neither erases
  teammate collisions nor knows their upcoming commands or future cuts.
- A secure side/rear hold no longer automatically commands its holder to dive.
  An explicit dive/lunge remains committed; a weak extension is not promoted;
  grounded holders are not reset upright. Foot support and bounded delivered
  grip load determine what actually happens next.

Focused component controls are in `tackle-wait-constraints.test.ts`,
`man-cushion-compression.test.ts`, `traffic-turning.test.ts` and
`tackle-support-choice.test.ts`. The loaded-support tests include weak and
strong extension, front/side/rear contact, mirrored explicit dive/lunge,
grounded support and an already falling carrier, with ordinary World work
checks. Their staged acquired holds isolate the controller; they do not
establish how frequently those holds should be acquired in NFL play.

These repairs are maintainable within the present reduced model: a small
velocity shortlist and the same body solver are preferable to more anatomy or
scenario-specific forces. The extra spacing forecast is local and gated,
not a global solver-resolution increase. Parent-owned matched game timings
are now recorded in the [final review](pursuit-and-tackle-transfer.md): the
coarse sequential two-game guard costs 7.74% more CPU/play. Changed play counts
and unrepeated timings limit that estimate; it is not a demonstrated speed gain.

Two limitations deserve explicit labels. First, `updateBond` retains the older
`held > 4` whistle even when the carrier is still gaining. A finish caused by
that cap is not evidence of a physical takedown; distinguish it from failed
support, a genuine stalled-progress whistle and the QB's in-grasp rule.
Second, late-man cushion still has the existing 1.5 yd/s release threshold and
the constructor's live-position initial-cushion shortcut. Held-picture tests
after identical construction protect the new motor instruction, not a fully
observation-clean man controller. Threshold chatter is a plausible future
probe, not a demonstrated native failure or justification to withhold the
bounded repair.

I found no critical new hidden-state oracle or extra physical capacity in the
combined edits on code review. This recommendation is conditional on preserving
the existing controls and the parent’s full negative/native outcome panel. It
does not certify all football techniques, contact convergence or NFL rates.
