import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('yac_arrival_tracking', Path(__file__).resolve().parents[1] / 'scripts/diag/yac-arrival-tracking.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def encounter():
    return {'id': 'identity-control', 'dt': .1, 'catch': .5, 'end': 1.5,
            'receiver': 0, 'players': [{'id': 'actual-catcher', 'side': 'O'},
                                       {'id': 'nearest-at-catch', 'side': 'D'},
                                       {'id': 'later-helper', 'side': 'D'}],
            'xy': [[4 * k * .1, 20, 4 * k * .1, 22, 15 - 6 * k * .1, 20] for k in range(21)],
            'yac': 6, 'outcome': 'tackle'}


class ArrivalGeometryTests(unittest.TestCase):
    def test_keeps_nearest_defender_identity_when_a_different_helper_arrives(self):
        r = module.features(encounter())
        self.assertEqual(r['receiver'], 'actual-catcher')
        self.assertEqual(r['nearestAtCatch'], 'nearest-at-catch')
        self.assertAlmostEqual(r['nearestGap'], 2)
        self.assertAlmostEqual(r['nearestMinimumNext1s'], 2)
        self.assertEqual(r['firstProximityWithin1s']['defender'], 'later-helper')
        self.assertAlmostEqual(r['firstProximityWithin1s']['delay'], .9)

    def test_does_not_use_motion_after_an_out_of_bounds_ending(self):
        p = encounter()
        p.update(catch=.75, end=.8, outcome='out_of_bounds')
        for k in range(9, len(p['xy'])):
            p['xy'][k][0] = 200
        r = module.features(p)
        self.assertAlmostEqual(r['catchSpeed'], 4)
        self.assertFalse(r['oneSecondObserved'])
        self.assertAlmostEqual(r['endDelay'], .05)
        self.assertIsNone(r['firstProximityWithin1s'])

    def test_mirrored_approaches_preserve_the_measured_geometry(self):
        p = encounter()
        mirrored = copy.deepcopy(p)
        for row in mirrored['xy']:
            for k in range(1, len(row), 2):
                row[k] = 160 / 3 - row[k]
        a, b = module.features(p), module.features(mirrored)
        for key in ['nearestGap', 'closing', 'transverse', 'nearestMinimumNext1s', 'catchSpeed']:
            self.assertAlmostEqual(a[key], b[key])
        self.assertEqual(a['nearestAtCatch'], b['nearestAtCatch'])


if __name__ == '__main__':
    unittest.main()
