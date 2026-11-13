#!/usr/bin/env python3
"""Verify the saved keeper-based combination increment without resimulation.

Default checks immutable evidence, full initial projections, real hand ownership,
delivered OL budgets, adverse results and fixed films. --engine additionally
checks current source/tools/pointers and reverses the exact increment patch.
The balanced input panel is diagnostic, not an NFL outcome-rate sample.
"""
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = HERE.parent / 'zone-reach'
BEFORE = 'cf53e3f0e72915d9798ed0cd411f669ae8bba40db9ed4bd9f6b630173f939316'
AFTER = 'ff641a802030edddaa1eac42b8d0991b4cba43dd9f4fa0f3ef45ee3dd3bcfbac'
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
COLLECTOR = '1e6180d476b3a8ff5476badcf02309cf8706adcf0e954d9e475c4cce5f3685f6'
COMPARATOR = 'fed54abaf570205301bd588b0066dadee653c6712b34dc250d7e1aa6138475ea'
RUNS = ['iz_strong', 'oz_strong', 'wz_strong', 'power', 'counter', 'trap', 'duo', 'split_zone']
FRONTS = ['over', 'under', 'odd', 'tite', 'bear']
OL = ('LT', 'LG', 'C', 'RG', 'RT')
FILM_INPUTS = [('iz_strong', 'over', 3), ('power', 'under', 3),
               ('counter', 'odd', 11), ('duo', 'odd', 11), ('split_zone', 'tite', 3)]
FILM_IDS = [f'CT-R1-{run}-{front}-{side}-S{seed}'
            for run, front, seed in FILM_INPUTS for side in ('R', 'L')]
SUPPLEMENTAL_IDS = ['CT-R2-oz_strong-over-L-S11', 'CT-R2-power-over-R-S3']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    with gzip.open(path, 'rt') if path.suffix == '.gz' else path.open() as stream:
        return json.load(stream, parse_constant=lambda token: (_ for _ in ()).throw(
            ValueError(f'Nonfinite JSON number: {token}')))


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for item in value.values():
            finite(item)
    elif isinstance(value, list):
        for item in value:
            finite(item)


def close(a, b):
    assert abs(a - b) < 1e-8, (a, b)


def source_pin(report, expected):
    assert report['sourceBefore'] == report['sourceAfter'] == expected


def member_engagement(rows, slot=None, defender=None):
    return next(row['engagement'] for row in rows if row['engagement'] and
                (slot is None or row['slot'] == slot) and
                (defender is None or row['engagement']['defender'] == defender))


