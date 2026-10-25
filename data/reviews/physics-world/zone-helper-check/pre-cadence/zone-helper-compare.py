#!/usr/bin/env python3
"""Compare original unattached inside/split-zone helpers in unchanged run panels.

python scripts/diag/zone-helper-compare.py phase-a.json.gz phase-b.json.gz comparison.json

Saved native observations only: this does not run football, call perception,
invent private checkSince state or infer a player's image from current geometry.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path


CHECK_RUNS = {'iz_strong', 'split_zone'}


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


HELPERS = module(Path(__file__).with_name('ol-exchange-compare.py'), 'ol_exchange_primitives')
KEEPERS = module(Path(__file__).with_name('compare-combo-transfer.py'), 'combo_keeper_primitives')


def native_engagement(row, stage, owner, defender):
    member = HELPERS.ownership(row, stage, owner)
    engagement = member['engagement'] if member else None
    return engagement if engagement and engagement['defender'] == defender else None


def compact_engagement(e):
    if e is None:
        return None
    return {key: e[key] for key in ['blocker', 'defender', 'helpers', 'control', 'phi', 'baseB', 'baseD',
                                   'drive', 'axis', 'surfaceAxis', 'hands']}


def consumed(row, target):
    return [c['image'] for c in row['consumedImages'] if c['target'] == target]


def original_combo(trial, slot, combo):
    member = next((m for m in trial['initialProjection']['ownership'] if m['slot'] == slot), None)
    installed = member['plan']['combination'] if member and member['plan'] else None
    return (installed and installed['id'] == combo['id'] and installed['members'] == combo['members']
            and installed['defender'] == combo['defender'] and installed['backer'] == combo['backer'])


def unique(images):
    values = []
    for image in images:
        if image not in values:
            values.append(image)
    return values


def observed_geometry(trial, row, owner, helper, defender, owner_images, defender_images, backer_images, cadence):
    """Reproduce visible fit/corridor only when recorded pictures are unambiguous."""
    players = {p['slot']: p for p in trial['initialProjection']['players']}
    hp, op, dp = players[helper], players[owner], players[defender]
    home_y = hp['body']['pos']['y']
    side = math.copysign(1, home_y - op['body']['pos']['y']) if home_y != op['body']['pos']['y'] else 0
    # physical.ts records reach=.25+.85*(armIn/36), so this inversion uses
    # saved profile data rather than inventing an unrecorded arm measurement.
    arm_yards = (op['profile']['reach'] - .25) / .85
    contact_envelope = op['profile']['radius'] + dp['profile']['radius'] + arm_yards
    result = {'derivedInstalledHomeY': home_y, 'derivedInstalledSide': side,
              'armYardsDerivedFromSavedProfileReach': arm_yards, 'ownerVisibleContactEnvelope': contact_envelope,
              'actualHelperDecisionIntervalFromNextRead': cadence,
              'ownerUniquePictures': len(unique(owner_images)), 'defenderUniquePictures': len(unique(defender_images)),
              'backerUniquePictures': len(unique(backer_images)), 'visibleSurface': None, 'visibleBackerCorridor': None}
    own = unique(owner_images)
    down = unique(defender_images)
    backer = unique(backer_images)
    if len(own) != 1 or len(down) != 1:
        return result
    covered, near = own[0], down[0]
    drive = row['beforeBody']['plan']['drive']
    drive_len = math.hypot(drive['x'], drive['y'])
    axis_x, axis_y = (-drive['x'] / drive_len, -drive['y'] / drive_len) if drive_len > 1e-9 else (0, 0)
    lat_x, lat_y = -axis_y, axis_x
    dx, dy = covered['pos']['x'] - near['pos']['x'], covered['pos']['y'] - near['pos']['y']
    phi = math.atan2(-(dx * lat_x + dy * lat_y), dx * axis_x + dy * axis_y) / (math.pi / 2)
    distance = math.hypot(dx, dy)
    side_distance = side * (near['pos']['y'] - covered['pos']['y'])
    visible_fit = (covered['pose'] == 'up' and near['pose'] == 'up' and abs(phi) < .55
                   and distance <= contact_envelope and side_distance < 0)
    result['visibleSurface'] = {'ownerDLObservedDistance': distance, 'observedPhi': phi,
                                'helpSideSignedDLMinusOwnerY': side_distance,
                                'bothObservedUp': covered['pose'] == 'up' and near['pose'] == 'up',
                                'visibleFitPassesSurfaceGate': visible_fit}
    if len(backer) != 1:
        return result
    target = backer[0]
    start = row['beforeBody']['pos']
    radius = hp['profile']['radius'] + dp['profile']['radius']
    intervals = []
    for dt in [0, cadence]:
        goal_x = target['pos']['x'] + target['vel']['x'] * dt
        goal_y = target['pos']['y'] + target['vel']['y'] * dt
        point_x = near['pos']['x'] + near['vel']['x'] * dt
        point_y = near['pos']['y'] + near['vel']['y'] * dt
        lane_x, lane_y = goal_x - start['x'], goal_y - start['y']
        along = max(0, min(1, ((point_x - start['x']) * lane_x + (point_y - start['y']) * lane_y)
                           / max(1e-12, lane_x * lane_x + lane_y * lane_y)))
        clearance = math.hypot(point_x - start['x'] - along * lane_x, point_y - start['y'] - along * lane_y)
        intervals.append({'dt': dt, 'observedDLDistanceToBackerSegment': clearance,
                          'sumBodyRadii': radius, 'clear': clearance > radius})
    result['visibleBackerCorridor'] = {'samples': intervals, 'clearAtBothSamples': all(s['clear'] for s in intervals)}
    return result


def helper_reads(trial):
    records = []
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    for ordinal, row in enumerate(trial['updates']):
        old = row['beforeBody']['plan']['combination']
        after = row['oldCombinationAfter']
        if not old or old['released'] or not after or old['nextRead'] == after['nextRead']:
            continue
        if len(old['members']) != 2 or row['observer'] != old['members'][1] or row['beforeBody']['engagement']:
            continue
        owner, helper = old['members']
        if not original_combo(trial, helper, old):
            continue
        e = native_engagement(row, 'before', owner, old['defender'])
        after_e = native_engagement(row, 'after', owner, old['defender'])
        solved_e = native_engagement(row, 'afterSolvedOwnership', owner, old['defender'])
        primary = next((m for m in e['members'] if m['slot'] == owner), None) if e else None
        owner_images = consumed(row, owner)
        defender_images = consumed(row, old['defender'])
        backer = consumed(row, old['backer'])
        runner = consumed(row, 'RB')
        cadence = after['nextRead'] - row['t']
        helper_pos = row['beforeBody']['pos']
        filling = [math.hypot(p['pos']['x'] - helper_pos['x'], p['pos']['y'] - helper_pos['y']) < 4.2 for p in backer]
        arriving = [p['pos']['x'] > trial['_los'] - 2.8 for p in runner]
        joint = e['hands'] if e else None
        next_joint = after_e['hands'] if after_e else None
        solved_joint = solved_e['hands'] if solved_e else None
        check_events = [event for event in row['events'] if event['type'] == 'block_climb'
                        and event.get('note', '').startswith('check')]
        ordinary_climbs = [event for event in row['events'] if event['type'] == 'block_climb']
        rows = {
            'id': trial['id'], 'run': trial['run'], 'front': trial['front'], 'flip': trial['flip'], 'seed': trial['seed'],
            't': row['t'], 'completedAt': row['completedAt'], 'observer': row['observer'],
            'retainedUpdateOrdinal': ordinal,
            'installedOwner': owner, 'originalHelper': helper, 'defender': old['defender'], 'backer': old['backer'],
            'installedCheckScope': trial['run'] in CHECK_RUNS,
            'beforePlan': HELPERS.compact_plan(row['beforeBody']['plan']),
            'afterPlan': HELPERS.compact_plan(row['afterBody']['plan']),
            'unattachedOriginalHelperBefore': True,
            'ownerOnInstalledDefender': e is not None and e['blocker'] == owner,
            'ownerLiveNativeHands': bool(joint and joint['live'] and joint['a'] == owner and joint['b'] == old['defender']),
            'ownerSupportAvailability': primary['supportAvailability'] if primary else None,
            'ownerDownBefore': primary['down'] if primary else None,
            'ownerHasOutsideHelper': bool(e and any(s not in old['members'] for s in e['helpers'])),
            'ownerSecureAcrossClampedUrgencyThresholds': bool(e and e['control'] > -.072 and e['baseB'] > .60 and abs(e['phi']) < .55),
            'beforeOwnerEngagement': compact_engagement(e),
            'afterControllerOwnerEngagement': compact_engagement(after_e),
            'afterSolvedOwnerEngagement': compact_engagement(solved_e),
            'ownerSameJointAfterController': bool(joint and next_joint and joint['id'] == next_joint['id']),
            'ownerSameJointAfterSolve': bool(joint and solved_joint and joint['id'] == solved_joint['id']),
            'ownerControlUnchangedByController': bool(e and after_e and e['control'] == after_e['control']),
            'ownerPhiUnchangedByController': bool(e and after_e and e['phi'] == after_e['phi']),
            'ownerSurfaceUnchangedByController': bool(e and after_e and e['axis'] == after_e['axis']),
            'ownerDriveUnchangedByController': bool(e and after_e and e['drive'] == after_e['drive']),
            'ownerImagesConsumedByHelperInUpdate': owner_images,
            'defenderImagesConsumedByHelperInUpdate': defender_images,
            'backerImagesConsumedByHelperInUpdate': backer,
            'runnerImagesConsumedByHelperInUpdate': runner,
            'derivedOwnObservedGeometry': observed_geometry(trial, row, owner, helper, old['defender'],
                                                           owner_images, defender_images, backer, cadence),
            'fillingFromEachConsumedBackerImage': filling,
            'arrivingFromEachConsumedRunnerImage': arriving,
            'anyRecordedFillingOrArrivingCue': any(filling) or any(arriving),
            'checkClimbEvents': check_events, 'anyBlockClimbEvents': ordinary_climbs,
            'checkClimbEventsNameOriginalHelperAndBacker': bool(check_events and all(
                slots[event['a']] == helper and slots[event['b']] == old['backer'] for event in check_events)),
            'checkClimbTagAfter': 'combo-check-climb' in row['afterBody']['tags'],
            'oldCombinationReleasedAfterUpdate': after['released'],
            'afterWholeUpdateStillClimbOnBacker': row['afterBody']['plan']['kind'] == 'climb'
                and row['afterBody']['plan']['target'] == old['backer'],
            'helperBodyPositionUnchangedByController': row['beforeBody']['pos'] == row['afterBody']['pos'],
            'helperBodyVelocityUnchangedByController': row['beforeBody']['vel'] == row['afterBody']['vel'],
            'helperFootSupportUnchangedByController': row['beforeBody']['support'] == row['afterBody']['support'],
            'nativeHelperSupportBefore': row['beforeBody']['support'],
            'helperFullPreUpdateWorldJointsCaptured': False,
            'requestedIntent': row['requested'],
            'nativeOwnerNextSolvedLoad': HELPERS.compact_load(row, owner),
            'nativeHelperNextSolvedLoad': HELPERS.compact_load(row, helper),
        }
        records.append(rows)
    return records


def check_climbs(trial):
    return [r for r in helper_reads(trial) if r['checkClimbEvents']]


def climb_followup(trial, climb):
    """Separate a new job label from actual later contact and changed work."""
    helper, backer = climb['originalHelper'], climb['backer']
    hands, body_contacts, changes = [], [], []
    earliest = climb['t']
    observed_ticks = set()
    m = trial['olMetrics'].get(helper)
    if m:
        for kind, rows in [('first-native-hands', m['firstHands']), ('first-native-body-contact', m['firstContacts'])]:
            for first in rows:
                if first['other'] != backer or first['t'] < earliest:
                    continue
                load = first['nativeLoad']
                if kind == 'first-native-hands':
                    for joint in load['liveHandsAfterPhysics']:
                        if {joint['a'], joint['b']} == {helper, backer}:
                            hands.append({'t': first['t'], 'completedAt': first['completedAt'], 'evidence': kind,
                                          'joint': joint, 'helperPosition': first['blockerPosition'],
                                          'backerPosition': first['defenderPosition']})
                else:
                    for contact in load['physicalContacts']:
                        if contact['other'] == backer:
                            body_contacts.append({'t': first['t'], 'completedAt': first['completedAt'], 'evidence': kind,
                                                  'contact': contact, 'helperPosition': first['blockerPosition'],
                                                  'backerPosition': first['defenderPosition']})
    for ordinal, row in enumerate(trial['updates']):
        if ordinal < climb['retainedUpdateOrdinal']:
            continue
        load = HELPERS.compact_load(row, helper)
        if load and row['t'] not in observed_ticks:
            observed_ticks.add(row['t'])
            for joint in load['liveHandsAfterPhysics']:
                if {joint['a'], joint['b']} == {helper, backer}:
                    hands.append({'t': row['t'], 'completedAt': row['completedAt'], 'evidence': 'retained-native-solved-load',
                                  'joint': joint, 'helperPosition': load['achievedPos']})
            full_load = next(m for m in row['deliveredStep'] if m['slot'] == helper)
            for contact in full_load['physicalContacts']:
                if contact['other'] == backer:
                    body_contacts.append({'t': row['t'], 'completedAt': row['completedAt'], 'evidence': 'retained-native-solved-load',
                                          'contact': contact, 'helperPosition': load['achievedPos']})
        if ordinal == climb['retainedUpdateOrdinal']:
            continue
        old = HELPERS.ownership(row, 'before', helper)
        new = HELPERS.ownership(row, 'after', helper)
        if old and new and old['plan']['target'] != new['plan']['target']:
            changes.append({'t': row['t'], 'observer': row['observer'], 'before': HELPERS.compact_plan(old['plan']),
                            'after': HELPERS.compact_plan(new['plan']), 'events': row['events'],
                            'ownConsumedImages': row['consumedImages'] if row['observer'] == helper else None})
    hands.sort(key=lambda r: r['t'])
    body_contacts.sort(key=lambda r: r['t'])
    loaded_hands = [r for r in hands if r['joint']['live']
                    and abs(r['joint']['normalForce']) + abs(r['joint']['tangentForce']) > 1e-9]
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    falls = [event for event in trial['result']['events'] if event['type'] == 'fall' and event['t'] >= earliest
             and slots[event['a']] == helper]
    return {
        'id': trial['id'], 't': earliest, 'helper': helper, 'installedBacker': backer,
        'hasRecordedNativeBackerHands': bool(hands),
        'hasRecordedPositiveBackerHandForce': bool(loaded_hands),
        'hasRecordedNativeBackerBodyContact': bool(body_contacts),
        'firstRecordedNativeBackerHands': hands[0] if hands else None,
        'firstRecordedPositiveBackerHandForce': loaded_hands[0] if loaded_hands else None,
        'firstRecordedNativeBackerBodyContact': body_contacts[0] if body_contacts else None,
        'secondsToFirstRecordedBackerHands': hands[0]['t'] - earliest if hands else None,
        'laterActualTargetChanges': changes,
        'laterHelperFalls': falls,
        'helperWholePlayFalls': m['falls'] if m else None,
        'helperWholePlayDowns': m['downs'] if m else None,
        'finalRun': {key: trial['result'][key] for key in ['offenseYards', 'duration', 'outcome']},
        'climbEvidenceClassification': 'confirmed-loaded-backer-hands' if loaded_hands else
            'confirmed-backer-hands-without-recorded-positive-force' if hands else
            'body-contact-without-recorded-backer-hands' if body_contacts else 'job-change-without-recorded-backer-contact',
    }


def adverse_witness(trial):
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    climbs = []
    for transfer in KEEPERS.transfers(trial):
        row = transfer['nativeRecord']
        compact = {key: value for key, value in transfer.items() if key != 'nativeRecord'}
        combo = row['beforeBody']['plan']['combination']
        compact.update({'beforeCombination': combo, 'ownConsumedImages': row['consumedImages'],
                        'beforeKeeperEngagement': compact_engagement(native_engagement(row, 'before', transfer['keeper'], transfer['defender'])),
                        'afterKeeperEngagement': compact_engagement(native_engagement(row, 'after', transfer['keeper'], transfer['defender'])),
                        'afterSolvedKeeperEngagement': compact_engagement(native_engagement(row, 'afterSolvedOwnership', transfer['keeper'], transfer['defender']))})
        climbs.append(compact)
    return {
        'result': {key: trial['result'][key] for key in ['offenseYards', 'duration', 'outcome', 'stats', 'penalty'] if key in trial['result']},
        'actualCombinationClimbs': climbs,
        'eventTrace': [{**event, **({'aSlot': slots[event['a']]} if 'a' in event else {}),
                        **({'bSlot': slots[event['b']]} if 'b' in event else {})} for event in trial['result']['events']],
    }


def metrics(trials):
    # Keep existing ordinary football definitions and add only the new narrow
    # original-helper diagnostics. No old published comparator is modified.
    result = HELPERS.metrics(trials)
    reads = [r for trial in trials for r in helper_reads(trial)]
    climbs = [r for r in reads if r['checkClimbEvents']]
    followups = [climb_followup(trial, r) for trial in trials for r in check_climbs(trial)]
    result.update({
        'scheduledFreeOriginalHelperReads': len(reads),
        'installedCheckScopeFreeHelperReads': sum(r['installedCheckScope'] for r in reads),
        'readsWithInstalledOwnerLiveHands': sum(r['ownerOnInstalledDefender'] and r['ownerLiveNativeHands'] for r in reads),
        'readsWithConservativelySecureOwner': sum(r['ownerSecureAcrossClampedUrgencyThresholds'] for r in reads),
        'checkClimbs': len(climbs),
        'checkClimbsWithOwnConsumedBacker': sum(bool(r['backerImagesConsumedByHelperInUpdate']) for r in climbs),
        'checkClimbsWithOwnConsumedRunner': sum(bool(r['runnerImagesConsumedByHelperInUpdate']) for r in climbs),
        'checkClimbsWithOwnConsumedOwner': sum(bool(r['ownerImagesConsumedByHelperInUpdate']) for r in climbs),
        'checkClimbsWithOwnConsumedDefender': sum(bool(r['defenderImagesConsumedByHelperInUpdate']) for r in climbs),
        'checkClimbsWithRecordedFillingOrArrivingCue': sum(r['anyRecordedFillingOrArrivingCue'] for r in climbs),
        'checkClimbsSameOwnerJointAfterController': sum(r['ownerSameJointAfterController'] for r in climbs),
        'checkClimbsSameOwnerJointAfterSolve': sum(r['ownerSameJointAfterSolve'] for r in climbs),
        'checkClimbsOwnerControlUnchangedByController': sum(r['ownerControlUnchangedByController'] for r in climbs),
        'checkClimbsOwnerPhiUnchangedByController': sum(r['ownerPhiUnchangedByController'] for r in climbs),
        'checkClimbsOwnerSurfaceUnchangedByController': sum(r['ownerSurfaceUnchangedByController'] for r in climbs),
        'checkClimbsOwnerDriveUnchangedByController': sum(r['ownerDriveUnchangedByController'] for r in climbs),
        'checkClimbsAfterUpdateStillOnBacker': sum(r['afterWholeUpdateStillClimbOnBacker'] for r in climbs),
        'checkClimbsWithRecordedLaterBackerHands': sum(r['hasRecordedNativeBackerHands'] for r in followups),
        'checkClimbsWithRecordedLaterPositiveBackerHandForce': sum(r['hasRecordedPositiveBackerHandForce'] for r in followups),
        'checkClimbsWithRecordedLaterBackerBodyContact': sum(r['hasRecordedNativeBackerBodyContact'] for r in followups),
        'checkClimbsWithLaterTargetChanges': sum(bool(r['laterActualTargetChanges']) for r in followups),
        'checkClimbsWithLaterHelperFalls': sum(bool(r['laterHelperFalls']) for r in followups),
    })
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    b, a = HELPERS.read(args.before), HELPERS.read(args.after)
    for report in [b, a]:
        HELPERS.require(report['schema'] == 'combo-transfer-review-v1', 'Unexpected collector schema')
        HELPERS.require(report['sourceBefore'] == report['sourceAfter'], 'Engine changed during collector')
        HELPERS.require(len(report['trials']) == 160 and len(report['supplementalTrials']) == 2, 'Missing fixed cohort trials')
        for trial in report['trials'] + report['supplementalTrials']:
            HELPERS.require(trial['observerVerified'] and trial['observedSignature'] == trial['plainSignature'], f'Observer changed {trial["id"]}')
            HELPERS.require(trial['naturalEnd'] == (trial['result']['outcome'] != 'timeout'), f'Natural-end mislabel {trial["id"]}')
            trial['_los'] = report['cohort']['los']
    HELPERS.require(b['cohort'] == a['cohort'] and b['collectorSha256'] == a['collectorSha256'], 'Cohort/collector changed')
    HELPERS.require(b['filmIds'] == a['filmIds'], 'Fixed film IDs changed')
    paired = {}
    controls = []
    for scope in ['trials', 'supplementalTrials']:
        old = {t['id']: t for t in b[scope]}
        new = {t['id']: t for t in a[scope]}
        HELPERS.require(len(old) == len(b[scope]) and len(new) == len(a[scope]) and old.keys() == new.keys(), 'Duplicate/missing fixed IDs')
        for id_, t in old.items():
            n = new[id_]
            HELPERS.require(t['initialProjection'] == n['initialProjection'], f'Full initial projection changed {id_}')
            HELPERS.require(t['initialSha256'] == n['initialSha256'] and t['profileSha256'] == n['profileSha256'], f'Initial/profile SHA changed {id_}')
            HELPERS.require(all(t[k] == n[k] for k in ['run', 'front', 'flip', 'seed', 'roster', 'formation', 'supplemental']), f'Input labels changed {id_}')
            controls.append({'id': id_, 'initialSha256': t['initialSha256'], 'profileSha256': t['profileSha256'],
                             'fullProjectionMatch': True, 'beforeObserverNeutral': True, 'afterObserverNeutral': True,
                             'beforeNaturalEnd': t['naturalEnd'], 'afterNaturalEnd': n['naturalEnd']})
        paired[scope] = [HELPERS.paired(t, new[id_]) for id_, t in old.items()]
    all_b, all_a = b['trials'] + b['supplementalTrials'], a['trials'] + a['supplementalTrials']
    before_reads = [r for t in all_b for r in helper_reads(t)]
    after_reads = [r for t in all_a for r in helper_reads(t)]
    new_climbs = [r for r in after_reads if r['checkClimbEvents']]
    for r in new_climbs:
        HELPERS.require(r['installedCheckScope'] and r['ownerOnInstalledDefender'] and r['ownerLiveNativeHands'], f'Check-climb outside installed/native scope {r["id"]}')
        HELPERS.require(not r['ownerHasOutsideHelper'], f'Check-climb bypassed outsider helper {r["id"]}')
        HELPERS.require(not r['beforeOwnerEngagement']['helpers'], f'Check-climb departed non-solo owner {r["id"]}')
        HELPERS.require(r['ownerSupportAvailability'] is not None and r['ownerSupportAvailability'] > .60
                        and r['ownerDownBefore'] is False, f'Check-climb bypassed owner footing guard {r["id"]}')
        HELPERS.require(r['beforePlan']['kind'] == 'combo', f'Check-climb bypassed original helper approach guard {r["id"]}')
        HELPERS.require(r['checkClimbTagAfter'] and r['oldCombinationReleasedAfterUpdate']
                        and r['checkClimbEventsNameOriginalHelperAndBacker'], f'Check-climb did not release/names wrong participant {r["id"]}')
        HELPERS.require(r['helperBodyPositionUnchangedByController'] and r['helperBodyVelocityUnchangedByController'] and r['helperFootSupportUnchangedByController'], f'Check-climb changed body/support directly {r["id"]}')
    witness_ids = sorted({r['id'] for r in new_climbs} | {'CT-R1-split_zone-tite-R-S3'})
    old_map, new_map = {t['id']: t for t in all_b}, {t['id']: t for t in all_a}
    witnesses = {id_: {
        'pair': HELPERS.paired(old_map[id_], new_map[id_]),
        'beforeScheduledOriginalHelperReads': helper_reads(old_map[id_]),
        'afterScheduledOriginalHelperReads': helper_reads(new_map[id_]),
    } for id_ in witness_ids}
    adverse_ids = [p['id'] for p in paired['trials'] + paired['supplementalTrials'] if p['yardsDelta'] < -1e-9]
    output = {
        'schema': 'zone-helper-comparison-v1', 'comparisonSha256': HELPERS.sha(Path(__file__)),
        'reusedPrimitives': {str(Path(m.__file__)): HELPERS.sha(Path(m.__file__)) for m in [HELPERS, KEEPERS]},
        'observedGeometryProfileDerivationPin': {'path': 'src/players/physical.ts',
            'sha256': HELPERS.sha(Path('src/players/physical.ts')), 'formula': 'profile.reach=.25+.85*(armIn/36)'},
        'inputs': {str(p): HELPERS.sha(p) for p in [args.before, args.after]},
        'sources': {'before': b['sourceBefore'], 'after': a['sourceBefore']},
        'modules': {'before': b['moduleSha256'], 'after': a['moduleSha256']},
        'physicalCoreModulesUnchanged': {p: b['moduleSha256'][p] == a['moduleSha256'][p]
                                         for p in ['src/sim/engagement.ts', 'src/physics/world.ts']},
        'collectorSha256': b['collectorSha256'], 'cohort': b['cohort'], 'fixedFilmIds': b['filmIds'],
        'initialAndControlChecks': controls, 'fullInitialProjectionsMatch': True,
        'ordinary': {'before': metrics(b['trials']), 'after': metrics(a['trials'])},
        'byConcept': {run: {'before': metrics([t for t in b['trials'] if t['run'] == run]),
                            'after': metrics([t for t in a['trials'] if t['run'] == run])} for run in b['cohort']['runs']},
        'byFront': {front: {'before': metrics([t for t in b['trials'] if t['front'] == front]),
                            'after': metrics([t for t in a['trials'] if t['front'] == front])} for front in b['cohort']['fronts']},
        'supplemental': {'before': metrics(b['supplementalTrials']), 'after': metrics(a['supplementalTrials'])},
        'nativeLimits': {'before': KEEPERS.physics_limits(b), 'after': KEEPERS.physics_limits(a)},
        'keeperContinuity': {
            'ordinary160': {'before': HELPERS.transfer_summary(b['trials'], KEEPERS), 'after': HELPERS.transfer_summary(a['trials'], KEEPERS)},
            'supplemental2': {'before': HELPERS.transfer_summary(b['supplementalTrials'], KEEPERS), 'after': HELPERS.transfer_summary(a['supplementalTrials'], KEEPERS)},
        },
        'pairedResults': paired['trials'], 'pairedSupplementalResults': paired['supplementalTrials'],
        'identicalCompleteExecutions': sum(p['identicalCompleteExecution'] for p in paired['trials']),
        'changedCompleteExecutions': [p for p in paired['trials'] if not p['identicalCompleteExecution']],
        'adverseAnyGainPairs': [p for p in paired['trials'] if p['yardsDelta'] < -1e-9],
        'adverse2YardPairs': [p for p in paired['trials'] if p['yardsDelta'] <= -2],
        'beneficial2YardPairs': [p for p in paired['trials'] if p['yardsDelta'] >= 2],
        'supplementalAdverseAnyGainPairs': [p for p in paired['supplementalTrials'] if p['yardsDelta'] < -1e-9],
        'checkClimbs': {'before': [r for r in before_reads if r['checkClimbEvents']], 'after': new_climbs},
        'checkClimbFollowups': {'before': [climb_followup(t, r) for t in all_b for r in check_climbs(t)],
                               'after': [climb_followup(t, r) for t in all_a for r in check_climbs(t)]},
        'freeOriginalHelperReadCountsByConcept': {
            run: {'before': sum(r['run'] == run for r in before_reads), 'after': sum(r['run'] == run for r in after_reads)} for run in b['cohort']['runs']},
        'nativeWitnesses': witnesses,
        'adverseNativeWitnesses': {id_: {'pair': HELPERS.paired(old_map[id_], new_map[id_]),
                                        'before': adverse_witness(old_map[id_]),
                                        'after': adverse_witness(new_map[id_])} for id_ in adverse_ids},
        'definitions': {
            'scheduledOriginalHelperRead': 'Original installed members[1], still in its unreleased original combination, no physical engagement, and combo.nextRead advances in the ordinary update. The current primary need not be on that defender; its state is separately recorded.',
            'installedScope': 'Inside/split zone inferred from the fixed initial call and installed member roles. The unchanged collector does not record new helpRule metadata, and this report does not assert full equality of unrecorded new policy fields.',
            'checkClimb': 'Actual block_climb event with check-prefixed detail during a scheduled free-original-helper read, naming that helper/backer, plus native combo-check-climb tag and released old combination. Final whole-update work is separate: ordinary later retargeting can change it, so a climb/backer final plan is not required.',
            'ownerSecurity': 'Conservative clamped-urgency descriptive threshold e.control>-.072, baseB>.60, |phi|<.55; -.072 is the largest ordinary threshold over mind urgency range[.1,.95]. Exact current observer urgency is absent. Native owner hands, support availability and outsiders recorded separately.',
            'ownCue': 'Owner/DL/backer/RB images actually consumed by this helper in the update. Filling/arriving are computed for each recorded backer/RB image using the ordinary4.2yd and LOS−2.8 predicates. Presence alone does not assign the image to a particular private method.',
            'observedGeometry': 'Visible fit/corridor computed only for unambiguous consumed owner/DL/backer pictures. Installed home/side derive from original saved body positions; measured arm yards invert saved profile.reach via pinned physical.ts. Actual dynamic read cadence is oldCombinationAfter.nextRead−t, not initial decisionInterval. Corridor is a visual cue, not a successful physical path claim.',
            'stability': 'Private helper checkSince is not recorded by this collector; its exact state/reset/dwell needs independent tests/source review. The scheduled read sequence is retained for witnesses without inventing it.',
            'keeper': 'Actual live owner hand joint before departure compared by per-play ID after controller and next native solve. Contact/control/drive/surface snapshots and solved loads are independent of job labels.',
            'climbFollowup': 'New climb labels separated from later actual backer body contacts, live hand joints, positive native hand force and target changes. Uses unchanged per-OL first contact/hands metrics plus all retained solved loads/ownership changes. Absence means no recorded confirmation, not proof a runner-free future lane was successfully blocked or that no unretained body touch occurred.',
            'nativeUnits': 'Force kg·yd/s², impulse kg·yd/s, work kg·yd²/s²; SI force/impulse ×0.9144, work ×0.9144².',
            'retainedScope': 'Native OL limits cover retained controller ticks; global work/momentum residuals were recorded at every solved tick. No full nativeRecord duplication in this summary.',
        },
        'limitations': [
            'Balanced160 with one generated roster pair31/32 is not an NFL success-rate/concept-distribution target. Two roster41/42 recovery witnesses remain separate.',
            'The saved initial projection omits newly added helper-policy metadata/private stability state. Initial physical/profile/plan projections match exactly; source/tests establish new rule defaults and scope.',
            'The full pre-update World joint list is absent; a missing RunBlocker engagement does not by itself prove the helper has no grasp/press joint. That exclusion needs independent source/tests.',
            'Consumed images elsewhere in the same update may come from crossing-threat or ordinary approach rules; they are not automatically labelled a check-policy cue.',
            'A mechanically feasible helper departure can improve or worsen a later coupled football outcome; all paired and adverse outcomes remain visible.',
            'First-contact metrics keep only the first contact for each player pair; later pair contacts before a retained row may be absent. No-recorded-contact is therefore distinct from a proven miss.',
            'No fresh perception calls, body parking, fabricated gains, global resolution changes or runtime-speed claims are introduced by comparison.',
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({key: output[key] for key in ['sources', 'ordinary', 'supplemental', 'identicalCompleteExecutions',
                                                 'adverseAnyGainPairs', 'beneficial2YardPairs', 'nativeLimits', 'keeperContinuity']}, indent=2))


if __name__ == '__main__':
    main()
