#!/usr/bin/env python3
"""Compare unchanged ordinary combo panels for exchanged run-blocking work.

python scripts/diag/ol-exchange-compare.py before.json.gz after.json.gz comparison.json

Only recorded controller reads and solved loads are inspected. In particular,
an exchanging partner's perception is absent when the unchanged collector did
not capture it; the initiator's image is never attributed to that partner.
"""
import argparse
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path


RESERVED = {'pull', 'lead', 'stalk', 'draw'}
FIRST_LEVEL = {'drive', 'reach', 'down', 'cutoff', 'combo'}


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def avg(values):
    return sum(values) / len(values) if values else None


def require(condition, message):
    if not condition:
        raise ValueError(message)


def ownership(row, stage, slot):
    return next((m for m in row[stage] if m['slot'] == slot), None)


def compact_plan(plan):
    if plan is None:
        return None
    return {key: plan[key] for key in ['kind', 'target', 'drive', 'pullRole', 'combination']}


def own_picture(row, slot, target):
    if row['observer'] != slot:
        return None
    # Repeated reads in one update can differ in their purpose. Keep the
    # actual full sequence in the exchange record and use the last target
    # picture only for this explicitly descriptive classification.
    return next((c['image'] for c in reversed(row['consumedImages'])
                 if c['target'] == target), None)


def installed_solo_kind(trial, slot):
    installation = {m['slot']: m['plan'] for m in trial['initialProjection']['ownership']}
    plan = installation[slot]
    kind = plan['kind']
    if kind == 'combo':
        combo = plan['combination']
        owner = installation.get(combo['members'][0]) if combo else None
        kind = owner['kind'] if owner else 'drive'
    return kind if kind in FIRST_LEVEL - {'combo'} else 'drive' if kind in {'combo', 'climb'} else kind


def observed_job(trial, row, slot, member):
    plan = member['plan']
    picture = own_picture(row, slot, plan['target'])
    if picture is None:
        return {'ownPictureCaptured': False, 'reason': 'collector captures active initiator only'}
    los = trial.get('_los', 40)
    depth = picture['pos']['x'] - los
    expected_kind = 'climb' if depth > 2 else installed_solo_kind(trial, slot)
    return {'ownPictureCaptured': True, 'target': plan['target'], 'image': picture,
            'observedDepth': depth, 'surfaceOrSecondLevel': 'second-level' if depth > 2 else 'surface',
            'expectedKindFromRecordedInstallationAndDepth': expected_kind,
            'kindMatchesDepthRule': plan['kind'] == expected_kind,
            'firstLevelKindOnDeepPicture': depth > 2 and plan['kind'] in FIRST_LEVEL,
            'climbKindOnSurfacePicture': depth <= 2 and plan['kind'] == 'climb'}


def compact_load(row, slot):
    load = next((m for m in row['deliveredStep'] if m['slot'] == slot), None)
    if load is None:
        return None
    return {key: load[key] for key in [
        'slot', 'appliedIntent', 'achievedPos', 'achievedVel', 'groundImpulse',
        'armImpulse', 'armImpulseLimit', 'armWork', 'armWorkLimit',
        'supportMotorWork', 'supportMotorWorkLimit', 'groundTractionLimit',
        'liveHandsAfterPhysics', 'fall', 'down']}


