"""Synthetic measurement controls only; these are not NFL/simulator outcomes."""
from collections import Counter
from contextlib import redirect_stdout, redirect_stderr
import copy
import gzip
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "mechanics"))
import climber_release_reference as audit


def stage(mode="climb", concept="INSIDE ZONE", end=4.0):
    points = [(-.2, -.45), (-.2, .45), (-.2, -7), (-.2, 7), (-.2, 11),
              (-4, -3), (-3, 0), (-1, -20), (-1, -15), (-1, 18), (-1, 23),
              (0, 0), (4.5, 0), (0, -14)] + [(8, 15 + j * 3) for j in range(8)]
    groups = ["OL"] * 5 + ["QB", "RB"] + ["WR"] * 4 + ["DL", "LB", "DL"] + ["DB"] * 8
    players = [{"side": "O" if i < 11 else "D", "group": g, "id": str(i)} for i, g in enumerate(groups)]
    xy = []
    for k in range(41):
        f = [list(p) for p in points]
        f[12] = [4.5 - .1 * k, .06 * k]
        f[11][1] = .02 * k
        move = max(0, k - 8) * .3
        if mode in ("climb", "both"):
            f[0][0] += move
        if mode == "both":
            f[1][0] += move
        if mode == "drive":
            for i in (0, 1, 11):
                f[i][0] += move
        if mode == "sideways":
            f[0][1] -= move
        xy.append(f)
    return {"src": "sim", "concept": concept, "original_concept": "duo", "id": "G1-P001", "record": 1,
            "players": players, "xy": xy, "carrier": 6, "handoff": .5, "contact": None, "end": end}


def raw_sim(play):
    pos = {"OL": "OG", "QB": "QB", "RB": "RB", "WR": "WR", "DL": "DT", "LB": "LB", "DB": "CB"}
    return {"id": play["id"], "nullified": False,
            "setup": {"concept": "duo", "los": 40, "agents": [
                {"team": p["side"], "slot": "QB" if i == 5 else "RB" if i == 6 else str(i),
                 "pos": pos[p["group"]], "plan": None} for i, p in enumerate(play["players"])]},
            "frames": [{"t": k / 10, "c": 6, "a": [[p[0] + 40, p[1]] for p in f]} for k, f in enumerate(play["xy"])],
            "events": [{"t": .5, "type": "handoff"}, {"t": play["end"], "type": "tackle"}]}


def raw_nfl(play):
    return {"id": "synthetic-1", "kind": "run", "dt": .1, "players": play["players"],
            "xy": [[v for p in f for v in p] for f in play["xy"]], "carrier": 6,
            "events": {"handoff": .5, "end": play["end"]}, "cell": {"concept": play["concept"]}}


class ReleaseGeometry(unittest.TestCase):
    def test_one_upfield_departure_retains_keeper_and_measures_context(self):
        counts = Counter()
        row, = audit.measure(stage(), counts)
        self.assertEqual((row["pair"], row["departed"], row["keeper"]), ((0, 1), 0, 1))
        self.assertAlmostEqual(row["formed_s"], .5)
        self.assertAlmostEqual(row["departure_s"], 1.4)
        self.assertEqual(row["formation"]["backer_motion"], "toward_los+lateral")
        self.assertAlmostEqual(row["formation"]["backer_vx"], -1)
        self.assertAlmostEqual(row["formation"]["dl_vy"], .2)
        self.assertEqual(counts["runs_with_double"], 1)

    def test_standing_and_joint_drive_are_not_climbs(self):
        for mode in ("hold", "drive"):
            with self.subTest(mode=mode):
                row, = audit.measure(stage(mode), Counter())
                self.assertEqual(row["status"], "observation_end")
                self.assertIsNone(row["departure_s"])

    def test_both_leave_and_sideways_separation_are_not_climbs(self):
        for mode, status in (("both", "pair_lost"), ("sideways", "other_separation")):
            with self.subTest(mode=mode):
                row, = audit.measure(stage(mode), Counter())
                self.assertEqual(row["status"], status)
                self.assertIsNone(row["departure_s"])

    def test_whistle_and_insufficient_confirmation_tail_prevent_late_labels(self):
        for end in (1.3, 1.5):
            row, = audit.measure(stage(end=end), Counter())
            self.assertIsNone(row["departure_s"])
            self.assertEqual(row["status"], "observation_end")
            self.assertLessEqual(row["observed_until_s"], end + 1e-8)

    def test_missing_tail_and_missing_backer_remain_explicit(self):
        p = stage("hold")
        p["xy"] = p["xy"][:12]
        p["players"][12]["group"] = "DB"
        row, = audit.measure(p, Counter())
        self.assertEqual(row["observation_end_reason"], "recording_tail")
        self.assertEqual(row["formation"]["backer_motion"], "unavailable")
        self.assertIsNone(row["backer_index"])

    def test_target_context_fixed_before_departure_not_chosen_from_ending(self):
        p = stage()
        p["players"][14]["group"] = "LB"
        for k, f in enumerate(p["xy"]):
            f[14] = [7, 2] if k <= 5 else [1, 0]
        row, = audit.measure(p, Counter())
        self.assertEqual(row["backer_index"], 12)

    def test_dwell_rejects_transient_proximity_and_third_OL_ambiguity(self):
        p = stage()
        for k, f in enumerate(p["xy"]):
            if k % 3 == 0:
                f[1][1] = 4
        self.assertEqual(audit.measure(p, Counter()), [])
        p = stage("hold")
        for f in p["xy"]:
            f[11] = [0, 0]  # Keep all three in range for the entire observation.
            f[2] = [-.2, 0]
        self.assertEqual(audit.measure(p, Counter()), [])

    def test_reference_puller_exclusion_only_on_gap_concepts(self):
        p = stage("sideways", concept="POWER")
        counts = Counter()
        self.assertTrue(audit.ref.puller(p["xy"], 0, 25))
        self.assertEqual(audit.measure(p, counts), [])
        self.assertEqual(counts["double_excluded_trajectory_puller"], 1)
        p["concept"] = "OUTSIDE ZONE"
        self.assertEqual(len(audit.measure(p, Counter())), 1)

    def test_no_private_plan_or_job_used_for_measurement(self):
        p, q = stage(), stage()
        p["players"][0]["plan"], q["players"][0]["plan"] = "climb", "stay"
        a, = audit.measure(p, Counter())
        b, = audit.measure(q, Counter())
        a.pop("identity"); b.pop("identity")
        self.assertEqual(a, b)

    def test_unmapped_missing_and_QB_carrier_exclusions_remain_counted(self):
        for change, key in ((lambda p: p.update(concept="MAN"), "excluded_unmapped_concept:MAN"),
                            (lambda p: p["players"].pop(), "excluded_incomplete_22_players"),
                            (lambda p: p.update(carrier=5), "excluded_QB_carrier_for_source_parity")):
            p, counts = stage(), Counter()
            change(p)
            self.assertEqual(audit.measure(p, counts), [])
            self.assertEqual(counts[key], 1)


