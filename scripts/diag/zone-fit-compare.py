#!/usr/bin/env python3
"""Compare the fixed zone-reach panel; read saved observations, never resimulate.

python scripts/diag/zone-fit-compare.py before.json.gz after.json.gz output.json
"""
import argparse
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path

ZONES = ['oz_strong', 'wz_strong']


def read(path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def film_path(path):
    return Path(str(path).removesuffix('.json.gz') + '-film.json.gz')


def mean(values):
    return sum(values) / len(values) if values else None


def metric(trials):
    ol = [m for t in trials for m in t['olMetrics'].values()]
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
        'firstNativeBodyPairs': sum(len(m['firstContacts']) for m in ol),
        'firstSurvivingHandPairs': sum(len(m['firstHands']) for m in ol),
        'maxMomentumResidual': max((t['maxMomentumResidual'] for t in trials), default=0),
        'maxWorkResidual': max((t['maxWorkResidual'] for t in trials), default=0),
        'maxMotorWorkExcess': max((t['maxMotorWorkExcess'] for t in trials), default=0),
    }


def installed(trial):
    # Every assignment transition is retained. The first retained update's
    # BEFORE ownership therefore still provides the installed target/role.
    return {r['slot']: r['plan'] for r in trial['updates'][0]['before']}


def original_hands(trials):
    rows = []
    for t in trials:
        if t['run'] not in ZONES:
            continue
        plans = installed(t)
        side = 1 if t['flip'] else -1
        for slot, m in t['olMetrics'].items():
            p = plans[slot]
            if p['kind'] != 'reach' or (p['combination'] and not p['combination']['released']):
                continue
            h = next((h for h in m['firstHands'] if h['other'] == p['target']), None)
            if h is None:
                rows.append({'id': t['id'], 'run': t['run'], 'slot': slot,
                             'originalTarget': p['target'], 'native': None})
                continue
            lateral = (h['blockerPosition']['y'] - h['defenderPosition']['y']) * side
            hands = [j for j in h['nativeLoad']['liveHandsAfterPhysics']
                     if {j['a'], j['b']} == {slot, p['target']}]
            joint_loaded = any(abs(j['normalForce']) + abs(j['tangentForce']) > 1e-9 for j in hands)
            rows.append({'id': t['id'], 'run': t['run'], 'slot': slot, 'originalTarget': p['target'],
                'playsideCenterOffset': lateral, 'jointLoaded': joint_loaded,
                'tickArmImpulsePositive': h['nativeLoad']['armImpulse'] > 1e-9,
                'native': h})
    return rows


def installed_reach_roles(trials):
    counts = collections.Counter()
    for trial in trials:
        for slot, p in installed(trial).items():
            if slot not in trial['olMetrics'] or p['kind'] != 'reach':
                continue
            counts['initialReachJobs'] += 1
            if p['combination'] is None:
                counts['initialReachWithNoCombination'] += 1
            elif p['combination']['released']:
                counts['initialReachWithReleasedCombination'] += 1
            else:
                counts['excludedInitialReachWithLiveCombination'] += 1
    return dict(counts)


def hand_summary(rows):
    actual = [r for r in rows if r['native']]
    outside = [r for r in actual if r['playsideCenterOffset'] > 0]
    return {'originalInstalledSoloReachPairs': len(rows), 'pairsWithSurvivingHands': len(actual),
        'pairsWithoutSurvivingHands': len(rows) - len(actual),
        'playsideCenterAtFirstHands': len(outside),
        'firstHandsWithLoadedJoint': sum(r['jointLoaded'] for r in actual),
        'playsideCenterAndLoadedJoint': sum(r['jointLoaded'] for r in outside),
        'playsideCenterAndLoadedJointAndTickArmImpulse': sum(
            r['jointLoaded'] and r['tickArmImpulsePositive'] for r in outside),
        'meanFirstHandsTickStart': mean([r['native']['t'] for r in actual]),
        'meanFirstHandsCompletedAt': mean([r['native']['completedAt'] for r in actual]),
        'meanPlaysideCenterOffset': mean([r['playsideCenterOffset'] for r in actual])}


