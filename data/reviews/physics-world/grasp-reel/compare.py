"""Compare saved grasp-reel oracles, convergence fixtures and football guards.

No simulation. --local-only checks the completed local panels before the saved
football guards are available. Full raw panels remain beside this comparison.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OLD = HERE.parent / 'visible-help'
BEFORE = '5b6c2f84e77672496996cb7caeb58341e09b7f53f6455919329b8823ea334f84'
AFTER = '248a44cfeab595291717eb5ace15b98c55b19a17e3fd29d87a706bc30018bd57'
BASE_COMMIT = '72910904ceccf5fecb9c94d8f9a11a08f44007b7'
TOOLS = ['scripts/diag/hand-convergence.ts', 'scripts/diag/grasp-support-convergence.ts',
         'scripts/diag/grasp-integration-review.ts', 'src/lab/scenarios.ts',
         'scripts/source-version.ts', 'scripts/diag/run-contact-review.ts',
         'scripts/diag/tackle-timing-review.ts', 'scripts/diag/held-recovery-football.ts']


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def fingerprint(value):
    return digest(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value), 'Nonfinite saved measurement'
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


def locate(folder, stem):
    for suffix in ('.json.gz', '.json'):
        path = folder / (stem + suffix)
        if path.is_file():
            return path
    raise FileNotFoundError(f'Missing saved {stem} in {folder}')


def pair(path_a, path_b):
    reports = [load(path_a), load(path_b)]
    for report, expected in zip(reports, (BEFORE, AFTER)):
        if 'sourceBefore' in report:
            assert report['sourceBefore'] == report['sourceAfter'] == expected
        else:
            assert report['sourceSha256'] == expected
    return (*reports, [{'file': str(path.resolve().relative_to(ROOT)), 'sha256': digest(path.read_bytes())}
                      for path in (path_a, path_b)])


def first_change(a, b, at='$'):
    if a == b:
        return None
    if isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(a.keys() | b.keys()):
            if key not in a or key not in b:
                return {'path': f'{at}.{key}', 'beforePresent': key in a,
                        'afterPresent': key in b, 'before': a.get(key), 'after': b.get(key)}
            found = first_change(a[key], b[key], f'{at}.{key}')
            if found:
                return found
    elif isinstance(a, list) and isinstance(b, list):
        for index, (x, y) in enumerate(zip(a, b)):
            found = first_change(x, y, f'{at}[{index}]')
            if found:
                return found
        return {'path': at, 'beforeLength': len(a), 'afterLength': len(b)}
    return {'path': at, 'before': a, 'after': b}


def matched_rows(a, b, keys):
    indexed = [{tuple(row[key] for key in keys): row for row in rows} for rows in (a, b)]
    assert len(indexed[0]) == len(a) and len(indexed[1]) == len(b)
    assert indexed[0].keys() == indexed[1].keys(), 'Input identifiers changed'
    return [(left, indexed[1][key]) for key, left in indexed[0].items()]


def convergence(rows, steps):
    reference = {(row['seed'], row['rusherPower']): row for row in rows if row['substeps'] == 192}
    result = []
    for step in steps:
        selected = [row for row in rows if row['substeps'] == step]
        assert len(selected) == len(reference) == 9
        errors = [abs(row['closest'] - reference[(row['seed'], row['rusherPower'])]['closest']) for row in selected]
        past_errors = [abs(row['carriedPast'] - reference[(row['seed'], row['rusherPower'])]['carriedPast']) for row in selected]
        result.append({'substeps': step, 'fixtures': 9, 'meanClosestErrorYd': statistics.mean(errors),
            'maxClosestErrorYd': max(errors),
            'meanCarriedPastErrorYd': statistics.mean(past_errors), 'maxCarriedPastErrorYd': max(past_errors),
            'maxMomentumResidualKgYdS': max(row['momentumError'] for row in selected),
            'maxOverlapYd': max(row['maxPenetration'] for row in selected),
            'fallDisagreementIds': [[row['seed'], row['rusherPower']] for row in selected
                if row['falls'] != reference[(row['seed'], row['rusherPower'])]['falls']],
            'cornerDisagreementIds': [[row['seed'], row['rusherPower']] for row in selected
                if row['cornerTurned'] != reference[(row['seed'], row['rusherPower'])]['cornerTurned']]})
    return result


def local_panels(folder):
    a, b, provenance = pair(locate(folder, 'hand-before'), locate(folder, 'hand-after'))
    assert a['cohort'] == b['cohort'] and a['node'] == b['node']
    hand = {'provenance': provenance, 'cohort': a['cohort'],
        'beforeConvergence': convergence(a['redirects'], a['cohort']['substeps'][:-1]),
        'afterConvergence': convergence(b['redirects'], b['cohort']['substeps'][:-1]),
        'redirectPairs': [{'before': x, 'after': y, 'identical': x == y} for x, y in
                         matched_rows(a['redirects'], b['redirects'], ('seed', 'rusherPower', 'substeps'))],
        'frontalPairs': [{'before': x, 'after': y, 'identical': x == y} for x, y in
                        matched_rows(a['frontalApproaches'], b['frontalApproaches'], ('bearing', 'speed', 'substeps'))]}
    hand['redirectIdenticalCount'] = sum(row['identical'] for row in hand['redirectPairs'])
    hand['frontalIdenticalCount'] = sum(row['identical'] for row in hand['frontalPairs'])
    assert all(row['finite'] for report in (a, b) for key in ('redirects', 'frontalApproaches') for row in report[key])
    a, b, provenance = pair(locate(folder, 'support-before'), locate(folder, 'support-after'))
    fixtures = []
    for x, y in matched_rows(a['fixtures'], b['fixtures'], ('seed', 'power')):
        trials = []
        for p, q in matched_rows(x['trials'], y['trials'], ('substeps',)):
            compact = lambda row: {key: row[key] for key in ('substeps', 'falls', 'momentumError', 'workError')}
            trials.append({'before': compact(p), 'after': compact(q), 'framesIdentical': p['frames'] == q['frames'],
                'frameHashes': [fingerprint(p['frames']), fingerprint(q['frames'])],
                'firstFrameChange': first_change(p['frames'], q['frames'])})
        fixtures.append({'seed': x['seed'], 'power': x['power'], 'initialHashes': [fingerprint(x['initial']), fingerprint(y['initial'])],
            'initialMatches': x['initial'] == y['initial'], 'initialMismatch': first_change(x['initial'], y['initial']),
            'profilesMatch': [body['profile'] for body in x['initial']['bodies']] == [body['profile'] for body in y['initial']['bodies']],
            'incomingJointsMatch': x['initial']['joints'] == y['initial']['joints'], 'trials': trials})
    support = {'provenance': provenance, 'fixtures': fixtures,
        'switchedPairs': [{'before': x, 'after': y, 'identical': x == y,
                          'incomingWrapMatches': x['wrap'] == y['wrap']} for x, y in
                         matched_rows(a['switched'], b['switched'], ('seed', 'power', 'before', 'after'))]}
    support['initialMismatchIds'] = [[row['seed'], row['power']] for row in fixtures if not row['initialMatches']]
    support['trialFramesIdenticalCount'] = sum(trial['framesIdentical'] for row in fixtures for trial in row['trials'])
    support['switchedIdenticalCount'] = sum(row['identical'] for row in support['switchedPairs'])
    support['changedFallSets'] = [[row['seed'], row['power'], trial['before']['substeps']]
        for row in fixtures for trial in row['trials'] if trial['before']['falls'] != trial['after']['falls']]
    support['changedSwitchedFallSets'] = [[row['before']['seed'], row['before']['power'], row['before']['before'], row['before']['after']]
        for row in support['switchedPairs'] if row['before']['falls'] != row['after']['falls']]
    a, b, provenance = pair(OLD / 'grasp-oracle.json.gz', locate(folder, 'oracle-after'))
    assert a['schema'] == b['schema'] and a['toolHashes'] == b['toolHashes']
    for path, expected in a['toolHashes'].items():
        assert digest((ROOT / path).read_bytes()) == expected
    oracle_rows = []
    assert len(a['rows']) == len(b['rows']) == 48
    for report in (a, b):
        assert sum(row['checks']['newtonianPositionPassed'] for row in report['rows']) == report['summary']['newtonianPositionPassed']
        assert sum(not row['checks']['newtonianPositionPassed'] and row['input']['active'] for row in report['rows']) == report['summary']['activePositionFailures']
        assert sum(not row['checks']['newtonianPositionPassed'] and not row['input']['active'] for row in report['rows']) == report['summary']['passivePositionFailures']
    for x, y in zip(a['rows'], b['rows']):
        assert x['input'] == y['input']
        capacities = lambda row: [(r['armImpulseLimit'], r['armWorkLimit']) for r in row['reports']]
        oracle_rows.append({'input': x['input'], 'initialMatches': x['initial'] == y['initial'],
            'initialMismatch': first_change(x['initial'], y['initial']), 'capacityLimitsMatch': capacities(x) == capacities(y),
            'before': {key: x[key] for key in ('checks', 'expected', 'gapErrorYd', 'momentumError', 'comError')},
            'after': {key: y[key] for key in ('checks', 'expected', 'gapErrorYd', 'momentumError', 'comError')},
            'passiveControlIdentical': x == y if not x['input']['active'] else None})
    assert all(row['initialMatches'] and row['capacityLimitsMatch'] for row in oracle_rows)
    oracle = {'provenance': provenance, 'beforeSummary': a['summary'], 'afterSummary': b['summary'],
        'WorldBeforeSha256': a['worldSha256'], 'WorldAfterSha256': b['worldSha256'], 'toolHashes': a['toolHashes'],
        'maxActivePositionErrorYd': [max(e['positionErrorYd'] for row in report['rows'] if row['input']['active'] for e in row['expected']) for report in (a, b)],
        'passiveRowsIdenticalCount': sum(row['passiveControlIdentical'] is True for row in oracle_rows), 'pairs': oracle_rows}
    assert digest((ROOT / 'src/physics/world.ts').read_bytes()) == b['worldSha256'] != a['worldSha256']
    a, b, provenance = pair(locate(folder, 'lower-oracle-before'), locate(folder, 'lower-oracle-after'))
    assert a['schema'] == b['schema'] and a['toolHashes'] == b['toolHashes']
    for path, expected in a['toolHashes'].items():
        assert digest((ROOT / path).read_bytes()) == expected
    assert len(a['rows']) == len(b['rows']) == 48
    lower_rows = []
    for x, y in zip(a['rows'], b['rows']):
        assert x['input'] == y['input'] and x['initial'] == y['initial']
        assert x['observerVerified'] is y['observerVerified'] is True
        assert x['physical']['grasp']['capacity'] == y['physical']['grasp']['capacity'] == x['input']['capacity']
        for key in ('armImpulseLimit', 'armWorkLimit', 'supportMotorWorkLimit'):
            assert x['physical']['report'][key] == y['physical']['report'][key]
        compact = lambda row: {'checks': row['checks'], 'expected': row['expected'], 'gapErrorYd': row['gapErrorYd'],
            'physicalSha256': row['physicalSha256'], 'supportMotorWork': row['physical']['report']['supportMotorWork'],
            'carrierFootOffset': row['physical']['bodies'][1]['support'].get('foot', {}).get('offset'),
            'workResidual': row['physical']['report']['work']['residual']}
        lower_rows.append({'input': x['input'], 'initialMatches': True, 'forceWorkCapacityLimitsMatch': True,
                           'before': compact(x), 'after': compact(y),
                           'passiveControlIdentical': x == y if not x['input']['active'] else None})
    for report in (a, b):
        assert sum(row['checks']['newtonianPositionPassed'] for row in report['rows']) == report['summary']['newtonianPositionPassed']
        assert sum(row['observerVerified'] for row in report['rows']) == report['summary']['observedRepeatChecks'] == 48
    lower = {'provenance': provenance, 'beforeSummary': a['summary'], 'afterSummary': b['summary'],
        'toolHashes': a['toolHashes'], 'WorldBeforeSha256': a['worldSha256'], 'WorldAfterSha256': b['worldSha256'],
        'maxActivePositionErrorYd': [max(e['positionErrorYd'] for row in report['rows'] if row['input']['active'] for e in row['expected']) for report in (a, b)],
        'passiveRowsIdenticalCount': sum(row['passiveControlIdentical'] is True for row in lower_rows), 'pairs': lower_rows}
    assert b['worldSha256'] == oracle['WorldAfterSha256']
    return {'hand': hand, 'support': support, 'oracle': oracle, 'lowerOracle': lower}


def guards(folder):
    result = {}
    for stem, tool in [('current-runs', 'run-contact-review'), ('current-tackles', 'tackle-timing-review'),
                       ('current-games9', 'held-recovery-football')]:
        a, b, provenance = pair(locate(OLD, stem), locate(folder, stem))
        assert a['scriptSha256'] == b['scriptSha256'] == digest((ROOT / f'scripts/diag/{tool}.ts').read_bytes())
        if stem == 'current-runs':
            assert a['cohort'] == b['cohort']
            pairs = []
            input_keys = ('roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings')
            for x, y in matched_rows(a['trials'], b['trials'], ('id',)):
                assert all(x[k] == y[k] for k in input_keys)
                selected = ('yards', 'outcome', 'finishCause', 'duration', 'possession', 'turnover', 'penalty',
                            'handoffAt', 'firstContact', 'firstBlockContactAt', 'missedAttempts', 'brokenHolds', 'stateAtFinish')
                pairs.append({'id': x['id'], 'run': x['run'], 'front': x['front'],
                    'before': {k: x[k] for k in selected}, 'after': {k: y[k] for k in selected},
                    'gainDelta': y['yards'] - x['yards'], 'allTrialFieldsIdentical': x == y,
                    'fullTrialHashes': [fingerprint(x), fingerprint(y)], 'firstTrialChange': first_change(x, y)})
            assert len(pairs) == 144
            for report in (a, b):
                assert report['observerVerifiedCount'] == sum(row['observerVerified'] is True for row in report['trials']) == 7
                assert all(row['observerVerified'] in (None, True) for row in report['trials'])
                assert report['summary']['timeouts'] == report['summary']['lowerReachReleases'] == 0
                assert max(row['maxMotorWorkExcess'] for row in report['trials']) == 0
            result['runs'] = {'provenance': provenance, 'before': a['summary'], 'after': b['summary'],
                'beforeByConcept': a['byConcept'], 'afterByConcept': b['byConcept'], 'pairs': pairs,
                'lowerGainIds': [row['id'] for row in pairs if row['gainDelta'] < 0],
                'higherGainIds': [row['id'] for row in pairs if row['gainDelta'] > 0],
                'equalGainCount': sum(row['gainDelta'] == 0 for row in pairs),
                'changedFinishCauseIds': [row['id'] for row in pairs if row['before']['finishCause'] != row['after']['finishCause']],
                'beforePhysicalLimits': {key: max(row[key] for row in a['trials']) for key in ('maxMomentumResidual', 'maxWorkResidual', 'maxMotorWorkExcess')},
                'afterPhysicalLimits': {key: max(row[key] for row in b['trials']) for key in ('maxMomentumResidual', 'maxWorkResidual', 'maxMotorWorkExcess')},
                'identicalTrialCount': sum(row['allTrialFieldsIdentical'] for row in pairs)}
        elif stem == 'current-tackles':
            for key in ('inputSha256', 'cohortSha256', 'profilesSha256'):
                assert a[key] == b[key]
            for report in (a, b):
                assert len(report['observerChecks']) == 64 and report['recording']['recordedAndUnrecordedMatches'] == 9
                assert all(row['passed'] and row['observed'] == row['plain'] for row in report['observerChecks'])
            pairs = []
            for x, y in matched_rows(a['primary'] + a['witnesses'], b['primary'] + b['witnesses'], ('id',)):
                assert x['input'] == y['input'] and x['profile'] == y['profile']
                assert x['maxMotorWorkExcess'] == y['maxMotorWorkExcess'] == 0
                pairs.append({'id': x['id'], 'group': x['input']['group'],
                    'before': {key: x[key] for key in ('firsts', 'final', 'events', 'maxWorkResidual')},
                    'after': {key: y[key] for key in ('firsts', 'final', 'events', 'maxWorkResidual')},
                    'allFieldsIdentical': x == y, 'fullTrialHashes': [fingerprint(x), fingerprint(y)],
                    'firstTrialChange': first_change(x, y)})
            assert len(pairs) == 64
            result['tackles'] = {'provenance': provenance, 'beforePrimary': a['primarySummary'], 'afterPrimary': b['primarySummary'],
                'beforeWitnesses': a['witnessSummary'], 'afterWitnesses': b['witnessSummary'], 'pairs': pairs,
                'changedFinalFieldIds': {key: [row['id'] for row in pairs if row['before']['final'][key] != row['after']['final'][key]]
                    for key in ('phase', 'outcome', 'missedTackles', 'brokenTackles', 'draws')},
                'changedFirstEventIds': {key: [row['id'] for row in pairs if row['before']['firsts'][key] != row['after']['firsts'][key]]
                    for key in pairs[0]['before']['firsts']},
                'maxCarrierEndpointChangeYd': max(math.dist([row['before']['final']['carrier']['pos'][key] for key in ('x', 'y')],
                    [row['after']['final']['carrier']['pos'][key] for key in ('x', 'y')]) for row in pairs),
                'identicalTrialCount': sum(row['allFieldsIdentical'] for row in pairs),
                'changedTrialIds': [row['id'] for row in pairs if not row['allFieldsIdentical']]}
        else:
            for key in ('seed', 'rosterSha256', 'excludedWarmGameSeed', 'gamesOnly'):
                assert a[key] == b[key]
            assert [row['seed'] for row in a['games']] == [row['seed'] for row in b['games']] and len(b['games']) == 2
            for report in (a, b):
                assert all(row['physicalTimeoutsIncludingNullified'] == 0 for row in report['games'])
                assert report['physics']['lowerHoldReleases'] == report['physics']['maxMotorWorkExcessKgYd2S2'] == 0
            result['games'] = {'provenance': provenance, 'matchedInitialSeedsAndRosterOnly': True,
                'rosterSha256': a['rosterSha256'],
                'before': [{k: v for k, v in row.items() if k not in ('wallMs', 'cpuMs')} for row in a['games']],
                'after': [{k: v for k, v in row.items() if k not in ('wallMs', 'cpuMs')} for row in b['games']],
                'beforePhysics': {k: v for k, v in a['physics'].items() if not k.startswith('nativeWorldTick')},
                'afterPhysics': {k: v for k, v in b['physics'].items() if not k.startswith('nativeWorldTick')}}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local-only', action='store_true')
    parser.add_argument('--input-dir', type=Path, default=HERE)
    args = parser.parse_args()
    tool_hashes = {}
    for path in TOOLS:
        baseline = subprocess.check_output(['git', 'show', f'{BASE_COMMIT}:{path}'], cwd=ROOT)
        current = (ROOT / path).read_bytes()
        assert baseline == current, f'Tool/fixture changed: {path}'
        tool_hashes[path] = digest(current)
    result = {'schema': 'grasp-reel-comparison-v1', 'validatorSha256': digest(Path(__file__).read_bytes()),
        'scope': 'All active-grasp body travel centered using achieved impulse, including torso and lower attachments. Foot-force and mobility rules are unchanged.',
        'baselineCommit': BASE_COMMIT, 'toolAndScenarioHashesUnchangedFromBaseline': tool_hashes,
        'local': local_panels(args.input_dir),
        'limits': ['Local reference subdivisions measure numerical convergence, not NFL fidelity.',
            'All raw panels are retained; compact rows keep endpoints, hashes and the first change rather than duplicating entire trajectories.',
            'Input/support mismatches are reported explicitly; a mismatched captured start is not a paired solver-only comparison.',
            'Force capacities are unchanged inputs. Delivered forces may change as physical positions change.',
            'A live tackle inspection endpoint is a censor, not an engine timeout or forced miss.',
            'Controlled gains are offense-credited; first contact can belong to a defensive fumble returner.',
            'Games match initial roster and seeds only. Later decisions, calls and draws may diverge; no NFL significance or cost claim.']}
    if not args.local_only:
        result['transfer'] = guards(args.input_dir)
    finite(result)
    output = HERE / ('local-comparison.json' if args.local_only else 'comparison.json')
    output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    transfer = result.get('transfer', {})
    print(json.dumps({'output': str(output.relative_to(ROOT)), 'oracle': result['local']['oracle']['afterSummary'],
        'lowerOracle': result['local']['lowerOracle']['afterSummary'],
        'handNative': next(row for row in result['local']['hand']['afterConvergence'] if row['substeps'] == 12),
        'runGains': {'lower': len(transfer['runs']['lowerGainIds']), 'higher': len(transfer['runs']['higherGainIds']),
                     'equal': transfer['runs']['equalGainCount']} if transfer else None,
        'tackleChangedRows': len(transfer['tackles']['changedTrialIds']) if transfer else None,
        'gameScores': [{'before': a['score'], 'after': b['score']} for a, b in
                      zip(transfer['games']['before'], transfer['games']['after'])] if transfer else None}, indent=2))


if __name__ == '__main__':
    main()
