"""Pin the rejected controller trial and the bounded slow-rear geometry probe.
python3 scripts/diag/physics/slow-rear-report.py
"""
import collections
import hashlib
import json
import math
from pathlib import Path
import statistics

files = {}


def read(path):
    raw = Path(path).read_bytes()
    files[path] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def key(row):
    return [row['o'], row['d']] + [row['result'][k] for k in ['angle', 'speed', 'cut', 'side', 'seed']]


def norm(v):
    return math.hypot(v['x'], v['y'])


def aggregate(panel):
    return {'source': panel['source'], 'flags': panel['flags'], 'n': len(panel['rows']),
            'finishes': dict(collections.Counter(r['result']['finish'] for r in panel['rows'])),
            'observerNeutral': all(r['observerNeutral'] for r in panel['rows'])}


def end_x(row):
    r = row['result']
    return r['firstGrip']['x'] + r['advanceAfterGrip'] if r['firstGrip'] else None


def compare(old, new):
    changes, adverse, speed = [], [], []
    assert len(old['rows']) == len(new['rows'])
    for a, b in zip(old['rows'], new['rows']):
        assert key(a) == key(b) and a['initial'] == b['initial'] and a['profiles'] == b['profiles']
        done_a, done_b = a['result']['ending'] == 'tackled', b['result']['ending'] == 'tackled'
        if a['result']['finish'] != b['result']['finish']:
            changes.append({'input': key(a), 'before': a['result']['finish'], 'after': b['result']['finish'],
                            'lost': done_a and not done_b, 'gained': done_b and not done_a})
        xa, xb = end_x(a), end_x(b)
        if done_a and done_b and xa is not None and xb is not None and xb > xa + .1:
            adverse.append({'input': key(a), 'beforeEndX': xa, 'afterEndX': xb})
        first = next((f for f in a['frames'] if f['positiveGrasp'] or norm(f['channels']['torso']) > 1e-9), None)
        if first:
            at = first['t'] + .2
            fa = next((f for f in a['frames'] if abs(f['after'] - at) < 1e-8), None)
            fb = next((f for f in b['frames'] if abs(f['after'] - at) < 1e-8), None)
            if fa and fb:
                speed.append(norm(fb['end']['c']['vel']) - norm(fa['end']['c']['vel']))
    return {'lost': sum(c['lost'] for c in changes), 'gained': sum(c['gained'] for c in changes),
            'changedFinishes': changes, 'adverseCompletedAdvances': adverse,
            'commonBaselineLoadPlus02': {'samples': len(speed),
                'medianCandidateMinusBaselineSpeed': statistics.median(speed) if speed else None}}


panels = {k: read(p) for k, p in {
    'prior-matched': 'out/reach-transition/touch.json', 'trial-matched': 'out/slow-rear/matched.json',
    'prior-fresh': 'out/reach-transition/fresh-touch.json', 'trial-fresh': 'out/slow-rear/fresh.json',
    'native-rear': 'out/slow-rear/native-rear.json', 'gather-rear': 'out/slow-rear/rear.json',
    'early-rear': 'out/slow-rear/early-rear.json', 'depth-rear': 'out/slow-rear/depth-rear.json',
    'prior-selected-fresh': 'out/reach-transition/fresh-final.json',
    'depth-selected-fresh': 'out/slow-rear/depth-fresh-small.json',
}.items()}
source = panels['native-rear']['source']
assert source == panels['prior-matched']['source']
assert all(r['observerNeutral'] for p in panels.values() for r in p['rows'])

traces = {}
for name in ['native-rear', 'gather-rear', 'early-rear', 'depth-rear']:
    row = panels[name]['rows'][0]
    assert key(row) == [61, 62, 180, 3, False, 1, 3002]
    frames = row['frames']
    first_force = next(f for f in frames if f['positiveGrasp'] or f['bodyImpulse'] > 0)
    acquisition = next(f for f in frames if f['before']['joint'])
    traces[name] = {'result': row['result'], 'interventions': row['interventions'],
        'actualFirstHandRead': next(f.get('approachRead') for f in frames if abs(f['t'] - 2.65) < 1e-8),
        'acquisition': {'t': acquisition['t'], 'joint': acquisition['before']['joint']},
        'firstForce': {'t': first_force['t'], 'after': first_force['after'],
                       'bodyImpulse': first_force['bodyImpulse'], 'positiveGrasp': first_force['positiveGrasp']},
        'firstFallBoundary': next((f['after'] for f in frames if f['end']['c']['support']['state'] == 'falling'), None),
        'intervals': [{'t': f['t'], 'request': f['requests'][1], 'behavior': f['behavior'],
            'carrierVelocity': f['before']['c']['vel'],
            'defenderVelocity': f['before']['d']['vel'],
            'gap': math.hypot(f['before']['c']['pos']['x'] - f['before']['d']['pos']['x'],
                              f['before']['c']['pos']['y'] - f['before']['d']['pos']['y']),
            'carrierXi': f['before']['c']['support']['xi'], 'joint': f['before']['joint'],
            'bodyImpulse': f['bodyImpulse']}
            for f in frames if any(abs(f['t'] - t) < 1e-8 for t in [2.6, 2.65, 2.8, 2.85, 2.9, 2.95, 3.35, 3.65])]}
