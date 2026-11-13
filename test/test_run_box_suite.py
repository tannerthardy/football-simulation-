"""Synthetic controls for the published box counter and live-window audit."""
import contextlib
import copy
import gzip
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

PATH = Path(__file__).parents[1] / "scripts/data/run_box_suite.py"
spec = importlib.util.spec_from_file_location("run_box_suite", PATH)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
OP = m.operator()


def play():
    groups = ["OL"] * 5 + ["QB", "RB", "TE", "WR", "WR", "RB"] + ["DL"] * 4 + ["LB"] * 3 + ["DB"] * 4
    players = [{"side": "O" if i < 11 else "D", "group": g} for i, g in enumerate(groups)]
    snap = [(-.6, y) for y in (-2.6, -1.3, 0, 1.3, 2.6)] + [(-3, 0), (-5, 0), (-.5, 4), (-.5, 15), (-.5, -15), (-2, 1)]
    snap += [(.5, y) for y in (-3, -1, 1, 3)] + [(4, y) for y in (0, -2, 2)] + [(10, y) for y in (-15, -5, 5, 15)]
    return {"src": "nfl", "concept": "INSIDE ZONE", "players": players, "xy": [list(snap) for _ in range(31)], "carrier": 6, "end": 3.0}


def raw_nfl(p):
    return {"kind": "run", "id": "2022091100-1", "cell": {"concept": p["concept"]}, "carrier": p["carrier"],
            "players": p["players"], "xy": [[v for q in f for v in q] for f in p["xy"]], "events": {"end": p["end"]}}


def raw_sim(p):
    positions = {"OL": "OT", "QB": "QB", "RB": "RB", "TE": "TE", "WR": "WR", "DL": "DT", "LB": "LB", "DB": "CB"}
    return {"id": "G1-P1", "nullified": False, "setup": {"concept": "iz_strong", "los": 40, "formation": "fixture",
            "agents": [{"team": q["side"], "slot": "QB" if i == 5 else "RB" if i == 6 else str(i), "pos": positions[q["group"]], "plan": None} for i, q in enumerate(p["players"])]},
            "frames": [{"t": k * .1, "c": p["carrier"], "a": [[x + 40, y] for x, y in f]} for k, f in enumerate(p["xy"])],
            "events": [{"type": "tackle", "t": p["end"]}]}


