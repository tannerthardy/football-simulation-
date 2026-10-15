"""Recompute the PR66 review measurements from saved traces; zero simulations."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'data/reviews/current/helper-contact-review')
load = lambda name: json.loads(gzip.decompress((root / name).read_bytes()))
native, route = load('trace.json.gz'), load('route.json.gz')
body = lambda f, slot: f['bodies'][f['slots'].index(slot)]
distance = lambda a, b: math.hypot(a['x'] - b['x'], a['y'] - b['y'])
compact = lambda b: {k: b[k] for k in ('pos', 'vel', 'facing', 'spin')} | {'support': b['support']['state']}

def physical_history(run):
    return [{'before': s['before']['bodies'], 'after': s['after']['bodies'],
             'requested': s['requested'], 'report': s['report']} for s in run['steps']]

def first_join(run):
    return next((s['before']['t'] for s in run['steps'] if s['after']['helperEngagement']), None)

def cue_phi(read, slots):
    pictures = {p['target']: p['picture'] for p in read['pictures']}
    if slots['owner'] not in pictures or slots['defender'] not in pictures:
        return None
    a, b = pictures[slots['owner']]['pos'], pictures[slots['defender']]['pos']
    drive = read['before']['state']['drive']
    n = math.hypot(drive['x'], drive['y'])
    ax, ay = -drive['x'] / n, -drive['y'] / n
    dx, dy = a['x'] - b['x'], a['y'] - b['y']
    return math.atan2(-(-dx * ay + dy * ax), dx * ax + dy * ay) / (math.pi / 2)

summary = {'runtimeSource': native['source'], 'fixtureSha256': native['fixtureSha256'],
           'settings': native['settings'], 'collection': [], 'native': [], 'recovery': [],
           'scope': 'Four existing situations only. Controlled collection is not a native runner-arrival result.'}
for alternative in route['runs']:
    original = next(r for r in native['runs'] if r['mode'] == 'patch' and r['scenario'] == alternative['scenario'])
    assert original['initial'] == alternative['initial']
    assert original['markers'][0] == alternative['markers'][0]
    def metrics(run):
        pair = {run['final']['slots'].index('C'), run['final']['slots'].index('LG')}
        contacts = [c for s in run['steps'] for c in s['report']['contacts'] if {c['i'], c['j']} == pair]
        end = run['final']
        return {'firstJoinWorldStart': first_join(run), 'endTime': end['t'], 'released': end['released'],
                'helperEngagement': end['helperEngagement'],
                'helperDefenderDistance': distance(body(end, 'LG')['pos'], body(end, 'DT_W')['pos']),
                'teammateImpacts': len(contacts), 'teammateImpulse': sum(c['impulse'] for c in contacts),
                'endHands': end['state']['hands'] if end['helperEngagement'] else None,
                'maximumWorkResidual': max(abs(s['report']['work']['residual']) for s in run['steps'])}
    before, after = metrics(original), metrics(alternative)
    assert before['helperEngagement'] is None
    assert after['helperEngagement'] == 'DT_W' and after['teammateImpacts'] == 0
    assert after['endHands']['active'] and math.hypot(after['endHands']['normal'], after['endHands']['tangent']) > 0
    assert not after['released'] and after['maximumWorkResidual'] < 1e-8
    summary['collection'].append({'side': original['side'], 'decision': 'Genuine missed feasible collection: route through teammate',
                                  'sameForkState': True, 'original': before, 'diagnosticRoute': after,
                                  'waypoint': alternative['markers'][1]})

for r in native['runs']:
    if r['scenario'] == 'recovery':
        markers = {m['name']: m['frame'] for m in r['markers']}
        assert markers['down-read']['checkSince'] == -1 and not markers['down-read']['released']
        assert markers['recovered-read']['checkSince'] == markers['recovered-read']['t']
        read = min(r['reads'], key=lambda d: abs(d['t'] - 1.7))
        summary['recovery'].append({'mode': r['mode'], 'recheckResetPreserved': True,
                                    'checkAt1_7': read['before']['state'],
                                    'released': r['final']['released'], 'collected': r['final']['helperEngagement']})
    if r['scenario'] not in ('under', 'tite'):
        continue
    assert r['observerNeutral']
    selected = []
    for t in [.75, 1., 1.25, 1.35, 2.]:
        f = min([s['before'] for s in r['steps']] + [r['final']], key=lambda f: abs(f['t'] - t))
        selected.append({'t': f['t'], 'state': f['state'], 'released': f['released'],
                         'runner': compact(body(f, 'RB')), 'owner': compact(body(f, r['slots']['owner'])),
                         'helper': compact(body(f, r['slots']['helper'])), 'defender': compact(body(f, r['slots']['defender']))})
    reads = [{'t': d['t'], 'actualPhi': d['before']['state']['phi'], 'consumedPhi': cue_phi(d, r['slots']),
              'checkBefore': d['before'].get('checkSince'), 'checkAfter': d['after'].get('checkSince'),
              'pictures': [p for p in d['pictures'] if p['target'] in (*r['slots'].values(), 'RB')]}
             for d in r['reads'] if d['before']['state'] and
             d['before']['t'] + 1e-8 >= (d['before'].get('checkNextRead') or 0)]
    summary['native'].append({'mode': r['mode'], 'scenario': r['scenario'], 'observerNeutral': True,
                             'firstJoinWorldStart': first_join(r), 'finalTime': r['final']['t'],
                             'phase': r['final']['phase'], 'samples': selected, 'reads': reads})

# A final observer-only measurement correction must not change physical evidence.
physical_hash = lambda run: hashlib.sha256(json.dumps(physical_history(run), sort_keys=True).encode()).hexdigest()
parity_path = root / 'measurement-parity.json'
parity = json.loads(parity_path.read_text()) if parity_path.exists() else {}
for name in ('trace', 'route'):
    old_path = root / f'{name}.initial.json.gz'
    if old_path.exists():
        old, final = load(f'{name}.initial.json.gz'), load(f'{name}.json.gz')
        rows = []
        for a, b in zip(old['runs'], final['runs']):
            assert a['events'] == b['events'] and physical_history(a) == physical_history(b)
            rows.append({'mode': a['mode'], 'scenario': a['scenario'], 'old': physical_hash(a), 'final': physical_hash(b)})
        parity[name] = {'originalCollectorSha256': old['toolSha256'], 'finalCollectorSha256': final['toolSha256'], 'runs': rows}
    for saved, final in zip(parity[name]['runs'], load(f'{name}.json.gz')['runs']):
        assert saved['old'] == saved['final'] == physical_hash(final)
    summary[f'{name}MeasurementCorrectionPhysicalParity'] = True
parity_path.write_text(json.dumps(parity, indent=2) + '\n')

receipts = []
for p in sorted((root / 'receipts').glob('*.json')):
    receipt = json.loads(p.read_text())
    receipts.append({'path': str(p.relative_to(root)), 'commit': receipt['commit'],
                     'source': receipt['sourceSha256'], 'exitCode': receipt['exitCode'],
                     'seconds': sum(c['elapsedSeconds'] for c in receipt['commands'])})
summary['cost'] = {'receipts': receipts, 'summedCommandSeconds': sum(r['seconds'] for r in receipts),
                   'newFullGames': 0, 'newRosters': 0, 'newFootballInputs': 0,
                   'note': 'Includes original five failures, observer-only measurement correction/repeats, and diagnostic typecheck; concurrent commands overlap.'}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
manifest = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file() and p.name != 'sha256.json'}
(root / 'sha256.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'collection': [{'side': c['side'], 'before': c['original']['helperEngagement'],
                                  'after': c['diagnosticRoute']['helperEngagement']} for c in summary['collection']],
                  'cost': summary['cost']}, indent=2))
