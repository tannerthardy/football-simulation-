# Planned climb near-contact fit

Recommend independent review of one controller correction: a planned climb now
uses the existing second-level foot fit when it reaches the existing near-contact
envelope. Its far interception/cadence remain unchanged. Previously the planned
return bypassed that fit and could carry a blocker past a flowing linebacker's
useful strike surface, leaving his route to the runner exposed despite hands.

Accepted base `bb6d4c73948d53ba841dd9338dd240146c739f8c`. Minimal patch:
`src/sim/behaviors/blocking.ts`, `test/planned-climb-fit.test.ts` and its fixture.
Code `7c33a40`, test freeze `525eb8c`; these blobs exactly match tested research
`353d8ca`/`c39e598`. Source
`6d16f77e41a5f02805b110da04cf09b767c0c2bf2b95e0cc66857db31cf5ccc7`.
No keeper/release/assignment, spacing, force/grip, physics/capacity or flag change.

| Control | Actual protection evidence |
| --- | --- |
| Saved Duo Under | RT remains on Mike's backfield surface with real load through arrival. Mike's old2.95 runner contact is prevented; SS reaches first at3.50. Y's original keeper joint survives through2.95. First RT load is later,1.80→1.85. |
| Same Under, matched first hand exchange | Benefit survives reference's weaker first hands: SS first3.45, prefix live/censored3.60. Later native noise is not matched. |
| A030 ordinary Duo | Timely RG/Mike plus RT/DT and C/Will loads survive; same SS first runner contact3.30. Later75yd TD becomes15.45yd tackle: at nearly identical CB/RB geometry, third-wrap native execution changes .582→1.196. Adverse ending retained. |
| A002 OZ | Existing useful Mike load2.35→2.30; same DE first contact2.75, ordinary defensive win preserved. |
| A015 WZ | Original Mike miss/contact2.90 and−.49yd ending remain; its departure problem is not cured. |

**62 focused checks and typecheck pass**, Node22.23.3,44 accepted flags,
RUN_CONTACT_COMPONENTS=1/CF_FLOW unset. New tests execute the production hook in
native/reflected acquired geometry, retain far command/held cadence and require
real keeper/Mike load through arrival under native work/arm limits. Existing
collection hidden-state/obstruction, mirrored strike/blocked departure, combo
transfer and run-fit checks pass unchanged. No all-suite or game run by Run.

[Detailed analysis and reproduction](https://github.com/tannerthardy/football-simulation-/blob/1ad0e7b08a693c57d93138b197728d1b54914b00/docs/reviews/planned-climb-fit.md)
and [hashed evidence/input index](https://github.com/tannerthardy/football-simulation-/blob/1ad0e7b08a693c57d93138b197728d1b54914b00/data/reviews/current/zone-second-level-access/evidence-index.json)
are fetchable on `codex/zone-second-level-access`; do not merge its research
ancestry. Full inputs, observers, rejected isolated variant patches, sampled
adverse tapes and original receipts remain available. Native21 continuations
over seven frozen inputs cost21.612 launcher seconds; focused tests4.781s and
typecheck9.811s, total36.204 recorded command seconds. One invalid launcher
option failed before simulation. Compatible accepted baselines were reused.

Next: independent controller review and Integration's exact combined verification.
Evidence predates Do-It-All's pending #94 shared spacing correction; if composed,
retain Under arrival and A030's useful collection contract. No claim about that
composition yet. Earlier zone release/check/sprint trials are rejected for
promotion; current IZ/WZ second-level access remains an explicit limitation.
Historical4ded6b6 and defaults are unchanged; no new baseline is designated.
