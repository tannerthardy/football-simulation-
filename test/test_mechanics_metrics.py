"""Shared mechanism metrics: definitions on hand-built plays."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts/mechanics"))
from metrics import Collector, Play, describe  # noqa: E402

PLAYERS = [{"side": "O", "group": "QB"}, {"side": "O", "group": "RB"},
           {"side": "O", "group": "OL"}, {"side": "D", "group": "DL"}]


def run_play(flip=False):
    """RB takes a handoff at 1.0 s and crosses the line at 2.0 s; one OL drives
    a box DL back at 0.5 yd/s from 1.0 s onward."""
    frames = []
    for k in range(41):
        t = k / 10
        rb_x = -5 + max(0, t - 1.0) * 5
        dl_x = 1.0 + max(0, t - 1.0) * 0.5
        ys = [26.0, 26.0, 26.0, 26.0]
        if flip:
            ys = [53.3 - y for y in ys]
        frames.append([-5, ys[0], rb_x, ys[1], dl_x - 1.0, ys[2], dl_x, ys[3]])
    return {"id": "t", "kind": "run", "yards": 4.0, "players": PLAYERS, "dt": 0.1, "xy": frames,
            "ball_y": 53.3 - 26.0 if flip else 26.0,
            "events": {"handoff": 1.0, "first_contact": 3.0, "end": 4.0}, "carrier": 1, "target": None}


class MetricsTest(unittest.TestCase):
    def measure(self, play):
        c = Collector()
        c.add(play)
        return {k: v for k, v in c.summary()["metrics"].items()}

    def test_run_timing_and_contact(self):
        m = self.measure(run_play())
        self.assertEqual(m["run.handoff_s"]["p50"], 1.0)
        self.assertAlmostEqual(m["run.carrier_cross_los_s"]["p50"], 2.1)  # first frame strictly past the line
        self.assertAlmostEqual(m["run.yards_before_contact"]["p50"], 5.0)
        self.assertAlmostEqual(m["run.yards_after_contact"]["p50"], -1.0)

    def test_engaged_defender_driven_back(self):
        m = self.measure(run_play())
        self.assertAlmostEqual(m["run.engaged_dl_driven_back_1s"]["p50"], 0.0)
        self.assertAlmostEqual(m["run.engaged_dl_driven_back_2s"]["p50"], 0.5)
        self.assertAlmostEqual(m["run.engaged_dl_driven_back_3s"]["p50"], 1.0)

    def test_mirror_invariant(self):
        self.assertEqual(self.measure(run_play()), self.measure(run_play(flip=True)))

    def test_speed_from_positions(self):
        p = Play(run_play())
        self.assertAlmostEqual(p.speed(1, 30), 5.0)

    def test_describe_quantiles(self):
        d = describe(list(range(11)))
        self.assertEqual((d["n"], d["p10"], d["p50"], d["p90"]), (11, 1, 5, 9))


if __name__ == "__main__":
    unittest.main()
