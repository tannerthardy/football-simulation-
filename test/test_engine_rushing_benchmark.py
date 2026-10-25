"""Native rushing provenance, context, realized outcomes and reference support."""
import copy
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("engine_rushing_benchmark", Path(__file__).parents[1] / "scripts/data/engine_rushing_benchmark.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)

SOURCE = "a" * 64
COLLECTOR = sorted(engine.VERIFIED_COLLECTORS)[0]


def fixture():
    teams = [{"id": "A", "abbr": "AAA", "roster": [
        {"id": "runner", "position": "RB", "firstName": "Same", "lastName": "Name"},
        {"id": "quarterback", "position": "QB"}]},
        {"id": "B", "abbr": "BBB", "roster": [{"id": "runner", "position": "WR"}]}]
    log = {"index": 1, "kind": "run", "offense": "AAA", "yards": 4.0, "firstDown": False,
           "score": {"home": 7, "away": 10}, "down": 4, "distance": 1, "yardline": 99,
           "quarter": 4, "clock": 0, "plan": {"concept": "inside-zone", "audible": True},
           "nativeInput": {"logIndex": 1, "kind": "scrimmage", "seed": 101,
              "state": {"possession": "home", "down": 1, "distance": 10,
                        "yardline": 40, "quarter": 1, "clock": 850, "score": {"home": 0, "away": 10}},
              "los": 50, "firstDownX": 60,
              "offCall": {"kind": "run", "run": {"scheme": "inside-zone", "id": "iz"}},
              "defCall": {"front": {"id": "over"}, "coverage": {"id": "cover3"}},
              "raw": {"offenseYards": 4.0, "score": None, "turnover": False,
                      "stats": {"rusher": "runner"}, "events": []}}}
    game = {"league": 0, "gameIndex": 1, "seed": 7, "home": {"id": "A", "abbr": "AAA"},
            "away": {"id": "B", "abbr": "BBB"}, "sourceBefore": SOURCE, "sourceAfter": SOURCE,
            "beforeRosterSha256": engine.saved_json_sha(teams), "nativeCalls": 1, "log": [log]}
    return {"schema": engine.SCHEMA, "sourceBefore": SOURCE, "sourceAfter": SOURCE,
            "collectorSha256": COLLECTOR, "commonSha256": engine.VERIFIED_COMMON,
            "games": 1, "leagues": 1,
            "leagueInputs": [{"league": 0, "rosterSha256": engine.saved_json_sha(teams), "teams": teams}], "rows": [game]}


def one(index=None):
    return engine.normalize_index(index or fixture())[0]


def reference(context, n=120, games=30, success=50, success_den=None):
    return {"context": context, "yards": {"n": n, "mean": 4.0},
            "exposure": {"cleanGainGames": games},
            "rates": {"success4060100": {"count": success, "denominator": n if success_den is None else success_den,
                                         "percent": 100 * success / (n if success_den is None else success_den)}}}


class EngineRushingBenchmarkTests(unittest.TestCase):
    def test_uses_true_pre_snap_state_and_offense_score(self):
        play = one()
        self.assertEqual(play["contextValues"]["down"], 1)
        self.assertEqual(play["contextValues"]["distanceToGain"], 10)
        self.assertEqual(play["contextValues"]["yardline100"], 60)
        self.assertEqual(play["contextValues"]["scoreDifferential"], -10)
        self.assertEqual(play["contextValues"]["gameSecondsRemaining"], 3550)
        self.assertEqual(engine.context(play)["score"], "trailing9to16")
        index = fixture()
        log = index["rows"][0]["log"][0]
        log["nativeInput"]["state"]["possession"] = "away"
        log["offense"] = "BBB"
        self.assertEqual(one(index)["contextValues"]["scoreDifferential"], 10)

    def test_fractional_goal_distance_and_recorded_td_not_same_operator(self):
        index = fixture()
        log = index["rows"][0]["log"][0]
        native = log["nativeInput"]
        native["state"].update(yardline=97.1, distance=3, down=3)
        native.update(los=107.1, firstDownX=110)
        log.update(yards=2.9, firstDown=True)
        native["raw"].update(offenseYards=2.9, score={"kind": "TD", "team": "O"})
        play = one(index)
        rates = engine.aggregate_plays([play])["overall"]["designedRun"]["rates"]
        self.assertAlmostEqual(play["contextValues"]["geometricDistanceToGain"], 2.9)
        self.assertEqual(rates["gainDistanceConversion"]["count"], 0)
        self.assertEqual(rates["recordedFirstOrTD"]["count"], 1)
        self.assertEqual(rates["fieldEligibleExplosive10plus"]["denominator"], 0)
        self.assertEqual(engine.aggregate_plays([play], True)["overall"]["designedRun"]["rates"]["gainDistanceConversion"]["count"], 1)

    def test_missing_state_distance_not_inferred_from_firstdown(self):
        index = fixture()
        del index["rows"][0]["log"][0]["nativeInput"]["state"]["distance"]
        play = one(index)
        self.assertEqual(play["contextValues"]["geometricDistanceToGain"], 10)
        self.assertIsNone(play["contextValues"]["distanceToGain"])
        self.assertEqual(engine.aggregate_plays([play])["overall"]["designedRun"]["rates"]["success4060100"]["denominator"], 0)

    def test_field_geometry_and_offense_identity_fail_loudly(self):
        for field, value in (("los", 51), ("logOffense", "CCC")):
            index = fixture()
            log = index["rows"][0]["log"][0]
            if field == "los":
                log["nativeInput"]["los"] = value
            else:
                log["offense"] = value
            with self.assertRaises(ValueError):
                one(index)

    def test_penalty_absence_declined_null_malformed_missing_raw(self):
        play = one()
        self.assertEqual(play["penaltyStatus"], "unflaggedNative")
        index = fixture()
        log = index["rows"][0]["log"][0]
        log["nativeInput"]["raw"]["penalty"] = {"kind": "holding", "against": "O", "yards": 10}
        log["foul"] = {"accepted": False}
        play = one(index)
        self.assertFalse(play["cleanEligible"])
        self.assertEqual(engine.reconcile([play])["counts"]["officialNonNullifiedLogRuns"], 1)
        self.assertEqual(engine.aggregate_plays([play])["overall"]["designedRun"]["yards"]["n"], 0)
        for penalty in (None, {}, {"kind": "holding", "against": "O", "yards": float("nan")}):
            index = fixture()
            index["rows"][0]["log"][0]["nativeInput"]["raw"]["penalty"] = penalty
            self.assertEqual(one(index)["penaltyStatus"], "unknown")
        index = fixture()
        del index["rows"][0]["log"][0]["nativeInput"]["raw"]
        self.assertEqual(one(index)["penaltyStatus"], "unknown")

    def test_nullified_penalty_preserves_settled_and_raw_excludes_all_primary(self):
        index = fixture()
        log = index["rows"][0]["log"][0]
        log.update(nullified=True, yards=-10)
        log["nativeInput"]["raw"]["penalty"] = {"kind": "holding", "against": "O", "yards": 10}
        play = one(index)
        self.assertEqual(play["rawPrePenaltyGain"], 4)
        self.assertEqual(play["settledGain"], -10)
        self.assertEqual(play["settledVsRawDifference"], -14)
        self.assertEqual(engine.aggregate_plays([play])["overall"], {})
        self.assertEqual(engine.reconcile([play])["officialLogRunGainCount"], 0)

    def test_actual_post_audible_call_and_plan_agree(self):
        play = one()
        self.assertTrue(play["audible"])
        self.assertEqual(play["generatedConcept"], "inside-zone")
        index = fixture()
        index["rows"][0]["log"][0]["plan"]["concept"] = "Duo"
        with self.assertRaises(ValueError):
            one(index)

    def test_pass_call_scramble_unknown_carrier_failed_escape_and_two_points(self):
        index = fixture()
        log = index["rows"][0]["log"][0]
        native = log["nativeInput"]
        native["offCall"] = {"kind": "pass", "pass": {"id": "mesh"}}
        log.update(kind="pass", plan={"concept": "mesh"})
        native["raw"]["stats"] = {"scramble": True, "sacked": False}
        play = one(index)
        self.assertEqual(play["kind"], "scramble")
        self.assertEqual(play["carrier"], "unknown")
        self.assertIsNone(play["carrierId"])
        native["raw"]["stats"]["sacked"] = True
        play = one(index)
        self.assertTrue(play["failedEscapeSack"])
        self.assertIsNone(play["kind"])
        index = fixture()
        log = index["rows"][0]["log"][0]
        log["nativeInput"]["kind"] = "two-point"
        log["kind"] = "two"
        self.assertFalse(one(index)["cleanEligible"])
        self.assertEqual(engine.aggregate_plays([one(index)])["overall"], {})

    def test_exact_id_carrier_position_team_and_league_no_name_matching(self):
        self.assertEqual(one()["carrier"], "RB_FB")
        index = fixture()
        native = index["rows"][0]["log"][0]["nativeInput"]
        native["raw"]["stats"]["rusher"] = "Same Name"
        self.assertEqual(one(index)["carrier"], "unknown")
        # The opposing roster contains the same ID at WR, but is not the offense.
        native["raw"]["stats"]["rusher"] = "runner"
        self.assertEqual(one(index)["carrierPosition"], "RB")
        direct = engine.roster_index({"leagueInputs": [
            {"league": 0, "teams": [{"id": "A", "roster": [{"id": "runner", "position": "RB"}]}]},
            {"league": 1, "teams": [{"id": "A", "roster": [{"id": "runner", "position": "QB"}]}]}]})
        self.assertEqual(direct[(0, "A")]["runner"], "RB")
        self.assertEqual(direct[(1, "A")]["runner"], "QB")
        direct = engine.roster_index({"leagueInputs": [{"league": 0, "teams": [{"id": "A", "roster": [
            {"id": "runner", "position": "RB"}, {"id": "runner", "position": "WR"}]}]}]})
        self.assertIsNone(direct[(0, "A")]["runner"])

    def test_fumble_success_and_turnover_sensitive_success_preserved(self):
        index = fixture()
        raw = index["rows"][0]["log"][0]["nativeInput"]["raw"]
        raw.update(turnover=True)
        raw["stats"]["fumbleLost"] = True
        raw["events"] = [{"type": "fumble"}]
        play = one(index)
        rates = engine.aggregate_plays([play])["overall"]["designedRun"]["rates"]
        self.assertTrue(play["turnover"])
        self.assertTrue(play["fumbleEvent"])
        self.assertEqual(rates["success4060100"]["count"], 1)
        self.assertEqual(rates["successWithoutLostFumble"]["count"], 0)
        self.assertEqual(rates["fumbleLost"]["count"], 1)
        self.assertEqual(rates["positiveEPA"]["denominator"], 0)

    def test_source_producer_roster_and_native_row_guards(self):
        for mutation in ("source", "collector", "common", "roster", "nativeRow", "callCount", "duplicate"):
            index = fixture()
            if mutation == "source": index["sourceAfter"] = "b" * 64
            if mutation == "collector": index["collectorSha256"] = "b" * 64
            if mutation == "common": index["commonSha256"] = "b" * 64
            if mutation == "roster": index["leagueInputs"][0]["teams"][0]["roster"][0]["position"] = "QB"
            if mutation == "nativeRow": index["rows"][0]["log"][0]["nativeInput"]["logIndex"] = 2
            if mutation == "callCount": index["rows"][0]["nativeCalls"] = 2
            if mutation == "duplicate": index["rows"][0]["log"].append(copy.deepcopy(index["rows"][0]["log"][0]))
            with self.assertRaises(ValueError, msg=mutation):
                one(index)
        with self.assertRaises(ValueError):
            engine.normalize_index(fixture(), "b" * 64, COLLECTOR)

    def test_reviewed_recording_collector_preserves_full_raw_semantics(self):
        index = fixture()
        index["collectorSha256"] = "7aae5bb1bc756efef52ab6bd9abc380e564bf5a2d59596d74629ab1ca66edc35"
        native = index["rows"][0]["log"][0]["nativeInput"]
        native["scrambleCarrierNormalizedFinalSha256"] = "b" * 64
        self.assertEqual(one(index)["penaltyStatus"], "unflaggedNative")
        self.assertEqual(one(index)["carrierPosition"], "RB")
        native["raw"]["penalty"] = {"kind": "holding", "against": "O", "yards": 10}
        self.assertEqual(one(index)["penaltyStatus"], "flaggedNative")

    def test_fixed_backoff_and_metric_specific_support(self):
        desired = engine.context(one())
        exact = {key: desired[key] for key in engine.benchmark.CELL_FIELDS}
        broader = {key: desired[key] for key in engine.benchmark.CELL_FIELDS[:-1]}
        widest = {key: desired[key] for key in engine.benchmark.CELL_FIELDS[:2]}
        report = {"fallbackPopulations": [reference(exact, n=10), reference(broader), reference(widest, n=200)]}
        chosen = engine.choose_reference(engine.reference_lookup(report), desired, "success4060100")
        self.assertEqual(chosen["context"], broader)
        self.assertEqual(chosen["discardedDimensions"], ["field"])
        report["fallbackPopulations"][1]["rates"]["success4060100"]["denominator"] = 4
        chosen = engine.choose_reference(engine.reference_lookup(report), desired, "success4060100")
        self.assertEqual(chosen["context"], widest)
        self.assertEqual(chosen["discardedDimensions"], ["field", "distance", "down"])
        self.assertEqual(engine.choose_reference(engine.reference_lookup(report), desired, "positiveEPA")["status"], "unavailable")

    def test_standardization_weights_actual_engine_exposure_and_missing_epa(self):
        first, second = one(), one()
        second = copy.deepcopy(second)
        second["nflMetricRow"].update(yards_gained=0, down=2)
        report = {"fallbackPopulations": [reference({"kind": "designedRun", "carrier": "RB_FB"}, n=200, success=100)]}
        standardized = engine.standardize(engine.aggregate_plays([first, second]), report)["groups"][0]["metrics"]
        self.assertEqual(standardized["meanYards"]["engineValueOnCommonSupport"], 2)
        self.assertEqual(standardized["meanYards"]["nflExpectedAtEngineExposure"], 4)
        self.assertEqual(standardized["success4060100"]["engineValueOnCommonSupport"], 50)
        self.assertEqual(standardized["positiveEPA"]["engineAllMetricDenominator"], 0)
        self.assertIsNone(standardized["positiveEPA"]["nflExpectedAtEngineExposure"])

    def test_cohort_boundaries_unknown_context_and_rounding_separate(self):
        play = one()
        self.assertNotIn("ordinaryRB_FB", engine.cohorts(play))  # pre-snap trailing10
        play["nflMetricRow"]["score_differential"] = 0
        self.assertIn("ordinaryRB_FB", engine.cohorts(play))
        play["nflMetricRow"]["game_seconds_remaining"] = 600
        self.assertNotIn("ordinaryRB_FB", engine.cohorts(play))
        row = {"yards_gained": -0.5, "ydstogo": 2.9, "yardline_100": None}
        self.assertEqual(engine.rounded_metric_row(row), {"yards_gained": 0, "ydstogo": 3, "yardline_100": None})
        self.assertEqual(row["yards_gained"], -0.5)

    def test_receipt_pins_input_bytes_and_shared_operators(self):
        with tempfile.TemporaryDirectory() as folder:
            index, nfl = (Path(folder) / name for name in ("index.json", "nfl.json"))
            index.write_text("{}"); nfl.write_text("{}")
            before = engine.receipt(index, nfl, SOURCE, COLLECTOR)
            index.write_text("{\"changed\":true}")
            after = engine.receipt(index, nfl, SOURCE, COLLECTOR)
            self.assertNotEqual(before["engineIndexSha256"], after["engineIndexSha256"])
            self.assertEqual(before["sharedModuleSha256"], engine.file_sha(engine.HELPER_PATH))

    def test_nfl_report_operator_fingerprint_and_no_fake_epa(self):
        pins = engine.dependency_pins()
        query = {"seasons": [2022, 2023]}
        provenance = {"query": query, "querySha256": engine.benchmark.digest(query),
                      "collectorSha256": pins["sharedModuleSha256"],
                      **{key: value for key, value in pins.items() if key != "sharedModuleSha256"}}
        report = {"schema": "rushing-benchmark-v1", "provenance": provenance,
                  "fallbackPopulations": [reference({"kind": "designedRun", "carrier": "RB_FB"})]}
        engine.validate_nfl_report(report)
        declared = {"expectedEngineSourceSha256": SOURCE, "expectedEngineCollectorSha256": COLLECTOR,
                    "query": {"minimumNflGains": 100, "minimumNflGames": 20, "minimumNflPerMetricDenominator": 100}}
        output = engine.collect(fixture(), report, declared)
        self.assertEqual(output["schema"], engine.OUTPUT_SCHEMA)
        self.assertEqual(output["overall"]["designedRun"]["yards"]["n"], 1)
        self.assertEqual(output["overall"]["designedRun"]["rates"]["positiveEPA"]["denominator"], 0)
        altered = copy.deepcopy(report)
        altered["provenance"]["operatorSha256"] = "b" * 64
        with self.assertRaises(ValueError):
            engine.validate_nfl_report(altered)
        altered = copy.deepcopy(report)
        altered["provenance"]["query"]["seasons"] = [2024]
        with self.assertRaises(ValueError):
            engine.validate_nfl_report(altered)


if __name__ == "__main__":
    unittest.main()
