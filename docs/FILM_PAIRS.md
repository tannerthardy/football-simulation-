# Matched snap film pairs

Run with Node22.23.3 and lockfile dependencies:

```sh
node --import tsx scripts/film-pairs.ts --base <git-ref> --head <git-ref> \
  --plays out/selection.json --out out/film-pairs/review-name
```

This is a pair picker, not another recorder or an automatic blocking grade.
It imports the existing constructor capture/restoration and complete-execution
comparison contracts. Existing trace/ledger/runner-observer output is unchanged.

The selection file declares its format and capture source. References are pinned
to commit SHAs before work. With `captureRef` omitted, capture happens on `--base`.

```json
{
  "format": "film-pairs-v1",
  "captureRef": "develop",
  "sources": {
    "saved-clip": { "path": "saved/play.bin", "sha256": "<capture-file SHA256>" }
  },
  "plays": [
    "saved-clip",
    { "id": "seed7-game1-play2", "seed": 7, "game": 1, "play": 2,
      "note": "Compare the opening step." }
  ]
}
```

Alternatively put `path`/optional `sha256` directly in a play entry. Paths resolve
relative to this selection file. Saved IDs must resolve to a `constructor-play-v1`
binary; IDs are never looked up by ordinal in an unrelated recording. A film-pack
producer can supply its exact captured paths/hashes through `sources`. This
versioned adapter does not assume or modify the film-pack owner's manifest.

Triples use the existing film-room recipe: teams generated once from `seed`,
Ironmen/Comets at strength0.55; independent game number `game` uses seed
`seed + game - 1`. `play` is the one-based game-log index, including kicks.
Only the declared capture ref runs that prefix. Multiple selected snaps in the
same seed/game share a single prefix. A kickoff, nonrecorded entry or capture
limit is an error, never a replacement snap. `maxSteps` can explicitly bound
an entry's prefix; default is play+20. This is not scorecard `sc7/` numbering.

Both refs get separate detached worktrees under the ignored output directory.
The caller's checkout/branch is untouched. Equal lockfiles reuse installed
packages; different lockfiles get their own `npm ci`. Before either replay,
both workers check the capture bytes, serialized setup hash, raw advanced RNG
and full personnel identities, known-class restoration and PlaySetup declaration
compatibility. A changed declaration is conservatively rejected, even when an
optional-field change could be compatible: supply an explicit reviewed conversion
outside this tool rather than silently drop fields. Recorded Node must match.

An unchanged capture-source engine/settings/lockfile must reproduce the saved
original execution. All other comparisons run the same constructor once per
arm. No commands, live-player state or later observations are transplanted.
Initialization differences are reported at initialization, not hidden as a later
frame difference. First differences can also be recorded frames/events/telemetry
or result-end facts. They are not proof of the first unrecorded causal substep.

Open `index.html`. It contains both films on one timeline, play notes, source
labels and result/contact/tackle rows. You can step sample times or jump to the
first recorded difference. Each side holds its own last sample after ending and
says so; there is no invented continuation or positional interpolation.
First contact means the earliest recorded carrier_contact/tackle_wrap/hit/sack
event, not an inferred NFL first-contact measure. Missing contact is unknown.
The whole self-contained batch must be below15MB or generation fails.
Use **Download this viewer** to save the file. Publish it via the film-pack
owner's authorized artifact channel; a local output path is not remote delivery.

`batch.json` records pins, selection/input and arm provenance, summaries and
first differences. `noChange` means byte-identical complete recorded values in
`film-pairs-lossless-values-v1`, not raw V8 allocation bytes. The deterministic
encoding preserves absent versus undefined, array holes, negative zero,
nonfinite values and Map/Set contents. Recorded reference values also retain
ArrayBuffer bytes, DataView visible bytes and Date epoch milliseconds (including
an invalid Date's NaN timestamp). A DataView's offset and bytes outside its range
are backing allocation, not its recorded value, matching the existing typed-array
value semantics. This does not extend the constructor's allowed PlaySetup types;
its prototype whitelist is unchanged. Ordinary v1 encoding bytes are unchanged.
Original constructor V8 bytes remain unchanged and checksum-verified.
Before/after value digests are included.
Artifacts under out/ are evidence, not committed fixtures or population claims.
A completed batch cannot be overwritten; choose another output directory.
Owned worktrees are removed normally after completion/failure, never forcibly.

## Shared-file handoff (pending)

The film-pack owner owns package.json and docs/VALIDATION.md during this work.
The exact npm entry to integrate is:

```json
"film-pairs": "node --import tsx scripts/film-pairs.ts"
```

Suggested section next to the film-pack notes in docs/VALIDATION.md:

> ### Before/after pairs from one saved snap
>
> `npm run film-pairs -- --base <ref> --head <ref> --plays out/selection.json --out out/film-pairs/name`
> captures once on the declared source and replays the identical constructor on
> both pinned refs. Saved IDs resolve through exact paths/hashes; seed/game/play
> triples use film-room numbering, not scorecard IDs. See [FILM_PAIRS](FILM_PAIRS.md)
> for the versioned input, compatibility checks and measurement limits. Open the
> standalone index.html for synced playback and first recorded differences.
> Keep generated inputs/films in ignored out/ and deliver them through the film-pack
> artifact channel. Same-ref pairs must say no change; whole-game comparisons do
> not replace these paired snapshots.

The npm command is not complete until that owning-lane integration is verified.
