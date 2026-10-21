"""Compare saved visible-help football guards without resimulation.

The full tackle signatures include the perception ring. Compare physical paths,
attempts and observations separately from those opaque signatures when its
schema changes. Every paired case and every observed difference is retained.
"""
import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import statistics

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = HERE.parent / 'block-fit'
BEFORE_SOURCE = 'ad945eb091cb8a699dbff4f020ed183266e492a18f5afb585716d3acaf958aeb'
AFTER_SOURCE = '5b6c2f84e77672496996cb7caeb58341e09b7f53f6455919329b8823ea334f84'
RUN_INPUTS = ('roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings')
TACKLE_PHYSICAL = ('id', 'input', 'speed', 'states', 'events', 'firsts', 'closest',
                   'final', 'maxWorkResidual', 'maxMotorWorkExcess')
COLLECTORS = {'current-runs': 'scripts/diag/run-contact-review.ts',
              'current-tackles': 'scripts/diag/tackle-timing-review.ts',
              'current-games9': 'scripts/diag/held-recovery-football.ts'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def value_sha(value):
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
    raw = path.read_bytes()
    value = json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)
    finite(value)
    return value


def saved_file(folder, stem):
    for suffix in ('.json.gz', '.json'):
        path = folder / (stem + suffix)
        if path.is_file():
            return path
    raise FileNotFoundError(f'Missing {stem}.json[.gz] in {folder}')


def paired_reports(folder, stem):
    paths = [saved_file(BASELINE, stem), saved_file(folder, stem)]
    before, after = reports = [load(path) for path in paths]
    for report, expected in zip(reports, (BEFORE_SOURCE, AFTER_SOURCE)):
        assert report['sourceBefore'] == report['sourceAfter'] == expected, stem
    for key in ('schema', 'scriptSha256', 'node', 'definitions', 'limitations'):
        if key in before:
            assert before[key] == after[key], (stem, key)
    assert sha(ROOT / COLLECTORS[stem]) == before['scriptSha256'], 'Collector bytes changed'
    provenance = [{'file': str(path.resolve().relative_to(ROOT)), 'sha256': sha(path),
                   'source': report['sourceBefore'], 'script': COLLECTORS[stem],
                   'scriptSha256': report['scriptSha256']}
                  for path, report in zip(paths, reports)]
    return before, after, provenance


def differences(before, after, path='$'):
    """Keep exact changed values and distinguish an absent field from null."""
    if before == after:
        return []
    if isinstance(before, dict) and isinstance(after, dict):
        result = []
        for key in sorted(before.keys() | after.keys()):
            at = f'{path}.{key}'
            if key not in before:
                result.append({'path': at, 'beforePresent': False, 'after': after[key]})
            elif key not in after:
                result.append({'path': at, 'before': before[key], 'afterPresent': False})
            else:
                result.extend(differences(before[key], after[key], at))
        return result
    if isinstance(before, list) and isinstance(after, list):
        result = []
        for index in range(max(len(before), len(after))):
            at = f'{path}[{index}]'
            if index >= len(before):
                result.append({'path': at, 'beforePresent': False, 'after': after[index]})
            elif index >= len(after):
                result.append({'path': at, 'before': before[index], 'afterPresent': False})
            else:
                result.extend(differences(before[index], after[index], at))
        return result
    return [{'path': path, 'before': before, 'after': after}]


def observer_checks_runs(report):
    assert len(report['trials']) == 144
    assert all(row['observerVerified'] in (None, True) for row in report['trials'])
    checked = [row['id'] for row in report['trials'] if row['observerVerified'] is True]
    assert len(checked) == report['observerVerifiedCount'] == 7
    return checked


