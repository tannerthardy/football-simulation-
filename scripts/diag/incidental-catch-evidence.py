"""Extract saved first catch windows and geometry; never run a simulation.

python scripts/diag/incidental-catch-evidence.py PREFIX.json.gz MANIFEST.json OUT.json
The source packet is published at 4ae667e on codex/experimental-game-checkpoint.
Samples pair a tick-start ball with the preceding exact after-tick actor.
These are catch-resolver fixtures, not serialized World restart states.
"""
import gzip
import hashlib
import json
import math
import sys
from pathlib import Path


def extract(trace_path, manifest_path):
    packed = Path(trace_path).read_bytes()
    trace = json.loads(gzip.decompress(packed))
    manifest = json.loads(Path(manifest_path).read_bytes())
    fixture = next(f for f in manifest['fixtures'] if f['id'] == 'spread-air')
    players = {p['id']: p for team in fixture['teams'].values() for p in team['roster']}
    cases = []
    for play in [4, 24, 34, 23, 43, 6, 10]:
        row = next(t for t in trace['traces'] if t['play'] == play)
        draw = next(d for d in row['catchDraws'] if d['site'] == 'receiverContest')
        idx = draw['receiver']
        actor = draw['actors'][idx]
        tick = next(q for q in row['ticks'] if q['tickStart'] == draw['t'])
        samples = []
        if play in [4, 24, 23]:
            for j, q in enumerate(row['ticks']):
                if q['tickStart'] > draw['t']:
                    break
                if j and q['before']['kind'] == 'air':
                    samples.append({'t': q['tickStart'], 'ball': q['before']['pos'],
                                    'actor': row['ticks'][j - 1]['actors'][idx]})
        cases.append({'play': play, 'call': row['call'], 'player': players[actor['id']],
                      'releaseT': draw['ball']['releaseT'], 'drawTime': draw['t'],
                      'originalChance': draw['p'], 'originalSuccess': draw['success'],
                      'actor': actor, 'ball': draw['ball'], 'prev': tick['before']['pos'],
                      'cur': draw['ball']['pos'], 'samples': samples,
                      'profile': row['fullReplay']['profiles'][idx]})
    return {'schema': 'incidental-catch-windows-v1',
            'evidencePublication': '4ae667e29b3ce085f43c5cb911b294349cda2b8f',
            'sourceSha256': trace['receipt']['sourceSha256'],
            'traceSha256': hashlib.sha256(packed).hexdigest(),
            'inputManifestSha256': hashlib.sha256(Path(manifest_path).read_bytes()).hexdigest(),
            'receipt': trace['receipt'],
            'measurement': 'Saved first receiverContest window. Samples pair tick-start ball with preceding after-tick exact actor, not the future endpoint. Geometry is a resolver fixture, not a World restart or completed-play counterfactual.',
            'cases': cases}


def geometry(case):
    a, prev, cur = case['actor'], case['prev'], case['cur']
    sx, sy = cur['x'] - prev['x'], cur['y'] - prev['y']
    sl2 = sx * sx + sy * sy
    s = max(0, min(1, ((a['pos']['x'] - prev['x']) * sx + (a['pos']['y'] - prev['y']) * sy) / sl2)) if sl2 > 1e-9 else 0
    point = {k: prev[k] + (cur[k] - prev[k]) * s for k in ['x', 'y', 'z']}
    dh = math.hypot(a['pos']['x'] - point['x'], a['pos']['y'] - point['y'])
    stretch = (dh / (a['reach'] + .3)) ** 2
    chest = case['profile']['heightIn'] / 36 * 1.02
    high = max(0, (point['z'] - chest) / max(.2, a['maxCatchHeight'] - chest))
    speed = math.sqrt(sum(case['ball']['vel'][k] ** 2 for k in ['x', 'y', 'z']))
    return {'play': case['play'], 'segmentFraction': s, 'closestPoint': point,
            'horizontalReach': dh, 'squaredExtensionFraction': stretch,
            'highFraction': high, 'ballSpeed': speed,
            'geometricDifficultyWithoutTrackingOrShoulder': .5 * stretch + .4 * high
            + .35 * max(0, (.5 - point['z']) / .4) + (.08 if speed > 24 else 0),
            'originalCandidateChance': case['originalChance']}


if __name__ == '__main__':
    packet = extract(sys.argv[1], sys.argv[2])
    Path(sys.argv[3]).write_text(json.dumps(packet, indent=2) + '\n')
    print(json.dumps({'newSimulations': 0, 'geometry': [geometry(c) for c in packet['cases']]}))
