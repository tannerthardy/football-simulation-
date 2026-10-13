"""Reduce the reach/pile diagnosis and both bounded controller attempts.
python3 scripts/diag/physics/reach-transition-report.py [OUTPUT]
"""
import collections
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys

output = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/reach-transition/receipt.json')
files = {}


def read(path):
    p = Path(path)
    raw = p.read_bytes()
    files[path] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def key(row):
    return [row['o'], row['d']] + [row['result'][k] for k in ['angle', 'speed', 'cut', 'side', 'seed']]


def norm(v):
    return math.hypot(v['x'], v['y'])


def load(row):
    return next((f for f in row['frames'] if f.get('positiveGrasp') or
        norm(f.get('channels', {}).get('torso', {'x': 0, 'y': 0})) > 1e-9 or
        f.get('bodyImpulse', 0) > 0 or any(j.get('force', 0) > 0 for j in f.get('grips', []))), None)


def sample(row, t):
    return next((f for f in row['frames'] if abs(f['after'] - t) < 1e-8), None)


def aggregate(panel):
    curves = {}
    for off in [.2, .4, .8]:
        values = []
        for row in panel['rows']:
            first = load(row)
            at = None if first is None else sample(row, first['t'] + off)
            if at:
                values.append(norm(at['end']['c']['vel']) - norm(first['before']['c']['vel']))
        curves[str(off)] = {'samples': len(values), 'medianSpeedChange': statistics.median(values) if values else None}
    return {'source': panel['source'], 'flags': panel['flags'], 'collector': panel['collector'],
        'n': len(panel['rows']), 'finishes': dict(collections.Counter(r['result']['finish'] for r in panel['rows'])),
        'curves': curves, 'observerNeutral': all(r['observerNeutral'] for r in panel['rows']),
        'maxCarrierMomentumResidual': max((f['residual'] for r in panel['rows'] for f in r['frames'] if 'channels' in f), default=None)}


def end_x(result):
    first = result.get('firstGrip')
    return first['x'] + result['advanceAfterGrip'] if first and result['advanceAfterGrip'] is not None else None


def compare(old, new):
    changes, adverse_advance, common_clock = [], [], []
    for a, b in zip(old['rows'], new['rows']):
        assert key(a) == key(b) and a['initial'] == b['initial'] and a['profiles'] == b['profiles']
        x, y = a['result'], b['result']
        done_a, done_b = x['ending'] == 'tackled', y['ending'] == 'tackled'
        if x['finish'] != y['finish']:
            changes.append({'input': key(a), 'before': x['finish'], 'after': y['finish'],
                'lost': done_a and not done_b, 'gained': done_b and not done_a,
                'beforeWhy': x['endWhy'], 'afterWhy': y['endWhy']})
        if done_a and done_b and end_x(x) is not None and end_x(y) is not None and end_x(y) > end_x(x) + .1:
            adverse_advance.append({'input': key(a), 'beforeEndX': end_x(x), 'afterEndX': end_x(y)})
        first = load(a)
        if first:
            sa, sb = sample(a, first['t'] + .2), sample(b, first['t'] + .2)
            if sa and sb:
                common_clock.append(norm(sb['end']['c']['vel']) - norm(sa['end']['c']['vel']))
    return {'lost': sum(c['lost'] for c in changes), 'gained': sum(c['gained'] for c in changes),
        'changedFinishes': changes, 'adverseCompletedFieldAdvances': adverse_advance,
        'commonControlLoadPlus02': {'samples': len(common_clock),
            'medianCandidateMinusControlSpeed': statistics.median(common_clock) if common_clock else None}}


paths = {
    'default': 'out/reach-transition/default.json', 'finish': 'out/reach-transition/finish.json',
    'touch': 'out/reach-transition/touch.json', 'touch-alone': 'out/reach-transition/touch-alone.json',
    'fresh-finish': 'out/reach-contact/fresh-finish.json', 'fresh-touch': 'out/reach-transition/fresh-touch.json',
    'extra-control': 'out/reach-transition/extra-control.json', 'extra-touch': 'out/reach-transition/extra-touch.json',
    'first-touch': 'out/reach-transition/first-touch.json', 'first-fresh-touch': 'out/reach-transition/first-fresh-touch.json',
    'old-early': 'out/reach-closure/full-early-reel.json', 'old-fresh-early': 'out/reach-closure/fresh-early-reel.json'}