def exchanges(trial):
    slots = [p['slot'] for p in trial['initialProjection']['players']]
    initial = {m['slot']: m['plan'] for m in trial['initialProjection']['ownership']}
    records = []
    for row in trial['updates']:
        for event in row['events']:
            if event['type'] != 'block_exchange':
                continue
            a, b = slots[event['a']], slots[event['b']]
            before = {slot: ownership(row, 'before', slot) for slot in [a, b]}
            after = {slot: ownership(row, 'after', slot) for slot in [a, b]}
            require(all(before.values()) and all(after.values()), f'Missing exchange owner {trial["id"]}')
            swapped = (before[a]['plan']['target'] == after[b]['plan']['target']
                       and before[b]['plan']['target'] == after[a]['plan']['target'])
            require(swapped, f'Exchange did not swap both responsibilities {trial["id"]}@{row["t"]}')
            members = []
            for slot in [a, b]:
                old, new = before[slot], after[slot]
                job = observed_job(trial, row, slot, new)
                members.append({
                    'slot': slot, 'before': compact_plan(old['plan']), 'after': compact_plan(new['plan']),
                    'kindChanged': old['plan']['kind'] != new['plan']['kind'],
                    'driveChanged': old['plan']['drive'] != new['plan']['drive'],
                    'beforeEngaged': old['engagement'] is not None,
                    'beforeCombination': old['plan']['combination'] is not None,
                    'beforeReserved': old['plan']['kind'] in RESERVED,
                    'installedSoloKind': installed_solo_kind(trial, slot),
                    'installedDrive': initial[slot]['drive'],
                    'observedJob': job,
                    'postUpdateSurfaceDriveEqualsInstallation': (
                        new['plan']['drive'] == initial[slot]['drive']
                        if job.get('ownPictureCaptured') and job['observedDepth'] <= 2 else None),
                    'nativeNextSolvedLoad': compact_load(row, slot),
                })
            target_engaged = any(m['engagement'] and m['engagement']['defender'] in {
                before[a]['plan']['target'], before[b]['plan']['target']} for m in row['before'])
            records.append({
                'id': trial['id'], 'run': trial['run'], 'front': trial['front'], 'flip': trial['flip'],
                'seed': trial['seed'], 't': row['t'], 'completedAt': row['completedAt'],
                'initiator': a, 'partner': b, 'observer': row['observer'], 'bothTargetsSwapped': swapped,
                'targetEngagedBefore': target_engaged,
                'bothOwnersFreeAndUnreservedWithoutCombination': all(
                    not m['beforeEngaged'] and not m['beforeCombination'] and not m['beforeReserved']
                    for m in members),
                'controllerBodyPositionUnchanged': row['beforeBody']['pos'] == row['afterBody']['pos'],
                'controllerBodyVelocityUnchanged': row['beforeBody']['vel'] == row['afterBody']['vel'],
                'controllerFootSupportUnchanged': row['beforeBody']['support'] == row['afterBody']['support'],
                'requestedIntent': row['requested'],
                'initiatorConsumedImages': row['consumedImages'],
                'partnerOwnPictureCaptured': row['observer'] == b,
                'members': members,
            })
    return records


def transfer_summary(trials, prior):
    # Reuse the pinned independently reviewed keeper checks. Discard raw row
    # references before writing: no nativeRecord duplication in this report.
    records = []
    for trial in trials:
        for record in prior.transfers(trial):
            records.append({key: value for key, value in record.items() if key != 'nativeRecord'})
    return {
        'records': len(records),
        'promotedHelperRecords': sum(r['keeperWasHelper'] for r in records),
        'sameKeeperJointAfterController': sum(r['sameObjectAfterController'] for r in records),
        'sameKeeperJointAfterSolve': sum(r['sameObjectAfterSolve'] for r in records),
        'positiveKeeperPairForceAfterSolve': sum(r['positivePairForceAfterSolve'] for r in records),
        'keeperRecordsWithOLDeliveredLoad': sum(r['hasOLDeliveredLoad'] for r in records),
        'positiveOLKeeperArmImpulse': sum(bool(r['positiveOLKeeperArmImpulse']) for r in records),
        'continuityFailures': [r for r in records if not (r['sameObjectAfterController'] and r['sameObjectAfterSolve'])],
    }