def native_transfers(trial, current):
    """Bind every event to a real prior keeper joint and the next solved joint.

    Hand-object IDs are per-play WeakMap IDs; a surviving hand load is not
    inferred from an OL impulse, which also includes other contacts/strikes.
    """
    output = []
    slots = [player['slot'] for player in trial['initialProjection']['players']]
    for row in trial['updates']:
        for event in row['events']:
            if event['type'] != 'block_climb':
                continue
            combo = row['beforeBody']['plan']['combination']
            assert combo and not combo['released'] and row['oldCombinationAfter']['released']
            old = member_engagement(row['before'], defender=combo['defender'])
            new = member_engagement(row['after'], defender=combo['defender'])
            keeper, climber, defender = new['blocker'], slots[event['a']], combo['defender']
            assert keeper != climber and {keeper, climber} == set(combo['members'])
            assert slots[event['b']] == combo['backer'] and event['t'] == row['t']
            prior = next(member for member in old['members'] if member['slot'] == keeper)
            j0, j1 = prior['hands'], new['hands']
            solved = member_engagement(row['afterSolvedOwnership'], slot=keeper)
            j2 = solved['hands']
            continuity = bool(j0 and j1 and j2 and j0['id'] == j1['id'] == j2['id'])
            assert old['control'] == new['control']
            assert old['axis'] == new['axis']
            if old['drive'] != new['drive']:
                # The same ordinary update can read solo OZ/WZ after the
                # transfer. Its movement intention may change while the
                # acquired contact axis and existing hands remain intact.
                zone = row['afterBody']['plan']['zoneRead']
                assert trial['run'] in ('oz_strong', 'wz_strong')
                assert row['observer'] == keeper and zone and zone['t'] == row['t']
                assert new['drive'] == zone['drive']
                assert zone['seen'] in [image['image'] for image in row['consumedImages'] if image['target'] == defender]
            assert old['start'] == new['start'] and old['contactReported'] == new['contactReported']
            assert row['completedAt'] > row['t']
            backer = next(image['image'] for image in row['consumedImages'] if image['target'] == combo['backer'])
            runner = next(image['image'] for image in row['consumedImages'] if image['target'] == 'RB')
            observer = row['beforeBody']['pos']
            assert math.hypot(backer['pos']['x'] - observer['x'], backer['pos']['y'] - observer['y']) < 4.2 or runner['pos']['x'] > 37.2
            assert backer['age'] >= 0 and runner['age'] >= 0
            assert combo['secureSince'] >= 0 and row['t'] - combo['secureSince'] >= .15 - 1e-9
            assert old['baseB'] > .60 and abs(old['phi']) < .55 and old['control'] > -.18
            keeper_plan = next(m['plan'] for m in row['after'] if m['slot'] == keeper)
            climber_plan = next(m['plan'] for m in row['after'] if m['slot'] == climber)
            immediate_retarget = climber_plan['kind'] != 'climb' or climber_plan['target'] != combo['backer']
            if immediate_retarget:
                # Older work-search rules can already retarget the released
                # climber later in this same controller update. Preserve this
                # diagnostic instead of claiming every event executes a
                # second-level assignment successfully.
                assert current and row['observer'] == climber and climber_plan['kind'] == 'down'
                assert climber_plan['retarget'] > row['t']
                assert any(image['target'] == climber_plan['target'] for image in row['consumedImages'])
            else:
                assert climber_plan['drive'] == {'x': 1, 'y': 0}
            assert keeper_plan['combination'] is None and climber_plan['combination'] is None
            assert new['helpers'] == [] and keeper_plan['target'] == defender
            promoted = keeper != old['blocker']
            if current:
                assert j0 and j0['live'] and j0['a'] == keeper and j0['b'] == defender
                assert j0['kind'] == 'hands' and prior['supportAvailability'] > .60
                assert not prior['down'] and abs(prior['surfacePhi']) < .65
                assert continuity and j1['live'] and j2['live']
                assert j0 == j1, (trial['id'], row['t'], 'controller changed hand state')
                close(new['phi'], prior['surfacePhi'])
                if promoted:
                    assert prior['helperSupport'] >= .25
                    assert all(h['slot'] != keeper for h in new['helperHands'])
                # Recompute the ordinary two-member choice from its consumed
                # linebacker image and actual admissible keeper capabilities.
                candidates = []
                for candidate_climber in combo['members']:
                    candidate_keeper = next(slot for slot in combo['members'] if slot != candidate_climber)
                    keeper_state = next(m for m in old['members'] if m['slot'] == candidate_keeper)
                    climber_state = next(m for m in old['members'] if m['slot'] == candidate_climber)
                    joint = keeper_state['hands']
                    valid = not keeper_state['down'] and abs(keeper_state['surfacePhi']) < .65
                    valid &= keeper_state['supportAvailability'] > .60
                    valid &= bool(joint and joint['live'] and joint['a'] == candidate_keeper and joint['b'] == defender)
                    valid &= candidate_keeper == old['blocker'] or keeper_state['helperSupport'] >= .25
                    if valid:
                        position = climber_state['position']
                        cost = math.hypot(backer['pos']['x'] - position['x'], backer['pos']['y'] - position['y'])
                        cost += .30 if candidate_climber == old['blocker'] else 0
                        candidates.append((cost, candidate_climber))
                assert candidates and min(candidates, key=lambda candidate: candidate[0])[1] == climber
                for key in ('pos', 'vel', 'facing', 'stance', 'support', 'energy'):
                    assert row['beforeBody'][key] == row['afterBody'][key]
            load = next((load for load in row['deliveredStep'] if load['slot'] == keeper), None)
            positive = bool(j2 and abs(j2['normalForce']) + abs(j2['tangentForce']) > 1e-9)
            record = {'id': trial['id'], 't': row['t'], 'keeper': keeper, 'climber': climber,
                      'defender': defender, 'promoted': promoted, 'continuity': continuity,
                      'nativeLoaded': positive, 'hasOLDeliveredLoad': load is not None,
                      'immediateClimberRetarget': immediate_retarget}
            if load:
                assert keeper in OL
                pair = [j for j in load['liveHandsAfterPhysics'] if {j['a'], j['b']} == {keeper, defender}]
                assert any(j['id'] == j2['id'] for j in pair)
                record['positiveOLArmImpulse'] = load['armImpulse'] > 1e-9
            output.append(record)
    assert len(output) == trial['earnedClimbs']
    return output


