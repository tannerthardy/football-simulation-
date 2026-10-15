"""Offline summaries only; never simulates or changes a denominator to improve it."""
import argparse
import gzip
import hashlib
import json
import math
import statistics
from pathlib import Path


def read(path):
    return json.loads(gzip.decompress(Path(path).read_bytes()) if str(path).endswith('.gz') else Path(path).read_bytes())


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def quantile(values, q):
    x = sorted(values)
    i = (len(x) - 1) * q
    lo, hi = math.floor(i), math.ceil(i)
    return x[lo] + (x[hi] - x[lo]) * (i - lo)


def geometry(c, d):
    dx, dy = c['pos']['x'] - d['pos']['x'], c['pos']['y'] - d['pos']['y']
    distance = math.hypot(dx, dy)
    vx, vy = c['vel']['x'] - d['vel']['x'], c['vel']['y'] - d['vel']['y']
    speed = math.hypot(*c['vel'].values())
    return {'distance': distance, 'closing': -(vx * dx + vy * dy) / max(1e-9, distance),
            'transverseSpeed': abs(vx * dy - vy * dx) / max(1e-9, distance),
            'frontCos': -(c['vel']['x'] * dx + c['vel']['y'] * dy) / max(1e-9, speed * distance),
            'defenderVelocity': d['vel'], 'runnerVelocity': c['vel']}


def clip_summary(c):
    r, players = c['result'], {p['idx']: p for p in c['players']}
    ci = next((i for i, p in players.items() if p['id'] == r['stats'].get('receiver')), None)
    events = r['events']
    catch = next((e for e in events if e['type'] == 'catch' and e['a'] == ci), None)
    result = {'id': c['id'], 'inputSha256': c['inputSha256'], 'signature': c['signature'],
              'seconds': c['elapsedSeconds'], 'outcome': r['outcome'], 'unfinished': r['outcome'] == 'timeout',
              'completed': r['stats'].get('completed', False), 'yards': r['yards'], 'yac': r['stats'].get('yac'),
              'passer': r['stats'].get('passer'), 'receiver': r['stats'].get('receiver'),
              'timeToThrow': r['stats'].get('timeToThrow'), 'catch': catch,
              'reads': [e for e in events if e['type'] == 'read' and e['a'] >= 18]}
    if not catch:
        return result
    rows = [z for z in c.get('rows', []) if z['t'] >= catch['t'] and z.get('world')]
    contacts = [e for e in events if e['t'] >= catch['t'] and
                ((e['type'] == 'carrier_contact' and e.get('a') == ci) or
                 (e['type'] == 'tackle_wrap' and e.get('b') == ci))]
    result['receiverContactEvents'] = contacts
    result['noRecordedReceiverContactOrWrap'] = not contacts
    result['receiverBreaks'] = [e for e in events if e['type'] == 'broken_tackle' and e.get('a') == ci and e['t'] >= catch['t']]
    result['closestApproaches'] = []
    for di in sorted(i for i, p in players.items() if p['team'] == 'D'):
        if not rows:
            continue
        z = min(rows, key=lambda z: geometry(z['world']['before'][ci], z['world']['before'][di])['distance'])
        before = z['world']['before']
        raw = next((q['raw'] for q in z['raw'] if q['actor'] == di), None)
        result['closestApproaches'].append({'defender': players[di]['id'], 'slot': players[di]['slot'], 'idx': di,
            't': z['t'], **geometry(before[ci], before[di]), 'request': raw,
            'position': before[di]['pos'], 'runnerPosition': before[ci]['pos'],
            'support': before[di]['support']['state']})
    result['loadedHolds'] = []
    for di in sorted(i for i, p in players.items() if p['team'] == 'D'):
        loads = [(z, j) for z in rows for j in z['world']['grasps'] if
                 {j['a'], j['b']} == {ci, di} and j.get('force', 0) > 1e-8 and not j.get('broken')]
        if not loads:
            continue
        z, j = loads[0]
        slip = next((e for e in result['receiverBreaks'] if e.get('b') == di and e['t'] >= z['t']), None)
        end = slip['t'] if slip else r['duration']
        samples = []
        for row in rows:
            if z['t'] - .05 <= row['t'] <= min(end + .3, z['t'] + 1.1) and round(row['t'] * 100) % 10 == 0:
                b = row['world']['after'][ci]
                force = next((h.get('force', 0) for h in row['world']['grasps'] if {h['a'], h['b']} == {ci, di}), 0)
                samples.append({'t': row['t'] + .05, 'runnerVelocity': b['vel'], 'support': b['support']['state'],
                                'supportDeviation': b['support']['xi'], 'graspForce': force,
                                'groundImpulse': row['world']['groundImpulse'][ci]})
        result['loadedHolds'].append({'defender': players[di]['id'], 'slot': players[di]['slot'], 'idx': di,
            'firstSolvedEndT': z['t'] + .05, 'origin': j.get('origin'), 'force': j['force'], 'capacity': j['capacity'],
            'legs': j.get('legs'), 'geometryAtStepStart': geometry(z['world']['before'][ci], z['world']['before'][di]),
            'slip': slip, 'observedSurvival': end - (z['t'] + .05), 'censoredAtWhistle': slip is None,
            'samples': samples})
    return result