class RunBoxSuiteTests(unittest.TestCase):
    def test_last_observed_live_sample_is_admitted_without_padding(self):
        for end in (.5, .55):
            p = play()
            p["end"] = end
            p["xy"][5][2] = (4, 0)
            before = copy.deepcopy(p)
            historical = m.observe(p, OP, live=False, correct_carrier=False)
            current = m.observe(p, OP)
            self.assertEqual(historical["touched"], 1)
            self.assertEqual(current["touched"], 1)
            self.assertEqual(p, before)

    def test_terminal_admission_keeps_early_live_and_postend_controls(self):
        for frame, expected in ((4, 1), (8, 0)):
            p = play()
            p["end"] = .5
            p["xy"][frame][2] = (4, 0)
            self.assertEqual(m.observe(p, OP)["touched"], expected)
        p = play()
        p["end"] = .55
        p["xy"][5][2] = (4, 0)
        p["xy"][5][6] = (3, 0)  # reaches LB's depth-1 on that same sample
        self.assertEqual(m.observe(p, OP)["touched"], 0)

    def test_truncated_horizon_is_unknown_on_generic_nfl_and_sim(self):
        for source in ("nfl", "sim"):
            p = play()
            p["src"] = source
            p["xy"] = p["xy"][:16]
            row = m.observe(p, OP)
            self.assertEqual(row["status"], "observed")
            self.assertEqual(row["blockers"], 7)
            self.assertEqual(row["touch_status"], "unknown")
            self.assertIsNone(row["touched"])
            self.assertIn("touch_horizon_truncated", row["reasons"])

    def test_real_loaders_preserve_generic_and_native_truncation_censoring(self):
        p = play()
        p["xy"] = p["xy"][:16]
        with tempfile.TemporaryDirectory() as folder:
            n, s = Path(folder) / "nfl.jsonl.gz", Path(folder) / "sim.json"
            with gzip.open(n, "wt") as f:
                f.write(json.dumps(raw_nfl(p)) + "\n")
            s.write_text(json.dumps([raw_sim(p)]))
            from collections import Counter
            for path, source in ((n, "nfl"), (s, "sim")):
                measured, meta = next(m.streams(path, source, OP, Counter()))
                self.assertTrue(meta["clock_valid"])  # truncation is not clock drift
                row = m.apply_snap_review(measured, OP, meta, None)
                self.assertEqual(row["touch_status"], "unknown")
                self.assertIn("touch_horizon_truncated", row["reasons"])
    def test_anchor_integrity_policy_is_symmetric_and_extremes_are_not_filtered(self):
        review = {"status": "confirmed_invalid", "reason": "raw coordinate/time anchor contradicted by independent evidence"}
        for source in ("nfl", "sim"):
            p = play()
            p["src"] = source
            meta = {"play_id": "case", "clock_valid": True, "source_reasons": []}
            self.assertEqual(m.apply_snap_review(p, OP, meta, review)["status"], "unknown")
            self.assertEqual(m.apply_snap_review(p, OP, meta, dict(review, status="valid"))["status"], "observed")
            self.assertEqual(m.apply_snap_review(p, OP, meta, dict(review, status="pending"))["status"], "observed")
            # An extreme but finite position is not itself a corruption rule.
            p["xy"][0][15] = (-100, 0)
            self.assertEqual(m.apply_snap_review(p, OP, meta, None)["status"], "observed")
            meta["source_reasons"] = ["duplicate_actor_indices"]
            self.assertEqual(m.apply_snap_review(p, OP, meta, dict(review, status="valid"))["status"], "unknown")

    def test_review_manifest_is_pinned_and_rejects_conflicts(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "review.json"
            r = {"input_sha256": "a" * 64, "filtered_run_ordinal": 0, "status": "confirmed_invalid", "reason": "anchor", "evidence_sha256": "b" * 64}
            path.write_text(json.dumps({"schema": "box-snap-reviews-v1", "reviews": [r]}))
            self.assertEqual(len(m.snap_reviews(path, [{"sha256": "a" * 64}])), 1)
            with self.assertRaises(ValueError):
                m.snap_reviews(path, [{"sha256": "c" * 64}])
            path.write_text(json.dumps({"schema": "box-snap-reviews-v1", "reviews": [r, r]}))
            with self.assertRaises(ValueError):
                m.snap_reviews(path, [{"sha256": "a" * 64}])
            with self.assertRaises(ValueError):
                m.apply_snap_review(play(), OP, {"play_id": "actual", "source_reasons": [], "clock_valid": True}, dict(r, play_id="wrong"))

    def test_cli_review_retains_unknowns_and_pending_in_primary(self):
        with tempfile.TemporaryDirectory() as folder:
            n, reviews, out = [Path(folder) / name for name in ("nfl.jsonl.gz", "reviews.json", "report.json")]
            with gzip.open(n, "wt") as f:
                for i in range(3):
                    raw = raw_nfl(play())
                    raw["id"] = f"2022091100-{i}"
                    f.write(json.dumps(raw) + "\n")
            inputs = [{"input_sha256": m.sha(n), "filtered_run_ordinal": i, "play_id": f"2022091100-{i}", "status": status,
                       "reason": "synthetic independent review", "evidence_sha256": "b" * 64} for i, status in enumerate(("confirmed_invalid", "pending", "valid"))]
            reviews.write_text(json.dumps({"schema": "box-snap-reviews-v1", "reviews": inputs}))
            args = [str(PATH), "--nfl", str(n), "--nfl-label", "synthetic", "--snap-reviews", str(reviews), "--out", str(out), "--bootstrap", "20"]
            with patch.object(sys, "argv", args), contextlib.redirect_stdout(io.StringIO()):
                m.main()
            r = json.loads(out.read_text())
            overall = next(t for t in r["tables"] if not t["dimensions"])
            sensitivity = next(t for t in r["pending_review_excluded_sensitivity"] if not t["dimensions"])
            self.assertEqual((overall["runs"], overall["counted_runs"]), (3, 2))
            self.assertEqual((sensitivity["runs"], sensitivity["counted_runs"]), (2, 1))
            self.assertEqual(r["pending_snap_review_runs"], 1)
            bad = r["rows"][0]
            self.assertEqual(bad["status"], "unknown")
            self.assertNotIn("box", bad)
            self.assertEqual(bad["untrusted_published_counts"]["box"], 7)

    def test_te_and_ol_carrier_cannot_count_as_own_blocker(self):
        for index in (7, 2):
            p = play()
            p["carrier"] = index
            out = m.sink()
            OP.measure(p, out)
            literal = out["concept"][("nfl", "ALL")]
            row = m.observe(p, OP)
            self.assertEqual(row["blockers"], literal["blk"] - 1)
            self.assertEqual(row["listed_composition"], m.observe(play(), OP)["listed_composition"])
        p = play()
        p["carrier"] = 7
        p["xy"][0][7] = (-.5, 6.5)
        row = m.observe(p, OP)
        self.assertFalse(row["carrier_blocker_credit_removed"])  # split-out TE never got the credit

    def test_nan_defender_omission_is_unknown_not_a_lighter_box(self):
        p = play()
        p["xy"][0][15] = (float("nan"), 0)
        out = m.sink()
        OP.measure(p, out)
        self.assertEqual(out["concept"][("nfl", "ALL")]["box"], 6)
        self.assertEqual(m.observe(p, OP)["status"], "unknown")

    def test_partial_duplicate_player_ids_are_not_certified(self):
        p = play()
        p["players"][0]["id"] = "same-player"
        p["players"][1]["id"] = "same-player"
        self.assertEqual(m.observe(p, OP)["status"], "unknown")
        p["players"][1]["id"] = "different-player"
        self.assertEqual(m.observe(p, OP)["status"], "observed")

    def test_postend_clock_drift_does_not_erase_valid_live_metric(self):
        p = play()
        p["end"] = .8
        with tempfile.TemporaryDirectory() as folder:
            s = Path(folder) / "sim.json"
            native = raw_sim(p)
            native["frames"][30]["t"] = 3.2
            s.write_text(json.dumps([native]))
            from collections import Counter
            measured, meta = next(m.streams(s, "sim", OP, Counter()))
            self.assertFalse(meta["full_clock_valid"])
            self.assertTrue(meta["clock_valid"])
            self.assertEqual(m.observe(measured, OP, clock_valid=meta["clock_valid"])["touch_status"], "observed")

    def test_full_sim_clock_and_actor_indices_survive_loader_audit(self):
        for defect in ("late-clock", "duplicate-actor"):
            with self.subTest(defect=defect), tempfile.TemporaryDirectory() as folder:
                n, s, out = [Path(folder) / name for name in ("nfl.jsonl.gz", "sim.json", "report.json")]
                with gzip.open(n, "wt") as f:
                    f.write(json.dumps(raw_nfl(play())) + "\n")
                native = raw_sim(play())
                if defect == "late-clock":
                    native["frames"][30]["t"] = 3.2  # shared loader checks only frames0..29
                else:
                    for i, a in enumerate(native["setup"]["agents"]):
                        a["i"] = i
                    native["setup"]["agents"][1]["i"] = 0
                s.write_text(json.dumps([native]))
                args = [str(PATH), "--nfl", str(n), "--nfl-label", "synthetic", "--sim", str(s), "--sim-source", "a" * 40, "--out", str(out), "--bootstrap", "20"]
                with patch.object(sys, "argv", args), contextlib.redirect_stdout(io.StringIO()):
                    m.main()
                row = next(r for r in json.loads(out.read_text())["rows"] if r["source"] == "sim")
                if defect == "late-clock":
                    self.assertEqual(row["touch_status"], "unknown")
                    self.assertEqual(row["status"], "observed")  # initial count still valid
                else:
                    self.assertEqual(row["status"], "unknown")

    def test_literal_even_counts_and_all_six_ol(self):
        p = play()
        self.assertEqual((m.observe(p, OP)["box"], m.observe(p, OP)["blockers"]), (7, 7))
        p["players"][8]["group"] = "OL"
        self.assertEqual(m.observe(p, OP)["blockers"], 8)

    def test_strict_boundaries_split_te_back_depth_and_carrier(self):
        for field, index, point, expected in [("blockers", 7, (-.5, 6.5), 6), ("blockers", 10, (-1, 1), 6),
                                               ("box", 15, (7.5, 0), 6), ("box", 15, (4, 6.5), 6)]:
            p = play()
            p["xy"][0][index] = point
            self.assertEqual(m.observe(p, OP)[field], expected)
        p = play()
        p["xy"][0][6] = (-6, 0)
        self.assertEqual(m.observe(p, OP)["blockers"], 7)  # carrier excluded

    def test_no_unstated_lower_box_bound_or_te_depth_rule(self):
        p = play()
        p["xy"][0][15] = (-100, 0)
        p["xy"][0][7] = (50, 4)
        self.assertEqual((m.observe(p, OP)["box"], m.observe(p, OP)["blockers"]), (7, 7))

    def test_mirror_counts_and_ol_center_not_ball(self):
        p, q = play(), play()
        q["xy"] = [[(x, -y) for x, y in f] for f in q["xy"]]
        a, b = m.observe(p, OP), m.observe(q, OP)
        self.assertEqual((a["box"], a["blockers"]), (b["box"], b["blockers"]))
        # Translation is invariant; the original operator never reads ball_y.
        q["xy"] = [[(x, y + 12) for x, y in f] for f in q["xy"]]
        q["ball_y"] = -50
        self.assertEqual(m.observe(q, OP)["box"], a["box"])

    def test_postwhistle_touch_bug_reproduces_but_live_audit_excludes_it(self):
        p = play()
        p["end"] = .8
        for f in range(15, len(p["xy"])):
            p["xy"][f][7] = (4, .1)
        historical, current = m.observe(p, OP, live=False), m.observe(p, OP)
        self.assertGreater(historical["touched"], 0)
        self.assertEqual(current["touched"], 0)
        self.assertEqual(current["backers"], historical["backers"])
        self.assertEqual((current["box"], current["blockers"]), (historical["box"], historical["blockers"]))

    def test_live_touch_is_retained_and_never_requires_load(self):
        p = play()
        for f in range(5, len(p["xy"])):
            p["xy"][f][7] = (4, .1)
        self.assertGreater(m.observe(p, OP)["touched"], 0)

    def test_unknown_positions_ids_and_fewer_than_five_ol(self):
        for value in (None, "NA", float("nan")):
            p = play()
            p["xy"][0][0] = (value, 0)
            self.assertEqual(m.observe(p, OP)["status"], "unknown")
        p = play()
        for i, player in enumerate(p["players"]):
            player["id"] = str(i)
        p["players"][1]["id"] = "0"
        self.assertIn("duplicate_player_ids", m.observe(p, OP)["reasons"])
        p = play()
        p["players"][0]["group"] = "WR"
        self.assertEqual(m.observe(p, OP)["status"], "excluded")

    def test_missing_later_positions_preserve_counts_not_zero_touch(self):
        p = play()
        p["xy"][8][7] = (None, 4)
        row = m.observe(p, OP)
        self.assertEqual(row["blockers"], 7)
        self.assertIsNone(row["touched"])
        p["end"] = .5
        self.assertIsNotNone(m.observe(p, OP)["touched"])

    def test_touch_denominator_is_backers_not_run_average(self):
        a, b = m.observe(play(), OP), m.observe(play(), OP)
        a.update(backers=1, touched=1, cluster="a")
        b.update(backers=3, touched=0, cluster="b")
        result = m.summary([a, b], 100, 7)
        self.assertEqual(result["backer_touch_fraction"], .25)
        self.assertEqual(result["backers"], 4)

    def test_cluster_intervals_row_order_and_missing_cluster(self):
        a, b = m.observe(play(), OP), m.observe(play(), OP)
        a.update(cluster="a", touched=1)
        b.update(cluster="b", touched=0)
        first, second = m.summary([a, b], 100, 7), m.summary([b, a], 100, 7)
        self.assertEqual(first["ci95_touch"], second["ci95_touch"])
        self.assertIsNotNone(first["ci95_bucket_shares"])
        a["cluster"] = None
        self.assertIsNone(m.summary([a, b], 100, 7)["ci95_touch"])

    def test_all_four_advantage_groups_and_unknown_denominator(self):
        rows = []
        for i, bucket in enumerate(OP.BUCKETS):
            r = m.observe(play(), OP)
            r.update(bucket=bucket, source="nfl", concept="INSIDE ZONE", cluster=str(i))
            rows.append(r)
        rows.append({"status": "unknown", "reasons": ["missing_snap"], "source": "nfl", "concept": "INSIDE ZONE"})
        tables = m.tables(rows, 20)
        overall = next(t for t in tables if not t["dimensions"])
        self.assertEqual((overall["runs"], overall["counted_runs"]), (5, 4))
        self.assertEqual(set(overall["bucket_counts"]), set(OP.BUCKETS))

    def test_real_loaders_select_and_join_identity(self):
        with tempfile.TemporaryDirectory() as folder:
            n, s = Path(folder) / "nfl.jsonl.gz", Path(folder) / "sim.json"
            with gzip.open(n, "wt") as f:
                f.write(json.dumps(raw_nfl(play())) + "\n")
            native = raw_sim(play())
            passed = copy.deepcopy(native)
            passed["setup"]["concept"] = None
            s.write_text(json.dumps([passed, native]))
            from collections import Counter
            a = list(m.streams(n, "nfl", OP, Counter()))
            counts = Counter()
            b = list(m.streams(s, "sim", OP, counts))
            self.assertEqual((len(a), len(b)), (1, 1))
            self.assertEqual(a[0][1]["cluster"], "2022091100")
            self.assertEqual(counts["published_excluded_no_run_concept"], 1)
            self.assertEqual(m.observe(a[0][0], OP)["blockers"], m.observe(b[0][0], OP)["blockers"])

    def test_common_surplus_is_not_same_raw_box_or_personnel(self):
        a = m.observe(play(), OP)
        a.update(source="nfl", concept="INSIDE ZONE")
        b = dict(a, source="sim", box=6, blockers=6)
        self.assertEqual(m.common_support([a, b])["common_cells"], 0)
        b.update(box=7, blockers=7)
        self.assertEqual(m.common_support([a, b])["common_cells"], 1)
        b["listed_composition"] = dict(b["listed_composition"], OL=6)
        self.assertEqual(m.common_support([a, b])["common_cells"], 0)

    def test_qb_run_loader_asymmetry_is_exposed_not_hidden(self):
        p = play()
        p["carrier"] = 5
        with tempfile.TemporaryDirectory() as folder:
            n, s = Path(folder) / "nfl.jsonl.gz", Path(folder) / "sim.json"
            with gzip.open(n, "wt") as f:
                f.write(json.dumps(raw_nfl(p)) + "\n")
            s.write_text(json.dumps([raw_sim(p)]))
            from collections import Counter
            self.assertEqual(len(list(m.streams(n, "nfl", OP, Counter()))), 1)
            counts = Counter()
            self.assertEqual(list(m.streams(s, "sim", OP, counts)), [])
            self.assertEqual(counts["loader_excluded_no_nonqb_carrier"], 1)

    def test_cli_rejects_duplicate_inputs_and_output_aliases(self):
        with tempfile.TemporaryDirectory() as folder:
            n, s, out = [Path(folder) / name for name in ("nfl.jsonl.gz", "sim.json", "report.json")]
            with gzip.open(n, "wt") as f:
                f.write(json.dumps(raw_nfl(play())) + "\n")
            s.write_text(json.dumps([raw_sim(play())]))
            out.write_text("old report")
            for target in (n, out):
                args = [str(PATH), "--nfl", str(n), "--nfl-label", "synthetic", "--sim", str(s), str(s), "--sim-source", "a" * 40, "--out", str(target)]
                original = n.read_bytes(), out.read_bytes()
                with patch.object(sys, "argv", args), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
                    m.main()
                self.assertEqual(error.exception.code, 2)
                self.assertEqual((n.read_bytes(), out.read_bytes()), original)

    def test_cli_runs_synthetic_pair_and_keeps_unstratified(self):
        with tempfile.TemporaryDirectory() as folder:
            n, s, out = [Path(folder) / name for name in ("nfl.jsonl.gz", "sim.json", "report.json")]
            with gzip.open(n, "wt") as f:
                f.write(json.dumps(raw_nfl(play())) + "\n")
            s.write_text(json.dumps([raw_sim(play())]))
            args = [str(PATH), "--nfl", str(n), "--nfl-label", "synthetic", "--sim", str(s), "--sim-source", "a" * 40, "--out", str(out), "--bootstrap", "20"]
            with patch.object(sys, "argv", args), contextlib.redirect_stdout(io.StringIO()):
                m.main()
            result = json.loads(out.read_text())
            self.assertEqual(result["common_support"]["common_cells"], 1)
            self.assertEqual(len([t for t in result["tables"] if not t["dimensions"]]), 2)
            self.assertEqual(result["rows"][0]["snapshot"], "snap-only")


if __name__ == "__main__":
    unittest.main()
