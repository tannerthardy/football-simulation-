"""The quarters apex operator on a tiny synthetic play: release class and variant."""
import importlib.util
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("coverage_apex", ROOT / "scripts/coverage_infer/apex.py")
apex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(apex)

PRE = apex.PRE


def track(depth_by_s, out_by_s, y0, s=1):
    """A path on the 0.1 s grid: depth and outward travel are linear in time to 3 s."""
    n = PRE + 41
    xy = np.zeros((n, 2))
    for k in range(n):
        t = max(0.0, (k - PRE) / 10)
        xy[k] = (depth_by_s * t, s * (abs(y0) + out_by_s * t))
    return xy


class ApexOperator(unittest.TestCase):
    def test_release_classes(self):
        xy = np.stack([track(4.0, 0.0, 10), track(0.5, 2.0, 10), track(0.5, -2.0, 10), track(0.2, 0.0, 10)])
        self.assertEqual([apex.release(xy, i, 1) for i in range(4)], ["vertical", "flat", "under", "stay"])

    def test_the_left_side_is_mirrored(self):
        xy = np.stack([track(4.0, 0.0, -10, s=-1), track(0.5, 2.0, -10, s=-1)])
        self.assertEqual([apex.release(xy, i, -1) for i in range(2)], ["vertical", "flat"])

    def test_variants(self):
        v = apex.apex_variant
        self.assertEqual(v("vertical", 8.0, 0.0, False), "carry")
        self.assertEqual(v("vertical", 4.0, 0.0, False), "sink")
        self.assertEqual(v("flat", 3.0, 3.0, False), "to-flat")
        self.assertEqual(v("break", 4.0, 1.0, True), "to-flat")
        self.assertEqual(v("break", 4.5, 0.0, False), "sit")
        self.assertEqual(v("vertical", float("nan"), 0.0, False), "unknown")


if __name__ == "__main__":
    unittest.main()
