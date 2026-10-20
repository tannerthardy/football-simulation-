# Independent review: #156 formation, #157 QB count, #161 NFL navigation

2026-10-19 America/Phoenix. Independent Integration subagent review; not the
implementation author. Accepted base and fetched develop both equal
`f4146275ce7539816bf57b4ed55a0d2be10e48c7`. This is a review publication,
not a new accepted pin, runtime candidate, baseline or activation.

**ACCEPT #156 and #157's narrow runtime/direct-test extractions for Integration's
exact combined verification. ACCEPT #161 documentation.** Their runtime scopes
are independent. No source from #153, a data-only branch, an experimental
Physics default or unrelated contributor tracking files is required.

[Machine-readable scope, blob IDs and independent checks](../../data/reviews/current/latest-small-docs-independent-review.json).
The three incoming PR heads were freshly checked via GitHub; all match these
pins and no blocking discussion was present at review time.

| PR / decision | Exact reviewed publication | Smallest promotion scope |
| --- | --- | --- |
| [#156](https://github.com/tannerthardy/football-simulation-/pull/156) ACCEPT | `aacfce18865f345b59b96a192d2ed9064403853e`; code `d52c7aa781553ec4d48718ecf4b0ebf5f3fdc075` | `src/playbook/formations.ts`, `test/shotgun-rb-alignment.test.ts` |
| [#157](https://github.com/tannerthardy/football-simulation-/pull/157) ACCEPT | `495a2f279984b10f7cd8c20dae9b1c18b03d502b`; code `b242de8b29619a6f50cbdb65bedf5941ef32631b` | `src/sim/qbmind.ts` local blockers-count closure, `test/qb-installed-box-count.test.ts` |
| [#161](https://github.com/tannerthardy/football-simulation-/pull/161) ACCEPT docs | `b6e993392669fd0ebcea7e9329ca957eebd80569` | `docs/NFL_DATA.md`, `docs/reviews/nfl-agent-evidence-plan.md`, its JSON source inventory; reconcile historical workboard claim rather than copying it wholesale |

## #156: a representative formation correction

The seven generic offset-gun RB definitions move from lateral1.6/depth5.2 to
lateral2.3/depth5.5. The fixed QB depth remains5.0, so the back is nominally
.5yd behind the QB. Side, flips, hashes and backfield numbering remain coherent.
Empty, pistol, under-center, line/QB/receiver spots are byte-unchanged.

This **does change installed playbook geometry**. It is a routine formation-data
correction under the user's broad reviewed-integration scope, rather than a new
physical law, capability, feature activation or numerical speed calibration.
The representative split/stagger is supported by the saved NFL cohort;
it is not claimed as the only legal/valid shotgun alignment. Increased achieved
handoff speed is evidence about the changed runway, not its acceptance target.
Neither matching a desired handoff speed nor importing experimental mesh code
is necessary to justify the correction.

Reused all31 published formation/alignment/physical-transfer checks and the
source-identical typecheck. Independently verified four stored artifact hashes,
16/16 attempted intentional prefixes, three full-body/input-identical opposing
control pairs, and all recorded transfers' separation within unchanged reach.
The source/test/diagnostic publication matches the tested code commit.

**Preserved costs:** own-side IZ transfers .15s later and has only about.028yd
reach margin in the sampled body pair. The selected gun pass-protection prefix
contains no loaded RB contact; it certifies role retention, not blitz pickup.
All16 observations are censored prefixes, not successful play endings or league
coverage. The native stored speed and NFL rounded-position derivative are
separate operators. Do not claim the patch solves mesh scheduling or achieves
an NFL speed target. Original [report/evidence](https://github.com/tannerthardy/football-simulation-/blob/aacfce18865f345b59b96a192d2ed9064403853e/docs/reviews/shotgun-rb-alignment.md)
remains authoritative for those limits.

[Exact two-file patch](latest-small-docs-review/pr156-promotion.patch).
Its direct test checks the seven definitions and backfield/legality controls.
No diagnostic script is needed for production. Preserve the immutable report,
checks and paired prefixes via their existing published links.

## #157: count the installed fullback once

The accepted code tests a nonexistent installed `FB` slot and omits `F`.
Merely renaming the string would still omit a centered F under a strict side
test. The reviewed reduce closure correctly adds a backfield F once: half per
side when centered, one on the installed side when offset. Existing OL counts,
center weighting and inline handling remain; F with no backfield placement
does not receive speculative extra credit.

The change reads only the already-known installed own-team alignment. It adds
no opponent private state, perception capability, forced block win, audible
freedom, random call or numerical threshold. Existing source before and after
this closure is byte-identical to accepted develop. Its tests use zero World
steps to isolate count arithmetic while preserving authority/noise call counts,
valid side flips and genuine overload controls.

Reused six green primary checks and the two later side-credit controls;
independently verified all17 artifact-manifest entries. The corrected red
baseline has four failures/two passing controls. The initial invalid fixture
name and all adverse/failed evidence remain. Different validation hashes for
the six-test and two-test runs are explained by adding the two side tests;
the later run explicitly preserves six skipped/pending prior checks and is
not misrepresented as an eight-test full rerun.

**Preserved limits:** some I-form runs remain called against two extra threats
under the unchanged existing threshold; no resulting football improvement is
claimed. This arithmetic correction cannot explain the quoted free-LB lab
rate, whose collection disables audibles. Native ownership prefixes were
accepted-source evidence, not benefits of this new code. Ordinary Toss
technique, Bear extra defenders, joint receiver allocation and broader QB
information issues remain separate. Original [report/evidence](https://github.com/tannerthardy/football-simulation-/blob/495a2f279984b10f7cd8c20dae9b1c18b03d502b/docs/reviews/toss-box-accounting/README.md)
preserves those distinctions.

[Exact two-file patch](latest-small-docs-review/pr157-promotion.patch).
This is compatible with #156's different file/formation family. Future QBMind
edits must retain the existing receiver-forecast and acquisition interfaces.

## #161: useful source navigation without another testing bill

The NFL guide gains an entry to existing saved comparisons and removes its
unconditional before/after full-report instruction. The plan preserves the
standing marginal-cost rule: identify a decision, reuse a reference, inspect
native causes, use opposing/adverse evidence, expand only for a named unresolved
question. No root instructions, engine, tests, scripts, configs or feature flags
change. Source terms, missingness/censor/exposure counts, stable identities and
event/proxy limitations are explicit. The AMF material remains isolated research.

Independently verified all17 immutable source fingerprints and19 repository-local
Markdown targets across the three PRs. No NFL archive/download/query or shared
suite is required to adopt this source navigation. Operator extraction, if later
needed, still requires a narrow definition/identity/censor review; source
availability does not itself accept an experimental controller.

The historical local-presence inventory is correctly labeled and may remain
unchanged. However, subsequent [published access confirmation](https://github.com/tannerthardy/football-simulation-/pull/161#issuecomment-6278732246)
now identifies an existing verified data host and [#162's small evidence packet](https://github.com/tannerthardy/football-simulation-/tree/ed6ebd21911a28f07a085094c393ea2613abeb69/data/reviews/movement-continuity).
Use this [additive current-access note](latest-small-docs-review/pr161-current-access.patch)
when extracting the docs. It preserves the original snapshot and does not claim
the review host re-queried raw data. Current integration records should describe
this access handoff as available, rather than waiting for a fresh archive.
This does not approve #162's behavioral/Physics changes or certify the20-play
subset as a league reference. The future rollout bullets remain proposals,
not mandatory work or prerequisites for runtime adoption.

## Cost and next decision

New execution consisted only of Git/ref/blob/hash/JSON and documentation-link
checks, about1.53s for the final static validation pass, plus metadata reads and
fetching one original source commit missing from this checkout. Zero new tests,
engine ticks, native prefixes, NFL queries, archive downloads, labs or games.
Original contributor costs remain linked: #156 focused2.506s/native1.437s;
#157 total child-command17.954s including failed setup and diagnostics.

Integration can compose the two independent routine corrections with other
independently approved scopes at its next useful checkpoint, preserving exact
source boundaries. Check overlapping call/mesh/QBMind contracts before freezing
that actual combination; the old native prefixes must not be relabeled as
proof of changed combined-source trajectories. Run required combined verification
once under pinned accepted settings (`RUN_CONTACT_COMPONENTS=1`, GAIT_STEP=0 in
these author receipts); this review does not enable GAIT_STEP or experimental
mesh. Documentation needs only its link/data checks. No extra user approval is
needed for these two routine corrections within existing authority. Root owns
the final composition, verification, adoption and accepted-pin update.