def panel_audit(panel, expected, current):
    source_pin(panel, expected)
    assert panel['schema'] == 'combo-transfer-review-v1'
    assert panel['moduleSha256']['src/physics/world.ts'] == WORLD
    assert panel['summary']['snaps'] == panel['summary']['observerVerifiedCount'] == 160
    assert panel['summary']['naturalEnds'] == 160 and panel['summary']['censors'] == 0
    assert len(panel['trials']) == len({t['id'] for t in panel['trials']}) == 160
    expected_inputs = {(run, front, flip, seed) for run in RUNS for front in FRONTS
                       for flip in (False, True) for seed in (3, 11)}
    assert {(t['run'], t['front'], t['flip'], t['seed']) for t in panel['trials']} == expected_inputs
    assert panel['filmIds'] == FILM_IDS
    assert [t['id'] for t in panel['supplementalTrials']] == SUPPLEMENTAL_IDS
    limits = dict(armImpulseExcess=0., armWorkExcess=0., supportMotorWorkExcess=0., groundTractionExcess=0.)
    tick_keys, all_transfers, ordinary_transfers = set(), [], []
    reads = collections.Counter()
    for trial in panel['trials'] + panel['supplementalTrials']:
        finite(trial)
        assert trial['supplemental'] == (trial['id'] in SUPPLEMENTAL_IDS)
        assert trial['roster'] == (1 if trial['supplemental'] else 0)
        assert trial['formation'] == ('gun_wing_12' if trial['run'] == 'split_zone' else 'ace_11')
        assert trial['observerVerified'] and trial['observedSignature'] == trial['plainSignature']
        assert trial['naturalEnd'] and trial['result']['outcome'] != 'timeout'
        assert trial['maxMomentumResidual'] < 1e-7 and trial['maxWorkResidual'] < 1e-7
        assert trial['maxMotorWorkExcess'] == trial['staleMemberUpdates'] == trial['staleOLMemberUpdates'] == 0
        transfers = native_transfers(trial, current)
        all_transfers.extend(transfers)
        if not trial['supplemental']:
            ordinary_transfers.extend(transfers)
        for row in trial['updates']:
            combo = row['beforeBody']['plan']['combination']
            after_combo = row['oldCombinationAfter']
            e = row['beforeBody']['engagement']
            if (not trial['supplemental'] and combo and not combo['released'] and after_combo
                    and after_combo['nextRead'] != combo['nextRead'] and e and e['defender'] == combo['defender']):
                reads['actualCombinationReads'] += 1
                helpers = [m for m in e['members'] if m['slot'] in e['helpers']]
                weak = any(m['helperSupport'] < .25 for m in helpers)
                reads['weakHelperReads'] += weak
                secure = e['control'] > -.06 and e['baseB'] > .60 and abs(e['phi']) < .55
                reads['weakHelperReadsWithConservativelySecurePrimary'] += weak and secure
            key = (trial['id'], row['t'])
            if key in tick_keys:
                continue
            tick_keys.add(key)
            for load in row['deliveredStep']:
                assert load['slot'] in OL
                for value, limit in (('armImpulse', 'armImpulseLimit'), ('armWork', 'armWorkLimit'),
                                     ('supportMotorWork', 'supportMotorWorkLimit')):
                    excess = load[value] - load[limit]
                    assert excess < 1e-7
                    limits[value + 'Excess'] = max(limits[value + 'Excess'], excess)
                ground = load['groundImpulse']
                excess = math.hypot(ground['x'], ground['y']) - load['groundTractionLimit']
                assert excess < 1e-7
                limits['groundTractionExcess'] = max(limits['groundTractionExcess'], excess)
    return {'ordinary': ordinary_transfers, 'supplemental': [r for r in all_transfers if r['id'] in SUPPLEMENTAL_IDS],
            'limits': {'observedNativeTicks': len(tick_keys), **limits}, 'reads': dict(reads)}


