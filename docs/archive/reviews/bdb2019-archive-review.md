# 2019 Big Data Bowl archive verification

Inspected 2026-10-08. The newly supplied
[Drive file](https://drive.google.com/file/d/1x5Po8NAEgFfNQGHf0Dks-CToPxkoIU-I/view)
is `Big-Data-Bowl-master.zip`. It is a snapshot of the previously cataloged
[ryurko/Big-Data-Bowl](https://github.com/ryurko/Big-Data-Bowl) repository,
covering **2017 season weeks 1–6** for the **2019 competition**.

## Identity and integrity

- Archive size: **401,360,678 bytes**, about 401 MB compressed.
- Contents: **113 files**, totaling **2,484,171,322 bytes** uncompressed,
  including documentation and images.
- Dataset: **94 CSVs**, totaling **2,472,751,570 bytes**: games, players,
  plays, and **91 game-specific tracking files**.
- Enclosing directory: `Big-Data-Bowl-master/`.
- ZIP comment: `0dac66ce81e5fd22ca48f35ea6a637c523dda12b`, the pinned source commit.

Every CSV was streamed from the ZIP, checked against its expected byte size,
and hashed as a Git blob (`blob <size>\0<contents>`). All **94 of 94** match
the pinned source manifest. Streaming the members also validated their ZIP
CRC values. This confirms dataset identity; it does not constitute a tracking
quality audit for all games.

The new Drive URL is recorded under the existing `bdb2019-2017` source in
[sources.json](../../../data/sources.json). Do not count these games again when
combining downloads from GitHub and Drive.

## Summary reproduction

The unchanged `scripts/data/bdb2017.ts` extractor was run on the archive's
games/plays/players tables and `tracking_gameId_2017090700.csv`. Its output
equals the committed [2017 summary](../../../data/bdb2017-summary.json) as a
JSON object, including all values and sample counts.

That summary uses play-level data from 91 games, including 11,523 scrimmage
plays under the extractor's definitions. Its **tracking metrics use one game**.
The presence and checksum verification of 90 additional tracking files does
not expand those metrics automatically.

With Node 22 and repository dependencies installed, run from the checkout:

```sh
node --import tsx scripts/data/bdb2017.ts data/raw/bdb2019/Data out/bdb2017-summary.json
```

Place the archive's `Big-Data-Bowl-master/Data/` folder at the input path above,
or pass its actual extracted path. The `node --import tsx` invocation also works
in environments where the `tsx` CLI cannot create its local IPC socket.

## Value for the engine

This archive provides another reproducible access route to the same data,
rather than a new season or an independent validation cohort. Its principal
remaining opportunity is to extend the existing tracking extractor across more
games, then compare movement, pressure, run timing, and separation across
matchups. Record the analyzed game IDs, verify event/schema completeness,
and keep the 2017 cohort distinguishable from the later seasons.

Priorities from the [engine review](2026-10-08-engine-review.md) remain:
repair rules/accounting, align measurement definitions, and use conditional
diagnostics for blocking, coverage, and QB decisions. No calibration targets
or engine parameters were changed by this archive verification.

## Shared provenance

The small [ZIP manifest](../../../data/reviews/2026-10-08/bdb2019-archive-manifest.json)
and [verification record](../../../data/reviews/2026-10-08/bdb2019-archive-verification.json)
travel with the repository. Raw data remains outside the checkout. The
[collaborator guide](../../../data/archive/catalog-2026-10-11.md) documents access, extraction layout,
and the applicable source terms.

```text
SHA-256: 4cc73c4c22443736b750e9a0cca8cf3e8a25a44ceb6a6e853ca98563269089ca
```
