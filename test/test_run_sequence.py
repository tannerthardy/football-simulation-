"""Evidence-meaning controls for the bounded run-sequence query; zero simulations."""
import importlib.util
import argparse
import copy
import csv
import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('run_sequence', ROOT / 'scripts/diag/trench/run-sequence.py')
query = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(query)
NATIVE_SPEC = importlib.util.spec_from_file_location('native_run_sequence', ROOT / 'scripts/diag/trench/native-run-sequence.py')
native = importlib.util.module_from_spec(NATIVE_SPEC)
NATIVE_SPEC.loader.exec_module(native)


def fixture(terminal=15, last=20, contact=10):
    positions = {'101': 'QB', '102': 'RB', '103': 'T', '104': 'G', '105': 'C',
                 '106': 'G', '107': 'T', '108': 'TE', '109': 'WR', '110': 'WR', '111': 'FB'}
    positions.update({str(i): 'DT' if i < 205 else 'LB' if i < 208 else 'CB' for i in range(201, 212)})
    rows = []
    for f in range(last + 1):
        event = 'ball_snap' if f == 0 else 'handoff' if f == 2 else 'first_contact' if f == contact else 'tackle' if f == terminal else 'NA'
        for i in list(positions) + ['football']:
            offense = i in positions and int(i) < 200
            x = (40 + .6*f if i == '102' else 41 if i == '101' else 44.5 if offense else 46 if i == 'football' else 46 + .3*(int(i)-201))
            if i == 'football':
                x = 45
            rows.append({'gameId': '1', 'playId': '2', 'nflId': 'NA' if i == 'football' else i,
                         'frameId': str(f), 'frameType': 'SNAP' if f == 0 else 'AFTER_SNAP',
                         'event': event, 'club': 'football' if i == 'football' else 'OFF' if offense else 'DEF',
                         'playDirection': 'right', 'x': str(x), 'y': '26', 's': '8' if i == '102' else '1',
                         'dir': '90', 'o': '90'})
    play = {'possessionTeam': 'OFF', 'yardsGained': '4', 'pff_runConceptPrimary': 'OUTSIDE ZONE',
            'rushLocationType': 'OUTSIDE_RIGHT', 'playNullifiedByPenalty': 'N',
            'isDropback': 'FALSE', 'qbKneel': '0', 'qbSpike': '0'}
    return rows, play, positions


def native_fixture():
    people = [{'id': 'O-QB', 'position': 'QB'}, {'id': 'O-RB', 'position': 'RB'},
              {'id': 'O-LT', 'position': 'OT'}, {'id': 'D-LB', 'position': 'LB'}]
    slots = ['QB', 'RB', 'LT', 'LB_M']
    def bodies(k):
        return [{'pos': {'x': x + (.4*k if i == 1 else 0), 'y': 20},
                 'vel': {'x': 8 if i == 1 else 0, 'y': 0}, 'facing': 0,
                 'energy': 1, 'support': {'state': 'up'}}
                for i, x in enumerate([38, 39, 39.5, 41])]
    commands = [{'vel': {'x': 0, 'y': 0}, 'facing': 0} for _ in people]
    ticks = [{'t': round(k*.05, 8), 'completed': round((k+1)*.05, 8),
              'before': bodies(k), 'after': bodies(k+1), 'requests': commands, 'intents': commands,
              'reps': [{'b': 2, 'd': 3, 'normal': 1, 'tangent': 0}],
              'contacts': [{'i': 1, 'j': 2 if k == 0 else 3, 'impulse': 1}]} for k in range(3)]
    return {'id': 'unit-native', 'inputSha256': 'fixed-unit-input', 'source': 'unit-source',
            'flags': {'GAIT_STEP': '0'}, 'node': 'v22.23.3', 'phase': 'dead', 'outcome': 'tackle', 'gain': .2,
            'initial': [{'idx': i, 'slot': s, 'player': p, 'profile': {'mass': 100},
                         'pos': bodies(0)[i]['pos'], 'behavior': 'installed-unit-role'} for i, (s, p) in enumerate(zip(slots, people))],
            'setup': {'offense': dict(zip(slots[:3], people[:3])), 'defense': {'LB_M': people[3]},
                      'los': 40, 'ballY': 20, 'offCall': {'kind': 'run'}, 'defCall': {'front': 'unit'}, 'seed': 1},
            'ticks': ticks,
            'events': [{'t': 0, 'type': 'handoff', 'a': 0, 'b': 1},
                       {'t': .05, 'type': 'carrier_contact', 'a': 1, 'b': 3},
                       {'t': .05, 'type': 'tackle_wrap', 'a': 3, 'b': 1},
                       {'t': .1, 'type': 'tackle', 'a': 3, 'b': 1}],
            'result': {'stats': {'rusher': 'O-RB'}, 'duration': .15}}


