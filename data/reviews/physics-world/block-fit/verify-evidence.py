"""Verify saved publication assets; --engine also checks exact engine bytes."""
import gzip
import hashlib
import json
import math
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASE = HERE.parent / 'ol-base'


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for child in value.values():
            finite(child)
    elif isinstance(value, list):
        for child in value:
            finite(child)


def load(path):
    raw = path.read_bytes()
    result = json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)
    finite(result)
    return result


manifest = load(HERE / 'verification-manifest.json')
for name, digest in manifest['files'].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
comparison = load(HERE / 'comparison.json.gz')
assert all(comparison['pinsEqual'].values())
traces = [load(BASE / 'after-traces.json.gz'), load(HERE / 'after-traces.json.gz')]
films = [load(BASE / 'after-film.json.gz'), load(HERE / 'after-film.json.gz')]
fixed_ids = [f'OLB-R1-{concept}-R-S3' for concept in
             ('iz_strong', 'wz_strong', 'power', 'trap', 'counter', 'oz_strong')]
for phase, trace, film in zip(('before', 'after'), traces, films):
    assert trace['sourceBefore'] == trace['sourceAfter'] == comparison['source'][phase]
    assert trace['originalRawSha256'] == comparison['rawArtifacts'][phase]['sha256']
    assert len(trace['rows']) == 24 and len(trace['observerChecks']) == 6
    assert trace['scriptBefore'] == trace['scriptAfter'] == comparison['tool'][phase]
    assert [row['id'] for row in trace['rows'] if 'rows' in row] == fixed_ids
    assert all(len(row['rows']) == 60 for row in trace['rows'] if 'rows' in row)
    assert trace['inputSha256'] == film['inputSha256'] == comparison['inputSha256']
    assert trace['profileSha256'] == film['profileSha256'] == comparison['profileSha256']
    assert film['sourceBefore'] == trace['sourceBefore'] == film['sourceAfter']
    assert [row['id'] for row in film['plays']] == fixed_ids
    assert all(check['passed'] and check['observedSignature'] == check['plainSignature']
               and check['observedInitialSignature'] == check['plainInitialSignature']
               for check in trace['observerChecks'])
    assert all(play['recordingVerified'] and play['end']['censored']
               and play['end']['phase'] == 'live' and play['end']['t'] == 3
               and play['end']['endSpot'] is None for play in film['plays'])
    expected = comparison['aggregate'][phase]
    assert sum(len(row['firstContacts']) for row in trace['rows']) == expected['allOlFirstActualLoads']
    assert sum(contact['before']['firstLevel'] for row in trace['rows']
               for contact in row['firstContacts']) == expected['firstLevelOlFirstActualLoads']
    cost = load(HERE / f'cost-{phase}.json')
    assert cost['sourceBefore'] == cost['sourceAfter'] == comparison['source'][phase]
    assert cost['inputSha256'] == trace['inputSha256']
    assert cost['warmTrialsExcluded'] == 6 and cost['measuredTrials'] == 48
    assert not cost['observe'] and not cost['recording'] and all(c['passed'] for c in cost['repeatChecks'])
    trace_by_id = {row['id']: row for row in trace['rows']}
    for row in cost['rows']:
        trial = row['trial']
        measured = trace_by_id[trial['id']]
        assert trial['input'] == measured['input']
        assert trial['profileSha256'] == measured['profileSha256']
        assert trial['signature'] == measured['signature']
        assert trial['initialSignature'] == measured['initialSignature']
        assert trial['end'] == measured['end']
for before, after in zip(traces[0]['rows'], traces[1]['rows']):
    for key in ('id', 'input', 'players', 'initial', 'initialContext', 'initialSignature',
                'profileSha256', 'fixture', 'resolvedOffCall', 'physics'):
        assert before[key] == after[key], (before['id'], key)
counter = [row for row in comparison['rows'] if row['input']['concept'] == 'counter']
assert len(counter) == 4 and all(row['before']['endpointSignature'] == row['after']['endpointSignature'] for row in counter)
for phase in ('before', 'after'):
    witness = comparison['wideZoneLtWitness'][phase]
    first = witness['actualForceWindows'][0]['interval']
    assert abs(first[0] - .55) < 1e-12 and abs(first[1] - .60) < 1e-12
transfer = load(HERE / 'transfer-validation.json.gz')
assert transfer['runs']['matchedInputsProfilesAndTool']
assert len(transfer['runs']['pairedGainsAndEndpoints']) == 144
assert transfer['tackles']['identicalPayloadExceptTimestampAndSource']
assert transfer['tackles']['primary']['stillLiveAtWindowEnd'] == 14
for name in ('current-runs.json.gz', 'current-tackles.json.gz', 'current-games9.json',
             'cost-rejected-forecast.json', 'coverage-cap-witness.json'):
    load(HERE / name)
with zipfile.ZipFile(ROOT / 'viewer/block-fit-film-room.zip') as archive:
    assert archive.testzip() is None and archive.namelist() == ['block-fit.html']
    assert archive.read('block-fit.html') == (ROOT / 'viewer/block-fit.html').read_bytes()
assert load(HERE / 'browser-check.json')['pageErrors'] == []
assert load(HERE / 'film-integrity.json')['zipHtmlByteExact']
if '--engine' in sys.argv:
    current, before = hashlib.sha256(), hashlib.sha256()
    original = (HERE / 'blocking-before.ts').read_bytes()
    for path in sorted((ROOT / 'src').rglob('*'), key=lambda p: p.relative_to(ROOT).as_posix()):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT).as_posix()
        raw = path.read_bytes()
        current.update(relative.encode() + b'\0' + raw + b'\0')
        if relative != 'src/sim/run-block-fit.ts':
            old = original if relative == 'src/sim/behaviors/blocking.ts' else raw
            before.update(relative.encode() + b'\0' + old + b'\0')
    assert current.hexdigest() == comparison['source']['after']
    assert before.hexdigest() == comparison['source']['before']
    for name, digest in manifest['engineFiles'].items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest
print(json.dumps({'passed': True, 'panelInputs': 24, 'filmClips': 12,
                  'runGuards': 144, 'assetHashes': len(manifest['files']),
                  'engineChecked': '--engine' in sys.argv}))
