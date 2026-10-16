#!/usr/bin/env python3
"""Saved-data phase/possession review of this one panel. Zero simulations."""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import time


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def at(d, t):
    fs = d['result']['frames']
    if t > fs[-1]['t'] + 1e-7:
        return None
    i = min(range(len(fs)), key=lambda i: abs(fs[i]['t']-t))
    return fs[i], d['result']['telemetry']['frames'][i]


def xy(f, i):
    return f['agents'][3*i:3*i+2]


def loaded(b):
    h = b.get('hands')
    return h is not None and any(abs(h[k]) > 1e-6 for k in ('normalForce', 'tangentForce') if h.get(k) is not None)


def state(d, t, focus):
    pair = at(d, t)
    if pair is None:
        return None
    f, s = pair
    carrier = f['carrier']
    rows = []
    for i in focus:
        a = d['actors'][i]
        rows.append({'idx': i, 'id': a['id'], 'slot': a['slot'], 'team': a['team'],
                     'xy': xy(f, i), 'recorded': s['agents'][i],
                     'gapToActualCarrier': math.dist(xy(f, i), xy(f, carrier)) if carrier >= 0 else None,
                     'consumedCues': [p for p in s.get('perception', []) if p['a'] == i and p['b'] in focus]})
    return {'t': f['t'], 'carrierIdx': carrier,
            'carrierId': d['actors'][carrier]['id'] if carrier >= 0 else None,
            'actors': rows, 'blocks': s.get('blocks', []), 'tackle': s.get('tackle'),
            'contacts': s.get('contacts', []), 'ball': s.get('ball')}


