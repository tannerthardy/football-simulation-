import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("film_outcomes", Path(__file__).resolve().parents[1] / "scripts/film-outcomes.py")
film = importlib.util.module_from_spec(spec)
spec.loader.exec_module(film)


def play(kind, concept, yards, **changes):
    p = {"kind": kind, "concept": {"id": concept}, "yds": yards, "dist": 10,
         "down": 1, "nullified": False, "flags": {"complete": False}, "ev": [],
         "plan": {"coverage": "cover3_mable", "called": "cover3_match", "family": "cover3", "front": "under"}}
    p.update(changes)
    return p


class FilmBreakdowns(unittest.TestCase):
    def test_rates_keep_throws_separate_from_pass_plays_and_checked_calls(self):
        data = {"meta": {}, "games": [], "plays": [
            play("pass", "levels", 24, flags={"complete": True}, ev=[[2, "throw"]], stats={"sep": 3, "yac": 10}),
            play("pass", "levels", -6),
            play("pass", "levels", 90, nullified=True),
        ]}
        report = film.study(data, "hash")
        c = report["pass"]["breakdowns"]["byConcept"]["levels"]
        self.assertEqual(c["plays"], 2)
        self.assertEqual(c["explosive"], {"count": 1, "denominator": 2, "percent": 50})
        self.assertEqual(c["twentyYardCompletionsPerThrow"]["denominator"], 1)
        self.assertEqual(c["completedYAC"], {"n": 1, "meanYd": 10})
        self.assertIn("cover3_mable", report["pass"]["breakdowns"]["byCoverage"])
        self.assertIn("cover3_match", report["pass"]["breakdowns"]["byCalledCoverage"])

    def test_run_success_and_missing_labels_do_not_invent_a_coverage(self):
        data = {"meta": {}, "games": [], "plays": [
            play("run", "insideZone", 4),
            play("run", "insideZone", 4, down=2, plan={}),
            play("run", "outsideZone", 12, down=2),
            play("run", "outsideZone", 90, nullified=True),
        ]}
        report = film.study(data, "hash")["run"]["breakdowns"]
        self.assertEqual(report["byConcept"]["insideZone"]["success"]["percent"], 50)
        self.assertEqual(report["byConcept"]["outsideZone"]["explosive"]["percent"], 100)
        self.assertEqual(report["byCoverage"]["unknown"]["plays"], 1)
        self.assertEqual(report["byDisguise"]["unknown"]["plays"], 1)
        self.assertEqual(report["byDisguise"]["same-look"]["plays"], 2)


if __name__ == "__main__":
    unittest.main()
