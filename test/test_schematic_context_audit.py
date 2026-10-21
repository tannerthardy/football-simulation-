"""Protect new measurement denominators, overlap weighting and source identity."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("schematic_context_audit", Path(__file__).parents[1] / "scripts/data/schematic_context_audit.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def play(**changes):
    row = dict(season="2022", season_type="REG", game_id="g", play_id="1", posteam="A",
               play_type="pass", qb_dropback="1", pass_attempt="1", rush_attempt="0", qb_scramble="0",
               sack="0", complete_pass="0", incomplete_pass="1", interception="0", penalty="0",
               qb_kneel="0", qb_spike="0", two_point_attempt="0", down="1", ydstogo="10",
               yardline_100="60", score_differential="0", qtr="1", game_seconds_remaining="3500",
               receiver_player_id="receiver", air_yards="20", yards_gained="0")
    return dict(row, **changes)


class SchematicContextContracts(unittest.TestCase):
    def test_named_target_depth_does_not_invent_throwaway_or_sack_targets(self):
        aggregate = audit.Aggregate()
        aggregate.add(play())
        aggregate.add(play(receiver_player_id="", air_yards="0"))
        aggregate.add(play(air_yards=""))
        aggregate.add(play(sack="1", incomplete_pass="0", air_yards="30"))
        out = aggregate.result()
        self.assertEqual(out["counts"]["callingPlays"], 4)
        self.assertEqual(out["counts"]["cleanThrows"], 3)
        self.assertEqual(out["namedTargetAirYards"]["n"], 1)
        self.assertEqual(out["deepShareOfNamedTargetsWithKnownDepth"]["denominator"], 1)

    def test_motion_screen_and_penalty_denominators_remain_distinct(self):
        aggregate = audit.Aggregate()
        chart = {"is_motion": "TRUE", "is_screen_pass": "TRUE"}
        aggregate.add(play(penalty="1"), chart)
        aggregate.add(play(sack="1", incomplete_pass="0"), chart)
        aggregate.add(play(), {"is_motion": "", "is_screen_pass": ""})
        aggregate.add(play(play_type="run", qb_dropback="0", pass_attempt="0", rush_attempt="1", incomplete_pass="0"), chart)
        out = aggregate.result()
        self.assertEqual(out["ftnMotionAmongKnownMatchedCallingPlays"]["denominator"], 3)
        self.assertEqual(out["ftnScreenAmongKnownMatchedCleanDropbacks"]["denominator"], 1)
        self.assertEqual(out["counts"]["matchedCleanChartDropbacks"], 2)
        self.assertEqual(out["counts"]["penaltyFlagTrue"], 1)

    def test_overtime_and_unknown_distance_do_not_become_late_regulation(self):
        c = audit.context(play(qtr="5", game_seconds_remaining="0", ydstogo="0", yardline_100="20", score_differential="-9"))
        self.assertEqual(c["period"], "overtime")
        self.assertEqual(c["distance"], "unknown")
        self.assertEqual(c["field"], "redZone0to20")
        self.assertEqual(c["score"], "trailing9plus")
        self.assertEqual(audit.context(play(ydstogo="27", qtr="4", game_seconds_remaining="600"))["distance"], "20plus")
        self.assertEqual(audit.context(play(ydstogo="11"))["distance"], "11to19")

    def test_conversion_is_not_a_gain_or_explosiveness_label(self):
        aggregate = audit.Aggregate()
        aggregate.add(play(play_type="run", qb_dropback="0", pass_attempt="0", rush_attempt="1", incomplete_pass="0", down="3", ydstogo="27", yards_gained="12"))
        out = aggregate.result()
        self.assertEqual(out["cleanGains"]["designedRun"]["mean"], 12)
        self.assertEqual(out["cleanDistanceConversions"]["designedRun"]["count"], 0)

    def test_common_cell_weighting_can_reverse_a_raw_score_association(self):
        cells = {}
        # Within each context trailing teams drop back less, while their raw
        # mixture overweights the pass-heavy context. Same-cell weights remove
        # this explicit composition difference without claiming causation.
        definitions = [("8to10", "trailing9plus", 9, 10), ("8to10", "leading9plus", 2, 2),
                       ("1to3", "trailing9plus", 0, 2), ("1to3", "leading9plus", 1, 10)]
        raw = {group: [0, 0] for group in ("trailing9plus", "leading9plus")}
        for distance, group, passes, total in definitions:
            aggregate = audit.Aggregate()
            aggregate.counts.update(callingPlays=total, dropback=passes)
            cells[(2022, 1, distance, "own51to100", "earlierRegulation", group)] = aggregate
            raw[group][0] += passes
            raw[group][1] += total
        self.assertGreater(raw["trailing9plus"][0] / raw["trailing9plus"][1], raw["leading9plus"][0] / raw["leading9plus"][1])
        out = audit.score_standardization(cells, "observedDropback", minimum=2)
        self.assertEqual(out["retainedCells"], 2)
        self.assertAlmostEqual(out["standardizedTrailingPercent"], 45)
        self.assertAlmostEqual(out["standardizedLeadingPercent"], 55)
        self.assertIsNone(audit.score_standardization(cells, "observedDropback", minimum=11)["differencePercentagePoints"])

    def test_exact_chart_keys_reject_duplicate_or_fractional_play_ids(self):
        rows = [dict(nflverse_game_id="g", nflverse_play_id="1.0")]
        self.assertIn(("g", 1), audit.index_chart(rows))
        with self.assertRaises(ValueError):
            audit.index_chart(rows + rows)
        with self.assertRaises(ValueError):
            audit.index_chart([dict(nflverse_game_id="g", nflverse_play_id="1.5")])

    def test_changed_input_is_rejected_even_when_filename_matches(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            entries = []
            for name in audit.INPUT_NAMES:
                path = root / name
                path.write_bytes(b"reviewed")
                entries.append(dict(name=name, bytes=8, sha256=audit.sha256(path)))
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({"files": entries}))
            self.assertEqual(len(audit.verify_inputs(root, manifest)), 3)
            (root / audit.INPUT_NAMES[0]).write_bytes(b"modified")
            with self.assertRaises(ValueError):
                audit.verify_inputs(root, manifest)

    def test_two_point_and_dead_play_rows_do_not_enter_situation_cells(self):
        self.assertEqual(audit.selection_reason(play(two_point_attempt="1")), "twoPointAttempt")
        self.assertEqual(audit.selection_reason(play(play_type="no_play")), "notLivePassRun")
        self.assertEqual(audit.selection_reason(play(season_type="POST")), "notRegularSeason")
        self.assertIsNone(audit.selection_reason(play(qb_scramble="1", play_type="run", pass_attempt="0", rush_attempt="1")))


if __name__ == "__main__":
    unittest.main()
