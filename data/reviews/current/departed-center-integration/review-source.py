"""Offline source/evidence review. No engine import, World steps or network.

python data/reviews/current/departed-center-integration/review-source.py \
  /path/to/checkout-of-badddf4 /path/to/review.json
Run within a clone containing the pinned git objects.
"""
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import time

began = time.perf_counter()
root, output = Path(sys.argv[1]), Path(sys.argv[2])
base = root / 'docs/reviews/spread-air-lanes'
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(p.read_bytes())
gitbytes = lambda pin, path: subprocess.check_output(['git', 'show', pin + ':' + path])
accepted = 'a1b16e666a9ee7d1bc1d2aecba141fc535863b24'
code = '73b94412d1bb9cf6b0e4beb6e59c7aec466e5eee'
evidence = 'badddf495fa9ff7cfa6579709dec853dc449974e'
recorded = 'f62511a513f2187884d74ae3b94435835e43309c'
subprocess.run(['git', 'merge-base', '--is-ancestor', code, evidence], check=True)
assert subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip() == evidence
manifest = read(base / 'artifacts.json')
for row in manifest['artifacts']:
    raw = (base / row['path']).read_bytes()
    assert len(raw) == row['bytes'] and sha(raw) == row['sha256'], row['path']
for row in manifest['tools']:
    assert sha((root / row['path']).read_bytes()) == row['sha256'], row['path']

def source_hash(pin, replacement=None):
    archive = subprocess.check_output(['git', 'archive', pin, 'src'])
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        files = {m.name: tar.extractfile(m).read() for m in tar if m.isfile()}
    if replacement is not None:
        files['src/sim/live-gaps.ts'] = replacement
    h = hashlib.sha256()
    for path, content in sorted(files.items()):
        h.update(path.encode() + b'\0' + content + b'\0')
    return h.hexdigest()

original_gap = gitbytes(accepted, 'src/sim/live-gaps.ts')
assert original_gap == gitbytes(recorded, 'src/sim/live-gaps.ts')
assert original_gap == gitbytes(code + '^', 'src/sim/live-gaps.ts')
fixed_gap = gitbytes(code, 'src/sim/live-gaps.ts')
insertion = (b'    // The center is already the origin of the gap count. His departure\n'
             b'    // cannot insert another outward boundary and rename B as A.\n'
             b"    if (g.agent.slot === 'C') continue;\n")
assert fixed_gap == original_gap.replace(b'  for (const g of gone) {\n', b'  for (const g of gone) {\n' + insertion)
intervention = (base / 'evidence/intervention-live-gaps.ts.txt').read_bytes()
assert intervention == fixed_gap.replace(b"g.agent.slot === 'C'", b"g.agent.slot === 'C' && globalThis.__gapCorrectionCases?.has(sim)")
summary = read(base / 'summary.json')
assert source_hash(recorded) == summary['recordedSource']
assert source_hash(code) == summary['candidateSource']
assert source_hash(recorded, fixed_gap) == summary['isolatedAlwaysOnSource']
assert source_hash(recorded, intervention) == summary['pairedInterventionSource']

old = json.loads(gzip.decompress((base / 'evidence/p033-prefix.json.gz').read_bytes()))
new = json.loads(gzip.decompress((base / 'evidence/p033-paired-candidate.json.gz').read_bytes()))
assert old['nativeMatches'] and old['matchedEntries'] == 33
assert new['earlierPrefixMatches'] and new['matchedEntries'] == 32
assert old['selected']['input'] == new['selected']['input']
assert old['flags'] == new['flags'] == summary['flags']
assert old['worldDefaults'] == new['worldDefaults'] == summary['worldDefaults']
assert len(old['flags']) == 44 and old['flags']['RUN_CONTACT_COMPONENTS'] == '1'
prior, first = 0, None
for a, b in zip(old['selected']['frames'], new['selected']['frames']):
    if a['raw'] != b['raw'] or a['final'] != b['final']:
        first = {'t': a['t'], 'sameBodies': a['before'] == b['before'],
                 'sameJoints': a['joints'] == b['joints'],
                 'actors': [i for i in range(22) if a['raw'][i] != b['raw'][i] or a['final'][i] != b['final'][i]]}
        break
    assert a['before'] == b['before'] and a['after'] == b['after'] and a['joints'] == b['joints']
    prior += 1
assert first == {'t': 2.2, 'sameBodies': True, 'sameJoints': True, 'actors': [6]}
native_raw = gitbytes('4ae667e29b3ce085f43c5cb911b294349cda2b8f', 'data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz')
assert sha(native_raw) == old['nativeGameSha256']
native = json.loads(gzip.decompress(native_raw))['log'][32]
without_telemetry = lambda r: {k: v for k, v in r.items() if k != 'telemetry'}
assert without_telemetry(old['selected']['replay']) == without_telemetry(native['replay'])

spec = importlib.util.spec_from_file_location('codec', root / 'scripts/diag/wz-flow-evidence.py')
codec = importlib.util.module_from_spec(spec)
spec.loader.exec_module(codec)
def decode(path):
    wrapped = json.loads(gzip.decompress(path.read_bytes()))
    result = codec.unpack(wrapped['data'])
    assert sha(codec.compact(result)) == wrapped['retainedJsonSha256']
    return result
after = decode(base / 'coupled.jsonrefs.gz')['captures']['departed-center']['data']
before = decode(root / 'docs/reviews/run-lanes/evidence/final.jsonrefs.gz')['captures']['candidate-interior']['data']
controls = []
for a in after['panel']:
    b = next(b for b in before['panel'] if b['input']['id'] == a['input']['id'])
    assert a['hashes'] == b['hashes'] and a['informationHashes'] == b['informationHashes']
    controls.append({'id': a['input']['id'], 'stateHashes': len(a['hashes']), 'informationHashes': len(a['informationHashes'])})
assert len(controls) == 2
fixture = read(root / 'test/fixtures/p033-gap-decision.json')
assert fixture['prefixSha256'] == sha((base / 'evidence/p033-prefix.json.gz').read_bytes())
result = {'schema': 'departed-center-source-review-v1', 'sourceCommit': code, 'evidenceCommit': evidence,
          'acceptedParent': accepted, 'artifactsChecked': len(manifest['artifacts']), 'toolsChecked': len(manifest['tools']),
          'productionChangeExactlyThreeLineInsertion': True, 'originalGapBytesMatchAcceptedAndRecorded': True,
          'allFourSourceHashesMatch': True, 'nativeOriginalP033ReplayMatches': True,
          'pairedInitializationMatches': True, 'identicalPriorOuterSteps': prior, 'firstDivergence': first,
          'unchangedCoupledControls': controls, 'scopeOfControls': 'Author run-lanes source, not exact accepted integration tree.',
          'pairedOutcome': summary['pairedP033'], 'newSimulations': 0,
          'elapsedSeconds': time.perf_counter() - began}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'pairedOutcome'}))
