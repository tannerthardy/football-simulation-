"""Summarize saved native ledgers only; never imports the engine or runs plays."""
import gzip
import hashlib
import json
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/puller-access')
destination = Path(sys.argv[2] if len(sys.argv) > 2 else str(root / 'summary.json'))
arms = ['baseline', 'corner', 'wrapper', 'b02-baseline', 'depth', 'k02-baseline',
        'final-research', 'accepted-baseline', 'production', 'information', 'allocation']
raw, reports = {}, {}

def identity(a, b):
    fields = ['before', 'after', 'raw', 'final', 'rng']
    return len(a['frames']) == len(b['frames']) and a['events'] == b['events'] and all(
        all(x[k] == y[k] for k in fields) for x, y in zip(a['frames'], b['frames']))

def first_change(a, b):
    for x, y in zip(a['frames'], b['frames']):
        if x['raw'] != y['raw'] or x['before'] != y['before'] or x['final'] != y['final']:
            return x['t']
    return None

for arm in arms:
    path = root / arm / 'trace.json.gz'
    data = json.loads(gzip.decompress(path.read_bytes()))
    rows = {}
    for r in data['rows']:
        raw[(arm, r['id'])] = {**{k: r[k] for k in ['events', 'gain', 'phase', 'firstContact']}, 'frames': [{k: (hashlib.sha256(json.dumps(f[k],sort_keys=True,separators=(',',':')).encode()).hexdigest() if k != 't' else f[k]) for k in ['t','before','after','raw','final','rng']} for f in r['frames']]}
        slots = {a['idx']: a['slot'] for a in r['initial']}
        pullers = [a for a in r['initial'] if a.get('plan') and a['plan']['kind'] == 'pull']
        pulls = {a['idx'] for a in pullers}
        impacts = [{'t': f['t'], 'pair': [slots[c['i']], slots[c['j']]], 'impulse': c['impulse']}
                   for f in r['frames'] for c in f['report']['contacts']
                   if c['i'] < 11 and c['j'] < 11 and c['impulse'] > 0]
        times = {0.5, 1, 1.5, 2, 2.4, 2.6, 2.95, 3, 3.5, 4}
        if r['firstContact']: times.add(r['firstContact']['t'])
        timeline = []
        for f in r['frames']:
            if f['t'] not in times: continue
            players = []
            for a in r['initial']:
                i = a['idx']
                if i not in pulls and a['slot'] != 'RB' and not a['slot'].startswith('LB'): continue
                b = f['before'][i]
                call = next((c for c in r['calls'] if c['a'] == i and c['t'] == f['t']), None)
                target = call['after']['target'] if call and call['after'] else None
                cues = [c for c in r['cues'] if c['t'] == f['t'] and c['a'] == i
                        and c['b'] == (target if target is not None else 6)]
                players.append({'slot': a['slot'], 'pos': b['pos'], 'velocity': b['vel'],
                                'facing': b['facing'], 'support': b.get('support'),
                                'raw': f['raw'][i], 'final': f['final'][i],
                                'achievedPositionAfter': f['after'][i]['pos'],
                                'achievedVelocityAfter': f['after'][i]['vel'],
                                'target': slots.get(target),
                                'read': call.get('read') if call else None,
                                'consumedPicture': cues[-1]['picture'] if cues else None,
                                'pullIndexAfter': call['after']['pullIdx'] if call and call['after'] else None})
            timeline.append({'commandTime': f['t'], 'stateAfterTime': round(f['t'] + .05, 9), 'players': players})
        loads = []
        for p in pullers:
            i, target = p['idx'], p['plan']['target']
            for f in r['frames']:
                for e in f['afterReps']:
                    if i not in [e['b'], *e['helpers']] or not e['hands']: continue
                    force = abs(e['hands']['normal']) + abs(e['hands']['tangent'])
                    if force > 1e-8:
                        loads.append({'t': f['t'], 'blocker': slots[i], 'defender': slots[e['d']],
                                      'force': force, 'normal': e['hands']['normal'], 'tangent': e['hands']['tangent']})
        arrival = None
        if r['firstContact']:
            t = r['firstContact']['t']
            f = next((f for f in r['frames'] if f['t'] == t), r['frames'][-1])
            arrival = {'time': t, 'runner': f['before'][6]['pos'], 'pullers': [
                {'slot': slots[p['idx']], 'pos': f['before'][p['idx']]['pos'],
                 'target': slots.get(p['plan']['target']), 'targetPosition': f['before'][p['plan']['target']]['pos'] if p['plan']['target'] is not None else None}
                for p in pullers]}
        rows[r['id']] = {'inputSha256': r['inputSha256'], 'phase': r['phase'], 'endTime': r['endTime'],
                         'outcome': r['outcome'] if r['phase'] != 'live' else None, 'gain': r['gain'],
                         'censor': r['censor'], 'firstContact': r['firstContact'],
                         'installedPullers': [{**p['plan'], 'slot': p['slot'], 'targetSlot': slots.get(p['plan']['target'])}
                                              for p in pullers],
                         'firstLoadedPullerContact': loads[0] if loads else None,
                         'loadedPairTicks': len(loads), 'teammateImpacts': impacts,
                         'pullerContacts': [e for e in r['events'] if e['type'] == 'block_contact' and e['a'] in pulls],
                         'maxAbsWorkResidual': max(abs(f['report']['work']['residual']) for f in r['frames']),
                         'runnerArrival': arrival, 'timeline': timeline}
    reports[arm] = {'receipt': data['receipt'], 'tapeSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'cases': rows}

comparisons = []
for left, right, ids in [
    ('baseline', 'corner', ['C01', 'C02', 'P02']),
    ('baseline', 'wrapper', ['B01', 'K01']),
    ('baseline', 'depth', ['B01']), ('b02-baseline', 'depth', ['B02']),
    ('baseline', 'final-research', ['C01', 'C02', 'P01', 'P02']),
    ('k02-baseline', 'final-research', ['K02']),
    ('baseline', 'accepted-baseline', ['K01']),
    ('k02-baseline', 'accepted-baseline', ['K02']),
    ('accepted-baseline', 'production', ['K01', 'K02']),
    ('wrapper', 'production', ['K01']), ('final-research', 'production', ['K02']), ('accepted-baseline','information',['K01','K02']), ('information','allocation',['K01','K02'])]:
    for id in ids:
        a, b = raw[(left, id)], raw[(right, id)]
        comparisons.append({'left': left, 'right': right, 'id': id, 'exactBodyRequestRngEventIdentity': identity(a, b),
                            'firstPhysicalOrRequestDifference': first_change(a, b),
                            'gain': [a['gain'], b['gain']], 'firstContact': [a['firstContact'], b['firstContact']]})
receipts = {}
for p in sorted(root.glob('*.json')):
    if p.name in ['report-console.json', 'summary.json']: continue
    d = json.loads(p.read_text())
    if 'commands' in d:
        receipts[p.name] = {'source': d['sourceSha256'], 'validation': d['validationSha256'],
                            'exitCode': d['exitCode'], 'inputsUnchanged': d['inputsUnchanged'], 'commands': d['commands']}
for arm in reports:
    reports[arm]['disposition'] = {'information':'PROPOSED information correction only', 'corner':'prototype-only lifecycle correction; no rescue', 'wrapper':'WITHDRAWN early collection; no useful load', 'production':'WITHDRAWN early collection; null-job regression', 'final-research':'WITHDRAWN early collection; null-job regression', 'depth':'REJECTED shallower track', 'allocation':'REJECTED naive wrapper reservation'}.get(arm,'comparison baseline')

summary = {'schema': 'puller-access-v1', 'accepted': '0000e560e0dbe31905151465152d412ba838803d',
           'productionSource': reports['information']['receipt']['source'],
           'arms': reports, 'comparisons': comparisons, 'commands': receipts,
           'cost': {'measuredCommandSeconds': sum(c['elapsedSeconds'] for d in receipts.values() for c in d['commands']),
                    'nativeCollectorSeconds': sum(d['receipt']['elapsedSeconds'] for d in reports.values()),
                    'nativeContinuations': len(raw), 'uniqueInputs': len({id for _, id in raw}),
                    'completed': sum(r['phase'] != 'live' for r in raw.values()),
                    'censored': sum(r['phase'] == 'live' for r in raw.values()), 'fullGames': 0,
                    'qualification': 'Includes all preserved failed launch/check receipts. Offline inspection/report work is additional; focused/typecheck commands overlapped, not a performance comparison.'}}
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps({'cost': summary['cost'], 'comparisons': comparisons}, indent=2))
