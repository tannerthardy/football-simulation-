"""Small correctness checks for the diagnostic's decision-changing limitations."""
import importlib.util
import csv
import tempfile
import unittest
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts/diag/p045-nfl-approach.py"
SPEC = importlib.util.spec_from_file_location("p045_approach", PATH)
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


def packet():
    return {"id": "synthetic-test-only", "kind": "pass", "yards": 10, "dt": .1,
            "players": [{"side": "O", "group": "WR"}, {"side": "D", "group": "DB"},
                        {"side": "D", "group": "DB"}],
            "target": 0, "receiver": 0,
            "identities": [{"id": "receiver"}, {"id": "defender-A"}, {"id": "defender-B"}],
            "xy": [[k * .1, 0, k * .1 + 1 + k * .2, 0, k * .1 + 5 - k * .2, 0]
                   for k in range(16)],
            "events": {"pass_forward": .5, "pass_arrived": 1.5, "catch": 1.5, "end": 1.5}}


class ApproachChecks(unittest.TestCase):
    def test_identity_switch_does_not_become_one_defender_path(self):
        r = m.measure(packet())
        self.assertEqual(r["snapshots"][0]["nearest_id"], "defender-A")
        self.assertEqual(r["snapshots"][-1]["nearest_id"], "defender-B")
        for s in r["snapshots"]:
            self.assertEqual([d["id"] for d in s["defenders"]], ["defender-A", "defender-B"])
        self.assertGreater(r["snapshots"][-1]["defenders"][0]["separation_yd"],
                           r["snapshots"][0]["defenders"][0]["separation_yd"])

    def test_contact_velocity_uses_no_contact_or_future_samples(self):
        raw = packet()
        before = m.pre_velocity(m.Play(raw), 0, 1, 1)
        for k in range(10, 16):
            raw["xy"][k][0] = 1000  # contact and every later sample may change freely
        after = m.pre_velocity(m.Play(raw), 0, 1, 1)
        self.assertEqual(before, after)
        self.assertEqual(before["sample_window_s"], [.5, .9])
        self.assertIsNone(m.pre_velocity(m.Play(raw), 0, 1.1, 1))

    def test_forward_filled_coordinates_are_rejected(self):
        raw = packet()
        raw["observed"] = [[True] * 3 for _ in raw["xy"]]
        raw["observed"][7][2] = False
        with self.assertRaisesRegex(ValueError, "unobserved"):
            m.measure(raw)

    def test_momentum_changes_the_necessary_acceleration_bound(self):
        toward = m.demand([0, 0], [5, 0], [10, 0], 2)
        away = m.demand([0, 0], [-5, 0], [10, 0], 2)
        self.assertEqual(toward["speed_cap_required_at_least_yd_s"], 4.5)
        self.assertEqual(toward["peak_accel_required_at_least_yd_s2"], 0)
        self.assertEqual(away["peak_accel_required_at_least_yd_s2"], 9.5)

    def test_existing_nfl_adapter_retains_raw_ids_and_rejects_a_hole(self):
        # Artificial CSVs exercise the real adapter, not empirical NFL evidence.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def write(name, rows):
                with (root / name).open("w", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
                    writer.writeheader(); writer.writerows(rows)
            write("players.csv", [{"nflId": str(i), "position": "WR" if i <= 11 else "CB", "weight": "200"}
                                  for i in range(1, 23)])
            write("plays.csv", [{"gameId": "1", "playId": "2", "playNullifiedByPenalty": "N",
                "qbSpike": "0", "qbKneel": "0", "yardsGained": "22", "isDropback": "TRUE",
                "rushLocationType": "NA", "possessionTeam": "O", "pff_runConceptPrimary": "NA",
                "pff_passCoverage": "Quarters"}])
            write("player_play.csv", [{"gameId": "1", "playId": "2", "nflId": "1",
                "hadRushAttempt": "0", "wasTargettedReceiver": "1", "hadPassReception": "1",
                "routeRan": "POST", "blockedPlayerNFLId1": "NA", "blockedPlayerNFLId2": "NA",
                "blockedPlayerNFLId3": "NA"}])
            rows = []
            for k in range(26):
                for i in range(1, 24):
                    rows.append(dict(zip(["gameId", "playId", "nflId", "displayName", "frameId", "frameType",
                        "time", "jerseyNumber", "club", "playDirection", "x", "y", "s", "a", "dis", "o", "dir", "event"],
                        ["1", "2", str(i) if i <= 22 else "NA", "test", str(k+1), "SNAP" if k == 0 else "AFTER_SNAP",
                         "unused", "0", "O" if i <= 11 else "D", "right", str(k + (2 if i == 12 else 10 if 12 < i <= 22 else 0)),
                         "0", "0", "0", "0", "0", "0",
                         "pass_forward" if k == 5 and i == 23 else "pass_outcome_caught" if k == 20 and i == 1
                         else "pass_arrived" if k == 20 and i == 23 else "NA"])))
            old_data = m.adapter.DATA
            try:
                write("tracking_week_1.csv", rows)
                r = m.nfl_query(root, [1])
                self.assertEqual(r["witnesses"]["contained"]["target_id"], "1")
                self.assertIn("12", r["witnesses"]["contained"]["selected_defender_ids"])
                write("tracking_week_1.csv", [r for r in rows if not (r["frameId"] == "10" and r["nflId"] == "12")])
                r = m.nfl_query(root, [1])
                self.assertEqual(r["counts"]["invalid"], 1)
                self.assertEqual(r["witnesses"], {})
            finally:
                m.adapter.DATA = old_data


if __name__ == "__main__":
    unittest.main()
