"""Tiny offline witnesses for turning operators; no physical-capacity fitting."""
import copy
import csv
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('yaw_measurement', ROOT / 'scripts/data/yaw_measurement.py')
yaw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(yaw)


def rows(times, body, travel=0, speed=3):
    return [dict(t=t, body=o, travel=travel, speed=speed) for t, o in zip(times, body)]


def measure(observations, derive=False):
    return yaw.report(dict(source='synthetic fixture', inputs=[{'id': 'declared in test_yaw_measurement.py'}],
        eligibility=dict(paths=dict(eligible=1, excluded=0, unknown=0)), cadence=dict(clock='fixture timestamps'),
        comparison='Synthetic numeric witness, not NFL data',
        paths=[dict(id='fixture', rows=copy.deepcopy(observations), deriveMotion=derive)]))


def frequency(report, view='raw'):
    return report[view]['frequencyByStartSpeed']['2-4 yd/s']


def extremes(report, view='raw'):
    return report[view]['pathExtremesByEntrySpeed']['2-4 yd/s']


def write_csv(path, data, fields=None):
    with path.open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields or list(data[0]))
        writer.writeheader()
        writer.writerows(data)


def tracking(times=(0, .1, .2), orientations=(0, 10, 20), player='1', timestamps=True):
    origin = datetime(2022, 9, 1, tzinfo=timezone.utc)
    result = []
    for i, (t, o) in enumerate(zip(times, orientations)):
        row = dict(gameId='game', playId='play', nflId=player, frameId=str(i + 1),
                   frameType='AFTER_SNAP', s='3', o=str(o), dir='0', event='',
                   club='football' if player == 'NA' else 'DEF')
        if timestamps:
            row['time'] = (origin + timedelta(seconds=t)).isoformat()
        result.append(row)
    return result