def choice_rows(trials):
    rows, inactive = [], collections.Counter()
    for trial in trials:
        target_slots = {}
        for u in trial['updates']:
            p = u['afterBody']['plan']
            z = p['zoneRead']
            if not z:
                continue
            fresh = z['t'] == u['t'] and u['zoneReadChanged']
            # The source stores the current target's idx when this read is
            # made. No off-policy perception or hidden target position is read.
            if fresh:
                old = target_slots.setdefault(z['target'], p['target'])
                assert old == p['target'], 'A fixed idx changed slot'
            reason = None
            if p['kind'] != 'reach':
                reason = 'kind-no-longer-reach'
            elif target_slots.get(z['target']) != p['target']:
                reason = 'read-target-no-longer-current'
            elif p['combination'] and not p['combination']['released']:
                reason = 'live-combination'
            e = u['afterBody']['engagement']
            if reason is None and e and (e['blocker'] != u['observer']
                    or e['defender'] != p['target'] or e['helpers']):
                reason = 'non-solo-owner-engagement'
            if reason is not None:
                inactive[reason] += 1
                continue
            if not fresh:
                continue
            image = next((r['image'] for r in u['consumedImages'] if r['target'] == p['target']), None)
            assert image == z['seen'], 'Fresh zone read was not a consumed ordinary image'
            g = u['targetGeometry']
            lateral = (u['beforeBody']['pos']['y'] - g['actualPosition']['y']) * z['side']
            load = next(r for r in u['deliveredStep'] if r['slot'] == u['observer'])
            hands = [j for j in load['liveHandsAfterPhysics']
                     if {j['a'], j['b']} == {u['observer'], p['target']}]
            loaded = any(abs(j['normalForce']) + abs(j['tangentForce']) > 1e-9 for j in hands)
            rows.append({'id': trial['id'], 'run': trial['run'], 't': u['t'], 'slot': u['observer'],
                'target': p['target'], 'phase': z['phase'], 'read': z,
                'actualPlaysideCenterOffsetAtRead': lateral, 'nativeLoadedHandsAfterStep': loaded,
                'engagementAtRead': e, 'nativeLoad': load})
    return rows, dict(inactive)


def witness(film, run):
    play = next(p for p in film['plays'] if p['id'] == f'ZR-R1-{run}-over-R-S3')
    rows = []
    for tick in play['trace']:
        if not .299 <= tick['t'] <= .451:
            continue
        u = next(u for u in tick['updates'] if u['observer'] == 'RG')
        load = next(r for r in tick['deliveredStep'] if r['slot'] == 'RG')
        rows.append({'t': tick['t'], 'beforeBody': u['beforeBody'], 'afterBody': u['afterBody'],
            'targetGeometry': u['targetGeometry'], 'requested': u['requested'],
            'consumedImages': u['consumedImages'], 'nativeLoad': load})
    return {'id': play['id'], 'selection': 'fixed Over/R/S3 RG, 0.30-0.45s from saved native audit', 'rows': rows}


