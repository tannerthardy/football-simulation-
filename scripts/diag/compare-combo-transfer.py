#!/usr/bin/env python3
"""Compare frozen ordinary run panels using saved actual controller/physics observations.

python scripts/diag/compare-combo-transfer.py before.json.gz after.json.gz output.json
No simulation, new perception reads or NFL-rate fitting occur here.
"""
import argparse
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def film_path(path):
    return Path(str(path).removesuffix('.json.gz') + '-film.json.gz')


def mean(values):
    return sum(values) / len(values) if values else None


def ownership(row, stage, slot):
    return next((m for m in row[stage] if m['slot'] == slot), None)


def combo_reads(trial):
    rows = []
    for row in trial['updates']:
        before = row['beforeBody']['plan']['combination']
        after = row['oldCombinationAfter']
        if not before or before['released'] or not after:
            continue
        # Repeated controller updates during the existing decision interval
        # are not relabelled as new reads.
        if after['nextRead'] == before['nextRead']:
            continue
        e = row['beforeBody']['engagement']
        if not e or e['defender'] != before['defender']:
            continue
        helpers = [m for m in e['members'] if m['slot'] in e['helpers']]
        primary = next(m for m in e['members'] if m['slot'] == e['blocker'])
        # The collector deliberately does not read mind state beyond what the
        # prior immutable input projection recorded. -.06 is the strict end
        # of the existing urgency-dependent control threshold [-.18,-.06].
        secure_all_urgencies = e['control'] > -.06 and e['baseB'] > .60 and abs(e['phi']) < .55
        rows.append({
            'id': trial['id'], 't': row['t'], 'observer': row['observer'], 'combo': before,
            'primary': primary, 'helpers': helpers, 'engagement': e,
            'weakHelper': any(m['helperSupport'] < .25 for m in helpers),
            'primarySecureForAllUrgencies': secure_all_urgencies,
            'released': after['released'], 'nativeRecord': row,
        })
    return rows


def transfers(trial):
    rows = []
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    for row in trial['updates']:
        for event in row['events']:
            if event['type'] != 'block_climb':
                continue
            climber = slots[event['a']]
            before_combo = row['beforeBody']['plan']['combination']
            if before_combo is None:
                raise ValueError(f"Missing pre-transfer combination: {trial['id']}")
            defender = before_combo['defender']
            before_e = next((m['engagement'] for m in row['before'] if m['engagement']
                             and m['engagement']['defender'] == defender), None)
            after_e = next((m['engagement'] for m in row['after'] if m['engagement']
                            and m['engagement']['defender'] == defender), None)
            if before_e is None or after_e is None:
                raise ValueError(f"Missing native engagement transfer: {trial['id']}")
            keeper = after_e['blocker']
            prior_member = next(m for m in before_e['members'] if m['slot'] == keeper)
            prior_joint = prior_member['hands']
            next_joint = after_e['hands']
            solved_member = ownership(row, 'afterSolvedOwnership', keeper)
            solved_e = solved_member['engagement'] if solved_member else None
            solved_joint = solved_e['hands'] if solved_e and solved_e['blocker'] == keeper else None
            load = next((m for m in row['deliveredStep'] if m['slot'] == keeper), None)
            pair_joints = [j for j in (load or {}).get('liveHandsAfterPhysics', [])
                           if {j['a'], j['b']} == {keeper, defender}]
            rows.append({
                'id': trial['id'], 'run': trial['run'], 'front': trial['front'], 'flip': trial['flip'],
                't': row['t'], 'completedAt': row['completedAt'], 'observer': row['observer'],
                'climber': climber, 'keeper': keeper, 'defender': defender,
                'keeperWasHelper': keeper != before_e['blocker'],
                'keeperSupportAvailability': prior_member['supportAvailability'],
                'keeperHelperSupport': prior_member['helperSupport'],
                'keeperSurfacePhi': prior_member['surfacePhi'],
                'beforeJoint': prior_joint, 'afterControllerJoint': next_joint,
                'afterSolvedJoint': solved_joint,
                'sameObjectAfterController': bool(prior_joint and next_joint and prior_joint['id'] == next_joint['id']),
                'sameObjectAfterSolve': bool(prior_joint and solved_joint and prior_joint['id'] == solved_joint['id']),
                'liveBefore': bool(prior_joint and prior_joint['live']),
                'liveAfterController': bool(next_joint and next_joint['live']),
                'liveAfterSolve': bool(solved_joint and solved_joint['live']),
                'controlPreservedByTransfer': before_e['control'] == after_e['control'],
                'surfacePreservedByTransfer': before_e['axis'] == after_e['axis'],
                'drivePreservedByTransfer': before_e['drive'] == after_e['drive'],
                'positivePairForceAfterSolve': bool(solved_joint and solved_joint['live']
                    and {solved_joint['a'], solved_joint['b']} == {keeper, defender}
                    and abs(solved_joint['normalForce']) + abs(solved_joint['tangentForce']) > 1e-9),
                'hasOLDeliveredLoad': load is not None,
                'positiveOLPairForceAfterSolve': (any(abs(j['normalForce']) + abs(j['tangentForce']) > 1e-9 for j in pair_joints)
                                                if load is not None else None),
                # The collector reports per-body arm impulses only for OL.
                # A TE's positive joint force is not an inferred arm impulse.
                'positiveOLKeeperArmImpulse': (load['armImpulse'] > 1e-9 if load is not None else None),
                'nativeRecord': row,
            })
    return rows


