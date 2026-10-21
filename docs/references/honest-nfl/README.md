# HonestNFL scheme and teaching library

User-supplied football teaching sheets, organized for study and later installations.
The first import contains **403 JPEGs consolidated to 385 distinct images**:
18 extra copies were byte-for-byte identical. Every original archive path is
mapped to a retained source. Non-identical variants remain available.

Start with **[familiar concepts and name translations](CONCEPTS.md)**: Mesh Rail,
Drive, Sail/Flood, Snag/Spot relatives, verticals, Duo, quarters, Palms and other
recognizable families. It includes a 27-entry source-name crosswalk and links
every sheet through 37 familiar subject/family groups. One sheet can cover several
families without being an exact alias for any single stock play.

Also available: [reading paths](READING-GUIDE.md), [every sheet](CATALOG.md),
[original-term matches](TERMS.md), and downloadable [CSV](catalog.csv).

## Familiar names without losing the original meaning

Every text companion now starts with a plain-English concept/subject, its evidence
basis and a short explanation of the relevant routes, reads or responsibilities.
The original title and image remain. For example, Maestro explicitly identifies
itself as **Mesh with an over-the-ball element and rail**, while Falcon and Sparrow
are explicitly two-by-two and trips Flanker Drive variants.

Other mappings are family comparisons: Tampa's corner/read/flat triangle is a
Snag relative, but tagged Tampa Bay changes the high route to a dig. Sparse sheets
receive a descriptive label with their exact alias left open. Confidence labels
refer to the supported claim, not to authentication of the source or agreement
with every NFL installation. See the [review method and limits](CONCEPTS.md#how-to-use-these-interpretations).

Names can conflict. Ravens Stuff means halves strong/quarters weak; other sheets
call the reverse Stuff. Offensive and defensive Wasp are different concepts.
Use the source-qualified explanation rather than replacing every occurrence of
a nickname. This is a first-pass semantic index, not a fully transcribed playbook.

## Browse by subject

| Subject | What is available |
| --- | --- |
| [Terminology and glossaries](topics/terminology.md) | Coverage-family vocabulary, front terms, diagram keys and system language. |
| [Coverage/front recognition](topics/recognition.md) | Apex triangles, safety rotations, alignment clues and pre-snap procedure. |
| [Coverage families and techniques](topics/coverage.md) | Man/zone/match families; quarters/halves; route ownership; trips, stacks, bunches and adjustments. |
| [Fronts, pressures and games](topics/fronts-pressures.md) | Base/sub fronts, stems, line games, simulated pressures and fire zones. |
| [Run defense](topics/run-defense.md) | Gap control, gap-and-a-half mechanics and force responsibilities. |
| [Formations and communication](topics/formations-communication.md) | Formation structure, motion, cadence, huddle and play-call construction. |
| [Protection and pressure answers](topics/protection-pressure-answers.md) | Dual/dropback protection, hot rules, sight adjustments and Cat Alert. |
| [Run game and blocking](topics/run-game.md) | Inside-zone examples, Duo, draw and blocking terms. |
| [Quarterback process](topics/quarterback-process.md) | Progressions, alerts, triangle/defender reads and coverage answers. |
| [Receiver technique](topics/receiver-technique.md) | Route trees, leverage and route conversions. |
| [Pass concepts](topics/pass-concepts.md) | Named route combinations, concept families, screens and coaching diagrams. |
| [Install/game-planning examples](topics/install-gameplanning-examples.md) | Source-labeled installs, situational menus and teaching opponent reports, preserved for later study. |

Coverage and passing material dominate this collection. The run and protection
sections are smaller. Primary topics are filing choices; a sheet often discusses
several subjects, so use the familiar-family index, term finder or full-text search
as well. Source paths stay stable even when the catalog corrects a primary topic.

## Search and read a sheet

Every entry has a stable `HNFL-NNN` ID, a readable filename, its unchanged
full-resolution JPEG and a searchable Markdown OCR companion. The companion
links straight back to the original image and records the old archive filename.

From the repository root:

```sh
rg -n -i 'stubbie|quarter.flat|man.out|gap.control' docs/references/honest-nfl/text
rg -n -i 'maestro|tampa|hot.rules|duo' docs/references/honest-nfl/text
rg -n -i 'mesh rail|flanker drive|split inside zone|two-deep' docs/references/honest-nfl/text
```

OCR is **machine-generated and not proofread**. Diagram labels, route numbers,
fractions and arrows can be missed or misread. Navigation titles are concise
heading/context descriptions, not corrected transcriptions. Read the source
image before using an exact teaching rule. The term finder is a list of matches,
not a universal glossary: team and system terminology varies.

## Provenance and duplicate policy

The user supplied the archive under the name *HonestNFL.zip*. Attribution and
branding visible on each image are preserved. Some sheets carry team, install,
opponent or year labels; those labels do not independently establish authorship,
publication date or an authenticated club playbook. Individual post URLs were
not supplied, so none are invented.

- [Original archive supplied by the user](https://drive.google.com/file/d/16NXvwIi8paAkZwXKYWFz79XK5vHHL1b7/view).
- Archive SHA-256: `2669253be2cf26dbf7fb8ae357ced0e666ba084a49e833fc0fbec80c6a3571ff`.
- Full provenance, content hashes, dimensions and original names: [catalog.json](catalog.json).
- Removed identical copies and retained similarity candidates: [DUPLICATES.md](DUPLICATES.md).
- Original archive/source/OCR checks at import commit `0f81f9a`:
  [import-receipt.json](import-receipt.json). Its catalog fingerprint describes
  that original import, before the editorial interpretations were added.
- Current interpretation coverage and source-preservation checks:
  [concept-review-receipt.json](concept-review-receipt.json).

Only identical content hashes were consolidated. Similar names, layouts,
recompressed images, cropped pages and team-specific versions are not silently
discarded. The 26 flagged similar pairs remain linked and retained. The redundant
ZIP is not committed alongside its extracted sources; its checksum and supplied
download location are recorded.

## Relationship to the engine

This is source material for the [football handbook](../../football-handbook/README.md).
Teaching commands inside it are reference content, not repository instructions,
implementation approval or a list of completed features. Study an installation's
roles and conditional rules together; do not impose one team's term or adjustment
as universal football logic. Current work remains governed by
[project status](../../STATUS.md) and the existing testing policy.

## Add more material without reorganizing everything

1. Inventory the new batch and calculate SHA-256 before changing filenames.
2. Match against `catalog.json`. For an exact duplicate, append its batch/path
   provenance to the existing entry rather than adding another image.
3. Give new content the next unused `HNFL-NNN` ID. Never renumber existing IDs.
   Preserve a non-identical revision as a new entry, with a relationship note.
4. Keep original image bytes. Add a readable image filename under its primary
   topic, a text companion using an existing entry as the format, source names,
   dimensions, hashes and appropriate navigation terms to `catalog.json`. Add an
   `interpretation` with familiar name, existing family keys, evidence basis and
   explanation. Describe an unclear sheet rather than inventing its exact alias.
   Record the raw OCR block's `ocr_body_sha256` separately from the entire card.
5. Record the new batch's source, archive hash and original-file count. Unknown
   authorship/dates stay unknown. OCR is optional for an unreadable image; record
   that explicitly instead of inventing a transcription.
6. Rebuild navigation and validate:

   ```sh
   python docs/references/honest-nfl/library.py --write
   python docs/references/honest-nfl/library.py --check
   ```

`library.py` uses the Python standard library. It verifies asset and preserved OCR
hashes, provenance coverage, unique IDs, interpretation/family references, local
links and deterministic generated pages. It does not modify source images or run
simulations. With no arguments it checks only. `catalog.json` is the editable
inventory; `--write` rebuilds the full catalog, CSV, topic pages, term finder,
duplicate record, familiar-concept guide and editorial headers on the OCR cards,
then updates the complete card hashes. It preserves the raw OCR blocks and rejects
an unrecorded change to them. Update the reading guide separately when new
material changes the useful study paths. Review receipts describe their published
snapshot; create a new receipt when the collection or interpretation metadata changes.