def audit():
    panels = [load(HERE / f'{phase}.json.gz') for phase in ('before', 'after')]
    audits = [panel_audit(p, pin, i == 1) for i, (p, pin) in enumerate(zip(panels, (BEFORE, AFTER)))]
    assert panels[0]['cohort'] == panels[1]['cohort']
    assert panels[0]['collectorSha256'] == panels[1]['collectorSha256'] == COLLECTOR
    cohort = panels[0]['cohort']
    assert cohort['runs'] == RUNS and cohort['fronts'] == FRONTS
    assert cohort['playSeeds'] == [3, 11] and cohort['flips'] == [False, True]
    assert cohort['generatedRosterPairs'] == [[31, 32], [41, 42]]
    assert cohort['pooledRosterPair'] == [31, 32] and cohort['supplementalRosterPair'] == [41, 42]
    assert cohort['strength'] == .55 and cohort['coverage'] == 'cover3' and cohort['pressure'] is None
    assert cohort['inputCohort'] == 'balanced-160-plus-two-recovery-witnesses'
    initial_matches = exact = 0
    for old, new in zip(*(p['trials'] + p['supplementalTrials'] for p in panels)):
        assert all(old[k] == new[k] for k in ('id', 'roster', 'run', 'front', 'flip', 'seed', 'supplemental', 'formation', 'profileSha256'))
        assert old['initialProjection'] == new['initialProjection'] and old['initialSha256'] == new['initialSha256']
        initial_matches += 1
        if not old['supplemental']:
            exact += old['observedSignature'] == new['observedSignature']
    assert initial_matches == 162
    # Recompute the earlier witness audit from its original native film. Its
    # rounded actual backer position is not mislabeled as a consumed image.
    saved_audit = load(HERE / 'saved-audit.json')
    assert saved_audit['source'] == BEFORE and saved_audit['schema'] == 'saved-combo-audit-v1'
    audit_input = ROOT / saved_audit['input']
    assert sha(audit_input) == saved_audit['inputSha256']
    old_films = {play['id']: play for play in load(audit_input)['plays']}
    veto_count = unseen_count = 0
    veto_jobs = set()
    for record in saved_audit['rows']:
        play = old_films[record['play']]
        tick = next(tick for tick in play['trace'] if tick['t'] == record['t'])
        update = next(update for update in tick['updates'] if update['observer'] == record['observer'])
        e = update['beforeBody']['engagement']
        bodies = {body['slot']: body for body in tick['before']}
        bodies.update({u['observer']: u['beforeBody'] for u in tick['updates'] if u['observer'] not in bodies})
        keeper = bodies[e['blocker']]
        profile = next(player['profile'] for player in play['players'] if player['slot'] == e['blocker'])
        flat = .11 + .05 * profile['balance'] + .04 * max(0, min(1, (profile['massKg'] - 90) / 60))
        flat *= .75 + .5 * max(0, min(1, keeper['support']['posture']))
        xi = math.hypot(keeper['support']['xi']['x'], keeper['support']['xi']['y'])
        good = e['control'] > -.066 and abs(e['phi']) < .55 and keeper['support']['state'] == 'up' and xi <= flat
        axis = e['surfaceAxis'] or {'x': -e['drive']['x'], 'y': -e['drive']['y']}
        d = update['targetGeometry']['actualPosition']
        weak = False
        for helper in e['helpers']:
            h = bodies[helper]['pos']
            dx, dy = h['x'] - d['x'], h['y'] - d['y']
            angle = max(0, min(1, (dx * axis['x'] + dy * axis['y']) / (math.hypot(dx, dy) or 1)))
            weak |= angle < .25
        assert record['primaryGoodConservative'] == good
        assert record['helperVetoWhilePrimaryGood'] == (good and weak)
        assert record['consumedTargets'] == [image['target'] for image in update['consumedImages']]
        if good and weak:
            veto_count += 1
            unseen_count += record['combo']['backer'] not in record['consumedTargets']
            veto_jobs.add((record['play'], record['combo']['id']))
    assert len(saved_audit['rows']) == 115 and veto_count == 61 and unseen_count == 60 and len(veto_jobs) == 7
    assert saved_audit['totals'] == {'readRowsBothAttached': 115, 'helperVetoWhilePrimaryGood': 61,
                                  'combosWithVeto': 7, 'vetoRowsWithoutBackerRead': 60}
    comparison = load(HERE / 'comparison.json')
    assert comparison['schema'] == 'combo-transfer-comparison-v1'
    assert comparison['sources'] == {'before': BEFORE, 'after': AFTER}
    assert comparison['comparisonSha256'] == COMPARATOR
    assert comparison['collectorSha256'] == panels[0]['collectorSha256'] and comparison['cohort'] == cohort
    assert comparison['initialProjectionsMatch'] and comparison['identicalCompleteExecutions'] == exact
    assert comparison['fixedFilmIds'] == FILM_IDS
    for name, pin in comparison['inputs'].items():
        assert sha(ROOT / name) == pin, name
    by_id = [{t['id']: t for t in p['trials'] + p['supplementalTrials']} for p in panels]
    for group, records in (('ordinary', comparison['pairedResults']), ('supplemental', comparison['pairedSupplementalResults'])):
        expected = panels[0]['trials'] if group == 'ordinary' else panels[0]['supplementalTrials']
        assert [r['id'] for r in records] == [t['id'] for t in expected]
        for record in records:
            old, new = [lookup[record['id']] for lookup in by_id]
            assert record['beforeYards'] == old['result']['offenseYards'] and record['afterYards'] == new['result']['offenseYards']
            close(record['yardsDelta'], record['afterYards'] - record['beforeYards'])
            assert record['beforeClimbs'] == old['earnedClimbs'] and record['afterClimbs'] == new['earnedClimbs']
            assert record['identicalCompleteExecution'] == (old['observedSignature'] == new['observedSignature'])
    assert comparison['adverse2YardPairs'] == [r for r in comparison['pairedResults'] if r['yardsDelta'] <= -2]
    assert comparison['beneficial2YardPairs'] == [r for r in comparison['pairedResults'] if r['yardsDelta'] >= 2]
    assert comparison['supplementalAdverse2YardPairs'] == [r for r in comparison['pairedSupplementalResults'] if r['yardsDelta'] <= -2]
    for phase, panel, native in zip(('before', 'after'), panels, audits):
        trials = panel['trials']
        records = native['ordinary']
        values = comparison['ordinary'][phase]
        assert values['snaps'] == values['observerPlainMatches'] == values['naturalEnds'] == 160
        close(values['meanYards'], sum(t['result']['offenseYards'] for t in trials) / 160)
        assert values['stuffs'] == sum(t['result']['offenseYards'] <= 0 for t in trials)
        assert values['earnedClimbs'] == values['nativeTransferRecords'] == len(records)
        assert values['promotedHelperRecords'] == sum(r['promoted'] for r in records)
        assert values['sameKeeperJointAfterSolve'] == sum(r['continuity'] for r in records)
        assert values['positiveKeeperPairForceAfterSolve'] == sum(r['nativeLoaded'] for r in records)
        assert values['keeperRecordsWithOLDeliveredLoad'] == sum(r['hasOLDeliveredLoad'] for r in records)
        for key, value in native['reads'].items():
            assert values[key] == value
        assert comparison['nativeLimits'][phase] == native['limits']
        assert len(comparison['transfers'][phase]) == len(records)
        for stored, record in zip(comparison['transfers'][phase], records):
            assert stored['id'] == record['id'] and stored['t'] == record['t'] and stored['keeper'] == record['keeper']
            assert stored['sameObjectAfterSolve'] == record['continuity']
            assert stored['positivePairForceAfterSolve'] == record['nativeLoaded']
            assert stored['hasOLDeliveredLoad'] == record['hasOLDeliveredLoad']
    assert [comparison['ordinary'][phase]['stuffs'] for phase in ('before', 'after')] == [31, 37]
    assert [len(a['ordinary']) for a in audits] == [68, 118]
    assert [sum(r['continuity'] for r in a['ordinary']) for a in audits] == [65, 118]
    assert [sum(r['promoted'] for r in a['ordinary']) for a in audits] == [3, 2]
    adverse_duo = next(r for r in comparison['pairedResults'] if r['id'] == 'CT-R1-duo-odd-R-S3')
    assert adverse_duo['beforeYards'] == 7.39 and adverse_duo['afterYards'] == 2.70
    adverse_oz = next(r for r in comparison['pairedSupplementalResults'] if r['id'] == SUPPLEMENTAL_IDS[0])
    assert adverse_oz['beforeYards'] == 70 and adverse_oz['afterYards'] == 28.49

    # Films were fixed before outcomes. Continuous trace bodies/load match
    # achieved native movement; the pack's labels do not prove an executed job.
    films = [load(HERE / f'{phase}-film.json.gz') for phase in ('before', 'after')]
    loaded_entries = [0, 0]
    for index, (film, panel, pin) in enumerate(zip(films, panels, (BEFORE, AFTER))):
        source_pin(film, pin)
        assert film['schema'] == 'combo-transfer-film-v1' and film['collectorSha256'] == panel['collectorSha256']
        assert [play['id'] for play in film['plays']] == FILM_IDS
        for play in film['plays']:
            assert play['selection'] == 'fixed-before-outcomes'
            assert {k: v for k, v in play['result'].items() if k not in ('frames', 'telemetry')} == by_id[index][play['id']]['result']
            assert play['trace'][0]['t'] == 0 and play['trace'][-1]['phase'] == 'dead'
            close(play['trace'][-1]['t'] + .05, play['result']['duration'])
            assert play['result']['telemetry']['level'] == 'full'
            for tick in play['trace']:
                achieved = {body['slot']: body for body in tick['after']}
                for delivered in tick['deliveredStep']:
                    assert delivered['achievedPos'] == achieved[delivered['slot']]['pos'] and delivered['achievedVel'] == achieved[delivered['slot']]['vel']
                    for value, limit in (('armImpulse', 'armImpulseLimit'), ('armWork', 'armWorkLimit'), ('supportMotorWork', 'supportMotorWorkLimit')):
                        assert delivered[value] <= delivered[limit] + 1e-7
                    loaded_entries[index] += sum(abs(j['normalForce']) + abs(j['tangentForce']) > 1e-9 for j in delivered['liveHandsAfterPhysics'])
    for old, new in zip(*(f['plays'] for f in films)):
        assert old['id'] == new['id'] and old['players'] == new['players']
        assert old['result']['frames'][0] == new['result']['frames'][0]
    assert all(count > 0 for count in loaded_entries)

    guard_exact = 0
    guards = load(HERE / 'guard-comparison.json')
    assert guards['schema'] == 'combo-transfer-guards-v1'
    assert guards['sources'] == {'before': BEFORE, 'after': AFTER}
    assert guards['toolSha256'] == sha(HERE / 'compare-guards.py')
    for name, pin in guards['inputs'].items():
        assert sha(ROOT / name) == pin, name
    for kind, suffix in (('runs', '.json.gz'), ('tackles', '.json.gz'), ('games9', '.json')):
        old, new = [load(folder / f'current-{kind}{suffix}') for folder in (BASELINE, HERE)]
        source_pin(old, BEFORE)
        source_pin(new, AFTER)
        assert old['scriptSha256'] == new['scriptSha256']
        if kind == 'runs':
            assert old['cohort'] == new['cohort'] and len(old['trials']) == len(new['trials']) == 144
            assert old['observerVerifiedCount'] == new['observerVerifiedCount'] == 7
            for a, b in zip(old['trials'], new['trials']):
                assert all(a[k] == b[k] for k in ('id', 'roster', 'run', 'scheme', 'front', 'seed', 'flip', 'rbProfile', 'rbRatings'))
                guard_exact += a == b
            assert guards['runs']['before'] == old['summary'] and guards['runs']['after'] == new['summary']
        elif kind == 'tackles':
            assert old['primary'] == new['primary'] and old['witnesses'] == new['witnesses']
            assert all(old[k] == new[k] for k in ('inputSha256', 'cohortSha256', 'profilesSha256', 'primaryInputs', 'witnessInputs'))
            assert len(new['primary']) == 56 and len(new['witnesses']) == 8
            assert all(c['passed'] and c['observed'] == c['plain'] for c in new['observerChecks'])
        else:
            assert old['rosterSha256'] == new['rosterSha256'] and old['seed'] == new['seed'] == 9
            assert len(old['games']) == len(new['games']) == 2
            assert [g['seed'] for g in old['games']] == [g['seed'] for g in new['games']]
            assert new['physics']['maxMotorWorkExcessKgYd2S2'] == 0
            assert new['physics']['maxMomentumResidualKgYdS'] < 1e-7 and new['physics']['maxWorkResidualKgYd2S2'] < 1e-7
            assert all(game['physicalTimeoutsIncludingNullified'] == 0 for game in new['games'])
    assert guards['runs']['exactSavedTrials'] == guard_exact and guards['tackles']['exactSavedEncounters'] == 64

    integrity, browser = [load(HERE / name) for name in ('film-integrity.json', 'browser-check.json')]
    assert integrity['schema'] == 'combo-transfer-film-integrity-v1'
    assert integrity['clips'] == integrity['naturalFinishes'] == integrity['predeterminedClips'] == 20
    assert integrity['inspectionCensors'] == 0
    for key in ('exactFullTelemetry', 'exactRawEventsActorsNotesTimes', 'exactPlayersProfilesRatingsWeights',
                'exactNativeSupportOwnershipHandsImagesAndDeliveredLoads', 'crossSourceProfilesAndInitialPositionsMatch',
                'all162ObserverControlsPerPhaseNeutral', 'recordedFrameTimesAndPossession', 'zipHtmlByteExact'):
        assert integrity[key], key
    assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
    assert integrity['htmlSha256'] == sha(ROOT / 'viewer/combo-transfer.html')
    assert integrity['zipSha256'] == sha(ROOT / 'viewer/combo-transfer.zip')
    assert len(browser['clips']) == 20 and browser['pageErrors'] == []
    for key in ('localSelfContainedHtmlOpened', 'stuffFilterUsesRecordedResults', 'pairedFixtureSearch',
                'frontFilterAndGrouping', 'recordedSourceFilter', 'conceptAndCoverageGrouping',
                'mobileNoHorizontalOverflow', 'copiedReferenceUsesSelectedEngineSource'):
        assert browser[key], key
    videos = browser['videoExportUsesSelectedEngineSource']
    assert len(videos) == 2 and [v['selectedSourceSha256'] for v in videos] == [BEFORE, AFTER]
    assert all(v['nonemptyBytes'] > 0 and v['paintedStampUsesSelectedSource'] for v in videos)
    with zipfile.ZipFile(ROOT / 'viewer/combo-transfer.zip') as archive:
        assert archive.testzip() is None and archive.namelist() == ['combo-transfer.html']
        assert archive.read('combo-transfer.html') == (ROOT / 'viewer/combo-transfer.html').read_bytes()
    checks = load(HERE / 'checks.json')
    assert checks['schema'] == 'combo-transfer-checks-v1' and checks['finalSourceSha256'] == AFTER
    assert checks['testsPassed'] == 749 and checks['testsFilesPassed'] == 69
    final_tests = (HERE / 'tests.log').read_text()
    assert '749 passed (749)' in final_tests and '69 passed (69)' in final_tests
    assert 'Unhandled Error' not in final_tests
    assert '17 passed (17)' in (HERE / 'focused-tests-after.log').read_text()
    assert '10 failed | 7 passed (17)' in (HERE / 'focused-tests-before.log').read_text()
    assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
    assert checks['initialConcurrentTestsPassed'] == 749 and checks['initialConcurrentTestsExitCode'] == 1
    initial_tests = (HERE / 'concurrent-tests.log').read_text()
    assert '749 passed (749)' in initial_tests and 'Timeout calling "onTaskUpdate"' in initial_tests
    assert all(value == 0 for key, value in checks.items() if key.endswith('ExitCode') and key != 'initialConcurrentTestsExitCode')
    return {'fixedInputProfilePairs': initial_matches, 'observedPlainControls': 324,
            'ordinarySnapsPerPhase': 160, 'supplementalSnapsPerPhase': 2,
            'ordinaryCompleteExecutionsExact': exact,
            'ordinaryNativeTransfers': [len(a['ordinary']) for a in audits],
            'ordinaryKeeperJointContinuity': [sum(r['continuity'] for r in a['ordinary']) for a in audits],
            'ordinaryPromotedHelpers': [sum(r['promoted'] for r in a['ordinary']) for a in audits],
            'ordinaryNativeLoadedKeeperJoints': [sum(r['nativeLoaded'] for r in a['ordinary']) for a in audits],
            'ordinaryKeeperRecordsWithOLDeliveredLoad': [sum(r['hasOLDeliveredLoad'] for r in a['ordinary']) for a in audits],
            'ordinaryImmediateClimberRetargets': [sum(r['immediateClimberRetarget'] for r in a['ordinary']) for a in audits],
            'ordinaryScheduledComboReads': [a['reads'] for a in audits],
            'oldFilmAttachedCombinationReads': 115, 'oldFilmSecurePrimaryWeakHelperReads': 61,
            'oldFilmVetoReadsWithoutConsumedBackerImage': 60, 'oldFilmAffectedCombinationJobs': 7,
            'loadedSurvivingFilmHandEntries': loaded_entries,
            'broaderCompleteRunRowsExact': guard_exact, 'unchangedTackleRows': 64,
            'naturalFilmClips': 20, 'ordinaryStuffs': [31, 37],
            'retainedAdverseDuoYards': [7.39, 2.70], 'retainedAdverseSupplementalOZYards': [70, 28.49]}


