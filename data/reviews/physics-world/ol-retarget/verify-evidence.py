"""Check frozen ordinary OL evidence; --engine also checks current source pins.

No resimulation, outcome fitting or performance comparison. Mutable pointers and
current tools are checked only with --engine, so saved history remains usable.
"""
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
BASELINE = HERE.parent / 'projected-help'
BEFORE = '704158f29be7a7e31b669fddfbf1cecb2fe2332d37a18eaa2db16a3f69e59c12'
AFTER = 'fedfb636eb7a02f298cff1fdf2e2fb213ef37645cc7e1f31b1ef05b52d338205'
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
CHANGED = ['src/sim/behaviors/blocking.ts', 'src/sim/types.ts']


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
    assert report['sourceBefore'] == report['sourceAfter'] == expected


manifest = load(HERE / 'verification-manifest.json')
assert manifest['schema'] == 'ol-retarget-verification-v1'
assert manifest['beforeSourceSha256'] == BEFORE and manifest['finalSourceSha256'] == AFTER
assert manifest['worldSha256'] == WORLD and manifest['changedEngineFiles'] == CHANGED
for name, expected in manifest['files'].items():
    assert sha(ROOT / name) == expected, name
panels = [load(HERE / f'panel-{phase}.json.gz') for phase in ('before', 'after')]
for p, pin in zip(panels, (BEFORE, AFTER)):
    source_pin(p, pin)
    assert len(p['trials']) == p['summary']['snaps'] == p['summary']['observerVerifiedCount'] == 144
    assert p['moduleSha256']['src/physics/world.ts'] == WORLD
    assert all(r['observerVerified'] and r['observedSignature'] == r['plainSignature'] for r in p['trials'])
    assert all(r['naturalEnd'] and r['result']['outcome'] != 'timeout' for r in p['trials'])
    own_stale = 0
    for r in p['trials']:
        count = 0
        for u in r['updates']:
            stale = [m['slot'] for m in u['after'] if m['plan'] and m['plan']['combination']
                     and not m['plan']['combination']['released']
                     and m['plan']['target'] != m['plan']['combination']['defender']]
            assert stale == u['staleMembersAfter']
            count += u['observer'] in stale
            if pin == AFTER:
                assert not stale
                if u['classification'] == 'cancelled-combination':
                    old = u['oldCombinationAfter']
                    assert old and old['released']
                    assert not any(e['type'] == 'block_climb' for e in u['events'])
                    assert any(e['type'] == 'block_abandon' for e in u['events'])
                    assert all(not m['plan'] or not m['plan']['combination']
                               or m['plan']['combination']['id'] != old['id'] for m in u['after'])
        assert count == r['staleMemberUpdates']
        own_stale += count
        assert r['maxMotorWorkExcess'] == 0
        assert r['maxMomentumResidual'] < 1e-7 and r['maxWorkResidual'] < 1e-7
    assert own_stale == p['summary']['staleMemberUpdates']
    assert sum(sum(e['type'] == 'block_climb' for e in u['events']) for r in p['trials']
               for u in r['updates']) == p['summary']['earnedClimbs']
    assert sum(u['classification'] == 'cancelled-combination' for r in p['trials']
               for u in r['updates']) == p['summary']['cancelledTransitions']
assert panels[0]['collectorSha256'] == panels[1]['collectorSha256']
assert panels[0]['cohort'] == panels[1]['cohort']
assert [p['summary']['staleSnaps'] for p in panels] == [16, 0]
assert [p['summary']['staleMemberUpdates'] for p in panels] == [507, 0]
assert [p['summary']['earnedClimbs'] for p in panels] == [40, 40]
for a, b in zip(*(p['trials'] for p in panels)):
    assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'front', 'flip', 'seed',
                                      'initialSha256', 'profileSha256'))
assert sum(a['observedSignature'] == b['observedSignature'] for a, b in zip(*(p['trials'] for p in panels))) == 123
assert sum(a['result']['offenseYards'] == b['result']['offenseYards'] for a, b in zip(*(p['trials'] for p in panels))) == 143
comparison = load(HERE / 'comparison.json')
assert comparison['comparisonToolSha256'] == sha(HERE / 'compare.py')
assert comparison['beforeSource'] == BEFORE and comparison['afterSource'] == AFTER
assert comparison['matchedInputProfileCount'] == 144 and comparison['completeObservedExecutionExact'] == 123
assert comparison['creditedGainExact'] == 143 and comparison['earnedClimbEventsExact'] == 144
for name, expected_hash in comparison['inputSha256'].items():
    assert sha(ROOT / name) == expected_hash, name

films = [load(HERE / f'film-{phase}.json.gz') for phase in ('before', 'after')]
expected = [f'OR-R1-{run}-over-{side}-S3' for run in ('iz_strong', 'oz_strong', 'wz_strong', 'power', 'counter', 'trap')
            for side in ('R', 'L')]
for f, p, pin in zip(films, panels, (BEFORE, AFTER)):
    source_pin(f, pin)
    assert f['collectorSha256'] == p['collectorSha256']
    assert [r['id'] for r in f['plays']] == p['filmIds'] == expected
    by_id = {r['id']: r for r in p['trials']}
    for r in f['plays']:
        assert r['selection'] == 'fixed-before-outcomes' and r['roster'] == 0 and r['front'] == 'over' and r['seed'] == 3
        result = {k: v for k, v in r['result'].items() if k not in ('frames', 'telemetry')}
        assert result == by_id[r['id']]['result'] and r['trace'][-1]['phase'] == 'dead'
        assert r['result']['telemetry']['level'] == 'full' and r['result']['frames'][0]['t'] == 0
