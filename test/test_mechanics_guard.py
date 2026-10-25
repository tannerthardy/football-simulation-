"""Offline guard witnesses: missing evidence must not certify preservation."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
METRIC = 'run.yards_before_contact'
PRESSURE = 'pass.pressure_2yd_before_throw'
OPERATOR = 'sampled-geometric-pressure-v2'


def summary(n=40, shift=0):
    return dict(n=n, mean=10 + shift, p25=8 + shift, p50=10 + shift,
                p75=12 + shift, p90=14 + shift)


def card(metrics):
    return dict(source='synthetic offline guard witness', plays={'run': 40, 'pass': 40},
                pressureOperator=OPERATOR, metrics=metrics)


class MechanicsGuardTests(unittest.TestCase):
    def report(self, nfl, sim, guarded=(METRIC,)):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            for name, value in [('nfl', nfl), ('sim', sim), ('guard', {'metrics': guarded})]:
                (folder / (name + '.json')).write_text(json.dumps(value))
            args = [sys.executable, '-I', str(ROOT / 'scripts/mechanics/compare.py'),
                    '--nfl', str(folder / 'nfl.json'), '--sim', str(folder / 'sim.json'),
                    '--out', str(folder / 'report.md')]
            if guarded is not None:
                args += ['--guard', str(folder / 'guard.json')]
            result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(result.stderr, '')
            self.assertEqual(result.stdout, (folder / 'report.md').read_text() + '\n')
            return result.returncode, result.stdout

    def assert_unavailable(self, nfl, sim, reason, guarded=(METRIC,)):
        code, report = self.report(nfl, sim, guarded)
        self.assertEqual(code, 1)
        self.assertIn('0/1 guarded metrics within policy', report)
        self.assertIn('0 off, 1 unavailable', report)
        self.assertIn('GUARD UNAVAILABLE:', report)
        self.assertIn(reason, report)
        self.assertNotIn('GUARD BROKEN:', report)

    def test_empty_sim_metrics_cannot_pass_committed_guard(self):
        nfl = json.loads((ROOT / 'data/reviews/mechanics/nfl-bdb2022.json').read_text())
        guarded = json.loads((ROOT / 'data/reviews/mechanics/guard.json').read_text())['metrics']
        code, report = self.report(nfl, card({}), guarded)
        self.assertEqual(code, 1)
        self.assertIn('0/12 guarded metrics within policy', report)
        self.assertIn('0 off, 12 unavailable', report)
        for metric in guarded:
            self.assertIn(f'GUARD UNAVAILABLE: {metric} sim metric missing', report)

    def test_saved_baseline_guarded_matches_remain_accepted(self):
        # Historical summaries test the report's behavior, not current football.
        folder = ROOT / 'data/reviews/mechanics'
        nfl = json.loads((folder / 'nfl-bdb2022.json').read_text())
        sim = json.loads((folder / 'sim-baseline.json').read_text())
        guarded = json.loads((folder / 'guard.json').read_text())['metrics']
        code, report = self.report(nfl, sim, guarded)
        self.assertEqual(code, 0)
        self.assertIn('12/12 guarded metrics within policy (12 ok, 0 check/warning)', report)
        for metric in guarded:
            self.assertIn(f'GUARD OK: {metric} is ok', report)

    def test_one_omitted_metric_does_not_borrow_another_match(self):
        other = 'run.box_count'
        code, report = self.report(card({METRIC: summary(), other: summary()}),
                                   card({METRIC: summary()}), [METRIC, other])
        self.assertEqual(code, 1)
        self.assertIn('1/2 guarded metrics within policy', report)
        self.assertIn(f'GUARD OK: {METRIC}', report)
        self.assertIn(f'GUARD UNAVAILABLE: {other} sim metric missing', report)

    def test_below_minimum_and_no_known_samples_are_unavailable(self):
        for metric in (dict(n=0), summary(n=29)):
            with self.subTest(metric=metric):
                self.assert_unavailable(card({METRIC: summary()}), card({METRIC: metric}),
                                        'sim samples')

    def test_missing_or_empty_nfl_metric_is_unavailable(self):
        for metrics in ({}, {METRIC: dict(n=0)}):
            with self.subTest(metrics=metrics):
                self.assert_unavailable(card(metrics), card({METRIC: summary()}), 'NFL')

    def test_guarded_name_outside_report_sections_is_unavailable(self):
        metric = 'unreported.witness'
        self.assert_unavailable(card({metric: summary()}), card({metric: summary()}),
                                'not evaluated by report', [metric])

    def test_incompatible_pressure_operator_retains_unavailable_state(self):
        metric = dict(summary(), mean=.3)
        nfl, sim = card({PRESSURE: metric}), card({PRESSURE: metric})
        sim['pressureOperator'] = 'different-pressure-operator'
        self.assert_unavailable(nfl, sim, 'pressure operator differs', [PRESSURE])

    def test_missing_pressure_identity_on_both_sides_is_not_compatibility(self):
        nfl = card({PRESSURE: dict(summary(), mean=.3)})
        del nfl['pressureOperator']
        self.assert_unavailable(nfl, copy.deepcopy(nfl), 'pressure operator unavailable', [PRESSURE])

    def test_unknown_required_statistics_are_unavailable(self):
        for field, value in [('p90', None), ('p50', float('nan')), ('n', None)]:
            for side in ('nfl', 'sim'):
                with self.subTest(field=field, side=side):
                    nfl, sim = card({METRIC: summary()}), card({METRIC: summary()})
                    (nfl if side == 'nfl' else sim)['metrics'][METRIC][field] = value
                    self.assert_unavailable(nfl, sim, 'unavailable')
        sim = card({METRIC: summary()})
        del sim['metrics'][METRIC]['p75']
        self.assert_unavailable(card({METRIC: summary()}), sim, 'unavailable')

    def test_adequate_match_at_minimum_is_still_accepted(self):
        for metric in (METRIC, PRESSURE):
            with self.subTest(metric=metric):
                stats = summary() if metric == METRIC else dict(summary(), mean=.3)
                nfl = card({metric: stats})
                code, report = self.report(nfl, card({metric: dict(stats, n=30)}), [metric])
                self.assertEqual(code, 0)
                self.assertIn('1/1 guarded metrics within policy (1 ok, 0 check/warning)', report)
                self.assertIn(f'GUARD OK: {metric}', report)

    def test_existing_check_warning_still_passes_without_claiming_ok(self):
        code, report = self.report(card({METRIC: summary()}), card({METRIC: summary(shift=1)}))
        self.assertEqual(code, 0)
        self.assertIn('1/1 guarded metrics within policy (0 ok, 1 check/warning)', report)
        self.assertIn(f'GUARD CHECK: {METRIC}', report)
        self.assertNotIn('GUARD OK:', report)

    def test_measured_mismatch_still_breaks_guard(self):
        code, report = self.report(card({METRIC: summary()}), card({METRIC: summary(shift=3)}))
        self.assertEqual(code, 1)
        self.assertIn('0/1 guarded metrics within policy', report)
        self.assertIn('1 off, 0 unavailable', report)
        self.assertIn(f'GUARD BROKEN: {METRIC} is now off', report)

    def test_rate_warning_and_mismatch_keep_existing_relative_thresholds(self):
        nfl = card({PRESSURE: dict(summary(), mean=.25)})
        for mean, state, code in [(.25, 'OK', 0), (.30, 'CHECK', 0), (.375, 'BROKEN', 1)]:
            with self.subTest(mean=mean):
                actual, report = self.report(nfl, card({PRESSURE: dict(summary(), mean=mean)}), [PRESSURE])
                self.assertEqual(actual, code)
                self.assertIn(f'GUARD {state}: {PRESSURE}', report)

    def test_unknown_rate_mean_is_unavailable(self):
        self.assert_unavailable(card({PRESSURE: dict(summary(), mean=.25)}),
                                card({PRESSURE: dict(summary(), mean=None)}),
                                'sim statistics unavailable (mean)', [PRESSURE])

    def test_unguarded_descriptive_report_remains_usable(self):
        for metrics in ({}, {METRIC: dict(n=0)}, {METRIC: summary(shift=4)}):
            with self.subTest(metrics=metrics):
                code, report = self.report(card({METRIC: summary()}), card(metrics), None)
                self.assertEqual(code, 0)
                self.assertIn(f'| {METRIC} |', report)
                self.assertNotIn('Guard:', report)


if __name__ == '__main__':
    unittest.main()
