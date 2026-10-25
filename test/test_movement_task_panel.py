"""Keep paired movement-panel denominators honest without requiring raw NFL data."""
import importlib.util
from pathlib import Path
import sys
import unittest

directory = Path(__file__).parents[1] / "scripts/data"
sys.path.insert(0, str(directory))
spec = importlib.util.spec_from_file_location("task_report", directory / "movement_task_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def panel():
    points = [[k / 10, k / 5, 0, 2, 0] for k in range(21)]
    fixture = {"event": "one", "athlete": "one", "drill": "SHORT_SHUTTLE",
               "split": "holdout2025", "group": "DB", "draftYear": 2025, "points": points}
    fixtures = {"fixtures": [fixture], "audit": {}}
    trials = [{**{k: v for k, v in fixture.items() if k != "points"}, "frames": points,
               "mode": mode, "responseSeconds": response, "fallen": False,
               "completeAgility": True, "contactUnknown": False, "missingMeasurements": [],
               "rmseYd": 0, "maxErrorYd": 0, "maxGroundFraction": .5, "workResidual": 0}
              for mode in ("footballMapping", "sprintFit") for response in (.15, .4)]
    return fixtures, {"trials": trials, "sourceSha256": "test", "inputs": {},
                      "inputSha256": "test", "selection": "test", "note": "test",
                      "fixtureExtractorSha256": "test", "runnerSha256": "test"}


class MovementPanelAuditTests(unittest.TestCase):
    def test_failed_simulated_measurement_stays_in_error_and_fall_denominators(self):
        fixtures, trials = panel()
        trial = trials["trials"][0]
        trial.update(frames=trial["frames"][:2], fallen=True, rmseYd=8)
        result = module.build_report(fixtures, trials)
        group = "holdout2025/DB/SHORT_SHUTTLE/footballMapping/response0.15"
        errors = result["trackingErrors"][group]
        self.assertEqual(result["eligibleTrialCount"], 4)
        self.assertEqual(errors["fallen"], 1)
        self.assertEqual(errors["simulatedMeasurementsRejected"], 1)
        self.assertEqual(errors["rmseYd"]["p50"], 8)
        self.assertNotIn(group, result["measuredPaths"])

    def test_ineligible_reference_excludes_all_four_paired_trials(self):
        fixtures, trials = panel()
        fixtures["fixtures"][0]["points"] = fixtures["fixtures"][0]["points"][:2]
        result = module.build_report(fixtures, trials)
        self.assertEqual(result["eligibleTrialCount"], 0)
        self.assertEqual(result["measurementAudit"]["trialsWithoutEligibleReference"], 4)
        self.assertEqual(result["measuredPaths"], {})

    def test_missing_pair_or_wrong_split_is_rejected(self):
        fixtures, trials = panel()
        trials["trials"].pop()
        with self.assertRaisesRegex(ValueError, "must stay paired"):
            module.build_report(fixtures, trials)
        fixtures, trials = panel()
        trials["trials"][0]["split"] = "development2023_2024"
        with self.assertRaisesRegex(ValueError, "differently labelled"):
            module.build_report(fixtures, trials)


if __name__ == "__main__":
    unittest.main()
