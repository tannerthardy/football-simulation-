"""Synthetic rows protect denominator, label and exact-identity contracts."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("nflverse_reference", Path(__file__).parents[1] / "scripts/nflverse-reference.py")
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


def play(**changes):
    row = dict(season="2022", season_type="REG", game_id="game", play_id="1", posteam="KC",
                play_type="pass", qb_dropback="1", pass_attempt="1", rush_attempt="0", qb_scramble="0",
                sack="0", complete_pass="0", incomplete_pass="1", interception="0", penalty="0",
                down="1", ydstogo="10", yards_gained="0", air_yards="10", epa="-1")
    return dict(row, **changes)


class ReferenceContracts(unittest.TestCase):
    def test_sacks_are_dropbacks_not_throws_and_scrambles_are_not_designed_runs(self):
        base = play()
        sack = dict(base, play_id="2", sack="1", incomplete_pass="0", yards_gained="-7")
        scramble = dict(base, play_id="3", play_type="run", pass_attempt="0", rush_attempt="1",
                        qb_scramble="1", incomplete_pass="0", yards_gained="5")
        run = dict(base, play_id="4", play_type="run", qb_dropback="0", pass_attempt="0", rush_attempt="1",
                   incomplete_pass="0", yards_gained="10")
        out = r.outcomes([base, sack, scramble, run])
        self.assertEqual(out["throws"], 1)
        self.assertEqual(out["dropback"]["plays"], 3)
        self.assertEqual(out["designedRun"]["plays"], 1)
        self.assertEqual(out["sackPerDropback"]["denominator"], 3)
        self.assertEqual(out["designedRun"]["explosive"]["count"], 1)
        for key, value in (("play_type", "no_play"), ("season_type", "POST"), ("qb_kneel", "1")):
            self.assertIsNone(r.classify(dict(base, **{key: value})))

    def test_yards_success_and_positive_epa_are_different_measures(self):
        first = dict(play(), yards_gained="4", epa="-0.2")
        second = dict(play(), down="2", yards_gained="5", epa="0.2")
        third = dict(play(), down="3", yards_gained="10", epa="0.2")
        out = r.outcomes([first, second, third])["dropback"]
        self.assertEqual(out["success4060100"]["count"], 2)
        self.assertEqual(out["positiveEPA"]["count"], 2)
        self.assertEqual(r.outcomes([first])["dropback"]["positiveEPA"]["count"], 0)

    def test_final_outcomes_take_priority_over_overlapping_chart_labels(self):
        rows = [dict(play(), play_id=str(i)) for i in range(1, 5)]
        rows[1].update(interception="1", incomplete_pass="0")
        rows[2].update(complete_pass="1", incomplete_pass="0")
        charts = [dict(nflverse_game_id="game", nflverse_play_id=f"{i}.0", is_drop="TRUE",
                       is_throw_away="TRUE") for i in range(1, 4)]
        out = r.charting_reference(rows, charts)
        self.assertEqual(out["unmatchedThrows"], 1)
        self.assertEqual(out["finalOutcomes"], {"drop": 1, "interception": 1, "completion": 1})
        self.assertEqual(out["dropShareOfIncompletions"]["denominator"], 1)
        self.assertIsNone(out["labelsOnThrows"]["is_catchable_ball"]["percent"])
        with self.assertRaises(ValueError):
            r.charting_reference(rows, charts + charts[:1])

    def test_roster_sampling_keeps_body_pairs_and_matches_only_exact_ids(self):
        rosters = [dict(team="KC", season="2022", pfr_id="exact", position="OL", height="76", weight="310", years_exp="3"),
                   dict(team="KC", season="2022", pfr_id="other", position="OL", height="78", weight="320", years_exp="2")]
        snaps = [dict(team="KC", game_type="REG", season="2022", pfr_player_id="exact", position="T", offense_snaps="100", defense_snaps="0"),
                 dict(team="KC", game_type="REG", season="2022", pfr_player_id="unknown", position="T", offense_snaps="30", defense_snaps="0")]
        combine = [dict(pfr_id="different", season="2019", forty="4.5")]
        out = r.roster_reference(rosters, snaps, combine, "KC", 2022)
        self.assertEqual(len(out["anonymousProfiles"]), 1)
        self.assertEqual(out["anonymousProfiles"][0]["heightIn"], 76)
        self.assertAlmostEqual(out["anonymousProfiles"][0]["massKg"], 310 * .45359237)
        self.assertIsNone(out["anonymousProfiles"][0]["historicalCombine"])
        self.assertEqual(out["joinCoverage"]["snapPlayersWithScrimmageParticipation"], 2)

    def test_crosswalk_restores_missing_ids_without_guessing_names(self):
        roster = [dict(team="KC", season="2022", gsis_id="gsis", pfr_id="", position="OL", height="76", weight="310")]
        snaps = [dict(team="KC", game_type="REG", season="2022", pfr_player_id="pfr", position="T", offense_snaps="100", defense_snaps="0")]
        players = [dict(gsis_id="gsis", pfr_id="pfr")]
        out = r.roster_reference(roster, snaps, [], "KC", 2022, players)
        self.assertEqual(out["groups"]["OL"]["players"], 1)
        self.assertEqual(out["joinCoverage"]["matchedIdsFilledByGsisCrosswalk"], 1)
        with self.assertRaises(ValueError):
            r.roster_reference([dict(roster[0], pfr_id="conflicting")], snaps, [], "KC", 2022, players)


if __name__ == "__main__":
    unittest.main()
