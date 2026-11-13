#!/usr/bin/env python3
"""Independently verify saved zone-helper checks, without resimulation.

Default verifies immutable raw observations, comparisons, films and archived
controls. --engine also pins current source/tools and reverses the exact patch.
The previous immutable verifier checks normal attached transfers and native
budgets; optional unjoined-helper decisions receive separate checks here.
Private helpPolicy/checkSince and the complete pre-update World joint list are
absent from this collector. Their guarantees come from archived source/tests,
not invented observations or inherited secureSince.
"""
import base64
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASELINE = HERE.parent / 'ol-job-exchange'
PRIOR = HERE.parent / 'combo-transfer'
BEFORE = '206cb45f54841596ae01fa3ecccb2a6cd192d77664563595cbe82c05c443cae9'
AFTER = 'd6dfa190412da52725780c71db02f73305b3e3f5541b4c8e9d755a3296ee568f'
WORLD = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'
COMPARATOR = 'e06621fca25215045927a7f238fa43755e57a584077292412ee713d4c9675d80'
FIXED = ['CT-R1-iz_strong-over-R-S3', 'CT-R1-iz_strong-over-L-S3',
         'CT-R1-split_zone-tite-R-S3', 'CT-R1-split_zone-tite-L-S3', 'CT-R1-duo-odd-R-S11']
