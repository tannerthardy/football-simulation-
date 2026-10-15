"""Synthetic checks for the bounded observational expansion, not NFL evidence."""
import csv
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


driver = module("p045_expand", ROOT / "scripts/diag/p045-nfl-expand.py")
query = module("p045_frozen_test", ROOT / "scripts/diag/p045-nfl-approach.py")


def write(path, rows):
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader(); writer.writerows(rows)


def fixture(root):
    write(root / "players.csv", [{"nflId": str(i), "position": "WR" if i <= 11 else "CB", "weight": "200"} for i in range(1, 23)])
    plays, labels, tracking = [], [], []
    # Two contained, one explosive, one geometry failure, one missing sample,
    # one missing required event; then a duplicate noncontiguous fragment.
    for pid in range(1, 7):
        plays.append({"gameId": "1", "playId": str(pid), "playNullifiedByPenalty": "N", "qbSpike": "0",
                      "qbKneel": "0", "yardsGained": "40" if pid == 3 else "22", "isDropback": "TRUE",
                      "rushLocationType": "NA", "possessionTeam": "O", "pff_runConceptPrimary": "NA", "pff_passCoverage": "Quarters"})
        labels.append({"gameId": "1", "playId": str(pid), "nflId": "1", "hadRushAttempt": "0", "wasTargettedReceiver": "1",
                       "hadPassReception": "1", "routeRan": "POST", "blockedPlayerNFLId1": "NA", "blockedPlayerNFLId2": "NA", "blockedPlayerNFLId3": "NA"})
        for k in range(26):
            for i in range(1, 24):
                if pid == 5 and k == 9 and i == 12:
                    continue
                x = k + (2 if i == 12 else 10 if 12 < i <= 22 else 0)
                if pid == 4 and i == 1:
                    x = k * .2
                event = "pass_forward" if k == 5 and i == 23 else "pass_outcome_caught" if k == 20 and i == 1 else "pass_arrived" if k == 20 and i == 23 and pid != 6 else "NA"
                tracking.append(dict(zip(["gameId", "playId", "nflId", "displayName", "frameId", "frameType", "time", "jerseyNumber",
                                          "club", "playDirection", "x", "y", "s", "a", "dis", "o", "dir", "event"],
                                         ["1", str(pid), str(i) if i <= 22 else "NA", "synthetic", str(k+1), "SNAP" if k == 0 else "AFTER_SNAP",
                                          "unused", "0", "O" if i <= 11 else "D", "right", str(x), "0", "0", "0", "0", "0", "0", event])))
    write(root / "plays.csv", plays)
    write(root / "player_play.csv", labels)
    tracking += [r.copy() for r in tracking if r["playId"] == "1"]
    write(root / "tracking_week_2.csv", tracking)
    write(root / "games.csv", [{"gameId": "1", "week": "2"}])


