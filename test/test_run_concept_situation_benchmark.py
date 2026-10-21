"""Synthetic operator, joins and cluster tests; no licensed rows are embedded."""
import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("run_concepts", Path(__file__).parents[1] / "scripts/data/run_concept_situation_benchmark.py")
R = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(R)


def row(gain=4, needed=10, down=1, goal=60, game="g", lost=False, pre=None):
    return {"gameId": game, "possessionTeam": "OFF", "yardsGained": str(gain), "prePenaltyYardsGained": str(gain if pre is None else pre), "down": str(down), "yardsToGo": str(needed), "expectedPointsAdded": "0.1", "penaltyYards": "NA", "_goal": goal, "_annotation": {"offenseLostFumble": lost, "carrierId": "1"}}


def offense_rows(flag="FALSE"):
    positions = {str(i): p for i, p in enumerate(["QB", "RB", "TE", "WR", "WR", "WR", "C", "G", "G", "T", "T"])}
    rows = [{"nflId": ident, "inMotionAtBallSnap": flag, "motionSinceLineset": flag, "shiftSinceLineset": flag, "fumbleLost": "0"} for ident in positions]
    return rows, positions


class RushingConceptTest(unittest.TestCase):
    def test_success_thresholds_are_down_specific_and_conversion_is_distinct(self):
        cases = [row(4, 10, 1), row(5, 10, 2), row(6, 10, 2), row(9, 10, 3), row(10, 10, 4), row(50, "NA", 1)]
        out = R.outcome_summary(cases, "yardsGained")
        self.assertEqual(out["rates"]["success4060100"], {"count": 3, "denominator": 5, "percent": 60})
        self.assertEqual(out["rates"]["gainDistanceConversion"]["count"], 1)
        self.assertEqual(out["rates"]["gainDistanceConversion"]["denominator"], 5)
        self.assertEqual(out["yards"]["n"], 6)

    def test_field_eligible_tails_keep_short_tds_out_of_only_eligible_denominator(self):
        cases = [row(5, 5, 1, 5), row(20, 10, 1, 20), row(30, 10, 1, 60), row(15, 10, 1, None)]
        out = R.outcome_summary(cases, "yardsGained")
        self.assertEqual(out["rates"]["explosive20plus"]["denominator"], 4)
        self.assertEqual(out["rates"]["explosive20plus"]["count"], 2)
        self.assertEqual(out["rates"]["fieldEligibleExplosive20plus"], {"count": 2, "denominator": 2, "percent": 100})
        self.assertEqual(out["rates"]["fieldEligibleExplosive30plus"]["denominator"], 1)
        self.assertEqual(out["rates"]["fieldEligibleExplosive40plus"]["count"], 0)

    def test_missing_and_zero_are_not_collapsed(self):
        cases = [row(-1), row(0), row(2), row("NA")]
        out = R.outcome_summary(cases, "yardsGained")
        self.assertEqual(out["yards"]["missing"], 1)
        self.assertEqual(out["rates"]["stuff"], {"count": 2, "denominator": 3, "percent": 66.666667})
        self.assertEqual(out["rates"]["negative"]["count"], 1)
        self.assertEqual(out["rates"]["zero"]["count"], 1)
        empty = R.outcome_summary([], "yardsGained")
        self.assertIsNone(empty["rates"]["stuff"]["percent"])
        self.assertIsNone(empty["yards"]["mean"])
        self.assertEqual(sum(out["gainBins"].values()), out["yards"]["n"])

    def test_main_pre_penalty_and_lost_fumble_remain_separate(self):
        cases = [row(10, pre=2, lost=True), row(4, pre="NA", lost=False), row(4, lost=None)]
        out = R.aggregate(cases)
        self.assertEqual(out["operatorSensitivity"]["bothKnown"], 2)
        self.assertEqual(out["operatorSensitivity"]["different"], 1)
        self.assertEqual(out["main"]["rates"]["success4060100"]["count"], 3)
        self.assertEqual(out["main"]["rates"]["successWithoutLostFumble"], {"count": 1, "denominator": 2, "percent": 50})
        self.assertEqual(out["prePenalty"]["yards"]["missing"], 1)
        self.assertEqual(out["penaltyField"]["missing"], 3)

    def test_quantiles_are_interpolated_pooled_values(self):
        self.assertEqual(R.quantile([0, 10], .9), 9)
        self.assertEqual(R.quantile([10, -1, 0], .5), 0)
        self.assertIsNone(R.quantile([], .5))

    def test_field_geometry_and_score_resolve_only_explicit_team_identity(self):
        base = {"yardlineNumber": "20", "yardlineSide": "OFF", "possessionTeam": "OFF", "defensiveTeam": "DEF", "down": "1", "yardsToGo": "10", "quarter": "4", "gameClock": "02:00", "preSnapHomeScore": "10", "preSnapVisitorScore": "17"}
        context = R.contexts(base, {"homeTeamAbbr": "OFF", "visitorTeamAbbr": "DEF"})
        self.assertEqual(R.distance_to_goal(base), 80)
        self.assertEqual(context["score"], "trailing1to8")
        self.assertEqual(context["clock"], "final0to120")
        self.assertEqual(context["field"], "own51to80")
        self.assertEqual(R.contexts(base, {"homeTeamAbbr": "DEF", "visitorTeamAbbr": "OFF"})["score"], "leading1to8")
        self.assertEqual(R.contexts(base, {})["score"], "unknown")
        self.assertIsNone(R.distance_to_goal(dict(base, yardlineSide="UNKNOWN")))
        self.assertEqual(R.distance_to_goal(dict(base, yardlineSide="UNKNOWN", yardlineNumber="50")), 50)
        self.assertEqual(R.distance_to_goal(dict(base, yardlineSide="DEF")), 20)

    def test_overtime_and_invalid_clock_do_not_become_late_regulation(self):
        self.assertEqual(R.clock_seconds("15:00"), 900)
        self.assertIsNone(R.clock_seconds("15:01"))
        self.assertIsNone(R.clock_seconds("12:60"))
        self.assertEqual(R.contexts({"quarter": "5", "gameClock": "05:00"}, {})["clock"], "overtime")
        self.assertEqual(R.contexts({"quarter": "4", "gameClock": "NA"}, {})["clock"], "unknown")

    def test_motion_negative_requires_all_11_known_no_motion(self):
        offense, positions = offense_rows()
        out = R.player_annotation(offense, [offense[1]], positions)
        self.assertEqual(out["motion"]["inMotionAtBallSnap"]["class"], "negativeAll11Known")
        self.assertEqual(out["carrierGroup"], "RB_FB")
        self.assertEqual(out["listedPersonnel"], "QB=1|RB=1|FB=0|TE=1|WR=3|OL=5|other=0")
        offense[10]["inMotionAtBallSnap"] = "NA"
        self.assertEqual(R.player_annotation(offense, [offense[1]], positions)["motion"]["inMotionAtBallSnap"]["class"], "unknownOrIncomplete")
        offense[1]["inMotionAtBallSnap"] = "TRUE"
        self.assertEqual(R.player_annotation(offense, [offense[1]], positions)["motion"]["inMotionAtBallSnap"]["class"], "positive")
        self.assertEqual(R.player_annotation(offense[:-1], [offense[1]], positions)["listedPersonnel"], "unknownOrIncomplete")

    def test_ambiguous_carrier_and_missing_positions_stay_explicit(self):
        offense, positions = offense_rows()
        self.assertEqual(R.player_annotation(offense, [], positions)["carrierPosition"], "missingRusher")
        self.assertEqual(R.player_annotation(offense, offense[:2], positions)["carrierPosition"], "multipleRushers")
        positions.pop(offense[1]["nflId"])
        out = R.player_annotation(offense, [offense[1]], positions)
        self.assertEqual(out["carrierPosition"], "missingPosition")
        self.assertFalse(out["offenseRowsComplete"])
        self.assertIsNone(out["offenseLostFumble"])

    def test_secondary_tokens_overlap_without_inventing_duo(self):
        self.assertEqual(R.BASE.secondary_tokens({"pff_runConceptSecondary": "SPLIT;READ OPTION;SPLIT"}), ["READ OPTION", "SPLIT"])
        self.assertEqual(R.primary({"pff_runConceptPrimary": "MAN"}), "MAN")
        self.assertEqual(R.BASE.secondary_tokens({"pff_runConceptSecondary": "NA"}), [])

    def test_bootstrap_is_deterministic_and_uses_same_draws_for_equal_groups(self):
        samples = [row(gain=game % 8, game=str(game)) for game in range(20) for _ in range(5)]
        grouped = {"A": samples, "B": list(samples), "thin": samples[:5]}
        a = R.game_cluster_bootstrap(grouped, {str(i) for i in range(20)}, iterations=40)
        b = R.game_cluster_bootstrap(grouped, {str(i) for i in range(20)}, iterations=40)
        self.assertEqual(a, b)
        self.assertEqual(a["byOrdinaryExactPrimary"]["A"]["intervals"], a["byOrdinaryExactPrimary"]["B"]["intervals"])
        self.assertFalse(a["byOrdinaryExactPrimary"]["thin"]["eligible"])
        self.assertEqual(a["byOrdinaryExactPrimary"]["thin"]["intervals"], {})
        self.assertEqual(a["byOrdinaryExactPrimary"]["A"]["intervals"]["stuff"]["validDraws"], 40)

    def test_cluster_support_requires_games_not_just_plays(self):
        samples = [row(game="g") for _ in range(100)]
        out = R.game_cluster_bootstrap({"oneGame": samples}, {"g"}, iterations=20)
        self.assertFalse(out["byOrdinaryExactPrimary"]["oneGame"]["eligible"])
        self.assertEqual(R.aggregate(samples)["exposure"]["largestGameShare"], 1)

    def test_neutral_witness_matches_8to10_definition_and_requires_known_context(self):
        sample = {"yardsToGo": "10", "_goal": 60, "_annotation": {"carrierGroup": "RB_FB"}, "_context": {"down": "2", "score": "leading1to8", "clock": "secondHalf601to1800"}}
        self.assertTrue(R.neutral_early_back(sample))
        for needed in ("7", "11", "NA"):
            self.assertFalse(R.neutral_early_back(dict(sample, yardsToGo=needed)))
        self.assertFalse(R.neutral_early_back(dict(sample, _goal=20)))
        self.assertFalse(R.neutral_early_back(dict(sample, _annotation={"carrierGroup": "QB"})))
        for field, value in (("down", "3"), ("score", "leading9plus"), ("clock", "late121to600"), ("clock", "overtime")):
            self.assertFalse(R.neutral_early_back(dict(sample, _context=dict(sample["_context"], **{field: value}))))


if __name__ == "__main__":
    unittest.main()
