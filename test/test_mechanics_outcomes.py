"""Outcome denominators and context comparisons, independent of game generation."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("mechanics_outcomes", ROOT / "scripts/mechanics/outcomes.py")
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)


def summary(n, mean, fraction=0.5):
    rate = {"denominator": n, "count": n * fraction}
    return {"completion": rate, "interception": rate, "sackPerDropback": rate,
            "twentyYardCompletionPerThrow": rate,
            "designedRun": {"success4060100": rate},
            "completionGain": {"yards": {"n": n, "mean": mean}},
            "completedYAC": {"n": n, "mean": mean},
            "throw": {"yards": {"n": n, "mean": mean}}}


def cell(distance, stats, nfl=False):
    return {"down": "1", "distance": distance, "field": "middle",
            "cleanOutcomes" if nfl else "outcomes": stats}


class OutcomesTest(unittest.TestCase):
    def test_final_interception_and_nonthrow_dropbacks(self):
        rows = []
        for i, change in enumerate(({}, {"interceptedBy": "defender"},
                                    {"sacked": True}, {"scramble": True})):
            stats = {"attempted": True, "completed": True, "sacked": False,
                     "scramble": False, "yac": 2, **change}
            p = {"id": str(i), "index": i, "kind": "pass", "gameSeed": 1,
                 "yards": 5, "stats": stats, "events": [{"type": "throw"}]}
            rows.append(ops.adapt(p, {"home": "H", "away": "A"}, {}))
        result = ops.outcomes(rows)
        self.assertEqual(result["dropbacks"], 4)
        self.assertEqual(result["throws"], 2)
        self.assertEqual(result["completions"], 1)
        self.assertEqual(result["interception"]["count"], 1)
        self.assertEqual(result["sackPerDropback"]["denominator"], 4)
        self.assertFalse(rows[1]["complete_pass"])

    def test_same_reference_weights_for_means_and_rates(self):
        native = [cell("short", summary(20, 5, 0.2)), cell("long", summary(40, 25, 0.8))]
        ref = {"pooled": summary(400, 9.5), "conditionalCells": [
            cell("short", summary(100, 8, 0.4), True),
            cell("long", summary(300, 10, 0.6), True)]}
        result = ops.standardize([("pool", native, summary(60, 55/3))], ref)["panels"]["pool"]
        gain = result["completionYards"]
        self.assertAlmostEqual(gain["standardizedNative"], 20)
        self.assertAlmostEqual(gain["standardizedNFL"], 9.5)
        self.assertAlmostEqual(gain["rawIncludedNative"], 55/3)
        self.assertAlmostEqual(result["completion"]["standardizedNative"], 0.65)
        self.assertAlmostEqual(result["completion"]["standardizedNFL"], 0.55)
        self.assertEqual([c["weight"] for c in gain["matchedCells"]], [0.25, 0.75])

    def test_thin_unknown_and_empty_support_remain_excluded(self):
        native = [cell("short", summary(19, 5)), cell("long", summary(20, 5)),
                  cell("unknown", summary(20, 5))]
        ref = {"pooled": summary(299, 8), "conditionalCells": [
            cell("short", summary(100, 8), True), cell("long", summary(99, 8), True),
            cell("unknown", summary(100, 8), True)]}
        result = ops.standardize([("pool", native, summary(59, 5))], ref)["panels"]["pool"]["completedYAC"]
        self.assertIsNone(result["standardizedNative"])
        self.assertEqual(result["nativeMatchedKnown"], 0)
        self.assertEqual(result["excludedNativeKnownByFirstReason"],
                         {"nativeTooThin": 19, "nflTooThin": 20, "unknownContext": 20})


if __name__ == "__main__":
    unittest.main()
