"""Verify saved OL technique evidence without resimulation or outcome fitting.

Default checks immutable evidence. --engine also checks current sources/tools
and documentation pointers, and reconstructs the baseline from engine.patch.
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
BASELINE = HERE.parent / 'ol-retarget'
BEFORE = 'fedfb636eb7a02f298cff1fdf2e2fb213ef37645cc7e1f31b1ef05b52d338205'
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
RUNS = ('iz_strong', 'oz_strong', 'wz_strong', 'power', 'counter', 'trap', 'duo', 'split_zone')
WITNESSES = ['OT-R2-oz_strong-over-L-S11', 'OT-R2-power-over-R-S3']
FIRST_LEVEL = ('drive', 'reach', 'down', 'cutoff', 'draw', 'combo')


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


def rows(report):
    assert len(report['trials']) == 160 and len(report['supplementalTrials']) == 2
    return report['trials'] + report['supplementalTrials']


def neutral(report):
    assert report['schema'] == 'ol-technique-review-v1'
    assert report['moduleSha256']['src/physics/world.ts'] == WORLD
    assert report['summary']['snaps'] == report['summary']['observerVerifiedCount'] == 160
    assert [r['id'] for r in report['supplementalTrials']] == WITNESSES
    assert all(r['supplemental'] is False and r['roster'] == 0 for r in report['trials'])
    assert all(r['supplemental'] is True and r['roster'] == 1 for r in report['supplementalTrials'])
    assert len({r['id'] for r in rows(report)}) == 162
    assert all(r['observerVerified'] and r['observedSignature'] == r['plainSignature'] for r in rows(report))
    assert all(r['naturalEnd'] and r['result']['outcome'] != 'timeout' for r in rows(report))


manifest = load(HERE / 'verification-manifest.json')
assert manifest['schema'] == 'ol-technique-verification-v1'
assert manifest['beforeSourceSha256'] == BEFORE and manifest['worldSha256'] == WORLD
AFTER = manifest['finalSourceSha256']
assert len(AFTER) == 64 and AFTER != BEFORE
for name, expected in manifest['files'].items():
    assert sha(ROOT / name) == expected, name
panels = [load(HERE / f'{phase}.json.gz') for phase in ('before', 'after')]
for p, pin in zip(panels, (BEFORE, AFTER)):
    source_pin(p, pin)
    neutral(p)
assert panels[0]['cohort'] == panels[1]['cohort']
assert panels[0]['collectorSha256'] == panels[1]['collectorSha256']
assert panels[0]['cohort']['runs'] == list(RUNS)
assert panels[0]['cohort']['fronts'] == ['over', 'under', 'odd', 'tite', 'bear']
for a, b in zip(*(rows(p) for p in panels)):
    assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'front', 'flip', 'seed', 'supplemental', 'formation', 'profileSha256'))
# initialSha256 includes the collector's ownership projection. New controller
# metadata can legitimately differ; this is separate from physical capabilities.
initial_projection_matches = sum(a['initialSha256'] == b['initialSha256']
                                 for a, b in zip(*(p['trials'] for p in panels)))
earned = new_deep_jobs = 0
for p, is_final in zip(panels, (False, True)):
    pool_earned = 0
    for r in rows(p):
        assert r['maxMotorWorkExcess'] == 0 and r['maxMomentumResidual'] < 1e-7 and r['maxWorkResidual'] < 1e-7
        for u in r['updates']:
            stale = [m['slot'] for m in u['after'] if m['plan'] and m['plan']['combination']
                     and not m['plan']['combination']['released']
                     and m['plan']['target'] != m['plan']['combination']['defender']]
            assert stale == u['staleMembersAfter'] == []
            climb_events = [e for e in u['events'] if e['type'] == 'block_climb']
            if not r['supplemental']:
                pool_earned += len(climb_events)
            if is_final and climb_events:
                earned += len(climb_events)
                old = u['oldCombinationAfter']
                assert old and old['released'] and u['classification'] == 'earned-climb'
                assert not any(e['type'] == 'block_abandon' for e in u['events'])
                for m in u['after']:
                    prior = next((a for a in u['before'] if a['slot'] == m['slot']), None)
                    old_pointer = prior and prior['plan'] and prior['plan']['combination']
                    if m['slot'] in old['members'] and m['plan'] and old_pointer and old_pointer['id'] == old['id']:
                        assert m['plan']['combination'] is None and m['plan']['climbTo'] is None
                        assert m['plan']['kind'] != 'combo'
                        if m['plan']['kind'] == 'climb' and m['plan']['target'] == old['backer']:
                            assert m['plan']['drive'] == {'x': 1, 'y': 0}
                        if m['plan']['target'] == old['defender']:
                            assert m['plan']['drive'] == prior['plan']['drive']
            # Classify actual newly selected free work from its consumed image,
            # never from roster position or hidden current target depth.
            current, previous = u['afterBody'], u['beforeBody']
            target = u['targetGeometry']
            if (is_final and u['observer'] in u['changedTargets'] and not current['engagement']
                    and previous['plan']['kind'] not in ('pull', 'lead', 'stalk', 'draw')
                    and not current['plan']['combination'] and target and target['observedDepth'] is not None
                    and target['observedDepth'] > 2):
                new_deep_jobs += 1
                assert current['plan']['kind'] == 'climb'
                assert current['plan']['drive'] == {'x': 1, 'y': 0}
                assert any(c['target'] == target['slot'] and c['image']['pos'] == target['observedPosition']
                           for c in u['consumedImages'])
        if is_final:
            assert sum(m['lateKeeperFreeUpdates'] for m in r['olMetrics'].values()) == 0
    assert pool_earned == p['summary']['earnedClimbs']

comparison = load(HERE / 'comparison.json')
assert comparison['beforeSource'] == BEFORE and comparison['afterSource'] == AFTER
assert comparison['matchedPooledInputProfiles'] == 160 and comparison['matchedSupplementalInputProfiles'] == 2
assert comparison['initialControllerStateExact'] == initial_projection_matches
assert comparison['comparisonToolSha256'] == manifest['comparisonToolSha256']
for phase in manifest.get('retainedPhases', []):
    retained = load(ROOT / phase['panel'])
    source_pin(retained, phase['sourceSha256'])
    neutral(retained)
    assert retained['cohort'] == panels[0]['cohort'] and retained['collectorSha256'] == panels[0]['collectorSha256']

films = [load(HERE / f'{phase}-film.json.gz') for phase in ('before', 'after')]
fixed_ids = [f'OT-R1-{run}-over-{side}-S3' for run in RUNS for side in ('R', 'L')]
loaded_hands = [0, 0]
for phase, (f, p, pin) in enumerate(zip(films, panels, (BEFORE, AFTER))):
    source_pin(f, pin)
    assert [r['id'] for r in f['plays']] == p['filmIds'] == fixed_ids + WITNESSES
    by_id = {r['id']: r for r in rows(p)}
    for r in f['plays']:
        assert r['selection'] == ('named-prior-ordinary-witness' if r['id'] in WITNESSES else 'fixed-before-outcomes')
        assert {k: v for k, v in r['result'].items() if k not in ('frames', 'telemetry')} == by_id[r['id']]['result']
        assert r['trace'][0]['t'] == 0 and r['trace'][-1]['phase'] == 'dead'
        assert r['result']['telemetry']['level'] == 'full'
        for t in r['trace']:
            for load_row in t['deliveredStep']:
                for value, limit in (('armImpulse', 'armImpulseLimit'), ('armWork', 'armWorkLimit'),
                                     ('supportMotorWork', 'supportMotorWorkLimit')):
                    assert load_row[value] <= load_row[limit] + 1e-7
                loaded_hands[phase] += sum(abs(j['normalForce']) + abs(j['tangentForce']) > 1e-8
                                           for j in load_row['liveHandsAfterPhysics'])
assert all(count > 0 for count in loaded_hands)
proof = manifest['independentChecks']
assert proof['finalEarnedReleases'] == earned == 72
assert proof['newObservedDeepJobs'] == new_deep_jobs == 34
assert proof['loadedSurvivingHandEntries'] == loaded_hands
assert proof['recordedInitialProjectionMatches'] == initial_projection_matches
for a, b in zip(*(f['plays'] for f in films)):
    assert a['id'] == b['id'] and a['players'] == b['players']
    assert a['result']['frames'][0] == b['result']['frames'][0]

# These guards match initial inputs, not later game decisions and random draws.
for kind, suffix in (('runs', '.json.gz'), ('tackles', '.json.gz'), ('games9', '.json')):
    old, new = [load(folder / f'current-{kind}{suffix}') for folder in (BASELINE, HERE)]
    source_pin(old, BEFORE)
    source_pin(new, AFTER)
    assert old['scriptSha256'] == new['scriptSha256']
    if kind == 'runs':
        assert old['cohort'] == new['cohort'] and len(old['trials']) == len(new['trials']) == 144
        assert old['observerVerifiedCount'] == new['observerVerifiedCount'] == 7
        for a, b in zip(old['trials'], new['trials']):
            assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings'))
    elif kind == 'tackles':
        assert old['primary'] == new['primary'] and old['witnesses'] == new['witnesses']
        assert len(new['primary']) == 56 and len(new['witnesses']) == 8
        assert all(c['passed'] and c['observed'] == c['plain'] for c in new['observerChecks'])
    else:
        assert old['rosterSha256'] == new['rosterSha256'] and old['seed'] == new['seed'] == 9
        assert len(old['games']) == len(new['games']) == 2
        assert [g['seed'] for g in old['games']] == [g['seed'] for g in new['games']]
        assert new['physics']['maxMotorWorkExcessKgYd2S2'] == 0
        assert new['physics']['maxMomentumResidualKgYdS'] < 1e-7
        assert new['physics']['maxWorkResidualKgYd2S2'] < 1e-7
integrity, browser = [load(HERE / name) for name in ('film-integrity.json', 'browser-check.json')]
assert integrity['clips'] == integrity['naturalFinishes'] == 36
assert integrity['predeterminedClips'] == 32 and integrity['supplementalWitnessClips'] == 4
assert integrity['inspectionCensors'] == 0
for key in ('exactFullTelemetry', 'exactRawEventsActorsNotesTimes', 'exactPlayersProfilesRatingsWeights',
            'exactNativeOwnershipAndDeliveredLoads', 'recordedFrameTimesAndPossession', 'zipHtmlByteExact'):
    assert integrity[key], key
assert len(browser['clips']) == 36 and browser['pageErrors'] == []
videos = browser['videoExportUsesSelectedEngineSource']
assert len(videos) == 2 and [v['selectedSourceSha256'] for v in videos] == [BEFORE, AFTER]
assert all(v['nonemptyBytes'] > 0 and v['paintedStampUsesSelectedSource'] for v in videos)
assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
assert integrity['htmlSha256'] == sha(ROOT / 'viewer/ol-technique.html')
assert integrity['zipSha256'] == sha(ROOT / 'viewer/ol-technique.zip')
with zipfile.ZipFile(ROOT / 'viewer/ol-technique.zip') as archive:
    assert archive.testzip() is None and archive.namelist() == ['ol-technique.html']
    assert archive.read('ol-technique.html') == (ROOT / 'viewer/ol-technique.html').read_bytes()
checks = manifest['checks']
assert f"{checks['testsPassed']} passed ({checks['testsPassed']})" in (HERE / 'tests.log').read_text()
assert f"{checks['focusedTestsPassed']} passed ({checks['focusedTestsPassed']})" in (HERE / 'focused.log').read_text()
assert '12 failed | 7 passed (19)' in (HERE / 'tests-before.log').read_text()
assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
assert all(v == 0 for k, v in checks.items() if k.endswith('ExitCode'))
if '--engine' in sys.argv:
    for name, expected in manifest['currentCodeFiles'].items():
        assert sha(ROOT / name) == expected, name
    assert sha(ROOT / 'src/physics/world.ts') == WORLD
    changed = manifest['changedEngineFiles']
    with tempfile.TemporaryDirectory(prefix='ol-technique-source-', dir='/tmp') as directory:
        scratch = Path(directory)
        for name in changed:
            path = scratch / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((ROOT / name).read_bytes())
        subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
        hashes = [hashlib.sha256(), hashlib.sha256()]
        for path in sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix()):
            name, raw = path.relative_to(ROOT).as_posix(), path.read_bytes()
            for i, digest in enumerate(hashes):
                body = (scratch / name).read_bytes() if i == 0 and name in changed else raw
                digest.update(name.encode() + b'\0' + body + b'\0')
        assert [d.hexdigest() for d in hashes] == [BEFORE, AFTER]
        # Each rejected candidate patch is applied to the reconstructed baseline,
        # preserving the source identity of the actual measured ablation.
        for phase in manifest.get('retainedPhases', []):
            if 'enginePatch' not in phase:
                continue
            variant = scratch / phase['label']
            for name in changed:
                path = variant / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes((scratch / name).read_bytes())
            subprocess.run(['git', 'apply', str(ROOT / phase['enginePatch'])], cwd=variant, check=True)
            digest = hashlib.sha256()
            for path in sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix()):
                name = path.relative_to(ROOT).as_posix()
                raw = (variant / name).read_bytes() if name in changed else path.read_bytes()
                digest.update(name.encode() + b'\0' + raw + b'\0')
            assert digest.hexdigest() == phase['sourceSha256']
print(json.dumps({'passed': True, 'pooledInputProfilePairs': 160, 'separateWitnessPairs': 2,
                  'observedPlainControls': 324, 'recordedInitialProjectionMatches': initial_projection_matches,
                  'finalEarnedReleasesChecked': earned, 'newObservedDeepJobsChecked': new_deep_jobs,
                  'loadedSurvivingHandEntries': loaded_hands, 'naturalFilmClips': 36,
                  'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))