def reduce(d):
    r, actors = d['result'], d['actors']
    fs, ts = r['frames'], r['telemetry']['frames']
    events = sorted(r['events'], key=lambda e: e['t'])
    identities = {a['id']: a['idx'] for a in actors}
    actual = r['stats'].get('receiver') or r['stats'].get('rusher')
    if actual is None and r['stats'].get('sacked'):
        actual = next(a['id'] for a in actors if a['slot'] == 'QB')
    idx = identities.get(actual)
    phase_type = ('catch' if r['stats'].get('receiver') else 'scramble' if r['stats'].get('scramble')
                  else 'handoff' if d['setup']['offCall']['kind'] == 'run' else None)
    start = next((e['t'] for e in events if e['type'] == phase_type), None) if phase_type else None
    if r['stats'].get('sacked'):
        start = 0
        phase_type = 'initial-QB-possession (initialized boundary, not a fabricated event)'
    transitions = [{'t': f['t'], 'idx': f['carrier'],
                    'id': actors[f['carrier']]['id'] if f['carrier'] >= 0 else None}
                   for j, f in enumerate(fs) if j == 0 or f['carrier'] != fs[j-1]['carrier']]
    stop = next((x['t'] for x in transitions if start is not None and x['t'] > start and x['idx'] != idx), r['duration'])
    episodes = []
    for j, transition in enumerate(transitions):
        who = transition['idx']
        end = transitions[j+1]['t'] if j+1 < len(transitions) else r['duration']
        episode_events = [e for e in events if who >= 0 and transition['t'] <= e['t'] <= end
                          and who in (e.get('a'), e.get('b'))]
        episode_contacts = [e for e in episode_events if e['type'] in ('carrier_contact', 'tackle_wrap', 'hit')]
        episodes.append({**transition, 'end': end,
                         'firstRecordedContact': episode_contacts[0] if episode_contacts else None,
                         'terminalTackles': [e for e in episode_events if e['type'] == 'tackle']})
    hits = [e for e in events if idx is not None and start is not None and start <= e['t'] <= stop
            and e['type'] in ('carrier_contact', 'tackle_wrap', 'hit') and idx in (e.get('a'), e.get('b'))]
    first = hits[0] if hits else None
    crossings = [f for f in fs if idx is not None and start is not None and start <= f['t'] < stop
                 and xy(f, idx)[0] >= d['setup']['los']]
    arrival = crossings[0]['t'] if crossings else None
    arrival_state = state(d, arrival, list(range(1, 22))) if arrival is not None else None
    pairs = {}
    for f in ts:
        for b in f.get('blocks', []):
            if not loaded(b):
                continue
            for a in [b['a'], *b.get('helpers', [])]:
                key = (a, b['b'])
                p = pairs.setdefault(key, {'a': a, 'b': b['b'], 'actorId': actors[a]['id'], 'targetId': actors[b['b']]['id'],
                                          'first': f['t'], 'last': f['t'], 'samples': 0,
                                          'firstSample': b, 'firstAsHelper': a != b['a'],
                                          'recordedHandLoadOwnerIdx': b['a'],
                                          'helperLoadLimit': 'Helper membership is recorded; primary engagement hands do not identify each helpers own force.'})
                p['last'] = f['t']; p['samples'] += 1
    sampled_contacts = []
    min_speed = None
    if start is not None and idx is not None:
        before_contact = [(f, s) for f, s in zip(fs, ts) if start <= f['t'] < min(stop, first['t'] if first else stop)]
        speeds = [math.hypot(*s['agents'][idx]['body']['velocity']) for f, s in before_contact]
        min_speed = min(speeds) if speeds else None
        for f, s in before_contact:
            for c in s.get('contacts', []):
                if c.get('impulse', 0) > 0 and idx in (c['a'], c['b']) and actors[c['a']]['team'] == actors[c['b']]['team']:
                    sampled_contacts.append({'t': f['t'], **c})
    checkpoints = {1, 1.5, 2, 2.5, 3}
    checkpoints |= {e['t'] for e in events if e['type'] in ('throw', 'catch', 'handoff', 'hit', 'fumble', 'recovery', 'tackle_wrap', 'tackle', 'pbu', 'deflection')}
    for e in events:
        if e['type'] == 'tackle_wrap':
            checkpoints.update(round(e['t']+x, 2) for x in (.1, .3))
    return {'actualRecordedRusherOrReceiverId': actual, 'phaseStart': start, 'phaseStartDefinition': phase_type,
            'carrierTransitions': transitions, 'actualPossessionEpisodes': episodes,
            'firstContactForOriginalCarrierDuringPossession': first,
            'originalCarrierPossessionEnd': stop, 'losProxySample': arrival_state,
            'losProxyLimit': 'First post-physics rounded.1yd sample x>=LOS while same actor still possesses; tick-start labels/.05s bins. Not an exact subframe crossing.',
            'loadedPairs': list(pairs.values()),
            'minStoredCarrierSpeedBeforeFirstContact': min_speed,
            'sampledTeammateCarrierContactsBeforeFirstContact': sampled_contacts,
            'checkpoints': [s for t in sorted(checkpoints) if (s := state(d, t, list(range(1, 22)))) is not None],
            'installedAtFirstReplayTick': [{'idx': i, 'id': actors[i]['id'], 'slot': actors[i]['slot'], 'state': ts[0]['agents'][i]} for i in range(22)],
            'postPhaseContacts': hits,
            'terminalTackles': [e for e in events if e['type'] == 'tackle'],
            'events': events, 'stats': r['stats'], 'outcome': r['outcome'], 'yardsDescriptiveOnly': r['offenseYards']}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--reference', type=Path, required=True)
    ap.add_argument('--current', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    start = time.perf_counter()
    summaries = [json.loads((p/'summary.json').read_text()) for p in (args.reference, args.current)]
    rows = []
    for old, new in zip(*(s['rows'] for s in summaries)):
        assert old['id'] == new['id']
        arms = []
        for root, entry in zip((args.reference, args.current), (old, new)):
            path = root/'cases'/(entry['id']+'.json')
            assert sha(path) == entry['sha256']
            d = json.loads(path.read_text())
            arms.append(reduce(d))
        rows.append({'id': old['id'], 'kind': old['kind'], 'concept': old['concept'], 'arms': arms})
    result = {'schema': 'panel-bb6d4c7-phase-review-v1', 'operatorSha256': sha(Path(__file__)),
              'sourcePins': [s['provenance']['acceptedCommit'] for s in summaries],
              'referenceRole': 'Closest complete uniform native48; later partial/different-operator owner witnesses supplemental only.',
              'rows': rows, 'savedDataWallSeconds': time.perf_counter()-start, 'newSimulations': 0}
    import gzip
    args.out.write_bytes(gzip.compress((json.dumps(result, separators=(',', ':'))+'\n').encode(), mtime=0))
    print(json.dumps({'pairs': len(rows), 'newSimulations': 0, 'wall': result['savedDataWallSeconds'],
                      'runRows': [{'id': r['id'], 'originalCarrierContact': r['arms'][1]['firstContactForOriginalCarrierDuringPossession'],
                                   'possessionChanges': r['arms'][1]['carrierTransitions'],
                                   'loadedSecondLevel': [(p['a'], p['b'], p['first']) for p in r['arms'][1]['loadedPairs'] if p['b'] in (15, 16)],
                                   'minPreContactSpeed': r['arms'][1]['minStoredCarrierSpeedBeforeFirstContact']}
                                  for r in rows if r['kind'] == 'run']}))


if __name__ == '__main__':
    main()
