#!/usr/bin/env python3
"""Verify saved OL work exchanges without resimulation.

Default verifies immutable inputs, actual consumed pictures, job changes,
completed native loads and films. --engine also checks current source/tools
and reverses the exact one-file patch to reconstruct the cached baseline.
The immutable previous verifier supplies its reviewed native keeper/budget
checks; this phase independently checks the new assignment/technique rule.
"""
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = HERE.parent / 'combo-transfer'
BEFORE = 'ff641a802030edddaa1eac42b8d0991b4cba43dd9f4fa0f3ef45ee3dd3bcfbac'
AFTER = '206cb45f54841596ae01fa3ecccb2a6cd192d77664563595cbe82c05c443cae9'
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
COMPARATOR = '1c59e6f0861f7f597ff6fd0010d779bc58dbb4b2f0db7b965ede98c129941d15'
WITNESS = '600cd84d6ad36142bf52f47a19a8482d5600b3c0446b67bf84e9b6f90c67cd63'
RESERVED = {'pull', 'lead', 'stalk', 'draw'}
FILM_IDS = [f'WX-R1-{run}-{front}-{side}-S3' for run, front in [('duo', 'odd'), ('power', 'under')] for side in ('R', 'L')]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    with gzip.open(path, 'rt') if path.suffix == '.gz' else path.open() as stream:
        return json.load(stream)


