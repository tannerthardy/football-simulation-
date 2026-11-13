"""Compare saved block-fit football guards; no simulation, rate fitting or timing claim.

Run from any directory after publishing current-* beside this script, or pass
--candidate-dir out/block-fit while the diagnostic output is still staged.
"""
import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = HERE.parent / 'ol-base'
BEFORE_SOURCE = 'ac876d5633b8172b7622ba65ec0579de56054df9a80c571a69e1da14b146e29c'
AFTER_SOURCE = 'ad945eb091cb8a699dbff4f020ed183266e492a18f5afb585716d3acaf958aeb'
RUN_INPUTS = ('roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings')
COLLECTORS = {'current-runs': 'scripts/diag/run-contact-review.ts',
              'current-tackles': 'scripts/diag/tackle-timing-review.ts',
              'current-games9': 'scripts/diag/held-recovery-football.ts'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value), 'Nonfinite diagnostic value'
    elif isinstance(value, dict):
        for item in value.values():
            finite(item)
    elif isinstance(value, list):
        for item in value:
            finite(item)


def load(path):
    data = path.read_bytes()
    result = json.loads(gzip.decompress(data) if path.suffix == '.gz' else data)
    finite(result)
    return result


def display_path(path):
    return str(path.resolve().relative_to(ROOT))


def candidate_file(directory, stem):
    for suffix in ('.json.gz', '.json'):
        path = directory / (stem + suffix)
        if path.is_file():
            return path
    raise FileNotFoundError(f'Missing {stem}.json[.gz] in {directory}')


def pair(directory, stem):
    paths = [candidate_file(BASELINE, stem), candidate_file(directory, stem)]
    reports = [load(path) for path in paths]
    before, after = reports
    for report, expected in zip(reports, (BEFORE_SOURCE, AFTER_SOURCE)):
        assert report['sourceBefore'] == report['sourceAfter'] == expected, stem
    for key in ('schema', 'scriptSha256', 'node', 'definitions', 'limitations'):
        if key in before:
            assert before[key] == after[key], (stem, key)
    assert digest(ROOT / COLLECTORS[stem]) == before['scriptSha256'], 'Collector source changed'
    provenance = [{'file': display_path(path), 'sha256': digest(path),
                   'source': report['sourceBefore'], 'script': COLLECTORS[stem],
                   'scriptSha256': report['scriptSha256']}
                  for path, report in zip(paths, reports)]
    return before, after, provenance