class RunSequenceMeaningTest(unittest.TestCase):
    def analyze(self, rows=None, terminal=15, last=20, contact=10):
        generated, play, positions = fixture(terminal, last, contact)
        return query.analyze_play(generated if rows is None else rows, play, positions, '102')

    def test_zero_coordinate_and_stored_velocity_are_not_missing(self):
        row = {'x': '0', 'y': '0', 's': '8', 'dir': '90', 'o': '20', 'playDirection': 'right'}
        m = query.motion(row)
        self.assertEqual(m['position'], [0, 0])
        self.assertAlmostEqual(m['velocity'][0], 8)
        self.assertEqual(m['speed'], 8)

    def test_left_rotation_changes_both_position_and_velocity(self):
        m = query.motion({'x': '110', 'y': '10', 's': '6', 'dir': '90', 'playDirection': 'left'}, los=10)
        self.assertEqual(m['position'][0], 0)
        self.assertAlmostEqual(m['position'][1], 160/3-10)
        self.assertAlmostEqual(m['velocity'][0], -6)

    def test_unknown_velocity_stays_unknown(self):
        m = query.motion({'x': '0', 'y': '1', 's': 'NA', 'dir': 'NA', 'playDirection': 'right'})
        self.assertEqual(m['position'], [0, 1])
        self.assertIsNone(m['velocity'])
        self.assertIsNone(query.motion(None)['position'])

    def test_interposition_is_signed_and_is_not_an_engagement_label(self):
        a = query.interposition((1, 0), (0, 0), (3, 0))
        b = query.interposition((-1, 0), (0, 0), (3, 0))
        self.assertEqual(a['state'], 'geometrically_interposed')
        self.assertEqual(b['state'], 'near_not_interposed')
        self.assertNotIn('engaged', a)

    def test_missing_frame_interrupts_episode_without_proving_release(self):
        samples = [{'frameId': f, 'distance': d} for f, d in [(0, .5), (1, .5), (2, None), (3, .5), (4, .5)]]
        episodes = query.proximity_episodes(samples)
        self.assertEqual(len(episodes), 2)
        self.assertEqual(episodes[0]['endReason'], 'unknown_missing_sample')
        self.assertEqual(episodes[1]['endReason'], 'recording_censor')

    def test_observed_separation_is_distinct_from_terminal_bound(self):
        samples = [{'frameId': f, 'distance': d} for f, d in [(0, .5), (1, .5), (2, 2)]]
        self.assertEqual(query.proximity_episodes(samples)[0]['endReason'], 'observed_separation')
        self.assertEqual(query.proximity_episodes(samples[:2], ending='known_terminal')[0]['endReason'], 'known_terminal')

    def test_early_terminal_defensive_win_is_retained_without_los(self):
        p = self.analyze(terminal=4, last=12)
        self.assertEqual(p['status'], 'analyzed')
        self.assertTrue(p['coverage']['knownEnding'])
        self.assertIsNone(p['phases']['firstLOS'])
        self.assertEqual(p['ending']['knownFrameId'], 4)

    def test_recording_cutoff_is_not_known_ending(self):
        p = self.analyze(terminal=None, last=12)
        self.assertEqual(p['ending']['state'], 'recording_censor')
        self.assertIsNone(p['contact']['contactToKnownEndingSeconds'])

    def test_pre_exchange_los_observation_is_not_runner_arrival(self):
        rows, _, _ = fixture()
        for r in rows:
            if r['event'] == 'handoff':
                r['event'] = 'NA'
            if r['frameId'] == '12':
                r['event'] = 'handoff'
        p = self.analyze(rows)
        self.assertEqual(p['rawFirstLOSFrameId'], 9)
        self.assertEqual(p['phases']['firstLOS']['frameId'], 12)
        self.assertTrue(all(r['firstFrameId'] is None or r['firstFrameId'] >= 12 for r in p['runnerArrivals'].values()))

    def test_fumble_stops_fixed_runner_followup_without_inventing_end(self):
        rows, _, _ = fixture()
        for r in rows:
            if r['frameId'] == '11':
                r['event'] = 'fumble'
        p = self.analyze(rows)
        self.assertEqual(p['analysisBoundary'], 'possession_censor')
        self.assertEqual(p['analysisThroughFrameId'], 11)
        self.assertIsNone(p['contact']['contactToKnownEndingSeconds'])
        self.assertIsNone(p['contact']['post0p3']['speed'])
        self.assertEqual(p['ending']['knownFrameId'], 15)

    def test_multiple_terminal_frames_remain_ambiguous(self):
        rows, _, _ = fixture()
        for r in rows:
            if r['frameId'] == '14':
                r['event'] = 'out_of_bounds'
        p = self.analyze(rows)
        self.assertEqual(p['ending']['state'], 'ambiguous_terminal')
        self.assertIsNone(p['phases']['knownEnd'])

    def test_contact_entry_uses_only_strictly_prior_stored_speed(self):
        rows, _, _ = fixture()
        for r in rows:
            if r['nflId'] == '102' and int(r['frameId']) >= 10:
                r['s'] = '0.25'
        p = self.analyze(rows)
        self.assertEqual(p['contact']['strictlyPreContact']['frameId'], 9)
        self.assertEqual(p['contact']['strictlyPreContact']['speed'], 8)
        self.assertEqual(p['contact']['post0p3']['speed'], .25)

    def test_post_contact_horizon_retains_short_ending(self):
        p = self.analyze(terminal=12)
        self.assertEqual(p['contact']['post0p3']['state'], 'earlier_known_terminal')
        self.assertIsNone(p['contact']['post0p3']['speed'])

    def test_missing_samples_are_not_carried_forward(self):
        rows, _, _ = fixture()
        rows = [r for r in rows if not (r['nflId'] == '201' and int(r['frameId']) == 10)]
        p = self.analyze(rows)
        self.assertIsNone(p['phases']['firstContact']['actors']['201']['position'])
        self.assertEqual(p['sampleValidity']['201']['counts']['missing_sample'], 1)

    def test_unknown_arrival_geometry_does_not_become_failed_interposition(self):
        rows, _, positions = fixture()
        blockers = {i for i, p in positions.items() if int(i) < 200 and p not in {'QB', 'RB'}}
        rows = [r for r in rows if not (r['nflId'] in blockers and int(r['frameId']) > 2)]
        p = self.analyze(rows)
        cell = query.summarize([p])['byProviderConcept']['OUTSIDE ZONE']
        self.assertGreater(cell['arrivalGeometryExposure']['incompleteOrUnknownDefenderArrivals'], 0)
        self.assertEqual(cell['playFractionFullyObservedArrivalDefendersWithAnyGeometricInterposition']['n'], 0)

    def test_clock_phase_after_known_end_remains_unavailable(self):
        p = self.analyze(terminal=4, last=20)
        self.assertIsNone(p['phases']['snapPlus0p5'])
        self.assertEqual(p['phaseAvailability']['snapPlus0p5']['state'], 'after_known_terminal')

    def test_pair_identities_remain_fixed_when_nearest_defender_changes(self):
        p = self.analyze()
        pairs = [(q['blockerId'], q['defenderId']) for q in p['candidatePairs']]
        self.assertEqual(len(pairs), len(set(pairs)))
        self.assertEqual(set(p['pursuit']), {str(i) for i in range(201, 212)})
        self.assertTrue(all('101' != b and '102' != b for b, _ in pairs))

    def test_conflicting_duplicate_removes_sample_instead_of_choosing_winner(self):
        rows, _, _ = fixture()
        original = next(r for r in rows if r['nflId'] == '201' and r['frameId'] == '10')
        rows.append({**original, 'x': '99'})
        p = self.analyze(rows)
        self.assertEqual(p['issues']['conflicting_duplicate_rows'], 1)
        self.assertIsNone(p['phases']['firstContact']['actors']['201']['position'])

    def test_corrupt_source_is_rejected_before_measurement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            files = ['plays.csv', 'players.csv', 'player_play.csv', 'tracking_week_1.csv']
            for name in files:
                (root/name).write_text('verified')
            pins = [query.file_pin(root/name) for name in files]
            selection = {'plays': [{'week': 1}], 'sources': pins}
            (root/'players.csv').write_text('changed')
            with self.assertRaisesRegex(ValueError, 'checksum/size mismatch'):
                query.verify_sources(root, selection)

    def test_real_cli_streams_verified_fixture_and_reports_actual_exposure(self):
        rows, play, positions = fixture()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            payloads = {'tracking_week_1.csv': rows,
                        'players.csv': [{'nflId': i, 'position': p} for i, p in positions.items()],
                        'plays.csv': [{'gameId': '1', 'playId': '2', **play}],
                        'player_play.csv': [{'gameId': '1', 'playId': '2', 'nflId': '102', 'hadRushAttempt': '1'}]}
            for name, values in payloads.items():
                with (root/name).open('w', newline='') as handle:
                    writer = csv.DictWriter(handle, fieldnames=list(values[0]))
                    writer.writeheader()
                    writer.writerows(values)
            selection = {'plays': [{'gameId': '1', 'playId': '2', 'week': 1}],
                         'sources': [query.file_pin(root/name) for name in payloads]}
            (root/'selection.json').write_text(json.dumps(selection))
            result = subprocess.run([sys.executable, '-I', str(ROOT/'scripts/diag/trench/run-sequence.py'),
                                     '--nfl-dir', str(root), '--selection', str(root/'selection.json'),
                                     '--out', str(root/'result.json')], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            measured = json.loads((root/'result.json').read_text())
            self.assertEqual(measured['measured'], 1)
            self.assertEqual(measured['trackingGroupsAttempted'], 1)
            self.assertEqual(measured['plays'][0]['carrierId'], '102')

    def test_missing_input_cli_retains_unrun_selection(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)/'blocked.json'
            result = subprocess.run([sys.executable, '-I', str(ROOT/'scripts/diag/trench/run-sequence.py'),
                                     '--nfl-dir', str(Path(tmp)/'missing'),
                                     '--selection', str(ROOT/'config/run-sequence-reference.json'),
                                     '--out', str(output)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            receipt = json.loads(output.read_text())
            self.assertEqual(receipt['measured'], 0)
            self.assertEqual(receipt['requested'], 12)
            self.assertTrue(all(p['status'] == 'unrun' for p in receipt['plays']))


class NativeRunSequenceMeaningTest(unittest.TestCase):
    def analyze(self, value):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'trace.json'
            path.write_text(json.dumps(value))
            return native.analyze_native(path)

    def test_body_time_and_contact_entry_remain_distinct(self):
        result = self.analyze(native_fixture())
        self.assertEqual(result['nativeEvents']['firstCarrierContact']['interval'], [.05, .1])
        self.assertEqual(result['phases']['firstCarrierContact']['time'], .1)
        self.assertEqual(result['contactMotion']['preIntervalTime'], .05)
        self.assertEqual(result['contactMotion']['preVelocity'], [8, 0])

    def test_teammate_collision_does_not_become_opponent_contact(self):
        result = self.analyze(native_fixture())
        self.assertEqual(result['nativeEvents']['firstPositiveBodyImpulseOnRunner']['otherSide'], 'O')
        self.assertEqual(result['nativeEvents']['firstPositiveOpponentBodyImpulseOnRunner']['otherId'], 'D-LB')

    def test_live_prefix_has_no_credited_ending_or_complete_hold_claim(self):
        value = native_fixture()
        value['phase'] = 'live'
        result = self.analyze(value)
        self.assertFalse(result['ending']['known'])
        self.assertIsNone(result['ending']['reportedGain'])
        self.assertIsNone(result['contactMotion']['contactToKnownEndingSecondsBounds'])

    def test_missing_rng_is_reported_unknown(self):
        result = self.analyze(native_fixture())
        self.assertFalse(result['capturedChannels']['rng'])
        self.assertNotIn('installedBehavior', result['identities']['O-RB'])

    def test_changed_flags_reject_pair_before_interpreting_delta(self):
        before, after = native_fixture(), native_fixture()
        after['flags']['GAIT_STEP'] = '0.5'
        with tempfile.TemporaryDirectory() as tmp:
            a, b = Path(tmp)/'a.json', Path(tmp)/'b.json'
            a.write_text(json.dumps(before)); b.write_text(json.dumps(after))
            with self.assertRaisesRegex(ValueError, 'flags'):
                native.compare_native(a, b)


if __name__ == '__main__':
    unittest.main()