class InputAndUncertainty(unittest.TestCase):
    def test_actual_common_loaders_agree_on_identical_synthetic_positions(self):
        with tempfile.TemporaryDirectory() as folder:
            sim, nfl = Path(folder) / "sim.json", Path(folder) / "nfl.jsonl.gz"
            p = stage()
            sim.write_text(json.dumps([raw_sim(p)]))
            with gzip.open(nfl, "wt") as f:
                f.write(json.dumps(raw_nfl(p)) + "\n")
            a, = list(audit.loaded(sim, "sim", Counter()))
            b, = list(audit.loaded(nfl, "nfl", Counter()))
            self.assertEqual(a["concept"], "INSIDE ZONE")
            self.assertEqual(a["original_concept"], "duo")
            self.assertEqual(b["id"], "synthetic-1")
            ar, = audit.measure(a, Counter())
            br, = audit.measure(b, Counter())
            self.assertAlmostEqual(ar["departure_s"], br["departure_s"])
            self.assertEqual(ar["formation"]["backer_motion"], br["formation"]["backer_motion"])

    def test_nullified_failed_mesh_and_late_clock_error_not_silently_replaced(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sim.json"
            good = raw_sim(stage())
            null, failed, late = copy.deepcopy(good), copy.deepcopy(good), copy.deepcopy(good)
            null["nullified"] = True
            for f in failed["frames"]:
                f["c"] = 5
            late["frames"][35]["t"] += .05  # Outside the common loader's initial 30-frame guard.
            path.write_text(json.dumps([null, failed, late, good]))
            counts = Counter()
            p, = list(audit.loaded(path, "sim", counts))
            self.assertEqual(p["record"], 4)
            self.assertEqual(counts["loader_excluded_nullified"], 1)
            self.assertEqual(counts["loader_excluded_no_nonQB_carrier"], 1)
            self.assertEqual(counts["excluded_clock"], 1)

    def test_common_loader_still_rejects_no_time_zero(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sim.json"
            p = raw_sim(stage())
            for f in p["frames"]:
                f["t"] += .05
            path.write_text(json.dumps([p]))
            with self.assertRaises(SystemExit):
                list(audit.loaded(path, "sim", Counter()))

    def test_clustered_interval_is_seeded_and_one_departure_play_is_unavailable(self):
        r, = audit.measure(stage(), Counter())
        r["play_key"] = "A"
        self.assertIsNone(audit.estimate([r, r], 100, 53)["departure_median_ci95_s"])
        s = {**r, "play_key": "B", "departure_s": 2.4}
        out = audit.estimate([r, r, s], 100, 53)
        self.assertEqual(out["plays"], 2)
        self.assertEqual(out["observed_departures"], 3)
        self.assertEqual(out, audit.estimate([r, r, s], 100, 53))
        self.assertEqual(out["departure_median_ci95_s"], [1.4, 2.4])

    def test_cli_reports_original_concept_settings_missingness_and_input_hash(self):
        with tempfile.TemporaryDirectory() as folder:
            path, out = Path(folder) / "sim.json", Path(folder) / "report.json"
            path.write_text(json.dumps([raw_sim(stage())]))
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                result = audit.main(["--sim", str(path), "--sim-source", "a" * 40, "--out", str(out), "--bootstrap", "20"])
            report = json.loads(out.read_text())
            self.assertEqual(result, 0)
            self.assertEqual(report["inputs"][0]["sha256"], audit.sha256(path))
            self.assertEqual(report["tables"]["original_concept"][0]["group"], ["sim", "duo"])
            self.assertIn("unavailable", report["sim_settings_status"])
            self.assertIn("NOT contact/load/intent", stdout.getvalue())

    def test_cli_rejects_duplicate_input_and_missing_producer_pin(self):
        with tempfile.TemporaryDirectory() as folder:
            path, out = Path(folder) / "sim.json", Path(folder) / "report.json"
            path.write_text(json.dumps([raw_sim(stage())]))
            for argv in (["--sim", str(path), "--out", str(out)],
                         ["--sim", str(path), str(path), "--sim-source", "a" * 40, "--out", str(out)],
                         ["--sim", str(path), "--sim-source", "a" * 40, "--out", str(path)]):
                with self.subTest(argv=argv), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                    audit.main(argv)


if __name__ == "__main__":
    unittest.main()