def summarize_runs(rows):
    gains = [row['yards'] for row in rows]
    return {'snaps': len(rows), 'meanYards': statistics.mean(gains),
            'medianLowerSampleYards': sorted(gains)[(len(gains) - 1) // 2],
            'medianMidpointYards': statistics.median(gains),
            'stuffs': sum(gain <= 0 for gain in gains),
            'explosives10': sum(gain >= 10 for gain in gains),
            'finishCauses': dict(sorted(Counter(row['finishCause'] for row in rows).items())),
            'penalizedSnaps': sum(row['penalty'] is not None for row in rows),
            'turnovers': sum(row['turnover'] for row in rows),
            'timeouts': sum(row['outcome'] == 'timeout' for row in rows),
            'contactByCarrierSlot': dict(sorted(Counter(row['firstContact']['carrier']
                                      for row in rows if row['firstContact']).items())),
            'lowerReachReleases': sum(row['lowerReachReleases'] for row in rows),
            'maxMomentumResidualKgYdS': max(row['maxMomentumResidual'] for row in rows),
            'maxWorkResidualKgYd2S2': max(row['maxWorkResidual'] for row in rows),
            'maxMotorWorkExcessKgYd2S2': max(row['maxMotorWorkExcess'] for row in rows)}


def physical_limits(summary):
    assert summary['timeouts'] == summary['lowerReachReleases'] == 0
    assert summary['maxMotorWorkExcessKgYd2S2'] == 0
    assert 0 <= summary['maxMomentumResidualKgYdS'] < 1e-7
    assert 0 <= summary['maxWorkResidualKgYd2S2'] < 1e-7


def run_endpoint(row):
    return {key: row[key] for key in ('yards', 'outcome', 'finishCause', 'duration',
            'possession', 'turnover', 'penalty', 'handoffAt', 'firstContact',
            'firstBlockContactAt', 'missedAttempts', 'brokenHolds')}


def compare_runs(folder):
    before, after, provenance = paired_reports(folder, 'current-runs')
    assert before['cohort'] == after['cohort']
    left = {row['id']: row for row in before['trials']}
    right = {row['id']: row for row in after['trials']}
    assert len(left) == len(right) == 144 and left.keys() == right.keys()
    assert all(all(left[key][field] == right[key][field] for field in RUN_INPUTS) for key in left)
    checked = [observer_checks_runs(report) for report in (before, after)]
    assert checked[0] == checked[1]
    summaries = [summarize_runs(report['trials']) for report in (before, after)]
    for summary, report in zip(summaries, (before, after)):
        physical_limits(summary)
        for key in ('snaps', 'stuffs', 'explosives10', 'finishCauses', 'timeouts', 'lowerReachReleases'):
            assert summary[key] == report['summary'][key]
        assert summary['medianLowerSampleYards'] == report['summary']['medianYards']
        assert math.isclose(summary['meanYards'], report['summary']['meanYards'], abs_tol=1e-12)
    pairs = []
    ignored = {'id', *RUN_INPUTS, 'observedSignature', 'observerVerified'}
    for trial_id in left:
        a, b = left[trial_id], right[trial_id]
        pa = {key: value for key, value in a.items() if key not in ignored}
        pb = {key: value for key, value in b.items() if key not in ignored}
        delta = differences(pa, pb)
        pairs.append({'id': trial_id, 'run': a['run'], 'front': a['front'],
                      'before': run_endpoint(a), 'after': run_endpoint(b),
                      'gainDelta': b['yards'] - a['yards'],
                      'physicalPayloadSha256': {'before': value_sha(pa), 'after': value_sha(pb)},
                      'physicalPayloadIdentical': not delta, 'physicalDifferences': delta,
                      'observedSignature': {'before': a['observedSignature'], 'after': b['observedSignature']}})
    by_concept = [{'run': run,
                   'before': summarize_runs([row for row in left.values() if row['run'] == run]),
                   'after': summarize_runs([row for row in right.values() if row['run'] == run])}
                  for run in before['cohort']['runs']]
    by_front = [{'run': run, 'front': front,
                 'before': summarize_runs([row for row in left.values() if row['run'] == run and row['front'] == front]),
                 'after': summarize_runs([row for row in right.values() if row['run'] == run and row['front'] == front])}
                for run in before['cohort']['runs'] for front in before['cohort']['fronts']]
    return {'provenance': provenance, 'matchedInitialInputsProfilesToolAndSeeds': True,
            'cohortSha256': value_sha(before['cohort']),
            'inputAndRBProfileSha256': value_sha([{key: row[key] for key in ('id', *RUN_INPUTS)} for row in left.values()]),
            'before': summaries[0], 'after': summaries[1],
            'byConcept': by_concept, 'byConceptFront': by_front,
            'physicalPayloadIdenticalCount': sum(row['physicalPayloadIdentical'] for row in pairs),
            'equalGains': sum(row['gainDelta'] == 0 for row in pairs),
            'lowerGains': sum(row['gainDelta'] < 0 for row in pairs),
            'higherGains': sum(row['gainDelta'] > 0 for row in pairs),
            'lowerGainCaseIds': [row['id'] for row in pairs if row['gainDelta'] < 0],
            'differentFinishCauseIds': [row['id'] for row in pairs if row['before']['finishCause'] != row['after']['finishCause']],
            'observerCheckedIdsPerPhase': checked[0], 'pairs': pairs}


def tackle_observers(report):
    checks = report['observerChecks']
    assert len(checks) == report['recording']['observedAndUnrecordedMatches'] == 64
    assert report['recording']['recordedAndUnrecordedMatches'] == 9
    assert all(row['passed'] and row['observed'] == row['plain'] for row in checks)
    return {row['id']: row for row in checks}


def compact_pose_change(row):
    match = re.fullmatch(r'\$\.diagnostics\[(\d+)\]\.perceivedCarrier\[(\d+)\]\.seen\.pose', row['path'])
    assert match, row['path']
    return [int(match[1]), int(match[2]), row.get('beforePresent', True), row.get('before'),
            row.get('afterPresent', True), row.get('after')]


def compare_tackles(folder):
    before, after, provenance = paired_reports(folder, 'current-tackles')
    for key in ('inputSha256', 'cohortSha256', 'profilesSha256', 'primaryInputs',
                'witnessInputs', 'filmIds', 'recording', 'method', 'timing'):
        assert before[key] == after[key], key
    observers = [tackle_observers(report) for report in (before, after)]
    left = {row['id']: row for row in before['primary'] + before['witnesses']}
    right = {row['id']: row for row in after['primary'] + after['witnesses']}
    assert len(left) == len(right) == 64 and left.keys() == right.keys()
    pairs = []
    for trial_id in left:
        a, b = left[trial_id], right[trial_id]
        for key in ('input', 'speed', 'selection', 'profile', 'profileSha256'):
            assert a[key] == b[key], (trial_id, key)
        for row in (a, b):
            assert row['maxMotorWorkExcess'] == 0 and 0 <= row['maxWorkResidual'] < 1e-7
        pa = {key: a[key] for key in TACKLE_PHYSICAL}
        pb = {key: b[key] for key in TACKLE_PHYSICAL}
        physical_delta = differences(pa, pb)
        observation_delta = differences(a['diagnostics'], b['diagnostics'], '$.diagnostics')
        pose_delta = [row for row in observation_delta if row['path'].endswith('.seen.pose')]
        other_delta = [row for row in observation_delta if not row['path'].endswith('.seen.pose')]
        pairs.append({'id': trial_id, 'group': a['input']['group'], 'profileSha256': a['profileSha256'],
                      'before': {'firsts': a['firsts'], 'final': a['final']},
                      'after': {'firsts': b['firsts'], 'final': b['final']},
                      'physicalRecordSha256': {'before': value_sha(pa), 'after': value_sha(pb)},
                      'physicalRecordIdentical': not physical_delta, 'physicalDifferences': physical_delta,
                      'attemptDifferences': differences(a['attempts'], b['attempts'], '$.attempts'),
                      'diagnosticRecordSha256': {'before': value_sha(a['diagnostics']), 'after': value_sha(b['diagnostics'])},
                      'poseObservationDifferences': [compact_pose_change(row) for row in pose_delta],
                      'otherDiagnosticDifferences': other_delta,
                      'fullSignatureIncludingOpaquePerceptionRing': {'before': a['signature'], 'after': b['signature']},
                      'observerChecks': {'before': observers[0][trial_id], 'after': observers[1][trial_id]}})
    summary_keys = ('primarySummary', 'witnessSummary', 'byGeometry')
    mirror_before = [{key: value for key, value in row.items() if key != 'signature'} for row in before['mirrors']]
    mirror_after = [{key: value for key, value in row.items() if key != 'signature'} for row in after['mirrors']]
    return {'provenance': provenance, 'matchedInitialInputsProfilesToolAndSeeds': True,
            'inputSha256': before['inputSha256'], 'cohortSha256': before['cohortSha256'],
            'profilesSha256': before['profilesSha256'],
            'before': {key: before[key] for key in summary_keys},
            'after': {key: after[key] for key in summary_keys},
            'physicalRecordIdenticalCount': sum(row['physicalRecordIdentical'] for row in pairs),
            'differentPhysicalRecordIds': [row['id'] for row in pairs if not row['physicalRecordIdentical']],
            'attemptIdenticalCount': sum(not row['attemptDifferences'] for row in pairs),
            'nonPoseDiagnosticIdenticalCount': sum(not row['otherDiagnosticDifferences'] for row in pairs),
            'poseObservationDifferenceColumns': ['diagnosticIndex', 'perceivedCarrierReadIndex',
                                                  'beforePresent', 'beforePose', 'afterPresent', 'afterPose'],
            'poseObservationDifferenceCount': sum(len(row['poseObservationDifferences']) for row in pairs),
            'poseAddedValueCounts': dict(Counter('unknown' if diff[5] is None else diff[5]
                for row in pairs for diff in row['poseObservationDifferences'] if not diff[2] and diff[4])),
            'fullSignatureChangedCount': sum(row['fullSignatureIncludingOpaquePerceptionRing']['before'] !=
                                             row['fullSignatureIncludingOpaquePerceptionRing']['after'] for row in pairs),
            'mirrorPhysicalDifferences': differences(mirror_before, mirror_after), 'pairs': pairs}


def compare_games(folder):
    before, after, provenance = paired_reports(folder, 'current-games9')
    for key in ('seed', 'rosterSha256', 'excludedWarmGameSeed', 'gamesOnly', 'benchmarkOnly'):
        assert before[key] == after[key], key
    assert before['gamesOnly'] is True and before['benchmarkOnly'] is False
    assert before['benchmark'] == after['benchmark'] == []
    assert len(before['games']) == len(after['games']) == 2
    assert [row['seed'] for row in before['games']] == [row['seed'] for row in after['games']]
    for report in (before, after):
        assert all(row['physicalTimeoutsIncludingNullified'] == 0 for row in report['games'])
        physical_limits({'timeouts': 0, 'lowerReachReleases': report['physics']['lowerHoldReleases'],
                         'maxMotorWorkExcessKgYd2S2': report['physics']['maxMotorWorkExcessKgYd2S2'],
                         'maxMomentumResidualKgYdS': report['physics']['maxMomentumResidualKgYdS'],
                         'maxWorkResidualKgYd2S2': report['physics']['maxWorkResidualKgYd2S2']})
    omitted = {'wallMs', 'cpuMs'}
    physics_omitted = {'nativeWorldTickMedianMs', 'nativeWorldTickP95Ms'}
    return {'provenance': provenance, 'matchedInitialRosterAndSeedsOnly': True,
            'rosterSha256': before['rosterSha256'], 'excludedWarmGameSeed': before['excludedWarmGameSeed'],
            'before': [{key: value for key, value in row.items() if key not in omitted} for row in before['games']],
            'after': [{key: value for key, value in row.items() if key not in omitted} for row in after['games']],
            'beforePhysics': {key: value for key, value in before['physics'].items() if key not in physics_omitted},
            'afterPhysics': {key: value for key, value in after['physics'].items() if key not in physics_omitted},
            'timingOmittedBecauseTrajectoriesAndGameCallsCanDiverge': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate-dir', type=Path, default=HERE)
    args = parser.parse_args()
    baseline_manifest = load(BASELINE / 'verification-manifest.json')
    world_sha = baseline_manifest['engineFiles']['src/physics/world.ts']
    assert sha(ROOT / 'src/physics/world.ts') == world_sha
    runs = compare_runs(args.candidate_dir)
    tackles = compare_tackles(args.candidate_dir)
    games = compare_games(args.candidate_dir)
    result = {'schema': 'visible-help-transfer-validation-v1', 'validatorSha256': sha(Path(__file__)),
              'WorldUnchangedSha256': world_sha,
              'scope': 'Saved football regression guards; no resimulation, NFL calibration or cost measurement.',
              'comparisonPolicy': {
                  'physicalHashes': 'Python canonical hashes of the retained JSON fields; not the engine opaque full signature.',
                  'opaqueSignatureChange': 'The unchanged tackle tool includes a private perception ring in its full signature. Its storage stride changes from 6 to 7 and observed pose is added. A changed full signature alone is not proof of changed motion. Unexposed full-signature components cannot be reconstructed here.',
                  'observations': 'Every observed diagnostic difference is retained. Pose differences use the reported column table, indexed into diagnostics[diagnosticIndex].perceivedCarrier[perceivedCarrierReadIndex].seen.pose. Presence flags distinguish absent from null. Other differences retain exact paths and values.',
                  'metadata': 'Engine source and file hashes are retained separately. Run timestamps, command output paths and wall/CPU measurements are not interpreted as physics changes.',
              },
              'limits': [
                  'All paired runs share initial inputs, roster profiles and seeds; later decisions and draws may diverge.',
                  'Run gains are offense-credited outcomes, not unpenalized physical gain. A defensive fumble returner can own first carrier contact.',
                  'The 64 tackle encounters reuse geometry. Exact retained physical paths are regression controls, not fresh tackle-rate evidence.',
                  'A live six-second tackle endpoint is a censor, not a forced failure or engine timeout.',
                  'Two games share initial seeds and roster only; later playcalls, trajectories and RNG consumption can diverge.',
                  'Small controlled panels and two games cannot demonstrate NFL significance, league means or computational speed.',
                  'Residual and motor-limit checks validate recorded accounting, not the correctness of all football mechanics.',
              ], 'runs': runs, 'tackles': tackles, 'games': games}
    finite(result)
    (HERE / 'transfer-validation.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(json.dumps({'passed': True, 'runs': {key: runs[key] for key in
                      ('before', 'after', 'physicalPayloadIdenticalCount', 'equalGains', 'lowerGains', 'higherGains')},
                      'tackles': {key: tackles[key] for key in ('physicalRecordIdenticalCount', 'attemptIdenticalCount',
                         'nonPoseDiagnosticIdenticalCount', 'poseObservationDifferenceCount', 'fullSignatureChangedCount')},
                      'games': [{'seed': row['seed'], 'score': row['score']} for row in games['after']],
                      'gamePhysics': games['afterPhysics']}, indent=2))


if __name__ == '__main__':
    main()
