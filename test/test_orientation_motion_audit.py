"""Measurement invariants for the orientation pilot; no engine calibration."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np
import pandas as pd


spec = importlib.util.spec_from_file_location(
    'orientation_audit', Path(__file__).parents[1] / 'scripts/data/orientation_motion_audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def fixture(times, orientation=0, direction=0, speed=2):
    n = len(times)
    return pd.DataFrame({'time': pd.to_datetime(times, unit='s', utc=True).astype(str),
                         'x': np.ones(n) * 30, 'y': np.ones(n) * 20,
                         's': np.broadcast_to(speed, n), 'o': np.broadcast_to(orientation, n),
                         'dir': np.broadcast_to(direction, n), 'event': [None] * n})


class OrientationMeasurementTests(unittest.TestCase):
    def test_timestamp_storage_units_preserve_elapsed_seconds_and_motion(self):
        # Integer timestamps carry the Series' unit, not necessarily ns. The
        # same six instants must retain one complete 10 Hz motion exposure.
        seconds = [0., .1, .2, .3, .4, .5]
        for unit in ['ns', 'us', 'ms']:
            with self.subTest(unit=unit):
                path = fixture(seconds, 355, 15)
                path['time'] = pd.to_datetime(path.time, format='ISO8601', utc=True).dt.as_unit(unit)
                clean, failure, duplicates = audit.clean_trajectory(path)
                self.assertIsNone(failure)
                self.assertEqual(duplicates, 0)
                self.assertEqual(clean.seconds.tolist(), seconds)
                measured = audit.measure_window(clean)
                self.assertEqual(measured['non10HzSteps'], 0)
                self.assertEqual(measured['sustainedMotionFrames'], 6)
                self.assertEqual(measured['speedBins']['[2,4)']['angles'], [20.] * 6)

    def test_circular_wrap_and_common_field_rotation_preserve_distribution(self):
        # A right/left attack rotation must not change a 20-degree difference.
        outputs = []
        for rotation in [0, 180, 77]:
            g, failure, _ = audit.clean_trajectory(fixture(
                np.arange(6) / 10, (355 + rotation) % 360, (15 + rotation) % 360))
            self.assertIsNone(failure)
            outputs.append(audit.measure_window(g)['speedBins']['[2,4)'])
        self.assertEqual(outputs[0], outputs[1])
        self.assertEqual(outputs[0], outputs[2])
        self.assertEqual(outputs[0]['angles'], [20.] * 6)

    def test_a_clock_gap_cannot_join_two_short_motion_streaks(self):
        g, _, _ = audit.clean_trajectory(fixture([0, .1, .2, .4, .5, .6]))
        r = audit.measure_window(g)
        self.assertEqual(r['non10HzSteps'], 1)
        self.assertEqual(r['sustainedMotionFrames'], 0)
        self.assertEqual(r['speedBins'], {})

    def test_invalid_angles_break_sustained_runs_instead_of_being_interpolated(self):
        g, _, _ = audit.clean_trajectory(fixture(np.arange(7) / 10, [0, 0, 0, np.nan, 0, 0, 0]))
        r = audit.measure_window(g)
        self.assertEqual(r['missingOrInvalidO'], 1)
        self.assertEqual(r['sustainedMotionFrames'], 0)

    def test_conflicting_duplicate_clock_rejects_path_but_exact_duplicates_collapse(self):
        base = fixture(np.arange(6) / 10)
        duplicate = pd.concat([base, base.iloc[[0]]], ignore_index=True)
        clean, failure, count = audit.clean_trajectory(duplicate)
        self.assertIsNone(failure)
        self.assertEqual(count, 1)
        self.assertEqual(len(clean), 6)
        duplicate.loc[len(duplicate) - 1, 'o'] = 120
        clean, failure, _ = audit.clean_trajectory(duplicate)
        self.assertIsNone(clean)
        self.assertEqual(failure, 'conflictingDuplicateClock')

    def test_slow_endpoint_change_crosses_zero_without_becoming_a_full_turn(self):
        # dir is undefined/irrelevant at low speed; o still has a slow-change marker.
        g, _, _ = audit.clean_trajectory(fixture(np.arange(6) / 10,
                                                [350, 0, 10, 20, 30, 40], np.nan, .2))
        r = audit.measure_window(g)
        self.assertEqual(r['slowOrientationChanges'], [50.])
        self.assertEqual(r['slowOrientationChangeAtLeast45'], 1)
        self.assertEqual(r['sustainedMotionFrames'], 0)

    def test_repeated_paths_do_not_count_as_more_athletes(self):
        low, _, _ = audit.clean_trajectory(fixture(np.arange(6) / 10))
        high, _, _ = audit.clean_trajectory(fixture(np.arange(6) / 10, 180))
        a, b = audit.measure_window(low), audit.measure_window(high)
        group = audit.summarize([('CB', 'one', a)] * 100 + [('CB', 'two', b)])['CB']['speedBins']['[2,4)']
        self.assertEqual(group['players'], 2)
        self.assertEqual(group['paths'], 101)
        self.assertEqual(group['playerMedianAbsODirDifferenceDegrees']['p50'], 90.)
        self.assertAlmostEqual(group['framePooledOpposedFractionAtLeast120'], 1 / 101)

    def test_malformed_clock_is_not_silently_removed(self):
        g = fixture(np.arange(6) / 10)
        g.loc[2, 'time'] = 'not a clock'
        clean, failure, _ = audit.clean_trajectory(g)
        self.assertIsNone(clean)
        self.assertEqual(failure, 'malformedClock')


if __name__ == '__main__':
    unittest.main()
