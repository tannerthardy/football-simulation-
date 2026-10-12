import collections
import gzip
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('trench_timeline', Path('scripts/diag/trench/timeline.py'))
timeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(timeline)


def play(stop=1.6, frames=17):
    players = [{'side': 'O', 'group': 'OL'} for _ in range(5)] + [{'side': 'D', 'group': 'DL'}, {'side': 'D', 'group': 'LB'}, {'side': 'O', 'group': 'RB'}]
    xy = []
    for k in range(frames):
        y = k * .1
        row = []
        for i in range(5):
            row.extend([-.2, 24 + i * .7 + y])
        row.extend([.5, 25 + y, 4, 27 + y, -.5 if k < 5 else .1, 26 + y])
        xy.append(row)
    return {'kind': 'run', 'carrier': 7, 'players': players, 'xy': xy, 'dt': .1,
            'events': {'end': stop, 'handoff': .3}, 'ball_y': 26, 'cell': {'concept': 'outsideZone'}}


def measure(raw):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'play.gz'
        with gzip.open(path, 'wt') as f:
            f.write(json.dumps(raw) + '\n')
        out = collections.defaultdict(lambda: collections.defaultdict(list))
        timeline.measure(path, out)
        return out['outside_zone']


class TrenchTimelineTests(unittest.TestCase):
    def test_ended_recording_does_not_supply_late_snapshots(self):
        raw = play()
        self.assertEqual(timeline.Play(raw).k(3), 16)  # original clamp counterexample
        out = measure(raw)
        self.assertTrue(out['lat LB 1.5'])
        for t in [2, 2.5, 3]:
            self.assertFalse(out[f'lat LB {t:.1f}'])
            self.assertFalse(out[f'live samples {t:.1f}'])

    def test_short_run_still_contributes_early_samples(self):
        out = measure(play(.9, 10))
        self.assertTrue(out['lat DL 0.5'])
        self.assertFalse(out['lat DL 1.0'])

    def test_velocity_does_not_use_post_whistle_frames(self):
        raw = play(1.04, 21)
        for row in raw['xy'][11:]:
            row[1] = 1000
        p = timeline.Play(raw)
        end = 10
        self.assertAlmostEqual(timeline.live_velocity(p, 0, 10, end)[1], 1)

    def test_speed_window_does_not_clamp_its_start_to_an_earlier_ended_frame(self):
        out = measure(play(.3, 4))
        self.assertEqual(out['plays'], [1])
        self.assertFalse(out['OL lat speed engaged'])
        self.assertFalse(out['OL lat speed free'])


if __name__ == '__main__':
    unittest.main()
