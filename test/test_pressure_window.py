"""Pressure evidence boundaries; synthetic witnesses, no football calibration.

Decision: can a pressure observation justify investigating protection before
release? All consumers must reject the same post-release witness while keeping
genuine pressure, observed clean windows, and unknown exposure distinct.
"""
import contextlib
import copy
import gzip
import io
import json
from pathlib import Path
import runpy
import sys
import tempfile
import unittest
from collections import defaultdict
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/mechanics'))
from metrics import Collector, Play, pass_metrics  # noqa: E402


def witness(release=.76, end=.9, near=.8, frames=10, dt=.1, distance=1.):
    players = ([{'side': 'O', 'group': 'QB'}]
               + [{'side': 'O', 'group': 'OL'} for _ in range(5)]
               + [{'side': 'D', 'group': 'DL'}])
    xy = []
    for k in range(frames):
        t = k * dt
        qb_x = -4. - min(4 * t, .8)
        row = [qb_x, 0.]
        for y in (-3., -1.5, 0., 1.5, 3.):
            row.extend([-2 * t, y])
        row.extend([qb_x + distance, 0.] if near is not None and abs(t - near) < 1e-9 else [1., 4.])
        xy.append(row)
    events = {'end': end}
    if release is not None:
        events['pass_forward'] = release
    return dict(id='pressure-witness', source='sim', kind='pass', players=players,
                dt=dt, xy=xy, events=events, yards=0., ball_y=0., carrier=None, target=None)


def cli(path, raw):
    with tempfile.TemporaryDirectory() as directory:
        fixture = Path(directory) / 'common.jsonl.gz'
        with gzip.open(fixture, 'wt') as handle:
            handle.write(json.dumps(raw) + '\n')
        out = io.StringIO()
        with patch.object(sys, 'argv', [str(path), str(fixture)]), contextlib.redirect_stdout(out):
            module = runpy.run_path(str(path))
        return out.getvalue(), module


