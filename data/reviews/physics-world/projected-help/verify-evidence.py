"""Verify saved coverage-help evidence; --engine reconstructs the four source pins.

This checks the frozen comparisons and guards, without resimulation. It does not
turn repeated judgments, a retrospective film witness or two games into rates.
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
BASELINE = HERE.parent / 'grasp-reel'
PINS = {
    'beforeSourceSha256': '248a44cfeab595291717eb5ace15b98c55b19a17e3fd29d87a706bc30018bd57',
    'finalSourceSha256': '704158f29be7a7e31b669fddfbf1cecb2fe2332d37a18eaa2db16a3f69e59c12',
    'farPrototypeSourceSha256': '3242197ad8c1f8b56e97fbe5dd7220950eda0956db6758a01157b4c16ed6ac82',
    'nearOnlyAblationSourceSha256': 'afc90f1680febde1134b0db5df9f110f9bb717cf1655c78895b6ba0bdf62e483',
}
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
WITNESS = 'HELP-R2-gun_trips_11-smash-cover4-S3'


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
assert manifest['schema'] == 'projected-help-verification-v1'
assert all(manifest[key] == value for key, value in PINS.items())
assert manifest['worldSha256'] == WORLD
assert manifest['changedEngineFiles'] == ['src/sim/coverage/judgment.ts']
for name, expected in manifest['files'].items():
    assert sha(ROOT / name) == expected, name

panels = [load(HERE / f'panel-{phase}.json.gz') for phase in ('before', 'after')]
before, after = panels
source_pin(before, PINS['beforeSourceSha256'])
source_pin(after, PINS['finalSourceSha256'])
for key in ('toolSha256', 'sourceVersionToolSha256', 'inputSha256', 'profilesSha256', 'inputs', 'inspectionSeconds'):
    assert before[key] == after[key], key
assert before['capModel'] == 'legacy-spacing' and after['capModel'] == 'projected-motion'
assert all(len(p['rows']) == len(p['observerNeutrality']) == 24 for p in panels)
for panel in panels:
    assert all(c['initial'] and c['final'] and c['observedSignature'] == c['plainSignature']
               and c['observedInitialSignature'] == c['plainInitialSignature']
               for c in panel['observerNeutrality'])
    recorded = [r for r in panel['rows'] if r['recording']]
    assert len(recorded) == 5
    assert all(r['selection'] == 'fixed-before-outcomes' for r in recorded[:4])
    assert recorded[4]['id'] == WITNESS and recorded[4]['selection'] == 'retained-retrospective-witness'
for b, a in zip(before['rows'], after['rows']):
    assert b['id'] == a['id']
    assert all(b[k] == a[k] for k in ('input', 'players', 'profileSha256', 'initialContext',
                                      'initialSignature', 'initialFootballSignature'))

# Independently reconstruct final acceptance from the consumed visible picture.
# Hidden actual state is diagnostic output and never enters this calculation.
queries = candidates = accepted = 0
for row in after['rows']:
    for decision in row['decisions']:
        for query in decision['queries']:
            queries += 1
            rd, error = query['route'], query['error']
            accepted_targets = []
            for c in query['candidates']:
                candidates += 1
                seen = c['seen']
                depth = seen['pos']['x'] - rd['pos']['x']
                closing = rd['vel']['x'] - seen['vel']['x']
                horizon = c['decisionInterval'] + max(0, seen.get('age') or 0)
                projected_depth = depth - closing * horizon
                lateral = abs(seen['pos']['y'] - rd['pos']['y']
                              + (seen['vel']['y'] - rd['vel']['y']) * horizon)
                assert math.isclose(depth, c['depth'], rel_tol=0, abs_tol=1e-10)
                assert math.isclose(horizon, c['persistenceHorizon'], rel_tol=0, abs_tol=1e-10)
                assert math.isclose(projected_depth, c['projectedDepth'], rel_tol=0, abs_tol=1e-10)
                assert math.isclose(lateral, c['projectedLateral'], rel_tol=0, abs_tol=1e-10)
                result = (seen.get('pose') in (None, 'up') and seen['vel']['x'] > -1
                          and depth > .4 - error and projected_depth > .4 - error
                          and lateral < 2.3 + error and depth < 6)
                assert c['accepted'] == result
                if result:
                    accepted_targets.append(c['target'])
                    accepted += 1
            assert len(accepted_targets) <= 1
            assert not accepted_targets or query['candidates'][-1]['target'] == accepted_targets[0]
            assert query['accepted'] == bool(accepted_targets)
            assert query['acceptedCandidate'] == (accepted_targets[0] if accepted_targets else None)
assert queries == after['summary']['capQueries'] == 450
assert accepted == after['summary']['acceptedCaps'] == 100

comparison = load(HERE / 'comparison.json')
assert comparison['validatorSha256'] == sha(HERE / 'compare.py')
assert comparison['endpointDefinitionsSha256'] == sha(HERE.parent / 'visible-help/compare.py')
assert comparison['collectorSha256'] == after['toolSha256']
assert len(comparison['pairs']) == comparison['identicalInitialContexts'] == 24
assert comparison['identicalExecutions'] == 23 and comparison['identicalFullEndpointContexts'] == 21
assert comparison['matchedDirectiveChanges'] == 2
assert all(p['acceptedFarCandidateQueries'] == 0 for p in comparison['phases'])
witness = next(p for p in comparison['pairs'] if p['id'] == WITNESS)
assert len(witness['matchedDirectiveChanges']) == 2 and not witness['executionIdentical']
assert witness['before']['censored'] and not witness['after']['censored']
assert witness['before']['interceptedBy'] is not None and witness['after']['completed']

# Prototype and near-only ablation retain their own exact sources and collectors.
prototype = [load(HERE / 'far-prototype' / f'panel-{phase}.json.gz') for phase in ('before', 'after')]
source_pin(prototype[0], PINS['beforeSourceSha256'])
source_pin(prototype[1], PINS['farPrototypeSourceSha256'])
assert prototype[0]['toolSha256'] == prototype[1]['toolSha256'] == sha(HERE / 'far-prototype/collector.ts')
assert all(len(p['rows']) == 24 and sum(bool(r['recording']) for r in p['rows']) == 4 for p in prototype)
assert '11 failed | 10 passed (21)' in (HERE / 'far-prototype/tests-before.log').read_text()
source_pin(load(HERE / 'far-prototype/current-games9.json'), PINS['farPrototypeSourceSha256'])
ablation = load(HERE / 'panel-near-only-ablation.json.gz')
source_pin(ablation, PINS['nearOnlyAblationSourceSha256'])
source_pin(load(HERE / 'near-only-games9.json'), PINS['nearOnlyAblationSourceSha256'])
for a, b, c in zip(after['rows'], ablation['rows'], prototype[1]['rows']):
    assert a['id'] == b['id'] == c['id']
    assert a['input'] == b['input'] == c['input'] and a['players'] == b['players'] == c['players']
    assert a['endpointContext'] == b['endpointContext'] == c['endpointContext']

# Compare every saved run/tackle row, not merely their aggregate outcomes.
for stem, count, fields in (('runs', 144, ('trials',)), ('tackles', 64, ('primary', 'witnesses'))):
    old, new = [load(folder / f'current-{stem}.json.gz') for folder in (BASELINE, HERE)]
    source_pin(old, PINS['beforeSourceSha256'])
    source_pin(new, PINS['finalSourceSha256'])
    assert old['scriptSha256'] == new['scriptSha256']
    old_rows, new_rows = [[row for field in fields for row in p[field]] for p in (old, new)]
    assert len(old_rows) == len(new_rows) == len({r['id'] for r in old_rows}) == count
    assert old_rows == new_rows
    if stem == 'runs':
        assert old['cohort'] == new['cohort'] and old['observerVerifiedCount'] == new['observerVerifiedCount'] == 7
        assert all(r['observerVerified'] in (None, True) for r in new_rows)
    else:
        for key in ('inputSha256', 'cohortSha256', 'profilesSha256', 'primaryInputs', 'witnessInputs', 'observerChecks'):
            assert old[key] == new[key], key
        assert len(new['observerChecks']) == 64
        assert all(c['passed'] and c['observed'] == c['plain'] for c in new['observerChecks'])
        assert old['recording']['recordedAndUnrecordedMatches'] == new['recording']['recordedAndUnrecordedMatches'] == 9
games = [load(folder / 'current-games9.json') for folder in (BASELINE, HERE)]
for p, pin in zip(games, (PINS['beforeSourceSha256'], PINS['finalSourceSha256'])):
    source_pin(p, pin)
    assert p['seed'] == 9 and p['gamesOnly'] and len(p['games']) == 2
assert games[0]['scriptSha256'] == games[1]['scriptSha256']
assert games[0]['rosterSha256'] == games[1]['rosterSha256']
assert [g['seed'] for g in games[0]['games']] == [g['seed'] for g in games[1]['games']]
# Only initial game inputs are paired; later calls, outcomes and draws diverge.

integrity = load(HERE / 'film-integrity.json')
assert integrity['clips'] == 10 and integrity['predeterminedClips'] == 8 and integrity['retrospectiveWitnessClips'] == 2
assert integrity['naturalFinishes'] == 9 and integrity['liveInspectionCensors'] == 1
for key in ('exactFullTelemetry', 'exactRawEventsActorsNotesTimes', 'exactInitialContextsProfilesRatingsWeights',
            'crossSourceInitialFootballStateAndPlayersMatch', 'all24CrossSourceInitialContextsMatch',
            'all24ObserverControlsPerPhaseNeutral', 'exactNaturalEndpointsAndLiveCensors',
            'creditedYardsNotComputed', 'recordedFrameTimesAndPossession', 'zipHtmlByteExact'):
    assert integrity[key], key
assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
assert integrity['htmlSha256'] == sha(ROOT / 'viewer/projected-help.html')
assert integrity['zipSha256'] == sha(ROOT / 'viewer/projected-help.zip')
assert [c['sourceSha256'] for c in integrity['sourceComparison']] == [PINS['beforeSourceSha256'], PINS['finalSourceSha256']]
for c, path in zip(integrity['sourceComparison'], (HERE / 'panel-before.json.gz', HERE / 'panel-after.json.gz')):
    assert c['rawReportSha256'] == sha(path)
assert integrity['maxExistingPackingPositionFacingError'] <= .050000001
browser = load(HERE / 'browser-check.json')
assert browser['pageErrors'] == [] and len(browser['clips']) == 10
assert all(c['fullTelemetry'] and c['naturalFinishOrLiveCensor'] and c['copiedReferenceUsesSelectedEngineSource']
           for c in browser['clips'])
videos = browser['videoExportUsesSelectedEngineSource']
assert len(videos) == 2
assert [v['selectedSourceSha256'] for v in videos] == [PINS['beforeSourceSha256'], PINS['finalSourceSha256']]
assert all(v['nonemptyBytes'] > 0 and v['paintedStampUsesSelectedSource']
           and v['selectedSourceSha256'][:12] in v['downloadFilename'] for v in videos)
with zipfile.ZipFile(ROOT / 'viewer/projected-help.zip') as archive:
    assert archive.testzip() is None and archive.namelist() == ['projected-help.html']
    assert archive.read('projected-help.html') == (ROOT / 'viewer/projected-help.html').read_bytes()
assert '678 passed (678)' in (HERE / 'tests.log').read_text()
assert '6 failed | 15 passed (21)' in (HERE / 'tests-before.log').read_text()
assert '39 passed (39)' in (HERE / 'focused.log').read_text()
assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
assert manifest['checks']['testsPassed'] == 678 and manifest['checks']['pythonTestsPassed'] == 22
assert all(value == 0 for key, value in manifest['checks'].items() if key.endswith('ExitCode'))

if '--engine' in sys.argv:
    for name, expected in manifest['currentCodeFiles'].items():
        assert sha(ROOT / name) == expected, name
    assert sha(ROOT / 'src/physics/world.ts') == WORLD
    with tempfile.TemporaryDirectory(prefix='projected-help-source-', dir='/tmp') as directory:
        scratch = Path(directory)
        original = scratch / 'src/sim/coverage/judgment.ts'
        original.parent.mkdir(parents=True)
        original.write_bytes((ROOT / 'src/sim/coverage/judgment.ts').read_bytes())
        subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
        variants = {'beforeSourceSha256': original.read_bytes(),
                    'finalSourceSha256': (ROOT / 'src/sim/coverage/judgment.ts').read_bytes(),
                    'farPrototypeSourceSha256': (HERE / 'far-prototype/judgment.ts').read_bytes(),
                    'nearOnlyAblationSourceSha256': (HERE / 'near-only-judgment.ts').read_bytes()}
        hashes = {key: hashlib.sha256() for key in PINS}
        for path in sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()),
                           key=lambda p: p.relative_to(ROOT).as_posix()):
            name, raw = path.relative_to(ROOT).as_posix(), path.read_bytes()
            for key, digest in hashes.items():
                body = variants[key] if name == 'src/sim/coverage/judgment.ts' else raw
                digest.update(name.encode() + b'\0' + body + b'\0')
        assert all(digest.hexdigest() == PINS[key] for key, digest in hashes.items())
print(json.dumps({'passed': True, 'fixedPairs': 24, 'visibleQueriesChecked': queries,
                  'visibleCandidatesChecked': candidates, 'runRowsIdentical': 144,
                  'tackleRowsIdentical': 64, 'filmClips': 10, 'liveCensors': 1,
                  'retainedBaselineTestFailures': 6, 'assetHashes': len(manifest['files']),
                  'engineChecked': '--engine' in sys.argv}))