panels = {a: read(p) for a, p in paths.items()}
source = panels['touch']['source']
assert all(panels[a]['source'] == source for a in ['default', 'finish', 'touch-alone', 'fresh-touch', 'extra-control', 'extra-touch'])
parity = {}
for a in ['default', 'finish']:
    previous = read('out/reach-closure/' + a + '.json')
    assert previous['rows'] == panels[a]['rows']
    parity[a] = {'rows': len(previous['rows']), 'exactResultsAndFrames': True, 'previousSource': previous['source']}
comparisons = {a + '_to_' + b: compare(panels[a], panels[b]) for a, b in [
    ('finish', 'touch'), ('default', 'touch-alone'), ('fresh-finish', 'fresh-touch'),
    ('extra-control', 'extra-touch'), ('old-early', 'touch'), ('old-fresh-early', 'fresh-touch'),
    ('finish', 'first-touch'), ('fresh-finish', 'first-fresh-touch')]}
probes = {}
for a in ['current', 'prefix-movement', 'no-launch', 'prefix-grip']:
    panel = read('out/reach-transition/fresh-' + a + '.json')
    row = next(r for r in panel['rows'] if key(r) == [71, 72, 135, 6, False, 1, 4001])
    intervals = []
    for f in row['frames']:
        if 4.3 - 1e-8 <= f['t'] <= 4.45 + 1e-8:
            intervals.append({'t': f['t'], 'behavior': f['behavior'], 'request': f['requests'][1],
                'actualSpeedAfter': norm(f['end']['d']['vel']), 'strikeAfter': f['end']['d']['support'].get('strike'),
                'grip': f['before']['grip'], 'execution': f['before']['execution']})
    probes[a] = {'source': panel['source'], 'collectorSha256': panel['collectorSha256'],
        'result': row['result'], 'intervals': intervals, 'allObserverNeutral': all(r['observerNeutral'] for r in panel['rows'])}
refinement = read('out/reach-transition/selected-refinement.json')
assert refinement['source'] == source
assert all(c['runs'][0]['maxPositionVsNative'] < 1e-7 for c in refinement['cases'])
validation = {}
for a in ['focused', 'test-all', 'enabled-controls', 'test-data', 'typecheck', 'build']:
    p = Path('out/reach-transition/' + a + '.log')
    raw = p.read_bytes()
    files[str(p)] = hashlib.sha256(raw).hexdigest()
    text = raw.decode()
    if a == 'test-all': assert '1 failed | 1622 passed' in text and 'test/zone-helper-check.test.ts' in text
    if a == 'enabled-controls': assert '1 failed | 198 passed' in text and 'test/tackle-wait-constraints.test.ts' in text
    if a == 'test-data': assert 'Ran 141 tests' in text and '\nOK' in text
    if a in ['typecheck', 'build']: assert 'error TS' not in text
    validation[a] = {'path': str(p), 'sha256': files[str(p)]}
receipt = {'protocol': 'reach-transition-review-v1', 'parentCommit': 'd4ec81c', 'firstAttemptCommit': '39823e9',
    'source': source, 'flag': 'TACKLE_TOUCH=1', 'default': 'off', 'promoted': False,
    'boundary': 'Only acquisition and cached movement intent; World, capacities, grip depth and RB defaults unchanged.',
    'measurement': {'contact': 'Actual positive grip or torso load; acquisition and proximity alone are not contact.',
        'samples': 'Actual live 20 Hz boundaries; own-load and paired control-load clocks are separate.',
        'censoring': 'Time-limit holds remain censored; only physical fall or existing progress whistle earns a finish.',
        'advance': 'Compare completed field end spots, not different-time relative-to-acquisition clocks.',
        'probes': 'Recorded control movement/grip substitutions are diagnostic only; final policy uses its own cached command and felt queued/ongoing strike.'},
    'parity': parity, 'panels': {a: aggregate(p) for a, p in panels.items()}, 'comparisons': comparisons,
    'causalProbes': probes, 'selectedRefinement': refinement, 'validation': validation,
    'operators': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in map(Path, [
        'scripts/diag/physics/reach-transition.ts', 'scripts/diag/physics/reach-transition-refinement.ts',
        'scripts/diag/physics/reach-transition-report.py', 'scripts/diag/physics/reach-contact-panel.ts', 'test/tackle-touch.test.ts'])},
    'rawFiles': files}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(receipt, indent=2) + '\n')
for a, p in receipt['panels'].items(): print(a, p['finishes'], p['curves']['0.2'])