def metrics(trials):
    ol = [m for trial in trials for m in trial['olMetrics'].values()]
    records = [r for trial in trials for r in exchanges(trial)]
    members = [m for r in records for m in r['members']]
    seen = [m for m in members if m['observedJob']['ownPictureCaptured']]
    descriptive_deep = descriptive_surface = 0
    for trial in trials:
        for row in trial['updates']:
            plan = row['afterBody']['plan']
            picture = own_picture(row, row['observer'], plan['target'])
            if picture is None or row['afterBody']['engagement']:
                continue
            depth = picture['pos']['x'] - trial['_los']
            descriptive_deep += depth > 2 and plan['kind'] in FIRST_LEVEL
            descriptive_surface += depth <= 2 and plan['kind'] == 'climb'
    return {
        'snaps': len(trials), 'naturalEnds': sum(t['naturalEnd'] for t in trials),
        'censors': sum(not t['naturalEnd'] for t in trials),
        'observerPlainMatches': sum(t['observedSignature'] == t['plainSignature'] for t in trials),
        'meanYards': avg([t['result']['offenseYards'] for t in trials]),
        'stuffs': sum(t['result']['offenseYards'] <= 0 for t in trials),
        'runs10Plus': sum(t['result']['offenseYards'] >= 10 for t in trials),
        'earnedClimbs': sum(t['earnedClimbs'] for t in trials),
        'cancelledTransitions': sum(t['cancelledTransitions'] for t in trials),
        'staleMemberUpdates': sum(t['staleMemberUpdates'] for t in trials),
        'olFalls': sum(m['falls'] for m in ol), 'olDowns': sum(m['downs'] for m in ol),
        'blockExchangeEvents': len(records), 'exchangesWithKindChanges': sum(any(m['kindChanged'] for m in r['members']) for r in records),
        'exchangesWithDriveChanges': sum(any(m['driveChanged'] for m in r['members']) for r in records),
        'ownNewTargetImagesCapturedAtExchange': len(seen),
        'partnerOwnImagesAbsentAtExchange': sum(not r['partnerOwnPictureCaptured'] for r in records),
        'recordedExchangeKindsMatchingDepthRule': sum(m['observedJob']['kindMatchesDepthRule'] for m in seen),
        'recordedExchangeKindsMismatchingDepthRule': sum(not m['observedJob']['kindMatchesDepthRule'] for m in seen),
        'recordedExchangeSurfaceDriveEqualsInstallation': sum(m['postUpdateSurfaceDriveEqualsInstallation'] is True for m in seen),
        'recordedExchangeSurfaceDriveDiffersFromInstallation': sum(m['postUpdateSurfaceDriveEqualsInstallation'] is False for m in seen),
        'firstLevelKindOnConsumedDeepPictureUpdates': descriptive_deep,
        'climbKindOnConsumedSurfacePictureUpdates': descriptive_surface,
        'maxMomentumResidual': max((t['maxMomentumResidual'] for t in trials), default=0),
        'maxWorkResidual': max((t['maxWorkResidual'] for t in trials), default=0),
        'maxMotorWorkExcess': max((t['maxMotorWorkExcess'] for t in trials), default=0),
    }


def paired(old, new):
    return {'id': old['id'], 'run': old['run'], 'front': old['front'], 'flip': old['flip'], 'seed': old['seed'],
            'beforeYards': old['result']['offenseYards'], 'afterYards': new['result']['offenseYards'],
            'yardsDelta': new['result']['offenseYards'] - old['result']['offenseYards'],
            'beforeOutcome': old['result']['outcome'], 'afterOutcome': new['result']['outcome'],
            'beforeDuration': old['result']['duration'], 'afterDuration': new['result']['duration'],
            'beforeNaturalEnd': old['naturalEnd'], 'afterNaturalEnd': new['naturalEnd'],
            'beforeClimbs': old['earnedClimbs'], 'afterClimbs': new['earnedClimbs'],
            'beforeExchanges': len(exchanges(old)), 'afterExchanges': len(exchanges(new)),
            'identicalCompleteExecution': old['observedSignature'] == new['observedSignature']}