native = panels['native-rear']['rows'][0]
read_at_hand = next(f['approachRead'] for f in native['frames'] if abs(f['t'] - 2.65) < 1e-8)
assert read_at_hand['held'] and read_at_hand['gather'] == 1
assert abs(read_at_hand['near']['vel']['x'] - 6.544803059601408) < 1e-10
old = read('out/reach-transition/rear-loss-final.json')
for a, b in zip(old['rows'], panels['native-rear']['rows']):
    assert a['endpoint'] == b['endpoint'] and a['result'] == b['result']

# Small self-contained law witness: the common incoming state and two tapes
# through 4.25 s. The second explicitly substitutes depth once; it cannot be
# mistaken for an implementable re-grab or a frozen physics fall/slide.
start = next(f for f in native['frames'] if f['before']['joint'])
fixture = {'protocol': 'slow-rear-world-witness-v1', 'source': source, 'flags': panels['native-rear']['flags'],
    'input': key(native), 'initial': [start['before']['d'], start['before']['c']],
    'joint': start['before']['joint'], 'order': ['defender', 'carrier'], 'tapes': []}
for name in ['native-rear', 'depth-rear']:
    row = panels[name]['rows'][0]
    incoming = next(f for f in row['frames'] if f['before']['joint'])
    assert incoming['before'] == start['before']
    fixture['tapes'].append({'name': name, 'interventions': row['interventions'],
        'nativeResult': row['result'], 'decisions': [
            {'t': f['t'], 'dt': f['dt'], 'requests': [f['requests'][1], f['requests'][0]],
             'capacity': f['before']['joint']['capacity'], 'coupling': f['before']['joint'].get('recoveryCoupling'),
             'expectedPositions': [f['end']['d']['pos'], f['end']['c']['pos']]}
            for f in row['frames'] if start['t'] - 1e-8 <= f['t'] <= 4.2 + 1e-8]})
fixture_path = Path('data/reviews/current/slow-rear-witness.json')
fixture_path.write_text(json.dumps(fixture, separators=(',', ':')) + '\n')
files[str(fixture_path)] = hashlib.sha256(fixture_path.read_bytes()).hexdigest()

refinement = {k: read(p) for k, p in {
    'native': 'out/reach-transition/selected-refinement.json',
    'early': 'out/slow-rear/early-refinement.json', 'depth': 'out/slow-rear/depth-refinement.json'}.items()}
assert all(p['source'] == source for p in refinement.values())
assert all(c['runs'][0]['maxPositionVsNative'] < 1e-7 for p in refinement.values() for c in p['cases'])
witness_replay = read('out/slow-rear/witness-replay.json')
assert witness_replay['source'] == source and not witness_replay['candidate']
assert witness_replay['fixtureSha256'] == files[str(fixture_path)]
assert all(c['runs'][0]['maxPositionVsNative'] < 1e-7 for c in witness_replay['cases'])
verification = {}
for check in ['focused', 'typecheck', 'build']:
    path = 'out/slow-rear/' + check + '.log'
    raw = Path(path).read_bytes()
    assert b'error TS' not in raw
    if check == 'focused':
        assert b'97 passed' in raw and b'6 passed' in raw
    files[path] = hashlib.sha256(raw).hexdigest()
    verification[check] = {'path': path, 'sha256': files[path]}
report = {'protocol': 'slow-rear-contact-review-v1', 'parentCommit': '182f01c',
    'rejectedTrialCommit': '6dabd20', 'restoredSource': source,
    'trialSource': panels['trial-matched']['source'], 'panels': {k: aggregate(p) for k, p in panels.items()},
    'comparisons': {'matched': compare(panels['prior-matched'], panels['trial-matched']),
                    'fresh': compare(panels['prior-fresh'], panels['trial-fresh'])},
    'traces': traces,
    'depthControls': [{'input': key(a),
                       'before': {k: a['result'][k] for k in ['finish', 'advanceAfterGrip', 'ending', 'endWhy']},
                       'after': {k: b['result'][k] for k in ['finish', 'advanceAfterGrip', 'ending', 'endWhy']},
                       'interventions': b['interventions']}
                      for a, b in zip(panels['prior-selected-fresh']['rows'], panels['depth-selected-fresh']['rows'])],
    'refinement': refinement, 'witnessReplay': witness_replay, 'verification': verification,
    'limits': ['Gather trial rejected: six matched finishes lost, none gained; selected loss persists.',
               'Depth is a counterfactual location substitution, not an earned re-grab or capacity change.',
               'Successful early shallow hold rules out shallow depth as the sole cause.',
               '180-degree mirrors share the same collinear initial state; they are not independent evidence.',
               '96 fresh inputs were inspected previously. No new holdout claim.',
               'Native early-reel fall occurs at 5.10/5.15 s by resolution; replay endpoint may remain falling.',
               'Source restored exactly; no promotion or shared physics edit.']}
for a, b in zip(panels['prior-selected-fresh']['rows'], panels['depth-selected-fresh']['rows']):
    assert key(a) == key(b) and a['initial'] == b['initial'] and a['profiles'] == b['profiles']
for path in ['scripts/diag/physics/reach-transition.ts', 'scripts/diag/physics/reach-transition-refinement.ts',
             'scripts/diag/physics/slow-rear-replay.ts', 'scripts/diag/physics/slow-rear-report.py']:
    files[path] = hashlib.sha256(Path(path).read_bytes()).hexdigest()
report['filesSha256'] = files
Path('out/slow-rear-contact/receipt.json').parent.mkdir(parents=True, exist_ok=True)
Path('out/slow-rear-contact/receipt.json').write_text(json.dumps(report, indent=2) + '\n')
print('out/slow-rear-contact/receipt.json; ' + str(fixture_path))
