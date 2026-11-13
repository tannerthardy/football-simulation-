"""Compare a bounded alternative screen with the structural-grip correction.
python3 scripts/diag/physics/reach-closure-report.py [OUTPUT]
"""
import collections
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys

output = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/reach-closure/receipt.json')
files = {}


def read(path):
    p = Path(path)
    raw = p.read_bytes()
    files[path] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def norm(v):
    return math.hypot(v['x'], v['y'])


def key(row):
    return [row['o'], row['d']] + [row['result'][k] for k in ['angle', 'speed', 'cut', 'side', 'seed']]


def first(row):
    return next((f for f in row['frames'] if f.get('positiveGrasp') or
        norm(f.get('channels', {}).get('torso', {'x': 0, 'y': 0})) > 1e-9 or
        f.get('bodyImpulse', 0) > 0 or any(j.get('force', 0) > 0 for j in f.get('grips', []))), None)


def at(row, t):
    return next((f for f in row['frames'] if abs(f['after'] - t) < 1e-8), None)


def aggregate(panel):
    curves = {}
    for off in [.2, .4, .8]:
        values = []
        for row in panel['rows']:
            f = first(row)
            sample = None if f is None else at(row, f['t'] + off)
            if sample is not None:
                values.append(norm(sample['end']['c']['vel']) - norm(f['before']['c']['vel']))
        curves[str(off)] = {'samples': len(values), 'medianSpeedChange': statistics.median(values) if values else None}
    return {'n': len(panel['rows']), 'finishes': dict(collections.Counter(r['result']['finish'] for r in panel['rows'])),
        'loaded': sum(first(r) is not None for r in panel['rows']), 'curves': curves,
        'source': panel['source'], 'flags': panel['flags'], 'collector': panel['collector']}


def compare(a, b):
    changes = []
    common_clock = []
    for old, new in zip(a['rows'], b['rows']):
        assert key(old) == key(new) and old['initial'] == new['initial'] and old['profiles'] == new['profiles']
        old_result, new_result = old['result'], new['result']
        old_done = old_result['ending'] == 'tackled'
        new_done = new_result['ending'] == 'tackled'
        if old_result['finish'] != new_result['finish']:
            changes.append({'input': key(old), 'before': old_result['finish'], 'after': new_result['finish'],
                'lost': old_done and not new_done, 'gained': new_done and not old_done})
        load = first(old)
        if load:
            old_sample, new_sample = at(old, load['t'] + .2), at(new, load['t'] + .2)
            if old_sample and new_sample:
                common_clock.append(norm(new_sample['end']['c']['vel']) - norm(old_sample['end']['c']['vel']))
    return {'lost': sum(c['lost'] for c in changes), 'gained': sum(c['gained'] for c in changes), 'changes': changes,
        'commonBaselineLoadPlus02': {'pairedSamples': len(common_clock),
            'medianCandidateMinusBaselineSpeed': statistics.median(common_clock) if common_clock else None,
            'clock': 'Both actual live boundaries at baseline first force-bearing World interval +0.2 s; no terminal extension.'}}


paths = {
    'finish': 'out/reach-closure/finish.json', 'default': 'out/reach-closure/default.json',
    'old-brace': 'out/reach-contact/reach-finish.json', 'no-reel': 'out/reach-contact/acquire-finish.json',
    'early-reel': 'out/reach-closure/full-early-reel.json', 'absorb-reel': 'out/reach-closure/full-absorb-reel.json',
    'structural': 'out/reach-closure/candidate.json',
    'fresh-finish': 'out/reach-contact/fresh-finish.json', 'fresh-old-brace': 'out/reach-contact/fresh-reach-finish.json',
    'fresh-no-reel': 'out/reach-contact/fresh-acquire-finish.json',
    'fresh-early-reel': 'out/reach-closure/fresh-early-reel.json', 'fresh-absorb-reel': 'out/reach-closure/fresh-absorb-reel.json',
    'fresh-structural': 'out/reach-closure/fresh-candidate.json'}
