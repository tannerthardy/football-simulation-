"""Protect distinct run populations, conditional denominators and source pins."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("run_outcome_context", Path(__file__).parents[1] / "scripts/data/run_outcome_context.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def run(**changes):
    row = dict(season="2022", season_type="REG", play_type="run", game_id="g", play_id="1",
               qb_dropback="0", qb_scramble="0", qb_kneel="0", qb_spike="0", two_point_attempt="0",
               pass_attempt="0", rush_attempt="1", penalty="0", yards_gained="4", ydstogo="10",
               down="1", yardline_100="60", fumble_lost="0", first_down_rush="0", rush_touchdown="0",
               epa="-0.2", rusher_player_id="runner", qtr="1", game_seconds_remaining="3300",
               score_differential="0", posteam="TEAM", run_location="left", run_gap="guard")
    return dict(row, **changes)


class RunOutcomeContextTests(unittest.TestCase):
    def test_scramble_is_never_designed_and_kneels_spikes_two_point_post_no_play_excluded(self):
        self.assertEqual(audit.run_kind(run()), "designedRun")
        self.assertEqual(audit.run_kind(run(qb_dropback="1", qb_scramble="1")), "scramble")
        self.assertIsNone(audit.run_kind(run(qb_dropback="1", qb_scramble="1", rush_attempt="0")))
        for changes in (dict(qb_kneel="1"), dict(qb_spike="1"), dict(two_point_attempt="1"),
                        dict(season_type="POST"), dict(play_type="no_play")):
            self.assertIsNone(audit.run_kind(run(**changes)))

    def test_penalties_missing_flags_and_nonfinite_gains_have_separate_counts(self):
        aggregate = audit.Aggregate()
        for row in (run(), run(penalty="1"), run(penalty=""), run(yards_gained="nan")):
            aggregate.add(row)
        result = aggregate.result()
        self.assertEqual(result["counts"]["observedRuns"], 4)
        self.assertEqual(result["counts"]["penaltyFlagFalse"], 2)
        self.assertEqual(result["yards"]["n"], 1)
        self.assertEqual(result["rates"]["stuff"]["denominator"], 1)

    def test_success_distance_conversion_and_lost_fumble_are_different_measures(self):
        aggregate = audit.Aggregate()
        aggregate.add(run(yards_gained="4", down="1"))
        aggregate.add(run(yards_gained="5", down="2"))
        aggregate.add(run(yards_gained="10", down="3", fumble_lost="1", first_down_rush="1"))
        rates = aggregate.result()["rates"]
        self.assertEqual(rates["success4060100"]["count"], 2)
        self.assertEqual(rates["gainDistanceConversion"]["count"], 1)
        self.assertEqual(rates["gainDistanceWithoutLostFumble"]["count"], 0)
        self.assertEqual(rates["recordedFirstOrTD"]["count"], 1)

    def test_zero_is_stuff_but_not_negative_and_gain_bins_partition(self):
        aggregate = audit.Aggregate()
        for value in (-1, 0, 3, 4, 7, 10, 20):
            aggregate.add(run(yards_gained=str(value)))
        result = aggregate.result()
        self.assertEqual(sum(value for key, value in result["counts"].items() if key.startswith("gainBin_")), 7)
        self.assertEqual(result["rates"]["negative"]["count"], 1)
        self.assertEqual(result["rates"]["stuff"]["count"], 2)
        self.assertEqual(result["rates"]["explosive10plus"]["count"], 2)
        self.assertEqual(result["rates"]["explosive20plus"]["count"], 1)

    def test_goal_line_runs_do_not_enter_eligible_explosive_denominator(self):
        aggregate = audit.Aggregate()
        aggregate.add(run(yardline_100="5", yards_gained="5", rush_touchdown="1"))
        aggregate.add(run(yardline_100="20", yards_gained="20", rush_touchdown="1"))
        aggregate.add(run(yardline_100="", yards_gained="0"))
        result = aggregate.result()
        self.assertEqual(result["rates"]["explosive20plus"]["denominator"], 3)
        self.assertEqual(result["rates"]["fieldEligibleExplosive20plus"]["denominator"], 1)
        self.assertEqual(result["rates"]["fieldEligibleExplosive20plus"]["count"], 1)

    def test_missing_success_epa_fumble_or_recorded_first_down_does_not_become_false(self):
        aggregate = audit.Aggregate()
        aggregate.add(run(ydstogo="", epa="", fumble_lost="", first_down_rush=""))
        result = aggregate.result()
        self.assertEqual(result["yards"]["n"], 1)
        for metric in ("success4060100", "positiveEPA", "fumbleLost", "recordedFirstOrTD"):
            self.assertEqual(result["rates"][metric]["denominator"], 0)
            self.assertIsNone(result["rates"][metric]["percent"])

    def test_exact_roster_identity_conflicts_and_unknowns_not_guessed(self):
        positions = audit.roster_positions([dict(gsis_id="runner", position="RB"),
                                            dict(gsis_id="qb", position="QB"),
                                            dict(gsis_id="conflict", position="RB"),
                                            dict(gsis_id="conflict", position="WR")])
        self.assertEqual(audit.carrier_group(run(), positions), "RB_FB")
        self.assertEqual(audit.carrier_group(run(rusher_player_id="qb"), positions), "QB")
        self.assertEqual(audit.carrier_group(run(rusher_player_id="conflict"), positions), "unknown")
        self.assertEqual(audit.carrier_group(run(rusher_player_id="absent"), positions), "unknown")

    def test_box_counts_are_bounded_integers_missing_not_light_box(self):
        self.assertEqual(audit.box_label(dict(n_defense_box="5")), "5orFewer")
        self.assertEqual(audit.box_label(dict(n_defense_box="8")), "8plus")
        for value in ("", "nan", "5.5", "12", "-1"):
            self.assertEqual(audit.box_label(dict(n_defense_box=value)), "unknown")
        self.assertEqual(audit.box_label(None), "unknown")

    def test_pooled_quantiles_are_not_averages_of_cell_quantiles(self):
        self.assertEqual(audit.distribution([0, 1, 2, 10])["p50"], 1.5)
        self.assertIsNone(audit.distribution([])["mean"])

    def test_changed_pinned_input_rejected_even_with_unchanged_filename(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            entries = []
            for name in audit.INPUT_NAMES:
                path = folder / name
                path.write_bytes(b"snapshot")
                entries.append(dict(name=name, bytes=8, sha256=audit.sha256(path)))
            manifest = folder / "manifest.json"
            manifest.write_text(json.dumps(dict(files=entries)))
            self.assertEqual(len(audit.verify_inputs(folder, manifest)), 5)
            (folder / audit.INPUT_NAMES[0]).write_bytes(b"modified")
            with self.assertRaises(ValueError):
                audit.verify_inputs(folder, manifest)


if __name__ == "__main__":
    unittest.main()
