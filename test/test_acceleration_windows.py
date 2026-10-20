"""Complete legal acceleration windows, independent analytic trajectories."""
import copy
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts/mechanics"))
from acceleration_windows import measure_acceleration_windows  # noqa: E402


def track(fn, count=21, dt=.1, start=0.):
    return [fn(start + k * dt) for k in range(count)]


class AccelerationWindowsTest(unittest.TestCase):
    def test_static_and_constant_velocity_keep_zero_gains_and_exact_counts(self):
        for fn, expected in ((lambda t: (5., -3.), 0.),
                             (lambda t: (3 * t, 4 * t), 5.)):
            result = measure_acceleration_windows(track(fn), .1, 2., position_decimals=None)
            self.assertEqual(result["counts"]["speeds"]["accepted"], 17)
            self.assertEqual(result["counts"]["gains"]["accepted"], 14)
            for s in result["speeds"]:
                self.assertAlmostEqual(s["speed"], expected)
            for g in result["gains"]:
                self.assertAlmostEqual(g["gain"], 0.)
            for kind in ("speeds", "gains"):
                c = result["counts"][kind]
                self.assertEqual(c["accepted"] + c["excluded"], c["candidates"])

    def test_constant_acceleration_has_analytic_gain_on_both_sample_grids(self):
        results = []
        for dt, count in ((.1, 21), (.05, 41)):
            r = measure_acceleration_windows(track(lambda t: (1.5 * t * t, 0.), count, dt),
                                             dt, 2., position_decimals=None)
            for g in r["gains"]:
                self.assertAlmostEqual(g["initial_speed"], 3 * g["t"])
                self.assertAlmostEqual(g["final_speed"], 3 * g["end_t"])
                self.assertAlmostEqual(g["gain"], 3.)
                self.assertLessEqual(g["support_end"], 2. + 1e-14)
            results.append(r)
        self.assertEqual(results[0]["counts"]["gains"]["accepted"], 14)
        self.assertEqual(results[1]["counts"]["gains"]["accepted"], 27)

    def test_post_whistle_positions_cannot_change_admitted_measurements(self):
        base = track(lambda t: (t, 0.))
        changed = [(x if k <= 9 else 20 * x, y) for k, (x, y) in enumerate(base)]
        a = measure_acceleration_windows(base, .1, .9)
        b = measure_acceleration_windows(changed, .1, .9)
        self.assertEqual(a["speeds"], b["speeds"])
        self.assertEqual(a["gains"], b["gains"])
        self.assertEqual(a["counts"]["gains"]["accepted"], 3)
        self.assertTrue(a["counts"]["gains"]["exclusion_reasons"]["after_live_end"])
        # Independent witness for the former admission bug: the future speed
        # is centered at the whistle but samples 0.2 s after it.
        def old_speed(points, k):
            lo, hi = max(0, k - 2), min(len(points) - 1, k + 2)
            return math.dist(points[lo], points[hi]) / ((hi - lo) * .1)
        old_a = (old_speed(base, 9) - old_speed(base, 6)) / .3
        old_b = (old_speed(changed, 9) - old_speed(changed, 6)) / .3
        self.assertNotAlmostEqual(old_a, old_b)

    def test_recording_censor_excludes_incomplete_windows_even_if_live_end_is_later(self):
        r = measure_acceleration_windows(track(lambda t: (t, 0.), 11), .1, 2.)
        self.assertEqual(r["counts"]["gains"]["accepted"], 4)
        self.assertGreater(r["counts"]["gains"]["exclusion_reasons"]["after_recording"], 0)
        self.assertNotIn("after_live_end", r["counts"]["gains"]["exclusion_reasons"])
        self.assertAlmostEqual(r["gains"][-1]["support_end"], 1.)

    def test_unequal_live_ends_use_actual_clock_not_nearest_frame_rounding(self):
        points = track(lambda t: (t, 0.))
        lengths = [len(measure_acceleration_windows(points, .1, end)["gains"])
                   for end in (.9, .95, .999999, 1.)]
        self.assertEqual(lengths, [3, 3, 3, 4])

    def test_preroll_and_post_whistle_data_are_not_legal_support(self):
        r = measure_acceleration_windows(track(lambda t: (t, 0.), start=-.5), .1, 1.,
                                         start_time=-.5, position_decimals=None)
        for g in r["gains"]:
            self.assertGreaterEqual(g["support_start"], -1e-14)
            self.assertLessEqual(g["support_end"], 1. + 1e-14)
        reasons = r["counts"]["gains"]["exclusion_reasons"]
        self.assertGreater(reasons["before_live_start"], 0)
        self.assertGreater(reasons["after_live_end"], 0)

    def test_missing_interior_samples_are_reported_without_inventing_motion(self):
        points = track(lambda t: (t, 0.))
        points[10] = None
        r = measure_acceleration_windows(points, .1, 2.)
        self.assertEqual(r["counts"]["speeds"]["accepted"], 12)
        self.assertEqual(r["counts"]["gains"]["accepted"], 6)
        self.assertEqual(r["counts"]["gains"]["exclusion_reasons"]["missing_position"], 8)
        points[10] = (float("nan"), 0.)
        q = measure_acceleration_windows(points, .1, 2.)
        self.assertEqual(q["counts"], r["counts"])

    def test_quantization_is_explicit_and_input_is_unchanged(self):
        points = track(lambda t: (.83 * t, 0.))
        before = copy.deepcopy(points)
        raw = measure_acceleration_windows(points, .1, 2., position_decimals=None)
        rounded = measure_acceleration_windows(points, .1, 2.)
        self.assertEqual(points, before)
        self.assertAlmostEqual(raw["speeds"][0]["speed"], .83)
        expected = (round(points[4][0], 1) - round(points[0][0], 1)) / .4
        self.assertAlmostEqual(rounded["speeds"][0]["speed"], expected)
        self.assertNotAlmostEqual(raw["speeds"][0]["speed"], rounded["speeds"][0]["speed"])

    def test_translation_rotation_and_mirror_preserve_unquantized_gain(self):
        a = measure_acceleration_windows(track(lambda t: (t * t, 0.)), .1, 2., position_decimals=None)
        b = measure_acceleration_windows(track(lambda t: (8. - .6 * t * t, -3. + .8 * t * t)),
                                         .1, 2., position_decimals=None)
        for x, y in zip(a["gains"], b["gains"]):
            self.assertAlmostEqual(x["gain"], y["gain"])

    def test_empty_or_zero_live_span_is_explicit_not_a_zero_acceleration_claim(self):
        empty = measure_acceleration_windows([], .1, 0.)
        self.assertEqual(empty["counts"]["gains"]["candidates"], 0)
        r = measure_acceleration_windows(track(lambda t: (t, 0.)), .1, 0.)
        self.assertEqual(r["gains"], [])
        self.assertEqual(r["counts"]["gains"]["excluded"], 21)

    def test_invalid_or_non_grid_window_settings_fail_instead_of_interpolating(self):
        for kwargs in ({"dt": 0.}, {"dt": float("nan")}, {"live_end": float("inf")},
                       {"live_end": -.1}, {"speed_half_window": .25},
                       {"gain_window": .35}, {"position_decimals": .1}):
            args = {"dt": .1, "live_end": 2., **kwargs}
            with self.subTest(args=args), self.assertRaises(ValueError):
                measure_acceleration_windows([(0., 0.)], **args)


if __name__ == "__main__":
    unittest.main()
