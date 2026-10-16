# Minimal #97/#100 composition for Run review

2026-10-16, America/Phoenix. This is the author-prepared composition requested
for independent Run review. It changes no policy beyond the published #97/#100
scopes. Do-It-All's [existing independent adjudication](https://github.com/tannerthardy/football-simulation-/blob/ba3997125cb31495e99da8ba1f9eef96ce1dd272/docs/reviews/coverage-contract-review.md)
already accepts each scope and the exact composed extraction for Integration
verification. The actual candidate below has **the same complete result tree**
as that extraction, rather than the historical interaction branch's ancestry.
Run can reuse that decision or identify a specific remaining blocker; author
publication is not a merge or a new independent approval.

## Fetchable pins and minimal application

| Item | Exact pin |
| --- | --- |
| Accepted/fetched develop; confirmed by canonical queue `db0d512` | `3723204bd0743713bca3e87f10ca01bfebf00a15` |
| Accepted source SHA-256 | `cda44ed806395aa3dcbeab8f4516da3e302633e3e28408fbf97119ff82ced318` |
| Clean eight-file candidate commit | **`65f1ec7a71feadb2f26b3a30212b1eaa74064e9d`** |
| Candidate branch | `codex/coverage-97-100-composition` |
| Candidate source SHA-256 | `23c9496c21c7986fefaea91fd60299fd2d08a820a08aca476343046bd202094e` |
| Candidate tree; equals independently reviewed result tree | `81deae6aa8d9af47e39988f8e2f9f9226aecc696` |
| #97 reviewed head / runtime | `1a52e6b51be6c33cbb50f07c25c2471c5a1e54f6` / `d4eaf85f11fe7c71a36391948ccd0143753e9974` |
| #100 reviewed head / runtime | `9f30428df552301ec25b51bade76ce4965d9fcda` / `19d520f00dd3b521078d6f24be9d645e90a78ebc` |
| Independent review and original portable patches | `ba3997125cb31495e99da8ba1f9eef96ce1dd272` |
| Historical interaction, evidence only | `0b346b6373e77d6001973830c6efe9b753245dd1` |

Fetch the candidate branch, then cherry-pick **only `65f1ec7`** on accepted
develop for the protected implementation. Later branch commits contain handoff
documentation/patches/receipts, not additional runtime changes. No #97/#100
research parent, diagnostic collector, #95, #102/#104, or pass-suite branch is
needed.

Alternatively apply the [eight-file composition patch](../../data/reviews/current/coverage-97-100-composition/97-100.patch)
once to accepted develop. SHA-256:
`f19b6f3e086bcdfa6ba7c94daa0d47e8ca7abdb5dbe2586cb7d5763fba12eb49`.
It is byte-identical to the independently published patch.

