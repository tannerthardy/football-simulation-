# Material transport belongs to the held-body island

2026-10-14 (America/Phoenix). Standalone review from PR #43 `938810c`; baseline remains `4ded6b6`.

The experimental patch loop transports every held material point while stepping any group. A retained foot velocity can move that point during an unrelated body's interval despite unchanged held pose/foot offset and zero grip work. Gate that transport on the held body belonging to the advancing group, behind the absent-by-default `materialTransport: 'owned'` option. No solver, capacity, traction, recovery, release or fatigue change.

Four focused witnesses reproduce the unowned advance, prevent it with the option, preserve a correctly owned contact exactly, and preserve accepted center-contact execution exactly. The center default does not execute the patch material loop; this is not a universal production repair.

This is the ownership correction already present in PR #46, isolated for independent review. [PR #48](https://github.com/tannerthardy/football-simulation-/pull/48) retains the legacy / ownership-only / ownership+solver native comparison and its changed/censored outcomes. The extra1.09yd does not prove better or worse physics. Do not apply duplicate ownership logic when consolidating the branches.

Focused ownership/lower-grip/bounded-attachment checks:76 pass; typecheck passes. The parent retains seven incomplete reference fixtures and the older dry-cap failure; PR #48 separately repairs the seven fixtures and classifies the remaining failure. No full suite repeated here and no parent failure re-pinned. This branch remains experimental, draft and default-off.
