"""Synthetic guards for the reconstructed saved-common-play release operator."""
import copy
import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('g1_release', Path(__file__).parents[1] / 'scripts/diag/g1/release-censored.py')
R = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(R)


def scene(clear_from=2, end=.8):
    rows = []
    for k in range(9):
        blocker = [.5 if k < clear_from else 2, 0]
        rows.append([k - 1, 3, *blocker, 0, 0, 20, 20])
    return {'id': 'synthetic', 'source': 'synthetic', 'kind': 'run', 'carrier': 0,
            'dt': .1, 'events': {'handoff': 0, 'end': end}, 'xy': rows,
            'players': [{'side': 'O', 'group': 'RB'}, {'side': 'O', 'group': 'OL'},
                        {'side': 'D', 'group': 'DL'}, {'side': 'O', 'group': 'WR'}]}


class ReleaseTest(unittest.TestCase):
    def test_clearance_requires_real_point_two_elapsed(self):
        out = R.analyze(scene())['episodes'][0]
        self.assertEqual(out['release']['frame'], 2)
        self.assertEqual(out['release']['confirmedFrame'], 4)
        self.assertAlmostEqual(out['release']['confirmedTime'] - out['release']['time'], .2)
        short = scene(end=.3)
        self.assertIsNone(R.analyze(short)['episodes'][0]['release'])

    def test_unknown_is_not_clear_and_restarts_confirmation(self):
        raw = scene()
        raw['xy'][4][6:8] = [None, None]
        out = R.analyze(raw)['episodes'][0]
        self.assertEqual(out['release']['frame'], 5)
        self.assertEqual(out['release']['confirmedFrame'], 7)
        self.assertEqual(out['unknownFrames'], 1)
        self.assertIsNone(out['freeByFive']['confirmed'])

    def test_short_ending_cannot_manufacture_post_release_point(self):
        raw = scene(end=.4)
        out = R.analyze(raw)['episodes'][0]
        self.assertEqual(out['release']['confirmedFrame'], 4)
        self.assertEqual(out['postRelease0p3']['status'], 'unavailable_checkpoint')
        self.assertIsNone(out['postRelease0p3']['towardRunnerSpeed'])
        # Future rows remain in the fixture but are outside the supplied live end.
        self.assertEqual(len(raw['xy']), 9)

    def test_drift_keeps_original_blocker_and_near_endpoints(self):
        raw = scene(clear_from=99)
        for k in range(2, 9):
            raw['xy'][k][2:4] = [.5 + (k - 1) * .1, 0]
            raw['xy'][k][4:6] = [-(k - 1) * .1, 0]
            raw['xy'][k][6:8] = [-(k - 1) * .1, .3]
        out = R.analyze(raw)['episodes'][0]
        self.assertEqual(out['fixedBlocker'], 1)
        self.assertEqual([v['frame'] for v in out['drift']['intervals']], [2, 3])
        self.assertAlmostEqual(out['drift']['episodeMean'], 2)
        self.assertIsNone(out['release'])  # The new nearby body still blocks clearance.

    def test_five_denominator_requires_an_observed_crossing(self):
        full = R.analyze(scene())
        early = R.analyze(scene(end=.4))
        raw_unknown = scene()
        raw_unknown['xy'][5][0:2] = [None, None]
        unknown = R.analyze(raw_unknown)
        result = R.summary([full, early, unknown])
        self.assertEqual(result['blockedDLEpisodesAtLOS'], 3)
        self.assertEqual(result['freeByFive']['observedFiveDenominator'], 1)
        self.assertEqual(result['freeByFive']['unreachedOrUnobservedFive'], 2)
        self.assertEqual(result['freeByFive']['confirmedReleaseByFive'], 1)

    def test_observed_possession_change_censors_its_own_frame(self):
        raw = scene()
        raw['events']['fumble'] = .6  # Runner reaches +5 in this frame.
        out = R.analyze(raw)
        self.assertEqual(out['fiveCrossing']['status'], 'not_reached_within_boundary')
        self.assertEqual(out['episodes'][0]['analysisBoundary']['lastObservedFrame'], 5)


if __name__ == '__main__':
    unittest.main()
