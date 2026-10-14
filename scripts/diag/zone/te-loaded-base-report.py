"""Offline protection comparison; no new controller, perception or World steps."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys


def read(path):
    path = Path(path)
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix == '.gz' else path.read_bytes())


def radius(body, nx, ny):
    # Existing bodyshape.ts; the reducer uses the World's .9 contact scale.
    squeeze = max(0, min(1, body.get('squeeze', 0)))
    r = body['profile']['radius']
    if not squeeze:
        return r
    heading = body.get('squeezeHeading', body['facing'])
    along = nx * math.cos(heading) + ny * math.sin(heading)
    across = -nx * math.sin(heading) + ny * math.cos(heading)
    return math.hypot(r * (1 + .12 * squeeze) * along, r * (1 - .32 * squeeze) * across)


def pair_hands(frame, a, b):
    return [j for j in frame['worldInput']['jointOutputsAtWorldEnd']
            if j['kind'] == 'hands' and {j['a'], j['b']} == {a, b}]


def hand_summary(frames, a, b):
    loaded = [(f, j) for f in frames for j in pair_hands(f, a, b)
              if abs(j['normalForce']) + abs(j['tangentForce']) > 1e-6]
    normal = [(f, j) for f, j in loaded if j['normalForce'] > 1e-6]
    return {'meanForceSampleConvention': 'signed tick averages, not substep samples',
            'loadedIntervals': len(loaded),
            'firstLoadedInterval': None if not loaded else loaded[0][0]['t'],
            'positiveNormalWindow': None if not normal else [normal[0][0]['t'], normal[-1][0]['after']],
            'signedNormalImpulse': sum(j['normalForce'] * (f['after'] - f['t']) for f, j in loaded),
            'signedLateralImpulse': sum(j['tangentForce'] * (f['after'] - f['t']) for f, j in loaded)}


def clearance(frame, rb, defender):
    bodies = frame['worldInput']['beforeBodies']
    a, b = bodies[rb], bodies[defender]
    dx, dy = b['pos']['x'] - a['pos']['x'], b['pos']['y'] - a['pos']['y']
    distance = math.hypot(dx, dy)
    nx, ny = dx / distance, dy / distance
    touch = .9 * (radius(a, nx, ny) + radius(b, nx, ny))
    return {'t': frame['t'], 'distance': distance, 'worldTorsoTouch': touch,
            'clearance': distance - touch, 'runner': a, 'defender': b}


def summarize(arm, actor, defender, keeper, matched_stop):
    first = arm['firstContact']
    before_contact = [f for f in arm['frames'] if first is None or f['t'] <= first['t']]
    closest = min((clearance(f, 6, defender) for f in before_contact), key=lambda x: x['clearance'])
    climbs = [e for e in arm['events'] if e['type'] == 'block_climb' and e.get('a') == actor]
    first_climb = climbs[0]['t'] if climbs else None
    first_level = [f for f in arm['frames'] if first_climb is None or f['t'] < first_climb]
    arrival = [f for f in before_contact if abs(f['t'] - closest['t']) <= .150001]
    matched = [f for f in arm['frames'] if .4 <= f['t'] < matched_stop]
    body_contacts = [{'t': f['t'], **j} for f in arm['frames'] for j in f['report']['contacts']
                     if {j['i'], j['j']} == {6, defender} and j['impulse'] > 1e-6]
    return {'endTime': arm['endTime'], 'censored': arm['censored'], 'outcome': arm['outcome'],
            'gain': arm['gain'], 'crossing': arm['crossing'], 'firstContact': first,
            'edgeCarrierEvents': [e for e in arm['events'] if e['type'] == 'carrier_contact' and e.get('b') == defender],
            'edgeRunnerBodyContacts': body_contacts,
            'firstLevelClimb': climbs[:1], 'TEHands': hand_summary(arm['frames'], actor, defender),
            'keeperHandsThroughFirstContact': hand_summary(before_contact, keeper, defender),
            'closestEdgePassBeforeFirstContact': closest,
            'TEFirstLevelMaxXi': max(math.hypot(*f['agents'][actor]['body']['support']['xi'].values()) for f in first_level),
            'TEFirstLevelMaxPeak': max(f['agents'][actor]['body']['support']['peak'] for f in first_level),
            'TEWholeRunMaxPeak': max(f['agents'][actor]['body']['support']['peak'] for f in arm['frames']),
            'matchedFirstLevelWindow': {'start': .4, 'stop': matched_stop,
                'maxXi': max(math.hypot(*f['agents'][actor]['body']['support']['xi'].values()) for f in matched),
                'maxPeak': max(f['agents'][actor]['body']['support']['peak'] for f in matched)},
            'TESupportStates': sorted({f['agents'][actor]['body']['support']['state'] for f in arm['frames']}),
            'arrivalWindow': [{'t': f['t'], 'after': f['after'],
                               'keeperBody': f['worldInput']['beforeBodies'][keeper],
                               'keeperRequested': f['agents'][keeper]['requested'],
                               'keeperWorldTarget': f['worldInput']['intents'][keeper],
                               'keeperAchieved': f['agents'][keeper]['body'],
                               'keeperHands': pair_hands(f, keeper, defender),
                               'runnerRequested': f['agents'][6]['requested'],
                               'runnerWorldTarget': f['worldInput']['intents'][6],
                               'runnerAchieved': f['agents'][6]['body'],
                               'clearance': clearance(f, 6, defender)} for f in arrival]}


candidate_path = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/te-loaded-base/native.json.gz')
candidate = read(candidate_path)
reference_path = Path(sys.argv[2] if len(sys.argv) > 2 else candidate['savedSource']['path'])
assert hashlib.sha256(reference_path.read_bytes()).hexdigest() == candidate['savedSource']['sha256']
reference = read(reference_path)
rows = []
for row in candidate['panel']:
    c = row['candidate']
    b = next(r for r in reference['panel'] if r['input'] == c['input'])
    actor = c['actor']
    defender, keeper = (12, 2) if actor == 7 else (11, 1)
    assert all(abs((f['after'] - f['t']) - .05) < 1e-10 for f in c['frames'])
    matched_stop = next(e['t'] for e in c['events'] if e['type'] == 'block_climb' and e.get('a') == actor)
    old, new = summarize(b, actor, defender, keeper, matched_stop), summarize(c, actor, defender, keeper, matched_stop)
    rows.append({'input': c['input'], 'actor': actor, 'defender': defender, 'keeper': keeper,
                 'reference': old, 'candidate': new,
                 'firstChangedInterval': {k: c['frames'][row['firstChangedTick']][k] for k in ['t', 'after']},
                 'firstIntervention': c['interventions'][0],
                 'crossingDelay': None if old['crossing'] is None or new['crossing'] is None else new['crossing'] - old['crossing']})
result = {'protocol': 'te-loaded-base-protection-v1', 'candidateCommit': candidate['commit'],
          'runtimeSourceSha256': candidate['runtimeSourceSha256'],
          'candidateSha256': hashlib.sha256(candidate_path.read_bytes()).hexdigest(),
          'sourceComparison': candidate['comparisonBaseline'], 'worldSelection': candidate['worldSelection'],
          'scope': 'Offline historical isolated-law comparison. Closest pass before first declared carrier contact is a measured encounter, not a protection oracle or future controller cue.',
          'rows': rows}
destination = Path(sys.argv[3] if len(sys.argv) > 3 else 'out/te-loaded-base/protection.json')
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'saved': str(destination), 'rows': [{'id': r['input']['id'],
    'referenceFirst': r['reference']['firstContact'], 'candidateFirst': r['candidate']['firstContact'],
    'crossingDelay': r['crossingDelay'], 'oldClearance': r['reference']['closestEdgePassBeforeFirstContact']['clearance'],
    'newClearance': r['candidate']['closestEdgePassBeforeFirstContact']['clearance']} for r in rows]}))