The [manifest/receipts](../../data/reviews/current/coverage-97-100-composition.json)
contain every blob, patch checksum, source, command, flag and runtime. The
[standalone #97 patch](../../data/reviews/current/coverage-97-100-composition/97.patch)
and [standalone #100 patch](../../data/reviews/current/coverage-97-100-composition/100.patch)
each apply independently to accepted develop. **Do not apply both standalone
patches blindly:** their acquired-entry interface overlaps. If #100 has already
been extracted, apply only the [two-file #97-after-#100 overlay](../../data/reviews/current/coverage-97-100-composition/97-after-100.patch),
SHA-256 `814c74a10ed96a5839c09e0cc4eb91d05dfab2976d3cd460cc49928769b88cfa`.
Cached-index checks establish that `100.patch` followed by this overlay produces
the exact same composed tree. Do not also apply the full composition patch.

Protected scope is four runtime files (`behaviors/defense.ts`,
`coverage/defender.ts`, `coverage/rules.ts`, `coverage/techniques.ts`) and four
tests (`match-block-release`, `release-cushion`, `seam-delivery`,
`coverage-run-support`). The candidate's parent is exactly accepted develop;
every other accepted file is unchanged. All eight blobs equal the historical
interaction scope, including the justified support-label assertion adjustment.

## Explicit contract reconciliation

| Boundary | Preserved behavior |
| --- | --- |
| Acquired entry | One `ManOptions.initialPosition` interface/constructor. Rule-based man and provisional-read producers copy their consumed receiver picture. Entry metadata never changes directive identity or resets an ongoing cushion. |
| **#97 condition 1: `seamCurlFlat`** | Keep #100's early unknown/low-vertical `readRelease` return. The later terminal exchange excludes **both vertical and block**; `none` has already returned. An acquired block gets its current response without permanently closing #2. |
| **#97 condition 2: `qSafety`** | A blocking picture gives conditional help on #1 only when `knowsPass`; otherwise zone. This branch **does not set mode `one`**. Acquired out/under/stop still earns the existing terminal help, and the seven-yard vertical commitment remains. |
| **#97 condition 3: `wallTwo`** | Keep the rule-specific early read. Exclude **block** from the later terminal zone check. Genuine acquired shallow and existing earned-depth exchanges remain. |
| Release cushion / continuity | Read the installed #2 with existing ManCoverage movement. The technique remains zone-kind, with installed run support and recognized reachable-ball priority. Transfer inner movement state only to the same receiver/inside match without trail or over-top options. |
| Cover3 delivery | Only `c3_curl_flat` qualifies the ordinary twelve-yard delivery using unchanged `hasVisibleCap`. Delayed helper position/velocity/age/pose are evidence; private assignment or teammate acknowledgment is not. Other rules' earned depth exits remain. |
| Support-test disposition | Initial job is now `read:*`, still zone-kind. The test also verifies the **same original run-fit movement command**. Expiry, recognition, replacement and physical movement assertions remain intact. |

This is not a fixed timer, universal vertical latch or forced post-catch delay.
The observed cap is fallible short-horizon geometry; it does not promise
whole-route help. Earned delivery remains terminal if help later leaves.
The legacy initial-position fallback for direct-man/emergency-man producers
and the existing on-demand teammate picture remain outside this repair. There
is no whole-engine information-clean claim.

**#95 stays separate.** The accepted `rat`/`robber` zone branch and rat-test
inventory are unchanged; no acquired shallow-cut policy is included. Its shared
optional entry interface is present here because #97/#100 independently need
it. A separate #95 review decision does not authorize importing that policy into
this composition. Accepted #105 spacing, blocking, stance and gap changes,
existing run-fit laws, physics, capabilities, speed/braking, hands, flags and
defaults remain byte-identical outside the protected coverage scope.

## Evidence, adverse cases and compatibility

**New current-source receipt: 64 existing focused checks pass** (10 provisional
block/entry, 20 release-cushion, 19 seam-delivery, 15 support), plus typecheck.
Question: does this exact composition preserve those contracts when linked to
accepted #105 dependencies? No new test policy or assertion is introduced.
The tests cover hidden-motion invariance with advancing snapshots, acquired
changes, genuine shallow/depth exchanges, stale/departing/down help, ongoing
movement state, support expiry and reachable recognized contests.

New commands cost **15.071 seconds** in sum (3.336 focused; 11.735 typecheck),
run concurrently. Patch/blob/application audit costs **0.260 seconds**. These
are command durations, not a summed elapsed wall-clock or new simulation bill.
**Zero new native-play executions, games, broad panels or full-suite runs.**
Local test-body movement remains accounted in the correctness checks.

Reuse [#97's published 82 focused/typecheck and native evidence](https://github.com/tannerthardy/football-simulation-/blob/1a52e6b51be6c33cbb50f07c25c2471c5a1e54f6/data/reviews/current/pass-defense-panel.json),
[#100's 159 focused/typecheck and staged/transfer evidence](https://github.com/tannerthardy/football-simulation-/blob/9f30428df552301ec25b51bade76ce4965d9fcda/data/reviews/current/release-delivery.json)
and the latter's embedded historical 64-check/three-native-control interaction
receipts. Those outcomes retain their exact old sources. The four coverage
files are unchanged between the old accepted host and current accepted develop,
but other shared setup/movement controllers changed: **historical football
outcomes are not current-source measurements**. The new 64 checks establish
only current composition correctness, not a new endpoint or statistical benefit.

Keep these findings visible in Run's decision:

- **#97 Drive, R1/R2-C06:** shallow YAC **3.15→6.92** and **1.57→10.03** when
  deeper responsibility costs shallow help. The completion is not automatically
  a bad decision.
- **#97 Cover3 seam, R2-C02:** **43.93→46.90** YAC with matching recorded
  approach/grasp geometry and different existing leg-placement/grip execution.
  Same seed and unchanged probability do not isolate execution draws.
- **#100 opposing Cover3, R1-C02:** Y's **4.21-YAC** catch becomes H's
  **25.31-YAC** seam catch. Final delivery improves the cushion-only arm's
  44.54-YAC no-contact TD; that does not establish that the accepted short
  completion was wrong.
- Broken-hold Slant/Flat explosives and delayed Smash contact remain. Historical
  R2-C02's same H catch improves contact **4.25→0.55 s** after catch and YAC
  **43.93→8.19**, with a surviving form rear wrap; this does not repair every
  rear grasp or certify general containment.
- Changed catchers, interceptions/returns and no-pass QB finishes stay separate.
  F4's 51.85-YAC catch becoming a QB run is not a zero-YAC catch or preserved
  offensive win. Unfinished prefixes are not completed endpoints.
- Original expected-red provisional checks, support-label/typecheck failures and
  F4 cyclic-recording failures remain in the linked records. No failure is
  silently relabeled as a passing combined result.

## Review handoff

Run receives the exact code commit, portable/ordered patches, explicit contract
map, existing independent adjudication, current focused receipt and preserved
adverse evidence. The author does not request another broad campaign. Any new
check should answer a specific remaining contract or composition risk.
Integration owns the preserved full verification on its exact eventual combined
candidate, followed by adoption under its existing authority. No merge, accepted
pin, flag/default change or #95 adoption is performed here.