def metric(trials):
    ol = [m for trial in trials for m in trial['olMetrics'].values()]
    read_rows = [r for trial in trials for r in combo_reads(trial)]
    transfer_rows = [r for trial in trials for r in transfers(trial)]
    return {
        'snaps': len(trials), 'observerPlainMatches': sum(t['observerVerified'] for t in trials),
        'naturalEnds': sum(t['naturalEnd'] for t in trials),
        'meanYards': mean([t['result']['offenseYards'] for t in trials]),
        'stuffs': sum(t['result']['offenseYards'] <= 0 for t in trials),
        'runs10Plus': sum(t['result']['offenseYards'] >= 10 for t in trials),
        'earnedClimbs': sum(t['earnedClimbs'] for t in trials),
        'cancelledTransitions': sum(t['cancelledTransitions'] for t in trials),
        'staleUpdates': sum(t['staleMemberUpdates'] for t in trials),
        'olFalls': sum(m['falls'] for m in ol), 'olDowns': sum(m['downs'] for m in ol),
        'actualCombinationReads': len(read_rows),
        'weakHelperReads': sum(r['weakHelper'] for r in read_rows),
        'weakHelperReadsWithConservativelySecurePrimary': sum(r['weakHelper'] and r['primarySecureForAllUrgencies'] for r in read_rows),
        'nativeTransferRecords': len(transfer_rows),
        'promotedHelperRecords': sum(r['keeperWasHelper'] for r in transfer_rows),
        'sameKeeperJointAfterController': sum(r['sameObjectAfterController'] for r in transfer_rows),
        'sameKeeperJointAfterSolve': sum(r['sameObjectAfterSolve'] for r in transfer_rows),
        'positiveKeeperPairForceAfterSolve': sum(r['positivePairForceAfterSolve'] for r in transfer_rows),
        'keeperRecordsWithOLDeliveredLoad': sum(r['hasOLDeliveredLoad'] for r in transfer_rows),
        'positiveOLKeeperPairForceAfterSolve': sum(bool(r['positiveOLPairForceAfterSolve']) for r in transfer_rows),
        'positiveOLKeeperArmImpulse': sum(bool(r['positiveOLKeeperArmImpulse']) for r in transfer_rows),
        'maxMomentumResidual': max((t['maxMomentumResidual'] for t in trials), default=0),
        'maxWorkResidual': max((t['maxWorkResidual'] for t in trials), default=0),
        'maxMotorWorkExcess': max((t['maxMotorWorkExcess'] for t in trials), default=0),
    }


