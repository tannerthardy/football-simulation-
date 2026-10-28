"""Offline mechanics contract; synthetic points, no licensed tracking rows."""
import importlib.util
import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest

PATH = Path(__file__).parents[1] / "scripts/mechanics/combo_displacement.py"
spec = importlib.util.spec_from_file_location("combo_displacement", PATH)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)


def fixture():
    # G/C double a head-up nose, one guard climbs, center stays near DL.
    players = [{"side": "O", "group": "OL"} for _ in range(5)] + [
        {"side": "D", "group": "DL"}, {"side": "D", "group": "LB"}, {"side": "O", "group": "RB"}]
    xy = []
    for f in range(26):
        t = f * .1
        d = (.2 + .4 * t, 20)
        line = [(-.4, 17.4), (-.4 + .4 * t, 18.7), (d[0] - .6, 20), (-.4, 21.3), (-.4, 22.6)]
        if 0 < f <= 10:
            line[1] = (d[0] - .1, 19.2)
        elif f > 10:
            line[1] = (d[0] - .1 + (f - 10) * .4, 19.2)
        xy.append(line + [d, (5, 19.2), (-3 + t, 20)])
    return {"src": "nfl", "concept": "INSIDE ZONE", "players": players, "xy": xy, "carrier": 7, "end": 2.5}


class ComboDisplacementTests(unittest.TestCase):
    def test_detects_fixed_identity_pair_and_predeparture_speed(self):
        rows, _ = m.measure(fixture())
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r["status"], "climb-proxy")
        self.assertEqual(r["climber"], 1)
        self.assertEqual(r["keeper"], 2)
        self.assertAlmostEqual(r["dl_net_rate"], .4)
        p = fixture()["xy"]
        f = round(r["separation_s"] / .1)
        self.assertAlmostEqual(r["climber_speed_pre_separation"], m.distance(p[f][1], p[f - 3][1]) / .3)

    def test_future_postwhistle_motion_cannot_create_climb(self):
        p = fixture()
        p["end"] = .7
        r = m.measure(p)[0][0]
        self.assertEqual(r["status"], "no-separation-before-end")
        self.assertLessEqual(r["both_near_until_s"], .7)

    def test_unconfirmed_separation_is_censored_not_no_climb(self):
        p = fixture()
        full = m.measure(p)[0][0]
        p["end"] = full["separation_s"] + .1
        self.assertEqual(m.measure(p)[0][0]["status"], "separation-right-censored")

    def test_lost_keeper_is_not_successful_release(self):
        p = fixture()
        for f in range(11, len(p["xy"])):
            p["xy"][f][2] = (-5, 20)
        self.assertNotEqual(m.measure(p)[0][0]["status"], "climb-proxy")

    def test_snap_techniques_and_mirrors(self):
        p = fixture()
        for y, expected in [(20, "head-up"), (20.45, "shade"), (18.25, "3-tech"), (19.1, "shade")]:
            for mirror in (1, -1):
                snap = [(x, yy * mirror) for x, yy in p["xy"][0]]
                snap[5] = (.2, y * mirror)
                ol = sorted(range(5), key=lambda i: snap[i][1])
                self.assertEqual(m.alignment(snap, ol, 5, m.Rules())[0], expected)

    def test_source_and_private_plan_dont_change_operator(self):
        a = fixture()
        b = fixture()
        b["src"] = "sim"
        for player in b["players"]:
            player["plan"] = "fake-installed-release"
        ra = m.measure(a)[0]
        rb = m.measure(b)[0]
        for row in ra:
            row["src"] = "sim"
        self.assertEqual(ra, rb)

    def test_never_double_and_short_near_pass_dont_count(self):
        p = fixture()
        for f in range(len(p["xy"])):
            if f not in (3, 4):
                p["xy"][f][1] = (-4, 18.7)
        self.assertEqual(m.measure(p)[0], [])

    def test_summary_keeps_failures_in_denominator(self):
        rows, _ = m.measure(fixture())
        rows[0]["play_key"] = "positive"
        failed = dict(rows[0], status="separation-unresolved", play_key="negative")
        s = m.summaries(rows + [failed])[0]
        self.assertEqual((s["episodes"], s["climbs"], s["plays"]), (2, 1, 2))
        self.assertEqual(s["climb_metrics"]["dl_net_yards"]["n"], 1)

    def test_triple_cluster_not_counted_as_multiple_doubles(self):
        p = fixture()
        for f in range(len(p["xy"])):
            d = p["xy"][f][5]
            p["xy"][f][3] = (d[0] - .3, d[1] + .2)
            p["xy"][f][1] = (d[0] - .1, d[1] - .8)
        self.assertEqual(m.measure(p)[0], [])

    def test_downfield_motion_without_backer_is_not_named_climb(self):
        p = fixture()
        p["players"][6]["group"] = "DB"
        self.assertEqual(m.measure(p)[0][0]["status"], "separation-unresolved")

    def test_puller_exclusion_uses_the_shared_motion_rule(self):
        p = fixture()
        p["concept"] = "COUNTER"
        for f in range(1, 11):
            p["xy"][f][1] = (-.2, 19.2)
        for f in range(11, len(p["xy"])):
            p["xy"][f][1] = (-1, 19.2 - (f - 10) * .35)
        self.assertTrue(m.puller(p["xy"], 1, 25))
        self.assertEqual(m.measure(p)[0], [])

    def test_real_loaders_deliver_same_measurement_on_equivalent_points(self):
        p = fixture()
        flat = [[v for point in frame for v in point] for frame in p["xy"]]
        raw_nfl = {"kind": "run", "carrier": 7, "cell": {"concept": "INSIDE ZONE"},
                   "players": p["players"], "xy": flat, "events": {"end": 2.5}}
        raw_sim = {"nullified": False, "setup": {"concept": "iz_strong", "los": 40,
                   "agents": [{"team": q["side"], "slot": "RB" if i == 7 else str(i),
                               "pos": "OT" if i < 5 else "DT" if i == 5 else "LB" if i == 6 else "RB", "plan": None}
                              for i, q in enumerate(p["players"])]},
                   "frames": [{"t": f * .1, "c": 7, "a": [[x + 40, y] for x, y in frame]} for f, frame in enumerate(p["xy"])],
                   "events": [{"type": "tackle", "t": 2.5}]}
        with tempfile.TemporaryDirectory() as tmp:
            np, sp = Path(tmp) / "nfl.jsonl.gz", Path(tmp) / "sim.json"
            with gzip.open(np, "wt") as out:
                out.write(json.dumps(raw_nfl) + "\n")
            sp.write_text(json.dumps([raw_sim]))
            a = m.measure(next(m.nfl(np)))[0][0]
            b = m.measure(next(m.sim([sp])))[0][0]
            self.assertEqual((a["status"], a["climber"], a["keeper"], a["separation_s"]),
                             (b["status"], b["climber"], b["keeper"], b["separation_s"]))
            for key in ("dl_net_yards", "dl_net_rate", "climber_speed_pre_separation"):
                self.assertAlmostEqual(a[key], b[key])
            raw_sim["frames"][0]["t"] = .05
            sp.write_text(json.dumps([raw_sim]))
            with self.assertRaises(SystemExit):
                list(m.sim([sp]))


if __name__ == "__main__":
    unittest.main()