class TurningMeasurementTests(unittest.TestCase):
    def test_circular_wrap_and_common_rotation_preserve_valid_results(self):
        baseline = None
        for rotation in (0, 77, 180):
            r = measure([dict(t=i / 10, body=(350 + 10 * i + rotation) % 360,
                              travel=rotation, speed=3) for i in range(5)])
            if baseline is None:
                baseline = r['raw']
            self.assertEqual(r['raw'], baseline)
            self.assertEqual(frequency(r)['bodyRotationDegS'], dict(n=4, p50=100., p90=100., p99=100., max=100.))
            self.assertEqual(frequency(r)['bodyRotationSwingAtLeast90In02s']['n'], 3)
            self.assertEqual(extremes(r)['bodyRotationFastest02sDegSPerPath']['p99'], 100.)

    def test_body_rotates_while_position_travel_is_straight(self):
        observations = [dict(t=i / 10, x=3 * i / 10, y=0, body=30 * i) for i in range(6)]
        r = measure(observations, derive=True)
        self.assertEqual(frequency(r)['bodyRotationDegS']['p90'], 300.)
        self.assertEqual(frequency(r)['travelDirectionChangeDegS']['p90'], 0.)
        self.assertEqual(extremes(r)['bodyRotationTurn150Seconds']['p50'], .5)
        self.assertEqual(extremes(r)['travelDirectionChangeTurn150Seconds']['n'], 0)
        self.assertEqual(frequency(r)['bodyVsTravelDegrees']['n'], 6)

    def test_actual_irregular_intervals_and_observed_horizon_endpoints(self):
        r = measure(rows([0, .08, .2, .3], [0, 8, 20, 30]))
        self.assertEqual(frequency(r)['bodyRotationDegS']['p90'], 100.)
        self.assertEqual(frequency(r)['bodyRotationDegS']['n'], 3)
        self.assertEqual(frequency(r)['bodyRotationSwingAtLeast90In02s']['n'], 1)
        self.assertEqual(extremes(r)['bodyRotationFastest02sDegSPerPath']['p90'], 100.)

    def test_short_terminal_interval_is_not_padded_to_point_two(self):
        r = measure(rows([0, .1, .15], [0, 10, 15]))
        self.assertEqual(frequency(r)['bodyRotationDegS']['p90'], 100.)
        self.assertEqual(frequency(r)['bodyRotationSwingAtLeast90In02s']['n'], 0)
        self.assertIsNone(frequency(r)['bodyRotationSwingAtLeast90In02s']['share'])
        self.assertEqual(extremes(r)['bodyRotationFastest02sDegSPerPath']['n'], 0)
        self.assertEqual(r['raw']['opportunities']['bodyRotation:partialTerminalWindows'], 2)
        self.assertEqual(r['observedStepSeconds']['p50'], .1)

    def test_cumulative_turn_duration_uses_clock_and_keeps_precision(self):
        r = measure(rows([0, .08, .15], [0, 80, 150]))
        self.assertEqual(extremes(r)['bodyRotationTurn150Seconds']['p50'], .15)
        self.assertEqual(frequency(r)['bodyRotationDegS']['p90'], 1000.)

    def test_gap_and_missing_angle_break_runs_without_erasing_travel(self):
        r = measure(rows([0, .1, .4, .5], [0, 10, 160, 170]))
        self.assertEqual(frequency(r)['bodyRotationDegS']['n'], 2)
        self.assertEqual(frequency(r)['bodyRotationDegS']['p90'], 100.)
        self.assertEqual(extremes(r)['bodyRotationTurn150Seconds']['n'], 0)
        self.assertEqual(r['quality']['gapIntervals'], 1)
        r = measure(rows([0, .1, .2], [0, None, 20]))
        self.assertEqual(frequency(r)['bodyRotationDegS']['n'], 0)
        self.assertEqual(frequency(r)['travelDirectionChangeDegS']['n'], 2)
        self.assertEqual(r['status'], 'partial')

    def test_frame_id_gap_cannot_join_even_with_short_timestamp_spacing(self):
        observations = [dict(row, frame=f) for row, f in zip(rows([0, .1, .2], [0, 150, 160]), [1, 3, 4])]
        r = measure(observations)
        self.assertEqual(frequency(r)['bodyRotationDegS']['n'], 1)
        self.assertEqual(frequency(r)['bodyRotationDegS']['p90'], 100.)
        self.assertEqual(frequency(r)['bodyRotationSwingAtLeast90In02s']['n'], 0)
        self.assertEqual(r['quality']['frameIdGapIntervals'], 1)

    def test_exact_duplicates_collapse_conflicts_reject_path(self):
        original = rows([0, .1, .2], [0, 10, 20])
        duplicate = original + [dict(original[1])]
        self.assertEqual(measure(duplicate)['raw'], measure(original)['raw'])
        self.assertEqual(measure(duplicate)['quality']['exactDuplicateRowsCollapsed'], 1)
        duplicate[-1]['body'] = 170
        r = measure(duplicate)
        self.assertEqual(r['status'], 'unavailable')
        self.assertEqual(r['quality']['conflictingDuplicateClockPaths'], 1)
        frame_conflict = [dict(row, frame=1) for row in original]
        self.assertEqual(measure(frame_conflict)['quality']['conflictingDuplicateFramePaths'], 1)

    def test_isolated_flip_retains_raw_and_shows_exclusion_sensitivity(self):
        r = measure(rows([0, .1, .2, .3, .4], [0, 0, 180, 0, 0]))
        self.assertEqual(r['orientationExcursions']['n'], 1)
        self.assertEqual(frequency(r)['bodyRotationDegS']['p99'], 1800.)
        filtered = frequency(r, 'withoutFlaggedBodyFrames')
        self.assertEqual(filtered['bodyRotationDegS']['p99'], 0.)
        self.assertEqual(filtered['bodyRotationDegS']['n'], 2)
        self.assertEqual(filtered['bodyRotationSwingAtLeast90In02s']['n'], 0)
        self.assertEqual(filtered['travelDirectionChangeDegS'], frequency(r)['travelDirectionChangeDegS'])
        self.assertEqual(r['policy']['excursionDegrees'], 90)

    def test_genuine_smooth_fast_turn_is_not_flagged_for_speed_alone(self):
        r = measure(rows([0, .1, .2, .3, .4], [0, 90, 180, 270, 360]))
        self.assertEqual(r['orientationExcursions']['n'], 0)
        self.assertEqual(frequency(r)['bodyRotationDegS']['p99'], 900.)
        self.assertEqual(r['raw'], r['withoutFlaggedBodyFrames'])
        # Nearly a full revolution has a small endpoint return but no reversal.
        full = measure(rows([0, .1, .2], [0, 179, 358]))
        self.assertEqual(full['orientationExcursions']['n'], 0)
        self.assertEqual(full['raw'], full['withoutFlaggedBodyFrames'])

    def test_roster_eligibility_counts_unknown_instead_of_defaulting_to_db(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            data = tracking(player='1') + tracking(player='2') + tracking(player='3') + tracking(player='NA')
            source = folder / 'tracking.csv'
            write_csv(source, data)
            missing = yaw.report(yaw.load_nfl([source]))
            self.assertEqual(missing['eligibility']['paths'], dict(eligible=0, excluded=1, unknown=3))
            self.assertEqual(missing['status'], 'unavailable')
            self.assertEqual(missing['inputs'][-1]['status'], 'unavailable')
            write_csv(folder / 'players.csv', [dict(nflId='1', position='CB'), dict(nflId='2', position='WR')])
            r = yaw.report(yaw.load_nfl([source]))
            self.assertEqual(r['eligibility']['paths'], dict(eligible=1, excluded=2, unknown=1))
            self.assertEqual(r['eligibility']['rows'], dict(eligible=3, excluded=6, unknown=3))
            self.assertEqual(frequency(r)['bodyRotationDegS']['n'], 2)
            self.assertEqual(r['status'], 'partial')
            self.assertEqual(len(r['inputs'][0]['sha256']), 64)

    def test_ambiguous_missing_or_unrecognized_roster_position_is_unknown(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            write_csv(folder / 'tracking.csv', tracking())
            for positions in (['CB', 'WR'], [''], ['UNKNOWN']):
                with self.subTest(positions=positions):
                    write_csv(folder / 'players.csv', [dict(nflId='1', position=p) for p in positions])
                    r = yaw.report(yaw.load_nfl([folder / 'tracking.csv']))
                    self.assertEqual(r['eligibility']['paths']['unknown'], 1)
                    self.assertEqual(r['status'], 'unavailable')

    def test_unlabelled_missing_player_id_is_unknown_and_clock_modes_cannot_mix(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            a, b = folder / 'a.csv', folder / 'b.csv'
            write_csv(a, tracking(player=''))
            r = yaw.report(yaw.load_nfl([a]))
            self.assertEqual(r['eligibility']['pathReasons']['unknown:missingPlayerId'], 1)
            write_csv(folder / 'players.csv', [dict(nflId='1', position='CB')])
            write_csv(a, tracking())
            write_csv(b, tracking(timestamps=False))
            r = yaw.report(yaw.load_nfl([a, b], cadence=.1))
            self.assertEqual(r['quality']['mixedClockSourcesPaths'], 1)
            self.assertEqual(r['status'], 'unavailable')

    def test_timestamp_precedence_and_explicit_cadence_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source = folder / 'tracking.csv'
            write_csv(folder / 'players.csv', [dict(nflId='1', position='CB')])
            write_csv(source, tracking([0, .08, .2], [0, 8, 20]))
            r = yaw.report(yaw.load_nfl([source], cadence=.1))
            self.assertEqual(frequency(r)['bodyRotationDegS']['p90'], 100.)
            self.assertEqual(r['cadence']['timestampRows'], 3)
            data = tracking(timestamps=False)
            write_csv(source, data)
            r = yaw.report(yaw.load_nfl([source]))
            self.assertEqual(r['quality']['missingOrInvalidClockPaths'], 1)
            self.assertEqual(r['status'], 'unavailable')
            r = yaw.report(yaw.load_nfl([source], cadence=.1))
            self.assertEqual(r['cadence']['declaredCadenceRows'], 3)
            self.assertEqual(frequency(r)['bodyRotationDegS']['p50'], 100.)
            data = tracking()
            data[1]['time'] = ''
            write_csv(source, data)
            self.assertEqual(yaw.report(yaw.load_nfl([source], cadence=.1))['status'], 'unavailable')

    def test_regular_timestamp_deadband_boundary_retains_legacy_turn(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            write_csv(folder / 'tracking.csv', tracking([i / 10 for i in range(51)], [3 * i for i in range(51)]))
            write_csv(folder / 'players.csv', [dict(nflId='1', position='CB')])
            r = yaw.report(yaw.load_nfl([folder / 'tracking.csv']))
            self.assertEqual(extremes(r)['bodyRotationTurn150Seconds']['n'], 1)
            self.assertEqual(extremes(r)['bodyRotationTurn150Seconds']['p50'], 5.)

    def test_body_only_source_remains_usable_with_travel_explicitly_unavailable(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            data = tracking()
            for row in data:
                del row['dir']
            write_csv(folder / 'tracking.csv', data)
            write_csv(folder / 'players.csv', [dict(nflId='1', position='CB')])
            r = yaw.report(yaw.load_nfl([folder / 'tracking.csv']))
            self.assertEqual(frequency(r)['bodyRotationDegS']['p50'], 100.)
            self.assertEqual(frequency(r)['travelDirectionChangeDegS']['n'], 0)
            self.assertEqual(r['quality']['missingOrInvalid:travel'], 3)
            self.assertEqual(r['status'], 'partial')

    def test_missing_post_snap_boundary_is_explicit_and_labelled_snap_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source = folder / 'tracking.csv'
            write_csv(folder / 'players.csv', [dict(nflId='1', position='CB')])
            data = tracking(times=[0, .1, .2, .3], orientations=[0, 10, 20, 30])
            for row in data:
                del row['frameType']
            write_csv(source, data)
            self.assertEqual(yaw.report(yaw.load_nfl([source]))['quality']['unknownSnapBoundaryPaths'], 1)
            data[0]['event'] = 'ball_snap'
            write_csv(source, data)
            r = yaw.report(yaw.load_nfl([source]))
            self.assertEqual(r['quality']['retainedRows'], 3)
            self.assertEqual(frequency(r)['bodyRotationDegS']['n'], 2)

    def test_both_legacy_entry_points_use_same_operator_and_honest_missing_roster(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source = folder / 'tracking.csv'
            write_csv(source, tracking())
            write_csv(folder / 'players.csv', [dict(nflId='1', position='CB')])
            outputs = []
            for script in ('yaw_speed_audit.py', 'yaw_capability_audit.py'):
                result = subprocess.run([sys.executable, '-I', str(ROOT / 'scripts/data' / script), str(source)],
                                        capture_output=True, text=True, cwd=ROOT)
                self.assertEqual(result.returncode, 0, result.stderr)
                outputs.append(json.loads(result.stdout))
            self.assertEqual(outputs[0]['raw'], outputs[1]['raw'])
            self.assertEqual(outputs[0]['measurementVersion'], 'turning-v2')
            (folder / 'players.csv').unlink()
            result = subprocess.run([sys.executable, '-I', str(ROOT / 'scripts/data/yaw_speed_audit.py'), str(source)],
                                    capture_output=True, text=True, cwd=ROOT)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stdout)['status'], 'unavailable')


if __name__ == '__main__':
    unittest.main()
