"""Check saved evidence integrity; --engine also checks this publication's source."""
import gzip
import hashlib
import json
import math
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def load(path):
    payload = path.read_bytes()
    result = json.loads(gzip.decompress(payload) if path.suffix == '.gz' else payload)
    finite(result)
    return result


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for child in value.values():
            finite(child)
    elif isinstance(value, list):
        for child in value:
            finite(child)


manifest = load(HERE / 'verification-manifest.json')
for name, digest in manifest['files'].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
comparison = load(HERE / 'comparison-compact.json.gz')
assert all(comparison['pinsEqual'].values())
traces = [load(HERE / f'{phase}-traces.json.gz') for phase in ('before', 'after')]
for phase, trace in zip(('before', 'after'), traces):
    assert trace['sourceBefore'] == trace['sourceAfter'] == comparison['sources'][phase]
    assert trace['originalRawSha256'] == comparison['rawArtifactSha256'][phase]
    assert len(trace['rows']) == 24 and len(trace['observerChecks']) == 6
    assert all(check['passed'] and check['observedSignature'] == check['plainSignature']
               for check in trace['observerChecks'])
    fixed_ids = trace['traceSelection']['fixedIds']
    assert [row['id'] for row in trace['rows'] if 'rows' in row] == fixed_ids
    assert all(len(row['rows']) == 60 for row in trace['rows'] if 'rows' in row)
    loads = [contact for row in trace['rows'] for contact in row['firstContacts']
             if contact['before']['firstLevel']]
    expected = comparison['aggregateFirstLoads'][phase]
    assert len(loads) == expected['n'] == 95
    mean_posture = sum(contact['before']['support']['posture'] for contact in loads) / len(loads)
    assert abs(mean_posture - expected['meanPosture']) < 1e-14
    film = load(HERE / f'{phase}-film.json.gz')
    assert film['sourceBefore'] == trace['sourceBefore']
    assert film['inputSha256'] == trace['inputSha256'] == comparison['inputSha256']
    assert film['profileSha256'] == trace['profileSha256'] == comparison['profileSha256']
    assert [play['id'] for play in film['plays']] == fixed_ids
    assert all(play['end']['censored'] and play['end']['phase'] == 'live'
               and play['end']['t'] == 3 and play['end']['endSpot'] is None
               for play in film['plays'])
for before, after in zip(traces[0]['rows'], traces[1]['rows']):
    assert before['id'] == after['id'] and before['input'] == after['input']
    assert before['initialContext'] == after['initialContext']
    assert before['players'] == after['players']
for divergence in comparison['firstCommandDivergences']:
    command = divergence['firstChangedCommand']
    assert command['t'] == .05
    assert command['afterRequested'] == {**command['beforeRequested'], 'posture': .7}
for name in ('current-runs.json.gz', 'current-tackles.json.gz', 'current-games9.json'):
    load(HERE / name)
with zipfile.ZipFile(ROOT / 'viewer/ol-base.zip') as archive:
    assert archive.testzip() is None
    assert archive.namelist() == ['ol-base.html']
    assert archive.read('ol-base.html') == (ROOT / 'viewer/ol-base.html').read_bytes()
assert load(HERE / 'browser-check.json')['pageErrors'] == []
assert load(HERE / 'film-integrity.json')['zipHtmlByteExact']
if '--engine' in sys.argv:
    current, before = hashlib.sha256(), hashlib.sha256()
    original_blocking = (HERE / 'blocking-before.ts').read_bytes()
    for path in sorted((ROOT / 'src').rglob('*'), key=lambda path: path.relative_to(ROOT).as_posix()):
        if path.is_file():
            relative = path.relative_to(ROOT).as_posix()
            data = path.read_bytes()
            old_data = original_blocking if relative == 'src/sim/behaviors/blocking.ts' else data
            current.update(relative.encode() + b'\0' + data + b'\0')
            before.update(relative.encode() + b'\0' + old_data + b'\0')
    assert current.hexdigest() == comparison['sources']['after']
    assert before.hexdigest() == comparison['sources']['before']
print(json.dumps({'passed': True, 'panelInputs': 24, 'filmClips': 12,
                  'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))
