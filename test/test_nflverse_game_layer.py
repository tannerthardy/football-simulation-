"""M1 schema, provenance and denominator controls; no network or simulation."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location("nflverse_game_layer", ROOT / "scripts/data/nflverse_game_layer.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def row(**changes):
    r = {key: "" for key in m.REQUIRED}
    r.update(season="2023", season_type="REG", game_id="2023_01_BUF_KC", play_id="1",
             home_team="KC", away_team="BUF", posteam="KC", defteam="BUF", play_type="run",
             qtr="1", half_seconds_remaining="1700", score_differential="0", down="1", ydstogo="10",
             yardline_100="50", fixed_drive="1", fixed_drive_result="Punt",
             home_timeouts_remaining="3", away_timeouts_remaining="3")
    for key in ("field_goal_attempt", "extra_point_attempt", "punt_attempt", "punt_blocked", "punt_inside_twenty",
                "punt_downed", "punt_fair_catch", "punt_out_of_bounds", "kickoff_attempt", "kickoff_fair_catch",
                "kickoff_downed", "kickoff_out_of_bounds", "touchback", "own_kickoff_recovery",
                "fourth_down_converted", "fourth_down_failed", "two_point_attempt", "touchdown", "penalty",
                "interception", "fumble_lost", "qb_spike", "qb_kneel", "timeout"):
        r[key] = "0"
    r.update(changes)
    return r


class GameLayerControls(unittest.TestCase):
    def test_disjoint_field_and_distance_boundaries_are_explicit(self):
        self.assertEqual([m.field_bin(y) for y in (99, 71, 70, 50, 49, 35, 34, 20, 19, 0)],
                         ["own1-29", "own1-29", "own30-49", "own30-49", "opp49-35", "opp49-35",
                          "opp34-20", "opp34-20", "redZone", "redZone"])
        self.assertEqual([m.distance_bin(y) for y in (1, 2, 3, 5, 6, 10, 11)],
                         ["1", "2", "3-5", "3-5", "6-10", "6-10", "11+"])
        self.assertIsNone(m.field_bin(None))
        self.assertIsNone(m.distance_bin(0))

    def test_fourth_down_clock_garbage_and_unknown_conversion_denominators(self):
        plays = [row(down="4", half_seconds_remaining="120"),
                 row(down="4", half_seconds_remaining="121", fourth_down_converted="1"),
                 row(down="4", qtr="4", score_differential="17"),
                 row(down="4", qtr="4", score_differential="16"),
                 row(down="4", qtr="3", score_differential="30", play_type="punt", punt_attempt="1"),
                 row(down="4", play_type="no_play"), row(down="4", qtr="5")]
        out, _ = m.season([plays])
        fourth = out["fourthDown"]
        self.assertEqual((fourth["n"], fourth["go"], fourth["punt"]), (3, 2, 1))
        self.assertEqual(fourth["conversions"], {"n": 1, "converted": 1, "rate": 1})
        self.assertEqual(len(fourth["cells"]), 25)
        self.assertEqual(sum(c["n"] for c in fourth["cells"]), 3)
        empty = next(c for c in fourth["cells"] if c["n"] == 0)
        self.assertIsNone(empty["goRate"])

    def test_fg_bins_and_xp_keep_attempt_populations_separate(self):
        plays = [row(play_type="field_goal", field_goal_attempt="1", field_goal_result=result, kick_distance=distance)
                 for distance, result in (("29", "made"), ("30", "missed"), ("55", "blocked"), ("17", "made"))]
        plays += [row(play_type="extra_point", extra_point_attempt="1", extra_point_result="good", kick_distance="33")]
        out, _ = m.season([plays])
        fg = out["fieldGoals"]
        self.assertEqual((fg["n"], fg["made"], fg["blocked"], fg["outsideBinsOrUnknownDistance"]), (4, 2, 1, 1))
        self.assertEqual(out["extraPoints"]["n"], 1)
        self.assertEqual(sum(b["n"] for b in fg["distanceBins"]), 3)

    def test_punt_net_handles_touchbacks_and_blocks_without_dropping_zero_returns(self):
        plays = [row(play_type="punt", punt_attempt="1", kick_distance="50", return_yards="0", touchback="1"),
                 row(play_type="punt", punt_attempt="1", kick_distance="40", return_yards="0", punt_returner_player_id="ret"),
                 row(play_type="punt", punt_attempt="1", kick_distance="0", return_yards="30", punt_blocked="1")]
        out, _ = m.season([plays])
        punts = out["punts"]
        self.assertEqual(punts["n"], 3)
        self.assertEqual(punts["returnInvolvement"], 1)
        self.assertEqual(punts["returnInvolvementYards"], {"n": 1, "value": 0})
        self.assertEqual(punts["netYards"], {"n": 2, "value": 35})
        self.assertEqual(punts["grossYards"], {"n": 2, "value": 45})

    def test_onside_uses_an_explicit_label_not_only_short_distance(self):
        plays = [row(play_type="kickoff", kickoff_attempt="1", posteam="BUF", defteam="KC", kick_distance="10",
                     desc="Kicker onside kicks 10 yards.", own_kickoff_recovery="1"),
                 row(play_type="kickoff", kickoff_attempt="1", posteam="BUF", defteam="KC", kick_distance="19",
                     desc="Kicker kicks 19 yards.", kickoff_returner_player_id="ret", return_yards="0")]
        out, _ = m.season([plays])
        self.assertEqual((out["kickoffs"]["n"], out["kickoffs"]["onside"], out["kickoffs"]["onsideRecovered"]), (2, 1, 1))
        self.assertEqual(out["kickoffs"]["returnYards"], {"n": 1, "value": 0})

    def test_try_after_between_downs_foul_counts_at_post_td_pre_try_margin(self):
        td = row(touchdown="1", td_team="KC", posteam_score_post="6", defteam_score_post="7", fixed_drive_result="Touchdown")
        attempt = row(play_id="2", play_type="no_play", two_point_attempt="1", two_point_conv_result="success",
                      score_differential="-1", posteam_score_post="8", defteam_score_post="7", fixed_drive_result="Touchdown",
                      desc="ATTEMPT SUCCEEDS. PENALTY on BUF-1.Player, Defensive Holding, 5 yards, enforced between downs.", penalty="1")
        out, _ = m.season([[td, attempt]])
        two = out["twoPoint"]
        self.assertEqual((two["n"], two["success"], two["touchdowns"]), (1, 1, 1))
        bucket = next(b for b in two["byMargin"] if b["marginAfterTD"] == -1)
        self.assertEqual((bucket["n"], bucket["attempts"]), (1, 1))
        self.assertEqual(out["drives"]["offensivePoints"], 8)

    def test_drive_owners_and_kneel_drives_are_not_collapsed(self):
        plays = [row(play_type="punt", punt_attempt="1", kick_distance="40", return_yards="0"),
                 row(play_id="2", posteam="BUF", defteam="KC", play_type="qb_kneel", qb_kneel="1", fixed_drive_result="End of half")]
        out, _ = m.season([plays])
        self.assertEqual(out["drives"]["n"], 2)
        self.assertEqual(out["kneels"]["n"], 1)

    def test_terminal_timeout_inventory_is_not_number_of_annotations(self):
        plays = [row(play_id=str(i), timeout="1", timeout_team="KC", home_timeouts_remaining=str(max(0, 3-i)))
                 for i in range(1, 5)]
        out, _ = m.season([plays])
        self.assertEqual(out["timeouts"]["annotations"], 4)
        self.assertEqual(out["timeouts"]["charged"], 3)
        self.assertEqual(out["timeouts"]["n"], 2)  # Only first-half inventories were observed.
        self.assertEqual(out["audit"]["timeouts.missingTerminalInventory"], 2)

    def test_lost_fumble_row_uses_return_team_and_preserves_multi_loss_ambiguity(self):
        muff = row(play_type="punt", fumble_lost="1", fumbled_1_team="BUF", fumble_recovery_1_team="KC")
        self.assertEqual(m.lost_fumble_team(muff), "BUF")
        repeated = row(fumble_lost="1", fumbled_1_team="KC", fumble_recovery_1_team="KC", fumble_recovery_2_team="BUF")
        self.assertEqual(m.lost_fumble_team(repeated), "KC")
        ambiguous = dict(muff, fumbled_2_team="KC", fumble_recovery_2_team="BUF")
        self.assertIsNone(m.lost_fumble_team(ambiguous))
        out, _ = m.season([[ambiguous]])
        self.assertEqual((out["turnovers"]["n"], out["turnovers"]["unattributedFlags"]), (1, 1))
        self.assertEqual(out["teamSeasonRanges"]["turnovers.perTeamGame"]["n"], 0)

    def test_input_hash_mismatch_fails_before_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            records = []
            for year in m.YEARS:
                path = root / f"play_by_play_{year}.csv.gz"
                path.write_bytes(b"not the pinned input")
                records.append({"name": path.name, "bytes": path.stat().st_size, "sha256": "0" * 64})
            (root / m.MANIFEST).write_text(json.dumps({"files": records}))
            with self.assertRaisesRegex(ValueError, "Input checksum mismatch"):
                m.study(root)


class CommittedGameLayer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / "data/reviews/nflverse/game-layer.json"
        cls.report = json.loads(cls.path.read_text())

    def test_schema_and_provenance_are_small_finite_and_checksummed(self):
        r = self.report
        self.assertEqual(r["schemaVersion"], 1)
        self.assertEqual(set(r["seasons"]), {"2022", "2023"})
        self.assertLess(self.path.stat().st_size, 200_000)
        json.dumps(r, allow_nan=False)
        self.assertEqual(len(r["provenance"]["inputs"]), 2)
        manifest = json.loads((ROOT / "data/reviews/nflverse/game-layer-input-manifest.json").read_text())
        self.assertEqual(manifest["files"], r["provenance"]["inputs"])
        for f in r["provenance"]["inputs"]:
            self.assertRegex(f["sha256"], r"^[a-f0-9]{64}$")
            self.assertGreater(f["bytes"], 1_000_000)
        for f in r["provenance"]["extractors"]:
            self.assertEqual(f["sha256"], hashlib.sha256((ROOT / f["path"]).read_bytes()).hexdigest())
        self.assertIn("definition", " ".join(r.keys()))

    def test_sanity_ranges_games_and_all_table_denominators(self):
        for year, games in (("2022", 271), ("2023", 272)):
            s = self.report["seasons"][year]
            self.assertEqual(s["games"]["n"], games)
            self.assertEqual(s["n"], 2 * games)
            self.assertEqual(len(s["games"]["byTeam"]), 32)
            self.assertTrue(.90 <= s["extraPoints"]["madeRate"] <= .98)
            self.assertTrue(.80 <= s["fieldGoals"]["madeRate"] <= .90)
            self.assertTrue(3 <= s["punts"]["perTeamGame"] <= 5.5)
            for key in ("fieldGoals", "extraPoints", "punts", "kickoffs", "fourthDown", "twoPoint", "penalties",
                        "drives", "turnovers", "spikes", "kneels", "timeouts", "audit"):
                self.assertIn("n", s[key], (year, key))
            self.assertEqual(sum(b["n"] for b in s["penalties"]["byType"]), s["penalties"]["n"])
            self.assertEqual(sum(b["n"] for b in s["drives"]["outcomes"]), s["drives"]["n"])
            self.assertEqual(sum(b["n"] for b in s["twoPoint"]["byMargin"]), s["twoPoint"]["touchdowns"])
            self.assertEqual(sum(b["attempts"] for b in s["twoPoint"]["byMargin"]), s["twoPoint"]["n"])
            self.assertEqual(s["audit"]["penalties.unresolved"], 0)
            for table in (s["fieldGoals"]["distanceBins"], s["fourthDown"]["cells"], s["twoPoint"]["byMargin"]):
                self.assertTrue(all("n" in b for b in table))
        for range_ in self.report["teamSeasonRanges"].values():
            self.assertLessEqual(range_["n"], 64)
            if range_["n"]:
                self.assertLessEqual(range_["p10"], range_["p50"])
                self.assertLessEqual(range_["p50"], range_["p90"])


if __name__ == "__main__":
    unittest.main()