class ExpansionChecks(unittest.TestCase):
    def test_audit_changes_no_original_result_and_reconciles_exclusions(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); fixture(root)
            before = query.nfl_query(root, [2])
            audited = driver.audited_week(query, root, 2, {"1": 2}, driver.Budget())
            self.assertEqual(before, audited["original"])
            self.assertEqual(audited["audit"]["disjoint_first_failure"], {
                "geometry_depth": 1, "sample_validity": 1, "missing_required_events": 1, "duplicate_fragment": 1})
            self.assertEqual(audited["audit"]["geometry_failure_memberships_overlap"], {"depth": 1, "separation": 1})
            self.assertEqual(audited["audit"]["outcome_bins"], {"contained": 2, "offensive_win": 1})
            self.assertEqual([r["id"] for r in audited["examples"]["contained"]], ["1-1", "1-2"])
            self.assertEqual([r["id"] for r in audited["examples"]["offensive_win"]], ["1-3"])

    def test_zip_reader_matches_files_and_records_full_consumed_hashes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); fixture(root)
            baseline = query.nfl_query(root, [2])
            archive = root / "synthetic.zip"
            with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
                for p in root.glob("*.csv"):
                    z.write(p, driver.PREFIX + p.name)
            records = []
            with zipfile.ZipFile(archive) as z:
                query.adapter.open = driver.zip_open(z, driver.Budget(), records)
                try:
                    result = driver.audited_week(query, root, 2, {"1": 2}, driver.Budget())
                finally:
                    del query.adapter.open
            self.assertEqual(baseline, result["original"])
            self.assertTrue(all(r["complete"] for r in records))
            for r in records:
                self.assertEqual(r["sha256"], hashlib.sha256((root / Path(r["member"]).name).read_bytes()).hexdigest())
            info = driver.inventory(archive, root)
            self.assertEqual(info["new_weeks"], [2])
            self.assertTrue(info["weeks"][0]["restored_readable"])

    def test_partial_week_is_censored_and_hooks_restored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); fixture(root)
            original = (query.adapter.stream, query.adapter.convert, query.measure)
            with self.assertRaises(driver.CostLimit) as raised:
                driver.audited_week(query, root, 2, {"1": 2}, driver.Budget(seconds=-1))
            self.assertFalse(raised.exception.p045_partial_audit["complete"])
            self.assertEqual(original, (query.adapter.stream, query.adapter.convert, query.measure))

    def test_cross_week_identity_mix_is_not_silently_combined(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); fixture(root)
            with self.assertRaisesRegex(ValueError, "Cross-week"):
                driver.audited_week(query, root, 2, {"1": 3}, driver.Budget())

    def test_complete_driver_reuses_cache_and_runs_only_new_week(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); fixture(root)
            header = (root / "tracking_week_2.csv").read_text().splitlines()[0] + "\n"
            (root / "tracking_week_1.csv").write_text(header)
            cached = query.nfl_query(root, [1])
            archive = root / "synthetic.zip"
            with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
                for p in root.glob("*.csv"): z.write(p, driver.PREFIX + p.name)
            archive_sha = hashlib.sha256(archive.read_bytes()).hexdigest()
            cache = {"query_commit": driver.QUERY_COMMIT, "module_sha256": driver.MODULES,
                     "receipt": {"catalog_archive_sha256": archive_sha}, "query": query.QUERY,
                     "access": {n: {"sha256": hashlib.sha256((root/n).read_bytes()).hexdigest()} for n in driver.META}, "nfl": cached}
            cache_path = root / "cache.json"; cache_path.write_text(json.dumps(cache))
            # Synthetic hash pins are confined to a child test process. Production
            # CLI pins remain the actual catalog archive and returned week-1 file.
            program = """import importlib.util, pathlib, sys
s=importlib.util.spec_from_file_location('expansion_test',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
m.ARCHIVE_SHA=sys.argv[2];m.WEEK1_SHA=sys.argv[3]
m.git_bytes=lambda repo,commit,name:(pathlib.Path(repo)/name).read_bytes()
sys.argv=['expand','--repo',sys.argv[4],'--archive',sys.argv[5],'--data',sys.argv[6],'--week1',sys.argv[7],'--out',sys.argv[8],'--run']
raise SystemExit(m.main())
"""
            out = root / "expanded.json"
            p = subprocess.run([sys.executable, "-I", "-c", program, str(ROOT / "scripts/diag/p045-nfl-expand.py"),
                                archive_sha, hashlib.sha256(cache_path.read_bytes()).hexdigest(), str(ROOT), str(archive),
                                str(root), str(cache_path), str(out)], text=True, capture_output=True)
            self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
            result = json.loads(out.read_text())
            self.assertEqual(result["status"], "complete")
            self.assertEqual(result["reused_weeks"], [1])
            self.assertEqual(result["new_query_weeks_attempted"], [2])
            self.assertEqual([w["status"] for w in result["per_week"]], ["reused", "complete"])
            self.assertNotIn(driver.PREFIX + "tracking_week_1.csv", [r["member"] for r in result["input_reads"]])
            combined = query.nfl_query(root, [1, 2])
            self.assertEqual(result["aggregate_counts"], combined["counts"])
            for group, witness in combined["witnesses"].items():
                self.assertEqual(result["examples"][group][0], json.loads(json.dumps(witness)))


if __name__ == "__main__":
    unittest.main()