class PressureWindowTests(unittest.TestCase):
    def test_post_release_and_post_whistle_samples_are_not_pressure(self):
        for raw in (witness(), witness(release=1., end=.76)):
            with self.subTest(events=raw['events']):
                c = Collector()
                c.add(raw)
                self.assertEqual(c.values['pass.pressure_2yd_before_throw'], [0.])
                self.assertEqual(c.values['pass.time_to_pressure'], [])

    def test_early_ending_and_coarse_cadence_do_not_clamp_before_start(self):
        for raw in (witness(release=.3, end=.3, near=.3, frames=4),
                    witness(release=.55, end=.55, near=.4, frames=3, dt=.2)):
            with self.subTest(dt=raw['dt']):
                observation = Play(raw).pressure(0)
                self.assertIsNone(observation.first)
                self.assertIsNone(observation.value)

    def test_observed_clean_and_real_pressure_are_opposing_controls(self):
        self.assertEqual(Play(witness(near=None)).pressure(0).value, 0.)
        for near in (.5, .7):
            with self.subTest(near=near):
                out = defaultdict(list)
                pass_metrics(Play(witness(near=near)), out)
                self.assertEqual(out['pass.pressure_2yd_before_throw'], [1.])
                self.assertAlmostEqual(out['pass.time_to_pressure'][0], near)

    def test_release_and_two_yard_threshold_are_inclusive_on_the_sample_grid(self):
        self.assertEqual(Play(witness(release=.7, near=.7, distance=2.)).pressure(0).value, 1.)
        self.assertEqual(Play(witness(release=.7, near=.7, distance=2.1)).pressure(0).value, 0.)
        self.assertEqual(Play(witness(release=.76, near=.7, distance=2.)).pressure(0).value, 1.)

    def test_missing_observations_are_unknown_and_do_not_erase_known_pressure(self):
        raw = witness(near=None)
        for row in raw['xy'][5:]:
            row[-2:] = [None, None]
        c = Collector()
        c.add(raw)
        self.assertEqual(c.values['pass.pressure_2yd_before_throw'], [None])
        self.assertEqual(c.values['pass.pressure_2yd_unknown'], [1.])
        self.assertEqual(c.values['pass.rushers'], [None])
        self.assertEqual(c.summary()['metrics']['pass.pressure_2yd_before_throw']['n'], 0)
        raw['xy'][7][-2:] = [-3.8, 0.]
        self.assertEqual(Play(raw).pressure(0).value, 1.)
        out = defaultdict(list)
        pass_metrics(Play(raw), out)
        self.assertEqual(out['pass.rushers'], [1])

    def test_missing_qb_y_and_absent_defenders_cannot_establish_a_negative(self):
        for component in (0, 1, -1):
            raw = witness(near=None)
            raw['xy'][6][component] = None
            self.assertIsNone(Play(raw).pressure(0).value)
        raw = witness(near=None)
        raw['players'].pop()
        for row in raw['xy']:
            del row[-2:]
        self.assertIsNone(Play(raw).pressure(0).value)

    def test_recording_cutoff_is_unknown_but_keeps_observed_adverse_pressure(self):
        raw = witness(release=1.2, end=1.4, near=None, frames=8)
        self.assertIsNone(Play(raw).pressure(0).value)
        raw['xy'][6][-2:] = [-3.8, 0.]
        self.assertEqual(Play(raw).pressure(0).value, 1.)

    def test_no_release_uses_four_seconds_and_end_without_extending_recording(self):
        self.assertEqual(Play(witness(release=None, end=.76)).pressure(0).value, 0.)
        raw = witness(release=None, end=4.5, near=4.1, frames=46)
        self.assertEqual(Play(raw).pressure(0).value, 0.)
        raw = witness(release=None, end=4.5, near=4., frames=46)
        self.assertEqual(Play(raw).pressure(0).value, 1.)

    def test_source_and_lateral_mirror_do_not_change_the_operator(self):
        raw = witness(near=.7)
        expected = Play(raw).pressure(0)
        for source in ('sim', 'nfl'):
            other = copy.deepcopy(raw)
            other['source'] = source
            for row in other['xy']:
                for i in range(1, len(row), 2):
                    row[i] = -row[i]
            self.assertEqual(Play(other).pressure(0), expected)

    def test_diagnostic_consumers_agree_on_common_witnesses(self):
        cases = ((1.76, 2., 1.8, False), (2., 1.76, 1.8, False),
                 (1.76, 2., 1.7, True), (1.76, 2., None, False))
        for release, end, near, expected in cases:
            raw = witness(release=release, end=end, near=near, frames=21)
            for script in ('pass-pressure.py', 'passpro/pressure.py', 'edge-rep.py', 'passpro/qbdrop.py'):
                with self.subTest(script=script, release=release, end=end, near=near):
                    text, module = cli(ROOT / 'scripts/diag' / script, raw)
                    self.assertIn('sampled-geometric-pressure-v2', text)
                    if script == 'pass-pressure.py':
                        self.assertIn(f'pressured {int(expected)} ', text)
                    elif script == 'passpro/pressure.py':
                        self.assertIn(f"pressured {'100.0%' if expected else '0.0%'}", text)
                    elif script == 'edge-rep.py':
                        self.assertEqual('unblocked edge pressures 1' in text, expected)
                    else:
                        # The CLI needs 30 observations for a tercile table;
                        # inspect this witness's collected per-set observation.
                        self.assertEqual(module['acc']['gun']['press_by_set'][0][1], expected)

    def test_diagnostic_rate_reports_unknown_instead_of_zero_without_exposure(self):
        raw = witness(release=.3, end=.3, near=.3, frames=4)
        text, _ = cli(ROOT / 'scripts/diag/pass-pressure.py', raw)
        self.assertIn('(unknown; known 0, unknown 1;', text)
        raw = witness(release=1.76, end=2., near=None, frames=14)
        for script in ('pass-pressure.py', 'passpro/pressure.py'):
            with self.subTest(script=script):
                text, _ = cli(ROOT / 'scripts/diag' / script, raw)
                self.assertIn('pressured ', text)
                self.assertIn('known 0, unknown 1', text)

    def test_diagnostic_consumers_preserve_missing_defender_windows(self):
        raw = witness(release=1.76, end=2., near=None, frames=21)
        for row in raw['xy'][5:]:
            row[-2:] = [None, None]
        for script in ('pass-pressure.py', 'passpro/pressure.py', 'edge-rep.py', 'passpro/qbdrop.py'):
            with self.subTest(script=script):
                text, module = cli(ROOT / 'scripts/diag' / script, raw)
                if script in ('pass-pressure.py', 'passpro/pressure.py'):
                    self.assertIn('known 0, unknown 1', text)
                else:
                    self.assertIn('unknown windows 1', text)
                if script == 'passpro/pressure.py':
                    self.assertFalse(module['acc']['risk'])
                if script == 'passpro/qbdrop.py':
                    self.assertEqual(module['acc']['gun']['press_by_set'], [])

    def test_outcome_association_keeps_unknown_separate_from_clean_and_pressure(self):
        ops = runpy.run_path(str(ROOT / 'scripts/mechanics/outcomes.py'))
        raws = (witness(release=.3, end=.3, near=.3, frames=4),
                witness(near=None), witness(near=.7))
        rows = []
        for i, raw in enumerate(raws):
            play = dict(id=str(i), index=i, kind='pass', gameSeed=1, yards=0.,
                        stats={'attempted': True, 'pressured': False}, events=[{'type': 'throw'}])
            row = ops['adapt'](play, {'home': 'H', 'away': 'A'}, {})
            row['geometricPressure'] = ops['geometric_pressure'](raw)
            rows.append(row)
        self.assertEqual([row['geometricPressure'] for row in rows], [None, False, True])
        association = ops['pressure_association'](rows)['geometricPressure']
        self.assertEqual(association['rate']['denominator'], 2)
        for label in ('unknown', 'false', 'true'):
            self.assertEqual(association['groups'][label]['dropbacks'], 1)

    def test_saved_comparison_does_not_flag_different_pressure_operators_as_football(self):
        compare = runpy.run_path(str(ROOT / 'scripts/mechanics/compare.py'))
        for same_operator in (False, True):
            with self.subTest(same_operator=same_operator), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                metric = {'n': 40, 'mean': .3, 'p25': 0., 'p50': 0., 'p75': 1., 'p90': 1.}
                base = {'source': 'synthetic', 'plays': {'run': 0, 'pass': 40},
                        'metrics': {'pass.pressure_2yd_before_throw': metric, 'run.yards': metric}}
                candidate = {**base, 'pressureOperator': 'sampled-geometric-pressure-v2'}
                if same_operator:
                    base['pressureOperator'] = candidate['pressureOperator']
                for name, data in (('base.json', base), ('sim.json', candidate),
                                   ('guard.json', {'metrics': ['pass.pressure_2yd_before_throw']})):
                    (folder / name).write_text(json.dumps(data))
                args = ['compare.py', '--nfl', str(folder / 'base.json'), '--sim', str(folder / 'sim.json'),
                        '--guard', str(folder / 'guard.json'), '--out', str(folder / 'report.md')]
                with patch.object(sys, 'argv', args), contextlib.redirect_stdout(io.StringIO()):
                    result = compare['main']()
                self.assertEqual(result, 0 if same_operator else 1)
                report = (folder / 'report.md').read_text()
                self.assertEqual('GUARD UNAVAILABLE' in report, not same_operator)
                if not same_operator:
                    self.assertIn('| | | operator differs |', report)
                self.assertIn('| run.yards |', report)


if __name__ == '__main__':
    unittest.main()
