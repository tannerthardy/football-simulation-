"""Independent committed-byte/evidence audit; no football simulation.

Prepare tiny source-only hosts for two explicitly scoped unit probes. These
are ordinary ignored directories, not candidate edits or integration branches.
"""
import gzip
import hashlib
import io
import json
import subprocess
import tarfile
import time
from pathlib import Path

started = time.perf_counter()
ROOT = Path('out/run-forecast-alley-review')
ROOT.mkdir(parents=True, exist_ok=True)
BASE = '86250bb4f0c6f421878c204161864d523c3e30b6'
COST = 'd80dcd3015358e604f91cb026f562f6f4f4781e5'
CE = 'c6c8b4823acb27c13769f32305a79d5628cf19b2'
ALLEY = '78a00645e4f821d45604a1ed68c35592de1f5926'
EXECUTED = 'e10e0cb526004afdcd1290daa0bdf5a72eae3462'
sha = lambda b: hashlib.sha256(b).hexdigest()
show = lambda pin, path: subprocess.check_output(['git', 'show', pin + ':' + path])
names = lambda pin, *paths: subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', pin, *paths]).decode().splitlines()
read = lambda pin, path: json.loads(show(pin, path))
diff = lambda a, b, *paths: subprocess.check_output(['git', 'diff', '--name-only', a, b, '--', *paths]).decode().splitlines()

def source_hash(pin):
    h = hashlib.sha256()
    for path in sorted(names(pin, 'src')):
        h.update(path.encode() + b'\0' + show(pin, path) + b'\0')
    return h.hexdigest()

sources = {pin: source_hash(pin) for pin in [BASE, COST, ALLEY]}
assert sources[BASE] == 'dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3'
assert sources[COST] == '840cd69373ef95924f60b3edebc229b77358dcb86993fe0591ae6c959636f9fd'
assert sources[ALLEY] == 'c284f5e9bb2144fd7fa55c6df374d22ecbc9cfeb0d9ad3c0208f44bf7a319aae'
assert diff(BASE, COST, 'src') == ['src/sim/spacing.ts']
assert diff(BASE, ALLEY, 'src') == ['src/sim/run-fits.ts']
extraction_differences = diff(ALLEY, EXECUTED, 'src', 'test', 'config', 'package.json', 'package-lock.json')
assert extraction_differences == ['test/fixtures/approach-family.json']
assert not any(p.endswith('.ts') for p in extraction_differences)
assert not diff(BASE, COST, 'src/physics', 'config', 'package-lock.json')
assert not diff(BASE, ALLEY, 'src/physics', 'config', 'package-lock.json')

# Cost packet and unchanged original supported assertion.
cost_manifest = read(CE, 'data/reviews/current/spacing-cost-adjudication/artifacts.json')
for p, rec in cost_manifest.items():
    data = show(CE, p)
    assert len(data) == rec['bytes'] and sha(data) == rec['sha256']
cost_review = read(CE, 'data/reviews/current/spacing-cost-adjudication/review.json')
cost_receipts = {kind: read(CE, 'data/reviews/current/spacing-cost-adjudication/' + kind + '.json')
                 for kind in ['focused', 'typecheck']}
for receipt in cost_receipts.values():
    assert receipt['exitCode'] == 0 and receipt['sourceSha256'] == sources[COST]
    assert receipt['node'] == 'v22.23.3' and receipt['inputsUnchanged']
original = "  it('preserves fast straight, parallel and close passable lanes', () => {"
def lane_test(pin):
    s = show(pin, 'test/traffic-turning.test.ts').decode()
    return s[s.index(original):s.index("  it('does not preview a material turn", s.index(original))]
assert lane_test(BASE) == lane_test(COST)

