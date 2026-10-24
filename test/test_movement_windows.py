"""Frozen actor-window witnesses for the existing movement-task report command."""
import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/data'))
spec = importlib.util.spec_from_file_location('window_panel', ROOT / 'scripts/data/movement_task_report.py')
panel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(panel)
ACTOR = {'team': 'D', 'slot': 'FS', 'playerId': 'fixture-player'}
PIN = hashlib.sha256(b'same frozen synthetic constructor input').hexdigest()


def state(t, kind='body-only', treatment=False, support=True):
    if kind == 'stop-turn':
        x, y = (4*t - 4*t*t, 0.) if t <= .5 else (1., 2*(t-.5)**2)
        vx, vy = (4*(1-2*t), 0.) if t <= .5 else (0., 4*(t-.5))
    elif kind == 'paired':
        x = t if not treatment else t - .75*t*t if t <= .5 else .3125 + .25*(t-.5)
        y, vx, vy = 3*t, (1. if not treatment else 1. - 1.5*min(t, .5)), 3.
    else:
        x, y, vx, vy = 3*t, 0., 3., 0.
    result = dict(body=dict(position={'x': x, 'y': y}, velocity={'x': vx, 'y': vy}, facing=t*math.pi/2,
                           support={'state': 'up'} if support else None))
    if support:
        result.update(engagement=None, tackleBond=None, lastStepContacts=[])
    return result


def trace(kind='body-only', treatment=False, support=True):
    command = {'vel': {'x': 3., 'y': 0.}} if kind == 'body-only' else {'vel': {'x': 0., 'y': 3.}}
    steps = []
    for k in range(20):
        a, b = k / 20, (k + 1) / 20
        steps.append(dict(stepStart=a, endpointTime=b, actor=ACTOR,
            start=state(a, kind, treatment, support), endpoint=state(b, kind, treatment, support),
            decision=dict(evaluated=True, owner={'kind': 'synthetic control'}, raw=copy.deepcopy(command)),
            final=copy.deepcopy(command), rewrites=[]))
    return dict(meta=dict(engineSha256='synthetic fixture source', settings={'fixture': True}),
                verification={'setupSha256': PIN}, result={'yards': 7}, steps=steps)


def inputs(kind='body-only', support=True):
    case = dict(id='frozen-case', category=kind, actor=ACTOR, window=[0., 1.],
                source='Synthetic witness declared in test_movement_windows.py', inputSha256=PIN)
    if kind != 'body-only':
        case['desiredDirection'] = {'vector': {'x': 0., 'y': 1.}, 'source': 'frozen synthetic evaluation axis'}
    if kind == 'stop-turn':
        case['objective'] = {'point': {'x': 1., 'y': .5}, 'at': 1., 'source': 'recorded synthetic objective'}
    fixtures = dict(schema='movement-window-panel-v1', selection='Fixed case/actor/window before evaluating either arm',
                    arms=['reference', 'intervention'], cases=[case])
    trials = dict(inputSha256='unit fixture', trials=[dict(caseId=case['id'], arm=arm,
        inputSha256=PIN, trace=trace(kind, arm == 'intervention', support)) for arm in fixtures['arms']])
    return fixtures, trials