def previous_checks():
    spec = importlib.util.spec_from_file_location('immutable_keeper_checks', BASELINE / 'verify-evidence.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def solo_kind(trial, slot):
    installed = {m['slot']: m['plan'] for m in trial['initialProjection']['ownership']}
    p = installed[slot]
    kind = p['kind']
    if kind == 'combo':
        combo = p['combination']
        owner = installed.get(combo['members'][0]) if combo else None
        kind = owner['kind'] if owner else 'drive'
    return 'drive' if kind in ('combo', 'climb') else kind


def exchange_records(trial):
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    records = []
    for row in trial['updates']:
        for event in row['events']:
            if event['type'] != 'block_exchange':
                continue
            a, b = slots[event['a']], slots[event['b']]
            before = {m['slot']: m for m in row['before'] if m['slot'] in (a, b)}
            after = {m['slot']: m for m in row['after'] if m['slot'] in (a, b)}
            assert len(before) == len(after) == 2 and row['observer'] == a
            assert event['t'] == row['t']
            assert before[a]['plan']['target'] == after[b]['plan']['target']
            assert before[b]['plan']['target'] == after[a]['plan']['target']
            targets = {m['plan']['target'] for m in before.values()}
            assert all(not m['engagement'] and m['plan']['combination'] is None and m['plan']['kind'] not in RESERVED for m in before.values())
            assert not any(m['engagement'] and m['engagement']['defender'] in targets for m in row['before'])
            for key in ('pos', 'vel', 'facing', 'stance', 'support', 'energy'):
                assert row['beforeBody'][key] == row['afterBody'][key]
            target = after[a]['plan']['target']
            image = next(c['image'] for c in reversed(row['consumedImages']) if c['target'] == target)
            expected = 'climb' if image['pos']['x'] > 42 else solo_kind(trial, a)
            records.append({'id': trial['id'], 't': row['t'], 'initiator': a, 'partner': b,
                            'depthKindMatch': after[a]['plan']['kind'] == expected,
                            'kindChanged': any(before[s]['plan']['kind'] != after[s]['plan']['kind'] for s in (a, b))})
    return records


def audit():
    prior = previous_checks()
    panels = [read(BASELINE / 'after.json.gz'), read(HERE / 'candidate.json.gz')]
    native = [prior.panel_audit(panel, pin, True) for panel, pin in zip(panels, (BEFORE, AFTER))]
    assert panels[0]['cohort'] == panels[1]['cohort'] and panels[0]['collectorSha256'] == panels[1]['collectorSha256'] == prior.COLLECTOR
    assert panels[0]['filmIds'] == panels[1]['filmIds']
    for p in panels:
        assert p['cohort']['pooledRosterPair'] == [31, 32] and p['cohort']['supplementalRosterPair'] == [41, 42]
        assert p['moduleSha256']['src/physics/world.ts'] == WORLD
    assert panels[0]['moduleSha256']['src/sim/engagement.ts'] == panels[1]['moduleSha256']['src/sim/engagement.ts']
    comparison = read(HERE / 'comparison.json')
    assert comparison['schema'] == 'ol-exchange-comparison-v1' and comparison['comparisonSha256'] == COMPARATOR
    assert comparison['sources'] == {'before': BEFORE, 'after': AFTER}
    assert comparison['cohort'] == panels[0]['cohort'] and comparison['collectorSha256'] == prior.COLLECTOR
    for path, expected in comparison['inputs'].items():
        assert sha(ROOT / path) == expected
    exact = 0
    for old, new in zip(*(p['trials'] + p['supplementalTrials'] for p in panels)):
        assert all(old[k] == new[k] for k in ('id', 'run', 'front', 'flip', 'seed', 'roster', 'formation', 'supplemental', 'profileSha256', 'initialSha256'))
        assert old['initialProjection'] == new['initialProjection']
        if not old['supplemental']:
            exact += old['observedSignature'] == new['observedSignature']
        else:
            assert old['observedSignature'] == new['observedSignature'] and old['result'] == new['result']
    assert exact == comparison['identicalCompleteExecutions'] == 149
    exchanges = [[r for trial in p['trials'] for r in exchange_records(trial)] for p in panels]
    assert all(len(rows) == 18 for rows in exchanges)
    assert [[(r['id'], r['t'], r['initiator'], r['partner']) for r in rows] for rows in exchanges][0] == [[(r['id'], r['t'], r['initiator'], r['partner']) for r in rows] for rows in exchanges][1]
    mismatches = [sum(not r['depthKindMatch'] for r in rows) for rows in exchanges]
    changes = [sum(r['kindChanged'] for r in rows) for rows in exchanges]
    assert mismatches == [7, 0] and changes == [0, 10]
    for phase, p, n, records in zip(('before', 'after'), panels, native, exchanges):
        m = comparison['ordinary'][phase]
        assert m['snaps'] == m['naturalEnds'] == m['observerPlainMatches'] == 160
        assert m['blockExchangeEvents'] == len(records) == 18
        assert m['recordedExchangeKindsMismatchingDepthRule'] == sum(not r['depthKindMatch'] for r in records)
        assert m['exchangesWithKindChanges'] == sum(r['kindChanged'] for r in records)
        assert m['partnerOwnImagesAbsentAtExchange'] == 18  # unchanged collector is active-initiator only
        assert m['stuffs'] == sum(t['result']['offenseYards'] <= 0 for t in p['trials']) == 37
        assert abs(m['meanYards'] - sum(t['result']['offenseYards'] for t in p['trials']) / 160) < 1e-9
        assert m['earnedClimbs'] == sum(t['earnedClimbs'] for t in p['trials']) == 118
        assert m['olFalls'] == sum(o['falls'] for t in p['trials'] for o in t['olMetrics'].values()) == 13
        assert comparison['nativeLimits'][phase] == n['limits']
        assert len(n['ordinary']) == 118 and len(n['supplemental']) == 3
        assert all(r['continuity'] and r['nativeLoaded'] for r in n['ordinary'] + n['supplemental'])
        assert comparison['keeperContinuity']['all162'][phase]['records'] == 121
    pairs = comparison['pairedResults']
    assert len(pairs) == 160
    for pair, old, new in zip(pairs, panels[0]['trials'], panels[1]['trials']):
        assert pair['id'] == old['id'] == new['id']
        assert pair['beforeYards'] == old['result']['offenseYards'] and pair['afterYards'] == new['result']['offenseYards']
        assert abs(pair['yardsDelta'] - (pair['afterYards'] - pair['beforeYards'])) < 1e-9
    adverse = [p for p in pairs if p['yardsDelta'] < 0]
    assert adverse == comparison['adverseAnyGainPairs'] and len(adverse) == 1
    assert adverse[0]['id'] == 'CT-R1-wz_strong-under-R-S3' and adverse[0]['beforeYards'] == .40 and adverse[0]['afterYards'] == .38

    # Dedicated event-boundary records capture BOTH actual observers, rather
    # than assigning the initiator's picture to his unrecorded partner.
    films = [read(HERE / f'witness-{phase}.json.gz') for phase in ('before', 'after')]
    recipient_images = [0, 0]
    decisions = [0, 0]
    for index, (film, pin, panel) in enumerate(zip(films, (BEFORE, AFTER), panels)):
        prior.source_pin(film, pin)
        assert film['schema'] == 'ol-work-exchange-film-v1' and film['collectorSha256'] == WITNESS
        assert [p['id'] for p in film['plays']] == FILM_IDS
        assert film['moduleSha256']['src/physics/world.ts'] == WORLD
        by_id = {p['id']: p for p in panel['trials']}
        for play in film['plays']:
            prior.finite(play)
            assert play['observerVerified'] and play['observedSignature'] == play['plainSignature'] and play['naturalEnd']
            assert play['selection'] == 'fixed-before-outcomes' and play['result']['outcome'] != 'timeout'
            counterpart = by_id[play['id'].replace('WX-', 'CT-')]
            assert {k: v for k, v in play['result'].items() if k not in ('frames', 'telemetry')} == counterpart['result']
            assert play['result']['telemetry']['level'] == 'full'
            for row in play['exchanges']:
                decisions[index] += 1
                assert row['physicsStepRecorded'] and abs(row['completedAt'] - row['t'] - .05) < 1e-9
                assert row['physicalStateUnchangedAtDecision'] and row['physicalJointsUnchangedAtDecision']
                assert [s['physical'] for s in row['before']] == [s['physical'] for s in row['afterDecision']]
                assert [s['joints'] for s in row['before']] == [s['joints'] for s in row['afterDecision']]
                a, b = row['participants']
                before = {s['slot']: s for s in row['before']}
                after = {s['slot']: s for s in row['afterDecision']}
                assert before[a]['plan']['target'] == after[b]['plan']['target'] and before[b]['plan']['target'] == after[a]['plan']['target']
                assert all(not s['engagement'] and not s['plan']['combination'] and s['plan']['kind'] not in RESERVED for s in before.values())
                for slot in (a, b):
                    images = [c['image'] for c in row['consumedImages'] if c['observer'] == slot and c['target'] == after[slot]['plan']['target']]
                    if slot == b:
                        recipient_images[index] += bool(images)
                    if index:
                        assert images and images[-1]['age'] >= 0
                        expected = 'climb' if images[-1]['pos']['x'] > play['los'] + 2 else solo_kind(counterpart, slot)
                        assert after[slot]['plan']['kind'] == expected
                        installed = next(m['plan'] for m in counterpart['initialProjection']['ownership'] if m['slot'] == slot)
                        assert after[slot]['plan']['drive'] == ({'x': 1, 'y': 0} if expected == 'climb' else installed['drive'])
                for delivered, achieved in zip(row['loads'], row['afterPhysics']):
                    assert delivered['slot'] == achieved['slot']
                    assert delivered['achievedPos'] == achieved['physical']['pos'] and delivered['achievedVel'] == achieved['physical']['vel']
                    for amount, limit in (('armImpulse', 'armImpulseLimit'), ('armWork', 'armWorkLimit'), ('supportMotorWork', 'supportMotorWorkLimit')):
                        assert delivered[amount] <= delivered[limit] + 1e-7
    assert films[0]['cohort'] == films[1]['cohort'] and decisions == [2, 2] and recipient_images == [0, 2]
    for old, new in zip(*(f['plays'] for f in films)):
        assert old['id'] == new['id'] and old['initialSha256'] == new['initialSha256'] and old['profileSha256'] == new['profileSha256']
        assert old['players'] == new['players'] and old['result']['frames'][0] == new['result']['frames'][0]
    before_duo, after_duo = films[0]['plays'][0], films[1]['plays'][0]
    assert [r['t'] for r in after_duo['exchanges']] == [2.2, 3.1]
    rg_before = next(s for s in before_duo['exchanges'][0]['afterDecision'] if s['slot'] == 'RG')
    rg_after = next(s for s in after_duo['exchanges'][0]['afterDecision'] if s['slot'] == 'RG')
    assert rg_before['plan']['kind'] == 'climb' and rg_after['plan']['kind'] == 'drive' and rg_after['plan']['target'] == 'DT_S'

    integrity, browser = [read(HERE / name) for name in ('film-integrity.json', 'browser-check.json')]
    assert integrity['schema'] == 'ol-work-exchange-film-integrity-v1'
    assert integrity['clips'] == integrity['predeterminedClips'] == integrity['naturalFinishes'] == 8
    for key in ('eightObserverControlsNeutral', 'exactFullTelemetry', 'exactEventsPlayersProfilesRatingsWeights',
                'exactNativeExchangeAndCompletedStepRecords', 'crossSourceProfilesInitialStatesAndPositionsMatch', 'zipHtmlByteExact'):
        assert integrity[key]
    assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
    assert integrity['htmlSha256'] == sha(ROOT / 'viewer/ol-work-exchanges.html') and integrity['zipSha256'] == sha(ROOT / 'viewer/ol-work-exchanges.zip')
    assert len(browser['clips']) == 8 and browser['pageErrors'] == []
    for key in ('externalHttpsBlocked', 'recordedSourceFilter', 'pairedFixtureSearch',
                'frontConceptCoverageGrouping', 'mobileNoHorizontalOverflow'):
        assert browser[key], key
    videos = browser['videoExport']
    assert len(videos) == 2 and [v['sourceSha256'] for v in videos] == [BEFORE, AFTER]
    assert all(v['bytes'] > 0 and v['sourceStampCorrect'] for v in videos)
    with zipfile.ZipFile(ROOT / 'viewer/ol-work-exchanges.zip') as archive:
        assert archive.testzip() is None and archive.namelist() == ['ol-work-exchanges.html']
        assert archive.read('ol-work-exchanges.html') == (ROOT / 'viewer/ol-work-exchanges.html').read_bytes()
    checks = read(HERE / 'checks.json')
    assert checks['sourceSha256'] == AFTER and checks['sourceFrozen']
    assert checks['fullTypeScript']['passed'] == 773 and checks['fullTypeScript']['files'] == 70
    full_tests = (HERE / 'full-tests.log').read_text()
    assert '773 passed (773)' in full_tests and '70 passed (70)' in full_tests
    assert 'Unhandled Error' not in full_tests
    assert '24 passed (24)' in (HERE / 'tests-after.log').read_text()
    assert '17 failed | 7 passed (24)' in (HERE / 'tests-before.log').read_text()
    assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
    for name in ('fullTypeScript', 'typecheck', 'build', 'python', 'focused'):
        assert checks[name]['exitCode'] == 0
    assert checks['baselineFeatureControl']['exitCode'] == 1
    assert checks['baselineFeatureControl']['featureFailures'] == 17 and checks['baselineFeatureControl']['controlPasses'] == 7
    assert checks['panel']['matchedInputs'] == checks['panel']['naturalEndsPerPhase'] == 162
    assert checks['panel']['observedPlainControls'] == 324
    assert checks['witnessFilm']['clips'] == checks['witnessFilm']['observedPlainControls'] == 8
    return {'fullInitialProjectionMatches': 162, 'panelObservedPlainMatches': 324,
            'ordinaryCompleteExecutionsExact': exact, 'ordinaryExchangeEventsPerPhase': [18, 18],
            'recordedInitiatorKindMismatches': mismatches, 'exchangesChangingKind': changes,
            'ordinaryNativeKeeperTransfersPerPhase': [118, 118], 'supplementalNativeKeeperTransfersPerPhase': [3, 3],
            'everyKeeperJointContinuousAndLoaded': True, 'ordinaryStuffs': [37, 37], 'ordinaryOLFalls': [13, 13],
            'retainedAdverseWZUnderRightSeed3': [.40, .38], 'filmNaturalClips': 8, 'filmObservedPlainMatches': 8,
            'filmExchangeDecisionsPerPhase': decisions, 'recipientOwnImagesAtDecision': recipient_images,
            'recipientRGReclassifiedSurfaceWork': True, 'videoExportsSourceVerified': 2}


def main():
    manifest = read(HERE / 'verification-manifest.json')
    assert manifest['schema'] == 'ol-work-exchange-verification-v1'
    assert manifest['beforeSourceSha256'] == BEFORE and manifest['finalSourceSha256'] == AFTER and manifest['worldSha256'] == WORLD
    assert manifest['comparisonSha256'] == COMPARATOR and manifest['witnessCollectorSha256'] == WITNESS
    assert manifest['checks'] == read(HERE / 'checks.json')
    for name, expected in manifest['files'].items():
        assert sha(ROOT / name) == expected, name
    proof = audit()
    assert proof == manifest['independentChecks']
    if '--engine' in sys.argv:
        for name, expected in manifest['currentCodeFiles'].items():
            assert sha(ROOT / name) == expected, name
        assert manifest['changedEngineFiles'] == ['src/sim/behaviors/blocking.ts'] and manifest['addedEngineFiles'] == []
        paths = sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix())
        with tempfile.TemporaryDirectory(prefix='ol-work-exchange-', dir='/tmp') as directory:
            scratch = Path(directory)
            changed = scratch / 'src/sim/behaviors/blocking.ts'
            changed.parent.mkdir(parents=True)
            changed.write_bytes((ROOT / 'src/sim/behaviors/blocking.ts').read_bytes())
            subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
            def source_at(previous=False):
                digest = hashlib.sha256()
                for p in paths:
                    name = p.relative_to(ROOT).as_posix()
                    actual = changed if previous and name == 'src/sim/behaviors/blocking.ts' else p
                    digest.update(name.encode() + b'\0' + actual.read_bytes() + b'\0')
                return digest.hexdigest()
            assert source_at() == AFTER and source_at(True) == BEFORE
    print(json.dumps({'passed': True, **proof, 'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))


if __name__ == '__main__':
    main()