# Validate all nine alley payloads and every reused candidate test receipt.
aroot = 'data/reviews/current/alley-cap-motion/'
alley_receipt = read(ALLEY, aroot + 'receipt.json')
payloads = {}
for rec in alley_receipt['files']:
    data = show(ALLEY, aroot + rec['path'])
    assert len(data) == rec['bytes'] and sha(data) == rec['sha256']
    decoded = gzip.decompress(data)
    if 'uncompressedSha256' in rec:
        assert sha(decoded) == rec['uncompressedSha256']
    payloads[rec['path']] = json.loads(decoded)
config = read(BASE, 'config/baseline.json')
flags = {**config['flags'], 'RUN_CONTACT_COMPONENTS': '1'}
for name, p in payloads.items():
    if name == 'verdict.json.gz':
        continue
    assert p['observerNeutral'] and p['nativeExecutions'] == 2
    assert p['node'] == 'v22.23.3' and p['flags'] == flags and p['worldDefaults'] == config['worldDefaults']
    assert p['sourceSha256'] == (sources[BASE] if 'reference' in name else sources[ALLEY])
    assert p['lockSha256'] == sha(show(BASE, 'package-lock.json'))
    assert p['operatorSha256'] == alley_receipt['operators'][0]['sha256']
    inp = next(i for i in alley_receipt['inputs'] if i['case'] in name)
    assert p['inputSha256'] == inp['inputSha256'] and p['inputNativeSha256'] == inp['rawSha256']
test_receipts = []
for entry in alley_receipt['launcherReceipts']:
    r = entry['receipt']
    if r['sourceSha256'] != sources[ALLEY]:
        continue
    if any('vitest' in c['command'] or 'typecheck' in c['command'] for c in r['commands']):
        assert r['exitCode'] == 0 and r['inputsUnchanged'] and r['flags'] == flags
        test_receipts.append({'original': entry['original'], 'receipt': r})

verdict = payloads['verdict.json.gz']
early = payloads['moving-cap-early-A042.json.gz']
cue = verdict['firstSSCapCue']
first_tick = next(r for r in early['rows'] if abs(r['t'] - .5) < 1e-8)

# Source-only hosts contain exact reviewed bytes and the unchanged lock/settings.
# The new probe imports these; no arbitrary patch or observer is injected.
for key, pin in [('reference', BASE), ('cost', COST), ('alley', ALLEY)]:
    host = ROOT / 'hosts' / key
    host.mkdir(parents=True, exist_ok=True)
    archive = subprocess.check_output(['git', 'archive', pin, 'src', 'config/baseline.json', 'package.json', 'package-lock.json'])
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        tar.extractall(host, filter='data')
    dependency = host / 'node_modules'
    if not dependency.exists():
        dependency.symlink_to(Path('/workspace/football-simulation-/node_modules'), target_is_directory=True)

result = {'schema': 'run-independent-forecast-alley-static-v1', 'pins': {'base': BASE, 'cost': COST, 'costEvidence': CE,
    'alley': ALLEY, 'alleyExecutedHost': EXECUTED}, 'sources': sources,
    'unchangedPhysicsLockSettings': True, 'alleyExecutedProductionTestTsExact': True,
    'alleyExtractionDifference': extraction_differences,
    'costPayloadsVerified': len(cost_manifest), 'originalZeroPreviewAssertionByteIdentical': True,
    'costExistingReceipts': cost_receipts, 'costBefore': cost_review['cachedBefore']['rows'], 'costAfter': cost_review['after']['lanes'],
    'alleyPayloadsVerified': len(payloads), 'alleyTestReceipts': test_receipts,
    'alleySavedVerdict': verdict,
    'firstNativeCapCue': cue, 'firstNativeTick': first_tick,
    'hostQualification': 'Exact source-only archives. No candidate is edited; no integration or collection branch is changed.',
    'newNativeExecutions': 0, 'seconds': time.perf_counter() - started}
(ROOT / 'static.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'sources': sources, 'costPayloads': len(cost_manifest), 'alleyPayloads': len(payloads),
                  'firstCue': cue, 'seconds': result['seconds']}, indent=2))
