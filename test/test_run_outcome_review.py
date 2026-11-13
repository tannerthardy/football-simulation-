"""Native run summaries preserve possession, censoring, contacts and pair eligibility."""
import copy
import importlib.util
import math
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('run_outcome_review', Path(__file__).parents[1] / 'scripts/diag/run-outcome-review.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
A, B, C = 'a' * 64, 'b' * 64, 'c' * 64


def trial(identifier='one', gain=4, natural=True, supplemental=False):
    return {'id': identifier, 'run': 'iz', 'front': 'over', 'flip': False, 'seed': 3,
            'roster': 0, 'formation': 'ace', 'supplemental': supplemental,
            'initialSha256': A, 'profileSha256': B,
            'initialProjection': {'players': [{'slot': 'LG', 'profile': {'massKg': 130}}, {'slot': 'LB_W', 'profile': {'massKg': 105}}], 'ownership': []},
            'observerVerified': True, 'observedSignature': A, 'plainSignature': A,
            'naturalEnd': natural, 'earnedClimbs': 0,
            'olMetrics': {'LG': {'firstHands': [], 'firstContacts': [], 'falls': 0, 'downs': 0}},
            'result': {'outcome': 'tackle' if natural else 'timeout', 'offenseYards': gain,
                       'endX': -500, 'turnover': False, 'duration': 3,
                       'stats': {'missedTackles': 0, 'brokenTackles': 0},
                       'events': [{'type': 'snap', 't': 0}, {'type': 'handoff', 't': 1.2}]}}


def report(trials=None, supplemental=None):
    return {'schema': audit.SCHEMA, 'sourceBefore': A, 'sourceAfter': A,
            'collectorSha256': B, 'moduleSha256': {'src/physics/world.ts': C},
            'cohort': {'los': 40, 'firstDownX': 50, 'rosterSha256': C},
            'trials': trials if trials is not None else [trial()],
            'supplementalTrials': supplemental if supplemental is not None else []}


def first_contact(t, other='LB_W', force=0, impulse=0):
    return {'t': t, 'completedAt': t + .05, 'other': other,
            'nativeLoad': {'liveHandsAfterPhysics': [{'a': 'LG', 'b': other, 'normalForce': force, 'tangentForce': 0}],
                           'physicalContacts': [{'other': other, 'impulse': impulse}]}}


class NativeRunOutcomeTests(unittest.TestCase):
    def test_fumble_return_terminal_position_never_supplies_offensive_gain(self):
        row = trial(gain=3)
        row['result'].update(endX=-500, possession='D', turnover=True)
        row['result']['events'].append({'type': 'fumble', 't': 2})
        summary = audit.summarize_report(report([row]))['ordinary']['overall']
        self.assertEqual(summary['yards']['naturalFinished']['mean'], 3)
        self.assertEqual(summary['gainRates']['stuff']['count'], 0)
        self.assertEqual(summary['eventsAndFlags']['fumbleEvents'], 1)

    def test_censors_nonfinite_and_supplementals_have_separate_denominators(self):
        rows = [trial('natural', 4), trial('censor', 30, natural=False), trial('missing', None), trial('nan', math.nan)]
        supplemental = [trial('supp', 99, supplemental=True)]
        summary = audit.summarize_report(report(rows, supplemental))
        ordinary = summary['ordinary']['overall']
        self.assertEqual(ordinary['counts']['snaps'], 4)
        self.assertEqual(ordinary['counts']['naturalEnds'], 3)
        self.assertEqual(ordinary['counts']['censors'], 1)
        self.assertEqual(ordinary['yards']['naturalFinished']['n'], 1)
        self.assertEqual(ordinary['yards']['censoredRecorded']['mean'], 30)
        self.assertEqual(ordinary['gainRates']['runs20Plus']['denominator'], 1)
        self.assertEqual(ordinary['gainRates']['runs20Plus']['count'], 0)
        self.assertEqual(summary['supplemental']['overall']['yards']['naturalFinished']['mean'], 99)

    def test_negative_zero_explosives_success_conversion_and_linear_quantiles(self):
        gains = [-1, 0, 3, 4, 7, 10, 20]
        summary = audit.summarize_report(report([trial(str(i), gain) for i, gain in enumerate(gains)]))['ordinary']['overall']
        rates = summary['gainRates']
        self.assertEqual(rates['negative']['count'], 1)
        self.assertEqual(rates['zero']['count'], 1)
        self.assertEqual(rates['stuff']['count'], 2)
        self.assertEqual(rates['runs10Plus']['count'], 2)
        self.assertEqual(rates['runs20Plus']['count'], 1)
        self.assertEqual(rates['firstDown40PercentGainProxy']['count'], 4)
        self.assertEqual(rates['gainDistanceConversion']['count'], 2)
        self.assertEqual(summary['yards']['naturalFinished']['median'], 4)
        self.assertAlmostEqual(summary['yards']['naturalFinished']['p10'], -.4)
        self.assertEqual(audit.distribution([])['n'], 0)
        self.assertIsNone(audit.distribution([])['mean'])

    def test_missing_ybc_and_handoff_have_own_sample_counts(self):
        rows = [trial('one'), trial('two')]
        rows[0]['result']['stats']['yardsBeforeContact'] = -1
        rows[1]['result']['events'] = [{'type': 'snap', 't': 0}]
        overall = audit.summarize_report(report(rows))['ordinary']['overall']
        self.assertEqual(overall['yardsBeforeContactProxy']['n'], 1)
        self.assertEqual(overall['yardsBeforeContactProxy']['mean'], -1)
        self.assertEqual(overall['handoff']['snapsWithHandoffEvent'], 1)
        self.assertEqual(overall['handoff']['delayFromRecordedSnap']['n'], 1)
        self.assertEqual(overall['handoff']['delayFromRecordedSnap']['mean'], 1.2)

    def test_whole_climbs_include_prepass_and_require_actual_pair_positive_load(self):
        row = trial()
        row['result']['events'] += [{'type': 'block_climb', 'a': 0, 'b': 1, 't': 1}]
        row['olMetrics']['LG']['firstHands'] = [first_contact(.9, force=500), first_contact(1.1, other='DT', force=500), first_contact(1.2, force=0)]
        row['olMetrics']['LG']['firstContacts'] = [first_contact(1.3, impulse=10)]
        summary = audit.summarize_report(report([row]))['ordinary']['overall']['process']
        self.assertEqual(summary['wholePlayClimbs'], 1)
        self.assertEqual(summary['oldCommandLocalClimbs']['recordedTotal'], 0)
        self.assertEqual(summary['olClimbsWithLaterRecordedFirstHandContact'], 1)
        self.assertEqual(summary['olClimbsWithLaterRecordedPositiveHandForce'], 0)
        self.assertEqual(summary['olClimbsWithLaterRecordedPositiveBodyImpulse'], 1)
        row['olMetrics']['LG']['firstHands'][-1]['nativeLoad']['liveHandsAfterPhysics'][0]['tangentForce'] = -2
        self.assertEqual(audit.climb_evidence(row)[0]['laterRecordedPositiveHandForce'], True)

    def test_event_holding_is_flag_not_inferred_accepted_penalty(self):
        row = trial()
        row['result']['events'] += [{'type': 'holding', 't': 1}, {'type': 'holding', 't': 2}]
        summary = audit.summarize_report(report([row]))['ordinary']['overall']
        self.assertEqual(summary['eventsAndFlags']['holdingEventFlags'], 2)
        self.assertEqual(summary['eventsAndFlags']['snapsWithPenaltyEventFlag'], 1)
        self.assertEqual(summary['yards']['naturalFinished']['mean'], 4)

    def test_group_joint_denominators_preserve_sparse_cells(self):
        rows = [trial('one', 2), trial('two', 8), trial('three', 6)]
        rows[2].update(run='counter', front='odd')
        summary = audit.summarize_report(report(rows))['ordinary']
        self.assertEqual(summary['byRun']['iz']['yards']['naturalFinished']['n'], 2)
        self.assertEqual(summary['byFront']['odd']['yards']['naturalFinished']['mean'], 6)
        self.assertEqual(len(summary['byRunAndFront']), 2)

    def test_source_cohort_observer_schema_and_initial_mismatches_rejected(self):
        baseline = report()
        changes = [('schema', 'wrong'), ('collectorSha256', C), ('cohort', {'los': 41, 'firstDownX': 50})]
        for key, value in changes:
            candidate = copy.deepcopy(baseline)
            candidate[key] = value
            with self.assertRaises(ValueError, msg=key):
                audit.compare_reports(baseline, candidate)
        for key, value in [('id', 'different'), ('profileSha256', C), ('initialSha256', C), ('plainSignature', C), ('observerVerified', False)]:
            candidate = copy.deepcopy(baseline)
            candidate['trials'][0][key] = value
            with self.assertRaises(ValueError, msg=key):
                audit.compare_reports(baseline, candidate)
        candidate = copy.deepcopy(baseline)
        candidate['trials'][0]['initialProjection']['players'][0]['profile']['massKg'] = 131
        with self.assertRaises(ValueError):
            audit.compare_reports(baseline, candidate)
        candidate = copy.deepcopy(baseline)
        candidate['sourceAfter'] = B
        with self.assertRaises(ValueError):
            audit.compare_reports(baseline, candidate)

    def test_compare_keeps_all_adverse_pairs_and_identical_execution_witnesses(self):
        baseline = report([trial('one', 10), trial('two', 4), trial('three', 5)])
        candidate = copy.deepcopy(baseline)
        candidate['sourceBefore'] = candidate['sourceAfter'] = C
        candidate['moduleSha256']['src/physics/world.ts'] = A
        candidate['trials'][0]['result']['offenseYards'] = 3
        candidate['trials'][0]['observedSignature'] = candidate['trials'][0]['plainSignature'] = B
        candidate['trials'][1]['naturalEnd'] = False
        candidate['trials'][1]['result']['outcome'] = 'timeout'
        candidate['trials'][1]['observedSignature'] = candidate['trials'][1]['plainSignature'] = B
        comparison = audit.compare_reports(baseline, candidate)['pairs']['ordinary']
        self.assertEqual(len(comparison['allPairs']), 3)
        self.assertEqual(comparison['adversePairCount'], 2)
        self.assertEqual(comparison['identicalCompleteExecutions'], 1)
        self.assertIn('gainDistanceConversionLost', comparison['adversePairs'][0]['adverseReasons'])
        self.assertIn('newCensor', comparison['adversePairs'][1]['adverseReasons'])

    def test_duplicate_or_misplaced_supplemental_and_censor_flag_rejected(self):
        baseline = report([trial(), trial()])
        with self.assertRaises(ValueError):
            audit.summarize_report(baseline)
        baseline = report(supplemental=[trial('supp', supplemental=False)])
        with self.assertRaises(ValueError):
            audit.summarize_report(baseline)
        baseline = report()
        baseline['trials'][0]['naturalEnd'] = False
        with self.assertRaises(ValueError):
            audit.summarize_report(baseline)


if __name__ == '__main__':
    unittest.main()
