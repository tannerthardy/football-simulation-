# PR #265 original evidence transfer

Evidence-only branch. Do not merge this data into develop or the code PR.
User authorized this transfer of existing simulation evidence to repository readers.
No recollection, engine change, new verification campaign, or evidence relabeling.

Original producer: cac9e1000b27e9222d47a23db6ebdf65eaac25f9
Collector publication: a64146a3d56a5404ff9e13d68ae0336c6eb9a1c3
Engine SHA256: 11d1feb1a23b0745c594eebf9e21553b3e14a05d47f0006448418d267efdcca2
Node: v22.23.3
All resolved settings and native constructor input hashes are inside index.json,
events.json and each saved play.bin / trace. No credentials or unrelated files included.

## Retrieve existing files

From any checkout with repository read access, fetch this archive branch:
```sh
git fetch origin evidence/pr265-original-captures
mkdir -p out/pr265-transfer
for part in 0 1 2 3; do
  git show 13c9a3525e78689f9538aad48106e0c7c4c78efb:artifacts/pr265/paired-scout-original-files.tar.xz.b64.part$part > out/pr265-transfer/part$part
done
python3 - <<'PY'
import base64,hashlib,pathlib
p=pathlib.Path('out/pr265-transfer')
data=base64.b64decode(b''.join((p/('part'+str(i))).read_bytes() for i in range(4)),validate=False)
assert hashlib.sha256(data).hexdigest()=='6d882d1d217ba98c780a3acfde6eb9b55e8d66b0420992e588fd093dc51a839a'
(p/'original-files.tar.xz').write_bytes(data)
PY
tar -xJf out/pr265-transfer/original-files.tar.xz -C out/pr265-transfer
python3 - <<'PY'
import pathlib,json,hashlib
p=pathlib.Path('out/pr265-transfer/paired-scout')
for name,expected in json.loads((p/'manifest.json').read_text()).items():
    assert hashlib.sha256((p/name).read_bytes()).hexdigest()==expected,name
print('Every original evidence file verified')
PY
```

The four published text parts were fetched back and compared byte-for-byte
against the local encoded stream. Tar contents were compared byte-for-byte
against every original ZIP entry. Only transport packaging changed.

Original ZIP: 8,516,863 bytes; SHA256
baf0838450935f327d4aa3d7391bda9396520827afa680c92f3d47544493ea67.
Lossless tar.xz transfer: 2,585,456 bytes; SHA256
6d882d1d217ba98c780a3acfde6eb9b55e8d66b0420992e588fd093dc51a839a.
The original ZIP remains unchanged in the originating workspace.

## Film and selected trace

Open paired-scout/review.md, then the relative original.html links.
Existing viewer Copy reference / Export clip controls remain available.
The seven play folders include exact constructor inputs, original film,
eight selected traces, two early controls, settings, notes and logs.

In a separate clean source checkout at cac9e1000b27e9222d47a23db6ebdf65eaac25f9,
use Node22.23.3 and npm ci; place the unpacked paired-scout folder in ignored out/.
Then regenerate only a selected trace (not the game prefix):
```sh
node --import tsx scripts/diag/command-trace.ts --capture out/paired-scout/G1-P006/play.bin --actor O:Y --from 2.5 --to 4 --out out/pr265-trace.json
```
The existing command checks source/settings/Node/lockfile and full restoration.
If using a newer source, preserve the mismatch rather than claiming exact restoration.

## Limits / missing evidence

This transfers the new seed7, 24-step sample: eight alerts, four scouts, seven plays.
It does not recover the absent historical #262 recordings or change those18 labels.
The first-pass review and its uncertainty are unchanged. The code PR remains draft;
polished queue integration and fuller football adjudication remain unfinished.
Measurin's #255 originals are not included; that handoff belongs to its source owner.