class MovementWindowTests(unittest.TestCase):
    def prediction_pair(self):
        fixtures, trials = inputs()
        fixtures['cases'][0]['target'] = {'team': 'O', 'slot': 'RB', 'playerId': 'recorded-target'}
        for trial in trials['trials']:
            trial['trace']['meta']['node'] = 'declared synthetic fixture runtime'
            trial['exposureKind'] = 'fixed-input-continuation'
            trial['trace']['targetTrajectory'] = dict(actor=fixtures['cases'][0]['target'],
                source='same synthetic execution, declared target',
                samples=[dict(t=k/20, position=dict(x=3*k/20+1, y=0)) for k in range(21)])
            trial['trace']['steps'][0]['pursuit'] = [dict(phase='decision', target=fixtures['cases'][0]['target'], data=dict(
                kind='intercept', prediction=dict(t=.5, point=dict(x=2, y=0),
                estimate=dict(status='estimated-feasible', horizon=3, arrivalTime=.4, slack=.1, physicalGuarantee=False)),
                estimateAppliesTo='sampled-point-before-bias-and-leverage', steeringPoint=dict(x=2.1, y=0),
                biasedTime=.55, steeringPointEstimate='not-evaluated'))]
        return fixtures, trials

    def test_recorded_prediction_join_uses_actual_target_not_perceived_goal(self):
        row = panel.build_report(*self.prediction_pair())['rows'][0]
        self.assertAlmostEqual(row['pursuit']['actualApproach']['closestObservedSeparationYd'], 1.)
        p = row['pursuit']['predictions'][0]
        self.assertEqual(p['sampledPredictionDeadline'], .5)
        self.assertEqual(p['actualPursuerDistanceToSampledPointYd'], .5)
        self.assertEqual(p['actualTargetDistanceToSampledPointYd'], .5)
        self.assertEqual(p['actualSeparationAtSampledDeadlineYd'], 1.)
        self.assertEqual(p['steeringPointEstimate'], 'not-evaluated')
        self.assertIn('unverified', p['requestConsumption'])
        self.assertEqual(row['requests'][0]['prediction']['status'], 'estimated-feasible')
        self.assertEqual(row['native']['objective']['status'], 'unavailable')
        fixtures, trials = self.prediction_pair()
        trials['trials'][0]['trace']['steps'][0]['pursuit'][0]['target'] = {'playerId': 'different-target'}
        p = panel.build_report(fixtures, trials)['rows'][0]['pursuit']['predictions'][0]
        self.assertEqual(p['actualPursuerDistanceToSampledPointYd'], .5)
        self.assertIsNone(p['actualTargetDistanceToSampledPointYd'])
        self.assertIn('different', p['targetIdentityStatus'])

    def test_deadline_without_observed_state_is_not_an_invented_arrival(self):
        fixtures, trials = self.prediction_pair()
        for trial in trials['trials']:
            trial['trace']['steps'][0]['pursuit'][0]['data']['prediction']['t'] = 1.5
        p = panel.build_report(fixtures, trials)['rows'][0]['pursuit']['predictions'][0]
        self.assertIsNone(p['actualPursuerDistanceToSampledPointYd'])
        self.assertIn('unavailable', p['deadlineObservationStatus'])

    def test_redirection_anchor_excludes_earlier_responses_without_moving_the_window(self):
        fixtures, trials = inputs('stop-turn')
        fixtures['cases'][0]['redirectionAfter'] = .75
        row = panel.build_report(fixtures, trials)['rows'][0]
        turn = row['native']['redirection']
        self.assertEqual(turn['firstPositiveAlongAxisAt'], .75)
        self.assertTrue(turn['positiveAtAnchor'])
        self.assertEqual(row['native']['actualStart'], 0.)
        self.assertEqual(row['native']['elapsedSeconds'], 1.)
        fixtures['cases'][0]['redirectionAfter'] = 1.1
        with self.assertRaisesRegex(ValueError, 'anchor'):
            panel.build_report(fixtures, trials)

    def test_portable_target_trace_checksums_and_conflicting_source_are_explicit(self):
        from movement_window_report import load_trace_files
        fixtures, trials = self.prediction_pair()
        with tempfile.TemporaryDirectory() as directory:
            target = copy.deepcopy(trials['trials'][0]['trace'])
            target.pop('targetTrajectory')
            target['verification']['traceVsPlain'] = None
            for step in target['steps']:
                step['actor'] = fixtures['cases'][0]['target']
            path = Path(directory)/'target.json'
            path.write_text(json.dumps(target))
            trial = trials['trials'][0]
            trial['trace'].pop('targetTrajectory')
            trial['targetTraceFile'] = path.name
            trial['targetTraceSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
            loaded = load_trace_files(trials, directory)
            report = panel.build_report(fixtures, loaded)
            self.assertEqual(report['rows'][0]['pursuit']['actualApproach']['status'], 'observed')
            self.assertEqual(report['rows'][0]['targetTraceIdentity']['sha256'], trial['targetTraceSha256'])
            path.write_text(json.dumps({**target, 'meta': {'engineSha256': 'changed'}}))
            row = panel.build_report(fixtures, load_trace_files(trials, directory))['rows'][0]
            self.assertEqual(row['pursuit']['actualApproach']['status'], 'unavailable')
            self.assertIn('checksum', row['pursuit']['actualApproach']['unavailableReason'])

    def test_wrong_or_conflicting_target_evidence_stays_unknown(self):
        for failure in ('identity', 'clock', 'source'):
            fixtures, trials = self.prediction_pair()
            target = trials['trials'][1]['trace']['targetTrajectory']
            if failure == 'identity':
                target['actor'] = {'playerId': 'someone-else'}
            elif failure == 'source':
                del target['source']
            else:
                target['samples'].append(dict(t=0., position=dict(x=99., y=99.)))
            with self.subTest(failure=failure):
                report = panel.build_report(fixtures, trials)
                self.assertEqual(report['rows'][1]['pursuit']['actualApproach']['status'], 'unavailable')
                self.assertEqual(report['rows'][1]['status'], 'complete')
                self.assertEqual(report['exposure']['unknownActualApproachTrials'], 1)

    def test_first_positive_axis_time_handles_an_actual_stop_and_entry_already_positive(self):
        row = panel.build_report(*inputs('stop-turn'))['rows'][0]
        self.assertEqual(row['native']['redirection']['firstPositiveAlongAxisAt'], .55)
        self.assertIsNone(row['native']['redirection']['firstHeadingErrorReductionAt']) # Native zero splits headings.
        self.assertFalse(row['native']['redirection']['positiveAtEntry'])
        straight = panel.build_report(*inputs())['rows'][0]['native']['redirection']
        self.assertTrue(straight['positiveAtEntry'])
        self.assertIsNone(straight['firstHeadingErrorReductionAt'])

    def test_inactive_policy_and_other_player_fumble_cannot_certify_transfer(self):
        fixtures, trials = self.prediction_pair()
        trials['trials'][1]['treatmentActivity'] = dict(source='owner activation witness', appliedCalls=0,
            actor=ACTOR, window=[0., 1.])
        trials['trials'][1]['trace']['result'] = dict(yards=0, outcome='fumble-by-another-player')
        report = panel.build_report(fixtures, trials)
        comparison = report['pairedComparisons'][0]
        self.assertEqual(comparison['activityStatus'], 'owner-reported-inactive')
        self.assertEqual(comparison['closestActualSeparationDeltaYd'], 0.)
        self.assertEqual(comparison['requests']['raw']['changedIntervals'], 0)
        self.assertEqual(report['rows'][1]['playResult']['outcome'], 'fumble-by-another-player')

    def test_activity_requires_a_source_and_keeps_whole_game_exposure_distinct(self):
        fixtures, trials = self.prediction_pair()
        candidate = trials['trials'][1]
        candidate['exposureKind'] = 'new-whole-game-exposure'
        candidate['treatmentActivity'] = dict(appliedCalls=1, actor=ACTOR, window=[0., 1.])
        candidate['trace']['steps'][3]['decision']['raw']['vel']['y'] = 1.
        report = panel.build_report(fixtures, trials)
        comparison = report['pairedComparisons'][0]
        self.assertEqual(comparison['activityStatus'], 'unavailable')
        self.assertEqual(comparison['exposureKind'], 'new-whole-game-exposure')
        self.assertEqual(comparison['requests']['raw']['firstChangedAt'], .15)
        candidate['treatmentActivity']['source'] = 'owner activation witness, exact selected case/window'
        comparison = panel.build_report(fixtures, trials)['pairedComparisons'][0]
        self.assertEqual(comparison['activityStatus'], 'owner-reported-active/request-changed')
        candidate['treatmentActivity']['window'] = [0., .5]
        self.assertEqual(panel.build_report(fixtures, trials)['pairedComparisons'][0]['activityStatus'], 'unavailable')

    def test_separate_target_trace_requires_same_source_input_and_observer_parity(self):
        for failure in ('none', 'source', 'observer', 'input'):
            fixtures, trials = self.prediction_pair()
            base = trials['trials'][0]['trace']
            base.pop('targetTrajectory')
            target = copy.deepcopy(base)
            target['verification']['traceVsPlain'] = None
            for s in target['steps']:
                s['actor'] = fixtures['cases'][0]['target']
            if failure == 'source':
                target['meta']['engineSha256'] = 'another-source'
            elif failure == 'observer':
                target['verification'].pop('traceVsPlain')
            elif failure == 'input':
                target['verification']['setupSha256'] = 'another-input'
            base['targetTrace'] = target
            with self.subTest(failure=failure):
                row = panel.build_report(fixtures, trials)['rows'][0]
                self.assertEqual(row['pursuit']['actualApproach']['status'], 'observed' if failure == 'none' else 'unavailable')

    def test_identical_saved_case_metrics_and_deterministic_report(self):
        fixtures, trials = inputs()
        a = panel.build_report(fixtures, trials)
        b = panel.build_report(copy.deepcopy(fixtures), copy.deepcopy(trials))
        self.assertEqual(a, b)
        self.assertEqual(a['rows'][0]['native'], a['rows'][1]['native'])
        self.assertEqual(a['exposure']['completeTrials'], 2)
        self.assertEqual(a['exposure']['unknownContactTrials'], 0)

    def test_body_turn_is_distinct_from_straight_travel_and_no_objective_is_inferred(self):
        report = panel.build_report(*inputs())
        row = report['rows'][0]
        self.assertAlmostEqual(row['native']['bodyRotation']['endpointDegrees'], 90)
        self.assertAlmostEqual(row['native']['travelDirectionChange']['endpointDegrees'], 0)
        self.assertEqual(row['native']['objective']['status'], 'unavailable')
        self.assertEqual(row['requests'][0]['prediction']['status'], 'unavailable:not-recorded')

    def test_known_stop_turn_time_direction_and_observed_arrival(self):
        row = panel.build_report(*inputs('stop-turn'))['rows'][0]
        native = row['native']
        self.assertEqual(native['elapsedSeconds'], 1.)
        self.assertEqual(native['entryVelocityYdS'], {'x': 4., 'y': 0.})
        self.assertEqual(native['travelDirectionChange']['endpointDegrees'], 90.)
        self.assertGreater(native['travelDirectionChange']['missingOrSlowFrames'], 0)
        self.assertEqual(native['speed']['entryToMinimumLossYdS'], 4.)
        self.assertEqual(native['transverseVelocity']['entry']['magnitudeYdS'], 4.)
        self.assertEqual(native['transverseVelocity']['exit']['magnitudeYdS'], 0.)
        self.assertEqual(native['objective']['arrivalErrorYd'], 0.)
        self.assertIsNotNone(row['filteredMotion']['measurements'])
        self.assertNotEqual(row['sampled']['speed']['minimumYdS'], native['speed']['minimumYdS'])

    def test_controller_pair_changes_transverse_response_even_with_same_final_yards(self):
        fixtures, trials = inputs('paired')
        self.assertEqual(trials['trials'][0]['trace']['result'], trials['trials'][1]['trace']['result'])
        baseline, intervention = panel.build_report(fixtures, trials)['rows']
        self.assertEqual(baseline['native']['entryVelocityYdS'], intervention['native']['entryVelocityYdS'])
        self.assertEqual(baseline['native']['transverseVelocity']['exit']['magnitudeYdS'], 1.)
        self.assertEqual(intervention['native']['transverseVelocity']['exit']['magnitudeYdS'], .25)

    def test_unknown_support_and_contact_do_not_become_free_or_standing(self):
        report = panel.build_report(*inputs(support=False))
        self.assertEqual(report['exposure']['unknownContactTrials'], 2)
        self.assertEqual(report['exposure']['unknownSupportTrials'], 2)
        self.assertEqual(report['exposure']['fallingOrDownTrials'], 0)
        self.assertEqual(report['rows'][0]['context']['supportStates'], {})

    def test_recorded_moving_objective_and_prediction_are_not_invented_arrival(self):
        fixtures, trials = inputs()
        for trial in trials['trials']:
            for step in trial['trace']['steps']:
                step['final']['objective'] = {'kind': 'moving', 'point': {'x': 3*step['stepStart']+2, 'y': 0},
                                              'velocity': {'x': 3, 'y': 0}}
            trial['trace']['steps'][0]['prediction'] = {'status': 'rejected', 'reason': 'explicit source witness'}
            trial['trace']['steps'][1]['prediction'] = None
            trial['trace']['steps'][1]['decision']['prediction'] = {'status': 'accepted', 'reason': 'explicit nested witness'}
        row = panel.build_report(fixtures, trials)['rows'][0]
        self.assertAlmostEqual(row['native']['objective']['closestObservedDistanceYd'], 2.)
        self.assertEqual(row['native']['objective']['mode'], 'contemporaneous-recorded-point-stream')
        self.assertIsNone(row['native']['objective']['arrivalErrorYd'])
        self.assertEqual(row['requests'][0]['prediction']['status'], 'rejected')
        self.assertEqual(row['requests'][1]['prediction']['status'], 'accepted')

    def test_sampled_terminal_interval_keeps_its_actual_short_duration(self):
        fixtures, trials = inputs()
        fixtures['cases'][0]['window'] = [0., .15]
        row = panel.build_report(fixtures, trials)['rows'][0]
        self.assertEqual(row['native']['elapsedSeconds'], .15)
        self.assertEqual(row['sampled']['elapsedSeconds'], .15)
        self.assertEqual(row['sampled']['frames'], 3)
        self.assertAlmostEqual(row['sampled']['speed']['entryYdS'], 3., places=12)
        self.assertEqual(row['filteredMotion']['status'], 'rejected')

    def test_failed_replay_verification_stays_rejected_in_exposure(self):
        fixtures, trials = inputs()
        trials['trials'][1]['trace']['verification']['traceVsPlain'] = {'field': 'body differs'}
        report = panel.build_report(fixtures, trials)
        self.assertEqual(report['exposure']['expectedTrials'], 2)
        self.assertEqual(report['exposure']['rejectedTrials'], 1)
        self.assertEqual(report['rows'][1]['replayVerification']['status'], 'failed')

    def test_intended_intervention_difference_is_not_an_observer_failure(self):
        fixtures, trials = inputs('paired')
        for trial in trials['trials']:
            trial['trace']['verification'].update(originalVsPlain=None, originalVsTrace=None, traceVsPlain=None)
        changed = {'field': 'result and path intentionally changed by controller intervention'}
        trials['trials'][1]['trace']['verification'].update(originalVsPlain=changed, originalVsTrace=changed)
        report = panel.build_report(fixtures, trials)
        self.assertEqual(report['rows'][1]['status'], 'complete')
        self.assertEqual(report['rows'][1]['replayVerification']['status'], 'reference-changed')
        self.assertEqual(report['rows'][1]['replayVerification']['observerParity'], 'passed')
        self.assertEqual(report['exposure']['changedReferenceExecutionTrials'], 1)
        self.assertEqual(report['rows'][1]['native']['transverseVelocity']['exit']['magnitudeYdS'], .25)

    def test_partial_fall_and_filtered_rejection_stay_in_expected_exposure(self):
        fixtures, trials = inputs()
        for trial in trials['trials']:
            trial['trace']['steps'] = trial['trace']['steps'][:2]
            trial['trace']['steps'][-1]['endpoint']['body']['support']['state'] = 'down'
        report = panel.build_report(fixtures, trials)
        self.assertEqual(report['exposure']['expectedTrials'], 2)
        self.assertEqual(report['exposure']['partialTrials'], 2)
        self.assertEqual(report['exposure']['filteredMeasurementRejectedTrials'], 2)
        self.assertEqual(report['exposure']['fallingOrDownTrials'], 2)
        self.assertEqual(report['rows'][0]['native']['elapsedSeconds'], .1)

    def test_missing_actor_conflict_and_input_mismatch_are_explicit(self):
        for failure in ('missing', 'actor', 'clock', 'pin', 'interval-gap'):
            fixtures, trials = inputs()
            bad = trials['trials'][1]
            if failure == 'missing':
                trials['trials'].pop()
            elif failure == 'actor':
                bad['trace']['steps'][0]['actor'] = {**ACTOR, 'slot': 'CB'}
            elif failure == 'clock':
                bad['trace']['steps'][0]['endpoint']['body']['velocity']['x'] = 99.
            elif failure == 'interval-gap':
                bad['trace']['steps'].pop(5)
            else:
                bad['trace']['verification']['setupSha256'] = 'other input'
            with self.subTest(failure=failure):
                report = panel.build_report(fixtures, trials)
                self.assertEqual(report['exposure']['expectedTrials'], 2)
                self.assertEqual(report['rows'][1]['status'], 'missing' if failure == 'missing' else 'partial' if failure == 'interval-gap' else 'rejected')
                if failure == 'interval-gap':
                    self.assertAlmostEqual(report['rows'][1]['context']['unrecordedIntervalSeconds'], .05)
                    self.assertEqual(report['exposure']['unknownContactTrials'], 1)

    def test_native_low_speed_heading_and_tracking_heading_rule_are_distinct(self):
        fixtures, trials = inputs()
        for trial in trials['trials']:
            for step in trial['trace']['steps']:
                for key, t in [('start', step['stepStart']), ('endpoint', step['endpointTime'])]:
                    body = step[key]['body']
                    theta = math.pi*t/2
                    body['velocity'] = dict(x=.5*math.cos(theta), y=.5*math.sin(theta))
                    body['position'] = dict(x=math.sin(theta)/math.pi, y=(1-math.cos(theta))/math.pi)
        row = panel.build_report(fixtures, trials)['rows'][0]
        self.assertAlmostEqual(row['native']['travelDirectionChange']['endpointDegrees'], 90.)
        self.assertIsNone(row['sampled']['travelDirectionChange']['endpointDegrees'])
        self.assertEqual(row['native']['travelDirectionChange']['minimumHeadingSpeedYdS'], 0)
        self.assertEqual(row['sampled']['travelDirectionChange']['minimumHeadingSpeedYdS'], 1)

    def test_existing_cli_reads_saved_trace_and_pins_the_selection_before_table(self):
        fixtures, trials = inputs('stop-turn')
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            selection = folder / 'selection.json'
            selection.write_text(json.dumps(fixtures))
            trials['inputSha256'] = hashlib.sha256(selection.read_bytes()).hexdigest()
            for i, trial in enumerate(trials['trials']):
                path = folder / f'trace{i}.json'
                path.write_text(json.dumps(trial.pop('trace')))
                trial['traceFile'] = path.name
            source = folder / 'trials.json'
            source.write_text(json.dumps(trials))
            command = [sys.executable, str(ROOT/'scripts/data/movement_task_report.py'), str(selection), str(source),
                       str(folder/'report.json'), '--table', str(folder/'table.md')]
            result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads((folder/'report.json').read_text())
            self.assertEqual(report['exposure']['completeTrials'], 2)
            self.assertEqual(report['inputFiles']['selection']['sha256'], trials['inputSha256'])
            self.assertIn('entry raw', (folder/'table.md').read_text())
            fixtures['cases'][0]['window'] = [0., .9]
            selection.write_text(json.dumps(fixtures))
            mismatch = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
            self.assertNotEqual(mismatch.returncode, 0)
            self.assertIn('Trial inputs differ', mismatch.stderr)


if __name__ == '__main__':
    unittest.main()