for a, b in zip(*(p['plays'] for p in films)):
    assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'front', 'flip', 'seed', 'players'))

# Run outputs may change through OL decisions; all initial profiles still match.
runs = [load(folder / 'current-runs.json.gz') for folder in (BASELINE, HERE)]
tackles = [load(folder / 'current-tackles.json.gz') for folder in (BASELINE, HERE)]
games = [load(folder / 'current-games9.json') for folder in (BASELINE, HERE)]
for reports in (runs, tackles, games):
    for p, pin in zip(reports, (BEFORE, AFTER)):
        source_pin(p, pin)
    assert reports[0]['scriptSha256'] == reports[1]['scriptSha256']
assert runs[0]['cohort'] == runs[1]['cohort']
assert all(len(p['trials']) == 144 and p['observerVerifiedCount'] == 7 for p in runs)
for a, b in zip(*(p['trials'] for p in runs)):
    assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings'))
assert tackles[0]['primary'] == tackles[1]['primary'] and tackles[0]['witnesses'] == tackles[1]['witnesses']
for p in tackles:
    assert len(p['primary']) == 56 and len(p['witnesses']) == 8 and len(p['observerChecks']) == 64
    assert all(c['passed'] and c['observed'] == c['plain'] for c in p['observerChecks'])
    assert p['recording']['recordedAndUnrecordedMatches'] == 9
assert games[0]['rosterSha256'] == games[1]['rosterSha256']
assert all(p['seed'] == 9 and p['gamesOnly'] and len(p['games']) == 2 for p in games)
assert [g['seed'] for g in games[0]['games']] == [g['seed'] for g in games[1]['games']]
# Later game calls and random draws diverge: only initial game inputs are paired.

integrity = load(HERE / 'film-integrity.json')
browser = load(HERE / 'browser-check.json')
assert integrity['clips'] == 24 and browser['pageErrors'] == [] and len(browser['clips']) == 24
assert integrity['predeterminedClips'] == integrity['naturalFinishes'] == 24 and integrity['inspectionCensors'] == 0
for key in ('exactFullTelemetry', 'exactRawEventsActorsNotesTimes', 'exactPlayersProfilesRatingsWeights',
            'exactNativeOwnershipAndDeliveredLoads', 'crossSourceInitialProfilesAndContextsMatch',
            'all144ObserverControlsPerPhaseNeutral', 'recordedFrameTimesAndPossession', 'zipHtmlByteExact'):
    assert integrity[key], key
assert integrity['candidateStaleStates'] == 0 and integrity['maxExistingPackingPositionFacingError'] <= .050000001
assert [c['sourceSha256'] for c in integrity['sourceComparison']] == [BEFORE, AFTER]
assert all(c['fullTelemetry'] and c['naturalFinish'] and c['recordedOwnershipAndDeliveredLoadsInspected']
           and c['copiedReferenceUsesSelectedEngineSource'] for c in browser['clips'])
videos = browser['videoExportUsesSelectedEngineSource']
assert len(videos) == 2 and [v['selectedSourceSha256'] for v in videos] == [BEFORE, AFTER]
assert all(v['nonemptyBytes'] > 0 and v['paintedStampUsesSelectedSource']
           and v['selectedSourceSha256'][:12] in v['downloadFilename'] for v in videos)
assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
assert integrity['htmlSha256'] == sha(ROOT / 'viewer/ol-retarget.html')
assert integrity['zipSha256'] == sha(ROOT / 'viewer/ol-retarget.zip')
with zipfile.ZipFile(ROOT / 'viewer/ol-retarget.zip') as archive:
    assert archive.testzip() is None and archive.namelist() == ['ol-retarget.html']
    assert archive.read('ol-retarget.html') == (ROOT / 'viewer/ol-retarget.html').read_bytes()
assert '695 passed (695)' in (HERE / 'tests.log').read_text()
assert '11 failed | 6 passed (17)' in (HERE / 'tests-before.log').read_text()
assert '84 passed (84)' in (HERE / 'focused.log').read_text()
assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
assert manifest['checks']['testsPassed'] == 695 and manifest['checks']['pythonTestsPassed'] == 22
assert all(v == 0 for k, v in manifest['checks'].items() if k.endswith('ExitCode'))

if '--engine' in sys.argv:
    for name, expected_hash in manifest['currentCodeFiles'].items():
        assert sha(ROOT / name) == expected_hash, name
    assert sha(ROOT / 'src/physics/world.ts') == WORLD
    with tempfile.TemporaryDirectory(prefix='ol-retarget-source-', dir='/tmp') as directory:
        scratch = Path(directory)
        for name in CHANGED:
            path = scratch / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((ROOT / name).read_bytes())
        subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
        hashes = [hashlib.sha256(), hashlib.sha256()]
        for path in sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix()):
            name, raw = path.relative_to(ROOT).as_posix(), path.read_bytes()
            for index, digest in enumerate(hashes):
                body = (scratch / name).read_bytes() if index == 0 and name in CHANGED else raw
                digest.update(name.encode() + b'\0' + body + b'\0')
        assert [d.hexdigest() for d in hashes] == [BEFORE, AFTER]
print(json.dumps({'passed': True, 'matchedRunInputs': 144, 'staleMemberUpdatesBefore': 507,
                  'staleMemberUpdatesAfter': 0, 'identicalCompleteExecutions': 123,
                  'identicalTackleRows': 64, 'filmClips': 24, 'naturalFilms': 24,
                  'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))
