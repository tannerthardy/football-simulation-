# Selected film inputs

New `npm run film-pack -- --seed 101 --games 12 --out out/film-pack/review`
builds also retain `inputs/` alongside the unchanged film selection and clips.
Keep the entire pack private and in ignored `out/`; nothing is uploaded.

Selection depends on the completed games. The builder therefore runs a second,
bounded prefix for each selected game, stopping after its last selected log
entry. It copies **only selected** scrimmage constructors through the existing
`playSetup` / `captureSetup` hooks (#254), including actual fatigue, scouting,
personnel and random state. The original game is not resumed or altered.
This costs another prefix per selected game; it does not capture every play.

Each recaptured play must match its entire original persisted JSON clip,
including frames and replay events. Engine hash, settings, Node, lockfile and
canonical roster/call-mode input identity must match before capture. A changed
source cannot silently replace historical evidence. This clip comparison is
limited to the existing packed/rounded recording, not a proof that every
unrecorded native value was identical in the first game.

`inputs/index.json` records both the original manifest/source and actual capture
source, raw clip hashes, requested/captured/unavailable counts and per-play
status. No different play is substituted for a prevented, missing, unsupported
or mismatching entry. Any unavailable entry makes the command fail; partial
evidence remains in the index. Nullified native executions can be saved when
explicitly selected, with nullification preserved; the ordinary film sampler
continues to exclude them. A prevented snap has no executed play to restore.

The `.bin` files use the existing `constructor-play-v1` SavedPlay format, with
the complete native initial/result/replay reference retained **before** official
bookkeeping. `inputs/selection.json` is an existing `film-pairs-v1` saved-path
selector with file hashes, so F2 consumes these exact inputs without replaying
a whole game to find them:

```sh
npm run film-pairs -- --base <base> --head <head> \
  --plays out/film-pack/review/inputs/selection.json --out out/film-pairs/review
node --import tsx scripts/diag/command-trace.ts \
  --capture out/film-pack/review/inputs/G1-P002.bin --actor O:RB --from 0 --to 1 \
  --out out/film-pack/review/selected-trace.json
```

Use an actually listed ID. Existing SavedPlay consumers verify independent
restoration against the complete native reference before claiming reproduction.
The sidecar producer verifies the stored clip; it does not claim every exported
input has already been independently replayed. Binaries retain their own hashes;
equal V8 values need not have allocation-independent binary encodings.

Legacy packs without `inputs/` still work as films. On their original compatible
engine/settings, inputs can be added without changing any existing pack bytes:

```sh
node --import tsx scripts/film-pack-inputs.ts out/film-pack/review
```

Use a fresh sidecar directory: an existing `inputs/` is never overwritten. This
does not recover unavailable historical constructors on newer code, create a
mid-play checkpoint or authorize any public/private upload.