def runoff_witness(film):
    # A diagnostic witness is selected by native contact requirements, never
    # by final gain: three consecutive loaded run-off updates on one target.
    for play in film['plays']:
        if play['run'] not in ZONES:
            continue
        tracks = collections.defaultdict(list)
        for tick in play['trace']:
            for u in tick['updates']:
                p, e, g = u['afterBody']['plan'], u['afterBody']['engagement'], u['targetGeometry']
                z = p['zoneRead']
                if not z or z['phase'] != 'runoff' or p['kind'] != 'reach' or not g or not e:
                    continue
                if play['players'][z['target']]['slot'] != p['target']:
                    continue
                if e['blocker'] != u['observer'] or e['defender'] != p['target'] or e['helpers']:
                    continue
                if p['combination'] and not p['combination']['released']:
                    continue
                load = next(r for r in tick['deliveredStep'] if r['slot'] == u['observer'])
                hands = [j for j in load['liveHandsAfterPhysics']
                    if {j['a'], j['b']} == {u['observer'], p['target']}]
                lateral = (u['beforeBody']['pos']['y'] - g['actualPosition']['y']) * z['side']
                if lateral >= 0 or not hands or load['armImpulse'] <= 1e-9:
                    continue
                tracks[(u['observer'], p['target'])].append({'t': u['t'], 'read': z,
                    'actualPlaysideCenterOffset': lateral, 'beforeBody': u['beforeBody'],
                    'afterBody': u['afterBody'], 'targetGeometry': g,
                    'requested': u['requested'], 'nativeLoad': load})
        for (slot, target), rows in tracks.items():
            for i in range(len(rows) - 2):
                chosen = rows[i:i + 3]
                if all(abs(chosen[j + 1]['t'] - chosen[j]['t'] - .05) < 1e-8 for j in [0, 1]):
                    return {'id': play['id'], 'slot': slot, 'target': target,
                        'selection': 'first fixed-film trio of consecutive loaded, actual-inside, current-target run-off updates; independent of gain',
                        'rows': chosen}
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    paths = [args.before, args.after]
    panels = [read(p) for p in paths]
    films = [read(film_path(p)) for p in paths]
    b, a = panels
    assert b['schema'] == a['schema'] == 'zone-reach-review-v1'
    assert b['collectorSha256'] == a['collectorSha256']
    assert b['cohort'] == a['cohort'] and b['filmIds'] == a['filmIds']
    assert b['moduleSha256']['src/physics/world.ts'] == a['moduleSha256']['src/physics/world.ts']
    for p, f in zip(panels, films):
        assert p['sourceBefore'] == p['sourceAfter'] == f['sourceBefore'] == f['sourceAfter']
        assert p['collectorSha256'] == f['collectorSha256']
        assert p['filmIds'] == [play['id'] for play in f['plays']]
    pairs = list(zip(b['trials'], a['trials']))
    assert len(pairs) == len(b['trials']) == len(a['trials']) == 48
    for bt, at in pairs:
        for key in ['id', 'roster', 'run', 'front', 'flip', 'seed', 'control', 'formation', 'profileSha256']:
            assert bt[key] == at[key], (bt['id'], key)
        for trial in [bt, at]:
            assert trial['observerVerified'] and trial['observedSignature'] == trial['plainSignature']
    hand_rows = [original_hands(p['trials']) for p in panels]
    choices, excluded = choice_rows(a['trials'])
    summaries = {}
    for key in ['all', 'zone', 'control', *ZONES]:
        pick = lambda ts: [t for t in ts if key == 'all' or (key == 'zone' and not t['control'])
            or (key == 'control' and t['control']) or t['run'] == key]
        summaries[key] = dict(zip(['before', 'after'], [metric(pick(p['trials'])) for p in panels]))
    hand_summaries = {run: dict(zip(['before', 'after'],
        [hand_summary([r for r in rows if r['run'] == run]) for rows in hand_rows])) for run in ZONES}
    paired_hands = []
    before_hands = {(r['id'], r['slot'], r['originalTarget']): r for r in hand_rows[0]}
    after_hands = {(r['id'], r['slot'], r['originalTarget']): r for r in hand_rows[1]}
    assert before_hands.keys() == after_hands.keys()
    for key in before_hands:
        bh, ah = before_hands[key], after_hands[key]
        paired_hands.append({'id': key[0], 'slot': key[1], 'target': key[2], 'before': bh, 'after': ah})
    phase_counts = {run: dict(collections.Counter(r['phase'] for r in choices if r['run'] == run)) for run in ZONES}
    report = {
        'schema': 'zone-fit-comparison-v1', 'comparisonToolSha256': sha(Path(__file__)),
        'beforeSource': b['sourceBefore'], 'afterSource': a['sourceBefore'],
        'collectorSha256': b['collectorSha256'], 'worldSha256': b['moduleSha256']['src/physics/world.ts'],
        'inputSha256': {str(p): sha(p) for p in [*paths, *[film_path(p) for p in paths]]},
        'checks': {'pairedFixedInputs': 48, 'sameProfiles': True, 'sameCohort': True,
            'observerPlainMatches': 96, 'unchangedWorld': True,
            'unchangedCompleteExecutionCount': sum(bt['observedSignature'] == at['observedSignature'] for bt, at in pairs),
            'installedControlCompleteExecutionCount': sum(bt['observedSignature'] == at['observedSignature']
                for bt, at in pairs if bt['control']),
            'initialProjectionHashesEqualCount': sum(bt['initialSha256'] == at['initialSha256'] for bt, at in pairs)},
        'summary': summaries, 'originalInstalledReachFirstHands': hand_summaries,
        'installedReachRoles': {run: dict(zip(['before', 'after'], [installed_reach_roles(
            [t for t in p['trials'] if t['run'] == run]) for p in panels])) for run in ZONES},
        'pairedOriginalReachNativeContacts': paired_hands,
        'freshCurrentSoloReadPhaseCounts': phase_counts, 'freshCurrentSoloReads': choices,
        'retainedStaleOrIneligibleReadUpdateCounts': excluded,
        'fixedAcquisitionWitnesses': {run: dict(zip(['before', 'after'], [witness(f, run) for f in films])) for run in ZONES},
        'sustainedRunoffNativeWitness': runoff_witness(films[1]),
        'allPairedOutcomes': [{'id': bt['id'], 'control': bt['control'], 'before': bt['result'], 'after': at['result'],
            'deltaYards': at['result']['offenseYards'] - bt['result']['offenseYards']} for bt, at in pairs],
        'cost': {'beforeWallMs': b['wallMs'], 'afterWallMs': a['wallMs'],
            'beforeCpuMs': b['cpuMs'], 'afterCpuMs': a['cpuMs']},
        'definitions': {
            'nativeUnits': 'The engine uses kg, yards and seconds. Native joint force is kg*yd/s^2, impulse kg*yd/s and work kg*yd^2/s^2. Multiply force/impulse by 0.9144 for N/N*s, and work by 0.9144^2 for J. All saved native fields remain unconverted.',
            'originalReachPair': 'Installed kind reach, no live installed combination, and its original target. Every transition is retained; initial ownership is recovered from the first retained update BEFORE snapshot.',
            'firstHands': 'First native surviving hand pair after World/cleanup. t is tick-start, completedAt is next native tick boundary; neither is exact continuous first-touch time.',
            'loaded': 'That surviving pair has nonzero native tick-mean normal/tangent force. Per-body arm impulse is separately reported and may include other contact in that tick.',
            'playside': 'Signed actual blocker-minus-defender center y, using requested run direction. A positive center offset alone is not a winning seal.',
            'freshRead': 'zoneReadChanged with zoneRead.t equal controller t; target idx binds to current named target at creation, current reach job, no live combination, solo primary engagement if engaged. Copied seen image must exactly equal a consumed ordinary image.',
            'inactive': 'Retained getter values are excluded when current job/target/combo/primary-helper ownership is incompatible; no old phase is counted as a new choice.',
            'seal': 'Controller phase only. Actual body position, support, hands and transmitted load determine whether a block succeeds; phase is never counted as achieved success.'},
        'limits': [
            'One fixed generated roster, two seeds, five fronts and both directions; 40 OZ/WZ and eight installed controls are diagnostics, not NFL rates or outcome calibration.',
            'Initial projection hashes include the new zoneRead field and can change despite identical physical profiles and fixed play inputs.',
            'Only 12 fixed films retain every controller update; panel retains all solo-zone reach updates and transitions. Getter values can outlive eligibility and must be gated.',
            'Fresh image verification uses only consumed sim.see returns. It does not create additional observations or random draws.',
            'Tick-ending surviving hands omit contacts removed in a tick; all per-body delivered impulse/work remains retained.',
            'Available travel is an optimistic free lateral heuristic, not a loaded rollout or physical reachability guarantee.',
            'Collection wall/CPU includes observation, replay recording and a plain rerun. It is not an isolated solver benchmark.']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ['checks', 'summary', 'originalInstalledReachFirstHands',
        'freshCurrentSoloReadPhaseCounts', 'cost']}, indent=2))


if __name__ == '__main__':
    main()
