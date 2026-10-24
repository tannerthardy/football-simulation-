# Ordinary seed53 diagnosis: artifact transfer

Evidence only. Do not merge this archive branch into develop or any code PR.
The older artifacts/pr265 files remain unchanged.

Read [the diagnosis](review.md) and [the concrete owner experiment](owner-handoff.md).
The single binary archive contains the six selected exact constructors/films,
source/settings/actors, frozen pre-detector first pass, native selected traces,
small arithmetic/free-motor checks, nine detector nominations and TWO short clips.

## Retrieve from another workspace

```sh
git fetch origin evidence/pr265-original-captures
mkdir -p out
git show FETCH_HEAD:artifacts/ordinary53/ordinary53.tar.xz > out/ordinary53.tar.xz
sha256sum out/ordinary53.tar.xz
tar -xJf out/ordinary53.tar.xz -C out
python3 - <<'PYCODE'
import json,hashlib,pathlib
p=pathlib.Path('out/ordinary53')
for name,expected in json.loads((p/'manifest.json').read_text()).items():
    assert hashlib.sha256((p/name).read_bytes()).hexdigest()==expected,name
print('All original file checksums verified')
PYCODE
```

Archive SHA256: `07035b5f8ede618530ea819eecddfea6890b77b8e35136fb96e93b5a90fe89fc`; 4487156 bytes. A handoff comment pins the immutable
publication commit; use it instead of FETCH_HEAD for immutable retrieval.
No base64 decoding or reconstruction from PR comments is needed.

Then read out/ordinary53/README.md. For exact constructor replay use a separate
source checkout at50b80062815716b902438f9a7fa227535a255ea0, Node22.23.3 and npm ci.
The original team RNG seed53 and game seed53 have distinct roles; six per-play
seeds and setup hashes are recorded. No historical restoration is implied.

Primary result: P007's stationary QB counts4/5 safe lanes using constant-speed
self arrival; even generous existing full-effort acceleration leaves0/5 at the
same criterion. The information-only comparison still counts4/5 and is retained.
No policy changes, tuning, new detectors, merge or new baseline.
