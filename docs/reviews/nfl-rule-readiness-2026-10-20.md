# NFL rule readiness and first implementation work

2026-10-20 America/Phoenix. Decision-level source review at accepted
`2c98bed94adad8087c65f381d4090444ad283985`, canonical queue
`4cc3337df24faa6d857b612ae62e3df3109a5296`. No new games, simulations, engine
tests, runtime changes or candidate acceptance occurred. The new rule register
is a coverage index and implementation plan, not a certified rules engine.

## Historical planning status

This is the pre-implementation source inventory at `2c98bed9`. The coherent
[#178 implementation](native-nfl-rules-2026-10-20.md) and dependent
[#188 contact/ball/ruling extension](nfl-contact-rules-2026-10-20.md) supersede
only the delivered scopes. Retain the original fingerprints, gaps and proposed
assignments as history; consult Integration for the exact accepted build.

## Verdict at the reviewed source

The user identified a real missing boundary. Current tests can demonstrate a
better block, collision or catch without establishing that the action obeys
NFL rules. Build officiating as a first-class part of the engine. Start with
actual foul facts and enforcement, then implement the highest-exposure contact
and pass rules. Do not wait for a comprehensive referee simulation, and do not
claim complete football legality from absent flags.

The official source is the [2026 NFL rulebook][book], whose PDF explicitly
identifies that season. The [coverage register][register] spans every chapter,
section and explicit article, plus the official penalty summary. The main
[implementation contract](../NFL_RULES.md) explains definitions, exceptions,
current limits and completion requirements. The full source PDF/text remains
at the official provider; our publication contains citations and an index.

## Observed implementation, not assumptions

| Area | Current fact and evidence |
| --- | --- |
| Representation | [`PenaltyCall`](../../src/sim/types.ts#L180) has four names: holding, DPI, false start and offside. `PlayResult.penalty` and Game log foul are singular. An enum is not detection/enforcement. |
| Holding | [`tryHold`](../../src/sim/engagement.ts#L1351) samples a beaten-blocker grab, then a visibility roll if no prior penalty. Uncalled chosen holds lack a separate incident event. Ordinary reduced hand tension can also exist without `e.holding`; that does not itself prove illegal holding. |
| Presnap | [`preSnapFoul`](../../src/game/game.ts#L712) samples discipline-scaled false start/offside. Both end before PlaySim; ordinary live-ball offside is not represented by this path. |
| DPI and other fouls | DPI has no current producer or resolver. No general OPI, defensive holding, illegal contact, blindside/back/low/chop, roughing, facemask, horse-collar or hip-drop detectors were found. |
| Existing useful guards | [`receiver.ts`](../../src/sim/behaviors/receiver.ts#L215) retires release jams beyond five yards/after throw/scramble; its jam does not create tensile cloth hold. Preserve this bounded controller behavior without calling it full officiating. |
| Enforcement | [`holdingDecision`](../../src/game/game.ts#L762) and the preceding application branch support a bounded offensive-holding case, including declines, spots and safety. There is no general multi-foul/offset/possession/clock resolver. |
| Catch/pass/fumble | Simultaneous reach geometry is accepted, but immediate possession and center-inbounds are not the NFL catch process. General legal forward-pass/grounding and fourth-down/late-half fumble advancement rules are not fully adjudicated. |
| Special teams/admin | Kick/punt/FG outcomes and game timing/OT have actual reduced behavior. They are not native kick-contact legality or complete Rules 4–19 implementation. |

Existing [game-rule tests](../../test/game-rules.test.ts) protect useful scripted
presnap/holding, clock, scoring and OT behavior. They do not demonstrate native
detector coverage. No native failure frequency or illegal-play rate was measured
in this pass; lack of detection is not proof that every saved block is a foul.

## Measurement's latest process applies

[#161](https://github.com/tannerthardy/football-simulation-/pull/161) was
incorporated by extraction through [#168](https://github.com/tannerthardy/football-simulation-/pull/168).
Its adopted [process plan](nfl-agent-evidence-plan.md) uses a saved relevant NFL
reference, then a native causal trace, then a bounded correction with opposing
and adverse evidence. It does not require new archive downloads, NFL queries,
games or a full report for each change.

For this assignment the rulebook establishes the legal contract, native act
facts establish whether its elements occurred, and NFL tracking provides
context. Tracking proximity/interposition, contact-to-ending duration and
synthesized viewer facing/possession cannot establish head contact, jersey
restraint, actual gaze, continuous grip or catch-control/foot chronology.
Retain rule edition, source/operator/settings, identities and exposure. The
2022 reference is not automatically evidence that an act is legal in 2026.

## Three active priorities

These are proposed assignments; this publication does not launch implementation
sessions or move another owner's branch. No new approval committee is needed.

### 1. Rules/enforcement owner: deliver the first complete vertical slice

Assign one focused owner, preferably Flex or a dedicated temporary rules agent,
to the central adjudication/enforcement boundary. Integration remains assembly
and verification owner. Claim only new rules helpers, the owned Game/type adapter
functions and focused rule tests; coordinate shared PlaySim/events with their owners.

**Next action:** migrate existing holding through an incident/call list and
pure enforcement-options/result application boundary, preserving legacy evidence
and existing compatible contracts. Record the currently uncalled technique
choice separately from achieved grip/load or restriction; selecting a mode
before physics does not establish that its contact happened or proves every
NFL holding element. Retain legacy call semantics explicitly until
their replacement is reviewed. Do not publish unused enum/framework expansion
as if it delivers a new foul.

**First acceptance:** supplied foul facts produce the correct rule-specific
official spot/down/score/stat result; multiple incidents survive until selection;
observation alone does not alter physical execution. Use deterministic fixtures
for existing accepted/declined holding and a named multi-foul interaction. Then
use this same path for the first newly qualified detector; no parallel resolver.

**Dependency:** a rules edition and agreed minimal incident/result contract.
Pure rule predicates and their legal controls can be prepared independently.
New authoritative calls require that predicate, native producer and enforcement
compose; adding a penalty name or post-hoc random flag is insufficient. A
nonauthor reviews legal elements/exceptions and the native-to-official path;
Integration's combined verification is a separate responsibility.

### 2. Run + Physics: qualify achieved block/hold legality

Run owns the technique/controller; Physics owns the smallest missing achieved
contact/grip facts; the rules owner owns predicates and Rule 14 treatment.

**Next action:** use one existing long-contact/re-acquisition or counter/stalk
native window and identify exactly which holding/back/blindside elements are
observable. Start a supported predicate with its legal control; add only the
contact point/normal, act continuity, contact mode/region or restriction fact
that its rule actually needs. A blindside rule needs blocker path, contact
surface and close-line exception, not a test of whether the victim looks away.
Backside contact after an imminent opponent turn must retain its exception.

**First acceptance:** an actual unequivocal illegal act is recorded and called
through the central path, a legal side block/continued fit is preserved, and
unsupported anatomical branches remain visible. Long duration and tensile
force alone must not trigger holding; legal high-high combos must not trigger chop.

Do not rescue yardage by capping block duration, forbidding all renewed grips,
inventing a foul based on gain or changing physical capacity. Keep ordinary
movement/contact fixes progressing with appropriately limited legality claims.

### 3. Pass/Awareness + rules owner: pass-contact and ball legality

**Next action:** prepare independently delivered DPI, OPI and illegal-contact
predicates against one shared snap/release/first-touch/possession timeline.
The first new called-foul target is **OPI 8-5-4(a)**: an actual offensive block
clearly more than one yard downfield before a qualifying pass. Retain the
achieved block candidate until the pass context resolves, and implement the
applicable ineligible-player/initial-contact exception rather than flagging
all downfield presence. This branch can start without invented head/hand anatomy.
Don't duplicate the now-accepted #131 catch query or #141 roof controller.

**First acceptance:** a native achieved prethrow-block/qualifying-pass witness
produces an enforced OPI flag and a legal run/backward-exchange or applicable
blocking exception does not. Pure predicates alone and holding migration are
not the final delivery. DPI and illegal contact can progress independently,
with their own unequivocal violation and incidental/equal-rights controls,
release/touch boundaries and spot/down effects (including DPI's end-zone
exception). Preserve legitimate screens and legal press. Where catchability
or contact facts are absent, record the exact unresolved branch instead of
fabricating them. Do not wait for all three predicates to integrate one.

In parallel, Flex/rules can qualify snap-time formation/eligibility, legal pass
and grounding/illegal-touch facts. Roughing passer follows supported contact
branches with Physics; it must not be implemented as a blanket post-release
timer. Complete catch/control/boundary and fumble restrictions as separately
reviewable correctness work using the same state/possession contracts.

## Remaining completion work is explicit

The register is the return list for timing/runoff/untimed downs; personnel,
substitution and equipment assumptions; all low-block/safety/conduct branches;
free/scrimmage kicks and fair catches; goal/try/impetus rules; multi-possession
enforcement; player removal; overtime; replay/officials/captain options; emergencies
and non-player conduct. Prioritize represented on-field acts and consequences.
Administrative rules can use explicit validated assumptions or interfaces;
unrepresented acts stay unsupported, not silently certified. These tasks are
not erased just because the first contact predicates pass.

## Short owner prompts

**Rules/Flex:** Own the versioned incident → assessment → call → enforcement →
official-result contract. Deliver existing holding end to end before broad enum
expansion. Keep multiple acts, legal options and rule exceptions. Preserve raw
results, existing evidence and legacy replay interpretation. Coordinate shared
functions; return one small reviewable slice with legal and illegal controls.

**Run + Physics:** On an existing native block window, separate supported legal
elements from absent facts. Supply only missing achieved contact/grip evidence
for the first block/hold predicate. Preserve side blocks, imminent turns,
ordinary tension and legitimate renewed blocks. No duration caps, strength
changes or general anatomy project. An absent flag is not your legality proof.

**Pass/Awareness:** Deliver pass-contact predicates independently with the rules
owner, starting with a native achieved prethrow-block/qualifying-pass OPI
8-5-4(a) flag and enforced result. OPI starts at snap; DPI starts at release; first
touch and eligibility matter. Preserve incidental contact, proper press,
catchability exceptions and screen/run controls. Keep catch-process/grounding
and passer protection as named next slices, not a ratings buff.

**Measurement:** Apply the adopted reference/native-cause process. Qualify the
decisive native legal facts and rule edition for an affected witness; do not
infer fouls from proximity, film-facing or duration. Reuse evidence and write
violation/legal-under-evaluated-rule/unresolved in existing Evidence/Risk fields.
No new universal query, dashboard, penalty-rate target or full-game gate.

**Integration:** Keep the register linked from existing review/issue records.
Batch independently accepted rules slices with compatible fixes. Verify the
exact combined candidate once, including official versus raw results, without
waiving relevant rule failures or waiting for every article to be complete.
This documentation does not activate flags, select a new rules default or merge.

## Evidence and stopping rule

The source inventory and primary rule index were independently checked in
separate read-only lanes. Publication checks validate source fingerprints,
index counts/uniqueness, links and documentation-only scope. No engine suite is
needed to publish this plan. Future delivery uses the smallest rule witness,
relevant exception/control and directly affected enforcement tests; add testing
only for a named unresolved question. Full games cannot prove missing detector
semantics and are not the first implementation check.

[book]: https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
[register]: ../../data/reviews/current/nfl-rules-coverage-2026.json
