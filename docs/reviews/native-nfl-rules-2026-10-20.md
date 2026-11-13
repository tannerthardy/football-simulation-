# First native NFL rules implementation

2026-10-20 America/Phoenix. Implementation on accepted
`2c98bed94adad8087c65f381d4090444ad283985`; no experimental branch imports,
physics-law/capacity, rating, dependency or flag changes. This is separate from
the [full-book coverage/index proposal in #173][coverage]. It implements a
bounded first group of rules, not complete NFL compliance.

## Resulting behavior

| Delivered path | Official basis and boundary |
| --- | --- |
| Native prethrow-blocking OPI | 8-5-4(a): an achieved, own-controlled loaded hand block clearly beyond one yard, followed by a qualifying forward release from behind the line. Receiving-slot subset; no proximity-only or requested-act calls. Slow, conservatively separated interval geometry only. |
| Initial-line contact control | 8-3-1 exception: retain possible initial-line body/hand contact per actor/defender pair across joint replacement. This deliberately undercalls ambiguous continued contact rather than inventing eligibility or separation. |
| Illegal forward passes | 8-1-2: a second forward pass from behind the line, or a forward pass after a possession change. Preserve previous pass/INT statistics; previous-spot loss of down differs from post-change spot enforcement without loss of down. |
| Restricted fumble recovery | 8-7-5/6: fourth-down original-offense and late-half/Try teammate advancement limits; original fumbler and backward-pass controls remain. Whistle at the legal dead-ball spot without moving the recoverer's body. |
| Fumble out of bounds | 8-7-3: signed forward/backward field spots use the first represented boundary crossing. Untouched field-origin end-zone fumbles resolve safety/touchback for the correct side. Unknown end-zone impetus/momentum is explicitly unsupported. |
| Official foul choices | Rule 14: retain all calls, calculate same-team alternatives, qualified no-change offsets, OPI previous-spot, DPI spot/automatic first, and supported illegal-pass enforcement. Preserve legacy singular aliases. Unsupported called compositions cannot silently become a legal gain. |
| Game composition | Apply selected spot/down/possession once; nullify superseded scores/stats while retaining physical replay. Supported pre-change offensive fouls remain enforceable through an interception-return fumble regained by the offense. A declined/no-foul regain starts a new series. |
| Clock and Try callers | 4-8 and 11-3: supported untimed-down entitlement is consumed by the next actual down, including a kick/kneel. Supported Try fouls can require retry or failure; defensive return scores, one-point safeties and declined fouls keep their proper scoring side. |

The new `FoulRecord` distinguishes native achieved violations from existing
sampled holding calls and unresolved technique choices. It retains rule/facts
independently of optional replay recording. Existing holding selection,
visibility probabilities and execution RNG order are preserved; a selected
holding technique is not relabeled as achieved NFL illegality.

## Evidence and review

The focused tests include real World load → retained prethrow act → native
pass release → called OPI → Game nullification, with ordinary generated bodies
and recording disabled. Controlled Game endings isolate official rulings; they
do not establish normal-play success rates. Native fumble tests exercise actual
release/recovery/boundary callers. No game campaign, tracking query, roster
sweep or outcome calibration is part of this change.

Two independent read-only reviewers checked official rule semantics and caller
composition. Their findings led to concrete fixes: persistent initial-line
pair history, correct first-down coordinates, consumed untimed entitlements,
pre-change foul handling through regained possession, actual boundary
interpolation, stopped restricted recoveries, and Try option/scoring handling.
Targeted opposing controls cover the corrected branches.

Exact combined results and fingerprints are published in
[`native-nfl-rules-verification.json`](../../data/reviews/current/native-nfl-rules-verification.json).
Frozen `ad494e5ca952ee237708f8dd13422025cf4bb3ca` passed **2,354 TypeScript
checks in 210 files, 145 Python checks, typecheck and build** in 255.525 command
seconds, with no skips or input drift. The four new files add 106 focused tests.
All 44 resolved flags retain the accepted settings, including components=1.
The official-rules reviewer accepted this exact pin within the stated scopes.
Integration owns final adoption. If accepted source, inputs and settings remain
compatible, reuse this receipt; a changed assembled candidate requires its
own proportionate composition check. No merge or new baseline is designated.

## Deliberate limits and next work

- **No complete foul detector:** DPI has official enforcement but no new native
  producer. In-flight PI, illegal contact, defensive holding, roughing,
  blindside/back/low/chop blocks, facemask, horse-collar and hip-drop still need
  qualified action/region/exception facts. Long contact, tensile force,
  an unseen defender or a falling grasp alone cannot prove these fouls.
- **Conservative OPI coverage:** no general picks/body-only blocking detector,
  OL numbering/covered-player eligibility, fast/substep location adjudication
  or in-flight branch. Sticky possible initial-line history may undercall a
  genuinely new act by the same pair after separation.
- **Ball/phase limits:** returned-behind-line has a pure predicate but no native
  crossing-history producer; beyond-line passes/grounding remain. Complex
  clean-hands, post-change multiple fouls, dead-ball/carryover and other Try
  combinations remain unsupported. End-zone-origin fumbles lacking impetus/
  momentum facts fail explicitly. Existing loose-ball boundary-plane timing
  does not qualify full NFL airborne exit/reentry/contact semantics.
- **Existing reductions remain:** post-catch holding still uses the legacy
  attempted-pass enforcement reduction; multichange team-turnover statistics
  and defensive-return fumble player credits are incomplete. The new-series
  correction does not certify that statistical ledger. General clock/runoff,
  eligibility, catch process, presnap/free-play and special-teams models are
  not certified by this work.

Next useful rules work is an achieved-restraint holding predicate and the
smallest native DPI/illegal-contact branch using actual acquired contact,
with legal hand-fighting/incidental-contact controls. Establish contact region
and initiation facts before adding safety fouls. Continue the existing
[Measurement process](../NFL_DATA.md), [behavior review](../BEHAVIOR_REVIEW.md)
and [cost policy](../TESTING_COSTS.md): saved evidence and native cause first,
not random penalty rates or an automatic new campaign.

[coverage]: https://github.com/tannerthardy/football-simulation-/pull/173
[book]: https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
[pdf]: https://static.www.nfl.com/image/upload/fl_attachment/league/tqivdkzt9mu6wdgsh1ku.pdf

Authority: official [2026 NFL rulebook][book] and [NFL PDF][pdf], PDF SHA256
`144cec5bffd2725bb703a26523f5ccf0b16c59c2fe5c13f6e671f4bddaa87c55`.
Source season is explicit; older tracking references do not decide 2026 legality.
