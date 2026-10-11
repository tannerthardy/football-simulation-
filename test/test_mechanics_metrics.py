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


def pass_play():
    """A deep intended target and a separate underneath receiver."""
    return {"id": "pass", "kind": "pass", "yards": 16.0, "dt": 0.1, "ball_y": 26.0,
            "players": [{"side": "O", "group": "QB"}, {"side": "O", "group": "WR"},
                        {"side": "O", "group": "WR"}, {"side": "D", "group": "DB"}],
            "xy": [[-5.0, 26.0, 20 + 2 * k / 10, 10.0, 1 + 4 * k / 10, 26.0, 14.0, 26.0]
                   for k in range(41)],
            "events": {"pass_forward": 1.5, "pass_arrived": 2.0, "catch": 2.0,
                       "first_contact": 2.5, "end": 4.0}, "target": 1, "carrier": None}


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

    def test_labeled_block_pair_and_contact(self):
        play = run_play()
        m = self.measure(play)
        # Contact at 3.0 s: the carrier is moving at 5 yd/s -> the "mid" bin.
        self.assertAlmostEqual(m["contact.run.carrier_speed_at_contact"]["p50"], 5.0)
        self.assertEqual(m["contact.run.yards_after_contact@mid"]["n"], 1)
        self.assertAlmostEqual(m["contact.run.contact_to_whistle_s"]["p50"], 1.0)

    def test_labeled_pass_block_pair(self):
        play = run_play()
        play.update(kind="pass", blocks=[[2, 3]], events={"pass_forward": 3.0, "end": 4.0})
        m = self.measure(play)
        self.assertAlmostEqual(m["block.pass.defender_depth_2s"]["p50"], -1.5)
        self.assertEqual(m["block.pass.still_engaged_2s"]["mean"], 1.0)

    def test_actual_receiver_drives_catch_and_contact_but_not_throw_metrics(self):
        play = pass_play()
        intended = self.measure(play)
        play["receiver"] = 2
        m = self.measure(play)
        self.assertEqual(m["catch.depth"]["p50"], 9.0)
        self.assertEqual(m["catch.yards_after_catch"]["p50"], 7.0)
        self.assertEqual(m["catch.speed_at_catch"]["p50"], 4.0)
        self.assertEqual(m["catch.defenders_within_5yd_at_catch"]["p50"], 1.0)
        self.assertEqual(m["contact.catch.yards_after_contact"]["p50"], 5.0)
        self.assertEqual(m["contact.catch.carrier_speed_at_contact"]["p50"], 4.0)
        self.assertEqual(m["contact.catch.carrier_speed_0_5s_after"]["p50"], 4.0)
        self.assertEqual(m["route.target_depth_at_throw"]["p50"], 23.0)
        self.assertEqual(m["air.target_depth_at_arrival"]["p50"], 24.0)
        for key in intended:
            if not key.startswith(("catch.", "contact.catch.")):
                self.assertEqual(m[key], intended[key], key)

    def test_official_receiver_fallback_and_aligned_channel_are_identical(self):
        play = pass_play()
        fallback = self.measure(play)
        self.assertEqual(fallback["catch.depth"]["p50"], 24.0)
        self.assertEqual(fallback["catch.yards_after_catch"]["p50"], -8.0)
        play["receiver"] = play["target"]
        self.assertEqual(self.measure(play), fallback)

    def test_explicit_missing_receiver_does_not_claim_intended_target_caught(self):
        play = pass_play()
        play["receiver"] = None
        m = self.measure(play)
        self.assertFalse(any(key.startswith(("catch.", "contact.catch.")) for key in m))
        self.assertEqual(m["air.target_depth_at_arrival"]["p50"], 24.0)

    def test_box_count_cell(self):
        m = self.measure(run_play())
        self.assertEqual(m["run.box_count"]["p50"], 1)
        self.assertEqual(m["run.handoff_s@box6-"]["n"], 1)

    def test_speed_from_positions(self):
        p = Play(run_play())
        self.assertAlmostEqual(p.speed(1, 30), 5.0)

    def test_subframe_contact_with_nearest_sample_before_event(self):
        play = run_play()
        play["events"].update(handoff=0.1, first_contact=0.45)
        p = Play(play)
        self.assertEqual(p.k(0.45), 4)
        self.assertTrue(p.live(0.45))
        m = self.measure(play)
        self.assertEqual(m["contact.run.carrier_speed_at_contact"]["n"], 1)
        self.assertEqual(m["contact.run.carrier_speed_0_5s_after"]["n"], 1)

    def test_subframe_contact_with_nearest_sample_after_event(self):
        play = run_play()
        play["events"].update(handoff=0.1, first_contact=0.55)
        p = Play(play)
        self.assertEqual(p.k(0.55), 6)
        self.assertTrue(p.live(0.55))
        m = self.measure(play)
        self.assertEqual(m["contact.run.carrier_speed_at_contact"]["n"], 1)
        self.assertEqual(m["contact.run.carrier_speed_0_5s_after"]["n"], 1)

    def test_contact_beyond_recording_is_censored_even_before_whistle(self):
        play = run_play()
        play["xy"] = play["xy"][:5]  # Last recorded frame is 0.4 s.
        play["events"].update(handoff=0.1, first_contact=0.45, end=0.6)
        p = Play(play)
        self.assertTrue(p.live(0.4))
        self.assertFalse(p.live(0.45))
        self.assertNotIn("contact.run.carrier_speed_at_contact", self.measure(play))

    def test_contact_beyond_whistle_is_censored_even_when_recorded(self):
        play = run_play()
        play["events"].update(handoff=0.1, first_contact=0.45, end=0.44)
        p = Play(play)
        self.assertTrue(p.live(0.44))
        self.assertFalse(p.live(0.45))
        self.assertFalse(p.live(-0.01))
        self.assertNotIn("contact.run.carrier_speed_at_contact", self.measure(play))

    def test_half_second_sample_requires_live_recording_and_whistle(self):
        for end, frames in ((0.9, 41), (1.0, 10)):
            with self.subTest(end=end, frames=frames):
                play = run_play()
                play["xy"] = play["xy"][:frames]
                play["events"].update(handoff=0.1, first_contact=0.45, end=end)
                m = self.measure(play)
                self.assertEqual(m["contact.run.carrier_speed_at_contact"]["n"], 1)
                self.assertNotIn("contact.run.carrier_speed_0_5s_after", m)

    def test_nfl_integer_frame_event_admission_is_unchanged(self):
        # NFL adapters derive events from integer frame offsets at 10 Hz.
        # Include recorded/whistled boundaries and genuine trailing queries.
        for frames in (1, 2, 6, 41, 801):
            play = run_play()
            play["xy"] = [play["xy"][0]] * frames
            for end_frame in (0, max(0, frames - 2), frames - 1, frames):
                play["events"]["end"] = end_frame / 10
                p = Play(play)
                for event_frame in range(frames + 10):
                    t = round(event_frame / 10, 2)
                    previous = t <= p.end + 1e-9 and p.k(t) * p.dt >= t - 1e-9
                    with self.subTest(frames=frames, end=end_frame, event=event_frame):
                        self.assertEqual(p.live(t), previous)

    def test_describe_quantiles(self):
        d = describe(list(range(11)))
        self.assertEqual((d["n"], d["p10"], d["p50"], d["p90"]), (11, 1, 5, 9))


if __name__ == "__main__":
    unittest.main()
