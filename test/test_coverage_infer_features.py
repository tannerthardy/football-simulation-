"""Coverage-inference features may use only what is visible before their time limit."""
import importlib.util
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("coverage_features", ROOT / "scripts/coverage_infer/features.py")
feat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(feat)


def play(seed=0):
    rng = np.random.default_rng(seed)
    pos = ["QB", "WR", "WR", "TE", "RB", "CB", "CB", "FS", "SS", "MLB", "DE"]
    side = ["O"] * 5 + ["D"] * 6
    n, frames = len(pos), feat.PRE + 41
    xy = np.cumsum(rng.normal(0, 0.1, (n, frames, 2)), axis=1).astype(np.float32)
    xy[:, :, 1] += np.linspace(-15, 15, n)[:, None]
    xy[5:, :, 0] += 8
    return dict(xy=xy, side=side, pos=pos, pa=False, down=2, togo=7)


class FeatureWindow(unittest.TestCase):
    def test_nothing_after_the_limit_changes_a_feature(self):
        a, b = play(), play()
        k = feat.PRE + 15  # 1.5 s after the snap
        b["xy"][:, k + 1:, :] += 25.0
        da, ra = feat.play_features(a, 1.5)
        db, rb = feat.play_features(b, 1.5)
        self.assertEqual(da, db)
        self.assertEqual(repr(ra), repr(rb))

    def test_pre_snap_look_ignores_every_post_snap_frame(self):
        a, b = play(), play()
        b["xy"][:, feat.PRE + 1:, :] *= -3
        _, ra = feat.play_features(a, 0.0)
        _, rb = feat.play_features(b, 0.0)
        self.assertEqual(repr(ra), repr(rb))

    def test_a_later_limit_adds_information(self):
        _, early = feat.play_features(play(), 0.5)
        _, late = feat.play_features(play(), 3.0)
        self.assertGreater(len(late[0]), len(early[0]))

    def test_given_defenders_and_receivers_are_the_only_ones_used(self):
        d, rows = feat.play_features(play(), 2.0, D=[7, 8], E=[1, 2])
        self.assertEqual(d, [7, 8])
        self.assertEqual(len(rows), 2)


if __name__ == "__main__":
    unittest.main()