def cached_cohort(root, arm):
    rows = []
    for fixture in ['zone-reference', 'spread-air', 'power-zone', 'west-spread']:
        path = root / arm / fixture / 'game.json.gz'
        packet = read(path)
        assert packet['complete']
        for p in packet['log']:
            if p['kind'] != 'pass' or p.get('foul') or p.get('nullified') or not p.get('stats', {}).get('completed'):
                continue
            rep = p['replay']
            catch = next(e for e in rep['events'] if e['type'] == 'catch')
            ci = catch['a']
            frame = min(rep['frames'], key=lambda f: abs(f['t'] - catch['t']))
            nearest = min(math.hypot(catch['pos']['x'] - frame['agents'][3 * i], catch['pos']['y'] - frame['agents'][3 * i + 1]) for i in range(11, 22))
            contacts = [e for e in rep['events'] if e['t'] >= catch['t'] and
                        ((e['type'] == 'carrier_contact' and e.get('a') == ci) or
                         (e['type'] == 'tackle_wrap' and e.get('b') == ci))]
            breaks = [e for e in rep['events'] if e['t'] >= catch['t'] and e['type'] == 'broken_tackle' and e.get('a') == ci]
            rows.append({'id': f'{fixture}/P{p["index"]+1}', 'receiver': p['stats']['receiver'], 'yac': p['stats']['yac'],
                         'outcome': p['outcome'], 'nearestAtCatchRoundedFilm': nearest,
                         'receiverContacts': len(contacts), 'receiverBreaks': len(breaks)})
    groups = {}
    for name, subset in [('explosive', [r for r in rows if r['yac'] >= 20]), ('ordinary', [r for r in rows if r['yac'] < 20])]:
        groups[name] = {'n': len(subset), 'noRecordedReceiverContactOrWrap': sum(not r['receiverContacts'] for r in subset),
                        'receiverBrokenTacklePlays': sum(r['receiverBreaks'] > 0 for r in subset),
                        'medianNearestAtCatchRoundedFilm': statistics.median(r['nearestAtCatchRoundedFilm'] for r in subset)}
    return {'n': len(rows), 'meanYac': statistics.mean(r['yac'] for r in rows), 'p90Yac': quantile([r['yac'] for r in rows], .9),
            'groups': groups, 'rows': rows,
            'limitation': 'Standard film has no solved grasp-force channel. Contact/wrap is not proof of loaded force. Catch-distance proxy uses rounded, sampled film.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    parser.add_argument('evidence', nargs='+')
    args = parser.parse_args()
    evidence = []
    for name in args.evidence:
        packet = read(name)
        evidence.append({'path': name, 'sha256': digest(name), 'provenance': packet['provenance'],
                         'inputSha256': packet['inputSha256'], 'model': packet.get('model'),
                         'modelSha256': packet.get('modelSha256'), 'seconds': packet['elapsedSeconds'],
                         'clips': [clip_summary(c) for c in packet['clips']]})
    output = {'schema': 'yac-containment-review-v1', 'measurementSha256': digest(__file__),
              'definition': 'Clean completed passes: kind=pass, completed, no foul, no nullified. Linear (n-1)*q quantiles. Actual catcher/defender IDs; only receiver contacts/breaks after catch.',
              'cachedCheckpoint': {arm: cached_cohort(Path('data/reviews/current/experimental-game-checkpoint'), arm) for arm in ['accepted', 'experimental']},
              'evidence': evidence}
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps({'out': args.out, 'simulations': 0, 'packets': len(evidence), 'cases': sum(len(p['clips']) for p in evidence)}))