panels = {k: read(v) for k, v in paths.items()}
source = panels['structural']['source']
assert all(r['observerNeutral'] for p in panels.values() for r in p['rows'])
for a in ['default', 'finish']:
    old = read('out/reach-contact/' + a + '.json')
    assert old['rows'] == panels[a]['rows'] and panels[a]['source'] == source
comparisons = {a: compare(panels['fresh-finish' if a.startswith('fresh-') else 'finish'], panels[a])
               for a in ['old-brace', 'no-reel', 'early-reel', 'absorb-reel', 'structural',
                         'fresh-old-brace', 'fresh-no-reel', 'fresh-early-reel', 'fresh-absorb-reel', 'fresh-structural']}
comparisons['structural-vs-old-brace'] = compare(panels['old-brace'], panels['structural'])
comparisons['fresh-structural-vs-old-brace'] = compare(panels['fresh-old-brace'], panels['fresh-structural'])
refinement = read('out/reach-closure/refinement/summary.json')
assert refinement['source'] == source
small = {a: read('out/reach-closure/small-' + a + '.json') for a in ['brace', 'no-reel', 'early-reel', 'absorb-reel', 'structural']}
selected = {}
for a, p in small.items():
    row = next(r for r in p['rows'] if key(r) == [61, 62, 45, 6, False, 1, 3001])
    selected[a] = {'source': p['source'], 'result': row['result'], 'transitions': row['transitions'],
        'forceIntervals': [{k: f[k] for k in ['t', 'normalImpulse', 'tangentImpulse', 'reelImpulse', 'compressionSubsteps', 'grips']}
                           for f in row['frames'] if 2.55 - 1e-8 <= f['t'] <= 2.8 + 1e-8]}
probes = {}
for name in ['probe-early-reel', 'probe-depth-probe', 'fresh-probe-early-reel', 'fresh-probe-depth-probe']:
    p = read('out/reach-closure/' + name + '.json')
    assert p['source'] == source and all(r['observerNeutral'] for r in p['rows'])
    probes[name] = {'source': p['source'], 'collector': p['collector'],
        'rows': [{'input': key(r), 'result': r['result'], 'transitions': r['transitions']} for r in p['rows']]}
validation = {}
for name in ['structural-before', 'structural-laws', 'test-all', 'enabled-controls', 'test-data', 'typecheck', 'build']:
    p = Path('out/reach-closure/' + name + '.log')
    raw = p.read_bytes()
    files[str(p)] = hashlib.sha256(raw).hexdigest()
    validation[name] = {'path': str(p), 'sha256': files[str(p)]}
receipt = {'protocol': 'reach-closure-review-v1', 'parentCommit': 'fda39f7', 'source': source, 'default': 'off', 'promoted': False,
    'measurement': {'contact': 'Actual positive transmitted grip or torso impulse, separate from acquisition/proximity.',
        'samples': '20 Hz live boundaries only. Load clocks differ across acquisition arms; paired baseline-clock speed is also reported.',
        'censoring': 'Time limits remain censored; no finishing credit from a surviving grasp.',
        'screen': 'Restored existing reel immediately, or after acquired contact ceases closing. Diagnostic boundary interventions, no new production phases.'},
    'defaultParity': {'default': 144, 'finish': 144, 'exactResultsAndFrames': True},
    'arms': {a: aggregate(p) for a, p in panels.items()}, 'comparisons': comparisons,
    'selectedMirroredMechanism': selected, 'refinement': refinement, 'validation': validation,
    'depthProbe': {'interpretation': 'Causal intervention: copy the matched control initial hold depth only after actual torso proximity. It grants a depth change without a physical re-grab; not a controller or feasible actuator law.', 'panels': probes},
    'operators': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in map(Path, [
        'scripts/diag/physics/reach-closure-compare.ts', 'scripts/diag/physics/reach-closure-report.py',
        'scripts/diag/physics/reach-contact-panel.ts', 'scripts/diag/physics/wrap-binding-refinement.ts', 'test/reach-contact.test.ts'])},
    'rawFiles': files}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(receipt, indent=2) + '\n')
for a, p in receipt['arms'].items():
    print(a, p['finishes'], p['curves']['0.2'])
