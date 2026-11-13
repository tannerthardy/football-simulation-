"""Small synthetic guards for the pilot's information boundary and exposure."""
import copy
import importlib.util
import unittest
from pathlib import Path


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).parents[1] / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


P = load('pilot', 'scripts/diag/situation-match-pilot.py')
S = load('summary', 'scripts/diag/situation-match-summary.py')


def play():
    return {'gameId': '1', 'playId': '2', 'playNullifiedByPenalty': 'N', 'isDropback': 'FALSE',
            'qbKneel': 'FALSE', 'qbSpike': 'FALSE', 'rushLocationType': 'INSIDE_LEFT', 'yardsGained': '6',
            'pff_runConceptPrimary': 'OUTSIDE ZONE', 'offenseFormation': 'SINGLEBACK',
            'receiverAlignment': '2x2', 'pff_passCoverage': 'Cover-3', 'down': '1', 'yardsToGo': '10',
            'pff_runPassOption': '0', 'pff_runConceptSecondary': 'NA',
            'yardlineSide': 'OFF', 'possessionTeam': 'OFF', 'defensiveTeam': 'DEF', 'yardlineNumber': '30'}


def nfl():
    return {'status': 'analyzed', 'coverage': {'defenders': 11}, 'ballAtSnap': [40, 26],
            'actors': [{'nflId': 'end', 'side': 'O', 'position': 'TE'}],
            'phases': {'snap': {'actors': {'end': {'position': [-1.5, 31]}}}}}


class SituationPilotTest(unittest.TestCase):
    def test_post_snap_nfl_truth_cannot_enter_native_setup(self):
        p, n = play(), nfl()
        expected = P.native_input(p, n)
        p.update(yardsGained='80', rushLocationType='OUTSIDE_RIGHT', targetX='999', playDescription='SECRET')
        n.update(officialYards=80, carrierId='other', events={'tackle': [999]})
        n['phases']['firstContact'] = {'actors': {'end': {'position': [99, 0]}}}
        self.assertEqual(P.native_input(p, n), expected)
        self.assertEqual(set(expected), {'id', 'down', 'distance', 'los', 'ballY', 'flip'})
        self.assertEqual(expected['los'], 40)

    def test_te_side_uses_only_known_snap_picture(self):
        self.assertTrue(P.native_input(play(), nfl())['flip'])
        n = nfl()
        n['phases']['snap']['actors']['end']['position'] = [-1, 21]
        self.assertFalse(P.native_input(play(), n)['flip'])
        n['phases']['snap']['actors']['end']['position'] = None
        with self.assertRaises(ValueError):
            P.native_input(play(), n)

    def test_unknown_motion_is_not_no_motion(self):
        annotation = {'listedPersonnel': P.NOMINAL_11, 'carrierPosition': 'RB',
                      'motion': {f: {'class': 'negativeAll11Known'} for f in ('inMotionAtBallSnap', 'shiftSinceLineset')}}
        self.assertTrue(P.qualifies(play(), annotation, {'week': '1'}))
        annotation['motion']['inMotionAtBallSnap']['class'] = 'unknownOrIncomplete'
        self.assertFalse(P.qualifies(play(), annotation, {'week': '1'}))

    def test_fixed_snap_identity_does_not_select_an_arriving_replacement(self):
        snap = {'a': {'side': 'D', 'pos': [4, 26], 'vel': [0, 0], 'position': 'LB'},
                'b': {'side': 'D', 'pos': [12, 26], 'vel': [0, 0], 'position': 'S'}}
        later = copy.deepcopy(snap)
        later['a']['pos'] = [9, 28]
        later['b']['pos'] = [4, 26]
        m = S.measure(snap, {'1': later}, 26)
        self.assertEqual(m['groupIds']['secondLevel'], ['a'])
        self.assertEqual(m['phases']['1']['secondLevel']['meanAbsoluteLateralDisplacement'], 2)
        later['a']['pos'] = None
        m = S.measure(snap, {'1': later, '2': None}, 26)
        self.assertIsNone(m['phases']['1']['secondLevel']['meanAbsoluteLateralDisplacement'])
        self.assertEqual(m['phases']['2']['secondLevel']['observed'], 0)
        self.assertIsNone(m['phases']['2']['secondLevel']['meanAbsoluteLateralSpeed'])

    def test_native_ol_aliases_and_ended_samples(self):
        actors = [{'id': str(i), 'side': 'O', 'slot': slot, 'position': pos, 'pos': [-1, 25 + i], 'vel': [0, 0]}
                  for i, (slot, pos) in enumerate([('LT', 'OT'), ('LG', 'OG'), ('C', 'C'), ('RG', 'OG'), ('RT', 'OT')])]
        r = {'case': {'id': 'x', 'ballY': 26}, 'run': 'oz_weak', 'seed': 1,
             'phases': {'0': {'live': True, 'actors': actors}, '1': {'live': False, 'actors': actors}},
             'result': {'outcome': 'tackle', 'yards': 0, 'events': [], 'stats': {}}}
        m = S.native_metrics(r)
        self.assertEqual(m['counts']['ol'], 5)
        self.assertIsNone(m['phases']['1']['ol']['meanDepth'])


if __name__ == '__main__':
    unittest.main()
