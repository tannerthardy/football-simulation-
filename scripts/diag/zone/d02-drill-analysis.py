"""D02: descriptive reduction of two already-executed Ace histories.

No simulation, controller calls, stochastic draws, trajectory interpolation or
claim that a geometric corridor is an attainable football alternative.
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[3]
SAVED = ROOT / 'data/reviews/current/ace-production-observations.json.gz'
TRIAL = Path('/workspace/football-te-base-production/out/te-base-production/native.json.gz')
RECEIPT = ROOT / 'docs/reviews/te-base-production-receipt.json'
OUTPUT = ROOT / 'docs/reviews/run-drills/d02-witness.json'
IDS = {3: 'C', 15: 'LB_M', 6: 'RB'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def vector(a, b):
    return {k: a[k] - b[k] for k in ('x', 'y')}


def dot(a, b):
    return sum(a[k] * b[k] for k in ('x', 'y'))


def norm(a):
    return math.hypot(a['x'], a['y'])


def geometry(bodies):
    center, backer, runner = [bodies[i] for i in IDS]
    ray = vector(runner['pos'], backer['pos'])
    to_c = vector(center['pos'], backer['pos'])
    projection = dot(to_c, ray) / dot(ray, ray)
    clearance = norm({k: to_c[k] - projection * ray[k] for k in ray})
    separation = vector(backer['pos'], center['pos'])
    side = dot(vector(runner['pos'], center['pos']), separation) / norm(separation)
    radius = runner['profile']['radius'] + backer['profile']['radius']
    reach = radius + .4 * backer['profile']['reach']
    return {
        'C_LB_centerDistance': norm(separation),
        'LB_RB_centerDistance': norm(ray),
        'RB_projectionTowardLBFromC': side,
        'C_projectionOnLBToRBLine': projection,
        'C_distanceToLBToRBLine': clearance,
        'C_nativeOcclusionRadius': center['profile']['radius'] + .25,
        'C_matchesNativeOcclusionGeometry': .15 < projection < .85
        and clearance < center['profile']['radius'] + .25,
        'LB_RB_bodyRadiusSum': radius,
        'LB_RB_engagedStandingReach': reach,
        'insideEngagedStandingReach': norm(ray) <= reach,
        'interpretation': 'Native instantaneous occlusion/range geometry only; '
        'does not certify engagement win, tackle readiness, continuous contact or future access.'
    }


def dedup_cues(cues):
    groups = {}
    for cue in cues:
        if cue['actor'] not in IDS or cue['target'] not in IDS:
            continue
        key = json.dumps(cue, sort_keys=True)
        if key not in groups:
            groups[key] = {'call': cue, 'consumedCallMultiplicity': 0}
        groups[key]['consumedCallMultiplicity'] += 1
    return list(groups.values())


def body_state(body):
    return {k: body[k] for k in ('pos', 'vel', 'facing', 'spin', 'energy', 'support') if k in body}


def candidate_row(frame):
    before = frame['worldInput']['beforeBodies']
    after = [a['body'] for a in frame['agents']]
    joints = [j for j in frame['worldInput']['jointInputs']
              if j['kind'] == 'hands' and {j['a'], j['b']} == {3, 15}]
    loads = [j for j in frame['worldInput']['jointOutputsAtWorldEnd']
             if j['kind'] == 'hands' and {j['a'], j['b']} == {3, 15}]
    dt = frame['after'] - frame['t']
    return {
        'controllerEntryTime': frame['t'], 'completedWorldBoundary': frame['after'],
        'before': {IDS[i]: body_state(before[i]) for i in IDS},
        'after': {IDS[i]: body_state(after[i]) for i in IDS},
        'motion': {IDS[i]: {
            'storedBehaviorCommand': frame['agents'][i]['requested'],
            'WorldInputAfterEngagementAndSpacing': frame['worldInput']['intents'][i],
            'achievedMeanCOMVelocity': {k: (after[i]['pos'][k] - before[i]['pos'][k]) / dt
                                       for k in ('x', 'y')},
            'achievedVelocityAtBoundary': after[i]['vel'],
            'supportMetricsAtBoundary': frame['agents'][i]['supportMetrics'],
            'tagsAtBoundary': frame['agents'][i]['tags']
        } for i in IDS},
        'rawEngagementCommandBeforeSpacing': None,
        'rawEngagementCommandLimitation': 'PR28 did not capture contact movement '
        'observer phases. A stored stand command is replaced by engagement; it is '
        'not the raw contact request. Final World inputs are captured exactly.',
        'consumedGroupCues': dedup_cues(frame['cues']),
        'acquiredHandJointAtWorldInput': joints,
        'signedTickAverageHandLoads': loads,
        'signedHandImpulseComponents': [{
            'a': j['a'], 'b': j['b'],
            'normal': j['normalForce'] * dt, 'tangent': j['tangentForce'] * dt
        } for j in loads],
        'bodyContactsInvolvingGroup': [h for h in frame['report']['contacts']
                                      if h['i'] in IDS or h['j'] in IDS],
        'groundImpulse': {IDS[i]: frame['report']['groundImpulse'][i] for i in IDS},
        'armBudget': {IDS[i]: {
            k: frame['report'][k][i] for k in ('armImpulse', 'armImpulseLimit', 'armWork', 'armWorkLimit')
        } for i in IDS},
        'workResidual': frame['report']['work']['residual'],
        'geometryBefore': geometry(before), 'geometryAfter': geometry(after),
        'all22BodyGeometryBefore': [{
            'idx': i, 'slot': frame['agents'][i]['slot'],
            'pos': b['pos'], 'vel': b['vel'], 'radius': b['profile']['radius'],
            'facing': b['facing'], 'supportState': b['support']['state']
        } for i, b in enumerate(before)] if frame['t'] in (2.55, 3.0) else None
    }


started = time.perf_counter()
saved = json.load(gzip.open(SAVED, 'rt'))
trial = json.load(gzip.open(TRIAL, 'rt'))
reference = next(p for p in saved['panel'] if p['input']['id'] == 'uc12-wz-s3')
candidate = next(p['candidate'] for p in trial['panel']
                 if p['candidate']['input']['id'] == 'uc12-wz-s3')
assert saved['provenance']['sourceSha256'] == trial['runtimeSourceSha256']
assert trial['savedSource']['sha256'] == sha(SAVED)
assert len(saved['provenance']['flags']) == 44
assert candidate['input'] == reference['input']
assert candidate['withBase'] and not candidate['censored']
assert candidate['firstContact']['opponent'] == 'LB_M'

profiles = {i: reference['actors'][i]['profile'] for i in IDS}
reference_rows = []
comparisons = []
for f in reference['detailedFrames']:
    if f['t'] < 1.2:
        continue
    before = {b['idx']: {**b, 'profile': reference['actors'][b['idx']]['profile']}
              for b in f['before']}
    after = {b['idx']: {**b, 'profile': reference['actors'][b['idx']]['profile']}
             for b in f['afterBodies']}
    row = {
        'controllerEntryTime': f['t'], 'completedWorldBoundary': f['after'],
        'before': {IDS[i]: body_state(before[i]) for i in IDS},
        'after': {IDS[i]: body_state(after[i]) for i in IDS},
        'motion': {IDS[i]: {'storedBehaviorCommand': f['requested'][i],
                           'WorldInputAfterEngagementAndSpacing': f['delivered'][i]}
                   for i in IDS},
        'geometryBefore': geometry(before), 'geometryAfter': geometry(after),
        'consumedGroupCues': [q for q in f['consumed']
                              if q.get('actor') in IDS and q.get('target') in IDS]
    }
    reference_rows.append(row)
    cf = next((x for x in candidate['frames'] if x['t'] == f['t']), None)
    if cf and f['t'] <= 2.45:
        c_before = cf['worldInput']['beforeBodies']
        comparisons.append({
            'controllerEntryTime': f['t'],
            'C_exactSameStoredCommand': f['requested'][3] == cf['agents'][3]['requested'],
            'C_exactSameWorldInput': f['delivered'][3] == cf['worldInput']['intents'][3],
            'C_positionDifference': vector(c_before[3]['pos'], before[3]['pos']),
            'LB_positionDifference': vector(c_before[15]['pos'], before[15]['pos']),
            'RB_positionDifference': vector(c_before[6]['pos'], before[6]['pos'])
        })

selected_times = {1.2, 2.4, 2.55, 2.7, 2.95, 3.0}
selected = [candidate_row(f) for f in candidate['frames'] if f['t'] in selected_times]
first_loaded = next(f for f in candidate['frames'] if any(
    j['a'] == 3 and j['b'] == 15 and (j['normalForce'] != 0 or j['tangentForce'] != 0)
    for j in f['worldInput']['jointOutputsAtWorldEnd']))
first_in_range = next(f for f in candidate['frames'] if f['after'] >= 2.55
                      and geometry([a['body'] for a in f['agents']])['insideEngagedStandingReach'])

# Deliberately descriptive RB-only side contrast. Same C/LB state and joint;
# reflect only an instantaneous runner point/heading about C's dividing plane.
frozen = next(f for f in candidate['frames'] if f['t'] == 3.0)
bodies = frozen['worldInput']['beforeBodies']
center, backer, runner = [bodies[i] for i in IDS]
sep = vector(backer['pos'], center['pos'])
unit = {k: sep[k] / norm(sep) for k in sep}
signed = dot(vector(runner['pos'], center['pos']), unit)
mirrored = {**runner,
            'pos': {k: runner['pos'][k] - 2 * signed * unit[k] for k in unit},
            'vel': {k: runner['vel'][k] - 2 * dot(runner['vel'], unit) * unit[k] for k in unit}}
mirror_bodies = {3: center, 15: backer, 6: mirrored}
contrast = {
    'frozenControllerEntryTime': 3.0,
    'type': 'Offline instantaneous corridor side contrast; not a continuation, '
    'full-world mirror, runner decision or physically certified alternative.',
    'construction': 'C and LB_M plus acquired joint remain identical. RB point and '
    'velocity alone are reflected across the plane through C perpendicular to C→LB_M.',
    'actualExposedSide': {'RB': runner, 'geometry': geometry(bodies)},
    'declaredProtectedSide': {'RB': mirrored, 'geometry': geometry(mirror_bodies)},
    'C_LB_joint': [j for j in frozen['worldInput']['jointInputs']
                   if j['a'] == 3 and j['b'] == 15],
    'otherTrafficIncluded': False,
    'proves': 'Block placement has directional protection: the native C-occlusion '
    'test rejects C on the actual LB→RB segment and includes C on the declared opposing ray.',
    'doesNotProve': 'That the RB could choose/reach this reflected point or that LB '
    'cannot go around C; acceleration, turning, traffic, support and the retained joint '
    'would require coupled execution to establish such a route.'
}
assert not contrast['actualExposedSide']['geometry']['C_matchesNativeOcclusionGeometry']
assert contrast['declaredProtectedSide']['geometry']['C_matchesNativeOcclusionGeometry']

anchor = next(f for f in candidate['frames'] if f['t'] == 2.4)
achieved_windows = []
for horizon in (.1, .3, .6):
    end = next(f for f in candidate['frames'] if abs(f['t'] - (2.4 + horizon)) < 1e-9)
    achieved_windows.append({'fromBoundary': 2.4, 'toBoundary': 2.4 + horizon,
                             'horizon': horizon,
                             'actualAchievedDisplacement': {
                                 IDS[i]: vector(end['worldInput']['beforeBodies'][i]['pos'],
                                                anchor['worldInput']['beforeBodies'][i]['pos'])
                                 for i in IDS},
                             'claim': 'One already-executed coupled native path; '
                             'not an upper attainable envelope for other commands.'})

reference_loads = [{
    'controllerEntryTime': f['t'], 'completedWorldBoundary': f['after'], 'hands': j
} for f in reference['series'] for j in f['handsAtWorldEnd'] if j['a'] == 3 and j['b'] == 15]
candidate_loads = [{
    'controllerEntryTime': f['t'], 'completedWorldBoundary': f['after'], 'hands': j
} for f in candidate['frames'] for j in f['worldInput']['jointOutputsAtWorldEnd']
    if j['a'] == 3 and j['b'] == 15]

result = {
    'protocol': 'run-drills-d02-descriptive-v1',
    'question': 'Why can LB_M contact the runner while C has acquired and loaded hands '
    'in the parked production TE-base Y intervention?',
    'scope': 'Parked PR28 intervention counterfactual versus accepted PR26 successful Y; '
    'not a newly established default-baseline defect or TE-base promotion.',
    'provenance': {
        'acceptedDevelop': saved['provenance']['developCommit'],
        'runtimeSourceSha256': trial['runtimeSourceSha256'],
        'candidateTestedCommit': trial['commit'],
        'historicalComparisonBaseline': trial['comparisonBaseline'],
        'flags': saved['provenance']['flags'],
        'flagsSha256': saved['provenance']['flagsSha256'],
        'WorldSelection': trial['worldSelection'],
        'WorldSha256': saved['provenance']['worldSha256'],
        'Node': trial['node'],
        'sharedPacket': {'path': str(SAVED.relative_to(ROOT)), 'sha256': sha(SAVED)},
        'parkedTrialPacket': {'path': str(TRIAL), 'sha256': sha(TRIAL)},
        'parkedTrialReceipt': {'path': str(RECEIPT.relative_to(ROOT)), 'sha256': sha(RECEIPT)},
        'reducerSha256': sha(Path(__file__)),
        'input': candidate['input'],
        'setupSha256': reference['summary']['setupSha256'],
        'selectedActorsSha256': reference['summary']['selectedActorsSha256']
    },
    'responsibility': {
        'C_snapPlan': reference['actors'][3]['initialBehavior']['plan'],
        'climbEventCandidate': next(e for e in candidate['events']
                                    if e['type'] == 'block_climb' and e['a'] == 3),
        'climbEventReference': next(e for e in reference['summary']['result']['events']
                                    if e['type'] == 'block_climb' and e['a'] == 3),
        'C': 'Initially shares DT_W with LG, then conditional LB_M collection; '
        'native departure event1.20 names LG keeper in both histories.',
        'LB_M': 'Assigned second-level defender, not deliberately unblocked.',
        'RT_joining': 'Separate issue; no RT policy or claim changed.'
    },
    'actors': {IDS[i]: {k: reference['actors'][i][k]
                       for k in ('idx', 'slot', 'team', 'profile')}
               | {'playerId': reference['actors'][i]['player']['id'],
                  'measurables': reference['actors'][i]['player']['measurables'],
                  'ratings': reference['actors'][i]['player']['ratings']}
               for i in IDS},
    'candidateRows': selected,
    'referenceAvailableRows': reference_rows,
    'referenceMissingSampleNote': 'Compact PR26 packet lacks all-tick C/LB_M bodies '
    'and group-consumed C/LB_M/RB cues. No invented reference states/pictures between '
    'detailed checkpoints; all-tick mean hands retained.',
    'matchedAvailableComparisons': comparisons,
    'C_LB_handTimelines': {'candidate': candidate_loads, 'reference': reference_loads},
    'corridorSideContrast': contrast,
    'actualCoupledAchievedWindows': achieved_windows,
    'arrival': {
        'candidateFirstLoadedInterval': [first_loaded['t'], first_loaded['after']],
        'candidateFirstSampleInsideEngagedStandingReach': first_in_range['after'],
        'candidatePreviousBoundaryOutsideEngagedStandingReach': first_in_range['t'],
        'candidateActualFirstContact': candidate['firstContact'],
        'candidateFirstContactWorldInterval': [3.0, 3.05],
        'candidateLOSCrossing': candidate['crossing'],
        'referenceActualFirstContact': reference['summary']['firstContact'],
        'referenceLOSCrossing': reference['summary']['crossing'],
        'earliestFeasibleAlternativeIntercept': None,
        'bound': 'The recorded coupled path establishes access by World boundary3.05; '
        'the earlier3.00 sample remains outside standing reach. Earliest feasible access '
        'under other requests is not established; no distance/vmax estimate is called feasibility.'
    },
    'endings': {
        'candidate': {k: candidate[k] for k in ('endTime', 'outcome', 'censored', 'crossing', 'gain')},
        'reference': reference['summary']
    },
    'verdict': 'Protection is lost by geometry and runner-arrival timing despite real '
    'acquired hand load. Candidate C collects earlier and from the far side of the runner '
    'corridor. A specific faulty C request or feasible better route is not yet demonstrated.',
    'nextQuestion': 'Using the C-consumed LB picture at the last pre-strike approach and '
    'the already available RB picture, could the existing body reach the runner-side shoulder '
    'before entry without losing first-level/teammate clearance? The D03 RB information '
    'diagnosis should precede any C policy alteration.',
    'ownership': 'Run-game controller owner handles collection placement and RB-read '
    'comparison. Physics retains center-hand angular-law and contact execution questions; '
    'shared movement changes require YAC/Pursuit coordination. No production patch warranted here.',
    'limitations': [
        'Signed tick-average impulses are delivered exchange, not continuous latch or lane denial.',
        'Mean normal/tangent components do not reconstruct exact contact-point vector torque.',
        'The accepted center-hand angular defect remains; work/budget checks do not certify law.',
        'Native engagement.win, tackle.nextTackleAt and raw engagement movement phases were '
        'not captured in the parked full packet, preventing a complete tackle-eligibility attribution.',
        'Differently timed acquisitions use different execution draws; unchanged roster/strength '
        'does not imply identical acquired hand quality. No RNG counterfactual was fabricated.',
        'The mirrored RB point is a declared geometry contrast, not an executed runner choice.'
    ],
    'cost': {'newWorldSteps': 0, 'newNativePlays': 0, 'newGames': 0,
             'offlineSecondsBeforeWrite': time.perf_counter() - started}
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(json.dumps({'output': str(OUTPUT.relative_to(ROOT)), 'bytes': OUTPUT.stat().st_size,
                  'sha256': sha(OUTPUT), 'offlineSeconds': time.perf_counter() - started,
                  'firstLoadedInterval': result['arrival']['candidateFirstLoadedInterval'],
                  'firstStandingReachBoundary': first_in_range['after']}))