def witness(trial):
    rows = exchanges(trial)
    affected = {m['slot'] for row in rows for m in row['members']}
    # Retain compact later intent/observed-cue records for the exact former
    # climb-on-DT witness. No extra reads, hidden positions, or whole rows.
    later = []
    for row in trial['updates']:
        if row['observer'] not in affected:
            continue
        if not rows or row['t'] < rows[0]['t'] or row['t'] > rows[0]['t'] + .35 + 1e-9:
            continue
        later.append({'t': row['t'], 'observer': row['observer'],
                      'before': compact_plan(row['beforeBody']['plan']),
                      'after': compact_plan(row['afterBody']['plan']),
                      'consumedImages': row['consumedImages'], 'requestedIntent': row['requested'],
                      'nativeNextSolvedLoad': compact_load(row, row['observer'])})
    return {'id': trial['id'], 'result': {key: trial['result'][key] for key in [
        'offenseYards', 'duration', 'outcome', 'endX', 'endY', 'penalty'] if key in trial['result']},
        'exchanges': rows, 'recordedFollowupUpdatesWithin035Seconds': later,
        'olFalls': sum(m['falls'] for m in trial['olMetrics'].values()), 'earnedClimbs': trial['earnedClimbs']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    before, after = read(args.before), read(args.after)
    helper_path = Path(__file__).with_name('compare-combo-transfer.py')
    spec = importlib.util.spec_from_file_location('prior_combo_comparison', helper_path)
    prior = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prior)
    for report in [before, after]:
        require(report['schema'] == 'combo-transfer-review-v1', 'Unexpected collector schema')
        require(report['sourceBefore'] == report['sourceAfter'], 'Engine changed during collector')
        for trial in report['trials'] + report['supplementalTrials']:
            require(trial['observerVerified'] and trial['observedSignature'] == trial['plainSignature'], f'Observer changed {trial["id"]}')
            require(trial['naturalEnd'] == (trial['result']['outcome'] != 'timeout'), f'Natural-end mislabel {trial["id"]}')
            trial['_los'] = report['cohort']['los']
    require(before['collectorSha256'] == after['collectorSha256'], 'Collector changed')
    require(before['cohort'] == after['cohort'], 'Ordinary cohort changed')
    require(before['filmIds'] == after['filmIds'], 'Fixed film IDs changed')
    expected = len(before['cohort']['runs']) * len(before['cohort']['fronts']) * len(before['cohort']['flips']) * len(before['cohort']['playSeeds'])
    require(expected == 160, 'Unexpected ordinary panel design')
    require(all(len(r['trials']) == expected and len(r['supplementalTrials']) == 2 for r in [before, after]), 'Missing ordinary/supplemental trials')
    pairs_by_scope = {}
    all_initial_checks = []
    for scope in ['trials', 'supplementalTrials']:
        old_by_id = {t['id']: t for t in before[scope]}
        new_by_id = {t['id']: t for t in after[scope]}
        require(len(old_by_id) == len(before[scope]) and len(new_by_id) == len(after[scope]), 'Duplicate IDs')
        require(old_by_id.keys() == new_by_id.keys(), f'{scope} IDs changed')
        for id_, old in old_by_id.items():
            new = new_by_id[id_]
            require(all(old[k] == new[k] for k in ['run', 'front', 'flip', 'seed', 'roster', 'formation', 'supplemental']), f'Input labels changed {id_}')
            require(old['initialProjection'] == new['initialProjection'], f'Full initial projection changed {id_}')
            require(old['initialSha256'] == new['initialSha256'] and old['profileSha256'] == new['profileSha256'], f'Initial/profile SHA changed {id_}')
            all_initial_checks.append({'id': id_, 'initialSha256': old['initialSha256'], 'profileSha256': old['profileSha256'],
                                       'fullProjectionMatch': True, 'beforeObserverNeutral': True, 'afterObserverNeutral': True,
                                       'beforeNaturalEnd': old['naturalEnd'], 'afterNaturalEnd': new['naturalEnd']})
        pairs_by_scope[scope] = [paired(old, new_by_id[id_]) for id_, old in old_by_id.items()]
    old_all = before['trials'] + before['supplementalTrials']
    new_all = after['trials'] + after['supplementalTrials']
    old_exchange = [r for t in old_all for r in exchanges(t)]
    new_exchange = [r for t in new_all for r in exchanges(t)]
    for label, records in [('before', old_exchange), ('after', new_exchange)]:
        require(all(r['bothOwnersFreeAndUnreservedWithoutCombination'] and not r['targetEngagedBefore'] for r in records), f'{label} exchange bypassed reserved/live contact guard')
        require(all(r['controllerBodyPositionUnchanged'] and r['controllerBodyVelocityUnchanged'] and r['controllerFootSupportUnchanged'] for r in records), f'{label} exchange changed body/support directly')
    witness_id = 'CT-R1-duo-odd-R-S3'
    old_witness = next(t for t in before['trials'] if t['id'] == witness_id)
    new_witness = next(t for t in after['trials'] if t['id'] == witness_id)
    output = {
        'schema': 'ol-exchange-comparison-v1', 'comparisonSha256': sha(Path(__file__)),
        'reusedKeeperChecks': {'path': str(helper_path), 'sha256': sha(helper_path)},
        'inputs': {str(path): sha(path) for path in [args.before, args.after]},
        'sources': {'before': before['sourceBefore'], 'after': after['sourceBefore']},
        'modules': {'before': before['moduleSha256'], 'after': after['moduleSha256']},
        'physicalCoreModulesUnchanged': {p: before['moduleSha256'][p] == after['moduleSha256'][p]
                                         for p in ['src/sim/engagement.ts', 'src/physics/world.ts']},
        'collectorSha256': before['collectorSha256'], 'cohort': before['cohort'], 'fixedFilmIds': before['filmIds'],
        'initialAndControlChecks': all_initial_checks, 'fullInitialProjectionsMatch': True,
        'ordinary': {'before': metrics(before['trials']), 'after': metrics(after['trials'])},
        'byConcept': {run: {'before': metrics([t for t in before['trials'] if t['run'] == run]),
                            'after': metrics([t for t in after['trials'] if t['run'] == run])} for run in before['cohort']['runs']},
        'byFront': {front: {'before': metrics([t for t in before['trials'] if t['front'] == front]),
                            'after': metrics([t for t in after['trials'] if t['front'] == front])} for front in before['cohort']['fronts']},
        'supplemental': {'before': metrics(before['supplementalTrials']), 'after': metrics(after['supplementalTrials'])},
        'nativeLimits': {'before': prior.physics_limits(before), 'after': prior.physics_limits(after)},
        'keeperContinuity': {
            'all162': {'before': transfer_summary(old_all, prior), 'after': transfer_summary(new_all, prior)},
            'ordinary160': {'before': transfer_summary(before['trials'], prior), 'after': transfer_summary(after['trials'], prior)},
            'supplemental2': {'before': transfer_summary(before['supplementalTrials'], prior), 'after': transfer_summary(after['supplementalTrials'], prior)},
        },
        'pairedResults': pairs_by_scope['trials'], 'pairedSupplementalResults': pairs_by_scope['supplementalTrials'],
        'identicalCompleteExecutions': sum(p['identicalCompleteExecution'] for p in pairs_by_scope['trials']),
        'adverse2YardPairs': [p for p in pairs_by_scope['trials'] if p['yardsDelta'] <= -2],
        'adverseAnyGainPairs': [p for p in pairs_by_scope['trials'] if p['yardsDelta'] < -1e-9],
        'beneficial2YardPairs': [p for p in pairs_by_scope['trials'] if p['yardsDelta'] >= 2],
        'supplementalAdverse2YardPairs': [p for p in pairs_by_scope['supplementalTrials'] if p['yardsDelta'] <= -2],
        'actualExchanges': {'before': old_exchange, 'after': new_exchange},
        'priorAdverseDuoOddRightSeed3': {'before': witness(old_witness), 'after': witness(new_witness)},
        'definitions': {
            'actualExchange': 'An actual block_exchange emitted by the ordinary RunBlocker update; both target swaps, pre/post kinds/drives and next native solved OL loads retained.',
            'ownPicture': 'Only sim.see calls consumed by the active observer were recorded by the unchanged collector. The partner own picture is explicitly absent, even if the controller called it.',
            'kindDepthRule': 'For a recorded new-target image >2 yd beyond LOS, compare kind with climb; for shallower images, compare with the installed solo kind captured in initial plans. Combo installations use their installed owner kind. This is a descriptive controller rule check, not an NFL quality label.',
            'retainedUpdateCounts': 'All-update-looking counts use retained collector rows only. This collector does not retain every ordinary controller update outside its existing diagnostic classifications.',
            'reservedGuard': 'Each actual exchange requires both owners unengaged, no combination pointer, kinds outside pull/lead/stalk/draw, and both target defenders unengaged in recorded pre-update ownership.',
            'sameFrame': 'Requested intent follows the new plan in the emitting update. Equality checks demonstrate the controller did not teleport body position/velocity or directly replace foot support; actual motion follows the native solve.',
            'surfaceDrive': 'Recorded shallower-image exchanges compare post-update drive with that player’s initial installed displacement vector. A subsequent solo-zone read in the same update can legitimately choose a new vector; inequality alone does not prove a restoration bug. Initial combo/owner state is saved, not inferred from defender labels.',
            'nativeUnits': 'Force kg·yd/s², impulse kg·yd/s, work kg·yd²/s²; SI force/impulse ×0.9144, work ×0.9144².',
            'keeperCheck': 'Reuses pinned prior comparator’s actual surviving keeper hand-object IDs after the controller and next native solve; no raw nativeRecord duplication in this compact summary.',
        },
        'limitations': [
            'Balanced160 uses one generated roster pair31/32 and matched strength. Two roster41/42 witnesses remain separate; neither is an NFL concept distribution or population study.',
            'Partner own images at exchange are not captured by this collector. Its rule execution needs independent tests/source review; no partner cognition is inferred here.',
            'Changes to gains after exchanges include later coupled football decisions and contact; they are not isolated physical effects or an average NFL success target.',
            'Recorded depth-rule mismatches are descriptive. Designed climbs can meet filling linebackers, and classification alone does not prove a better block.',
            'Native limits apply to retained OL controller ticks; global work/momentum residuals were measured by the collector on every solved tick.',
            'This comparison and collector overhead are not a solver speed benchmark.',
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({key: output[key] for key in ['sources', 'ordinary', 'supplemental', 'identicalCompleteExecutions',
                                                  'adverse2YardPairs', 'beneficial2YardPairs', 'nativeLimits', 'keeperContinuity']}, indent=2))


if __name__ == '__main__':
    main()
