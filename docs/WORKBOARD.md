# Current work ownership

Read this before choosing work. Add or update one row before editing a shared
subsystem. Claim a bounded task, not every future idea. Date uses the owner's
local calendar; evidence receipts retain their explicit measurement timestamps.

| Active item | Owner | Branch | Files / boundary | Claimed | Status |
| --- | --- | --- | --- | --- | --- |
| Shared angular-contact solve and physical force points | Codex physics session | `claude/engine-priorities` | `src/physics/world.ts`, contact-law tests; owns production promotion | 2026-10-11 | Active: mixed hand/torso timing repair passes new laws; shoulder-point API in progress. |
| Tackling and catch/contact mechanics | Codex physics session | `claude/engine-priorities` | `src/sim/tackle.ts`, tackle windows, `catching.ts`; coordinate before controller overlap | 2026-10-11 | Owned; no new tackle-strength change. Recent catch-controller work already integrated. |
| Run blocking, pass-rush technique, pursuit and coverage controllers | Other controller session; confirm owner here before edits | Separate short branches | `engagement.ts`, blocking/defense/receiver controllers; shared-law changes require physics review | 2026-10-11 | Proposed division from owner discussion. `pass-rush-hands` stays experimental; do not duplicate its controller work. |

Before crossing a boundary, state the proposed change and coordinate through
this file and any available session messages. This board does not claim that
separate chat sessions have a direct messaging tool. Each owner updates its
row and links evidence when work lands; remove completed rows after handoff.

Land small diagnostics/docs separately when useful. Experimental engine work
may land with a default-off option; flipping the default requires law and
football controls. Keep source-pinned evidence and adverse cases. A changed
physics hash is a new stage, not a reason to erase its historical witness.

Review existing branch findings before reimplementation:

- Pursuit/catch overlap: [pursuit](reviews/pursuit-coverage.md) and
  [moving catch/contact](reviews/catch-contact-repair.md).
- Shared physics and leverage-package boundaries:
  [contact prototype](reviews/zone-flow-prototype.md).
- Current source status and commands: [status](STATUS.md),
  [validation](VALIDATION.md).