def physics_limits(report):
    maximum = {'armImpulseExcess': 0., 'armWorkExcess': 0., 'supportMotorWorkExcess': 0., 'groundTractionExcess': 0.}
    unique_ticks = set()
    for trial in report['trials'] + report['supplementalTrials']:
        for row in trial['updates']:
            key = (trial['id'], row['t'])
            if key in unique_ticks:
                continue
            unique_ticks.add(key)
            for load in row['deliveredStep']:
                maximum['armImpulseExcess'] = max(maximum['armImpulseExcess'], load['armImpulse'] - load['armImpulseLimit'])
                maximum['armWorkExcess'] = max(maximum['armWorkExcess'], load['armWork'] - load['armWorkLimit'])
                maximum['supportMotorWorkExcess'] = max(maximum['supportMotorWorkExcess'], load['supportMotorWork'] - load['supportMotorWorkLimit'])
                ground = load['groundImpulse']
                maximum['groundTractionExcess'] = max(maximum['groundTractionExcess'], math.hypot(ground['x'], ground['y']) - load['groundTractionLimit'])
    return {'observedNativeTicks': len(unique_ticks), **maximum}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    b, a = read(args.before), read(args.after)
    for report in [b, a]:
        if report['schema'] != 'combo-transfer-review-v1' or report['sourceBefore'] != report['sourceAfter']:
            raise ValueError('Wrong schema or engine changed during collection')
        if not all(t['observerVerified'] and t['observedSignature'] == t['plainSignature'] for t in report['trials'] + report['supplementalTrials']):
            raise ValueError('Observer changed ordinary execution')
    if b['collectorSha256'] != a['collectorSha256'] or b['cohort'] != a['cohort']:
        raise ValueError('Collector or fixed ordinary cohort changed')
    before = {t['id']: t for t in b['trials']}
    after = {t['id']: t for t in a['trials']}
    if before.keys() != after.keys():
        raise ValueError('Fixed ordinary IDs changed')
    pairs = []
    for id_, old in before.items():
        new = after[id_]
        if old['initialProjection'] != new['initialProjection'] or old['initialSha256'] != new['initialSha256'] or old['profileSha256'] != new['profileSha256']:
            raise ValueError(f'Initial inputs changed: {id_}')
        pairs.append({'id': id_, 'run': old['run'], 'front': old['front'], 'flip': old['flip'], 'seed': old['seed'],
            'beforeYards': old['result']['offenseYards'], 'afterYards': new['result']['offenseYards'],
            'yardsDelta': new['result']['offenseYards'] - old['result']['offenseYards'],
            'beforeClimbs': old['earnedClimbs'], 'afterClimbs': new['earnedClimbs'],
            'identicalCompleteExecution': old['observedSignature'] == new['observedSignature'],
            'beforeOutcome': old['result']['outcome'], 'afterOutcome': new['result']['outcome'],
        })
    supplemental_pairs = []
    bs = {t['id']: t for t in b['supplementalTrials']}
    ats = {t['id']: t for t in a['supplementalTrials']}
    if bs.keys() != ats.keys():
        raise ValueError('Separately labelled supplemental IDs changed')
    for id_, old in bs.items():
        new = ats[id_]
        if old['initialProjection'] != new['initialProjection'] or old['initialSha256'] != new['initialSha256'] or old['profileSha256'] != new['profileSha256']:
            raise ValueError(f'Initial supplemental inputs changed: {id_}')
        supplemental_pairs.append({'id': id_, 'run': old['run'], 'front': old['front'], 'flip': old['flip'], 'seed': old['seed'],
            'beforeYards': old['result']['offenseYards'], 'afterYards': new['result']['offenseYards'],
            'yardsDelta': new['result']['offenseYards'] - old['result']['offenseYards'],
            'beforeClimbs': old['earnedClimbs'], 'afterClimbs': new['earnedClimbs'],
            'identicalCompleteExecution': old['observedSignature'] == new['observedSignature'],
            'beforeOutcome': old['result']['outcome'], 'afterOutcome': new['result']['outcome'],
        })
    bf, af = read(film_path(args.before)), read(film_path(args.after))
    if bf['collectorSha256'] != b['collectorSha256'] or af['collectorSha256'] != a['collectorSha256']:
        raise ValueError('Film collector mismatch')
    if [p['id'] for p in bf['plays']] != b['filmIds'] or [p['id'] for p in af['plays']] != a['filmIds'] or b['filmIds'] != a['filmIds']:
        raise ValueError('Predeclared fixed film IDs changed')
    witness_ids = ['CT-R1-iz_strong-over-R-S3', 'CT-R1-duo-odd-R-S11']
    witnesses = []
    for id_ in witness_ids:
        old, new = before[id_], after[id_]
        witnesses.append({'id': id_, 'beforeYards': old['result']['offenseYards'], 'afterYards': new['result']['offenseYards'],
            'beforeReads': combo_reads(old), 'afterReads': combo_reads(new),
            'beforeTransfers': transfers(old), 'afterTransfers': transfers(new)})
    output = {
        'schema': 'combo-transfer-comparison-v1',
        'comparisonSha256': sha(Path(__file__)),
        'inputs': {str(path): sha(path) for path in [args.before, args.after, film_path(args.before), film_path(args.after)]},
        'sources': {'before': b['sourceBefore'], 'after': a['sourceBefore']},
        'collectorSha256': b['collectorSha256'],
        'cohort': b['cohort'], 'initialProjectionsMatch': True,
        'ordinary': {'before': metric(b['trials']), 'after': metric(a['trials'])},
        'byConcept': {run: {'before': metric([t for t in b['trials'] if t['run'] == run]),
                          'after': metric([t for t in a['trials'] if t['run'] == run])} for run in b['cohort']['runs']},
        'byFront': {front: {'before': metric([t for t in b['trials'] if t['front'] == front]),
                          'after': metric([t for t in a['trials'] if t['front'] == front])} for front in b['cohort']['fronts']},
        'supplemental': {'before': metric(b['supplementalTrials']), 'after': metric(a['supplementalTrials'])},
        'nativeLimits': {'before': physics_limits(b), 'after': physics_limits(a)},
        'pairedResults': pairs,
        'pairedSupplementalResults': supplemental_pairs,
        'supplementalAdverse2YardPairs': [p for p in supplemental_pairs if p['yardsDelta'] <= -2],
        'identicalCompleteExecutions': sum(p['identicalCompleteExecution'] for p in pairs),
        'adverse2YardPairs': [p for p in pairs if p['yardsDelta'] <= -2],
        'beneficial2YardPairs': [p for p in pairs if p['yardsDelta'] >= 2],
        'transfers': {'before': [r for t in b['trials'] for r in transfers(t)],
                      'after': [r for t in a['trials'] for r in transfers(t)]},
        'supplementalTransfers': {'before': [r for t in b['supplementalTrials'] for r in transfers(t)],
                                 'after': [r for t in a['supplementalTrials'] for r in transfers(t)]},
        'priorWitnesses': witnesses,
        'fixedFilmIds': b['filmIds'],
        'definitions': {
            'keeperContinuity': 'The keeper owned a real live hand-joint object before the transfer, and the same per-play WeakMap ID is the primary hand object after the controller and next solved tick. A later real shed may remove it.',
            'nativeLoadedPair': 'positivePairForceAfterSolve uses the surviving live keeper↔defender afterSolvedJoint mean normal/tangent force for every keeper, including TE Y. It does not require an OL deliveredStep row.',
            'olDeliveredLoadScope': 'hasOLDeliveredLoad marks the separate per-body deliveredStep record, which this collector writes only for LT/LG/C/RG/RT. positiveOLPairForceAfterSolve and positiveOLKeeperArmImpulse are null when that row is absent, not false. Per-body arm impulse contains all hand/strike loads and is not attributed solely to the keeper pair. TE impulses are not inferred from joint force.',
            'weakHelperSecurePrimary': 'Actual scheduled combination reads with helperSupport<.25 and e.baseB>.60, |e.phi|<.55, control>-.06. This conservative control threshold passes every urgency value; it does not prove all other backer/dwell/candidate conditions.',
            'initialProjection': 'Fixed original body/profile/ratings/snap timing/plan/combination state. New diagnostic fields are omitted; both full projections and hashes must match.',
            'gains': 'Paired ordinary natural-end rushing gains; all adverse differences retained. The balanced160 is not a natural NFL concept distribution or roster population.',
            'nativeUnits': 'Force kg·yd/s², impulse kg·yd/s, work kg·yd²/s²; no unconverted N or N·s labels.',
            'physicsLimits': 'Max positive excess on OL native loads at retained controller ticks. Global residuals and support-motor excess are recorded on every solved tick by the collector.',
        },
        'limitations': [
            'Two separately labelled recovery witnesses use a second roster pair and are excluded from ordinary160 results.',
            'Receiver/LB/RB controllers and schemes were not validated merely by a cleaner handover; rushing gains can worsen after a mechanically feasible transfer.',
            'Joint field forces are tick means and only include hands that survive solver/cleanup; missing post-solve hands are not automatically a discontinuity bug.',
            'Collection runtime includes read-only observation, full replay records on fixed10, and independent plain reruns for all162; not a physics solver benchmark.',
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({'output': str(args.output), 'sources': output['sources'], 'ordinary': output['ordinary'],
        'identicalCompleteExecutions': output['identicalCompleteExecutions'],
        'adverse2YardPairs': output['adverse2YardPairs'], 'nativeLimits': output['nativeLimits']}, indent=2))


if __name__ == '__main__':
    main()
