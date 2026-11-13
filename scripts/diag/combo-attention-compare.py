#!/usr/bin/env python3
"""Compact comparison of cached B162/C162 plus six common neutral witnesses.

python scripts/diag/combo-attention-compare.py B.json.gz C.json.gz \
    witness-B.json.gz witness-C.json.gz comparison.json

The old panel's command-local records miss candidate prepass decisions. Actual
climbs therefore come from whole-play events; detailed continuity and personal
reads are proved only in the six predeclared witnesses, not all 162 releases.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


HELPERS = module(Path(__file__).with_name('ol-exchange-compare.py'), 'attention_primitives')
KEEPERS = module(Path(__file__).with_name('compare-combo-transfer.py'), 'attention_native_limits')
B_SOURCE = 'd6dfa190412da52725780c71db02f73305b3e3f5541b4c8e9d755a3296ee568f'
PANEL_COLLECTOR = '1e6180d476b3a8ff5476badcf02309cf8706adcf0e954d9e475c4cce5f3685f6'


def football_projection(projection):
    """Omit only explicitly obsolete shared joined-controller clock caches."""
    result = json.loads(json.dumps(projection))
    for row in result['ownership']:
        combo = row['plan'].get('combination') if row['plan'] else None
        if combo:
            combo.pop('nextRead', None)
            combo.pop('secureSince', None)
    return result


def events(trial, kind):
    return [event for event in trial['result']['events'] if event['type'] == kind]


def metrics(trials):
    ol = [m for t in trials for m in t['olMetrics'].values()]
    whole = [e for t in trials for e in events(t, 'block_climb')]
    return {'snaps': len(trials), 'naturalEnds': sum(t['naturalEnd'] for t in trials),
            'censors': sum(not t['naturalEnd'] for t in trials),
            'observerPlainMatches': sum(t['observedSignature'] == t['plainSignature'] for t in trials),
            'meanYards': HELPERS.avg([t['result']['offenseYards'] for t in trials]),
            'stuffs': sum(t['result']['offenseYards'] <= 0 for t in trials),
            'runs10Plus': sum(t['result']['offenseYards'] >= 10 for t in trials),
            'actualWholePlayClimbs': len(whole),
            'actualCheckClimbs': sum(e.get('note', '').startswith('check') for e in whole),
            'commandLocalClimbsReportedByOldCollector': sum(t['earnedClimbs'] for t in trials),
            'actualClimbsOutsideCommandLocalCapture': len(whole) - sum(t['earnedClimbs'] for t in trials),
            'olFalls': sum(m['falls'] for m in ol), 'olDowns': sum(m['downs'] for m in ol),
            'cancelledTransitions': sum(t['cancelledTransitions'] for t in trials),
            'staleMemberUpdates': sum(t['staleMemberUpdates'] for t in trials),
            'maxMomentumResidual': max((t['maxMomentumResidual'] for t in trials), default=0),
            'maxWorkResidual': max((t['maxWorkResidual'] for t in trials), default=0),
            'maxMotorWorkExcess': max((t['maxMotorWorkExcess'] for t in trials), default=0)}


def pair(old, new):
    return {'id': old['id'], 'run': old['run'], 'front': old['front'], 'flip': old['flip'], 'seed': old['seed'],
            'beforeYards': old['result']['offenseYards'], 'afterYards': new['result']['offenseYards'],
            'yardsDelta': new['result']['offenseYards'] - old['result']['offenseYards'],
            'beforeOutcome': old['result']['outcome'], 'afterOutcome': new['result']['outcome'],
            'beforeDuration': old['result']['duration'], 'afterDuration': new['result']['duration'],
            'beforeClimbs': len(events(old, 'block_climb')), 'afterClimbs': len(events(new, 'block_climb')),
            'beforeNaturalEnd': old['naturalEnd'], 'afterNaturalEnd': new['naturalEnd'],
            'beforeCommandLocalClimbs': old['earnedClimbs'], 'afterCommandLocalClimbs': new['earnedClimbs'],
            'identicalCompleteExecution': old['observedSignature'] == new['observedSignature'],
            'identicalCompletePublicResult': old['result'] == new['result'],
            'identicalRecordedWholePlayOLMetrics': old['olMetrics'] == new['olMetrics']}


def compact_whole_climbs(trial):
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    result = []
    for event in events(trial, 'block_climb'):
        climber, backer = slots[event['a']], slots[event['b']] if event.get('b') is not None else None
        metrics_ = trial['olMetrics'].get(climber)
        hands = [compact_contact(r) for r in metrics_['firstHands'] if r['other'] == backer and r['t'] >= event['t'] - 1e-9] if metrics_ else None
        contacts = [compact_contact(r) for r in metrics_['firstContacts'] if r['other'] == backer and r['t'] >= event['t'] - 1e-9] if metrics_ else None
        result.append({'t': event['t'], 'climber': climber, 'backer': backer, 'note': event.get('note'),
                       'commandLocalEventCaptured': any(e == event for r in trial['updates'] for e in r['events']),
                       'laterRecordedOLFirstBackerHands': hands, 'laterRecordedOLFirstBackerBodyContacts': contacts,
                       'OLFirstContactMetricsAvailable': metrics_ is not None})
    return result


def whole_climb_reference(row):
    return {k: row[k] for k in ['t', 'climber', 'backer', 'note', 'commandLocalEventCaptured', 'OLFirstContactMetricsAvailable']} | {
        'laterRecordedOLBackerFirstHands': bool(row['laterRecordedOLFirstBackerHands']),
        'laterRecordedPositiveOLBackerFirstHandForce': any(r['positiveRecordedPairHandForce'] for r in row['laterRecordedOLFirstBackerHands'] or []),
        'laterRecordedOLBackerFirstBodyContact': bool(row['laterRecordedOLFirstBackerBodyContacts']),
        'rawContactReference': f'olMetrics.{row["climber"]}.firstHands / firstContacts'}


def compact_contact(row):
    load = row['nativeLoad']
    pair = [j for j in load['liveHandsAfterPhysics'] if {j['a'], j['b']} == {load['slot'], row['other']}]
    force = max((math.hypot(j.get('normalForce', 0), j.get('tangentForce', 0)) for j in pair), default=0)
    return {key: row[key] for key in ['t', 'completedAt', 'other', 'planKind', 'planTarget']} | {
        'nativeArmImpulse': load['armImpulse'], 'positiveRecordedPairHandForce': force > 1e-6,
        'recordedPairHandForceMagnitude': force,
        'recordedPairBodyImpulse': sum(c['impulse'] for c in load['physicalContacts'] if c['other'] == row['other'])}


def adverse_classification(old, new):
    """Describe the first saved release difference without claiming causation."""
    before, after = compact_whole_climbs(old), compact_whole_climbs(new)
    old_choices = [(r['t'], r['climber'], r['backer']) for r in before]
    new_choices = [(r['t'], r['climber'], r['backer']) for r in after]
    difference = next((i for i in range(max(len(old_choices), len(new_choices)))
                       if (old_choices[i] if i < len(old_choices) else None)
                       != (new_choices[i] if i < len(new_choices) else None)), None)
    reasons = []
    if len(before) != len(after):
        reasons.append('actual release count changed')
    if [(r['climber'], r['backer']) for r in before] != [(r['climber'], r['backer']) for r in after]:
        reasons.append('actual departing player/backer sequence changed')
    if [r['t'] for r in before] != [r['t'] for r in after]:
        reasons.append('actual release time sequence changed')
    if not reasons:
        reasons.append('same emitted release times/roles; subsequent outcome differed')
    return {'descriptiveCategories': reasons,
            'firstDifferentReleaseIndex': difference,
            'firstDifferentReleaseBefore': whole_climb_reference(before[difference]) if difference is not None and difference < len(before) else None,
            'firstDifferentReleaseAfter': whole_climb_reference(after[difference]) if difference is not None and difference < len(after) else None,
            'beforeOLFalls': sum(m['falls'] for m in old['olMetrics'].values()),
            'afterOLFalls': sum(m['falls'] for m in new['olMetrics'].values()),
            'scope': 'Whole-event release sequence and native recorded falls. This is a descriptive classification, not proof of the first physical or causal divergence.'}


def native_case(trial):
    return {'result': {key: trial['result'][key] for key in ['outcome', 'offenseYards', 'duration', 'endX', 'endY']},
            'actualClimbs': compact_whole_climbs(trial),
            'actualFalls': events(trial, 'fall'), 'actualSheds': events(trial, 'block_shed'),
            'actualTackleEvents': [e for e in trial['result']['events'] if e['type'] in {'tackle_attempt', 'tackle_grip', 'tackle', 'broken_tackle'}],
            'nativeTrialReference': {'trialId': trial['id'], 'events': 'result.events', 'OLLoadsAndContacts': 'olMetrics / retained updates.deliveredStep'}}


def witness_reads(play):
    """Each attention attempt is a readAt transition; visual calls may be absent."""
    records, seen = [], set()
    for tick in play['ticks']:
        boundaries = ([dict(tick['prepass'], phase='joined-prepass')] if tick['prepass'] else [])
        boundaries += [dict(row, phase='run-block-command') for row in tick['commands']]
        for row in boundaries:
            old_by_id = {c['id']: c for c in row['beforeCombinations']}
            for combo in row['afterCombinations']:
                old = old_by_id.get(combo['id'])
                for i, read in enumerate(combo['personalReads'] or []):
                    before = old['personalReads'][i] if old and old['personalReads'] is not None else None
                    if read['readAt'] != tick['t'] or (before and before['readAt'] == read['readAt']):
                        continue
                    key = (combo['id'], read['observer'], read['readAt'])
                    if key in seen:
                        continue
                    seen.add(key)
                    observer = read['observer']
                    source_combo = old or combo
                    actor = next(m for m in source_combo['memberState'] if m['slot'] == observer)
                    keeper = next(m['slot'] for m in source_combo['memberState'] if m['slot'] != observer)
                    images = [c for c in tick['consumedImages'][row['firstImageOrdinal']:row['endImageOrdinal']]
                              if c['observer'] == observer]
                    by_target = {target: [c['image'] for c in images if c['target'] == target]
                                 for target in [keeper, combo['defender'], combo['backer'], 'RB']}
                    records.append({'id': play['id'], 't': tick['t'], 'phase': row['phase'],
                        'combinationId': combo['id'], 'observer': observer, 'keeper': keeper,
                        'defender': combo['defender'], 'backer': combo['backer'],
                        'genuinelyJoinedAtBoundaryStart': bool(old and old['genuinelyJoined']),
                        'snapReadyAt': actor['snapReadyAt'], 'actualDecisionInterval': actor['decisionInterval'],
                        'actualUrgency': actor['urgency'], 'observerPosition': actor['physical']['pos'],
                        'beforePersonalRead': before, 'afterPersonalRead': read,
                        'recordedNativeEligibility': native_eligibility(source_combo, observer, actor['urgency']),
                        'ownConsumedPictures': by_target,
                        'ownKeeperDLVisualReadCaptured': bool(by_target[keeper] and by_target[combo['defender']]),
                        'ownBackerRunnerReadCaptured': bool(by_target[combo['backer']] and by_target['RB']),
                        'ownImageAges': {target: [p['age'] for p in pictures] for target, pictures in by_target.items()},
                        'proposalIsOwnDeparture': read['proposal']['climber'] == observer if read['proposal'] else None})
    return records


def native_eligibility(combo, observer, urgency):
    """Describe the recorded actual hand/support/control gates, not perception."""
    keeper = next(slot for slot in combo['members'] if slot != observer)
    actor = member(combo, observer)
    e = actor['engagement'] if actor else None
    if not e:
        return {'nativeEngagementRecorded': False, 'recordedKeeperCandidateFeasible': None,
                'recordedCommonSecurityPasses': None, 'knownPhysicalVetoes': []}
    kept = next((m for m in e['members'] if m['slot'] == keeper), None)
    if not kept:
        return {'nativeEngagementRecorded': True, 'recordedKeeperCandidateFeasible': None,
                'recordedCommonSecurityPasses': None, 'knownPhysicalVetoes': ['keeper absent from actual native engagement']}
    hands = kept['hands']
    gates = {'keeperUpright': not kept['down'], 'keeperSupportAbove060': kept['supportAvailability'] > .60,
             'keeperSurfacePhiWithin065': abs(kept['surfacePhi']) < .65,
             'realKeeperHandsLive': bool(hands and hands['live'] and hands['a'] == keeper and hands['b'] == combo['defender']),
             'keeperHasUsefulExistingContact': keeper == e['blocker'] or (kept['helperSupport'] is not None and kept['helperSupport'] >= .25)}
    threshold = -.12 + .12 * (.5 - urgency)
    security = {'controlPassesOwnUrgencyThreshold': e['control'] > threshold,
                'primaryBaseAbove060': e['baseB'] > .60, 'primaryPhiWithin055': abs(e['phi']) < .55}
    return {'nativeEngagementRecorded': True, 'actualKeeper': keeper, 'actualControl': e['control'],
            'ownUrgencySecurityThreshold': threshold, 'actualPrimaryBase': e['baseB'], 'actualPrimaryPhi': e['phi'],
            'actualKeeperSupport': kept['supportAvailability'], 'actualKeeperPhi': kept['surfacePhi'],
            'actualKeeperHelperSupport': kept['helperSupport'], 'actualKeeperHands': hands,
            'keeperGates': gates, 'commonSecurityGates': security,
            'recordedKeeperCandidateFeasible': all(gates.values()),
            'recordedCommonSecurityPasses': all(security.values()),
            'knownPhysicalVetoes': [k for k, passes in (gates | security).items() if not passes],
            'scope': 'Recorded keeper hand/support/fit and common security only. Missing defender/body or foreign constraints are not invented.'}


def historical_reads(play):
    """True historical due-call/observer capture; no hypothetical personal B state."""
    records = []
    for tick in play['ticks']:
        for row in tick['commands']:
            after = {c['id']: c for c in row['afterCombinations']}
            for before in row['beforeCombinations']:
                new = after.get(before['id'])
                if not new or before['legacySchedule'] == new['legacySchedule']:
                    continue
                images = [c for c in tick['consumedImages'][row['firstImageOrdinal']:row['endImageOrdinal']]
                          if c['observer'] == row['observer']]
                records.append({'id': play['id'], 't': tick['t'], 'combinationId': before['id'],
                                'actualCommandObserver': row['observer'], 'genuinelyJoinedBefore': before['genuinelyJoined'],
                                'beforeSharedSchedule': before['legacySchedule'], 'afterSharedSchedule': new['legacySchedule'],
                                'actualOwnPictures': images, 'personalStateAvailable': False})
    return records


def member(combo, slot):
    return next((m for m in combo['memberState'] if m['slot'] == slot), None) if combo else None


def actual_hand(combo, slot, defender):
    m = member(combo, slot)
    e = m['engagement'] if m else None
    if not e or e['defender'] != defender:
        return None
    native_member = next((m for m in e['members'] if m['slot'] == slot), None)
    return native_member['hands'] if native_member else None


def compact_climb(play, row):
    before, after, solved = row['beforeCombination'], row['eventBoundaryCombination'], row['afterWholeTickCombination']
    keeper = next((slot for slot in before['members'] if slot != row['climber']), None) if before else None
    defender = before['defender'] if before else None
    old_hand, new_hand, solved_hand = [actual_hand(c, keeper, defender) for c in [before, after, solved]]
    keeper_before = member(before, keeper)
    keeper_native = next((m for m in keeper_before['engagement']['members'] if m['slot'] == keeper), None) if keeper_before and keeper_before['engagement'] else None
    selected = next((r for r in (after['personalReads'] or []) if r['observer'] == row['climber']), None) if after else None
    current = [r['proposal'] for r in (after['personalReads'] or []) if r['proposal'] and r['proposal']['t'] == row['t']] if after else []
    chosen = selected['proposal'] if selected else None
    range_ = row['decisionImageOrdinalRange']
    decision_images = row['consumedImages'][range_['first']:range_['end']]
    own = {target: [c['image'] for c in decision_images if c['observer'] == row['climber'] and c['target'] == target]
           for target in [keeper, defender, row['backer'], 'RB']}
    visual = joined_visual_cues(play, before, row['climber'], keeper, own) if before else None
    same = lambda a, b: bool(a and b and a['id'] == b['id'] and b['live'])
    load = next((m for m in row['loads'] if m['slot'] == keeper), None)
    force = math.hypot(solved_hand['state'].get('normalForce', 0), solved_hand['state'].get('tangentForce', 0)) if solved_hand else None
    followup = [c for c in play['backerContacts'] if c['climber'] == row['climber'] and c['backer'] == row['backer'] and c['climbT'] == row['t']]
    return {'id': play['id'], 't': row['t'], 'completedAt': row['completedAt'], 'phase': row['phase'],
            'climber': row['climber'], 'keeper': keeper, 'defender': defender, 'backer': row['backer'],
            'initiatingObserver': row['initiatingObserver'], 'historicalRemoteDeparture':
                row['initiatingObserver'] != row['climber'] if row['initiatingObserver'] is not None else None,
            'beforeGenuinelyJoined': before['genuinelyJoined'] if before else None,
            'eventBoundaryClimberPlan': member(after, row['climber'])['plan'] if member(after, row['climber']) else None,
            'afterWholeTickClimberPlan': member(solved, row['climber'])['plan'] if member(solved, row['climber']) else None,
            'physicalBodiesUnchangedAtDecision': row['physicalBodiesUnchangedAtDecision'],
            'personalReadStateAvailable': after['personalReads'] is not None if after else False,
            'chosenPersonalRead': selected, 'currentSelfProposals': current,
            'chosenProposalIsOwnCurrentDeparture': bool(chosen and chosen['t'] == row['t'] and chosen['climber'] == row['climber']
                                                       and chosen['keeper'] == keeper) if selected else None,
            'chosenOwnConfirmationDwell': row['t'] - selected['secureSince'] if selected else None,
            'chosenOwnConfirmationAtLeast015': row['t'] - selected['secureSince'] >= .15 - 1e-9 if selected else None,
            'chosenProposalCostMatchesOwnRecordedCue': math.isclose(chosen['cost'], visual['ownExpectedProposalCost'], abs_tol=1e-9)
                if chosen and visual and visual['unambiguousOwnFourPictures'] else None,
            'ownDecisionPictures': own,
            'ownRecordedVisualCueGeometry': visual,
            'ownKeeperDLBackerRunnerPicturesCaptured': all(own.values()),
            'beforeKeeperHand': old_hand, 'eventBoundaryKeeperHand': new_hand, 'nextSolvedKeeperHand': solved_hand,
            'sameKeeperJointAfterController': same(old_hand, new_hand),
            'sameKeeperJointAfterSolve': same(old_hand, solved_hand),
            'keeperJointStateUnchangedByController': old_hand['state'] == new_hand['state'] if old_hand and new_hand else None,
            'beforeKeeperSupportAvailability': keeper_native['supportAvailability'] if keeper_native else None,
            'beforeKeeperSurfacePhi': keeper_native['surfacePhi'] if keeper_native else None,
            'beforeKeeperDown': keeper_native['down'] if keeper_native else None,
            'physicsStepRecorded': row['physicsStepRecorded'], 'keeperLoad': load,
            'positiveKeeperPairForceAfterSolve': force > 1e-6 if force is not None else None,
            'positiveKeeperArmImpulseAfterSolve': load['armImpulse'] > 1e-6 if load else None,
            'laterActualLoadedBackerContacts': followup,
            'laterActualLoadedBackerContactConfirmed': bool(followup)}


def joined_visual_cues(play, combo, observer, keeper, pictures):
    own = member(combo, observer)
    e = own['engagement'] if own else None
    if not e or any(len(pictures[target]) != 1 for target in [keeper, combo['defender'], combo['backer'], 'RB']):
        return {'unambiguousOwnFourPictures': False}
    covered, down, backer, runner = [pictures[target][0] for target in [keeper, combo['defender'], combo['backer'], 'RB']]
    dx, dy = covered['pos']['x'] - down['pos']['x'], covered['pos']['y'] - down['pos']['y']
    axis = e['axis']
    phi = math.atan2(-(-axis['y'] * dx + axis['x'] * dy), axis['x'] * dx + axis['y'] * dy) / (math.pi / 2)
    profiles = {p['slot']: p['profile'] for p in play['initialProjection']['players']}
    arm = (profiles[keeper]['reach'] - .25) / .85
    envelope = profiles[keeper]['radius'] + profiles[combo['defender']]['radius'] + arm
    distance = math.hypot(dx, dy)
    backer_distance = math.hypot(backer['pos']['x'] - own['physical']['pos']['x'], backer['pos']['y'] - own['physical']['pos']['y'])
    filling, arriving = backer_distance < 4.2, runner['pos']['x'] > play['los'] - 2.8
    return {'unambiguousOwnFourPictures': True, 'ownKeeperDLPoseUp': covered['pose'] == down['pose'] == 'up',
            'ownObservedKeeperPhi': phi, 'ownObservedKeeperDLDistance': distance,
            'visibleContactEnvelope': envelope, 'armYardsDerivedFromPinnedProfileReach': arm,
            'ownVisibleSurfacePasses': covered['pose'] == down['pose'] == 'up' and abs(phi) < .55 and distance <= envelope,
            'ownObservedBackerDistance': backer_distance, 'ownObservedRunnerX': runner['pos']['x'],
            'ownBackerFillingCue': filling, 'ownRunnerArrivingCue': arriving,
            'ownFillingOrArrivingCue': filling or arriving,
            'ownExpectedProposalCost': backer_distance + (.30 if e['blocker'] == observer else 0)}


def cadence(reads):
    groups = {}
    for row in reads:
        groups.setdefault((row['id'], row['combinationId'], row['observer']), []).append(row)
    records = []
    for (id_, cid, observer), rows in groups.items():
        intervals = []
        for old, new in zip(rows, rows[1:]):
            intervals.append({'earlierReadAt': old['t'], 'nextActualReadAt': new['t'],
                              'scheduledNextReadAfterEarlier': old['afterPersonalRead']['nextRead'],
                              'actualInterval': new['t'] - old['t'],
                              'readsNotBeforeOwnSchedule': new['t'] + 1e-9 >= old['afterPersonalRead']['nextRead']})
        records.append({'id': id_, 'combinationId': cid, 'observer': observer, 'actualReadCount': len(rows),
                        'times': [r['t'] for r in rows], 'intervals': intervals,
                        'initializationBeforeFirstReadRecorded': rows[0]['beforePersonalRead']})
    return records


def witness_summary(report):
    reads = [r for p in report['plays'] for r in witness_reads(p)]
    old = [r for p in report['plays'] for r in historical_reads(p)]
    climbs = [compact_climb(p, c) for p in report['plays'] for c in p['climbs']]
    paired = {(r['id'], r['combinationId']) for r in reads if r['genuinelyJoinedAtBoundaryStart']}
    both = sum(len({r['observer'] for r in reads if (r['id'], r['combinationId']) == pair}) == 2 for pair in paired)
    visual_pairs = {(r['id'], r['combinationId']) for r in reads if r['genuinelyJoinedAtBoundaryStart'] and r['ownKeeperDLVisualReadCaptured']}
    visual_both = sum(len({r['observer'] for r in reads if (r['id'], r['combinationId']) == pair and r['ownKeeperDLVisualReadCaptured']}) == 2 for pair in visual_pairs)
    return {'plays': len(report['plays']), 'observerPlainMatches': sum(p['observedSignature'] == p['plainSignature'] for p in report['plays']),
            'naturalEnds': sum(p['naturalEnd'] for p in report['plays']),
            'prepassAvailableInPlays': sum(p['prepassAvailable'] for p in report['plays']),
            'personalReadSchemaAvailableInPlays': sum(p['personalReadSchemaAvailable'] for p in report['plays']),
            'actualWholePlayClimbs': len(climbs), 'recordedPersonalAttentionAttempts': len(reads),
            'actualOwnKeeperDLVisualReads': sum(r['ownKeeperDLVisualReadCaptured'] for r in reads),
            'actualOwnBackerRunnerReads': sum(r['ownBackerRunnerReadCaptured'] for r in reads),
            'attentionAttemptsWithRecordedPhysicalVeto': sum(bool(r['recordedNativeEligibility']['knownPhysicalVetoes']) for r in reads),
            'attentionAttemptsWithoutVisualPicturesAndWithRecordedPhysicalVeto': sum(
                not r['ownKeeperDLVisualReadCaptured'] and bool(r['recordedNativeEligibility']['knownPhysicalVetoes']) for r in reads),
            'recordedPhysicalVetoReasonCounts': {reason: sum(reason in r['recordedNativeEligibility']['knownPhysicalVetoes'] for r in reads)
                                               for reason in sorted({reason for r in reads for reason in r['recordedNativeEligibility']['knownPhysicalVetoes']})},
            'observedGenuinelyJoinedPairsWithPersonalAttentionAttempt': len(paired),
            'observedGenuinelyJoinedPairsWithBothMemberAttentionAttempts': both,
            'observedGenuinelyJoinedPairsWithOwnVisualSurfaceRead': len(visual_pairs),
            'observedGenuinelyJoinedPairsWithBothMemberVisualSurfaceReads': visual_both,
            'historicalSharedBookkeepingTransitions': len(old),
            'historicalRemoteDepartures': sum(r['historicalRemoteDeparture'] is True for r in climbs),
            'selfCurrentProposalDepartures': sum(r['chosenProposalIsOwnCurrentDeparture'] is True for r in climbs),
            'departuresWithOwnVisibleSurfaceAndFillingCueValidated': sum(bool(r['ownRecordedVisualCueGeometry']
                and r['ownRecordedVisualCueGeometry'].get('ownVisibleSurfacePasses')
                and r['ownRecordedVisualCueGeometry'].get('ownFillingOrArrivingCue')) for r in climbs),
            'departuresWithOwnKeeperDLBackerRunnerPictures': sum(r['ownKeeperDLBackerRunnerPicturesCaptured'] for r in climbs),
            'departureBodiesUnchanged': sum(r['physicalBodiesUnchangedAtDecision'] is True for r in climbs),
            'sameKeeperJointAfterController': sum(r['sameKeeperJointAfterController'] for r in climbs),
            'sameKeeperJointAfterSolve': sum(r['sameKeeperJointAfterSolve'] for r in climbs),
            'positiveKeeperPairForceAfterSolve': sum(r['positiveKeeperPairForceAfterSolve'] is True for r in climbs),
            'laterActualLoadedBackerContactConfirmed': sum(r['laterActualLoadedBackerContactConfirmed'] for r in climbs),
            'personalAttentionAttempts': reads, 'personalAttentionCadence': cadence(reads),
            'historicalActualCommandReads': old, 'actualClimbs': climbs}


def pictures_summary(pictures):
    return {target: {'count': len(images), 'ages': sorted(set(p.get('age') for p in images)),
                     'poses': sorted({p.get('pose') for p in images}, key=str)}
            for target, images in pictures.items()}


def compact_read_state(state):
    return {k: state[k] for k in ['nextRead', 'secureSince', 'readAt']} if state else None


def compact_witness_climb(row, path):
    omit = {'ownDecisionPictures', 'beforeKeeperHand', 'eventBoundaryKeeperHand', 'nextSolvedKeeperHand',
            'chosenPersonalRead', 'currentSelfProposals', 'keeperLoad', 'laterActualLoadedBackerContacts'}
    result = {k: v for k, v in row.items() if k not in omit}
    result['rawReference'] = {'path': str(path), 'playId': row['id'], 'tickStart': row['t'],
                              'phase': row['phase'], 'event': 'block_climb', 'climber': row['climber']}
    result['ownDecisionPictureSummary'] = pictures_summary(row['ownDecisionPictures'])
    result['chosenPersonalRead'] = compact_read_state(row['chosenPersonalRead'])
    result['currentSelfProposalSummary'] = [{k: p[k] for k in ['t', 'climber', 'keeper', 'phi', 'cost']}
                                          for p in row['currentSelfProposals']]
    result['keeperJointIds'] = {stage: row[field]['id'] if row[field] else None for stage, field in [
        ('before', 'beforeKeeperHand'), ('eventBoundary', 'eventBoundaryKeeperHand'), ('nextSolve', 'nextSolvedKeeperHand')]}
    hand = row['nextSolvedKeeperHand']
    result['keeperNextSolvedHandForces'] = {k: hand['state'].get(k, 0) for k in ['normalForce', 'tangentForce']} if hand else None
    load = row['keeperLoad']
    result['keeperLoad'] = {k: load[k] for k in ['slot', 'achievedPos', 'achievedVel', 'groundImpulse', 'armImpulse',
        'armImpulseLimit', 'armWork', 'armWorkLimit', 'supportMotorWork', 'supportMotorWorkLimit', 'groundTractionLimit', 'fall', 'down']} if load else None
    result['keeperAppliedIntent'] = {k: load['appliedIntent'][k] for k in ['vel', 'facing', 'push', 'posture']
                                    if k in load['appliedIntent']} if load else None
    result['laterLoadedBackerContactSummary'] = [{'climbT': c['climbT'], 'completedAt': c['completedAt'],
        'positiveHandForceMagnitudes': [math.hypot(j['state'].get('normalForce', 0), j['state'].get('tangentForce', 0)) for j in c['hands']],
        'positiveBodyImpulses': [p['impulse'] for p in c['bodyContacts']]} for c in row['laterActualLoadedBackerContacts']]
    return result


def compact_witness_summary(summary, path):
    result = {k: v for k, v in summary.items() if k not in {'personalAttentionAttempts', 'personalAttentionCadence', 'historicalActualCommandReads', 'actualClimbs'}}
    groups = {}
    for row in summary['personalAttentionAttempts']:
        key = (row['id'], row['combinationId'], row['observer'])
        groups.setdefault(key, []).append(row)
    result['rawWitnessSource'] = str(path)
    result['personalAttentionByMember'] = []
    for (id_, cid, observer), rows in groups.items():
        schedule = next(g for g in summary['personalAttentionCadence'] if (g['id'], g['combinationId'], g['observer']) == (id_, cid, observer))
        result['personalAttentionByMember'].append({'playId': id_, 'combinationId': cid, 'observer': observer,
            'actualAttemptTimes': [r['t'] for r in rows],
            'actualVisualSurfaceReadTimes': [r['t'] for r in rows if r['ownKeeperDLVisualReadCaptured']],
            'actualBackerRunnerReadTimes': [r['t'] for r in rows if r['ownBackerRunnerReadCaptured']],
            'recordedNextReadSequence': [r['afterPersonalRead']['nextRead'] for r in rows],
            'recordedSecureSinceSequence': [r['afterPersonalRead']['secureSince'] for r in rows],
            'allSubsequentAttemptsRespectOwnSchedule': all(r['readsNotBeforeOwnSchedule'] for r in schedule['intervals']),
            'recordedVetoReasonCounts': {reason: sum(reason in r['recordedNativeEligibility']['knownPhysicalVetoes'] for r in rows)
                for reason in sorted({reason for r in rows for reason in r['recordedNativeEligibility']['knownPhysicalVetoes']})},
            'rawReference': 'plays[playId].ticks[t].prepass or commands[observer]; all own images/caches remain in the pinned raw file'})
    result['historicalCommandTransitionReferences'] = [{'playId': row['id'], 't': row['t'],
        'combinationId': row['combinationId'], 'observer': row['actualCommandObserver'],
        'genuinelyJoinedBefore': row['genuinelyJoinedBefore'], 'nextReadAfter': row['afterSharedSchedule']['nextRead']}
        for row in summary['historicalActualCommandReads']]
    result['actualClimbs'] = [compact_witness_climb(row, path) for row in summary['actualClimbs']]
    return result


def first_tick_divergence(old, new, key):
    for before, after in zip(old['ticks'], new['ticks']):
        HELPERS.require(before['t'] == after['t'] and before['completedAt'] == after['completedAt'], 'Native tick grid changed')
        if before[key] != after[key]:
            return {'tickStart': before['t'], 'completedAt': before['completedAt'],
                    'beforeSha256': before[key], 'afterSha256': after[key]}
    return None


def posthoc_comparison(paths, b, a, common_collector):
    old, new = [HELPERS.read(p) for p in paths]
    for label, report, panel in [('before', old, b), ('after', new, a)]:
        HELPERS.require(report['schema'] == 'combo-attention-posthoc-adverse-witness-v1', 'Unexpected post-hoc schema')
        HELPERS.require(report['sourceBefore'] == report['sourceAfter'] == panel['sourceBefore'], 'Post-hoc engine source mismatch')
        HELPERS.require(report['instrumentationSourceSha256'] == common_collector, 'Post-hoc common instrumentation changed')
        HELPERS.require(len(report['plays']) == 4, 'Post-hoc four-case scope changed')
    HELPERS.require(old['collectorSha256'] == new['collectorSha256'] and old['generatedInstrumentSha256'] == new['generatedInstrumentSha256'], 'Post-hoc instrument changed')
    HELPERS.require(old['cohort'] == new['cohort'], 'Post-hoc input cohort changed')
    HELPERS.require([p['id'] for p in old['plays']] == [p['id'] for p in new['plays']], 'Post-hoc order changed')
    pairs = []
    maps = [{t['id']: t for t in panel['trials'] + panel['supplementalTrials']} for panel in [b, a]]
    for before, after in zip(old['plays'], new['plays']):
        HELPERS.require(before['initialProjection'] == after['initialProjection'] and before['initialSha256'] == after['initialSha256'], 'Post-hoc physical/call projection changed')
        HELPERS.require(before['profileSha256'] == after['profileSha256'], 'Post-hoc player capacities changed')
        panel_id = before['id'].replace('CAP-', 'CT-', 1)
        for label, play, panel in [('before', before, maps[0]), ('after', after, maps[1])]:
            HELPERS.require(play['observerVerified'] and play['observedSignature'] == play['plainSignature'], 'Post-hoc observer changed native run')
            HELPERS.require(play['naturalEnd'] and play['result']['outcome'] != 'timeout', 'Post-hoc censored finish')
            HELPERS.require(panel_id in panel, 'Post-hoc case not in cached original cohort')
            cached = panel[panel_id]
            public = lambda result: {k: v for k, v in result.items() if k not in {'frames', 'telemetry'}}
            HELPERS.require(public(play['result']) == public(cached['result']), f'Post-hoc result differs from immutable panel {panel_id}/{label}')
            HELPERS.require(play['initialProjection']['players'] == cached['initialProjection']['players'], 'Post-hoc initial body/profile projection differs from cached panel')
        body = first_tick_divergence(before, after, 'afterAllBodiesSha256')
        previous = next((tick for tick in reversed(before['ticks']) if body and tick['completedAt'] < body['completedAt']), None)
        pairs.append({'id': before['id'], 'cachedPanelId': panel_id, 'run': before['run'], 'front': before['front'],
                      'flip': before['flip'], 'seed': before['seed'], 'formation': before['formation'],
                      'beforeYards': before['result']['offenseYards'], 'afterYards': after['result']['offenseYards'],
                      'yardsDelta': after['result']['offenseYards'] - before['result']['offenseYards'],
                      'initialProjectionMatch': True, 'beforeResultMatchesCachedPanel': True, 'afterResultMatchesCachedPanel': True,
                      'beforeObserverNeutral': True, 'afterObserverNeutral': True, 'beforeNaturalEnd': True, 'afterNaturalEnd': True,
                      'firstCompletedAllBodyDivergence': body,
                      'lastIdenticalCompletedAllBodyTickBeforeDivergence': {'tickStart': previous['t'], 'completedAt': previous['completedAt'],
                          'sha256': previous['afterAllBodiesSha256']} if previous else None,
                      'firstNativeIntentDivergence': first_tick_divergence(before, after, 'completedIntentSha256'),
                      'firstAssignmentDivergenceAtTickStart': first_tick_divergence(before, after, 'beforeAllAssignmentsSha256'),
                      'firstAssignmentDivergenceAfterWholeTick': first_tick_divergence(before, after, 'afterAllAssignmentsSha256'),
                      'beforeActualClimbReferences': [{'t': r['t'], 'climber': r['climber']} for r in before['climbs']],
                      'afterActualClimbReferences': [{'t': r['t'], 'climber': r['climber']} for r in after['climbs']]})
    return {'selection': 'POST-HOC causal inspection after final C162 revealed adverse cases; excluded from ordinary160 and fixed-six mechanism population.',
            'inputs': {str(path): HELPERS.sha(path) for path in paths},
            'sources': {'before': old['sourceBefore'], 'after': new['sourceBefore']},
            'collectorSha256': old['collectorSha256'], 'instrumentationSourceSha256': old['instrumentationSourceSha256'],
            'generatedInstrumentSha256': old['generatedInstrumentSha256'], 'cohort': old['cohort'],
            'pairs': pairs, 'native': {'before': compact_witness_summary(witness_summary(old), paths[0]),
                                       'after': compact_witness_summary(witness_summary(new), paths[1])},
            'definitions': {'bodyDivergence': 'Each native20Hz tick hashes all physical Body objects before/after the original tick, without player tags. The first differing completed hash is the earliest actual saved physical divergence; it does not attribute all later yardage to one action.',
                            'intentDivergence': 'Hash actual delivered native intents after the completed tick. Assignment hashes use all offensive public RunBlocker plans, omitting personal/shared mental caches and tags.',
                            'controlledReuse': 'Identical common instrumentation pin with explicitly declared fixture/provenance substitution and added read-only hashes; all four observed/plain final-state/RNG controls and exact cached-panel public results must match.',
                            'population': 'Four selected losses are a separate explanatory inspection. Their reads, climbs and outcomes are never added to fixed-six or160 totals.'}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['before', 'after', 'witness_before', 'witness_after', 'output']:
        parser.add_argument(name, type=Path)
    parser.add_argument('--adverse-before', type=Path)
    parser.add_argument('--adverse-after', type=Path)
    args = parser.parse_args()
    b, a = HELPERS.read(args.before), HELPERS.read(args.after)
    wb, wa = HELPERS.read(args.witness_before), HELPERS.read(args.witness_after)
    HELPERS.require(b['sourceBefore'] == B_SOURCE == wb['sourceBefore'], 'Baseline is not immutable published Phase B')
    HELPERS.require(b['cohort'] == a['cohort'] and b['filmIds'] == a['filmIds'], 'Ordinary fixed cohort changed')
    HELPERS.require(b['collectorSha256'] == a['collectorSha256'] == PANEL_COLLECTOR, 'Immutable ordinary collector changed')
    HELPERS.require(wb['collectorSha256'] == wa['collectorSha256'], 'Common witness tap changed')
    HELPERS.require(wb['cohort'] == wa['cohort'] and len(wb['plays']) == len(wa['plays']) == 6, 'Fixed six witness design changed')
    HELPERS.require(a['sourceBefore'] == wa['sourceBefore'], 'Candidate panel and witnesses use different engine sources')
    for report in [b, a, wb, wa]:
        HELPERS.require(report['sourceBefore'] == report['sourceAfter'], 'Engine changed during collection')
    for report in [b, a]:
        HELPERS.require(len(report['trials']) == 160 and len(report['supplementalTrials']) == 2, 'Fixed ordinary/supplemental count changed')
        for t in report['trials'] + report['supplementalTrials']:
            HELPERS.require(t['observerVerified'] and t['observedSignature'] == t['plainSignature'], f'Observer changed {t["id"]}')
            HELPERS.require(t['naturalEnd'] == (t['result']['outcome'] != 'timeout'), f'Natural end mislabel {t["id"]}')
            t['_los'] = report['cohort']['los']
    controls, paired = [], {}
    for scope in ['trials', 'supplementalTrials']:
        old, new = {t['id']: t for t in b[scope]}, {t['id']: t for t in a[scope]}
        HELPERS.require(len(old) == len(b[scope]) and len(new) == len(a[scope]) and old.keys() == new.keys(), 'Missing/duplicate trial ID')
        for id_, t in old.items():
            n = new[id_]
            HELPERS.require(all(t[k] == n[k] for k in ['run', 'front', 'flip', 'seed', 'roster', 'formation', 'supplemental']), f'Football input labels changed {id_}')
            HELPERS.require(football_projection(t['initialProjection']) == football_projection(n['initialProjection']), f'Football projection changed {id_}')
            HELPERS.require(t['profileSha256'] == n['profileSha256'], f'Physical player profile changed {id_}')
            controls.append({'id': id_, 'beforeInitialSha256': t['initialSha256'], 'afterInitialSha256': n['initialSha256'],
                             'initialProjectionMatchIncludingLegacyCaches': t['initialProjection'] == n['initialProjection'],
                             'footballProjectionMatchExceptDeclaredLegacyCaches': True, 'profileSha256': t['profileSha256'],
                             'beforeObserverNeutral': True, 'afterObserverNeutral': True,
                             'beforeNaturalEnd': t['naturalEnd'], 'afterNaturalEnd': n['naturalEnd']})
        paired[scope] = [pair(t, new[id_]) for id_, t in old.items()]
    witness_pairs = []
    HELPERS.require([p['id'] for p in wb['plays']] == [p['id'] for p in wa['plays']], 'Six witness inputs/order changed')
    for old, new in zip(wb['plays'], wa['plays']):
        HELPERS.require(old['initialProjection'] == new['initialProjection'], f'Witness football inputs changed {old["id"]}')
        HELPERS.require(old['initialSha256'] == new['initialSha256'] and old['profileSha256'] == new['profileSha256'], 'Witness initial/profile hash changed')
        for p in [old, new]:
            HELPERS.require(p['observerVerified'] and p['observedSignature'] == p['plainSignature'], 'Witness observer changed native run')
            HELPERS.require(len(events(p, 'block_climb')) == len(p['climbs']), 'Whole-tick witness missed emitted climb')
        witness_pairs.append({'id': old['id'], 'beforeYards': old['result']['offenseYards'], 'afterYards': new['result']['offenseYards'],
                              'yardsDelta': new['result']['offenseYards'] - old['result']['offenseYards'],
                              'initialProjectionMatch': True, 'beforeObserverNeutral': True, 'afterObserverNeutral': True,
                              'beforeNaturalEnd': old['naturalEnd'], 'afterNaturalEnd': new['naturalEnd'],
                              'beforeClimbs': len(old['climbs']), 'afterClimbs': len(new['climbs'])})
    old_map = {t['id']: t for t in b['trials'] + b['supplementalTrials']}
    new_map = {t['id']: t for t in a['trials'] + a['supplementalTrials']}
    negative_ids = [p['id'] for p in paired['trials'] + paired['supplementalTrials'] if p['yardsDelta'] < -1e-9]
    witnesses = {'before': witness_summary(wb), 'after': witness_summary(wa)}
    joined = witnesses['after']['actualClimbs']
    witness_acceptance = {'allClimbsSelfCurrentProposals': all(r['chosenProposalIsOwnCurrentDeparture'] for r in joined),
                          'candidateNativePrepassAndPersonalSchemaInAllSix': witnesses['after']['prepassAvailableInPlays'] == 6
                              and witnesses['after']['personalReadSchemaAvailableInPlays'] == 6,
                          'atLeastOneActualJoinedSelfDeparture': bool(joined),
                          'allOwnFourPicturesCaptured': all(r['ownKeeperDLBackerRunnerPicturesCaptured'] for r in joined),
                          'allOwnVisualSurfaceAndFillingCuesPass': all(r['ownRecordedVisualCueGeometry'].get('ownVisibleSurfacePasses')
                              and r['ownRecordedVisualCueGeometry'].get('ownFillingOrArrivingCue') for r in joined),
                          'allOwnCostAndDwellPass': all(r['chosenProposalCostMatchesOwnRecordedCue']
                              and r['chosenOwnConfirmationAtLeast015'] for r in joined),
                          'allBodiesUnchangedAtDecision': all(r['physicalBodiesUnchangedAtDecision'] for r in joined),
                          'allKeeperJointsPreservedAtDecision': all(r['sameKeeperJointAfterController'] for r in joined),
                          'allKeeperJointsPreservedAtNextSolve': all(r['sameKeeperJointAfterSolve'] for r in joined),
                          'allKeeperPairsLoadedAtNextSolve': all(r['positiveKeeperPairForceAfterSolve'] for r in joined)}
    output = {'schema': 'combo-attention-comparison-v1', 'comparisonSha256': HELPERS.sha(Path(__file__)),
              'reusedPrimitives': {str(Path(m.__file__)): HELPERS.sha(Path(m.__file__)) for m in [HELPERS, KEEPERS]},
              'inputs': {str(p): HELPERS.sha(p) for p in [args.before, args.after, args.witness_before, args.witness_after]},
              'sources': {'before': b['sourceBefore'], 'after': a['sourceBefore']},
              'modules': {'before': b['moduleSha256'], 'after': a['moduleSha256']},
              'witnessModules': {'before': wb['moduleSha256'], 'after': wa['moduleSha256']},
              'physicalCoreModulesUnchanged': {p: b['moduleSha256'][p] == a['moduleSha256'][p] for p in ['src/sim/engagement.ts', 'src/physics/world.ts']},
              'collectorSha256': b['collectorSha256'], 'witnessCollectorSha256': wb['collectorSha256'],
              'cohort': b['cohort'], 'witnessCohort': wb['cohort'], 'fixedFilmIds': b['filmIds'],
              'initialAndControlChecks': controls, 'allFootballInputProjectionsMatch': True,
              'exactInitialProjectionMatchesIncludingLegacyCaches': sum(r['initialProjectionMatchIncludingLegacyCaches'] for r in controls),
              'exactInitialSha256Matches': sum(r['beforeInitialSha256'] == r['afterInitialSha256'] for r in controls),
              'ordinary': {'before': metrics(b['trials']), 'after': metrics(a['trials'])},
              'byConcept': {run: {'before': metrics([t for t in b['trials'] if t['run'] == run]),
                                  'after': metrics([t for t in a['trials'] if t['run'] == run])} for run in b['cohort']['runs']},
              'byFront': {front: {'before': metrics([t for t in b['trials'] if t['front'] == front]),
                                  'after': metrics([t for t in a['trials'] if t['front'] == front])} for front in b['cohort']['fronts']},
              'supplemental': {'before': metrics(b['supplementalTrials']), 'after': metrics(a['supplementalTrials'])},
              'nativeLimitsAtRetainedOLControllerRows': {'before': KEEPERS.physics_limits(b), 'after': KEEPERS.physics_limits(a)},
              'legacyCommandLocalKeeperContinuityOnly': {'before': HELPERS.transfer_summary(b['trials'] + b['supplementalTrials'], KEEPERS),
                                                        'after': HELPERS.transfer_summary(a['trials'] + a['supplementalTrials'], KEEPERS)},
              'pairedResults': paired['trials'], 'pairedSupplementalResults': paired['supplementalTrials'],
              'identicalCompleteExecutions': sum(p['identicalCompleteExecution'] for p in paired['trials']),
              'changedCompleteExecutions': [{'id': p['id']} for p in paired['trials'] if not p['identicalCompleteExecution']],
              'adverseAnyGainPairs': [{k: p[k] for k in ['id', 'beforeYards', 'afterYards', 'yardsDelta']} for p in paired['trials'] if p['yardsDelta'] < -1e-9],
              'adverse2YardPairs': [p for p in paired['trials'] if p['yardsDelta'] <= -2],
              'beneficial2YardPairs': [p for p in paired['trials'] if p['yardsDelta'] >= 2],
              'supplementalAdverseAnyGainPairs': [p for p in paired['supplementalTrials'] if p['yardsDelta'] < -1e-9],
              'actualWholePlayClimbs': {'before': {id_: [whole_climb_reference(r) for r in compact_whole_climbs(t)] for id_, t in old_map.items()},
                                       'after': {id_: [whole_climb_reference(r) for r in compact_whole_climbs(t)] for id_, t in new_map.items()}},
              'allAdverseNativeWitnesses': {id_: {'classification': adverse_classification(old_map[id_], new_map[id_]),
                  'nativeTrialReferences': {'before': {'path': str(args.before), 'trialId': id_},
                                            'after': {'path': str(args.after), 'trialId': id_}}} for id_ in negative_ids},
              'sixCommonTapWitnessPairs': witness_pairs, 'sixCommonTapNativeWitnesses': {
                  'before': compact_witness_summary(witnesses['before'], args.witness_before),
                  'after': compact_witness_summary(witnesses['after'], args.witness_after)},
              'sixCommonTapWitnessAcceptance': witness_acceptance,
              'definitions': {
                  'initialProjection': 'Physical bodies, ratings/profiles, actual snap delays/cadences, installed targets/drive/pull rules/roles, calls and seeds are matched. Only obsolete combination.nextRead/secureSince caches may be omitted from the equality projection, explicitly reported by each row. No player body or football assignment is normalized.',
                  'actualClimbs': 'Count every block_climb in complete native result.events. The old collector wraps only commands: candidate prepass events are missing from earnedClimbs and old per-update ownership/cue records. Command-local continuity is labelled partial, never proof of every prepass transfer.',
                  'personalRead': 'A genuine combo.reads[installed member].readAt transition denotes a scheduled attention attempt, not necessarily a visual read: physical inadmissibility may short-circuit sim.see. Actual own keeper/DL and backer/RB pictures are counted separately by observer and phase. Before absent is unavailable; it is not filled from a partner/shared clock.',
                  'cadence': 'Successive actual personal readAt changes are compared against that same observer’s previously recorded nextRead. One reader never supplies another member’s clock.',
                  'nativeRelease': 'The actual block_climb event actor is the departing player. Personal proposal/current tick/own cue images and real keeper hand object are recorded at event emission before following commands and the native solve.',
                  'historicalRemoteDeparture': 'For B only, actual RunBlocker command observer differs from emitted climber. Climber pictures are captured only if really consumed during that decision; historical personal state is unavailable.',
                  'keeperContinuity': 'Six fixed common-tap witnesses retain the exact per-play native keeper joint ID/state at decision and following solve, actual member support/leverage, and completed loads for OL or TE. Command-local panel continuity omits prepass decisions.',
                  'laterContact': 'Witness backer follow-up requires positive real hand normal/tangent load or body impulse after the release. Panel firstHands/firstContacts are genuine OL first-pair observations only; missing TE metrics or earlier first contact is explicit, not a proven whiff.',
                  'nativeLimits': 'OL budget excess is evaluated only at old retained controller rows; global work/momentum and support-motor residuals cover every real solved tick. No runtime-speed conclusion is drawn from diagnostics.',
                  'units': 'Distances yd, times s, forces kg·yd/s², impulses kg·yd/s, work kg·yd²/s²; multiply by .9144 or .9144² for SI.'},
              'limitations': [
                  'Six fixed mechanism witnesses and one balanced160 generated roster panel are not NFL concept distributions or a population effect estimate. Supplemental two remain separate.',
                  'The unchanged162 collector does not capture candidate prepass personal states/cues or event-boundary hands. Detailed candidate continuity/self-read claims are limited to the six common-tap witnesses and independently controlled tests.',
                  'Historical B has no personal joined schedule or prepass; no corresponding historical state is invented. Its real shared-bookkeeping transitions and consumed observer pictures remain separate.',
                  'Same keeper hand through a release proves mechanical continuity, not that the eventual climb successfully blocks the backer or improves rushing. All negative differences remain in the report.',
                  'No new sim.see calls, simulated whistles, parked bodies, strength bonuses or global solver-resolution changes are introduced.'
              ]}
    HELPERS.require(bool(args.adverse_before) == bool(args.adverse_after), 'Both post-hoc inputs are required together')
    if args.adverse_before:
        output['posthocAdverseInspection'] = posthoc_comparison([args.adverse_before, args.adverse_after], b, a, wb['collectorSha256'])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({k: output[k] for k in ['sources', 'ordinary', 'supplemental', 'identicalCompleteExecutions',
                                           'sixCommonTapWitnessAcceptance', 'nativeLimitsAtRetainedOLControllerRows']} | {
        'adverseAnyGainPairs': len(output['adverseAnyGainPairs']), 'adverse2YardPairs': len(output['adverse2YardPairs']),
        'beneficial2YardPairs': len(output['beneficial2YardPairs']),
        'supplementalAdverseAnyGainPairs': len(output['supplementalAdverseAnyGainPairs'])}, indent=2))
    print(json.dumps({'witnesses': {label: {k: v for k, v in summary.items() if not isinstance(v, list)}
                                  for label, summary in witnesses.items()}}, indent=2))


if __name__ == '__main__':
    main()