def main():
    manifest = load(HERE / 'verification-manifest.json')
    assert manifest['schema'] == 'combo-transfer-verification-v1'
    assert manifest['beforeSourceSha256'] == BEFORE and manifest['finalSourceSha256'] == AFTER
    assert manifest['worldSha256'] == WORLD
    assert manifest['collectorSha256'] == COLLECTOR and manifest['comparisonSha256'] == COMPARATOR
    assert manifest['checks'] == load(HERE / 'checks.json')
    for name, expected in manifest['files'].items():
        assert sha(ROOT / name) == expected, name
    proof = audit()
    assert proof == manifest['independentChecks']
    if '--engine' in sys.argv:
        for name, expected in manifest['currentCodeFiles'].items():
            assert sha(ROOT / name) == expected, name
        assert sha(ROOT / 'src/physics/world.ts') == WORLD
        changed = manifest['changedEngineFiles']
        assert changed == ['src/sim/behaviors/blocking.ts'] and manifest['addedEngineFiles'] == []
        paths = sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix())
        with tempfile.TemporaryDirectory(prefix='combo-transfer-source-', dir='/tmp') as directory:
            scratch = Path(directory)
            for name in changed:
                destination = scratch / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes((ROOT / name).read_bytes())
            subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
            def source_at(tree=None):
                digest = hashlib.sha256()
                for path in paths:
                    name = path.relative_to(ROOT).as_posix()
                    actual = tree / name if tree and name in changed else path
                    digest.update(name.encode() + b'\0' + actual.read_bytes() + b'\0')
                return digest.hexdigest()
            assert source_at() == AFTER and source_at(scratch) == BEFORE
    print(json.dumps({'passed': True, **proof, 'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))


if __name__ == '__main__':
    main()
