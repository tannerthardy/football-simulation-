import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('coverage_reference', Path(__file__).parents[1] / 'scripts/data/bdb2025_coverage.py')
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)


class CoverageFrames(unittest.TestCase):
    def test_requires_target_and_all_defenders(self):
        frame = {'receiver': (0, 0, 'OFF')}
        frame.update({str(i): (3 + i, 0, 'DEF') for i in range(10)})
        self.assertIsNone(reference.separation(frame, 'receiver', 'DEF'))
        frame['10'] = (20, 0, 'DEF')
        self.assertEqual(reference.separation(frame, 'receiver', 'DEF'), 3)
        self.assertIsNone(reference.separation(frame, 'missing', 'DEF'))

    def test_includes_rushers_and_uses_center_distance(self):
        frame = {'receiver': (1, 1, 'OFF')}
        frame.update({str(i): (4, 5, 'DEF') for i in range(11)})
        self.assertEqual(reference.separation(frame, 'receiver', 'DEF'), 5)
        frame['rusher'] = frame.pop('0')
        frame['rusher'] = (1, 1.8, 'DEF')
        self.assertAlmostEqual(reference.separation(frame, 'receiver', 'DEF'), .8)

    def test_empty_and_tight_denominators(self):
        self.assertEqual(reference.summary([]), {'n': 0})
        self.assertEqual(reference.summary([.5, 1, 4])['under1Pct'], 100 / 3)


if __name__ == '__main__':
    unittest.main()
