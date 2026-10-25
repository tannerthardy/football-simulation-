"""Guard the distinction between plural calls and the single PBP penalty_type."""
import importlib.util
import csv
import gzip
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("nfl_penalties", ROOT / "scripts/diag/rules/nfl-penalties.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PenaltyDescriptions(unittest.TestCase):
    def test_first_declined_does_not_hide_later_accepted(self):
        row = {"penalty": "1", "desc": "Penalty on BUF-70-A.Player, Offensive Holding, declined. "
               "PENALTY on MIA-21-B.Player, Defensive Holding, 5 yards, enforced at BUF 40."}
        self.assertEqual([(c["type"], c["status"]) for c in module.calls(row)],
                         [("Offensive Holding", "declined"), ("Defensive Holding", "accepted")])

    def test_offsetting_is_not_an_accepted_zero_yard_call(self):
        row = {"penalty": "0", "desc": "PENALTY on BUF-70-A.Player, Offensive Holding, offsetting."}
        self.assertEqual(next(module.calls(row))["status"], "offsetting")

    def test_unconfirmed_description_does_not_invent_acceptance(self):
        row = {"penalty": "0", "desc": "PENALTY on BUF-70-A.Player, Offensive Holding, 10 yards."}
        self.assertEqual(next(module.calls(row))["status"], "unresolved")

    def test_narrative_penalty_word_is_not_an_extra_flag(self):
        row = {"penalty": "1", "desc": "No Play. PENALTY. PENALTY on BUF, Delay of Game, 5 yards."}
        self.assertEqual(list(module.calls(row)), [{"team": "BUF", "type": "Delay of Game", "status": "accepted"}])

    def test_disqualification_does_not_double_count_the_underlying_foul(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "pbp.csv.gz"
            with gzip.open(path, "wt", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=["season_type", "game_id", "play_id", "penalty", "desc"])
                writer.writeheader()
                writer.writerow({"season_type": "REG", "game_id": "one", "play_id": "1", "penalty": "1",
                                 "desc": "PENALTY on BUF-1-A.Player, Unnecessary Roughness, 15 yards. "
                                 "PENALTY on BUF-1-A.Player, Disqualification, 0 yards."})
            result = module.measure(path)
            self.assertEqual(result["counts"]["accepted"], {"Unnecessary Roughness": 1})
            self.assertEqual(result["disqualification_entries"], {"accepted": 1})
            self.assertEqual(result["accepted_described_fouls_per_team_game"], .5)


if __name__ == "__main__":
    unittest.main()
