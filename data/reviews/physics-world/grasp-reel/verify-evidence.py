"""Verify saved grasp-reel evidence; --engine also reconstructs all source pins."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OLD = HERE.parent / 'visible-help'
PINS = {'beforeSourceSha256': '5b6c2f84e77672496996cb7caeb58341e09b7f53f6455919329b8823ea334f84',
        'finalSourceSha256': '248a44cfeab595291717eb5ace15b98c55b19a17e3fd29d87a706bc30018bd57',
        'torsoOnlySourceSha256': '605e1d6cbe598282468694fa7424845b04f584ea1d46ec66e012dc2bb24eb0d8'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for item in value.values():
            finite(item)
    elif isinstance(value, list):
        for item in value:
            finite(item)


def load(path):
    raw = path.read_bytes()
    value = json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)
    finite(value)
    return value


def source_pin(report, expected):
    if 'sourceBefore' in report:
        assert report['sourceBefore'] == report['sourceAfter'] == expected
    else:
        assert report['sourceSha256'] == expected


manifest = load(HERE / 'verification-manifest.json')
assert manifest['schema'] == 'grasp-reel-verification-v1'
assert all(manifest[key] == value for key, value in PINS.items())
assert manifest['changedEngineFiles'] == ['src/physics/world.ts']
for name, expected in manifest['files'].items():
    assert sha(ROOT / name) == expected, name
comparison = load(HERE / 'comparison.json')
assert comparison['validatorSha256'] == sha(HERE / 'compare.py')
successes = failures = 0
for before_path, after_path, key in (
    (OLD / 'grasp-oracle.json.gz', HERE / 'oracle-after.json.gz', 'oracle'),
    (HERE / 'lower-oracle-before.json.gz', HERE / 'lower-oracle-after.json.gz', 'lowerOracle'),
):
    before, after = load(before_path), load(after_path)
    source_pin(before, PINS['beforeSourceSha256'])
    source_pin(after, PINS['finalSourceSha256'])
    assert before['toolHashes'] == after['toolHashes']
    assert len(before['rows']) == len(after['rows']) == len(comparison['local'][key]['pairs']) == 48
    assert before['summary']['activePositionFailures'] == 24
    assert before['summary']['passivePositionFailures'] == after['summary']['passivePositionFailures'] == 0
    assert after['summary']['newtonianPositionPassed'] == 48
    for a, b in zip(before['rows'], after['rows']):
        assert a['input'] == b['input'] and a['initial'] == b['initial']
        successes += b['checks']['newtonianPositionPassed']
        failures += not a['checks']['newtonianPositionPassed']
        assert not a['input']['active'] or not a['checks']['newtonianPositionPassed']
        if not a['input']['active']:
            assert a == b
        if key == 'lowerOracle':
            assert a['observerVerified'] is b['observerVerified'] is True
    assert comparison['local'][key]['passiveRowsIdenticalCount'] == 24
assert successes == 96 and failures == 48

hand = load(HERE / 'hand-after.json.gz')
source_pin(hand, PINS['finalSourceSha256'])
reference = {(row['seed'], row['rusherPower']): row for row in hand['redirects'] if row['substeps'] == 192}
native = [row for row in hand['redirects'] if row['substeps'] == 12]
assert len(native) == len(reference) == 9
assert all(row['falls'] == reference[(row['seed'], row['rusherPower'])]['falls']
           and row['cornerTurned'] == reference[(row['seed'], row['rusherPower'])]['cornerTurned'] for row in native)
supports = [load(HERE / f'support-{phase}.json.gz') for phase in ('before', 'after')]
assert len(supports[0]['fixtures']) == len(supports[1]['fixtures']) == 5
assert all(a['seed'] == b['seed'] and a['power'] == b['power'] and a['initial'] == b['initial']
           for a, b in zip(*(report['fixtures'] for report in supports)))
for stem, count, fields, input_fields in (
    ('runs', 144, ('trials',), ('id', 'roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings')),
    ('tackles', 64, ('primary', 'witnesses'), ('id', 'input', 'profile', 'profileSha256')),
):
    before, after = [load(folder / f'current-{stem}.json.gz') for folder in (OLD, HERE)]
    source_pin(before, PINS['beforeSourceSha256'])
    source_pin(after, PINS['finalSourceSha256'])
    assert before['scriptSha256'] == after['scriptSha256']
    rows = [[row for field in fields for row in report[field]] for report in (before, after)]
    assert len(rows[0]) == len(rows[1]) == len(comparison['transfer'][stem]['pairs']) == count
    assert all(all(a[key] == b[key] for key in input_fields) for a, b in zip(*rows))
    assert len({row['id'] for row in rows[0]}) == count
    if stem == 'runs':
        assert before['cohort'] == after['cohort']
        assert all(report['observerVerifiedCount'] == 7 for report in (before, after))
        assert all(row['observerVerified'] in (None, True) for phase in rows for row in phase)
    else:
        assert all(len(report['observerChecks']) == 64 and report['recording']['recordedAndUnrecordedMatches'] == 9
                   and all(row['passed'] and row['observed'] == row['plain'] for row in report['observerChecks'])
                   for report in (before, after))
assert comparison['transfer']['games']['matchedInitialSeedsAndRosterOnly']
assert len(comparison['transfer']['games']['after']) == 2

integrity = load(HERE / 'export-integrity.json')
assert integrity['clips'] == len(integrity['fullRecordingChecks']) == 18
assert len(integrity['censoredClips']) == 4 and len(integrity['naturalClips']) == 14
assert all(row['fullShiftedTelemetryAndEvents'] and row['profileAndInputPairMatch'] for row in integrity['fullRecordingChecks'])
assert sum(row['windowCensored'] for row in integrity['fullRecordingChecks']) == 4
assert integrity['censoredCompletedResultFlagsCleared'] and integrity['exactShiftedEventActorsNotesPositions']
assert integrity['shiftedFullTelemetryFramesAndDecisionsVerified'] == 18 and integrity['zipHtmlByteExact']
films = [load(HERE / f'film-{phase}.json.gz') for phase in ('before', 'after')]
assert all(len(film['plays']) == 9 and all(play['recordingVerified'] for play in film['plays']) for film in films)
assert all(a['id'] == b['id'] and a['input'] == b['input'] and a['profileSha256'] == b['profileSha256']
           for a, b in zip(*(film['plays'] for film in films)))
browser = load(HERE / 'browser-check.json')
assert browser['pageErrors'] == [] and len(browser['clips']) == 8
assert all(row['playerInspectionAndLayers'] and row['honestEndpointCaption'] for row in browser['clips'])
with zipfile.ZipFile(ROOT / 'viewer/grasp-reel.zip') as archive:
    assert archive.testzip() is None and archive.namelist() == ['grasp-reel.html']
    assert archive.read('grasp-reel.html') == (ROOT / 'viewer/grasp-reel.html').read_bytes()
assert '657 passed (657)' in (HERE / 'tests.log').read_text()
assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
checks = manifest['checks']
assert checks['testsPassed'] == 657 and checks['pythonTestsPassed'] == 22
assert all(checks[key] == 0 for key in ('testsExitCode', 'pythonExitCode', 'typecheckExitCode', 'buildExitCode'))

if '--engine' in sys.argv:
    for name, expected in manifest['currentCodeFiles'].items():
        assert sha(ROOT / name) == expected, name
    with tempfile.TemporaryDirectory(prefix='grasp-reel-source-', dir='/tmp') as directory:
        scratch = Path(directory)
        world = scratch / 'src/physics/world.ts'
        world.parent.mkdir(parents=True)
        world.write_bytes((ROOT / 'src/physics/world.ts').read_bytes())
        subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
        hashes = {key: hashlib.sha256() for key in PINS}
        for path in sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix()):
            name = path.relative_to(ROOT).as_posix()
            raw = path.read_bytes()
            variants = {'beforeSourceSha256': world.read_bytes() if name == 'src/physics/world.ts' else raw,
                        'finalSourceSha256': raw,
                        'torsoOnlySourceSha256': (HERE / 'torso-only/world.ts').read_bytes() if name == 'src/physics/world.ts' else raw}
            for key, body in variants.items():
                hashes[key].update(name.encode() + b'\0' + body + b'\0')
        assert all(value.hexdigest() == PINS[key] for key, value in hashes.items())
print(json.dumps({'passed': True, 'oracleSuccesses': successes, 'beforeFailuresRetained': failures,
                  'runPairs': 144, 'tacklePairs': 64, 'filmClips': 18, 'censoredClips': 4,
                  'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))