SCOPE = {'iz_strong', 'split_zone'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    with gzip.open(path, 'rt') if path.suffix == '.gz' else path.open() as stream:
        return json.load(stream, parse_constant=lambda token: (_ for _ in ()).throw(ValueError(token)))


def previous_checks():
    spec = importlib.util.spec_from_file_location('immutable_keeper_checks', PRIOR / 'verify-evidence.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def is_check(event):
    return event['type'] == 'block_climb' and event.get('note', '').startswith('check')


def standard_panel(panel):
    # Preserve every native row/load. Exclude only the new event from the old
    # attached-transfer checker, which uses secureSince and changed-owner phi.
    result = dict(panel)
    for key in ('trials', 'supplementalTrials'):
        result[key] = []
        for trial in panel[key]:
            saved = dict(trial)
            saved['updates'] = [dict(row, events=[e for e in row['events'] if not is_check(e)]) for row in trial['updates']]
            saved['earnedClimbs'] -= sum(is_check(e) for row in trial['updates'] for e in row['events'])
            result[key].append(saved)
    return result


def images(row, target):
    result = []
    for cue in row['consumedImages']:
        if cue['target'] == target and cue['image'] not in result:
            result.append(cue['image'])
    return result


def distance(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def engagement(row, stage, owner, defender):
    return next(m['engagement'] for m in row[stage] if m['slot'] == owner
                and m['engagement'] and m['engagement']['defender'] == defender)


def free_helper_reads(trial):
    installed = {m['slot']: m['plan'] for m in trial['initialProjection']['ownership']}
    result = []
    for row in trial['updates']:
        old, after = row['beforeBody']['plan']['combination'], row['oldCombinationAfter']
        if not old or old['released'] or not after:
            continue
        if len(old['members']) != 2 or row['observer'] != old['members'][1] or row['beforeBody']['engagement']:
            continue
        initial = installed[row['observer']]['combination']
        if (initial and all(initial[k] == old[k] for k in ('id', 'members', 'defender', 'backer'))
            and (old['nextRead'] != after['nextRead'] or (images(row, old['members'][0]) and images(row, old['defender']))
                 or any(is_check(e) for e in row['events']))):
            result.append(row)
    return result


def check_records(trial, prior):
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    players = {p['slot']: p for p in trial['initialProjection']['players']}
    records = []
    for row in trial['updates']:
        for event in [e for e in row['events'] if is_check(e)]:
            assert trial['run'] in SCOPE and not trial['supplemental']
            combo = row['beforeBody']['plan']['combination']
            owner, helper = combo['members']
            defender, backer = combo['defender'], combo['backer']
            installed = next(m['plan']['combination'] for m in trial['initialProjection']['ownership'] if m['slot'] == helper)
            assert all(installed[k] == combo[k] for k in ('id', 'members', 'defender', 'backer'))
            assert row['observer'] == slots[event['a']] == helper and slots[event['b']] == backer
            assert event['t'] == row['t'] and row['oldCombinationAfter']['released']
            assert row['beforeBody']['plan']['kind'] == 'combo' and row['beforeBody']['engagement'] is None
            assert 'combo-check-climb' in row['afterBody']['tags']
            old = engagement(row, 'before', owner, defender)
            new = engagement(row, 'after', owner, defender)
            solved = engagement(row, 'afterSolvedOwnership', owner, defender)
            assert old == new, (trial['id'], 'controller changed owner contact')
            assert old['type'] == 'run' and old['blocker'] == owner and old['helpers'] == []
            state = next(m for m in old['members'] if m['slot'] == owner)
            assert not state['down'] and state['supportAvailability'] > .60 and abs(state['surfacePhi']) < .65
            assert old['control'] > -.072 and old['baseB'] > .60 and abs(old['phi']) < .55
            j0, j1, j2 = old['hands'], new['hands'], solved['hands']
            assert j0 == j1 and j0['id'] == j1['id'] == j2['id']
            assert all(j['live'] and j['kind'] == 'hands' and j['a'] == owner and j['b'] == defender for j in (j0, j1, j2))
            assert abs(j2['normalForce']) + abs(j2['tangentForce']) > 1e-9
            for key in ('pos', 'vel', 'facing', 'stance', 'support', 'energy'):
                assert row['beforeBody'][key] == row['afterBody'][key]
            after_plans = {m['slot']: m['plan'] for m in row['after']}
            assert after_plans[owner]['combination'] is after_plans[helper]['combination'] is None
            assert after_plans[owner]['target'] == defender
            assert after_plans[helper]['kind'] == 'climb' and after_plans[helper]['target'] == backer
            assert after_plans[helper]['drive'] == {'x': 1, 'y': 0}
            own, dl, lb, rb = [images(row, slot) for slot in (owner, defender, backer, 'RB')]
            assert len(own) == len(dl) == len(lb) == len(rb) == 1
            covered, down, target, runner = own[0], dl[0], lb[0], rb[0]
            assert all(p['age'] >= 0 for p in (covered, down, target, runner))
            assert distance(target['pos'], row['beforeBody']['pos']) < 4.2 or runner['pos']['x'] > 37.2
            home = players[helper]['body']['pos']['y']
            side = (home > players[owner]['body']['pos']['y']) - (home < players[owner]['body']['pos']['y'])
            drive = row['beforeBody']['plan']['drive']
            norm = math.hypot(drive['x'], drive['y'])
            ax, ay = -drive['x'] / norm, -drive['y'] / norm
            dx, dy = covered['pos']['x'] - down['pos']['x'], covered['pos']['y'] - down['pos']['y']
            phi = math.atan2(-(dx * -ay + dy * ax), dx * ax + dy * ay) / (math.pi / 2)
            reach = players[owner]['profile']['radius'] + players[defender]['profile']['radius'] + (players[owner]['profile']['reach'] - .25) / .85
            assert covered['pose'] == down['pose'] == 'up' and abs(phi) < .55
            assert distance(covered['pos'], down['pos']) <= reach and side * (down['pos']['y'] - covered['pos']['y']) < 0
            radii = players[helper]['profile']['radius'] + players[defender]['profile']['radius']
            clearances = []
            # Private checkNextRead is absent. Public nextRead belongs to the
            # legacy attached-combo path, so only the present-time segment is
            # reconstructible here. Projected endpoint uses archived controls.
            for dt in (0,):
                start = row['beforeBody']['pos']
                gx, gy = target['pos']['x'] + target['vel']['x'] * dt, target['pos']['y'] + target['vel']['y'] * dt
                px, py = down['pos']['x'] + down['vel']['x'] * dt, down['pos']['y'] + down['vel']['y'] * dt
                lx, ly = gx - start['x'], gy - start['y']
                along = max(0, min(1, ((px-start['x'])*lx + (py-start['y'])*ly) / max(1e-12, lx*lx+ly*ly)))
                clearance = math.hypot(px-start['x']-along*lx, py-start['y']-along*ly)
                assert clearance > radii
                clearances.append(clearance)
            held_threats = set()
            # These are actual consumed pictures, not a fresh perception query.
            # Already-down unobserved bodies/full helper joint list remain out
            # of this trace's scope and are covered by archived controls.
            for cue in row['consumedImages']:
                slot, seen = cue['target'], cue['image']
                if players[slot]['team'] != 'D' or slot in (defender, backer):
                    continue
                if (seen['pos']['x'] >= 42 or seen['pos']['x'] <= row['beforeBody']['pos']['x'] - 1
                    or min(abs(seen['pos']['y'] - home), abs(seen['pos']['y'] - row['beforeBody']['pos']['y'])) >= .9):
                    continue
                contacts = [m['engagement'] for m in row['before'] if m['engagement'] and m['engagement']['defender'] == slot]
                assert contacts and seen['pos']['x'] >= 39.75
                assert any(e['hands'] and e['hands']['live'] and e['hands']['a'] == e['blocker'] and e['hands']['b'] == slot for e in contacts)
                held_threats.add(slot)
            load = next((s for s in row['deliveredStep'] if s['slot'] == owner), None)
            if load:
                assert any(j['id'] == j2['id'] for j in load['liveHandsAfterPhysics'])
            prior.close(row['completedAt'], row['t'] + .05)
            records.append({'id': trial['id'], 't': row['t'], 'owner': owner, 'helper': helper,
                            'defender': defender, 'backer': backer, 'ownerJointId': j0['id'],
                            'ownerContactByteValueUnchanged': True, 'continuousLoadedJoint': True,
                            'ownerHasOLDeliveredLoad': load is not None, 'observedPhi': phi,
                            'visibleBackerClearances': clearances, 'heldLocalThreats': sorted(held_threats)})
    return records


def football_metrics(trials):
    return {'snaps': len(trials), 'naturalEnds': sum(t['naturalEnd'] for t in trials),
            'observerPlainMatches': sum(t['observedSignature'] == t['plainSignature'] for t in trials),
            'meanYards': sum(t['result']['offenseYards'] for t in trials) / len(trials),
            'stuffs': sum(t['result']['offenseYards'] <= 0 for t in trials),
            'runs10Plus': sum(t['result']['offenseYards'] >= 10 for t in trials),
            'earnedClimbs': sum(t['earnedClimbs'] for t in trials),
            'olFalls': sum(o['falls'] for t in trials for o in t['olMetrics'].values()),
            'olDowns': sum(o['downs'] for t in trials for o in t['olMetrics'].values()),
            'cancelledTransitions': sum(t['cancelledTransitions'] for t in trials),
            'blockExchangeEvents': sum(e['type'] == 'block_exchange' for t in trials for r in t['updates'] for e in r['events']),
            'retainedFreeOriginalHelperUpdateRecords': sum(len(free_helper_reads(t)) for t in trials),
            'retainedFreeOriginalHelperUpdatesAdvancingSharedComboRead': sum(r['beforeBody']['plan']['combination']['nextRead'] != r['oldCombinationAfter']['nextRead'] for t in trials for r in free_helper_reads(t)),
            'retainedFreeOriginalHelperOwnVisualChecks': sum(bool(images(r, r['beforeBody']['plan']['combination']['members'][0]) and images(r, r['beforeBody']['plan']['combination']['defender'])) for t in trials for r in free_helper_reads(t)),
            'installedCheckScopeRetainedHelperRecords': sum(len(free_helper_reads(t)) for t in trials if t['run'] in SCOPE),
            'checkClimbs': sum(is_check(e) for t in trials for r in t['updates'] for e in r['events'])}


def followup(trial, check):
    helper, backer, start = check['helper'], check['backer'], check['t']
    hands, contacts = [], []
    metric = trial['olMetrics'].get(helper)
    if metric:
        for first in metric['firstHands']:
            if first['other'] == backer and first['t'] >= start:
                hands.extend(j for j in first['nativeLoad']['liveHandsAfterPhysics'] if {j['a'], j['b']} == {helper, backer})
        for first in metric['firstContacts']:
            if first['other'] == backer and first['t'] >= start:
                contacts.extend(c for c in first['nativeLoad']['physicalContacts'] if c['other'] == backer)
    changed, visited, after_check = False, set(), False
    for row in trial['updates']:
        if row['t'] < start:
            continue
        if row['t'] not in visited:
            visited.add(row['t'])
            load = next((s for s in row['deliveredStep'] if s['slot'] == helper), None)
            if load:
                hands.extend(j for j in load['liveHandsAfterPhysics'] if {j['a'], j['b']} == {helper, backer})
                contacts.extend(c for c in load['physicalContacts'] if c['other'] == backer)
        if after_check:
            before = next((s for s in row['before'] if s['slot'] == helper), None)
            after = next((s for s in row['after'] if s['slot'] == helper), None)
            changed |= bool(before and after and before['plan']['target'] != after['plan']['target'])
        if row['t'] == start and row['observer'] == helper and any(is_check(e) for e in row['events']):
            after_check = True
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    fall = any(e['type'] == 'fall' and e['t'] >= start and slots[e['a']] == helper for e in trial['result']['events'])
    return {'id': trial['id'], 't': start, 'hasRecordedNativeBackerHands': bool(hands),
            'hasRecordedPositiveBackerHandForce': any(j['live'] and abs(j['normalForce']) + abs(j['tangentForce']) > 1e-9 for j in hands),
            'hasRecordedNativeBackerBodyContact': bool(contacts), 'laterTargetChanges': changed, 'laterHelperFalls': fall}


def audit():
    prior = previous_checks()
    panels = [read(BASELINE / 'candidate.json.gz'), read(HERE / 'candidate.json.gz')]
    native = [prior.panel_audit(standard_panel(p), pin, True) for p, pin in zip(panels, (BEFORE, AFTER))]
    assert panels[0]['cohort'] == panels[1]['cohort'] and panels[0]['collectorSha256'] == panels[1]['collectorSha256'] == prior.COLLECTOR
    assert panels[0]['filmIds'] == panels[1]['filmIds']
    for p in panels:
        assert p['cohort']['pooledRosterPair'] == [31, 32] and p['cohort']['supplementalRosterPair'] == [41, 42]
        assert p['moduleSha256']['src/physics/world.ts'] == WORLD
    assert panels[0]['moduleSha256']['src/sim/engagement.ts'] == panels[1]['moduleSha256']['src/sim/engagement.ts']
    comparison = read(HERE / 'comparison.json')
    assert comparison['schema'] == 'zone-helper-comparison-v1' and comparison['comparisonSha256'] == COMPARATOR
    assert comparison['sources'] == {'before': BEFORE, 'after': AFTER}
    assert comparison['cohort'] == panels[0]['cohort'] and comparison['collectorSha256'] == prior.COLLECTOR
    for path, expected in comparison['inputs'].items():
        assert sha(ROOT / path) == expected
    exact = 0
    for old, new in zip(*(p['trials'] + p['supplementalTrials'] for p in panels)):
        assert all(old[k] == new[k] for k in ('id', 'run', 'front', 'flip', 'seed', 'roster', 'formation', 'supplemental', 'profileSha256', 'initialSha256'))
        assert old['initialProjection'] == new['initialProjection']
        if old['supplemental'] or old['run'] not in SCOPE:
            assert old['observedSignature'] == new['observedSignature'] and old['result'] == new['result']
        if not old['supplemental']:
            exact += old['observedSignature'] == new['observedSignature']
    assert exact == comparison['identicalCompleteExecutions'] == 151
    checks = [[r for t in p['trials'] + p['supplementalTrials'] for r in check_records(t, prior)] for p in panels]
    assert [len(r) for r in checks] == [0, 5]
    followups = []
    for index, (phase, panel, n) in enumerate(zip(('before', 'after'), panels, native)):
        for group in ('ordinary', 'supplemental'):
            trials = panel['trials' if group == 'ordinary' else 'supplementalTrials']
            for key, value in football_metrics(trials).items():
                prior.close(comparison[group][phase][key], value)
        for axis, field in (('byConcept', 'run'), ('byFront', 'front')):
            for name, groups in comparison[axis].items():
                for key, value in football_metrics([t for t in panel['trials'] if t[field] == name]).items():
                    prior.close(groups[phase][key], value)
        assert comparison['nativeLimits'][phase] == n['limits']
        assert len(n['ordinary']) == [118, 114][index] and len(n['supplemental']) == 3
        assert all(r['continuity'] and r['nativeLoaded'] for r in n['ordinary'] + n['supplemental'])
        for scope, records in (('ordinary160', n['ordinary'] + checks[index]), ('supplemental2', n['supplemental'])):
            summary = comparison['keeperContinuity'][scope][phase]
            assert summary['records'] == summary['sameKeeperJointAfterController'] == summary['sameKeeperJointAfterSolve'] == summary['positiveKeeperPairForceAfterSolve'] == len(records)
            assert summary['continuityFailures'] == []
        raw_checks = comparison['checkClimbs'][phase]
        assert [(r['id'], r['t']) for r in raw_checks] == [(r['id'], r['t']) for r in checks[index]]
        for record, compact in zip(checks[index], raw_checks):
            assert not compact['helperFullPreUpdateWorldJointsCaptured']
            geometry = compact['derivedOwnObservedGeometry']
            prior.close(record['observedPhi'], geometry['visibleSurface']['observedPhi'])
            assert geometry['visibleSurface']['visibleFitPassesSurfaceGate'] and geometry['visibleBackerCorridor']['currentObservedCorridorClear']
            assert not geometry['visibleBackerCorridor']['controllerFutureProjectionCaptured']
            for value, sample in zip(record['visibleBackerClearances'], geometry['visibleBackerCorridor']['samples']):
                prior.close(value, sample['observedDLDistanceToBackerSegment'])
        by_id = {t['id']: t for t in panel['trials']}
        later = [followup(by_id[r['id']], r) for r in checks[index]]
        followups.append(later)
        raw_later = comparison['checkClimbFollowups'][phase]
        assert [(r['id'], r['t']) for r in raw_later] == [(r['id'], r['t']) for r in later]
        for derived, recorded in zip(later, raw_later):
            for key in ('hasRecordedNativeBackerHands', 'hasRecordedPositiveBackerHandForce', 'hasRecordedNativeBackerBodyContact'):
                assert derived[key] == recorded[key]
            assert derived['laterTargetChanges'] == bool(recorded['laterActualTargetChanges'])
            assert derived['laterHelperFalls'] == bool(recorded['laterHelperFalls'])
    assert sum(r['ownerHasOLDeliveredLoad'] for r in checks[1]) == 3
    assert sum(bool(r['heldLocalThreats']) for r in checks[1]) == 1
    pairs = comparison['pairedResults']
    assert len(pairs) == 160
    for pair, old, new in zip(pairs, panels[0]['trials'], panels[1]['trials']):
        assert pair['id'] == old['id'] == new['id']
        assert pair['beforeYards'] == old['result']['offenseYards'] and pair['afterYards'] == new['result']['offenseYards']
        prior.close(pair['yardsDelta'], pair['afterYards'] - pair['beforeYards'])
        assert pair['identicalCompleteExecution'] == (old['observedSignature'] == new['observedSignature'])
    adverse = [p for p in pairs if p['yardsDelta'] < -1e-9]
    assert adverse == comparison['adverseAnyGainPairs'] and len(adverse) == 2
    assert [p for p in pairs if p['yardsDelta'] <= -2] == comparison['adverse2YardPairs']
    assert comparison['adverse2YardPairs'] == []
    assert [(p['id'], p['beforeYards'], p['afterYards']) for p in adverse] == [
        ('CT-R1-iz_strong-odd-L-S3', .24, .22), ('CT-R1-split_zone-tite-R-S3', .03, .01)]
    bear = [next(t for t in p['trials'] if t['id'] == 'CT-R1-split_zone-bear-R-S11') for p in panels]
    assert bear[0]['result'] == bear[1]['result'] and bear[1]['result']['offenseYards'] == 5.12
    assert bear[0]['olMetrics'] == bear[1]['olMetrics']
    assert [r['t'] for r in bear[1]['updates'] if any(e['type'] == 'block_climb' for e in r['events'])] == [1.65, 2.85]
    joined = [[r for r in t['updates'] if any(e['type'] == 'block_climb' and not is_check(e) for e in r['events'])] for t in bear]
    assert [len(rows) for rows in joined] == [2, 2]
    for old, new in zip(*joined):
        assert old['t'] == new['t'] and old['observer'] == new['observer']
        combo = old['beforeBody']['plan']['combination']
        assert combo == new['beforeBody']['plan']['combination']
        assert [e for e in old['events'] if e['type'] == 'block_climb'] == [e for e in new['events'] if e['type'] == 'block_climb']
        for stage in ('before', 'after', 'afterSolvedOwnership'):
            def states(row):
                return [{k: v for k, v in m.items() if k != 'tags'} for m in row[stage] if m['slot'] in combo['members']]
            assert states(old) == states(new)
        assert [m for m in old['deliveredStep'] if m['slot'] in combo['members']] == [m for m in new['deliveredStep'] if m['slot'] in combo['members']]
    restored = comparison['priorRejectedBearJoinedPhaseControl']
    assert restored['nativeJoinedClimbProjectionsMatch'] and restored['beforeJoinedClimbTimes'] == restored['afterJoinedClimbTimes'] == [1.65, 2.85]
    assert restored['pair']['identicalCompleteExecution'] is False and restored['pair']['identicalCompletePublicResult'] and restored['pair']['identicalRecordedWholePlayOLMetrics']
    assert comparison['beneficial2YardPairs'] == [p for p in pairs if p['yardsDelta'] >= 2] == []
    assert comparison['supplementalAdverseAnyGainPairs'] == []
    film_proof = film_audit(panels, prior)
    tests_proof = controls_audit()
    return {'recordedFullInitialProjectionMatches': 162, 'panelObservedPlainMatches': 324,
            'ordinaryCompleteExecutionsExact': exact, 'outOfScopeOrdinaryExecutionsExact': 120,
            'supplementalExecutionsExact': 2, 'optionalCheckClimbsPerPhase': [0, 5],
            'ordinaryAttachedNativeTransfersPerPhase': [118, 114], 'supplementalAttachedNativeTransfersPerPhase': [3, 3],
            'allClimbKeeperJointsContinuousAndLoaded': True,
            'newCheckOwnersWithOLLoads': 3, 'newCheckOwnersWithoutOLLoadsY': 2,
            'newChecksWithAccountedAdjacentNativeThreat': 1, 'checkRecords': checks[1],
            'ordinaryStuffs': [37, 37], 'ordinaryOLFalls': [13, 14],
            'adverseAnyGainPairs': 2, 'retainedAdverseYards': [[.24, .22], [.03, .01]],
            'restoredSplitZoneBearRightSeed11': [5.12, 5.12], 'restoredBearResultAndEventsExact': True,
            'restoredBearStandardClimbTimes': [1.65, 2.85], 'restoredBearWholeOLMetricsAndJoinedSnapshotsExact': True,
            'beneficial2YardPairs': 0,
            'checkFollowups': followups[1],
            'collectorOmissions': ['newHelpPolicy', 'privateCheckSince', 'privateCheckNextRead', 'completePreUpdateHelperWorldJoints'],
            **film_proof, **tests_proof, **rejected_audit(panels[0], prior)}


def rejected_audit(baseline, prior):
    # Preserve why the first candidate was rejected; do not treat its passing
    # unit suite as permission to publish it or pool it into final B outcomes.
    rejected_dir = HERE / 'pre-cadence'
    rejected = read(rejected_dir / 'candidate.json.gz')
    rejected_pin = '512a8b2bd695a09f4f2bf0bf97a2e2e8133794f97afbc4b65462b38f661a0230'
    prior.source_pin(rejected, rejected_pin)
    comparison = read(rejected_dir / 'comparison.json')
    assert comparison['sources'] == {'before': BEFORE, 'after': rejected_pin}
    id_ = 'CT-R1-split_zone-bear-R-S11'
    old, bad = [next(t for t in p['trials'] if t['id'] == id_) for p in (baseline, rejected)]
    assert old['initialProjection'] == bad['initialProjection'] and old['initialSha256'] == bad['initialSha256']
    assert old['result']['offenseYards'] == 5.12 and bad['result']['offenseYards'] == 3
    assert bad['observerVerified'] and bad['observedSignature'] == bad['plainSignature'] and bad['naturalEnd']
    falls = [sum(m['falls'] for t in p['trials'] for m in t['olMetrics'].values()) for p in (baseline, rejected)]
    assert falls == [13, 14] and comparison['ordinary']['after']['olFalls'] == 14
    assert '790 passed (790)' in (rejected_dir / 'full-tests.log').read_text()
    assert '17 passed (17)' in (rejected_dir / 'tests-after.log').read_text()
    return {'rejectedPreCadenceSource': rejected_pin, 'rejectedBearWitnessYards': [5.12, 3],
            'rejectedOrdinaryOLFalls': falls, 'rejectedCandidateKeptSeparate': True}


def film_audit(panels, prior):
    films = [read(BASELINE / 'candidate-film.json.gz'), read(HERE / 'candidate-film.json.gz')]
    html = ROOT / 'viewer/zone-helper-check.html'
    packed = json.loads(re.search(r'const REPLAY = (\{[^\n]*\});', html.read_text()).group(1).replace('<\\/', '</'))
    assert packed['meta']['filmSchema'] == 'zone-helper-comparison-v1'
    assert packed['meta']['predeterminedInputs'] == FIXED and packed['meta']['negativeControl'] == FIXED[-1]
    assert len(packed['plays']) == 10
    for index, (film, panel, pin) in enumerate(zip(films, panels, (BEFORE, AFTER))):
        recorded = {p['id']: p for p in film['plays']}
        trials = {t['id']: t for t in panel['trials']}
        source = packed['meta']['sourceComparison'][index]
        assert source['sourceSha256'] == pin and source['collectorSha256'] == prior.COLLECTOR
        assert source['moduleSha256'] == panel['moduleSha256']
        for count, id_ in enumerate(FIXED):
            play, trial, clip = recorded[id_], trials[id_], packed['plays'][index * 5 + count]
            result = play['result']
            assert clip['fixtureId'] == id_ and clip['sourceSha256'] == pin and clip['recordingVerified']
            assert clip['filmSelection'] == 'fixed-before-outcomes' and clip['negativeControl'] == (id_ == FIXED[-1])
            assert clip['initialSha256'] == trial['initialSha256'] and clip['profileSha256'] == trial['profileSha256']
            assert clip['physicalSha256'] == trial['observedSignature'] and clip['naturalResult'] == trial['result']
            assert clip['eventDetails'] == result['events'] and clip['recordedPlayers'] == play['players']
            assert clip['weights'] == [p['weightLb'] for p in play['players']]
            assert clip['profiles'] == [{k: p[k] for k in ('position', 'heightIn', 'weightLb', 'ratings')} for p in play['players']]
            assert json.loads(gzip.decompress(base64.b64decode(clip['telemetry']['data']))) == result['telemetry']
            assert clip['frames']['t'] == [f['t'] for f in result['frames']]
            assert clip['frames']['c'] == [f['carrier'] for f in result['frames']]
            for axis, field in (('p', 'agents'), ('b', 'ball'), ('s', 'carrierPosture')):
                original = [v for frame in result['frames'] for v in frame[field]]
                assert len(original) == len(clip['frames'][axis])
                assert max(abs(a - b / 10) for a, b in zip(original, clip['frames'][axis])) <= .050000001
            combos = {}
            for state in trial['initialProjection']['ownership']:
                combo = (state['plan'] or {}).get('combination')
                if combo:
                    combos.setdefault(combo['id'], combo)
            combos = list(combos.values())
            assert clip['initialCombinations'] == combos
            slots = {slot for combo in combos for slot in combo['members']}
            trace = []
            for tick in play['trace']:
                reads = []
                solved = next((u['afterSolvedOwnership'] for u in reversed(tick['updates']) if 'afterSolvedOwnership' in u), None)
                for row in tick['updates']:
                    if row['observer'] not in slots:
                        continue
                    saved = {k: row[k] for k in ('t', 'observer', 'classification', 'oldCombinationAfter', 'requested', 'consumedImages', 'events')}
                    saved['legacyCombinationRead'] = row['combinationRead']
                    installed = next((c for c in combos if c['members'][1] == row['observer']), None)
                    owner = installed['members'][0] if installed else None
                    current = (row['beforeBody']['plan'] or {}).get('combination')
                    defender = current['defender'] if current else (installed['defender'] if installed else None)
                    observed = {c['target'] for c in row['consumedImages']}
                    visual = bool(installed and owner in observed and defender in observed)
                    actual_climb = any(e['type'] == 'block_climb' for e in row['events'])
                    saved['helperVisualCheck'], saved['keeperContact'] = visual, None
                    if installed and (visual or actual_climb):
                        def contact(states):
                            return next((s['engagement'] for s in states if s['slot'] == owner), None)
                        saved['keeperContact'] = {'owner': owner, 'defender': defender, 'actualClimb': actual_climb,
                                                  'completedAt': tick['t'] + .05, 'before': contact(row['before']), 'after': contact(row['after']),
                                                  'solvedOwnershipRecorded': solved is not None, 'afterPhysics': contact(solved or [])}
                    for key in ('beforeBody', 'afterBody'):
                        saved[key] = {k: row[key][k] for k in ('slot', 'pos', 'vel', 'plan')}
                    for stage in ('Before', 'After'):
                        saved['owner' + stage] = [{k: s[k] for k in ('slot', 'plan')} for s in row[stage.lower()] if any(
                            c['members'][1] == row['observer'] and c['members'][0] == s['slot'] for c in combos)]
                    reads.append(saved)
                trace.append({'t': tick['t'], 'completedAt': tick['t'] + .05,
                              'members': [s for s in tick['after'] if s['slot'] in slots],
                              'loads': [s for s in tick['deliveredStep'] if s['slot'] in slots], 'reads': reads,
                              'nonOLAfterPhysics': [s for s in (solved or []) if s['slot'] in slots and s['slot'] not in prior.OL]})
            assert clip['helperTrace'] == trace
    old, new = [{t['id']: t for t in p['trials']}[FIXED[-1]] for p in panels]
    assert old['observedSignature'] == new['observedSignature'] and old['result'] == new['result']
    for film, pin, panel in zip(films, (BEFORE, AFTER), panels):
        prior.source_pin(film, pin)
        assert film['schema'] == 'combo-transfer-film-v1' and film['collectorSha256'] == prior.COLLECTOR
        assert [p['id'] for p in film['plays']] == prior.FILM_IDS
        by_id = {t['id']: t for t in panel['trials']}
        for play in film['plays']:
            row = by_id[play['id']]
            assert play['selection'] == 'fixed-before-outcomes' and play['roster'] == 0
            assert play['result']['telemetry']['level'] == 'full'
            assert {k: v for k, v in play['result'].items() if k not in ('frames', 'telemetry')} == row['result']
            assert row['naturalEnd'] and play['result']['outcome'] != 'timeout'
    integrity, browser = [read(HERE / name) for name in ('film-integrity.json', 'browser-check.json')]
    assert integrity['schema'] == 'zone-helper-film-integrity-v1'
    assert integrity['clips'] == integrity['naturalFinishes'] == 10 and integrity['predeterminedInputs'] == FIXED
    for key in ('all324ObserverControlsNeutral', 'negativeControlExact', 'exactFullTelemetryEventsProfilesRatings',
                'exactNativeHelperTraceAndCompletedStepSubset', 'crossSourceInitialBodiesProfilesPositionsMatch', 'zipHtmlByteExact',
                'preservedTickStartPostPhysicsFrameStamping', 'completionTimeGateTrailsFrameStateOneTick', 'finalNativeSolveOutsideSeekRange'):
        assert integrity[key]
    assert integrity['privateHelperPolicyAndClockUnrecorded'] and integrity['legacyNextReadDoesNotProveHelperVisualCheck']
    assert integrity['maxExistingPackingPositionFacingError'] <= .050000001
    assert integrity['checkerSha256'] == sha(HERE / 'film-check.py')
    assert integrity['htmlSha256'] == sha(html) and integrity['zipSha256'] == sha(html.with_suffix('.zip'))
    assert len(browser['clips']) == 10 and browser['pageErrors'] == [] and len(browser['helperOwnImageInspections']) == 10
    for key in ('externalHttpsBlocked', 'recordedSourceFilter', 'pairedFixtureSearch', 'frontConceptCoverageGrouping', 'mobileNoHorizontalOverflow'):
        assert browser[key]
    videos = browser['videoExport']
    assert len(videos) == 2 and [v['sourceSha256'] for v in videos] == [BEFORE, AFTER]
    assert all(v['bytes'] > 0 and v['sourceStampCorrect'] for v in videos)
    with zipfile.ZipFile(html.with_suffix('.zip')) as archive:
        assert archive.testzip() is None and archive.namelist() == [html.name] and archive.read(html.name) == html.read_bytes()
    return {'filmNativeInputsPerPhase': 10, 'viewerPredeterminedPairedClips': 10, 'filmNaturalClips': 10,
            'filmNegativeControlExact': True, 'filmOwnImageNativeLoadInspections': 10, 'videoExportsSourceVerified': 2}


def controls_audit():
    checks = read(HERE / 'checks.json')
    assert checks['sourceSha256'] == AFTER and checks['sourceFrozen']
    full = (HERE / 'full-tests.log').read_text()
    assert '791 passed (791)' in full and '71 passed (71)' in full and 'Unhandled Error' not in full
    assert '18 passed (18)' in (HERE / 'tests-after.log').read_text()
    assert '5 failed | 13 passed (18)' in (HERE / 'tests-before.log').read_text()
    assert '2 failed | 16 passed (18)' in (HERE / 'tests-pre-cadence.log').read_text()
    assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
    archived = (HERE / 'controlled-tests.ts').read_text()
    for cue in ('requires a stable helper check', 'physically restrained helper', 'historical secure time',
                'missing-hands', 'foreign-hands', 'near-level penetrator', 'delayed picture',
                'already joined genuine double', 'keeps the helper reading independently',
                'keeps the native Split Zone Bear joined reads'):
        assert cue in archived, cue
    patch = (HERE / 'engine.patch').read_text()
    for gate in ('helpPolicy', 'checkSince', 'checkNextRead', "concept.scheme === 'insideZone'", "concept.scheme === 'splitZone'",
                 'observer !== helper', 'sim.world.joints.some', 'sim.t - combo.checkSince! < .15',
                 'if (!check) e.phi = phi', 'checkBackerCorridor'):
        assert gate in patch, gate
    for name in ('fullTypeScript', 'typecheck', 'build', 'python', 'focused'):
        assert checks[name]['exitCode'] == 0
    assert checks['fullTypeScript']['passed'] == 791 and checks['fullTypeScript']['files'] == 71
    assert checks['baselineFeatureControl']['exitCode'] == 1
    assert checks['baselineFeatureControl']['featureFailures'] == 5 and checks['baselineFeatureControl']['controlPasses'] == 13
    assert checks['focused']['passed'] == 18 and checks['python']['passed'] == 22
    assert checks['rejectedCadenceControl']['exitCode'] == 1
    assert checks['rejectedCadenceControl']['cadenceFailures'] == 2 and checks['rejectedCadenceControl']['controlPasses'] == 16
    assert checks['panel']['matchedRecordedInitialProjections'] == checks['panel']['naturalEndsPerPhase'] == 162
    assert checks['panel']['observedPlainControls'] == 324
    assert checks['film']['predeclaredInputs'] == 5 and checks['film']['clips'] == 10 and checks['film']['additionalSimulation'] is False
    return {'controlledFeatureTests': 5, 'baselineNegativeControls': 13, 'rejectedCandidateCadenceFailures': 2,
            'archivedControlledTestSourceChecked': True, 'fullTypeScriptTests': 791, 'pythonTests': 22}


def main():
    manifest = read(HERE / 'verification-manifest.json')
    assert manifest['schema'] == 'zone-helper-verification-v1'
    assert manifest['beforeSourceSha256'] == BEFORE and manifest['finalSourceSha256'] == AFTER and manifest['worldSha256'] == WORLD
    assert manifest['comparisonSha256'] == COMPARATOR and manifest['checks'] == read(HERE / 'checks.json')
    for name, expected in manifest['files'].items():
        assert sha(ROOT / name) == expected, name
    proof = audit()
    assert proof == manifest['independentChecks']
    if '--engine' in sys.argv:
        for name, expected in manifest['currentCodeFiles'].items():
            assert sha(ROOT / name) == expected, name
        assert manifest['changedEngineFiles'] == ['src/sim/behaviors/blocking.ts'] and manifest['addedEngineFiles'] == []
        paths = sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix())
        with tempfile.TemporaryDirectory(prefix='zone-helper-', dir='/tmp') as directory:
            scratch = Path(directory)
            changed = scratch / 'src/sim/behaviors/blocking.ts'
            changed.parent.mkdir(parents=True)
            changed.write_bytes((ROOT / 'src/sim/behaviors/blocking.ts').read_bytes())
            subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
            def source_at(previous=False):
                digest = hashlib.sha256()
                for p in paths:
                    name = p.relative_to(ROOT).as_posix()
                    actual = changed if previous and name == 'src/sim/behaviors/blocking.ts' else p
                    digest.update(name.encode() + b'\0' + actual.read_bytes() + b'\0')
                return digest.hexdigest()
            assert source_at() == AFTER and source_at(True) == BEFORE
    print(json.dumps({'passed': True, **proof, 'assetHashes': len(manifest['files']), 'engineChecked': '--engine' in sys.argv}))


if __name__ == '__main__':
    main()
