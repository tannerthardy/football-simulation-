"""Independent byte/evidence review and exact post-dependency composition.

No simulations or candidate branch changes. Ignored source-only hosts support
a specifically bounded policy/alley interaction check if still needed.
"""
import gzip
import hashlib
import io
import json
import os
import subprocess
import tarfile
import time
from pathlib import Path

start = time.perf_counter()
BASE = '9adb7b3f730c5637e5a6547f9bc151a17ce301b2'
HEAD = '9760de031cae3bda7c926735f8edeb97fa4574e5'
EXECUTED = '52518bebea74e8668f6b3c0628f3a3a1e5253008'
ROOT = Path('out/pr87-policy-review')
ROOT.mkdir(parents=True, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
show = lambda pin, p: subprocess.check_output(['git', 'show', pin + ':' + p])
read = lambda pin, p: json.loads(show(pin, p))
files = lambda pin, *p: subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', pin, *p]).decode().splitlines()
source = lambda pin: sha(b''.join(p.encode() + b'\0' + show(pin, p) + b'\0' for p in sorted(files(pin, 'src'))))

packet = 'data/reviews/current/mesh-traffic-controller/'
manifest = read(HEAD, packet + 'artifacts.json')
entries = manifest.get('files', manifest.get('payloads', manifest))
if isinstance(entries, list):
    entries = {r['path']: r for r in entries}
verified = []
for path, record in entries.items():
    if not isinstance(record, dict) or 'sha256' not in record:
        continue
    p = path if path.startswith('data/') else packet + path
    data = show(HEAD, p)
    assert sha(data) == record['sha256']
    if 'bytes' in record:
        assert len(data) == record['bytes']
    verified.append(p)
assert not subprocess.check_output(['git', 'diff', '--name-only', HEAD, EXECUTED, '--', 'src', 'test']).strip()
assert source(HEAD) == '8ec3ac755d1ff2ca64eb3482244c25a96c1247dee0c4aa971d950601b6baf2b3'
assert source(BASE) == '6532e6d26190d7a42b970307c5699e7920dfd5302cd3712a03c707761e2e1259'

# An independent temporary index composes only the advertised seven-file patch.
patch = show(HEAD, packet + 'traffic-controller.patch')
patch_path = ROOT / 'traffic-controller.patch'
patch_path.write_bytes(patch)
index = ROOT.resolve() / 'composition.index'
if index.exists():
    index.unlink()
environment = {**os.environ, 'GIT_INDEX_FILE': str(index)}
subprocess.run(['git', 'read-tree', BASE], env=environment, check=True)
subprocess.run(['git', 'apply', '--cached', '--check', str(patch_path)], env=environment, check=True)
subprocess.run(['git', 'apply', '--cached', str(patch_path)], env=environment, check=True)
tree = subprocess.check_output(['git', 'write-tree'], env=environment).decode().strip()
changed = subprocess.check_output(['git', 'diff', '--name-only', BASE, tree]).decode().splitlines()
expected = sorted(['src/sim/behaviors/common.ts', 'src/sim/behaviors/defense.ts', 'src/sim/catch-approach.ts',
    'src/sim/movement-objective.ts', 'src/sim/spacing.ts', 'test/traffic-step.test.ts', 'test/fixtures/traffic-step.json.gz'])
assert changed == expected
for p in changed:
    assert show(tree, p) == show(HEAD, p)
for p in ['src/sim/run-fits.ts', 'src/sim/behaviors/blocking.ts']:
    assert show(tree, p) == show(BASE, p)
assert not subprocess.check_output(['git', 'diff', '--name-only', BASE, tree, '--', 'src/physics', 'config', 'package-lock.json']).strip()

# The settled-line proof text is retained exactly apart from return value.
def proof(pin):
    text = show(pin, 'src/sim/spacing.ts').decode()
    a = text.index('  const settled=')
    b = text.index('}))return ', a)
    return text[a:b]
assert proof(BASE) == proof(tree)

captures = {}
for arm in ['reference', 'candidate']:
    for case in ['A044', 'A008']:
        captures[(arm, case)] = json.loads(gzip.decompress(show(HEAD, packet + arm + '/' + case + '.json.gz')))
comparisons = []
for case in ['A044', 'A008']:
    old, new = captures['reference', case], captures['candidate', case]
    assert old['setupSha256'] == new['setupSha256']
    assert old['provenance']['flags'] == new['provenance']['flags']
    assert old['provenance']['worldDefaults'] == new['provenance']['worldDefaults']
    assert old['provenance']['node'] == new['provenance']['node'] == 'v22.23.3'
    assert old['ticks'][0]['inputs'] == new['ticks'][0]['inputs']
    # New metadata is present before any movement changes. Do not call the
    # mere recorded symbol/objective difference a physical/controller fork.
    first = next((a['t'] for a, b in zip(old['ticks'], new['ticks'])
                  if a['commands'] != b['commands'] or a['agents'] != b['agents']
                  or any(x['body'] != y['body'] or x.get('raw', {}).get('command') != y.get('raw', {}).get('command')
                         for x, y in zip(a['inputs'], b['inputs']))), None)
    def contacts(r):
        return [{'t': t['t'], **c} for t in r['ticks'] for c in t['contacts'] if c['i'] in [15, 21] or c['j'] in [15, 21]]
    primary = [10] if case == 'A044' else [7, 19]
    through = 2.90 if case == 'A044' else 3.4
    exact = {str(i): all(a['inputs'][i]['body'] == b['inputs'][i]['body'] and a['inputs'][i]['command'] == b['inputs'][i]['command']
                        for a, b in zip(old['ticks'], new['ticks']) if a['t'] <= through) for i in primary}
    assert all(exact.values())
    if case == 'A008':
        assert old['events'] == new['events'] and old['rng'] == new['rng']
    comparisons.append({'case': case, 'firstRequestPhysicalDifference': first, 'primaryExactThrough': through,
        'primaryBodiesCommandsExact': exact, 'referenceContacts15or21': contacts(old), 'candidateContacts15or21': contacts(new),
        'eventsEqual': old['events'] == new['events'], 'finalRngEqual': old['rng'] == new['rng'],
        'candidatePhase': new['phase'], 'candidateStoppedAt': new['stoppedAt']})

# Hosts import only exact source; existing focused receipts are reused, not rerun.
for arm, pin in [('reference', BASE), ('candidate', tree)]:
    host = ROOT / 'hosts' / arm
    host.mkdir(parents=True, exist_ok=True)
    data = subprocess.check_output(['git', 'archive', pin, 'src', 'package.json', 'package-lock.json', 'config/baseline.json'])
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        archive.extractall(host, filter='data')
    modules = host / 'node_modules'
    if not modules.exists():
        modules.symlink_to('/workspace/football-simulation-/node_modules', target_is_directory=True)
(ROOT / 'traffic-step.json.gz').write_bytes(show(HEAD, 'test/fixtures/traffic-step.json.gz'))

# Reuse one existing #89 Ace setup for an optional, explicitly bounded pair.
original_archive = show('ebef199a3986b2749e5c8c86921cfd6c7e42b2b4', 'accepted-7eb2554-48snap-v1.tar.gz')
assert sha(original_archive) == '60c4d4af04713583c19a59224831d9e89a48011cd4affaebd891cfe1e35f0919'
with tarfile.open(fileobj=io.BytesIO(original_archive)) as archive:
    raw_bytes = archive.extractfile('accepted-broad-audit/cases/A042.json').read()
    raw = json.loads(raw_bytes)
assert sha(raw_bytes) == '85027968a06e968647415c2dea6dcf721a9237f5052fe720915cf3579b7af1d0'
(ROOT / 'A042-setup.json').write_text(json.dumps({'case': 'A042', 'setup': raw['setup'], 'inputSha256': raw['inputSha256'],
    'originalCaseSha256': sha(raw_bytes), 'purpose': '#87 with accepted #89; max3.8s, all22 natural reactions; only if static/unit inspection leaves an actual interaction question.'}, indent=2)+'\n')
result = {'schema': 'pr87-run-policy-static-v1', 'base': BASE, 'reviewedHead': HEAD, 'executedOriginal': EXECUTED,
    'composedTree': tree, 'sources': {'base': source(BASE), 'original': source(HEAD), 'composed': source(tree)},
    'changedFiles': changed, 'allSevenPayloadsMatchReviewedHead': True, 'acceptedRunFitsBlockingPreserved': True,
    'acceptedCostProofExact': True, 'verifiedPacketFiles': verified, 'savedComparisons': comparisons,
    'scriptSha256': sha(Path(__file__).read_bytes()), 'newNativeExecutions': 0, 'seconds': time.perf_counter()-start}
(ROOT / 'static.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({k: result[k] for k in ['composedTree', 'sources', 'changedFiles', 'seconds']}, indent=2))
