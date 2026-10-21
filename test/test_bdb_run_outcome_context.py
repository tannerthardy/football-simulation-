"""Protect operator, modifier, missingness and source-pin semantics."""
import importlib.util
import csv
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/data/bdb_run_outcome_context.py"
spec = importlib.util.spec_from_file_location("bdb_run_context", SCRIPT)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def row(**overrides):
    result = {"gameId": "2022090800", "playId": "56", "playNullifiedByPenalty": "N", "isDropback": "FALSE",
              "qbKneel": "0", "qbSpike": "FALSE", "qbSneak": "FALSE", "rushLocationType": "INSIDE_LEFT",
              "pff_runConceptPrimary": "INSIDE ZONE", "pff_runConceptSecondary": "NA", "yardsGained": "4",
              "prePenaltyYardsGained": "4", "penaltyYards": "NA", "down": "1", "yardsToGo": "10",
              "possessionTeam": "BUF", "defensiveTeam": "LA", "yardlineSide": "BUF", "yardlineNumber": "21",
              "_runnerPosition": "RB"}
    result.update(overrides)
    return result


class RunContextTest(unittest.TestCase):
    def test_dropback_kneel_spike_missing_gain_and_nullification_exclusions(self):
        self.assertIsNone(audit.selection_reason(row()))
        for changes, reason in [({"isDropback": "TRUE"}, "dropbackOrUnknownDropback"),
                                ({"isDropback": "NA"}, "dropbackOrUnknownDropback"),
                                ({"qbKneel": "1"}, "kneel"), ({"qbSpike": "TRUE"}, "spike"),
                                ({"yardsGained": "NaN"}, "missingMainYards"),
                                ({"rushLocationType": "NA"}, "missingRunLocation"),
                                ({"playNullifiedByPenalty": "NA"}, "nullifiedOrUnknownNullification")]:
            self.assertEqual(audit.selection_reason(row(**changes)), reason)

    def test_sneaks_and_qb_runs_are_distinct_without_changing_primary(self):
        self.assertFalse(audit.is_sneak(row(_runnerPosition="QB")))
        self.assertTrue(audit.is_sneak(row(qbSneak="TRUE")))
        self.assertTrue(audit.is_sneak(row(pff_runConceptPrimary="SNEAK")))
        self.assertEqual(audit.primary_label(row(pff_runConceptPrimary="MAN")), "MAN")
        self.assertEqual(audit.primary_label(row(pff_runConceptPrimary="OUTSIDE ZONE")), "OUTSIDE ZONE")

    def test_secondary_compounds_preserve_raw_values_and_missing(self):
        sample = row(pff_runConceptSecondary="READ OPTION;SPLIT;SPLIT")
        self.assertEqual(audit.secondary_value(sample), "READ OPTION;SPLIT;SPLIT")
        self.assertEqual(audit.secondary_tokens(sample), ["READ OPTION", "SPLIT"])
        self.assertEqual(audit.secondary_tokens(row()), [])
        self.assertEqual(audit.secondary_value(row(pff_runConceptSecondary="")), "<missing>")

    def test_success_40_60_100_is_separate_from_conversion_and_missing(self):
        samples = [row(), row(down="2", yardsGained="6"), row(down="3", yardsGained="9"),
                   row(down="4", yardsGained="10"), row(down="NA", yardsGained="10"),
                   row(yardsToGo="0", yardsGained="10")]
        result = audit.outcome_summary(samples, "yardsGained")
        self.assertEqual(result["gainThresholdSuccess"], audit.rate(3, 4))
        self.assertEqual(result["conversion"], audit.rate(2, 5))
        self.assertEqual(result["tenPlus"], audit.rate(3, 6))

    def test_operator_missingness_penalty_and_signed_yards_not_imputed(self):
        samples = [row(yardsGained="-2", prePenaltyYardsGained="8", penaltyYards="-10"),
                   row(yardsGained="0", prePenaltyYardsGained="NA", penaltyYards="0"), row()]
        result = audit.aggregate(samples)
        self.assertEqual(result["yardsGained"]["stuff"], audit.rate(2, 3))
        self.assertEqual(result["yardsGained"]["negative"], audit.rate(1, 3))
        self.assertEqual(result["yardsGained"]["zero"], audit.rate(1, 3))
        self.assertEqual(result["prePenaltyYardsGained"]["known"], 2)
        self.assertEqual(result["prePenaltyYardsGained"]["missing"], 1)
        self.assertEqual(result["yardOperatorComparison"]["different"], 1)
        self.assertEqual(result["penaltyYardsField"], {"missing": 1, "zero": 1, "nonzero": 1})

    def test_field_direction_unknown_and_third_long(self):
        self.assertEqual(audit.context(row())["field"], "own51to100")
        self.assertEqual(audit.context(row(yardlineSide="LA", yardlineNumber="20"))["field"], "redZone0to20")
        self.assertEqual(audit.context(row(yardlineSide="NA", yardlineNumber="50"))["field"], "plus21to50")
        self.assertEqual(audit.context(row(yardlineSide="NA"))["field"], "unknown")
        third_long = row(down="3", yardsToGo="27", yardsGained="12")
        self.assertEqual(audit.context(third_long)["distance"], "20plus")
        self.assertEqual(audit.outcome_summary([third_long], "yardsGained")["conversion"], audit.rate(0, 1))

    def test_pin_verification_rejects_changed_input(self):
        with tempfile.TemporaryDirectory() as location:
            directory = Path(location)
            source = directory / "plays.csv"
            source.write_text("gameId,playId\n1,2\n")
            pin = {"plays.csv": {"bytes": source.stat().st_size, "sha256": audit.sha256(source)}}
            self.assertEqual(len(audit.verify_inputs(directory, pin)), 1)
            source.write_text("gameId,playId\n1,3\n")
            with self.assertRaises(ValueError):
                audit.verify_inputs(directory, pin)

    def test_frozen_query_and_exact_join_keys_are_checked(self):
        plan = audit.receipt()
        audit.verify_receipt(plan)
        plan["querySha256"] = "changed"
        with self.assertRaises(ValueError):
            audit.verify_receipt(plan)
        self.assertEqual(audit.play_key(row()), ("2022090800", "56"))
        with self.assertRaises(ValueError):
            audit.play_key(row(playId="56.5"))

    def test_collection_keeps_unknown_rusher_and_overlapping_tokens(self):
        with tempfile.TemporaryDirectory() as location:
            directory = Path(location)
            plays = [row(pff_runConceptSecondary="READ OPTION;SPLIT"),
                     row(playId="57", qbSneak="TRUE", pff_runConceptPrimary="SNEAK")]
            data = {"plays.csv": plays,
                    "players.csv": [{"nflId": "1", "position": "QB"}],
                    "player_play.csv": [{"gameId": "2022090800", "playId": "56", "nflId": "1", "hadRushAttempt": "1"}]}
            for name, samples in data.items():
                with (directory / name).open("w", newline="") as stream:
                    writer = csv.DictWriter(stream, fieldnames=list(samples[0]))
                    writer.writeheader()
                    writer.writerows(samples)
            with patch.object(audit, "verify_inputs", return_value=[]):
                report = audit.collect(directory)
            self.assertEqual(report["allRuns"]["plays"], 2)
            self.assertEqual(report["ordinaryRuns"]["plays"], 1)
            self.assertEqual(report["qbSneaks"]["plays"], 1)
            self.assertEqual(report["allRuns"]["runnerPositions"], {"<missing_rusher>": 1, "QB": 1})
            self.assertEqual(report["bySecondaryTokenOverlapping"]["SPLIT"]["plays"], 1)
            self.assertEqual(report["bySecondaryTokenOverlapping"]["READ OPTION"]["plays"], 1)
            self.assertIsNone(report["fieldAvailability"]["boxCountField"])
            self.assertEqual(report["byRecordedBoxCount"], {})
            self.assertEqual(report["cellSupport"]["primaryAndContext"]["cellsWithN1to4"], 2)


if __name__ == "__main__":
    unittest.main()
