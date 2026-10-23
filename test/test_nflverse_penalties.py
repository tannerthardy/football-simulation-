"""Focused acceptance, review and attribution controls; no data downloads."""
import importlib.util
from pathlib import Path
import unittest


SPEC = importlib.util.spec_from_file_location(
    "nflverse_penalties", Path(__file__).parents[1] / "scripts/data/nflverse_penalties.py")
P = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(P)


def parse(desc, **changes):
    return P.parse_penalties(dict(desc=desc, penalty="1", **changes))


class AcceptedPenaltyContracts(unittest.TestCase):
    def test_counts_both_accepted_fouls_in_one_play(self):
        result = parse("PENALTY on CAR-49-F.Luvu, Unnecessary Roughness, 4 yards, enforced at CAR 7. "
                       "PENALTY on ARI-76-W.Hernandez, Disqualification, 15 yards, enforced between downs.")
        self.assertEqual(result["events"], [{"team": "CAR", "type": "unnecessaryRoughness"},
                                            {"team": "ARI", "type": "other"}])
        self.assertEqual(result["unresolved"], 0)

    def test_does_not_use_first_field_or_reject_an_entire_multi_penalty_play(self):
        result = parse("Penalty on HOU-12-N.Collins, Illegal Formation, superseded. "
                       "PENALTY on CLE-99-T.Bryan, Roughing the Passer, 15 yards, enforced at HOU 27 - No Play. "
                       "Penalty on CLE-95-M.Garrett, Defensive Offside, declined.",
                       penalty_type="Illegal Formation")
        self.assertEqual(result["events"], [{"team": "CLE", "type": "roughingPasser"}])
        self.assertEqual(result["declined"], 1)
        self.assertEqual(result["superseded"], 1)
        self.assertEqual(result["unresolved"], 0)

    def test_excludes_offsetting_calls_but_retains_a_separate_enforced_call(self):
        result = parse("PENALTY on TEN-49-A.Key, Defensive Offside, 5 yards, enforced at CIN 46 - No Play. "
                       "Penalty on CIN-28-J.Mixon, Taunting, offsetting. "
                       "Penalty on TEN-98-J.Simmons, Taunting, offsetting.")
        self.assertEqual(result["events"], [{"team": "TEN", "type": "defensiveOffside"}])
        self.assertEqual(result["offsetting"], 2)

    def test_review_replacement_removes_repeated_and_overturned_calls(self):
        result = parse("PENALTY on BAL-92-J.Madubuike, Roughing the Passer, 15 yards, enforced at BAL 39. "
                       "The Replay Official reviewed the pass completion ruling, and the play was REVERSED. "
                       "PENALTY on BAL-92-J.Madubuike, Roughing the Passer, 15 yards, enforced at TB 39 - No Play.")
        self.assertEqual(result["events"], [{"team": "BAL", "type": "roughingPasser"}])
        no_call = P.parse_penalties({"penalty": "0", "desc":
            "PENALTY on WAS-34-C.Holmes, Illegal Touch Kick, 5 yards, enforced at GB 15. "
            "The Replay Official reviewed the kick touched ruling, and the play was REVERSED. "
            "5-T.Way punts 68 yards to GB 1, downed by WAS-35-P.Butler."})
        self.assertEqual(no_call["events"], [])
        self.assertEqual(no_call["unresolved"], 0)

    def test_declined_runoff_does_not_erase_an_accepted_grounding_penalty(self):
        result = parse("PENALTY on JAX-16-T.Lawrence, Intentional Grounding, 14 yards, enforced at DEN 38. "
                       "Denver declined the 10 second run off.")
        self.assertEqual(result["events"], [{"team": "JAX", "type": "intentionalGrounding"}])
        self.assertEqual(result["declined"], 0)

    def test_playerless_calls_and_defensive_delay_have_explicit_attribution(self):
        result = parse("PENALTY on MIA, Defensive Too Many Men on Field, 5 yards, enforced at NYG 45 - No Play. "
                       "PENALTY on NYG, Defensive Delay of Game, 5 yards, enforced at MIA 35.",
                       home_team="MIA", away_team="NYG")
        self.assertEqual(result["events"], [{"team": "MIA", "type": "other"},
                                            {"team": "NYG", "type": "delayOfGame"}])

    def test_unknown_team_type_and_acceptance_are_audited(self):
        bad_team = parse("PENALTY on GB-1.Test, Offensive Holding, 10 yards, enforced at KC 20.",
                         home_team="KC", away_team="PHI")
        self.assertEqual(bad_team["events"], [{"team": None, "type": "offensiveHolding"}])
        self.assertEqual(bad_team["unresolved"], 1)
        bad_type = parse("PENALTY on KC-1.Test, Unidentified Infraction, 5 yards, enforced at KC 20.")
        self.assertEqual(bad_type["events"], [{"team": "KC", "type": "other"}])
        self.assertEqual(bad_type["unresolved"], 1)
        unknown = parse("PENALTY on KC-1.Test, Offensive Holding, disposition not recorded.")
        self.assertEqual(unknown["events"], [])
        self.assertEqual(unknown["unresolved"], 1)
        self.assertEqual(parse("")["unresolved"], 1)

    def test_an_unpenalized_play_and_explicit_declined_call_are_not_missing_acceptances(self):
        self.assertEqual(P.parse_penalties({"penalty": "0", "desc": "Pass complete."})["unresolved"], 0)
        declined = P.parse_penalties({"penalty": "0", "desc":
            "Penalty on KC-1.Test, Offensive Holding, declined."})
        self.assertEqual(declined["events"], [])
        self.assertEqual(declined["declined"], 1)
        self.assertEqual(declined["unresolved"], 0)
        timeout = P.parse_penalties({"penalty": "0", "desc":
            "Timeout #1 by CIN at 00:27. Used to avoid time run off due to False Start penalty under 2:00"})
        self.assertEqual(timeout["events"], [])
        self.assertEqual(timeout["unresolved"], 0)
        offsets = parse("Penalty on KC-1.Test, Unnecessary Roughness, offsetting. "
                        "Penalty on PHI-2.Test, Unnecessary Roughness, offsetting.")
        self.assertEqual(offsets["events"], [])
        self.assertEqual(offsets["offsetting"], 2)
        self.assertEqual(offsets["unresolved"], 0)


if __name__ == "__main__":
    unittest.main()
