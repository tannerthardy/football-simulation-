"""Native flow-panel summary; exact live samples, no last-frame substitution."""
import json
import statistics
import sys
from pathlib import Path

TIMES = (.5, 1, 1.5, 2, 2.5, 3)


def digest(rep):
    slots = {}
    for player in rep['players']:
        if player['slot'] not in ('DE_S', 'DT_S', 'DT_W', 'DE_W', 'LB_M', 'LB_S', 'LB_W'):
            continue
        idx = player['id']
        rows = [(f, next(a for a in f['agents'] if a['id'] == idx)) for f in rep['frames']]
        def first(predicate):
            return next((f['t'] for f, a in rows if predicate(f, a)), None)
        snapshots = {}
        for t in TIMES:
            pair = next(((f, a) for f, a in rows if abs(f['after'] - t) < 1e-7), None)
            if pair is None:
                snapshots[str(t)] = None
                continue
            f, a = pair
            snapshots[str(t)] = {
                'decisionTime': f['t'], 'bodyTime': f['after'],
                'lateral': (a['pos']['y'] - rep['initial'][idx]['y']) * rep['side'],
                'depth': a['pos']['x'] - 40, 'read': a.get('read'),
                'requested': a['requested']['vel']['y'] * rep['side'],
                'applied': a['applied']['vel']['y'] * rep['side'],
                'achieved': a['vel']['y'] * rep['side'], 'blocker': a.get('blocker'),
                'support': a['support']['state'], 'tags': a['tags'],
                'aims': [{k: v for k, v in x.items() if k in ('job', 'desired', 'held', 'interval')}
                         for x in f.get('aims', []) if x['defender'] == idx],
            }
        slots[player['slot']] = {
            'fit': rows[0][1].get('fit'),
            'runRead': first(lambda f, a: a.get('read') == 'run'),
            'pullFit': first(lambda f, a: 'fit-pull-read' in a['tags']),
            'flowFit': first(lambda f, a: 'fit-flow-read' in a['tags']),
            'requestedOver3': first(lambda f, a: a['requested']['vel']['y'] * rep['side'] > 3),
            'appliedOver3': first(lambda f, a: a['applied']['vel']['y'] * rep['side'] > 3),
            'achievedOver1': first(lambda f, a: a['vel']['y'] * rep['side'] > 1),
            'snapshots': snapshots,
        }
    rb = next(x['id'] for x in rep['players'] if x['slot'] == 'RB')
    handoff = next((e['t'] for e in rep['events'] if e['type'] == 'handoff'), None)
    contact = None
    defenders = {x['id'] for x in rep['players'] if x['team'] == 'D'}
    for f in rep['frames']:
        if handoff is None or f['t'] < handoff:
            continue
        hits = [c for c in f['contacts'] if c['impulse'] > 0 and
                ((c['i'] == rb and c['j'] in defenders) or (c['j'] == rb and c['i'] in defenders))]
        if hits:
            a = next(a for a in f['agents'] if a['id'] == rb)
            contact = {'timeInterval': [f['t'], f['after']], 'depthAfterStep': a['pos']['x'] - 40,
                       'pairs': hits}
            break
    return {'input': rep['input'], 'side': rep['side'], 'slots': slots, 'endTime': rep['endTime'],
            'rightCensored': rep['live'], 'observedGain': rep['gain'], 'firstRBContact': contact}


def compare(base, candidate):
    assert base['inputs'] == candidate['inputs'], 'Unmatched input manifest'
    result = []
    for b, c in zip(base['panel'], candidate['panel']):
        assert b['observerNeutral'] and c['observerNeutral']
        first = next((i for i, (x, y) in enumerate(zip(b['hashes'], c['hashes'])) if x != y), None)
        result.append({'id': b['input']['id'], 'concept': b['input']['concept'],
                       'unchanged': b['hashes'] == c['hashes'],
                       'firstDivergence': b['frames'][first]['t'] if first is not None else None,
                       'baseline': digest(b), 'candidate': digest(c)})
    groups = {}
    for concept in sorted({r['concept'] for r in result}):
        reps = [r for r in result if r['concept'] == concept]
        group = {'n': len(reps), 'unchanged': sum(r['unchanged'] for r in reps), 'arms': {}}
        for arm in ('baseline', 'candidate'):
            bodies = {}
            for t in TIMES:
                samples = [r[arm]['slots'][slot]['snapshots'][str(t)] for r in reps
                           for slot in ('LB_M', 'LB_S', 'LB_W')]
                samples = [s for s in samples if s is not None]
                bodies[str(t)] = {'n': len(samples), **{k: statistics.mean(s[k] for s in samples) if samples else None
                                   for k in ('lateral', 'requested', 'applied', 'achieved')}}
            contacts = [r[arm]['firstRBContact'] for r in reps if r[arm]['firstRBContact']]
            group['arms'][arm] = {'observedGain': statistics.mean(r[arm]['observedGain'] for r in reps),
                                  'rightCensored': sum(r[arm]['rightCensored'] for r in reps),
                                  'contactN': len(contacts),
                                  'firstContactTime': statistics.mean(c['timeInterval'][0] for c in contacts) if contacts else None,
                                  'firstContactDepth': statistics.mean(c['depthAfterStep'] for c in contacts) if contacts else None,
                                  'linebackers': bodies}
        groups[concept] = group
    return {'baselineProvenance': base.get('provenance'), 'candidateProvenance': candidate.get('provenance'),
            'groups': groups, 'cases': result}


if __name__ == '__main__':
    baseline, candidate, output = map(Path, sys.argv[1:])
    summary = compare(json.loads(baseline.read_text()), json.loads(candidate.read_text()))
    summary['units'] = {'position': 'yd', 'velocity': 'yd/s', 'time': 's',
                        'side': 'called play direction; not every defender has playside duty',
                        'snapshots': 'body at named second; requests from preceding 0.05-s decision',
                        'gain': 'observed spot at whistle or 3.5-s stop; censored plays are not final gains',
                        'contact': 'first positive RB/defender body impulse after handoff, within recorded step',
                        'thresholds': 'descriptive first requested/applied >3 yd/s, achieved >1 yd/s; no NFL targets'}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(summary, separators=(',', ':')) + '\n')
    for concept, g in summary['groups'].items():
        print(concept, 'n', g['n'], 'unchanged', g['unchanged'],
              'LB lateral at 2s', *(round(g['arms'][a]['linebackers']['2']['lateral'], 3) for a in ('baseline', 'candidate')))