def run_summary(rows):
    gains = [row['yards'] for row in rows]
    return {'snaps': len(rows), 'meanYards': statistics.mean(gains),
            'medianYards': sorted(gains)[(len(gains) - 1) // 2],
            'midpointMedianYards': statistics.median(gains),
            'stuffs': sum(gain <= 0 for gain in gains),
            'explosives10': sum(gain >= 10 for gain in gains),
            'finishCauses': dict(sorted(Counter(row['finishCause'] for row in rows).items())),
            'timeouts': sum(row['outcome'] == 'timeout' for row in rows),
            'penalizedSnaps': sum(row['penalty'] is not None for row in rows),
            'turnovers': sum(row['turnover'] for row in rows),
            'firstCarrierContactSamples': sum(row['firstContact'] is not None for row in rows),
            'firstContactByCarrierSlot': dict(sorted(Counter(row['firstContact']['carrier']
                                          for row in rows if row['firstContact']).items())),
            'lowerReachReleases': sum(row['lowerReachReleases'] for row in rows),
            'maxMomentumResidualKgYdS': max(row['maxMomentumResidual'] for row in rows),
            'maxWorkResidualKgYd2S2': max(row['maxWorkResidual'] for row in rows),
            'maxMotorWorkExcessKgYd2S2': max(row['maxMotorWorkExcess'] for row in rows)}


def run_endpoint(row):
    return {key: row[key] for key in ('yards', 'outcome', 'finishCause', 'duration',
            'possession', 'turnover', 'penalty', 'handoffAt', 'firstContact',
            'firstBlockContactAt', 'missedAttempts', 'brokenHolds', 'carrierFalls',
            'lowerReachReleases', 'maxMomentumResidual', 'maxWorkResidual',
            'maxMotorWorkExcess', 'stateAtFinish')}


def validate_runs(directory):
    before, after, provenance = pair(directory, 'current-runs')
    assert before['cohort'] == after['cohort']
    left = {row['id']: row for row in before['trials']}
    right = {row['id']: row for row in after['trials']}
    assert len(left) == len(before['trials']) == len(right) == len(after['trials']) == 144
    assert left.keys() == right.keys()
    inputs = [{key: left[trial_id][key] for key in ('id', *RUN_INPUTS)} for trial_id in left]
    assert all(all(left[trial_id][key] == right[trial_id][key] for key in RUN_INPUTS)
               for trial_id in left)
    observer_ids = []
    for report in (before, after):
        rows = report['trials']
        assert all(row['observerVerified'] in (None, True) for row in rows)
        checked = [row['id'] for row in rows if row['observerVerified'] is True]
        observer_ids.append(checked)
        assert report['observerVerifiedCount'] == len(checked) == 7
        summary = run_summary(rows)
        for key in ('snaps', 'medianYards', 'stuffs', 'explosives10', 'finishCauses',
                    'timeouts', 'firstCarrierContactSamples', 'lowerReachReleases'):
            assert summary[key] == report['summary'][key], key
        assert math.isclose(summary['meanYards'], report['summary']['meanYards'], abs_tol=1e-12)
        assert summary['timeouts'] == summary['lowerReachReleases'] == 0
        assert summary['maxMotorWorkExcessKgYd2S2'] == 0
        assert summary['maxMomentumResidualKgYdS'] < 1e-7
        assert summary['maxWorkResidualKgYd2S2'] < 1e-7
    assert observer_ids[0] == observer_ids[1]
    pairs = []
    for trial_id in left:
        a, b = left[trial_id], right[trial_id]
        pairs.append({'id': trial_id, 'run': a['run'], 'front': a['front'],
                      'before': run_endpoint(a), 'after': run_endpoint(b),
                      'gainDelta': b['yards'] - a['yards'],
                      'becameStuff': a['yards'] > 0 >= b['yards'],
                      'ceasedStuff': a['yards'] <= 0 < b['yards'],
                      'becameExplosive10': a['yards'] < 10 <= b['yards'],
                      'ceasedExplosive10': a['yards'] >= 10 > b['yards'],
                      'differentFinishCause': a['finishCause'] != b['finishCause'],
                      'differentCreditedOutcome': any(a[key] != b[key] for key in
                                                    ('outcome', 'possession', 'turnover', 'penalty')),
                      'differentPhysicalFinishState': a['stateAtFinish'] != b['stateAtFinish']})
    by_concept = []
    by_concept_front = []
    for run in before['cohort']['runs']:
        rows_before = [row for row in left.values() if row['run'] == run]
        rows_after = [row for row in right.values() if row['run'] == run]
        selected = [row for row in pairs if row['run'] == run]
        by_concept.append({'run': run, 'before': run_summary(rows_before),
                           'after': run_summary(rows_after),
                           'lowerGains': sum(row['gainDelta'] < 0 for row in selected),
                           'higherGains': sum(row['gainDelta'] > 0 for row in selected),
                           'identicalGains': sum(row['gainDelta'] == 0 for row in selected)})
        for front in before['cohort']['fronts']:
            by_concept_front.append({'run': run, 'front': front,
                'before': run_summary([row for row in rows_before if row['front'] == front]),
                'after': run_summary([row for row in rows_after if row['front'] == front])})
    return {'provenance': provenance, 'matchedInputsProfilesAndTool': True,
            'inputsAndRBProfilesSha256': canonical_digest(inputs),
            'rosterSha256': before['cohort']['rosterSha256'],
            'before': run_summary(list(left.values())), 'after': run_summary(list(right.values())),
            'beforeCollectorSummary': before['summary'], 'afterCollectorSummary': after['summary'],
            'byConcept': by_concept, 'byConceptFront': by_concept_front,
            'identicalGains': sum(row['gainDelta'] == 0 for row in pairs),
            'lowerGains': sum(row['gainDelta'] < 0 for row in pairs),
            'higherGains': sum(row['gainDelta'] > 0 for row in pairs),
            'differentFinishes': sum(row['differentFinishCause'] for row in pairs),
            'differentCreditedOutcomes': sum(row['differentCreditedOutcome'] for row in pairs),
            'becameStuff': [row['id'] for row in pairs if row['becameStuff']],
            'ceasedStuff': [row['id'] for row in pairs if row['ceasedStuff']],
            'becameExplosive10': [row['id'] for row in pairs if row['becameExplosive10']],
            'ceasedExplosive10': [row['id'] for row in pairs if row['ceasedExplosive10']],
            'adverseLowerGainCases': [row['id'] for row in pairs if row['gainDelta'] < 0],
            'largestAbsoluteGainChanges': sorted(pairs, key=lambda row: abs(row['gainDelta']), reverse=True)[:10],
            'observerChecksPerPhase': len(observer_ids[0]), 'observerCheckedIds': observer_ids[0],
            'pairedGainsAndEndpoints': pairs}


def validate_tackles(directory):
    before, after, provenance = pair(directory, 'current-tackles')
    ignored = {'sourceBefore', 'sourceAfter', 'startedAt'}
    assert before.keys() == after.keys()
    assert all(before[key] == after[key] for key in before if key not in ignored), 'Tackle payload changed'
    assert len(after['primary']) == 56 and len(after['witnesses']) == 8
    assert all(row['passed'] and row['observed'] == row['plain'] for row in after['observerChecks'])
    assert len(after['observerChecks']) == after['recording']['observedAndUnrecordedMatches'] == 64
    assert after['recording']['recordedAndUnrecordedMatches'] == 9
    for row in after['primary'] + after['witnesses']:
        assert row['maxMotorWorkExcess'] == 0
        assert row['maxWorkResidual'] < 1e-7
    return {'provenance': provenance, 'identicalPayloadExceptTimestampAndSource': True,
            'inputSha256': after['inputSha256'], 'cohortSha256': after['cohortSha256'],
            'profilesSha256': after['profilesSha256'],
            'primary': after['primarySummary'], 'witnesses': after['witnessSummary'],
            'observerChecks': len(after['observerChecks']),
            'recordingChecks': after['recording']['recordedAndUnrecordedMatches']}


def validate_games(directory):
    before, after, provenance = pair(directory, 'current-games9')
    for key in ('seed', 'rosterSha256', 'excludedWarmGameSeed', 'gamesOnly', 'benchmarkOnly'):
        assert before[key] == after[key]
    assert before['gamesOnly'] is True and before['benchmarkOnly'] is False
    assert before['benchmark'] == after['benchmark'] == []
    assert [game['seed'] for game in before['games']] == [game['seed'] for game in after['games']]
    assert len(before['games']) == len(after['games']) == 2
    for report in (before, after):
        assert all(game['physicalTimeoutsIncludingNullified'] == 0 for game in report['games'])
        assert report['physics']['lowerHoldReleases'] == report['physics']['maxMotorWorkExcessKgYd2S2'] == 0
        assert report['physics']['maxMomentumResidualKgYdS'] < 1e-7
        assert report['physics']['maxWorkResidualKgYd2S2'] < 1e-7
    omitted = {'wallMs', 'cpuMs'}
    physics_omitted = {'nativeWorldTickMedianMs', 'nativeWorldTickP95Ms'}
    return {'provenance': provenance, 'matchedInitialRosterAndSeedsOnly': True,
            'rosterSha256': before['rosterSha256'], 'excludedWarmGameSeed': before['excludedWarmGameSeed'],
            'before': [{key: value for key, value in game.items() if key not in omitted} for game in before['games']],
            'after': [{key: value for key, value in game.items() if key not in omitted} for game in after['games']],
            'beforePhysics': {key: value for key, value in before['physics'].items() if key not in physics_omitted},
            'afterPhysics': {key: value for key, value in after['physics'].items() if key not in physics_omitted},
            'timingOmittedBecauseGamesDiverge': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate-dir', type=Path, default=HERE)
    args = parser.parse_args()
    runs = validate_runs(args.candidate_dir)
    tackles = validate_tackles(args.candidate_dir)
    games = validate_games(args.candidate_dir)
    result = {'schema': 'block-fit-transfer-validation-v1',
              'validatorSha256': digest(Path(__file__)),
              'scope': 'Saved paired football regression guards; no resimulation, NFL fit or timing benchmark.',
              'limits': [
                  'medianYards reproduces the collector lower sample quantile; midpointMedianYards is also reported.',
                  'Controlled runs share initial inputs, profiles, code and seeds; later decisions and draws may diverge.',
                  'Controlled run gains are offense-credited outcomes, not unpenalized physical gain.',
                  'A first carrier contact can belong to a defensive fumble returner; carrier slots are retained.',
                  'Adverse means lower credited offensive gain in a paired case, not proof of incorrect mechanics.',
                  'Live encounter inspection limits are censored, not forced misses or timeouts.',
                  'The 64 tackle encounters reuse geometry; unchanged payload is a regression control, not fresh efficacy evidence.',
                  'The two games share initial roster and seeds only. Later calls, decisions, draws and trajectories can diverge.',
                  'Two games and balanced controlled runs do not estimate league means or NFL calibration.',
                  'Residuals and motor limits check recorded accounting; they do not prove all football contact is accurate.',
              ], 'runs': runs, 'tackles': tackles, 'games': games}
    finite(result)
    (HERE / 'transfer-validation.json.gz').write_bytes(gzip.compress(
        (json.dumps(result, separators=(',', ':')) + '\n').encode(), mtime=0))
    print(json.dumps({'passed': True, 'runs': runs['after'],
                      'pairedRunGains': {key: runs[key] for key in ('identicalGains', 'lowerGains', 'higherGains', 'differentFinishes')},
                      'tackles': {'encounters': 64, 'identicalPayloadExceptTimestampAndSource': True,
                                  'primaryLiveCensors': tackles['primary']['stillLiveAtWindowEnd']},
                      'games': [{'seed': game['seed'], 'score': game['score']} for game in games['after']],
                      'gamePhysics': games['afterPhysics']}, indent=2))


if __name__ == '__main__':
    main()
