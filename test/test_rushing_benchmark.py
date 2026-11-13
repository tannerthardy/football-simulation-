"""Protect rushing operators, source identity, clustered uncertainty and fallback."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("rushing_benchmark", Path(__file__).parents[1] / "scripts/data/rushing_benchmark.py")
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


def run(**changes):
    row = dict(season="2022", season_type="REG", play_type="run", game_id="g1", play_id="1", posteam="A", defteam="B",
               qb_dropback="0", qb_scramble="0", qb_kneel="0", qb_spike="0", two_point_attempt="0", pass_attempt="0", rush_attempt="1",
               penalty="0", yards_gained="4", rushing_yards="4", down="1", ydstogo="10", yardline_100="60", fumble_lost="0",
               first_down_rush="0", rush_touchdown="0", epa="-0.2", rusher_player_id="back", qtr="1", game_seconds_remaining="3300",
               score_differential="0", shotgun="1", no_huddle="0", goal_to_go="0", run_location="left", run_gap="guard")
    return dict(row, **changes)


class RushingBenchmarkTests(unittest.TestCase):
    def test_missing_and_zero_yards_not_the_same(self):
        aggregate = benchmark.Aggregate()
        for gain in ("", "nan", "inf", "0", "-1"):
            aggregate.add(run(yards_gained=gain))
        result = aggregate.result()
        self.assertEqual(result["counts"]["observedRuns"], 5)
        self.assertEqual(result["counts"]["missingGain"], 3)
        self.assertEqual(result["rates"]["zero"], dict(count=1, denominator=2, percent=50))
        self.assertEqual(result["rates"]["stuff"]["count"], 2)
        self.assertEqual(result["rates"]["negative"]["count"], 1)

    def test_penalty_missing_true_false_separated(self):
        aggregate = benchmark.Aggregate()
        for flag in ("1", "", "0"):
            aggregate.add(run(penalty=flag))
        result = aggregate.result()
        self.assertEqual(result["yards"]["n"], 1)
        for field in ("penaltyFlagTrue", "penaltyFlagFalse", "penaltyFlagMissing"):
            self.assertEqual(result["counts"][field], 1)

    def test_all_gain_bins_partition_and_tail_inclusivity(self):
        values = (-1, 0, 3, 4, 6, 7, 9, 10, 14, 15, 19, 20, 29, 30, 39, 40)
        aggregate = benchmark.Aggregate()
        for gain in values:
            aggregate.add(run(yards_gained=str(gain)))
        result = aggregate.result()
        self.assertEqual(sum(value for key, value in result["counts"].items() if key.startswith("gainBin_")), len(values))
        for threshold in benchmark.THRESHOLDS:
            self.assertEqual(result["rates"][f"explosive{threshold}plus"]["count"], sum(gain >= threshold for gain in values))

    def test_chosen_success_4560_sensitivity_turnover_and_conversion(self):
        aggregate = benchmark.Aggregate()
        aggregate.add(run(yards_gained="4"))
        aggregate.add(run(down="2", yards_gained="5"))
        aggregate.add(run(down="3", yards_gained="10", fumble_lost="1", first_down_rush="1"))
        rates = aggregate.result()["rates"]
        self.assertEqual(rates["success4060100"]["count"], 2)
        self.assertEqual(rates["success4560100"]["count"], 1)
        self.assertEqual(rates["successWithoutLostFumble"]["count"], 1)
        self.assertEqual(rates["gainDistanceConversion"]["count"], 1)
        self.assertEqual(rates["gainDistanceWithoutLostFumble"]["count"], 0)
        self.assertEqual(rates["recordedFirstOrTD"]["count"], 1)
        self.assertEqual(rates["positiveEPA"]["count"], 0)

    def test_missing_per_metric_denominators_do_not_become_failure(self):
        aggregate = benchmark.Aggregate()
        aggregate.add(run(ydstogo="", fumble_lost="", epa="", first_down_rush="", rush_touchdown=""))
        rates = aggregate.result()["rates"]
        for metric in ("success4060100", "success4560100", "successWithoutLostFumble", "recordedFirstOrTD", "positiveEPA", "fumbleLost", "goalCensoredTD"):
            self.assertEqual(rates[metric]["denominator"], 0)
            self.assertIsNone(rates[metric]["percent"])

    def test_field_tail_eligibility_and_goal_censor_are_distinct(self):
        aggregate = benchmark.Aggregate()
        aggregate.add(run(yardline_100="5", yards_gained="5", rush_touchdown="1"))
        aggregate.add(run(yardline_100="20", yards_gained="20", rush_touchdown="1"))
        aggregate.add(run(yardline_100="", yards_gained="0"))
        result = aggregate.result()
        self.assertEqual(result["rates"]["explosive20plus"]["denominator"], 3)
        self.assertEqual(result["rates"]["fieldEligibleExplosive20plus"], dict(count=1, denominator=1, percent=100))
        self.assertEqual(result["counts"]["fieldIneligible20"], 1)
        self.assertEqual(result["counts"]["fieldMissingOrInvalid"], 1)
        self.assertEqual(result["rates"]["goalCensoredTD"]["count"], 2)
        self.assertEqual(result["rates"]["goalCensoredTD"]["denominator"], 2)

    def test_whole_play_gain_is_not_individual_rushing_yards(self):
        aggregate = benchmark.Aggregate()
        aggregate.add(run(yards_gained="4", rushing_yards="10"))
        self.assertEqual(aggregate.result()["yards"]["mean"], 4)
        self.assertEqual(aggregate.result()["counts"]["wholeVsIndividualGainDifferent"], 1)

    def test_scramble_and_live_population_remain_exact(self):
        self.assertEqual(benchmark.operators.run_kind(run()), "designedRun")
        self.assertEqual(benchmark.operators.run_kind(run(qb_dropback="1", qb_scramble="1")), "scramble")
        self.assertIsNone(benchmark.operators.run_kind(run(qb_dropback="1", qb_scramble="1", rush_attempt="0")))
        for changes in (dict(season_type="POST"), dict(qb_kneel="1"), dict(two_point_attempt="1"), dict(play_type="no_play")):
            self.assertIsNone(benchmark.operators.run_kind(run(**changes)))

    def test_context_boundaries_and_missing_information(self):
        contexts = [benchmark.context(run(ydstogo=str(d)), "RB_FB")["distance"] for d in (1, 2, 3, 4, 6, 7, 10, 11, 19, 20)]
        self.assertEqual(contexts, ["1", "2to3", "2to3", "4to6", "4to6", "7to10", "7to10", "11to19", "11to19", "20plus"])
        self.assertEqual(benchmark.context(run(yardline_100="5"), "RB_FB")["field"], "goalLine1to5")
        self.assertEqual(benchmark.context(run(qtr="5", game_seconds_remaining="-10"), "QB")["clock"], "overtime")
        self.assertEqual(benchmark.context(run(game_seconds_remaining="120"), "RB_FB")["clock"], "final2min")
        self.assertEqual(benchmark.context(run(shotgun="", score_differential="", yardline_100="0"), "unknown")["shotgun"], "unknown")
        self.assertEqual(benchmark.context(run(yardline_100="0"), "RB_FB")["field"], "unknown")

    def test_chart_absence_zero_and_missing_not_false_lightbox(self):
        self.assertEqual(benchmark.chart_context(None)["motion"], "unavailable")
        self.assertEqual(benchmark.chart_context(dict(n_defense_box="0"))["box"], "zeroUnverified")
        self.assertEqual(benchmark.chart_context(dict(n_defense_box="5"))["box"], "5orFewer")
        self.assertEqual(benchmark.chart_context(dict(is_motion=""))["motion"], "unknown")
        self.assertEqual(benchmark.chart_context(dict(is_qb_sneak="0"))["sneak"], "false")

    def test_roster_conflict_and_missing_no_name_guess(self):
        positions = benchmark.operators.roster_positions([dict(gsis_id="x", position="RB"), dict(gsis_id="x", position="WR"), dict(gsis_id="back", position="FB")])
        self.assertEqual(benchmark.operators.carrier_group(run(), positions), "RB_FB")
        self.assertEqual(benchmark.operators.carrier_group(run(rusher_player_id="x"), positions), "unknown")
        self.assertEqual(benchmark.operators.carrier_group(run(rusher_player_id="absent"), positions), "unknown")

    def test_game_cluster_draws_deterministic_stratified_and_shared(self):
        games = {2022: {"a", "b"}, 2023: {"c", "d", "e"}}
        first = benchmark.cluster_draws(games, 20, 7)
        self.assertEqual(first, benchmark.cluster_draws(games, 20, 7))
        self.assertNotEqual(first, benchmark.cluster_draws(games, 20, 8))
        for draw in first:
            self.assertEqual(sum(draw[game] for game in games[2022]), 2)
            self.assertEqual(sum(draw[game] for game in games[2023]), 3)

    def test_bootstrap_samples_whole_game_and_both_teams(self):
        aggregate = benchmark.Aggregate()
        for _ in range(2):
            aggregate.add(run(game_id="a", posteam="A", yards_gained="0"))
            aggregate.add(run(game_id="a", posteam="B", yards_gained="10"))
        for _ in range(2):
            aggregate.add(run(game_id="b", yards_gained="20"))
        estimate = benchmark.bootstrap(aggregate, [dict(a=2), dict(b=2)], 1, 1)
        # Doubling one game duplicates both offenses, yielding5yd rather than
        # independently resampling its opposing-team0yd and10yd plays.
        ci = estimate["metrics"]["meanYards"]
        self.assertEqual(ci["validReplicates"], 2)
        self.assertAlmostEqual(ci["lower"], 5.375)
        self.assertAlmostEqual(ci["upper"], 19.625)

    def test_bootstrap_suppresses_thin_game_exposure_and_missing_metric(self):
        aggregate = benchmark.Aggregate()
        for _ in range(200):
            aggregate.add(run(epa=""))
        self.assertEqual(benchmark.bootstrap(aggregate, [dict(g1=1)])["status"], "insufficientExposure")
        result = benchmark.bootstrap(aggregate, [dict(g1=1)], 1, 1)
        self.assertEqual(result["metrics"]["positiveEPA"]["validReplicates"], 0)
        self.assertEqual(result["metrics"]["positiveEPA"]["eventSupport"], "unavailable")

    def test_zero_event_bootstrap_not_a_zero_risk_claim(self):
        aggregate = benchmark.Aggregate()
        aggregate.add(run())
        result = benchmark.bootstrap(aggregate, [dict(g1=1)], 1, 1)
        self.assertEqual(result["metrics"]["fumbleLost"]["lower"], 0)
        self.assertEqual(result["metrics"]["fumbleLost"]["upper"], 0)
        self.assertEqual(result["metrics"]["fumbleLost"]["eventSupport"], "zeroObservedNotZeroRisk")

    def test_tail_yard_contribution_separate_from_event_rate(self):
        aggregate = benchmark.Aggregate()
        for gain in (-2, 2, 10, 30):
            aggregate.add(run(yards_gained=str(gain)))
        result = aggregate.result()
        self.assertEqual(result["rates"]["explosive20plus"]["percent"], 25)
        self.assertEqual(result["tailYardContribution"]["netGain"], 40)
        self.assertEqual(result["tailYardContribution"]["positiveGain"], 42)
        self.assertEqual(result["tailYardContribution"]["thresholds"]["20plus"]["percentOfNetGain"], 75)
        self.assertEqual(result["tailYardContribution"]["thresholds"]["20plus"]["excessBeyondThreshold"], 10)
        self.assertEqual(result["yards"]["cappedMean10"], 5)
        self.assertEqual(result["yards"]["cappedMean20"], 7.5)

    def test_each_bootstrap_metric_requires_its_own_known_exposure(self):
        aggregate = benchmark.Aggregate()
        for game in range(20):
            for play in range(10):
                aggregate.add(run(game_id=f"g{game}", epa="1" if game == play == 0 else "", yardline_100="50" if game == 0 else "5"))
        result = benchmark.bootstrap(aggregate, [{f"g{game}": 1 for game in range(20)}])
        self.assertEqual(result["status"], "descriptiveGameCluster95Percentile")
        self.assertEqual(result["metrics"]["stuff"]["status"], "supported")
        for metric in ("positiveEPA", "fieldEligibleExplosive20plus"):
            self.assertEqual(result["metrics"][metric]["status"], "insufficientMetricExposure")
            self.assertEqual(result["metrics"][metric]["observedKnownMetricGames"], 1)
            self.assertIsNone(result["metrics"][metric]["lower"])
            self.assertEqual(result["metrics"][metric]["validReplicates"], 0)

    def test_sparse_lookup_reports_dropped_dimensions_without_averaging(self):
        desired = dict(kind="designedRun", carrier="RB_FB", down=1, distance="7to10", field="own51to89")
        exact, broad = benchmark.Aggregate(), benchmark.Aggregate()
        exact.add(run(yards_gained="70"))
        for i in range(20):
            broad.add(run(game_id=f"g{i}", yards_gained="4"))
        groups = {(benchmark.CELL_FIELDS, tuple(desired[key] for key in benchmark.CELL_FIELDS)): exact,
                  (benchmark.CELL_FIELDS[:3], tuple(desired[key] for key in benchmark.CELL_FIELDS[:3])): broad}
        result = benchmark.supported_fallback(groups, desired, 20, 20)
        self.assertEqual(result["discardedDimensions"], ["field", "distance"])
        self.assertEqual(result["counts"]["gains"], 20)
        self.assertEqual(benchmark.supported_fallback(groups, desired, 100, 20)["status"], "unavailable")

    def test_common_support_means_rates_and_excluded_mass(self):
        left, right, unsupported = benchmark.Aggregate(), benchmark.Aggregate(), benchmark.Aggregate()
        for _ in range(30):
            left.add(run(yards_gained="0"))
            right.add(run(yards_gained="10"))
        unsupported.add(run(yards_gained="80"))
        result = benchmark.standardized_pairs({("x",): {"a": left, "b": right}, ("y",): {"a": unsupported}}, ("context",), "a", "b", 30)
        self.assertEqual(result["meanYards"]["groups"]["a"]["standardizedValue"], 0)
        self.assertEqual(result["meanYards"]["groups"]["a"]["allCleanGains"], 31)
        self.assertEqual(result["meanYards"]["groups"]["a"]["retainedMetricDenominator"], 30)
        self.assertEqual(result["stuff"]["groups"]["b"]["standardizedValue"], 0)
        self.assertEqual(result["meanYards"]["retainedCells"], 1)

    def test_pooled_quantiles_interpolate_and_empty_is_unknown(self):
        self.assertEqual(benchmark.operators.distribution([0, 1, 2, 10])["p50"], 1.5)
        self.assertIsNone(benchmark.operators.distribution([])["p99"])

    def test_changed_source_pin_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            entries = []
            for name in ("play_by_play_2022.csv.gz", "roster_2022.csv"):
                path = folder / name
                path.write_bytes(b"frozen")
                entries.append(dict(name=name, bytes=6, sha256=benchmark.sha256(path)))
            manifest = folder / "manifest.json"
            manifest.write_text(json.dumps(dict(files=entries)))
            inputs, _ = benchmark.verify_inputs([folder], [manifest], [2022])
            self.assertIsNone(inputs[2022]["chart"])
            (folder / "roster_2022.csv").write_bytes(b"edited")
            with self.assertRaises(ValueError):
                benchmark.verify_inputs([folder], [manifest], [2022])

    def test_duplicate_source_filename_rejected_even_identical(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            path = folder / "roster_2022.csv"
            path.write_bytes(b"frozen")
            manifest = folder / "manifest.json"
            manifest.write_text(json.dumps(dict(files=[dict(name=path.name, bytes=6, sha256=benchmark.sha256(path))])))
            with self.assertRaises(ValueError):
                benchmark.verify_inputs([folder, folder], [manifest, manifest], [2022])


if __name__ == "__main__":
    unittest.main()
